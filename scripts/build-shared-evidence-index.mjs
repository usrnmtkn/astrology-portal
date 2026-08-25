#!/usr/bin/env node

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSharedEvidenceIndex,
  buildExtendedEvidenceCoverage,
  exactDelimitedPassage,
  ownerLockedLilithV5Evidence,
  ownerPositiveEvidenceFromApprovedTaskPassages,
  ownerPositiveEvidenceFromSurfaceQualifiedPool,
  ownerPositiveEvidenceFromVoiceIndex
} from "../src/astro-writing/index.mjs";
import { withoutOwnerRejectedEvidence } from "../src/astro-writing/ownerEvidenceRejections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const checkOnly = process.argv.includes("--check");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const readJsonl = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);

const corrections = [
  ...readJsonl("data/writing/owner-corrections.jsonl"),
  ...readJsonl("data/writing/owner-feedback-corpus.jsonl")
];
const rawVoiceIndex = readJson("packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json");
const voiceIndex = {
  ...rawVoiceIndex,
  entries: withoutOwnerRejectedEvidence(rawVoiceIndex.entries, corrections)
};
const surfacePool = readJson("packages/astro-knowledge/voice/tldr-astro/satori-writer/surface-qualified-positive-exemplars-v2.json");
const approvedExamples = withoutOwnerRejectedEvidence(
  readJsonl("data/writing/OWNER_APPROVED_EXAMPLES.jsonl"),
  corrections
);
const matrixEvidenceRows = withoutOwnerRejectedEvidence(
  readJsonl("data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl"),
  corrections,
  "copy"
);
const matrixCoverage = readJson("data/writing/matrix-evidence-index/TLDR-Matrix-Coverage-By-Placement.json");
const llMatrixV13Rows = readJson("packages/astro-knowledge/voice/tldr-astro/satori-writer/ll-matrix-v13/ll-matrix-v13.json").rows;
const llMatrixV13ManifestRows = readJson("packages/astro-knowledge/review/ll-matrix-v13-runtime-manifest.json").rows;
const registerGoldExamples = readJson("data/writing/owner-register-gold.json");
const approvedTaskPassageManifest = readJson("data/writing/owner-supplied-structural-exemplars.json");
const phraseExamples = readJsonl("data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl");
const skyPointMeaningRows = readJson("tldr-astro-phrasebank/phrasebank/cc-sky-points-authored.json").reviewed;
const lilithV5Rows = readJson("packages/astro-knowledge/review/lilith-placements-v5/lilith-placements-v5-staged-rows.json").rows;
const approvedTaskPassages = ownerPositiveEvidenceFromApprovedTaskPassages(
  approvedTaskPassageManifest.entries.map((entry) => ({
    ...entry,
    text: (() => {
      const text = exactDelimitedPassage(entry, fs.readFileSync(path.join(repoRoot, entry.sourcePath), "utf8"));
      const digest = crypto.createHash("sha256").update(text).digest("hex");
      if (digest !== entry.exactTextSha256) throw new Error(`OWNER_TASK_PASSAGE_HASH_MISMATCH:${entry.id}`);
      return text;
    })()
  }))
);
const registerExamples = [
  ...ownerPositiveEvidenceFromVoiceIndex(voiceIndex),
  ...ownerPositiveEvidenceFromSurfaceQualifiedPool(surfacePool),
  ...ownerLockedLilithV5Evidence(lilithV5Rows),
  ...approvedTaskPassages
];
const dedupedRegister = [...new Map(registerExamples.map((entry) => [entry.id, entry])).values()];
const index = buildSharedEvidenceIndex({
  matrixEvidenceRows,
  llMatrixV13Rows,
  llMatrixV13ManifestRows,
  approvedExamples,
  registerExamples: dedupedRegister,
  registerGoldExamples,
  phraseExamples,
  skyPointMeaningRows
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
      "packages/astro-knowledge/voice/tldr-astro/satori-writer/ll-matrix-v13/ll-matrix-v13.json",
      "packages/astro-knowledge/review/ll-matrix-v13-runtime-manifest.json",
      "packages/astro-knowledge/voice/tldr-astro/satori-writer/surface-qualified-positive-exemplars-v2.json",
      "data/writing/OWNER_APPROVED_EXAMPLES.jsonl",
      "data/writing/owner-register-gold.json",
      "data/writing/owner-supplied-structural-exemplars.json",
      "data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl",
      "tldr-astro-phrasebank/phrasebank/cc-sky-points-authored.json",
      "packages/astro-knowledge/review/lilith-placements-v5/lilith-placements-v5-staged-rows.json",
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
const readExistingJson = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    // Generated artifacts must remain rebuildable after an interrupted merge.
    return null;
  }
};
const existingArtifact = readExistingJson(jsonPath);
const existingIngestion = readExistingJson(ingestionJsonPath);
artifact.generatedAt = checkOnly ? existingArtifact?.generatedAt ?? null : new Date().toISOString();
const stale = [];
const writeOrCheck = (filePath, content) => {
  if (checkOnly) {
    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (current !== content) stale.push(path.relative(repoRoot, filePath));
    return;
  }
  fs.writeFileSync(filePath, content);
};
const beforeCounts = existingIngestion?.beforeCounts ?? existingArtifact?.counts ?? null;
const v13Indexed = index.entries.filter((entry) => entry.sourceKind === "owner-approved-ll-matrix-v13");
if (v13Indexed.length !== 301) throw new Error(`LL Matrix V13 shared-index count ${v13Indexed.length}; expected 301`);
const zodiacSigns = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const requiredEvidence = {
  moonCancerMeaning: index.entries.filter((entry) => entry.indexKey === "moon|cancer" && entry.role === "meaning" && entry.sourceKind === "owner-approved-ll-matrix-v13").length,
  moonAquariusMeaning: index.entries.filter((entry) => entry.indexKey === "moon|aquarius" && entry.role === "meaning" && entry.sourceKind === "owner-approved-ll-matrix-v13").length,
  lilithBySign: Object.fromEntries(zodiacSigns.map((sign) => [sign, {
    meaning: index.entries.filter((entry) => entry.indexKey === `lilith|${sign}` && entry.role === "meaning").length,
    sceneOrArgument: index.entries.filter((entry) => entry.indexKey === `lilith|${sign}` && ["scene", "argument"].includes(entry.role)).length
  }]))
};
if (!requiredEvidence.moonCancerMeaning || !requiredEvidence.moonAquariusMeaning || Object.values(requiredEvidence.lilithBySign).some((counts) => counts.meaning === 0 || counts.sceneOrArgument === 0)) {
  throw new Error(`Required placement evidence missing: ${JSON.stringify(requiredEvidence)}`);
}
const aliasNormalization = {
  blackMoonLilith: matrixEvidenceRows.filter((row) => row.planet === "Black Moon Lilith").length,
  northNode: matrixEvidenceRows.filter((row) => row.planet === "North Node").length,
  southNode: matrixEvidenceRows.filter((row) => row.planet === "South Node").length,
  lunarNodes: matrixEvidenceRows.filter((row) => row.planet === "Lunar Nodes").length,
  affectedLilithAndNodeRows: matrixEvidenceRows.filter((row) => ["Black Moon Lilith", "North Node", "South Node", "Lunar Nodes"].includes(row.planet)).length,
  anyOrUnspecifiedSignRows: matrixEvidenceRows.filter((row) => ["Any", "Unspecified"].includes(row.sign)).length
};
const genericEducation = {
  moonParagraphsRemovedFromSceneText: approvedExamples.filter((entry) => String(entry.text ?? "").startsWith("Your Moon is your instinctual emotional world:")).length,
  planetIntroRowsExcludedFromSceneRole: approvedExamples.filter((entry) => entry.family === "fallback-hook/planet-intro").length
};
writeOrCheck(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
writeOrCheck(coverageJsonPath, `${JSON.stringify(coverage, null, 2)}\n`);
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
  beforeCounts,
  afterCounts: index.counts,
  llMatrixV13: { approvedSourceRows: llMatrixV13Rows.filter((row) => row.ownerApproved === true).length, manifestRows: llMatrixV13ManifestRows.length, indexedRows: v13Indexed.length },
  aliasNormalization,
  genericEducation,
  requiredEvidence,
  deduplication: "within role + exact planet + exact sign + event by copy_sha; governance precedence wins",
  matrixRegisterPolicy: "indexed and reported, but not used as the owner-register lane; corpus passages and register gold remain the writer's register authority"
};
writeOrCheck(ingestionJsonPath, `${JSON.stringify(ingestion, null, 2)}\n`);
writeOrCheck(mdPath, `# Shared evidence index v1

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
writeOrCheck(coverageMdPath, `# Shared evidence coverage v2

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
writeOrCheck(ingestionMdPath, `# Matrix evidence sidecar ingestion v1

Status: **ingested; no billed calls**  
Canonical workbook changed: **no**

## Verified sidecars

${ingestion.sidecars.map((file) => `- \`${file.path}\`: \`${file.sha256}\`${file.rows ? `; ${file.rows} rows` : `; ${file.placements} placements`}`).join("\n")}

