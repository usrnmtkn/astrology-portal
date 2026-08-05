#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "packages/astro-knowledge");
const fallbackRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const proposalPath = path.join(packageRoot, "review/sky-placement-sun-venus-chiron-nodes-26-serving-diff-proposal-2026-08-04.json");
const approvalPath = path.join(packageRoot, "review/sky-placement-sun-venus-chiron-nodes-26-serving-approval-2026-08-04.json");
const rowsPath = path.join(fallbackRoot, "source-rows/sky-placement-owner-approved-fallbacks-v1.json");
const manifestPath = path.join(fallbackRoot, "authored-inputs/sky-placement-serving-manifest-v1.json");
const read = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const write = (filePath, value) => fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);

const proposal = read(proposalPath);
const sourceRows = read(rowsPath);
const manifest = read(manifestPath);
const keys = proposal.rows.map((entry) => entry.key);
const keySet = new Set(keys);
const statement = "I confirm the 26-key serving diff as proposed, including the Sun in Leo payload replacement.";
const approvalSource = "packages/astro-knowledge/review/sky-placement-sun-venus-chiron-nodes-26-serving-approval-2026-08-04.json";

if (proposal.exactScopedKeyCount !== 26 || keys.length !== 26 || keySet.size !== 26) {
  throw new Error("The approved serving proposal must contain exactly 26 unique keys.");
}
if (proposal.contentKeyChanges.replacementKeys.join("|") !== "fallback-hook/sky-sign-copy/sun/leo") {
  throw new Error("The proposal must identify Sun in Leo as the sole replacement key.");
}
if (proposal.contentKeyChanges.removedKeys.length !== 0) throw new Error("The approved proposal must remove no content keys.");

const proposalRows = proposal.rows.map((entry) => entry.row);
for (const row of proposalRows) {
  if (row.review_status !== "approved" || !row.opening || !row.tension || !row.development || !row.close) {
    throw new Error(`Incomplete approved serving row: ${row.contentKey}.`);
  }
}
sourceRows.version = "1.4.0";
sourceRows.rows = [...sourceRows.rows.filter((row) => !keySet.has(row.contentKey)), ...proposalRows];
if (new Set(sourceRows.rows.map((row) => row.contentKey)).size !== sourceRows.rows.length) {
  throw new Error("Owner-approved source rows contain duplicate content keys after the 26-key application.");
}

const legacy = manifest.releases.find((release) => release.release_id === "pre-manifest-sun-leo-serving");
if (!legacy || !legacy.approved_keys.includes("fallback-hook/sky-sign-copy/sun/leo")) {
  throw new Error("The legacy Sun-in-Leo release was not found for explicit supersession.");
}
legacy.historical_owner_approval = legacy.owner_approval;
legacy.owner_approval = null;
legacy.distribution_state = "superseded";
legacy.transition = "superseded_by_sky-placement-sun-venus-chiron-nodes-26";
legacy.superseded_keys = ["fallback-hook/sky-sign-copy/sun/leo"];
legacy.superseded_by = "sky-placement-sun-venus-chiron-nodes-26";
legacy.approved_keys = [];

const ownerApproval = {
  statement,
  approved_at: "2026-08-04",
  source: approvalSource,
  approved_keys: keys
};
const combinedRelease = {
  release_id: "sky-placement-sun-venus-chiron-nodes-26",
  release_batch: "sun-venus-chiron-nodes-26",
  distribution_state: "serving",
  transition: "staged_to_serving",
  required_runtime_capability: "sky-placement-on-demand-v1",
  migration_gate: proposal.servingTransition.migration_gate,
  approved_keys: keys,
  owner_approval: ownerApproval
};
const oldPromotionIndex = manifest.releases.findIndex((release) => release.release_id === "sky-placement-chiron-nodes-promotion");
if (oldPromotionIndex < 0) throw new Error("The applied Chiron/Nodes promotion release is missing.");
manifest.releases.splice(oldPromotionIndex, 1, combinedRelease);

const allManifestKeys = manifest.releases.flatMap((release) => release.approved_keys || []);
if (new Set(allManifestKeys).size !== allManifestKeys.length) throw new Error("Serving manifest contains duplicate approved keys.");

proposal.status = "explicit_owner_serving_approval_recorded";
proposal.servingTransition.owner_approval = ownerApproval;
proposal.servingTransition.explicitServingApprovalRequired = false;
proposal.ownerServingApproval = { statement, approvedAt: "2026-08-04", source: approvalSource };
proposal.governance = {
  applied: true,
  sourceRowsChanged: true,
  placementRuntimeEligibilityChanged: true,
  manifestChanged: true,
  packagesRegenerated: false,
  merged: false,
  deployed: false,
  explicitOwnerServingConfirmationRequired: false
};

const approvalRecord = {
  schemaVersion: 1,
  id: "sky-placement-sun-venus-chiron-nodes-26-serving-approval-2026-08-04",
  recordedAt: new Date().toISOString(),
  proposalId: proposal.id,
  proposalSource: "packages/astro-knowledge/review/sky-placement-sun-venus-chiron-nodes-26-serving-diff-proposal-2026-08-04.json",
  statement,
  ownerApprovedServing: true,
  exactKeyCount: 26,
  approvedKeys: keys,
  sunLeoReplacementApproved: true,
  removedKeys: [],
  runtimeEligibilityFlips: proposal.runtimeEligibilityFlips,
  transition: "staged_to_serving",
  deploymentEvidenceUsedAsMigrationGate: proposal.deploymentEvidence,
  appliedLocally: true,
  merged: false,
  productionDeployed: false,
  productionVerification: null
};

write(rowsPath, sourceRows);
write(manifestPath, manifest);
write(proposalPath, proposal);
write(approvalPath, approvalRecord);
console.log(JSON.stringify({ appliedKeys: keys.length, totalOwnerApprovedRows: sourceRows.rows.length, legacySunLeoSuperseded: true, manifestRelease: combinedRelease.release_id, runtimeEligibilityFlips: proposal.runtimeEligibilityFlips.map((entry) => entry.id), deploymentHeld: true }, null, 2));
