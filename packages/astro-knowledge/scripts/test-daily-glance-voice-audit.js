"use strict";

const assert = require("assert");
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

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const sourceRows = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "fallback-source-rows-v3.json"), "utf8"));
const config = readJson(path.join(packageRoot, "config", "daily-glance-writer-sol-xhigh-batch-3-self-audit-v1.json"));

assert.strictEqual(JUDGE_MODEL, "gpt-5.6-terra");
assert.strictEqual(JUDGE_REASONING_EFFORT, "low");
assert.deepStrictEqual(judgeOperatingMode().mode, "flag-only");
assert.strictEqual(judgeOperatingMode().permanentlyDemoted, true);
assert.strictEqual(servingPairs(sourceRows).length, 68);
assert.strictEqual(sourceRows.vocabularyRows.filter((row) => row.contentKey.startsWith("fallback-vocab/dodont-")).length, 184);
assert(mechanicalFindings("A transformative journey—begin now.").some((finding) => finding.source === "machine-era-register"));

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
for (const target of config.keys) {
  const packet = buildPacket(target.key, config);
  const modelInput = renderModelInput(packet);
  assert.strictEqual(packet.ownerPassages.length, 6);
  assert.strictEqual(packet.outputPolicy.noNegativeExamples, true);
  assert.strictEqual(packetLint(packet, modelInput, config).passed, true, `${target.key} packet self-lint`);
}

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
}

process.stdout.write("daily-glance voice self-audit tests passed\n");
