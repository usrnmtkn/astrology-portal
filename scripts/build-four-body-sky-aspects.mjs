#!/usr/bin/env node
/**
 * Generate the owner-supplied four-body Current Sky exact-aspect records.
 *
 * Markdown is the only prose source of truth. `--import-source` copies the
 * three named Markdown files byte-for-byte from an owner-held directory; JSON
 * is always regenerated from those repository sources.
 *
 * Usage:
 *   node scripts/build-four-body-sky-aspects.mjs --import-source <directory> --write
 *   node scripts/build-four-body-sky-aspects.mjs --write
 *   node scripts/build-four-body-sky-aspects.mjs --check
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { aspectPossibilityForKind } = require("../src/astro-writing/aspectPossibility.cjs");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(repoRoot, "packages/astro-knowledge/sources/authored/four-body/sky-aspects");
const outputDir = path.join(repoRoot, "packages/astro-knowledge/data/points/aspects/sky/four-body-unverified");

export const SOURCE_SPECS = Object.freeze([
  Object.freeze({
    id: "NODE_AXIS_SKY_ASPECTS",
    filename: "TLDR-Sky-Node-Axis-Exact-Aspects-V1.md",
    expectedRows: 60,
    expectedPartners: 10
  }),
  Object.freeze({
    id: "CHIRON_SKY_ASPECTS",
    filename: "TLDR-Sky-Chiron-Exact-Aspects-V1.md",
    expectedRows: 66,
    expectedPartners: 11
  }),
  Object.freeze({
    id: "LILITH_SKY_ASPECTS",
    filename: "TLDR-Sky-Lilith-Exact-Aspects-V1.md",
    expectedRows: 72,
    expectedPartners: 12
  })
]);

const ASPECTS = Object.freeze(["conjunction", "sextile", "square", "trine", "quincunx", "opposition"]);
const FIELD_LABELS = Object.freeze([
  ["Human moment", "humanMoment"],
  ["Development detail", "developmentDetail"],
  ["Planetary dynamic", "planetaryDynamic"],
  ["Aspect mechanic", "aspectMechanic"],
  ["Conditional consequence", "conditionalConsequence"]
]);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonicalBody = (value) => String(value ?? "").trim().toLowerCase().replace(/-/gu, "_");
const posix = (value) => value.split(path.sep).join("/");

function fieldValue(block, label) {
  const labels = FIELD_LABELS.map(([name]) => name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|");
  const pattern = new RegExp(`^${label}:\\n([\\s\\S]*?)(?=^(?:${labels}):\\n|(?![\\s\\S]))`, "mu");
  const match = pattern.exec(block);
  if (!match || !match[1].trim()) throw new Error(`FOUR_BODY_SKY_FIELD_MISSING: '${label}' is absent or empty.`);
  return match[1].trim();
}

export function parseSourceMarkdown(spec, markdown) {
  const blocks = String(markdown).split(/^### /mu).slice(1);
  if (blocks.length !== spec.expectedRows) {
    throw new Error(`${spec.id}_ROWS_SHRANK: found ${blocks.length}; expected exactly ${spec.expectedRows}.`);
  }

  const rows = blocks.map((block) => {
    // A partner-level `##` heading can follow the final entry before the next
    // `###` entry. It is document structure, never part of the preceding
    // Conditional consequence.
    const structuralBoundary = block.search(/^## |^---\s*$/mu);
    const entryBlock = structuralBoundary >= 0 ? block.slice(0, structuralBoundary) : block;
    const newline = entryBlock.indexOf("\n");
    const heading = entryBlock.slice(0, newline).trim();
    const sourceKeyMatch = /^Key: `sky\.([a-z-]+)\.(conjunction|sextile|square|trine|quincunx|opposition)\.([a-z-]+)`$/mu.exec(entryBlock);
    if (!sourceKeyMatch) throw new Error(`${spec.id}_KEY_INVALID: '${heading}' has no valid source key.`);
    const [, rawA, aspect, rawB] = sourceKeyMatch;
    const sourceKey = `sky.${rawA}.${aspect}.${rawB}`;
    const [bodyA, bodyB] = [canonicalBody(rawA), canonicalBody(rawB)].sort();
    const fields = Object.fromEntries(FIELD_LABELS.map(([label, key]) => [key, fieldValue(entryBlock, label)]));
    if (Object.values(fields).some((value) => /^#{1,6}\s/mu.test(value))) {
      throw new Error(`${spec.id}_STRUCTURE_LEAK: '${sourceKey}' captured a Markdown heading as prose.`);
    }
    return { heading, sourceKey, bodyA, bodyB, aspect, ...fields };
  });

  const sourceKeys = new Set(rows.map((row) => row.sourceKey));
  if (sourceKeys.size !== rows.length) {
    throw new Error(`${spec.id}_DUPLICATE_SOURCE_KEYS: found ${rows.length - sourceKeys.size} duplicate key(s).`);
  }
  const canonicalKeys = new Set(rows.map((row) => `${row.bodyA}/${row.bodyB}/${row.aspect}`));
  if (canonicalKeys.size !== rows.length) {
    throw new Error(`${spec.id}_DUPLICATE_CANONICAL_IDS: found ${rows.length - canonicalKeys.size} duplicate identity or identities.`);
  }
  for (const aspect of ASPECTS) {
    const count = rows.filter((row) => row.aspect === aspect).length;
    if (count !== spec.expectedPartners) {
      throw new Error(`${spec.id}_${aspect.toUpperCase()}_ROWS_SHRANK: found ${count}; expected exactly ${spec.expectedPartners}.`);
    }
  }
  return rows;
}

export function validateAstronomy(rows) {
  const accepted = [];
  const rejected = [];
  for (const row of rows) {
    const result = aspectPossibilityForKind("sky", row.bodyA, row.bodyB, row.aspect);
    if (result.possible) accepted.push(row);
    else rejected.push({ row, reason: result.reason, detail: result.detail });
  }
  return { accepted, rejected };
}

function generatedRecord(row, spec, sourcePath, sourceSha256) {
  const canonicalId = `sky-aspect/${row.bodyA}/${row.bodyB}/${row.aspect}`;
  return {
    schemaVersion: 1,
    id: row.sourceKey,
    canonicalId,
    kind: "sky-aspect",
    bodyA: row.bodyA,
    bodyB: row.bodyB,
    aspect: row.aspect,
    humanMoment: row.humanMoment,
    developmentDetail: row.developmentDetail,
    planetaryDynamic: row.planetaryDynamic,
    aspectMechanic: row.aspectMechanic,
    conditionalConsequence: row.conditionalConsequence,
    body: [row.humanMoment, row.developmentDetail, row.planetaryDynamic, row.aspectMechanic, row.conditionalConsequence].join("\n\n"),
    authorityClass: "unverified",
    governanceState: "needs-owner-decision",
    surfacePermission: ["doctrine-only"],
    usage: "mechanism-reference",
    framingAllowed: false,
    provenance: {
      sourcePath: posix(path.relative(repoRoot, sourcePath)),
      sourceSha256,
      sourceKey: row.sourceKey,
      sourceHeading: row.heading,
      sourceSet: spec.id,
      generation: "deterministic-markdown-parse"
    },
    status: "NEEDS_OWNER_DECISION"
  };
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const check = args.includes("--check");
  const importRoot = valueAfter(args, "--import-source");
  if (write && check) throw new Error("Use --write or --check, not both.");
  if (importRoot && !write) throw new Error("--import-source requires --write.");

  if (importRoot) {
    fs.mkdirSync(sourceDir, { recursive: true });
    for (const spec of SOURCE_SPECS) {
      const externalPath = path.resolve(importRoot, spec.filename);
      const bytes = fs.readFileSync(externalPath);
      parseSourceMarkdown(spec, bytes.toString("utf8"));
      fs.writeFileSync(path.join(sourceDir, spec.filename), bytes);
      console.log(`Imported ${spec.filename} byte-for-byte (${bytes.length} bytes, sha256 ${sha256(bytes)}).`);
    }
  }

  const outputs = [];
  const rejected = [];
  const counts = {};
  for (const spec of SOURCE_SPECS) {
    const sourcePath = path.join(sourceDir, spec.filename);
    if (!fs.existsSync(sourcePath)) throw new Error(`${spec.id}_SOURCE_MISSING: ${sourcePath}`);
    const markdown = fs.readFileSync(sourcePath, "utf8");
    const validated = validateAstronomy(parseSourceMarkdown(spec, markdown));
    counts[spec.id] = { parsed: validated.accepted.length + validated.rejected.length, accepted: validated.accepted.length, rejected: validated.rejected.length };
    rejected.push(...validated.rejected.map((entry) => ({ ...entry, sourceSet: spec.id })));
    for (const row of validated.accepted) {
      const record = generatedRecord(row, spec, sourcePath, sha256(markdown));
      outputs.push({
        file: path.join(outputDir, `${row.bodyA}-${row.bodyB}-${row.aspect}.json`),
        serialized: `${JSON.stringify(record, null, 2)}\n`
      });
    }
  }

  const outputNames = new Set(outputs.map(({ file }) => path.basename(file)));
  const existingNames = fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir).filter((name) => name.endsWith(".json"))
    : [];
  const orphans = existingNames.filter((name) => !outputNames.has(name));
  const drifted = outputs.filter(({ file, serialized }) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== serialized);

  if (check) {
    if (rejected.length) {
      console.error(`FOUR_BODY_SKY_ASTRONOMY_REJECTED: ${rejected.length} source record(s) are physically impossible.`);
      process.exit(1);
    }
    if (orphans.length || drifted.length) {
      console.error(`STALE: ${drifted.length} generated files differ and ${orphans.length} orphaned files remain.`);
      process.exit(1);
    }
    console.log(`Four-body sky-aspect sources are current: ${outputs.length} files; astronomy rejected 0.`);
    console.log(JSON.stringify(counts));
    return;
  }

  if (write) {
    if (rejected.length) {
      console.error(JSON.stringify(rejected.map(({ row, reason, detail, sourceSet }) => ({ sourceSet, sourceKey: row.sourceKey, reason, detail })), null, 2));
      throw new Error(`FOUR_BODY_SKY_ASTRONOMY_REJECTED: refused ${rejected.length} physically impossible source record(s).`);
    }
    fs.mkdirSync(outputDir, { recursive: true });
    for (const output of outputs) fs.writeFileSync(output.file, output.serialized);
    for (const orphan of orphans) fs.rmSync(path.join(outputDir, orphan));
    console.log(`Wrote ${outputs.length} doctrine-only, unverified sky-aspect records; astronomy rejected 0.`);
    console.log(JSON.stringify(counts));
    return;
  }

  console.log(`${outputs.length} records modelled; ${drifted.length} differ; ${orphans.length} orphans; ${rejected.length} astronomy rejection(s). Use --write or --check.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
