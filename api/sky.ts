import type { IncomingMessage, ServerResponse } from "node:http";
import { getAstrodienstSky, getLunarCalendarDayEvents } from "../apps/web/src/services/ephemeris.js";
import { ASTROLOGY_CALCULATION_CONTRACT, factsFromSkySnapshot } from "../apps/web/src/services/astrologyFacts.js";
import type { LocationInput } from "../apps/web/src/types.js";

/** Same engine as Calendar and the browser worker; no alternative fact model. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Use GET." }));
    return;
  }
  let date: Date;
  let location: LocationInput;
  let complete: boolean;
  try {
    const params = new URL(req.url ?? "/api/sky", "http://localhost").searchParams;
    date = new Date(params.get("at") ?? "");
    const latitude = Number(params.get("lat") ?? NaN);
    const longitude = Number(params.get("lon") ?? NaN);
    const timeZone = params.get("timeZone") ?? "UTC";
    if (params.get("version") !== ASTROLOGY_CALCULATION_CONTRACT.calculationVersion
      || !Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1800 || date.getUTCFullYear() > 2399
      || !Number.isFinite(latitude) || Math.abs(latitude) > 90
      || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error("Invalid Sky inputs.");
    new Intl.DateTimeFormat("en", { timeZone }).format(date);
    location = { label: "Selected location", latitude, longitude, timeZone };
    complete = params.get("detail") !== "core";
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Invalid Sky inputs or calculation version." }));
    return;
  }
  try {
    const sky = await getAstrodienstSky(location, date, { includeTransitWindows: complete });
    sky.calculationProvenance = { ...sky.calculationProvenance!, source: "server-swisseph-wasm" };
    sky.facts = factsFromSkySnapshot(sky);
    if (complete) {
      sky.dailyEvents = await getLunarCalendarDayEvents(location, date);
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ sky }));
  } catch {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "Sky calculation unavailable." }));
  }
}
