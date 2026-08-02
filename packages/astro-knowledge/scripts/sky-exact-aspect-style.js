"use strict";

const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "..", "sources", "authored", "sky-aspect-owner-style-models-v1.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const OWNER_STYLE_MODELS = source.entries || [];
if (source.status !== "APPROVED" || OWNER_STYLE_MODELS.length !== 10) {
  throw new Error(`Expected ten approved owner Sky style models in ${sourcePath}.`);
}
const byId = new Map(OWNER_STYLE_MODELS.map((entry) => [entry.id, entry.body]));
const VENUS_SQUARE_MARS_MODEL = byId.get("sky.venus.virgo.square.mars.gemini");
const VENUS_SQUARE_LILITH_MODEL = byId.get("sky.venus.virgo.square.lilith.sagittarius");

const vocabularyPath = path.join(__dirname, "..", "sources", "authored", "sky-exact-aspect-owner-vocabulary-v1.json");
const vocabularySource = JSON.parse(fs.readFileSync(vocabularyPath, "utf8"));
const SKY_EXACT_ASPECT_OWNER_VOCABULARY = vocabularySource.terms || [];
const modelIds = new Set(OWNER_STYLE_MODELS.map((entry) => entry.id));
const modelWords = new Set(OWNER_STYLE_MODELS
  .flatMap((entry) => entry.body.toLowerCase().match(/[a-z]+(?:'[a-z]+)*/g) || []));
if (vocabularySource.status !== "DERIVED_FROM_APPROVED_OWNER_COPY"
  || vocabularySource.surface !== "sky-exact-aspect"
  || !vocabularySource.policy?.ownerOnly
  || !vocabularySource.policy?.menuNotQuota
  || vocabularySource.policy?.automaticPass
  || vocabularySource.policy?.phrasesIncluded
  || !SKY_EXACT_ASPECT_OWNER_VOCABULARY.length
  || vocabularySource.sourceIds.some((id) => !modelIds.has(id))
  || SKY_EXACT_ASPECT_OWNER_VOCABULARY.some((term) => !modelWords.has(term))) {
  throw new Error(`Invalid owner-derived Sky exact-aspect vocabulary in ${vocabularyPath}.`);
}

function buildSkyExactAspectVocabularyPrompt() {
  return [
    "OWNER SKY-ASPECT VOCABULARY (derived only from approved owner copy; menu, never quota):",
    `${SKY_EXACT_ASPECT_OWNER_VOCABULARY.join(", ")}.`,
    "Use only the few words that fit the meaning naturally. These are individual-word diction cues, not a template, required-word list, or automatic voice pass."
  ].join("\n");
}

module.exports = {
  OWNER_STYLE_MODELS,
  SKY_EXACT_ASPECT_OWNER_VOCABULARY,
  VENUS_SQUARE_LILITH_MODEL,
  VENUS_SQUARE_MARS_MODEL,
  buildSkyExactAspectVocabularyPrompt
};
