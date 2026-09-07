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
export type FriendReportJobState = "idle" | "pending_payment" | "queued" | "running" | "retry" | "complete" | "failed" | "cancelled";

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
  if (request.subjectType !== "friend_transit_reading" || !result?.id) return;
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

async function signedInSession() {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token || !data.session.user.id) return null;
  return { supabase, session: data.session };
}

function delay(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export async function loadFriendReportJobStatus({
  subjectId,
  targetDate
}: {
  subjectId: string;
  targetDate: string;
}): Promise<{ state: FriendReportJobState; saved: LiveGeneratedContent | null }> {
  const context = await signedInSession();
  if (!context || !subjectId || !/^\d{4}-\d{2}-\d{2}$/u.test(targetDate)) {
    return { state: "idle", saved: null };
  }
  const params = new URLSearchParams({ subjectId, targetDate });
  const response = await fetch(`/api/friend-report-status?${params}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${context.session.access_token}`
    }
  });
  const payload = await response.json().catch(() => null) as {
    state?: FriendReportJobState;
    saved?: UserGeneratedContentRow[];
  } | null;
  if (!response.ok) return { state: "idle", saved: null };
  return {
    state: payload?.state ?? "idle",
    saved: payload?.saved?.[0]?.body?.trim() ? fromRow(payload.saved[0]) : null
  };
}

async function waitForFriendReportByIdentity(
  subjectId: string,
  targetDate: string,
  timeoutMs = 5 * 60_000
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await loadFriendReportJobStatus({ subjectId, targetDate });
    if (status.saved) return status;
    if (["failed", "cancelled", "idle", "pending_payment"].includes(status.state)) return status;
    await delay(2500);
  }
  return { state: "retry" as FriendReportJobState, saved: null };
}

async function waitForFriendReport(request: GenerateUserContentRequest) {
  const targetDate = request.targetDate ?? "";
  const status = await waitForFriendReportByIdentity(request.subjectId, targetDate);
  if (status.saved) {
    notifyFriendReadingReady(request, status.saved);
    return status.saved;
  }
  if (status.state === "failed" || status.state === "cancelled") {
    throw new GenerateUserContentError(500, {
      ok: false,
      errorType: "paid_reading_unavailable",
      error: "This paid reading is currently unavailable."
    });
  }
  throw new GenerateUserContentError(202, {
    ok: false,
    errorType: "generation_pending",
    error: "This reading is still being prepared."
  });
}

async function beginFriendReportCheckout(request: GenerateUserContentRequest, accessToken: string) {
  const response = await fetch("/api/friend-report-checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      subjectId: request.subjectId,
      targetDate: request.targetDate,
      facts: request.facts
    })
  });
  const payload = await response.json().catch(() => null) as {
    url?: string;
    alreadyPurchased?: boolean;
    error?: string;
  } | null;
  if (!response.ok) {
    throw new GenerateUserContentError(response.status, {
      ok: false,
      errorType: "checkout_unavailable",
      error: payload?.error ?? "Checkout is unavailable right now."
    });
  }
  if (payload?.alreadyPurchased) return "already_purchased" as const;
  if (!payload?.url) throw new Error("Checkout did not return a destination.");
  window.location.assign(payload.url);
  return "redirected" as const;
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
    .eq("content_key", contentKey);

  query = subjectType === "friend_transit_reading"
    ? query.in("status", ["DRAFT", "REVIEWED", "LIVE"])
    : query.eq("status", "LIVE");
  query = query.order("updated_at", { ascending: false }).limit(1);
  query = targetDate ? query.eq("target_date", targetDate) : query.is("target_date", null);

  const { data, error } = await query.returns<UserGeneratedContentRow[]>();

  if (error) {
    console.warn("Personalized generated content failed to load.", error);
    return null;
  }

  const row = data?.[0];
  if (row?.body?.trim()) return fromRow(row);
  if (subjectType !== "friend_transit_reading" || !targetDate) return null;

  const status = await waitForFriendReportByIdentity(subjectId, targetDate);
  return status.saved;
}

async function postGenerationRequest(request: GenerateUserContentRequest, accessToken: string) {
  const endpoint = request.subjectType === "friend_transit_reading"
    ? "/api/generate-friend-transit-reading"
    : "/api/generate-user-content";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(request)
  });
  const payload = await response.json().catch(() => null) as {
    generated?: LiveGeneratedContent;
    saved?: UserGeneratedContentRow[];
    queued?: boolean;
    error?: string;
    errorType?: string;
  } | null;
  return { response, payload };
}

export async function generateUserContent(request: GenerateUserContentRequest) {
  const context = await signedInSession();
  if (!context) {
    throw new Error("Sign in before generating personalized content.");
  }

  let { response, payload } = await postGenerationRequest(request, context.session.access_token);

  if (response.status === 402 && request.subjectType === "friend_transit_reading" && payload?.errorType === "payment_required") {
    const checkout = await beginFriendReportCheckout(request, context.session.access_token);
    if (checkout === "redirected") {
      throw new GenerateUserContentError(402, {
        ok: false,
        errorType: "checkout_redirect",
        error: "Opening checkout."
      });
    }
    ({ response, payload } = await postGenerationRequest(request, context.session.access_token));
  }

  if (!response.ok) {
    throw new GenerateUserContentError(response.status, payload);
  }

  const saved = payload?.saved?.[0];
  if (saved?.body?.trim()) {
    if (request.subjectType === "friend_transit_reading" && saved.status === "DRAFT") {
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

  if (request.subjectType === "friend_transit_reading" && (response.status === 202 || payload?.queued || saved)) {
    return waitForFriendReport(request);
  }

  const generated = payload?.generated ?? null;
  notifyFriendReadingReady(request, generated);
  return generated;
}
