#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filePath = path.join(repoRoot, "apps/web/src/features/sky/SkyDetailArticle.tsx");
let source = fs.readFileSync(filePath, "utf8");

const before = `  const relatedAspectRows = (detail.relatedAspects?.rows ?? []).map(normalizeRelatedAspectRow);
  const relatedAspectGrouping = residencyContext
    ? "event"
    : detail.relatedAspects?.grouping ?? "tone";
  const eventAspectLabel = residencyContext
    ? "Aspects shaping this transit"
    : detail.relatedAspects?.heading?.trim() || "Key aspects";
  const aspectGroupDefinitions = relatedAspectGrouping === "event"
    ? ([{ id: "key-aspects" as const, label: eventAspectLabel }])`;

const after = `  const relatedAspectRows = (detail.relatedAspects?.rows ?? []).map(normalizeRelatedAspectRow);
  const relatedAspectGrouping = detail.relatedAspects?.grouping ?? "tone";
  const aspectGroupDefinitions = relatedAspectGrouping === "event"
    ? ([{ id: "key-aspects" as const, label: detail.relatedAspects?.heading?.trim() || "Key aspects" }])`;

if (!source.includes(before)) {
  if (source.includes(after)) {
    console.log("Sky Placement residency aspects already use the existing Gifts/Lessons tone grouping.");
    process.exit(0);
  }
  throw new Error("Could not find the residency event-grouping UI block.");
}

source = source.replace(before, after);
fs.writeFileSync(filePath, source, "utf8");
console.log("Sky Placement residency aspects now reuse the existing Gifts/Lessons grouping.");
