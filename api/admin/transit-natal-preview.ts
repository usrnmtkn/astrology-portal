import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminFetch, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { renderTransitNatalPreview, transitNatalPlanets, transitNatalSigns, transitNatalAspects, transitNatalPoints } from "../../apps/admin/src/transitNatalSources.js";
import { packageFallbackArchitectureV3CoreRows } from "../../apps/web/src/services/fallbackArchitectureV3CorePackaging.js";
import { publicationAllowsContent, validContentPublication, type ContentPublication } from "../../apps/web/src/content/contentPublicationState.js";
import type { GeneratedContentRow } from "../../apps/web/src/services/generatedContent.js";
// @ts-ignore Generated production reader artifact.
import { createTransitSynastryRenderer } from "../../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

loadLocalWebEnv();
const require = createRequire(import.meta.url);
const initial = require("../../apps/web/src/content/fallbackArchitectureV3/bundled-initial-reader-rows-v3.json");
const sky = require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json");
const deferred = require("../../apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json");
const shared = require("../../apps/web/src/content/fallbackArchitectureV3/bundled-shared-placement-rows-v3.json");
const authored = require("../../apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json");
const manifest = require("../../apps/web/src/content/fallbackArchitectureV3/bundled-core-manifest-v3.json");

export function normalizeTransitNatalPreviewInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AdminHttpError(400, "Choose a transit and natal point.");
  const input = value as Record<string, any>;
  if (!transitNatalPlanets.includes(input.planet) || !transitNatalSigns.includes(input.sign)
    || !transitNatalAspects.includes(input.aspect) || !transitNatalPoints.includes(input.natalPoint)
    || input.voice !== undefined && (typeof input.voice !== "string" || input.voice.length > 60)) {
    throw new AdminHttpError(400, "Choose a valid transit and natal point.");
  }
  return { planet: input.planet, sign: input.sign, aspect: input.aspect, natalPoint: input.natalPoint, voice: input.voice || "you" };
}

/** Request-scoped state: simultaneous Studio previews never mutate the reader's publication cache. */
export function renderTransitNatalPreviewState(input: ReturnType<typeof normalizeTransitNatalPreviewInput>, rows: GeneratedContentRow[] = [], publications: ContentPublication[] = []) {
  const records = new Map(publications.map(row => [row.content_key, row]));
  const allows: typeof publicationAllowsContent = (key, id, updatedAt, targetDate) => publicationAllowsContent(key, id, updatedAt, targetDate, records);
  const overlay = packageFallbackArchitectureV3CoreRows(rows, manifest, allows);
  const merge = (base: any[], updates: any[] = []) => [...new Map([...base, ...updates].filter(row => allows(row.contentKey, row.publicationRowId, row.publicationRowUpdatedAt)).map(row => [row.contentKey, row])).values()];
  const cards = merge(authored.authoredCards, overlay?.transitLib.authoredCards);
  const hooks = merge([...sky.hookRows, ...initial.hookRows, ...deferred.hookRows, ...shared.hookRows], overlay?.rowsFile.hookRows);
  const vocabulary = merge([...sky.vocabularyRows, ...initial.vocabularyRows, ...(deferred.vocabularyRows ?? []), ...shared.vocabularyRows], overlay?.rowsFile.vocabularyRows);
  const templates = merge(initial.templates, overlay?.templatesFile.templates);
  const available = new Set([...cards, ...hooks, ...vocabulary, ...templates].map(row => row.contentKey));
  const blockedContentKeys = publications.filter(row => !available.has(row.content_key)).map(row => row.content_key);
  const renderer = createTransitSynastryRenderer({ authoredCards: cards }, { templates }, { hookRows: hooks, vocabularyRows: vocabulary }, { blockedContentKeys });
  return renderTransitNatalPreview(input, renderer, input.voice);
}

async function readRows(base: string, headers: Record<string, string>, table: string, filters: Record<string, string>) {
  const rows: any[] = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const response = await adminFetch(`${base}/rest/v1/${table}?${new URLSearchParams({ ...filters, limit: "1000", offset: String(offset) })}`, { headers });
    const page = await response.json();
    if (!response.ok || !Array.isArray(page)) throw new AdminHttpError(503, "Published reader sources could not be verified.");
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
  throw new AdminHttpError(503, "Published reader sources exceeded the preview limit.");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) return sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
  if (req.method !== "POST") return sendAdminMethodNotAllowed(res, ["POST"]);
  try {
    const input = normalizeTransitNatalPreviewInput(await readAdminJsonBody(req, 4096));
    const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new AdminHttpError(503, "Published reader sources are unavailable.");
    const headers = { apikey: key, authorization: `Bearer ${key}` };
    const [rows, publications] = await Promise.all([
      readRows(base, headers, "generated_interpretations", { select: "*", provider: "eq.tldrastro-fallback-architecture-v3", status: "eq.LIVE", lane: "eq.serving", order: "id.asc" }),
      readRows(base, headers, "content_publications", { select: "content_key,state,revision,row_id,row_updated_at,updated_at", order: "content_key.asc" })
    ]);
    if (!publications.every(validContentPublication)) throw new AdminHttpError(503, "Publication status could not be verified.");
    sendAdminJson(res, 200, { ok: true, rendered: renderTransitNatalPreviewState(input, rows, publications) });
  } catch (error) {
    // A genuine source gap is an ordinary empty preview, not a browser network error.
    if (error instanceof Error && /SOURCE_GAP|No reader-eligible/.test(error.message)) return sendAdminJson(res, 200, { ok: false, error: error.message });
    sendAdminJson(res, error instanceof AdminHttpError ? error.statusCode : 500, { ok: false, error: error instanceof Error ? error.message : "Reader preview failed." });
  }
}
