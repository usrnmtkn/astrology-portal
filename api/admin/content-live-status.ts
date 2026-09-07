import { loadLocalWebEnv } from "../_lib/local-env.js";
loadLocalWebEnv();
import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminFetch, readAdminJsonBody, sendAdminJson, adminErrorStatus, adminErrorMessage } from "../_lib/admin-http.js";
import { contentLiveStatuses, servingPackageRecords, isSkyPartitionKey, type LiveStatusRow } from "../_lib/content-live-status.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) return sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
  if (req.method !== "POST") return sendAdminJson(res, 405, { ok: false, error: "Use POST." });
  try {
    const body = await readAdminJsonBody<{ ids?: string[] }>(req);
    if (!Array.isArray(body.ids) || body.ids.length > 64 || body.ids.some((id) => typeof id !== "string" || !/^[a-zA-Z0-9_./:|-]+$/.test(id))) throw new AdminHttpError(400, "Provide at most 64 content row IDs.");
    const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new Error("Content storage is not configured.");
    const headers = { apikey: key, authorization: `Bearer ${key}` };
    const select = "id,content_key,status,lane,review_state,updated_at,provider,headline,summary,body,sections,source_snapshot,facts,mode,flags,surface,event_type";
    async function read(params: URLSearchParams, table = "generated_interpretations") {
      const response = await adminFetch(`${base}/rest/v1/${table}?${params}`, { headers });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) throw new Error("Could not verify content status.");
      return result as LiveStatusRow[];
    }
    const ids = body.ids.filter((id) => !id.startsWith("package:") && !id.startsWith("user:"));
    const rows = ids.length ? await read(new URLSearchParams({ select, id: `in.(${ids.join(",")})` })) : [];
    for (const id of body.ids.filter((id) => id.startsWith("package:"))) {
      const source = servingPackageRecords.get(id.slice(8));
      rows.push({ id, content_key: id.slice(8), ...(source ? { sections: { packageRecord: source } } : {}) });
    }
    const keys = [...new Set(rows.map((row) => row.content_key))];
    const candidates = keys.length ? await read(new URLSearchParams({ select, content_key: `in.(${keys.map((key) => `"${key.replaceAll('"', '')}"`).join(",")})`, order: "updated_at.desc,id.desc" })) : [];
    if (rows.some((row) => isSkyPartitionKey(row.content_key))) {
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
    const statuses = contentLiveStatuses(rows, candidates);
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
  } catch (error) { sendAdminJson(res, adminErrorStatus(error), { ok: false, error: adminErrorMessage(error) }); }
}
