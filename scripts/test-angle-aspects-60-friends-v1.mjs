#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";

import {
  SourceGapError as NodeSourceGapError,
  renderNatalAspect as nodeRenderNatalAspect
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = "packages/astro-knowledge/review/angle-aspects-60-friends-v1";
const rowsPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const templatesPath = "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json";
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const browserFallback = await tsImport(
  "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts",
  import.meta.url
);
const shipped = await import(`${pathToFileURL(path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js"
)).href}?angle-aspects-friends-v1=${Date.now()}`);

const rowsFile = readJson(rowsPath);
const templatesFile = readJson(templatesPath);
const browserRenderer = browserFallback.createFallbackRenderer(templatesFile, rowsFile);
const shippedRenderer = shipped.createFallbackRenderer(templatesFile, rowsFile);
const authority = readJson(`${reviewRoot}/ANGLE-ASPECTS-60-FRIENDS-V1-OWNER-APPROVED.json`);
const revisions = readJson(`${reviewRoot}/YOU-V15-TWO-OWNER-APPROVED-SUPERSESSIONS.json`);
const manifest = readJson(`${reviewRoot}/shipping-manifest.json`);
const v15Import = readJson("packages/astro-knowledge/review/angle-aspects-60-v15/ANGLE-ASPECTS-60-V15-CONTENT-STUDIO-IMPORT.json");
const rowsByKey = new Map(rowsFile.hookRows.map((row) => [row.contentKey, row]));
const friendsByKey = new Map(authority.rows.map((row) => [row.base_content_key, row]));
const revisionsByKey = new Map(revisions.revisions.map((row) => [row.content_key, row]));
const v15ByKey = new Map(v15Import.rows.map((row) => [row.content_key, row]));
const targetKeys = new Set(authority.rows.map((row) => row.base_content_key));

assert.equal(sha256(fs.readFileSync(path.join(repoRoot, reviewRoot, "ANGLE-ASPECTS-60-FRIENDS-V1-OWNER-APPROVED.md"))), "186fc623066981bd66a1cb7f4f00e2062391572b5f94ab1ad68b7842c5c135f2");
assert.equal(sha256(fs.readFileSync(path.join(repoRoot, reviewRoot, "ANGLE-ASPECTS-60-FRIENDS-V1-OWNER-APPROVED.json"))), "acdd96d177b971d1a4cc9bb1c02130347a09fcd2036de499ea35c1a205cd5640");
assert.equal(sha256(fs.readFileSync(path.join(repoRoot, reviewRoot, "YOU-V15-TWO-OWNER-APPROVED-SUPERSESSIONS.json"))), "bba7b003351a7b145c16c17ec6b85226d74aba37124c53aa08a2da54f7f1b853");
assert.equal(authority.rowCount, 60);
assert.equal(authority.rows.length, 60);
assert.equal(targetKeys.size, 60);
assert.equal(manifest.friendsRowCount, 60);
assert.equal(manifest.youRevisionCount, 2);
assert.equal(manifest.invariants.nonTargetSourceRowsChanged, 0);
assert.equal(manifest.invariants.nonTargetSourceRowsSha256Before, manifest.invariants.nonTargetSourceRowsSha256After);

let friendSourceParity = 0;
let friendRenderChecks = 0;
let youSourceParity = 0;
let youRenderChecks = 0;
let unchangedV15YouBodies = 0;

for (const friend of authority.rows) {
  const key = friend.base_content_key;
  const sourceRow = rowsByKey.get(key);
  const friendManifest = manifest.friendsRecords.find((record) => record.contentKey === key);
  assert.ok(sourceRow && friendManifest, `${key}: governed row or manifest record missing`);
  assert.equal(sourceRow.body_they, friend.body, `${key}: Friends source parity`);
  assert.equal(sourceRow.body_they_review_status, "approved");
  assert.equal(sourceRow.body_they_sha256, friend.body_sha256);
  assert.equal(sourceRow.body_they_approval.approvalLevel, "exact_owner_approved");
  assert.equal(sourceRow.body_they_approval.recordPath, friendManifest.recordPath);
  assert.equal(sha256(sourceRow.body_they), friend.body_sha256);
  assert.match(sourceRow.body_they, /\{\{Name\}\}/u);
  assert.doesNotMatch(sourceRow.body_they, /(?:^|[^A-Za-z])(?:you|your|yours)(?=$|[^A-Za-z])/iu);
  const friendRecord = readJson(friendManifest.recordPath);
  assert.equal(friendRecord.payload.body_they, friend.body);
  assert.equal(friendRecord.payloadSha256, sha256(JSON.stringify(friendRecord.payload)));
  assert.equal(friendRecord.payloadSha256, sourceRow.body_they_approval.payloadSha256);
  friendSourceParity += 1;

  const [, , planet, aspect, angle] = key.split("/");
  const expectedFriendBody = friend.body.replaceAll("{{Name}}", "Chris");
  const expectedYouBody = revisionsByKey.get(key)?.body ?? v15ByKey.get(key)?.body;
  assert.ok(expectedYouBody, `${key}: You authority missing`);
  if (revisionsByKey.has(key)) {
    const revisionManifest = manifest.youRevisionRecords.find((record) => record.contentKey === key);
    assert.ok(revisionManifest, `${key}: You supersession manifest missing`);
    const revisionRecord = readJson(revisionManifest.recordPath);
    assert.equal(sourceRow.body, revisionsByKey.get(key).body);
    assert.equal(sourceRow.approval.recordPath, revisionManifest.recordPath);
    assert.equal(revisionRecord.payload.body, revisionsByKey.get(key).body);
    assert.equal(revisionRecord.payloadSha256, sha256(JSON.stringify(revisionRecord.payload)));
    assert.ok(sourceRow.historical_approvals.some((approval) => approval.recordPath.startsWith("packages/astro-knowledge/review/angle-aspects-60-v15/records/")));
  } else {
    assert.equal(sourceRow.body, v15ByKey.get(key).body, `${key}: unchanged V15 You body drift`);
    unchangedV15YouBodies += 1;
  }
  youSourceParity += 1;

  for (const facts of [
    { planetA: planet, planetB: angle, aspect },
    { planetA: angle, planetB: planet, aspect }
  ]) {
    const friendFacts = { ...facts, voice: "Chris" };
    const youFacts = { ...facts, voice: "you" };
    for (const [implementation, renderer] of [
      ["node", nodeRenderNatalAspect],
      ["browser-source", browserRenderer.renderNatalAspect],
      ["shipped-dist", shippedRenderer.renderNatalAspect]
    ]) {
      const friendRendered = renderer(friendFacts);
      assert.equal(friendRendered.templateKey, key, `${key}/${implementation}: Friends content key`);
      assert.equal(friendRendered.body, expectedFriendBody, `${key}/${implementation}: Friends body`);
      assert.equal(friendRendered.provenanceTier, "exact-owner-approved");
      assert.notEqual(friendRendered.body, expectedYouBody, `${key}/${implementation}: Friends must not receive You copy`);
      friendRenderChecks += 1;

      const youRendered = renderer(youFacts);
      assert.equal(youRendered.templateKey, key, `${key}/${implementation}: You content key`);
      assert.equal(youRendered.body, expectedYouBody, `${key}/${implementation}: You body`);
      assert.equal(youRendered.provenanceTier, "exact-owner-approved");
      youRenderChecks += 1;
    }
  }
}

assert.equal(friendSourceParity, 60);
assert.equal(friendRenderChecks, 360, "60 Friends rows x 2 key orders x 3 resolver builds");
assert.equal(youSourceParity, 60);
assert.equal(youRenderChecks, 360, "60 You rows x 2 key orders x 3 resolver builds");
assert.equal(unchangedV15YouBodies, 58);

const sunSquareMidheaven = friendsByKey.get("fallback-hook/natal-aspect-lived/sun/square/midheaven");
const moonSquareMidheaven = friendsByKey.get("fallback-hook/natal-aspect-lived/moon/square/midheaven");
const sunSquareAscendant = friendsByKey.get("fallback-hook/natal-aspect-lived/sun/square/ascendant");
for (const entry of [sunSquareMidheaven, moonSquareMidheaven, sunSquareAscendant]) assert.ok(entry);
assert.equal(nodeRenderNatalAspect({ planetA: "sun", aspect: "square", planetB: "midheaven", voice: "Chris" }).body, sunSquareMidheaven.body.replaceAll("{{Name}}", "Chris"));
assert.equal(nodeRenderNatalAspect({ planetA: "moon", aspect: "square", planetB: "midheaven", voice: "Chris" }).body, moonSquareMidheaven.body.replaceAll("{{Name}}", "Chris"));
assert.equal(nodeRenderNatalAspect({ planetA: "sun", aspect: "square", planetB: "ascendant", voice: "Chris" }).body, sunSquareAscendant.body.replaceAll("{{Name}}", "Chris"));

for (const [implementation, render, GapError] of [
  ["node", nodeRenderNatalAspect, NodeSourceGapError],
  ["browser-source", browserRenderer.renderNatalAspect, browserFallback.SourceGapError],
  ["shipped-dist", shippedRenderer.renderNatalAspect, shipped.SourceGapError]
]) {
  assert.throws(
    () => render({ planetA: "pluto", aspect: "trine", planetB: "midheaven", voice: "Chris" }),
    GapError,
    `${implementation}: Pluto trine Midheaven must remain a source gap`
  );
}

console.log("Friends natal angle aspects V1: ok (60/60 source parity; 360/360 Friends resolver checks; 2/2 You supersessions; 58/58 unchanged V15 You bodies; Pluto trine Midheaven remains SOURCE_GAP).");
