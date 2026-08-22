#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ownerRejectedExactTexts,
  withoutOwnerRejectedEvidence
} from "../src/astro-writing/ownerEvidenceRejections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const readJsonl = (relativePath) => read(relativePath).trim().split("\n").filter(Boolean).map(JSON.parse);

const corrections = readJsonl("data/writing/owner-corrections.jsonl");
const rejectedTexts = ownerRejectedExactTexts(corrections);
const rejectedVenusHouseFive = corrections.find((entry) => (
  entry.content_key === "house-horoscope-core/venus/libra/house-5"
  && entry.positive_evidence_revoked === true
));

assert.ok(rejectedVenusHouseFive, "The exact owner rejection for Venus in Libra house 5 must remain recorded.");
assert.ok(rejectedTexts.has(rejectedVenusHouseFive.bad), "The rejected passage must enter the exact-text exclusion set.");
assert.deepEqual(
  withoutOwnerRejectedEvidence([
    { text: "Keep this owner passage." },
    { text: rejectedVenusHouseFive.bad }
  ], corrections),
  [{ text: "Keep this owner passage." }],
  "Positive evidence filtering must remove only the exact rejected passage."
);

for (const relativePath of [
  "data/writing/OWNER_APPROVED_EXAMPLES.jsonl",
  "packages/astro-knowledge/review/writing-pipeline-v3/shared-evidence-index-v1.json",
  "data/writing/collocations/approved-collocations-v1.json"
]) {
  assert.ok(
    !read(relativePath).includes(rejectedVenusHouseFive.bad),
    `${relativePath} must not preserve owner-rejected text as positive evidence.`
  );
}

const sourceRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/venus-libra-house-cores-v1.json");
const rejectedSourceRow = sourceRows.rows.find((row) => row.contentKey === rejectedVenusHouseFive.content_key);
assert.equal(rejectedSourceRow?.review_status, "needs_review", "The rejected source row must fail closed.");

console.log("Owner evidence rejection tests passed.");
