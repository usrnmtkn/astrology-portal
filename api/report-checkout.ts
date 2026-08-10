import type { IncomingMessage, ServerResponse } from "node:http";
import { checkoutMetadata } from "./_lib/report-entitlements.js";
import { resolvedStripePriceId } from "./_lib/report-fulfillment-config.js";
import { jsonRequestBody, reportUrl, requireReportUser, sendJson } from "./_lib/report-http.js";
import { stripePost } from "./_lib/stripe-report-billing.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";

type CheckoutRequest = { skuKey?: string; selectedStart?: string };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  if (!process.env.STRIPE_SECRET_KEY) return sendJson(res, 503, { configured: false, error: "Report checkout is not configured." });
  try {
    const user = await requireReportUser(req);
    const body = await jsonRequestBody<CheckoutRequest>(req);
    const purchasedAt = new Date().toISOString();
    const metadata = await checkoutMetadata({
      admin: createSupabaseReportAdmin(),
      userId: user.id,
      skuKey: body.skuKey ?? "",
      selectedStart: body.selectedStart,
      purchasedAt
    });
    const priceId = resolvedStripePriceId(metadata.sku);
    if (!priceId) throw new Error(`${metadata.sku.priceEnv} is not configured.`);
    const session = await stripePost<{ id: string; url: string }>("checkout/sessions", {
      mode: "payment",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      success_url: reportUrl("/reports/checkout/success?session_id={CHECKOUT_SESSION_ID}", req),
      cancel_url: reportUrl("/reports/checkout/cancel", req),
      client_reference_id: user.id,
      customer_email: user.email,
      "metadata[user_id]": user.id,
      "metadata[product_key]": metadata.sku.key,
      "metadata[report_domain]": metadata.sku.reportDomain,
      "metadata[report_horizon]": metadata.sku.reportHorizon,
      "metadata[period_start]": metadata.window.start,
      "metadata[period_end]": metadata.window.end,
      "metadata[window_anchor]": metadata.window.anchor,
      "metadata[selected_start]": body.selectedStart ?? "",
      "metadata[requires_birth_time]": metadata.sku.requiresBirthTime,
      "metadata[birth_data_status]": metadata.readiness,
      "payment_intent_data[metadata][user_id]": user.id,
      "payment_intent_data[metadata][product_key]": metadata.sku.key
    });
    sendJson(res, 200, { checkoutSessionId: session.id, url: session.url });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not create report checkout." });
  }
}
