#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "tldr-astro-phrasebank",
  "TLDR-SR-OVERLAY-MANIFESTATION-SETS-V1-NEEDS-REVIEW.md"
);
const outputPath = path.join(
  repoRoot,
  "packages",
  "astro-knowledge",
  "data",
  "manifestation-sets",
  "sr-overlays-v1.json"
);
const source = fs.readFileSync(sourcePath, "utf8");
const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

assert.match(source, /Status: `owner_approved`/u, "SR-overlay source must be owner-approved before import.");

const sections = [...source.matchAll(
  /^### (sr-overlay\/(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\/(\d{1,2}))(?: ★)?\n\n\*\*FACTOR:\*\* ([^\n]+)\n\n\*\*DOMAIN:\*\* ([^\n]+)\n\n\*\*POSSIBLE LIVED MANIFESTATIONS:\*\* ([^\n]+)\n\n\*\*DO NOT ASSUME:\*\* ([^\n]+)\n\n\*\*COPY CLAIM:\*\* ([^\n]+)(?=\n\n(?:###|##)|\n?$)/gmu
)];

assert.equal(sections.length, 120, "Expected the complete Sun-through-Pluto x houses 1-12 grid.");

function splitList(value) {
  return value.split(" · ").map((item) => item.trim()).filter(Boolean);
}

const records = {};
for (const match of sections) {
  const [, key, planet, houseText, factor, domain, manifestations, doNotAssume, copyClaim] = match;
  const house = Number(houseText);
  assert.equal(factor, `Solar Return ${planet[0].toUpperCase()}${planet.slice(1)} in the natal ${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"} house`);
  assert(!records[key], `Duplicate SR-overlay key: ${key}`);
  records[key] = {
    factorType: "sr-overlay",
    match: {
      house,
      overlayPoint: planet[0].toUpperCase() + planet.slice(1)
    },
    domain: splitList(domain),
    possibleLivedManifestations: splitList(manifestations),
    doNotAssume: splitList(doNotAssume),
    copyClaim: {
      text: copyClaim,
      review_status: "approved"
    },
    provenance: "TLDR-SR-OVERLAY-MANIFESTATION-SETS-V1-NEEDS-REVIEW.md; exact wording owner-approved 2026-08-10",
    review_status: "approved"
  };
}

for (const planet of planets) {
  for (let house = 1; house <= 12; house += 1) {
    assert(records[`sr-overlay/${planet}/${house}`], `Missing sr-overlay/${planet}/${house}`);
  }
}

const collection = {
  id: "sr-overlay-manifestation-sets-v1",
  kind: "manifestation-set-collection",
  version: 1,
  coverageDomains: [
    "self and body",
    "money and resources",
    "communication and local life",
    "home and family",
    "creativity and pleasure",
    "work and health",
    "relationships and agreements",
    "shared resources and closure",
    "study travel and publishing",
    "career and public role",
    "friends groups and plans",
    "privacy rest and institutions"
  ],
  records,
  approval: {
    status: "owner_approved",
    approvedOn: "2026-08-10",
    sourcePath: "tldr-astro-phrasebank/TLDR-SR-OVERLAY-MANIFESTATION-SETS-V1-NEEDS-REVIEW.md"
  },
  review_status: "approved"
};

fs.writeFileSync(outputPath, `${JSON.stringify(collection, null, 2)}\n`);
console.log(`Imported ${Object.keys(records).length} owner-approved SR-overlay records to ${path.relative(repoRoot, outputPath)}.`);
