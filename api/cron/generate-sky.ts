import type { IncomingMessage, ServerResponse } from "node:http";
import { getAstrodienstSky, getCurrentSky } from "../../apps/web/src/services/ephemeris.js";
import type { SkySnapshot } from "../../apps/web/src/types.js";
import {
  generateWithOpenAI,
  loadSkySourceSnapshot,
  saveGeneratedInterpretation,
  type GenerateContentInput
} from "../_lib/content-generation.js";

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isAuthorized(req: IncomingMessage) {
  const cronSecret = process.env.CRON_SECRET ?? process.env.CONTENT_GENERATION_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return req.headers.authorization === `Bearer ${cronSecret}`;
}

async function currentSkyFacts(date: Date) {
  try {
    return await getAstrodienstSky(undefined, date);
  } catch {
    return getCurrentSky(undefined, date);
  }
}

function collectiveSkyPosition(position: SkySnapshot["positions"][number] | undefined) {
  if (!position) {
    return undefined;
  }

  const { house: _house, ...collectivePosition } = position;
  return collectivePosition;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { error: "Use GET or POST." });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    const date = new Date();
    const sky = await currentSkyFacts(date);
    const sun = sky.positions.find((position) => position.planet === "Sun");
    const moon = sky.positions.find((position) => position.planet === "Moon");
    const topAspects = sky.aspects.slice(0, 3);
    const input: GenerateContentInput = {
      contentKey: `sky-daily-${dateOnly(date)}`,
      surface: "sky",
      mode: "feed",
      eventType: "daily-sky",
      targetDate: dateOnly(date),
      facts: {
        generatedAt: sky.generatedAt,
        location: sky.location,
        sun: collectiveSkyPosition(sun),
        moon: collectiveSkyPosition(moon),
        moonPhase: sky.moonPhase,
        moonEvent: sky.moonEvent,
        topAspects
      },
      knowledgeIds: topAspects.map((aspect) => `sky-${aspect.from.toLowerCase()}-${aspect.type}-${aspect.to.toLowerCase()}`),
      sourceSnapshot: loadSkySourceSnapshot(),
      voiceNotes: "Write for the Sky page. Make it actionable. Use the pattern: headline, what you may notice, why, what to do, timing."
    };
    const generated = await generateWithOpenAI(input);
    const saved = await saveGeneratedInterpretation(input, generated);

    sendJson(res, 200, {
      ok: true,
      contentKey: input.contentKey,
      generated,
      saved
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown cron generation error."
    });
  }
}
