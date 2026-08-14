#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = process.env.ARTIFACT_TOOL_MODULE;
if (!modulePath) throw new Error("ARTIFACT_TOOL_MODULE must point to the bundled @oai/artifact-tool module.");
const { FileBlob, SpreadsheetFile } = await import(pathToFileURL(modulePath).href);

const repoRoot = process.cwd();
const sourcePath = path.join(repoRoot, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V4.xlsx");
const artifactPath = path.join(repoRoot, "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v5-two-voice-candidates.json");
const repoOutputPath = path.join(repoRoot, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V5.xlsx");
const outputDir = path.join(repoRoot, "outputs/019fedfe-d553-75e3-be16-8abaa96cdf44/natal-v5");
await fs.mkdir(outputDir, { recursive: true });

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sheetSummary = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 3000 });
console.log(sheetSummary.ndjson);
const sheet = workbook.worksheets.getItem("Candidates132");
const sourcePreview = await workbook.render({ sheetName: "Candidates132", range: "A1:AI12", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "source-before-v5.png"), new Uint8Array(await sourcePreview.arrayBuffer()));

const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
const readme = workbook.worksheets.getItem("README");
readme.getRange("A51:B60").copyFrom(readme.getRange("A40:B49"), "all");
readme.getRange("A51:B51").merge();
readme.getRange("A51:B60").values = [
  ["EDITORIAL REVISION V5 — CROSS-ROW UNIQUENESS + INDIVIDUAL FRIEND AUTHORING (2026-08-13)", null],
  ["Root-cause reproduction", "V4 Friend: 528 sentences, 123 unique; 489 sentence occurrences (92.6%) belonged to repeated groups. V4 Self: 527 / 527 unique."],
  ["Cross-row gate", "PASS required at 100% unique sentences after Name normalization. Exact reuse, token similarity above 0.85, or a shared three-item example series across different mechanisms fails the batch."],
  ["Friend method", "All 132 Friend passages were authored individually from AstrologySupport at the observer entry point. The V4 frame-plus-slot builder and its shared frame, connector, and closing inventories were deleted."],
  ["Self correction", "Four owner-identified abstract-subject rows were re-authored. One additional Self sentence was revised because the new cross-row gate found a 0.889 near-duplicate pair."],
  ["Unique-sentence result", "PASS. Self 527 / 527 (100%). Friend 264 / 264 (100%)."],
  ["Near-duplicate result", "PASS. Highest Self pair score 0.667. Highest Friend pair score 0.529. Blocking threshold is above 0.85."],
  ["Banned fixtures", "PASS. The six owner-rejected V4 Friend skeleton sentences appear nowhere in V5."],
  ["Owner action", "Review V5 Self and Friend candidates independently. Owner-verdict and owner-edit columns remain blank."],
  ["Governance", "Review-gated candidates only. No approval, serving, auto-publish, or writer-promotion state changed."]
];
readme.getRange("A51:B51").format = { fill: "#17324D", font: { bold: true, color: "#FFFFFF" }, wrapText: true };
readme.getRange("A52:A60").format.font = { bold: true, color: "#243B53" };
readme.getRange("A51:B60").format.wrapText = true;
const headers = [
  "V5 self authoring method",
  "V5 self rewrite (NOT owner approved)",
  "V5 self deterministic precheck (NOT an editorial verdict)",
  "V5 self cross-row uniqueness precheck",
  "V5 self owner verdict",
  "V5 self owner edit",
  "V5 Friend authoring method",
  "V5 Friend copy (NOT owner approved)",
  "V5 Friend deterministic precheck (NOT an editorial verdict)",
  "V5 Friend entry-position check",
  "V5 paired structural similarity",
  "V5 Friend cross-row uniqueness precheck",
  "V5 Friend owner verdict",
  "V5 Friend owner edit"
];
const values = artifact.rows.map((row) => [
  row.self.method,
  row.self.copy,
  row.self.precheck,
  `CLEAR — batch ${artifact.crossRowUniqueness.self.uniqueSentenceCount}/${artifact.crossRowUniqueness.self.sentenceCount} unique; max near-duplicate ${artifact.crossRowUniqueness.self.highestNearDuplicatePairScore.toFixed(3)}`,
  "",
  "",
  row.friend.method,
  row.friend.copy,
  row.friend.precheck,
  "CLEAR — observer entry; no interior assertion; no coaching; not pronoun-derived",
  row.friend.pairStructuralSimilarity,
  `CLEAR — batch ${artifact.crossRowUniqueness.friend.uniqueSentenceCount}/${artifact.crossRowUniqueness.friend.sentenceCount} unique; max near-duplicate ${artifact.crossRowUniqueness.friend.highestNearDuplicatePairScore.toFixed(3)}; banned fixtures absent`,
  "",
  ""
]);

sheet.getRange("AJ1:AW133").copyFrom(sheet.getRange("V1:AI133"), "all");
sheet.getRange("AJ1:AW1").values = [headers];
sheet.getRange("AJ2:AW133").values = values;
sheet.getRange("AN2:AN133").dataValidation = { rule: { type: "list", values: ["approve", "edit", "cut"] } };
sheet.getRange("AV2:AV133").dataValidation = { rule: { type: "list", values: ["approve", "edit", "cut"] } };
sheet.getRange("AJ1:AW1").format = {
  fill: "#243B53",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true,
  verticalAlignment: "center"
};
sheet.getRange("AJ2:AW133").format.wrapText = true;
sheet.getRange("AJ:AJ").format.columnWidth = 24;
sheet.getRange("AK:AK").format.columnWidth = 62;
sheet.getRange("AL:AM").format.columnWidth = 30;
sheet.getRange("AN:AN").format.columnWidth = 16;
sheet.getRange("AO:AO").format.columnWidth = 46;
sheet.getRange("AP:AP").format.columnWidth = 24;
sheet.getRange("AQ:AQ").format.columnWidth = 62;
sheet.getRange("AR:AS").format.columnWidth = 30;
sheet.getRange("AT:AT").format.columnWidth = 16;
sheet.getRange("AU:AU").format.columnWidth = 32;
sheet.getRange("AV:AV").format.columnWidth = 16;
sheet.getRange("AW:AW").format.columnWidth = 46;
sheet.getRange("AT2:AT133").format.numberFormat = "0.000";
sheet.freezePanes.freezeRows(1);
sheet.freezePanes.freezeColumns(4);

const keyCheck = await workbook.inspect({ kind: "region", sheetId: "Candidates132", range: "AJ1:AW5", maxChars: 7000 });
console.log(keyCheck.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "V5 formula error scan" });
console.log(errors.ndjson);

const workbookSheets = ["README", "BatchSummary", "Candidates132"];
for (const sheetName of workbookSheets) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: sheetName === "Candidates132" ? 0.45 : 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheetName.toLowerCase()}-v5.png`), new Uint8Array(await preview.arrayBuffer()));
}
const candidateFocus = await workbook.render({ sheetName: "Candidates132", range: "AJ1:AW8", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "candidates132-v5-focus.png"), new Uint8Array(await candidateFocus.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(repoOutputPath);
await output.save(path.join(outputDir, path.basename(repoOutputPath)));
await fs.rm(`${repoOutputPath}.inspect.ndjson`, { force: true });
console.log(JSON.stringify({ repoOutputPath, outputDir, rows: values.length, ownerVerdictColumnsBlank: values.every((row) => row[4] === "" && row[12] === "") }, null, 2));
