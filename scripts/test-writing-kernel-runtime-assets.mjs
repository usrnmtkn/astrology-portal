#!/usr/bin/env node

// Proves that every file the governed resolver reads at runtime is actually
// inside the Vercel function bundle.
//
// The previous version of this guard did not do that. It asserted that a list
// of fragments appeared as substrings of `includeFiles`, and separately matched
// source paths against a hand-written regex list that mirrored the glob. The
// two lists could agree with each other while neither agreed with the glob, so
// a malformed pattern passed: dropping a single closing brace left every
// fragment present as a substring, the guard reported "3,250 sources
// deployment-covered", and the real glob matched none of them. That ships
// KNOWLEDGE_INDEX_MISSING to production on a green build.
//
// This version expands and evaluates the actual pattern. The fixtures at the
// bottom reintroduce each failure and assert the check refuses.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

// --- glob evaluation ------------------------------------------------------
// Deliberately dependency-free: this guard must not be able to fail closed
// because an install went wrong. Semantics match the brace + globstar subset
// that `includeFiles` actually uses.

function assertBalancedBraces(pattern) {
  let depth = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    if (pattern[index] === "{") depth += 1;
    else if (pattern[index] === "}") {
      depth -= 1;
      if (depth < 0) throw new Error(`Unbalanced '}' at index ${index} in includeFiles.`);
    }
  }
  if (depth !== 0) throw new Error(`Unbalanced '{' in includeFiles: ${depth} group(s) never closed.`);
}

function expandBraces(pattern) {
  const open = pattern.indexOf("{");
  if (open === -1) return [pattern];

  let depth = 0;
  let close = -1;
  for (let index = open; index < pattern.length; index += 1) {
    if (pattern[index] === "{") depth += 1;
    else if (pattern[index] === "}") {
      depth -= 1;
      if (depth === 0) { close = index; break; }
    }
  }
  if (close === -1) throw new Error("Unbalanced '{' in includeFiles.");

  const before = pattern.slice(0, open);
  const after = pattern.slice(close + 1);
  const alternatives = [];
  let nested = 0;
  let current = "";
  for (const character of pattern.slice(open + 1, close)) {
    if (character === "{") { nested += 1; current += character; }
    else if (character === "}") { nested -= 1; current += character; }
    else if (character === "," && nested === 0) { alternatives.push(current); current = ""; }
    else current += character;
  }
  alternatives.push(current);

  return alternatives.flatMap((alternative) => expandBraces(`${before}${alternative}${after}`));
}

function globToRegExp(glob) {
  let source = "";
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === "*") {
      if (glob[index + 1] === "*") {
        if (glob[index + 2] === "/") { source += "(?:[^/]+/)*"; index += 2; }
        else { source += ".*"; index += 1; }
      } else {
        source += "[^/]*";
      }
    } else if (character === "?") {
      source += "[^/]";
    } else if (".+^$()[]|\\/{}".includes(character)) {
      source += `\\${character}`;
    } else {
      source += character;
    }
  }
  return new RegExp(`^${source}$`, "u");
}

function compileIncludeFiles(pattern) {
  assertBalancedBraces(pattern);
  const globs = expandBraces(pattern);
  assert.ok(globs.length > 0, "includeFiles expanded to no patterns.");
  const matchers = globs.map(globToRegExp);
  return (relativePath) => matchers.some((matcher) => matcher.test(relativePath));
}

// --- what the resolver reads at runtime -----------------------------------

function runtimeSourcePaths() {
  const knowledgeIndex = readJson("packages/astro-knowledge/generated/knowledge-index.json");
  const phraseIndex = readJson("packages/astro-knowledge/generated/phrase-index.json");
  const knowledgeSources = knowledgeIndex.objects.flatMap(
    (object) => object.sources.map((source) => source.path)
  );
  const phraseSources = [
    ...(phraseIndex.phrasebankFiles ?? []).map((entry) => entry.path),
    ...(phraseIndex.phrases ?? []).map((entry) => entry.source?.path),
    ...(phraseIndex.components ?? []).map((entry) => entry.source?.path),
    ...(phraseIndex.voiceExemplars ?? []).flatMap(
      (entry) => [entry.source?.path, entry.source?.manifestPath]
    )
  ].filter(Boolean);
  return [...new Set([...knowledgeSources, ...phraseSources])];
}

