#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  composeNatalAspect,
  composeNatalPlacement,
  composePersonalTransit,
  composeSkyRetrograde
} from "../apps/web/src/content/sourceGroundedModels.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const packageRoot = "/private/tmp/tldr-astro-handoff-final/tldr-astro-handoff-final";
const sourceStore = JSON.parse(fs.readFileSync(path.join(packageRoot, "tldr-astro-records.json"), "utf8"));
const knownSourceKeys = new Set((sourceStore.records ?? []).map((record) => record.key));
const packageBundle = JSON.parse(fs.readFileSync(path.join(repoRoot, "apps/web/src/content/finalSourceGroundedDashboardRecords.json"), "utf8"));

const bannedReaderPatterns = [
  /X describes/i,
  /\bdescribes\b/i,
  /the style or condition/i,
  /\bcircumstances\b/i,
  /patterns show up/i,
  /this placement is easiest/i,
  /bringing .+ into/i,
  /\bmove through\b/i,
  /\bmoves through\b/i,
  /choose the next concrete response/i,
  /\bwatch for\b/i,
  /\bWatch for\b/i,
  /\b\w+(?:,\s+\w+){3,}\b/,
  /\band\b[^.?!]{0,24}\band\b[^.?!]{0,24}\band\b/i
];

function assertSourceKeys(composition) {
  for (const [slotName, slot] of Object.entries(composition.slots)) {
    assert.ok(slot.text.trim(), `${composition.recordId}.${slotName} must render text.`);
    for (const key of slot.sourceKeys) {
      if (key.startsWith("calculated:")) continue;
      assert.ok(knownSourceKeys.has(key), `${composition.recordId}.${slotName} source key must resolve: ${key}`);
    }
  }
}

function assertReaderCopy(composition) {
  assert.ok(composition.finalCopy.trim(), `${composition.recordId} must render final copy.`);
  for (const pattern of bannedReaderPatterns) {
    assert.ok(!pattern.test(composition.finalCopy), `${composition.recordId} rendered banned construction ${pattern}: ${composition.finalCopy}`);
  }
  assert.equal(composition.provenance.initial, composition.provenance.hydrated, `${composition.recordId} initial/hydrated provenance must match.`);
}

const displayNames = new Map([
  ["sun", "Sun"],
  ["moon", "Moon"],
  ["mercury", "Mercury"],
  ["venus", "Venus"],
  ["mars", "Mars"],
  ["jupiter", "Jupiter"],
  ["saturn", "Saturn"],
  ["uranus", "Uranus"],
  ["neptune", "Neptune"],
  ["pluto", "Pluto"],
  ["chiron", "Chiron"],
  ["north-node", "North Node"],
  ["true-node", "True Node"],
  ["south-node", "South Node"],
  ["ascendant", "Ascendant"],
  ["midheaven", "Midheaven"],
  ["aries", "Aries"],
  ["taurus", "Taurus"],
  ["gemini", "Gemini"],
  ["cancer", "Cancer"],
  ["leo", "Leo"],
  ["virgo", "Virgo"],
  ["libra", "Libra"],
  ["scorpio", "Scorpio"],
  ["sagittarius", "Sagittarius"],
  ["capricorn", "Capricorn"],
  ["aquarius", "Aquarius"],
  ["pisces", "Pisces"]
]);

function displayName(value) {
  return displayNames.get(value) ?? value.split("-").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}

function assertPackageSourceKeys(record) {
  for (const clause of Object.values(record.clauses ?? {})) {
    for (const key of clause.source_keys ?? []) {
      assert.ok(knownSourceKeys.has(key), `${record.canonicalKey} package source key must resolve: ${key}`);
    }
  }
}

function compositionForPackageRecord(record) {
  const parts = record.canonicalKey.split(".");

  if (record.family === "natal-placement") {
    const house = Number((parts[4] ?? "").replace("house_", ""));
    return composeNatalPlacement({
      natalSky: null,
      ownerPerspective: "you",
      position: {
        planet: displayName(parts[2]),
        sign: displayName(parts[3]),
        house: Number.isFinite(house) ? house : null,
        motion: "direct"
      }
    });
  }

  if (record.family === "natal-aspect") {
    return composeNatalAspect({
      aspect: parts[3],
      focalPlanet: displayName(parts[2]),
      otherPlanet: displayName(parts[4])
    }, "you");
  }

  if (record.family === "personalized-transit") {
    return composePersonalTransit({
      activeWindow: "calculated active window",
      aspect: parts[3],
      exactAt: "calculated exact time",
      natalPoint: displayName(parts[4]),
      natalHouse: 1,
      term: record.durationClass === "long" ? "long" : "short",
      transitingPlanet: displayName(parts[2])
    });
  }

  throw new Error(`Unsupported family in package coverage: ${record.family}`);
}

