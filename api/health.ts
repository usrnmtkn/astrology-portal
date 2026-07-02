import type { IncomingMessage, ServerResponse } from "node:http";
import { getLunarCalendarWeek } from "../apps/web/src/services/ephemeris.js";
import type { LocationInput } from "../apps/web/src/types.js";

type DependencyResult = {
  ok: boolean;
  elapsedMs: number;
  detail?: Record<string, unknown>;
  error?: string;
};

const healthLocation: LocationInput = {
  label: "Health check",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

function elapsedSince(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

async function checkEphemeris(): Promise<DependencyResult> {
  const startedAt = performance.now();

  try {
    const calendar = await getLunarCalendarWeek(healthLocation, new Date("2026-07-02T00:00:00Z"), { detail: "basic" });

    return {
      ok: calendar.days.length >= 7,
      elapsedMs: elapsedSince(startedAt),
      detail: {
        days: calendar.days.length,
        timeZone: calendar.timeZone
      }
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs: elapsedSince(startedAt),
      error: error instanceof Error ? error.message : "Ephemeris check failed."
    };
  }
}

async function checkContentGenerationImport(): Promise<DependencyResult> {
  const startedAt = performance.now();

  try {
    const module = await import("./_lib/content-generation.js");

    return {
      ok: typeof module.generateContent === "function",
      elapsedMs: elapsedSince(startedAt),
      detail: {
        generateContent: typeof module.generateContent
      }
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs: elapsedSince(startedAt),
      error: error instanceof Error ? error.message : "Content generation import failed."
    };
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, {
      ok: false,
      status: "method_not_allowed",
      timestamp: new Date().toISOString()
    });
    return;
  }

  const [ephemeris, contentGeneration] = await Promise.all([
    checkEphemeris(),
    checkContentGenerationImport()
  ]);
  const ok = ephemeris.ok && contentGeneration.ok;

  sendJson(res, ok ? 200 : 503, {
    ok,
    status: ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    dependencies: {
      ephemeris,
      contentGeneration
    }
  });
}