## Raw matrix roles

${Object.entries(rawMatrixRoleCounts).map(([role, count]) => `- ${role}: **${count}**`).join("\n")}

## V13 recovery

- Approved V13 source rows: **${ingestion.llMatrixV13.approvedSourceRows}**
- Runtime-manifest rows: **${ingestion.llMatrixV13.manifestRows}**
- Rows added to the shared evidence index: **${ingestion.llMatrixV13.indexedRows}**
- Shared-index entries: **${beforeCounts?.entries ?? "unknown"} → ${index.counts.entries}**
- Meaning entries: **${beforeCounts?.meaning ?? "unknown"} → ${index.counts.meaning}**
- Scene entries after education cleanup: **${beforeCounts?.scene ?? "unknown"} → ${index.counts.scene}**
- Argument entries after approved four-slot cards were indexed: **${beforeCounts?.argument ?? "unknown"} → ${index.counts.argument}**

Alias normalization covers **${aliasNormalization.affectedLilithAndNodeRows}** Lilith/node rows
and **${aliasNormalization.anyOrUnspecifiedSignRows}** global-sign rows. Global rows are eligible
for a concrete target; exact planet-sign rows retain precedence.

Generic planet education is not scene evidence: **${genericEducation.moonParagraphsRemovedFromSceneText}**
repeated Moon lead paragraphs are stripped before scene qualification, and
**${genericEducation.planetIntroRowsExcludedFromSceneRole}** standing planet-intro rows are excluded.

