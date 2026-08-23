import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

export const CONTENT_ADMIN_SECRET_HEADER = "x-content-generation-secret";
export const CONTENT_ADMIN_SESSION_HEADER = "x-content-admin-session";

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function bearerSecret(req: IncomingMessage) {
  return firstHeader(req.headers.authorization)?.match(/^Bearer\s+(.+)$/iu)?.[1];
}

function suppliedSecrets(req: IncomingMessage) {
  return [
    firstHeader(req.headers[CONTENT_ADMIN_SECRET_HEADER]),
    bearerSecret(req)
  ].filter((value): value is string => typeof value === "string");
}

function sessionToken(req: IncomingMessage) {
  return firstHeader(req.headers[CONTENT_ADMIN_SESSION_HEADER]) ?? bearerSecret(req);
}

function secretsMatch(supplied: string, expected: string) {
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

function allowedAdminUserIds() {
  return new Set(
    (process.env.CONTENT_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

async function isAllowedSignedInAdmin(req: IncomingMessage, fetchImpl: typeof fetch) {
  const token = sessionToken(req);
  const allowedUserIds = allowedAdminUserIds();
  if (!token || allowedUserIds.size === 0) return false;

  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return false;

  try {
    const response = await fetchImpl(`${url}/auth/v1/user`, {
      headers: { apikey: key, authorization: `Bearer ${token}` }
    });
    const payload = await response.json().catch(() => null) as { id?: string; user?: { id?: string } } | null;
    const userId = payload?.id ?? payload?.user?.id;
    return response.ok && Boolean(userId && allowedUserIds.has(userId));
  } catch {
    return false;
  }
}

export async function isContentAdminAuthorized(req: IncomingMessage, fetchImpl: typeof fetch = fetch) {
  const expected = process.env.CONTENT_GENERATION_SECRET;
  if (expected && suppliedSecrets(req).some((supplied) => secretsMatch(supplied, expected))) {
    return true;
  }
  if (!expected && process.env.NODE_ENV !== "production") return true;
  return isAllowedSignedInAdmin(req, fetchImpl);
}
