#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertArgumentOutlineApproved } from "../src/astro-writing/argumentGate.mjs";
import { assertPositiveOwnerEvidenceContext } from "../src/astro-writing/ownerEvidencePolicy.mjs";
import { resolveAstrology } from "../src/astro-writing/resolveAstrology.mjs";
import { retrieveOwnerContext } from "../src/astro-writing/retrieveOwnerContext.mjs";
import {
  ownerApprovedMatrixRoleEvidenceForTarget,
  ownerPositiveEvidenceFromSurfaceQualifiedPool,
  ownerPositiveEvidenceFromVoiceIndexBySourceIds
} from "../src/astro-writing/ownerPositiveEvidence.mjs";
import { sceneEvidenceForTarget } from "../src/astro-writing/sceneEvidence.mjs";
import { matrixSceneNounLexicon } from "../src/astro-writing/matrixEvidenceIndex.mjs";
import { evidenceUseReview } from "../src/astro-writing/sharedEvidenceIndex.mjs";
import { loadPhraseEvidenceIndex } from "../src/astro-writing/phraseEvidence.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3");
const jsonl = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const request = JSON.parse(fs.readFileSync(path.join(reviewRoot, "venus-libra-v2-rewrite-request-pending.json"), "utf8"));
const plan = await resolveAstrology(request.meaningInput);
assertArgumentOutlineApproved(request.approvedArgumentOutline, { plan, family: request.family, surface: request.surface });
const corrections = [
  ...jsonl("data/writing/owner-corrections.jsonl"),
  ...jsonl("data/writing/owner-feedback-corpus.jsonl")
];
const registerGoldExamples = JSON.parse(fs.readFileSync(path.join(repoRoot, "data/writing/owner-register-gold.json"), "utf8"));
const surfaceQualifiedPool = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/surface-qualified-positive-exemplars-v2.json"),
  "utf8"
));
const voiceIndex = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/voice-index.json"),
  "utf8"
));
const approvedExamples = jsonl("data/writing/OWNER_APPROVED_EXAMPLES.jsonl");
const sharedEvidenceIndexArtifact = JSON.parse(fs.readFileSync(path.join(reviewRoot, "shared-evidence-index-v1.json"), "utf8"));
const matrixEvidenceRows = jsonl("data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl");
const phraseEvidence = loadPhraseEvidenceIndex(path.join(repoRoot, "data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl"));
const matrixRoleEvidence = ownerApprovedMatrixRoleEvidenceForTarget(matrixEvidenceRows, {
  planet: plan.object,
  sign: plan.sign,
  house: plan.house,
  eventType: plan.eventType ?? (request.meaningInput?.contentType === "placement_article" ? "ingress" : null),
  surface: request.surface
});
const matrixExamples = matrixRoleEvidence.meaning;
const registerExamples = [
  ...ownerPositiveEvidenceFromSurfaceQualifiedPool(surfaceQualifiedPool),
  ...ownerPositiveEvidenceFromVoiceIndexBySourceIds(
    voiceIndex,
    request.additionalOwnerEvidenceSourceIds,
    surfaceQualifiedPool.surface
  )
];
const sceneEvidence = sceneEvidenceForTarget({
  approvedExamples,
  matrixEvidenceRows,
  registerExamples,
  sceneNounLexicon: matrixSceneNounLexicon(matrixEvidenceRows),
  plan
});
const context = retrieveOwnerContext(plan, {
  examples: registerExamples,
  matrixExamples,
  matrixArgumentCandidates: matrixRoleEvidence.argument_candidate,
  matrixEvidenceAvailableCount: matrixExamples.length,
  sceneExamples: sceneEvidence.selected,
  samePlanetSignSceneAvailableCount: sceneEvidence.counts.samePlanetSignSceneAvailable,
  sceneEvidenceInventoryCounts: sceneEvidence.counts,
  argumentSource: request.argumentSource,
  registerGoldExamples,
  corrections,
  contentFamily: request.family,
  register: request.register,
  excludedEvidenceContentKeys: request.excludedEvidenceContentKeys,
  preferredEvidenceContentKeys: request.preferredEvidenceContentKeys,
  phraseEvidence
});
assertPositiveOwnerEvidenceContext(context, { family: request.family });
const sharedEvidencePacket = context.sharedEvidencePacket;
const evidenceUse = evidenceUseReview(sharedEvidencePacket);

