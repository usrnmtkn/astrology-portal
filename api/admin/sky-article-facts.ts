import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { requireContentAdmin } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { calculateSkyArticleEditionFacts, skyArticlePeriod } from "../_lib/sky-article-facts.js";
import { isSkyIngressEssay } from "../../apps/web/src/content/skyIngressEssay.mjs";
import { skyPreviewReferenceDate } from "../../src/shared/skyReaderPreview.js";

loadLocalWebEnv();

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/gu, "-");
}

function validReferenceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new AdminHttpError(400, "date must be YYYY-MM-DD.");
  const instant = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(instant.getTime()) || instant.toISOString().slice(0, 10) !== value) {
    throw new AdminHttpError(400, "date must be a valid YYYY-MM-DD date.");
  }
  return instant;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await requireContentAdmin(req, res)) return;
  if (req.method !== "GET") {
    sendAdminMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/admin/sky-article-facts", "http://localhost");
    const planet = normalizeToken(requestUrl.searchParams.get("planet") ?? "");
    const referenceDate = requestUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    if (!planet) throw new AdminHttpError(400, "planet is required.");
    let referenceInstant = validReferenceDate(referenceDate);
    const instant = requestUrl.searchParams.get('instant');
    if (instant) {
      const zone = requestUrl.searchParams.get('timeZone') ?? 'America/New_York';
      if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/u.test(instant) || !Number.isFinite(Date.parse(instant))) throw new AdminHttpError(400, 'Choose a valid reader instant.');
      try { if (skyPreviewReferenceDate(instant, zone) !== referenceDate) throw new Error(); }
      catch { throw new AdminHttpError(400, 'The reader instant must match its local date and time zone.'); }
      referenceInstant = new Date(instant);
    }
    const format = requestUrl.searchParams.get("format") ?? "saved-template";
    if (format !== "saved-template" && !isSkyIngressEssay(format)) throw new AdminHttpError(400, "Unsupported article format.");
    let period;
    try { period = skyArticlePeriod(requestUrl.searchParams.get('period')); }
    catch (error) { throw new AdminHttpError(400, (error as Error).message); }
    const readerSign = requestUrl.searchParams.get('readerSign');
    const latitude = Number(requestUrl.searchParams.get('lat')?.trim() || NaN);
    const longitude = Number(requestUrl.searchParams.get('lon')?.trim() || NaN);
    const timeZone = requestUrl.searchParams.get('timeZone') ?? 'America/New_York';
    if (readerSign) {
      if (period !== 'current' || !isSkyIngressEssay(format) || !Number.isFinite(latitude) || Math.abs(latitude) > 90
        || !Number.isFinite(longitude) || Math.abs(longitude) > 180 || referenceInstant.getUTCFullYear() < 1800
        || referenceInstant.getUTCFullYear() > 2399) throw new AdminHttpError(400, 'Choose valid reader calculation inputs.');
      try { new Intl.DateTimeFormat('en', { timeZone }).format(referenceInstant); }
      catch { throw new AdminHttpError(400, 'Choose a valid reader time zone.'); }
    }
    const facts = await calculateSkyArticleEditionFacts(referenceInstant, planet, format, period);
    if (!readerSign) { sendAdminJson(res, 200, { ok: true, facts }); return; }
    if (readerSign !== facts.sign) throw new AdminHttpError(400, 'The reader placement does not match this instant.');
    const [{ getSkyPlacementSnapshot }, { factsFromSkySnapshot }] = await Promise.all([
      import('../../apps/web/src/services/ephemeris.js'), import('../../apps/web/src/services/astrologyFacts.js')
    ]);
    const readerSky = await getSkyPlacementSnapshot({ label: 'Selected location', latitude, longitude, timeZone },
      planet, readerSign, referenceInstant, true, 'placement');
    readerSky.calculationProvenance = { ...readerSky.calculationProvenance!, source: 'server-swisseph-wasm' };
    readerSky.facts = factsFromSkySnapshot(readerSky);
    sendAdminJson(res, 200, { ok: true, facts, readerSky });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Unknown Sky article fact error.")
    });
  }
}
