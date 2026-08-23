import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

type PatternWriteupKind = "natal" | "activation";
type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type PatternType = "t_square" | "grand_square" | "grand_trine" | "kite" | "yod" | "mystic_rectangle";
type AuthoredStatus = "draft" | "reviewed" | "approved" | "deprecated";

type GeneratedContentRow = {
  id: string;
  content_key: string;
  surface: string;
  mode: string;
  status: GeneratedContentStatus;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string | null;
  sections: unknown;
  source_snapshot?: Record<string, unknown> | null;
  reviewer_notes?: string | null;
  prompt_version?: string | null;
  provider?: string | null;
  model?: string | null;
  reviewed_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type AuthoredNatalRecord = {
  id: string;
  version: string;
  patternType: PatternType;
  status: AuthoredStatus;
  eligibility: { confidence: string[]; houseMode: string; variants?: string[] };
  content: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{ id: string; template: string; required: boolean; conditions?: unknown[] }>;
  };
  languageRules: { certainty: string; prohibitedClaims: string[]; prohibitedTerms?: string[] };
  provenance: { sourceIds: string[]; editorialStatus: string; reviewedBy?: string; reviewedAt?: string };
};

type AuthoredActivationRecord = {
  id: string;
  version: string;
  patternType: PatternType;
  status: AuthoredStatus;
  priority?: number;
  authoredPriority?: number;
  eligibility: {
    targetRoles: string[];
    timingStates?: string[];
    patternConfidence?: string[];
    triggerModes?: string[];
  };
  content: AuthoredNatalRecord["content"];
  languageRules: { certainty?: string; prohibitedClaims: string[]; prohibitedTerms?: string[] };
  provenance: AuthoredNatalRecord["provenance"];
};

type WriteupSaveBody = {
  kind?: PatternWriteupKind;
  action?: "preview" | "save";
  generatedContentId?: string | null;
  record?: AuthoredNatalRecord | AuthoredActivationRecord;
  reviewer?: string;
  reviewerNotes?: string;
};

const require = createRequire(import.meta.url);
const engine = require("../../packages/astro-knowledge/engine/aspect-patterns/index.js") as {
  APPROVED_COPY_SLOTS: string[];
  APPROVED_ACTIVATION_COPY_SLOTS: string[];
  AUTHORED_ASPECT_PATTERN_RECORDS: AuthoredNatalRecord[];
  AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS: AuthoredActivationRecord[];
  GOVERNED_COPY_RECORDS: Array<{ id: string; patternType: PatternType; contentLevel: string; status: string }>;
  GOVERNED_ACTIVATION_COPY_RECORDS: Array<{ id: string; patternType: PatternType; contentLevel: string; status: string }>;
  buildAspectPatternActivationInterpretationContexts(detectionResult: unknown, options: Record<string, unknown>): unknown[];
  buildAspectPatternInterpretationContexts(detectionResult: unknown, context: Record<string, unknown>): unknown[];
  buildPatternActivations(detectionResult: unknown, transitAspects: unknown[], options: Record<string, unknown>): Record<string, unknown>;
  detectPatterns(input: unknown): Record<string, unknown>;
  rankAspectPatterns(detectionResult: unknown, context: Record<string, unknown>): Record<string, unknown>;
  resolveAspectPatternCopy(context: Record<string, unknown>, options?: { authoredRecords?: AuthoredNatalRecord[]; useLegacyResolver?: boolean }): ResolvedCopy;
  resolveAspectPatternActivationCopy(context: Record<string, unknown>, options?: { authoredRecords?: AuthoredActivationRecord[] }): ResolvedCopy;
  validateAuthoredAspectPatternRecord(record: AuthoredNatalRecord, context: Record<string, unknown>): ValidationResult;
  validateAuthoredAspectPatternActivationRecord(record: AuthoredActivationRecord, context: Record<string, unknown>): ValidationResult;
};
const { fixtures } = require("../../packages/astro-knowledge/engine/aspect-patterns/fixtures.js") as {
  fixtures: Record<string, { planets: Array<Record<string, unknown>>; aspects: Array<Record<string, unknown>> }>;
};

