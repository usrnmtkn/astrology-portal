import { getSupabaseClient } from "./auth";
import type { GeneratedContentMode, LiveGeneratedContent } from "./generatedContent";

export type UserGeneratedSubjectType =
  // Keep identical to UserContentSubjectType in api/generate-user-content.ts.
  | "you_update"
  | "you_transit"
  | "natal_summary"
  | "natal_placement"
  | "natal_aspect"
  | "synastry_summary"
  | "synastry_aspect"
  | "composite_summary"
  | "composite_placement"
  | "composite_aspect"
  | "year_ahead"
  | "year_ahead_season"
  | "year_ahead_key_date"
  | "year_ahead_sr_moment"
  | "year_ahead_sr_stance"
  | "year_ahead_sr_sun"
  | "year_ahead_headline"
  | "year_ahead_saturn_return_callout"
  | "relationship_report_section"
  | "saturn_return"
  | "saturn_return_section"
  | "report_unit";

export type ReportHorizon = "1_month" | "4_months" | "6_months" | "12_months";

type UserGeneratedContentRow = {
  id: string;
  content_key: string;
  surface: string;
  mode: GeneratedContentMode;
  status?: "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string;
  sections: unknown | null;
  provider: string | null;
  model: string | null;
  updated_at: string;
};

export type GenerateUserContentRequest = {
  subjectType: UserGeneratedSubjectType;
  subjectId: string;
  contentKey: string;
  surface: "sky" | "you" | "natal" | "synastry" | "composite" | "relationship" | "year_ahead";
  mode: GeneratedContentMode;
  eventType: string;
  status?: "DRAFT" | "LIVE";
  headline?: string;
  targetDate?: string;
  facts: Record<string, unknown>;
  knowledgeIds?: string[];
  sourceSnapshot?: Record<string, unknown>;
  voiceNotes?: string;
  allowQualityFallback?: boolean;
  reportId?: string;
  reportHorizon?: ReportHorizon;
  unitId?: string;
  dryRun?: boolean;
};

export type GenerateUserContentErrorPayload = {
  ok?: false;
  error?: string;
  errorType?: string;
  [key: string]: unknown;
};

export class GenerateUserContentError extends Error {
  readonly status: number;
  readonly errorType: string | null;
  readonly payload: GenerateUserContentErrorPayload | null;

  constructor(status: number, payload: GenerateUserContentErrorPayload | null) {
    super(payload?.error ?? `Personalized generation failed with ${status}.`);
    this.name = "GenerateUserContentError";
    this.status = status;
    this.errorType = payload?.errorType ?? null;
    this.payload = payload;
  }
}

function fromRow(row: UserGeneratedContentRow): LiveGeneratedContent {
  return {
    id: row.id,
    contentKey: row.content_key,
    surface: row.surface,
    mode: row.mode,
    eventType: row.event_type,
    targetDate: row.target_date,
    headline: row.headline,
    summary: row.summary,
    body: row.body,
    sections: row.sections ?? {},
    provider: row.provider,
    model: row.model,
    updatedAt: row.updated_at,
    status: row.status
  };
}

export async function loadUserGeneratedInterpretation({
  subjectType,
  subjectId,
  contentKey,
  targetDate
}: {
  subjectType: UserGeneratedSubjectType;
  subjectId: string;
  contentKey: string;
  targetDate?: string;
}) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;

  if (sessionError || !userId) {
    if (sessionError) {
      console.warn("Personalized generated content could not confirm the signed-in user.", sessionError);
    }
    return null;
  }

  let query = supabase
    .from("user_generated_interpretations")
    .select("id, content_key, surface, mode, status, event_type, target_date, headline, summary, body, sections, provider, model, updated_at")
    .eq("user_id", userId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .eq("content_key", contentKey)
    .eq("status", "LIVE")
    .order("updated_at", { ascending: false })
    .limit(1);

  query = targetDate ? query.eq("target_date", targetDate) : query.is("target_date", null);

  const { data, error } = await query.returns<UserGeneratedContentRow[]>();

  if (error) {
    console.warn("Personalized generated content failed to load.", error);
    return null;
  }

  return data?.[0] ? fromRow(data[0]) : null;
}

export async function generateUserContent(request: GenerateUserContentRequest) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Sign in before generating personalized content.");
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Sign in before generating personalized content.");
  }

  const response = await fetch("/api/generate-user-content", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${data.session.access_token}`
    },
    body: JSON.stringify(request)
  });
  const payload = await response.json().catch(() => null) as {
    generated?: LiveGeneratedContent;
    saved?: UserGeneratedContentRow[];
    error?: string;
    errorType?: string;
  } | null;

  if (!response.ok) {
    throw new GenerateUserContentError(response.status, payload);
  }

  const saved = payload?.saved?.[0];

  if (saved) {
    return saved.status === "LIVE" ? fromRow(saved) : null;
  }

  return payload?.generated ?? null;
}
