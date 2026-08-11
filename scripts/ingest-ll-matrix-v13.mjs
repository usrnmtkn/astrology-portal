#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workbookRelativePath = "tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx";
const exportRelativePath = "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/ll-matrix-v13.json";
const lockedRelativePath = "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/knowledge-matrix-v13-owner-approved-locked.json";
const publicLockedRelativePath = "apps/web/public/content/knowledge-matrix-v13/v13-direct-language-owner-approved/knowledge-matrix-v13-owner-approved-locked.json";
const sourceRowsRelativePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const manifestRelativePath = "packages/astro-knowledge/review/ll-matrix-v13-runtime-manifest.json";
const ingestionRecordRelativePath = "packages/astro-knowledge/review/ll-matrix-v13-ingestion-2026-08-10.md";
const releaseId = "ll-matrix-v13-owner-approved-runtime";
const version = "v13-direct-language-owner-approved";
const approvedAt = "2026-08-10";
const governanceDecisionKey = "V13_CANONICAL_LINEAGE_OWNER_DECISION_2026_08_10";
const governanceDecision = "The 195-row ClarityStrictV13 pass in TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx is canonical and owner-approved 2026-08-10. The Gemini clarity-first V12-to-V13 script path is discarded and must not run because it would blind-edit row-approved copy.";
const expectedSheetCounts = { PlacementMeanings: 262, AspectMeanings: 695, NodesPhasesFortune: 57 };
const expectedApprovedSheetCounts = { PlacementMeanings: 113, AspectMeanings: 165, NodesPhasesFortune: 23 };
const expectedGovernanceCounts = {
  "owner-approved-v13-direct-language": 194,
  "owner-lived-experience-ll-v9-owner-approved": 106,
  "owner-approved-clarity-fix-ll-v12": 1,
};
const allowedGovernance = new Set(Object.keys(expectedGovernanceCounts));
const servingApprovedReviews = new Set(["approved", "approved_reuse", "reviewed"]);
const signs = new Set([
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]);
const columns = {
  PlacementMeanings: { key: "A", copy: "G", governance: "I", ownerApproved: "J" },
  AspectMeanings: { key: "A", copy: "H", governance: "J", ownerApproved: "K" },
  NodesPhasesFortune: { key: "A", copy: "E", governance: "G", ownerApproved: "H" },
};

function absolute(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizedBoolean(value) {
  const normalized = String(value).trim().toUpperCase();
  return value === true || normalized === "TRUE" || normalized === "1";
}

function normalizeObject(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/gu, "-");
}

function normalizeAspect(value) {
  const normalized = normalizeObject(value);
  return normalized === "inconjunct" ? "quincunx" : normalized;
}

function houseNumber(value) {
  const match = String(value).trim().toLowerCase().match(/^(1[0-2]|[1-9])(?:st|nd|rd|th) house$/u);
  return match ? Number(match[1]) : null;
}

function placementContentKey(rawKey) {
  const parts = rawKey.split("|");
  if (parts.length === 2) {
    const object = normalizeObject(parts[0]);
    const house = houseNumber(parts[1]);
    if (house) return `fallback-hook/placement-house-lived/${object}/${house}`;
    if (signs.has(parts[1])) return `fallback-hook/placement-sign-lived/${object}/${parts[1]}`;
  }
  if (parts.length === 1) {
    const house = houseNumber(parts[0]);
    if (house) return `fallback-hook/house-lived/${house}`;
    if (signs.has(parts[0])) return `fallback-hook/sign-lived/${parts[0]}`;
    return `fallback-hook/planet-lived/${normalizeObject(parts[0])}`;
  }
  throw new Error(`Unsupported PlacementMeanings runtime key: ${rawKey}`);
}

function aspectContentKey(rawKey) {
  const parts = rawKey.split("|");
  if (parts.length === 3) {
    return `fallback-hook/natal-aspect-lived/${normalizeObject(parts[0])}/${normalizeAspect(parts[1])}/${normalizeObject(parts[2])}`;
  }
  if (parts.length === 1) return `fallback-hook/aspect-lived/${normalizeAspect(parts[0])}`;
  throw new Error(`Unsupported AspectMeanings runtime key: ${rawKey}`);
}

function contentKeyFor(row) {
  if (row.sheet === "PlacementMeanings") return placementContentKey(row.key);
  if (row.sheet === "AspectMeanings") return aspectContentKey(row.key);
  if (row.sheet === "NodesPhasesFortune") {
    return row.key === "balsamic-moon"
      ? "fallback-hook/natal-moon-phase-lived/balsamic"
      : placementContentKey(row.key);
  }
  throw new Error(`Unsupported LL matrix sheet: ${row.sheet}`);
}

