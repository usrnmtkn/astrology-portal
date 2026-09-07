import type { IncomingMessage, ServerResponse } from "node:http";
import { reportBillingMode, reportSku } from "./_lib/report-fulfillment-config.js";
import { revokeEntitlement } from "./_lib/report-entitlements.js";
import {
  activateFriendReportEntitlementFromStripe,
  revokeFriendReportEntitlementByPaymentIntent
} from "./_lib/friend-report-lifecycle.js";
import { rawRequestBody, sendJson } from "./_lib/report-http.js";
import { parseVerifiedStripeEvent } from "./_lib/stripe-report-billing.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";

function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function recordValue(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  if (reportBillingMode() === "free_test") return sendJson(res, 503, { configured: false, billingMode: "free_test", error: "Stripe webhooks are disabled during the free-test shadow launch." });
  const admin = createSupabaseReportAdmin();
  let eventId = "";
  try {
    const raw = await rawRequestBody(req);
    const signature = Array.isArray(req.headers["stripe-signature"])
      ? req.headers["stripe-signature"][0]
      : req.headers["stripe-signature"] ?? "";
    const event = parseVerifiedStripeEvent(raw, signature);
    eventId = event.id;
    const existing = await admin.selectOne<{ status: string }>("report_stripe_events", new URLSearchParams({ event_id: `eq.${event.id}`, select: "status" }));
    if (existing?.status === "processed") return sendJson(res, 200, { ok: true, duplicate: true });
    if (!existing) {
      await admin.insert("report_stripe_events", { event_id: event.id, event_type: event.type, payload: event, status: "received" });
    }
    const object = event.data.object;
    if (event.type === "checkout.session.completed") {
      const metadata = recordValue(object.metadata);
      const purchasedAt = new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
      if (stringValue(metadata.product_kind) === "friend_transit_reading") {
        const entitlementId = stringValue(metadata.entitlement_id);
        const userId = stringValue(metadata.user_id) || stringValue(object.client_reference_id);
        if (!entitlementId || !userId) throw new Error("Stripe Friends checkout metadata is incomplete.");
        await activateFriendReportEntitlementFromStripe({
          admin,
          entitlementId,
          userId,
          eventId: event.id,
          checkoutSessionId: stringValue(object.id),
          customerId: stringValue(object.customer) || null,
          paymentIntentId: stringValue(object.payment_intent) || null,
          purchasedAt
        });
      } else {
        const sku = reportSku(stringValue(metadata.product_key));
        if (!sku) throw new Error("Stripe checkout metadata contains an unknown report product.");
        await admin.insert("report_entitlements", {
          user_id: stringValue(metadata.user_id) || stringValue(object.client_reference_id),
          subject_id: stringValue(metadata.subject_id) || null,
          product_key: sku.key,
          report_domain: sku.reportDomain,
          report_horizon: sku.reportHorizon,
          window_anchor: stringValue(metadata.window_anchor),
          selected_start: stringValue(metadata.selected_start) || null,
          period_start: stringValue(metadata.period_start),
          period_end: stringValue(metadata.period_end),
          requires_birth_time: sku.requiresBirthTime,
          status: stringValue(metadata.birth_data_status) === "awaiting_birth_data" ? "awaiting_birth_data" : "active",
          source: "stripe",
          stripe_event_id: event.id,
          stripe_checkout_session_id: stringValue(object.id),
          stripe_customer_id: stringValue(object.customer) || null,
          stripe_payment_intent_id: stringValue(object.payment_intent) || null,
          purchased_at: purchasedAt
        }, { onConflict: "stripe_event_id", ignoreDuplicates: true });
      }
    } else if (event.type === "charge.refunded") {
      const paymentIntentId = stringValue(object.payment_intent) || undefined;
      const friendRevoked = paymentIntentId
        ? await revokeFriendReportEntitlementByPaymentIntent({
            admin,
            paymentIntentId,
            status: "refunded"
          })
        : false;
      if (!friendRevoked) {
        await revokeEntitlement(admin, {
          paymentIntentId,
          chargeId: stringValue(object.id) || undefined,
          reason: "refunded",
          now: new Date().toISOString()
        });
      }
    }
    await admin.update("report_stripe_events", `event_id=eq.${encodeURIComponent(event.id)}`, {
      status: "processed",
      processed_at: new Date().toISOString(),
      error: null
    });
    sendJson(res, 200, { ok: true });
  } catch (error) {
    if (eventId) {
      await admin.update("report_stripe_events", `event_id=eq.${encodeURIComponent(eventId)}`, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown webhook error."
      }).catch(() => undefined);
    }
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Stripe webhook failed." });
  }
}
