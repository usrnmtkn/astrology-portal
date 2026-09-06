#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recordsDir = path.join(
  root,
  "packages",
  "astro-knowledge",
  "review",
  "sky-calendar-south-node-60-v1",
  "records"
);

const expectedBodies = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith"
];
const expectedAspects = ["conjunction", "sextile", "square", "trine", "opposition"];
const mirroredNorthNodeAspect = {
  conjunction: "opposition",
  sextile: "trine",
  square: "square",
  trine: "sextile",
  opposition: "conjunction"
};

assert.ok(fs.existsSync(recordsDir), `Missing South Node review directory: ${recordsDir}`);

const files = fs.readdirSync(recordsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

assert.equal(files.length, expectedBodies.length, "South Node queue must contain exactly 12 body files.");
assert.deepEqual(
  files.map((name) => name.replace(/\.json$/u, "")).sort(),
  [...expectedBodies].sort(),
  "South Node queue body files do not match the governed 12-body set."
);

const allRecords = [];

for (const body of expectedBodies) {
  const file = path.join(recordsDir, `${body}.json`);
  const packet = JSON.parse(fs.readFileSync(file, "utf8"));

  assert.equal(packet.counterpartBody, body, `${body}.json counterpartBody mismatch.`);
  assert.equal(packet.status, "needs_review", `${body}.json must remain review-gated.`);
  assert.ok(Array.isArray(packet.records), `${body}.json records must be an array.`);
  assert.equal(packet.records.length, expectedAspects.length, `${body}.json must contain five major aspects.`);
  assert.deepEqual(
    packet.records.map((record) => record.aspect),
    expectedAspects,
    `${body}.json aspect order/set mismatch.`
  );

  for (const record of packet.records) {
    const expectedKey = `sky.aspect.${body}.${record.aspect}.south-node`;
    assert.equal(record.contentKey, expectedKey, `${expectedKey}: contentKey mismatch.`);
    assert.equal(
      record.mirroredNorthNodeAspect,
      mirroredNorthNodeAspect[record.aspect],
      `${expectedKey}: mirrored North Node aspect mismatch.`
    );
    assert.equal(record.reviewStatus, "needs_review", `${expectedKey}: must remain needs_review.`);
    assert.equal(record.runtimeEligible, false, `${expectedKey}: must remain runtime-ineligible.`);
    assert.ok(typeof record.summary === "string" && record.summary.trim(), `${expectedKey}: missing summary.`);
    assert.ok(typeof record.body === "string" && record.body.trim(), `${expectedKey}: missing body.`);
    assert.match(record.body, /\bSouth Node\b/u, `${expectedKey}: body must name South Node explicitly.`);
    assert.doesNotMatch(record.body, /\bNorth Node\b/u, `${expectedKey}: North Node prose leaked into South Node draft.`);
    assert.doesNotMatch(record.body, /—/u, `${expectedKey}: em dash is banned.`);
    assert.doesNotMatch(record.body, /\bwhether\b/iu, `${expectedKey}: owner-banned 'whether' detected.`);
    assert.doesNotMatch(
      `${record.summary}\n${record.body}`,
      /\b(?:tarot|arcana|major arcana|minor arcana)\b/iu,
      `${expectedKey}: tarot reference detected in astrology content.`
    );
    allRecords.push(record);
  }
}

assert.equal(allRecords.length, 60, "South Node editorial queue must contain exactly 60 records.");
assert.equal(new Set(allRecords.map((record) => record.contentKey)).size, 60, "South Node content keys must be unique.");

for (const body of expectedBodies) {
  for (const aspect of expectedAspects) {
    assert.ok(
      allRecords.some((record) => record.contentKey === `sky.aspect.${body}.${aspect}.south-node`),
      `Missing South Node candidate for ${body} ${aspect}.`
    );
  }
}

console.log("South Node Calendar editorial queue: 60/60 review-gated pole-specific candidates validated.");
