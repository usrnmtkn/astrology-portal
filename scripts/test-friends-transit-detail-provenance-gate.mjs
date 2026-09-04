#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptedOwnerApprovedTransitBody,
  acceptedOwnerApprovedTransitSections
} from "../apps/web/src/features/friends/transitDetailApproval.ts";
import {
  fallbackV3ApprovalLevelForContentKey,
  installFallbackArchitectureV3Bundle,
  loadRelationshipFallbackArchitectureV3Bundle,
  transitSynastryFallbackRendererV3
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRows = JSON.parse(fs.readFileSync(path.join(
  root,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"
), "utf8"));
const coreManifest = JSON.parse(fs.readFileSync(path.join(
  root,
  "apps/web/src/content/fallbackArchitectureV3/bundled-core-manifest-v3.json"
), "utf8"));
const relationshipManifest = JSON.parse(fs.readFileSync(path.join(
  root,
  "apps/web/src/content/fallbackArchitectureV3/bundled-relationship-manifest-v3.json"
), "utf8"));
const relationshipRows = JSON.parse(fs.readFileSync(path.join(
  root,
  "apps/web/src/content/fallbackArchitectureV3/bundled-relationship-authored-cards-v3.json"
), "utf8"));
const relationshipBundleSource = fs.readFileSync(path.join(
  root,
  "apps/web/src/content/fallbackArchitectureV3/resolver/bundles/relationship.ts"
), "utf8");
const manualChartsPanelSource = fs.readFileSync(path.join(
  root,
  "apps/web/src/features/friends/ManualChartsPanel.tsx"
), "utf8");
const friendTransitsTabSource = fs.readFileSync(path.join(
  root,
  "apps/web/src/features/friends/FriendTransitsTab.tsx"
), "utf8");
const friendsAuthority = JSON.parse(fs.readFileSync(path.join(
  root,
  "packages/astro-knowledge/review/transit-aspect-friends-completion-v1.json"
), "utf8"));

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const relationshipKeys = new Set(relationshipManifest.keys.map((entry) => (
  entry.includes(":") ? entry.slice(entry.indexOf(":") + 1) : entry
)));
const approvalLevelForContentKey = (contentKey) => {
  const row = sourceRows.authoredCards.find((candidate) => candidate.contentKey === contentKey)
    ?? sourceRows.hookRows.find((candidate) => candidate.contentKey === contentKey);
  return row?.approval?.approvalLevel ?? null;
};

const exactTransitRow = sourceRows.authoredCards.find((row) => (
  row.surface === "transit-aspect"
  && row.approval?.approvalLevel === "exact_rendered_sample_owner_ruling"
  && typeof row.body_you === "string"
));
assert.ok(exactTransitRow, "fixture requires one exact-approved transit row");
assert.equal(
  fallbackV3ApprovalLevelForContentKey(exactTransitRow.contentKey),
  "exact_rendered_sample_owner_ruling"
);
assert.equal(
  acceptedOwnerApprovedTransitBody({
    body: exactTransitRow.body_you,
    sourceKeys: [exactTransitRow.contentKey]
  }, fallbackV3ApprovalLevelForContentKey),
  exactTransitRow.body_you,
  "exact owner-approved transit body must render"
);

const bondRow = sourceRows.authoredCards.find((row) => (
  row.surface === "transit-synastry"
  && row.approval?.approvalLevel === "exact_rendered_sample_owner_ruling"
  && typeof row.body_they === "string"
));
assert.ok(bondRow, "fixture requires one exact-approved directional bond row");
assert.equal(relationshipKeys.has(bondRow.contentKey), true, "approved bond row must ship in relationship lazy manifest");
assert.equal(
  relationshipRows.authoredCards.some((row) => row.contentKey === bondRow.contentKey),
  true,
  "approved bond row must ship in relationship lazy payload"
);

await loadRelationshipFallbackArchitectureV3Bundle();
const renderedBond = transitSynastryFallbackRendererV3({
  transitPlanet: "Saturn",
  natalPoint: "Venus",
  aspect: "square",
  ownerKind: "friend",
  ownerName: "Nora"
});
assert.ok(renderedBond.parts.length > 0, "relationship lazy bundle should remain renderable after provenance gating");

const ownerEvidence = friendsAuthority.decisions.find((decision) => (
  decision.status === "owner_signoff_exact"
  && typeof decision.payload_sha256 === "string"
));
assert.ok(ownerEvidence, "fixture requires exact historical Friends owner-signoff evidence");
assert.equal(
  sha256(ownerEvidence.payload),
  ownerEvidence.payload_sha256,
  "historical exact Friends owner-signoff evidence must remain hash-locked"
);

const untracedTransitRow = sourceRows.authoredCards.find((row) => (
  row.surface === "transit-aspect"
  && row.approval?.approvalLevel === "owner_signoff_untraced"
  && typeof (row.body_you ?? row.body) === "string"
));
assert.ok(untracedTransitRow, "fixture requires one owner-signoff-untraced transit row");
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
  5,
  "personal-transit pre-cap eligibility, personal-transit rows/details, and house-transit rows/details must all use the permanent gate"
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

console.log("Friends transit detail provenance gate passed.");