const evidence = [
  ...context.knowledgeMatrixExamples.map((entry) => ({
    evidenceRole: "exact-planet-sign-owner-approved-matrix",
    sourcePath: entry.sourcePath,
    contentKey: entry.contentKey,
    indexedFamily: entry.sourceFamily,
    matchedFamily: entry.family,
    register: entry.register,
    eventType: entry.eventType,
    governance: entry.governance,
    judgeLineage: entry.judgeLineage,
    editorialStatus: entry.editorialStatus,
    workbookSourceRow: entry.workbookSourceRow,
    precedence: entry.precedence,
    text: entry.text
  })),
  ...context.knowledgeMatrixArgumentCandidates.map((entry) => ({
    evidenceRole: "exact-planet-sign-owner-approved-matrix-argument-candidate",
    sourcePath: entry.sourcePath,
    contentKey: entry.contentKey,
    indexedFamily: entry.sourceFamily,
    matchedFamily: entry.family,
    register: entry.register,
    eventType: entry.eventType,
    governance: entry.governance,
    judgeLineage: entry.judgeLineage,
    editorialStatus: entry.editorialStatus,
    workbookSourceRow: entry.workbookSourceRow,
    precedence: entry.precedence,
    text: entry.text
  })),
  ...context.sameFamilyExamples.map((entry) => ({
    evidenceRole: "same-family-owner-passage",
    sourcePath: entry.sourcePath,
    contentKey: entry.contentKey,
    indexedFamily: entry.family,
    matchedFamily: entry.matchedFamily,
    register: entry.register,
    text: entry.text
  })),
  ...context.registerGoldExamples.map((entry) => ({
    evidenceRole: "register-gold",
    sourcePath: entry.sourcePath,
    contentKey: entry.contentKey,
    indexedFamily: entry.family,
    matchedFamily: entry.matchedFamily,
    register: entry.register,
    text: entry.text
  }))
];
const selectedSceneEvidence = context.sceneExamples.map((entry) => ({
  evidenceRole: entry.evidenceRole,
  sourceKind: entry.sourceKind,
  sourcePath: entry.sourcePath,
  contentKey: entry.contentKey,
  indexedFamily: entry.sourceFamily,
  matchedFamily: entry.family,
  register: entry.register,
  sceneNouns: entry.sceneNouns,
  governance: entry.governance,
  judgeLineage: entry.judgeLineage,
  precedence: entry.precedence,
  text: entry.text
}));
const familyRetrieval = sharedEvidenceIndexArtifact.exclusionList;
const audit = {
  target: "venus-in-libra-v2-rewrite",
  status: "packet-audit-passed-no-draft",
  billedCalls: 0,
  family: request.family,
  evidencePolicy: context.evidencePolicy,
  counts: context.counts,
  sceneEvidenceCounts: sceneEvidence.counts,
  excludedFromPositiveEvidence: request.excludedEvidenceContentKeys,
  previousMatrixExclusions: [
    "ownerPositiveEvidenceFromVoiceIndex accepted only owner_authored_final on sky-article-longform",
    "ownerPositiveEvidenceFromVoiceIndexBySourceIds rejected exact_owner_approved matrix rows",
    "OWNER_EVIDENCE_FAMILY_MAP accepted sky-placement-current-sky-writer but no matrix family",
    "run-astro-writing-harness loaded no exact planet-sign matrix lane"
  ],
  remainingIntentionalMatrixExclusions: [
    "knowledge-matrix-house rows when the target has no supplied house",
    "rows whose planet or sign does not exactly match the target",
    "rows whose event type does not match when the target explicitly supplies an event type"
  ],
  evidence,
  selectedSceneEvidence,
  selectedPhraseEvidence: context.phraseExamples,
  matrixArgumentCandidates: context.knowledgeMatrixArgumentCandidates,
  sharedEvidencePacket,
  ownerReviewVerification: {
    ...evidenceUse,
    draftStatus: "no-draft",
    note: "No writer call followed this packet audit, so every available owner-approved sentence is truthfully reported as available and unused."
  },
  sceneEvidenceCatalogs: {
    primaryMatrix: sceneEvidence.matrixCatalog.primary,
    lowerPrecedenceMatrix: sceneEvidence.matrixCatalog.lowerPrecedence,
    approvedServing: sceneEvidence.servingCatalog,
    samePlanetSignHouseCoresAvailable: sceneEvidence.availablePrimary
  },
  approvedFamilyRetrieval: familyRetrieval,
  approvedStoreRetrieval: sharedEvidenceIndexArtifact.sourceStores,
  correctionPairs: context.corrections,
  governance: {
    writerMayRunAfterSeparateAuthorization: true,
    proseDrafted: false,
    staged: false,
    serving: false,
    oldVenusVoiceIsBaseline: false,
    argumentAndClosePreserved: true,
    registerModel: "fallback-hook/sky-sign-copy/saturn/capricorn",
    registerRequirement: "second_person_direct_address",
    concretenessModelPriority: "register_gold_primary",
    concretenessEvidenceGap: "The owner corpus does not teach enough lived-scene detail by itself. The gap is now filled by a separate governed scene-evidence lane while Saturn in Capricorn remains the register and scene-specificity gold.",
    sceneSourceDecision: "owner-ruled: approved house cores, governed matrix scene rows, and approved serving scene rows may supply scene evidence under their source boundaries",
    sceneRuleImplemented: true,
    samePlanetSignScenePrecondition: "blocks when any approved same-planet-sign scene evidence exists but none reaches the packet",
    sharedFiveRolePrecondition: "meaning, register, scene, and argument are always required; phrase is additionally required whenever the target matches an indexed owner theme, all before credentials or billing"
  }
};
const jsonPath = path.join(reviewRoot, "venus-libra-v2-rewrite-packet-audit.json");
const mdPath = path.join(reviewRoot, "venus-libra-v2-rewrite-packet-audit.md");
const phraseReviewRoot = path.join(reviewRoot, "phrase-evidence-v1");
const retroJsonPath = path.join(phraseReviewRoot, "venus-libra-retro-check.json");
const retroMdPath = path.join(phraseReviewRoot, "venus-libra-retro-check.md");
const retroCheck = {
  target: "venus|libra",
  status: "packet-retro-check-no-draft",
  billedCalls: 0,
  role: "phrase",
  labelInWriterPrompt: "AVAILABLE LINES — OWNER PHRASE EVIDENCE",
  matchedThemes: context.phraseSelection.matchedThemes,
  approvedCandidateCount: context.phraseSelection.approvedCandidateCount,
  requestedRange: context.phraseSelection.requestedRange,
  selectedCount: context.phraseSelection.selectedCount,
  shortfall: context.phraseSelection.shortfall,
  useStatus: "available-and-unused-no-writer-call",
  selected: context.phraseExamples.map((entry) => ({
    sourcePath: entry.sourcePath,
    contentKey: entry.contentKey,
    governanceTier: entry.governanceTier,
    themes: entry.themes,
    subjectTags: entry.subjectTags,
    failureTags: entry.failureTags,
    text: entry.text
  }))
};
fs.mkdirSync(phraseReviewRoot, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(audit, null, 2)}\n`);
fs.writeFileSync(retroJsonPath, `${JSON.stringify(retroCheck, null, 2)}\n`);
fs.writeFileSync(retroMdPath, `# Venus in Libra PHRASE retro-check

