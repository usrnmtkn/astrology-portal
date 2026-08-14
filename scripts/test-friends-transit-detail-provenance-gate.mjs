#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderTransitHouse } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import {
  exactOwnerApprovedTransitBody,
  exactOwnerApprovedTransitSections
} from "../apps/web/src/features/friends/transitDetailApproval.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sourceRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const transitRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
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

const saturnIntroKey = "authored/transit-house-intro/saturn/7";
const saturnAriesKey = "authored/transit-house-sign/saturn/7/aries";
const saturnRows = [saturnIntroKey, saturnAriesKey].map((contentKey) => {
  const row = rowsByKey.get(contentKey);
  assert.ok(row, `${contentKey}: fixture requires the owner-reviewed Saturn row`);
  assert.equal(row.approval?.approvalLevel, "exact_owner_approved", `${contentKey}: structured approval is missing`);
  const record = readJson(row.approval.recordPath);
  const payload = { body_you: row.body_you, body_they: row.body_they };
  assert.equal(record.contentKey, contentKey, `${contentKey}: approval record points at a different row`);
  assert.equal(record.payloadSha256, sha256(JSON.stringify(payload)), `${contentKey}: approval record hash drifted`);
  assert.deepEqual(record.payload, payload, `${contentKey}: approval record wording drifted`);
  return row;
});

const saturnFacts = {
  planet: "saturn",
  house: 7,
  sign: "aries",
  voice: "Nikki",
  isRetrograde: true,
  events: []
};
const nodeRenderedSaturn = renderTransitHouse(saturnFacts);
const browserRenderer = createTransitSynastryRenderer(
  transitRows,
  templates,
  sourceRows
);
const browserRenderedSaturn = browserRenderer.renderTransitHouse(saturnFacts);

assert.deepEqual(
  browserRenderedSaturn.partSourceKeys,
  nodeRenderedSaturn.partSourceKeys,
  "browser and Node renderers must expose identical house-transit provenance"
);
assert.deepEqual(
  nodeRenderedSaturn.partSourceKeys?.slice(0, 2),
  [[saturnIntroKey], [saturnAriesKey]],
  "the layered Saturn reading must attribute each approved prose unit to its real source row"
);
const approvedSaturnSections = exactOwnerApprovedTransitSections(
  nodeRenderedSaturn.parts.map((body, index) => ({
    body,
    sourceKeys: nodeRenderedSaturn.partSourceKeys?.[index] ?? []
  })),
  approvalLevelForContentKey
);
assert.deepEqual(
  approvedSaturnSections.map((section) => section.body),
  saturnRows.map((row) => row.body_they.replaceAll("{{Name}}", "Nikki")),
  "the historically owner-approved Saturn 7th-house friend reading must render byte-identically"
);
assert.equal(
  approvedSaturnSections.length,
  2,
  "unapproved retrograde overlays must remain hidden without suppressing approved base paragraphs"
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
assert.match(
  manualChartsPanelSource,
  /exactOwnerApprovedTransitSections\(\s*card\.normalized\.detailSections,/u,
  "Friends house-transit details must gate resolver-attributed prose units independently"
);

console.log("Friends transit detail provenance gate passed: approved Saturn detail and bond visible; untraced copy hidden.");
