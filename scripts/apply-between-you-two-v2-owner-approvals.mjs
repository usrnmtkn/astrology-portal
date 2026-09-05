#!/usr/bin/env node
import fs from "node:fs";

const reviewDir = "packages/astro-knowledge/review/between-you-two-v2-2026-09-05";
const reviewPath = `${reviewDir}/full-authoring-review.json`;
const batchPaths = [
  `${reviewDir}/owner-approval-batch-1.json`,
  `${reviewDir}/owner-approval-batch-2.json`,
  `${reviewDir}/owner-approval-batch-3.json`
];

const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
const byId = new Map(review.records.map((record) => [record.id, record]));

for (const record of review.records) {
  if (record.family && record.transiting) {
    record.reviewStatus = "proposed";
    record.reviewStatusYou = "proposed";
    record.reviewStatusThey = "proposed";
    delete record.ownerApprovalSources;
    delete record.v2Body;
  }
}

for (const batchPath of batchPaths) {
  const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
  for (const approval of batch.records) {
    const record = byId.get(approval.id);
    if (!record) throw new Error(`Approval ${approval.id} is not present in full authoring review.`);

    if (record.evidenceTier === "shared-moon") {
      if (approval.headline !== record.headline || approval.body !== record.body) {
        throw new Error(`Shared-Moon approval drift for ${approval.id}`);
      }
      record.reviewStatus = "owner_approved";
      record.ownerApprovalSources = [...(record.ownerApprovalSources ?? []), batchPath];
      continue;
    }

    if (record.family !== approval.family || record.transiting !== approval.transiting) {
      throw new Error(`Mechanism mismatch for ${approval.id}`);
    }
    record.headline.body_you = approval.headline_body_you;
    record.move.body_you = approval.move_body_you;
    if (typeof approval.body_body_you === "string" && approval.body_body_you.trim()) {
      record.v2Body = { body_you: approval.body_body_you };
    }
    record.reviewStatusYou = "owner_approved";
    record.reviewStatusThey = "proposed";
    record.reviewStatus = "partially_owner_approved";
    record.ownerApprovalSources = [...(record.ownerApprovalSources ?? []), batchPath];
  }
}

const approvedYouBond = review.records.filter((record) => record.reviewStatusYou === "owner_approved");
const approvedYouBodyOverrides = approvedYouBond.filter((record) => typeof record.v2Body?.body_you === "string" && record.v2Body.body_you.trim());
const approvedMoon = review.records.filter((record) => record.evidenceTier === "shared-moon" && record.reviewStatus === "owner_approved");
if (approvedYouBond.length !== 18) throw new Error(`Expected 18 owner-approved reader-direction bond mechanisms, got ${approvedYouBond.length}`);
if (approvedYouBodyOverrides.length !== 7) throw new Error(`Expected 7 owner-approved V2 lead-body overrides, got ${approvedYouBodyOverrides.length}`);
if (approvedMoon.length !== 1 || approvedMoon[0].id !== "shared-moon-fire") {
  throw new Error("Shared-Moon Fire must be the only approved Moon calibration record.");
}
if (review.records.some((record) => record.reviewStatusThey === "owner_approved")) {
  throw new Error("No reverse-direction V2 headline/move text has been explicitly owner-approved yet.");
}
if (review.records.some((record) => typeof record.v2Body?.body_they === "string" && record.v2Body.body_they.trim())) {
  throw new Error("No reverse-direction V2 lead body has been explicitly owner-approved yet.");
}

review.approvalBoundary = {
  bondReaderDirectionApproved: approvedYouBond.length,
  bondReaderDirectionBodyOverridesApproved: approvedYouBodyOverrides.length,
  bondReverseDirectionApproved: 0,
  sharedMoonApproved: approvedMoon.length,
  note: "Owner approval is direction-specific. Do not infer exact-wording approval for reverse-direction headline, body, or move text from reader-facing review examples."
};

fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
console.log(`Applied V2 owner approvals: ${approvedYouBond.length} reader-direction bond mechanisms, ${approvedYouBodyOverrides.length} V2 lead-body overrides, ${approvedMoon.length} shared-Moon record; reverse direction remains held.`);
