import { readPrivateReportDocument } from '../api/_lib/private-report-documents.mjs';
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { build } from "esbuild";
import { gzipSync } from "node:zlib";

// Keep real production transport and corpus retrieval. Only the provider and
// unrelated catalog gate are offline fixtures; no billed model calls.
const bundle = await build({
  // Bundled CommonJS dependencies need Node's require even inside a data URL.
  banner: { js: `import { createRequire } from "node:module"; const require = createRequire(${JSON.stringify(import.meta.url)});` },
  stdin: { contents: `export * from './api/_lib/transit-reading-production.ts';
    export * from './api/_lib/transit-reading-owner-voice.ts';
    export * from './api/_lib/report-owner-voice-corpus-v2.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{ name: "offline-boundaries", setup(builder) {
    builder.onResolve({ filter: /report-model-client\.js$/ }, () => ({ path: "provider", namespace: "fixture" }));
    builder.onResolve({ filter: /productionPreCallGate\.cjs$/ }, () => ({ path: "gate", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "provider"
      ? `export const callReportCalibrationModel = async (input) => { await input.beforeProviderCall(); return globalThis.ownerCorpusProvider(input); };`
      : `export const prepareProductionPreCallGate = () => ({}); export const assertProductionPreCallGate = () => true;` }));
  } }]
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const priorProvider = globalThis.ownerCorpusProvider;
const priorDocuments = process.env.PRIVATE_REPORT_DOCUMENTS;
let calls = 0;
try {
  globalThis.ownerCorpusProvider = async ({ prompt }) => { calls++; return { value: prompt, provider: "fixture", model: "fixture" }; };
  for (const [surface, horizon] of [["friends", "current"], ["you", "day"], ["you", "week"]]) {
    const meaning = "work routines responsibilities agreements independence family";
    const facts = surface === "you"
      ? { youTransitReadingBrief: { window: horizon, approvedReaderText: { themes: [meaning] } } }
      : { friendTransitsBrief: { primaryThemes: [], longerCycles: [], relationshipActivations: [], houseContext: [], activePatterns: [], daily: { forecast: { body: meaning } } } };
    const context = api.transitReadingVoiceContext(facts, surface);
    assert.deepEqual(context, { surface, horizon });
    const productionInput = { contentKey: "fixture", surface, mode: "daily", eventType: "transit-reading", facts, knowledgeIds: ["fixture"], sourceSnapshot: {} };
    const expected = api.transitReadingOwnerVoice(facts, surface);
    const expectedPrompt = api.transitReadingOwnerVoicePrompt(expected, context);
    const receipt = api.transitReadingOwnerVoiceReceipt(expected, context);
    assert.deepEqual(receipt.target, { surface, horizon });
    assert.equal(receipt.sources.length, api.reportOwnerSocialVoiceCorpusV1().length ? 4 : 3);
    assert.equal(receipt.referenceCoverage, receipt.sources.length === 4 ? "annual_and_short_forecast" : "annual_only");
    assert.equal(receipt.packetSha256, hash(JSON.stringify(expected)));
    for (const passage of expected) {
      const source = readPrivateReportDocument(passage.provenance.sourcePath);
      const originalTexts = passage.referenceFormat === "annual_report" ? [source] : JSON.parse(source).records.map((entry) => entry.text);
      assert.ok(originalTexts.some((text) => text.includes(passage.text)), "Whole selected passage must be verbatim.");
      assert.equal(hash(source), passage.provenance.sourceSha256);
      assert.equal(hash(passage.text), passage.provenance.passageSha256);
      assert.equal(passage.provenance.sourceType, "owner_authored_final");
    }
    for (const [role, attempt] of [["WRITER", "initial"], ["WRITER", "recovery"], ["WRITER", "correction"], ["REVIEWER", "judge"], ["REVIEWER", "rejudge"]]) {
      const kernel = api.prepareTransitReadingProductionKernel({ productionInput, role, draftValidated: role === "REVIEWER" });
      const response = await api.callGovernedTransitReadingModel({ kernel, provider: "fixture", model: "fixture", prompt: attempt, schemaName: "fixture", schema: {} });
      assert.ok(response.value === `${attempt}\n\n${expectedPrompt}`, "Complete evidence must reach provider transport.");
      assert.ok(JSON.stringify(kernel.ownerVoice) === JSON.stringify(expected), "Every role and attempt receives identical evidence.");
      assert.ok(response.value.includes("VOICE ONLY"));
      assert.ok(response.value.includes("sentence rhythm"));
      assert.ok(response.value.includes("vocabulary overlap alone is not proof of voice"));
      assert.ok(response.value.includes("three consecutive annual-report paragraphs"));
    }
    const kernel = api.prepareTransitReadingProductionKernel({ productionInput, role: "WRITER" });
    const before = calls;
    kernel.ownerVoice[0].text += " invented candidate";
    await assert.rejects(api.callGovernedTransitReadingModel({ kernel, provider: "fixture", model: "fixture", prompt: "test", schemaName: "fixture", schema: {} }), /EVIDENCE_INVALID/);
    assert.equal(calls, before, "Corrupt corpus must fail before transport.");
    assert.throws(() => api.transitReadingOwnerVoice({}, surface), /BRIEF_MISSING/);
    const reordered = structuredClone(expected);
    [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
    assert.throws(() => api.assertTransitReadingOwnerVoice(reordered), /EVIDENCE_INVALID/);
  }
  assert.throws(() => api.assertTransitReadingOwnerVoice([]), /EVIDENCE_INVALID/);
  const candidates = api.reportOwnerVoiceCorpusV2();
  assert.equal(new Set(candidates.map((entry) => entry.provenance.sourcePath)).size, 4);
  const defaultSet = api.reportOwnerVoiceComparisonSetV2("general", "overview");
  assert.deepEqual(defaultSet, api.reportOwnerVoiceComparisonSetV2("general", "overview", {}));
  const topic = candidates.find((entry) => entry.unitType === "overview" && entry.reportDomain === "general" && entry.function === "development");
  assert.ok(api.reportOwnerVoiceComparisonSetV2("general", "overview", { relevanceText: topic.text }).some((entry) => entry.evidenceId === topic.evidenceId));
  const developed = api.reportOwnerVoiceDevelopmentSetV2("communication learning agreements time responsibilities");
  assert.equal(developed.length, 3);
  assert.equal(new Set(developed.map((entry) => `${entry.provenance.sourcePath}:${entry.sectionHeading}`)).size, 1);
  const start = candidates.findIndex((entry) => entry.evidenceId === developed[0].evidenceId);
  assert.deepEqual(developed.map((entry) => entry.evidenceId), candidates.slice(start, start + 3).map((entry) => entry.evidenceId));
  assert.ok(developed.every((entry) => entry.unitType !== "overview"));
  for (const topic of ["communication responsibilities", "home family care", "work income career", "health routines energy", "love friendship honesty"]) {
    const passageSet = api.reportOwnerVoiceDevelopmentSetV2(topic);
    const sourceParagraphs = readPrivateReportDocument(passageSet[0].provenance.sourcePath).split(/\n\s*\n/gu).map((paragraph) => paragraph.trim());
    assert.ok(sourceParagraphs.some((_, index) => passageSet.every((passage, offset) => passage.text === sourceParagraphs[index + offset])), "Development must be consecutive in the original, not only the filtered corpus.");
  }
  const separated = candidates.find((entry) => entry.provenance.sourcePath === developed[0].provenance.sourcePath && entry.sectionHeading === developed[0].sectionHeading && !developed.some((passage) => passage.evidenceId === entry.evidenceId));
  assert.ok(separated);
  assert.equal(api.reportOwnerVoicePassagesAreConnected([developed[0], separated, developed[1]]), false);
  const fixedMeaning = { window: "day", approvedReaderText: { themes: "communication responsibilities" }, technicalEvidence: { detail: "original" } };
  const first = api.transitReadingOwnerVoice({ youTransitReadingBrief: fixedMeaning }, "you");
  fixedMeaning.technicalEvidence.detail = "unrelated technical wording";
  assert.deepEqual(first.map((entry) => entry.evidenceId), api.transitReadingOwnerVoice({ youTransitReadingBrief: fixedMeaning }, "you").map((entry) => entry.evidenceId));

  // Fixtures exercise supplemental storage without committing original prose.
  const sourceId = "private:report/social-writing-references-20260921";
  const fixture = {
    schema: "owner-social-references/v1", role: "register_only",
    sourceAssignment: "thread:01a0c440-92d0-7822-bda6-af3338840786",
    records: [{ id: "social-01", heading: "Fixture reference", text: "Complete synthetic reference text.",
      sourceFormat: "weekly_forecast", imageSha256: "a".repeat(64), passageSha256: hash("Complete synthetic reference text."),
      transcription: "visually_checked_complete_body_reflowed" }]
  };
  const setDocuments = (documents, schema = "private-reports/v1") => {
    process.env.PRIVATE_REPORT_DOCUMENTS = gzipSync(JSON.stringify({ schema, documents })).toString("base64");
  };
  const setSocial = (document) => { const body = JSON.stringify(document); setDocuments({ [sourceId]: { body, sha256: hash(body) } }); };
  setSocial(fixture);
  assert.equal(api.reportOwnerSocialVoiceCorpusV1().length, 1);
  const social = api.reportOwnerSocialVoiceComparison("synthetic reference", "week");
  assert.equal(social.text, fixture.records[0].text);
  const differentFormats = structuredClone(fixture);
  differentFormats.records.push({ ...fixture.records[0], id: "social-02", sourceFormat: "transit_forecast",
    text: "Different complete synthetic reference.", passageSha256: hash("Different complete synthetic reference.") });
  setSocial(differentFormats);
  assert.equal(api.reportOwnerSocialVoiceComparison("Different complete", "week").referenceFormat, "weekly_forecast", "Weekly format takes precedence over higher lexical overlap.");
  for (const horizon of ["day", "current"]) assert.equal(api.reportOwnerSocialVoiceComparison("Complete synthetic reference text.", horizon).referenceFormat, "transit_forecast");
  setSocial(fixture);
  assert.equal(social.provenance.sourceImageSha256, fixture.records[0].imageSha256);
  for (const mutation of [
    (doc) => { doc.records[0].text += " tampered"; },
    (doc) => { doc.records[0].transcription = "raw_ocr"; },
    (doc) => { doc.role = "meaning"; },
    (doc) => { doc.sourceAssignment = "unverified"; },
    (doc) => { doc.records.push(doc.records[0]); },
    (doc) => { doc.records[0].imageSha256 = "missing"; }
  ]) {
    const invalid = structuredClone(fixture); mutation(invalid); setSocial(invalid);
    assert.throws(() => api.reportOwnerSocialVoiceCorpusV1(), /SOCIAL_EVIDENCE_INVALID/);
    const before = calls;
    assert.throws(() => api.prepareTransitReadingProductionKernel({
      productionInput: { contentKey: "fixture", surface: "you", mode: "daily", eventType: "transit-reading", facts: { youTransitReadingBrief: fixedMeaning }, knowledgeIds: ["fixture"], sourceSnapshot: {} }, role: "WRITER"
    }), /SOCIAL_EVIDENCE_INVALID/);
    assert.equal(calls, before);
  }
  setDocuments({ [sourceId]: { body: "corrupt", sha256: "wrong" } });
  assert.throws(() => api.reportOwnerSocialVoiceCorpusV1(), /integrity verification/);
  setDocuments({ [sourceId]: { body: "invalid private JSON", sha256: hash("invalid private JSON") } });
  assert.throws(() => api.reportOwnerSocialVoiceCorpusV1(), (error) => error.message === "REPORT_OWNER_SOCIAL_EVIDENCE_INVALID");
  setSocial(null);
  assert.throws(() => api.reportOwnerSocialVoiceCorpusV1(), /SOCIAL_EVIDENCE_INVALID/);
  process.env.PRIVATE_REPORT_DOCUMENTS = gzipSync("invalid private JSON").toString("base64");
  assert.throws(() => api.reportOwnerSocialVoiceCorpusV1(), (error) => error.message === "Private report evidence failed integrity verification.");
  setDocuments([]);
  assert.throws(() => api.reportOwnerSocialVoiceCorpusV1(), /integrity verification/);
  setDocuments({}, "unknown-schema");
  assert.throws(() => api.reportOwnerSocialVoiceCorpusV1(), /integrity verification/);
  setDocuments({});
  assert.equal(api.reportOwnerSocialVoiceCorpusV1().length, 0);
  const annualOnly = api.transitReadingOwnerVoice({ youTransitReadingBrief: fixedMeaning }, "you");
  assert.equal(annualOnly.length, 3);
  assert.equal(api.transitReadingOwnerVoiceReceipt(annualOnly).referenceCoverage, "annual_only");
  assert.throws(() => api.transitReadingOwnerVoice({ youTransitReadingBrief: { window: "year", approvedReaderText: {} } }, "you"), /HORIZON_INVALID/);
  assert.throws(() => api.transitReadingOwnerVoice({ youTransitReadingBrief: { window: "day" } }, "you"), /MEANING_MISSING/);
  console.log("Generated report owner corpus: connected annual development, optional verified screenshots, both surfaces, all attempts, exact provenance and corrupt-source rejection passed (offline).");
} finally {
  globalThis.ownerCorpusProvider = priorProvider;
  if (priorDocuments === undefined) delete process.env.PRIVATE_REPORT_DOCUMENTS;
  else process.env.PRIVATE_REPORT_DOCUMENTS = priorDocuments;
}
