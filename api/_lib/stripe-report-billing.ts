import crypto from "node:crypto";

type FetchLike = typeof fetch;

function requireStripeSecret() {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return value;
}

function stripeFormValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function stripeForm(fields: Record<string, unknown>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    form.set(key, stripeFormValue(value));
  }
  return form;
}

export async function stripePost<T>(path: string, fields: Record<string, unknown>, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`https://api.stripe.com/v1/${path.replace(/^\//u, "")}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${requireStripeSecret()}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: stripeForm(fields)
  });
  const payload = await response.json().catch(() => null) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Stripe ${path} failed with ${response.status}.`);
  }
  return payload;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyStripeWebhookSignature(input: {
  payload: string;
  signatureHeader: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}) {
  const parts = input.signatureHeader.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1] ?? "";
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  const timestampNumber = Number.parseInt(timestamp, 10);
  if (!timestamp || !Number.isFinite(timestampNumber) || signatures.length === 0) return false;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampNumber) > (input.toleranceSeconds ?? 300)) return false;
  const expected = crypto.createHmac("sha256", input.secret)
    .update(`${timestamp}.${input.payload}`, "utf8")
    .digest("hex");
  return signatures.some((signature) => safeEqual(expected, signature));
}

export type StripeEvent = {
  id: string;
  type: string;
  created?: number;
  data: { object: Record<string, unknown> };
};

export function parseVerifiedStripeEvent(payload: string, signatureHeader: string): StripeEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  if (!verifyStripeWebhookSignature({ payload, signatureHeader, secret })) {
    throw new Error("Stripe webhook signature verification failed.");
  }
  const event = JSON.parse(payload) as StripeEvent;
  if (!event.id || !event.type || !event.data?.object) throw new Error("Stripe webhook payload is incomplete.");
  return event;
}
