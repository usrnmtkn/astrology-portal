#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createKnowledgeMatrixV9Resolver } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  KNOWLEDGE_MATRIX_V9_BASE_PATH,
  loadKnowledgeMatrixV9Runtime,
  renderKnowledgeMatrixV9HouseActivation,
  renderKnowledgeMatrixV9TransitMeaning
} from "../apps/web/src/content/knowledgeMatrixV9Runtime.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(
  repoRoot,
  "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled"
);
const canonicalWorkbook = path.join(
  repoRoot,
  "tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx"
);

const expectedHashes = {
  "knowledge-matrix-v9-owner-approved-rows.json": "5907cbdbc6e015c4d0a68ce54f24506fe7e8eff51fbdf4b83485e492032e9a4c",
  "knowledge-matrix-v9-import-manifest.json": "a714285eefcf4649c89b26292cb8a189b879f2494efeb63c745b9c11dab066d4",
  "knowledge-matrix-v9-build-report.json": "f2856a2332e3e51a5f3b11bf7545e581488e37220c0973fd9acfbc3dc46d5018"
};

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sourceBytes = (fileName) => fs.readFileSync(path.join(sourceRoot, fileName));
const readJson = (fileName) => JSON.parse(sourceBytes(fileName).toString("utf8"));

assert.equal(
  sha256(fs.readFileSync(canonicalWorkbook)),
  "d78569b194d132b921a71d061055e6b484ecae8877c6ae4c7b82d08538023b22",
  "the canonical v9 workbook fingerprint must remain exact"
);
for (const [fileName, expectedHash] of Object.entries(expectedHashes)) {
  assert.equal(sha256(sourceBytes(fileName)), expectedHash, `${fileName} must remain byte-identical`);
}

const manifest = readJson("knowledge-matrix-v9-import-manifest.json");
const buildReport = readJson("knowledge-matrix-v9-build-report.json");
const rowsFile = readJson("knowledge-matrix-v9-owner-approved-rows.json");
assert.match(manifest.source_policy.change_control, /becomes v10.+returns to the owner for approval/iu);
assert.equal(manifest.source_policy.authority_column, "Governance");
assert.deepEqual(manifest.source_policy.historical_lineage_columns, ["Judge"]);

assert.equal(rowsFile.transit_meanings.length, 1117);
assert.equal(rowsFile.house_activations.length, 2368);
assert.equal(
  [...rowsFile.transit_meanings, ...rowsFile.house_activations]
    .filter((row) => row.Governance === "owner-approved").length,
  3485,
  "Governance, not Judge, authorizes every canonical row"
);
assert.equal(
  sha256(JSON.stringify(rowsFile.transit_meanings.map((row) => row.Copy))),
  manifest.validation.transit_copy_digest
);
assert.equal(
  sha256(JSON.stringify(rowsFile.house_activations.map((row) => row.Experience))),
  manifest.validation.house_experience_digest
);
assert.equal(
  sha256(JSON.stringify({
    transit: rowsFile.transit_meanings.map((row) => row.Copy),
    houses: rowsFile.house_activations.map((row) => row.Experience)
  })),
  manifest.validation.combined_copy_experience_digest
);

const resolver = createKnowledgeMatrixV9Resolver(manifest, rowsFile, buildReport);
assert.deepEqual(resolver.counts, {
  ownerApprovedRows: 3485,
  transitEligibleRows: 1117,
  transitRuntimeKeys: 365,
  houseEligibleRows: 2353,
  housePrimaryKeys: 954,
  houseEventRuntimeKeys: 1017,
  excludedHouseRows: 15
});

const firstLilith = rowsFile.transit_meanings.find((row) => (
  row.Planet === "Black Moon Lilith" && row.Sign === "Any" && row.Event === "station"
));
const lilith = resolver.renderTransitMeaning({
  planet: "Black Moon Lilith",
  transitSign: "Any",
  eventType: "station"
});
assert.equal(lilith?.body, firstLilith.Copy);
assert.equal(lilith?.sourceRow, firstLilith.source_row);
assert.equal(lilith?.governance, "owner-approved");
assert.equal(lilith?.judgeLineage, firstLilith.Judge);

