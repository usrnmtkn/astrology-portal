#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "apps/web/dist");
const manifest = JSON.parse(readFileSync(path.join(dist, ".vite/manifest.json"), "utf8"));
const deliveredByChunk = new Map();
async function deliveredValues(name) {
  if (!deliveredByChunk.has(name)) {
    const entry = Object.values(manifest).find(item => item.name === name);
    assert.ok(entry, `Build the web app before verifying ${name}.`);
    deliveredByChunk.set(name, Object.values(await import(pathToFileURL(path.join(dist, entry.file)).href)));
  }
  return deliveredByChunk.get(name);
}

const sources = [
  ["initial-sky-core-transport-v1.json", "fallback-content-sky-core"],
  ["deferred-base-reader-support-v1.json", "fallback-content-base-support"],
  ["deferred-reader-support-transport-v1.json", "fallback-content-reader-support"],
  ["bundled-sky-authored-cards-v3.json", "fallback-content-base-support"],
  ["authored-inputs/owner-authored-sky-placement-house-passages-v1.json", "fallback-content-sky-placement"],
  ["bundled-sky-placement-manifest-v3.json", "fallback-content-sky-placement-manifest"]
];
for (const [source, chunk] of sources) {
  const delivered = await deliveredValues(chunk);
  const expected = JSON.parse(readFileSync(path.join(root, "apps/web/src/content/fallbackArchitectureV3", source), "utf8"));
  // The protected passage import serves rows; its source-only policy/version
  // metadata is not part of the reader payload. Every row field must survive.
  // Vite removes the initial transport's unused build-provenance property.
  // The generator gate checks that hash; compare every complete reader row here.
  const select = source.startsWith("authored-inputs/") ? value => value?.rows
    : source === "initial-sky-core-transport-v1.json" ? value => value && Object.fromEntries(["authoredCards", "hookRows", "vocabularyRows", "templates"].map(field => [field, value[field]]))
    : source === "bundled-sky-authored-cards-v3.json" ? value => value && ({ authoredCards: value.authoredCards })
    : value => value;
  assert.ok(delivered.some(value => isDeepStrictEqual(select(value), select(expected))),
    `The shipped ${source} content must exactly match its complete source values.`);
}

// The original initial-reader source is now partitioned by consumer. Import
// the actual shipped partitions and compare every complete source row, including
// the named authored-card export that Vite shares with the initial runtime.
const reader = JSON.parse(readFileSync(path.join(root, "apps/web/src/content/fallbackArchitectureV3/bundled-initial-reader-rows-v3.json"), "utf8"));
const partitions = (await Promise.all(["fallback-content-sky-core", "fallback-content-base-support", "fallback-content-reader-support"].map(deliveredValues))).flat();
for (const [field, rows] of Object.entries(reader)) {
  const delivered = partitions.flatMap(value => Array.isArray(value) && field === "authoredCards" ? value : value?.[field] ?? []);
  for (const row of rows) assert.ok(delivered.some(value => isDeepStrictEqual(value, row)),
    `The shipped initial-reader ${field}/${row.contentKey} must preserve its complete source value.`);
}

console.log(`PASS: ${sources.length + 1} initial/deferred content sources match their shipped values, including every protected passage row.`);
