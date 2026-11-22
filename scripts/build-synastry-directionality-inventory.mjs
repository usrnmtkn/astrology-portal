import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  isGovernedReaderEligible,
  synastryReaderTier
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..");

export const SYN_PREFIX = "fallback-hook/synastry-pair/";
export const SOURCE_PATH = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
);
export const BATCH_1_MANIFEST_PATH = path.join(
  repoRoot,
  "packages/astro-knowledge/review/synastry-directionality-batch-1-2026-09-07/manifest.json"
);
export const OUTPUT_DIR = path.join(
  repoRoot,
  "packages/astro-knowledge/review/synastry-directionality-inventory-2026-09-07"
);
export const OUTPUT_JSON_PATH = path.join(OUTPUT_DIR, "inventory.json");
export const OUTPUT_MD_PATH = path.join(OUTPUT_DIR, "SUMMARY.md");

export const EXPECTED_COUNTS = Object.freeze({
  servingRows: 483,
  canonicalPairs: 161,
  tiers: Object.freeze({
    "exact-owner-approved": 55,
    "owner-approved-grouped": 110,
    "legacy-reviewed": 318
  })
});

export const ALLOWED_ACTIONS = new Set([
  "AUTHOR_REVERSE",
  "NEEDS_DIRECTION_REVIEW"
]);

const sha256 = (value) => (
  typeof value === "string"
    ? crypto.createHash("sha256").update(value, "utf8").digest("hex")
    : null
);

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function selectedServingRows(source) {
  const candidatesByKey = new Map();
  for (const row of source.hookRows ?? []) {
    if (!String(row?.contentKey ?? "").startsWith(SYN_PREFIX)) continue;
    const rows = candidatesByKey.get(row.contentKey) ?? [];
    rows.push(row);
    candidatesByKey.set(row.contentKey, rows);
  }

  return [...candidatesByKey.entries()]
    .map(([contentKey, candidates]) => {
      const selected = [...candidates].reverse().find((candidate) => isGovernedReaderEligible(candidate));
      return selected ? [contentKey, selected] : null;
    })
    .filter(Boolean)
    .map(([, row]) => row)
    .sort((left, right) => left.contentKey.localeCompare(right.contentKey));
}

function parseSynastryKey(contentKey) {
  const remainder = String(contentKey).slice(SYN_PREFIX.length);
  const parts = remainder.split("/");
  assert.equal(parts.length, 3, `Unexpected synastry pair key: ${contentKey}`);
  const [planet1, planet2, aspectFamily] = parts;
  return { planet1, planet2, aspectFamily };
}

function unorderedPairKey(planet1, planet2) {
  return [planet1, planet2].sort().join("/");
}

function normalizeSeedAction(seed) {
  if (!seed) return "NEEDS_DIRECTION_REVIEW";
  if (seed.action === "AUTHOR_REVERSE") return "AUTHOR_REVERSE";
  // Batch 1 deliberately used RECIPROCAL_REVIEW as a hold state. The corpus
  // inventory keeps it unresolved until a human explicitly approves
  // RECIPROCAL_NO_REVERSE in a later review pass.
  return "NEEDS_DIRECTION_REVIEW";
}

function buildRow(row, selectedKeySet, seedByKey) {
  const { planet1, planet2, aspectFamily } = parseSynastryKey(row.contentKey);
  const reverseContentKey = `${SYN_PREFIX}${planet2}/${planet1}/${aspectFamily}`;
  const reverseIsSameKey = reverseContentKey === row.contentKey;
  const seed = seedByKey.get(row.contentKey) ?? null;
  const action = normalizeSeedAction(seed);

  assert(ALLOWED_ACTIONS.has(action), `Unsupported directionality action for ${row.contentKey}: ${action}`);

  return {
    contentKey: row.contentKey,
    canonicalPair: `${planet1}/${planet2}`,
    unorderedPairKey: unorderedPairKey(planet1, planet2),
    planet1,
    planet2,
    aspectFamily,
    readerTier: synastryReaderTier(row),
    reviewStatus: row.review_status ?? null,
    approvalLevel: row.approval?.approvalLevel ?? null,
    approvalRecordPath: row.approval?.recordPath ?? null,
    bodyYou: typeof row.body_you === "string" ? row.body_you : null,
    bodyThey: typeof row.body_they === "string" ? row.body_they : null,
    bodyYouSha256: sha256(row.body_you),
    bodyTheySha256: sha256(row.body_they),
    bodyFieldsByteIdentical: typeof row.body_you === "string"
      && typeof row.body_they === "string"
      && row.body_you === row.body_they,
    reverseCanonicalKey: reverseContentKey,
    reverseCanonicalKeyExists: !reverseIsSameKey && selectedKeySet.has(reverseContentKey),
    reverseIsSameKey,
    existingSemanticDirection: seed?.existingSemanticDirection ?? null,
    missingSemanticDirection: seed?.missingSemanticDirection ?? null,
    action,
    reciprocalCandidate: seed?.action === "RECIPROCAL_REVIEW" || seed?.reciprocalCandidate === true,
    candidateNameToYou: seed?.candidateNameToYou ?? null,
    decisionSource: seed
      ? "synastry-directionality-batch-1-2026-09-07"
      : null
  };
}

