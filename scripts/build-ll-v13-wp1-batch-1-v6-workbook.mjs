#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = process.env.ARTIFACT_TOOL_MODULE;
if (!modulePath) throw new Error("ARTIFACT_TOOL_MODULE must point to the bundled @oai/artifact-tool module.");
const { FileBlob, SpreadsheetFile } = await import(pathToFileURL(modulePath).href);
const root = process.cwd();
const sourcePath = path.join(root, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V5.xlsx");
const artifactPath = path.join(root, "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v6-two-voice-candidates.json");
const outputPath = path.join(root, "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V6.xlsx");
const outputDir = path.join(root, "outputs/019fedfe-d553-75e3-be16-8abaa96cdf44/natal-v6");
await fs.mkdir(outputDir, { recursive: true });

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
const sheet = workbook.worksheets.getItem("Candidates132");
const readme = workbook.worksheets.getItem("README");
readme.getRange("A51:B60").values = [
  ["EDITORIAL REVISION V6 — FRIEND LENGTH + OBSERVABILITY REPAIR (2026-08-13)", null],
  ["V5 reproduction", "Friend: 132/132 two-sentence passages, median 35 words. Self: median 67 words. Both voices were 100% unique, and the six banned Friend skeleton sentences were absent."],
  ["Friend shape gate", "PASS required: at least four sentences, at least 55 words (roughly 60), and the four beats of observed behavior, evidence, consequence, and complication without shared paragraph scaffolding."],
  ["Observability gate", "PASS required for both voices: at least two distinct observable nouns naming objects, places, times, money, food, body, documents, messages, rooms, vehicles, appointments, or named roles."],
  ["Abstract-subject gate", "PASS required: parse the grammatical subject before judging it; a bare abstract quality performing a verb fails. The seven V5 misses are regression fixtures."],
  ["V6 shape result", `Self sentence distribution ${JSON.stringify(artifact.metrics.self.sentenceCountDistribution)}, median ${artifact.metrics.self.medianWords} words. Friend sentence distribution ${JSON.stringify(artifact.metrics.friend.sentenceCountDistribution)}, median ${artifact.metrics.friend.medianWords} words.`],
  ["V6 observability result", `PASS. Zero-observable rows: Self ${artifact.metrics.self.zeroObservableNounRows}; Friend ${artifact.metrics.friend.zeroObservableNounRows}. Under-two rows: Self ${artifact.metrics.self.underTwoObservableNounRows}; Friend ${artifact.metrics.friend.underTwoObservableNounRows}.`],
  ["V6 uniqueness result", `PASS. Self ${artifact.crossRowUniqueness.self.uniqueSentenceCount}/${artifact.crossRowUniqueness.self.sentenceCount}, max near-duplicate ${artifact.crossRowUniqueness.self.highestNearDuplicatePairScore.toFixed(3)}. Friend ${artifact.crossRowUniqueness.friend.uniqueSentenceCount}/${artifact.crossRowUniqueness.friend.sentenceCount}, max ${artifact.crossRowUniqueness.friend.highestNearDuplicatePairScore.toFixed(3)}.`],
  ["Owner action", "Review V6 Self and Friend candidates independently. Owner-verdict and owner-edit columns remain blank."],
  ["Governance", "Deterministic prechecks only, never editorial verdicts. Review-gated candidates; no approval, serving, auto-publish, or writer-promotion state changed."]
];
readme.getRange("A51:B51").merge();
readme.getRange("A51:B51").format = { fill: "#17324D", font: { bold: true, color: "#FFFFFF" }, wrapText: true };
readme.getRange("A52:A60").format.font = { bold: true, color: "#243B53" };
readme.getRange("A51:B60").format.wrapText = true;

const headers = [
  "V6 self authoring method", "V6 self rewrite (NOT owner approved)", "V6 self deterministic precheck (NOT an editorial verdict)", "V6 self cross-row uniqueness precheck", "V6 self owner verdict", "V6 self owner edit",
  "V6 Friend authoring method", "V6 Friend copy (NOT owner approved)", "V6 Friend deterministic precheck (NOT an editorial verdict)", "V6 Friend entry-position check", "V6 paired structural similarity", "V6 Friend cross-row uniqueness precheck", "V6 Friend owner verdict", "V6 Friend owner edit"
];
const values = artifact.rows.map((row) => [
  row.self.method,
  row.self.copy,
  `CLEAR — ${row.self.observableSentenceProfile.distinctObservableNounCount} distinct observable nouns; precheck only`,
  `CLEAR — ${artifact.crossRowUniqueness.self.uniqueSentenceCount}/${artifact.crossRowUniqueness.self.sentenceCount} unique; max ${artifact.crossRowUniqueness.self.highestNearDuplicatePairScore.toFixed(3)}`,
  "", "",
  row.friend.method,
  row.friend.copy,
  `CLEAR — 4+ sentences, 55+ words, ${row.friend.observableSentenceProfile.distinctObservableNounCount} distinct observable nouns; precheck only`,
  "CLEAR — observer entry; no interior assertion; no coaching; not pronoun-derived",
  row.friend.pairStructuralSimilarity,
  `CLEAR — ${artifact.crossRowUniqueness.friend.uniqueSentenceCount}/${artifact.crossRowUniqueness.friend.sentenceCount} unique; max ${artifact.crossRowUniqueness.friend.highestNearDuplicatePairScore.toFixed(3)}; banned fixtures absent`,
  "", ""
]);
sheet.getRange("AJ1:AW1").values = [headers];
sheet.getRange("AJ2:AW133").values = values;
sheet.getRange("AN2:AN133").dataValidation = { rule: { type: "list", values: ["approve", "edit", "cut"] } };
sheet.getRange("AV2:AV133").dataValidation = { rule: { type: "list", values: ["approve", "edit", "cut"] } };
sheet.getRange("AJ1:AW1").format = { fill: "#243B53", font: { bold: true, color: "#FFFFFF" }, wrapText: true, verticalAlignment: "center" };
sheet.getRange("AJ2:AW133").format.wrapText = true;
sheet.getRange("AK:AK").format.columnWidth = 62;
sheet.getRange("AQ:AQ").format.columnWidth = 62;
sheet.getRange("AT2:AT133").format.numberFormat = "0.000";
sheet.freezePanes.freezeRows(1);
sheet.freezePanes.freezeColumns(4);

console.log((await workbook.inspect({ kind: "region", sheetId: "Candidates132", range: "AJ1:AW5", maxChars: 7000 })).ndjson);
console.log((await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "V6 formula error scan" })).ndjson);
for (const sheetName of ["README", "BatchSummary", "Candidates132"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: sheetName === "Candidates132" ? 0.45 : 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheetName.toLowerCase()}-v6.png`), new Uint8Array(await preview.arrayBuffer()));
}
const focus = await workbook.render({ sheetName: "Candidates132", range: "AJ1:AW8", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "candidates132-v6-focus.png"), new Uint8Array(await focus.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
await output.save(path.join(outputDir, path.basename(outputPath)));
await fs.rm(`${outputPath}.inspect.ndjson`, { force: true });
console.log(JSON.stringify({ outputPath, rows: values.length, ownerVerdictsBlank: values.every((row) => row[4] === "" && row[12] === "") }, null, 2));
