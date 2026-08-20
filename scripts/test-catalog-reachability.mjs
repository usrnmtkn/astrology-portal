#!/usr/bin/env node
/**
 * Every indexed object must be readable by the resolver.
 *
 * An object can pass the surface-permission gate and still yield nothing,
 * because the resolver only extracts prose from field names it knows. The V9
 * matrix stored its text in `Experience`, which was not in TEXT_FIELDS, so all
 * 162 objects sourced only from that store resolved to an empty packet. Nothing
 * failed. The content was simply invisible.
 *
 * That is the same shape as the bug that put 2,368 owner-approved rows outside
 * the index in the first place: real content, no error, no way to notice. This
 * test makes it noticeable.
 *
 * Usage: node scripts/test-catalog-reachability.mjs [--report]
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resolver = require(path.join(root, "packages/astro-knowledge/scripts/knowledge-resolver.js"));
const index = JSON.parse(fs.readFileSync(path.join(root, "packages/astro-knowledge/generated/knowledge-index.json"), "utf8"));
const reportOnly = process.argv.includes("--report");

// Stores that are deliberately never prompt evidence. Excluding them here is a
// statement of intent, not a convenience: `serving` rows are writer output, and
// negative examples exist to be avoided.
const NOT_EVIDENCE = new Set(["serving"]);

const SURFACES = ["friends-transit", "friends-synastry", "you-transit", "you-natal", "sky"];

/**
 * Ask each object only about the surfaces its own records claim, rather than
 * trying every combination. `resolve` is used instead of `buildPacket` because
 * it does the same permission filtering and field extraction without the
 * hashing and assertion work, which matters at catalog scale.
 */
function readableAnywhere(object) {
  const declared = new Set();
  for (const source of object.sources ?? []) {
    for (const permission of source.surfacePermission ?? []) {
      const [surface] = permission.split(":");
      if (surface === "doctrine-only") SURFACES.forEach((s) => declared.add(s));
      else declared.add(surface);
    }
  }
  for (const surface of declared.size ? declared : SURFACES) {
    for (const usage of ["primary", "mechanism-reference"]) {
      try {
        if (resolver.resolve(object.id, { surface, usage }).records.length > 0) return { surface, usage };
      } catch { /* try the next */ }
    }
  }
  return null;
}

const candidates = index.objects.filter((object) => (object.sources ?? []).length > 0
  && object.sources.every((source) => !NOT_EVIDENCE.has(source.store)));

const unreadable = [];
for (const object of candidates) {
  if (!readableAnywhere(object)) unreadable.push(object);
}

const byNamespace = {};
for (const object of unreadable) {
  const namespace = object.id.split("/")[0];
  (byNamespace[namespace] ??= []).push(object.id);
}
const byStore = {};
for (const object of unreadable) {
  for (const store of new Set(object.sources.map((source) => source.store))) {
    byStore[store] = (byStore[store] ?? 0) + 1;
  }
}

console.log(`checked ${candidates.length} evidence-bearing objects across ${SURFACES.length} surfaces`);
console.log(`  readable:   ${candidates.length - unreadable.length}`);
console.log(`  UNREADABLE: ${unreadable.length}`);

if (unreadable.length) {
  console.log("\nby namespace:");
  for (const [namespace, ids] of Object.entries(byNamespace).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(ids.length).padStart(5)}  ${namespace}   e.g. ${ids[0]}`);
  }
  console.log("\nby store:");
  for (const [store, count] of Object.entries(byStore).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${store}`);
  }
  console.log("\nUsually this means the source rows keep their prose in a field name");
  console.log("the resolver does not read. Check TEXT_FIELDS in knowledge-resolver.js");
  console.log("against the actual column names in the store.");
}

// Not every object should be readable. `reference/ac/*` is a citation index
// with no prose by design, and `license/*` holds constraints rather than copy.
// Forcing the count to zero would mean either inventing prose or excluding
// whole stores by hand — both worse than recording the baseline and failing on
// anything new. Shrink-only, same contract as the drift allowlist.
const baselinePath = path.join(root, "config/catalog-unreadable-baseline.json");
const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, "utf8"))
  : { schemaVersion: 1, entries: [] };
const known = new Set(baseline.entries.map((entry) => entry.id));
const current = unreadable.map((object) => object.id);

if (process.argv.includes("--write-baseline")) {
  const entries = unreadable
    .map((object) => ({ id: object.id, stores: [...new Set(object.sources.map((s) => s.store))].sort() }))
    .sort((a, b) => a.id.localeCompare(b.id));
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, `${JSON.stringify({
    schemaVersion: 1,
    note: "Objects that yield no readable prose. Some are correct (citation "
      + "indexes, licences); some are defects waiting to be found. Shrink-only: "
      + "an object that becomes readable must be removed, and a newly unreadable "
      + "object fails the build.",
    generatedBy: "scripts/test-catalog-reachability.mjs --write-baseline",
    count: entries.length,
    entries
  }, null, 2)}\n`);
  console.log(`\nWrote ${entries.length} baseline entries to ${path.relative(root, baselinePath)}`);
  process.exit(0);
}

if (reportOnly) process.exit(0);

const newlyUnreadable = current.filter((id) => !known.has(id));
const nowReadable = [...known].filter((id) => !current.includes(id));

assert.deepEqual(newlyUnreadable, [],
  `These indexed objects yield no readable evidence on any surface. They are in the catalog and invisible to every writer — usually because their prose sits in a field name TEXT_FIELDS does not list.`);
assert.deepEqual(nowReadable, [],
  `These objects are now readable. Remove them from the baseline; it is shrink-only.`);

console.log(`\nReachability holds: ${candidates.length - unreadable.length} readable, ${unreadable.length} at the recorded baseline.`);
