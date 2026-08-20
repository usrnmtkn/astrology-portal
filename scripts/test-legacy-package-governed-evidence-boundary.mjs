#!/usr/bin/env node

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const {
  listJsonFiles,
  listLegacyPackageJsonFiles,
  isLegacyPackageDataFile
} = require(path.join(root, "packages/astro-knowledge/scripts/validate.js"));

const dataRoot = path.join(root, "packages/astro-knowledge/data");
const governedDirectories = [
  {
    directory: path.join(dataRoot, "points/aspects/sky/four-body-unverified"),
    expectedCount: 198
  },
  {
    directory: path.join(dataRoot, "points/transits/house/owner-final"),
    expectedCount: 48
  }
];

for (const { directory, expectedCount } of governedDirectories) {
  const governedFiles = listJsonFiles(directory);
  assert.equal(
    governedFiles.length,
    expectedCount,
    `${path.relative(root, directory)} governed evidence count changed.`
  );
  assert.equal(
    listLegacyPackageJsonFiles(directory).length,
    0,
    `${path.relative(root, directory)} must not enter the legacy serving package.`
  );
  assert.ok(
    governedFiles.every((filePath) => !isLegacyPackageDataFile(filePath)),
    `${path.relative(root, directory)} must be excluded file by file.`
  );
}

const ordinaryPointAspect = path.join(dataRoot, "points/aspects/natal/chiron-conjunct-mars.json");
assert.ok(
  isLegacyPackageDataFile(ordinaryPointAspect),
  "The boundary must not exclude ordinary legacy point-aspect records."
);

const allFiles = listJsonFiles(dataRoot);
const legacyFiles = listLegacyPackageJsonFiles(dataRoot);
assert.equal(
  allFiles.length - legacyFiles.length,
  246,
  "Only the two exact governed evidence directories may be excluded from the legacy package."
);

console.log("Legacy-package evidence boundary passed: 246 governed files remain catalog-visible and are excluded only from the legacy serving bundle.");