const natalSky = {
  positions: [
    { planet: "Sun", sign: "Aquarius", house: 9, motion: "direct" },
    { planet: "Saturn", sign: "Virgo", house: 4, motion: "direct" },
    { planet: "Jupiter", sign: "Leo", house: 3, motion: "direct" },
    { planet: "Venus", sign: "Taurus", house: 12, motion: "direct" }
  ],
  aspects: []
};

const fixtures = [
  {
    name: "Sun in Aquarius in the 9th house",
    kind: "natal-placement",
    composition: composeNatalPlacement({
      chartSect: "day",
      dignityLabel: "Constrained · Detriment",
      natalSky,
      ownerPerspective: "you",
      position: { planet: "Sun", sign: "Aquarius", house: 9, motion: "direct" },
      aspects: [
        { focalPlanet: "Sun", focalSign: "Aquarius", focalHouse: 9, otherPlanet: "Jupiter", otherSign: "Leo", otherHouse: 3, aspect: "opposition", orb: "2°" },
        { focalPlanet: "Sun", focalSign: "Aquarius", focalHouse: 9, otherPlanet: "Saturn", otherSign: "Virgo", otherHouse: 4, aspect: "square", orb: "4°" }
      ]
    })
  },
  {
    name: "Moon in Cancer in the 4th house, night chart",
    kind: "natal-placement",
    composition: composeNatalPlacement({
      chartSect: "night",
      natalSky: {
        positions: [
          { planet: "Moon", sign: "Cancer", house: 4, motion: "direct" }
        ],
        aspects: []
      },
      ownerPerspective: "you",
      position: { planet: "Moon", sign: "Cancer", house: 4, motion: "direct" }
    })
  },
  {
    name: "Mercury retrograde in Cancer on July 12, 2026",
    kind: "sky-retrograde",
    composition: composeSkyRetrograde({
      currentDate: "July 12, 2026",
      end: "July 23, 2026",
      phase: "retrograde passage",
      planet: "Mercury",
      sign: "Cancer",
      start: "June 29, 2026"
    })
  },
  {
    name: "Natal placement without reliable birth time",
    kind: "natal-placement-no-birth-time",
    composition: composeNatalPlacement({
      natalSky: null,
      ownerPerspective: "you",
      position: { planet: "Sun", sign: "Aquarius", house: 9, motion: "direct" },
      reliableBirthTime: false
    })
  },
  {
    name: "Focal natal aspect, Venus page",
    kind: "natal-aspect",
    composition: composeNatalAspect({
      aspect: "square",
      focalHouse: 12,
      focalPlanet: "Venus",
      focalSign: "Taurus",
      orb: "1°",
      otherHouse: 4,
      otherPlanet: "Saturn",
      otherSign: "Virgo"
    }, "you")
  },
  {
    name: "Focal natal aspect, Saturn page",
    kind: "natal-aspect",
    composition: composeNatalAspect({
      aspect: "square",
      focalHouse: 4,
      focalPlanet: "Saturn",
      focalSign: "Virgo",
      orb: "1°",
      otherHouse: 12,
      otherPlanet: "Venus",
      otherSign: "Taurus"
    }, "you")
  },
  {
    name: "Short-term personalized transit",
    kind: "personalized-transit-short",
    composition: composePersonalTransit({
      activeWindow: "July 12, 2026, 8:00 AM - July 13, 2026, 2:00 AM",
      aspect: "conjunction",
      exactAt: "July 12, 2026, 4:18 PM",
      natalHouse: 1,
      natalPoint: "Ascendant",
      term: "short",
      transitingPlanet: "Mars"
    })
  },
  {
    name: "Long-term personalized transit",
    kind: "personalized-transit-long",
    composition: composePersonalTransit({
      activeWindow: "March 23 - November 1",
      aspect: "square",
      exactAt: "July 21, 2026",
      natalHouse: 8,
      natalPoint: "Venus",
      natalSign: "Capricorn",
      orb: "0°",
      pass: "2nd of 3 passes",
      term: "long",
      transitingPlanet: "Saturn"
    })
  }
];

for (const fixture of fixtures) {
  assertSourceKeys(fixture.composition);
  assertReaderCopy(fixture.composition);
}

const readyRecords = packageBundle.records ?? [];
const sourceGapRecords = packageBundle.sourceGaps ?? [];
const packageCoverage = {
  byFamily: {},
  sampledRecords: []
};

