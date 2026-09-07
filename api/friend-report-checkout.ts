import type { IncomingMessage, ServerResponse } from "node:http";
import { friendTransitReadingRequestLock } from "./_lib/friend-transit-reading.js";
import {
  FRIEND_REPORT_PRODUCT_KEY,
  attachFriendCheckoutSession,
  ensurePendingStripeFriendReportEntitlement,
  friendReportBillingMode,
  friendReportPriceId
} from "./_lib/friend-report-lifecycle.js";
import { jsonRequestBody, reportUrl, requireReportUser, sendJson } from "./_lib/report-http.js";
import { stripePost } from "./_lib/stripe-report-billing.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";

type FriendReportCheckoutRequest = {
  subjectId?: string;
  targetDate?: string;
  facts?: Record<string, unknown>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  if (friendReportBillingMode() !== "stripe") {
    return sendJson(res, 503, {
      configured: false,
      billingMode: "free_test",
      error: "Friends report checkout is disabled during free testing."
    });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return sendJson(res, 503, { configured: false, billingMode: "stripe", error: "Friends report checkout is not configured." });
  }

  try {
    const user = await requireReportUser(req);
    const body = await jsonRequestBody<FriendReportCheckoutRequest>(req);
    const subjectId = stringValue(body.subjectId);
    const targetDate = stringValue(body.targetDate);
    const locked = friendTransitReadingRequestLock({
      brief: body.facts?.friendTransitsBrief,
      subjectId,
      targetDate
    });
    const priceId = friendReportPriceId();
    if (!priceId) throw new Error("STRIPE_FRIEND_TRANSIT_READING_PRICE is not configured.");

    const admin = createSupabaseReportAdmin();
    const entitlement = await ensurePendingStripeFriendReportEntitlement({
      admin,
      userId: user.id,
      subjectId,
      contentKey: locked.contentKey,
      targetDate,
      friendName: locked.brief.friendName,
      brief: locked.brief
    });
    if (entitlement.status === "active") {
      return sendJson(res, 200, { alreadyPurchased: true, contentKey: locked.contentKey });
    }

    const session = await stripePost<{ id: string; url: string }>("checkout/sessions", {
      mode: "payment",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      success_url: reportUrl("/reports/?purchase=friends-complete", req),
      cancel_url: reportUrl("/reports/?purchase=friends-cancelled", req),
      client_reference_id: user.id,
      customer_email: user.email,
      "metadata[user_id]": user.id,
      "metadata[product_kind]": "friend_transit_reading",
      "metadata[product_key]": FRIEND_REPORT_PRODUCT_KEY,
      "metadata[entitlement_id]": entitlement.id,
      "metadata[content_key]": locked.contentKey,
      "metadata[target_date]": targetDate,
      "payment_intent_data[metadata][user_id]": user.id,
      "payment_intent_data[metadata][product_kind]": "friend_transit_reading",
      "payment_intent_data[metadata][entitlement_id]": entitlement.id
    });
    await attachFriendCheckoutSession({ admin, entitlementId: entitlement.id, checkoutSessionId: session.id });
    return sendJson(res, 200, { checkoutSessionId: session.id, url: session.url });
  } catch (error) {
    console.error("friend-report-checkout failed", error);
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not create Friends report checkout." });
  }
}
