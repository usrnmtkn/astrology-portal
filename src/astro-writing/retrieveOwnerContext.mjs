import { selectOwnerCorrectionPairs } from "./selectOwnerCorrectionPairs.mjs";
import { normalizeOwnerEvidence, ownerEvidencePolicyFor } from "./ownerEvidencePolicy.mjs";
import { buildSharedEvidencePacket } from "./sharedEvidenceIndex.mjs";
import { selectPhraseEvidence } from "./phraseEvidence.mjs";

function words(value) {
  return new Set(String(value ?? "").toLowerCase().match(/[a-z][a-z'-]+/gu) ?? []);
}

function overlapScore(entry, plan) {
  const haystack = words(JSON.stringify(entry));
  const needles = words([
    plan.object,
    plan.sign,
    plan.eventType,
    plan.coreTension,
    ...plan.likelyObservableBehaviors,
    ...plan.risks
  ].filter(Boolean).join(" "));
  let score = 0;
  for (const token of needles) if (haystack.has(token)) score += 1;
  if (entry.planet === plan.object) score += 8;
  if (entry.family && String(entry.family).includes(plan.object)) score += 4;
  if (entry.sign === plan.sign) score += 4;
  return score;
}

export function retrieveOwnerContext(plan, {
  examples = [],
  matrixExamples = [],
  matrixArgumentCandidates = [],
  matrixEvidenceAvailableCount = null,
  sceneExamples = [],
  samePlanetSignSceneAvailableCount = null,
  sceneEvidenceInventoryCounts = null,
  argumentSource = null,
  registerGoldExamples = [],
  corrections = [],
  contentFamily,
  register,
  maxExamples = null,
  correctionPairCount = 8,
  failureCategories = [],
  excludedEvidenceContentKeys = [],
  preferredEvidenceContentKeys = [],
  phraseEvidence = []
} = {}) {
  const policy = ownerEvidencePolicyFor(contentFamily);
  const excludedKeys = new Set(excludedEvidenceContentKeys);
  const normalizedExamples = examples.map(normalizeOwnerEvidence);
  const normalizedMatrix = matrixExamples.map(normalizeOwnerEvidence);
  const normalizedMatrixArguments = matrixArgumentCandidates.map(normalizeOwnerEvidence);
  const normalizedScenes = sceneExamples.map(normalizeOwnerEvidence);
  const normalizedGold = registerGoldExamples.map(normalizeOwnerEvidence);
  const preferredKeys = new Set(preferredEvidenceContentKeys);
  const eligibleExamples = normalizedExamples.filter((entry) => (
    entry.ownerApproved === true
    && entry.ownerAuthored === true
    && entry.useAsPositiveVoiceEvidence === true
    && policy.sameFamilyFamilies.includes(entry.family)
    && policy.allowedRegisters.includes(entry.register)
    && !excludedKeys.has(entry.contentKey)
    && entry.text.trim()
  ));
  const ranked = (entries) => entries
    .map((entry, index) => ({
      entry,
      index,
      score: overlapScore(entry, plan) + (preferredKeys.has(entry.contentKey) ? 1000 : 0)
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ entry }) => entry);

  const maximum = maxExamples ?? policy.maximumSameFamilyPassages;
  const selectedSameFamily = [];
  const sourceCounts = new Map();
  for (const entry of ranked(eligibleExamples)) {
    const sourceKey = entry.sourcePath ?? entry.source ?? entry.contentKey ?? entry.id;
    const sourceCount = sourceCounts.get(sourceKey) ?? 0;
    if (sourceCount >= 2) continue;
    selectedSameFamily.push(entry);
    sourceCounts.set(sourceKey, sourceCount + 1);
    if (selectedSameFamily.length >= maximum) break;
  }
  const registerGoldById = new Map(normalizedGold.map((entry) => [entry.id, entry]));
  const selectedRegisterGold = policy.registerGoldIds
    .map((id) => registerGoldById.get(id))
    .filter((entry) => entry?.ownerApproved === true && entry.evidenceRole === "register_gold" && entry.text.trim());
  const selectedMatrix = normalizedMatrix.filter((entry) => (
    entry.ownerApproved === true
    && entry.useAsPositiveVoiceEvidence === true
    && ["knowledge_matrix_meaning", "knowledge_matrix_positive"].includes(entry.evidenceRole)
    && entry.planet === plan.object
    && entry.sign === plan.sign
    && (!plan.eventType || !entry.eventType || entry.eventType === plan.eventType)
    && entry.text.trim()
  ));
  const selectedScenes = normalizedScenes.filter((entry) => (
    entry.ownerApproved === true
    && entry.useAsSceneEvidence === true
    && entry.evidenceRole
    && entry.text.trim()
  ));
  const selectedMatrixArguments = normalizedMatrixArguments.filter((entry) => (
    entry.ownerApproved === true
    && entry.evidenceRole === "knowledge_matrix_argument_candidate"
    && entry.planet === plan.object
    && entry.sign === plan.sign
    && (!plan.eventType || !entry.eventType || entry.eventType === plan.eventType)
    && entry.text.trim()
  ));
  const selectedCorrections = selectOwnerCorrectionPairs(corrections, {
    family: contentFamily,
    count: correctionPairCount,
    failureCategories
  });
  const phraseSelection = selectPhraseEvidence(plan, phraseEvidence);
  const context = {
    examples: [...selectedMatrix, ...selectedSameFamily, ...selectedRegisterGold, ...selectedScenes],
    knowledgeMatrixExamples: selectedMatrix,
    knowledgeMatrixArgumentCandidates: selectedMatrixArguments,
    sceneExamples: selectedScenes,
    primarySceneExamples: selectedScenes.filter((entry) => entry.evidenceRole === "primary_same_planet_sign_house_core_scene"),
    sameFamilyExamples: selectedSameFamily.map((entry) => ({
      ...entry,
      matchedFamily: entry.family,
      sourcePath: entry.sourcePath ?? entry.source
    })),
    registerGoldExamples: selectedRegisterGold,
    corrections: selectedCorrections.pairs,
    phraseExamples: phraseSelection.selected,
    phraseSelection,
    correctionSelection: selectedCorrections.logic,
    evidencePolicy: {
      family: contentFamily,
      mappedFamilies: policy.sameFamilyFamilies,
      allowedRegisters: policy.allowedRegisters,
      minimumSameFamilyPassages: policy.minimumSameFamilyPassages,
      minimumRegisterGoldPassages: policy.minimumRegisterGoldPassages,
      excludedEvidenceContentKeys: [...excludedKeys],
      preferredEvidenceContentKeys: [...preferredKeys],
      matrixEvidenceAvailableCount,
      samePlanetSignSceneAvailableCount,
      sceneEvidenceInventoryCounts,
      phraseThemeMatched: phraseSelection.themeMatched,
      phraseMatchedThemes: phraseSelection.matchedThemes,
      phraseEvidenceAvailableCount: phraseSelection.approvedCandidateCount,
      phraseEvidenceLookupPerformed: true
    },
    counts: {
      examples: selectedMatrix.length + selectedSameFamily.length + selectedRegisterGold.length + selectedScenes.length,
      knowledgeMatrixExamples: selectedMatrix.length,
      knowledgeMatrixArgumentCandidates: selectedMatrixArguments.length,
      sameFamilyExamples: selectedSameFamily.length,
      registerGoldExamples: selectedRegisterGold.length,
      sceneExamples: selectedScenes.length,
      primarySceneExamples: selectedScenes.filter((entry) => entry.evidenceRole === "primary_same_planet_sign_house_core_scene").length,
      corrections: selectedCorrections.pairs.length,
      phraseExamples: phraseSelection.selectedCount
    }
  };
  context.sharedEvidencePacket = buildSharedEvidencePacket({ context, argumentSource, plan });
  return Object.freeze(context);
}
