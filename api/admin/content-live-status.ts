import { publicationLedgerKey, validContentPublication, publicationTimestamp } from "../../apps/web/src/content/contentPublicationState.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
loadLocalWebEnv();
import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminFetchJson, adminStorageRows, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed, adminErrorStatus, adminErrorMessage } from "../_lib/admin-http.js";
import { contentLiveStatuses, servingPackageRecords, builtinContentRecords, isSkyPartitionKey, type LiveStatusRow } from "../_lib/content-live-status.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) return sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
  if (req.method !== "POST") return sendAdminMethodNotAllowed(res, ["POST"]);
  try {
    const body = await readAdminJsonBody<{ ids?: string[]; action?: string }>(req);
    if (body.action === "composition-catalog") {
      const rows = [...servingPackageRecords.values()]
        .filter((record) => /^(?:fallback-hook|fallback-template|fallback-vocab|vocab|slot-template|sky-placement|sky-context|sky-nodes|sky-lilith)\//.test(record.contentKey))
        .map((record) => ({ content_key: record.contentKey, headline: record.headline ?? null, role: record.content_role }));
      return sendAdminJson(res, 200, { ok: true, rows });
    }
    if (body.action !== undefined) throw new AdminHttpError(400, "Invalid live-status action.");
    if (!Array.isArray(body.ids) || body.ids.length > 64 || body.ids.some((id) => typeof id !== "string" || !/^[a-zA-Z0-9_./:|-]+$/.test(id))) throw new AdminHttpError(400, "Provide at most 64 content row IDs.");
    const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new Error("Content storage is not configured.");
    const headers = { apikey: key, authorization: `Bearer ${key}` };
    const select = "id,content_key,target_date,status,lane,review_state,updated_at,provider,headline,summary,body,sections,source_snapshot,facts,mode,flags,surface,event_type";
    async function read(params: URLSearchParams, table = "generated_interpretations") {
      const response = await adminFetchJson(`${base}/rest/v1/${table}?${params}`, { headers });
      const result = response.payload;
      if (!response.ok) throw new AdminHttpError(502, "Could not verify content status.");
      return adminStorageRows<LiveStatusRow>(result);
    }
    const ids = body.ids.filter((id) => !id.startsWith("package:") && !id.startsWith("builtin:") && !id.startsWith("user:"));
    const rows = ids.length ? await read(new URLSearchParams({ select, id: `in.(${ids.join(",")})` })) : [];
    for (const id of body.ids.filter(id => id.startsWith("builtin:"))) {
      rows.push(builtinContentRecords.get(id.slice(8)) ?? { id, content_key: id.slice(8) });
    }
    for (const id of body.ids.filter((id) => id.startsWith("package:"))) {
      const source = servingPackageRecords.get(id.slice(8));
      rows.push({ id, content_key: id.slice(8), ...(source ? { sections: { packageRecord: source } } : {}) });
    }
    const keys = [...new Set(rows.map((row) => row.content_key))];
    const candidates = keys.length ? await read(new URLSearchParams({ select, content_key: `in.(${keys.map((key) => `"${key.replaceAll('"', '')}"`).join(",")})`, order: "updated_at.desc,id.desc" })) : [];
    const publications = new Map();
    if (keys.length) {
      const keyFilter = [...keys, publicationLedgerKey].map((key) => `"${key.replaceAll('"', '')}"`).join(",");
      for (let offset = 0; ; offset += 1000) {
        const params = new URLSearchParams({ select: "content_key,state,revision,row_id,row_updated_at,updated_at", order: "content_key.asc", limit: "1000", offset: String(offset) });
        params.set("content_key", `in.(${keyFilter})`);
        const response = await adminFetchJson(`${base}/rest/v1/content_publications?${params}`, { headers });
        const records: unknown = response.payload;
        if (!response.ok || !Array.isArray(records) || !records.every(validContentPublication)) throw new AdminHttpError(502, "Could not verify publication status.");
        for (const record of records) publications.set(record.content_key, record);
        if (records.length < 1000) break;
      }
    }
    if (!publications.has(publicationLedgerKey) && rows.some((row) => isSkyPartitionKey(row.content_key))) {
      // The reader accepts this partition only as a complete, valid mirror.
      const partition: LiveStatusRow[] = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await read(new URLSearchParams({ select, provider: "eq.tldrastro-fallback-architecture-v3-sky-placement", order: "id.asc", limit: "1000", offset: String(offset) }));
        partition.push(...page);
        if (page.length < 1000) break;
      }
      const ids = new Set(partition.map((row) => row.id));
      candidates.splice(0, candidates.length, ...candidates.filter((row) => !ids.has(row.id)), ...partition);
    }
    const allowsPublication = (row: LiveStatusRow) => {
      const publication = publications.get(row.content_key);
      return (!publication && (!publications.has(publicationLedgerKey) || Boolean(row.target_date))) || publication?.state === "live" && (Boolean(row.target_date) || row.id === publication.row_id
        && row.updated_at && publication.row_updated_at && publicationTimestamp(row.updated_at) === publicationTimestamp(publication.row_updated_at));
    };
    const statuses = contentLiveStatuses(rows, candidates, allowsPublication, (row) => publications.get(row.content_key)?.state === "live" && Boolean(allowsPublication(row)));
    for (const status of statuses) {
      const publication = publications.get(rows.find((row) => row.id === status.id)?.content_key);
      if (publication && (publication.state === "retired" || status.source === "package")) {
        status.live = false; status.label = "Not live"; status.source = null;
        status.detail = publication.state === "retired"
          ? "Retired everywhere. Devices apply this retirement when they reconnect."
          : "This is not the current published version. Older bundled writing cannot replace it.";
      }
    }
    const userIds = body.ids.filter((id) => id.startsWith("user:")).map((id) => id.slice(5));
    if (userIds.length) {
      const userSelect = "id,user_id,subject_type,subject_id,content_key,target_date,status,body,updated_at";
      const users = await read(new URLSearchParams({ select: userSelect, id: `in.(${userIds.join(",")})` }), "user_generated_interpretations") as Array<LiveStatusRow & { user_id: string; subject_type: string; subject_id: string; target_date: string | null }>;
      for (let offset = 0; offset < users.length; offset += 8) {
        await Promise.all(users.slice(offset, offset + 8).map(async (row) => {
        // Match the personalized reader query, including its queued Friends reports.
        const latest = await read(new URLSearchParams({ select: userSelect, user_id: `eq.${row.user_id}`, subject_type: `eq.${row.subject_type}`, subject_id: `eq.${row.subject_id}`, content_key: `eq.${row.content_key}`, target_date: row.target_date ? `eq.${row.target_date}` : "is.null", status: row.subject_type === "friend_transit_reading" ? "in.(DRAFT,REVIEWED,LIVE,ERROR)" : "eq.LIVE", order: "updated_at.desc", limit: "1" }), "user_generated_interpretations");
        const live = latest[0]?.id === row.id && row.status !== "ERROR" && Boolean(row.body?.trim());
        statuses.push({ id: `user:${row.id}`, live, label: live ? "Live" : "Not live", detail: live ? "This reader can currently receive this copy." : "This reader cannot currently receive this copy.", source: live ? "studio" : null, updatedAt: row.updated_at ?? null });
        }));
      }
    }
    sendAdminJson(res, 200, { ok: true, statuses });
  } catch (error) { sendAdminJson(res, adminErrorStatus(error), { ok: false, error: adminErrorMessage(error, "Unable to verify live status.") }); }
}
