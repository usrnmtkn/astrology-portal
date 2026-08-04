#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const bankPath = path.join(packageRoot, "voice", "tldr-astro", "marie-satori-writer", "contrastive-edits.json");
const validOwnerReplacementIds = new Set([
  "sky-placement-uranus-cancer-specific-room-change",
  "sky-placement-uranus-cancer-name-relational-cost",
  "sky-placement-uranus-cancer-demand-not-carry",
  "sky-placement-communication-rejection-letter-to-message",
  "sky-placement-communication-compare-letters-to-messages",
  "sky-placement-neptune-libra-cancellation-shows-disagreement"
]);
const insufficientContextIds = new Set([
  "sky-placement-communication-letters-pile-up-to-messages-return",
  "sky-placement-communication-side-by-side-to-compare-messages"
]);

function auditRecords() {
  const records = JSON.parse(fs.readFileSync(bankPath, "utf8")).records;
  const fixtures = records.map((record) => {
    const preservedRejectedWording = typeof record.before === "string" && record.before.trim().length > 0;
    const exactOwnerWrittenReplacement = validOwnerReplacementIds.has(record.id);
    const clearOwnerProvenance = ["explicit_owner_feedback", "explicit_owner_edit_analysis"].includes(record.reasonSource);
    const contextSuppliedByReferencedFixture = record.id === "sky-placement-communication-rejection-letter-to-message"
      && record.sourcePaths.some((sourcePath) => sourcePath.endsWith("sky-placement-voice-pass-v7-writer-candidates.json"));
    const enoughContext = !insufficientContextIds.has(record.id)
      && (contextSuppliedByReferencedFixture || (
        record.before.trim().split(/\s+/u).length >= 4
        && record.after.trim().split(/\s+/u).length >= 4
      ));
    const calibrationRestricted = record.approvalLevel === "exact_owner_approved_calibration_only"
      || /calibration.only/iu.test(record.provenance || "");
    const valid = preservedRejectedWording && exactOwnerWrittenReplacement && clearOwnerProvenance && enoughContext && !calibrationRestricted;
    const reasons = [];
    if (!preservedRejectedWording) reasons.push("missing preserved rejected wording");
    if (!exactOwnerWrittenReplacement) reasons.push("record does not prove the replacement was written verbatim by the owner");
    if (!clearOwnerProvenance) reasons.push("owner provenance is directional or insufficiently explicit");
    if (!enoughContext) reasons.push("fragments do not provide enough context for held-out evaluation");
    if (calibrationRestricted) reasons.push("calibration-only evidence is ineligible for writer evaluation");
    return {
      id: record.id,
      preservedRejectedWording,
      exactOwnerWrittenReplacement,
      clearOwnerProvenance,
      enoughContext,
      calibrationRestricted,
      validHeldoutFixture: valid,
      reasons
    };
  });
  const validFixtureCount = fixtures.filter((fixture) => fixture.validHeldoutFixture).length;
  return {
    schemaVersion: 1,
    auditId: "sky-placement-writer-heldout-fixture-audit-v1",
    sourceRecordCount: records.length,
    targetFixtureCount: 20,
    validFixtureCount,
    exactShortfall: 20 - validFixtureCount,
    billedEvaluationsRun: false,
    fixtures
  };
}

function markdown(report) {
  const rows = report.fixtures.map((item) => `| ${item.id} | ${item.validHeldoutFixture ? "valid" : "ineligible"} | ${item.reasons.join("; ") || "all five criteria pass"} |`).join("\n");
  return `# Sky Placement writer held-out fixture audit\n\nThe 12 existing contrastive records yield **${report.validFixtureCount} valid held-out fixtures**. The exact shortfall from 20 is **${report.exactShortfall}**. No fixtures were fabricated and no billed evaluation was run.\n\n| Record | Result | Reason |\n|---|---|---|\n${rows}\n`;
}

function main() {
  const report = auditRecords();
  const outputJson = path.join(packageRoot, "review", "sky-placement-writer-heldout-fixture-audit-v1.json");
  const outputMarkdown = path.join(packageRoot, "review", "sky-placement-writer-heldout-fixture-audit-v1.md");
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outputMarkdown, markdown(report));
  console.log(`Audited ${report.sourceRecordCount} records: ${report.validFixtureCount} valid, shortfall ${report.exactShortfall}. No billed calls.`);
}

module.exports = { auditRecords, markdown };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
