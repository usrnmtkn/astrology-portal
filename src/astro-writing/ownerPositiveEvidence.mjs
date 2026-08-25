const ELIGIBLE_STRUCTURAL_FUNCTIONS = new Set([
  "article paragraph",
  "published article opening excerpt",
  "published article body excerpt"
]);

const RELEVANT_PUBLISHED_OWNER_SURFACES = new Set([
  "sky-article-longform",
  "sky-article-reference",
  "sky-season",
  "sky-lunation",
  "sky-nodes-longform",
  "weekly-astrology",
  "relationship-astrology"
]);

function inferredRegister(text) {
  return /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(text)
    ? "second_person"
    : "collective";
}

function normalizedToken(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[_\s-]+/gu, "-");
}

function matrixEventType(entry) {
  const match = String(entry?.structuralFunction ?? "").match(/\(([^)]+)\)\s*$/u);
  return match ? normalizedToken(match[1]) : null;
}

function matrixPrecedence(entry) {
  const lineage = String(entry?.judgeLineage ?? "").toLowerCase();
  if (lineage.includes("owner-approved-exact-copy")) return 0;
  if (entry?.origin === "owner-approved-ll-matrix-v13") return 1;
  if (lineage.includes("rewritten-owner-voice-audited")) return 2;
  if (lineage.includes("rewritten-source-safe")) return 3;
  return 4;
}

export function ownerApprovedMatrixEvidenceForTarget(index, { planet, sign, house = null, eventType = null, surface = null } = {}) {
  const rows = Array.isArray(index) ? index : index?.entries ?? [];
  if (rows.some((entry) => Array.isArray(entry?.roles) && typeof entry?.copy_sha === "string")) {
    return matrixEvidenceForTarget(rows, { planet, sign, eventType }).meaning;
  }
  const targetPlanet = normalizedToken(planet);
  const targetSign = normalizedToken(sign);
  const targetEventType = eventType ? normalizedToken(eventType) : null;
  if (!targetPlanet || !targetSign) return [];
  const entries = Array.isArray(index) ? index : index?.entries ?? [];
  return entries
    .filter((entry) => {
      if (!String(entry.origin ?? "").includes("matrix")) return false;
      if (entry.authorityClass !== "exact_owner_approved") return false;
      if (entry.ownerApproved !== true || entry.useAsPositiveVoiceEvidence !== true) return false;
      if (normalizedToken(entry.planet) !== targetPlanet || normalizedToken(entry.sign) !== targetSign) return false;
      if (typeof entry.text !== "string" || !entry.text.trim()) return false;
      if (entry.articleBeat === "knowledge-matrix-house") {
        if (house == null) return false;
        if (String(entry.house ?? "") !== String(house)) return false;
      }
      if (surface === "sky-placement-page" && entry.articleBeat === "knowledge-matrix-house") return false;
      const rowEventType = matrixEventType(entry);
      return !targetEventType || !rowEventType || rowEventType === targetEventType;
    })
    .map((entry, indexPosition) => ({ entry, indexPosition, precedence: matrixPrecedence(entry) }))
    .sort((a, b) => a.precedence - b.precedence || a.indexPosition - b.indexPosition)
    .map(({ entry, precedence }) => Object.freeze({
      id: entry.sourceId,
      contentKey: entry.sourceId,
      family: "knowledge-matrix-positive-evidence",
      sourceFamily: entry.surface,
      register: inferredRegister(entry.text),
      text: entry.text,
      sourcePath: entry.sourcePath,
      sourceRecordSha256: entry.sourceSha256,
      planet: entry.planet,
      sign: entry.sign,
      eventType: matrixEventType(entry),
      articleBeat: entry.articleBeat,
      structuralFunction: entry.structuralFunction,
      authorityClass: entry.authorityClass,
      governance: entry.governance ?? null,
      judgeLineage: entry.judgeLineage ?? null,
      editorialStatus: entry.editorialStatus,
      workbookSourceRow: entry.workbookSourceRow ?? null,
      precedence,
      evidenceRole: "knowledge_matrix_positive",
      ownerApproved: true,
      useAsPositiveVoiceEvidence: true
    }));
}

export function ownerApprovedMatrixRoleEvidenceForTarget(rows, target = {}) {
  return matrixEvidenceForTarget(rows, target);
}

