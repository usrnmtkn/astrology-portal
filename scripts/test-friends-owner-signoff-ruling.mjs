#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const source = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const record = readJson("packages/astro-knowledge/review/friends-owner-signoff-untraced-ruling-2026-08-13.json");
const mechanicalCorrection = readJson(
  "packages/astro-knowledge/review/lilith-house-1-headline-mechanical-correction-2026-08-27.json"
);
const venusMoonRevision = readJson(
  "packages/astro-knowledge/review/transit-aspect-venus-moon-hard-owner-published-2026-09-02.json"
);
const sunFriendsApproval = readJson(
  "packages/astro-knowledge/review/transit-aspect-friends-sun-proposed-v1.json"
);
const sunAscendantRevision = readJson(
  "packages/astro-knowledge/review/transit-aspect-sun-ascendant-hard-owner-published-2026-09-03.json"
);
const wordingFields = ["headline", "body", "body_you", "body_they", "body_sky"];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const targetFamilies = Object.keys(record.counts.byFamily);
const familyRows = source.authoredCards.filter((row) => (
  targetFamilies.some((prefix) => row.contentKey.startsWith(prefix))
));
const targetRows = familyRows.filter((row) => (
  row.approval?.approvedAt === undefined || row.approval.approvedAt <= record.recordedAt
));
const postRulingRows = familyRows.filter((row) => row.approval?.approvedAt > record.recordedAt);

assert.equal(venusMoonRevision.contentKey, "authored/transit-aspect/venus/moon/hard");
assert.equal(venusMoonRevision.status, "owner_published");
assert.equal(sha256(venusMoonRevision.supersedes.body_you), venusMoonRevision.supersedes.body_you_sha256);
assert.equal(sha256(venusMoonRevision.body_you), venusMoonRevision.body_you_sha256);
const venusMoonRow = familyRows.find((row) => row.contentKey === venusMoonRevision.contentKey);
assert.ok(venusMoonRow, "Venus square Moon row must remain in the governed Friends source family.");
assert.ok(
  [venusMoonRevision.supersedes.body_you, venusMoonRevision.body_you].includes(venusMoonRow.body_you),
  "Venus square Moon You copy must match either the pre-revision package body or the exact September 2 CMS revision."
);

assert.equal(sunFriendsApproval.status, "owner_approved");
assert.equal(sunFriendsApproval.createdAt, "2026-09-03");
assert.equal(sunFriendsApproval.records.length, 27);
assert.ok(
  sunFriendsApproval.records.every((entry) => entry.approvedAt > record.recordedAt),
  "Every Sun Friends field in this packet must postdate the August 13 historical snapshot."
);
const postSnapshotSunFriendKeys = new Set(sunFriendsApproval.records.map((entry) => entry.contentKey));
assert.equal(postSnapshotSunFriendKeys.size, 27);
assert.equal(sunAscendantRevision.contentKey, "authored/transit-aspect/sun/ascendant/hard");
assert.equal(sunAscendantRevision.publishedAt.slice(0, 10), "2026-09-03");
assert.equal(
  sha256(sunAscendantRevision.supersedes.body_you),
  sunAscendantRevision.supersedes.body_you_sha256,
  "The Sun square Ascendant superseded You body must remain hash-bound."
);
const sunAscendantRow = familyRows.find((row) => row.contentKey === sunAscendantRevision.contentKey);
assert.ok(sunAscendantRow, "Sun square Ascendant must remain in the governed Friends source family.");
assert.ok(
  [sunAscendantRevision.supersedes.body_you, sunAscendantRevision.body_you].includes(sunAscendantRow.body_you),
  "Sun square Ascendant You copy must match either the pre-revision package body or the exact September 3 CMS revision."
);

