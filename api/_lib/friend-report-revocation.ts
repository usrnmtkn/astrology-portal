import {
  revokeFriendReportEntitlementByPaymentIntent,
  type FriendReportEntitlementRow
} from "./friend-report-lifecycle.js";
import { createSupabaseReportAdmin, type SupabaseReportAdmin } from "./supabase-report-admin.js";

export async function revokeFriendReportPurchase(input: {
  admin?: SupabaseReportAdmin;
  paymentIntentId: string;
  status: "revoked" | "refunded";
}) {
  const admin = input.admin ?? createSupabaseReportAdmin();
  const entitlement = await admin.selectOne<FriendReportEntitlementRow>(
    "friend_report_entitlements",
    new URLSearchParams({
      stripe_payment_intent_id: `eq.${input.paymentIntentId}`,
      source: "eq.stripe",
      select: "*"
    })
  );
  if (!entitlement) return false;

  const revoked = await revokeFriendReportEntitlementByPaymentIntent({
    admin,
    paymentIntentId: input.paymentIntentId,
    status: input.status
  });
  if (!revoked) return false;

  const generated = await admin.selectOne<{ id: string }>(
    "user_generated_interpretations",
    new URLSearchParams({
      user_id: `eq.${entitlement.user_id}`,
      subject_type: "eq.friend_transit_reading",
      content_key: `eq.${entitlement.content_key}`,
      select: "id"
    })
  );
  if (generated?.id) {
    const now = new Date().toISOString();
    await admin.update(
      "user_generated_interpretations",
      `id=eq.${encodeURIComponent(generated.id)}&user_id=eq.${encodeURIComponent(entitlement.user_id)}`,
      { status: "ARCHIVED" }
    );
    await admin.update(
      "report_share_links",
      `user_id=eq.${encodeURIComponent(entitlement.user_id)}&source_kind=eq.generated_interpretation&source_id=eq.${encodeURIComponent(generated.id)}&revoked_at=is.null`,
      { revoked_at: now, updated_at: now }
    );
  }
  return true;
}
