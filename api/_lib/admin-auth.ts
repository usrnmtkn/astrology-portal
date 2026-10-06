import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { sendAdminJson } from "./admin-http.js";

export const CONTENT_ADMIN_SECRET_HEADER = "x-content-generation-secret";
export const CONTENT_ADMIN_SESSION_HEADER = "x-content-admin-session";

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function bearerSecret(req: IncomingMessage) {
  return firstHeader(req.headers.authorization)?.match(/^Bearer\s+(.+)$/iu)?.[1];
}

function normalizeSecret(value: string | undefined) {
  return value?.trim() ?? "";
}

function sessionToken(req: IncomingMessage) {
  return normalizeSecret(firstHeader(req.headers[CONTENT_ADMIN_SESSION_HEADER]));
}

function suppliedSecrets(req: IncomingMessage) {
  return [
    firstHeader(req.headers[CONTENT_ADMIN_SECRET_HEADER]),
    bearerSecret(req)
  ]
    .map(normalizeSecret)
    .filter(Boolean);
}

function secretsMatch(supplied: string, expected: string) {
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

function supabaseAuthConfig() {
  // Content Studio forwards the browser session issued by the Vite app. Verify
  // it against that same Supabase project even when unrelated server jobs use a
  // different SUPABASE_URL.
  const url = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/u, "");
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.VITE_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? "";
  return { url, key };
}

function configuredOwnerEmails() {
  return new Set(
    (process.env.CONTENT_ADMIN_EMAILS ?? "")
      .split(/[\s,]+/u)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

const unavailableVerifications = new WeakSet<IncomingMessage>();
export function contentAdminVerificationUnavailable(req: IncomingMessage) {
  return unavailableVerifications.has(req);
}

async function verifiedAdminPrincipal(req: IncomingMessage, fetchImpl: typeof fetch) {
  const token = sessionToken(req);
  const { url, key } = supabaseAuthConfig();
  if (!token) return null;
  if (!url || !key) { unavailableVerifications.add(req); return null; }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetchImpl(`${url}/auth/v1/user`, {
      signal: controller.signal,
      headers: { apikey: key, authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) unavailableVerifications.add(req);
      return null;
    }
    const payload = await response.json() as {
      id?: unknown; email?: unknown;
      app_metadata?: { role?: unknown };
      user?: { id?: unknown; email?: unknown; app_metadata?: { role?: unknown } };
    } | null;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid Auth response");
    const role = payload?.app_metadata?.role ?? payload?.user?.app_metadata?.role;
    const email = payload?.email ?? payload?.user?.email;
    const verifiedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const allowed = response.ok && (
      role === "admin"
      || (verifiedEmail !== "" && configuredOwnerEmails().has(verifiedEmail))
    );
    if (!allowed) return null;
    const id = payload?.id ?? payload?.user?.id;
    return typeof id === "string" && id.trim() ? `user:${id}` : verifiedEmail ? `owner:${createHash("sha256").update(verifiedEmail).digest("hex")}` : null;
  } catch {
    unavailableVerifications.add(req);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const verifiedPrincipals = new WeakMap<IncomingMessage, string>();

export async function getContentAdminPrincipal(req: IncomingMessage, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const cached = verifiedPrincipals.get(req);
  if (cached) return cached;
  const expected = normalizeSecret(process.env.CONTENT_GENERATION_SECRET);
  const principal = expected && suppliedSecrets(req).some(supplied => secretsMatch(supplied, expected))
    ? "content-admin-secret"
    : !expected && process.env.NODE_ENV !== "production" && !sessionToken(req)
      ? "local-development" : await verifiedAdminPrincipal(req, fetchImpl);
  if (principal) verifiedPrincipals.set(req, principal);
  return principal;
}

export async function isContentAdminAuthorized(req: IncomingMessage, fetchImpl: typeof fetch = fetch) {
  return Boolean(await getContentAdminPrincipal(req, fetchImpl));
}

// Keep outages distinct from rejected credentials, while failing closed in both
// cases. No handler may reach storage until the verified principal is available.
export async function requireContentAdmin(req: IncomingMessage, res: ServerResponse) {
  if (await isContentAdminAuthorized(req)) return true;
  const unavailable = contentAdminVerificationUnavailable(req);
  sendAdminJson(res, unavailable ? 503 : 401, { ok: false, authFailure: unavailable ? "content_admin_verification_unavailable" : "content_admin_unauthorized", error: unavailable
    ? "Content Studio sign-in verification is temporarily unavailable. Try again; no changes were submitted."
    : "Unauthorized." });
  return false;
}
