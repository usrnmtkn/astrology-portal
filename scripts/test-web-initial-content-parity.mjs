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
  ["bundled-sky-core-rows-v3.json", "fallback-content-sky-core"],
  ["bundled-sky-authored-cards-v3.json", "fallback-content-sky-core"],
  ["bundled-initial-reader-rows-v3.json", "fallback-content-sky-core"],
  ["authored-inputs/owner-authored-sky-placement-house-passages-v1.json", "fallback-content-sky-placement"],
  ["bundled-sky-placement-manifest-v3.json", "fallback-content-sky-placement-manifest"]
];
for (const [source, chunk] of sources) {
  const delivered = await deliveredValues(chunk);
  const expected = JSON.parse(readFileSync(path.join(root, "apps/web/src/content/fallbackArchitectureV3", source), "utf8"));
  // The protected passage import serves rows; its source-only policy/version
  // metadata is not part of the reader payload. Every row field must survive.
  const select = source.startsWith("authored-inputs/") ? value => value?.rows : value => value;
  assert.ok(delivered.some(value => isDeepStrictEqual(select(value), select(expected))),
    `The shipped ${source} content must exactly match its complete source values.`);
}

console.log(`PASS: ${sources.length} initial/deferred content sources match their shipped values, including every protected passage row.`);
