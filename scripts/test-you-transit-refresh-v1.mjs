#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE,
  applyBoundedOwnerBatchAuthorization,
  assertServingAuthorized,
  generatedApprovalState,
  markPipelineReady
} from "../src/astro-writing/approvalGovernance.mjs";
import { PACKAGE_VERSION } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const root = process.cwd();
const candidatePath = "packages/astro-knowledge/review/transit-aspect-you-refresh-candidates-2026-09-04.json";
const reviewPath = "packages/astro-knowledge/review/transit-aspect-you-refresh-review-2026-09-04.json";
const authorizationPath = "packages/astro-knowledge/review/transit-aspect-you-refresh-376-owner-live-2026-09-04.json";
const sourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const bundledPath = "apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json";
const sunAscAuthorityPath = "packages/astro-knowledge/review/transit-aspect-sun-ascendant-hard-owner-published-2026-09-03.json";
const venusMoonAuthorityPath = "packages/astro-knowledge/review/transit-aspect-venus-moon-hard-owner-published-2026-09-02.json";
const protectedSunAsc = "authored/transit-aspect/sun/ascendant/hard";
const protectedVenusMoon = "authored/transit-aspect/venus/moon/hard";
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const candidates = read(candidatePath);
const review = read(reviewPath);
const authorization = read(authorizationPath);
const source = read(sourcePath);
const bundled = read(bundledPath);
const sunAscAuthority = read(sunAscAuthorityPath);
const venusMoonAuthority = read(venusMoonAuthorityPath);

assert.equal(PACKAGE_VERSION, "v3-2026-09-04a");
assert.equal(candidates.status, "ready_for_owner_directed_batch_promotion");
assert.equal(candidates.count, 376);
assert.equal(review.status, "clear");
assert.equal(review.unresolvedCount, 0);
assert.equal(review.thirdPartyProtectionHitCount, 11);

assert.equal(authorization.schema, "tldrastro-bounded-owner-batch-authorization-v1");
assert.equal(authorization.type, BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE);
assert.equal(authorization.authority, "owner");
assert.equal(authorization.decision, "approve");
assert.equal(authorization.batchId, "transit-aspect-you-refresh-376-v1");
assert.equal(authorization.surface, "personal-transits-you");
assert.equal(authorization.approvedField, "body_you");
assert.equal(authorization.approvalLevel, "owner_directed_perspective_adaptation_batch");
assert.deepEqual(authorization.capabilities, ["batch_generation", "serving"]);
assert.equal(authorization.count, 376);
assert.equal(authorization.members.length, 376);
// The candidate/review packets are immutable PRE-promotion evidence. Their hashes,
// recorded in the authorization, prove exactly which old You bodies were replaced
// and which proposed bodies the owner-directed batch authorized.
assert.equal(sha256(fs.readFileSync(path.join(root, candidatePath), "utf8")), authorization.sourceRecordSha256);
assert.equal(sha256(fs.readFileSync(path.join(root, reviewPath), "utf8")), authorization.reviewRecordSha256);

const sourceRows = source.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/"));
const bundledRows = bundled.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/"));
assert.equal(sourceRows.length, 378);
assert.equal(bundledRows.length, 378);
const sourceByKey = new Map(sourceRows.map((row) => [row.contentKey, row]));
const bundledByKey = new Map(bundledRows.map((row) => [row.contentKey, row]));
const candidateByKey = new Map(candidates.records.map((record) => [record.contentKey, record]));
const memberByKey = new Map(authorization.members.map((member) => [member.contentKey, member]));
assert.equal(candidateByKey.size, 376);
assert.equal(memberByKey.size, 376);

