#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseRel = "packages/astro-knowledge/review/sky-calendar-composed-first-glance-2026-08-31/composed-cards-serving-release-2026-09-01.json";
const sourceRel = "packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json";

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const lowerSentenceStart = (value) => value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
const payloadHash = (forecast, details) => sha256(JSON.stringify({ forecast, details }));

const release = readJson(releaseRel);
const source = readJson(sourceRel);
const baseline = JSON.parse(execFileSync("git", ["cat-file", "blob", release.source_file_blob_sha_before_release], {
  cwd: repoRoot,
  encoding: "utf8"
}));

assert.equal(release.owner_approved, true);
assert.equal(release.owner_authorized, true);
assert.equal(release.serving_enabled, true);
assert.equal(release.expected_row_count, 24);
assert.equal(release.rows.length, 24);
assert.equal(new Set(release.rows.map((row) => row.contentKey)).size, 24);
assert.equal(source.cards.length, 24);
assert.equal(baseline.cards.length, 24);

const setHash = sha256(JSON.stringify(release.rows.map(({ contentKey, bodySha256 }) => ({ contentKey, bodySha256 }))));
assert.equal(setHash, release.payload_set_sha256, "Approved payload-set hash drifted");

const releaseByKey = new Map(release.rows.map((row) => [row.contentKey, row]));
const baselineByKey = new Map(baseline.cards.map((card) => [card.id, card]));

for (const card of source.cards) {
  const approved = releaseByKey.get(card.id);
  const before = baselineByKey.get(card.id);
  assert.ok(approved, `Missing approved row ${card.id}`);
  assert.ok(before, `Missing pre-release baseline ${card.id}`);
  assert.equal(sha256(approved.body), approved.bodySha256, `${card.id} approved body hash drifted`);
  assert.equal(card.forecast, lowerSentenceStart(approved.body), `${card.id} serving forecast does not match owner-approved body`);
  assert.equal(card.details, before.details, `${card.id} Details drifted`);
  assert.equal(card.ownerApproved, true, `${card.id} is not owner-approved`);
  assert.equal(card.servingAuthorized, true, `${card.id} is not serving-authorized`);
  assert.equal(card.approvedVia, releaseRel, `${card.id} release provenance drifted`);
  assert.equal(card.approvedAt, "2026-09-01", `${card.id} approval date drifted`);
  assert.equal(card.payloadSha256, payloadHash(card.forecast, card.details), `${card.id} payload hash drifted`);

  const currentStable = { ...card };
  const baselineStable = { ...before };
  for (const key of ["forecast", "payloadSha256", "approvedVia", "approvedAt", "ownerApproved", "servingAuthorized"]) {
    delete currentStable[key];
    delete baselineStable[key];
  }
  assert.deepEqual(currentStable, baselineStable, `${card.id} changed outside the authorized forecast/release metadata fields`);
}

assert.deepEqual(
  source.cards.map((card) => card.id).sort(),
  release.rows.map((row) => row.contentKey).sort(),
  "Release scope does not exactly match the composed-card corpus"
);

console.log("Calendar composed-card serving release: PASS (24 exact approved forecasts; Details and identities preserved)");
