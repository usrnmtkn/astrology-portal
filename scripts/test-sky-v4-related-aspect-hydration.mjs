#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");

assert.match(
  app,
  /const relatedAspectSections = relatedSkyAspectSectionsForPlacement\(\{/u,
  "Canonical V4 articles must retain approved exact aspect sections after hydration."
);
assert.doesNotMatch(
  app,
  /const relatedAspectSections = isRegistryArticle\s*\? \[\]\s*:\s*relatedSkyAspectSectionsForPlacement/u,
  "Registry hydration must not erase approved exact aspect sections."
);
assert.match(
  app,
  /const sourceGapAspectRows = isRegistryArticle\s*\? \[\]\s*:\s*relatedAspectRowsForPlacement/u,
  "Canonical V4 articles must continue suppressing unreviewed source-gap aspect rows."
);

console.log("Sky V4 related-aspect hydration contract passed.");
