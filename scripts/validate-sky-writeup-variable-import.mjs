#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  remapSkyWriteupRow,
  rowsToCsv,
  sampleSkyWriteupRows,
  SKY_WRITEUP_IMPORT_COLUMNS
} from "./sky-writeup-variable-import-contract.mjs";

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const pushCell = () => { row.push(cell); cell = ""; };
  const pushRow = () => { if (row.length > 1 || row[0]) rows.push(row); row = []; };
  const source = String(text ?? "").replace(/^\uFEFF/u, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === "\"" && source[i + 1] === "\"") { cell += "\""; i += 1; }
      else if (char === "\"") quoted = false;
      else cell += char;
      continue;
    }
    if (char === "\"") quoted = true;
    else if (char === ",") pushCell();
    else if (char === "\n") { pushCell(); pushRow(); }
    else if (char !== "\r") cell += char;
  }
  if (quoted) throw new Error("CSV has an unclosed quote.");
  pushCell();
  if (row.some(Boolean)) pushRow();
  if (!rows.length) return [];
  const headers = rows[0].map(item => item.trim());
  return rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

const samplePath = path.resolve("docs/content-management/fixtures/sky-writeup-variable-import-sample.csv");

function writeSample(destination = samplePath) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const rows = sampleSkyWriteupRows().map(row => remapSkyWriteupRow(row));
  fs.writeFileSync(destination, rowsToCsv(rows, [...SKY_WRITEUP_IMPORT_COLUMNS, "importReady", "lintFindings"]));
  return { destination, rows };
}

function remapFile(inputPath, outputPath) {
  const rows = parseCsv(fs.readFileSync(inputPath, "utf8")).map(remapSkyWriteupRow);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, rowsToCsv(rows, [...SKY_WRITEUP_IMPORT_COLUMNS, "importReady", "lintFindings"]));
  return rows;
}

function report(rows, label) {
  const blocked = rows.filter(row => !row.importReady);
  const held = rows.filter(row => row.heldBackText);
  console.log(`${label}: ${rows.length} rows, ${rows.length - blocked.length} import-ready, ${blocked.length} blocked, ${held.length} with held-back extra sentences.`);
  if (blocked.length) {
    const sample = blocked.slice(0, 12).map(row => `  ${row.key || row.variable}: ${row.lintFindings}`);
    console.log(sample.join("\n"));
    if (blocked.length > 12) console.log(`  … ${blocked.length - 12} more`);
  }
  return blocked.length;
}

const isMain = path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "");
if (isMain) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      remap: { type: "string" },
      out: { type: "string" },
      "write-sample": { type: "boolean" },
      sample: { type: "string" }
    }
  });
  if (values["write-sample"]) {
    const written = writeSample(values.sample || samplePath);
    const blocked = report(written.rows, "sample");
    if (blocked) process.exit(1);
  } else if (values.remap) {
    if (!values.out) throw new Error("Use --out with --remap.");
    const rows = remapFile(values.remap, values.out);
    const blocked = report(rows, path.basename(values.out));
    if (blocked) console.log("Remap wrote blocked rows with lintFindings. Fix those cells before Studio import.");
    process.exit(0);
  } else if (positionals[0]) {
    const rows = parseCsv(fs.readFileSync(positionals[0], "utf8")).map(remapSkyWriteupRow);
    process.exit(report(rows, positionals[0]) ? 1 : 0);
  } else {
    console.log("Usage:\n  node scripts/validate-sky-writeup-variable-import.mjs --write-sample\n  node scripts/validate-sky-writeup-variable-import.mjs FILE.csv\n  node scripts/validate-sky-writeup-variable-import.mjs --remap FILE.csv --out FILE.csv");
    process.exit(2);
  }
}

export { remapFile, writeSample };
