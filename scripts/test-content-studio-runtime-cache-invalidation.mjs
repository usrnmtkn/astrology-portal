#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const vocabulary = fs.readFileSync("apps/web/src/services/planetTopicVocabulary.ts", "utf8");
const taglines = fs.readFileSync("apps/web/src/services/natalPlacementTaglines.ts", "utf8");
const signal = fs.readFileSync("apps/web/src/services/contentUpdateSignal.ts", "utf8");

assert.match(vocabulary, /export function clearPlanetTopicVocabularyCache/u);
assert.match(vocabulary, /\.gt\("id", cursorId\)/u, "Vocabulary hydration must use a stable cursor.");
assert.doesNotMatch(vocabulary, /\.range\(/u, "Vocabulary hydration must not use OFFSET pagination.");
assert.match(vocabulary, /\.sort\(\(first, second\) => \{[\s\S]*?firstUpdated - secondUpdated/u, "Vocabulary duplicate precedence must be deterministic and newest rows must win after map assembly.");
assert.match(vocabulary, /cachedVocabularySource === "live"/u, "A nightly vocabulary fallback must not suppress the next live retry.");
assert.match(vocabulary, /live content remains retryable/u, "A transient vocabulary read failure must remain retryable while LKG is shown.");
assert.match(vocabulary, /finally \{\s*loadingVocabulary = null/u);

assert.match(taglines, /export function clearNatalCardTaglineCache/u);
assert.match(taglines, /\.order\("updated_at", \{ ascending: true \}\)[\s\S]*?\.order\("id", \{ ascending: true \}\)/u, "Tagline duplicate precedence must be deterministic.");
assert.match(taglines, /cachedTaglineSource === "live"/u, "A nightly tagline fallback must not suppress the next live retry.");
assert.match(taglines, /live content remains retryable/u, "A transient tagline read failure must remain retryable while LKG is shown.");
assert.match(taglines, /finally \{\s*loadingTaglines = null/u);

assert.match(signal, /clearPlanetTopicVocabularyCache\(\)/u, "Publishing from Content Studio must invalidate planet/sign vocabulary cache.");
assert.match(signal, /clearNatalCardTaglineCache\(\)/u, "Publishing from Content Studio must invalidate natal tagline cache.");

console.log("Content Studio runtime cache invalidation contract passed.");
