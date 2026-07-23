#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repoRoot, "scripts/generated/aspect-inventory.json");

const TRANSITING_BODIES = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith",
  "north-node",
  "south-node"
];

const ASPECT_TYPES = ["conjunction", "opposition", "sextile", "square", "trine"];

const NATAL_POINTS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith",
  "north-node",
  "south-node",
  "ascendant",
  "midheaven",
  "descendant",
  "imum-coeli"
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function hashBody(value) {
  return crypto.createHash("sha1").update(String(value ?? "")).digest("hex");
}

const transitLibrary = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const sourceRows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const renderer = createTransitSynastryRenderer(transitLibrary, templates, sourceRows);

const aspectUnits = [];
const sourceGaps = [];

for (const transiting_body of TRANSITING_BODIES) {
  for (const aspect_type of ASPECT_TYPES) {
    for (const natal_point of NATAL_POINTS) {
      try {
        const rendered = renderer.renderTransitAspect({
          transiting: transiting_body,
          natal: natal_point,
          aspect: aspect_type
        });
        aspectUnits.push({
          transiting_body,
          aspect_type,
          natal_point,
          current_key: rendered.contentKey ?? rendered.templateKey ?? null,
          body_hash: hashBody(rendered.body),
          body: rendered.body
        });
      } catch (error) {
        sourceGaps.push({
          transiting_body,
          aspect_type,
          natal_point,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
}

const duplicates = [...Map.groupBy(aspectUnits, (entry) => entry.body_hash).entries()]
  .filter(([, entries]) => entries.length > 1)
  .map(([body_hash, entries]) => ({
    body_hash,
    count: entries.length,
    transiting_bodies: [...new Set(entries.map((entry) => entry.transiting_body))].sort(),
    natal_points: [...new Set(entries.map((entry) => entry.natal_point))].sort(),
    aspect_types: [...new Set(entries.map((entry) => entry.aspect_type))].sort(),
    entries: entries.map(({ body, ...entry }) => entry)
  }))
  .sort((a, b) => b.count - a.count || a.body_hash.localeCompare(b.body_hash));

const laneSummaries = NATAL_POINTS.map((natal_point) => {
  const entries = aspectUnits.filter((entry) => entry.natal_point === natal_point);
  return {
    natal_point,
    slots: entries.length,
    distinct_bodies: new Set(entries.map((entry) => entry.body_hash)).size,
    duplicate_groups: duplicates.filter((group) => group.natal_points.includes(natal_point)).length
  };
});

const inventory = {
  generated_at: new Date().toISOString(),
  surface: "you",
  inventory_type: "natal_transit_aspect_units",
  aspect_units: aspectUnits,
  lane_summaries: laneSummaries,
  duplicates,
  diagnostics: {
    transiting_body_count: TRANSITING_BODIES.length,
    aspect_type_count: ASPECT_TYPES.length,
    natal_point_count: NATAL_POINTS.length,
    rendered_count: aspectUnits.length,
    source_gap_count: sourceGaps.length,
    source_gaps: sourceGaps
  }
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(inventory, null, 2) + "\n");
console.log(`Wrote ${outPath}`);
console.log(`Rendered ${aspectUnits.length} units with ${duplicates.length} duplicate body group(s) and ${sourceGaps.length} source gap(s).`);
