#!/usr/bin/env node

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSharedEvidenceIndex,
  buildExtendedEvidenceCoverage,
  ownerPositiveEvidenceFromSurfaceQualifiedPool,
  ownerPositiveEvidenceFromVoiceIndex
} from "../src/astro-writing/index.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const readJsonl = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);

const voiceIndex = readJson("packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json");
const surfacePool = readJson("packages/astro-knowledge/voice/tldr-astro/satori-writer/surface-qualified-positive-exemplars-v2.json");
const approvedExamples = readJsonl("data/writing/OWNER_APPROVED_EXAMPLES.jsonl");
const matrixEvidenceRows = readJsonl("data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl");
const matrixCoverage = readJson("data/writing/matrix-evidence-index/TLDR-Matrix-Coverage-By-Placement.json");
const registerGoldExamples = readJson("data/writing/owner-register-gold.json");
const phraseExamples = readJsonl("data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl");
const registerExamples = [
  ...ownerPositiveEvidenceFromVoiceIndex(voiceIndex),
  ...ownerPositiveEvidenceFromSurfaceQualifiedPool(surfacePool)
];
const dedupedRegister = [...new Map(registerExamples.map((entry) => [entry.id, entry])).values()];
const index = buildSharedEvidenceIndex({
  matrixEvidenceRows,
  approvedExamples,
  registerExamples: dedupedRegister,
  registerGoldExamples,
  phraseExamples
});
const coverage = buildExtendedEvidenceCoverage({ matrixCoverage, index });
const matrixIndexPath = path.join(repoRoot, "data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl");
const matrixCoveragePath = path.join(repoRoot, "data/writing/matrix-evidence-index/TLDR-Matrix-Coverage-By-Placement.json");
const sha256 = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const rawMatrixRoleCounts = Object.fromEntries(["meaning", "register", "scene", "argument_candidate"].map((role) => [
  role,
  matrixEvidenceRows.filter((row) => row.roles?.includes(role)).length
]));
const roleCountsBySource = {};
for (const entry of index.entries) {
  const source = entry.sourceKind ?? "unknown";
  roleCountsBySource[source] ??= { meaning: 0, register: 0, scene: 0, argument: 0, phrase: 0 };
  roleCountsBySource[source][entry.role] += 1;
}

const indexedContentKeys = new Set(index.entries.map((entry) => entry.contentKey));
const approvedFamilies = [...new Set(approvedExamples.map((entry) => entry.family).filter(Boolean))].sort();
const includedFamilies = approvedFamilies.filter((family) => approvedExamples.some((entry) => entry.family === family && indexedContentKeys.has(entry.contentKey)));
const excludedFamilies = approvedFamilies.filter((family) => !includedFamilies.includes(family));
const approvedStores = [...new Set(approvedExamples.map((entry) => entry.source).filter(Boolean))].sort();
const includedStores = approvedStores.filter((store) => (
  approvedExamples.some((entry) => entry.source === store && indexedContentKeys.has(entry.contentKey))
  || (store === "knowledge-matrix-v9" && index.entries.some((entry) => String(entry.sourceKind ?? "").startsWith("owner-approved-knowledge-matrix")))
));
const excludedStores = approvedStores.filter((store) => !includedStores.includes(store));

const artifact = {
  ...index,
  generatedAt: new Date().toISOString(),
  sourceStores: {
    included: [
      "packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json",
      "data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl",
      "data/writing/matrix-evidence-index/TLDR-Matrix-Coverage-By-Placement.json",
      "packages/astro-knowledge/voice/tldr-astro/satori-writer/surface-qualified-positive-exemplars-v2.json",
      "data/writing/OWNER_APPROVED_EXAMPLES.jsonl",
      "data/writing/owner-register-gold.json",
      "data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl",
      "tldr-astro-phrasebank/MARIE-VOICE-BANK.md",
      "tldr-astro-phrasebank/WRITING-STANDARD.md"
    ],
    approvedExampleStores: approvedStores,
    approvedExampleStoresWithEligibleRows: includedStores,
    approvedExampleStoresOutsideRetrieval: excludedStores
  },
  exclusionList: {
    approvedFamilies,
    includedFamilies,
    excludedFamilies,
    note: "Excluded families remain approved content in place. They are outside the five-role writer retrieval index because they currently fill none of the governed roles for a placement article."
  }
};