Status: **packet audit only; no billed calls**

- Matched themes: ${retroCheck.matchedThemes.map((theme) => `\`${theme}\``).join(", ")}
- Eligible thematic candidates: **${retroCheck.approvedCandidateCount}**
- Selected AVAILABLE LINES: **${retroCheck.selectedCount}** (required range ${retroCheck.requestedRange.minimum}–${retroCheck.requestedRange.maximum})
- Use status: **available and unused**; no writer call followed this audit.

${retroCheck.selected.map((entry, index) => `## ${index + 1}. ${entry.contentKey}

- Source path: \`${entry.sourcePath}\`
- Governance tier: \`${entry.governanceTier}\`
- Themes: ${entry.themes.map((theme) => `\`${theme}\``).join(", ")}
- Subject tags: ${entry.subjectTags.map((tag) => `\`${tag}\``).join(", ")}
- Failure tags: ${entry.failureTags.map((tag) => `\`${tag}\``).join(", ")}

${entry.text}
`).join("\n")}
`);
fs.writeFileSync(mdPath, `# Venus in Libra v2 rewrite packet audit

Status: **packet audit passed; no prose drafted**  
Billed calls: **0**  
Evidence floor: **${context.evidencePolicy.minimumSameFamilyPassages} same-family owner passages plus ${context.evidencePolicy.minimumRegisterGoldPassages} register-gold page**  
Selected voice/meaning evidence: **${context.counts.knowledgeMatrixExamples} exact planet-sign matrix rows, ${context.counts.sameFamilyExamples} same-family passages, and ${context.counts.registerGoldExamples} register gold**  
Selected scene evidence: **${context.counts.sceneExamples} rows (${context.counts.primarySceneExamples} same-planet-sign house cores)**

## Five-role packet result

${Object.entries(sharedEvidencePacket.counts).map(([role, count]) => `- ${role}: **${count}**`).join("\n")}

All five roles are present. The named passages below are the actual evidence a future writer call
would receive. No writer call followed this audit, so every owner-approved sentence is recorded
as **available and unused** rather than claiming use that did not happen.

The selected PHRASE rows are sent under \`AVAILABLE LINES\`. They may be used verbatim or adapted,
but they are not register examples and they are not owner-correction pairs.

${Object.entries(sharedEvidencePacket.roles).map(([role, entries]) => `### Role: ${role.toUpperCase()}

${entries.map((entry, index) => `#### ${role} ${index + 1}

- Source path: \`${entry.sourcePath}\`
- Content key: \`${entry.contentKey}\`
- Governance tier: \`${entry.governanceTier}\`
- Role: \`${entry.role}\`
- Source kind: \`${entry.sourceKind}\`

${entry.text}
`).join("\n")}`).join("\n")}

## Matrix argument candidates available to the argument verifier

These rows are not allowed to replace the current owner-approved article as the argument
authority. They are separately labeled candidates so the owner can see which approved matrix
theses support or challenge the settled outline.

${context.knowledgeMatrixArgumentCandidates.map((entry, index) => `### Argument candidate ${index + 1}

- Source path: \`${entry.sourcePath}\`
- Content key: \`${entry.contentKey}\`
- Governance: \`${entry.governance}\`
- Judge lineage: \`${entry.judgeLineage}\`

${entry.text}
`).join("\n")}