Moon/Cancer and Moon/Aquarius each retrieve an exact V13 meaning row. All twelve Lilith signs
retrieve four or more exact approved card/scene records.

Repeated copy is deduplicated inside each role and exact planet-sign-event target using
\`copy_sha\`; the highest governance tier wins. The matrix register tag remains indexed for
coverage, but the writer's register authority stays with owner-corpus passages and the approved
register-gold page.

## Extended role counts by source

${Object.entries(roleCountsBySource).sort(([a], [b]) => a.localeCompare(b)).map(([source, counts]) => `- \`${source}\`: meaning ${counts.meaning}, register ${counts.register}, scene ${counts.scene}, argument ${counts.argument}, phrase ${counts.phrase}`).join("\n")}
`);

if (stale.length) throw new Error(`Generated shared-evidence artifacts are stale: ${stale.join(", ")}`);

console.log(JSON.stringify({ mode: checkOnly ? "check" : "write", jsonPath, mdPath, coverageJsonPath, coverageMdPath, ingestionJsonPath, ingestionMdPath, beforeCounts, counts: artifact.counts, coverageCounts: coverage.counts, llMatrixV13Indexed: v13Indexed.length, aliasNormalization, genericEducation, requiredEvidence, excludedFamilies: excludedFamilies.length, excludedStores }, null, 2));
