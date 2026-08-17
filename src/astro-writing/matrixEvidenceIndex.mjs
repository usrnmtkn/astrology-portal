export const MATRIX_EVIDENCE_INDEX_VERSION = "matrix-evidence-role-index-v1-2026-08-13";
export const MATRIX_EVIDENCE_ROLES = Object.freeze(["meaning", "register", "scene", "argument_candidate"]);
export const MATRIX_EVIDENCE_SOURCE_PATH = "data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl";
export const MATRIX_COVERAGE_SOURCE_PATH = "data/writing/matrix-evidence-index/TLDR-Matrix-Coverage-By-Placement.json";
export const LL_MATRIX_V13_SOURCE_PATH = "packages/astro-knowledge/voice/tldr-astro/satori-writer/ll-matrix-v13/ll-matrix-v13.json";

export function normalizeMatrixToken(value) {
  const normalized = String(value ?? "").trim().toLowerCase()
    .replace(/[_\s-]+/gu, "-")
    .replace(/^black-moon-lilith$/u, "lilith")
    .replace(/^lunar-nodes$/u, "nodes");
  return normalized === "any" || normalized === "none" || normalized === "unspecified" ? null : normalized;
}

function placementFromRuntimeKey(contentKey) {
  const match = String(contentKey ?? "").match(/^fallback-hook\/placement-sign-lived\/([^/]+)\/([^/]+)$/u);
  if (match) return { planet: normalizeMatrixToken(match[1]), sign: normalizeMatrixToken(match[2]) };
  const sign = String(contentKey ?? "").match(/^fallback-hook\/sign-lived\/([^/]+)$/u);
  if (sign) return { planet: null, sign: normalizeMatrixToken(sign[1]) };
  const planet = String(contentKey ?? "").match(/^fallback-hook\/planet-lived\/([^/]+)$/u);
  if (planet) return { planet: normalizeMatrixToken(planet[1]), sign: null };
  const aspect = String(contentKey ?? "").match(/^fallback-hook\/natal-aspect-lived\/([^/]+)\/([^/]+)\/([^/]+)$/u);
  if (aspect) return { planet: normalizeMatrixToken(aspect[1]), sign: null, eventType: normalizeMatrixToken(aspect[2]) };
  return { planet: null, sign: null, eventType: null };
}

export function llMatrixV13EvidenceCatalog(rows = [], manifestRows = []) {
  const sourceRows = new Map(rows
    .filter((row) => row.ownerApproved === true)
    .map((row) => [`${row.sheet}|${row.key}`, row]));
  return Object.freeze(manifestRows.map((manifestRow, index) => {
    const row = sourceRows.get(`${manifestRow.sourceSheet}|${manifestRow.workbookKey}`);
    if (!row) throw new Error(`SOURCE_GAP: LL Matrix V13 row ${manifestRow.sourceSheet}|${manifestRow.workbookKey}`);
    const target = placementFromRuntimeKey(manifestRow.contentKey);
    return Object.freeze({
      id: `ll-matrix-v13:meaning:${manifestRow.payloadSha256}`,
      contentKey: manifestRow.contentKey,
      family: "knowledge-matrix-meaning",
      sourceFamily: manifestRow.sourceSheet,
      sourcePath: LL_MATRIX_V13_SOURCE_PATH,
      sourceRecordSha256: manifestRow.payloadSha256,
      copySha: manifestRow.payloadSha256,
      planet: normalizeMatrixToken(row.planet) ?? target.planet,
      sign: normalizeMatrixToken(row.position) ?? target.sign,
      eventType: target.eventType ?? null,
      register: /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(row.copy) ? "second_person" : "collective",
      text: row.copy,
      sceneNouns: Object.freeze([]),
      thesisCandidates: Object.freeze([]),
      duplicateGroupSize: 1,
      governance: manifestRow.governance,
      governanceTier: manifestRow.governance,
      judgeLineage: "owner-approved-ll-matrix-v13",
      precedence: 0,
      workbookSourceRow: manifestRow.workbookRow ?? index + 1,
      authorityClass: "exact_owner_approved",
      editorialStatus: "owner-approved-v13",
      ownerApproved: true,
      ownerAuthored: true,
      generated: false,
      useAsPositiveVoiceEvidence: true,
      useAsSceneEvidence: false,
      evidenceRole: "knowledge_matrix_meaning",
      role: "meaning",
      sourceKind: "owner-approved-ll-matrix-v13",
      eligibleForWriterRegister: false
    });
  }));
}

