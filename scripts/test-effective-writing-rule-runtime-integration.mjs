import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  effectiveRulePrompt,
  findingGovernanceTier,
  governedFindingSeverity,
  governValidationResult
} from "../src/astro-writing/effectiveRuleGovernance.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const generate = read("src/astro-writing/generateDraft.mjs");
const revise = read("src/astro-writing/reviseDraft.mjs");
const review = read("src/astro-writing/reviewDraft.mjs");
const pipeline = read("src/astro-writing/runWritingPipeline.mjs");

assert.equal(findingGovernanceTier("grammar_pronoun_case", { surface: "card" }), "blocking");
assert.equal(findingGovernanceTier("placeholder_integrity", { surface: "card" }), "blocking");
assert.equal(findingGovernanceTier("astrology_integrity", { surface: "card" }), "blocking");
assert.equal(findingGovernanceTier("banned_language", { surface: "card" }), "advisory");
assert.equal(findingGovernanceTier("stock_trope", { surface: "card" }), "advisory");
assert.equal(governedFindingSeverity("grammar_pronoun_case", { surface: "card" }), "blocking");
assert.equal(governedFindingSeverity("banned_language", { surface: "card" }), "nonblocking");

const governed = governValidationResult({
  passed: false,
  violations: [
    { category: "grammar_pronoun_case", detail: "bad case" },
    { category: "banned_language", detail: "style signal" }
  ],
  advisories: [{ category: "vocabulary_outside_corpus", detail: "rare" }]
}, { surface: "card", family: "sky-placement" });
assert.equal(governed.passed, false);
assert.deepEqual(governed.violations.map((item) => item.category), ["grammar_pronoun_case"]);
assert.ok(governed.advisories.some((item) => item.category === "banned_language"));
assert.ok(governed.advisories.some((item) => item.category === "vocabulary_outside_corpus"));

const advisoryOnly = governValidationResult({
  passed: false,
  violations: [{ category: "stock_trope", detail: "editorial signal" }],
  advisories: []
}, { surface: "card", family: "sky-placement" });
assert.equal(advisoryOnly.passed, true, "Advisory-only findings must not become an automatic rewrite gate.");
assert.equal(advisoryOnly.violations.length, 0);
assert.equal(advisoryOnly.advisories.length, 1);

const prompt = effectiveRulePrompt("BASE OWNER STANDARD", { surface: "friends-transit", family: "friends-transit" });
assert.match(prompt, /^BASE OWNER STANDARD/u);
assert.match(prompt, /Effective TLDR Astro writing rules/u);
assert.match(prompt, /Generated wording remains needs_review\. Only the owner can approve exact prose\./u);

assert.match(generate, /effectiveRulePrompt\(baseInstructions, \{ surface, family \}\)/u);
assert.match(revise, /filter\(\(entry\) => entry\.severity === "blocking"\)/u);
assert.match(revise, /effectiveRulePrompt\(baseInstructions, \{ surface, family \}\)/u);
assert.match(review, /MODEL REVIEW GOVERNANCE: Every model-authored editorial finding is advisory evidence for the owner/u);
assert.match(review, /\.map\(advisoryModelViolation\)/u);
assert.match(review, /decision: blocking \? "REVISE" : "PASS"/u);
assert.match(review, /filter\(\(item\) => item\.severity === "blocking"\)/u);
assert.match(pipeline, /const lint = governValidationResult\(rawLint, \{ surface, family \}\);/u);
assert.match(pipeline, /advisoryCategories/u);

console.log("Effective writing-rule runtime integration passed: deterministic blocking tiers govern revision; model and voice findings remain owner-review advisories.");
