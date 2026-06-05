import type { IncomingMessage, ServerResponse } from "node:http";
import { getAstrodienstSky, getCurrentSky } from "../../apps/web/src/services/ephemeris.js";
import type { SkySnapshot } from "../../apps/web/src/types.js";
import { loadSkySourceSnapshot } from "../_lib/content-generation.js";

type ContentFactsInput = {
  surface?: "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
  mode?: "feed" | "in_depth" | "article";
  eventType?: string;
  targetDate?: string;
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage) {
  const secret = process.env.CONTENT_GENERATION_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return req.headers.authorization === `Bearer ${secret}`;
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as ContentFactsInput;
}

function dateFromInput(value?: string) {
  if (!value) {
    return new Date();
  }

  const date = new Date(`${value}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("targetDate must be YYYY-MM-DD.");
  }

  return date;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function currentSkyAspectKnowledgeId(aspect: { from: string; type: string; to: string }) {
  return `sky-${aspect.from.toLowerCase().replaceAll(" ", "-")}-${aspect.type}-${aspect.to.toLowerCase().replaceAll(" ", "-")}`;
}

function collectiveSkyPosition(position: SkySnapshot["positions"][number] | undefined) {
  if (!position) {
    return undefined;
  }

  const { house: _house, ...collectivePosition } = position;
  return collectivePosition;
}

function collectiveSkyPositions(positions: SkySnapshot["positions"]) {
  return positions.map((position) => collectiveSkyPosition(position));
}

async function currentSkyFacts(date: Date) {
  try {
    return await getAstrodienstSky(undefined, date);
  } catch {
    return getCurrentSky(undefined, date);
  }
}

async function buildSkyFacts(input: ContentFactsInput) {
  const date = dateFromInput(input.targetDate);
  const sky = await currentSkyFacts(date);
  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const retrogrades = sky.positions.filter((position) => position.motion === "retrograde");
  const topAspects = sky.aspects.slice(0, 5);
  const targetDate = dateOnly(date);

  return {
    contentKey: `sky-daily-${targetDate}`,
    eventType: input.eventType || "daily-sky",
    targetDate,
    facts: {
      generatedAt: sky.generatedAt,
      location: sky.location,
      sun: collectiveSkyPosition(sun),
      moon: collectiveSkyPosition(moon),
      moonPhase: sky.moonPhase,
      moonEvent: sky.moonEvent,
      dominantElement: sky.dominantElement,
      positions: collectiveSkyPositions(sky.positions),
      retrogrades: collectiveSkyPositions(retrogrades),
      topAspects
    },
    knowledgeIds: topAspects.map(currentSkyAspectKnowledgeId),
    sourceSnapshot: loadSkySourceSnapshot()
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST." });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    const input = await readJsonBody(req);

    if ((input.surface ?? "sky") !== "sky") {
      sendJson(res, 400, {
        ok: false,
        error: "Automatic facts are currently available for Sky content first."
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      surface: "sky",
      ...(await buildSkyFacts(input))
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown facts loading error."
    });
  }
}
