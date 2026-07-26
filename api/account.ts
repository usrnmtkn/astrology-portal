import type { IncomingMessage, ServerResponse } from "node:http";
import { loadLocalWebEnv } from "./_lib/local-env.js";

loadLocalWebEnv();

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function bearerToken(req: IncomingMessage) {
  const authorization = req.headers.authorization ?? "";

  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "DELETE") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const token = bearerToken(req);

  if (!token) {
    sendJson(res, 401, { error: "Sign in before deleting your account." });
    return;
  }

  try {
    const serviceKey = serviceRoleKey();
    const userResponse = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${token}`
      }
    });
    const userPayload = await userResponse.json().catch(() => null) as { id?: unknown } | null;

    if (!userResponse.ok || typeof userPayload?.id !== "string") {
      sendJson(res, 401, { error: "Your session could not be verified." });
      return;
    }

    const deleteResponse = await fetch(
      `${supabaseUrl()}/auth/v1/admin/users/${encodeURIComponent(userPayload.id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`
        }
      }
    );

    if (!deleteResponse.ok) {
      const payload = await deleteResponse.json().catch(() => null);
      console.error("Account deletion failed.", {
        status: deleteResponse.status,
        userId: userPayload.id,
        payload
      });
      sendJson(res, 502, { error: "Your account could not be deleted. Please try again." });
      return;
    }

    sendJson(res, 200, { deleted: true });
  } catch (error) {
    console.error("Account deletion endpoint failed.", {
      message: error instanceof Error ? error.message : "Unknown account deletion error."
    });
    sendJson(res, 500, { error: "Your account could not be deleted. Please try again." });
  }
}