type ResolvedCopy = {
  source: { recordId: string; contentLevel: string; status: string; resolverVersion?: string };
  content: { eyebrow?: string; headline: string; overview: string; sections: Array<{ id: string; body: string }> };
  diagnostics: { templateId: string; missingSlots: string[]; skippedSections: string[]; validationWarnings?: string[]; attemptedRecordIds?: string[] };
};

type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingSlots: string[];
  unknownSlots: string[];
};

const patternLabels: Record<PatternType, string> = {
  t_square: "T-square",
  grand_square: "Grand Square",
  grand_trine: "Grand Trine",
  kite: "Kite",
  yod: "Yod",
  mystic_rectangle: "Mystic Rectangle"
};

const natalFieldOrder = ["eyebrow", "headline", "overview", "how_it_works", "planet_roles", "pressure_or_support", "derived_point", "watch_for", "confidence_note"];
const activationFieldOrder = ["eyebrow", "headline", "overview", "current_emphasis", "transit_trigger", "pattern_role", "linked_patterns", "timing", "watch_for", "confidence_note"];
const calculatedFor = "2026-07-19T12:00:00.000Z";

const activationRoutes = [
  { key: "t_square.apex", patternType: "t_square", targetRole: "apex", roleLabel: "Apex" },
  { key: "t_square.opposition_member", patternType: "t_square", targetRole: "opposition_axis", roleLabel: "Opposition member" },
  { key: "grand_square.member", patternType: "grand_square", targetRole: "opposition_axis", roleLabel: "Member" },
  { key: "grand_trine.member", patternType: "grand_trine", targetRole: "pattern_member", roleLabel: "Member" },
  { key: "kite.focal_planet", patternType: "kite", targetRole: "focal_planet", roleLabel: "Focal planet" },
  { key: "kite.resource_planet", patternType: "kite", targetRole: "resource_planet", roleLabel: "Resource planet" },
  { key: "yod.apex", patternType: "yod", targetRole: "apex", roleLabel: "Apex" },
  { key: "mystic_rectangle.member", patternType: "mystic_rectangle", targetRole: "opposition_axis", roleLabel: "Member" }
] as const;

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function hasPersistenceEnv() {
  return Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function adminHeaders() {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json"
  };
}

async function readJsonBody(req: IncomingMessage) {
  const preParsedBody = (req as IncomingMessage & { body?: unknown }).body;
  if (typeof preParsedBody === "string") return JSON.parse(preParsedBody) as WriteupSaveBody;
  if (preParsedBody && typeof preParsedBody === "object") return preParsedBody as WriteupSaveBody;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) throw new Error("Request JSON body is required.");
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as WriteupSaveBody;
}

function contentKeyFor(kind: PatternWriteupKind, record: AuthoredNatalRecord | AuthoredActivationRecord) {
  if (kind === "activation") {
    const role = (record as AuthoredActivationRecord).eligibility.targetRoles[0] ?? "member";
    return `aspect-pattern/activation/${record.patternType}/${role}`;
  }
  return `aspect-pattern/natal/${record.patternType}`;
}

function contentKeyPrefix(kind: PatternWriteupKind) {
  return kind === "activation" ? "aspect-pattern/activation/" : "aspect-pattern/natal/";
}

function authoredStatusFromGenerated(status: GeneratedContentStatus | string): AuthoredStatus {
  if (status === "LIVE") return "approved";
  if (status === "REVIEWED") return "reviewed";
  if (status === "ARCHIVED") return "deprecated";
  return "draft";
}

function generatedStatusFromAuthored(status: AuthoredStatus): GeneratedContentStatus {
  if (status === "approved") return "LIVE";
  if (status === "reviewed") return "REVIEWED";
  if (status === "deprecated") return "ARCHIVED";
  return "DRAFT";
}

function rowRecord(row: GeneratedContentRow, kind: PatternWriteupKind): AuthoredNatalRecord | AuthoredActivationRecord | null {
  const record = row.source_snapshot?.record;
  if (!record || typeof record !== "object") return null;
  const candidate = record as Partial<AuthoredNatalRecord & AuthoredActivationRecord>;
  if (!candidate.id || !candidate.patternType || !candidate.content || !Array.isArray(candidate.content.sections)) return null;
  if (!candidate.languageRules || !Array.isArray(candidate.languageRules.prohibitedClaims)) return null;
  if (!candidate.provenance || !Array.isArray(candidate.provenance.sourceIds)) return null;
  if (kind === "activation" && !Array.isArray(candidate.eligibility?.targetRoles)) return null;
  if (kind === "natal" && (!Array.isArray(candidate.eligibility?.confidence) || typeof candidate.eligibility?.houseMode !== "string")) return null;
  return candidate as AuthoredNatalRecord | AuthoredActivationRecord;
}

