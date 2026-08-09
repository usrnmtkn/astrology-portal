import type { IncomingMessage, ServerResponse } from "node:http";
import { requireReportUser, sendJson } from "./_lib/report-http.js";
import { stripePost } from "./_lib/stripe-report-billing.js";
import { createSupabaseReportAdmin } from "./_lib/supabase-report-admin.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  try {
    const user = await requireReportUser(req);
    const admin = createSupabaseReportAdmin();
    const entitlement = await admin.selectOne<{ stripe_customer_id: string | null }>("report_entitlements", new URLSearchParams({
      user_id: `eq.${user.id}`,
      stripe_customer_id: "not.is.null",
      select: "stripe_customer_id",
      order: "purchased_at.desc"
    }));
    if (!entitlement?.stripe_customer_id) throw new Error("No Stripe customer is attached to this account.");
    const appUrl = (process.env.APP_URL ?? process.env.VITE_APP_URL ?? "http://localhost:5173").replace(/\/$/u, "");
    const session = await stripePost<{ url: string }>("billing_portal/sessions", {
      customer: entitlement.stripe_customer_id,
      return_url: `${appUrl}/reports`
    });
    sendJson(res, 200, { url: session.url });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Could not open the customer portal." });
  }
}
