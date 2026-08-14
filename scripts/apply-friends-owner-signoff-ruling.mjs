#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelativePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const recordRelativePath = "packages/astro-knowledge/review/friends-owner-signoff-untraced-ruling-2026-08-13.json";
const sourcePath = path.join(repoRoot, sourceRelativePath);
const recordPath = path.join(repoRoot, recordRelativePath);
const migrationId = "friends-owner-signoff-untraced-ruling-2026-08-13";
const write = process.argv.includes("--write");
const articleFamilies = new Map([
  ["authored/transit-aspect/", 377],
  ["authored/transit-return/", 8],
  ["authored/transit-house/", 108],
  ["authored/transit-house-sign/", 1008]
]);
const supportingFamilies = new Map([
  ["authored/transit-house-intro/", 84],
  ["authored/point-explainer/", 2],
  ["authored/transit-aspect-insert/", 2]
]);
const conditionallyGatedHookKeys = [
  "fallback-hook/transit-house-event-frame/jupiter",
  "fallback-hook/transit-house-event-frame/saturn",
  ...["jupiter", "saturn"].flatMap((planet) => (
    ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]
      .map((sign) => `fallback-hook/transit-house-event-wants/${planet}/${sign}`)
  )),
  "fallback-hook/transit-house-retro-overlay/jupiter",
  "fallback-hook/transit-house-retro-overlay/saturn"
];
const targetFamilies = new Map([...articleFamilies, ...supportingFamilies]);
const wordingFields = ["headline", "body", "body_you", "body_they", "body_sky"];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function familyFor(contentKey) {
  return [...targetFamilies.keys()].find((prefix) => contentKey.startsWith(prefix)) ?? null;
}

function wording(row) {
  return Object.fromEntries(
    wordingFields.filter((field) => row[field] !== undefined).map((field) => [field, row[field]])
  );
}

