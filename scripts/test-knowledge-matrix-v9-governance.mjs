#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createKnowledgeMatrixV8Resolver,
  createKnowledgeMatrixV9Resolver,
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(
  repoRoot,
  "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer",
);
const v8Root = path.join(packageRoot, "knowledge-matrix-v8");
const deltaRoot = path.join(packageRoot, "knowledge-matrix-v9-governance");
const publicRoot = path.join(
  repoRoot,
  "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-delta",
);

const v8ExpectedHashes = {
  "house-activations-v8-owner-approved-locked.json": "f25074ea1f6eba38c2d12a3216f124b4d573c175bb374be28ea6ee3c69b2117f",
  "knowledge-matrix-v8-import-manifest.json": "e13cef6d29112970a127dd89774ce81643e5e8b8e7f4b8be26f80790febf2895",
  "knowledge-matrix-v8-owner-approved-build-report.json": "1ba70bfa44997d1462a6d65994c161329347729c31f5c42c3a5ffb16bd6d393b",
  "transit-meanings-v8-owner-approved-locked.json": "1e918369505d41d2cf74d6e76a59704aa0550e8fc55d22b65b99b53a8f55a1a3",
};

function bytes(root, fileName) {
  return fs.readFileSync(path.join(root, fileName));
}

function json(root, fileName) {
  return JSON.parse(bytes(root, fileName).toString("utf8"));
}

for (const [fileName, expected] of Object.entries(v8ExpectedHashes)) {
  const actual = crypto.createHash("sha256").update(bytes(v8Root, fileName)).digest("hex");
  assert.equal(actual, expected, `${fileName} must remain byte-identical to v8`);
}

const deltaFiles = [
  "knowledge-matrix-v9-governance-manifest.json",
  "knowledge-matrix-v9-governance-build-report.json",
  "transit-meanings-v9-governance-delta.json",
  "house-activations-v9-governance-delta.json",
];
for (const fileName of deltaFiles) {
  assert.deepEqual(bytes(deltaRoot, fileName), bytes(publicRoot, fileName), `${fileName} package/public bytes`);
}

const v8 = createKnowledgeMatrixV8Resolver(
  json(v8Root, "knowledge-matrix-v8-import-manifest.json"),
  json(v8Root, "transit-meanings-v8-owner-approved-locked.json"),
  json(v8Root, "house-activations-v8-owner-approved-locked.json"),
  json(v8Root, "knowledge-matrix-v8-owner-approved-build-report.json"),
);
const manifest = json(deltaRoot, "knowledge-matrix-v9-governance-manifest.json");
const transit = json(deltaRoot, "transit-meanings-v9-governance-delta.json");
const house = json(deltaRoot, "house-activations-v9-governance-delta.json");
const buildReport = json(deltaRoot, "knowledge-matrix-v9-governance-build-report.json");

assert.equal(transit.rows.length, 609);
assert.equal(house.rows.length, 424);
assert.equal(transit.rows.filter((row) => row.Archive === "AC").length, 307);
assert.equal(transit.rows.filter((row) => row.Archive === "OWN").length, 129);
assert.equal(transit.rows.filter((row) => row.Archive === "ML").length, 171);
assert.equal(transit.rows.filter((row) => row.Judge === "rewritten-source-safe (lilith fact boundary)").length, 2);
assert.equal(house.rows.filter((row) => row.Archive === "AC").length, 83);
assert.equal(house.rows.filter((row) => row.Archive === "ML").length, 341);
assert.equal([...transit.rows, ...house.rows].every((row) => row.Governance === "owner-approved"), true);
assert.equal(manifest.workbook_validation.transit_copy_digest.startsWith("478dd230db2eb226"), true);
assert.equal(manifest.workbook_validation.house_experience_digest.startsWith("b6a5d42f4a16eac6"), true);

const resolver = createKnowledgeMatrixV9Resolver(v8, manifest, transit, house, buildReport);
assert.deepEqual(resolver.counts, {
  transitPrimaryKeys: 365,
  housePrimaryKeys: 954,
  houseEventEntries: 1017,
});

const v8CollisionFacts = { planet: "Chiron", transitSign: "Aries", eventType: "direct" };
assert.deepEqual(
  resolver.renderTransitMeaning(v8CollisionFacts),
  v8.renderTransitMeaning(v8CollisionFacts),
  "a v8 runtime winner must remain unchanged on a delta collision",
);

const newTransit = resolver.renderTransitMeaning({
  planet: "Mars",
  transitSign: "Scorpio",
  eventType: "direct",
});
const firstMarsScorpio = transit.rows.find((row) => (
  row.Planet === "Mars" && row.Sign === "Scorpio" && row.Event === "direct"
));
assert.equal(newTransit?.body, firstMarsScorpio.Copy);
assert.equal(newTransit?.sourceRow, firstMarsScorpio.source_row);
assert.equal(newTransit?.governance, "owner-approved");

const newHouse = resolver.renderHouseActivation({
  risingSign: "Aries",
  planet: "Venus",
  transitSign: "Libra",
  house: 7,
  eventType: "direct",
});
const firstVenusLibra = house.rows.find((row) => (
  row["Rising sign"] === "Aries"
  && row.Planet === "Venus"
  && row["Transit sign"] === "Libra"
  && row.House === 7
  && row.Event === "direct"
));
assert.equal(newHouse?.body, firstVenusLibra.Experience);
assert.equal(newHouse?.sourceRow, firstVenusLibra.source_row);

assert.equal(
  resolver.renderTransitMeaning({ planet: "Sun", transitSign: "Aries", eventType: "retrograde" }),
  null,
  "an uncovered transit key must fail closed",
);
assert.equal(
  resolver.renderHouseActivation({
    risingSign: "Cancer",
    planet: "Mercury",
    transitSign: "None",
    house: 0,
    eventType: "direct",
  }),
  null,
  "a house row missing a reusable key must not serve",
);

console.log("Knowledge matrix v9 Phase 0 passed: 1,033 governance-authorized rows landed, v8 bytes unchanged, 47 transit and 24 house-event keys added, uncovered keys fail closed.");
