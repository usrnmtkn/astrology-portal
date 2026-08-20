#!/usr/bin/env node

import fs from "node:fs";

const sourcePath = "packages/astro-knowledge/review/natal-moon-authoring-readiness-v2.json";
const outputPath = "packages/astro-knowledge/review/natal-moon-house-argument-owner-approval-2026-08-20.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const approvalText = "I approve the 12 Moon house argument cores for drafting only. Exclude childhood material for now and preserve it for later review. Do not publish until I approve the finished rendered samples.";

if (source.houseRows.length !== 12) throw new Error("Expected 12 Moon house argument cores.");
if (source.houseRows.some((row) => row.argumentCore.length !== 10 || row.qualityIntentions.length !== 5)) {
  throw new Error("Moon house argument packet is incomplete.");
}

const record = {
  schema: "tldr-natal-moon-house-argument-owner-approval/v1",
  createdAt: "2026-08-20",
  authority: {
    type: "owner_chat_approval",
    exactText: approvalText,
  },
  scope: {
    draftingOnly: true,
    argumentCoresApproved: 12,
    childhoodExcludedFromCurrentDraft: true,
    childhoodPreservedForLaterReview: true,
    finishedRenderedSamplesRequireOwnerApproval: true,
    readerCopyApproved: false,
    servingAuthorized: false,
    friendDerivationAuthorized: false,
    autoPublish: false,
    writerPromotion: false,
  },
  sourceArtifact: sourcePath,
  decisions: source.houseRows.map((row) => ({
    runtimeKey: row.runtimeKey,
    decision: "approve_argument_core_for_drafting_only",
    argumentCoreSha256: row.argumentCoreSha256,
    mechanismSha256: row.mechanismSha256,
    bridgeSha256: row.bridgeSha256,
  })),
};

fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`);
console.log(`Recorded drafting-only approval for ${record.decisions.length} Moon house argument cores; reader copy remains unapproved.`);
