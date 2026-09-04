#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE,
  applyBoundedOwnerBatchAuthorization,
  assertBatchGenerationAuthorized,
  assertServingAuthorized,
  generatedApprovalState,
  markPipelineReady
} from "../src/astro-writing/approvalGovernance.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidateRelative = "packages/astro-knowledge/review/transit-aspect-you-refresh-candidates-2026-09-04.json";
const reviewRelative = "packages/astro-knowledge/review/transit-aspect-you-refresh-review-2026-09-04.json";
const authorizationRelative = "packages/astro-knowledge/review/transit-aspect-you-refresh-376-owner-live-2026-09-04.json";
const sourceRelative = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const sunAscAuthorityRelative = "packages/astro-knowledge/review/transit-aspect-sun-ascendant-hard-owner-published-2026-09-03.json";
const venusMoonAuthorityRelative = "packages/astro-knowledge/review/transit-aspect-venus-moon-hard-owner-published-2026-09-02.json";
const protectedSunAsc = "authored/transit-aspect/sun/ascendant/hard";
const protectedVenusMoon = "authored/transit-aspect/venus/moon/hard";
const ownerStatement = "please proceed with You corpus fix: Bring the You Personal Transit corpus up to the current writing standard.";
const batchId = "transit-aspect-you-refresh-376-v1";
const surface = "personal-transits-you";
const approvedField = "body_you";
const approvedAt = "2026-09-04";
const priorPackageVersion = "v3-2026-09-03c";
const nextPackageVersion = "v3-2026-09-04a";
const apply = process.argv.includes("--apply");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const writeJson = (relative, value, spaces = 2) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, spaces)}\n`);

const candidates = readJson(candidateRelative);
const review = readJson(reviewRelative);
const sunAscAuthority = readJson(sunAscAuthorityRelative);
const venusMoonAuthority = readJson(venusMoonAuthorityRelative);

assert.equal(candidates.schema, "tldrastro-transit-aspect-you-refresh-candidates-v1");
assert.equal(candidates.status, "ready_for_owner_directed_batch_promotion");
assert.equal(candidates.ownerInstruction, ownerStatement);
assert.equal(candidates.surface, surface);
assert.equal(candidates.count, 376);
assert.equal(candidates.records.length, 376);
assert.equal(candidates.review.unresolvedCount, 0);
assert.equal(candidates.review.trueThirdPartyCoreferenceCasesProtected, 11);
assert.equal(review.schema, "tldrastro-transit-aspect-you-refresh-review-v1");
assert.equal(review.status, "clear");
assert.equal(review.candidateCount, 376);
assert.equal(review.protectedCount, 2);
assert.equal(review.broadCoreferenceCandidateCount, 98);
assert.equal(review.thirdPartyProtectionHitCount, 11);
assert.equal(review.unresolvedCount, 0);
assert.equal(review.unresolvedFlags.length, 0);

assert.equal(sunAscAuthority.contentKey, protectedSunAsc);
assert.equal(sha256(sunAscAuthority.body_you), candidates.protectedRows.find((row) => row.contentKey === protectedSunAsc)?.bodyYouSha256);
assert.equal(venusMoonAuthority.contentKey, protectedVenusMoon);
assert.equal(sha256(venusMoonAuthority.body_you), venusMoonAuthority.body_you_sha256);
assert.equal(venusMoonAuthority.body_you_sha256, candidates.protectedRows.find((row) => row.contentKey === protectedVenusMoon)?.bodyYouSha256);

const source = readJson(sourceRelative);
const transitRows = source.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/"));
assert.equal(transitRows.length, 378, "Canonical source must contain exactly 378 Personal Transit aspect rows.");
assert.equal(new Set(transitRows.map((row) => row.contentKey)).size, 378);
const sourceByKey = new Map(transitRows.map((row) => [row.contentKey, row]));

const candidateByKey = new Map(candidates.records.map((record) => [record.contentKey, record]));
assert.equal(candidateByKey.size, 376);
assert.equal(candidateByKey.has(protectedSunAsc), false);
assert.equal(candidateByKey.has(protectedVenusMoon), false);

const friendSnapshots = new Map(transitRows.map((row) => [row.contentKey, JSON.stringify({
  body_they: row.body_they ?? null,
  body_they_review_status: row.body_they_review_status ?? null,
  body_they_sha256: row.body_they_sha256 ?? null,
  body_they_approved_via: row.body_they_approved_via ?? null,
  body_they_authorship: row.body_they_authorship ?? null,
  body_they_name_variable: row.body_they_name_variable ?? null,
  body_they_sourceMechanism: row.body_they_sourceMechanism ?? null,
  body_they_approval: row.body_they_approval ?? null
})]));

const members = candidates.records.map((record) => {
  assert.match(record.contentKey, /^authored\/transit-aspect\//u);
  assert.equal(typeof record.sourceBodyThey, "string", `${record.contentKey}: source Friends body missing.`);
  assert.equal(sha256(record.sourceBodyThey), record.sourceBodyTheySha256, `${record.contentKey}: candidate Friends hash drifted.`);
  assert.equal(typeof record.proposedBodyYou, "string", `${record.contentKey}: proposed You body missing.`);
  assert.equal(sha256(record.proposedBodyYou), record.proposedBodyYouSha256, `${record.contentKey}: candidate You hash drifted.`);
  assert.doesNotMatch(record.proposedBodyYou, /\{\{Name\}\}/u, `${record.contentKey}: proposed You body still contains {{Name}}.`);
  assert.doesNotMatch(record.proposedBodyYou, /(?:^|[.!?]\s+|\n\n)You\s+(?:is|has|does|was)\b/u, `${record.contentKey}: invalid second-person agreement.`);
  const row = sourceByKey.get(record.contentKey);
  assert.ok(row, `${record.contentKey}: canonical source row missing.`);
  assert.equal(row.body_they, record.sourceBodyThey, `${record.contentKey}: Friends semantic authority drifted since candidate generation.`);
  assert.equal(sha256(row.body_they), record.sourceBodyTheySha256, `${record.contentKey}: Friends source hash drifted.`);
  const currentYou = row.body_you ?? row.body ?? null;
  assert.equal(typeof currentYou, "string", `${record.contentKey}: canonical You body missing.`);
  assert.equal(sha256(currentYou), record.priorBodyYouSha256, `${record.contentKey}: You source changed since candidate generation; refusing to overwrite.`);
  return {
    contentKey: record.contentKey,
    payloadSha256: record.proposedBodyYouSha256,
    semanticAuthoritySha256: record.sourceBodyTheySha256
  };
});
assert.equal(new Set(members.map((member) => member.contentKey)).size, 376);

const authorization = {
  schema: "tldrastro-bounded-owner-batch-authorization-v1",
  type: BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE,
  authority: "owner",
  decision: "approve",
  batchId,
  evidenceRecordPath: authorizationRelative,
  ownerStatement,
  approvedAt,
  surface,
  approvedField,
  approvalLevel: "owner_directed_perspective_adaptation_batch",
  capabilities: ["batch_generation", "serving"],
  sourceRecordPath: candidateRelative,
  sourceRecordSha256: sha256(fs.readFileSync(path.join(root, candidateRelative), "utf8")),
  reviewRecordPath: reviewRelative,
  reviewRecordSha256: sha256(fs.readFileSync(path.join(root, reviewRelative), "utf8")),
  method: candidates.method,
  count: members.length,
  exclusions: [
    {
      contentKey: protectedSunAsc,
      reason: "Preserve the exact September 3 owner-published Content Studio You revision."
    },
    {
      contentKey: protectedVenusMoon,
      reason: "Preserve the exact September 2 owner-published Content Studio You revision and intentional Friends gap."
    }
  ],
  members
};

const existingAuthorization = fs.existsSync(path.join(root, authorizationRelative)) ? readJson(authorizationRelative) : null;
if (existingAuthorization) assert.deepEqual(existingAuthorization, authorization, "Existing You refresh authorization does not match current candidate corpus.");

for (const record of candidates.records) {
  const row = sourceByKey.get(record.contentKey);
  const governed = applyBoundedOwnerBatchAuthorization(markPipelineReady(generatedApprovalState()), {
    authorization,
    contentKey: record.contentKey,
    field: approvedField,
    payloadSha256: record.proposedBodyYouSha256,
    surface
  });
  assert.equal(assertBatchGenerationAuthorized(governed), true);
  assert.equal(assertServingAuthorized(governed), true);

  row.source_keys = Array.isArray(row.source_keys) ? row.source_keys.filter((key) => key !== authorizationRelative) : [];
  row.source_keys.push(authorizationRelative);
  row.body_you = record.proposedBodyYou;
  if (typeof row.body === "string") row.body = record.proposedBodyYou;
  row.body_you_review_status = "approved";
  row.body_you_sha256 = record.proposedBodyYouSha256;
  row.body_you_approved_via = authorizationRelative;
  row.body_you_authorship = "second_person_adaptation_of_current_friend_semantic_authority";
  row.body_you_sourceMechanism = "Current explicit Friends passage is the semantic authority. The named person's perspective is naturally adapted into second person while unrelated third-party pronouns remain unchanged.";
  row.body_you_approval = {
    approvalLevel: authorization.approvalLevel,
    recordPath: authorizationRelative,
    payloadSha256: record.proposedBodyYouSha256,
    semanticAuthoritySha256: record.sourceBodyTheySha256,
    approvedAt
  };
}

const protectedSunRow = sourceByKey.get(protectedSunAsc);
assert.ok(protectedSunRow);
assert.equal(protectedSunRow.body_you, sunAscAuthority.body_you, `${protectedSunAsc}: protected owner-published You body drifted.`);
assert.equal(sha256(protectedSunRow.body_you), candidates.protectedRows.find((row) => row.contentKey === protectedSunAsc)?.bodyYouSha256);

const protectedVenusMoonRow = sourceByKey.get(protectedVenusMoon);
assert.ok(protectedVenusMoonRow);
assert.equal(protectedVenusMoonRow.body_you, venusMoonAuthority.body_you, `${protectedVenusMoon}: protected owner-published You body drifted.`);
assert.equal(sha256(protectedVenusMoonRow.body_you), venusMoonAuthority.body_you_sha256);
assert.equal(typeof protectedVenusMoonRow.body_they, "undefined", `${protectedVenusMoon}: Friends gap must remain empty.`);

for (const row of transitRows) {
  assert.equal(JSON.stringify({
    body_they: row.body_they ?? null,
    body_they_review_status: row.body_they_review_status ?? null,
    body_they_sha256: row.body_they_sha256 ?? null,
    body_they_approved_via: row.body_they_approved_via ?? null,
    body_they_authorship: row.body_they_authorship ?? null,
    body_they_name_variable: row.body_they_name_variable ?? null,
    body_they_sourceMechanism: row.body_they_sourceMechanism ?? null,
    body_they_approval: row.body_they_approval ?? null
  }), friendSnapshots.get(row.contentKey), `${row.contentKey}: Friends fields changed during You promotion.`);
  if (typeof row.body === "string" && typeof row.body_you === "string") {
    assert.equal(row.body, row.body_you, `${row.contentKey}: body/body_you drift after You promotion.`);
  }
}

const explicitFriends = transitRows.filter((row) => typeof row.body_they === "string" && row.body_they.trim());
assert.equal(explicitFriends.length, 377);
assert.equal(explicitFriends.filter((row) => String(row.contentKey).startsWith("authored/transit-aspect/sun/")).length, 27);
assert.equal(explicitFriends.filter((row) => !String(row.contentKey).startsWith("authored/transit-aspect/sun/")).length, 350);

const pinnedVersionFiles = [
  "apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts",
  "scripts/test-sun-friends-serving-v1.mjs",
  "scripts/test-empty-house-refinement.mjs",
  "scripts/test-fallback-refresh-wiring.mjs",
  "scripts/test-fallback-package-cache-contract.mjs",
  "scripts/test-friends-transit-nonsun-serving-v1.mjs"
];

function updatePackageTestWiring() {
  const relative = "package.json";
  const absolute = path.join(root, relative);
  const current = fs.readFileSync(absolute, "utf8");
  if (current.includes("node scripts/test-you-transit-refresh-v1.mjs")) return;
  const needle = "node scripts/test-friends-transit-nonsun-serving-v1.mjs &&";
  assert.ok(current.includes(needle), "package.json test:content anchor changed; wire test-you-transit-refresh-v1.mjs manually.");
  fs.writeFileSync(absolute, current.replace(needle, `${needle} node scripts/test-you-transit-refresh-v1.mjs &&`));
}

if (apply) {
  writeJson(authorizationRelative, authorization, 2);
  writeJson(sourceRelative, source, 1);
  for (const relative of pinnedVersionFiles) {
    const absolute = path.join(root, relative);
    const current = fs.readFileSync(absolute, "utf8");
    if (current.includes(priorPackageVersion)) {
      fs.writeFileSync(absolute, current.replaceAll(priorPackageVersion, nextPackageVersion));
    } else {
      assert.ok(current.includes(nextPackageVersion), `${relative}: expected ${priorPackageVersion} or ${nextPackageVersion}.`);
    }
  }
  updatePackageTestWiring();
}

console.log(JSON.stringify({
  mode: apply ? "applied" : "verify-only",
  batchId,
  candidateCount: candidates.records.length,
  protectedCount: 2,
  friendsChanged: 0,
  explicitFriends: explicitFriends.length,
  protectedVenusMoonFriendsPopulated: false,
  priorPackageVersion,
  packageVersion: apply ? nextPackageVersion : priorPackageVersion,
  sourceRecordSha256: authorization.sourceRecordSha256,
  reviewRecordSha256: authorization.reviewRecordSha256
}, null, 2));
