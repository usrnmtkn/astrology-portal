import { studioScopeStorageFilter } from "../../apps/admin/src/studioContentScope.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { requireContentAdmin } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, adminFetchJson, adminStorageRows, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { postgrestContentKeyPrefixAnd, postgrestQuotedValue } from "../_lib/postgrest-content-key-prefix.js";
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
  ...inventoryColumns.filter((column) => column !== "studio_facts"),
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
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { id?: unknown; updatedAt?: unknown };
    if (!parsed || typeof parsed.id !== "string" || !/^[a-zA-Z0-9_-]+$/u.test(parsed.id)
      || typeof parsed.updatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/u.test(parsed.updatedAt)
      || !Number.isFinite(Date.parse(parsed.updatedAt))) throw new Error("Invalid cursor");
    return { id: parsed.id, updatedAt: parsed.updatedAt };
  } catch {
    throw new AdminHttpError(400, "cursor is invalid.");
  }
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
  if (!await requireContentAdmin(req, res)) return;
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
    const scopeFilter = studioScopeStorageFilter(scope);
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
      ? boundedLimit(requestUrl.searchParams.get("limit"), 50, 400)
      : boundedLimit(requestUrl.searchParams.get("limit"), 50, 200);
    const params = new URLSearchParams({
      select: (inventoryView ? inventoryColumns : detailColumns).join(","),
      order: scopeFilter ? "id.asc" : "updated_at.desc,id.desc",
      limit: String(limit)
    });
    if (id) {
      params.set("id", `eq.${id}`);
    } else if (scopeFilter) {
      params.set("or", scopeFilter);
      if (cursor) params.set("id", `gt.${cursor}`);
    } else if (visibility === "editorial") {
      params.set("lane", "eq.serving");
      if (status === "all") params.set("status", "neq.ARCHIVED");
    }
    if (!id && status !== "all") params.set("status", `eq.${status}`);
    if (!id && surface) params.set("surface", `eq.${surface}`);
    if (!id && !scopeFilter && cursor) {
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
      ? scopeFilter
        ? String(rows.at(-1)?.id ?? "")
        : encodeCursor(rows.at(-1) ?? {})
      : null;
    const pageIsComplete = !nextCursor;
    // Collect virtual sources separately. The final page alone cannot establish
    // that a source is unsaved: its saved row may be on a prior page or filtered out.
    const starters: Array<Record<string, unknown>> = [];
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
        starters.push(inventoryView ? lunarJournalInventoryRow(record) : lunarJournalDetailRow(record));
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
        starters.push(inventoryView ? calendarSeasonTransitionInventoryRow(record) : calendarSeasonTransitionDetailRow(record));
      }
    }
    const moonPrefix = "authored/calendar-moon-transition/";
    const requestedMoonKeys = [...contentKeys, ...(contentKey ? [contentKey] : [])].filter(key => key.startsWith(moonPrefix));
    if (!id && (contentKeyPrefix === moonPrefix || requestedMoonKeys.length) && pageIsComplete) {
      const { calendarMoonIngressPackageRecords, calendarMoonIngressInventoryRow, calendarMoonIngressDetailRow } = await import("../_lib/calendar-moon-ingress-sources.js");
      const savedKeys = new Set(rows.map(row => String(row.content_key ?? "")));
      const records = requestedMoonKeys.length ? calendarMoonIngressPackageRecords.filter(record => requestedMoonKeys.includes(record.contentKey)) : calendarMoonIngressPackageRecords;
      for (const record of records) {
        if (savedKeys.has(record.contentKey)) continue;
        starters.push(inventoryView ? calendarMoonIngressInventoryRow(record) : calendarMoonIngressDetailRow(record));
      }
    }
    if (!id && pageIsComplete) {
      const { calendarTransitionPhraseRecords, calendarTransitionPhraseInventoryRow, calendarTransitionPhraseDetailRow } = await import("../_lib/calendar-transition-phrase-sources.js");
      const savedKeys = new Set(rows.map(row => String(row.content_key ?? "")));
      for (const record of calendarTransitionPhraseRecords) {
        const requested = contentKeys.includes(record.contentKey) || contentKey === record.contentKey
          || Boolean(contentKeyPrefix && record.contentKey.startsWith(contentKeyPrefix));
        if (!requested || savedKeys.has(record.contentKey)) continue;
        starters.push(inventoryView ? calendarTransitionPhraseInventoryRow(record) : calendarTransitionPhraseDetailRow(record));
      }
    }
    const eligibleStarters = [...new Map(starters.filter(row =>
      (status === "all" || row.status === status)
      && (!surface || row.surface === surface)
      && (!mode || row.mode === mode)
      && (visibility !== "editorial" || row.lane === "serving" && (status !== "all" || row.status !== "ARCHIVED"))
      && !scopeFilter
    ).map(row => [String(row.content_key), row])).values()];
    const savedKeys = new Set(rows.map(row => String(row.content_key)));
    // Bounded, indexed key-only reads preserve saved source precedence across
    // every page and state, without transferring or scanning full documents.
    for (let offset = 0; offset < eligibleStarters.length; offset += 80) {
      const keys = eligibleStarters.slice(offset, offset + 80).map(row => String(row.content_key));
      const presenceParams = new URLSearchParams({ select: "content_key", content_key: `in.(${keys.map(postgrestQuotedValue).join(",")})`, limit: "1000" });
      const presence = await adminFetchJson(`${url}/rest/v1/generated_interpretations?${presenceParams}`, { headers: storageHeaders() });
      if (!presence.ok) throw new AdminHttpError(502, "Content storage could not verify saved sources.");
      const existing = adminStorageRows<{ content_key?: unknown }>(presence.payload);
      // More than one revision may exist per key. Never interpret a truncated
      // or malformed existence result as permission to resurrect the original.
      if (existing.length >= 1000 || existing.some(row => typeof row.content_key !== "string" || !keys.includes(row.content_key))) {
        throw new AdminHttpError(502, "Content storage could not verify complete saved sources.");
      }
      for (const row of existing) savedKeys.add(String(row.content_key));
    }
    for (const starter of eligibleStarters) if (!savedKeys.has(String(starter.content_key))) rows.push(starter as typeof rows[number]);
    sendAdminJson(res, 200, { ok: true, rows, nextCursor });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Could not load Content Studio inventory.")
    });
  }
}
