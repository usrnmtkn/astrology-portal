#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const reviewDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(reviewDir, "../../../..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");

const candidate = readJson("packages/astro-knowledge/review/saturn-capricorn-article-v3/candidate.json");
const sourceRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json");
const aspectRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json");
const recurrence = readJson("packages/astro-knowledge/data/sky-placement-recurrence-library.json");
const preview = fs.readFileSync(path.join(reviewDir, "RENDERED-PREVIEW.md"), "utf8");
const approval = fs.readFileSync(path.join(reviewDir, "OWNER-APPROVAL-2026-08-13.md"), "utf8");

assert.equal(candidate.reviewStatus, "approved");
assert.equal(candidate.ownerApproved, true);
assert.equal(candidate.promotionAuthorized, true);
assert.equal(candidate.servingAuthorized, true);
assert.equal(candidate.apiCalls, 0);
assert.match(approval, /^Owner approval: the Saturn in Capricorn rendered page is approved at exact\nwording\./u);

const articleParagraphs = [
  ...candidate.article.opening.split("\n\n"),
  ...candidate.article.tension.split("\n\n"),
  candidate.article.development,
  candidate.article.era_layer.frame,
  candidate.article.era_layer.handoff,
  ...candidate.article.era_layer.recurrence.split("\n\n"),
  candidate.article.era_layer.collective_lesson,
  candidate.article.close
];
assert.equal(articleParagraphs.length, 13, "The approved sign article must contain thirteen paragraphs after its separate standing planet block.");

const planetRow = sourceRows.rows.find(({ contentKey }) => contentKey === "fallback-hook/sky-planet-education/saturn");
const articleRow = sourceRows.rows.find(({ contentKey }) => contentKey === candidate.contentKey);
assert.ok(planetRow);
assert.ok(articleRow);
assert.equal(planetRow.review_status, "approved");
assert.equal(planetRow.body, candidate.planetEducation.body);
assert.equal(articleRow.review_status, "approved");
for (const field of ["fact_line", "aspect_insert", "opening", "tension", "development", "close"]) {
  assert.equal(articleRow[field], candidate.article[field], `${field} must remain byte-identical to the approved candidate.`);
}
assert.deepEqual(articleRow.era_layer, candidate.article.era_layer);

const renderedArticle = [candidate.planetEducation.body, ...articleParagraphs]
  .join("\n\n")
  .replaceAll("{{priorSign}}", "Sagittarius")
  .replaceAll("{{priorSignEntryDateWithYear}}", "October 31, 2044")
  .replaceAll("{{priorSignExitDateWithYear}}", "January 24, 2047")
  .replaceAll("{{previousResidencyEntryDateWithYear}}", "December 20, 2017")
  .replaceAll("{{previousResidencyExitDateWithYear}}", "December 17, 2020");
assert(preview.includes(renderedArticle), "The approved rendered preview must contain all fourteen prose paragraphs, including the separate standing planet block, byte-for-byte.");

const aspectRow = aspectRows.hookRows.find(({ contentKey }) => contentKey === candidate.aspectReplacementCandidate.contentKey);
assert.ok(aspectRow);
assert.equal(aspectRow.review_status, "approved");
assert.equal(aspectRow.body_you, candidate.aspectReplacementCandidate.body);
assert.equal(aspectRow.body_they, candidate.aspectReplacementCandidate.body);

const forbiddenAspectPatterns = [
  /^fallback-hook\/sky-aspect-sign\/saturn\/capricorn\/trine\/(?:uranus|mercury)\//u,
  /^fallback-hook\/sky-aspect-sign\/(?:uranus|mercury)\/[^/]+\/trine\/saturn\/capricorn$/u
];
for (const row of aspectRows.hookRows) {
  assert.equal(
    forbiddenAspectPatterns.some((pattern) => pattern.test(row.contentKey)),
    false,
    `${row.contentKey} must remain fail-closed without interpretive copy.`
  );
}
assert(preview.includes("### Saturn trine Uranus\n\n**0° orb**"));
assert(preview.includes("### Saturn trine Mercury\n\n**0.5° orb**"));
assert(!preview.includes("No specific approved write-up is available."));

const recurrenceRows = recurrence.entries.filter(({ planet, sign }) => planet === "saturn" && sign === "capricorn");
assert.equal(recurrenceRows.length, 2);
assert.equal(recurrenceRows[0].body, candidate.article.era_layer.recurrence.split("\n\n")[0]);
assert.equal(recurrenceRows[1].body, candidate.article.era_layer.recurrence.split("\n\n")[1]);
for (const row of recurrenceRows) {
  assert.equal(row.reviewStatus, "approved");
  assert.equal(row.ownerApproved, true);
  assert.equal(row.renderEligible, true);
}

console.log(JSON.stringify({
  status: "PASS",
  renderedProseParagraphs: articleParagraphs.length + 1,
  signArticleParagraphs: articleParagraphs.length,
  standingPlanetBlocks: 1,
  renderedPageSha256: digest(`${renderedArticle}\n`),
  venusTrineSaturnSha256: digest(`${candidate.aspectReplacementCandidate.body}\n`),
  recurrenceEntries: recurrenceRows.length,
  forbiddenAspectInterpretations: 0,
  approvalRecord: "OWNER-APPROVAL-2026-08-13.md"
}, null, 2));