function dateFromEvidence(evidence) {
  return evidence.match(/\b(20\d{2}-\d{2}-\d{2})\b/u)?.[1] ?? null;
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const rows = source.authoredCards ?? [];
const targetRows = rows.filter((row) => familyFor(row.contentKey));
const excludedRows = rows.filter((row) => !familyFor(row.contentKey));
const beforeHash = sha256(JSON.stringify(targetRows.map((row) => [row.contentKey, wording(row)])));
const countsByFamily = Object.fromEntries([...targetFamilies].map(([family]) => [family, 0]));
let exactRowsPreserved = 0;
let untracedRowsApplied = 0;

assert.equal(targetRows.length, 1589, "Unexpected Friends transit approval-migration scope");
assert.equal(excludedRows.length, 1175, "Unexpected out-of-scope authored-card count");

for (const row of targetRows) {
  const family = familyFor(row.contentKey);
  countsByFamily[family] += 1;
  assert.equal(row.review_status, "approved", `${row.contentKey}: owner ruling applies only to approved rows`);
  assert.match(String(row.approved_via ?? ""), /owner/iu, `${row.contentKey}: explicit owner sign-off evidence missing`);

  if (row.approval?.approvalLevel === "exact_owner_approved") {
    exactRowsPreserved += 1;
    continue;
  }

  const existingMigration = row.approval?.migratedBy === migrationId;
  assert.ok(!row.approval?.approvalLevel || existingMigration, `${row.contentKey}: existing structured approval must not be overwritten`);
  const evidence = String(row.approved_via);
  const approvedAt = dateFromEvidence(evidence);
  row.approval = {
    approvalLevel: "owner_signoff_untraced",
    evidence,
    ...(approvedAt ? { approvedAt } : {}),
    migratedBy: migrationId
  };
  untracedRowsApplied += 1;
}

for (const [family, expected] of targetFamilies) {
  assert.equal(countsByFamily[family], expected, `${family}: unexpected row count`);
}

const afterHash = sha256(JSON.stringify(targetRows.map((row) => [row.contentKey, wording(row)])));
assert.equal(afterHash, beforeHash, "Friends owner-signoff migration changed reader copy");

const excludedCounts = {
  approvedWithExplicitOwnerEvidence: excludedRows.filter((row) => (
    row.review_status === "approved" && /owner/iu.test(String(row.approved_via ?? ""))
  )).length,
  approvedWithoutExplicitOwnerEvidence: excludedRows.filter((row) => (
    row.review_status === "approved" && !/owner/iu.test(String(row.approved_via ?? ""))
  )).length,
  approvedReuse: excludedRows.filter((row) => row.review_status === "approved_reuse").length,
  needsReview: excludedRows.filter((row) => row.review_status === "needs_review").length
};
const excludedBySurfaceFamily = {
  compatibility: excludedRows.filter((row) => row.contentKey.startsWith("authored/compat-")).length,
  career: excludedRows.filter((row) => row.contentKey.startsWith("authored/career-")).length,
  skyCalendar: excludedRows.filter((row) => (
    row.contentKey.startsWith("authored/sky-")
    || row.contentKey.startsWith("authored/calendar-")
    || row.contentKey.startsWith("authored/station/")
    || row.contentKey.startsWith("authored/week-opener/")
    || row.contentKey.startsWith("authored/transit-event/")
    || row.contentKey.startsWith("sky-article/")
  )).length
};

assert.deepEqual(excludedCounts, {
  approvedWithExplicitOwnerEvidence: 726,
  approvedWithoutExplicitOwnerEvidence: 333,
  approvedReuse: 115,
  needsReview: 1
}, "Unexpected out-of-scope authored-card classification");
assert.deepEqual(excludedBySurfaceFamily, {
  compatibility: 1008,
  career: 54,
  skyCalendar: 113
}, "Unexpected out-of-scope surface-family count");

const record = {
  schemaVersion: 1,
  id: migrationId,
  recordedAt: "2026-08-13",
  authority: "Owner ruling, 2026-08-13: accept both levels.",
  acceptedLevels: ["exact_owner_approved", "owner_signoff_untraced"],
  sourcePath: sourceRelativePath,
  counts: {
    articleRows: [...articleFamilies.values()].reduce((sum, count) => sum + count, 0),
    supportingRows: [...supportingFamilies.values()].reduce((sum, count) => sum + count, 0),
    totalRowsGoverned: targetRows.length,
    exactRowsPreserved,
    untracedRowsApplied,
    byFamily: countsByFamily
  },
  restoration: {
    articleRowsMadeEligible: 1501,
    reachableFriendsArticleRows: 1393,
    selfOnlyGenericHouseRowsPreviouslyOvercounted: 108,
    primaryArticleRowsStillDisabledByUngatedHooks: 0,
    conditionallyWithheldEnrichmentArticleRows: 288,
    condition: "Jupiter or Saturn sign-specific house article rendered with a retrograde state or qualifying aspect event keeps its approved base paragraphs while the ungated enrichment paragraph is withheld",
    ungatedContributingHookKeys: conditionallyGatedHookKeys
  },
  invariants: {
    readerPayloadSha256Before: beforeHash,
    readerPayloadSha256After: afterHash,
    copyChanged: false
  },
  excluded: {
    totalRows: excludedRows.length,
    ...excludedCounts,
    bySurfaceFamily: excludedBySurfaceFamily,
    friendsTransitDetailArticleRows: 0,
    disposition: "untouched_outside_friends_transit_detail_scope",
    note: "These rows feed compatibility, Sky, career, station, weekly, or other authored surfaces. They are not primary Friends transit-detail articles and are not disabled by this gate."
  }
};

console.log(JSON.stringify(record.counts, null, 2));
console.log(`reader payload: ${beforeHash} (unchanged)`);

if (write) {
  fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 1)}\n`);
  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`wrote ${sourceRelativePath}`);
  console.log(`wrote ${recordRelativePath}`);
} else {
  console.log("dry run; pass --write to apply");
}