// The resolver reads these two by computed path, so the bundler cannot trace
// them and they must be named by the pattern like any other evidence file.
const RESOLVER_ENTRY_POINTS = [
  "packages/astro-knowledge/generated/knowledge-index.json",
  "packages/astro-knowledge/generated/phrase-index.json"
];

const includeFiles = readJson("vercel.json").functions?.["api/**/*.ts"]?.includeFiles ?? "";
assert.ok(includeFiles, "vercel.json defines no includeFiles for api/**/*.ts.");

const covered = compileIncludeFiles(includeFiles);
const runtimeSources = runtimeSourcePaths();
assert.ok(runtimeSources.length > 0, "Resolved zero runtime sources; the indexes are empty or misread.");

const uncoveredEntryPoints = RESOLVER_ENTRY_POINTS.filter((entry) => !covered(entry));
assert.deepEqual(
  uncoveredEntryPoints,
  [],
  `The resolver's own index files are outside the Vercel bundle: ${uncoveredEntryPoints.join(", ")}`
);

const uncovered = runtimeSources.filter((relativePath) => !covered(relativePath));
assert.deepEqual(
  uncovered.slice(0, 20),
  [],
  `${uncovered.length} runtime resolver source(s) are outside the Vercel bundle. First offenders: ${uncovered.slice(0, 20).join(", ")}`
);

// --- fixtures: each one reintroduces a bug and asserts the check refuses ---

// 1. A path no pattern names must not be reported as covered.
assert.equal(covered("outside/unbundled-source.json"), false, "Guard must reject an unbundled source path.");

// 2. A brace-mangled pattern must be rejected, not silently treated as literal.
//    This is the exact regression the previous guard shipped green: every
//    fragment is still present as a substring of the string below.
const braceMangled = includeFiles.slice(0, -1);
assert.throws(
  () => compileIncludeFiles(braceMangled),
  /Unbalanced/u,
  "Guard must refuse an includeFiles pattern whose braces do not balance."
);

// 3. A narrowed pattern must stop covering the nested paths it used to cover.
const nestedDataSource = runtimeSources.find(
  (relativePath) => /^packages\/astro-knowledge\/data\/[^/]+\/.+\.json$/u.test(relativePath)
);
assert.ok(nestedDataSource, "Expected at least one nested packages/astro-knowledge/data source to test narrowing.");
const narrowed = compileIncludeFiles(includeFiles.replaceAll("data/**/*.json", "data/*.json"));
assert.equal(
  narrowed(nestedDataSource),
  false,
  "Guard must notice when a globstar is narrowed away from nested evidence."
);
assert.equal(covered(nestedDataSource), true, "Current pattern must still cover nested evidence.");

// 4. Brace expansion must actually expand rather than match the literal text.
const expanded = expandBraces("a/{b,c}/{d,e}.json");
assert.deepEqual(expanded.sort(), ["a/b/d.json", "a/b/e.json", "a/c/d.json", "a/c/e.json"]);
assert.equal(compileIncludeFiles("a/{b,c}/*.json")("a/b/x.json"), true);
assert.equal(compileIncludeFiles("a/{b,c}/*.json")("a/d/x.json"), false);
assert.equal(compileIncludeFiles("a/**/*.json")("a/x.json"), true);
assert.equal(compileIncludeFiles("a/**/*.json")("a/b/c/x.json"), true);
assert.equal(compileIncludeFiles("a/*/x.json")("a/b/c/x.json"), false);

// --- the deployed smoke endpoint ------------------------------------------
// A local pass proves nothing about the bundle, so the check that runs in the
// serverless environment must exist and must not be able to bill a call.

const smoke = fs.readFileSync(path.join(root, "api/cron/writing-kernel-smoke.ts"), "utf8");
assert.match(smoke, /assertIndexCurrent\(\)/u);
assert.doesNotMatch(smoke, /generate|provider|model|OPENAI|ANTHROPIC|GEMINI/u, "Deployment smoke must not make a model call.");

console.log(
  `Writing-kernel runtime asset contract passed: ${runtimeSources.length} resolver sources matched against ${expandBraces(includeFiles).length} expanded bundle patterns; brace-mangling, narrowing, and unbundled-path fixtures all failed closed.`
);
