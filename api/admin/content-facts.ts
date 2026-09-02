import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorMessage, adminErrorStatus, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { currentSkyFacts, type SkySnapshot } from "../_lib/current-sky.js";
import { loadSkySourceSnapshot } from "../_lib/content-generation.js";

type ContentFactsInput = {
  surface?: "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
  mode?: "feed" | "in_depth" | "article";
  eventType?: string;
  targetDate?: string;
  contentKey?: string;
  headline?: string;
};

function dateFromInput(value?: string) {
  if (!value) return new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new AdminHttpError(400, "targetDate must be YYYY-MM-DD.");
  }
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AdminHttpError(400, "targetDate must be a valid YYYY-MM-DD date.");
  }
  return date;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function currentSkyAspectKnowledgeId(aspect: { from: string; type: string; to: string }) {
  return `sky-${slugContentPart(aspect.from)}-${slugContentPart(aspect.type)}-${slugContentPart(aspect.to)}`;
}

function slugContentPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseAspectLabel(value?: string) {
  if (!value) return null;
  const match = value.match(/^(.+?)\s+(conjunction|opposition|square|trine|sextile)\s+(.+?)$/i);
  if (!match) return null;
  return {
    from: match[1].trim(),
    type: match[2].trim().toLowerCase(),
    to: match[3].trim()
  };
}

function skyAspectContentKey(aspect: { from: string; type: string; to: string }, targetDate: string) {
  return `sky-aspect-${slugContentPart(aspect.from)}-${slugContentPart(aspect.type)}-${slugContentPart(aspect.to)}-${targetDate}`;
}

function isLegacyCurrentSkyEvent(eventType: string, prefix: "seasonal" | "lunar") {
  return eventType === `${prefix}-${["weath", "er"].join("")}`;
}

function skyRetrogradeContentKey(position: SkySnapshot["positions"][number], targetDate: string) {
  return `sky-retrograde-${slugContentPart(position.planet)}-${targetDate}`;
}

function findAspectByLabel(aspects: SkySnapshot["aspects"], label: ReturnType<typeof parseAspectLabel>) {
  if (!label) return undefined;
  const from = slugContentPart(label.from);
  const to = slugContentPart(label.to);
  const type = slugContentPart(label.type);
  return aspects.find((aspect) => {
    const aspectFrom = slugContentPart(aspect.from);
    const aspectTo = slugContentPart(aspect.to);
    const aspectType = slugContentPart(aspect.type);
    return aspectType === type && (
      (aspectFrom === from && aspectTo === to) ||
      (aspectFrom === to && aspectTo === from)
    );
  });
}

function findRetrogradeByLabel(positions: SkySnapshot["positions"], label?: string) {
  if (!label) return undefined;
  const normalizedLabel = slugContentPart(label.replace(/\s+retrograde$/i, ""));
  return positions.find((position) => position.motion === "retrograde" && slugContentPart(position.planet) === normalizedLabel);
}

function collectiveSkyPosition(position: SkySnapshot["positions"][number] | undefined) {
  if (!position) return undefined;
  const { house: _house, ...collectivePosition } = position;
  return collectivePosition;
}

function collectiveSkyPositions(positions: SkySnapshot["positions"]) {
  return positions.map((position) => collectiveSkyPosition(position));
}

async function buildSkyFacts(input: ContentFactsInput) {
  const date = dateFromInput(input.targetDate);
  const sky = await currentSkyFacts(date);
  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const retrogrades = sky.positions.filter((position) => position.motion === "retrograde");
  const topAspects = sky.aspects.slice(0, 5);
  const targetDate = dateOnly(date);
  const eventType = input.eventType || "daily-sky";
  const sourceSnapshot = loadSkySourceSnapshot();

  if (eventType === "current-aspect") {
    const label = parseAspectLabel(input.headline);
    const aspect = findAspectByLabel(sky.aspects, label) ?? topAspects[0];
    if (aspect) {
      return {
        contentKey: skyAspectContentKey(aspect, targetDate), eventType, targetDate,
        facts: {
          type: "current_aspect", targetDate, aspect,
          planets: collectiveSkyPositions(sky.positions.filter((position) => position.planet === aspect.from || position.planet === aspect.to)),
          moonPhase: sky.moonPhase, dominantElement: sky.dominantElement
        },
        knowledgeIds: [currentSkyAspectKnowledgeId(aspect)], sourceSnapshot
      };
    }
  }

  if ((eventType === "seasonal-current" || isLegacyCurrentSkyEvent(eventType, "seasonal")) && sun) {
    const supportingAspects = sky.aspects.filter((aspect) => aspect.from === "Sun" || aspect.to === "Sun").slice(0, 3);
    return {
      contentKey: `sky-season-${slugContentPart(sun.sign)}-${targetDate}`, eventType, targetDate,
      facts: {
        type: "seasonal_current", targetDate, sun: collectiveSkyPosition(sun),
        currentSky: {
          moon: collectiveSkyPosition(moon), moonPhase: sky.moonPhase,
          topAspects: supportingAspects.length ? supportingAspects : topAspects,
          dominantElement: sky.dominantElement
        }
      },
      knowledgeIds: (supportingAspects.length ? supportingAspects : topAspects).map(currentSkyAspectKnowledgeId), sourceSnapshot
    };
  }

  if ((eventType === "lunar-cycle" || isLegacyCurrentSkyEvent(eventType, "lunar")) && moon) {
    const supportingAspects = sky.aspects.filter((aspect) => aspect.from === "Moon" || aspect.to === "Moon").slice(0, 3);
    return {
      contentKey: `sky-moon-${slugContentPart(moon.sign)}-${targetDate}`, eventType, targetDate,
      facts: { type: "lunar_cycle", targetDate, moon: collectiveSkyPosition(moon), moonPhase: sky.moonPhase, supportingAspects, dominantElement: sky.dominantElement },
      knowledgeIds: supportingAspects.map(currentSkyAspectKnowledgeId), sourceSnapshot
    };
  }

  if (eventType === "retrograde") {
    const retrograde = findRetrogradeByLabel(sky.positions, input.headline) ?? retrogrades[0];
    if (retrograde) {
      return {
        contentKey: skyRetrogradeContentKey(retrograde, targetDate), eventType, targetDate,
        facts: { type: "retrograde", targetDate, planet: collectiveSkyPosition(retrograde), moonPhase: sky.moonPhase, dominantElement: sky.dominantElement },
        knowledgeIds: [`sky-retrograde-${slugContentPart(retrograde.planet)}`], sourceSnapshot
      };
    }
  }

  return {
    contentKey: `sky-daily-${targetDate}`, eventType, targetDate,
    facts: {
      generatedAt: sky.generatedAt, location: sky.location, sun: collectiveSkyPosition(sun), moon: collectiveSkyPosition(moon),
      moonPhase: sky.moonPhase, moonEvent: sky.moonEvent, dominantElement: sky.dominantElement,
      positions: collectiveSkyPositions(sky.positions), retrogrades: collectiveSkyPositions(retrogrades), topAspects
    },
    knowledgeIds: topAspects.map(currentSkyAspectKnowledgeId), sourceSnapshot
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "POST") {
    sendAdminMethodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    const input = await readAdminJsonBody<ContentFactsInput>(req);
    if ((input.surface ?? "sky") !== "sky") {
      throw new AdminHttpError(400, "Automatic facts are currently available for Sky content first.");
    }
    sendAdminJson(res, 200, { ok: true, surface: "sky", ...(await buildSkyFacts(input)) });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Unknown facts loading error.")
    });
  }
}
