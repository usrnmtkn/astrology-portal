#!/usr/bin/env node
/**
 * Generator for the 120 transit-house files.
 *
 * These files were bulk-committed with no producing script, so the two
 * ungrammatical verb frames they shipped with had to be corrected by hand in
 * 24 files. This restores the missing producer: the grammatical frames now
 * live in exactly one place, in transit-house-parts.json, and a frame
 * correction regenerates all 120 files.
 *
 * The parts were reverse-engineered from the corrected files and this
 * generator reproduces them byte-for-byte, so adopting it changes nothing
 * today and makes the next fix a one-line change.
 *
 * Usage:
 *   node scripts/build-transit-house-files.mjs            report only
 *   node scripts/build-transit-house-files.mjs --check     fail if files drift from the parts
 *   node scripts/build-transit-house-files.mjs --write     regenerate
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const partsPath = path.join(repoRoot, "packages/astro-knowledge/data/generators/transit-house-parts.json");
const outDir = path.join(repoRoot, "packages/astro-knowledge/data/transits/house");

const args = process.argv.slice(2);
const write = args.includes("--write");
const check = args.includes("--check");

const ORDINAL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th", 8: "8th", 9: "9th", 10: "10th", 11: "11th", 12: "12th" };

const parts = JSON.parse(fs.readFileSync(partsPath, "utf8"));

/**
 * One file. Every grammatical frame is a parts lookup; nothing is inlined here,
 * so this function never needs editing to fix wording.
 */
function build(planetKey, houseNumber) {
  const p = parts.planets[planetKey];
  const h = parts.houses[String(houseNumber)];
  const ord = ORDINAL[houseNumber];
  const sentenceCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const opening = `When ${p.display} moves through your ${ord} house, ${p.openPrefix}${h.domainLong}${p.openSuffix}.`;
  const body = [
    `${opening} ${h.notice}`,
    p.mechanism,
    h.useful,
    `${p.caution} ${h.risk}`,
    p.closing
  ].join("\n\n");

  return {
    id: `${planetKey}-${houseNumber}`,
    kind: "house",
    transiting: planetKey,
    house: houseNumber,
    tldr: `${sentenceCase(p.display)} through the ${ord} house ${p.tldrVerb} ${h.domainShort}.`,
    body,
    business: `${p.help} ${h.usefulFor}`,
    shadow: `${p.cautionBare} ${h.risk}`,
    advice: `${p.advice} ${h.usefulFor}`,
    source: parts.sources[`${planetKey}-${houseNumber}`],
    voiceNeutral: true,
    status: "REVIEWED"
  };
}

const planetKeys = Object.keys(parts.planets);
const results = [];
for (const planetKey of planetKeys) {
  for (let house = 1; house <= 12; house += 1) {
    const file = path.join(outDir, `${planetKey}-${house}.json`);
    const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
    const next = build(planetKey, house);
    const serialized = `${JSON.stringify(next, null, 2)}\n`;
    const current = existing ? `${JSON.stringify(existing, null, 2)}\n` : null;
    results.push({ file, planetKey, house, serialized, matches: current === serialized, existed: Boolean(existing) });
  }
}

// Files on disk that the parts no longer produce. Comparing only generated
// candidates against disk would miss these: delete a planet from the parts and
// its 12 files keep serving stale content while --check still exits 0.
const expected = new Set(results.map((r) => path.basename(r.file)));
const orphans = fs.readdirSync(outDir)
  .filter((name) => name.endsWith(".json") && !expected.has(name))
  .sort();

const drifted = results.filter((r) => !r.matches);
console.log(`${results.length} files modelled from ${planetKeys.length} planet frames and ${Object.keys(parts.houses).length} house domains`);
console.log(`  reproduce current content exactly: ${results.length - drifted.length}`);
console.log(`  differ: ${drifted.length}`);
for (const d of drifted.slice(0, 5)) console.log(`    ${path.basename(d.file)}`);
if (drifted.length > 5) console.log(`    ...and ${drifted.length - 5} more`);

if (orphans.length) {
  console.log(`  orphaned on disk (no longer produced by the parts): ${orphans.length}`);
  for (const name of orphans.slice(0, 5)) console.log(`    ${name}`);
}

if (check) {
  if (drifted.length || orphans.length) {
    console.error(`\nSTALE: ${drifted.length} file(s) differ from the parts, ${orphans.length} orphaned. Re-run with --write.`);
    process.exit(1);
  }
  // Report the real count, not a hardcoded one — the message must go wrong when
  // the parts do.
  console.log(`\nAll ${results.length} files match the parts, no orphans.`);
  process.exit(0);
}

if (write) {
  for (const r of results) fs.writeFileSync(r.file, r.serialized);
  console.log(`\nWrote ${results.length} files.`);
} else {
  console.log("\nDry run. Re-run with --write to regenerate, or --check to fail on drift.");
}
