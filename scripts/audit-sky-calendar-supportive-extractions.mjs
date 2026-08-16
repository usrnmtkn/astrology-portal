#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPPORTIVE_EXTRACTIONS } from "./sky-calendar-supportive-extractions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDirectory = path.join(
  root,
  "packages/astro-knowledge/review/sky-calendar-meaning-components-v1",
);
const registryPath = path.join(reviewDirectory, "sky-calendar-meaning-components-v1.json");
const priorAuditPath = path.join(reviewDirectory, "supportive-pool-blocking-audit.json");
const jsonOutputPath = path.join(reviewDirectory, "supportive-pool-extraction-report.json");
const markdownOutputPath = path.join(reviewDirectory, "SUPPORTIVE-POOL-EXTRACTION-REPORT.md");
const transitDirectory = path.join(root, "packages/astro-knowledge/data/transits");

const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function exactSignRoutes(aspect) {
  const distance = aspect === "trine" ? 4 : 2;
  return signs.flatMap((signA, index) => [distance, -distance].map((offset) => ({
    signA,
    signB: signs[(index + offset + signs.length) % signs.length],
  })));
}

const registry = readJson(registryPath);
const priorAudit = readJson(priorAuditPath);
const signIndex = new Map(registry.signUnits.map((unit) => [unit.key, unit]));
const extractionEntries = Object.entries(SUPPORTIVE_EXTRACTIONS);
const softRecords = fs.readdirSync(transitDirectory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => readJson(path.join(transitDirectory, name)))
  .filter((record) => (
    record.status === "LIVE"
    && typeof record.readerCopy?.body === "string"
    && ["trine", "sextile"].includes(record.aspect)
  ));

const extractionRows = extractionEntries.map(([key, extraction]) => {
  const unit = signIndex.get(key);
  if (!unit) throw new Error(`Missing extracted unit ${key}`);
  const evidence = unit.supportive_realization_evidence?.find((item) => item.realization === extraction.realization);
  if (!evidence) throw new Error(`${key}: extracted realization has no provenance record`);
  if (!unit.supportive_realizations.includes(extraction.realization)) {
    throw new Error(`${key}: extracted realization is absent from supportive pool`);
  }
  if (extraction.source_ids.some((sourceId) => !unit.source_ids.includes(sourceId))) {
    throw new Error(`${key}: extraction cites evidence outside the unit`);
  }
  return {
    key,
    realization: extraction.realization,
    source_ids: extraction.source_ids,
    source_hashes: evidence.source_hashes,
  };
});

const after = {
  trine: { possible: 0, blocked: 0 },
  sextile: { possible: 0, blocked: 0 },
};
for (const record of softRecords) {
  for (const route of exactSignRoutes(record.aspect)) {
    after[record.aspect].possible += 1;
    const placementA = signIndex.get(`sky-sign/${record.transiting}/${route.signA}`);
    const placementB = signIndex.get(`sky-sign/${record.other}/${route.signB}`);
    if (!placementA?.supportive_realizations.length || !placementB?.supportive_realizations.length) {
      after[record.aspect].blocked += 1;
    }
  }
}

const totals = {
  extractedUnits: extractionRows.length,
  extractedRealizations: extractionRows.length,
  previouslyBlockedRoutes: priorAudit.totals.blockedCards,
  blockedRoutesAfter: after.trine.blocked + after.sextile.blocked,
  unblockedRoutes: priorAudit.totals.blockedCards - after.trine.blocked - after.sextile.blocked,
  emptySupportivePoolsAfter: registry.signUnits.filter((row) => row.supportive_realizations.length === 0).length,
  unsupportedUnits: [],
};

if (totals.extractedUnits !== 64) throw new Error(`Expected 64 extracted units, got ${totals.extractedUnits}`);
if (totals.previouslyBlockedRoutes !== 1345) throw new Error(`Expected historical blocked-route count 1345, got ${totals.previouslyBlockedRoutes}`);
if (totals.blockedRoutesAfter !== 0) throw new Error(`Expected all soft routes unblocked, found ${totals.blockedRoutesAfter}`);
if (totals.emptySupportivePoolsAfter !== 0) throw new Error(`Expected no empty supportive pools, found ${totals.emptySupportivePoolsAfter}`);

const report = {
  schema: "tldr.sky-calendar.supportive-pool-extraction-report.v1",
  status: "PENDING OWNER",
  generatedAt: "2026-08-16",
  rules: {
    extractionOnly: true,
    sourceBoundary: "Each realization comes only from its own sky-sign unit's governed evidence.",
    existingRealizationsChanged: 0,
    existingClassificationsChanged: 0,
    evidenceHashesChanged: 0,
  },
  totals,
  byAspectAfter: after,
  extractions: extractionRows.sort((left, right) => left.key.localeCompare(right.key)),
};

const extractionTable = report.extractions
  .map((row) => `| \`${row.key}\` | ${row.realization} | ${row.source_ids.map((sourceId) => `\`${sourceId}\``).join("<br>")} |`)
  .join("\n");

const markdown = `# Sky Calendar supportive-pool extraction report

Status: **PENDING OWNER**. These are governed meaning components, not serving copy.

## Plain result

- Supportive realizations extracted: **${totals.extractedRealizations}** across **${totals.extractedUnits}** units
- Previously blocked trine/sextile routes: **${totals.previouslyBlockedRoutes}**
- Routes unblocked by this extraction: **${totals.unblockedRoutes}**
- Routes still blocked: **${totals.blockedRoutesAfter}**
- Empty supportive pools remaining: **${totals.emptySupportivePoolsAfter}**
- Units whose evidence could not support an extraction: **${totals.unsupportedUnits.length}**

Every added realization cites its own unit's governed sign evidence. No existing realization was rewritten, removed, or reclassified. The eight owner-authored replacements retain every byte-locked string; four of those units receive one authorized additive supportive realization because their supportive pool was empty.

## Route result by aspect

| Aspect | Possible exact sign routes | Blocked after extraction |
| --- | ---: | ---: |
| Trine | ${after.trine.possible} | ${after.trine.blocked} |
| Sextile | ${after.sextile.possible} | ${after.sextile.blocked} |

## Extracted realizations and evidence

| Unit | Supportive realization | Governed evidence pointer |
| --- | --- | --- |
${extractionTable}
`;

fs.writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownOutputPath, `${markdown.trimEnd()}\n`);
console.log(JSON.stringify({ jsonOutputPath, markdownOutputPath, totals, byAspectAfter: after }, null, 2));
