#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderTransitHouse } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import {
  acceptedOwnerApprovedTransitBody,
  acceptedOwnerApprovedTransitSections
} from "../apps/web/src/features/friends/transitDetailApproval.ts";
import {
  FRIENDS_ACCEPTED_APPROVAL_LEVELS
} from "../apps/web/src/content/fallbackApproval.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sourceRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const transitRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const rulingRecord = readJson("packages/astro-knowledge/review/friends-owner-signoff-untraced-ruling-2026-08-13.json");
const relationshipBundleSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3RelationshipBundle.ts"),
  "utf8"
);
const manualChartsPanelSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/ManualChartsPanel.tsx"),
  "utf8"
);
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const friendTransitsTabSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/FriendTransitsTab.tsx"),
  "utf8"
);

const allRows = [
  ...(sourceRows.hookRows ?? []),
  ...(transitRows.authoredCards ?? [])
];
const rowsByKey = new Map(allRows.map((row) => [row.contentKey, row]));
const approvalLevelForContentKey = (contentKey) => {
  const row = rowsByKey.get(contentKey);
  return row ? row.approval?.approvalLevel ?? "ungated" : null;
};

assert.deepEqual(
  [...FRIENDS_ACCEPTED_APPROVAL_LEVELS],
  ["exact_owner_approved", "owner_signoff_untraced"],
  "Friends must accept both owner-ruling approval levels without collapsing them"
);
assert.equal(rulingRecord.counts.articleRows, 1501);
assert.equal(rulingRecord.counts.supportingRows, 88);

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
const approvedSaturnSections = acceptedOwnerApprovedTransitSections(
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
  acceptedOwnerApprovedTransitBody(
    bondRow.body_you,
    bondRow.contentKey,
    approvalLevelForContentKey
  ),
  [bondRow.body_you],
  "exact-owner-approved bond-effect paragraph must render"
);

const untracedTransitRow = transitRows.authoredCards.find((row) => (
  row.contentKey.startsWith("authored/transit-aspect/")
  && row.review_status === "approved"
  && row.approval?.approvalLevel === "owner_signoff_untraced"
  && (row.body_you || row.body)
));
assert.ok(untracedTransitRow, "fixture requires one untraced owner-approved transit row");
assert.deepEqual(
  acceptedOwnerApprovedTransitSections([{
    body: untracedTransitRow.body_you ?? untracedTransitRow.body,
    sourceKeys: [
      "tldrastro-fallback-architecture-v3",
      untracedTransitRow.contentKey,
      "authored/transit-aspect"
    ]
  }], approvalLevelForContentKey),
  [{
    body: untracedTransitRow.body_you ?? untracedTransitRow.body,
    sourceKeys: [
      "tldrastro-fallback-architecture-v3",
      untracedTransitRow.contentKey,
      "authored/transit-aspect"
    ]
  }],
  "owner-signoff-untraced transit paragraph must render while non-row provenance markers are ignored"
);

const ungatedRow = sourceRows.hookRows.find((row) => (
  !row.approval?.approvalLevel
  && typeof row.body_you === "string"
));
assert.ok(ungatedRow, "fixture requires an ungated fallback hook row");
assert.deepEqual(
  acceptedOwnerApprovedTransitSections([{
    body: "A mixed-provenance paragraph must fail closed.",
    sourceKeys: [bondRow.contentKey, ungatedRow.contentKey]
  }], approvalLevelForContentKey),
  [],
  "an ungated contributing row must still fail closed after owner-signoff-untraced is accepted"
);

assert.match(
  relationshipBundleSource,
  /approvedBondEffectRows/u,
  "relationship lazy bundle must preserve the accepted owner-approved directional rows"
);
assert.equal(
  (manualChartsPanelSource.match(/acceptedOwnerApprovedTransitSections\(/gu) ?? []).length,
  4,
  "both personal-transit and house-transit rows and detail sections must use the permanent gate"
);
assert.deepEqual(
  nodeRenderedSaturn.partSourceKeys?.at(-1),
  ["fallback-hook/transit-house-retro-overlay/saturn"],
  "optional retrograde prose must retain its own independently gated source key"
);
assert.equal(
  (manualChartsPanelSource.match(/if \(eligibleSections\.length === 0\) \{\s*return;\s*\}/gu) ?? []).length,
  2,
  "personal-transit and house-transit handlers must refuse heading-only detail articles"
);
assert.equal(
  (friendTransitsTabSource.match(/Full interpretation unavailable pending source verification\./gu) ?? []).length,
  0,
  "internal source-verification status must never be shown to a Friends reader"
);
assert.equal(
  (friendTransitsTabSource.match(/\.filter\(\(transit\) => transit\.detailAvailable\)/gu) ?? []).length,
  2,
  "personal and house transit lists must omit rows without an eligible full detail section"
);
assert.match(
  manualChartsPanelSource,
  /acceptedOwnerApprovedTransitBody\(\s*card\.effectBody,\s*card\.effectContentKey,/u,
  "bond-effect detail body must use the permanent gate"
);
assert.match(
  manualChartsPanelSource,
  /acceptedOwnerApprovedTransitSections\(\s*card\.normalized\.detailSections,/u,
  "Friends house-transit details must gate resolver-attributed prose units independently"
);

console.log("Friends transit detail provenance gate passed: exact and untraced approvals accepted; ungated enrichments and incomplete reader rows withheld; heading-only articles blocked.");
