#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const modulePath = process.env.ARTIFACT_TOOL_MODULE;
if (!modulePath) throw new Error("ARTIFACT_TOOL_MODULE is required.");
const { SpreadsheetFile, Workbook } = await import(pathToFileURL(modulePath).href);
const review = JSON.parse(await fs.readFile(path.join(ROOT, "packages/astro-knowledge/review/natal-moon-final-rendered-review-v3.json"), "utf8"));
const approval = JSON.parse(await fs.readFile(path.join(ROOT, review.authority.draftingApproval), "utf8"));
const OUTPUT = path.join(ROOT, "outputs/019fedfe-d553-75e3-be16-8abaa96cdf44/TLDR-NATAL-MOON-FINAL-RENDERED-REVIEW-V3.xlsx");
const PREVIEW = "/private/tmp/tldrastro-natal-moon-final-review-v3";

const wb = Workbook.create();
const c = { navy: "#172033", blue: "#355C7D", pale: "#EAF1F8", yellow: "#FFF2CC", green: "#E8F5ED", border: "#D0D5DD", white: "#FFFFFF" };
function title(sheet, range, value) { sheet.getRange(range).merge(); sheet.getRange(range.split(":")[0]).values = [[value]]; sheet.getRange(range).format = { fill: c.navy, font: { bold: true, color: c.white, size: 18 }, verticalAlignment: "center", rowHeight: 34 }; }
function header(sheet, range) { sheet.getRange(range).format = { fill: c.blue, font: { bold: true, color: c.white }, wrapText: true, verticalAlignment: "center", borders: { preset: "all", style: "thin", color: c.border }, rowHeight: 34 }; }
function body(sheet, range) { sheet.getRange(range).format = { wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: c.border } }; }

const guide = wb.worksheets.add("Review Guide");
guide.showGridLines = false;
title(guide, "A1:H2", "Moon natal placement final rendered review");
guide.getRange("A4:B15").values = [
  ["Drafting authority", approval.authority.exactText],
  ["Sign sections", review.counts.signRows],
  ["House sections", review.counts.houseRows],
  ["Finished rendered samples", review.counts.renderedSamples],
  ["Childhood material", "Excluded from every rendered sample and preserved for later review."],
  ["Deterministic failures", review.counts.deterministicFailures],
  ["Current reader-copy approvals", review.counts.ownerReaderCopyVerdicts],
  ["Serving changes", review.counts.servingRowsChanged],
  ["Compatibility changes", "None"],
  ["Friend changes", "None"],
  ["What to review", "Read Sign Copy and House Copy first, then spot-check or review all 144 rows in Rendered Samples."],
  ["What happens next", "Nothing publishes until the owner explicitly approves the finished rendered samples."],
];
guide.getRange("A4:A15").format = { fill: c.pale, font: { bold: true, color: c.navy }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: c.border } };
guide.getRange("B4:B15").format = { wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: c.border } };
guide.getRange("A17:H19").merge();
guide.getRange("A17").values = [["If the finished samples are correct, approve them in chat or use the yellow verdict columns. Approval of this workbook authorizes an atomic import only after its hashes are revalidated; it does not bypass the content suite, generated-artifact regeneration, PR, merge, or production spot-checks."]];
guide.getRange("A17:H19").format = { fill: c.yellow, font: { bold: true, color: "#6B4F00" }, wrapText: true, verticalAlignment: "center" };
guide.getRange("A:A").format.columnWidth = 34; guide.getRange("B:B").format.columnWidth = 110;

const signs = wb.worksheets.add("Sign Copy");
signs.showGridLines = false; signs.freezePanes.freezeRows(1); signs.freezePanes.freezeColumns(2);
const signHeaders = ["Row key", "Sign", "Moon introduction", "Finished no-childhood sign body", "Rendered sign section", "Body SHA-256", "Childhood status", "Owner verdict (approve/edit/cut)", "Owner edit"];
const signRows = review.signRows.map((r) => [r.runtimeKey, r.sign, r.intro, r.body, `${r.intro}\n\n${r.body}`, r.bodySha256, r.childhoodStatus, "", ""]);
signs.getRangeByIndexes(0, 0, 1, signHeaders.length).values = [signHeaders]; signs.getRangeByIndexes(1, 0, signRows.length, signHeaders.length).values = signRows;
header(signs, "A1:I1"); body(signs, `A2:I${signRows.length + 1}`); signs.getRange(`H2:I${signRows.length + 1}`).format.fill = c.yellow; signs.tables.add(`A1:I${signRows.length + 1}`, true, "MoonSignFinalReview");
[24, 14, 64, 110, 120, 68, 48, 28, 95].forEach((w, i) => signs.getRangeByIndexes(0, i, signRows.length + 1, 1).format.columnWidth = w);

const houses = wb.worksheets.add("House Copy");
houses.showGridLines = false; houses.freezePanes.freezeRows(1); houses.freezePanes.freezeColumns(2);
const houseHeaders = ["Row key", "House", "Canonical bridge", "Finished house body", "Rendered house section", "Body SHA-256", "Word count", "Precheck", "Owner verdict (approve/edit/cut)", "Owner edit"];
const houseRows = review.houseRows.map((r) => [r.runtimeKey, r.house, r.bridge, r.body, r.rendered, r.bodySha256, r.wordCount, r.deterministicPrecheck.length ? JSON.stringify(r.deterministicPrecheck) : "PASS", "", ""]);
houses.getRangeByIndexes(0, 0, 1, houseHeaders.length).values = [houseHeaders]; houses.getRangeByIndexes(1, 0, houseRows.length, houseHeaders.length).values = houseRows;
header(houses, "A1:J1"); body(houses, `A2:J${houseRows.length + 1}`); houses.getRange(`I2:J${houseRows.length + 1}`).format.fill = c.yellow; houses.tables.add(`A1:J${houseRows.length + 1}`, true, "MoonHouseFinalReview");
[24, 10, 85, 115, 125, 68, 14, 18, 28, 95].forEach((w, i) => houses.getRangeByIndexes(0, i, houseRows.length + 1, 1).format.columnWidth = w);