The current Venus in Libra article is excluded from positive voice evidence. Its approved
argument is carried by the outline, and its approved close is byte-protected. The rewrite is
instructed to discard the old article's voice.

## Hard register and concreteness requirements

- Register: direct address (you/your) under the 2026-08-12 sky-page ruling.
- Third-person observations may appear inside lived scenes, but the page must address the reader.
- Saturn in Capricorn is the primary model for scene specificity, not merely one equally weighted passage.
- The lived paragraph must name things a reader can picture: the actual decision, the actual cost, and the actual follow-up work.
- The owner corpus remains insufficient as a scene bank by itself. Scene material is now retrieved separately from approved same-planet-sign house cores, governed matrix rows, and approved serving rows.
- Saturn in Capricorn remains the primary register and scene-specificity model. Scene evidence supplies observable detail; it is not relabeled as voice evidence.
- A houseless placement article may use the actions, objects, costs, and follow-up work demonstrated by a house core, but it may not import the house claim itself.

## Scene-evidence inventory

- Same-planet-sign house cores available: **${sceneEvidence.counts.samePlanetSignHouseCoreAvailable}**; selected: **${sceneEvidence.counts.samePlanetSignHouseCoreSelected}**.
- Higher-governance matrix scene rows: **${sceneEvidence.counts.matrixPrimaryCatalog}** unique rows at the two-distinct-scene-noun threshold.
- Lower-precedence matrix scene rows retained behind the higher tier: **${sceneEvidence.counts.matrixLowerPrecedenceCatalog}**.
- Approved serving scene rows: **${sceneEvidence.counts.servingCatalog}** rows across **${sceneEvidence.counts.servingFamilies}** current indexed families at the three-distinct-scene-noun threshold.
- Matrix scene rows selected for this exact target after duplicate removal: **${sceneEvidence.counts.matrixSelected}**.
- Non-house serving scene rows selected for this exact target after duplicate removal: **${sceneEvidence.counts.servingSelected}**.

