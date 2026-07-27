import { createRequire } from "node:module";
import { loadLocalWebEnv } from "./local-env.js";

loadLocalWebEnv();

export type AspectPatternWriteupKind = "natal" | "activation";
type GeneratedContentStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type AuthoredStatus = "draft" | "reviewed" | "approved" | "deprecated";
type PatternType = "t_square" | "grand_square" | "grand_trine" | "kite" | "yod" | "mystic_rectangle";

type GeneratedContentRow = {
  id: string;
  content_key: string;
  status: GeneratedContentStatus;
  source_snapshot?: Record<string, unknown> | null;
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
  persistence?: { generatedContentId: string; contentKey: string; updatedAt?: string | null; createdAt?: string | null };
};

type AuthoredActivationRecord = Omit<AuthoredNatalRecord, "eligibility" | "languageRules"> & {
  priority?: number;
  authoredPriority?: number;
  eligibility: {
    targetRoles: string[];
    timingStates?: string[];
    patternConfidence?: string[];
    triggerModes?: string[];
  };
  languageRules: { certainty?: string; prohibitedClaims: string[]; prohibitedTerms?: string[] };
};

const require = createRequire(import.meta.url);
const runtimeLookupTimeoutMs = 3000;
const engine = require("../../packages/astro-knowledge/engine/aspect-patterns/index.js") as {
  AUTHORED_ASPECT_PATTERN_RECORDS: AuthoredNatalRecord[];
  AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS: AuthoredActivationRecord[];
};

export function hasAspectPatternWriteupPersistenceEnv() {
  return Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

export function aspectPatternWriteupAdminHeaders() {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json"
  };
}

export function aspectPatternWriteupContentKeyPrefix(kind: AspectPatternWriteupKind) {
  return kind === "activation" ? "aspect-pattern/activation/" : "aspect-pattern/natal/";
}

function authoredStatusFromGenerated(status: GeneratedContentStatus | string): AuthoredStatus {
  if (status === "LIVE") return "approved";
  if (status === "REVIEWED") return "reviewed";
  if (status === "ARCHIVED") return "deprecated";
  return "draft";
}

export async function fetchPersistedAspectPatternWriteupRows(kind: AspectPatternWriteupKind) {
  if (!hasAspectPatternWriteupPersistenceEnv()) return [];
  const params = new URLSearchParams({
    select: "id,content_key,status,source_snapshot,updated_at,created_at",
    content_key: `like.${aspectPatternWriteupContentKeyPrefix(kind)}%`,
    status: "in.(DRAFT,REVIEWED,LIVE,ARCHIVED,ERROR)",
    order: "updated_at.desc",
    limit: "200"
  });
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    headers: aspectPatternWriteupAdminHeaders(),
    signal: AbortSignal.timeout(runtimeLookupTimeoutMs)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase aspect-pattern write-up runtime lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return Array.isArray(payload) ? payload as GeneratedContentRow[] : [];
}

export function authoredRecordFromGeneratedRow(row: GeneratedContentRow, kind: AspectPatternWriteupKind) {
  const record = row.source_snapshot?.record;
  if (!record || typeof record !== "object") return null;
  const candidate = record as Partial<AuthoredNatalRecord & AuthoredActivationRecord>;
  if (!candidate.id || !candidate.patternType || !candidate.content || !Array.isArray(candidate.content.sections)) return null;
  if (!candidate.languageRules || !Array.isArray(candidate.languageRules.prohibitedClaims)) return null;
  if (!candidate.provenance || !Array.isArray(candidate.provenance.sourceIds)) return null;
  if (kind === "activation" && !Array.isArray(candidate.eligibility?.targetRoles)) return null;
  if (kind === "natal" && (!Array.isArray(candidate.eligibility?.confidence) || typeof candidate.eligibility?.houseMode !== "string")) return null;

  return {
    ...candidate,
    status: authoredStatusFromGenerated(row.status),
    persistence: {
      generatedContentId: row.id,
      contentKey: row.content_key,
      updatedAt: row.updated_at ?? null,
      createdAt: row.created_at ?? null
    }
  } as AuthoredNatalRecord | AuthoredActivationRecord;
}

export function persistedAuthoredRecordsFromRows(kind: AspectPatternWriteupKind, rows: GeneratedContentRow[]) {
  const byRecordId = new Map<string, AuthoredNatalRecord | AuthoredActivationRecord>();
  for (const row of rows) {
    const record = authoredRecordFromGeneratedRow(row, kind);
    if (!record || byRecordId.has(record.id)) continue;
    byRecordId.set(record.id, record);
  }
  return [...byRecordId.values()];
}

export async function loadAspectPatternProductionAuthoredRecords(kind: "natal") : Promise<AuthoredNatalRecord[]>;
export async function loadAspectPatternProductionAuthoredRecords(kind: "activation") : Promise<AuthoredActivationRecord[]>;
export async function loadAspectPatternProductionAuthoredRecords(kind: AspectPatternWriteupKind) {
  const codeBacked = kind === "activation"
    ? engine.AUTHORED_ASPECT_PATTERN_ACTIVATION_RECORDS
    : engine.AUTHORED_ASPECT_PATTERN_RECORDS;

  try {
    const persisted = persistedAuthoredRecordsFromRows(kind, await fetchPersistedAspectPatternWriteupRows(kind))
      .filter((record) => record.status === "approved");
    return persisted.concat(codeBacked);
  } catch (error) {
    console.warn(
      `Aspect-pattern ${kind} persistence lookup failed; using code-backed records.`,
      error
    );
    return codeBacked;
  }
}
