import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createFriendReportCheckoutIntent,
  friendReportBillingMode,
  friendReportStripePriceId,
  recordFriendReportCheckoutSession
} from "./_lib/friend-report-lifecycle.js";
import { jsonRequestBody, reportUrl, requireReportUser, sendJson } from "./_lib/report-http.js";
import { stripePost } from "./_lib/stripe-report-billing.js";

type CheckoutRequest = {
  subjectType?: string;
  subjectId?: string;
  targetDate?: string;
  facts?: Record<string, unknown>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  if (friendReportBillingMode() === "free_test") {
    return sendJson(res, 503, { configured: false, billingMode: "free_test", error: "Friends report checkout is disabled during free testing." });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return sendJson(res, 503, { configured: false, billingMode: "stripe", error: "Friends report checkout is not configured." });
  }
  const priceId = friendReportStripePriceId();
  if (!priceId) {
    return sendJson(res, 503, { configured: false, billingMode: "stripe", error: "The Friends reading price is not configured." });
  }
  try {
    const user = await requireReportUser(req);
    const body = await jsonRequestBody<CheckoutRequest>(req);
    if (body.subjectType !== "friend_transit_reading") {
      return sendJson(res, 400, { error: "Unsupported Friends report checkout." });
    }
    const { intent } = await createFriendReportCheckoutIntent({
      userId: user.id,
      subjectId: stringValue(body.subjectId),
      targetDate: stringValue(body.targetDate),
      facts: body.facts
    });
    if (intent.checkout_url && intent.stripe_checkout_session_id) {
      return sendJson(res, 200, { checkoutSessionId: intent.stripe_checkout_session_id, url: intent.checkout_url, reused: true });
    }

    const session = await stripePost<{ id: string; url: string }>("checkout/sessions", {
      mode: "payment",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      success_url: reportUrl("/reports/?friend_checkout=success&session_id={CHECKOUT_SESSION_ID}", req),
      cancel_url: reportUrl("/reports/?friend_checkout=cancel", req),
      client_reference_id: user.id,
      customer_email: user.email,
      "metadata[purchase_kind]": "friend_transit_reading",
      "metadata[user_id]": user.id,
      "metadata[friend_checkout_intent_id]": intent.id,
      "metadata[subject_id]": intent.subject_id,
      "metadata[target_date]": intent.target_date,
      "payment_intent_data[metadata][purchase_kind]": "friend_transit_reading",
      "payment_intent_data[metadata][user_id]": user.id,
      "payment_intent_data[metadata][friend_checkout_intent_id]": intent.id
    }, fetch, `friend-report-checkout-${intent.id}`);
    await recordFriendReportCheckoutSession({
      intentId: intent.id,
      checkoutSessionId: session.id,
      checkoutUrl: session.url
    });
    return sendJson(res, 200, { checkoutSessionId: session.id, url: session.url, reused: false });
  } catch (error) {
    console.error("friend-report-checkout failed", error);
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not create Friends report checkout." });
  }
}
