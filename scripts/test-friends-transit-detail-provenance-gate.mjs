#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  exactOwnerApprovedTransitBody,
  exactOwnerApprovedTransitSections
} from "../apps/web/src/features/friends/transitDetailApproval.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const sourceRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const transitRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const relationshipBundleSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3RelationshipBundle.ts"),
  "utf8"
);
const manualChartsPanelSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/ManualChartsPanel.tsx"),
  "utf8"
);

const allRows = [
  ...(sourceRows.hookRows ?? []),
  ...(transitRows.authoredCards ?? [])
];
const rowsByKey = new Map(allRows.map((row) => [row.contentKey, row]));
const approvalLevelForContentKey = (contentKey) => (
  rowsByKey.get(contentKey)?.approval?.approvalLevel ?? null
);

const bondRow = sourceRows.hookRows.find((row) => (
  row.contentKey.startsWith("fallback-hook/bond-effect-")
  && row.approval?.approvalLevel === "exact_owner_approved"
));
assert.ok(bondRow?.body_you, "fixture requires one exact-approved directional bond row");
assert.deepEqual(
  exactOwnerApprovedTransitBody(
    bondRow.body_you,
    bondRow.contentKey,
    approvalLevelForContentKey
  ),
  [bondRow.body_you],
  "exact-owner-approved bond-effect paragraph must render"
);

const legacyTransitRow = transitRows.authoredCards.find((row) => (
  row.contentKey.startsWith("authored/transit-aspect/")
  && row.review_status === "approved"
  && !row.approval?.approvalLevel
  && (row.body_you || row.body)
));
assert.ok(legacyTransitRow, "fixture requires one untraced legacy transit row");
assert.deepEqual(
  exactOwnerApprovedTransitSections([{
    body: legacyTransitRow.body_you ?? legacyTransitRow.body,
    sourceKeys: [legacyTransitRow.contentKey]
  }], approvalLevelForContentKey),
  [],
  "legacy transit paragraph must hide even when review_status is approved"
);

const legacyHouseRow = sourceRows.hookRows.find((row) => (
  row.contentKey.startsWith("fallback-hook/transit-effect-house/")
));
assert.ok(legacyHouseRow, "fixture requires one legacy house-transit row");
assert.deepEqual(
  exactOwnerApprovedTransitSections([{
    body: legacyHouseRow.body_you,
    sourceKeys: [legacyHouseRow.contentKey]
  }], approvalLevelForContentKey),
  [],
  "untraced house-transit paragraph must hide"
);
assert.deepEqual(
  exactOwnerApprovedTransitSections([{
    body: "A mixed-provenance paragraph must fail closed.",
    sourceKeys: [bondRow.contentKey, legacyHouseRow.contentKey]
  }], approvalLevelForContentKey),
  [],
  "one exact-approved source must not expose prose assembled from an untraced source"
);

assert.match(
  relationshipBundleSource,
  /exactApprovedBondEffectRows/u,
  "relationship lazy bundle must preserve the exact-approved directional rows"
);
assert.equal(
  (manualChartsPanelSource.match(/exactOwnerApprovedTransitSections\(/gu) ?? []).length,
  2,
  "both personal-transit and house-transit detail sections must use the permanent gate"
);
assert.match(
  manualChartsPanelSource,
  /exactOwnerApprovedTransitBody\(\s*card\.effectBody,\s*card\.effectContentKey,/u,
  "bond-effect detail body must use the permanent gate"
);

console.log("Friends transit detail provenance gate passed: exact bond visible; legacy transit and house copy hidden.");
