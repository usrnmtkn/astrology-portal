import { getSupabaseClient } from "./auth";
import { dispatchReportReady } from "./reportLibrary";
import { reportVanityPath } from "./reportLinks";
import type { GeneratedContentMode, LiveGeneratedContent } from "./generatedContent";

export type UserGeneratedSubjectType =
  // Keep identical to UserContentSubjectType in api/generate-user-content.ts.
  | "you_update"
  | "you_transit"
  | "friend_transit_reading"
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
export type ReportDomain = "general" | "work_money" | "love_connection" | "personal_health";

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
  surface: "sky" | "you" | "natal" | "synastry" | "composite" | "relationship" | "friends" | "year_ahead";
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
  reportDomain?: ReportDomain;
  reportHorizon?: ReportHorizon;
  unitId?: string;
  dryRun?: boolean;
};

export type GenerateUserContentErrorPayload = {
  ok?: false;
  error?: string;
  errorType?: string;
  retryable?: boolean;
  [key: string]: unknown;
};

export class GenerateUserContentError extends Error {
  readonly status: number;
  readonly errorType: string | null;
  readonly retryable: boolean;
  readonly payload: GenerateUserContentErrorPayload | null;

  constructor(status: number, payload: GenerateUserContentErrorPayload | null) {
    super(payload?.error ?? `Personalized generation failed with ${status}.`);
    this.name = "GenerateUserContentError";
    this.status = status;
    this.errorType = payload?.errorType ?? null;
    this.retryable = payload?.retryable === true;
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

function friendNameFromRequest(request: GenerateUserContentRequest) {
  const brief = request.facts?.friendTransitsBrief;
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) return "";
  const name = (brief as Record<string, unknown>).friendName;
  return typeof name === "string" ? name.trim() : "";
}

function reportReadyTitle(friendName: string) {
  if (!friendName) return "Your Friends reading is ready";
  const possessive = /s$/iu.test(friendName) ? `${friendName}'` : `${friendName}'s`;
  return `${possessive} reading is ready`;
}

function notifyFriendReadingReady(request: GenerateUserContentRequest, result: LiveGeneratedContent | null) {
  if (request.subjectType !== "friend_transit_reading" || !result?.id || !result.body.trim()) return;
  const friendName = friendNameFromRequest(request);
  dispatchReportReady({
    sourceKind: "generated_interpretation",
    sourceId: result.id,
    title: reportReadyTitle(friendName),
    route: reportVanityPath({
      targetDate: request.targetDate ?? result.targetDate,
      subjectLabel: friendName,
      title: result.headline
    })
  });
}

export async function loadUserGeneratedInterpretation({
  subjectType,
  subjectId,
  contentKey,
  targetDate,
  signal,
  throwOnError = false
}: {
  subjectType: UserGeneratedSubjectType;
  subjectId: string;
  contentKey: string;
  targetDate?: string;
  signal?: AbortSignal;
  throwOnError?: boolean;
}) {
  signal?.throwIfAborted();
  const supabase = await getSupabaseClient();
  signal?.throwIfAborted();

  if (!supabase) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  signal?.throwIfAborted();
  const userId = sessionData.session?.user.id;

  if (sessionError || !userId) {
    if (throwOnError && sessionError) throw sessionError;
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
    .eq("content_key", contentKey);

  query = subjectType === "friend_transit_reading"
    ? query.in("status", ["DRAFT", "REVIEWED", "LIVE", "ERROR"])
    : query.eq("status", "LIVE");
  query = query.order("updated_at", { ascending: false }).limit(1);
  query = targetDate ? query.eq("target_date", targetDate) : query.is("target_date", null);

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.returns<UserGeneratedContentRow[]>();
  signal?.throwIfAborted();

  if (error) {
    throw new GenerateUserContentError(503, {
      error: "Saved readings are temporarily unavailable.",
      errorType: "saved_reading_unavailable", retryable: true
    });
  }

  return data?.[0] ? fromRow(data[0]) : null;
}

async function friendCheckout(request: GenerateUserContentRequest, accessToken: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const response = await fetch("/api/friend-report-checkout", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(request)
  });
  const payload = await response.json().catch(() => null) as { url?: string; error?: string } | null;
  signal?.throwIfAborted();
  if (!response.ok || !payload?.url) {
    throw new GenerateUserContentError(response.status, payload as GenerateUserContentErrorPayload | null);
  }
  window.location.assign(payload.url);
}

export async function generateUserContent(request: GenerateUserContentRequest, { signal }: { signal?: AbortSignal } = {}) {
  signal?.throwIfAborted();
  const supabase = await getSupabaseClient();
  signal?.throwIfAborted();

  if (!supabase) {
    throw new GenerateUserContentError(401, { error: "Sign in before generating personalized content.", errorType: "authentication_required", retryable: false });
  }

  const { data, error } = await supabase.auth.getSession();

  signal?.throwIfAborted();
  if (error || !data.session?.access_token) {
    throw new GenerateUserContentError(401, { error: "Sign in before generating personalized content.", errorType: "authentication_required", retryable: false });
  }

  const friendReading = request.subjectType === "friend_transit_reading";
  const endpoint = friendReading
    ? "/api/friend-report-request"
    : "/api/generate-user-content";
  const response = await fetch(endpoint, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${data.session.access_token}`
    },
    body: JSON.stringify(request)
  }).catch(() => {
    signal?.throwIfAborted();
    throw new GenerateUserContentError(0, {
      error: "The generation request could not be confirmed. Check saved readings before trying again.",
      errorType: "network_error", retryable: false
    });
  });
  const payload = await response.json().catch(() => null) as {
    status?: "ready" | "queued" | "payment_required" | "unavailable";
    generated?: LiveGeneratedContent;
    saved?: UserGeneratedContentRow[];
    reportId?: string | null;
    jobId?: string | null;
    error?: string;
    errorType?: string;
    retryable?: boolean;
  } | null;

  signal?.throwIfAborted();
  if (friendReading && (response.status === 402 || payload?.status === "payment_required")) {
    await friendCheckout(request, data.session.access_token, signal);
    return null;
  }

  if (!response.ok && response.status !== 202) {
    throw new GenerateUserContentError(response.status, payload);
  }

  if (friendReading && (response.status === 202 || payload?.status === "queued")) {
    return loadUserGeneratedInterpretation({
      subjectType: "friend_transit_reading",
      subjectId: request.subjectId,
      contentKey: request.contentKey,
      targetDate: request.targetDate,
      signal
    });
  }

  const saved = payload?.saved?.[0];

  if (saved) {
    if (friendReading && saved.status === "DRAFT") {
      const result = fromRow(saved);
      notifyFriendReadingReady(request, result);
      return result;
    }
    if (saved.status === "LIVE") {
      const result = fromRow(saved);
      notifyFriendReadingReady(request, result);
      return result;
    }
    return null;
  }

  const generated = payload?.generated ?? null;
  notifyFriendReadingReady(request, generated);
  return generated;
}