function runtimeFamilyFor(contentKey) {
  for (const family of [
    "natal-aspect-lived", "placement-sign-lived", "placement-house-lived",
    "planet-lived", "sign-lived", "house-lived", "natal-moon-phase-lived",
  ]) {
    if (contentKey.startsWith(`fallback-hook/${family}/`)) return family;
  }
  if (contentKey.startsWith("fallback-hook/aspect-lived/")) return "natal-aspect-generic-lived";
  throw new Error(`Unsupported LL matrix destination key: ${contentKey}`);
}

function compareRawExportToWorkbook(rawRows, workbookRows) {
  const keyedWorkbookRows = new Map();
  for (const [sheet, rows] of Object.entries(workbookRows)) {
    if (rows.length !== expectedSheetCounts[sheet]) {
      throw new Error(`${sheet} row count mismatch: ${rows.length}/${expectedSheetCounts[sheet]}.`);
    }
    for (const row of rows) keyedWorkbookRows.set(`${sheet}\u0000${row.cells.Key}`, row);
  }
  if (rawRows.length !== keyedWorkbookRows.size) {
    throw new Error(`Workbook/export row count mismatch: ${keyedWorkbookRows.size}/${rawRows.length}.`);
  }
  return rawRows.map((row) => {
    const workbookRow = keyedWorkbookRows.get(`${row.sheet}\u0000${row.key}`);
    if (!workbookRow) throw new Error(`Workbook row not found: ${row.sheet}/${row.key}`);
    const cells = workbookRow.cells;
    if (
      cells.Copy !== row.copy
      || cells.Governance !== row.governance
      || normalizedBoolean(cells.OwnerApproved) !== (row.ownerApproved === true)
    ) {
      throw new Error(`Workbook/export authority or copy mismatch: ${row.sheet}/${row.key}`);
    }
    if (row.sheet === "PlacementMeanings" && (cells.Planet !== row.planet || cells.Position !== row.position)) {
      throw new Error(`Workbook/export placement metadata mismatch: ${row.key}`);
    }
    if (row.sheet === "AspectMeanings" && (
      normalizeObject(cells.PlanetA) !== normalizeObject(row.planetA)
      || normalizeAspect(cells.Aspect) !== normalizeAspect(row.aspect)
      || normalizeObject(cells.PlanetB) !== normalizeObject(row.planetB)
    )) {
      throw new Error(`Workbook/export aspect metadata mismatch: ${row.key}`);
    }
    return { ...row, workbookRow: workbookRow.rowNumber, workbookCells: cells };
  });
}

const workbookPath = absolute(workbookRelativePath);
const rawExport = readJson(exportRelativePath);
if (rawExport.version !== "v13-direct-language" || rawExport.rows?.length !== 1014) {
  throw new Error("LL matrix V13 raw export metadata or source count is invalid.");
}
const workbookRows = Object.fromEntries(
  Object.keys(expectedSheetCounts).map((sheet) => [sheet, readInlineXlsxSheet(workbookPath, sheet)]),
);
const governanceRows = readInlineXlsxSheet(workbookPath, "GovernanceLegend");
const recordedDecision = governanceRows.find((row) => row.cells.Label === governanceDecisionKey);
if (recordedDecision?.cells.Meaning !== governanceDecision) {
  throw new Error("The canonical V13 lineage decision is not recorded exactly in GovernanceLegend.");
}
const clarityRows = readInlineXlsxSheet(workbookPath, "ClarityStrictV13");
if (
  clarityRows.length !== 195
  || clarityRows.some((row) => row.cells.Status !== "OWNER APPROVED 2026-08-10")
) {
  throw new Error("ClarityStrictV13 must contain exactly 195 owner-approved rows.");
}

const reconciledRows = compareRawExportToWorkbook(rawExport.rows, workbookRows);
const approvedRows = reconciledRows.filter((row) => row.ownerApproved === true);
const unapprovedRows = reconciledRows.filter((row) => row.ownerApproved !== true);
if (approvedRows.length !== 301 || unapprovedRows.length !== 713) {
  throw new Error(`LL matrix V13 approval counts must be 301/713, received ${approvedRows.length}/${unapprovedRows.length}.`);
}
const approvedSheetCounts = Object.fromEntries(Object.keys(expectedApprovedSheetCounts).map((sheet) => [
  sheet, approvedRows.filter((row) => row.sheet === sheet).length,
]));
if (JSON.stringify(approvedSheetCounts) !== JSON.stringify(expectedApprovedSheetCounts)) {
  throw new Error(`LL matrix V13 approved sheet counts are invalid: ${JSON.stringify(approvedSheetCounts)}.`);
}
const governanceCounts = Object.fromEntries([...allowedGovernance].map((governance) => [
  governance, approvedRows.filter((row) => row.governance === governance).length,
]));
if (
  JSON.stringify(governanceCounts) !== JSON.stringify(expectedGovernanceCounts)
  || approvedRows.some((row) => !allowedGovernance.has(row.governance))
) {
  throw new Error(`LL matrix V13 governance counts are invalid: ${JSON.stringify(governanceCounts)}.`);
}

