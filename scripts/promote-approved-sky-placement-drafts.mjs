#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const draftDirectory = path.resolve(process.argv[2] ?? "");
const canonicalRowsPath = path.resolve(process.argv[3] ?? "");
const sourceRowsPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
);
const expectedDraftCount = 149;
const expectedSlots = ["tagline", "hook", "lived", "turn", "moves"];
const approvalLabel = "owner approval in Codex, 2026-07-27";

assert.ok(
  process.argv[2] && process.argv[3],
  "Usage: node scripts/promote-approved-sky-placement-drafts.mjs <draft-directory> <canonical-source-rows.json>"
);
assert.ok(fs.statSync(draftDirectory).isDirectory(), `Draft directory does not exist: ${draftDirectory}`);
assert.ok(fs.statSync(canonicalRowsPath).isFile(), `Canonical source rows do not exist: ${canonicalRowsPath}`);

const draftFiles = fs.readdirSync(draftDirectory)
  .filter((fileName) => fileName.endsWith(".json"))
  .filter((fileName) => fileName !== "_summary.json")
  .filter((fileName) => !fileName.startsWith("lilith-"))
  .sort();

assert.equal(
  draftFiles.length,
  expectedDraftCount,
  `Expected ${expectedDraftCount} approved non-Lilith drafts, found ${draftFiles.length}`
);

const promotedRows = [];

for (const fileName of draftFiles) {
  const draft = JSON.parse(fs.readFileSync(path.join(draftDirectory, fileName), "utf8"));
  const pair = fileName.replace(/\.json$/u, "");
  const expectedPrefix = "fallback-hook/sky-placement-";

  assert.equal(draft.status, "clean", `${pair}: draft status must be clean`);
  assert.equal(draft.gate, "auto-publish", `${pair}: draft gate must be auto-publish`);
  assert.equal(draft.lint?.score, 3, `${pair}: lint score must be 3`);
  assert.equal(draft.lint?.fails, 0, `${pair}: lint must have no failures`);
  assert.equal(draft.judge?.score, 3, `${pair}: judge score must be 3`);
  assert.equal(draft.judge?.gate, "auto-publish", `${pair}: judge gate must be auto-publish`);
  assert.equal(draft.rows?.length, expectedSlots.length, `${pair}: expected five placement rows`);

  const actualSlots = draft.rows.map((row) => (
    row.contentKey.slice(expectedPrefix.length).split("/")[0]
  ));
  assert.deepEqual(actualSlots, expectedSlots, `${pair}: placement slots are incomplete or out of order`);

  for (const row of draft.rows) {
    assert.ok(row.contentKey.startsWith(expectedPrefix), `${pair}: unexpected content key ${row.contentKey}`);
    assert.equal(row.review_status, "needs_review", `${row.contentKey}: draft must still be unapproved`);
    assert.ok(row.body_you?.trim(), `${row.contentKey}: reader copy is empty`);
    assert.equal(row.body_you, row.body_they, `${row.contentKey}: collective copy must match in both voice fields`);

    promotedRows.push({
      ...row,
      review_status: "approved",
      notes: row.notes
        .replace(" (unwired)", "")
        .replace(" once approved.", " after owner approval."),
      approved_via: approvalLabel
    });
  }
}

assert.equal(
  promotedRows.length,
  expectedDraftCount * expectedSlots.length,
  "Approved row total does not match the expected 149 x 5 matrix"
);

const promotedKeys = promotedRows.map((row) => row.contentKey);
assert.equal(new Set(promotedKeys).size, promotedKeys.length, "Approved drafts contain duplicate content keys");

const canonicalSourceRows = JSON.parse(fs.readFileSync(canonicalRowsPath, "utf8"));
const canonicalRows = canonicalSourceRows.hookRows.filter((row) =>
  /^fallback-hook\/sky-placement-(?:hook|lived|turn)\/(?:sun\/leo|moon\/capricorn|mercury\/cancer|venus\/virgo|moon\/scorpio|chiron\/aries|pluto\/aquarius)$/u.test(row.contentKey)
);
assert.equal(canonicalRows.length, 21, "Expected the seven canonical placement trios");
for (const row of canonicalRows) {
  assert.equal(row.review_status, "approved", `${row.contentKey}: canonical row must already be approved`);
}

const allApprovedRows = [...canonicalRows, ...promotedRows];
const sourceRows = JSON.parse(fs.readFileSync(sourceRowsPath, "utf8"));
const initialHookRowCount = sourceRows.hookRows.length;
const existingRows = new Map(sourceRows.hookRows.map((row) => [row.contentKey, row]));
let rowsAdded = 0;
for (const row of allApprovedRows) {
  if (existingRows.has(row.contentKey)) {
    assert.deepEqual(existingRows.get(row.contentKey), row, `${row.contentKey}: existing promoted row differs`);
  } else {
    sourceRows.hookRows.push(row);
    rowsAdded += 1;
  }
}
fs.writeFileSync(sourceRowsPath, `${JSON.stringify(sourceRows, null, 1)}\n`);

console.log(JSON.stringify({
  approval: approvalLabel,
  canonicalRowsImported: canonicalRows.length,
  draftsPromoted: draftFiles.length,
  rowsPromoted: promotedRows.length,
  rowsAdded,
  existingRowsPreserved: initialHookRowCount,
  totalHookRows: sourceRows.hookRows.length
}, null, 2));
