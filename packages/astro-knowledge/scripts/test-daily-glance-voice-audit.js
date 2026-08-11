"use strict";

const assert = require("assert");
const childProcess = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  mechanicalFindings,
  rankAuditRows,
  scheduledCandidateConfig,
  servingPairs
} = require("./audit-daily-glance-voice.js");
const {
  JUDGE_MODEL,
  JUDGE_REASONING_EFFORT,
  judgeOperatingMode
} = require("./judge-daily-glance.js");
const {
  buildPacket,
  packetLint,
  readJson,
  renderModelInput
} = require("./daily-glance-writer-runtime.js");
const {
  approvedGoodExamples,
  lintSelfAuditCandidate,
  loadDirective,
  parseSelfAuditCandidate,
  renderSelfAuditWriterInput,
  selectLintCleanWinner,
  selfAuditPacketLint
} = require("./daily-glance-self-audit-candidates.js");
const {
  DEFAULT_KEYS,
  parseKeys,
  summarizeResults
} = require("./run-daily-glance-self-audit-pilot.js");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const sourceRows = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "fallback-source-rows-v3.json"), "utf8"));
const config = readJson(path.join(packageRoot, "config", "daily-glance-writer-sol-xhigh-batch-3-self-audit-v2.json"));
const pilotDir = path.join(packageRoot, "review", "daily-glance-sol-directive-pilot-2026-08-10");
const disposition = JSON.parse(fs.readFileSync(path.join(pilotDir, "owner-disposition-2026-08-11.json"), "utf8"));
assert.strictEqual(disposition.candidateCount, 12);
assert.strictEqual(disposition.ownerReportedLintCleanCount, 10);
assert.strictEqual(disposition.disposition, "RETAIN_AS_REGISTER_EVIDENCE / DO_NOT_SERVE");
assert.strictEqual(disposition.serveEligible, false);
assert.strictEqual(disposition.promotionEligible, false);
assert.strictEqual(disposition.candidatePoolEligible, false);
for (const entry of disposition.candidates) {
  const artifact = JSON.parse(fs.readFileSync(path.join(pilotDir, `${entry.key.replace(/\//gu, "-")}.candidates.json`), "utf8"));
  const candidate = artifact.candidates.find((value) => value.sample === entry.sample);
  assert(candidate, `${entry.key} sample ${entry.sample} is recorded`);
  assert.strictEqual(candidate.provider.responseId, entry.responseId);
  assert.strictEqual(crypto.createHash("sha256").update(candidate.raw).digest("hex"), entry.rawSha256);
  assert.strictEqual(candidate.promotionEligible, false);
  assert.strictEqual(candidate.candidatePoolEligible, false);
}

function approvedSceneContext(key) {
  const [group, target] = key.split("/");
  return {
    canGenerateContextualCandidate: true,
    chartContext: group === "house"
      ? { kind: "house", transitPlanet: "moon", transitSign: "Aries", transitHouse: Number(target), housesReliable: true }
      : { kind: "aspect", transitPlanet: "moon", transitSign: "Aries", transitHouse: null, natalPoint: target, natalSign: null, natalHouse: null, aspect: group === "soft" ? "trine" : group, aspectGroup: group, orb: 1, housesReliable: false },
    mechanism: { sourceId: `test:${key}`, text: `Approved test mechanism for ${key}.`, sourceApproval: "approved" },
    aspectGrammar: group === "house" ? null : { id: `${group}-test`, invariant: "Test-only grammar." },
    licenses: [{
      licenseId: `scene-license/test/${key}/v1`,
      approval: { status: "approved", inheritsSourceApproval: false, ownerApproved: true, writerEligible: true, renderEligible: false },
      normalizedMeaning: { domains: [], roles: [], objects: [], actions: [] },
      sourceIds: [`test:${key}`]
    }],
    writerBoundary: { enabled: true, instruction: "Use only the resolved test context.", allowed: {}, doNotInvent: {} }
  };
}

