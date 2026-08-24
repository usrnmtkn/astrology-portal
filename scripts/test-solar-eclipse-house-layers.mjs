#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { isGovernedReaderEligible } from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const sourceText = fs.readFileSync(
  "packages/astro-knowledge/review/lunation-card-assembly-v1/source/solar-eclipse-house-layer-v1.json",
  "utf8"
);
const source = JSON.parse(sourceText);
const runtime = JSON.parse(fs.readFileSync(
  "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-eclipse-house-layers-v1.json",
  "utf8"
));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

assert.equal(source.schema, "solar-eclipse-house-layer/v1");
assert.equal(source.status, "owner-approved-reuse");
assert.equal(source.count, 12);
assert.equal(runtime.schema, "lunation-eclipse-house-layers/v1");
assert.equal(runtime.count, 12);
assert.equal(runtime.source_sha256, hash(sourceText));
assert.equal(new Set(runtime.authoredCards.map((row) => row.house)).size, 12);
assert.equal(
  source.entries.reduce((sum, entry) => sum + entry.transforms
    .filter((transform) => transform.type === "omit_owner_approved_direct_intention_sentences")
    .reduce((count, transform) => count + transform.count, 0), 0),
  11
);
assert.match(source.entries[0].body, /^The New Moon in the 1st house/u);
assert.match(source.entries[0].body, /The 1st house corresponds to the emergence of self/u);
assert.doesNotMatch(source.entries[0].body, /manifest intentions to redefine the self/u);

for (const row of runtime.authoredCards) {
  const entry = source.entries.find((candidate) => candidate.house === row.house);
  assert.ok(entry, `Missing governed source for solar house ${row.house}.`);
  assert.equal(row.body, entry.body);
  assert.equal(row.review_status, "approved_reuse");
  assert.equal(row.approval.payloadSha256, hash(row.body));
  assert.equal(isGovernedReaderEligible(row), true);
  assert.doesNotMatch(row.body, /\| -----|set intentions|time to manifest intentions/iu);
}

console.log("Solar eclipse house layers passed: 12 approved New Moon-derived layers, 11 declared omissions, and the reviewed House 1 boundary.");
