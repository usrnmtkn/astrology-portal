#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createTransitSynastryRenderer,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const root = process.cwd();
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const approvalPath = "packages/astro-knowledge/review/transit-aspect-friends-sun-proposed-v1.json";
const overridePath = "packages/astro-knowledge/review/transit-aspect-sun-ascendant-hard-owner-published-2026-09-03.json";
const sourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const bundledPath = "apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json";
const approval = read(approvalPath);
const override = read(overridePath);
const source = read(sourcePath);
const bundled = read(bundledPath);
const templates = read("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const rows = read("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const ascendantKey = "authored/transit-aspect/sun/ascendant/hard";

assert.equal(PACKAGE_VERSION, "v3-2026-09-03b");
assert.equal(approval.status, "owner_approved");
assert.equal(approval.approvalLevel, "exact_owner_approved");
assert.equal(approval.records.length, 27);
assert.equal(override.schema, "tldrastro-transit-aspect-owner-published-override-v1");
assert.equal(override.contentKey, ascendantKey);
assert.equal(override.status, "owner_published");
assert.equal(override.approvalLevel, "exact_owner_published_cms_revision");
assert.match(override.body_you, /\{\{aspectWord\}\}/u);
assert.match(override.body_you, /\{\{untilDate\}\}/u);
assert.match(override.body_they, /\{\{Name\}\}/u);
assert.match(override.body_they, /\{\{aspectWord\}\}/u);
assert.match(override.body_they, /\{\{untilDate\}\}/u);

const approvedByKey = new Map(approval.records.map((row) => [row.contentKey, row]));
const sourceSun = source.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/sun/"));
const bundledSun = bundled.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/sun/"));
assert.equal(sourceSun.length, 27);
assert.equal(bundledSun.length, 27);

for (const row of sourceSun) {
  const approved = approvedByKey.get(row.contentKey);
  assert.ok(approved, `${row.contentKey}: missing exact owner approval.`);
  const isOwnerPublishedOverride = row.contentKey === ascendantKey;
  const expectedFriend = isOwnerPublishedOverride ? override.body_they : approved.body_they;
  const expectedHash = isOwnerPublishedOverride ? sha256(override.body_they) : approved.body_they_sha256;
  const expectedRecordPath = isOwnerPublishedOverride ? overridePath : approvalPath;
  const expectedApprovalLevel = isOwnerPublishedOverride
    ? "exact_owner_published_cms_revision"
    : "exact_owner_approved";

  assert.equal(row.body_they, expectedFriend, `${row.contentKey}: source Friends copy drifted.`);
  assert.equal(row.body_they_sha256, expectedHash, `${row.contentKey}: source Friends hash drifted.`);
  assert.equal(sha256(row.body_they), expectedHash, `${row.contentKey}: source Friends bytes differ from governed record.`);
  assert.equal(row.body_they_review_status, "approved");
  assert.equal(row.body_they_authorship, "independent_friend_authoring");
  assert.equal(row.body_they_approval?.approvalLevel, expectedApprovalLevel);
  assert.equal(row.body_they_approval?.recordPath, expectedRecordPath);
  assert.equal(row.body_they_approval?.payloadSha256, expectedHash);

  const shipped = bundledSun.find((item) => item.contentKey === row.contentKey);
  assert.ok(shipped, `${row.contentKey}: missing bundled serving row.`);
  assert.equal(shipped.body_they, expectedFriend, `${row.contentKey}: bundled Friends copy drifted.`);
  assert.equal(sha256(shipped.body_they), expectedHash, `${row.contentKey}: bundled Friends bytes differ from governed record.`);
}

const otherExplicit = source.authoredCards.filter((row) => (
  String(row.contentKey ?? "").startsWith("authored/transit-aspect/")
  && !String(row.contentKey).startsWith("authored/transit-aspect/sun/")
  && typeof row.body_they === "string"
  && row.body_they.trim()
));
assert.equal(otherExplicit.length, 0, "Sun release must not silently populate other transit families.");

const ascSource = sourceSun.find((row) => row.contentKey === ascendantKey);
const ascBundled = bundledSun.find((row) => row.contentKey === ascendantKey);
assert.equal(ascSource.body_you, override.body_you, "Current owner-published Sun square Ascendant You copy must be preserved in package source.");
assert.equal(ascBundled.body_you, override.body_you, "Current owner-published Sun square Ascendant You copy must be preserved in bundled serving copy.");
assert.equal(ascSource.body_they, override.body_they, "Current owner-published Sun square Ascendant Friend copy must be preserved in package source.");
assert.equal(ascBundled.body_they, override.body_they, "Current owner-published Sun square Ascendant Friend copy must be preserved in bundled serving copy.");

const renderer = createTransitSynastryRenderer(bundled, templates, rows);
const friendRendered = renderer.renderTransitAspect({
  transiting: "sun",
  natal: "ascendant",
  aspect: "square",
  sign: "virgo",
  voice: "Alisa P",
  window: "until September 4"
});
const expectedFriend = override.body_they
  .replaceAll("{{Name}}", "Alisa P")
  .replaceAll("{{aspectWord}}", "square")
  .replaceAll("{{untilDate}}", "September 4");
assert.equal(friendRendered.contentKey, ascendantKey);
assert.equal(friendRendered.body, expectedFriend, "Friends reader must serve the current owner-published body_they, not legacy conversion or stale bundled copy.");

const youRendered = renderer.renderTransitAspect({
  transiting: "sun",
  natal: "ascendant",
  aspect: "square",
  sign: "virgo",
  voice: "you",
  window: "until September 4"
});
const expectedYou = override.body_you
  .replaceAll("{{aspectWord}}", "square")
  .replaceAll("{{untilDate}}", "September 4");
assert.equal(youRendered.body, expectedYou, "You reader copy must remain the current owner-published CMS revision.");

const materializedPath = path.join(os.tmpdir(), `tldr-sun-friends-serving-${process.pid}.json`);
try {
  execFileSync(process.execPath, [
    path.join(root, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
    `--content-key=${ascendantKey}`,
    `--out=${materializedPath}`
  ], { cwd: root, stdio: "pipe" });
  const materialized = JSON.parse(fs.readFileSync(materializedPath, "utf8"));
  assert.equal(materialized.rows.length, 1);
  const row = materialized.rows[0];
  assert.equal(row.status, "LIVE");
  assert.equal(row.lane, "serving");
  assert.equal(row.review_state, null);
  assert.equal(row.body, override.body_you);
  assert.equal(row.sections.body_you, override.body_you);
  assert.equal(row.sections.body_they, override.body_they);
  assert.equal(row.sections.packageRecord.body_they, override.body_they);
} finally {
  fs.rmSync(materializedPath, { force: true });
}

console.log("Sun Friends serving release contract passed for 26 hash-locked batch rows plus the current owner-published Sun square Ascendant override.");
