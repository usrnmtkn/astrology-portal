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
const correctionsPath = "packages/astro-knowledge/review/lunation-card-assembly-v1/source/recovered-lunation-copy-corrections-v1.json";
const sourceText = fs.readFileSync(path.join(repoRoot, sourcePath), "utf8");
const source = JSON.parse(sourceText);
const sections = readJson(sectionsPath);
const madlib = readJson(madlibPath);
const cards = readJson(cardsPath);
const corrections = readJson(correctionsPath);
const sourceByKey = new Map(source.entries.map((entry) => [entry.contentKey, entry]));
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

assert.equal(source.status, "owner-approved serving copy");
assert.equal(source.count, 288);
assert.equal(source.entries.length, 288);
assert.equal(cards.schema, "lunation-book-cards/v1");
assert.equal(cards.count, 288);
assert.equal(cards.authoredCards.length, 288);
assert.equal(cards.source_artifact, sourcePath);
assert.equal(cards.source_sha256, sha256(sourceText));
assert.equal(new Set(cards.authoredCards.map((card) => card.contentKey)).size, 288);
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
  assert.equal(
    card.approval.recordPath,
    entry.recoveredFrom?.correctionRecord ?? "packages/astro-knowledge/review/lunation-card-assembly-v1/spec.md",
  );
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
assert.deepEqual(missing, []);
assert.ok(tuples.has("new-moon/taurus/aries"));
assert.ok(tuples.has("full-moon/aquarius/virgo"));
assert.ok(!missing.includes("new-moon/aquarius/virgo"), "Recovered Aquarius/Virgo/6 entry must serve.");

const manuscriptRecoveries = source.entries.filter((entry) => (
  entry.recoveredFrom?.correctionRecord === correctionsPath
));
assert.equal(manuscriptRecoveries.length, 22);
assert.equal(corrections.schema, "recovered-lunation-copy-corrections/v1");
assert.equal(corrections.status, "owner-approved serving correction record");
assert.equal(corrections.count, 22);
assert.equal(corrections.entries.length, 22);
assert.equal(corrections.entries.reduce((sum, entry) => sum + entry.correctionCount, 0), 127);
assert.deepEqual(corrections.approval, {
  approvalLevel: "exact_owner_approved",
  approvalStatement: "I approve the 22 corrected lunation passages in recovered-lunation-copy-corrections-v1.json for live serving.",
  ownerConfirmationSource: {
    channel: "Codex task owner message",
    taskId: "019fd6db-eb3c-7ae1-92c1-a9d00a46269a",
    date: "2026-08-24",
  },
  ownerApproved: true,
  promotionAuthorized: true,
  servingAuthorized: true,
});
for (const entry of manuscriptRecoveries) {
  const card = cards.authoredCards.find((candidate) => candidate.contentKey === entry.contentKey);
  assert.deepEqual(card?.source_provenance, entry.recoveredFrom);
  assert.equal(card?.approval.recordPath, correctionsPath);
  assert.equal(card?.approval.approvalStatement, corrections.approval.approvalStatement);
  assert.deepEqual(card?.approval.ownerConfirmationSource, corrections.approval.ownerConfirmationSource);
  assert.equal(card?.approval.servingAuthorized, true);
  const correction = corrections.entries.find((candidate) => candidate.contentKey === entry.contentKey);
  assert.ok(correction, `${entry.contentKey}: correction record missing`);
  assert.match(correction.originalBodySha256, /^[a-f0-9]{64}$/u);
  assert.equal(correction.correctedBodySha256, sha256(entry.body));
  assert.notEqual(correction.originalBodySha256, correction.correctedBodySha256);
  assert.ok(correction.correctionCount > 0);
  const lunationSignMentions = [...entry.body.matchAll(
    /\b(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces) (?:new|full) moon\b/giu,
  )].map((match) => match[1].toLowerCase());
  assert.ok(
    lunationSignMentions.every((sign) => sign === entry.lunationSign),
    `${entry.contentKey}: body contains a mismatched lunation sign`,
  );
  const houseMentions = [...entry.body.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)? house\b/giu)]
    .map((match) => Number(match[1]));
  assert.ok(
    houseMentions.every((house) => house === entry.house),
    `${entry.contentKey}: body contains a mismatched house`,
  );
  assert.doesNotMatch(
    entry.body,
    /this Aries new moon|Cancer, Luna is your ruler|When the full moon is in the 8th house|gave your comment|Evolutionary,|You may haven't|giving to much|morning the loss|The new moon the 4th house/u,
    `${entry.contentKey}: known recovered-copy defect returned`,
  );
}

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

console.log("lunation book cards passed: 288 cells, zero gaps, 22 manuscript recoveries with 127 owner-directed corrections, 645 typed sections, 12 house/sign tables, deferred runtime partition");
