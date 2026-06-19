import type { IncomingMessage, ServerResponse } from "node:http";
import { currentSkyFacts, type SkySnapshot } from "../_lib/current-sky.js";
import { loadSkySourceSnapshot } from "../_lib/content-generation.js";

type ContentMode = "feed" | "in_depth" | "article";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";

type QueueInput = {
  surface?: GeneratedContentSurface | "all";
  targetDate?: string;
};

type QueueRow = {
  content_key: string;
  surface: GeneratedContentSurface;
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

const sampleSurfaces = new Set<GeneratedContentSurface>(["you", "natal", "synastry", "composite", "relationship"]);

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

function queueRow(input: {
  contentKey: string;
  surface?: GeneratedContentSurface;
  mode?: ContentMode;
  eventType: string;
  targetDate: string;
  headline: string;
  facts: Record<string, unknown>;
  knowledgeIds?: string[];
  sourceSnapshot: Record<string, unknown>;
  reviewerNotes?: string;
}): QueueRow {
  const surface = input.surface ?? "sky";

  return {
    content_key: input.contentKey,
    surface,
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
    reviewer_notes: input.reviewerNotes ?? (sampleSurfaces.has(surface)
      ? "INTERNAL CONTENT TEST. This row is for testing the template, voice, and knowledge hooks. Do not publish as global app content because real You, Synastry, Composite, and Relationship content must be generated from the user's chart or relationship facts."
      : "")
  };
}

function templateSourceSnapshot(surface: GeneratedContentSurface, targetDate: string) {
  return {
    source: "admin-template-queue",
    surface,
    targetDate,
    sampleOnly: sampleSurfaces.has(surface),
    note: sampleSurfaces.has(surface)
      ? "Content test row for personalized content generation. Real rows must be created from user-specific chart, transit, synastry, or composite facts."
      : "Seeded from app content hooks."
  };
}

const natalSunAriesHouse9Source = [
  "You may notice a pattern of taking initiative in expanding your horizons and exploring unfamiliar territories, whether through travel, study, or philosophical inquiry.",
  "There can be a readiness to make quick judgments based on what feels urgent or exciting rather than lingering on all the details.",
  "This often appears as a natural enthusiasm for pursuing your own path in understanding life's bigger questions.",
  "This happens because the Sun in Aries places vitality and identity in a sign known for its pioneering and assertive qualities.",
  "Located in the 9th house, this energy tends to manifest in areas of higher learning, worldview expansion, and active engagement with different cultures or philosophies.",
  "The Sun's presence here shines a light on the value you place on personal conviction and courageous exploration.",
  "It can help to channel this energy by setting clear intentions about where to direct your focus, then taking decisive steps to gather information and experience.",
  "At times, allowing space to reflect can prevent rushing into commitments that might feel less aligned upon review.",
  "This pattern tends to be noticeable throughout your life as a recurring way you approach growth and meaning.",
  "The 9th house influence means these themes are especially active in phases dedicated to education, travel, or significant life choices about belief systems and purpose, offering ongoing opportunities to cultivate and refine this assertive, explorative style."
].join(" ");

function buildTemplateQueueRows(surface: Exclude<GeneratedContentSurface, "sky">, targetDate: string) {
  const sourceSnapshot = templateSourceSnapshot(surface, targetDate);
  const rows: QueueRow[] = [];

  if (surface === "you") {
    rows.push(
      queueRow({
        surface,
        contentKey: "sample-you-natal-sun-in-aries-9th-house",
        mode: "in_depth",
        eventType: "natal-placement",
        targetDate,
        headline: "Sun in Aries in the 9th house",
        facts: {
          type: "natal_placement",
          planet: "Sun",
          sign: "Aries",
          house: 9,
          sourceMeaning: natalSunAriesHouse9Source,
          note: "Use the sourceMeaning as the approved astrological foundation. Rewrite into TLDR Astro voice without inventing new claims."
        },
        knowledgeIds: ["natal-sun-in-aries", "sun-in-aries", "sun-9"],
        sourceSnapshot
      }),
      queueRow({
        surface,
        contentKey: "sample-you-natal-moon-in-capricorn",
        mode: "in_depth",
        eventType: "natal-placement",
        targetDate,
        headline: "Moon in Capricorn",
        facts: {
          type: "natal_placement",
          planet: "Moon",
          sign: "Capricorn",
          house: 6,
          note: "Use the real natal planet, sign, house, and any relevant aspects when generating a user-specific row."
        },
        knowledgeIds: ["natal-moon-in-capricorn", "moon-in-capricorn"],
        sourceSnapshot
      }),
      queueRow({
        surface,
        contentKey: "sample-you-natal-moon-trine-saturn",
        mode: "in_depth",
        eventType: "natal-aspect",
        targetDate,
        headline: "Moon trine Saturn",
        facts: {
          type: "natal_aspect",
          planetA: "Moon",
          aspect: "trine",
          planetB: "Saturn",
          orb: 1,
          note: "Use the real natal aspect, orb, houses, and sign context when generating a user-specific row."
        },
        knowledgeIds: ["natal-moon-trine-saturn", "moon-trine-saturn"],
        sourceSnapshot
      }),
      queueRow({
        surface,
        contentKey: "sample-you-transit-natal-saturn-square-venus",
        mode: "feed",
        eventType: "transit-to-natal",
        targetDate,
        headline: "Saturn square Venus",
        facts: {
          type: "transit_to_natal",
          transitPlanet: "Saturn",
          aspect: "square",
          natalPoint: "Venus",
          note: "Use the real transit dates, exactness, natal house, and transit house when generating a personalized row."
        },
        knowledgeIds: ["transit-natal-saturn-square-venus", "saturn-square-venus"],
        sourceSnapshot
      })
    );
  }

  if (surface === "natal") {
    rows.push(
      queueRow({
        surface,
        contentKey: "sample-natal-sun-in-aries",
        mode: "in_depth",
        eventType: "natal-placement",
        targetDate,
        headline: "Sun in Aries in the 9th house",
        facts: {
          type: "natal_placement",
          planet: "Sun",
          sign: "Aries",
          house: 9,
          sourceMeaning: natalSunAriesHouse9Source,
          note: "Use the sourceMeaning as the approved astrological foundation. Rewrite into TLDR Astro voice without inventing new claims."
        },
        knowledgeIds: ["natal-sun-in-aries", "sun-in-aries", "sun-9"],
        sourceSnapshot
      }),
      queueRow({
        surface,
        contentKey: "sample-natal-venus-square-saturn",
        mode: "in_depth",
        eventType: "natal-aspect",
        targetDate,
        headline: "Venus square Saturn",
        facts: {
          type: "natal_aspect",
          planetA: "Venus",
          aspect: "square",
          planetB: "Saturn",
          orb: 1,
          note: "Use the real natal aspect, orb, houses, and sign context when generating a natal chart row."
        },
        knowledgeIds: ["natal-venus-square-saturn", "venus-square-saturn"],
        sourceSnapshot
      })
    );
  }

  if (surface === "synastry") {
    rows.push(
      queueRow({
        surface,
        contentKey: "sample-synastry-venus-sextile-ascendant",
        mode: "in_depth",
        eventType: "synastry-contact",
        targetDate,
        headline: "Venus sextile Ascendant",
        facts: {
          type: "synastry_contact",
          personA: "Person A",
          personB: "Person B",
          planetA: "Venus",
          aspect: "sextile",
          planetB: "Ascendant",
          orb: 1,
          note: "Use real names, directionality, orb, and signs when generating a relationship-specific row."
        },
        knowledgeIds: ["synastry-venus-sextile-ascendant", "relationship-venus-sextile-ascendant", "venus-sextile-ascendant"],
        sourceSnapshot
      }),
      queueRow({
        surface,
        contentKey: "sample-synastry-mars-square-saturn",
        mode: "in_depth",
        eventType: "synastry-contact",
        targetDate,
        headline: "Mars square Saturn",
        facts: {
          type: "synastry_contact",
          personA: "Person A",
          personB: "Person B",
          planetA: "Mars",
          aspect: "square",
          planetB: "Saturn",
          orb: 1,
          note: "Use real names, directionality, orb, signs, and houses when generating a relationship-specific row."
        },
        knowledgeIds: ["synastry-mars-square-saturn", "relationship-mars-square-saturn", "mars-square-saturn"],
        sourceSnapshot
      }),
      queueRow({
        surface,
        contentKey: "sample-synastry-venus-in-4-house",
        mode: "in_depth",
        eventType: "house-overlay",
        targetDate,
        headline: "Venus in the 4th house",
        facts: {
          type: "house_overlay",
          planetPerson: "Person A",
          housePerson: "Person B",
          planet: "Venus",
          house: 4,
          note: "Use real names, planet owner, house owner, sign, and house context when generating a relationship-specific row."
        },
        knowledgeIds: ["synastry-venus-in-4-house", "relationship-venus-in-4-house", "personal-planet-house4"],
        sourceSnapshot
      })
    );
  }

  if (surface === "composite") {
    rows.push(
      queueRow({
        surface,
        contentKey: "sample-composite-sun-square-moon",
        mode: "in_depth",
        eventType: "composite-aspect",
        targetDate,
        headline: "Composite Sun square Moon",
        facts: {
          type: "composite_aspect",
          planetA: "Sun",
          aspect: "square",
          planetB: "Moon",
          note: "Use composite planet signs, houses, and orb when generating a relationship chart row."
        },
        knowledgeIds: ["composite-sun-square-moon", "sun-square-moon"],
        sourceSnapshot
      }),
      queueRow({
        surface,
        contentKey: "sample-composite-venus-conjunction-mars",
        mode: "in_depth",
        eventType: "composite-aspect",
        targetDate,
        headline: "Composite Venus conjunct Mars",
        facts: {
          type: "composite_aspect",
          planetA: "Venus",
          aspect: "conjunction",
          planetB: "Mars",
          note: "Use composite planet signs, houses, and orb when generating a relationship chart row."
        },
        knowledgeIds: ["composite-venus-conjunction-mars", "venus-conjunction-mars"],
        sourceSnapshot
      }),
      queueRow({
        surface,
        contentKey: "composite-venus-house-4",
        mode: "in_depth",
        eventType: "composite-placement",
        targetDate,
        headline: "Composite Venus in the 4th house",
        facts: {
          type: "composite_placement",
          planet: "Venus",
          sign: "Cancer",
          house: 4,
          note: "Use the real composite planet sign, house, degree, and relationship context when generating this row."
        },
        knowledgeIds: ["composite-venus-house-4", "composite-venus-house4", "venus-house-4"],
        sourceSnapshot
      })
    );
  }

  if (surface === "relationship") {
    rows.push(
      queueRow({
        surface,
        contentKey: "sample-relationship-timing-pluto",
        mode: "feed",
        eventType: "relationship-timing",
        targetDate,
        headline: "Pluto relationship timing",
        facts: {
          type: "relationship_timing",
          transitPlanet: "Pluto",
          topic: "relationship transformation",
          note: "Use the real transit contact, date range, relationship chart point, and houses when generating this row."
        },
        knowledgeIds: ["relationship-timing-pluto", "transit-natal-pluto-opposition-descendant"],
        sourceSnapshot
      }),
      queueRow({
        surface,
        contentKey: "sample-friends-circle-saturn",
        mode: "feed",
        eventType: "circle-feed",
        targetDate,
        headline: "Different people are meeting the same kind of pressure",
        facts: {
          type: "circle_feed",
          topic: "saturn",
          note: "Use the real people, shared active planet, houses, and repeated timing pattern when generating this row."
        },
        knowledgeIds: ["friends-circle-saturn", "relationship-circle-saturn"],
        sourceSnapshot
      })
    );
  }

  return rows;
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

    const date = dateFromInput(input.targetDate);
    const targetDate = dateOnly(date);
    const requestedSurface = input.surface ?? "sky";
    let rows: QueueRow[] = [];

    if (requestedSurface === "sky" || requestedSurface === "all") {
      const sky = await currentSkyFacts(date);
      rows = rows.concat(buildSkyQueueRows(sky, targetDate));
    }

    const templateSurfaces: Array<Exclude<GeneratedContentSurface, "sky">> =
      requestedSurface === "all"
        ? []
        : requestedSurface === "sky"
          ? []
          : [requestedSurface];

    for (const templateSurface of templateSurfaces) {
      rows = rows.concat(buildTemplateQueueRows(templateSurface, targetDate));
    }

    const saved = await saveRows(rows);

    sendJson(res, 200, {
      ok: true,
      surface: requestedSurface,
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
