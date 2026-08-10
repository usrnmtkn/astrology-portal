import { birthProfileFromPersistedData, reportBillingWindow } from "./report-billing-window.ts";
import { reportSku, type ReportSku } from "./report-fulfillment-config.ts";
import type { SupabaseReportAdmin } from "./supabase-report-admin.ts";

type PersistedProfileRow = { data: unknown };

export async function loadBuyerBirthProfile(admin: SupabaseReportAdmin, userId: string) {
  const params = new URLSearchParams({ user_id: `eq.${userId}`, select: "data" });
  const row = await admin.selectOne<PersistedProfileRow>("user_profiles", params);
  return birthProfileFromPersistedData(row?.data);
}

export function entitlementReadiness(sku: ReportSku, profile: ReturnType<typeof birthProfileFromPersistedData>) {
  if (!profile?.birthDate || !profile.birthLocation) return "awaiting_birth_data" as const;
  if (sku.requiresBirthTime && (!profile.birthTime || profile.birthTimeUnknown)) return "awaiting_birth_data" as const;
  return "active" as const;
}

export async function checkoutMetadata(input: {
  admin: SupabaseReportAdmin;
  userId: string;
  skuKey: string;
  purchasedAt: string;
  selectedStart?: string | null;
}) {
  const sku = reportSku(input.skuKey);
  if (!sku) throw new Error(`Unknown report product '${input.skuKey}'.`);
  const profile = await loadBuyerBirthProfile(input.admin, input.userId);
  if (!profile?.birthDate) throw new Error("Add a birth date and birth place before purchasing this report.");
  const window = reportBillingWindow({
    horizon: sku.reportHorizon,
    purchasedAt: input.purchasedAt,
    selectedStart: input.selectedStart,
    birthDate: profile.birthDate
  });
  return { sku, profile, window, readiness: entitlementReadiness(sku, profile) };
}

export async function revokeEntitlement(admin: SupabaseReportAdmin, input: {
  entitlementId?: string;
  paymentIntentId?: string;
  chargeId?: string;
  reason: "refunded" | "revoked";
  now: string;
}) {
  const filters = input.entitlementId
    ? `id=eq.${encodeURIComponent(input.entitlementId)}`
    : input.paymentIntentId
      ? `stripe_payment_intent_id=eq.${encodeURIComponent(input.paymentIntentId)}`
      : `stripe_charge_id=eq.${encodeURIComponent(input.chargeId ?? "")}`;
  const rows = await admin.update<{ id: string }>("report_entitlements", `${filters}&select=id`, {
    status: input.reason,
    revoked_at: input.now
  });
  for (const row of rows) {
    await admin.update("user_reports", `entitlement_id=eq.${row.id}`, {
      status: "draft",
      fulfillment_status: "revoked",
      revoked_at: input.now
    });
    await admin.update("report_fulfillment_jobs", `entitlement_id=eq.${row.id}`, {
      state: "cancelled",
      last_error: `Entitlement ${input.reason}.`
    });
  }
  return rows;
}

export async function activateReadyEntitlement(admin: SupabaseReportAdmin, entitlementId: string, userId: string) {
  const entitlement = await admin.selectOne<{
    id: string;
    user_id: string;
    product_key: string;
    status: string;
  }>("report_entitlements", new URLSearchParams({ id: `eq.${entitlementId}`, user_id: `eq.${userId}`, select: "id,user_id,product_key,status" }));
  if (!entitlement) throw new Error("Report entitlement was not found.");
  const sku = reportSku(entitlement.product_key);
  if (!sku) throw new Error("Report product configuration is unavailable.");
  const profile = await loadBuyerBirthProfile(admin, userId);
  if (entitlementReadiness(sku, profile) !== "active") return { activated: false, status: "awaiting_birth_data" };
  await admin.update("report_entitlements", `id=eq.${entitlementId}`, { status: "active" });
  const report = await admin.selectOne<{ id: string }>("user_reports", new URLSearchParams({ entitlement_id: `eq.${entitlementId}`, select: "id" }));
  if (!report) throw new Error("The entitlement report envelope is unavailable.");
  await admin.update("user_reports", `id=eq.${report.id}`, { fulfillment_status: "queued" });
  await admin.insert("report_fulfillment_jobs", { report_id: report.id, entitlement_id: entitlementId }, { onConflict: "report_id", ignoreDuplicates: true });
  return { activated: true, status: "queued", reportId: report.id };
}
