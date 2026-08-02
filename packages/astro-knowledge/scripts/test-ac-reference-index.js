#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const { buildIndex, defaultAcRoot, outputPath } = require("./build-ac-reference-index.js");
const { buildAcKnowledgeContext, queryAcReference } = require("./reference-fact-bank.js");

const checkedIn = JSON.parse(fs.readFileSync(outputPath, "utf8"));
const rebuilt = buildIndex({ acRoot: defaultAcRoot });

assert.deepStrictEqual(checkedIn, rebuilt, "checked-in AC index must be deterministic and current");
assert.strictEqual(checkedIn.sourceLabel, "AC");
assert.strictEqual(checkedIn.lane, "reference");
assert.strictEqual(checkedIn.readerServing, false);
assert.strictEqual(checkedIn.articleCount, 172);
assert.ok(checkedIn.totalWordCount > 200000);
assert.strictEqual(checkedIn.policies.sourceTestimonyIsNotVerifiedFact, true);
assert.strictEqual(checkedIn.policies.historicalDatesNeverSupplyRuntimeFacts, true);
assert.strictEqual(checkedIn.policies.phrasesAndMetaphorsNeverEnterGenerationPrompts, true);
assert.ok(checkedIn.entries.every((entry) => entry.source === "AC" && entry.status === "unverified-source-reference"));
assert.ok(checkedIn.entries.every((entry) => entry.readerServing === false && !Object.hasOwn(entry, "text")));
assert.ok(checkedIn.entries.every((entry) => !entry.categories.includes("dailies")));
assert.doesNotMatch(JSON.stringify(checkedIn), /Austin Coppock/i);

const saturn = queryAcReference("Saturn Capricorn", { limit: 3 });
assert.strictEqual(saturn[0].id, "saturn-in-capricorn");
assert.ok(saturn.every((entry) => !Object.hasOwn(entry, "text")));
const context = buildAcKnowledgeContext("Venus retrograde desire", { limit: 2, maxChars: 400 });
assert.match(context, /AC SOURCE TESTIMONY — UNVERIFIED REFERENCE LANE/);
assert.match(context, /independently verify facts before banking them/i);
assert.doesNotMatch(context, /Austin Coppock/i);
assert.ok(context.length < 2000);

console.log(`AC reference index: ${checkedIn.articleCount} non-serving articles, ${checkedIn.totalWordCount} words; deterministic build, query ranking, short excerpts, abbreviated sourcing, and fact quarantine passed.`);