assert.strictEqual(JUDGE_MODEL, "gpt-5.6-terra");
assert.strictEqual(JUDGE_REASONING_EFFORT, "low");
assert.deepStrictEqual(judgeOperatingMode().mode, "flag-only");
assert.strictEqual(judgeOperatingMode().permanentlyDemoted, true);
assert.strictEqual(servingPairs(sourceRows).length, 68);
assert.strictEqual(sourceRows.vocabularyRows.filter((row) => row.contentKey.startsWith("fallback-vocab/dodont-")).length, 184);
assert(mechanicalFindings("A transformative journey—begin now.").some((finding) => finding.source === "machine-era-register"));
assert(!loadDirective(config).includes("Pipeline notes"));
assert.deepStrictEqual(parseKeys([]), [...DEFAULT_KEYS]);
assert.deepStrictEqual(parseKeys(["--keys", "soft/chiron,square/uranus"]), ["soft/chiron", "square/uranus"]);
assert.throws(() => parseKeys(["--keys", "soft/chiron,soft/chiron"]), /unique/u);
const blockedPilot = childProcess.spawnSync(process.execPath, [
  path.join(packageRoot, "scripts", "run-daily-glance-self-audit-pilot.js"),
  "--authorize-live",
  "--keys",
  "conjunction/neptune"
], { cwd: repoRoot, encoding: "utf8", env: { ...process.env, OPENAI_API_KEY: "" } });
assert.notStrictEqual(blockedPilot.status, 0);
assert.match(`${blockedPilot.stdout}\n${blockedPilot.stderr}`, /SCENE_CONTEXT_REQUIRED/u);
const pilotSummary = summarizeResults([
  { key: "soft/chiron", candidates: [
    { lint: { passed: true }, provider: { usage: { inputTokens: 10 }, estimatedCostUsd: 0.1 } },
    { lint: { passed: false }, provider: { usage: { inputTokens: 20 }, estimatedCostUsd: 0.2 } },
    { lint: { passed: false }, provider: { usage: { inputTokens: 30 }, estimatedCostUsd: 0.3 } }
  ] },
  { key: "square/uranus", candidates: [
    { lint: { passed: false }, provider: { usage: { inputTokens: 10 }, estimatedCostUsd: 0.1 } },
    { lint: { passed: false }, provider: { usage: { inputTokens: 20 }, estimatedCostUsd: 0.2 } },
    { lint: { passed: false }, provider: { usage: { inputTokens: 30 }, estimatedCostUsd: 0.3 } }
  ] }
]);
assert.strictEqual(pilotSummary.calls, 6);
assert.strictEqual(pilotSummary.lintClean, 1);
assert.deepStrictEqual(pilotSummary.noLintCleanCandidateKeys, ["square/uranus"]);

const ranked = rankAuditRows([
  { key: "b", score: 1, failedDimensions: ["voice"] },
  { key: "a", score: 1, failedDimensions: ["voice", "stakes"] },
  { key: "c", score: 2, failedDimensions: Array(7).fill("x") }
], "flag-only");
assert.deepStrictEqual(ranked.map((row) => row.key), ["a", "b", "c"]);

