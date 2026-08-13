#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const reviewDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(reviewDir, "../../../..");
const packagePath = "/Users/mprez/.codex/attachments/35eba5e8-13b6-4a5a-b768-25c2263ae11b/pasted-text.txt";
const sourcePackage = fs.readFileSync(packagePath, "utf8");
const sourceAmendment = fs.readFileSync(path.join(reviewDir, "OWNER-STRUCTURAL-UPDATE-2026-08-12.md"), "utf8");
const directAddressAmendment = fs.readFileSync(path.join(reviewDir, "OWNER-DIRECT-ADDRESS-UPDATE-2026-08-12.md"), "utf8");

const candidate = JSON.parse(fs.readFileSync(path.join(reviewDir, "candidate.json"), "utf8"));
assert.equal(candidate.reviewStatus, "needs_review");
assert.equal(candidate.ownerApproved, false);
assert.equal(candidate.promotionAuthorized, false);
assert.equal(candidate.canonical, false);
assert.equal(candidate.generationEvidenceAuthorized, false);
assert.equal(candidate.servingAuthorized, false);
assert.equal(candidate.apiCalls, 0);
assert.equal(candidate.aspectReplacementCandidate.reviewStatus, "needs_review");
assert.equal(candidate.aspectReplacementCandidate.ownerApproved, false);
assert.equal(candidate.aspectReplacementCandidate.servingAuthorized, false);

const resolveEngineDates = (value) => value
  .replaceAll("{{priorSign}}", "Sagittarius")
  .replaceAll("{{priorSignEntryDateWithYear}}", "October 31, 2044")
  .replaceAll("{{priorSignExitDateWithYear}}", "January 24, 2047")
  .replaceAll("{{previousResidencyEntryDateWithYear}}", "December 20, 2017")
  .replaceAll("{{previousResidencyExitDateWithYear}}", "December 17, 2020");

const sourceParagraphs = [
  candidate.planetEducation.body,
  ...candidate.article.opening.split("\n\n"),
  ...candidate.article.tension.split("\n\n"),
  candidate.article.development,
  candidate.article.era_layer.frame,
  resolveEngineDates(candidate.article.era_layer.handoff),
  ...resolveEngineDates(candidate.article.era_layer.recurrence).split("\n\n"),
  candidate.article.era_layer.collective_lesson,
  candidate.article.close
];
assert.equal(sourceParagraphs.length, 15, "The final editorial article must contain 15 paragraphs.");
for (const [index, paragraph] of sourceParagraphs.entries()) {
  if (index === 12) {
    const [unchangedHistory, revisedHistoryEnding] = paragraph.split("The events are different,");
    assert(sourcePackage.includes(unchangedHistory.trim()), "The older-history body before the final sentences must remain byte-identical.");
    assert(directAddressAmendment.includes(`The events are different,${revisedHistoryEnding}`), "The revised history ending must match the owner direction exactly.");
    continue;
  }
  const source = index === 0 || index === 11
    ? sourceAmendment
    : [3, 5, 6, 8].includes(index)
      ? directAddressAmendment
      : sourcePackage;
  assert(source.includes(paragraph), `Paragraph ${index + 1} must be byte-identical to its latest owner source.`);
}
assert(sourcePackage.includes(candidate.aspectReplacementCandidate.body), "The Venus trine Saturn candidate must match the owner direction exactly.");
assert.equal(candidate.mechanicalPlaceholderConversions.length, 2);

const recurrence = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "packages/astro-knowledge/data/sky-placement-recurrence-library.json"),
  "utf8"
));
const saturnEntries = recurrence.entries.filter(({ planet, sign }) => planet === "saturn" && sign === "capricorn");
assert.equal(saturnEntries.length, 2);
assert.equal(saturnEntries[0].ownerVerbatimWithDates, sourceParagraphs[11]);
assert.equal(saturnEntries[1].body, sourceParagraphs[12]);
for (const entry of saturnEntries) {
  assert.equal(entry.reviewStatus, "needs_review");
  assert.equal(entry.ownerApproved, false);
  assert.equal(entry.renderEligible, false);
}

const preview = fs.readFileSync(path.join(reviewDir, "RENDERED-PREVIEW.md"), "utf8");
const renderedArticle = sourceParagraphs.join("\n\n");
assert(preview.includes(renderedArticle), "The preview must contain all 15 final paragraphs in exact order.");
assert(preview.includes(candidate.aspectReplacementCandidate.body), "The preview must contain the exact Venus trine Saturn candidate.");
assert(!preview.includes("No specific approved write-up is available."), "Missing aspect write-ups must not add generic prose.");
assert(preview.includes("### Saturn trine Uranus\n\n**0° orb**"));
assert(preview.includes("### Saturn trine Mercury\n\n**0.5° orb**"));

