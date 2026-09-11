// @ts-ignore Shared reader-copy validation.
import { readerCopyIssues } from "../../apps/web/src/content/editorialCopyBoundary.mjs";
import { isRetiredCompositionKey } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";
import { validContentPublication, publicationTimestamp } from "../../apps/web/src/content/contentPublicationState.js";
import { contentLiveStatuses } from "../_lib/content-live-status.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
loadLocalWebEnv();
import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminFetchJson, adminErrorStatus, readAdminJsonBody, sendAdminJson, adminErrorMessage } from "../_lib/admin-http.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) return sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
  if (req.method !== "POST") return sendAdminJson(res, 405, { ok: false, error: "Use POST." });
  try {
    const body = await readAdminJsonBody<{ action?: string; contentKey?: string; id?: string; expectedUpdatedAt?: string }>(req);
    if (!body || typeof body !== "object" || Array.isArray(body) || !["retire", "publish"].includes(body.action ?? "") || typeof body.contentKey !== "string" || !body.contentKey.trim() || typeof body.id !== "string" || typeof body.expectedUpdatedAt !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(body.id ?? "") || !Number.isFinite(Date.parse(body.expectedUpdatedAt ?? ""))) {
      return sendAdminJson(res, 400, { ok: false, error: "Select a saved source and its current version before changing publication." });
    }
    if (body.action === "publish" && isRetiredCompositionKey(body.contentKey)) {
      return sendAdminJson(res, 422, { ok: false, error: "This composition has been retired. Edit the canonical Personal Transit source instead." });
    }
    const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new Error("Content publication storage is unavailable.");
    if (body.action === "publish") {
      const sourceResponse = await adminFetchJson(`${base}/rest/v1/generated_interpretations?${new URLSearchParams({ select: "*", id: `eq.${body.id}` })}`, {
        headers: { apikey: key, authorization: `Bearer ${key}` }
      });
      const sources = sourceResponse.payload;
      if (!sourceResponse.ok || !Array.isArray(sources)) throw new AdminHttpError(502, "Could not verify the saved version.");
      const source = sources[0];
      if (source && readerCopyIssues(source).length) return sendAdminJson(res, 422, {
        ok: false, error: "Internal drafting notes remain in reader copy. Move them to editor-only notes before publishing."
      });
      const candidates = [...sources];
      if (!source || source.content_key !== body.contentKey || source.sections?.packageDraft
        || contentLiveStatuses([source], candidates, () => true, (row) => row.id === source.id)[0]?.source !== "studio") {
        return sendAdminJson(res, 422, { ok: false, error: "This saved version is not eligible for readers. Use Save & publish on an approved revision." });
      }
    }
    const response = await adminFetchJson(`${base}/rest/v1/rpc/${body.action === "publish" ? "publish_content_publication" : "retire_content_everywhere"}`, {
      method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ p_content_key: body.contentKey, p_row_id: body.id, p_expected_updated_at: body.expectedUpdatedAt })
    });
    const publication = response.payload;
    const storageCode = publication && typeof publication === "object" && "code" in publication ? publication.code : null;
    if (!response.ok) return sendAdminJson(res, response.status === 409 || storageCode === "40001" ? 409 : 502, {
      ok: false, error: storageCode === "40001" ? "This source changed. Reload before changing publication." : "Could not change publication. Reload to verify the current status."
    });
    if (!validContentPublication(publication) || publication.content_key !== body.contentKey || publication.state !== (body.action === "publish" ? "live" : "retired")) throw new AdminHttpError(502, "Publication change was not confirmed. Reload before retrying.");
    // Retirement may retain an earlier ledger identity; live restoration must name the exact saved version.
    if (body.action === "publish" && (publication.row_id?.toLowerCase() !== body.id.toLowerCase() || !publication.row_updated_at || publicationTimestamp(publication.row_updated_at) !== publicationTimestamp(body.expectedUpdatedAt))) throw new AdminHttpError(502, "The published version was not confirmed. Reload before retrying.");
    return sendAdminJson(res, 200, { ok: true, publication });
  } catch (error) { return sendAdminJson(res, adminErrorStatus(error), { ok: false, error: adminErrorMessage(error, "Could not change publication.") }); }
}
