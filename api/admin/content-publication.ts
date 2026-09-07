import { validContentPublication } from "../../apps/web/src/content/contentPublicationState.js";
import { contentLiveStatuses } from "../_lib/content-live-status.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
loadLocalWebEnv();
import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { adminFetch, readAdminJsonBody, sendAdminJson, adminErrorMessage } from "../_lib/admin-http.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) return sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
  if (req.method !== "POST") return sendAdminJson(res, 405, { ok: false, error: "Use POST." });
  try {
    const body = await readAdminJsonBody<{ action?: string; contentKey?: string; id?: string; expectedUpdatedAt?: string }>(req);
    if (!["retire", "publish"].includes(body.action ?? "") || !body.contentKey || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(body.id ?? "") || !Number.isFinite(Date.parse(body.expectedUpdatedAt ?? ""))) {
      return sendAdminJson(res, 400, { ok: false, error: "Select a saved source and its current version before changing publication." });
    }
    const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new Error("Content publication storage is unavailable.");
    if (body.action === "publish") {
      const sourceResponse = await adminFetch(`${base}/rest/v1/generated_interpretations?${new URLSearchParams({ select: "*", id: `eq.${body.id}` })}`, {
        headers: { apikey: key, authorization: `Bearer ${key}` }
      });
      const sources = await sourceResponse.json();
      if (!sourceResponse.ok || !Array.isArray(sources)) throw new Error("Could not verify the saved version.");
      const source = sources[0];
      const candidates = [...sources];
      if (!source || source.content_key !== body.contentKey || source.sections?.packageDraft
        || contentLiveStatuses([source], candidates, () => true, (row) => row.id === source.id)[0]?.source !== "studio") {
        return sendAdminJson(res, 422, { ok: false, error: "This saved version is not eligible for readers. Use Save & publish on an approved revision." });
      }
    }
    const response = await adminFetch(`${base}/rest/v1/rpc/${body.action === "publish" ? "publish_content_publication" : "retire_content_everywhere"}`, {
      method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ p_content_key: body.contentKey, p_row_id: body.id, p_expected_updated_at: body.expectedUpdatedAt })
    });
    const publication = await response.json();
    if (!response.ok) return sendAdminJson(res, response.status === 409 || publication.code === "40001" ? 409 : 502, {
      ok: false, error: publication.code === "40001" ? "This source changed. Reload before changing publication." : "Could not change publication. Reload to verify the current status."
    });
    if (!validContentPublication(publication) || publication.content_key !== body.contentKey || publication.state !== (body.action === "publish" ? "live" : "retired")) throw new Error("Publication change was not confirmed.");
    return sendAdminJson(res, 200, { ok: true, publication });
  } catch (error) { return sendAdminJson(res, 500, { ok: false, error: adminErrorMessage(error) }); }
}
