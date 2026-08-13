#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13.json");
const workbookPath = path.join(repoRoot, "tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx");
const outputPath = path.join(repoRoot, "packages/astro-knowledge/review/ll-matrix-v13-wp1-review-batch-manifest.json");
const qaRootArg = process.argv.find((argument) => argument.startsWith("--qa-root="));
const qaRoot = path.resolve(qaRootArg ? qaRootArg.slice("--qa-root=".length) : repoRoot);
const inventoryPath = path.join(qaRoot, "artifacts/natal-chart-content-qa-inventory-2026-08-12.json");
const resultsPath = path.join(qaRoot, "packages/astro-knowledge/review/natal-chart-content-qa-semantic-results-2026-08-12.json");
const signs = new Set(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableSha256(value) {
  return sha256(JSON.stringify(stable(value)));
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replaceAll("_", "-").replace(/\s+/gu, "-");
}

function normalizeAspect(value) {
  const result = normalize(value);
  return result === "inconjunct" ? "quincunx" : result;
}

function houseNumber(value) {
  return Number(String(value || "").match(/^(1[0-2]|[1-9])(?:st|nd|rd|th) house$/iu)?.[1] || 0);
}

function familyFor(row) {
  const parts = row.key.split("|");
  if (row.sheet === "AspectMeanings") return parts.length === 3 ? "natal-aspect-exact" : "natal-aspect-generic";
  if (row.sheet === "NodesPhasesFortune") {
    if (/^(north|south)-node\|/u.test(row.key)) return houseNumber(parts[1]) ? "node-house" : "node-sign";
    if (row.key === "part-of-fortune") return "part-of-fortune";
    return "lunar-phase";
  }
  if (parts.length === 2) return houseNumber(parts[1]) ? "placement-house-exact" : "placement-sign-exact";
  if (houseNumber(parts[0])) return "house-generic";
  if (signs.has(normalize(parts[0]))) return "sign-generic";
  return "planet-generic";
}

function runtimeKeyFor(row) {
  const parts = row.key.split("|");
  if (row.sheet === "AspectMeanings") {
    return parts.length === 3
      ? `fallback-hook/natal-aspect-lived/${normalize(parts[0])}/${normalizeAspect(parts[1])}/${normalize(parts[2])}`
      : `fallback-hook/aspect-lived/${normalizeAspect(parts[0])}`;
  }
  if (row.sheet === "NodesPhasesFortune" && row.key === "balsamic-moon") return "fallback-hook/natal-moon-phase-lived/balsamic";
  if (parts.length === 2) {
    const house = houseNumber(parts[1]);
    return house
      ? `fallback-hook/placement-house-lived/${normalize(parts[0])}/${house}`
      : `fallback-hook/placement-sign-lived/${normalize(parts[0])}/${normalize(parts[1])}`;
  }
  const house = houseNumber(parts[0]);
  if (house) return `fallback-hook/house-lived/${house}`;
  if (signs.has(normalize(parts[0]))) return `fallback-hook/sign-lived/${normalize(parts[0])}`;
  return `fallback-hook/planet-lived/${normalize(parts[0])}`;
}

function rowMatchesOccurrence(row, occurrence) {
  const facts = occurrence.facts || {};
  const parts = row.key.split("|");
  const family = familyFor(row);
  if (family === "natal-aspect-exact") {
    if (occurrence.family !== "natal-aspect") return false;
    const wanted = [normalize(parts[0]), normalize(parts[2])].sort().join("|");
    const actual = [normalize(facts.planetA), normalize(facts.planetB)].sort().join("|");
    return wanted === actual && normalizeAspect(parts[1]) === normalizeAspect(facts.aspect);
  }
  if (family === "natal-aspect-generic") return occurrence.family === "natal-aspect" && normalizeAspect(parts[0]) === normalizeAspect(facts.aspect);
  if (family === "placement-sign-exact") return occurrence.family === "placement-composed" && normalize(parts[0]) === normalize(facts.planet) && normalize(parts[1]) === normalize(facts.sign);
  if (family === "placement-house-exact") return occurrence.family === "placement-composed" && normalize(parts[0]) === normalize(facts.planet) && houseNumber(parts[1]) === Number(facts.house);
  if (family === "planet-generic") return occurrence.family === "placement-composed" && normalize(parts[0]) === normalize(facts.planet);
  if (family === "sign-generic") return occurrence.family === "placement-composed" && normalize(parts[0]) === normalize(facts.sign);
  if (family === "house-generic") return occurrence.family === "placement-composed" && houseNumber(parts[0]) === Number(facts.house);
  if (family === "node-sign") return occurrence.family === "placement-composed" && normalize(parts[0]) === normalize(facts.planet) && normalize(parts[1]) === normalize(facts.sign);
  if (family === "node-house") return occurrence.family === "placement-composed" && normalize(parts[0]) === normalize(facts.planet) && houseNumber(parts[1]) === Number(facts.house);
  return false;
}

function annotation(copy) {
  const findings = [];
  const realMatches = copy.match(/\breal(?:ly)?\b/giu) || [];
  if (realMatches.length > 1 || /\b(?:make|makes|made|becomes?|gets?|feels?) (?:it )?real\b/iu.test(copy) || /\bthe real (?:work|progress|lesson|gift|question)\b/iu.test(copy)) {
    findings.push("real-filler: review repeated or abstract 'real' language for a concrete lived consequence");
  }
  if (/\b(?:energy|energies|activates?|activation|alignment|vibration|frequency|embod(?:y|ies)|container|portal|invitation)\b/iu.test(copy)) {
    findings.push("translation-required: an abstract astrology/therapy term may need an observable action or consequence");
  }
  const astrologyMentions = copy.match(/\b(?:planet|sign|house|aspect|conjunction|sextile|square|trine|opposition|quincunx|node|moon)\b/giu) || [];
  if (astrologyMentions.length >= 4) {
    findings.push("astrology-restated: repeated astrology naming may explain the label again instead of advancing the lived interpretation");
  }
  return findings.length ? findings.join("; ") : "No deterministic V13 clarity defect detected; owner review controls.";
}

const rawBytes = fs.readFileSync(sourcePath);
const source = JSON.parse(rawBytes);
const workbookBytes = fs.readFileSync(workbookPath);
const workbookById = new Map();
for (const sheet of ["PlacementMeanings", "AspectMeanings", "NodesPhasesFortune"]) {
  for (const item of readInlineXlsxSheet(workbookPath, sheet)) workbookById.set(`${sheet}\u0000${item.cells.Key}`, item);
}
const rows = source.rows.filter((row) => row.ownerApproved !== true).map((row) => {
  const workbook = workbookById.get(`${row.sheet}\u0000${row.key}`);
  if (!workbook || workbook.cells.Copy !== row.copy || String(workbook.cells.OwnerApproved).trim().toUpperCase() === "TRUE") {
    throw new Error(`Source/workbook mismatch for unapproved row ${row.sheet}/${row.key}`);
  }
  const family = familyFor(row);
  const metadata = {
    sheet: row.sheet,
    workbookRow: workbook.rowNumber,
    rowKey: row.key,
    contentKey: runtimeKeyFor(row),
    family,
    copySha256: sha256(row.copy),
    sourceWorkbookSha256: sha256(workbookBytes),
    sourceExportSha256: sha256(rawBytes),
  };
  return { ...row, workbookRow: workbook.rowNumber, family, contentKey: metadata.contentKey, metadataSha256: stableSha256(metadata), judgeAnnotation: annotation(row.copy) };
});
if (rows.length !== 713) throw new Error(`Expected 713 unapproved rows, found ${rows.length}.`);
if (new Set(rows.map((row) => row.contentKey)).size !== 713) throw new Error("The 713 WP-1 source rows must map to unique content keys.");

const inventoryBytes = fs.readFileSync(inventoryPath);
const resultBytes = fs.readFileSync(resultsPath);
const inventory = JSON.parse(inventoryBytes);
const results = JSON.parse(resultBytes);
const resultById = new Map(results.results.map((result) => [result.reviewId, result]));
for (const row of rows) {
  const judged = new Set();
  const flagged = new Set();
  for (const passage of inventory.reviewQueue) {
    const result = resultById.get(passage.reviewId);
    if (!result || result.verdict === "DEFERRED_PENDING_PASS_2") continue;
    if (!passage.occurrences.some((occurrence) => rowMatchesOccurrence(row, occurrence))) continue;
    judged.add(passage.reviewId);
    if (["EDIT", "CUT"].includes(result.verdict)) flagged.add(passage.reviewId);
  }
  row.qa = { judgedPassages: judged.size, flaggedPassages: flagged.size, flagRate: judged.size ? flagged.size / judged.size : null };
}

const exactAspects = rows.filter((row) => row.family === "natal-aspect-exact").sort((a, b) =>
  (b.qa.flagRate ?? -1) - (a.qa.flagRate ?? -1) || b.qa.flaggedPassages - a.qa.flaggedPassages || a.key.localeCompare(b.key),
);
const chunkSizes = [132, 131, 131, 131];
let offset = 0;
const candidateBatches = chunkSizes.map((size, index) => {
  const batchRows = exactAspects.slice(offset, offset + size);
  offset += size;
  return { workingId: `aspect-${index + 1}`, label: `AspectMeanings exact aspects ${index + 1}`, rows: batchRows };
});
const placementSignAndBase = rows.filter((row) => ["placement-sign-exact", "sign-generic", "planet-generic", "house-generic"].includes(row.family));
const placementHouseNodesAndGenericAspect = rows.filter((row) => ["placement-house-exact", "node-sign", "node-house", "lunar-phase", "part-of-fortune", "natal-aspect-generic"].includes(row.family));
candidateBatches.push(
  { workingId: "placement-sign-base", label: "PlacementMeanings sign rows and generic placement bases", rows: placementSignAndBase },
  { workingId: "placement-house-nodes", label: "PlacementMeanings house rows, NodesPhasesFortune, and generic aspects", rows: placementHouseNodesAndGenericAspect },
);
if (candidateBatches.reduce((total, batch) => total + batch.rows.length, 0) !== 713) throw new Error("Batch partition does not cover all 713 rows exactly.");

function batchQa(batch) {
  const judged = new Set();
  const flagged = new Set();
  for (const passage of inventory.reviewQueue) {
    const result = resultById.get(passage.reviewId);
    if (!result || result.verdict === "DEFERRED_PENDING_PASS_2") continue;
    if (!batch.rows.some((row) => passage.occurrences.some((occurrence) => rowMatchesOccurrence(row, occurrence)))) continue;
    judged.add(passage.reviewId);
    if (["EDIT", "CUT"].includes(result.verdict)) flagged.add(passage.reviewId);
  }
  return { judgedPassages: judged.size, qaFlagsRetiredWhenApproved: flagged.size, flagRate: judged.size ? flagged.size / judged.size : null };
}

for (const batch of candidateBatches) batch.qa = batchQa(batch);
candidateBatches.sort((a, b) => (b.qa.flagRate ?? -1) - (a.qa.flagRate ?? -1) || b.qa.qaFlagsRetiredWhenApproved - a.qa.qaFlagsRetiredWhenApproved || a.workingId.localeCompare(b.workingId));

const manifest = {
  schemaVersion: "ll-matrix-v13-wp1-review-batches-v1",
  generatedAt: "2026-08-13T00:00:00.000Z",
  source: {
    exportPath: path.relative(repoRoot, sourcePath),
    exportSha256: sha256(rawBytes),
    workbookPath: path.relative(repoRoot, workbookPath),
    workbookSha256: sha256(workbookBytes),
    unapprovedRows: 713,
  },
  semanticQaEvidence: {
    inventoryPath: path.relative(qaRoot, inventoryPath),
    inventorySha256: sha256(inventoryBytes),
    resultsPath: path.relative(qaRoot, resultsPath),
    resultsSha256: sha256(resultBytes),
    meaning: "Unique EDIT/CUT passages matched by rendered family facts. Per-batch counts are prospective retirement counts and are not additive where generic and exact placement families overlap.",
  },
  governance: {
    advisoryOnly: true,
    unapprovedRowsServe: false,
    partialImportsAllowed: false,
    friendDerivationsAutoServe: false,
    autoPublish: false,
    writerPromotion: false,
  },
  batches: candidateBatches.map((batch, index) => ({
    batchId: `WP1-B${String(index + 1).padStart(2, "0")}`,
    workingId: batch.workingId,
    label: batch.label,
    sheets: [...new Set(batch.rows.map((row) => row.sheet))],
    families: [...new Set(batch.rows.map((row) => row.family))].sort(),
    rowCount: batch.rows.length,
    ...batch.qa,
    rows: batch.rows.map((row) => ({
      sheet: row.sheet,
      workbookRow: row.workbookRow,
      family: row.family,
      rowKey: row.key,
      contentKey: row.contentKey,
      currentCopy: row.copy,
      governance: row.governance,
      ownerApproved: false,
      judgeAnnotation: row.judgeAnnotation,
      metadataSha256: row.metadataSha256,
      qa: row.qa,
    })),
  })),
};
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest.batches.map(({ batchId, label, families, rowCount, judgedPassages, qaFlagsRetiredWhenApproved, flagRate }) => ({ batchId, label, families, rowCount, judgedPassages, qaFlagsRetiredWhenApproved, flagRatePct: flagRate == null ? null : Number((flagRate * 100).toFixed(2)) })), null, 2));