const jsonPath = path.join(reviewRoot, "shared-evidence-index-v1.json");
const mdPath = path.join(reviewRoot, "shared-evidence-index-v1.md");
const coverageJsonPath = path.join(reviewRoot, "shared-evidence-coverage-v2.json");
const coverageMdPath = path.join(reviewRoot, "shared-evidence-coverage-v2.md");
const ingestionJsonPath = path.join(reviewRoot, "matrix-evidence-sidecar-ingestion-v1.json");
const ingestionMdPath = path.join(reviewRoot, "matrix-evidence-sidecar-ingestion-v1.md");
fs.writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
fs.writeFileSync(coverageJsonPath, `${JSON.stringify(coverage, null, 2)}\n`);
const ingestion = {
  status: "ingested-derived-indexes",
  canonicalWorkbookChanged: false,
  sidecars: [
    { path: path.relative(repoRoot, matrixIndexPath), rows: matrixEvidenceRows.length, sha256: sha256(matrixIndexPath) },
    { path: path.relative(repoRoot, matrixCoveragePath), placements: Object.keys(matrixCoverage).length, sha256: sha256(matrixCoveragePath) }
  ],
  rawMatrixRoleCounts,
  deduplicatedSharedIndexCounts: index.counts,
  roleCountsBySource,
  coverageCounts: coverage.counts,
  deduplication: "within role + exact planet + exact sign + event by copy_sha; governance precedence wins",
  matrixRegisterPolicy: "indexed and reported, but not used as the owner-register lane; corpus passages and register gold remain the writer's register authority"
};
fs.writeFileSync(ingestionJsonPath, `${JSON.stringify(ingestion, null, 2)}\n`);
fs.writeFileSync(mdPath, `# Shared evidence index v1

Status: **implemented; no billed calls**  
Version: \`${artifact.version}\`  
Index key: \`${artifact.keyFormat}\`

## Role counts

- Meaning: **${artifact.counts.meaning}**
- Register: **${artifact.counts.register}**
- Scene: **${artifact.counts.scene}**
- Argument: **${artifact.counts.argument}**
- Phrase: **${artifact.counts.phrase}**
- Total entries: **${artifact.counts.entries}** across **${artifact.counts.planetSignKeys}** planet-sign keys

Scene precedence is fixed as: same-planet-sign owner-approved house cores; approved serving
rows; knowledge-matrix scene rows. Governance precedence still applies within each source tier.

## Stores indexed

${artifact.sourceStores.included.map((store) => `- \`${store}\``).join("\n")}

The voice bank and writing standard remain register contracts. The governed phrase sidecar also
indexes their explicitly approved lines as PHRASE evidence without relabeling them as register
examples. The named owner passages and register-gold page remain the exact register evidence.
Content stays in its original stores; this file is an index only.

## Approved stores outside retrieval

${excludedStores.length ? excludedStores.map((store) => `- \`${store}\``).join("\n") : "None among the stores represented by the approved-example export."}

## Approved families outside retrieval

${excludedFamilies.map((family) => `- \`${family}\``).join("\n")}
`);

const coverageRows = coverage.placements.map((row) => `| ${row.placementKey} | ${row.matrixRaw.meaning} | ${row.matrixRaw.scene} | ${row.extended.meaning} | ${row.extended.scene} | ${row.extended.register} | ${row.extended.argument} |`).join("\n");
fs.writeFileSync(coverageMdPath, `# Shared evidence coverage v2

Status: **derived index; no billed calls**

- Matrix placement combinations: **${coverage.counts.placements}**
- Matrix-only zero-scene placements: **${coverage.counts.matrixZeroScene}**
- Extended zero-scene placements: **${coverage.counts.extendedZeroScene}**
- Extended zero-meaning placements: **${coverage.counts.extendedZeroMeaning}**

The extended scene count combines exact planet-sign house cores, approved serving rows,
matrix scene rows, and qualifying owner-corpus fixtures. Repeated matrix copy is counted once
per role by \`copy_sha\`.

## Coverage by placement

| Placement | Matrix meaning | Matrix scene | Extended meaning | Extended scene | Extended register | Extended argument |
|---|---:|---:|---:|---:|---:|---:|
${coverageRows}

## Placements with zero scene evidence after extension

${coverage.zeroScenePlacements.length ? coverage.zeroScenePlacements.map((key) => `- \`${key}\``).join("\n") : "None."}
`);
fs.writeFileSync(ingestionMdPath, `# Matrix evidence sidecar ingestion v1

Status: **ingested; no billed calls**  
Canonical workbook changed: **no**

## Verified sidecars

${ingestion.sidecars.map((file) => `- \`${file.path}\`: \`${file.sha256}\`${file.rows ? `; ${file.rows} rows` : `; ${file.placements} placements`}`).join("\n")}

## Raw matrix roles

${Object.entries(rawMatrixRoleCounts).map(([role, count]) => `- ${role}: **${count}**`).join("\n")}

Repeated copy is deduplicated inside each role and exact planet-sign-event target using
\`copy_sha\`; the highest governance tier wins. The matrix register tag remains indexed for
coverage, but the writer's register authority stays with owner-corpus passages and the approved
register-gold page.

## Extended role counts by source

${Object.entries(roleCountsBySource).sort(([a], [b]) => a.localeCompare(b)).map(([source, counts]) => `- \`${source}\`: meaning ${counts.meaning}, register ${counts.register}, scene ${counts.scene}, argument ${counts.argument}, phrase ${counts.phrase}`).join("\n")}
`);

console.log(JSON.stringify({ jsonPath, mdPath, coverageJsonPath, coverageMdPath, ingestionJsonPath, ingestionMdPath, counts: artifact.counts, coverageCounts: coverage.counts, excludedFamilies: excludedFamilies.length, excludedStores }, null, 2));
