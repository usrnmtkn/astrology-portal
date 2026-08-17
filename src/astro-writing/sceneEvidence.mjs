import { matrixEvidenceCatalog } from "./matrixEvidenceIndex.mjs";

export const SCENE_EVIDENCE_VERSION = "shared-evidence-scene-v2-2026-08-13";

// These are the repository's recorded scene nouns. `text` is included because
// the owner's house-core examples use the ordinary object (a text someone sends),
// not the abstract communication category.
export const SCENE_NOUNS = Object.freeze([
  "meeting",
  "message",
  "decision",
  "answer",
  "plan",
  "text"
]);

const MATRIX_SCENE_MIN_DISTINCT_NOUNS = 2;
const SERVING_SCENE_MIN_DISTINCT_NOUNS = 3;
const DEFAULT_MAX_PRIMARY_HOUSE_CORES = 12;
const DEFAULT_MAX_MATRIX_SCENES = 4;
const DEFAULT_MAX_SERVING_SCENES = 4;

const GENERIC_PLANET_EDUCATION_PARAGRAPHS = Object.freeze([
  "Your Moon is your instinctual emotional world: how you feel, what comforts you, how you care for yourself and others, how you react when you are upset, and what helps you recover after stress. Most of it is unconscious, conditioned behavior.",
  "The Sun is your core identity. It shows what you are here to build, and where you need to be seen."
]);

export function withoutGenericPlanetEducation(text) {
  const paragraphs = String(text ?? "").split(/\n\n+/u);
  return paragraphs.filter((paragraph) => !GENERIC_PLANET_EDUCATION_PARAGRAPHS.includes(paragraph.trim())).join("\n\n").trim();
}

function normalizedToken(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[_\s-]+/gu, "-");
}

function sceneNounPattern(noun) {
  return new RegExp(`\\b${noun}(?:s|es)?\\b`, "iu");
}

export function distinctSceneNouns(text, nounLexicon = SCENE_NOUNS) {
  return [...new Set(nounLexicon)].filter((noun) => sceneNounPattern(noun).test(String(text ?? "")));
}

function inferredRegister(text) {
  return /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(text)
    ? "second_person"
    : "collective";
}

function matrixPrecedence(entry) {
  const lineage = String(entry?.judgeLineage ?? "").toLowerCase();
  if (lineage.includes("owner-approved-exact-copy")) return 0;
  if (entry?.origin === "owner-approved-ll-matrix-v13") return 1;
  if (lineage.includes("rewritten-source-safe")) return 2;
  if (lineage.includes("composed (unjudged)")) return 3;
  if (lineage.includes("rewritten-owner-voice-audited")) return 4;
  return 5;
}

function contentKeyMatchesPlanetSign(contentKey, planet, sign) {
  const normalized = `/${String(contentKey ?? "").toLowerCase().replace(/\|/gu, "/")}/`;
  return normalized.includes(`/${normalizedToken(planet)}/${normalizedToken(sign)}/`);
}

function planetSignHouseFromHouseCoreKey(contentKey) {
  const match = String(contentKey ?? "").match(/^house-horoscope-core\/([^/]+)\/([^/]+)\/house-(\d+)$/u);
  return match ? { planet: normalizedToken(match[1]), sign: normalizedToken(match[2]), house: Number(match[3]) } : null;
}

function planetSignFromServingKey(contentKey) {
  const patterns = [
    /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn)\/([^/]+)\/([^/]+)$/u,
    /^fallback-hook\/sky-sign-copy\/([^/]+)\/([^/]+)$/u,
    /^fallback-hook\/sky-aspect-sign\/([^/]+)\/([^/]+)\//u,
    /^house-horoscope-core\/([^/]+)\/([^/]+)\/house-\d+$/u,
    /^authored\/transit-house-sign\/([^/]+)\/\d+\/([^/]+)(?:\/|$)/u,
    /^authored\/calendar-weekly-(moon)\/([^/]+)(?:\/|$)/u
  ];
  for (const pattern of patterns) {
    const match = String(contentKey ?? "").match(pattern);
    if (match) return { planet: normalizedToken(match[1]), sign: normalizedToken(match[2]) };
  }
  return { planet: null, sign: null };
}

