#!/usr/bin/env node
/**
 * Generate the 48 owner-final Node/Chiron/Lilith transit-house records.
 *
 * The Markdown is the only prose source of truth. The optional import command
 * bootstraps that source byte-for-byte from an owner-supplied path and checks
 * it against the historical JSON mirror before generating repository JSON.
 * No external path is stored in the repository.
 *
 * Usage:
 *   node scripts/build-four-body-house-transits.mjs --import-source <md> --mirror <json> --write
 *   node scripts/build-four-body-house-transits.mjs --write
 *   node scripts/build-four-body-house-transits.mjs --check
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(repoRoot, "packages/astro-knowledge/sources/authored/four-body");
const sourcePath = path.join(sourceDir, "TLDR-Node-Chiron-Lilith-House-Transits-FINAL.md");
const outputDir = path.join(repoRoot, "packages/astro-knowledge/data/points/transits/house/owner-final");
const args = process.argv.slice(2);
const write = args.includes("--write");
const check = args.includes("--check");
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const importSource = valueAfter("--import-source");
const mirrorPath = valueAfter("--mirror");

if (write && check) throw new Error("Use --write or --check, not both.");
if (importSource && !write) throw new Error("--import-source requires --write.");
if (Boolean(importSource) !== Boolean(mirrorPath)) throw new Error("--import-source and --mirror must be supplied together.");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const normalizeBody = (display) => {
  const value = display.toLowerCase();
  if (value === "south node") return "south-node";
  if (value === "north node") return "north-node";
  if (value === "chiron") return "chiron";
  if (value === "black moon lilith" || value === "lilith") return "lilith";
  return null;
};

function parseMarkdown(markdown) {
  if (!markdown.startsWith("# Node, Chiron & Lilith Through-House Transits — AUTHOR-FINAL")) {
    throw new Error("FOUR_BODY_HOUSE_SOURCE_NOT_AUTHOR_FINAL: expected the owner-final document header.");
  }
  const records = [];
  const pattern = /^## (South Node|North Node|Chiron|Lilith) — (\d{1,2})H\n\*\*([^\n]+)\*\*\n\n([\s\S]*?)(?=\n## |\n---\n|\n# [A-Z]|(?![\s\S]))/gmu;
  for (const match of markdown.matchAll(pattern)) {
    const [, display, rawHouse, headline, rawBody] = match;
    const transiting = normalizeBody(display);
    const house = Number(rawHouse);
    if (!transiting || house < 1 || house > 12) throw new Error(`FOUR_BODY_HOUSE_KEY_INVALID: ${display} ${rawHouse}`);
    records.push({ display, transiting, house, headline: headline.trim(), body: rawBody.trim() });
  }
  if (records.length !== 48) throw new Error(`FOUR_BODY_HOUSE_ROWS_DROPPED: read ${records.length} of 48 owner-final units.`);
  const keys = new Set(records.map((row) => `${row.transiting}/${row.house}`));
  if (keys.size !== 48) throw new Error(`FOUR_BODY_HOUSE_DUPLICATE_KEYS: ${48 - keys.size} duplicate key(s).`);
  for (const body of ["south-node", "north-node", "chiron", "lilith"]) {
    const count = records.filter((row) => row.transiting === body).length;
    if (count !== 12) throw new Error(`FOUR_BODY_HOUSE_ROWS_DROPPED: ${body} has ${count} of 12 houses.`);
  }
  return records.sort((a, b) => a.transiting.localeCompare(b.transiting) || a.house - b.house);
}

function verifyMirror(records, mirrorFile) {
  const mirror = JSON.parse(fs.readFileSync(mirrorFile, "utf8"));
  if (!Array.isArray(mirror) || mirror.length !== 48) {
    throw new Error(`FOUR_BODY_HOUSE_MIRROR_ROWS_DROPPED: mirror has ${Array.isArray(mirror) ? mirror.length : 0} of 48 rows.`);
  }
  const byKey = new Map(mirror.map((row) => [String(row.key), row]));
  for (const row of records) {
    const key = `house.${row.transiting}.${row.house}`;
    const held = byKey.get(key);
    if (!held) throw new Error(`FOUR_BODY_HOUSE_MIRROR_KEY_MISSING: ${key}`);
    if (held.headline !== row.headline || held.body !== row.body) {
      throw new Error(`FOUR_BODY_HOUSE_MIRROR_DRIFT: ${key} does not match the Markdown source.`);
    }
  }
}

if (importSource) {
  const externalMarkdown = fs.readFileSync(path.resolve(importSource));
  const parsed = parseMarkdown(externalMarkdown.toString("utf8"));
  verifyMirror(parsed, path.resolve(mirrorPath));
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(sourcePath, externalMarkdown);
  console.log(`Imported owner source byte-for-byte (${externalMarkdown.length} bytes, sha256 ${sha256(externalMarkdown)}).`);
}

if (!fs.existsSync(sourcePath)) throw new Error(`FOUR_BODY_HOUSE_SOURCE_MISSING: ${sourcePath}`);
const markdown = fs.readFileSync(sourcePath, "utf8");
const sourceHash = sha256(markdown);
const records = parseMarkdown(markdown);
const outputs = records.map((row) => {
  const id = `${row.transiting}-${row.house}`;
  const json = {
    schemaVersion: 1,
    id,
    canonicalId: `transit-house/${row.transiting.replace(/-/gu, "_")}/${row.house}`,
    kind: "house",
    transiting: row.transiting,
    house: row.house,
    headline: row.headline,
    body: row.body,
    authorityClass: "owner-approved-prose",
    surfacePermission: ["doctrine-only"],
    usage: "primary",
    framingAllowed: true,
    approvalMarker: "exact_owner_approved",
    provenance: {
      sourcePath: path.relative(repoRoot, sourcePath).split(path.sep).join("/"),
      sourceSha256: sourceHash,
      sourceHeading: `${row.display} — ${row.house}H`,
      generation: "deterministic-markdown-parse"
    },
    status: "AUTHOR_FINAL"
  };
  return {
    file: path.join(outputDir, `${id}.json`),
    serialized: `${JSON.stringify(json, null, 2)}\n`
  };
});

const drifted = outputs.filter(({ file, serialized }) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== serialized);
if (check) {
  if (drifted.length) {
    console.error(`STALE: ${drifted.length} of ${outputs.length} generated four-body house files differ. Run with --write.`);
    process.exit(1);
  }
  console.log(`Four-body house sources are current: ${outputs.length} files, source sha256 ${sourceHash}.`);
  process.exit(0);
}

if (write) {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const output of outputs) fs.writeFileSync(output.file, output.serialized);
  const present = fs.readdirSync(outputDir).filter((name) => name.endsWith(".json")).length;
  if (present !== outputs.length) throw new Error(`FOUR_BODY_HOUSE_OUTPUT_ROWS_DROPPED: wrote ${present} of ${outputs.length} files.`);
  console.log(`Wrote ${outputs.length} doctrine-only generated house records.`);
} else {
  console.log(`${outputs.length} records modelled; ${drifted.length} differ. Use --write or --check.`);
}
