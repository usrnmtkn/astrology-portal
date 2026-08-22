#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-sky-article-import-"));
const sourceDir = path.join(tempDir, "Resources");
fs.mkdirSync(sourceDir);

const sourceName = "Edition-REVIEW.md";
const sourceMarkdown = "# Edition\n\nOn {{entryDate}}.\n\n{{unresolvedThing}}\n";
const sourceBytes = Buffer.from(sourceMarkdown, "utf8");
fs.writeFileSync(path.join(sourceDir, sourceName), sourceBytes);

const manifestPath = path.join(tempDir, "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify({
  schema: "tldrastro-sky-article-review-import-v1",
  version: "1.0.0",
  review_status: "needs_review",
  engineFixture: "unused-in-test.json",
  sources: [{
    file: sourceName,
    contentKey: "sky-article/test/edition/2026",
    sha256: crypto.createHash("sha256").update(sourceBytes).digest("hex"),
    bytes: sourceBytes.byteLength,
    slots: { entryDate: "testEdition.entryDate" }
  }]
}));

const enginePath = path.join(tempDir, "engine.json");
fs.writeFileSync(enginePath, JSON.stringify({
  schema: "tldrastro-engine-confirmed-date-slots-v1",
  generatedBy: "test",
  calculationAuthority: {
    engine: "test ephemeris",
    independentPositionVerification: "test reference"
  },
  timePolicy: {},
  dateSlots: {
    testEdition: {
      entryDate: {
        instantUtc: "2026-06-30T05:52:21.690Z"
      }
    }
  }
}));

const outPath = path.join(tempDir, "staged.json");
const result = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/import-sky-article-editions-2026.mjs"),
  `--source-dir=${sourceDir}`,
  `--manifest=${manifestPath}`,
  `--engine-slots=${enginePath}`,
  `--out=${outPath}`
], { encoding: "utf8" });

assert.equal(result.status, 0, result.stderr);
const staged = JSON.parse(fs.readFileSync(outPath, "utf8"));
assert.equal(staged.serving, false);
assert.equal(staged.review_status, "needs_review");
assert.equal(staged.editions[0].sourceMarkdown, sourceMarkdown, "Importer must preserve source prose exactly.");
assert.equal(staged.editions[0].tldr, null, "Importer must not derive a TL;DR from the owner-authored article.");
assert.equal(staged.editions[0].tldrStatus, "missing_explicit_copy");
assert.deepEqual(staged.editions[0].unresolvedPlaceholders, ["unresolvedThing"]);
assert.deepEqual(staged.editions[0].dateRendering, {
  authority: "instantUtc",
  displayTimeZone: "user-location",
  status: "derive-at-render"
});
assert.doesNotMatch(
  JSON.stringify(staged),
  /America\/(?:Los_Angeles|New_York)|sourcePacificDate|canonicalDate|canonicalNoonUtc/u
);

const changedSource = `${sourceMarkdown}changed\n`;
fs.writeFileSync(path.join(sourceDir, sourceName), changedSource);
const refusal = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/import-sky-article-editions-2026.mjs"),
  `--source-dir=${sourceDir}`,
  `--manifest=${manifestPath}`,
  `--engine-slots=${enginePath}`
], { encoding: "utf8" });
assert.notEqual(refusal.status, 0, "Importer must refuse modified review prose.");
assert.match(refusal.stderr, /byte length changed|prose changed/u);

console.log("Sky article staged import preserves prose and defers dates to the user's timezone.");
