#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(repoRoot, "apps/web/src/App.tsx");
const source = fs.readFileSync(appPath, "utf8");

const before = `  const relatedAspectSections = isRegistryArticle\n    ? []\n    : relatedSkyAspectSectionsForPlacement({`;
const after = `  const relatedAspectSections = relatedSkyAspectSectionsForPlacement({`;

if (!source.includes(before)) {
  if (source.includes(after)) {
    console.log("Sky V4 related-aspect hydration hotfix is already applied.");
    process.exit(0);
  }
  throw new Error("Expected Sky V4 registry-article aspect suppression boundary was not found.");
}
if (source.split(before).length !== 2) {
  throw new Error("Expected exactly one Sky V4 registry-article aspect suppression boundary.");
}

fs.writeFileSync(appPath, source.replace(before, after));
console.log("Preserved approved exact aspect sections across canonical V4 article hydration.");
