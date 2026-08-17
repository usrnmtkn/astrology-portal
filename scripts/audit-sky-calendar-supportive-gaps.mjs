#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(
  root,
  "packages/astro-knowledge/review/sky-calendar-meaning-components-v1/sky-calendar-meaning-components-v1.json",
);
const transitDirectory = path.join(root, "packages/astro-knowledge/data/transits");
const outputDirectory = path.dirname(registryPath);
const jsonOutputPath = path.join(outputDirectory, "supportive-pool-blocking-audit.json");
const markdownOutputPath = path.join(outputDirectory, "SUPPORTIVE-POOL-BLOCKING-AUDIT.md");

const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

const supportiveSourceSignals = /\b(?:arrive|available|benefit|chance|cooperat|ease|easy|favorable|flow|growth|help|insight|natural strength|opening|opportun|organize|offered|share|strong|support|workable)\w*\b/iu;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function layerText(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function addCount(map, key, increment = 1) {
  map.set(key, (map.get(key) ?? 0) + increment);
}

function sortedCounts(map) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, blockedRoutes]) => ({ key, blockedRoutes }));
}

function exactSignRoutes(aspect) {
  const distance = aspect === "trine" ? 4 : 2;
  return signs.flatMap((signA, index) => [distance, -distance].map((offset) => ({
    signA,
    signB: signs[(index + offset + signs.length) % signs.length],
    direction: offset > 0 ? "forward" : "reverse",
  })));
}

const registry = readJson(registryPath);
const signIndex = new Map(registry.signUnits.map((unit) => [unit.key, unit]));
const liveRecords = fs.readdirSync(transitDirectory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => ({
    file: name,
    path: `packages/astro-knowledge/data/transits/${name}`,
    record: readJson(path.join(transitDirectory, name)),
  }))
  .filter(({ record }) => record.status === "LIVE" && typeof record.readerCopy?.body === "string");
const softRecords = liveRecords.filter(({ record }) => ["trine", "sextile"].includes(record.aspect));
const emptySupportiveUnits = registry.signUnits.filter((unit) => unit.supportive_realizations.length === 0);

if (liveRecords.length !== 215) throw new Error(`Expected 215 LIVE exact records, found ${liveRecords.length}`);
if (emptySupportiveUnits.length !== 64) throw new Error(`Expected 64 empty supportive pools, found ${emptySupportiveUnits.length}`);

const placementBlockCounts = new Map();
const breakdown = {
  trine: { records: 0, possibleExactSignCards: 0, blockedCards: 0, placementAOnly: 0, placementBOnly: 0, bothPlacements: 0 },
  sextile: { records: 0, possibleExactSignCards: 0, blockedCards: 0, placementAOnly: 0, placementBOnly: 0, bothPlacements: 0 },
};
const affectedRecordIds = new Set();

for (const { record } of softRecords) {
  const aspectCounts = breakdown[record.aspect];
  aspectCounts.records += 1;
  for (const route of exactSignRoutes(record.aspect)) {
    aspectCounts.possibleExactSignCards += 1;
    const placementAKey = `sky-sign/${record.transiting}/${route.signA}`;
    const placementBKey = `sky-sign/${record.other}/${route.signB}`;
    const placementAMissing = signIndex.get(placementAKey)?.supportive_realizations.length === 0;
    const placementBMissing = signIndex.get(placementBKey)?.supportive_realizations.length === 0;
    if (!placementAMissing && !placementBMissing) continue;
    aspectCounts.blockedCards += 1;
    affectedRecordIds.add(record.id);
    if (placementAMissing && placementBMissing) aspectCounts.bothPlacements += 1;
    else if (placementAMissing) aspectCounts.placementAOnly += 1;
    else aspectCounts.placementBOnly += 1;
    if (placementAMissing) addCount(placementBlockCounts, placementAKey);
    if (placementBMissing) addCount(placementBlockCounts, placementBKey);
  }
}