${selectedSceneEvidence.map((entry, index) => `### Scene ${index + 1}. ${entry.evidenceRole}

- Source path: \`${entry.sourcePath}\`
- Content key: \`${entry.contentKey}\`
- Source family: \`${entry.indexedFamily}\`
- Register: \`${entry.register}\`
- Detected scene nouns: ${entry.sceneNouns.length ? entry.sceneNouns.map((noun) => `\`${noun}\``).join(", ") : "house core is primary by governance, independent of noun threshold"}

${entry.text}
`).join("\n")}

## Previous exclusion path, now corrected

- ownerPositiveEvidenceFromVoiceIndex accepted only owner_authored_final entries on sky-article-longform; V9 sky-placement and V13 natal-placement were excluded.
- ownerPositiveEvidenceFromVoiceIndexBySourceIds rejected exact_owner_approved; matrix rows could not enter even when named explicitly.
- OWNER_EVIDENCE_FAMILY_MAP mapped article retrieval only to sky-placement-current-sky-writer; matrix families were outside the same-family lane.
- The harness loaded the surface-qualified corpus pool and one explicit corpus source ID, but never performed an exact planet-sign matrix lookup.
- The matrix now uses its own meaning lane. It is not relabeled as owner-authored corpus evidence.

${evidence.map((entry, index) => `## ${index + 1}. ${entry.evidenceRole}

- Source path: \`${entry.sourcePath}\`
- Content key: \`${entry.contentKey}\`
- Indexed family: \`${entry.indexedFamily}\`
- Family match: \`${entry.matchedFamily}\`
- Register: \`${entry.register}\`
${entry.eventType ? `- Event type: \`${entry.eventType}\`` : "- Event type: unscoped placement meaning"}
${entry.governance ? `- Governance: \`${entry.governance}\`` : ""}
${entry.judgeLineage ? `- Judge lineage: \`${entry.judgeLineage}\`` : ""}
${entry.workbookSourceRow ? `- Workbook source row: \`${entry.workbookSourceRow}\`` : ""}
${Number.isInteger(entry.precedence) ? `- Governance precedence: \`${entry.precedence}\` (lower is earlier)` : ""}

${entry.text}
`).join("\n")}

## Approved families still outside writer retrieval

The current approved-example index contains **${familyRetrieval.approvedFamilies.length}** families. The
register, matrix, and scene lanes currently admit **${familyRetrieval.includedFamilies.length}** indexed
families; **${familyRetrieval.excludedFamilies.length}** remain outside retrieval:

${familyRetrieval.excludedFamilies.map((family) => `- \`${family}\``).join("\n")}

## Approved stores currently outside retrieval

${sharedEvidenceIndexArtifact.sourceStores.approvedExampleStoresOutsideRetrieval.length
  ? sharedEvidenceIndexArtifact.sourceStores.approvedExampleStoresOutsideRetrieval.map((store) => `- \`${store}\``).join("\n")
  : "None."}

## Governance

- The old Sol output is a failed-retrieval diagnostic, not a candidate or baseline.
- This packet authorizes no billed call.
- Nothing is staged or serving.
`);
console.log(JSON.stringify({
  mdPath,
  jsonPath,
  counts: context.counts,
  sceneEvidenceCounts: sceneEvidence.counts,
  excludedApprovedFamilyCount: familyRetrieval.excludedFamilies.length,
  evidence: evidence.map(({ contentKey, matchedFamily }) => ({ contentKey, matchedFamily })),
  sceneEvidence: selectedSceneEvidence.map(({ contentKey, evidenceRole }) => ({ contentKey, evidenceRole })),
  phraseEvidence: context.phraseExamples.map(({ contentKey, themes }) => ({ contentKey, themes })),
  retroJsonPath,
  retroMdPath
}, null, 2));
