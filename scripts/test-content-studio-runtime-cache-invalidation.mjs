#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const vocabulary = fs.readFileSync("apps/web/src/services/planetTopicVocabulary.ts", "utf8");
const taglines = fs.readFileSync("apps/web/src/services/natalPlacementTaglines.ts", "utf8");
const signal = fs.readFileSync("apps/web/src/services/contentUpdateSignal.ts", "utf8");
const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const generated = fs.readFileSync("apps/web/src/services/generatedContent.ts", "utf8");

assert.match(vocabulary, /export function clearPlanetTopicVocabularyCache/u);
assert.match(vocabulary, /loadLiveGeneratedContentForSurfaces/u, "Vocabulary hydration must delegate to the shared live/LKG loader.");
assert.doesNotMatch(vocabulary, /\.range\(/u, "Vocabulary hydration must not own OFFSET pagination.");
assert.match(vocabulary, /finally \{\s*loadingVocabulary = null/u);

assert.match(taglines, /export function clearNatalCardTaglineCache/u);
assert.match(taglines, /loadLiveGeneratedContentForKeys/u, "Tagline hydration must delegate to the shared live/LKG loader.");
assert.match(taglines, /finally \{\s*loadingTaglines = null/u);

assert.match(generated, /\.gt\("id", cursorId\)/u, "Shared Content Studio hydration must use a stable cursor.");
assert.doesNotMatch(generated, /\.range\(from, to\)/u, "Shared Content Studio hydration must not use OFFSET pagination.");
assert.match(generated, /loadLastKnownGoodGeneratedContentForSurfaces/u, "Shared surface hydration must retain LKG fallback.");
assert.match(generated, /loadLastKnownGoodGeneratedContentForKeys/u, "Shared key hydration must retain LKG fallback.");

assert.doesNotMatch(signal, /clearPlanetTopicVocabularyCache|clearNatalCardTaglineCache/u, "The update transport must not own reader cache modules.");
assert.match(app, /clearPlanetTopicVocabularyCache\(\)/u, "Publishing from Content Studio must invalidate planet/sign vocabulary cache.");
assert.match(app, /clearNatalCardTaglineCache\(\)/u, "Publishing from Content Studio must invalidate natal tagline cache.");

console.log("Content Studio runtime cache invalidation contract passed.");
