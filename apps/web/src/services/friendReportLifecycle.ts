import { getSupabaseClient } from "./auth";
import {
  loadUserGeneratedInterpretation,
  type GenerateUserContentRequest
} from "./userGeneratedContent";

export type FriendReportRequest = GenerateUserContentRequest & {
  subjectType: "friend_transit_reading";
};

async function accessToken() {
  const client = await getSupabaseClient();
  const session = await client?.auth.getSession();
  return session?.data.session?.access_token ?? "";
}

async function authenticatedPost<T>(path: string, request: FriendReportRequest) {
  const token = await accessToken();
  if (!token) throw new Error("Sign in to access paid readings.");
  const response = await fetch(path, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(request)
  });
  const payload = await response.json().catch(() => null) as (T & { error?: string; errorType?: string }) | null;
  return { response, payload };
}

export async function requestFriendReport(request: FriendReportRequest) {
  const { response, payload } = await authenticatedPost<{
    status?: "ready" | "queued" | "payment_required" | "unavailable";
    reportId?: string | null;
    jobId?: string | null;
  }>("/api/friend-report-request", request);

  if (response.status === 402 || payload?.status === "payment_required") {
    return { status: "payment_required" as const, reading: null };
  }
  if (!response.ok && response.status !== 202) {
    throw new Error(payload?.error ?? "This reading could not be prepared.");
  }
  if (response.status === 202 || payload?.status === "queued") {
    return { status: "queued" as const, reading: null, reportId: payload?.reportId ?? null };
  }

  const reading = await loadUserGeneratedInterpretation({
    subjectType: "friend_transit_reading",
    subjectId: request.subjectId,
    contentKey: request.contentKey,
    targetDate: request.targetDate
  });
  if (!reading) throw new Error("The completed reading could not be loaded.");
  return { status: "ready" as const, reading };
}

export async function startFriendReportCheckout(request: FriendReportRequest) {
  const { response, payload } = await authenticatedPost<{ url?: string }>("/api/friend-report-checkout", request);
  if (!response.ok || !payload?.url) throw new Error(payload?.error ?? "Could not start checkout.");
  return payload.url;
}
