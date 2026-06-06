import type { IncomingMessage, ServerResponse } from "node:http";
import { getAstrodienstSky, getCurrentSky } from "../../apps/web/src/services/ephemeris.js";
import type { SkySnapshot } from "../../apps/web/src/types.js";
import { loadSkySourceSnapshot } from "../_lib/content-generation.js";

type ContentMode = "feed" | "in_depth" | "article";

type QueueInput = {
  surface?: "sky";
  targetDate?: string;
};

type QueueRow = {
  content_key: string;
  surface: "sky";
  mode: ContentMode;
  status: "DRAFT";
  event_type: string;
  target_date: string;
  facts: Record<string, unknown>;
  knowledge_ids: string[];
  source_snapshot: Record<string, unknown>;
  prompt_version: "admin-queue";
  model: "queued";
  headline: string;
  summary: string;
  body: string;
  sections: [];
  reviewer_notes: string;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function adminHeaders() {
  const key = serviceRoleKey();

  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json"
  };
}

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

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as QueueInput;
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

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function skyAspectKnowledgeId(aspect: SkySnapshot["aspects"][number]) {
  return `sky-${slug(aspect.from)}-${slug(aspect.type)}-${slug(aspect.to)}`;
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

function dailySkyHeadline(sun?: SkySnapshot["positions"][number], moon?: SkySnapshot["positions"][number]) {
  return [
    sun ? `${sun.sign} Season` : "",
    moon ? `${moon.sign} Moon` : ""
  ].filter(Boolean).join(", ") || "Current Sky";
}

async function currentSkyFacts(date: Date) {
  try {
    return await getAstrodienstSky(undefined, date);
  } catch {
    return getCurrentSky(undefined, date);
  }
}

function queueRow(input: {
  contentKey: string;
  mode?: ContentMode;
  eventType: string;
  targetDate: string;
  headline: string;
  facts: Record<string, unknown>;
  knowledgeIds?: string[];
  sourceSnapshot: Record<string, unknown>;
}): QueueRow {
  return {
    content_key: input.contentKey,
    surface: "sky",
    mode: input.mode ?? "feed",
    status: "DRAFT",
    event_type: input.eventType,
    target_date: input.targetDate,
    facts: input.facts,
    knowledge_ids: input.knowledgeIds ?? [],
    source_snapshot: input.sourceSnapshot,
    prompt_version: "admin-queue",
    model: "queued",
    headline: input.headline,
    summary: "",
    body: "",
    sections: [],
    reviewer_notes: ""
  };
}

function buildSkyQueueRows(sky: SkySnapshot, targetDate: string) {
  const sourceSnapshot = loadSkySourceSnapshot();
  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const retrogrades = sky.positions.filter((position) => position.motion === "retrograde");
  const moonAspects = sky.aspects.filter((aspect) => aspect.from === "Moon" || aspect.to === "Moon");
  const topAspects = sky.aspects.slice(0, 5);
  const rows: QueueRow[] = [];

  rows.push(queueRow({
    contentKey: `sky-daily-${targetDate}`,
    eventType: "daily-sky",
    targetDate,
    headline: dailySkyHeadline(sun, moon),
    facts: {
      type: "daily_overview",
      targetDate,
      generatedAt: sky.generatedAt,
      location: sky.location,
      sun: collectiveSkyPosition(sun),
      moon: collectiveSkyPosition(moon),
      moonPhase: sky.moonPhase,
      moonEvent: sky.moonEvent,
      dominantElement: sky.dominantElement,
      topAspects,
      retrogrades: collectiveSkyPositions(retrogrades)
    },
    knowledgeIds: topAspects.map(skyAspectKnowledgeId),
    sourceSnapshot
  }));

  if (sun) {
    const sunAspect = topAspects.find((aspect) => aspect.from === "Sun" || aspect.to === "Sun");

    rows.push(queueRow({
      contentKey: `sky-season-${slug(sun.sign)}-${targetDate}`,
      eventType: "seasonal-current",
      targetDate,
      headline: `${sun.sign} Season`,
      facts: {
        type: "seasonal_current",
        targetDate,
        sun: collectiveSkyPosition(sun),
        supportingAspect: sunAspect,
        currentSky: {
          moon: collectiveSkyPosition(moon),
          moonPhase: sky.moonPhase,
          dominantElement: sky.dominantElement,
          topAspects
        }
      },
      knowledgeIds: sunAspect ? [skyAspectKnowledgeId(sunAspect)] : [],
      sourceSnapshot
    }));
  }

  if (moon) {
    const moonAspect = moonAspects[0];

    rows.push(queueRow({
      contentKey: `sky-moon-${slug(moon.sign)}-${targetDate}`,
      eventType: "lunar-cycle",
      targetDate,
      headline: moonAspect ? `Moon in ${moon.sign} ${moonAspect.type} ${moonAspect.from === "Moon" ? moonAspect.to : moonAspect.from}` : `Moon in ${moon.sign}`,
      facts: {
        type: "lunar_cycle",
        targetDate,
        moon: collectiveSkyPosition(moon),
        moonPhase: sky.moonPhase,
        supportingAspect: moonAspect,
        moonEvent: sky.moonEvent
      },
      knowledgeIds: moonAspect ? [skyAspectKnowledgeId(moonAspect)] : [],
      sourceSnapshot
    }));
  }

  topAspects.forEach((aspect) => {
    rows.push(queueRow({
      contentKey: `sky-aspect-${slug(aspect.from)}-${slug(aspect.type)}-${slug(aspect.to)}-${targetDate}`,
      eventType: "current-aspect",
      targetDate,
      headline: `${aspect.from} ${aspect.type} ${aspect.to}`,
      facts: {
        type: "current_aspect",
        targetDate,
        aspect,
        planets: collectiveSkyPositions(sky.positions.filter((position) => position.planet === aspect.from || position.planet === aspect.to)),
        moonPhase: sky.moonPhase
      },
      knowledgeIds: [skyAspectKnowledgeId(aspect)],
      sourceSnapshot
    }));
  });

  retrogrades.forEach((position) => {
    rows.push(queueRow({
      contentKey: `sky-retrograde-${slug(position.planet)}-${targetDate}`,
      eventType: "retrograde",
      targetDate,
      headline: `${position.planet} retrograde`,
      facts: {
        type: "retrograde",
        targetDate,
        planet: collectiveSkyPosition(position),
        nearbyAspects: topAspects.filter((aspect) => aspect.from === position.planet || aspect.to === position.planet)
      },
      knowledgeIds: [],
      sourceSnapshot
    }));
  });

  if (sky.moonEvent && sky.moonEvent.days <= 7) {
    rows.push(queueRow({
      contentKey: `sky-lunation-${slug(sky.moonEvent.name)}-${slug(sky.moonEvent.sign)}-${targetDate}`,
      mode: "article",
      eventType: slug(sky.moonEvent.name),
      targetDate,
      headline: `${sky.moonEvent.name} in ${sky.moonEvent.sign}`,
      facts: {
        type: "lunation",
        targetDate,
        moonEvent: sky.moonEvent,
        moonPhase: sky.moonPhase,
        topAspects,
        positions: collectiveSkyPositions(sky.positions)
      },
      knowledgeIds: topAspects.map(skyAspectKnowledgeId),
      sourceSnapshot
    }));
  }

  return Array.from(new Map(rows.map((row) => [row.content_key, row])).values());
}

async function saveRows(rows: QueueRow[]) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(rows)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase queue save failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
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
        error: "Queue pre-population is connected for Sky first."
      });
      return;
    }

    const date = dateFromInput(input.targetDate);
    const targetDate = dateOnly(date);
    const sky = await currentSkyFacts(date);
    const rows = buildSkyQueueRows(sky, targetDate);
    const saved = await saveRows(rows);

    sendJson(res, 200, {
      ok: true,
      targetDate,
      inserted: rows.length,
      rows: saved
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown queue pre-population error."
    });
  }
}
