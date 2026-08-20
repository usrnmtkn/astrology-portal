#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const modulePath = process.env.ARTIFACT_TOOL_MODULE;
if (!modulePath) throw new Error("ARTIFACT_TOOL_MODULE is required.");
const { SpreadsheetFile, Workbook } = await import(pathToFileURL(modulePath).href);
const artifact = JSON.parse(await fs.readFile(path.join(ROOT, "packages/astro-knowledge/review/natal-moon-authoring-readiness-v2.json"), "utf8"));
const OUTPUT = path.join(ROOT, "outputs/019fedfe-d553-75e3-be16-8abaa96cdf44/TLDR-NATAL-MOON-AUTHORING-READINESS-V2.xlsx");
const PREVIEW = "/private/tmp/tldrastro-natal-moon-authoring-readiness-v2";

const wb = Workbook.create();
const colors = { navy: "#172033", blue: "#355C7D", pale: "#EAF1F8", yellow: "#FFF2CC", green: "#E8F5ED", red: "#FDECEC", gray: "#F2F4F7", border: "#D0D5DD", white: "#FFFFFF" };
function title(sheet, range, text) {
  sheet.getRange(range).merge();
  sheet.getRange(range.split(":")[0]).values = [[text]];
  sheet.getRange(range).format = { fill: colors.navy, font: { bold: true, color: colors.white, size: 18 }, verticalAlignment: "center", rowHeight: 34 };
}
function header(sheet, range) {
  sheet.getRange(range).format = { fill: colors.blue, font: { bold: true, color: colors.white }, wrapText: true, verticalAlignment: "center", borders: { preset: "all", style: "thin", color: colors.border }, rowHeight: 34 };
}
function body(sheet, range) {
  sheet.getRange(range).format = { wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: colors.border } };
}

const readme = wb.worksheets.add("Read Me");
readme.showGridLines = false;
title(readme, "A1:H2", "Moon natal writing: authoring-readiness review");
readme.getRange("A4:B15").values = [
  ["Purpose", "Approve the Moon sign decisions and the 12 Moon-house argument cores before the remaining house prose is authored."],
  ["Compatibility impact", "None. Compatibility files are read-only evidence and remain byte-identical."],
  ["Serving impact", "None. This workbook cannot publish copy or change approval state."],
  ["Sign rows", artifact.counts.signRows],
  ["Approved internal house mechanisms", artifact.counts.approvedHouseMechanisms],
  ["House argument verdicts currently filled", artifact.counts.houseArgumentVerdicts],
  ["Calibration house bodies", artifact.counts.calibrationHouseBodies],
  ["Render combinations", artifact.counts.renderRows],
  ["Calibration renders available", artifact.counts.calibrationRenders],
  ["Renders correctly blocked", artifact.counts.blockedRenders],
  ["Childhood handling", "Choose include, edit, or exclude separately from the sign-copy verdict."],
  ["Friend boundary", "No Friend candidates. Friend remains separately authored from observer entry."],
];
readme.getRange("A4:A15").format = { fill: colors.pale, font: { bold: true, color: colors.navy }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: colors.border } };
readme.getRange("B4:B15").format = { wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: colors.border } };
readme.getRange("A17:H18").merge();
readme.getRange("A17").values = [["Review order: (1) Sign Review verdicts and childhood decisions; (2) House Arguments verdicts; (3) Calibrations. The remaining 120 renders stay blocked until the argument cores are approved and the house bodies are authored and reviewed."]];
readme.getRange("A17:H18").format = { fill: colors.yellow, font: { bold: true, color: "#6B4F00" }, wrapText: true, verticalAlignment: "center" };
readme.getRange("A:A").format.columnWidth = 36;
readme.getRange("B:B").format.columnWidth = 105;

