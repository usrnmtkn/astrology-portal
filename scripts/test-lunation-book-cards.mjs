#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const sourcePath = "packages/astro-knowledge/review/lunation-card-assembly-v1/source/ritual-and-the-moon-lunation-horoscopes-v1.json";
const sectionsPath = "packages/astro-knowledge/review/lunation-card-assembly-v1/source/book-sections-v1.json";
const madlibPath = "packages/astro-knowledge/review/lunation-card-assembly-v1/source/horoscope-madlib-v1.json";
const cardsPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-book-cards-v1.json";
const sourceText = fs.readFileSync(path.join(repoRoot, sourcePath), "utf8");
const source = JSON.parse(sourceText);
const sections = readJson(sectionsPath);
const madlib = readJson(madlibPath);
const cards = readJson(cardsPath);
const sourceByKey = new Map(source.entries.map((entry) => [entry.contentKey, entry]));
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

assert.equal(source.status, "owner-approved serving copy");
assert.equal(source.count, 266);
assert.equal(source.entries.length, 266);
assert.equal(cards.schema, "lunation-book-cards/v1");
assert.equal(cards.count, 266);
assert.equal(cards.authoredCards.length, 266);
assert.equal(cards.source_artifact, sourcePath);
assert.equal(cards.source_sha256, sha256(sourceText));
assert.equal(new Set(cards.authoredCards.map((card) => card.contentKey)).size, 266);
assert.equal(sections.length, 645);
assert.deepEqual(
  Object.fromEntries([...new Set(sections.map((section) => section.type))].sort().map((type) => [
    type,
    sections.filter((section) => section.type === type).length,
  ])),
  {
    "actions-intentions": 25,
    affirmations: 8,
    horoscope: 339,
    "horoscope-set": 41,
    journaling: 6,
    "light-shadow": 9,
    "polar-axis": 12,
    ritual: 31,
    "ritual-timing": 12,
    tarotscopes: 162,
  },
);
assert.equal(madlib.schema, "horoscope-madlib/v1");
assert.equal(madlib.houses.length, 12);
assert.equal(madlib.signs.length, 12);

for (const card of cards.authoredCards) {
  const entry = sourceByKey.get(card.contentKey);
  assert.ok(entry, `${card.contentKey}: canonical source entry missing`);
  assert.equal(card.body, entry.body, `${card.contentKey}: protected body changed`);
  assert.equal(card.protected_content.body_sha256, sha256(entry.body));
  assert.equal(card.protected_content.char_count, entry.body.length);
  assert.equal(card.review_status, "approved");
  assert.equal(card.owner_authored, true);
  assert.equal(card.approval.recordPath, "packages/astro-knowledge/review/lunation-card-assembly-v1/spec.md");
}

const tuples = new Set(source.entries.map((entry) => (
  `${entry.lunationKind}/${entry.lunationSign}/${entry.risingSign}`
)));
const missing = [];
for (const kind of ["new-moon", "full-moon"]) {
  for (const sign of signs) {
    for (const rising of signs) {
      if (!tuples.has(`${kind}/${sign}/${rising}`)) missing.push(`${kind}/${sign}/${rising}`);
    }
  }
}
assert.equal(missing.length, 22);
assert.ok(missing.includes("new-moon/taurus/aries"));
assert.ok(missing.includes("full-moon/aquarius/virgo"));
assert.ok(!missing.includes("new-moon/aquarius/virgo"), "Recovered Aquarius/Virgo/6 entry must serve.");

const runtimeSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3Runtime.ts"),
  "utf8",
);
assert.match(runtimeSource, /import\("\.\/fallbackArchitectureV3LunationBookBundle"\)/u);
assert.match(
  runtimeSource,
  /mergeReaderBundles\(localLunationBookReaderBundle, dashboardCoreReaderBundle\)/u,
  "An approved Content Studio row must override the local book baseline when both use the same key.",
);
assert.doesNotMatch(
  runtimeSource.split("const snapshotBundle", 1)[0],
  /lunation-book-cards-v1\.json/u,
  "The protected book must remain out of the initial static bundle.",
);
const viteConfig = fs.readFileSync(path.join(repoRoot, "apps/web/vite.config.ts"), "utf8");
assert.match(
  viteConfig,
  /lunation-book-cards-v1\.json[\s\S]*?fallback-content-lunation-book/u,
  "The protected book must keep its own lazy production chunk.",
);

console.log("lunation book cards passed: 266 byte-exact cells, 22 gaps, 645 typed sections, 12 house/sign tables, deferred runtime partition");
