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
  "Usage: node scripts/import-sky-placement-frame-v3.mjs /absolute/path/to/TLDR-Sky-Placement-Planet-Frames-V2-REVIEW.md [--approve]"
);
const registryPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-article-v1.json"
);
const source = fs.readFileSync(sourcePath, "utf8");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const sourceName = path.basename(sourcePath);
const families = [
  "sky-placement",
  "sky-placement-you",
  "sky-placement-practice"
];
const rows = [];

for (const family of families) {
  const heading = `## ${family}/{planet}`;
  const exactStart = source.indexOf(heading);
  const titledHeading = new RegExp(
    `^## .*\\(\`${family.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\/\\{planet\\}\`\\).*$`,
    "mu"
  ).exec(source);
  const start = exactStart !== -1 ? exactStart : titledHeading?.index ?? -1;
  assert.notEqual(start, -1, `Missing ${heading}`);
  const nextHeading = source.indexOf("\n## ", start + heading.length);
  const block = source.slice(start, nextHeading === -1 ? source.length : nextHeading);
  const legacyMatches = [...block.matchAll(/^\*\*([a-z-]+)\*\* — (.+)$/gmu)];
  const slotTierMatches = [...block.matchAll(/^\* \*\*([a-z-]+):\*\* (.+)$/gmu)];
  const matches = slotTierMatches.length ? slotTierMatches : legacyMatches;
  assert.equal(matches.length, 14, `${family} must contain 14 rows`);

  for (const [, planet, rawBody] of matches) {
    const body = planet === "venus" && family === "sky-placement-you"
      ? rawBody
          .replace("{{exitDate}}—across", "{{exitDate}}: across")
          .replace(/ \[swap:.*\] /u, " ")
      : rawBody;
    rows.push({
      contentKey: `fallback-hook/${family}/${planet}`,
      content_role: "fallback_hook",
      grammar_frame: "complete_sentence",
      body_you: body.trim(),
      body_they: body.trim(),
      review_status: reviewStatus,
      ...(approved ? { approved_via: "owner approval, chat 2026-07-29" } : {}),
      notes: "Sky placement slot-tier frame.",
      source_keys: [sourceName]
    });
  }
}

assert.equal(rows.length, 42);
const literalDate = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4})\b/u;
for (const row of rows) {
  assert.doesNotMatch(row.body_you, literalDate, `${row.contentKey} contains a literal date`);
}

registry.hookRows = rows;
registry.vocabularyRows = registry.vocabularyRows.map((row) => ({
  ...row,
  review_status: reviewStatus,
  ...(approved ? { approved_via: "owner approval, chat 2026-07-29" } : {})
}));
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(
  `Imported ${rows.length} ${reviewStatus} sky placement V3 frame rows and ${registry.vocabularyRows.length} ${reviewStatus} sky vocab rows.`
);