for (const record of candidates.records) {
  const sourceRow = sourceByKey.get(record.contentKey);
  const bundledRow = bundledByKey.get(record.contentKey);
  const member = memberByKey.get(record.contentKey);
  assert.ok(sourceRow, `${record.contentKey}: source row missing.`);
  assert.ok(bundledRow, `${record.contentKey}: bundled row missing.`);
  assert.ok(member, `${record.contentKey}: authorization member missing.`);
  assert.equal(member.payloadSha256, record.proposedBodyYouSha256);
  assert.equal(member.semanticAuthoritySha256, record.sourceBodyTheySha256);

  const governed = applyBoundedOwnerBatchAuthorization(markPipelineReady(generatedApprovalState()), {
    authorization,
    contentKey: record.contentKey,
    field: "body_you",
    payloadSha256: record.proposedBodyYouSha256,
    surface: "personal-transits-you"
  });
  assert.equal(assertServingAuthorized(governed), true, `${record.contentKey}: You serving authorization failed.`);

  assert.equal(sourceRow.body_you, record.proposedBodyYou, `${record.contentKey}: source You copy drifted.`);
  assert.equal(sha256(sourceRow.body_you), record.proposedBodyYouSha256);
  assert.equal(sourceRow.body_you_sha256, record.proposedBodyYouSha256);
  assert.equal(sourceRow.body_you_review_status, "approved");
  assert.equal(sourceRow.body_you_authorship, "second_person_adaptation_of_current_friend_semantic_authority");
  assert.equal(sourceRow.body_you_approved_via, authorizationPath);
  assert.equal(sourceRow.body_you_approval?.approvalLevel, "owner_directed_perspective_adaptation_batch");
  assert.equal(sourceRow.body_you_approval?.payloadSha256, record.proposedBodyYouSha256);
  assert.equal(sourceRow.body_you_approval?.semanticAuthoritySha256, record.sourceBodyTheySha256);
  assert.equal(sourceRow.body_they, record.sourceBodyThey, `${record.contentKey}: Friends semantic authority changed.`);
  assert.equal(sha256(sourceRow.body_they), record.sourceBodyTheySha256);
  if (typeof sourceRow.body === "string") assert.equal(sourceRow.body, sourceRow.body_you, `${record.contentKey}: source body/body_you drift.`);

  assert.equal(bundledRow.body_you, record.proposedBodyYou, `${record.contentKey}: bundled You copy drifted.`);
  assert.equal(bundledRow.body_they, record.sourceBodyThey, `${record.contentKey}: bundled Friends copy drifted.`);
  if (typeof bundledRow.body === "string") assert.equal(bundledRow.body, bundledRow.body_you, `${record.contentKey}: bundled body/body_you drift.`);
  assert.doesNotMatch(sourceRow.body_you, /\{\{Name\}\}/u, `${record.contentKey}: You copy contains {{Name}}.`);
  assert.doesNotMatch(sourceRow.body_you, /(?:^|[.!?]\s+|\n\n)You\s+(?:is|has|does|was)\b/u, `${record.contentKey}: bad You grammar.`);
}

const sunAsc = sourceByKey.get(protectedSunAsc);
assert.ok(sunAsc);
assert.equal(sunAsc.body_you, sunAscAuthority.body_you);
assert.equal(sha256(sunAsc.body_you), "1caf580ddf9a876cb777044250e86af22ce84e38c94cbae125da08bb235fddc8");
assert.equal(candidateByKey.has(protectedSunAsc), false);

const venusMoon = sourceByKey.get(protectedVenusMoon);
assert.ok(venusMoon);
assert.equal(venusMoon.body_you, venusMoonAuthority.body_you);
assert.equal(sha256(venusMoon.body_you), venusMoonAuthority.body_you_sha256);
assert.equal(typeof venusMoon.body_they, "undefined");
assert.equal(candidateByKey.has(protectedVenusMoon), false);

const explicitFriends = sourceRows.filter((row) => typeof row.body_they === "string" && row.body_they.trim());
assert.equal(explicitFriends.length, 377);
assert.equal(explicitFriends.filter((row) => String(row.contentKey).startsWith("authored/transit-aspect/sun/")).length, 27);
assert.equal(explicitFriends.filter((row) => !String(row.contentKey).startsWith("authored/transit-aspect/sun/")).length, 350);
assert.equal(sourceRows.filter((row) => typeof row.body === "string" && typeof row.body_you === "string" && row.body !== row.body_you).length, 0);

const sunMidheaven = sourceByKey.get("authored/transit-aspect/sun/midheaven/hard");
assert.ok(sunMidheaven);
assert.match(sunMidheaven.body_you, /^Your work may get more attention than usual/u);
assert.doesNotMatch(sunMidheaven.body_you, /^Ambition peaks and tact lags/u);
assert.match(sunMidheaven.body_you, /With the Sun \{\{aspectWord\}\} your Midheaven until \{\{untilDate\}\}/u);

console.log(JSON.stringify({
  packageVersion: PACKAGE_VERSION,
  transitRows: sourceRows.length,
  refreshedYouRows: candidates.records.length,
  protectedYouRows: 2,
  explicitFriends: explicitFriends.length,
  friendsDrift: 0,
  bodyVsYouDrift: 0,
  unresolvedAdaptationFlags: review.unresolvedCount,
  thirdPartyPronounsProtected: review.thirdPartyProtectionHitCount
}, null, 2));
