#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  renderNatalPlacement,
  SourceGapError,
  vocabularyBodyForVoice as nodeVocabularyBodyForVoice
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import {
  createFallbackRenderer,
  SourceGapError as BrowserSourceGapError,
  vocabularyBodyForVoice as browserVocabularyBodyForVoice
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";

const packageRoot = "apps/web/src/content/fallbackArchitectureV3";
const readJson = (relativePath) => JSON.parse(fs.readFileSync(`${packageRoot}/${relativePath}`, "utf8"));
const source = readJson("source-rows/fallback-source-rows-v3.json");
const templates = readJson("templates/fallback-templates-v3.json");
const interim = readJson("source-rows/placement-interim-fixes-v1.json");
const SECOND_PERSON = /\b(?:you|your|yours|yourself|yourselves|you're|you've|you'll)\b/iu;
const stripSlots = (text) => String(text ?? "").replace(/\{\{[^}]+\}\}/gu, "");
const hasSecondPerson = (text) => SECOND_PERSON.test(stripSlots(text));

const secondPersonVocabulary = source.vocabularyRows.filter((row) => hasSecondPerson(row.body));
const auditedSecondPersonVocabulary = secondPersonVocabulary.filter((row) => (
  !row.contentKey.startsWith("fallback-vocab/empty-house-ruler-jurisdiction/")
));

assert.equal(
  auditedSecondPersonVocabulary.length,
  40,
  "The audited friend fail-closed baseline must continue to cover all 40 known second-person vocabulary slots."
);
assert.equal(
  secondPersonVocabulary.length,
  41,
  "The current source also includes one separately governed V14 row; review this inventory before updating the tripwire."
);
assert.equal(source.vocabularyRows[109].contentKey, "fallback-vocab/planet-excess/sun");
assert.match(source.vocabularyRows[109].body, /you matter/u);

for (const row of secondPersonVocabulary) {
  assert.equal(nodeVocabularyBodyForVoice(row, "they"), null, `${row.contentKey}: Node resolver admitted second-person vocabulary into they voice.`);
  assert.equal(browserVocabularyBodyForVoice(row, "they"), null, `${row.contentKey}: browser resolver admitted second-person vocabulary into they voice.`);
  assert.equal(nodeVocabularyBodyForVoice(row, "you"), row.body, `${row.contentKey}: Node You copy changed.`);
  assert.equal(browserVocabularyBodyForVoice(row, "you"), row.body, `${row.contentKey}: browser You copy changed.`);
}

const safeTheyCandidate = {
  contentKey: "fallback-vocab/test/safe-they",
  content_role: "vocabulary",
  grammar_frame: "noun_phrase",
  body_they: "confidence without needing attention",
  review_status: "needs_review"
};
assert.equal(nodeVocabularyBodyForVoice(safeTheyCandidate, "they"), safeTheyCandidate.body_they);
assert.equal(browserVocabularyBodyForVoice(safeTheyCandidate, "they"), safeTheyCandidate.body_they);

const browserRenderer = createFallbackRenderer(
  { templates: [...templates.templates, ...interim.templates] },
  {
    vocabularyRows: [...source.vocabularyRows, ...interim.vocabularyRows],
    hookRows: source.hookRows.filter((row) => row.reader_only !== true)
  }
);
const sunInLeo = { planet: "sun", sign: "leo", house: 1, voice: "Evergreen" };

assert.throws(() => renderNatalPlacement(sunInLeo), SourceGapError, "Node friend composition must return SOURCE_GAP instead of rendering vocabularyRows[109].");
assert.throws(() => browserRenderer.renderNatalPlacement(sunInLeo), BrowserSourceGapError, "Browser friend composition must return SOURCE_GAP instead of rendering vocabularyRows[109].");

const youSunInLeo = browserRenderer.renderNatalPlacement({ planet: "sun", sign: "leo", voice: "you" });
assert.match(youSunInLeo.body, /spotlight to feel like you matter/u, "The approved You copy must remain intact in composition.");

console.log("Friend natal pronoun contract passed: 40 audited second-person vocabulary slots plus the V14 row fail closed in they voice; You copy is unchanged.");
