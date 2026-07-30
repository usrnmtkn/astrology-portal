import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const approved = process.argv.includes("--approve");
const reviewStatus = approved ? "approved" : "needs_review";
assert.ok(
  sourcePath,
  "Usage: node scripts/import-sky-sign-copy.mjs /absolute/path/to/TLDR-Sky-Sign-Copy-{Planet}-Batch-REVIEW.md [--approve]"
);

const source = fs.readFileSync(sourcePath, "utf8");
const sourceName = path.basename(sourcePath);
const sectionPattern = /^## sky-sign-copy\/([a-z-]+)\/([a-z-]+)\n\n([\s\S]*?)(?=\n## sky-sign-copy\/|\n---\n\n## Status)/gmu;
const matches = [...source.matchAll(sectionPattern)];
assert.equal(matches.length, 12, "A sign-copy batch must contain exactly 12 sign units.");

const planets = new Set(matches.map((match) => match[1]));
assert.equal(planets.size, 1, "A sign-copy batch must contain one planet.");
const planet = [...planets][0];
const signs = new Set(matches.map((match) => match[2]));
assert.equal(signs.size, 12, "A sign-copy batch must contain 12 distinct signs.");

const rows = matches.map(([, rowPlanet, sign, body]) => ({
  contentKey: `fallback-hook/sky-sign-copy/${rowPlanet}/${sign}`,
  content_role: "fallback_hook",
  grammar_frame: "complete_sentence",
  body_you: body.trim(),
  body_they: body.trim(),
  review_status: reviewStatus,
  ...(approved ? { approved_via: "owner approval, chat 2026-07-29" } : {}),
  source_keys: [sourceName],
  note: "Sky article planet-in-sign modules 4-6 plus the sign-specific close."
}));

const outputPath = path.join(
  repoRoot,
  `apps/web/src/content/fallbackArchitectureV3/source-rows/sky-sign-copy-${planet}-v1.json`
);
const output = {
  schema: "tldrastro-sky-sign-copy-v1",
  version: "1.0.0",
  planet,
  rows
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${rows.length} ${reviewStatus} ${planet} sign-copy units.`);
