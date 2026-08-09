export type ReportType = "year_ahead" | "relationship" | "saturn_return";
export type ReportStatus = "draft" | "needs_review" | "approved" | "live";
export type ReportFacts = Record<string, unknown>;

export type ReportIdentity = {
  userId: string;
  reportType: ReportType;
  subjectId: string | null;
  periodStart: string;
};

export type UserReportRow = {
  id: string;
  user_id: string;
  report_type: ReportType;
  subject_id: string | null;
  period_start: string;
  period_end: string;
  facts: ReportFacts;
  facts_engine: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};

export type ReportUnitRow = {
  id: string;
  user_id: string;
  subject_type: string;
  subject_id: string;
  content_key: string;
  status: string;
  headline?: string | null;
  summary?: string | null;
  body: string;
  sections?: unknown;
  updated_at?: string;
};

export type CreateReportEnvelopeInput = ReportIdentity & {
  periodEnd: string;
  facts: ReportFacts;
  factsEngine: string;
  status?: ReportStatus;
};

export type ReportEnvelopeStore = {
  findReport(identity: ReportIdentity): Promise<UserReportRow | null>;
  insertReport(input: CreateReportEnvelopeInput): Promise<UserReportRow>;
  regenerateReport(id: string, input: CreateReportEnvelopeInput): Promise<UserReportRow>;
  listUnits(userId: string, contentKeyPrefix: string): Promise<ReportUnitRow[]>;
};

export class ReportFactsFrozenError extends Error {
  readonly reportId: string;

  constructor(reportId: string) {
    super(`Facts are frozen for report ${reportId}. Pass regenerate: true to replace them.`);
    this.name = "ReportFactsFrozenError";
    this.reportId = reportId;
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function cloneFacts(facts: ReportFacts): ReportFacts {
  return JSON.parse(JSON.stringify(facts)) as ReportFacts;
}

function normalizedInput(input: CreateReportEnvelopeInput): CreateReportEnvelopeInput {
  return {
    ...input,
    subjectId: input.subjectId || null,
    facts: cloneFacts(input.facts),
    status: input.status ?? "draft"
  };
}

function factsChanged(existing: UserReportRow, input: CreateReportEnvelopeInput) {
  return (
    canonicalJson(existing.facts) !== canonicalJson(input.facts)
    || existing.facts_engine !== input.factsEngine
  );
}

export function reportUnitPrefix(reportId: string) {
  return `report:${reportId}:`;
}

export async function fetchReportEnvelope(store: ReportEnvelopeStore, identity: ReportIdentity) {
  return store.findReport({ ...identity, subjectId: identity.subjectId || null });
}

export async function createReportEnvelope(
  store: ReportEnvelopeStore,
  input: CreateReportEnvelopeInput,
  options: { regenerate?: boolean } = {}
) {
  const normalized = normalizedInput(input);
  const existing = await fetchReportEnvelope(store, normalized);

  if (!existing) {
    return store.insertReport(normalized);
  }

  if (factsChanged(existing, normalized)) {
    if (!options.regenerate) {
      throw new ReportFactsFrozenError(existing.id);
    }

    return store.regenerateReport(existing.id, normalized);
  }

  return existing;
}

export async function listReportUnits(
  store: ReportEnvelopeStore,
  input: { userId: string; reportId: string }
) {
  const prefix = reportUnitPrefix(input.reportId);
  const units = await store.listUnits(input.userId, prefix);

  return units
    .filter((unit) => unit.user_id === input.userId && unit.content_key.startsWith(prefix))
    .sort((left, right) => left.content_key.localeCompare(right.content_key));
}

type FetchLike = typeof fetch;

type SupabaseRestStoreOptions = {
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl?: FetchLike;
};

function reportQuery(identity: ReportIdentity) {
  const params = new URLSearchParams({
    user_id: `eq.${identity.userId}`,
    report_type: `eq.${identity.reportType}`,
    period_start: `eq.${identity.periodStart}`,
    select: "*",
    limit: "1"
  });
  params.set("subject_id", identity.subjectId ? `eq.${identity.subjectId}` : "is.null");
  return params;
}

function reportPayload(input: CreateReportEnvelopeInput) {
  return {
    user_id: input.userId,
    report_type: input.reportType,
    subject_id: input.subjectId,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    facts: cloneFacts(input.facts),
    facts_engine: input.factsEngine,
    status: input.status ?? "draft"
  };
}

async function responsePayload(response: Response) {
  return response.json().catch(() => null) as Promise<unknown>;
}

function supabaseFailure(operation: string, response: Response, payload: unknown) {
  return new Error(`Supabase ${operation} failed with ${response.status}: ${JSON.stringify(payload)}`);
}

export function createSupabaseReportEnvelopeStore({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = fetch
}: SupabaseRestStoreOptions): ReportEnvelopeStore {
  const baseUrl = supabaseUrl.replace(/\/$/u, "");
  const headers = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json"
  };

  return {
    async findReport(identity) {
      const response = await fetchImpl(`${baseUrl}/rest/v1/user_reports?${reportQuery(identity).toString()}`, { headers });
      const payload = await responsePayload(response) as UserReportRow[] | null;

      if (!response.ok) {
        throw supabaseFailure("report lookup", response, payload);
      }

      return payload?.[0] ?? null;
    },

    async insertReport(input) {
      const response = await fetchImpl(`${baseUrl}/rest/v1/user_reports`, {
        method: "POST",
        headers: { ...headers, prefer: "return=representation" },
        body: JSON.stringify(reportPayload(input))
      });
      const payload = await responsePayload(response) as UserReportRow[] | null;

      if (!response.ok || !payload?.[0]) {
        throw supabaseFailure("report insert", response, payload);
      }

      return payload[0];
    },

    async regenerateReport(id, input) {
      const response = await fetchImpl(`${baseUrl}/rest/v1/user_reports?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...headers, prefer: "return=representation" },
        body: JSON.stringify({
          period_end: input.periodEnd,
          facts: cloneFacts(input.facts),
          facts_engine: input.factsEngine,
          status: input.status ?? "draft"
        })
      });
      const payload = await responsePayload(response) as UserReportRow[] | null;

      if (!response.ok || !payload?.[0]) {
        throw supabaseFailure("report regeneration", response, payload);
      }

      return payload[0];
    },

    async listUnits(userId, contentKeyPrefix) {
      const params = new URLSearchParams({
        user_id: `eq.${userId}`,
        content_key: `like.${contentKeyPrefix}*`,
        select: "id,user_id,subject_type,subject_id,content_key,status,headline,summary,body,sections,updated_at",
        order: "content_key.asc"
      });
      const response = await fetchImpl(`${baseUrl}/rest/v1/user_generated_interpretations?${params.toString()}`, { headers });
      const payload = await responsePayload(response) as ReportUnitRow[] | null;

      if (!response.ok) {
        throw supabaseFailure("report unit lookup", response, payload);
      }

      return payload ?? [];
    }
  };
}
