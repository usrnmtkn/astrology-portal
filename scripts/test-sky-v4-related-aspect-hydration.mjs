#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");

assert.match(
  app,
  /const contentRegistryVersion = useContentRegistryRevision\(\);/u,
  "The open-detail lifecycle must synchronize the current lazy content-registry revision on mount."
);
assert.doesNotMatch(
  app,
  /setContentRegistryVersion/u,
  "The open-detail lifecycle must not keep a second ad-hoc registry listener that can miss an already-completed load."
);
assert.match(
  app,
  /const refreshKey = `\$\{skyDetailRoutePath\}:\$\{fallbackArchitectureV3Version\}:\$\{contentRegistryVersion\}:\$\{personalizationKey\}`;/u,
  "An open Sky detail must invalidate its refresh key when the registry revision changes."
);

const marker = "const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}:${contentRegistryVersion}:${personalizationKey}`;";
const markerIndex = app.indexOf(marker);
assert.ok(markerIndex >= 0, "Open Sky detail refresh marker must exist.");
const dependencyStart = app.indexOf("  }, [", markerIndex);
const dependencyEnd = dependencyStart >= 0 ? app.indexOf("]);", dependencyStart) : -1;
assert.ok(dependencyStart >= 0 && dependencyEnd >= 0, "Open Sky detail refresh dependency array must exist.");
const dependencyBlock = app.slice(dependencyStart, dependencyEnd + 3);
assert.match(
  dependencyBlock,
  /\bcontentRegistryVersion\b/u,
  "The open Sky detail refresh effect must rerun when the synchronized registry revision changes."
);
assert.match(
  app,
  /const sourceGapAspectRows = isRegistryArticle\s*\? \[\]\s*:\s*relatedAspectRowsForPlacement/u,
  "Canonical registry articles must continue suppressing unreviewed source-gap aspect rows."
);

console.log("Sky V4 synchronized registry related-aspect refresh contract passed.");
