import {
  allApprovedHouseCoreScenes,
  approvedServingSceneCatalog,
  ownerCorpusSceneCatalog
} from "./sceneEvidence.mjs";
import { llMatrixV13EvidenceCatalog, matrixEvidenceCatalog, matrixSceneNounLexicon } from "./matrixEvidenceIndex.mjs";

export const SHARED_EVIDENCE_STANDARD_VERSION = "shared-evidence-standard-v1-2026-08-13";
export const SHARED_EVIDENCE_ROLES = Object.freeze(["meaning", "register", "scene", "argument", "phrase"]);
export const REQUIRED_CORE_EVIDENCE_ROLES = Object.freeze(["meaning", "register", "scene", "argument"]);

export const REGISTER_SOURCE_STORES = Object.freeze([
  "packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/reference-surfaces/",
  "tldr-astro-phrasebank/MARIE-VOICE-BANK.md",
  "tldr-astro-phrasebank/WRITING-STANDARD.md",
  "data/writing/owner-register-gold.json",
  "data/writing/owner-supplied-structural-exemplars.json"
]);

function token(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[_\s-]+/gu, "-");
}

function planetSignKey(planet, sign) {
  return `${token(planet) || "*"}|${token(sign) || "*"}`;
}

function governanceTier(entry) {
  const lineage = String(entry?.judgeLineage ?? "").toLowerCase();
  if (lineage.includes("owner-approved-exact-copy")) return "owner-approved-exact-copy";
  if (entry?.origin === "owner-approved-ll-matrix-v13") return "owner-approved-v13";
  if (entry?.authority === "exact-owner-approved-rendered-page") return "owner-approved-register-gold";
  if (entry?.authority === "serving-review-status-approved") return "owner-approved-serving";
  if (entry?.authorityClass === "owner_authored_final") return "owner-authored-final";
  if (entry?.governance) return entry.governance;
  if (entry?.editorialStatus) return entry.editorialStatus;
  return entry?.authorityClass ?? entry?.authority ?? "governance-not-recorded";
}

function namedEntry(entry, role, overrides = {}) {
  const text = String(overrides.text ?? entry?.text ?? "").trim();
  return Object.freeze({
    id: overrides.id ?? `${role}:${entry?.id ?? entry?.contentKey ?? entry?.sourceId}`,
    indexKey: planetSignKey(overrides.planet ?? entry?.planet, overrides.sign ?? entry?.sign),
    planet: token(overrides.planet ?? entry?.planet) || null,
    sign: token(overrides.sign ?? entry?.sign) || null,
    role,
    sourcePath: overrides.sourcePath ?? entry?.sourcePath ?? entry?.source ?? null,
    contentKey: overrides.contentKey ?? entry?.contentKey ?? entry?.sourceId ?? entry?.id ?? null,
    family: overrides.family ?? entry?.family ?? entry?.sourceFamily ?? entry?.surface ?? null,
    governanceTier: overrides.governanceTier ?? governanceTier(entry),
    ownerApproved: overrides.ownerApproved ?? entry?.ownerApproved ?? false,
    ownerAuthored: overrides.ownerAuthored ?? entry?.ownerAuthored ?? false,
    generated: overrides.generated ?? entry?.generated ?? false,
    evidenceRole: overrides.evidenceRole ?? entry?.evidenceRole ?? role,
    sourceKind: overrides.sourceKind ?? entry?.sourceKind ?? null,
    house: overrides.house ?? entry?.house ?? null,
    eventType: overrides.eventType ?? entry?.eventType ?? null,
    register: overrides.register ?? entry?.register ?? null,
    store: overrides.store ?? entry?.store ?? null,
    themes: Object.freeze([...(overrides.themes ?? entry?.themes ?? [])]),
    subjectTags: Object.freeze([...(overrides.subjectTags ?? entry?.subjectTags ?? [])]),
    failureTags: Object.freeze([...(overrides.failureTags ?? entry?.failureTags ?? [])]),
    copySha: overrides.copySha ?? entry?.copySha ?? entry?.sourceRecordSha256 ?? null,
    sceneNouns: Object.freeze([...(overrides.sceneNouns ?? entry?.sceneNouns ?? [])]),
    eligibleForWriterRegister: overrides.eligibleForWriterRegister ?? entry?.eligibleForWriterRegister ?? true,
    text
  });
}