assert.deepStrictEqual(config.keys.map((target) => target.key), [
  "conjunction/neptune",
  "soft/chiron",
  "square/sun",
  "square/uranus",
  "conjunction/pluto"
]);
assert.strictEqual(config.candidateSamplesPerKey, 3);
for (const target of config.keys) {
  const packet = buildPacket(target.key, config);
  const modelInput = renderModelInput(packet);
  assert.strictEqual(packet.ownerPassages.length, 6);
  assert.strictEqual(packet.outputPolicy.noNegativeExamples, true);
  assert.strictEqual(packetLint(packet, modelInput, config).passed, true, `${target.key} packet self-lint`);
  const examples = approvedGoodExamples(target.key, sourceRows);
  const sceneContext = approvedSceneContext(target.key);
  const directiveInput = renderSelfAuditWriterInput(packet, config, examples, sceneContext);
  const currentPair = servingPairs(sourceRows).find((pair) => pair.key === target.key);
  assert.strictEqual(examples.length, 3);
  assert(examples.every((example) => example.key !== target.key && example.key.split("/")[0] === target.key.split("/")[0]));
  assert(!directiveInput.includes("{{TRANSIT_KEY}}"));
  assert(!directiveInput.includes("Pipeline notes"));
  assert(!directiveInput.includes(currentPair.headline));
  assert(!directiveInput.includes(currentPair.body));
  assert(directiveInput.includes("Write exactly one candidate"));
  assert(directiveInput.includes('"screenshot_line"'));
  assert(!directiveInput.includes("portability_check"));
  assert(!directiveInput.includes("OWNER-TEST-specificity"));
  assert(directiveInput.includes("Scene specificity must be earned by resolved astrology."));
  assert(directiveInput.includes("Concrete does not mean domain-specific."));
  assert(directiveInput.includes("The writer does not choose where the astrology happens. The chart resolver does."));
  assert(directiveInput.includes("[BLOCKING] DG-R13:"));
  assert.strictEqual((directiveInput.match(/SOL-DIRECTIVE-output-schema/gu) || []).length, 1);
  assert.strictEqual((directiveInput.match(/### Transit mechanism/gu) || []).length, 1);
  assert.strictEqual(selfAuditPacketLint(packet, directiveInput, config, examples, currentPair, sceneContext).passed, true, `${target.key} directive packet self-lint`);
}

{
  const packet = buildPacket("square/sun", config);
  const examples = approvedGoodExamples("square/sun", sourceRows);
  assert.throws(() => renderSelfAuditWriterInput(packet, config, examples), /Resolved chart context/u);
}

const validShape = JSON.stringify({
  transit_key: "square/sun",
  headline: "Your public role crowds out what you need.",
  body: "You keep the meeting moving after realizing you need a break. The polished answer costs you the only open hour in your afternoon. You may resent the work before admitting that the schedule no longer fits. The role looks intact, but your actual need has nowhere to go.",
  screenshot_line: "The polished answer costs you the only open hour in your afternoon."
});
assert.strictEqual(parseSelfAuditCandidate(validShape, "square/sun").transit_key, "square/sun");
assert.throws(() => parseSelfAuditCandidate(JSON.stringify({ headline: "x", body: "y" }), "square/sun"), /exactly/u);
assert.throws(() => parseSelfAuditCandidate(validShape.replace('"square/sun"', '"soft/sun"'), "square/sun"), /does not match/u);
const validShapeLint = lintSelfAuditCandidate(JSON.parse(validShape), "square/sun", scheduledCandidateConfig(["square/sun"]));
assert(!validShapeLint.checks.some((check) => check.id === "SOL-DIRECTIVE-output-schema" && !check.passed));
const invalidDirectiveLint = lintSelfAuditCandidate({
  ...JSON.parse(validShape),
  headline: "Notice what happens?",
  body: "You may leave. You might return. Usually, you wait.",
  screenshot_line: "This sentence is absent."
}, "square/sun", scheduledCandidateConfig(["square/sun"]));
assert.strictEqual(invalidDirectiveLint.passed, false);
assert(invalidDirectiveLint.checks.some((check) => check.id === "SOL-DIRECTIVE-hedging" && !check.passed));
assert(invalidDirectiveLint.checks.some((check) => check.id === "SOL-DIRECTIVE-screenshot" && !check.passed));
const fakeCandidates = [
  { sample: 1, candidate: { headline: "fail" }, lint: { passed: false }, judge: { skipped: true } },
  { sample: 2, candidate: { headline: "pass" }, lint: { passed: true }, judge: { skipped: false, score: 2, dimScore: 5 } }
];
assert.strictEqual(selectLintCleanWinner(fakeCandidates, "flag-only", () => 0).candidate.headline, "pass");
assert.strictEqual(selectLintCleanWinner(fakeCandidates.slice(0, 1), "flag-only", () => 0), null);
assert.strictEqual(selectLintCleanWinner([{ ...fakeCandidates[1], promotionEligible: false }], "flag-only", () => 0), null);

const scheduleProbe = scheduledCandidateConfig(["opposition/venus", "soft/saturn", "house/6", "square/neptune", "conjunction/south-node"]);
assert.strictEqual(scheduleProbe.keys.length, 5);
for (const target of scheduleProbe.keys) {
  const packet = buildPacket(target.key, scheduleProbe);
  assert.strictEqual(packetLint(packet, renderModelInput(packet), scheduleProbe).passed, true, `${target.key} schedule-safe packet self-lint`);
}

const allServingKeys = servingPairs(sourceRows).map((pair) => pair.key);
for (let index = 0; index < allServingKeys.length; index += 5) {
  const scheduled = scheduledCandidateConfig(allServingKeys.slice(index, index + 5));
  for (const target of scheduled.keys) {
    const packet = buildPacket(target.key, scheduled);
    assert.strictEqual(packetLint(packet, renderModelInput(packet), scheduled).passed, true, `${target.key} full-surface schedule preflight`);
    const examples = approvedGoodExamples(target.key, sourceRows);
    const currentPair = servingPairs(sourceRows).find((pair) => pair.key === target.key);
    const sceneContext = approvedSceneContext(target.key);
    const directiveInput = renderSelfAuditWriterInput(packet, scheduled, examples, sceneContext);
    assert.strictEqual(selfAuditPacketLint(packet, directiveInput, scheduled, examples, currentPair, sceneContext).passed, true, `${target.key} full-surface directive preflight`);
  }
}

const reportPath = path.join(packageRoot, "review", "daily-glance-voice-audit-2026-08-10.json");
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.strictEqual(report.rows.length, 68);
  assert.strictEqual(report.operatingMode, "flag-only");
  assert.strictEqual(report.calibrationFailed, true);
  assert.strictEqual(report.candidateGeneration.status, "UNAPPROVED");
  assert.strictEqual(report.rows.filter((row) => row.replacementProposal).length, 5);
  assert.strictEqual(report.ledgerAgreement.flagged, 66);
  assert.strictEqual(report.ledgerAgreement.pending, 66);
  assert.strictEqual(report.ledgerAgreement.agreementRate, null);
}

process.stdout.write("daily-glance voice self-audit tests passed\n");
