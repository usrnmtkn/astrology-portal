import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, adminFetchJson, adminStorageRows, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { postgrestContentKeyPrefixAnd } from "../_lib/postgrest-content-key-prefix.js";

const inventoryColumns = [
  "id",
  "content_key",
  "surface",
  "mode",
  "status",
  "event_type",
  "target_date",
  "headline",
  "block_type",
  "lane",
  "review_state",
  "evergreen",
  "prompt_version",
  "provider",
  "updated_at"
] as const;

const detailColumns = [
  ...inventoryColumns,
  "summary",
  "body",
  "sections",
  "facts",
  "source_snapshot",
  "judge_score",
  "judge_gate",
  "reviewer_notes",
  "model"
] as const;

function supabaseUrl() {
  return (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
}

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

function storageHeaders() {
  const key = serviceRoleKey();
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    accept: "application/json"
  };
}

function boundedLimit(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), maximum);
}

function encodeCursor(row: { id?: unknown; updated_at?: unknown }) {
  if (typeof row.id !== "string" || typeof row.updated_at !== "string") return null;
  return Buffer.from(JSON.stringify({ id: row.id, updatedAt: row.updated_at }), "utf8").toString("base64url");
}

function decodeCursor(value: string) {
  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { id?: unknown; updatedAt?: unknown };
  if (typeof parsed.id !== "string" || typeof parsed.updatedAt !== "string") {
    throw new AdminHttpError(400, "cursor is invalid.");
  }
  return { id: parsed.id, updatedAt: parsed.updatedAt };
}

function inventoryRow(row: Record<string, unknown>) {
  return {
    ...row,
    body: null,
    summary: null,
    sections: null,
    facts: null,
    source_snapshot: null,
    inventory_only: true
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "GET") {
    sendAdminMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/admin/generated-content-inventory", "http://localhost");
    const id = requestUrl.searchParams.get("id");
    const contentKey = requestUrl.searchParams.get("contentKey");
    const contentKeyPrefix = requestUrl.searchParams.get("contentKeyPrefix");
    const contentKeys = requestUrl.searchParams.getAll("contentKeys");
    const visibility = requestUrl.searchParams.get("visibility") ?? "all";
    const scope = requestUrl.searchParams.get("scope") ?? "all";
    const cursor = requestUrl.searchParams.get("cursor");
    const mode = requestUrl.searchParams.get("mode");
    const view = requestUrl.searchParams.get("view") ?? (id || contentKey || contentKeys.length ? "detail" : "inventory");
    const inventoryView = view === "inventory" && !id && !contentKey && contentKeys.length === 0;
    if (contentKeyPrefix && !/^[a-zA-Z0-9][a-zA-Z0-9_./|-]*$/u.test(contentKeyPrefix)) {
      throw new AdminHttpError(400, "contentKeyPrefix is not a valid content-key prefix.");
    }
    if (mode && !/^[a-z0-9_-]+$/iu.test(mode)) {
      throw new AdminHttpError(400, "mode is not a valid generated-content mode.");
    }
    const limit = id ? 1 : inventoryView
      ? boundedLimit(requestUrl.searchParams.get("limit"), 50, 80)
      : boundedLimit(requestUrl.searchParams.get("limit"), 50, 80);
    const params = new URLSearchParams({
      select: (inventoryView ? inventoryColumns : detailColumns).join(","),
      order: scope === "compatibility" ? "id.asc" : "updated_at.desc,id.desc",
      limit: String(limit)
    });
    if (id) {
      params.set("id", `eq.${id}`);
    } else if (scope === "compatibility") {
      params.set("or", "(content_key.like.compatibility.*,content_key.like.compatibility/*,content_key.like.authored/compat-*,content_key.like.fallback-hook/friends*,content_key.like.fallback-hook/relationship*,content_key.like.fallback-hook/synastry*,content_key.like.fallback-hook/compat-*)");
      if (cursor) params.set("id", `gt.${cursor}`);
    } else if (visibility === "editorial") {
      params.set("lane", "eq.serving");
      params.set("status", "neq.ARCHIVED");
    }
    if (!id && scope !== "compatibility" && cursor) {
      const decoded = decodeCursor(cursor);
      params.set("updated_at", `lte.${decoded.updatedAt}`);
      params.set("or", `(updated_at.lt.${decoded.updatedAt},and(updated_at.eq.${decoded.updatedAt},id.lt.${decoded.id}))`);
    }
    if (!id && mode) params.set("mode", `eq.${mode}`);
    if (!id && contentKey) params.set("content_key", `eq.${contentKey}`);
    else if (!id && contentKeys.length) params.set("content_key", `in.(${contentKeys.join(",")})`);
    else if (!id && contentKeyPrefix) params.set("and", postgrestContentKeyPrefixAnd(contentKeyPrefix));

    const url = supabaseUrl();
    const key = serviceRoleKey();
    if (!url || !key) throw new AdminHttpError(500, "Content storage is not configured.");
    const response = await adminFetchJson(`${url}/rest/v1/generated_interpretations?${params}`, {
      headers: storageHeaders()
    });
    if (!response.ok) {
      throw new AdminHttpError(502, "Content storage could not return the inventory list.");
    }
    const rows = adminStorageRows<Record<string, unknown>>(response.payload).map((row) => (
      inventoryView ? inventoryRow(row) : { ...row, inventory_only: false }
    ));
    const nextCursor = !id && rows.length === limit
      ? scope === "compatibility"
        ? String(rows.at(-1)?.id ?? "")
        : encodeCursor(rows.at(-1) ?? {})
      : null;
    sendAdminJson(res, 200, { ok: true, rows, nextCursor });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Could not load Content Studio inventory.")
    });
  }
}
