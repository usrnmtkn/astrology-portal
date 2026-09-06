#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const batchId = "sky-calendar-exact-approved-2026-09-06-final-83";
const reviewRelative = `packages/astro-knowledge/review/${batchId}`;
const reviewRoot = path.join(repoRoot, reviewRelative);
const previousPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-05-north-node-48/current-owner-payloads.json",
);
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const ruling = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-ruling.json"), "utf8"));
const evidence = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-batch-authorization.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(reviewRoot, "shipping-manifest.json"), "utf8"));
const overlay = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-payload-overlay.json"), "utf8"));
const previous = JSON.parse(fs.readFileSync(previousPath, "utf8"));
const rows = ruling.payloadFiles
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(reviewRoot, file), "utf8")).rows)
  .sort((a, b) => a.contentKey.localeCompare(b.contentKey));

assert.equal(rows.length, 83);
assert.equal(new Set(rows.map((row) => row.contentKey)).size, 83);
assert.equal(evidence.memberCount, 83);
assert.equal(manifest.rowCount, 83);
assert.equal(ruling.decision, "approve");
assert.equal(
  ruling.memberSetSha256,
  "f8a5b4234e5e2be760fcb4b5e54103e9ab36727aea1f0e90fbe2874cbe607208",
  "release must remain byte-bound to the exact owner-approved 83-row source set",
);
assert.equal(evidence.ownerStatement, "please mark all of this writing as approved for live");
assert.deepEqual(evidence.capabilities, ["batch_generation", "serving"]);
assert.equal(
  sha256(rows.map((row) => `${row.contentKey}:${row.bodySha256}`).join("\n")),
  ruling.memberSetSha256,
);
assert.equal(evidence.memberSetSha256, ruling.memberSetSha256);

assert.equal(previous.rowCount, 296);
assert.equal(Object.keys(previous.payloads).length, 296);
assert.equal(overlay.previousRowCount, 296);
assert.equal(overlay.overlayRowCount, 83);
assert.equal(overlay.combinedRowCount, 379);
assert.equal(Object.keys(overlay.payloads).length, 83);

const previousKeys = new Set(Object.keys(previous.payloads));
const overlayKeys = new Set(Object.keys(overlay.payloads));
for (const key of overlayKeys) {
  assert.equal(previousKeys.has(key), false, `${key}: release collides with prior exact-approved corpus`);
}
assert.equal(new Set([...previousKeys, ...overlayKeys]).size, 379);

const counts = { conjunction: 0, sextile: 0, square: 0, opposition: 0 };
for (const row of rows) {
  assert.equal(row.contentKey.includes("north-node"), false, `${row.contentKey}: North Node escaped final release`);
  assert.equal(row.contentKey.includes("south-node"), false, `${row.contentKey}: South Node escaped final release`);
  assert.equal(row.contentKey.includes(".trine."), false, `${row.contentKey}: trine escaped final release`);
  assert.equal(row.contentKey.includes(".quincunx."), false, `${row.contentKey}: quincunx escaped final release`);
  assert.notEqual(row.contentKey, "sky.aspect.saturn.square.lilith", "already-approved Saturn square Lilith must not be re-released");
  assert.equal(sha256(row.body), row.bodySha256, `${row.contentKey}: owner body hash mismatch`);
  assert.equal(row.body.startsWith(row.summary), true, `${row.contentKey}: summary/body mismatch`);

  const [, , transiting, aspect, other] = row.contentKey.split(".");
  assert.equal(
    transiting === "chiron" || other === "chiron" || transiting === "lilith" || other === "lilith",
    true,
    `${row.contentKey}: outside Chiron/Lilith release scope`,
  );
  counts[aspect] += 1;

  const id = `${transiting}-${aspect}-${other}`;
  const transit = JSON.parse(fs.readFileSync(path.join(transitRoot, `${id}.json`), "utf8"));
  assert.equal(transit.status, "LIVE", `${row.contentKey}: transit not live`);
  assert.equal(transit.transiting, transiting);
  assert.equal(transit.aspect, aspect);
  assert.equal(transit.other, other);
  assert.equal(transit.readerCopy.summary, row.summary, `${row.contentKey}: summary drift`);
  assert.equal(transit.readerCopy.body, row.body, `${row.contentKey}: body drift`);
  assert.equal(
    transit.readerCopy.approvedVia,
    `bounded owner-approved exact Calendar batch ${batchId}; ${reviewRelative}/owner-batch-authorization.json`,
    `${row.contentKey}: approval provenance drift`,
  );

  const legacy = row.contentKey.replace(/^sky\.aspect\./u, "sky.");
  assert.deepEqual(
    overlay.payloads[legacy]?.payload,
    { summary: row.summary, body: row.body },
    `${row.contentKey}: overlay drift`,
  );
}
assert.deepEqual(counts, { conjunction: 21, sextile: 21, square: 20, opposition: 21 });

const protectedPrevious = [
  "sky.sun.opposition.moon",
  "sky.saturn.opposition.pluto",
  "sky.saturn.square.lilith",
];
for (const key of protectedPrevious) {
  assert.ok(previous.payloads[key], `${key}: expected prior protected payload missing`);
}

const materialized = JSON.parse(
  fs.readFileSync(path.join(reviewRoot, "current-owner-payloads.json"), "utf8"),
);
assert.equal(materialized.rowCount, 379);
assert.equal(Object.keys(materialized.payloads).length, 379);
for (const [key, entry] of Object.entries(previous.payloads)) {
  assert.deepEqual(materialized.payloads[key], entry, `${key}: prior payload drifted`);
}
for (const [key, entry] of Object.entries(overlay.payloads)) {
  assert.deepEqual(materialized.payloads[key], entry, `${key}: overlay payload drifted`);
}

console.log("Final 83 exact Calendar release verified.", {
  releasedRows: 83,
  previousRowsPreserved: 296,
  combinedExactRows: 379,
  aspectCounts: counts,
});
