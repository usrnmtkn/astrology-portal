import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, adminFetchJson, adminStorageRows, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { postgrestContentKeyPrefixAnd } from "../_lib/postgrest-content-key-prefix.js";
import { studioListingRow, type StudioListingFacts } from "../_lib/studio-listing-facts.js";

const inventoryColumns = [
  "id",
  "content_key",
  // Listing facts: a row's group, title, and review-queue membership, without its documents.
  "studio_facts",
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

// A list row keeps the small facts the Studio classifies and groups by, and leaves the copy behind.
function inventoryRow(row: Record<string, unknown>) {
  const stored = row.studio_facts;
  const facts = stored && typeof stored === "object" && !Array.isArray(stored)
    ? stored as StudioListingFacts
    : {};
  return studioListingRow(row, facts);
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
    const status = requestUrl.searchParams.get("status") ?? "all";
    const surface = requestUrl.searchParams.get("surface");
    const scope = requestUrl.searchParams.get("scope") ?? "all";
    const cursor = requestUrl.searchParams.get("cursor");
    const mode = requestUrl.searchParams.get("mode");
    const view = requestUrl.searchParams.get("view") ?? (id || contentKey || contentKeys.length ? "detail" : "inventory");
    const inventoryView = view === "inventory" && !id && !contentKey && contentKeys.length === 0;
    const allowedStatus = new Set(["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "ERROR"]);
    const allowedSurface = new Set(["sky", "you", "natal", "synastry", "composite", "relationship", "modifier", "year_ahead", "education"]);
    if (contentKeyPrefix && !/^[a-zA-Z0-9][a-zA-Z0-9_./|-]*$/u.test(contentKeyPrefix)) {
      throw new AdminHttpError(400, "contentKeyPrefix is not a valid content-key prefix.");
    }
    if (mode && !/^[a-z0-9_-]+$/iu.test(mode)) {
      throw new AdminHttpError(400, "mode is not a valid generated-content mode.");
    }
    if (status !== "all" && !allowedStatus.has(status)) {
      throw new AdminHttpError(400, "status is not a valid generated-content status.");
    }
    if (surface && !allowedSurface.has(surface)) {
      throw new AdminHttpError(400, "surface is not a valid generated-content surface.");
    }
    const limit = id ? 1 : inventoryView
      ? boundedLimit(requestUrl.searchParams.get("limit"), 50, 80)
      : boundedLimit(requestUrl.searchParams.get("limit"), 50, 200);
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
      if (status === "all") params.set("status", "neq.ARCHIVED");
    }
    if (!id && status !== "all") params.set("status", `eq.${status}`);
    if (!id && surface) params.set("surface", `eq.${surface}`);
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
    let response = await adminFetchJson(`${url}/rest/v1/generated_interpretations?${params}`, {
      headers: storageHeaders()
    });
    // The listing-facts column arrives with its migration. Until then the list still has to load,
    // so the request is repeated without it and rows carry only their columns.
    if (!response.ok && JSON.stringify(response.payload ?? "").includes("studio_facts")) {
      params.set("select", (inventoryView ? inventoryColumns : detailColumns).filter((column) => column !== "studio_facts").join(","));
      response = await adminFetchJson(`${url}/rest/v1/generated_interpretations?${params}`, {
        headers: storageHeaders()
      });
    }
    if (!response.ok) {
      throw new AdminHttpError(502, "Content storage could not return the inventory list.");
    }
    const rows = adminStorageRows<Record<string, unknown>>(response.payload).map((row) => {
      if (inventoryView) return inventoryRow(row);
      const { studio_facts: _listingFacts, ...document } = row;
      return { ...document, inventory_only: false };
    });
    const nextCursor = !id && rows.length === limit
      ? scope === "compatibility"
        ? String(rows.at(-1)?.id ?? "")
        : encodeCursor(rows.at(-1) ?? {})
      : null;
    const pageIsComplete = !nextCursor;
    const {
      LUNAR_JOURNAL_PREFIX,
      isLunarJournalContentKey,
      lunarJournalDetailRow,
      lunarJournalInventoryRow,
      lunarJournalPackageRecordForKey,
      lunarJournalPackageRecords
    } = await import("../_lib/lunar-journal-sources.js");
    const {
      CALENDAR_SEASON_TRANSITION_PREFIX,
      calendarSeasonTransitionDetailRow,
      calendarSeasonTransitionInventoryRow,
      calendarSeasonTransitionPackageRecordForKey,
      calendarSeasonTransitionPackageRecords,
      isCalendarSeasonTransitionContentKey
    } = await import("../_lib/calendar-season-transition-sources.js");
    const prefixIsJournal = contentKeyPrefix === LUNAR_JOURNAL_PREFIX
      || contentKeyPrefix === "authored/lunar-journal";
    const requestedJournalKeys = [
      ...contentKeys.filter((key) => isLunarJournalContentKey(key)),
      ...(contentKey && isLunarJournalContentKey(contentKey) ? [contentKey] : [])
    ];
    if (!id && (prefixIsJournal || requestedJournalKeys.length) && pageIsComplete) {
      const savedKeys = new Set(rows.map((row) => String(row.content_key ?? "")));
      const records = requestedJournalKeys.length
        ? requestedJournalKeys.flatMap((key) => {
          const record = lunarJournalPackageRecordForKey(key);
          return record ? [record] : [];
        })
        : lunarJournalPackageRecords;
      for (const record of records) {
        if (savedKeys.has(record.contentKey)) continue;
        rows.push(inventoryView ? lunarJournalInventoryRow(record) : lunarJournalDetailRow(record));
      }
    }
    const prefixIsSeasonTransition = contentKeyPrefix === CALENDAR_SEASON_TRANSITION_PREFIX
      || contentKeyPrefix === "authored/calendar-season-transition";
    const requestedSeasonKeys = [
      ...contentKeys.filter((key) => isCalendarSeasonTransitionContentKey(key)),
      ...(contentKey && isCalendarSeasonTransitionContentKey(contentKey) ? [contentKey] : [])
    ];
    if (!id && (prefixIsSeasonTransition || requestedSeasonKeys.length) && pageIsComplete) {
      const savedKeys = new Set(rows.map((row) => String(row.content_key ?? "")));
      const records = requestedSeasonKeys.length
        ? requestedSeasonKeys.flatMap((key) => {
          const record = calendarSeasonTransitionPackageRecordForKey(key);
          return record ? [record] : [];
        })
        : calendarSeasonTransitionPackageRecords;
      for (const record of records) {
        if (savedKeys.has(record.contentKey)) continue;
        rows.push(inventoryView ? calendarSeasonTransitionInventoryRow(record) : calendarSeasonTransitionDetailRow(record));
      }
    }
    sendAdminJson(res, 200, { ok: true, rows, nextCursor });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Could not load Content Studio inventory.")
    });
  }
}