const firstAriesHouse = rowsFile.house_activations.find((row) => (
  row["Rising sign"] === "Aries"
  && row.Planet === "Chiron"
  && row["Transit sign"] === "Aries"
  && row.House === 1
  && row.Event === "ingress"
));
const house = resolver.renderHouseActivation({
  risingSign: "Aries",
  planet: "Chiron",
  transitSign: "Aries",
  house: 1,
  eventType: "ingress"
});
assert.equal(house?.body, firstAriesHouse.Experience);
assert.equal(house?.sourceRow, firstAriesHouse.source_row);

assert.equal(
  resolver.renderHouseActivation({
    risingSign: "Aries",
    planet: "None",
    transitSign: "None",
    house: 1,
    eventType: "ingress"
  }),
  null,
  "a workbook row excluded for a missing reusable key must not serve"
);
assert.equal(
  resolver.renderTransitMeaning({ planet: "Sun", transitSign: "Aries", eventType: "retrograde" }),
  null,
  "an uncovered runtime key must render nothing"
);

const lineageOnlyRows = structuredClone(rowsFile);
lineageOnlyRows.transit_meanings[0].Judge = "historical-lineage-can-change-without-changing-authority";
assert.equal(
  createKnowledgeMatrixV9Resolver(manifest, lineageOnlyRows, buildReport)
    .renderTransitMeaning({ planet: "Black Moon Lilith", transitSign: "Any", eventType: "station" })
    ?.governance,
  "owner-approved",
  "Judge must not act as the current authority layer"
);
const unauthorizedRows = structuredClone(rowsFile);
unauthorizedRows.transit_meanings[0].Governance = "generated/unreviewed";
assert.throws(
  () => createKnowledgeMatrixV9Resolver(manifest, unauthorizedRows, buildReport),
  /not authorized by Governance/u
);

const runtimeSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/knowledgeMatrixV9Runtime.ts"),
  "utf8"
);
assert.match(runtimeSource, /\/content\/knowledge-matrix-v9\/\$\{KNOWLEDGE_MATRIX_V9_VERSION\}/u);
assert.doesNotMatch(runtimeSource, /knowledge-matrix-v8|KnowledgeMatrixV8/u);

const fetchCalls = [];
const runtimeFetch = async (input) => {
  const url = String(input);
  fetchCalls.push(url);
  const fileName = url.slice(url.lastIndexOf("/") + 1);
  const filePath = path.join(sourceRoot, fileName);
  return fs.existsSync(filePath)
    ? new Response(sourceBytes(fileName), { status: 200, headers: { "content-type": "application/json" } })
    : new Response("not found", { status: 404 });
};
const loadedRuntime = await loadKnowledgeMatrixV9Runtime(runtimeFetch);
assert.deepEqual(loadedRuntime.counts, resolver.counts);
assert.equal(fetchCalls.length, 3);
assert.equal(fetchCalls.every((url) => url.startsWith(KNOWLEDGE_MATRIX_V9_BASE_PATH)), true);
assert.equal(
  (await renderKnowledgeMatrixV9TransitMeaning({
    planet: "Black Moon Lilith",
    transitSign: "Any",
    eventType: "station"
  }, runtimeFetch))?.body,
  firstLilith.Copy
);
assert.equal(
  await renderKnowledgeMatrixV9HouseActivation({
    risingSign: "Aries",
    planet: "None",
    transitSign: "None",
    house: 1,
    eventType: "ingress"
  }, runtimeFetch),
  null
);

console.log("Knowledge matrix v9 runtime passed: canonical workbook hash exact; 3,485 Governance-authorized rows; Copy/Experience digests exact; 365 transit and 1,017 house-event runtime keys; Judge retained only as lineage; exclusions and uncovered keys fail closed.");
