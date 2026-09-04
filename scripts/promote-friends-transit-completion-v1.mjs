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
const completionRelative = "packages/astro-knowledge/review/transit-aspect-friends-completion-v1.json";
const legacyAuthorizationRelative = "packages/astro-knowledge/review/transit-aspect-friends-nonsun-351-owner-live-2026-09-03.json";
const authorizationRelative = "packages/astro-knowledge/review/transit-aspect-friends-nonsun-350-owner-live-2026-09-03.json";
const sourceRelative = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const venusMoonAuthorityRelative = "packages/astro-knowledge/review/transit-aspect-venus-moon-hard-owner-published-2026-09-02.json";
const protectedContentKey = "authored/transit-aspect/venus/moon/hard";
const ownerStatement = "all the friend's rewrite's your doing, you should approve as live.";
const batchId = "transit-aspect-friends-nonsun-350-v1";
const surface = "personal-transits-friends";
const approvedField = "body_they";
const approvedAt = "2026-09-03";
const priorPackageVersion = "v3-2026-09-03b";
const nextPackageVersion = "v3-2026-09-03c";
const apply = process.argv.includes("--apply");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const writeJson = (relative, value, spaces = 2) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, spaces)}\n`);

const completion = readJson(completionRelative);
assert.equal(completion.schema, "tldrastro-transit-aspect-friends-independent-completion-v1");
assert.equal(completion.count, 351);
assert.equal(completion.records.length, 351);
assert.equal(completion.surface, surface);
assert.equal(completion.excludesTransitingBody, "sun");
const protectedCompletionRecord = completion.records.find((record) => record.contentKey === protectedContentKey);
assert.ok(protectedCompletionRecord, `${protectedContentKey}: protected completion record must remain traceable but outside serving authorization.`);
const authorizedRecords = completion.records.filter((record) => record.contentKey !== protectedContentKey);
assert.equal(authorizedRecords.length, 350);

const members = authorizedRecords.map((record) => {
  assert.match(record.contentKey, /^authored\/transit-aspect\//u);
  assert.equal(record.contentKey.startsWith("authored/transit-aspect/sun/"), false, `${record.contentKey}: Sun must remain outside the non-Sun batch.`);
  assert.equal(typeof record.body_they, "string");
  assert.ok(record.body_they.length > 0);
  const payloadSha256 = sha256(record.body_they);
  assert.equal(record.body_they_sha256, payloadSha256, `${record.contentKey}: completion payload hash drifted.`);
  return { contentKey: record.contentKey, payloadSha256 };
});
assert.equal(new Set(members.map((member) => member.contentKey)).size, 350);
assert.equal(members.some((member) => member.contentKey === protectedContentKey), false);

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
  capabilities: ["batch_generation", "serving"],
  sourceRecordPath: completionRelative,
  sourceRecordSha256: sha256(fs.readFileSync(path.join(root, completionRelative), "utf8")),
  count: members.length,
  exclusions: [{
    contentKey: protectedContentKey,
    reason: "Preserve the exact September 2 owner-published Content Studio You revision without populating Friends copy."
  }],
  members
};

const existingAuthorization = fs.existsSync(path.join(root, authorizationRelative))
  ? readJson(authorizationRelative)
  : null;
if (existingAuthorization) {
  assert.deepEqual(existingAuthorization, authorization, "Existing owner batch authorization record does not match the exact current 350-row serving corpus.");
}

const source = readJson(sourceRelative);
const sourceRows = Array.isArray(source.authoredCards) ? source.authoredCards : [];
const sourceByKey = new Map(sourceRows.map((row) => [String(row.contentKey ?? ""), row]));
const sunBefore = sourceRows
  .filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/sun/"))
  .map((row) => JSON.stringify(row));
const youBefore = new Map(completion.records.map((record) => {
  const row = sourceByKey.get(record.contentKey);
  assert.ok(row, `${record.contentKey}: production source row missing.`);
  return [record.contentKey, JSON.stringify(row.body_you ?? null)];
}));
const protectedRow = sourceByKey.get(protectedContentKey);
assert.ok(protectedRow, `${protectedContentKey}: protected production source row missing.`);
const venusMoonAuthority = readJson(venusMoonAuthorityRelative);
assert.equal(venusMoonAuthority.contentKey, protectedContentKey);
assert.equal(sha256(venusMoonAuthority.body_you), venusMoonAuthority.body_you_sha256);
assert.equal(protectedRow.body_you, venusMoonAuthority.body_you, `${protectedContentKey}: protected You copy drifted before Friends correction.`);

function stripProtectedFriendFields(row) {
  row.source_keys = Array.isArray(row.source_keys)
    ? row.source_keys.filter((key) => key !== legacyAuthorizationRelative && key !== authorizationRelative)
    : row.source_keys;
  for (const field of [
    "body_they",
    "body_they_review_status",
    "body_they_sha256",
    "body_they_approved_via",
    "body_they_authorship",
    "body_they_name_variable",
    "body_they_sourceMechanism",
    "body_they_approval"
  ]) {
    delete row[field];
  }
}
stripProtectedFriendFields(protectedRow);

let alreadyPromoted = 0;
for (const record of authorizedRecords) {
  const row = sourceByKey.get(record.contentKey);
  const governed = applyBoundedOwnerBatchAuthorization(markPipelineReady(generatedApprovalState()), {
    authorization,
    contentKey: record.contentKey,
    field: approvedField,
    payloadSha256: record.body_they_sha256,
    surface
  });
  assert.equal(assertBatchGenerationAuthorized(governed), true);
  assert.equal(assertServingAuthorized(governed), true);

  if (row.body_they !== undefined && row.body_they !== record.body_they) {
    throw new Error(`${record.contentKey}: existing Friends copy differs from the exact owner-approved 350-row payload; refusing to overwrite.`);
  }
  if (row.body_they === record.body_they) alreadyPromoted += 1;

  row.source_keys = Array.isArray(row.source_keys)
    ? row.source_keys.filter((key) => key !== legacyAuthorizationRelative && key !== authorizationRelative)
    : [];
  row.source_keys.push(authorizationRelative);
  row.body_they = record.body_they;
  row.body_they_review_status = "approved";
  row.body_they_sha256 = record.body_they_sha256;
  row.body_they_approved_via = authorizationRelative;
  row.body_they_authorship = "independent_friend_authoring";
  row.body_they_name_variable = "{{Name}}";
  row.body_they_sourceMechanism = "Explicit independently authored Friends passage. Runtime You-to-Friends conversion remains fallback-only for transit rows without explicit body_they.";
  row.body_they_approval = {
    approvalLevel: "exact_owner_approved",
    recordPath: authorizationRelative,
    payloadSha256: record.body_they_sha256,
    approvedAt
  };
}

for (const record of authorizedRecords) {
  const row = sourceByKey.get(record.contentKey);
  assert.equal(JSON.stringify(row.body_you ?? null), youBefore.get(record.contentKey), `${record.contentKey}: You copy changed during Friends promotion.`);
  assert.equal(sha256(row.body_they), record.body_they_sha256);
}
assert.equal(JSON.stringify(protectedRow.body_you ?? null), youBefore.get(protectedContentKey), `${protectedContentKey}: protected You copy changed during Friends correction.`);
assert.equal(protectedRow.body_you, venusMoonAuthority.body_you, `${protectedContentKey}: exact Content Studio You revision must remain preserved.`);
assert.equal(typeof protectedRow.body_they, "undefined", `${protectedContentKey}: protected Friends field must remain undefined.`);
const sunAfter = sourceRows
  .filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/sun/"))
  .map((row) => JSON.stringify(row));
assert.deepEqual(sunAfter, sunBefore, "The 27 existing Sun Friends rows must remain byte-equivalent as JSON values.");

const explicitNonSun = sourceRows.filter((row) => (
  String(row.contentKey ?? "").startsWith("authored/transit-aspect/")
  && !String(row.contentKey).startsWith("authored/transit-aspect/sun/")
  && typeof row.body_they === "string"
  && row.body_they.trim()
));
assert.equal(explicitNonSun.length, 350);
assert.equal(explicitNonSun.some((row) => row.contentKey === protectedContentKey), false);

const pinnedVersionFiles = [
  "apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts",
  "scripts/import-venus-moon-hard-owner-published-you-v1.mjs",
  "scripts/test-sun-friends-serving-v1.mjs",
  "scripts/test-empty-house-refinement.mjs",
  "scripts/test-fallback-refresh-wiring.mjs",
  "scripts/test-fallback-package-cache-contract.mjs"
];

if (apply) {
  writeJson(authorizationRelative, authorization, 2);
  fs.rmSync(path.join(root, legacyAuthorizationRelative), { force: true });
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
}

console.log(JSON.stringify({
  mode: apply ? "applied" : "verify-only",
  batchId,
  count: members.length,
  completionCount: completion.records.length,
  protectedContentKey,
  protectedFriendsPopulated: false,
  alreadyPromoted,
  ownerStatement,
  sourceRecordSha256: authorization.sourceRecordSha256,
  packageVersion: apply ? nextPackageVersion : priorPackageVersion,
  sunRowsChanged: 0,
  youRowsChanged: 0
}, null, 2));
