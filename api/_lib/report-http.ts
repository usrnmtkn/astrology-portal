import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "./admin-auth.js";

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

export async function rawRequestBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

export async function jsonRequestBody<T>(req: IncomingMessage) {
  const raw = await rawRequestBody(req);
  return (raw ? JSON.parse(raw) : {}) as T;
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function reportUrl(path: string, req?: IncomingMessage) {
  const configured = (process.env.APP_URL ?? process.env.VITE_APP_URL ?? "").replace(/\/$/u, "");
  if (configured) return `${configured}${path}`;
  const host = firstHeader(req?.headers["x-forwarded-host"]) ?? firstHeader(req?.headers.host);
  if (!host) return path;
  const protocol = firstHeader(req?.headers["x-forwarded-proto"]) ?? "https";
  return `${protocol}://${host}${path}`;
}

function bearerToken(req: IncomingMessage) {
  return req.headers.authorization?.match(/^Bearer\s+(.+)$/iu)?.[1] ?? "";
}

export async function requireReportUser(req: IncomingMessage, fetchImpl: typeof fetch = fetch) {
  const token = bearerToken(req);
  if (!token) throw new Error("Sign in before purchasing or viewing a report.");
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase authentication is not configured.");
  const response = await fetchImpl(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${token}` }
  });
  const payload = await response.json().catch(() => null) as { id?: string; user?: { id?: string }; email?: string } | null;
  const userId = payload?.id ?? payload?.user?.id;
  if (!response.ok || !userId) throw new Error("Could not verify the signed-in user.");
  return { id: userId, email: payload?.email ?? "" };
}

export function requireInternalRunner(req: IncomingMessage) {
  const secrets = [process.env.REPORT_FULFILLMENT_SECRET, process.env.CRON_SECRET].filter(Boolean);
  if (!secrets.length) return process.env.NODE_ENV !== "production";
  return secrets.some((secret) => req.headers.authorization === `Bearer ${secret}`);
}

export function requireReportAdmin(req: IncomingMessage) {
  return isContentAdminAuthorized(req);
}