const renders = wb.worksheets.add("Rendered Samples");
renders.showGridLines = false; renders.freezePanes.freezeRows(1); renders.freezePanes.freezeColumns(3);
const renderHeaders = ["Render key", "Sign row", "House row", "Finished rendered sample", "Word count", "Rendered SHA-256", "Precheck", "Owner verdict (approve/edit/cut)", "Owner edit"];
const renderRows = review.renderRows.map((r) => [r.renderKey, r.signKey, r.houseKey, r.rendered, r.wordCount, r.renderedSha256, r.deterministicPrecheck.length ? JSON.stringify(r.deterministicPrecheck) : "PASS", "", ""]);
renders.getRangeByIndexes(0, 0, 1, renderHeaders.length).values = [renderHeaders]; renders.getRangeByIndexes(1, 0, renderRows.length, renderHeaders.length).values = renderRows;
header(renders, "A1:I1"); body(renders, `A2:I${renderRows.length + 1}`); renders.getRange(`H2:I${renderRows.length + 1}`).format.fill = c.yellow; renders.tables.add(`A1:I${renderRows.length + 1}`, true, "MoonRenderedFinalReview");
[34, 22, 24, 140, 15, 68, 18, 28, 100].forEach((w, i) => renders.getRangeByIndexes(0, i, renderRows.length + 1, 1).format.columnWidth = w);

const childhood = wb.worksheets.add("Childhood Preserved");
childhood.showGridLines = false;
title(childhood, "A1:F2", "Childhood material preserved for a later, separate review");
childhood.getRange("A4:F4").values = [["Sign row", "Sign", "Preserved block", "SHA-256", "Current batch status", "Serving impact"]];
const childhoodRows = review.signRows.map((r) => [r.runtimeKey, r.sign, r.childhoodBlock, r.childhoodBlockSha256, r.childhoodStatus, "none"]);
childhood.getRangeByIndexes(4, 0, childhoodRows.length, 6).values = childhoodRows; header(childhood, "A4:F4"); body(childhood, `A5:F${childhoodRows.length + 4}`);
[24, 14, 105, 68, 58, 18].forEach((w, i) => childhood.getRangeByIndexes(0, i, childhoodRows.length + 4, 1).format.columnWidth = w);

const evidence = wb.worksheets.add("Source Evidence");
evidence.showGridLines = false; title(evidence, "A1:F2", "Governance and source evidence");
evidence.getRange("A4:F9").values = [
  ["Type", "Path", "Decision", "Reader copy approved", "Serving authorized", "Note"],
  ["owner drafting approval", review.authority.draftingApproval, "12 argument cores approved for drafting", false, false, "finished samples still require approval"],
  ["readiness artifact", review.authority.readinessArtifact, "source of hashes and canonical bridges", false, false, "childhood separated"],
  ["final review artifact", "packages/astro-knowledge/review/natal-moon-final-rendered-review-v3.json", "144 review-gated samples", false, false, "artifact of record for this workbook"],
  ["compatibility corpus", "tldr-astro-phrasebank/phrasebank/moon-compatibility-library.json", "read-only evidence", false, false, "byte-identical guard"],
  ["serving corpus", "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", "unchanged", false, false, "publication is a later atomic step"],
];
header(evidence, "A4:F4"); body(evidence, "A5:F9");
[28, 110, 52, 24, 24, 70].forEach((w, i) => evidence.getRangeByIndexes(0, i, 9, 1).format.columnWidth = w);

const out = await SpreadsheetFile.exportXlsx(wb); await fs.mkdir(path.dirname(OUTPUT), { recursive: true }); await out.save(OUTPUT);
await fs.mkdir(PREVIEW, { recursive: true });
for (const [sheetName, range, fileName] of [
  ["Review Guide", "A1:H19", "review-guide.png"], ["Sign Copy", "A1:I6", "sign-copy.png"], ["House Copy", "A1:J6", "house-copy.png"], ["Rendered Samples", "A1:I8", "rendered-samples.png"], ["Childhood Preserved", "A1:F9", "childhood-preserved.png"], ["Source Evidence", "A1:F9", "source-evidence.png"],
]) {
  const inspected = await wb.inspect({ kind: "table", sheetId: sheetName, range, include: "values,formulas", tableMaxRows: 20, tableMaxCols: 12, maxChars: 20000 });
  if (!inspected.ndjson) throw new Error(`Inspection failed: ${sheetName}`);
  const image = await wb.render({ sheetName, range, scale: 1, format: "png" }); await fs.writeFile(path.join(PREVIEW, fileName), new Uint8Array(await image.arrayBuffer()));
}
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "formula error scan" });
if (/"matchCount":[1-9][0-9]*/u.test(errors.ndjson ?? "")) throw new Error("Workbook formula errors.");
await fs.rm(`${OUTPUT}.inspect.ndjson`, { force: true });
console.log(`Wrote ${path.relative(ROOT, OUTPUT)} with 144 finished, review-gated Moon samples.`);