function matrixRoleEntries(matrixEvidenceRows) {
  const catalog = matrixEvidenceCatalog(matrixEvidenceRows);
  return Object.entries(catalog).flatMap(([sourceRole, entries]) => entries.map((entry) => {
    const role = sourceRole === "argument_candidate" ? "argument" : sourceRole;
    return namedEntry(entry, role, {
      id: `${role}:${entry.id}`,
      ownerAuthored: false,
      sourceKind: entry.sourceKind,
      evidenceRole: entry.evidenceRole,
      eligibleForWriterRegister: sourceRole !== "register",
      copySha: entry.copySha,
      sceneNouns: entry.sceneNouns
    });
  }));
}

function evidencePrecedence(entry) {
  const tier = String(entry.governanceTier ?? "").toLowerCase();
  if (tier.includes("owner-approved-exact-copy")) return 0;
  if (tier.includes("owner-approved-v13")) return 1;
  if (tier.includes("owner-approved-v8-locked")) return 2;
  if (tier.includes("rewritten-owner-voice-audited")) return 3;
  return 9;
}

function dedupeEvidence(entries) {
  const selected = new Map();
  for (const entry of entries) {
    const key = `${entry.role}|${entry.indexKey}|${entry.eventType ?? "*"}|${entry.copySha ?? entry.text}`;
    const current = selected.get(key);
    if (!current || evidencePrecedence(entry) < evidencePrecedence(current)) selected.set(key, entry);
  }
  return [...selected.values()];
}

function registerEntries(registerExamples, registerGoldExamples) {
  return [...(registerExamples ?? []), ...(registerGoldExamples ?? [])]
    .filter((entry) => entry.ownerApproved === true && typeof (entry.text ?? entry.sections?.join("\n\n")) === "string")
    .map((entry) => namedEntry(entry, "register", {
      id: `register:${entry.id ?? entry.contentKey}`,
      text: entry.text ?? entry.sections.join("\n\n"),
      ownerAuthored: true,
      sourceKind: entry.evidenceRole === "register_gold" ? "owner-approved-register-gold" : "owner-corpus-passage"
    }));
}

function sceneEntries(approvedExamples, registerExamples, sceneNounLexicon) {
  const house = allApprovedHouseCoreScenes(approvedExamples);
  const serving = approvedServingSceneCatalog(approvedExamples, { sceneNounLexicon });
  const corpus = ownerCorpusSceneCatalog(registerExamples, { sceneNounLexicon });
  return [...house, ...serving, ...corpus].map((entry) => namedEntry(entry, "scene", {
    id: `scene:${entry.id}`,
    ownerAuthored: entry.ownerAuthored === true
  }));
}

function argumentEntries(approvedExamples) {
  return (approvedExamples ?? [])
    .filter((entry) => (
      entry.ownerApproved === true
      && entry.authority === "serving-review-status-approved"
      && (
        (entry.family === "fallback-hook/sky-sign-copy" && /^fallback-hook\/sky-sign-copy\/[^/]+\/[^/]+$/u.test(entry.contentKey))
        || /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn)\/[^/]+\/[^/]+$/u.test(entry.contentKey)
      )
      && typeof entry.text === "string"
      && entry.text.trim()
    ))
    .map((entry) => {
      const parts = entry.contentKey.split("/");
      const planet = parts.at(-2);
      const sign = parts.at(-1);
      return namedEntry(entry, "argument", {
        id: `argument:${entry.contentKey}`,
        planet,
        sign,
        sourcePath: "data/writing/OWNER_APPROVED_EXAMPLES.jsonl",
        ownerAuthored: false,
        sourceKind: entry.family === "fallback-hook/sky-sign-copy"
          ? "current-owner-approved-placement-article"
          : "current-owner-approved-placement-card"
      });
    });
}