async function fetchPersistedRows(kind: PatternWriteupKind) {
  if (!hasPersistenceEnv()) return [];
  const params = new URLSearchParams({
    select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,source_snapshot,reviewer_notes,prompt_version,provider,model,reviewed_at,published_at,updated_at,created_at",
    content_key: `like.${contentKeyPrefix(kind)}%`,
    status: "in.(DRAFT,REVIEWED,LIVE,ARCHIVED,ERROR)",
    order: "updated_at.desc",
    limit: "200"
  });
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase aspect-pattern write-up list failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return Array.isArray(payload) ? payload as GeneratedContentRow[] : [];
}

async function savePersistedRecord(kind: PatternWriteupKind, body: WriteupSaveBody) {
  if (!body.record) throw new Error("record is required.");
  const record = normalizeRecordForSave(kind, body.record);
  const status = generatedStatusFromAuthored(record.status);
  const contentKey = contentKeyFor(kind, record);
  const sections = record.content.sections.map((section) => ({
    heading: section.id,
    body: section.template,
    id: section.id,
    required: section.required,
    conditions: section.conditions ?? []
  }));
  const row = {
    content_key: contentKey,
    surface: "natal",
    mode: "article",
    status,
    event_type: kind === "activation" ? "aspect_pattern_activation_writeup" : "aspect_pattern_natal_writeup",
    target_date: null,
    headline: record.content.headline,
    summary: record.content.overview,
    body: JSON.stringify(record.content, null, 2),
    sections,
    block_type: "synthesis",
    lane: "serving",
    review_state: status === "LIVE" || status === "REVIEWED" ? null : "editorial",
    facts: {
      patternType: record.patternType,
      kind,
      recordId: record.id
    },
    knowledge_ids: record.provenance.sourceIds ?? [],
    source_snapshot: {
      sourceType: "aspect-pattern-authored-record",
      kind,
      record
    },
    reviewer_notes: body.reviewerNotes ?? "",
    prompt_version: "aspect-pattern-writeups-admin",
    provider: "aspect-pattern-admin",
    model: "manual",
    evergreen: true,
    evergreen_at: new Date().toISOString(),
    evergreen_by: body.reviewer || "admin",
    updated_at: new Date().toISOString()
  };

  const validationRows = previewForRecord(kind, record);
  if (status === "LIVE" && validationRows.some((preview) => !preview.validation.ok)) {
    throw new Error(`Cannot approve ${record.id}: ${validationRows.flatMap((preview) => preview.validation.errors).join(", ")}`);
  }

  if (body.generatedContentId) {
    const existingParams = new URLSearchParams({
      select: "id,content_key",
      id: `eq.${body.generatedContentId}`,
      limit: "1"
    });
    const existingResponse = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${existingParams.toString()}`, {
      headers: adminHeaders()
    });
    const existingPayload = await existingResponse.json().catch(() => null);
    const existingRow = Array.isArray(existingPayload) ? existingPayload[0] : null;
    if (existingResponse.ok && typeof existingRow?.content_key === "string" && existingRow.content_key.startsWith(contentKeyPrefix(kind))) {
      row.content_key = existingRow.content_key;
    }
  }

  const url = body.generatedContentId
    ? `${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(body.generatedContentId)}`
    : `${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`;
  const response = await fetch(url, {
    method: body.generatedContentId ? "PATCH" : "POST",
    headers: {
      ...adminHeaders(),
      prefer: body.generatedContentId ? "return=representation" : "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(row)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase aspect-pattern write-up save failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return Array.isArray(payload) ? payload[0] as GeneratedContentRow : payload as GeneratedContentRow;
}

function normalizeRecordForSave(kind: PatternWriteupKind, input: AuthoredNatalRecord | AuthoredActivationRecord) {
  const base = kind === "activation"
    ? engine.AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS.find((record) => record.id === input.id)
    : engine.AUTHORED_ASPECT_PATTERN_RECORDS.find((record) => record.id === input.id);
  if (!base) throw new Error(`Unknown aspect-pattern ${kind} record: ${input.id}.`);
  const allowedSections = new Set(kind === "activation" ? activationFieldOrder : natalFieldOrder);
  const next = {
    ...base,
    ...input,
    id: base.id,
    patternType: base.patternType,
    eligibility: base.eligibility,
    content: {
      eyebrow: input.content?.eyebrow ?? "",
      headline: input.content?.headline ?? "",
      overview: input.content?.overview ?? "",
      sections: (input.content?.sections ?? [])
        .filter((section) => allowedSections.has(section.id))
        .map((section) => ({
          id: section.id,
          template: section.template ?? "",
          required: Boolean(section.required),
          conditions: section.conditions ?? []
        }))
    },
    languageRules: base.languageRules,
    provenance: {
      ...base.provenance,
      ...input.provenance
    }
  };
  return next as AuthoredNatalRecord & AuthoredActivationRecord;
}

function rankedContextsForInput(fixture: { planets: Array<Record<string, unknown>>; aspects: Array<Record<string, unknown>> }) {
  const detection = engine.detectPatterns(fixture);
  const rankingContext = { planets: fixture.planets, ascendantSign: "aries", ascendantLongitude: 0, midheavenLongitude: 270 };
  const ranked = { ...detection, ranking: engine.rankAspectPatterns(detection, rankingContext) };
  return engine.buildAspectPatternInterpretationContexts(ranked, rankingContext) as Array<Record<string, unknown>>;
}

function natalContextsForPattern(patternType: PatternType) {
  const fixtureName = patternType === "t_square" ? "t_square" : patternType;
  const contexts = rankedContextsForInput(fixtures[fixtureName]);
  const strong = contexts.find((context) => context.patternType === patternType);
  const noHouse = strong ? JSON.parse(JSON.stringify(strong)) as Record<string, unknown> : null;
  if (noHouse) {
    noHouse.derivedPoints = [];
  }
  return [
    ["strong fixture", strong],
    ["no-house fixture", noHouse]
  ].filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry[1]));
}

function activationContextsForPattern(patternType: PatternType, targetRole: string) {
  const fixture = fixtures[patternType === "t_square" ? "t_square" : patternType];
  const natalContexts = rankedContextsForInput(fixture);
  const ranked = {
    ...engine.detectPatterns(fixture),
    ranking: engine.rankAspectPatterns(engine.detectPatterns(fixture), { planets: fixture.planets, ascendantSign: "aries", ascendantLongitude: 0, midheavenLongitude: 270 }),
    interpretationContexts: natalContexts
  };
  const targetPlanet = targetPlanetForRoute(patternType, targetRole);
  const activation = engine.buildPatternActivations(ranked, [
    { id: `transit.test.${patternType}.${targetRole}`, movingBody: "saturn", targetNatalPlanet: targetPlanet, aspectType: "square", orb: 0.5, applying: true }
  ], { calculatedFor });
  return (engine.buildAspectPatternActivationInterpretationContexts({ ...ranked, activation }, { activation, natalContexts }) as Array<Record<string, unknown>>)
    .filter((context) => context.patternType === patternType)
    .filter((context) => {
      const roles = (((context.activationSummary as Record<string, unknown>)?.targetedRoles as string[] | undefined) ?? []).map((role) => role === "spine" ? "resource_planet" : role);
      if (targetRole === "pattern_member") return true;
      return roles.includes(targetRole);
    })
    .map((context) => ["applying fixture", context] as [string, Record<string, unknown>]);
}

function targetPlanetForRoute(patternType: PatternType, role: string) {
  if (patternType === "t_square" && role === "apex") return "mars";
  if (patternType === "t_square") return "sun";
  if (patternType === "kite" && role === "focal_planet") return "saturn";
  if (patternType === "kite") return "mars";
  if (patternType === "yod") return "saturn";
  return "moon";
}

function previewForRecord(kind: PatternWriteupKind, record: AuthoredNatalRecord | AuthoredActivationRecord, options: { production?: boolean } = {}) {
  const contexts = kind === "activation"
    ? activationContextsForPattern(record.patternType, ((record as AuthoredActivationRecord).eligibility.targetRoles[0] ?? "pattern_member"))
    : natalContextsForPattern(record.patternType);
  const resolverRecord = options.production ? record : { ...record, status: "approved" as const };
  return contexts.map(([fixtureId, context]) => {
    const authored = kind === "activation"
      ? engine.resolveAspectPatternActivationCopy(context, { authoredRecords: [resolverRecord as AuthoredActivationRecord] })
      : engine.resolveAspectPatternCopy(context, { authoredRecords: [resolverRecord as AuthoredNatalRecord], useLegacyResolver: true });
    const fallback = kind === "activation"
      ? engine.resolveAspectPatternActivationCopy(context, { authoredRecords: [] })
      : engine.resolveAspectPatternCopy(context, { authoredRecords: [], useLegacyResolver: true });
    const validation = kind === "activation"
      ? engine.validateAuthoredAspectPatternActivationRecord(record as AuthoredActivationRecord, context)
      : engine.validateAuthoredAspectPatternRecord(record as AuthoredNatalRecord, context);
    return {
      fixtureId,
      authored,
      fallback,
      changedFields: changedFields(authored, fallback),
      selectedRecordId: authored.source.recordId,
      selectedContentLevel: authored.source.contentLevel,
      selectedTemplateId: authored.diagnostics.templateId,
      validation
    };
  });
}

function changedFields(authored: ResolvedCopy, fallback: ResolvedCopy) {
  const changed = [];
  for (const field of ["eyebrow", "headline", "overview"] as const) {
    if (authored.content[field] !== fallback.content[field]) changed.push(field);
  }
  if (JSON.stringify(authored.content.sections) !== JSON.stringify(fallback.content.sections)) changed.push("sections");
  if (authored.source.contentLevel !== fallback.source.contentLevel) changed.push("contentLevel");
  return changed;
}

function materializedRows(kind: PatternWriteupKind, persistedRows: GeneratedContentRow[]) {
  const baseRecords = kind === "activation" ? engine.AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS : engine.AUTHORED_ASPECT_PATTERN_RECORDS;
  const savedByRecordId = new Map(persistedRows.flatMap((row) => {
    const record = rowRecord(row, kind);
    return record?.id ? [[record.id, row] as const] : [];
  }));
  return baseRecords.map((baseRecord) => {
    const savedRow = savedByRecordId.get(baseRecord.id);
    const savedRecord = savedRow ? rowRecord(savedRow, kind) : null;
    const record = savedRecord ? {
      ...baseRecord,
      ...savedRecord,
      status: authoredStatusFromGenerated(savedRow?.status ?? savedRecord.status)
    } as AuthoredNatalRecord | AuthoredActivationRecord : baseRecord;
    const previews = previewForRecord(kind, record);
    const productionPreviews = previewForRecord(kind, record, { production: true });
    const fallbackLevels = kind === "activation" ? engine.GOVERNED_ACTIVATION_COPY_RECORDS : engine.GOVERNED_COPY_RECORDS;
    const levels = [
      { contentLevel: "authored", recordId: record.id, status: record.status, editable: true, available: true },
      ...fallbackLevels
        .filter((fallback) => fallback.patternType === record.patternType)
        .map((fallback) => ({ contentLevel: fallback.contentLevel, recordId: fallback.id, status: fallback.status, editable: false, available: true }))
    ];
    const route = kind === "activation"
      ? activationRoutes.find((item) => item.patternType === record.patternType && (record as AuthoredActivationRecord).eligibility.targetRoles.includes(item.targetRole))
      : null;
    return {
      kind,
      key: kind === "activation" ? route?.key ?? contentKeyFor(kind, record) : String(record.patternType),
      patternType: record.patternType,
      patternName: patternLabels[record.patternType],
      targetRole: route?.targetRole ?? null,
      targetRoleLabel: route?.roleLabel ?? null,
      generatedContentId: savedRow?.id ?? null,
      contentKey: contentKeyFor(kind, record),
      lastUpdated: savedRow?.updated_at ?? record.provenance.reviewedAt ?? null,
      status: record.status,
      contentLevel: "authored",
      validationState: previews.every((preview) => preview.validation.ok) ? "valid" : "needs_attention",
      fallbackAvailable: levels.some((level) => level.contentLevel === "source_grounded_template"),
      productionSelected: productionPreviews.some((preview) => preview.authored.source.recordId === record.id && preview.authored.source.contentLevel === "authored"),
      contentLevels: levels,
      eligibleConfidence: kind === "activation" ? (record as AuthoredActivationRecord).eligibility.patternConfidence ?? ["exact", "strong", "wide", "partial"] : (record as AuthoredNatalRecord).eligibility.confidence,
      houseEligibility: kind === "activation" ? "n/a" : (record as AuthoredNatalRecord).eligibility.houseMode,
      timingEligibility: kind === "activation" ? (record as AuthoredActivationRecord).eligibility.timingStates ?? ["exact", "applying", "separating", "mixed"] : [],
      triggerModeEligibility: kind === "activation" ? (record as AuthoredActivationRecord).eligibility.triggerModes ?? ["single", "multiple", "shared_planet"] : [],
      sourceState: record.provenance.editorialStatus,
      sourceIds: record.provenance.sourceIds ?? [],
      record,
      previews
    };
  });
}

function coverageSummary(rows: ReturnType<typeof materializedRows>) {
  return {
    totalRoutes: rows.length,
    approvedAuthored: rows.filter((row) => row.status === "approved").length,
    draft: rows.filter((row) => row.status === "draft").length,
    reviewed: rows.filter((row) => row.status === "reviewed").length,
    deprecated: rows.filter((row) => row.status === "deprecated").length,
    fallbackCovered: rows.filter((row) => row.fallbackAvailable).length,
    missingCoverage: rows.filter((row) => !row.fallbackAvailable).length,
    invalidRecords: rows.filter((row) => row.validationState !== "valid").length,
    selectedInProduction: rows.filter((row) => row.productionSelected).length
  };
}

async function buildResponse(kind: PatternWriteupKind) {
  let persistenceError: string | null = null;
  let persistedRows: GeneratedContentRow[] = [];
  try {
    persistedRows = await fetchPersistedRows(kind);
  } catch (error) {
    persistenceError = error instanceof Error ? error.message : "Saved aspect-pattern rows could not be loaded.";
  }
  const rows = materializedRows(kind, persistedRows);
  return {
    ok: true,
    kind,
    generatedAt: new Date().toISOString(),
    persistence: {
      path: "generated_interpretations",
      configured: hasPersistenceEnv(),
      savedRows: persistedRows.length,
      error: persistenceError
    },
    slots: kind === "activation" ? engine.APPROVED_ACTIVATION_COPY_SLOTS : engine.APPROVED_COPY_SLOTS,
    fieldOrder: kind === "activation" ? activationFieldOrder : natalFieldOrder,
    governedConditions: kind === "activation"
      ? ["exact", "applying", "separating", "mixed", "single trigger", "multiple triggers", "shared natal planet", "exact or strong natal pattern", "wide or partial natal pattern"]
      : ["exact", "strong", "wide", "partial", "with house data", "without house data", "contained pattern"],
    summary: coverageSummary(rows),
    rows
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const requestUrl = new URL(req.url ?? "/api/admin/aspect-pattern-writeups", "http://localhost");
    const kind = requestUrl.searchParams.get("kind") === "activation" ? "activation" : "natal";

    if (req.method === "GET") {
      sendJson(res, 200, await buildResponse(kind));
      return;
    }

    if (req.method === "POST" || req.method === "PATCH") {
      const body = await readJsonBody(req);
      const saveKind = body.kind === "activation" ? "activation" : "natal";
      if (body.action === "preview") {
        if (!body.record) throw new Error("record is required.");
        const record = normalizeRecordForSave(saveKind, body.record);
        sendJson(res, 200, { ok: true, previews: previewForRecord(saveKind, record) });
        return;
      }
      if (!await isContentAdminAuthorized(req)) {
        sendJson(res, 401, { ok: false, error: "Unauthorized." });
        return;
      }
      const saved = await savePersistedRecord(saveKind, body);
      sendJson(res, 200, { ok: true, row: saved, dashboard: await buildResponse(saveKind) });
      return;
    }

    sendJson(res, 405, { ok: false, error: "Use GET, POST, or PATCH." });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown aspect-pattern write-up admin error."
    });
  }
}
