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
assert.match(vocabulary, /topic slots will be blank until the next retry/u, "A transient vocabulary read failure must remain retryable.");
assert.match(vocabulary, /finally \{\s*loadingVocabulary = null/u);

assert.match(taglines, /export function clearNatalCardTaglineCache/u);
assert.match(taglines, /\.order\("updated_at", \{ ascending: true \}\)[\s\S]*?\.order\("id", \{ ascending: true \}\)/u, "Tagline duplicate precedence must be deterministic.");
assert.match(taglines, /code fallbacks will be used until the next retry/u, "A transient tagline read failure must remain retryable.");
assert.match(taglines, /finally \{\s*loadingTaglines = null/u);

assert.match(signal, /clearPlanetTopicVocabularyCache\(\)/u, "Publishing from Content Studio must invalidate planet/sign vocabulary cache.");
assert.match(signal, /clearNatalCardTaglineCache\(\)/u, "Publishing from Content Studio must invalidate natal tagline cache.");

console.log("Content Studio runtime cache invalidation contract passed.");