function reviewedSkyPointMeaningEntries(skyPointMeaningRows) {
  return (skyPointMeaningRows ?? [])
    .filter((entry) => (
      entry?.status === "REVIEWED_CLAUSE"
      && typeof entry?.point === "string"
      && typeof entry?.sign === "string"
      && typeof entry?.collective_reading === "string"
      && entry.collective_reading.trim()
    ))
    .map((entry) => namedEntry(entry, "meaning", {
      id: `meaning:${entry.id}`,
      planet: entry.point,
      sign: entry.sign,
      text: entry.collective_reading,
      sourcePath: "tldr-astro-phrasebank/phrasebank/cc-sky-points-authored.json",
      contentKey: entry.id,
      family: "sky-point-placement-meaning",
      governanceTier: "reviewed-clause",
      ownerApproved: true,
      ownerAuthored: false,
      generated: false,
      evidenceRole: "sky_point_placement_meaning",
      sourceKind: "reviewed-sky-point-placement-meaning",
      eligibleForWriterRegister: false
    }));
}

export function buildSharedEvidenceIndex({
  matrixEvidenceRows = [],
  llMatrixV13Rows = [],
  llMatrixV13ManifestRows = [],
  approvedExamples = [],
  registerExamples = [],
  registerGoldExamples = [],
  phraseExamples = [],
  skyPointMeaningRows = []
} = {}) {
  const sceneNounLexicon = matrixSceneNounLexicon(matrixEvidenceRows);
  const entries = dedupeEvidence([
    ...matrixRoleEntries(matrixEvidenceRows),
    ...llMatrixV13EvidenceCatalog(llMatrixV13Rows, llMatrixV13ManifestRows).map((entry) => namedEntry(entry, "meaning", {
      id: entry.id,
      sourceKind: entry.sourceKind,
      governanceTier: entry.governanceTier,
      copySha: entry.copySha,
      eligibleForWriterRegister: false
    })),
    ...reviewedSkyPointMeaningEntries(skyPointMeaningRows),
    ...registerEntries(registerExamples, registerGoldExamples),
    ...sceneEntries(approvedExamples, registerExamples, sceneNounLexicon),
    ...argumentEntries(approvedExamples),
    ...phraseExamples.filter((entry) => entry.ownerApproved === true && entry.role === "phrase" && entry.excluded !== true).map((entry) => namedEntry(entry, "phrase", {
      id: entry.id,
      sourceKind: entry.store === "voice-bank" ? "owner-approved-voice-bank-phrase" : "owner-confirmed-phrasebank-line",
      governanceTier: entry.governanceTier,
      ownerAuthored: true,
      text: entry.text
    }))
  ]);
  const byPlanetSign = {};
  for (const entry of entries) {
    byPlanetSign[entry.indexKey] ??= Object.fromEntries(SHARED_EVIDENCE_ROLES.map((role) => [role, []]));
    byPlanetSign[entry.indexKey][entry.role].push(entry.id);
  }
  const countsByRole = Object.fromEntries(SHARED_EVIDENCE_ROLES.map((role) => [
    role,
    entries.filter((entry) => entry.role === role).length
  ]));
  return Object.freeze({
    version: SHARED_EVIDENCE_STANDARD_VERSION,
    generatedAt: null,
    keyFormat: "planet|sign; *|* is globally eligible register evidence",
    rolePriority: Object.freeze({ scene: ["same-planet-sign-house-core", "approved-serving-row", "knowledge-matrix", "owner-corpus-fixture"] }),
    registerSourceStores: REGISTER_SOURCE_STORES,
    counts: Object.freeze({ entries: entries.length, ...countsByRole, planetSignKeys: Object.keys(byPlanetSign).length }),
    byPlanetSign: Object.freeze(byPlanetSign),
    entries: Object.freeze(entries)
  });
}

