#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = path.join(root, "packages/astro-knowledge/package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const build = String(packageJson.scripts?.build ?? "");

assert.doesNotMatch(
  build,
  /import-authored-placements\.js/u,
  "Deploy builds must not require an owner-held book source."
);
assert.match(
  build,
  /test-authored-placements-schema-separation\.mjs/u,
  "Deploy builds must validate the checked-in, fail-closed authored-placement artifact."
);

const importer = spawnSync(
  process.execPath,
  ["packages/astro-knowledge/scripts/import-authored-placements.js"],
  { cwd: root, encoding: "utf8" }
);
assert.equal(importer.status, 2, "The owner-held importer must reject a missing --book argument.");
assert.match(
  `${importer.stdout}${importer.stderr}`,
  /Missing required --book <owner-held-source\.json>/u
);

console.log("Authored-placement build boundary passed: deploy validates the artifact; owner-held regeneration requires explicit --book.");