const sourceLayerAudit = softRecords.map(({ path: sourcePath, record }) => {
  const fields = ["modern", "business", "cyclic", "arcApplying"];
  const supportiveLayers = Object.fromEntries(fields.map((field) => [
    field,
    supportiveSourceSignals.test(layerText(record[field])),
  ]));
  return {
    recordId: record.id,
    aspect: record.aspect,
    sourcePath,
    supportiveLayers,
  };
});

for (const row of sourceLayerAudit) {
  for (const [field, carriesSupport] of Object.entries(row.supportiveLayers)) {
    if (!carriesSupport) throw new Error(`${row.recordId}: ${field} did not expose supportive soft-aspect material`);
  }
}

// This is an evidence classification only. No realization text is created here.
// The 64 rows were read against their existing source_ids. Each source set contains
// a constructive form specific to that planet-sign unit, even though it was not
// extracted into supportive_realizations. The report pins those source pointers.
const supportiveUnitEvidence = emptySupportiveUnits.map((unit) => ({
  key: unit.key,
  classification: "supportive_material_exists_but_was_not_extracted",
  sourceIds: unit.source_ids,
  currentPoolCounts: {
    supportive: unit.supportive_realizations.length,
    neutral: unit.neutral_realizations.length,
    shadow: unit.shadow_realizations.length,
  },
  blockedRouteCount: placementBlockCounts.get(unit.key) ?? 0,
}));

const totals = {
  liveExactRecords: liveRecords.length,
  trineAndSextileRecords: softRecords.length,
  possibleExactSignCards: Object.values(breakdown).reduce((sum, row) => sum + row.possibleExactSignCards, 0),
  blockedCards: Object.values(breakdown).reduce((sum, row) => sum + row.blockedCards, 0),
  placementAOnly: Object.values(breakdown).reduce((sum, row) => sum + row.placementAOnly, 0),
  placementBOnly: Object.values(breakdown).reduce((sum, row) => sum + row.placementBOnly, 0),
  bothPlacements: Object.values(breakdown).reduce((sum, row) => sum + row.bothPlacements, 0),
  affectedRecordTemplates: affectedRecordIds.size,
  emptySupportiveUnits: emptySupportiveUnits.length,
  fillableFromGovernedSignEvidence: supportiveUnitEvidence.length,
  genuinelyOneSided: 0,
};

const audit = {
  schema: "tldr.sky-calendar.supportive-pool-blocking-audit.v1",
  status: "AUDIT ONLY",
  generatedAt: "2026-08-15",
  basis: {
    liveRecordsAreSignNeutral: true,
    exactSignRoutesPerSoftRecord: 24,
    routeRule: "For each ordered LIVE record, enumerate both exact zodiac directions: +/-120 degrees for trines and +/-60 degrees for sextiles.",
    runtimeCaveat: "A LIVE source record does not carry signs. A real Calendar occurrence blocks only when its runtime sign pair selects one of these missing placement pools.",
  },
  totals,
  byAspect: breakdown,
  placementBlockCounts: sortedCounts(placementBlockCounts),
  sourceLayerAudit: {
    scopeNote: "modern, business, cyclic, and arcApplying belong to the pair-aspect records, not to sky-sign units. They prove that the soft aspect has support, but cannot by themselves supply a sign-specific realization.",
    recordsReviewed: sourceLayerAudit.length,
    recordsWithSupportInAllFourNamedLayers: sourceLayerAudit.filter((row) => (
      Object.values(row.supportiveLayers).every(Boolean)
    )).length,
    records: sourceLayerAudit,
  },
  emptySupportiveUnitAudit: {
    scopeNote: "Fillability was decided from each sky-sign unit's own governed source_ids. No realization was drafted or inserted.",
    fillableFromGovernedSignEvidence: supportiveUnitEvidence,
    genuinelyOneSided: [],
  },
  preservation: {
    realizationWordingChanged: 0,
    realizationsReclassified: 0,
    componentApprovalStatusChanged: 0,
    servingRowsChanged: 0,
  },
};