function placementFromCoverageKey(key) {
  const [planet, sign] = String(key).split("|");
  return { planet: token(planet), sign: token(sign) };
}

export function buildExtendedEvidenceCoverage({ matrixCoverage = {}, index } = {}) {
  const placementKeys = new Set(Object.keys(matrixCoverage));
  for (const entry of index?.entries ?? []) {
    if (entry.planet && entry.sign) placementKeys.add(`${entry.planet}|${entry.sign}`);
  }
  const rows = [...placementKeys].sort().map((placementKey) => {
    const matrix = matrixCoverage[placementKey] ?? { meaning: 0, register: 0, scene: 0, argument_candidate: 0 };
    const { planet, sign } = placementFromCoverageKey(placementKey);
    const indexKey = planetSignKey(planet, sign);
    const roleEntries = Object.fromEntries(SHARED_EVIDENCE_ROLES.map((role) => [
      role,
      (index?.entries ?? []).filter((entry) => entry.indexKey === indexKey && entry.role === role)
    ]));
    const bySource = (role) => Object.fromEntries([...new Set(roleEntries[role].map((entry) => entry.sourceKind ?? "unknown"))].sort().map((sourceKind) => [
      sourceKind,
      roleEntries[role].filter((entry) => (entry.sourceKind ?? "unknown") === sourceKind).length
    ]));
    return Object.freeze({
      placementKey,
      planet,
      sign,
      matrixRaw: Object.freeze({ ...matrix }),
      extended: Object.freeze(Object.fromEntries(SHARED_EVIDENCE_ROLES.map((role) => [role, roleEntries[role].length]))),
      sceneBySource: Object.freeze(bySource("scene")),
      registerBySource: Object.freeze(bySource("register"))
    });
  });
  return Object.freeze({
    placements: Object.freeze(rows),
    counts: Object.freeze({
      placements: rows.length,
      matrixZeroScene: rows.filter((row) => Object.hasOwn(matrixCoverage, row.placementKey) && row.matrixRaw.scene === 0).length,
      extendedZeroScene: rows.filter((row) => row.extended.scene === 0).length,
      extendedZeroSceneWithinMatrixPlacements: rows.filter((row) => Object.hasOwn(matrixCoverage, row.placementKey) && row.extended.scene === 0).length,
      extendedZeroMeaning: rows.filter((row) => row.extended.meaning === 0).length,
      extendedZeroArgument: rows.filter((row) => row.extended.argument === 0).length
    }),
    zeroScenePlacements: Object.freeze(rows.filter((row) => row.extended.scene === 0).map((row) => row.placementKey))
  });
}

