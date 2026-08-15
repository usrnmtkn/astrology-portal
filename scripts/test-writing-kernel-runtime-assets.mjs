#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const includeFiles = readJson("vercel.json").functions?.["api/**/*.ts"]?.includeFiles ?? "";

const requiredFragments = [
  "src/astro-writing/**/*.{cjs,mjs,js}",
  "generated/{knowledge-index.json,phrase-index.json,tldr-astro/**/*.json}",
  "scripts/*.{cjs,js}",
  "data/**/*.json",
  "config/*.json",
  "reference/*.json",
  "voice/**/*.{json,md}",
  "sources/authored/marie-satori-book/*.json",
  "apps/web/{public/content/**/*.json,src/content/**/*.json}",
  "tldr-astro-phrasebank/{*.md,phrasebank/*.json,sources/*.json}"
];
for (const fragment of requiredFragments) {
  assert.ok(includeFiles.includes(fragment), `Vercel writing-kernel bundle is missing ${fragment}`);
}

function runtimeSourceCovered(relativePath) {
  return [
    /^packages\/astro-knowledge\/data\/.*\.json$/u,
    /^packages\/astro-knowledge\/config\/[^/]+\.json$/u,
    /^packages\/astro-knowledge\/reference\/[^/]+\.json$/u,
    /^packages\/astro-knowledge\/generated\/tldr-astro\/.*\.json$/u,
    /^packages\/astro-knowledge\/voice\/.*\.(?:json|md)$/u,
    /^packages\/astro-knowledge\/sources\/authored\/marie-satori-book\/[^/]+\.json$/u,
    /^apps\/web\/public\/content\/.*\.json$/u,
    /^apps\/web\/src\/content\/.*\.json$/u,
    /^tldr-astro-phrasebank\/phrasebank\/[^/]+\.json$/u,
    /^tldr-astro-phrasebank\/sources\/[^/]+\.json$/u,
    /^tldr-astro-phrasebank\/[^/]+\.md$/u
  ].some((pattern) => pattern.test(relativePath));
}

const knowledgeIndex = readJson("packages/astro-knowledge/generated/knowledge-index.json");
const phraseIndex = readJson("packages/astro-knowledge/generated/phrase-index.json");
const knowledgeSources = knowledgeIndex.objects.flatMap((object) => object.sources.map((source) => source.path));
const phraseSources = [
  ...(phraseIndex.phrasebankFiles ?? []).map((entry) => entry.path),
  ...(phraseIndex.phrases ?? []).map((entry) => entry.source?.path),
  ...(phraseIndex.components ?? []).map((entry) => entry.source?.path),
  ...(phraseIndex.voiceExemplars ?? []).flatMap((entry) => [entry.source?.path, entry.source?.manifestPath])
].filter(Boolean);
const runtimeSources = [...new Set([...knowledgeSources, ...phraseSources])];
const uncovered = runtimeSources.filter((relativePath) => !runtimeSourceCovered(relativePath));
assert.deepEqual(uncovered, [], `Runtime resolver sources are outside the Vercel bundle: ${uncovered.join(", ")}`);
assert.equal(runtimeSourceCovered("outside/unbundled-source.json"), false, "Guard fixture must reject an unbundled source path.");

const smoke = fs.readFileSync(path.join(root, "api/cron/writing-kernel-smoke.ts"), "utf8");
assert.match(smoke, /assertIndexCurrent\(\)/u);
assert.doesNotMatch(smoke, /generate|provider|model|OPENAI|ANTHROPIC|GEMINI/u, "Deployment smoke must not make a model call.");

console.log(`Writing-kernel runtime asset contract passed: ${runtimeSources.length} resolver sources are deployment-covered; uncovered-path fixture failed closed.`);
