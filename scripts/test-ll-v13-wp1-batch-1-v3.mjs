#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packetPath = path.join(repoRoot, "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-writing-packets-v2.json");
const draftPath = path.join(repoRoot, "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v3-drafts.json");
const v2Path = path.join(repoRoot, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V2.xlsx");
const packets = JSON.parse(fs.readFileSync(packetPath, "utf8"));
const drafts = JSON.parse(fs.readFileSync(draftPath, "utf8"));
const v2Rows = readInlineXlsxSheet(v2Path, "Candidates132");
const v2ByKey = new Map(v2Rows.map((row) => [row.cells["Row key"], row.cells]));
const draftByKey = new Map(drafts.rows.map((row) => [row.rowKey, row]));

assert.equal(packets.summary.rows, 132);
assert.equal(packets.summary.ready, 51);
assert.equal(packets.summary.insufficientEvidence, 81);
assert.equal(packets.existingCandidateProseIncluded, false);
assert.equal(drafts.rows.length, 51);
assert.equal(draftByKey.size, 51);
assert.deepEqual([...draftByKey.keys()].sort(), packets.rows.filter((row) => row.generationAllowed).map((row) => row.rowKey).sort());
for (const packetRow of packets.rows) {
  assert.equal("currentCopy" in packetRow, false, `${packetRow.rowKey}: current copy leaked into packet artifact.`);
  assert.equal("copy" in packetRow.packet, false, `${packetRow.rowKey}: copy leaked into packet artifact.`);
  if (!packetRow.generationAllowed) assert.equal(draftByKey.has(packetRow.rowKey), false, `${packetRow.rowKey}: SOURCE_GAP row received a draft.`);
}
for (const draft of drafts.rows) {
  const v2 = v2ByKey.get(draft.rowKey);
  assert.ok(v2, `${draft.rowKey}: missing V2 comparison row.`);
  const priorCopy = v2["Revised copy (V2 editorial, NOT owner approved)"] || v2["Current copy"];
  const lint = validateCopy(draft.copy, {
    family: "natal-aspect-exact",
    register: "second_person",
    plan: { astrologySupport: "present" },
    priorCopy
  });
  assert.equal(lint.passed, true, `${draft.rowKey}: ${JSON.stringify(lint.violations)}`);
}
console.log(JSON.stringify({ rows: 132, v3Drafts: 51, sourceGaps: 81, deterministicLintFailures: 0, priorStructureFailures: 0 }));