export function buildSharedEvidencePacket({ context, argumentSource, plan } = {}) {
  const meaning = (context?.knowledgeMatrixExamples ?? []).map((entry) => namedEntry(entry, "meaning", {
    id: `meaning:${entry.id}`,
    ownerAuthored: false,
    sourceKind: "owner-approved-knowledge-matrix"
  }));
  const register = [
    ...(context?.sameFamilyExamples ?? []),
    ...(context?.registerGoldExamples ?? [])
  ].map((entry) => namedEntry(entry, "register", {
    id: `register:${entry.id ?? entry.contentKey}`,
    ownerAuthored: true,
    sourceKind: entry.evidenceRole === "register_gold" ? "owner-approved-register-gold" : "owner-corpus-passage"
  }));
  const scene = (context?.sceneExamples ?? []).map((entry) => namedEntry(entry, "scene", {
    id: `scene:${entry.id}`,
    ownerAuthored: false
  }));
  const argumentText = argumentSource
    ? ["opening", "tension", "development", "close"].map((field) => argumentSource[field]).filter(Boolean).join("\n\n")
    : "";
  const argumentEligible = argumentText
    && argumentSource?.ownerApproved === true
    && /owner-approved/iu.test(String(argumentSource?.authority ?? ""));
  const argument = argumentEligible ? [namedEntry(argumentSource, "argument", {
    id: `argument:${argumentSource.contentKey}`,
    planet: plan?.object,
    sign: plan?.sign,
    sourcePath: argumentSource.sourcePath ?? "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json",
    governanceTier: argumentSource.authority ?? "exact-current-owner-approved",
    ownerApproved: argumentSource.ownerApproved,
    ownerAuthored: false,
    sourceKind: "current-approved-argument-and-close",
    text: argumentText
  })] : [];
  const argumentCandidates = (context?.knowledgeMatrixArgumentCandidates ?? []).map((entry) => namedEntry(entry, "argument", {
    id: `argument-candidate:${entry.id}`,
    ownerAuthored: false,
    sourceKind: "owner-approved-knowledge-matrix-argument-candidate",
    evidenceRole: "knowledge_matrix_argument_candidate"
  }));
  const phrase = (context?.phraseExamples ?? []).map((entry) => namedEntry(entry, "phrase", {
    id: entry.id,
    ownerAuthored: true,
    sourceKind: entry.store === "voice-bank" ? "owner-approved-voice-bank-phrase" : "owner-confirmed-phrasebank-line",
    governanceTier: entry.governanceTier,
    text: entry.text
  }));
  const roles = Object.freeze({ meaning, register, scene, argument, phrase });
  return Object.freeze({
    version: SHARED_EVIDENCE_STANDARD_VERSION,
    target: Object.freeze({ planet: token(plan?.object), sign: token(plan?.sign) }),
    roles,
    supportingArgumentCandidates: Object.freeze(argumentCandidates),
    counts: Object.freeze(Object.fromEntries(SHARED_EVIDENCE_ROLES.map((role) => [role, roles[role].length]))),
    entries: Object.freeze(SHARED_EVIDENCE_ROLES.flatMap((role) => roles[role]))
  });
}

export function evidenceEntriesPresentedAsOwnerAuthoredGenerated(entries) {
  return (entries ?? []).filter((entry) => (
    entry.ownerAuthored === true
    && (
      entry.generated === true
      || /generated|assistant|candidate/iu.test(String(entry.governanceTier ?? ""))
      || /generated|assistant|candidate/iu.test(String(entry.sourceKind ?? ""))
    )
  ));
}

export function evidenceUseReview(packet, { usedEvidenceIds = [], inventedScenes = [] } = {}) {
  const used = new Set(usedEvidenceIds);
  const ownerEntries = packet?.entries?.filter((entry) => entry.ownerApproved === true) ?? [];
  const unknownIds = [...used].filter((id) => !packet.entries.some((entry) => entry.id === id));
  const sceneSources = packet?.roles?.scene ?? [];
  return Object.freeze({
    packetHasAllFourRoles: REQUIRED_CORE_EVIDENCE_ROLES.every((role) => (packet?.roles?.[role]?.length ?? 0) > 0),
    packetHasAllRequiredCoreRoles: REQUIRED_CORE_EVIDENCE_ROLES.every((role) => (packet?.roles?.[role]?.length ?? 0) > 0),
    phraseRolePresent: (packet?.roles?.phrase?.length ?? 0) > 0,
    unknownUsedEvidenceIds: Object.freeze(unknownIds),
    sceneTraceRequired: sceneSources.length > 0,
    inventedScenePermitted: sceneSources.length === 0,
    inventedSceneConstraintPassed: sceneSources.length > 0
      ? inventedScenes.length === 0
      : inventedScenes.every((scene) => scene.ordinary === true && scene.plural === true && scene.carriesArgumentAlone === false),
    availableOwnerApprovedSentencesUnused: Object.freeze(ownerEntries.filter((entry) => !used.has(entry.id)).map((entry) => ({
      id: entry.id,
      role: entry.role,
      sourcePath: entry.sourcePath,
      contentKey: entry.contentKey,
      text: entry.text
    })))
  });
}