const signs = wb.worksheets.add("Sign Review");
signs.showGridLines = false;
signs.freezePanes.freezeRows(1);
signs.freezePanes.freezeColumns(2);
const signHeaders = ["Row key", "Sign", "Moon intro", "No-childhood candidate", "Optional childhood block", "With-childhood candidate", "Current approved serving copy (comparison only)", "Precheck", "Candidate SHA-256", "Owner sign verdict (approve/edit/cut)", "Owner sign edit", "Owner childhood decision (include/edit/exclude)", "Owner childhood edit"];
const signData = artifact.signRows.map((r) => [r.runtimeKey, r.sign, r.intro, r.youCandidate, r.childhoodBlock, r.withChildhoodCandidate, r.currentApprovedYouCopy, r.deterministicPrecheck.length ? JSON.stringify(r.deterministicPrecheck) : "PASS", r.youCandidateSha256, "", "", "", ""]);
signs.getRangeByIndexes(0, 0, 1, signHeaders.length).values = [signHeaders];
signs.getRangeByIndexes(1, 0, signData.length, signHeaders.length).values = signData;
header(signs, `A1:M1`); body(signs, `A2:M${signData.length + 1}`);
signs.getRange(`J2:M${signData.length + 1}`).format.fill = colors.yellow;
signs.tables.add(`A1:M${signData.length + 1}`, true, "MoonSignReview");
[24, 14, 58, 95, 70, 105, 90, 26, 68, 28, 70, 32, 70].forEach((width, i) => signs.getRangeByIndexes(0, i, signData.length + 1, 1).format.columnWidth = width);

const houses = wb.worksheets.add("House Arguments");
houses.showGridLines = false;
houses.freezePanes.freezeRows(1);
houses.freezePanes.freezeColumns(2);
const houseHeaders = ["Row key", "House", "Canonical bridge", "Approved internal mechanism", "Mechanism SHA-256", "Ten-line argument core", "Five quality intentions", "Owner argument verdict (approve/edit/cut)", "Owner argument edit", "Candidate status"];
const houseData = artifact.houseRows.map((r) => [r.runtimeKey, r.house, r.bridge, r.mechanism, r.mechanismSha256, r.argumentCore.map((line, i) => `${i + 1}. ${line}`).join("\n"), r.qualityIntentions.map((line, i) => `${i + 1}. ${line}`).join("\n"), "", "", r.calibrationStatus]);
houses.getRangeByIndexes(0, 0, 1, houseHeaders.length).values = [houseHeaders];
houses.getRangeByIndexes(1, 0, houseData.length, houseHeaders.length).values = houseData;
header(houses, "A1:J1"); body(houses, `A2:J${houseData.length + 1}`);
houses.getRange(`H2:I${houseData.length + 1}`).format.fill = colors.yellow;
houses.tables.add(`A1:J${houseData.length + 1}`, true, "MoonHouseArguments");
[24, 10, 78, 90, 68, 110, 90, 30, 90, 42].forEach((width, i) => houses.getRangeByIndexes(0, i, houseData.length + 1, 1).format.columnWidth = width);

const calibrations = wb.worksheets.add("Calibrations");
calibrations.showGridLines = false;
title(calibrations, "A1:H2", "Canonical-bridge calibration renders");
const calibrationHeaders = ["House row", "Canonical bridge", "Candidate body", "Rendered house section", "Status", "Owner exact-copy verdict", "Owner exact-copy edit", "Rendered SHA-256"];
const calibrationRows = artifact.houseRows.filter((r) => r.calibrationBody).map((r) => [r.runtimeKey, r.bridge, r.calibrationBody, r.renderedCalibration, r.calibrationStatus, "", "", r.renderedCalibrationSha256]);
calibrations.getRangeByIndexes(3, 0, 1, calibrationHeaders.length).values = [calibrationHeaders];
calibrations.getRangeByIndexes(4, 0, calibrationRows.length, calibrationHeaders.length).values = calibrationRows;
header(calibrations, "A4:H4"); body(calibrations, `A5:H${calibrationRows.length + 4}`);
calibrations.getRange(`F5:G${calibrationRows.length + 4}`).format.fill = colors.yellow;
[25, 85, 105, 115, 42, 28, 90, 68].forEach((width, i) => calibrations.getRangeByIndexes(0, i, calibrationRows.length + 4, 1).format.columnWidth = width);

