#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  canonicalAstrologyReviewInstructions,
  canonicalAstrologyWritingInstructions,
  HARD_REVISE_FIELDS,
  REVIEW_FIELDS
} from "../src/astro-writing/canonicalInstructions.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payload = {
  CANONICAL_WRITING_INSTRUCTIONS_VERSION,
  canonicalAstrologyReviewInstructions,
  canonicalAstrologyWritingInstructions,
  HARD_REVISE_FIELDS,
  REVIEW_FIELDS
};
fs.writeFileSync(
  path.join(repoRoot, "src/astro-writing/canonicalInstructions.cjs"),
  `// Generated from canonicalInstructions.mjs. Do not edit by hand.\nmodule.exports = ${JSON.stringify(payload, null, 2)};\n`
);
console.log(`Wrote canonical CommonJS instructions ${CANONICAL_WRITING_INSTRUCTIONS_VERSION}.`);
