import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
assert.ok(
  sourcePath,
  "Usage: node scripts/import-sky-placement-voice-pass.mjs /absolute/path/to/TLDR-Sky-Placement-Inventories-VoicePass-REVIEW.md"
);

const source = fs.readFileSync(sourcePath, "utf8");
const sourceName = path.basename(sourcePath);
const outputPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-inventories-voice-pass-v1.json"
);
const families = [
  ["sky-placement", "Collective Frame"],
  ["sky-placement-you", "Personal Angle"],
  ["sky-placement-practice", "Practice / Move"]
];
const rows = [];

for (const [family, title] of families) {
  const heading = new RegExp(
    `^## \\d+\\. ${title.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")} \\(\`${family.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\/\\{planet\\}\`\\)$`,
    "mu"
  );
  const headingMatch = heading.exec(source);
  assert.ok(headingMatch, `Missing ${family} section`);
  const start = headingMatch.index + headingMatch[0].length;
  const nextHeading = source.indexOf("\n## ", start);
  const block = source.slice(start, nextHeading === -1 ? source.length : nextHeading);
  const matches = [...block.matchAll(/^\* \*\*([a-z-]+):\*\* (.+)$/gmu)];
  assert.equal(matches.length, 14, `${family} must contain 14 rows`);

  for (const [, planet, rawBody] of matches) {
    const body = rawBody.replace(/^\(kept\)\s+/u, "").trim();
    rows.push({
      contentKey: `fallback-hook/${family}/${planet}`,
      content_role: "fallback_hook",
      grammar_frame: "complete_sentence",
      body_you: body,
      body_they: body,
      review_status: "needs_review",
      source_keys: [sourceName],
      notes: "Review-gated Sky placement slot-tier voice pass; supersedes the approved V3 row only after owner approval."
    });
  }
}

assert.equal(rows.length, 42);
assert.equal(new Set(rows.map((row) => row.contentKey)).size, 42);
const literalDate = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4})\b/u;
for (const row of rows) {
  assert.doesNotMatch(row.body_you, literalDate, `${row.contentKey} contains a literal date`);
  assert.doesNotMatch(row.body_you, /—|--/u, `${row.contentKey} contains forbidden punctuation`);
}

fs.writeFileSync(outputPath, `${JSON.stringify({
  schema: "tldrastro-sky-placement-inventories-voice-pass-v1",
  version: "1.0.0",
  rows
}, null, 2)}\n`);

console.log(`Imported ${rows.length} review-gated Sky placement voice-pass rows.`);