const renders = wb.worksheets.add("Render Matrix");
renders.showGridLines = false;
renders.freezePanes.freezeRows(1);
renders.freezePanes.freezeColumns(3);
const renderHeaders = ["Render key", "Sign row", "House row", "Status", "No-childhood render", "No-childhood SHA-256", "With-childhood render", "With-childhood SHA-256"];
const renderData = artifact.renderRows.map((r) => [r.renderKey, r.signKey, r.houseKey, r.renderStatus, r.noChildhood, r.noChildhoodSha256, r.withChildhood, r.withChildhoodSha256]);
renders.getRangeByIndexes(0, 0, 1, renderHeaders.length).values = [renderHeaders];
renders.getRangeByIndexes(1, 0, renderData.length, renderHeaders.length).values = renderData;
header(renders, "A1:H1"); body(renders, `A2:H${renderData.length + 1}`);
renders.tables.add(`A1:H${renderData.length + 1}`, true, "MoonRenderMatrix");
[34, 22, 24, 46, 120, 68, 120, 68].forEach((width, i) => renders.getRangeByIndexes(0, i, renderData.length + 1, 1).format.columnWidth = width);

const evidence = wb.worksheets.add("Source Evidence");
evidence.showGridLines = false;
title(evidence, "A1:F2", "Governed source evidence");
const evidenceRows = [
  ...artifact.sourceFiles.map((r) => ["compatibility source", r.path, r.sha256, r.byteLength, "read-only", "byte-identical guard"]),
  ["owner ruling", artifact.authority.bridgeRuling, "", "", "canonical house bridge", "You surface only"],
  ["owner ruling", artifact.authority.mechanismRuling, "", "", "author from mechanism", "prior serving copy excluded from drafting"],
  ["owner approval", artifact.authority.mechanismApproval, "", "", "156 supported internal mechanisms", "reader copy not approved by this record"],
  ["combined plan", artifact.authority.combinedPlan, "", "", "active", "publication sequence and invariants"],
];
evidence.getRange("A4:F4").values = [["Type", "Path", "SHA-256", "Byte length", "Authority", "Note"]];
evidence.getRangeByIndexes(4, 0, evidenceRows.length, 6).values = evidenceRows;
header(evidence, "A4:F4"); body(evidence, `A5:F${evidenceRows.length + 4}`);
[25, 105, 68, 18, 44, 80].forEach((width, i) => evidence.getRangeByIndexes(0, i, evidenceRows.length + 4, 1).format.columnWidth = width);

const output = await SpreadsheetFile.exportXlsx(wb);
await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await output.save(OUTPUT);
await fs.mkdir(PREVIEW, { recursive: true });
const previews = [
  ["Read Me", "A1:H18", "read-me.png"],
  ["Sign Review", "A1:M7", "sign-review.png"],
  ["House Arguments", "A1:J5", "house-arguments.png"],
  ["Calibrations", "A1:H6", "calibrations.png"],
  ["Render Matrix", "A1:H12", "render-matrix.png"],
  ["Source Evidence", "A1:F10", "source-evidence.png"],
];
for (const [sheetName, range, fileName] of previews) {
  const inspected = await wb.inspect({ kind: "table", sheetId: sheetName, range, include: "values,formulas", tableMaxRows: 20, tableMaxCols: 14, maxChars: 20000 });
  if (!inspected.ndjson) throw new Error(`Inspection failed for ${sheetName}`);
  const image = await wb.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(PREVIEW, fileName), new Uint8Array(await image.arrayBuffer()));
}
const formulaErrors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "formula error scan" });
if (/"matchCount":[1-9][0-9]*/u.test(formulaErrors.ndjson ?? "")) throw new Error("Workbook contains formula errors.");
await fs.rm(`${OUTPUT}.inspect.ndjson`, { force: true });
console.log(`Wrote ${path.relative(ROOT, OUTPUT)} and rendered all six sheets for verification.`);