function historicalWording(row, field) {
  if (row.contentKey === mechanicalCorrection.contentKey && field === mechanicalCorrection.field) {
    return mechanicalCorrection.before;
  }
  if (row.contentKey === venusMoonRevision.contentKey && field === "body_you") {
    return venusMoonRevision.supersedes.body_you;
  }
  if (row.contentKey === sunAscendantRevision.contentKey && field === "body_you") {
    return sunAscendantRevision.supersedes.body_you;
  }
  if (field === "body_they" && postSnapshotSunFriendKeys.has(row.contentKey)) {
    return undefined;
  }
  return row[field];
}

const readerPayload = targetRows.map((row) => [
  row.contentKey,
  Object.fromEntries(wordingFields.filter((field) => row[field] !== undefined).map((field) => [
    field,
    historicalWording(row, field)
  ]))
]);

const correctedRow = familyRows.find((row) => row.contentKey === mechanicalCorrection.contentKey);
assert.equal(mechanicalCorrection.authority, "User-authorized editorial QA repair");
assert.equal(mechanicalCorrection.classification, "repeated-word grammar correction");
assert.equal(mechanicalCorrection.meaningChanged, false);
assert.equal(correctedRow?.headline, mechanicalCorrection.after);

assert.equal(record.authority, "Owner ruling, 2026-08-13: accept both levels.");
assert.deepEqual(record.acceptedLevels, ["exact_owner_approved", "owner_signoff_untraced"]);
assert.equal(record.counts.articleRows, 1501);
assert.equal(record.counts.supportingRows, 88);
assert.equal(record.counts.totalRowsGoverned, 1589);
assert.equal(record.counts.exactRowsPreserved, 24);
assert.equal(record.counts.untracedRowsApplied, 1565);
assert.equal(record.restoration.articleRowsMadeEligible, 1501);
assert.equal(record.restoration.reachableFriendsArticleRows, 1393);
assert.equal(record.restoration.selfOnlyGenericHouseRowsPreviouslyOvercounted, 108);
assert.equal(record.restoration.primaryArticleRowsStillDisabledByUngatedHooks, 0);
assert.equal(record.restoration.conditionallyWithheldEnrichmentArticleRows, 288);
assert.equal(record.restoration.ungatedContributingHookKeys.length, 28);
assert.equal(targetRows.length, 1589);
assert.equal(targetRows.filter((row) => row.approval?.approvalLevel === "exact_owner_approved").length, 24);
assert.ok(
  postRulingRows.every((row) => (
    row.approval?.approvalLevel === "exact_owner_approved"
    && typeof row.approval?.recordPath === "string"
    && /^[a-f0-9]{64}$/u.test(row.approval?.payloadSha256 ?? "")
  )),
  "Transit rows added after the historical ruling must carry independently traceable exact owner approval."
);
const untracedRows = targetRows.filter((row) => row.approval?.approvalLevel === "owner_signoff_untraced");
assert.equal(untracedRows.length, 1565);
assert.ok(untracedRows.every((row) => row.approval?.evidence === row.approved_via));
assert.equal(sha256(JSON.stringify(readerPayload)), record.invariants.readerPayloadSha256After);
assert.equal(record.invariants.readerPayloadSha256Before, record.invariants.readerPayloadSha256After);
assert.equal(record.invariants.copyChanged, false);
assert.deepEqual(record.excluded, {
  totalRows: 1175,
  approvedWithExplicitOwnerEvidence: 726,
  approvedWithoutExplicitOwnerEvidence: 333,
  approvedReuse: 115,
  needsReview: 1,
  bySurfaceFamily: {
    compatibility: 1008,
    career: 54,
    skyCalendar: 113
  },
  friendsTransitDetailArticleRows: 0,
  disposition: "untouched_outside_friends_transit_detail_scope",
  note: "These rows feed compatibility, Sky, career, station, weekly, or other authored surfaces. They are not primary Friends transit-detail articles and are not disabled by this gate."
});

console.log("Friends owner-signoff ruling passed: 24 exact approvals preserved, 1,565 untraced approvals added, 1,175 unrelated authored rows left untouched; later CMS/mechanical/Sun Friends revisions are excluded from the historical payload hash.");
