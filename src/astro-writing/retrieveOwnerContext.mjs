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
  if (entry.planet === plan.object && entry.sign === plan.sign) score += 48;
  else if (entry.sign === plan.sign) score += 24;
  else if (entry.planet === plan.object) score += 12;
  if (plan.object === "sun" && entry.sign === plan.sign && entry.family === "sky-season") score += 64;
  if (entry.family && String(entry.family).includes(plan.object)) score += 4;
  return score;
}

function registerFamilyMatchesTarget(entry, plan) {
  const family = String(entry?.sourceFamily ?? entry?.family ?? "");
  const object = String(plan?.object ?? "").toLowerCase();
  if (family === "sky-lunation") return false;
  if (family === "sky-season") return object === "sun";
  if (family === "sky-nodes-longform") return object === "north-node" || object === "south-node" || object === "nodes";
  if (family === "relationship-astrology") return object === "venus";
  if (family === "weekly-astrology") return false;
  return true;
}

export function retrieveOwnerContext(plan, {
  examples = [],
  matrixExamples = [],
  matrixArgumentCandidates = [],
  matrixEvidenceAvailableCount = null,
  relevantOwnerPassagesAvailableCount = null,
  ownerPassageRelevanceTier = "none",
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
  const normalizedExamples = [...new Map(examples.map(normalizeOwnerEvidence).map((entry, index) => [
    entry.id ?? entry.contentKey ?? `owner-evidence-${index}`,
    entry
  ])).values()];
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
    && registerFamilyMatchesTarget(entry, plan)
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
  const rankedExamples = ranked(eligibleExamples);
  const targetSign = String(plan.sign ?? "").trim().toLowerCase();
  const targetPlanet = String(plan.object ?? "").trim().toLowerCase();
  const relevanceMatches = (entry) => ownerPassageRelevanceTier !== "none"
    && (
      String(entry.sign ?? "").trim().toLowerCase() === targetSign
      || String(entry.planet ?? "").trim().toLowerCase() === targetPlanet
    );
  const requiredRelevant = Math.min(
    policy.minimumRelevantOwnerPassages,
    relevantOwnerPassagesAvailableCount ?? 0
  );
  const add = (entry, sourceLimit) => {
    if (selectedSameFamily.includes(entry)) return false;
    const sourceKey = entry.sourceFamily === "owner-locked-lilith-v5-placement"
      ? entry.contentKey
      : entry.sourcePath ?? entry.source ?? entry.contentKey ?? entry.id;
    const sourceCount = sourceCounts.get(sourceKey) ?? 0;
    if (sourceCount >= sourceLimit) return false;
    selectedSameFamily.push(entry);
    sourceCounts.set(sourceKey, sourceCount + 1);
    return true;
  };
  for (const sourceLimit of [2, Number.POSITIVE_INFINITY]) {
    for (const entry of rankedExamples.filter(relevanceMatches)) {
      add(entry, sourceLimit);
      if (selectedSameFamily.filter(relevanceMatches).length >= requiredRelevant) break;
    }
    if (selectedSameFamily.filter(relevanceMatches).length >= requiredRelevant) break;
  }
  for (const entry of rankedExamples) {
    add(entry, 2);
    if (selectedSameFamily.length >= maximum) break;
  }
  const relevantOwnerPassages = selectedSameFamily.filter(relevanceMatches);
  const supportingOwnerPassages = selectedSameFamily.filter((entry) => !relevanceMatches(entry));
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
    relevantOwnerPassages,
    supportingOwnerPassages,
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
      minimumRelevantOwnerPassages: policy.minimumRelevantOwnerPassages,
      relevantOwnerPassagesAvailableCount,
      relevantOwnerPassagesSelectedCount: relevantOwnerPassages.length,
      ownerPassageRelevanceTier,
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
      relevantOwnerPassages: relevantOwnerPassages.length,
      supportingOwnerPassages: supportingOwnerPassages.length,
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
