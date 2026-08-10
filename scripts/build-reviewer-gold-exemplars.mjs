#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("data/writing/owner-approved-examples.jsonl");
const outputPath = path.resolve("src/astro-writing/reviewerGoldExemplars.generated.mjs");
const fixtures = fs.readFileSync(sourcePath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
if (fixtures.length !== 12 || fixtures.some((fixture) => fixture.status !== "owner-locked" || fixture.expected !== "PASS")) {
  throw new Error("Reviewer gold exemplar generation requires exactly 12 owner-locked expected-PASS fixtures.");
}
const block = [
  "# EXACT OWNER-LOCKED PASS EXEMPLARS",
  "",
  "The twelve complete cards below are explicit PASS decisions. They are exact owner-locked wording.",
  "Do not diagnose, revise, or penalize any of these cards when submitted byte-for-byte.",
  "They define how the checks apply in the owner's accepted register; abstract similarity alone does not grant another draft PASS.",
  "",
  ...fixtures.flatMap((fixture) => [
    `## ${fixture.fixture_id}: PASS`,
    `TAGLINE: ${fixture.tagline}`,
    `HOOK: ${fixture.hook}`,
    `LIVED: ${fixture.lived}`,
    `TURN: ${fixture.turn}`,
    ""
  ])
].join("\n").trim();
fs.writeFileSync(outputPath, `// Generated from data/writing/owner-approved-examples.jsonl. Do not edit.\nexport const REVIEWER_GOLD_EXEMPLARS = ${JSON.stringify(block)};\n`);
console.log(`Wrote ${fixtures.length} exact reviewer gold exemplars.`);
