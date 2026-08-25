#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_REVIEWER_INSTRUCTIONS_VERSION,
  CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  CARD_WRITING_INSTRUCTIONS_VERSION,
  COLD_RENDERED_PROSE_RULE,
  candidateCardAstrologyWritingInstructions,
  canonicalAstrologyReviewInstructions,
  canonicalAstrologyWritingInstructions,
  coldRenderedProseReviewInstructions,
  HARD_REVISE_FIELDS,
  REVIEW_FIELDS
} from "../src/astro-writing/canonicalInstructions.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payload = {
  CANONICAL_REVIEWER_INSTRUCTIONS_VERSION,
  CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  CARD_WRITING_INSTRUCTIONS_VERSION,
  COLD_RENDERED_PROSE_RULE,
  candidateCardAstrologyWritingInstructions,
  canonicalAstrologyReviewInstructions,
  canonicalAstrologyWritingInstructions,
  coldRenderedProseReviewInstructions,
  HARD_REVISE_FIELDS,
  REVIEW_FIELDS
};
fs.writeFileSync(
  path.join(repoRoot, "src/astro-writing/canonicalInstructions.cjs"),
  `// Generated from canonicalInstructions.mjs. Do not edit by hand.\n`
    + `const { renderEffectiveRulesForPrompt } = require("./effectiveRules.cjs");\n`
    + `const payload = ${JSON.stringify(payload, null, 2)};\n`
    + `function effectiveAstrologyWritingInstructions({ surface = "generic", family = "" } = {}) {\n`
    + `  return renderEffectiveRulesForPrompt({ surface, family });\n`
    + `}\n`
    + `function effectiveAstrologyReviewInstructions({ surface = "generic", family = "" } = {}) {\n`
    + "  return `# TLDR ASTRO ADVISORY REVIEW\\n\\nThe owner is the permanent prose judge. You may identify possible issues, but you may not approve, block, rewrite, stage, promote, or serve copy. Every model finding is advisory. Deterministic runtime checks alone enforce factual safety, grammar, placeholder integrity, source licensing, register direction, and unsupported astrology claims. Voice, cadence, screenshot quality, sentence count, may count, opener variety, and structure are advisory.\\n\\n${renderEffectiveRulesForPrompt({ surface, family })}\\n\\nReturn the required structured review JSON. Use nonblocking severity for every model finding. The decision field summarizes your findings for triage only and carries no promotion authority.`;\n"
    + `}\n`
    + `module.exports = { ...payload, effectiveAstrologyReviewInstructions, effectiveAstrologyWritingInstructions };\n`
);
console.log(`Wrote canonical CommonJS instructions ${CANONICAL_WRITING_INSTRUCTIONS_VERSION}.`);