function dedupeTextByPrecedence(entries) {
  const selected = new Map();
  for (const entry of entries) {
    const key = String(entry.text ?? "").trim();
    if (!key) continue;
    const current = selected.get(key);
    if (!current || entry.precedence < current.precedence) selected.set(key, entry);
  }
  return [...selected.values()];
}

function rankForPlan(entries, plan) {
  const planText = JSON.stringify(plan ?? {}).toLowerCase();
  return entries
    .map((entry, index) => {
      const tokens = String(entry.text ?? "").toLowerCase().match(/[a-z][a-z'-]+/gu) ?? [];
      const overlap = new Set(tokens.filter((token) => token.length >= 5 && planText.includes(token))).size;
      return { entry, index, score: overlap * 10 + entry.sceneNouns.length };
    })
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .map(({ entry }) => entry);
}

function asSceneEvidence(entry, {
  evidenceRole,
  sourceKind,
  precedence = 0,
  sourceFamily = null,
  sourcePath = null
}) {
  const text = String(entry.text ?? "").trim();
  return Object.freeze({
    id: entry.id ?? entry.sourceId ?? entry.contentKey,
    contentKey: entry.contentKey ?? entry.sourceId ?? entry.id,
    family: "owner-approved-scene-evidence",
    sourceFamily: sourceFamily ?? entry.family ?? entry.surface ?? null,
    register: entry.register ?? inferredRegister(text),
    text,
    sourcePath: sourcePath ?? entry.sourcePath ?? entry.source ?? null,
    sourceRecordSha256: entry.sourceSha256 ?? entry.sourceRecordSha256 ?? null,
    planet: entry.planet ?? null,
    sign: entry.sign ?? null,
    house: entry.house ?? null,
    authorityClass: entry.authorityClass ?? entry.authority ?? null,
    governance: entry.governance ?? null,
    judgeLineage: entry.judgeLineage ?? null,
    editorialStatus: entry.editorialStatus ?? null,
    ownerApproved: true,
    ownerAuthored: entry.ownerAuthored === true,
    useAsPositiveVoiceEvidence: false,
    useAsSceneEvidence: true,
    evidenceRole,
    sourceKind,
    sceneNouns: Object.freeze([...(entry.sceneNouns ?? distinctSceneNouns(text))]),
    precedence
  });
}

export function samePlanetSignHouseCoreScenes(approvedExamples, { planet, sign } = {}) {
  return (approvedExamples ?? [])
    .filter((entry) => (
      entry.ownerApproved === true
      && entry.authority === "serving-review-status-approved"
      && entry.family === "house-core"
      && contentKeyMatchesPlanetSign(entry.contentKey, planet, sign)
      && typeof entry.text === "string"
      && entry.text.trim()
    ))
    .map((entry) => asSceneEvidence(entry, {
      evidenceRole: "primary_same_planet_sign_house_core_scene",
      sourceKind: "approved_house_horoscope_core",
      sourceFamily: entry.family,
      sourcePath: `apps/web/src/content/fallbackArchitectureV3/source-rows/${normalizedToken(planet)}-${normalizedToken(sign)}-house-cores-v1.json`
    }))
    .sort((first, second) => first.contentKey.localeCompare(second.contentKey, undefined, { numeric: true }));
}

export function allApprovedHouseCoreScenes(approvedExamples) {
  return (approvedExamples ?? [])
    .filter((entry) => (
      entry.ownerApproved === true
      && entry.authority === "serving-review-status-approved"
      && entry.family === "house-core"
      && planetSignHouseFromHouseCoreKey(entry.contentKey)
      && typeof entry.text === "string"
      && entry.text.trim()
    ))
    .map((entry) => {
      const key = planetSignHouseFromHouseCoreKey(entry.contentKey);
      return asSceneEvidence({ ...entry, ...key }, {
        evidenceRole: "primary_same_planet_sign_house_core_scene",
        sourceKind: "approved_house_horoscope_core",
        sourceFamily: entry.family,
        sourcePath: `apps/web/src/content/fallbackArchitectureV3/source-rows/${key.planet}-${key.sign}-house-cores-v1.json`
      });
    })
    .sort((first, second) => first.contentKey.localeCompare(second.contentKey, undefined, { numeric: true }));
}

export function knowledgeMatrixSceneCatalog(voiceIndex) {
  const entries = Array.isArray(voiceIndex) ? voiceIndex : voiceIndex?.entries ?? [];
  if (entries.some((entry) => Array.isArray(entry?.roles) && typeof entry?.copy_sha === "string")) {
    const deduped = matrixEvidenceCatalog(entries).scene.map((entry) => asSceneEvidence(entry, {
      evidenceRole: "knowledge_matrix_scene",
      sourceKind: "owner_approved_knowledge_matrix_scene_index",
      sourceFamily: entry.sourceFamily,
      sourcePath: entry.sourcePath,
      precedence: entry.precedence
    }));
    return Object.freeze({ primary: Object.freeze(deduped), lowerPrecedence: Object.freeze([]), all: Object.freeze(deduped) });
  }
  const candidates = entries
    .filter((entry) => (
      String(entry.origin ?? "").includes("matrix")
      && entry.authorityClass === "exact_owner_approved"
      && entry.ownerApproved === true
      && typeof entry.text === "string"
      && distinctSceneNouns(entry.text).length >= MATRIX_SCENE_MIN_DISTINCT_NOUNS
    ))
    .map((entry) => asSceneEvidence(entry, {
      evidenceRole: "knowledge_matrix_scene",
      sourceKind: "owner_approved_knowledge_matrix",
      sourceFamily: entry.surface,
      precedence: matrixPrecedence(entry)
    }));
  const deduped = dedupeTextByPrecedence(candidates)
    .sort((first, second) => first.precedence - second.precedence || first.contentKey.localeCompare(second.contentKey));
  return Object.freeze({
    primary: deduped.filter((entry) => entry.precedence <= 3),
    lowerPrecedence: deduped.filter((entry) => entry.precedence > 3),
    all: deduped
  });
}

export function approvedServingSceneCatalog(approvedExamples, { sceneNounLexicon = SCENE_NOUNS } = {}) {
  return (approvedExamples ?? [])
    .map((entry) => ({ ...entry, sceneText: withoutGenericPlanetEducation(entry.text) }))
    .filter((entry) => (
      entry.ownerApproved === true
      && entry.authority === "serving-review-status-approved"
      && entry.family !== "house-core"
      && !String(entry.family ?? "").startsWith("knowledge-matrix-")
      && entry.family !== "fallback-hook/planet-intro"
      && typeof entry.sceneText === "string"
      && distinctSceneNouns(entry.sceneText, sceneNounLexicon).length >= SERVING_SCENE_MIN_DISTINCT_NOUNS
    ))
    .map((entry) => asSceneEvidence({ ...entry, text: entry.sceneText, ...planetSignFromServingKey(entry.contentKey), sceneNouns: distinctSceneNouns(entry.sceneText, sceneNounLexicon) }, {
      evidenceRole: "approved_serving_scene",
      sourceKind: "approved_serving_row",
      sourceFamily: entry.family,
      sourcePath: "data/writing/OWNER_APPROVED_EXAMPLES.jsonl"
    }));
}

export function ownerCorpusSceneCatalog(registerExamples, { sceneNounLexicon = SCENE_NOUNS } = {}) {
  return (registerExamples ?? [])
    .filter((entry) => (
      entry.ownerApproved === true
      && entry.ownerAuthored === true
      && typeof entry.text === "string"
      && distinctSceneNouns(entry.text, sceneNounLexicon).length >= SERVING_SCENE_MIN_DISTINCT_NOUNS
    ))
    .map((entry) => asSceneEvidence({ ...entry, sceneNouns: distinctSceneNouns(entry.text, sceneNounLexicon) }, {
      evidenceRole: "owner_corpus_scene",
      sourceKind: "owner_corpus_fixture_scene",
      sourceFamily: entry.family,
      sourcePath: entry.sourcePath
    }));
}

export function sceneEvidenceForTarget({
  approvedExamples,
  voiceIndex,
  matrixEvidenceRows = null,
  registerExamples = [],
  sceneNounLexicon = SCENE_NOUNS,
  plan,
  maxPrimaryHouseCores = DEFAULT_MAX_PRIMARY_HOUSE_CORES,
  maxMatrixScenes = DEFAULT_MAX_MATRIX_SCENES,
  maxServingScenes = DEFAULT_MAX_SERVING_SCENES
} = {}) {
  const primaryAvailable = samePlanetSignHouseCoreScenes(approvedExamples, {
    planet: plan?.object,
    sign: plan?.sign
  });
  const matrixCatalog = knowledgeMatrixSceneCatalog(matrixEvidenceRows ?? voiceIndex);
  const servingCatalog = approvedServingSceneCatalog(approvedExamples, { sceneNounLexicon });
  const corpusCatalog = ownerCorpusSceneCatalog(registerExamples, { sceneNounLexicon });
  const matchesTarget = (entry) => (
    (normalizedToken(entry.planet) === normalizedToken(plan?.object)
      && normalizedToken(entry.sign) === normalizedToken(plan?.sign))
    || contentKeyMatchesPlanetSign(entry.contentKey, plan?.object, plan?.sign)
  );
  const selectedPrimary = rankForPlan(primaryAvailable, plan).slice(0, maxPrimaryHouseCores);
  const usedText = new Set(selectedPrimary.map((entry) => entry.text));
  const selectNovel = (entries, maximum) => {
    const selected = [];
    for (const entry of rankForPlan(entries, plan)) {
      if (usedText.has(entry.text)) continue;
      selected.push(entry);
      usedText.add(entry.text);
      if (selected.length >= maximum) break;
    }
    return selected;
  };
  const selectedServing = selectNovel(servingCatalog.filter(matchesTarget), maxServingScenes);
  const selectedMatrix = selectNovel(matrixCatalog.primary.filter(matchesTarget), maxMatrixScenes);
  const selectedCorpus = selectNovel(corpusCatalog.filter(matchesTarget), maxServingScenes);
  const targetServingAvailable = servingCatalog.filter(matchesTarget);
  const targetMatrixAvailable = matrixCatalog.primary.filter(matchesTarget);
  const targetCorpusAvailable = corpusCatalog.filter(matchesTarget);
  return Object.freeze({
    selected: Object.freeze([...selectedPrimary, ...selectedServing, ...selectedMatrix, ...selectedCorpus]),
    selectedPrimary: Object.freeze(selectedPrimary),
    selectedMatrix: Object.freeze(selectedMatrix),
    selectedServing: Object.freeze(selectedServing),
    selectedCorpus: Object.freeze(selectedCorpus),
    availablePrimary: Object.freeze(primaryAvailable),
    matrixCatalog,
    servingCatalog: Object.freeze(servingCatalog),
    corpusCatalog: Object.freeze(corpusCatalog),
    counts: Object.freeze({
      samePlanetSignHouseCoreAvailable: primaryAvailable.length,
      samePlanetSignHouseCoreSelected: selectedPrimary.length,
      samePlanetSignServingAvailable: targetServingAvailable.length,
      samePlanetSignMatrixAvailable: targetMatrixAvailable.length,
      samePlanetSignCorpusAvailable: targetCorpusAvailable.length,
      samePlanetSignSceneAvailable: primaryAvailable.length + targetServingAvailable.length + targetMatrixAvailable.length + targetCorpusAvailable.length,
      matrixPrimaryCatalog: matrixCatalog.primary.length,
      matrixLowerPrecedenceCatalog: matrixCatalog.lowerPrecedence.length,
      matrixSelected: selectedMatrix.length,
      servingCatalog: servingCatalog.length,
      servingFamilies: new Set(servingCatalog.map((entry) => entry.sourceFamily)).size,
      servingSelected: selectedServing.length,
      corpusCatalog: corpusCatalog.length,
      corpusSelected: selectedCorpus.length,
      selected: selectedPrimary.length + selectedServing.length + selectedMatrix.length + selectedCorpus.length
    })
  });
}

export function approvedFamilyRetrievalExclusions(approvedExamples, {
  includedFamilies = []
} = {}) {
  const approvedFamilies = [...new Set((approvedExamples ?? [])
    .filter((entry) => entry.ownerApproved === true && entry.family)
    .map((entry) => entry.family))].sort();
  const included = new Set(includedFamilies);
  return Object.freeze({
    approvedFamilies: Object.freeze(approvedFamilies),
    includedFamilies: Object.freeze([...included].sort()),
    excludedFamilies: Object.freeze(approvedFamilies.filter((family) => !included.has(family)))
  });
}