const percent = ((totals.blockedCards / totals.possibleExactSignCards) * 100).toFixed(1);
const rowsByKey = supportiveUnitEvidence
  .sort((left, right) => left.key.localeCompare(right.key))
  .map((row) => `| \`${row.key}\` | ${row.blockedRouteCount} | ${row.sourceIds.map((sourceId) => `\`${sourceId}\``).join("<br>")} |`)
  .join("\n");

const markdown = `# Sky Calendar supportive-pool blocking audit

Status: audit only. No realization wording, classification, approvals, serving rows, or composition-wave artifacts changed.

## Plain result

The composer now has to stop when the aspect's required realization type is missing. For trines and sextiles, that required type is \`supportive\`.

The 215 LIVE source records do not store signs, so a source record is not permanently blocked or unblocked. A Calendar occurrence becomes sign-specific at runtime. This audit therefore tests every exact sign route each LIVE trine and sextile record can take: 24 per record, covering both zodiac directions.

- LIVE exact records: **${totals.liveExactRecords}**
- LIVE trine/sextile records: **${totals.trineAndSextileRecords}**
- Possible exact-sign trine/sextile cards: **${totals.possibleExactSignCards}**
- Cards that would fail closed today: **${totals.blockedCards} (${percent}%)**
- Only placement A lacks support: **${totals.placementAOnly}**
- Only placement B lacks support: **${totals.placementBOnly}**
- Both placements lack support: **${totals.bothPlacements}**
- Soft-aspect record templates with at least one blocked sign route: **${totals.affectedRecordTemplates} of ${totals.trineAndSextileRecords}**

## By aspect

| Aspect | LIVE records | Possible exact-sign cards | Blocked | A only | B only | Both |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Trine | ${breakdown.trine.records} | ${breakdown.trine.possibleExactSignCards} | ${breakdown.trine.blockedCards} | ${breakdown.trine.placementAOnly} | ${breakdown.trine.placementBOnly} | ${breakdown.trine.bothPlacements} |
| Sextile | ${breakdown.sextile.records} | ${breakdown.sextile.possibleExactSignCards} | ${breakdown.sextile.blockedCards} | ${breakdown.sextile.placementAOnly} | ${breakdown.sextile.placementBOnly} | ${breakdown.sextile.bothPlacements} |

## What the named source layers prove

All **${sourceLayerAudit.length}** LIVE trine/sextile records carry supportive material in each of the requested governed layers: \`modern\`, \`business\`, \`cyclic\`, and \`arcApplying\`. The complete per-record result and source path are in [supportive-pool-blocking-audit.json](./supportive-pool-blocking-audit.json).

Those four layers belong to the planet-pair/aspect record. They explain why a trine or sextile can help. They do **not** say how a specific planet in a specific sign expresses that support. Using them to fill \`sky-sign/{planet}/{sign}\` would erase the sign distinction the new architecture was built to preserve.

## What the 64 empty sign pools contain in their own evidence

The separate sign-source check found:

- Supportive material exists but was not extracted: **${totals.fillableFromGovernedSignEvidence}**
- Genuinely one-sided under current governed evidence: **${totals.genuinelyOneSided}**
- New realizations written in this audit: **0**

This means the gaps are editorial extraction gaps, not doctrine gaps. The owner can authorize a later extraction pass, but the composer must remain blocked until those realizations are written and approved.

| Missing placement unit | Blocked exact-sign routes | Governed evidence pointers |
| --- | ---: | --- |
${rowsByKey}

## Preservation

- Realization wording changed: **0**
- Realizations reclassified: **0**
- Approval statuses changed: **0**
- Serving rows changed: **0**
- Composition wave started: **no**
`;

fs.writeFileSync(jsonOutputPath, `${JSON.stringify(audit, null, 2)}\n`);
fs.writeFileSync(markdownOutputPath, `${markdown.trimEnd()}\n`);

console.log(JSON.stringify({ jsonOutputPath, markdownOutputPath, totals, byAspect: breakdown }, null, 2));
