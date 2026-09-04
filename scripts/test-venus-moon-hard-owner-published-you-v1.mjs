#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
const authorityPath = "packages/astro-knowledge/review/transit-aspect-venus-moon-hard-owner-published-2026-09-02.json";
const sourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const bundledPath = "apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json";
const contentKey = "authored/transit-aspect/venus/moon/hard";
const authority = read(authorityPath);
const source = read(sourcePath);
const bundled = read(bundledPath);
const templates = read("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const fallbackRows = read("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(PACKAGE_VERSION, "v3-2026-09-03b");
assert.equal(authority.contentKey, contentKey);
assert.equal(authority.status, "owner_published");
assert.equal(authority.approvalLevel, "exact_owner_published_cms_revision");
assert.equal(sha256(authority.body_you), authority.body_you_sha256);

const sourceRow = source.authoredCards.find((row) => row.contentKey === contentKey);
const bundledRow = bundled.authoredCards.find((row) => row.contentKey === contentKey);
assert.ok(sourceRow, `${contentKey}: missing package source row.`);
assert.ok(bundledRow, `${contentKey}: missing bundled serving row.`);
assert.equal(sourceRow.body_you, authority.body_you, "Package source must preserve the current owner-published Content Studio You revision.");
assert.equal(bundledRow.body_you, authority.body_you, "Bundled first paint must preserve the current owner-published Content Studio You revision.");
assert.equal(sourceRow.body_you_revision?.approvalLevel, authority.approvalLevel);
assert.equal(sourceRow.body_you_revision?.recordPath, authorityPath);
assert.equal(sourceRow.body_you_revision?.publishedAt, authority.publishedAt);
assert.equal(sourceRow.body_you_revision?.payloadSha256, authority.body_you_sha256);
assert.equal(typeof sourceRow.body_they, "undefined", "You parity repair must not populate source Friends copy.");
assert.equal(typeof bundledRow.body_they, "undefined", "You parity repair must not populate bundled Friends copy.");

const renderer = createTransitSynastryRenderer(bundled, templates, fallbackRows);
const rendered = renderer.renderTransitAspect({
  transiting: "venus",
  natal: "moon",
  aspect: "square",
  sign: "libra",
  voice: "you",
  window: "until September 5"
});
const expected = authority.body_you
  .replaceAll("{{aspectWord}}", "square")
  .replaceAll("{{untilDate}}", "September 5");
assert.equal(rendered.contentKey, contentKey);
assert.equal(rendered.body, expected, "Shipped resolver artifact must render the owner-published Venus square Moon You revision.");

const materializedPath = path.join(os.tmpdir(), `tldr-venus-moon-you-${process.pid}.json`);
try {
  execFileSync(process.execPath, [
    path.join(root, "scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs"),
    `--content-key=${contentKey}`,
    `--out=${materializedPath}`
  ], { cwd: root, stdio: "pipe" });
  const materialized = JSON.parse(fs.readFileSync(materializedPath, "utf8"));
  assert.equal(materialized.rows.length, 1);
  const row = materialized.rows[0];
  assert.equal(row.status, "LIVE");
  assert.equal(row.lane, "serving");
  assert.equal(row.body, authority.body_you);
  assert.equal(row.sections.body_you, authority.body_you);
  assert.equal(row.sections.body_they ?? null, null);
  assert.equal(row.sections.packageRecord.body_you, authority.body_you);
  assert.equal(row.sections.packageRecord.body_they ?? null, null);
} finally {
  fs.rmSync(materializedPath, { force: true });
}

console.log("Venus square Moon owner-published You revision is preserved across source, bundle, shipped resolver, and dashboard materializer without populating Friends copy.");