const standingLaw = `Inheritable architecture, in order, optional layers used only when earned:
planet education; occult or traditional portrait; planetary condition or
dignity when relevant; symbol or mythology when it interprets the mechanism;
the job of the transit; cultural or collective thesis; lived evidence; failure
mechanism; practical strategic bias; power, cost, or consequence; previous-sign
handoff; immediate historical recurrence; older historical analogs when
source-supported and useful; current-sky modifier when another slow planet or
defining aspect materially changes the story; collective test; final thesis.

CRITICAL INHERITANCE RULE: future slow-mover articles inherit the
ARCHITECTURE, never this article's subject matter. Do not inherit
Capricorn-specific nouns or arguments. Future articles must not automatically
become essays about invisible work, backups, handoffs, one person carrying the
system, hierarchy, overfunctioning, or institutional failure. Each planet-sign
combination generates its own cultural rule, lived scenes, failure point, and
practical consequence.

Standing questions each slow-mover article must answer internally:
- Planetary condition: how comfortable or constrained is this planet in this
  sign, and what does that change about how directly its nature can operate?
  Technical dignity vocabulary appears in reader copy only when it genuinely
  helps.
- Mythology and symbolism: allowed when it interprets, banned when it
  decorates. A myth, symbol, deity, or occult correspondence must explain
  something the reader would understand less clearly without it.
- Strategic bias: what kind of move fits this placement, and what kind does it
  expose as weak, mistimed, or unsustainable? (Saturn in Capricorn:
  reinforcement before expansion.)
- The job: every article must be able to finish "The job of this transit
  is..." in plain language.`;
const historicalLaw = `Historical recurrence is pattern recognition, never causal proof; never imply
Saturn caused these events. Older recurrences must earn their place by
advancing the placement thesis. Do not reduce history to vague language such
as "major structural resets"; give enough detail that the reader understands
what was changing. Preserve source provenance internally in the recurrence
library. No visible "according to AC" attribution in reader copy; reader-facing
sourcing stays clean unless a separate product-level citation convention
requires otherwise.`;
const skyPageAddress = `SKY PAGE ADDRESS (owner ruling 2026-08-12): sky placement
pages speak TO the reader. Direct address ("you") is allowed and wanted.
NOT wanted: breaking the fourth wall, no narrator commentary about the
writing itself, no "I'll be honest with you," no meta-asides about writing
a transit. The voice addresses the reader's life, never the page's making.
Third-person observation stays available for lived scenes; the two mix as
the writing needs. This supersedes third-person-only for collective sky
placement pages.`;
assert(sourcePackage.includes(standingLaw));
assert(sourcePackage.includes(historicalLaw));
assert(directAddressAmendment.includes(skyPageAddress));
for (const relativePath of [
  "docs/writing/ASTROLOGY_CONTRACT.md",
  "docs/writing/LITERAL_LANGUAGE_RULES.md",
  "packages/astro-knowledge/review/writing-harness-v1/TLDR-Horoscope-Template-Canonical.md"
]) {
  const mirror = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  assert(mirror.includes(standingLaw), `${relativePath} must contain the final standing law verbatim.`);
  assert(mirror.includes(historicalLaw), `${relativePath} must contain the historical law verbatim.`);
  assert(mirror.includes(skyPageAddress), `${relativePath} must contain the Sky Page address ruling verbatim.`);
}

const fixturePath = "/Users/mprez/Downloads/Resources/TLDR-Register-Gold-SaturnAries.jsonl";
const fixtureRows = (value) => value.trim().split("\n").map((line) => JSON.parse(line));
const suppliedFixtures = fixtureRows(fs.readFileSync(fixturePath, "utf8"));
const landedFixtures = fixtureRows(fs.readFileSync(
  path.join(repoRoot, "data/writing/SKY_PAGE_REGISTER_GOLD_SATURN_ARIES.jsonl"),
  "utf8"
));
assert.deepEqual(landedFixtures, suppliedFixtures, "The seven register-gold fixtures must preserve the supplied JSON values exactly.");
assert.equal(landedFixtures.length, 7);

const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
console.log(JSON.stringify({
  status: "PASS",
  sourceArticleParagraphs: sourceParagraphs.length,
  sourceArticleSha256: digest(renderedArticle),
  candidateState: "needs_review_non_serving",
  mechanicalPlaceholderConversions: 2,
  recurrenceEntries: 2,
  canonicalMirrorsVerified: 3,
  registerGoldFixtures: 7,
  aspectReplacementState: "needs_review_non_serving",
  genericAspectSubstitutions: 0,
  billedCalls: 0
}, null, 2));
