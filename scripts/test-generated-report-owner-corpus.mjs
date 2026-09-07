import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { build } from "esbuild";

// Keep real production transport and corpus retrieval. Only the provider and
// unrelated catalog gate are offline fixtures; no billed model calls.
const bundle = await build({
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
let calls = 0;
try {
  globalThis.ownerCorpusProvider = async ({ prompt }) => { calls++; return { value: prompt, provider: "fixture", model: "fixture" }; };
  for (const surface of ["friends", "you"]) {
    const facts = { [surface === "friends" ? "friendTransitsBrief" : "youTransitReadingBrief"]: { themes: ["work routines responsibilities agreements independence family"] } };
    const productionInput = { contentKey: "fixture", surface, mode: "daily", eventType: "transit-reading", facts, knowledgeIds: ["fixture"], sourceSnapshot: {} };
    const expected = api.transitReadingOwnerVoice(facts, surface);
    const expectedPrompt = api.transitReadingOwnerVoicePrompt(expected);
    const receipt = api.transitReadingOwnerVoiceReceipt(expected);
    assert.equal(receipt.sources.length, 3);
    assert.equal(receipt.packetSha256, hash(JSON.stringify(expected)));
    for (const passage of expected) {
      const source = fs.readFileSync(passage.provenance.sourcePath, "utf8");
      assert.ok(source.includes(passage.text), "Whole selected paragraph must be verbatim.");
      assert.equal(hash(source), passage.provenance.sourceSha256);
      assert.equal(hash(passage.text), passage.provenance.passageSha256);
      assert.equal(passage.provenance.sourceType, "owner_authored_final");
    }
    for (const [role, attempt] of [["WRITER", "initial"], ["WRITER", "recovery"], ["WRITER", "correction"], ["REVIEWER", "judge"], ["REVIEWER", "rejudge"]]) {
      const kernel = api.prepareTransitReadingProductionKernel({ productionInput, role, draftValidated: role === "REVIEWER" });
      const response = await api.callGovernedTransitReadingModel({ kernel, provider: "fixture", model: "fixture", prompt: attempt, schemaName: "fixture", schema: {} });
      assert.equal(response.value, `${attempt}\n\n${expectedPrompt}`);
      assert.deepEqual(kernel.ownerVoice, expected, "Every role and attempt receives identical evidence.");
      assert.ok(response.value.includes("VOICE ONLY"));
      assert.ok(response.value.includes("sentence rhythm"));
      assert.ok(response.value.includes("vocabulary overlap alone is not proof of voice"));
    }
    const kernel = api.prepareTransitReadingProductionKernel({ productionInput, role: "WRITER" });
    const before = calls;
    kernel.ownerVoice[0].text += " invented candidate";
    await assert.rejects(api.callGovernedTransitReadingModel({ kernel, provider: "fixture", model: "fixture", prompt: "test", schemaName: "fixture", schema: {} }), /EVIDENCE_INVALID/);
    assert.equal(calls, before, "Corrupt corpus must fail before transport.");
    assert.throws(() => api.transitReadingOwnerVoice({}, surface), /BRIEF_MISSING/);
  }
  assert.throws(() => api.assertTransitReadingOwnerVoice([]), /EVIDENCE_INVALID/);
  const candidates = api.reportOwnerVoiceCorpusV2();
  assert.equal(new Set(candidates.map((entry) => entry.provenance.sourcePath)).size, 4);
  const defaultSet = api.reportOwnerVoiceComparisonSetV2("general", "overview");
  assert.deepEqual(defaultSet, api.reportOwnerVoiceComparisonSetV2("general", "overview", {}));
  const topic = candidates.find((entry) => entry.unitType === "overview" && entry.reportDomain === "general" && entry.function === "development");
  assert.ok(api.reportOwnerVoiceComparisonSetV2("general", "overview", { relevanceText: topic.text }).some((entry) => entry.evidenceId === topic.evidenceId));
  console.log("Generated report owner corpus: both surfaces, all attempts, exact provenance, relevance and fail-closed transport passed (offline).");
} finally { globalThis.ownerCorpusProvider = priorProvider; }
