#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentKey = "authored/transit-aspect/venus/moon/hard";
const authorityRelative = "packages/astro-knowledge/review/transit-aspect-venus-moon-hard-owner-published-2026-09-02.json";
const sourceRelative = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const oldPackageVersion = "v3-2026-09-03a";
const nextPackageVersion = "v3-2026-09-03b";
const priorSourceBodySha256 = "474bdf7a0bd7bde64a2bdb3a2c9f521b92e4790afb41518da31f469eded78324";
const apply = process.argv.includes("--apply");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const writeJson = (relative, value) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);

const authority = readJson(authorityRelative);
assert.equal(authority.schema, "tldrastro-transit-aspect-owner-published-you-override-v1");
assert.equal(authority.contentKey, contentKey);
assert.equal(authority.status, "owner_published");
assert.equal(authority.approvalLevel, "exact_owner_published_cms_revision");
assert.equal(sha256(authority.body_you), authority.body_you_sha256);
assert.match(authority.body_you, /\{\{aspectWord\}\}/u);
assert.match(authority.body_you, /\{\{untilDate\}\}/u);
assert.doesNotMatch(authority.body_you, /\{\{Name\}\}/u);

const source = readJson(sourceRelative);
const row = source.authoredCards.find((candidate) => candidate.contentKey === contentKey);
assert.ok(row, `${contentKey}: package source row missing`);
if (row.body_you !== authority.body_you) {
  assert.equal(sha256(String(row.body_you ?? "")), priorSourceBodySha256, `${contentKey}: source You copy changed since the CMS drift inventory; refusing to overwrite it.`);
}
assert.equal(row.body_they, undefined, `${contentKey}: this parity repair must not touch an existing Friends field.`);

row.body_you = authority.body_you;
row.body_you_revision = {
  approvalLevel: authority.approvalLevel,
  recordPath: authorityRelative,
  publishedAt: authority.publishedAt,
  source: authority.source,
  payloadSha256: authority.body_you_sha256
};

const pinnedVersionFiles = [
  "apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts",
  "scripts/test-sun-friends-serving-v1.mjs",
  "scripts/test-empty-house-refinement.mjs",
  "scripts/test-fallback-refresh-wiring.mjs",
  "scripts/test-fallback-package-cache-contract.mjs"
];

if (apply) {
  writeJson(sourceRelative, source);
  for (const relative of pinnedVersionFiles) {
    const absolute = path.join(root, relative);
    const current = fs.readFileSync(absolute, "utf8");
    assert.ok(current.includes(oldPackageVersion), `${relative}: expected ${oldPackageVersion} before package bump.`);
    fs.writeFileSync(absolute, current.replaceAll(oldPackageVersion, nextPackageVersion));
  }
}

console.log(JSON.stringify({
  mode: apply ? "applied" : "verify-only",
  contentKey,
  bodyYouSha256: authority.body_you_sha256,
  publishedAt: authority.publishedAt,
  packageVersion: apply ? nextPackageVersion : oldPackageVersion,
  friendsFieldsChanged: 0
}, null, 2));