function governancePrecedence(row) {
  const judge = String(row?.judge ?? "").toLowerCase();
  if (judge.includes("owner-approved-exact-copy")) return 0;
  if (judge.includes("owner-approved-v8-locked")) return 1;
  if (judge.includes("owner-approved-v13")) return 2;
  if (judge.includes("rewritten-owner-voice-audited")) return 3;
  if (judge.includes("rewritten-source-safe")) return 4;
  if (judge.includes("composed (unjudged)")) return 5;
  return 6;
}

function asRoleEvidence(row, role, rowNumber) {
  const planet = normalizeMatrixToken(row.planet);
  const sign = normalizeMatrixToken(row.sign);
  const eventType = normalizeMatrixToken(row.event);
  const normalizedRole = role === "argument_candidate" ? "argument" : role;
  return Object.freeze({
    id: `matrix:${role}:${row.copy_sha}`,
    contentKey: `matrix/${String(row.sheet).toLowerCase()}/${row.key}/${row.copy_sha}`,
    family: `knowledge-matrix-${normalizedRole}`,
    sourceFamily: row.sheet,
    sourcePath: MATRIX_EVIDENCE_SOURCE_PATH,
    sourceRecordSha256: row.copy_sha,
    copySha: row.copy_sha,
    planet,
    sign,
    eventType,
    register: row.register ?? null,
    text: row.copy,
    sceneNouns: Object.freeze([...(row.scene_nouns ?? [])]),
    thesisCandidates: Object.freeze([...(row.thesis_candidates ?? [])]),
    duplicateGroupSize: row.duplicate_group_size ?? 1,
    governance: row.governance,
    governanceTier: governancePrecedence(row) === 0 ? "owner-approved-exact-copy" : row.judge,
    judgeLineage: row.judge,
    archive: row.archive,
    precedence: governancePrecedence(row),
    workbookSourceRow: rowNumber,
    authorityClass: "exact_owner_approved",
    editorialStatus: "owner-approved-derived-index",
    ownerApproved: row.governance === "owner-approved",
    ownerAuthored: false,
    generated: false,
    useAsPositiveVoiceEvidence: normalizedRole === "meaning",
    useAsSceneEvidence: normalizedRole === "scene",
    evidenceRole: role === "argument_candidate" ? "knowledge_matrix_argument_candidate" : `knowledge_matrix_${role}`,
    role: normalizedRole,
    sourceKind: `owner-approved-knowledge-matrix-${role}`,
    eligibleForWriterRegister: false
  });
}

export function matrixEvidenceCatalog(rows = []) {
  const byRole = Object.fromEntries(MATRIX_EVIDENCE_ROLES.map((role) => [role, []]));
  rows.forEach((row, index) => {
    for (const role of row.roles ?? []) {
      if (byRole[role]) byRole[role].push(asRoleEvidence(row, role, index + 1));
    }
  });
  for (const role of MATRIX_EVIDENCE_ROLES) {
    const selected = new Map();
    for (const entry of byRole[role]) {
      const dedupeKey = `${entry.planet ?? "*"}|${entry.sign ?? "*"}|${entry.eventType ?? "*"}|${entry.copySha}`;
      const current = selected.get(dedupeKey);
      if (!current || entry.precedence < current.precedence || (entry.precedence === current.precedence && entry.workbookSourceRow < current.workbookSourceRow)) {
        selected.set(dedupeKey, entry);
      }
    }
    byRole[role] = Object.freeze([...selected.values()].sort((a, b) => a.precedence - b.precedence || a.workbookSourceRow - b.workbookSourceRow));
  }
  return Object.freeze(byRole);
}

export function matrixEvidenceForTarget(rows, { planet, sign, eventType = null } = {}) {
  const targetPlanet = normalizeMatrixToken(planet);
  const targetSign = normalizeMatrixToken(sign);
  const targetEvent = normalizeMatrixToken(eventType);
  if (!targetPlanet || !targetSign) return Object.freeze(Object.fromEntries(MATRIX_EVIDENCE_ROLES.map((role) => [role, Object.freeze([])])));
  const catalog = matrixEvidenceCatalog(rows);
  return Object.freeze(Object.fromEntries(MATRIX_EVIDENCE_ROLES.map((role) => [role, Object.freeze(catalog[role].filter((entry) => (
    entry.ownerApproved === true
    && (!entry.planet || entry.planet === targetPlanet || (entry.planet === "nodes" && ["north-node", "south-node"].includes(targetPlanet)))
    && (!entry.sign || entry.sign === targetSign)
    && (role === "argument_candidate" || !targetEvent || !entry.eventType || entry.eventType === targetEvent)
  ))) ])));
}

export function matrixSceneNounLexicon(rows = []) {
  return Object.freeze([...new Set(rows.flatMap((row) => row.scene_nouns ?? []).map((noun) => String(noun).trim().toLowerCase()).filter(Boolean))].sort());
}
