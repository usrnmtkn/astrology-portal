import type { IncomingMessage, ServerResponse } from "node:http";
import { getAstrodienstSky } from "../apps/web/src/services/ephemeris.js";
import { validateAstrologyFacts } from "../apps/web/src/services/astrologyFacts.js";
import type { LocationInput } from "../apps/web/src/types.js";
import { aspectPatternsFromSkySnapshot } from "./_lib/aspect-patterns.js";

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "private, max-age=60, stale-while-revalidate=300");
  res.end(JSON.stringify(body));
}

function numberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  const numberValue = value == null ? NaN : Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function stringParam(url: URL, key: string) {
  const value = url.searchParams.get(key)?.trim();

  return value || null;
}

function booleanParam(url: URL, key: string) {
  const value = url.searchParams.get(key)?.trim().toLowerCase();

  return value === "true" || value === "1" || value === "yes";
}

export function buildAstrologyFactsApiResponse(
  sky: Awaited<ReturnType<typeof getAstrodienstSky>>,
  includeAspectPatterns = false,
  includeAspectPatternCopy = false,
  includeAspectPatternActivation = false,
  includeAspectPatternActivationContexts = false,
  includeAspectPatternActivationCopy = false
) {
  const aspectPatterns = includeAspectPatterns
    ? aspectPatternsFromSkySnapshot(sky, {
        includeCopy: includeAspectPatternCopy,
        includeActivation: includeAspectPatternActivation,
        includeActivationContexts: includeAspectPatternActivationContexts,
        includeActivationCopy: includeAspectPatternActivationCopy,
        calculatedFor: sky.generatedAt
      })
    : undefined;
  const skyResponse = aspectPatterns ? { ...sky, aspectPatterns } : sky;
  const facts = sky.facts ?? [];
  const validation = validateAstrologyFacts(facts);

  return {
    aspectPatterns,
    body: {
      ok: true,
      generatedAt: sky.generatedAt,
      provenance: sky.calculationProvenance,
      validation,
      sky: skyResponse,
      facts,
      ...(aspectPatterns ? { aspectPatterns } : {})
    }
  };
}

function parseDate(value: string | null) {
  if (!value) {
    return new Date();
  }

  const date = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date parameter.");
  }

  return date;
}

function parseLocation(url: URL): LocationInput {
  const latitude = numberParam(url, "lat");
  const longitude = numberParam(url, "lon");

  if (latitude == null || longitude == null) {
    throw new Error("Astrology facts API requires lat and lon query parameters.");
  }

  return {
    label: stringParam(url, "label") ?? "Selected location",
    latitude,
    longitude,
    timeZone: stringParam(url, "timeZone") ?? undefined
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Use GET." });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/astrology-facts", "http://localhost");
    const date = parseDate(requestUrl.searchParams.get("date"));
    const location = parseLocation(requestUrl);
    const includeAspectPatterns = booleanParam(requestUrl, "includeAspectPatterns");
    const includeAspectPatternCopy = includeAspectPatterns && booleanParam(requestUrl, "includeAspectPatternCopy");
    const includeAspectPatternActivation = includeAspectPatterns && booleanParam(requestUrl, "includeAspectPatternActivation");
    const includeAspectPatternActivationContexts = includeAspectPatternActivation && booleanParam(requestUrl, "includeAspectPatternActivationContexts");
    const includeAspectPatternActivationCopy = includeAspectPatternActivationContexts && booleanParam(requestUrl, "includeAspectPatternActivationCopy");
    const sky = await getAstrodienstSky(location, date, { includeTransitWindows: true });
    const { body } = buildAstrologyFactsApiResponse(
      sky,
      includeAspectPatterns,
      includeAspectPatternCopy,
      includeAspectPatternActivation,
      includeAspectPatternActivationContexts,
      includeAspectPatternActivationCopy
    );

    if (!body.validation.ok) {
      sendJson(res, 422, {
        ok: false,
        error: "Calculated astrology facts failed validation.",
        diagnostics: body.validation.diagnostics,
        facts: []
      });
      return;
    }

    sendJson(res, 200, body);
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "Astrology facts could not load.",
      facts: []
    });
  }
}
