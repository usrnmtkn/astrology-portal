#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createKnowledgeMatrixV9Resolver } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const writerRoot = path.join(
  repoRoot,
  "packages/astro-knowledge/voice/tldr-astro/satori-writer",
);
const deltaRoot = path.join(writerRoot, "knowledge-matrix-v9-governance");
const canonicalRoot = path.join(writerRoot, "knowledge-matrix-v9");
const publicRoot = path.join(
  repoRoot,
  "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-delta",
);

function bytes(root, fileName) {
  return fs.readFileSync(path.join(root, fileName));
}

function json(root, fileName) {
  return JSON.parse(bytes(root, fileName).toString("utf8"));
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

const manifest = json(deltaRoot, "knowledge-matrix-v9-governance-manifest.json");
const transit = json(deltaRoot, "transit-meanings-v9-governance-delta.json");
const houses = json(deltaRoot, "house-activations-v9-governance-delta.json");
const buildReport = json(deltaRoot, "knowledge-matrix-v9-governance-build-report.json");
const canonicalManifest = json(canonicalRoot, "knowledge-matrix-v9-import-manifest.json");
const canonicalRows = json(canonicalRoot, "knowledge-matrix-v9-owner-approved-rows.json");
const canonicalBuild = json(canonicalRoot, "knowledge-matrix-v9-build-report.json");

assert.equal(manifest.source_workbook_sha256, "d78569b194d132b921a71d061055e6b484ecae8877c6ae4c7b82d08538023b22");
assert.equal(manifest.workbook_validation.transit_copy_digest, "478dd230db2eb2268d8e71e0e428a8fa03d3e5a77658872b9a71ecf802496d67");
assert.equal(manifest.workbook_validation.house_experience_digest, "b6a5d42f4a16eac69fb2db89ef4a7cc2a718e9e1423ffa4c55b1654b7d6c4e98");
assert.equal(buildReport.workbook_sha256_match, true);
assert.equal(buildReport.transit_copy_digest_match, true);
assert.equal(buildReport.house_experience_digest_match, true);
assert.equal(buildReport.wording_changes, 0);
assert.equal(buildReport.warning_count, 0);
assert.deepEqual(buildReport.warnings, []);
assert.equal(buildReport.build_passed, true);

assert.equal(transit.rows.length, 609);
assert.equal(houses.rows.length, 424);
assert.equal(transit.rows.filter((row) => row.Archive === "AC").length, 307);
assert.equal(transit.rows.filter((row) => row.Archive === "OWN").length, 129);
assert.equal(transit.rows.filter((row) => row.Archive === "ML").length, 171);
assert.equal(transit.rows.filter((row) => row.Judge === "rewritten-source-safe (lilith fact boundary)").length, 2);
assert.equal(houses.rows.filter((row) => row.Archive === "AC").length, 83);
assert.equal(houses.rows.filter((row) => row.Archive === "ML").length, 341);
assert.equal([...transit.rows, ...houses.rows].every((row) => row.Governance === "owner-approved"), true);

const canonicalTransitByRow = new Map(canonicalRows.transit_meanings.map((row) => [row.source_row, row]));
for (const row of transit.rows) {
  const canonical = canonicalTransitByRow.get(row.source_row);
  assert.ok(canonical, `canonical transit source row ${row.source_row}`);
  for (const field of ["Archive", "Planet", "Sign", "Event", "Copy", "Judge", "Governance"]) {
    assert.equal(row[field], canonical[field], `transit source row ${row.source_row} ${field}`);
  }
}

const canonicalHouseByRow = new Map(canonicalRows.house_activations.map((row) => [row.source_row, row]));
for (const row of houses.rows) {
  const canonical = canonicalHouseByRow.get(row.source_row);
  assert.ok(canonical, `canonical house source row ${row.source_row}`);
  for (const field of ["Archive", "Rising sign", "Planet", "Transit sign", "House", "Event", "Experience", "Judge", "Governance"]) {
    assert.equal(row[field], canonical[field], `house source row ${row.source_row} ${field}`);
  }
}

const resolver = createKnowledgeMatrixV9Resolver(canonicalManifest, canonicalRows, canonicalBuild);
assert.deepEqual(resolver.counts, {
  ownerApprovedRows: 3485,
  transitEligibleRows: 1117,
  transitRuntimeKeys: 365,
  houseEligibleRows: 2353,
  housePrimaryKeys: 954,
  houseEventRuntimeKeys: 1017,
  excludedHouseRows: 15,
});

assert.equal(
  resolver.renderTransitMeaning({ planet: "Sun", transitSign: "Aries", eventType: "retrograde" }),
  null,
  "an uncovered transit key must fail closed",
);

console.log("Knowledge matrix v9 Phase 0 passed: 1,033 delta rows match canonical V9 byte-for-byte; workbook/digest gates pass; canonical runtime remains 365 transit and 1,017 house-event keys.");
