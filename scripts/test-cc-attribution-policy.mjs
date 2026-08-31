#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const prohibitedName = ["cha", "ni"].join("");
const prohibitedPattern = new RegExp(`\\b${prohibitedName}\\b`, "iu");
const roots = [
  ".agents",
  "api",
  "apps",
  "packages/astro-knowledge",
  "src",
  "scripts",
  "tldr-astro-phrasebank"
];
const extensions = new Set([".cjs", ".css", ".html", ".js", ".json", ".md", ".mjs", ".mts", ".sql", ".ts", ".tsx", ".yaml", ".yml"]);
const ignoredDirectories = new Set([".git", "dist", "node_modules"]);
const factualSourceUrlFile = "packages/astro-knowledge/voice/tldr-astro/satori-writer/knowledge-matrix-v8/transit-meanings-v8-owner-approved-locked.json";
const skyV4SourceProvenanceFile = "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json";

function readerFacingText(filePath) {
  const relative = path.relative(repoRoot, filePath);
  if (relative !== skyV4SourceProvenanceFile) return fs.readFileSync(filePath, "utf8");
  const stripProvenance = (value) => {
    if (Array.isArray(value)) return value.map(stripProvenance);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !/(?:source|governance|comparison|notes?)/iu.test(key))
      .map(([key, child]) => [key, stripProvenance(child)]));
  };
  return JSON.stringify(stripProvenance(JSON.parse(fs.readFileSync(filePath, "utf8"))));
}

function filesUnder(relativePath) {
  // Historical review packets are immutable audit evidence and are never bundled or shown in Content Studio.
  if (relativePath === "packages/astro-knowledge/review" || relativePath.startsWith("packages/astro-knowledge/review/")) return [];
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  const results = [];
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const child = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) results.push(...filesUnder(path.relative(repoRoot, child)));
    else if (extensions.has(path.extname(entry.name))) results.push(child);
  }
  return results;
}

const checked = roots.flatMap(filesUnder);
const violations = checked
  // Keep factual, non-rendered provenance URLs intact; changing their path would fabricate a source.
  .filter((filePath) => path.relative(repoRoot, filePath) !== factualSourceUrlFile)
  .filter((filePath) => prohibitedPattern.test(readerFacingText(filePath)))
  .map((filePath) => path.relative(repoRoot, filePath));

assert.deepEqual(violations, [], `Active app/content files must use CC instead of the prohibited attribution:\n${violations.join("\n")}`);
console.log(`CC attribution policy passed across ${checked.length} active app/content files.`);