function countBy(values, selector) {
  const counts = {};
  for (const value of values) {
    const key = selector(value) ?? "null";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function assertExpectedCounts(summary) {
  assert.equal(
    summary.servingRowCount,
    EXPECTED_COUNTS.servingRows,
    `Synastry serving row count drifted: expected ${EXPECTED_COUNTS.servingRows}, got ${summary.servingRowCount}`
  );
  assert.equal(
    summary.canonicalPairCount,
    EXPECTED_COUNTS.canonicalPairs,
    `Synastry canonical pair count drifted: expected ${EXPECTED_COUNTS.canonicalPairs}, got ${summary.canonicalPairCount}`
  );
  for (const [tier, expected] of Object.entries(EXPECTED_COUNTS.tiers)) {
    assert.equal(
      summary.readerTierCounts[tier] ?? 0,
      expected,
      `Synastry ${tier} count drifted: expected ${expected}, got ${summary.readerTierCounts[tier] ?? 0}`
    );
  }
}

export function buildSynastryDirectionalityInventory({
  sourcePath = SOURCE_PATH,
  batch1ManifestPath = BATCH_1_MANIFEST_PATH,
  enforceExpectedCounts = true
} = {}) {
  const source = loadJson(sourcePath);
  const batch1 = loadJson(batch1ManifestPath);
  const servingRows = selectedServingRows(source);
  const selectedKeySet = new Set(servingRows.map((row) => row.contentKey));
  const seedByKey = new Map((batch1.records ?? []).map((record) => [record.contentKey, record]));

  for (const seedKey of seedByKey.keys()) {
    assert(selectedKeySet.has(seedKey), `Batch 1 seed key is not a governed serving row: ${seedKey}`);
  }

  const rows = servingRows.map((row) => buildRow(row, selectedKeySet, seedByKey));
  const uniqueKeys = new Set(rows.map((row) => row.contentKey));
  assert.equal(uniqueKeys.size, rows.length, "Directionality inventory contains duplicate content keys");

  const summary = {
    servingRowCount: rows.length,
    canonicalPairCount: new Set(rows.map((row) => row.unorderedPairKey)).size,
    readerTierCounts: countBy(rows, (row) => row.readerTier),
    actionCounts: countBy(rows, (row) => row.action),
    aspectFamilyCounts: countBy(rows, (row) => row.aspectFamily),
    byteIdenticalBodyPairCount: rows.filter((row) => row.bodyFieldsByteIdentical).length,
    distinctReverseCanonicalKeyCount: rows.filter((row) => row.reverseCanonicalKeyExists).length,
    seededDecisionCount: rows.filter((row) => row.decisionSource).length,
    reciprocalCandidateCount: rows.filter((row) => row.reciprocalCandidate).length
  };

  if (enforceExpectedCounts) assertExpectedCounts(summary);

  return {
    schemaVersion: 1,
    recordType: "synastry_directionality_inventory",
    inventoryId: "synastry-directionality-inventory-2026-09-07",
    generatedFrom: {
      sourcePath: path.relative(repoRoot, sourcePath),
      batch1ManifestPath: path.relative(repoRoot, batch1ManifestPath)
    },
    servingChangesAuthorized: false,
    semanticInferencePolicy: "human_only",
    notes: [
      "body_you and body_they are grammatical holder variants and must not be treated as opposite semantic arrows.",
      "Byte-identical body fields are a structural hint only and do not prove reciprocity.",
      "Absence of a reversed canonical key is expected and is not a content gap by itself.",
      "RECIPROCAL_NO_REVERSE is intentionally not auto-assigned. Human review must approve it explicitly."
    ],
    summary,
    rows
  };
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderInventoryMarkdown(inventory) {
  const { summary, rows } = inventory;
  const lines = [
    "# Synastry Directionality Inventory",
    "",
    "Status: **read-only editorial inventory**",
    "",
    "This inventory does not change serving synastry copy. It records the currently governed canonical rows and creates a review queue for semantic reverse writing.",
    "",
    "## Guardrails",
    "",
    "- `body_you` and `body_they` are not assumed to be opposite semantic directions.",
    "- Semantic arrows are populated only when they were explicitly decided in the owner-reviewed Batch 1 packet.",
    "- Byte-identical text does not automatically become `RECIPROCAL_NO_REVERSE`.",
    "- A missing `planetB/planetA` canonical key is expected and is not a defect.",
    "- Existing serving copy and approval metadata remain untouched.",
    "",
    "## Summary",
    "",
    `- Governed serving rows: **${summary.servingRowCount}**`,
    `- Canonical unordered pairs: **${summary.canonicalPairCount}**`,
    `- Exact owner approved: **${summary.readerTierCounts["exact-owner-approved"] ?? 0}**`,
    `- Owner-approved grouped: **${summary.readerTierCounts["owner-approved-grouped"] ?? 0}**`,
    `- Legacy reviewed: **${summary.readerTierCounts["legacy-reviewed"] ?? 0}**`,
    `- ` + "`AUTHOR_REVERSE`" + `: **${summary.actionCounts.AUTHOR_REVERSE ?? 0}**`,
    `- ` + "`NEEDS_DIRECTION_REVIEW`" + `: **${summary.actionCounts.NEEDS_DIRECTION_REVIEW ?? 0}**`,
    `- Batch-1 seeded decisions: **${summary.seededDecisionCount}**`,
    `- Reciprocal candidates awaiting human decision: **${summary.reciprocalCandidateCount}**`,
    "",
    "## Review queue",
    "",
    "| Content key | Tier | Existing arrow | Missing arrow | Action | Reciprocal candidate | body_you = body_they |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const row of rows) {
    lines.push(
      `| ${markdownCell(row.contentKey)} | ${markdownCell(row.readerTier)} | ${markdownCell(row.existingSemanticDirection)} | ${markdownCell(row.missingSemanticDirection)} | ${markdownCell(row.action)} | ${row.reciprocalCandidate ? "yes" : ""} | ${row.bodyFieldsByteIdentical ? "yes" : ""} |`
    );
  }

  lines.push(
    "",
    "## Interpretation rule",
    "",
    "`NEEDS_DIRECTION_REVIEW` does not mean a reverse must be written. It means the current prose has not yet been human-classified as a directional arrow or a genuinely reciprocal relationship pattern. Only after that review can a row move to `AUTHOR_REVERSE` or an explicitly owner-approved `RECIPROCAL_NO_REVERSE` state.",
    ""
  );

  return lines.join("\n");
}

export function writeSynastryDirectionalityInventory(options = {}) {
  const inventory = buildSynastryDirectionalityInventory(options);
  const outputDir = options.outputDir ?? OUTPUT_DIR;
  const jsonPath = path.join(outputDir, "inventory.json");
  const markdownPath = path.join(outputDir, "SUMMARY.md");

  assert(
    path.resolve(outputDir).startsWith(path.resolve(repoRoot, "packages/astro-knowledge/review") + path.sep),
    `Directionality inventory output must stay under packages/astro-knowledge/review: ${outputDir}`
  );

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, `${renderInventoryMarkdown(inventory)}\n`, "utf8");
  return { inventory, jsonPath, markdownPath };
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const { inventory, jsonPath, markdownPath } = writeSynastryDirectionalityInventory();
  console.log(`Wrote ${inventory.summary.servingRowCount} synastry rows to ${path.relative(repoRoot, jsonPath)}`);
  console.log(`Wrote review summary to ${path.relative(repoRoot, markdownPath)}`);
}
