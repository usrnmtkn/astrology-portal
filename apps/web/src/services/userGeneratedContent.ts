import { supabase } from "./auth";
import type { GeneratedContentMode, LiveGeneratedContent } from "./generatedContent";

export type UserGeneratedSubjectType =
  | "you_update"
  | "you_transit"
  | "natal_summary"
  | "natal_placement"
  | "natal_aspect"
  | "synastry_summary"
  | "synastry_aspect"
  | "composite_summary"
  | "composite_placement"
  | "composite_aspect";

type UserGeneratedContentRow = {
  id: string;
  content_key: string;
  surface: string;
  mode: GeneratedContentMode;
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
  surface: "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
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
    updatedAt: row.updated_at
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
  if (!supabase) {
    return null;
  }

  let query = supabase
    .from("user_generated_interpretations")
    .select("id, content_key, surface, mode, event_type, target_date, headline, summary, body, sections, provider, model, updated_at")
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

  return saved ? fromRow(saved) : payload?.generated ?? null;
}
