#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { buildVocabularyBank, defaultSdRoot, guideMarkdown } = require("./build-owner-vocabulary-bank.js");
const { defaultAcRoot } = require("./build-ac-reference-index.js");
const { buildOwnerVocabularyPrompt } = require("./owner-vocabulary-prompt.js");

const packageRoot = path.join(__dirname, "..");
const bankPath = path.join(packageRoot, "voice", "tldr-astro", "owner-vocabulary-bank.json");
const guidePath = path.join(packageRoot, "docs", "editorial-ai", "OWNER-STYLE-VOCABULARY-GUIDE-2026-08-01.md");
const bank = buildVocabularyBank({ sdRoot: defaultSdRoot, acRoot: defaultAcRoot });
const checkedIn = JSON.parse(fs.readFileSync(bankPath, "utf8"));

assert.deepStrictEqual(checkedIn, bank, "checked-in vocabulary bank must be deterministic and current");
assert.strictEqual(bank.sources.owner.documentCount, 47);
assert.ok(bank.sources.spiritDaughter.documentCount >= 40);
assert.strictEqual(bank.sources.ac.documentCount, 172);
assert.strictEqual(bank.policies.ownerWritingIsAuthority, true);
assert.strictEqual(bank.policies.ownerPhrasesOnly, true);
assert.strictEqual(bank.policies.sdPhrasesForbidden, true);
assert.strictEqual(bank.policies.acPhrasesForbidden, true);
assert.strictEqual(bank.policies.sdFactsAndDatesForbidden, true);
assert.ok(bank.coreVocabulary.length >= 30);
assert.ok(bank.sharedOwnerSdVocabulary.length >= 30);
assert.ok(bank.sharedOwnerAcVocabulary.length >= 30);
assert.ok(bank.sdLexicalAdditions.length >= 8);
assert.ok(bank.ownerSignaturePhrases.length >= 20);
assert.ok(bank.sharedOwnerSdVocabulary.every((entry) => entry.source === "owner+SD"));
assert.ok(bank.sharedOwnerAcVocabulary.every((entry) => entry.source === "owner+AC"));
assert.ok(bank.acReviewCandidates.every((entry) => entry.source === "AC" && entry.status === "owner-review-required"));
assert.strictEqual(bank.acCandidateAudit.reviewedCount, bank.acReviewCandidates.length);
assert.strictEqual(bank.acCandidateAudit.recommendation, "promote-none");
assert.deepStrictEqual(bank.acCandidateAudit.automaticPromptEligible, []);
assert.ok(bank.acCandidateAudit.lanes.technicalReferenceOnly.includes("decan"));
assert.ok(bank.acCandidateAudit.lanes.symbolicTopicOnly.includes("lion"));
assert.ok(bank.acCandidateAudit.lanes.ownerObservedRare.includes("ongoing"));
assert.ok(bank.acCandidateAudit.lanes.outsideRegisterUnobserved.includes("thus"));
assert.ok(bank.sdLexicalAdditions.every((entry) => entry.source === "SD" && entry.status === "allowed-individual-word"));
assert.ok(bank.sdLexicalAdditions.some((entry) => entry.term === "flowing" && entry.surfaces.includes("all")));
assert.ok(bank.sdLexicalAdditions.some((entry) => entry.term === "tonight" && entry.surfaces.includes("weekly")));
assert.ok(!bank.sdReviewCandidates.some((entry) => bank.sdLexicalAdditions.some((allowed) => allowed.term === entry.term)));
assert.ok(bank.ownerSignaturePhrases.every((entry) => entry.source === "owner-only"));
assert.ok(bank.sdReviewCandidates.every((entry) => entry.status === "owner-review-required"));

const blocked = new Set(bank.avoid.sdBlockedWords);
assert.ok(!bank.coreVocabulary.some((entry) => blocked.has(entry.term)));
assert.ok(!bank.sharedOwnerSdVocabulary.some((entry) => blocked.has(entry.term)));
assert.ok(bank.avoid.sdConstructions.some((entry) => entry.pattern === "Welcome to another powerful week"));
assert.ok(!JSON.stringify(bank.ownerSignaturePhrases).includes("welcome to another powerful week"));

const prompt = buildOwnerVocabularyPrompt({ surface: "sky-exact-aspect" });
assert.match(prompt, /menu, never quota/i);
assert.match(prompt, /Words shared by Marie and Spirit Daughter/);
assert.match(prompt, /Words shared by Marie and AC/);
assert.match(prompt, /never copy AC phrases, metaphors, or cadence/);
assert.match(prompt, /individual lexical choices/);
assert.match(prompt, /Neutral Spirit Daughter word additions approved for individual-word use: arriving, flowing, landing, lighter, lifts, planting, warm, wide/);
assert.doesNotMatch(prompt, /individual-word use: tonight/);
const weeklyPrompt = buildOwnerVocabularyPrompt({ surface: "weekly" });
assert.match(weeklyPrompt, /individual-word use: midnight, tonight, weekend/);
assert.doesNotMatch(prompt, /Welcome to another powerful week/);
assert.doesNotMatch(prompt, /Let's dive into what the stars have in store/);

assert.strictEqual(fs.readFileSync(guidePath, "utf8"), guideMarkdown(bank));
assert.match(fs.readFileSync(guidePath, "utf8"), /owner corpus is the authority/i);
assert.match(fs.readFileSync(guidePath, "utf8"), /corpus audit promotes none of them/i);
assert.match(fs.readFileSync(guidePath, "utf8"), /Audit recommendation: promote-none/i);
assert.doesNotMatch(fs.readFileSync(guidePath, "utf8"), /Austin Coppock/i);
assert.doesNotMatch(JSON.stringify(bank), /Austin Coppock/i);
console.log(`Owner vocabulary bank: ${bank.sources.owner.documentCount} owner, ${bank.sources.spiritDaughter.documentCount} SD, and ${bank.sources.ac.documentCount} AC articles; provenance, phrase exclusion, prompt palette, and deterministic output passed.`);
