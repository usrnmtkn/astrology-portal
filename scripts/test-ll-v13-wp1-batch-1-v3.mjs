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
const v3Path = path.join(repoRoot, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V3.xlsx");
const packets = JSON.parse(fs.readFileSync(packetPath, "utf8"));
const drafts = JSON.parse(fs.readFileSync(draftPath, "utf8"));
const v2Rows = readInlineXlsxSheet(v2Path, "Candidates132");
const v3Rows = readInlineXlsxSheet(v3Path, "Candidates132");
const v2ByKey = new Map(v2Rows.map((row) => [row.cells["Row key"], row.cells]));
const draftByKey = new Map(drafts.rows.map((row) => [row.rowKey, row]));

assert.equal(packets.summary.rows, 132);
assert.equal(packets.summary.ready, 132);
assert.equal(packets.summary.insufficientEvidence, 0);
const pointTokens = ["ascendant", "midheaven", "north_node", "south_node", "part_of_fortune"];
const pointRows = packets.rows.filter((row) => pointTokens.some((token) => row.rowKey.toLowerCase().includes(token)));
assert.equal(pointRows.length, 81);
assert.ok(pointRows.every((row) => row.generationAllowed === true), "Every Batch 1 point/angle row must clear through the natal-only registry.");
assert.ok(packets.rows.every((row) => row.packet.authoringTasks?.length === 2), "Every Batch 1 packet must emit independent self and Friend authoring tasks.");
assert.equal(packets.existingCandidateProseIncluded, false);
assert.equal(drafts.rows.length, 51);
assert.equal(draftByKey.size, 51);
assert.equal(v3Rows.length, 132);
for (let index = 0; index < v2Rows.length; index += 1) {
  const v2Cells = Object.values(v2Rows[index].cells).slice(0, 15);
  const v3Cells = Object.values(v3Rows[index].cells).slice(0, 15);
  assert.deepEqual(v3Cells, v2Cells, `V3 row ${index + 2}: V2 columns A:O changed.`);
  assert.equal(v3Rows[index].cells["V3 owner verdict"], "", `V3 row ${index + 2}: owner verdict must remain blank.`);
  assert.equal(v3Rows[index].cells["V3 owner edit"], "", `V3 row ${index + 2}: owner edit must remain blank.`);
}
assert.equal(v3Rows.filter((row) => row.cells["V3 deterministic precheck (NOT an editorial verdict)"] === "DETERMINISTIC CLEAR ONLY — semantic owner review pending").length, 51);
assert.equal(v3Rows.filter((row) => row.cells["Whole-passage semantic review"] === "SOURCE_GAP").length, 81);
assert.equal(v3Rows.filter((row) => row.cells["Whole-passage semantic review"] === "PENDING OWNER REVIEW").length, 51);
assert.ok([...draftByKey.keys()].every((key) => packets.rows.some((row) => row.rowKey === key && row.generationAllowed)), "Every historical V3 draft must now have a compliant V4 packet.");
for (const packetRow of packets.rows) {
  assert.equal("currentCopy" in packetRow, false, `${packetRow.rowKey}: current copy leaked into packet artifact.`);
  assert.equal("copy" in packetRow.packet, false, `${packetRow.rowKey}: copy leaked into packet artifact.`);
  assert.equal(packetRow.generationAllowed, true, `${packetRow.rowKey}: V4 registry repair did not clear the packet.`);
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
  const historicalViolations = lint.violations.filter((item) => !["abstract_subject_grammar", "chart_deixis"].includes(item.category));
  assert.deepEqual(historicalViolations, [], `${draft.rowKey}: ${JSON.stringify(historicalViolations)}`);
}
console.log(JSON.stringify({ rows: 132, historicalV3Drafts: 51, historicalV3SourceGaps: 81, v4PacketsReady: 132, deterministicLintFailuresExcludingNewV4Gates: 0, priorStructureFailures: 0 }));