const workbookSha256 = sha256(fs.readFileSync(workbookPath));
const sourceExportSha256 = sha256(fs.readFileSync(absolute(exportRelativePath)));
const lockedRows = approvedRows.map((row) => {
  const contentKey = contentKeyFor(row);
  const payloadSha256 = sha256(JSON.stringify({ body: row.copy }));
  const sheetColumns = columns[row.sheet];
  return {
    sheet: row.sheet,
    workbookRow: row.workbookRow,
    key: row.key,
    contentKey,
    runtimeFamily: runtimeFamilyFor(contentKey),
    copy: row.copy,
    governance: row.governance,
    ownerApproved: true,
    authorship: "owner_authored",
    payloadSha256,
    workbookProvenance: {
      path: workbookRelativePath,
      sheet: row.sheet,
      keyCell: `${sheetColumns.key}${row.workbookRow}`,
      copyCell: `${sheetColumns.copy}${row.workbookRow}`,
      governanceCell: `${sheetColumns.governance}${row.workbookRow}`,
      ownerApprovedCell: `${sheetColumns.ownerApproved}${row.workbookRow}`,
      category: row.workbookCells.Category || null,
      themes: row.workbookCells.Themes || null,
      pageRef: row.workbookCells.PageRef || null,
    },
  };
});
if (new Set(lockedRows.map((row) => row.contentKey)).size !== 301) {
  throw new Error("LL matrix V13 must map to 301 unique serving content keys.");
}
const familyCounts = Object.fromEntries(
  [...new Set(lockedRows.map((row) => row.runtimeFamily))].sort().map((family) => [
    family, lockedRows.filter((row) => row.runtimeFamily === family).length,
  ]),
);
const locked = {
  schema: "tldrastro.knowledge-matrix.rows.v13",
  version,
  approvedAt,
  sourceWorkbook: workbookRelativePath,
  sourceWorkbookSha256: workbookSha256,
  sourceExport: exportRelativePath,
  sourceExportSha256,
  governance: {
    authorityField: "ownerApproved",
    requiredValue: true,
    allowedLabels: [...allowedGovernance],
    canonicalDecisionKey: governanceDecisionKey,
    canonicalDecision: governanceDecision,
    discardedPath: "Gemini clarity-first V12-to-V13 blind-edit script",
  },
  counts: {
    sourceRows: reconciledRows.length,
    ownerApprovedRows: lockedRows.length,
    excludedUnapprovedRows: unapprovedRows.length,
    clarityStrictV13Rows: clarityRows.length,
    bySheet: approvedSheetCounts,
    byGovernance: governanceCounts,
    byRuntimeFamily: familyCounts,
  },
  rows: lockedRows,
};
const lockedBytes = `${JSON.stringify(locked, null, 2)}\n`;
fs.mkdirSync(path.dirname(absolute(lockedRelativePath)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(publicLockedRelativePath)), { recursive: true });
fs.writeFileSync(absolute(lockedRelativePath), lockedBytes);
fs.writeFileSync(absolute(publicLockedRelativePath), lockedBytes);

const sourceRows = readJson(sourceRowsRelativePath);
const priorRows = sourceRows.hookRows.filter((row) => row.source_release !== releaseId);
const priorApprovedRows = priorRows.filter((row) => servingApprovedReviews.has(row.review_status));
const existingApprovedRowsSha256 = sha256(JSON.stringify(priorApprovedRows));
const servingRows = lockedRows.map((row) => ({
  contentKey: row.contentKey,
  content_role: "full_copy",
  grammar_frame: "complete_sentence",
  body: row.copy,
  reader_only: true,
  render_policy: "reader-only-exact-lived-v1",
  review_status: "approved",
  source_keys: [workbookRelativePath, lockedRelativePath],
  approval: {
    approvalLevel: "exact_owner_approved",
    recordPath: lockedRelativePath,
    payloadSha256: row.payloadSha256,
    approvedAt,
  },
  source_release: releaseId,
  runtime_family: row.runtimeFamily,
  runtime_key: row.key,
  source_sheet: row.sheet,
  source_workbook_row: row.workbookRow,
  source_workbook_sha256: workbookSha256,
  governance: row.governance,
  owner_approved: true,
  precedence: "owner-approved V13 exact key supersedes earlier LL copy on the same runtime key",
  distribution_lane: "serving",
}));
sourceRows.hookRows = [...priorRows, ...servingRows];
fs.writeFileSync(absolute(sourceRowsRelativePath), `${JSON.stringify(sourceRows, null, 1)}\n`);

