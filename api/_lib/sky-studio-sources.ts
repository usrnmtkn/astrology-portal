import { createHash } from "node:crypto";
import { adminFetchJson, AdminHttpError } from "./admin-http.js";
export function studioStorage() {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
        throw new AdminHttpError(503, "Content storage is not configured.");
    return { url: `${url.replace(/\/$/, "")}/rest/v1/generated_interpretations`, headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" } };
}
export async function approvedStudioPairSources() {
    const { url, headers } = studioStorage();
    const params = new URLSearchParams({ content_key: "like.source/sky-aspect-pair/*", status: "eq.REVIEWED", lane: "eq.reference", review_state: "is.null", select: "id,content_key,body,updated_at,source_snapshot", limit: "100" });
    const response = await adminFetchJson(`${url}?${params}`, { headers });
    if (!response.ok)
        throw new AdminHttpError(502, "Could not load approved source revisions. Retry after storage recovers.");
    const rows = response.payload as Array<Record<string, any>>;
    if (!Array.isArray(rows))
        throw new AdminHttpError(502, "Invalid source revision response.");
    return new Map(rows.filter(row => typeof row.source_snapshot?.pairKey === "string" && typeof row.body === "string" && row.body.trim())
        .map(row => [row.source_snapshot.pairKey, { path: `content-studio/${row.content_key}`, revision: { id: row.id, updatedAt: row.updated_at, bodyHash: createHash("sha256").update(row.body).digest("hex") },
            value: { id: row.source_snapshot.pairKey, status: "reviewed", studioRevision: { id: row.id, updatedAt: row.updated_at, bodyHash: createHash("sha256").update(row.body).digest("hex") }, sourceText: row.body, blend: row.body, harmonious: row.body, hard: row.body } }]));
}
