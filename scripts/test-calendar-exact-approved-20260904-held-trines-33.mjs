#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const batchId = "sky-calendar-exact-approved-2026-09-04-held-trines-33";
const reviewRelative = `packages/astro-knowledge/review/${batchId}`;
const reviewRoot = path.join(repoRoot, reviewRelative);
const ruling = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-ruling.json"), "utf8"));
const evidence = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-batch-authorization.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(reviewRoot, "shipping-manifest.json"), "utf8"));
const current = JSON.parse(fs.readFileSync(path.join(reviewRoot, "current-owner-payloads.json"), "utf8"));
const previous = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-batch-51/current-owner-payloads.json"), "utf8"));
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const rows = ruling.payloadFiles
  .flatMap((file) => JSON.parse(fs.readFileSync(path.join(reviewRoot, file), "utf8")).rows)
  .sort((a, b) => a.contentKey.localeCompare(b.contentKey));

assert.equal(rows.length, 33);
assert.equal(new Set(rows.map((row) => row.contentKey)).size, 33);
assert.equal(evidence.memberCount, 33);
assert.equal(manifest.rowCount, 33);
assert.equal(ruling.decision, "approve");
assert.ok(evidence.ownerStatement.includes("perfect, approved"));
assert.ok(evidence.ownerStatement.includes("making these live"));
assert.deepEqual(evidence.capabilities, ["batch_generation", "serving"]);
assert.equal(sha256(rows.map((row) => `${row.contentKey}:${row.bodySha256}`).join("\n")), ruling.memberSetSha256);
assert.equal(evidence.memberSetSha256, ruling.memberSetSha256);

const batchLegacyKeys = new Set();
let northNodeRows = 0;
for (const row of rows) {
  assert.equal(sha256(row.body), row.bodySha256, `${row.contentKey}: hash mismatch`);
  assert.ok(row.contentKey.includes(".trine."), `${row.contentKey}: non-trine escaped batch`);
  const parts = row.contentKey.split(".");
  const id = parts.slice(2).join("-");
  const transit = JSON.parse(fs.readFileSync(path.join(transitRoot, `${id}.json`), "utf8"));
  assert.equal(transit.status, "LIVE", `${row.contentKey}: transit not live`);
  assert.equal(transit.readerCopy.summary, row.summary, `${row.contentKey}: summary drift`);
  assert.equal(transit.readerCopy.body, row.body, `${row.contentKey}: body drift`);
  assert.equal(
    transit.readerCopy.approvedVia,
    `bounded owner-approved exact Calendar batch ${ruling.batchId}; ${ruling.evidenceRecordPath}`,
    `${row.contentKey}: approval provenance drift`,
  );
  if (row.contentKey.includes("north-node")) {
    northNodeRows += 1;
    assert.ok(transit.transiting === "north-node" || transit.other === "north-node", `${row.contentKey}: North Node runtime key drifted`);
    assert.equal(row.contentKey.includes(".nodes"), false, `${row.contentKey}: source-only nodes key leaked into runtime`);
  }
  const legacyKey = row.contentKey.replace(/^sky\.aspect\./u, "sky.");
  batchLegacyKeys.add(legacyKey);
  assert.equal(current.payloads[legacyKey]?.payload?.body, row.body, `${row.contentKey}: current projection drift`);
}
assert.equal(northNodeRows, 12, "Expected 12 North Node trines in this release.");

assert.equal(current.rowCount, 248);
assert.equal(Object.keys(current.payloads).length, 248);
for (const [key, value] of Object.entries(previous.payloads)) {
  assert.deepEqual(current.payloads[key], value, `${key}: prior approved payload drifted`);
}
for (const key of batchLegacyKeys) {
  assert.equal(Object.hasOwn(previous.payloads, key), false, `${key}: batch collided with prior approved corpus`);
}

const sunLilith = JSON.parse(fs.readFileSync(path.join(transitRoot, "sun-trine-lilith.json"), "utf8"));
assert.equal(
  sunLilith.readerCopy.body,
  rows.find((row) => row.contentKey === "sky.aspect.sun.trine.lilith")?.body,
  "Sun trine Lilith did not receive the owner-approved passage",
);

const sunNode = JSON.parse(fs.readFileSync(path.join(transitRoot, "sun-trine-north-node.json"), "utf8"));
assert.equal(
  sunNode.readerCopy.body,
  rows.find((row) => row.contentKey === "sky.aspect.sun.trine.north-node")?.body,
  "Sun trine North Node did not receive the owner-approved passage",
);

const protectedExpected = new Map([
  ["sun-opposition-moon.json", "Leadership may call a change necessary while the people living with it are losing pay, childcare, transportation, or the routine that made the old plan workable. The opposition between the Sun and Moon can put the official decision directly across from its human cost, making it difficult to keep one version of the story in charge. A budget can explain why the policy changed without answering who is expected to absorb the disruption. Put that cost into the decision before calling the plan complete. If the same people are always asked to adjust, the compromise is not evenly shared."],
  ["saturn-opposition-pluto.json", "The official responsible for enforcing the rules faces the person or institution powerful enough to operate around them. Saturn opposite Pluto can expose the difference between formal authority and actual leverage, especially when money, access, or private consequences make enforcement risky. A rule that only applies to people without power is not much of a rule. Put the exemption on the record. The confrontation matters if it produces a limit that applies to the office or institution, not only to the person easiest to punish."],
]);
for (const [file, body] of protectedExpected) {
  const transit = JSON.parse(fs.readFileSync(path.join(transitRoot, file), "utf8"));
  assert.equal(transit.readerCopy.body, body, `${file}: protected benchmark drifted`);
}

console.log("Exact Calendar held-trine release verified.", {
  releasedRows: 33,
  previousRowsPreserved: 215,
  currentExactRows: 248,
  northNodeRows,
  protectedBenchmarks: 2,
});