const manifest = {
  schema: "tldrastro.ll-matrix-v13-runtime-ingestion",
  version: 2,
  releaseId,
  approvedAt,
  sourceWorkbook: workbookRelativePath,
  sourceWorkbookSha256: workbookSha256,
  lockedRows: lockedRelativePath,
  lockedRowsSha256: sha256(lockedBytes),
  publicLockedRows: publicLockedRelativePath,
  sourceRows: reconciledRows.length,
  ownerApprovedRows: lockedRows.length,
  excludedUnapprovedRows: unapprovedRows.length,
  clarityStrictV13Rows: clarityRows.length,
  approvedSheetCounts,
  governanceCounts,
  runtimeFamilyCounts: familyCounts,
  uniqueServingContentKeys: lockedRows.length,
  fallbackSource: sourceRowsRelativePath,
  precedence: "V13 rows append after earlier LL rows; the existing latest-eligible resolver rule makes the exact V13 key canonical.",
  invariants: {
    existingApprovedRowsChanged: 0,
    existingApprovedRowsSha256,
    sourceExportSha256,
    approvedPayloadSha256: sha256(JSON.stringify(lockedRows.map(({ sheet, key, copy, governance }) => ({ sheet, key, copy, governance })))),
  },
  rows: lockedRows.map(({ sheet, workbookRow, key, contentKey, governance, payloadSha256 }) => ({
    workbookKey: key,
    sourceSheet: sheet,
    workbookRow,
    contentKey,
    governance,
    payloadSha256,
  })),
};
fs.writeFileSync(absolute(manifestRelativePath), `${JSON.stringify(manifest, null, 2)}\n`);

const ingestionRecord = `# LL Knowledge Matrix V13: canonical approval and runtime-ingestion record

Date: 2026-08-10

Runtime release: \`${releaseId}\`

## Owner ruling

The workbook \`${workbookRelativePath}\` is the canonical LL matrix. Its 195-row \`ClarityStrictV13\` pass is owner-approved. The Gemini clarity-first V12-to-V13 script path is discarded and must not run because it would blind-edit row-approved copy. This ruling is also recorded in the workbook's \`GovernanceLegend\` sheet under \`${governanceDecisionKey}\`.

## Serving boundary

- Workbook content rows: 1,014.
- Exact owner-approved runtime rows: 301.
- Excluded unapproved rows: 713.
- Approved rows by sheet: 113 PlacementMeanings, 165 AspectMeanings, 23 NodesPhasesFortune.
- Governance labels: 194 owner-approved-v13-direct-language, 106 owner-lived-experience-ll-v9-owner-approved, 1 owner-approved-clarity-fix-ll-v12.

The locked JSON at \`${lockedRelativePath}\` contains the exact approved copy, runtime destination, payload hash, and workbook sheet/row/cell provenance for every serving row. No unapproved row enters the locked file or serving lane.

## Change control

The runtime selects the V13 exact-key row ahead of earlier LL copy while preserving all earlier approved source rows byte-for-byte. A missing V13 key does not borrow another row. Any future wording change requires a new owner-approved workbook lineage and regenerated hashes; the discarded Gemini blind-edit path is not an authorized build step.

## Fingerprints

- Canonical workbook SHA-256: \`${workbookSha256}\`
- Raw full export SHA-256: \`${sourceExportSha256}\`
- Locked owner-approved JSON SHA-256: \`${manifest.lockedRowsSha256}\`
- Existing approved rows before V13 SHA-256: \`${existingApprovedRowsSha256}\`
`;
fs.writeFileSync(absolute(ingestionRecordRelativePath), ingestionRecord);

console.log(JSON.stringify({
  sourceRows: reconciledRows.length,
  ownerApprovedRows: lockedRows.length,
  excludedUnapprovedRows: unapprovedRows.length,
  clarityStrictV13Rows: clarityRows.length,
  approvedSheetCounts,
  governanceCounts,
  familyCounts,
  workbookSha256,
  lockedRowsSha256: manifest.lockedRowsSha256,
  existingApprovedRowsSha256,
}, null, 2));
