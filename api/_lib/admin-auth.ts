import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

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

async function verifiedAdminPrincipal(req: IncomingMessage, fetchImpl: typeof fetch) {
  const token = sessionToken(req);
  const { url, key } = supabaseAuthConfig();
  if (!token || !url || !key) return null;

  try {
    const response = await fetchImpl(`${url}/auth/v1/user`, {
      headers: { apikey: key, authorization: `Bearer ${token}` }
    });
    const payload = await response.json().catch(() => null) as {
      id?: unknown; email?: unknown;
      app_metadata?: { role?: unknown };
      user?: { id?: unknown; email?: unknown; app_metadata?: { role?: unknown } };
    } | null;
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
    return null;
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
