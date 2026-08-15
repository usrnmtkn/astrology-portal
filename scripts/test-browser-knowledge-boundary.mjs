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

const generatedPaths = listJsonFiles(generatedRoot).map((absolutePath) =>
  path.relative(knowledgeRoot, absolutePath)
);
const expectedVoicePaths = generatedPaths.filter((relativePath) =>
  !serverOnlyPaths.has(relativePath)
  && !relativePath.startsWith("generated/tldr-astro/rewrite-corpora/")
);

const bundlesWithVoiceContent = [
  "knowledge.json",
  "sky.json",
  "natal.json",
  "relationships.json",
  "synastry.json",
  "composite.json",
  "web.json",
  "sky-web.json",
  "natal-web.json",
  "relationships-web.json",
  "shared-web.json"
];

for (const bundleName of bundlesWithVoiceContent) {
  const bundlePath = path.join(distRoot, bundleName);
  assert.ok(fs.existsSync(bundlePath), `${bundleName} must be built before checking the browser boundary.`);
  const bundle = readJson(bundlePath);
  const actualPaths = (bundle.voiceContent ?? []).map((entry) => entry.path).sort();
  assert.deepEqual(
    actualPaths,
    expectedVoicePaths,
    `${bundleName} must contain only browser-eligible generated voice content.`
  );
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
  `Browser knowledge boundary passed: ${serverOnlyPaths.size} governed indexes remain server-side and ${expectedVoicePaths.length} eligible generated artifacts remain in voice content.`
);
