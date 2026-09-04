#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRelative = "packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-03";
const reviewRoot = path.join(repoRoot, reviewRelative);
const ruling = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-ruling.json"), "utf8"));
const evidence = JSON.parse(fs.readFileSync(path.join(reviewRoot, "owner-batch-authorization.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(reviewRoot, "shipping-manifest.json"), "utf8"));
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const rows = ruling.payloadFiles.flatMap((file) => JSON.parse(fs.readFileSync(path.join(reviewRoot, file), "utf8")).rows);
rows.sort((a, b) => a.contentKey.localeCompare(b.contentKey));
assert.equal(rows.length, 132, "expected exactly 132 approved release rows");
assert.equal(new Set(rows.map((row) => row.contentKey)).size, 132, "approved keys must be unique");
assert.equal(evidence.memberCount, 132, "evidence member count drifted");
assert.equal(evidence.members.length, 132, "evidence member list drifted");
assert.equal(manifest.rowCount, 132, "shipping manifest row count drifted");
assert.equal(evidence.ownerStatement, "can you approve the one's already done and make them live?", "owner statement drifted");
assert.deepEqual(evidence.capabilities, ["batch_generation", "serving"], "serving capabilities drifted");

const canonical = rows.map((row) => `${row.contentKey}:${row.bodySha256}`).join("\n");
assert.equal(sha256(canonical), ruling.memberSetSha256, "member-set hash drifted");
assert.equal(evidence.memberSetSha256, ruling.memberSetSha256, "evidence member-set hash drifted");

const evidenceByKey = new Map(evidence.members.map((member) => [member.contentKey, member.payloadSha256]));
const manifestByKey = new Map(manifest.rows.map((row) => [row.contentKey, row]));
const expectedChangedTransitFiles = [];
for (const row of rows) {
  assert.equal(sha256(row.body), row.bodySha256, `${row.contentKey}: body hash mismatch`);
  assert.equal(evidenceByKey.get(row.contentKey), row.bodySha256, `${row.contentKey}: evidence hash mismatch`);
  assert.ok(manifestByKey.has(row.contentKey), `${row.contentKey}: absent from shipping manifest`);
  assert.ok(row.body.startsWith(row.summary), `${row.contentKey}: summary is not the opening sentence`);

  const parts = row.contentKey.split(".");
  assert.equal(parts.length, 5, `${row.contentKey}: malformed key`);
  const id = parts.slice(2).join("-");
  const transitPath = path.join(transitRoot, `${id}.json`);
  const transit = JSON.parse(fs.readFileSync(transitPath, "utf8"));
  assert.equal(`sky.aspect.${transit.transiting}.${transit.aspect}.${transit.other}`, row.contentKey, `${row.contentKey}: transit identity mismatch`);
  assert.equal(transit.status, "LIVE", `${row.contentKey}: transit is not LIVE`);
  assert.equal(transit.readerCopy.summary, row.summary, `${row.contentKey}: serving summary drifted`);
  assert.equal(transit.readerCopy.body, row.body, `${row.contentKey}: serving body drifted`);
  assert.equal(
    transit.readerCopy.approvedVia,
    `bounded owner-approved exact Calendar batch ${ruling.batchId}; ${ruling.evidenceRecordPath}`,
    `${row.contentKey}: approvedVia drifted`,
  );
  expectedChangedTransitFiles.push(path.relative(repoRoot, transitPath));
}

const changedTransitFiles = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "packages/astro-knowledge/data/transits"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim().split("\n").filter(Boolean).sort();
assert.deepEqual(changedTransitFiles, expectedChangedTransitFiles.sort(), "release changed transit files outside the 132-member owner-approved batch");

const protectedExpected = new Map([
  ["sun-opposition-moon.json", "Leadership may call a change necessary while the people living with it are losing pay, childcare, transportation, or the routine that made the old plan workable. The opposition between the Sun and Moon can put the official decision directly across from its human cost, making it difficult to keep one version of the story in charge. A budget can explain why the policy changed without answering who is expected to absorb the disruption. Put that cost into the decision before calling the plan complete. If the same people are always asked to adjust, the compromise is not evenly shared."],
  ["saturn-opposition-pluto.json", "The official responsible for enforcing the rules faces the person or institution powerful enough to operate around them. Saturn opposite Pluto can expose the difference between formal authority and actual leverage, especially when money, access, or private consequences make enforcement risky. A rule that only applies to people without power is not much of a rule. Put the exemption on the record. The confrontation matters if it produces a limit that applies to the office or institution, not only to the person easiest to punish."],
]);
for (const [file, body] of protectedExpected) {
  const transit = JSON.parse(fs.readFileSync(path.join(transitRoot, file), "utf8"));
  assert.equal(transit.readerCopy.body, body, `${file}: protected benchmark drifted`);
}

console.log("Exact Calendar release verified: 132 approved rows changed, 2 protected benchmarks untouched.");
