#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  chooseKnowledgeMatrixCandidate,
  createKnowledgeMatrixV8Resolver
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  KNOWLEDGE_MATRIX_V8_BASE_PATH,
  loadKnowledgeMatrixV8Runtime,
  renderKnowledgeMatrixV8HouseActivation,
  renderKnowledgeMatrixV8TransitMeaning
} from "../apps/web/src/content/knowledgeMatrixV8Runtime.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(
  repoRoot,
  "apps/web/public/content/knowledge-matrix-v8/v8-owner-approved-locked"
);

const expectedHashes = {
  "house-activations-v8-owner-approved-locked.json": "f25074ea1f6eba38c2d12a3216f124b4d573c175bb374be28ea6ee3c69b2117f",
  "knowledge-matrix-v8-import-manifest.json": "e13cef6d29112970a127dd89774ce81643e5e8b8e7f4b8be26f80790febf2895",
  "knowledge-matrix-v8-owner-approved-build-report.json": "1ba70bfa44997d1462a6d65994c161329347729c31f5c42c3a5ffb16bd6d393b",
  "transit-meanings-v8-owner-approved-locked.json": "1e918369505d41d2cf74d6e76a59704aa0550e8fc55d22b65b99b53a8f55a1a3"
};

function sourceBytes(fileName) {
  return fs.readFileSync(path.join(sourceRoot, fileName));
}

function readJson(fileName) {
  return JSON.parse(sourceBytes(fileName).toString("utf8"));
}

for (const [fileName, expectedHash] of Object.entries(expectedHashes)) {
  const actualHash = crypto.createHash("sha256").update(sourceBytes(fileName)).digest("hex");
  assert.equal(actualHash, expectedHash, `${fileName} must remain byte-identical to the owner package`);
}

const manifest = readJson("knowledge-matrix-v8-import-manifest.json");
const buildReport = readJson("knowledge-matrix-v8-owner-approved-build-report.json");
const transitFile = readJson("transit-meanings-v8-owner-approved-locked.json");
const houseFile = readJson("house-activations-v8-owner-approved-locked.json");
const resolver = createKnowledgeMatrixV8Resolver(manifest, transitFile, houseFile, buildReport);

assert.deepEqual(resolver.counts, {
  transitPrimaryKeys: 318,
  housePrimaryKeys: 936,
  houseEventEntries: 993
});

const locked = resolver.renderTransitMeaning({
  planet: "Chiron",
  transitSign: "Aquarius",
  eventType: "ingress"
});
assert.equal(locked?.judge, "owner-approved-v8-locked");
assert.equal(locked?.body, transitFile.entries["Chiron|Aquarius|ingress"].copy);

const legacyApproved = resolver.renderTransitMeaning({
  planet: "Black Moon Lilith",
  transitSign: "Any",
  eventType: "station"
});
assert.equal(legacyApproved?.judge, "rewritten-owner-voice-audited-v5");
assert.equal(legacyApproved?.body, transitFile.entries["Black Moon Lilith|Any|station"].copy);

assert.equal(
  chooseKnowledgeMatrixCandidate([
    { judge: "rewritten-owner-voice-audited-v5", copy: "v5 candidate" },
    { judge: "owner-approved-v8-locked", copy: "locked candidate" }
  ])?.copy,
  "locked candidate",
  "owner-approved-v8-locked must win a normalized-key collision"
);

const nestedHouse = resolver.renderHouseActivation({
  risingSign: "Aquarius",
  planet: "Chiron",
  transitSign: "Aries",
  house: 3,
  eventType: "ingress"
});
assert.equal(
  nestedHouse?.body,
  houseFile.entries["Aquarius|Chiron|Aries|3"].events.ingress.copy
);
assert.equal(
  resolver.renderHouseActivation({
    risingSign: "Aquarius",
    planet: "Chiron",
    transitSign: "Aries",
    house: 3,
    eventType: "station"
  }),
  null,
  "house events must remain nested and may not borrow another event's copy"
);

assert.equal(
  resolver.renderHouseActivation({
    risingSign: "Cancer",
    planet: "Mercury",
    transitSign: "None",
    house: 0,
    eventType: "direct"
  }),
  null,
  "the workbook row excluded for a missing reusable key must not serve"
);
assert.equal(
  resolver.renderTransitMeaning({
    planet: "Sun",
    transitSign: "Aries",
    eventType: "retrograde"
  }),
  null,
  "an uncovered runtime key must render nothing"
);

const allCopy = [
  ...Object.values(transitFile.entries).map((entry) => entry.copy),
  ...Object.values(houseFile.entries).flatMap((entry) => (
    Object.values(entry.events).map((event) => event.copy)
  ))
];
assert.equal(allCopy.length, 1311);
assert.equal(allCopy.some((copy) => copy.startsWith("[EXCLUDE FROM FALLBACK]")), false);
assert.equal(allCopy.some((copy) => copy.includes("—")), false);
assert.equal(allCopy.some((copy) => /\bwhether\b/iu.test(copy)), false);
for (const phrase of ["profound", "medicine", "inner weather", "landscape", "tapestry"]) {
  assert.equal(allCopy.some((copy) => copy.toLowerCase().includes(phrase)), false, phrase);
}

const runtimeSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/knowledgeMatrixV8Runtime.ts"),
  "utf8"
);
assert.match(runtimeSource, /\/content\/knowledge-matrix-v8\/\$\{KNOWLEDGE_MATRIX_V8_VERSION\}/u);
assert.match(runtimeSource, /renderKnowledgeMatrixV8TransitMeaning/u);
assert.match(runtimeSource, /renderKnowledgeMatrixV8HouseActivation/u);

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
const loadedRuntime = await loadKnowledgeMatrixV8Runtime(runtimeFetch);
assert.deepEqual(loadedRuntime.counts, resolver.counts);
assert.equal(fetchCalls.length, 4);
assert.equal(fetchCalls.every((url) => url.startsWith(KNOWLEDGE_MATRIX_V8_BASE_PATH)), true);
assert.equal(
  (await renderKnowledgeMatrixV8TransitMeaning({
    planet: "Black Moon Lilith",
    transitSign: "Any",
    eventType: "station"
  }, runtimeFetch))?.body,
  legacyApproved.body
);
assert.equal(
  await renderKnowledgeMatrixV8HouseActivation({
    risingSign: "Aquarius",
    planet: "Chiron",
    transitSign: "Aries",
    house: 3,
    eventType: "station"
  }, runtimeFetch),
  null
);

console.log("Knowledge matrix v8 runtime passed: 318 transit keys, 936 house keys, 993 nested event entries, exact package bytes, both owner tiers serving, exclusions and uncovered keys fail closed.");
