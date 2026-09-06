#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const batchId = "sky-calendar-exact-approved-2026-09-05-north-node-48";
const reviewRelative = `packages/astro-knowledge/review/${batchId}`;
const reviewRoot = path.join(repoRoot, reviewRelative);
const previousPath = path.join(repoRoot, "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-held-trines-33/current-owner-payloads.json");
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

assert.equal(rows.length, 48);
assert.equal(new Set(rows.map((row) => row.contentKey)).size, 48);
assert.equal(evidence.memberCount, 48);
assert.equal(manifest.rowCount, 48);
assert.equal(ruling.decision, "approve");
assert.equal(evidence.ownerStatement, "yes please continue");
assert.deepEqual(evidence.capabilities, ["batch_generation", "serving"]);
assert.equal(sha256(rows.map((row) => `${row.contentKey}:${row.bodySha256}`).join("\n")), ruling.memberSetSha256);
assert.equal(evidence.memberSetSha256, ruling.memberSetSha256);

assert.equal(previous.rowCount, 248);
assert.equal(Object.keys(previous.payloads).length, 248);
assert.equal(overlay.previousRowCount, 248);
assert.equal(overlay.overlayRowCount, 48);
assert.equal(overlay.combinedRowCount, 296);
assert.equal(Object.keys(overlay.payloads).length, 48);

const previousKeys = new Set(Object.keys(previous.payloads));
const overlayKeys = new Set(Object.keys(overlay.payloads));
for (const key of overlayKeys) assert.equal(previousKeys.has(key), false, `${key}: release collides with prior exact-approved corpus`);
assert.equal(new Set([...previousKeys, ...overlayKeys]).size, 296);

const counts = { conjunction: 0, sextile: 0, square: 0, opposition: 0 };
for (const row of rows) {
  assert.equal(row.contentKey.endsWith(".north-node"), true, `${row.contentKey}: non-North Node row`);
  assert.equal(row.contentKey.includes("south-node"), false, `${row.contentKey}: South Node escaped release`);
  assert.equal(row.contentKey.includes(".trine."), false, `${row.contentKey}: trine escaped release`);
  assert.equal(row.contentKey.includes(".quincunx."), false, `${row.contentKey}: quincunx escaped release`);
  assert.equal(sha256(row.body), row.bodySha256, `${row.contentKey}: owner body hash mismatch`);
  assert.equal(row.body.startsWith(row.summary), true, `${row.contentKey}: summary/body mismatch`);
  const [, , transiting, aspect, other] = row.contentKey.split(".");
  counts[aspect] += 1;
  const id = `${transiting}-${aspect}-${other}`;
  const transit = JSON.parse(fs.readFileSync(path.join(transitRoot, `${id}.json`), "utf8"));
  assert.equal(transit.status, "LIVE", `${row.contentKey}: transit not live`);
  assert.equal(transit.transiting, transiting);
  assert.equal(transit.aspect, aspect);
  assert.equal(transit.other, "north-node");
  assert.equal(transit.readerCopy.summary, row.summary, `${row.contentKey}: summary drift`);
  assert.equal(transit.readerCopy.body, row.body, `${row.contentKey}: body drift`);
  assert.equal(
    transit.readerCopy.approvedVia,
    `bounded owner-approved exact Calendar batch ${batchId}; ${reviewRelative}/owner-batch-authorization.json`,
    `${row.contentKey}: approval provenance drift`,
  );
  const legacy = row.contentKey.replace(/^sky\.aspect\./u, "sky.");
  assert.deepEqual(overlay.payloads[legacy]?.payload, { summary: row.summary, body: row.body }, `${row.contentKey}: overlay drift`);
}
assert.deepEqual(counts, { conjunction: 12, sextile: 12, square: 12, opposition: 12 });

const trinePlanets = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","chiron","lilith"];
for (const planet of trinePlanets) {
  const legacy = `sky.${planet}.trine.north-node`;
  const expected = previous.payloads[legacy];
  assert.ok(expected, `${legacy}: prior approved North Node trine missing`);
  const transit = JSON.parse(fs.readFileSync(path.join(transitRoot, `${planet}-trine-north-node.json`), "utf8"));
  assert.deepEqual({ summary: transit.readerCopy.summary, body: transit.readerCopy.body }, expected.payload, `${legacy}: prior trine drifted`);
}

const protectedExpected = new Map([
  ["sun-opposition-moon.json", "Leadership may call a change necessary while the people living with it are losing pay, childcare, transportation, or the routine that made the old plan workable. The opposition between the Sun and Moon can put the official decision directly across from its human cost, making it difficult to keep one version of the story in charge. A budget can explain why the policy changed without answering who is expected to absorb the disruption. Put that cost into the decision before calling the plan complete. If the same people are always asked to adjust, the compromise is not evenly shared."],
  ["saturn-opposition-pluto.json", "The official responsible for enforcing the rules faces the person or institution powerful enough to operate around them. Saturn opposite Pluto can expose the difference between formal authority and actual leverage, especially when money, access, or private consequences make enforcement risky. A rule that only applies to people without power is not much of a rule. Put the exemption on the record. The confrontation matters if it produces a limit that applies to the office or institution, not only to the person easiest to punish."],
]);
for (const [file, body] of protectedExpected) {
  const transit = JSON.parse(fs.readFileSync(path.join(transitRoot, file), "utf8"));
  assert.equal(transit.readerCopy.body, body, `${file}: protected benchmark drifted`);
}

const materializedPath = path.join(reviewRoot, "current-owner-payloads.json");
if (fs.existsSync(materializedPath)) {
  const current = JSON.parse(fs.readFileSync(materializedPath, "utf8"));
  assert.equal(current.rowCount, 296);
  assert.equal(Object.keys(current.payloads).length, 296);
  for (const [key, entry] of Object.entries(previous.payloads)) assert.deepEqual(current.payloads[key], entry, `${key}: prior payload drifted`);
  for (const [key, entry] of Object.entries(overlay.payloads)) assert.deepEqual(current.payloads[key], entry, `${key}: overlay payload drifted`);
}

console.log("North Node 48 exact Calendar release verified.", {
  releasedRows: 48,
  previousRowsPreserved: 248,
  combinedExactRows: 296,
  trinesPreserved: 12,
  protectedBenchmarks: 2,
});
