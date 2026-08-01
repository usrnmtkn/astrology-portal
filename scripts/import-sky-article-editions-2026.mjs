#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifestPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-article-editions-2026-pending.json"
);

function option(name) {
  return process.argv.slice(2).find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function valueAtPath(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => value?.[key], object);
}

function placeholderNames(markdown) {
  return [...new Set([...markdown.matchAll(/\{\{\s*([^}:]+)(?::[^}]*)?\}\}/gu)]
    .map((match) => match[1].trim()))].sort();
}

function timeZoneDateDifferences(value, currentPath = "", differences = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => timeZoneDateDifferences(item, `${currentPath}[${index}]`, differences));
    return differences;
  }
  if (!value || typeof value !== "object") return differences;

  if (
    typeof value.sourcePacificDate === "string"
    && typeof value.canonicalDate === "string"
    && value.sourcePacificDate !== value.canonicalDate
  ) {
    differences.push({
      slot: currentPath,
      sourcePacificDate: value.sourcePacificDate,
      canonicalDate: value.canonicalDate,
      instantUtc: value.instantUtc
    });
  }
  for (const [key, child] of Object.entries(value)) {
    timeZoneDateDifferences(child, currentPath ? `${currentPath}.${key}` : key, differences);
  }
  return differences;
}

const sourceDir = option("--source-dir");
const outPath = option("--out");
const manifestPath = option("--manifest") ?? defaultManifestPath;
const enginePathOverride = option("--engine-slots");

assert.ok(
  sourceDir,
  "Usage: node scripts/import-sky-article-editions-2026.mjs --source-dir=/absolute/path/to/Resources [--out=/absolute/path/staged.json]"
);
assert.ok(path.isAbsolute(sourceDir), "--source-dir must be absolute.");
assert.ok(path.isAbsolute(manifestPath), "--manifest must be absolute when supplied.");
assert.ok(fs.existsSync(sourceDir), `Source directory does not exist: ${sourceDir}`);

const manifest = readJson(manifestPath);
assert.equal(manifest.review_status, "needs_review", "This importer only accepts review-gated manifests.");
const enginePath = enginePathOverride
  ?? path.join(repoRoot, manifest.engineFixture);
assert.ok(path.isAbsolute(enginePath), "--engine-slots must be absolute when supplied.");
const engineFixture = readJson(enginePath);
assert.equal(
  engineFixture.schema,
  "tldrastro-engine-confirmed-date-slots-v1",
  "Unexpected engine date-slot fixture schema."
);

const editions = manifest.sources.map((source) => {
  const sourcePath = path.join(sourceDir, source.file);
  assert.ok(fs.existsSync(sourcePath), `Review source does not exist: ${sourcePath}`);
  const sourceBytes = fs.readFileSync(sourcePath);
  assert.equal(sourceBytes.byteLength, source.bytes, `${source.file} byte length changed; refusing import.`);
  assert.equal(sha256(sourceBytes), source.sha256, `${source.file} prose changed; refusing import.`);
  const sourceMarkdown = sourceBytes.toString("utf8");
  const engineSlots = Object.fromEntries(Object.entries(source.slots).map(([target, fixturePath]) => {
    const value = valueAtPath(engineFixture.dateSlots, fixturePath);
    assert.notEqual(value, undefined, `Missing engine fixture value: ${fixturePath}`);
    return [target, value];
  }));
  const mappedPlaceholders = new Set(Object.keys(source.slots));

  return {
    contentKey: source.contentKey,
    review_status: "needs_review",
    serving: false,
    source: {
      file: source.file,
      sha256: source.sha256,
      bytes: source.bytes
    },
    engineSlots,
    timeZoneDateDifferences: timeZoneDateDifferences(engineSlots),
    unresolvedPlaceholders: placeholderNames(sourceMarkdown).filter((name) => !mappedPlaceholders.has(name)),
    sourceMarkdown
  };
});

const staged = {
  schema: "tldrastro-sky-article-staged-review-v1",
  review_status: "needs_review",
  serving: false,
  engineSource: {
    schema: engineFixture.schema,
    generatedBy: engineFixture.generatedBy,
    ephemeris: engineFixture.ephemeris,
    timePolicy: engineFixture.timePolicy
  },
  editions
};

if (!outPath) {
  console.log(`Validated ${editions.length} needs_review editions. Source prose is unchanged; no output was written.`);
  process.exit(0);
}

assert.ok(path.isAbsolute(outPath), "--out must be absolute.");
fs.writeFileSync(outPath, `${JSON.stringify(staged, null, 2)}\n`);
console.log(`Staged ${editions.length} needs_review editions with engine slots at ${outPath}. Nothing was published.`);
