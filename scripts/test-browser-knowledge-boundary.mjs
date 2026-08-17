#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const knowledgeRoot = path.join(root, "packages/astro-knowledge");
const generatedRoot = path.join(knowledgeRoot, "generated");
const distRoot = path.join(knowledgeRoot, "dist");
const serverOnlyPaths = new Set([
  "generated/knowledge-index.json",
  "generated/phrase-index.json"
]);

function listJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listJsonFiles(absolutePath);
      return entry.isFile() && entry.name.endsWith(".json") ? [absolutePath] : [];
    })
    .sort();
}

function readJson(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

for (const relativePath of serverOnlyPaths) {
  assert.ok(
    fs.existsSync(path.join(knowledgeRoot, relativePath)),
    `${relativePath} must remain available to the server-side governed resolver.`
  );
}

const generatedVoiceEntries = listJsonFiles(generatedRoot)
  .map((absolutePath) => ({
    ...readJson(absolutePath),
    path: path.relative(knowledgeRoot, absolutePath)
  }))
  .filter((entry) => (
    !serverOnlyPaths.has(entry.path)
    && !entry.path.startsWith("generated/tldr-astro/rewrite-corpora/")
  ));
const expectedFullVoicePaths = generatedVoiceEntries.map((entry) => entry.path).sort();
const expectedRuntimeVoicePaths = generatedVoiceEntries
  .filter((entry) => (
    typeof entry.sourceId === "string"
    && entry.sourceId.trim()
    && typeof entry.voiceId === "string"
    && entry.voiceId.trim()
  ))
  .map((entry) => entry.path)
  .sort();
const authoringOnlyVoicePaths = expectedFullVoicePaths.filter(
  (relativePath) => !expectedRuntimeVoicePaths.includes(relativePath)
);

const fullBundlesWithVoiceContent = [
  "knowledge.json",
  "sky.json",
  "natal.json",
  "relationships.json",
  "synastry.json",
  "composite.json",
  "web.json"
];

const runtimeBundlesWithVoiceContent = [
  "sky-web.json",
  "natal-web.json",
  "relationships-web.json",
  "shared-web.json"
];

for (const bundleName of fullBundlesWithVoiceContent) {
  const bundlePath = path.join(distRoot, bundleName);
  assert.ok(fs.existsSync(bundlePath), `${bundleName} must be built before checking the browser boundary.`);
  const bundle = readJson(bundlePath);
  const actualPaths = (bundle.voiceContent ?? []).map((entry) => entry.path).sort();
  assert.deepEqual(
    actualPaths,
    expectedFullVoicePaths,
    `${bundleName} must preserve all non-rewrite, non-index generated voice content.`
  );
}

for (const bundleName of runtimeBundlesWithVoiceContent) {
  const bundlePath = path.join(distRoot, bundleName);
  assert.ok(fs.existsSync(bundlePath), `${bundleName} must be built before checking the browser boundary.`);
  const bundle = readJson(bundlePath);
  const actualPaths = (bundle.voiceContent ?? []).map((entry) => entry.path).sort();
  assert.deepEqual(
    actualPaths,
    expectedRuntimeVoicePaths,
    `${bundleName} must contain only runtime-addressable generated voice content.`
  );
  for (const authoringOnlyPath of authoringOnlyVoicePaths) {
    assert.equal(
      actualPaths.includes(authoringOnlyPath),
      false,
      `${bundleName} must not expose authoring-only ${authoringOnlyPath}.`
    );
  }
}

for (const bundlePath of listJsonFiles(distRoot)) {
  const contents = fs.readFileSync(bundlePath, "utf8");
  for (const serverOnlyPath of serverOnlyPaths) {
    assert.equal(
      contents.includes(`\"path\": \"${serverOnlyPath}\"`),
      false,
      `${path.relative(root, bundlePath)} must not embed server-only ${serverOnlyPath}.`
    );
  }
}

console.log(
  `Browser knowledge boundary passed: ${serverOnlyPaths.size} governed indexes remain server-side, ${expectedFullVoicePaths.length} generated artifacts remain in full packages, and ${expectedRuntimeVoicePaths.length} runtime-addressable artifact remains in web packages.`
);
