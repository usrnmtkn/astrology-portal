import type { IncomingMessage, ServerResponse } from "node:http";
import { parseCalculationDate } from "./_lib/calculation-date.js";
import { loadLocalWebEnv } from "./_lib/local-env.js";
import { formatSuggestionLabel } from "./_lib/native-city-labels.js";
import { readAdminJsonBody, AdminHttpError } from "./_lib/admin-http.js";
loadLocalWebEnv();
type Input =
  | { kind: "cities"; query: string; date: string }
  | {
      kind: "birth-time";
      date: string;
      time: string;
      latitude: number;
      longitude: number;
      timeZone: string;
    };
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid input");
  return value as Record<string, unknown>;
};
export function readNativeChartInput(value: unknown): Input {
  const input = record(value),
    date = typeof input.date === "string" ? input.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error("Invalid date");
  const parsed = parseCalculationDate(date);
  if (parsed.getUTCFullYear() < 1800 || parsed.getUTCFullYear() > 2399)
    throw Error("Invalid date");
  if (input.kind === "cities") {
    if (
      typeof input.query !== "string" ||
      input.query.trim().length < 2 ||
      input.query.trim().length > 120
    )
      throw Error("Invalid city query");
    return { kind: "cities", date, query: input.query.trim() };
  }
  if (
    input.kind !== "birth-time" ||
    typeof input.latitude !== "number" ||
    !Number.isFinite(input.latitude) ||
    Math.abs(input.latitude) > 90 ||
    typeof input.longitude !== "number" ||
    !Number.isFinite(input.longitude) ||
    Math.abs(input.longitude) > 180 ||
    typeof input.timeZone !== "string" ||
    input.timeZone.length > 100 ||
    typeof input.time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)
  )
    throw Error("Invalid birth time");
  new Intl.DateTimeFormat("en", { timeZone: input.timeZone });
  return {
    kind: "birth-time",
    date,
    time: input.time,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timeZone,
  };
}
export function createNativeChartServices(
  fetcher: typeof fetch = fetch,
  configuration = () => ({
    mapbox: process.env.VITE_MAPBOX_ACCESS_TOKEN,
    astro: process.env.VITE_TLDRASTRO_API_URL,
  }),
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status: number, value: unknown) => {
      res.statusCode = status;
      res.end(JSON.stringify(value));
    };
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return send(405, { error: "Use POST." });
    }
    if (!req.headers["content-type"]?.startsWith("application/json"))
      return send(415, { error: "Use JSON." });
    let input: Input;
    try {
      input = readNativeChartInput(await readAdminJsonBody(req, 16_384));
    } catch (error) {
      return send(
        error instanceof AdminHttpError && error.statusCode === 413 ? 413 : 400,
        { error: "Check the city, date, and time." },
      );
    }
    try {
      const config = configuration();
      if (!config.astro) throw Error("Unavailable");
      const base = new URL(config.astro);
      if (
        base.protocol !== "https:" ||
        base.username ||
        base.password ||
        base.search ||
        base.hash
      )
        throw Error("Unavailable");
      const zone = async (
        latitude: number,
        longitude: number,
        time = "12:00",
        timeZone?: string,
      ) => {
        const response = await fetcher(
          `${base.href.replace(/\/$/, "")}/utils/timezone`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              date: input.date,
              time,
              ...(timeZone ? { timeZone } : {}),
            }),
            redirect: "error",
            signal: AbortSignal.timeout(12_000),
          },
        );
        if (!response.ok) throw Error("Unavailable");
        const value = record(await response.json());
        if (
          value.source === "fallback" ||
          typeof value.timeZone !== "string" ||
          typeof value.utcDateTime !== "string" ||
          !Number.isFinite(Date.parse(value.utcDateTime))
        )
          throw Error("Unverified timezone");
        new Intl.DateTimeFormat("en", { timeZone: value.timeZone });
        return {
          timeZone: value.timeZone,
          utc: new Date(value.utcDateTime).toISOString(),
        };
      };
      if (input.kind === "birth-time") {
        const result = await zone(
          input.latitude,
          input.longitude,
          input.time,
          input.timeZone,
        );
        if (result.timeZone !== input.timeZone) throw Error("Timezone changed");
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: result.timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }).formatToParts(new Date(result.utc)),
          part = (name: string) => parts.find((p) => p.type === name)?.value;
        const wall = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
        if (wall !== `${input.date}T${input.time}`)
          throw Error("Unverified local time");
        return send(200, {
          schema: "tldr-native-chart-services/v1",
          kind: input.kind,
          date: input.date,
          result,
        });
      }
      if (!config.mapbox) throw Error("Unavailable");
      const params = new URLSearchParams({
          access_token: config.mapbox,
          autocomplete: "true",
          limit: "5",
          q: input.query,
          types: "place,locality",
        }),
        response = await fetcher(
          `https://api.mapbox.com/search/geocode/v6/forward?${params}`,
          { redirect: "error", signal: AbortSignal.timeout(10_000) },
        );
      if (!response.ok) throw Error("Unavailable");
      const body = record(await response.json());
      if (!Array.isArray(body.features)) throw Error("Unavailable");
      const result = (
        await Promise.all(
          body.features.slice(0, 5).map(async (value) => {
            const feature = record(value) as Record<string, any>,
              latitude =
                feature.properties?.coordinates?.latitude ??
                feature.geometry?.coordinates?.[1],
              longitude =
                feature.properties?.coordinates?.longitude ??
                feature.geometry?.coordinates?.[0];
            if (
              typeof latitude !== "number" ||
              Math.abs(latitude) > 90 ||
              typeof longitude !== "number" ||
              Math.abs(longitude) > 180
            )
              return null;
            const resolved = await zone(latitude, longitude);
            return {
              id: String(
                feature.id ??
                  feature.properties?.mapbox_id ??
                  `${latitude}-${longitude}`,
              ),
              label: formatSuggestionLabel(feature as any),
              latitude,
              longitude,
              timeZone: resolved.timeZone,
            };
          }),
        )
      ).filter(Boolean);
      return send(200, {
        schema: "tldr-native-chart-services/v1",
        kind: input.kind,
        date: input.date,
        result,
      });
    } catch {
      return send(503, {
        error: "City and birth-time lookup could not load. Please try again.",
      });
    }
  };
}
export default createNativeChartServices();
