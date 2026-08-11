#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { buildServingLintReport } = require("./audit-daily-glance-serving-lint.js");

const report = buildServingLintReport();
assert.strictEqual(report.servingPairs, 68);
assert.strictEqual(report.approvedPairs, 68);
assert.strictEqual(report.modelCalls, 0);
assert.strictEqual(report.servingChanges, 0);
assert.strictEqual(report.reviewStatusChanges, 0);
assert.strictEqual(report.blockingTier.passed, 58);
assert.strictEqual(report.blockingTier.failed, 10);
assert.strictEqual(Number(report.blockingTier.passRate.toFixed(6)), 0.852941);

const tiers = new Map(report.ruleStats.map((rule) => [rule.id, rule.tier]));
assert.strictEqual(tiers.has("OWNER-TEST-specificity"), false);
for (const id of [
  "OWNER-TEST-screenshot",
  "B1-L3+L4-headline-group-grammar",
  "OWNER-DIRECTIVE-short-blunt-line",
  "DG-R2-register",
  "global+VC-016+DG+SM-output-bans",
  "P4-one-final-instruction",
  "B1-L2-may-inner-states-only",
  "P4-body-sentence-count",
  "P4-body-word-count",
  "OWNER-TEST-morning-read"
]) assert.strictEqual(tiers.get(id), "advisory", `${id} is advisory`);

for (const rule of report.ruleStats.filter((entry) => entry.failureRate <= report.threshold)) {
  assert.strictEqual(rule.tier, "blocking", `${rule.id} stays blocking at or below 10%`);
}

assert.deepStrictEqual(report.blockingTier.failingCards, [
  { key: "conjunction/chiron", failedRules: ["DG-R17-quoted-dialogue-max-one"] },
  { key: "conjunction/pluto", failedRules: ["DG-R13-may-max-once"] },
  { key: "opposition/pluto", failedRules: ["DG-R17-quoted-dialogue-max-one"] },
  { key: "opposition/uranus", failedRules: ["P4-headline-one-declarative-sentence"] },
  { key: "soft/mars", failedRules: ["DG-R7-varied-opener", "DG-R12-no-time-anchor-opener", "DG-R16-owner-reserved-construction"] },
  { key: "soft/north-node", failedRules: ["DG-R4-no-outcome-promise"] },
  { key: "soft/pluto", failedRules: ["DG-R16-owner-reserved-construction"] },
  { key: "soft/south-node", failedRules: ["DG-R13-may-max-once"] },
  { key: "square/lilith", failedRules: ["DG-R12-no-time-anchor-opener"] },
  { key: "square/mercury", failedRules: ["DG-R12-no-time-anchor-opener"] }
]);

const batchTiers = new Map(report.batch.checks.map((check) => [check.id, check.tier]));
assert.strictEqual(batchTiers.get("DG-R1-recurring-sentence-frame"), "advisory");
assert.strictEqual(batchTiers.has("OWNER-TEST-specificity-batch"), false);
assert.strictEqual(batchTiers.get("batch-output-count"), "blocking");
assert.strictEqual(batchTiers.get("DG-R7-opener-variety"), "blocking");

process.stdout.write("daily-glance serving lint recalibration tests passed\n");
