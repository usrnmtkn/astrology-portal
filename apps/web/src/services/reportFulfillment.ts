import { getSupabaseClient } from "./auth";

async function accessToken() {
  const client = await getSupabaseClient();
  const session = await client?.auth.getSession();
  return session?.data.session?.access_token ?? "";
}

async function authenticatedRequest<T>(path: string, init?: RequestInit) {
  const token = await accessToken();
  if (!token) throw new Error("Sign in to access reports.");
  const response = await fetch(path, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json().catch(() => null) as T & { error?: string };
  if (!response.ok && response.status !== 202) throw new Error(payload?.error ?? `Report request failed with ${response.status}.`);
  return { status: response.status, payload };
}

export type ReportDeliveryPayload = {
  ready: boolean;
  status?: string;
  reportId?: string;
  entitlementId?: string;
  report?: {
    id: string; reportDomain: string; reportHorizon: string; periodStart: string; periodEnd: string;
    factsEngine: string; factsHash: string; deliveredAt: string | null;
    units: Array<{ content_key: string; headline: string | null; summary: string | null; body: string | null; sections: Array<{ heading?: string; body?: string }> | null }>;
  };
};

export async function loadReportDelivery(reportId: string) {
  return (await authenticatedRequest<ReportDeliveryPayload>(`/api/report-delivery?reportId=${encodeURIComponent(reportId)}`)).payload;
}

export async function startReportCheckout(skuKey: string, selectedStart?: string) {
  return (await authenticatedRequest<{ url: string }>("/api/report-checkout", { method: "POST", body: JSON.stringify({ skuKey, selectedStart }) })).payload;
}

export async function resumeReportEntitlement(entitlementId: string) {
  return (await authenticatedRequest<{ activated: boolean; status: string; reportId?: string }>("/api/report-entitlement", { method: "POST", body: JSON.stringify({ entitlementId }) })).payload;
}
