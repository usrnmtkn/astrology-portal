#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const sourceRows = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", import.meta.url),
  "utf8"
));
const expectedNeedsReviewKeys = [
  "fallback-hook/placement-sentence/mars/aquarius",
  "fallback-hook/placement-sentence/mercury/pisces",
  "fallback-hook/house-cusp/taurus",
  "fallback-hook/house-cusp/cancer",
  "fallback-hook/house-cusp/leo",
  "fallback-hook/house-cusp/virgo",
  "fallback-hook/house-cusp/libra",
  "fallback-hook/house-cusp/scorpio",
  "fallback-hook/house-cusp/sagittarius",
  "fallback-hook/house-cusp/capricorn",
  "fallback-hook/house-cusp/aquarius",
  "fallback-hook/house-cusp/pisces"
];
const positiveTestKeys = [
  "fallback-hook/placement-sentence/mars/aquarius",
  "fallback-hook/placement-sentence/mercury/pisces"
];
const rowsByKey = new Map(sourceRows.hookRows.map((row) => [row.contentKey, row]));

assert.equal(
  rowsByKey.get("fallback-hook/placement-sentence/moon/scorpio")?.review_status,
  "approved",
  "The owner-approved Moon in Scorpio placement row must remain reader eligible."
);

for (const key of expectedNeedsReviewKeys) {
  assert.equal(rowsByKey.get(key)?.review_status, "needs_review", `${key} must remain review-gated.`);
}

for (const key of positiveTestKeys) {
  assert.equal(
    rowsByKey.get(key)?.positive_test,
    "passed-jul29-criteria",
    `${key} must retain its positive-test gate.`
  );
}

assert.equal(
  sourceRows.hookRows.filter((row) => expectedNeedsReviewKeys.includes(row.contentKey)).length,
  12,
  "The Jul 29 M1/M3 train must contain exactly 12 review-gated rows."
);

console.log("M1/M3 review gate passed: Moon in Scorpio approved; 12 needs_review rows remain.");