export function ownerPositiveEvidenceFromVoiceIndex(index) {
  const entries = Array.isArray(index) ? index : index?.entries ?? [];
  return entries
    .filter((entry) => (
      entry.authorityClass === "owner_authored_final"
      && entry.ownerAuthored === true
      && entry.ownerApproved === true
      && entry.useAsPositiveVoiceEvidence === true
      && entry.surface === "sky-article-longform"
      && ELIGIBLE_STRUCTURAL_FUNCTIONS.has(entry.structuralFunction)
      && typeof entry.text === "string"
      && entry.text.trim().length >= 80
      && !/^\s*(?:jump to horoscopes|horoscopes for)\b/iu.test(entry.text)
    ))
    .map((entry) => Object.freeze({
      id: entry.sourceId,
      contentKey: entry.sourceId,
      family: entry.surface,
      register: inferredRegister(entry.text),
      text: entry.text,
      sourcePath: entry.sourcePath,
      sourceRecordSha256: entry.sourceSha256,
      planet: entry.planet || null,
      sign: entry.sign || null,
      articleBeat: entry.articleBeat || null,
      structuralFunction: entry.structuralFunction,
      authorityClass: entry.authorityClass,
      ownerAuthored: true,
      ownerApproved: true,
      useAsPositiveVoiceEvidence: true
    }));
}

export function ownerRelevantEvidenceFromVoiceIndex(index, { planet, sign } = {}) {
  const targetPlanet = normalizedToken(planet);
  const targetSign = normalizedToken(sign);
  const entries = Array.isArray(index) ? index : index?.entries ?? [];
  const eligible = entries
    .filter((entry) => (
      entry.authorityClass === "owner_authored_final"
      && entry.ownerAuthored === true
      && entry.ownerApproved === true
      && entry.useAsPositiveVoiceEvidence === true
      && entry.origin === "owner-published-site"
      && RELEVANT_PUBLISHED_OWNER_SURFACES.has(entry.surface)
      && ELIGIBLE_STRUCTURAL_FUNCTIONS.has(entry.structuralFunction)
      && typeof entry.text === "string"
      && entry.text.trim().length >= 80
      && !/^\s*(?:jump to horoscopes|horoscopes for)\b/iu.test(entry.text)
    ))
    .map((entry) => Object.freeze({
      id: entry.sourceId,
      contentKey: entry.sourceId,
      family: entry.surface,
      register: inferredRegister(entry.text),
      text: entry.text,
      sourcePath: entry.sourcePath,
      sourceRecordSha256: entry.sourceSha256,
      planet: entry.planet || null,
      sign: entry.sign || null,
      articleBeat: entry.articleBeat || null,
      structuralFunction: entry.structuralFunction,
      authorityClass: entry.authorityClass,
      ownerAuthored: true,
      ownerApproved: true,
      useAsPositiveVoiceEvidence: true
    }));
  const exactPlanetSign = eligible.filter((entry) => (
    normalizedToken(entry.planet) === targetPlanet
    && normalizedToken(entry.sign) === targetSign
  ));
  const sameSign = eligible.filter((entry) => normalizedToken(entry.sign) === targetSign);
  const samePlanet = eligible.filter((entry) => normalizedToken(entry.planet) === targetPlanet);
  const selectedTier = exactPlanetSign.length
    ? "exact-planet-sign-then-same-sign-then-same-planet"
    : sameSign.length
      ? "same-sign-then-same-planet"
      : samePlanet.length
        ? "same-planet"
        : "none";
  const selected = [...new Map([
    ...exactPlanetSign,
    ...sameSign,
    ...samePlanet
  ].map((entry) => [entry.id, entry])).values()];
  return Object.freeze({
    tier: selectedTier,
    selected: Object.freeze(selected),
    counts: Object.freeze({
      exactPlanetSign: exactPlanetSign.length,
      sameSign: sameSign.length,
      samePlanet: samePlanet.length,
      selected: selected.length
    })
  });
}

export function ownerPositiveEvidenceFromSurfaceQualifiedPool(pool) {
  if (pool?.poolStatus !== "active" || pool?.use !== "writer-generation-evidence-only") return [];
  return (pool.records ?? [])
    .filter((entry) => (
      entry.authorityClass === "owner_authored_final"
      && entry.ownerAuthored === true
      && entry.ownerApprovedSource === true
      && entry.generationEvidenceAuthorized === true
      && entry.ownerVoiceVerified === true
      && typeof entry.text === "string"
      && entry.text.trim()
    ))
    .map((entry) => Object.freeze({
      id: entry.sourceId,
      contentKey: entry.sourceRecordId,
      family: pool.surface,
      sourceFamily: entry.sourceSurface,
      register: inferredRegister(entry.text),
      text: entry.text,
      sourcePath: entry.sourcePath,
      sourceRecordSha256: entry.sourceRecordSha256,
      articleBeat: entry.articleBeat,
      structuralFunction: entry.assignedFunction,
      authorityClass: entry.authorityClass,
      ownerAuthored: true,
      ownerApproved: true,
      useAsPositiveVoiceEvidence: true
    }));
}

export function exactDelimitedPassage(entry, sourceText) {
  const startMarker = String(entry?.startMarker ?? "");
  const endMarker = String(entry?.endMarker ?? "");
  if (!startMarker || !endMarker) throw new Error(`OWNER_TASK_PASSAGE_MARKERS_MISSING:${entry?.id ?? "unknown"}`);
  const start = String(sourceText ?? "").indexOf(startMarker);
  const end = String(sourceText ?? "").indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`OWNER_TASK_PASSAGE_NOT_FOUND:${entry?.id ?? "unknown"}`);
  return String(sourceText).slice(start + startMarker.length, end).replace(/^\r?\n|\r?\n$/gu, "");
}

