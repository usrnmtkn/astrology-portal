import type { IncomingMessage, ServerResponse } from "node:http";
import { jsonRequestBody, requireReportAdmin, sendJson } from "../_lib/report-http.js";
import { createSupabaseReportAdmin } from "../_lib/supabase-report-admin.js";

type CleanupRequest = {
  dryRun?: boolean;
  confirm?: string;
  userId?: string;
  before?: string;
  includeLegacyUnentitled?: boolean;
};

type TestEntitlement = {
  id: string;
  user_id: string;
  source: "free_test" | "comp";
  purchased_at: string;
};

type GeneratedRow = {
  id: string;
  user_id: string;
  friend_report_entitlement_id: string | null;
  created_at: string;
};

const confirmationPhrase = "PURGE FRIEND REPORT TEST DATA";

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function beforeFilter(value: string | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Cleanup before date is invalid.");
  return parsed.toISOString();
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(",")})`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  if (!await requireReportAdmin(req)) return sendJson(res, 401, { error: "Unauthorized." });

  try {
    const body = await jsonRequestBody<CleanupRequest>(req);
    const dryRun = body.dryRun !== false;
    const userId = body.userId?.trim() ?? "";
    if (userId && !validUuid(userId)) return sendJson(res, 400, { error: "Cleanup user id is invalid." });
    const before = beforeFilter(body.before);
    if (body.includeLegacyUnentitled && !before) {
      return sendJson(res, 400, { error: "Legacy unentitled cleanup requires an explicit before date." });
    }
    if (!dryRun && body.confirm !== confirmationPhrase) {
      return sendJson(res, 400, { error: `Set confirm to '${confirmationPhrase}' to delete test data.` });
    }

    const admin = createSupabaseReportAdmin();
    const entitlementParams = new URLSearchParams({
      source: "in.(free_test,comp)",
      select: "id,user_id,source,purchased_at"
    });
    if (userId) entitlementParams.set("user_id", `eq.${userId}`);
    if (before) entitlementParams.set("purchased_at", `lt.${before}`);
    const entitlements = await admin.request<TestEntitlement[]>(`friend_report_entitlements?${entitlementParams}`);
    const entitlementIds = entitlements.map((row) => row.id);

    const generated: GeneratedRow[] = [];
    if (entitlementIds.length > 0) {
      generated.push(...await admin.request<GeneratedRow[]>(
        `user_generated_interpretations?subject_type=eq.friend_transit_reading&friend_report_entitlement_id=${encodeURIComponent(inFilter(entitlementIds))}&select=id,user_id,friend_report_entitlement_id,created_at`
      ));
    }
    if (body.includeLegacyUnentitled) {
      const legacyParams = new URLSearchParams({
        subject_type: "eq.friend_transit_reading",
        friend_report_entitlement_id: "is.null",
        created_at: `lt.${before}`,
        select: "id,user_id,friend_report_entitlement_id,created_at"
      });
      if (userId) legacyParams.set("user_id", `eq.${userId}`);
      generated.push(...await admin.request<GeneratedRow[]>(`user_generated_interpretations?${legacyParams}`));
    }
    const reportIds = [...new Set(generated.map((row) => row.id))];

    const result = {
      dryRun,
      filters: { userId: userId || null, before: before || null, includeLegacyUnentitled: body.includeLegacyUnentitled === true },
      counts: {
        testEntitlements: entitlementIds.length,
        generatedReadings: reportIds.length
      }
    };
    if (dryRun) return sendJson(res, 200, result);

    if (reportIds.length > 0) {
      const reportFilter = encodeURIComponent(inFilter(reportIds));
      await admin.request(`report_share_links?source_kind=eq.generated_interpretation&source_id=${reportFilter}`, { method: "DELETE" });
      await admin.request(`user_report_library_state?source_kind=eq.generated_interpretation&source_id=${reportFilter}`, { method: "DELETE" });
      await admin.request(`user_generated_interpretations?id=${reportFilter}&subject_type=eq.friend_transit_reading`, { method: "DELETE" });
    }
    if (entitlementIds.length > 0) {
      await admin.request(`friend_report_entitlements?id=${encodeURIComponent(inFilter(entitlementIds))}&source=in.(free_test,comp)`, { method: "DELETE" });
    }

    return sendJson(res, 200, { ...result, deleted: true });
  } catch (error) {
    console.error("friend-report-test-cleanup failed", error);
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Friends report test cleanup failed." });
  }
}
