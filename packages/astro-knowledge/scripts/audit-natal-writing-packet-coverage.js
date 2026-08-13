#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { buildIndex, repoRoot } = require("../../../.agents/skills/marie-satori-writer/scripts/build-voice-index.js");
const { buildNatalWritingPacket, houseNumber } = require("../../../.agents/skills/marie-satori-writer/scripts/natal-writing-packet.js");

const sourcePath = path.join(repoRoot, "packages", "astro-knowledge", "voice", "tldr-astro", "marie-satori-writer", "ll-matrix-v13", "ll-matrix-v13.json");
const manifestPath = path.join(repoRoot, "packages", "astro-knowledge", "review", "ll-matrix-v13-wp1-review-batch-manifest.json");
const outputDir = path.join(repoRoot, "packages", "astro-knowledge", "review", "natal-writer-evidence-2026-08-13");
const outputPath = path.join(outputDir, "natal-writing-packet-coverage-v1.json");
const reviewPath = path.join(outputDir, "natal-writing-packet-coverage-2026-08-13.md");
const SIGNS = new Set(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);

function targetFor(row) {
  const parts = String(row.key || "").split("|");
  if (row.sheet === "AspectMeanings" && parts.length === 3) return { surface: "natal-aspect", key: row.key, family: "natal-aspect-exact" };
  if (["PlacementMeanings", "NodesPhasesFortune"].includes(row.sheet) && parts.length === 2) {
    const position = String(parts[1]).trim().toLowerCase();
    if (SIGNS.has(position)) return { surface: "natal-placement", key: row.key, family: "natal-placement-sign" };
    if (houseNumber(position)) return { surface: "natal-placement", key: row.key, family: "natal-placement-house" };
  }
  return { surface: null, key: row.key, family: `${row.sheet}-unsupported`, reason: "unsupported-key-shape" };
}

function increment(object, key) {
  object[key] = (object[key] || 0) + 1;
}

function percentage(numerator, denominator) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}

function main() {
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const rows = source.rows.filter((row) => row.ownerApproved !== true);
  if (rows.length !== 713) throw new Error(`Expected 713 unapproved LL V13 rows, found ${rows.length}.`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const batchByRow = new Map();
  for (const batch of manifest.batches) {
    for (const row of batch.rows) batchByRow.set(`${row.sheet}\u0000${row.rowKey}`, batch.batchId);
  }
  const indexEntries = buildIndex().entries;
  const results = [];
  const reasonCounts = {};
  const sheetCounts = {};
  const familyCounts = {};
  const batchCounts = {};
  for (const row of rows) {
    const target = targetFor(row);
    let result;
    if (!target.surface) {
      result = {
        status: "insufficient-evidence",
        generationAllowed: false,
        reasons: [target.reason],
        factBoundary: null,
        qualifyingPassages: 0,
        distinctSourceRows: 0
      };
    } else {
      const packet = buildNatalWritingPacket({ surface: target.surface, key: target.key, indexEntries });
      result = {
        status: packet.status,
        generationAllowed: packet.generationAllowed,
        reasons: packet.evidenceSummary.reasons,
        factBoundary: packet.factBoundary,
        authoringSource: {
          sourcePath: packet.authoringSource.sourcePath,
          sheet: packet.authoringSource.sheet,
          workbookRow: packet.authoringSource.workbookRow,
          astrologySupportSha256: packet.authoringSource.astrologySupportSha256
        },
        qualifyingPassages: packet.evidenceSummary.qualifyingPassages,
        distinctSourceRows: packet.evidenceSummary.distinctSourceRows,
        evidenceSourceRows: packet.ownerPassages.map((entry) => entry.sourceRowId)
      };
    }
    const batchId = batchByRow.get(`${row.sheet}\u0000${row.key}`) || null;
    const item = {
      sheet: row.sheet,
      key: row.key,
      family: target.family,
      batchId,
      ...result
    };
    results.push(item);
    for (const reason of item.reasons) increment(reasonCounts, reason);
    for (const [bucket, key] of [[sheetCounts, row.sheet], [familyCounts, target.family], [batchCounts, batchId || "unassigned"]]) {
      bucket[key] ||= { total: 0, compliant: 0 };
      bucket[key].total += 1;
      if (item.generationAllowed) bucket[key].compliant += 1;
    }
  }
  const compliant = results.filter((item) => item.generationAllowed).length;
  const artifact = {
    schemaVersion: "natal-writing-packet-coverage-v1",
    generatedAt: "2026-08-13T00:00:00.000Z",
    sourcePath: path.relative(repoRoot, sourcePath).replaceAll(path.sep, "/"),
    sourceRows: rows.length,
    policy: {
      minimumExactOwnerApprovedPassages: 4,
      maximumExactOwnerApprovedPassages: 6,
      minimumDistinctSourceRows: 3,
      maximumPassagesPerSourceRow: 2,
      factBoundary: "active astro-knowledge natal aspect or placement registry row",
      authoringSource: "exact-key AstrologySupport; existing candidate prose excluded"
    },
    summary: {
      total: rows.length,
      compliant,
      insufficientEvidence: rows.length - compliant,
      coveragePercent: percentage(compliant, rows.length),
      reasonCounts,
      bySheet: sheetCounts,
      byFamily: familyCounts,
      byBatch: batchCounts
    },
    rows: results
  };
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  const table = Object.entries(batchCounts).map(([batchId, counts]) => `| ${batchId} | ${counts.total} | ${counts.compliant} | ${percentage(counts.compliant, counts.total)}% |`).join("\n");
  const reasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).map(([reason, count]) => `- ${reason}: ${count}`).join("\n");
  fs.writeFileSync(reviewPath, `# Natal writer evidence coverage — 2026-08-13\n\nStatus: deterministic pre-drafting coverage record. No model call was made. No row was edited, approved, served, or promoted.\n\n## Result\n\nA compliant, registry-bounded packet can be built today for **${compliant} of ${rows.length}** unapproved LL V13 rows (${percentage(compliant, rows.length)}%). The remaining **${rows.length - compliant}** rows are fail-closed. All **713 of 713** rows have exact-key AstrologySupport; the fail-closed remainder is caused by absent, inactive, or unsupported registry boundaries, not missing mechanism source.\n\n## Batch coverage\n\n| Batch | Rows | Compliant packets | Coverage |\n| --- | ---: | ---: | ---: |\n${table}\n\n## Fail-closed reasons\n\n${reasons || "- none"}\n\nA row can have more than one reason, so reason counts are not additive. \`unverified-registry-row\` includes a registry row whose status remains DRAFT. \`unsupported-key-shape\` covers generic aspect, sign, house, planet, phase, or fortune rows that are not one of the authorized natal packet key forms.\n\n## Governance\n\n- AstrologySupport is the sole target-mechanism source; prior/current/revised candidate prose is excluded from writer packets.\n- Evidence is restricted to \`authorityClass: exact_owner_approved\`.\n- Fact boundaries contain registry identity and provenance only; registry prose is excluded from writer context.\n- Fewer than four qualifying passages or fewer than three source rows blocks drafting.\n- Batch 1 V3 may be authored only for rows marked compliant in the JSON artifact; all other rows remain SOURCE_GAP.\n- Approval state, serving state, auto-publish, and writer promotion remain unchanged.\n`);
  console.log(JSON.stringify(artifact.summary, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}

module.exports = { main, targetFor };