export function ownerPositiveEvidenceFromApprovedTaskPassages(entries) {
  return (entries ?? [])
    .filter((entry) => (
      entry?.authorityClass === "owner_authored_final"
      && entry.ownerAuthorshipAsserted === true
      && entry.ownerExactApprovalAsserted === true
      && entry.positiveRegisterEvidence === true
      && entry.phraseEvidence === false
      && entry.readerEligible === false
      && typeof entry.text === "string"
      && entry.text.trim()
    ))
    .map((entry) => Object.freeze({
      id: entry.id,
      contentKey: entry.contentKey,
      family: entry.family,
      sourceFamily: "owner-approved-task-passage",
      register: entry.register ?? inferredRegister(entry.text),
      text: entry.text,
      sourcePath: entry.sourcePath,
      sourceRecordSha256: entry.exactTextSha256,
      planet: entry.planet ?? null,
      sign: entry.sign ?? null,
      house: entry.house ?? null,
      structuralFunction: "owner-approved full natal placement passage",
      authorityClass: entry.authorityClass,
      ownerAuthored: true,
      ownerApproved: true,
      useAsPositiveVoiceEvidence: true,
      useAsPhraseEvidence: false,
      readerEligible: false,
      evidenceRole: "owner_approved_task_passage"
    }));
}

export function ownerLockedLilithV5Evidence(rows) {
  return (rows ?? [])
    .filter((entry) => (
      entry?.review_status === "approved"
      && /^fallback-hook\/sky-placement-(?:tagline|hook|lived|turn)\/lilith\/[a-z-]+$/u.test(String(entry?.contentKey ?? ""))
      && /OWNER-AUTHORED V5/iu.test(String(entry?.notes ?? ""))
      && /owner exact-wording approval/iu.test(String(entry?.approved_via ?? ""))
      && typeof entry?.body_you === "string"
      && entry.body_you.trim()
    ))
    .map((entry) => {
      const parts = entry.contentKey.split("/");
      return Object.freeze({
        id: `owner-locked-lilith-v5:${entry.contentKey}`,
        contentKey: entry.contentKey,
        family: "sky-placement-current-sky-writer",
        sourceFamily: "owner-locked-lilith-v5-placement",
        register: /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(entry.body_you) ? "second_person" : "collective",
        text: entry.body_you,
        sourcePath: "packages/astro-knowledge/review/lilith-placements-v5/lilith-placements-v5-staged-rows.json",
        planet: "lilith",
        sign: parts.at(-1),
        articleBeat: parts.at(-3).replace("sky-placement-", ""),
        structuralFunction: "owner-locked placement passage",
        authorityClass: "owner_authored_final",
        ownerAuthored: true,
        ownerApproved: true,
        useAsPositiveVoiceEvidence: true,
        evidenceRole: "owner_locked_same_placement_family"
      });
    });
}

export function ownerPositiveEvidenceFromVoiceIndexBySourceIds(index, sourceIds, family) {
  const requested = new Set(sourceIds ?? []);
  if (!requested.size) return [];
  const entries = Array.isArray(index) ? index : index?.entries ?? [];
  const selected = entries.filter((entry) => requested.has(entry.sourceId));
  const found = new Set(selected.map((entry) => entry.sourceId));
  const missing = [...requested].filter((sourceId) => !found.has(sourceId));
  if (missing.length) throw new Error(`OWNER_EVIDENCE_SOURCE_ID_NOT_FOUND:${missing.join(",")}`);
  return selected.map((entry) => {
    if (
      entry.authorityClass !== "owner_authored_final"
      || entry.ownerAuthored !== true
      || entry.ownerApproved !== true
      || entry.useAsPositiveVoiceEvidence !== true
      || typeof entry.text !== "string"
      || !entry.text.trim()
    ) {
      throw new Error(`OWNER_EVIDENCE_SOURCE_NOT_ELIGIBLE:${entry.sourceId}`);
    }
    return Object.freeze({
      id: entry.sourceId,
      contentKey: entry.sourceId,
      family,
      sourceFamily: entry.surface,
      register: inferredRegister(entry.text),
      text: entry.text,
      sourcePath: entry.sourcePath,
      sourceRecordSha256: entry.sourceSha256,
      planet: entry.planet || null,
      sign: entry.sign || null,
      articleBeat: entry.articleBeat || null,
      structuralFunction: entry.structuralFunction,
      authorityClass: entry.authorityClass,
      ownerAuthored: true,
      ownerApproved: true,
      useAsPositiveVoiceEvidence: true
    });
  });
}
import { matrixEvidenceForTarget } from "./matrixEvidenceIndex.mjs";
