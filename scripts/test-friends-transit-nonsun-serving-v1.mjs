#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE,
  applyBoundedOwnerBatchAuthorization,
  assertServingAuthorized,
  generatedApprovalState,
  markPipelineReady
} from "../src/astro-writing/approvalGovernance.mjs";
import {
  createTransitSynastryRenderer,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const root = process.cwd();
const completionPath = "packages/astro-knowledge/review/transit-aspect-friends-completion-v1.json";
const authorizationPath = "packages/astro-knowledge/review/transit-aspect-friends-nonsun-351-owner-live-2026-09-03.json";
const sourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const bundledPath = "apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json";
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const completion = read(completionPath);
const authorization = read(authorizationPath);
const source = read(sourcePath);
const bundled = read(bundledPath);
const templates = read("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const fallbackRows = read("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");

assert.equal(PACKAGE_VERSION, "v3-2026-09-03c");
assert.equal(authorization.schema, "tldrastro-bounded-owner-batch-authorization-v1");
assert.equal(authorization.type, BOUNDED_OWNER_BATCH_AUTHORIZATION_TYPE);
assert.equal(authorization.authority, "owner");
assert.equal(authorization.decision, "approve");
assert.equal(authorization.ownerStatement, "all the friend's rewrite's your doing, you should approve as live.");
assert.equal(authorization.surface, "personal-transits-friends");
assert.equal(authorization.approvedField, "body_they");
assert.deepEqual(authorization.capabilities, ["batch_generation", "serving"]);
assert.equal(authorization.count, 351);
assert.equal(authorization.members.length, 351);
assert.equal(completion.records.length, 351);
assert.equal(sha256(fs.readFileSync(path.join(root, completionPath), "utf8")), authorization.sourceRecordSha256);

const approvedByKey = new Map(completion.records.map((record) => [record.contentKey, record]));
const authorizationByKey = new Map(authorization.members.map((member) => [member.contentKey, member]));
assert.equal(approvedByKey.size, 351);
assert.equal(authorizationByKey.size, 351);

const sourceNonSun = source.authoredCards.filter((row) => (
  String(row.contentKey ?? "").startsWith("authored/transit-aspect/")
  && !String(row.contentKey).startsWith("authored/transit-aspect/sun/")
));
const bundledNonSun = bundled.authoredCards.filter((row) => (
  String(row.contentKey ?? "").startsWith("authored/transit-aspect/")
  && !String(row.contentKey).startsWith("authored/transit-aspect/sun/")
));
assert.equal(sourceNonSun.length, 351);
assert.equal(bundledNonSun.length, 351);

for (const row of sourceNonSun) {
  const approved = approvedByKey.get(row.contentKey);
  const member = authorizationByKey.get(row.contentKey);
  assert.ok(approved, `${row.contentKey}: missing completion record.`);
  assert.ok(member, `${row.contentKey}: missing owner authorization member.`);
  assert.equal(member.payloadSha256, approved.body_they_sha256);
  assert.equal(sha256(approved.body_they), member.payloadSha256);

  const governed = applyBoundedOwnerBatchAuthorization(markPipelineReady(generatedApprovalState()), {
    authorization,
    contentKey: row.contentKey,
    field: "body_they",
    payloadSha256: member.payloadSha256,
    surface: "personal-transits-friends"
  });
  assert.equal(assertServingAuthorized(governed), true);

  assert.equal(row.body_they, approved.body_they, `${row.contentKey}: source Friends copy drifted.`);
  assert.equal(row.body_they_sha256, member.payloadSha256, `${row.contentKey}: source Friends hash drifted.`);
  assert.equal(sha256(row.body_they), member.payloadSha256);
  assert.equal(row.body_they_review_status, "approved");
  assert.equal(row.body_they_authorship, "independent_friend_authoring");
  assert.equal(row.body_they_approved_via, authorizationPath);
  assert.equal(row.body_they_approval?.approvalLevel, "exact_owner_approved");
  assert.equal(row.body_they_approval?.recordPath, authorizationPath);
  assert.equal(row.body_they_approval?.payloadSha256, member.payloadSha256);
  assert.equal(row.body_they_approval?.approvedAt, "2026-09-03");
  assert.ok(row.source_keys?.includes(authorizationPath));

  const shipped = bundledNonSun.find((candidate) => candidate.contentKey === row.contentKey);
  assert.ok(shipped, `${row.contentKey}: missing bundled row.`);
  assert.equal(shipped.body_they, approved.body_they, `${row.contentKey}: bundled Friends copy drifted.`);
  assert.equal(sha256(shipped.body_they), member.payloadSha256, `${row.contentKey}: bundled Friends hash drifted.`);
}

const sourceSun = source.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/sun/"));
const bundledSun = bundled.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/sun/"));
assert.equal(sourceSun.length, 27);
assert.equal(bundledSun.length, 27);
assert.equal(sourceSun.every((row) => typeof row.body_they === "string" && row.body_they.trim()), true);
assert.equal(bundledSun.every((row) => typeof row.body_they === "string" && row.body_they.trim()), true);

const renderer = createTransitSynastryRenderer(bundled, templates, fallbackRows);
const representative = completion.records.find((record) => record.contentKey === "authored/transit-aspect/chiron/ascendant/hard")
  ?? completion.records[0];
const [, , , transiting, natal, aspect] = representative.contentKey.split("/");
const rendered = renderer.renderTransitAspect({
  transiting,
  natal,
  aspect: aspect === "hard" ? "square" : aspect === "soft" ? "trine" : aspect,
  sign: "virgo",
  voice: "Alisa P",
  window: "until September 30"
});
const expectedRendered = representative.body_they
  .replaceAll("{{Name}}", "Alisa P")
  .replaceAll("{{aspectWord}}", aspect === "hard" ? "square" : aspect === "soft" ? "trine" : aspect)
  .replaceAll("{{untilDate}}", "September 30");
assert.equal(rendered.contentKey, representative.contentKey);
assert.equal(rendered.body, expectedRendered, "Friends renderer must prefer the explicit owner-approved body_they over legacy conversion.");

const materializedPath = path.join(os.tmpdir(), `tldr-friends-351-serving-${process.pid}.json`);
try {
  execFileSync(process.execPath, [
    path.join(root, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
    `--content-key=${representative.contentKey}`,
    `--out=${materializedPath}`
  ], { cwd: root, stdio: "pipe" });
  const materialized = JSON.parse(fs.readFileSync(materializedPath, "utf8"));
  assert.equal(materialized.rows.length, 1);
  const row = materialized.rows[0];
  assert.equal(row.status, "LIVE");
  assert.equal(row.lane, "serving");
  assert.equal(row.review_state, null);
  assert.equal(row.sections.body_they, representative.body_they);
  assert.equal(row.sections.packageRecord.body_they, representative.body_they);
  assert.equal(row.sections.packageRecord.body_they_approval.recordPath, authorizationPath);
} finally {
  fs.rmSync(materializedPath, { force: true });
}

console.log("Non-Sun Friends serving release contract passed for 351 exact hash-bound owner-approved body_they rows; 27 Sun Friends rows remain present.");