for (const record of readyRecords) {
  assertPackageSourceKeys(record);
  const composition = compositionForPackageRecord(record);
  assertReaderCopy(composition);
  packageCoverage.byFamily[record.family] = (packageCoverage.byFamily[record.family] ?? 0) + 1;
  if (packageCoverage.sampledRecords.length < 12) {
    packageCoverage.sampledRecords.push({
      packageRecordId: record.canonicalKey,
      templateId: composition.templateId,
      templateVersion: composition.templateVersion,
      finalReaderCopy: composition.finalCopy,
      sourceKeysByPackageSlot: Object.fromEntries(
        Object.entries(record.clauses ?? {}).map(([slotName, clause]) => [slotName, clause.source_keys ?? []])
      ),
      provenance: composition.provenance
    });
  }
}

for (const gap of sourceGapRecords) {
  assert.equal(gap.state, "SOURCE_GAP", `${gap.canonicalKey} must remain an explicit SOURCE_GAP.`);
  assert.ok(Array.isArray(gap.missing) && gap.missing.length > 0, `${gap.canonicalKey} must name missing sources.`);
}

const report = {
  generatedAt: new Date(0).toISOString(),
  packageCoverage: {
    readyRecords: readyRecords.length,
    sourceGaps: sourceGapRecords.length,
    byFamily: packageCoverage.byFamily,
    sampledRecords: packageCoverage.sampledRecords,
    sourceGapPolicy: "SOURCE_GAP records are not composed with invented prose; runtime may show only a minimal factual emergency floor."
  },
  fixtures: fixtures.map((fixture) => ({
    name: fixture.name,
    kind: fixture.kind,
    templateId: fixture.composition.templateId,
    templateVersion: fixture.composition.templateVersion,
    normalizedRecordId: fixture.composition.recordId,
    conditionalBranches: fixture.composition.conditionalBranches ?? [],
    renderedSlots: fixture.composition.slots,
    sourceRoles: fixture.composition.sourceRoles ?? {},
    sourceKeysBySlot: Object.fromEntries(Object.entries(fixture.composition.slots).map(([key, slot]) => [key, slot.sourceKeys])),
    finalReaderCopy: fixture.composition.finalCopy,
    provenance: fixture.composition.provenance
  }))
};

const outputJson = path.join(repoRoot, "scripts/generated/source-grounded-reader-fixtures.json");
const outputMd = path.join(repoRoot, "scripts/generated/source-grounded-reader-fixtures.md");
fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(outputMd, [
  "# Source-grounded reader fixture proof",
  "",
  "## Package coverage",
  "",
  `- READY records: ${report.packageCoverage.readyRecords}`,
  `- SOURCE_GAP records: ${report.packageCoverage.sourceGaps}`,
  `- READY by family: ${JSON.stringify(report.packageCoverage.byFamily)}`,
  `- SOURCE_GAP policy: ${report.packageCoverage.sourceGapPolicy}`,
  "",
  "### Sampled Package-Backed Records",
  "",
  ...report.packageCoverage.sampledRecords.flatMap((record) => [
    `#### ${record.packageRecordId}`,
    "",
    `- template: ${record.templateId} (${record.templateVersion})`,
    `- provenance: ${record.provenance.initial} / ${record.provenance.hydrated}`,
    "",
    record.finalReaderCopy,
    "",
    "```json",
    JSON.stringify(record.sourceKeysByPackageSlot, null, 2),
    "```",
    ""
  ]),
  ...report.fixtures.flatMap((fixture) => [
    `## ${fixture.name}`,
    "",
    `- template: ${fixture.templateId} (${fixture.templateVersion})`,
    `- record: ${fixture.normalizedRecordId}`,
    `- conditional branches: ${fixture.conditionalBranches.length ? fixture.conditionalBranches.join(", ") : "none"}`,
    `- provenance: ${fixture.provenance.initial} / ${fixture.provenance.hydrated}`,
    `- primary pair source: ${(fixture.sourceRoles.primaryPairSourceKeys ?? []).join(", ") || "SOURCE_GAP"}`,
    `- supporting sources: ${(fixture.sourceRoles.supportingSourceKeys ?? []).join(", ") || "none"}`,
    "",
    "### Copy",
    "",
    fixture.finalReaderCopy,
    "",
    "### Source keys by slot",
    "",
    "```json",
    JSON.stringify(fixture.sourceKeysBySlot, null, 2),
    "```",
    ""
  ])
].join("\n"));

console.log(JSON.stringify({ status: "PASS", fixtures: report.fixtures.length, outputJson, outputMd }, null, 2));
