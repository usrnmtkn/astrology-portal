import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";

type ReviewSurface = "upcomingAspects" | "transitNatal" | "natalChart" | "relationshipLayer";
type ReviewStatus = "DRAFT" | "REVIEWED" | "LIVE" | "ARCHIVED" | "ERROR";
type GeneratedContentSurface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";

type PlanetPosition = {
  planet: string;
  glyph: string;
  sign: string;
  signGlyph: string;
  degree: number;
  house: number;
  motion: "direct" | "retrograde";
  theme: string;
};

type SkyAspect = {
  from: string;
  to: string;
  type: string;
  orb: number;
  meaning?: string;
};

type SkySnapshot = {
  generatedAt: string;
  positions: PlanetPosition[];
  aspects: SkyAspect[];
};

type CloudRunPosition = {
  point?: string;
  planet?: string;
  glyph?: string;
  longitude?: number;
  sign?: string;
  signGlyph?: string;
  degree?: number;
  minute?: number;
  degreeDecimal?: number;
  house?: number | null;
  motion?: "direct" | "retrograde";
  theme?: string | null;
};

type CloudRunSkyResponse = {
  generatedAt: string;
  positions?: CloudRunPosition[];
  aspects?: SkyAspect[];
};

type SavedContentRow = {
  id: string;
  content_key: string;
  surface: GeneratedContentSurface;
  mode: "feed" | "in_depth" | "article";
  status: ReviewStatus;
  event_type: string | null;
  target_date: string | null;
  headline: string | null;
  summary: string | null;
  body: string | null;
  sections: Array<{ heading: string; body: string }> | Record<string, unknown> | null;
  block_type: string | null;
  facts: Record<string, unknown> | null;
  source_snapshot: Record<string, unknown> | null;
  reviewer_notes: string | null;
  model: string | null;
  updated_at: string;
};

type ManualChartRow = {
  id: string;
  owner_user_id: string;
  display_name: string;
  relationship_type: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_unknown: boolean;
  birth_place: string;
  birth_latitude: number;
  birth_longitude: number;
  birth_timezone: string | null;
  natal_chart: SkySnapshot | null;
  updated_at: string;
};

type ReviewRecord = {
  id: string;
  source: "calculated" | "saved";
  surface: GeneratedContentSurface;
  status: ReviewStatus;
  mode: "feed" | "in_depth" | "article";
  title: string;
  subtitle: string;
  targetDate: string | null;
  contentKey: string;
  eventType: string | null;
  summary: string;
  body: string;
  sections: Array<{ heading: string; body: string }>;
  blockType?: string | null;
  facts: Record<string, unknown> | null;
  sourceSnapshot: Record<string, unknown> | null;
  reviewerNotes: string | null;
  userId?: string;
  subjectId?: string;
  subjectType?: string;
  provider?: string | null;
  model?: string | null;
  updatedAt: string;
};

type CalculatedAspect = {
  from: string;
  fromSign: string;
  to: string;
  toSign: string;
  type: string;
  orb: number;
  meaning: string;
};

const aspectDefinitions = [
  { type: "conjunction", exact: 0, orb: 6 },
  { type: "sextile", exact: 60, orb: 4 },
  { type: "square", exact: 90, orb: 5 },
  { type: "trine", exact: 120, orb: 5 },
  { type: "opposition", exact: 180, orb: 6 }
];

const zodiacSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const traditionalRulersBySign: Record<string, string> = {
  aries: "Mars",
  taurus: "Venus",
  gemini: "Mercury",
  cancer: "Moon",
  leo: "Sun",
  virgo: "Mercury",
  libra: "Venus",
  scorpio: "Mars",
  sagittarius: "Jupiter",
  capricorn: "Saturn",
  aquarius: "Saturn",
  pisces: "Jupiter"
};

function traditionalRulerForSign(sign: string) {
  return traditionalRulersBySign[sign.toLowerCase().trim()] ?? "";
}

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

function tldrAstroApiUrl() {
  return (process.env.TLDRASTRO_API_URL || process.env.VITE_TLDRASTRO_API_URL || "https://tldrastro-api-27165565299.us-central1.run.app").replace(/\/$/, "");
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

function slug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function moduleContentPart(value: string | number | null | undefined) {
  const normalized = slug(String(value ?? ""));

  if (normalized === "true-node" || normalized === "north-node") {
    return "north_node";
  }

  if (normalized === "south-node") {
    return "south_node";
  }

  return normalized.replace(/-/g, "_");
}

const aspectBodyOrder = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north_node",
  "south_node",
  "ascendant",
  "descendant",
  "midheaven",
  "imum_coeli"
];

function canonicalAspectBodies(first: string, second: string) {
  const firstBody = moduleContentPart(first);
  const secondBody = moduleContentPart(second);
  const firstIndex = aspectBodyOrder.indexOf(firstBody);
  const secondIndex = aspectBodyOrder.indexOf(secondBody);

  if (firstIndex >= 0 && secondIndex >= 0) {
    return firstIndex <= secondIndex ? [firstBody, secondBody] : [secondBody, firstBody];
  }

  return firstBody.localeCompare(secondBody) <= 0 ? [firstBody, secondBody] : [secondBody, firstBody];
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(`${value}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Dates must be YYYY-MM-DD.");
  }

  return date;
}

function datesInRange(start: Date, end: Date) {
  const dates: Date[] = [];
  const current = new Date(start);
  const maxDays = 370;

  while (current <= end && dates.length < maxDays) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function angularDistance(first: number, second: number) {
  const diff = Math.abs(first - second) % 360;

  return diff > 180 ? 360 - diff : diff;
}

function longitude(position: Pick<PlanetPosition, "sign" | "degree">) {
  const signIndex = zodiacSigns.indexOf(position.sign);

  return (signIndex < 0 ? 0 : signIndex * 30) + position.degree;
}

function themeForPoint(point: string) {
  const themes: Record<string, string> = {
    Sun: "identity",
    Moon: "mood",
    Mercury: "language",
    Venus: "desire",
    Mars: "momentum",
    Jupiter: "growth",
    Saturn: "structure",
    Uranus: "change",
    Neptune: "imagination",
    Pluto: "depth",
    "North Node": "direction"
  };

  return themes[point] ?? point.toLowerCase();
}

function normalizeCloudRunPosition(position: CloudRunPosition): PlanetPosition {
  const planet = position.planet || position.point || "Unknown";

  return {
    planet,
    glyph: position.glyph ?? "",
    sign: position.sign ?? "Aries",
    signGlyph: position.signGlyph ?? "",
    degree: Number(position.degreeDecimal ?? position.degree ?? 0),
    house: position.house ?? 0,
    motion: position.motion ?? "direct",
    theme: position.theme ?? themeForPoint(planet)
  };
}

function aspectForPositions(first: PlanetPosition, second: PlanetPosition) {
  const separation = angularDistance(longitude(first), longitude(second));

  return aspectDefinitions
    .map((definition) => ({
      ...definition,
      orbValue: Math.abs(separation - definition.exact)
    }))
    .filter((definition) => definition.orbValue <= definition.orb)
    .sort((firstDefinition, secondDefinition) => firstDefinition.orbValue - secondDefinition.orbValue)[0] ?? null;
}

function calculatedAspectsForPositions(positions: PlanetPosition[]): CalculatedAspect[] {
  return positions.flatMap((from, fromIndex) => (
    positions.slice(fromIndex + 1).map((to) => {
      const aspect = aspectForPositions(from, to);

      if (!aspect) {
        return null;
      }

      return {
        from: from.planet,
        fromSign: from.sign,
        to: to.planet,
        toSign: to.sign,
        type: aspect.type,
        orb: Number(aspect.orbValue.toFixed(2)),
        meaning: `${from.planet} ${aspect.type} ${to.planet} is active in the selected sky window.`
      };
    })
  )).filter((aspect): aspect is CalculatedAspect => Boolean(aspect));
}

async function postTldrAstro<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${tldrAstroApiUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`TLDR Astro API ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload as TResponse;
}

async function skyForDate(date: Date): Promise<SkySnapshot> {
  const sky = await postTldrAstro<CloudRunSkyResponse>("/sky/current", {
    datetime: {
      date: dateOnly(date),
      time: "12:00",
      timeKnown: true,
      timeZone: "America/New_York"
    },
    location: {
      label: "New York, NY",
      latitude: 40.7128,
      longitude: -74.006,
      timeZone: "America/New_York"
    },
    settings: {
      houseSystem: "whole_sign",
      zodiac: "tropical",
      aspectProfile: "standard"
    },
    includeContentFacts: false
  });

  return {
    generatedAt: sky.generatedAt,
    positions: (sky.positions ?? []).map(normalizeCloudRunPosition),
    aspects: sky.aspects ?? []
  }
}

function savedRowMatchesReviewSurface(row: SavedContentRow, surface: ReviewSurface) {
  if (surface === "upcomingAspects") {
    return row.surface === "sky";
  }

  if (surface === "transitNatal") {
    return row.surface === "you";
  }

  if (surface === "natalChart") {
    return row.surface === "natal";
  }

  return row.surface === "synastry" || row.surface === "composite" || row.surface === "relationship";
}

async function savedContentRows(startDate?: string | null, endDate?: string | null) {
  const params = new URLSearchParams({
    select: "id,content_key,surface,mode,status,event_type,target_date,headline,summary,body,sections,block_type,facts,source_snapshot,reviewer_notes,model,updated_at",
    order: startDate || endDate ? "target_date.asc.nullslast" : "updated_at.desc",
    limit: "1000"
  });

  if (startDate && endDate) {
    params.set("or", `(target_date.is.null,and(target_date.gte.${startDate},target_date.lte.${endDate}))`);
  } else if (startDate) {
    params.set("or", `(target_date.is.null,target_date.gte.${startDate})`);
  } else if (endDate) {
    params.set("or", `(target_date.is.null,target_date.lte.${endDate})`);
  }

  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase generated content list failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return (payload ?? []) as SavedContentRow[];
}

function savedReviewRecord(row: SavedContentRow): ReviewRecord {
  return {
    id: `saved:${row.id}`,
    source: "saved",
    surface: row.surface,
    status: row.status,
    mode: row.mode,
    title: row.headline || row.content_key,
    subtitle: `${row.surface} · ${row.mode}${row.target_date ? ` · ${row.target_date}` : ""}`,
    targetDate: row.target_date,
    contentKey: row.content_key,
    eventType: row.event_type,
    summary: row.summary ?? "",
    body: row.body ?? "",
    sections: sectionsFromSaved(row),
    blockType: row.block_type,
    facts: row.facts,
    sourceSnapshot: row.source_snapshot,
    reviewerNotes: row.reviewer_notes,
    model: row.model,
    updatedAt: row.updated_at
  };
}

function mergeSavedOnlyRecords(surface: ReviewSurface, records: ReviewRecord[], savedRows: SavedContentRow[]) {
  const existingKeys = new Set(records.map((record) => record.contentKey));
  const savedRecords = savedRows
    .filter((row) => savedRowMatchesReviewSurface(row, surface))
    .filter((row) => !existingKeys.has(row.content_key))
    .map(savedReviewRecord);

  return [...records, ...savedRecords];
}

function savedByContentKey(rows: SavedContentRow[]) {
  return new Map(rows.map((row) => [row.content_key, row]));
}

function sectionsFromSaved(row?: SavedContentRow) {
  return Array.isArray(row?.sections)
    ? row.sections.filter((section): section is { heading: string; body: string } => (
        Boolean(section)
        && typeof section.heading === "string"
        && typeof section.body === "string"
      ))
    : [];
}

function statusAllowed(status: string | null, recordStatus: ReviewStatus) {
  return !status || status === "all" || status === recordStatus;
}

function mergeSaved(record: ReviewRecord, saved?: SavedContentRow): ReviewRecord {
  if (!saved) {
    return record;
  }

  const facts = {
    ...(record.facts ?? {}),
    ...(saved.facts ?? {})
  };
  const sourceSnapshot = {
    ...(record.sourceSnapshot ?? {}),
    ...(saved.source_snapshot ?? {})
  };

  return {
    ...record,
    source: "saved",
    status: saved.status,
    mode: saved.mode,
    title: saved.headline || record.title,
    summary: saved.summary || record.summary,
    body: saved.body || record.body,
    sections: sectionsFromSaved(saved),
    blockType: saved.block_type ?? record.blockType ?? null,
    facts,
    sourceSnapshot,
    reviewerNotes: saved.reviewer_notes,
    model: saved.model,
    updatedAt: saved.updated_at
  };
}

function aspectContentKey(aspect: { from: string; type: string; to: string }, targetDate: string) {
  const [first, second] = canonicalAspectBodies(aspect.from, aspect.to);

  return `sky.aspect.${first}.${moduleContentPart(aspect.type)}.${second}.${targetDate}`;
}

function transitNatalContentKey(
  transitPlanet: string,
  aspect: string,
  natalPoint: string,
  targetDate: string,
  context?: { transitSign?: string | null; natalSign?: string | null; natalHouse?: number | null }
) {
  const parts = [
    `transit.aspect.${moduleContentPart(transitPlanet)}.${moduleContentPart(aspect)}.${moduleContentPart(natalPoint)}`,
    context?.transitSign ? moduleContentPart(context.transitSign) : "",
    context?.natalSign ? moduleContentPart(context.natalSign) : "",
    context?.natalHouse ? `house_${moduleContentPart(context.natalHouse)}` : "",
    targetDate
  ].filter(Boolean);

  return parts.join(".");
}

function natalPlacementContentKey(planet: string, sign: string) {
  return `natal-${slug(planet)}-in-${slug(sign)}`;
}

function natalAspectContentKey(first: string, aspect: string, second: string) {
  const [firstBody, secondBody] = canonicalAspectBodies(first, second);

  return `natal.aspect.${firstBody}.${moduleContentPart(aspect)}.${secondBody}`;
}

function relationshipAspectContentKey(first: string, aspect: string, second: string, surface: "synastry" | "composite") {
  if (surface === "synastry") {
    return `synastry.aspect.${moduleContentPart(first)}.${moduleContentPart(aspect)}.${moduleContentPart(second)}`;
  }

  const [firstBody, secondBody] = canonicalAspectBodies(first, second);

  return `composite.aspect.${firstBody}.${moduleContentPart(aspect)}.${secondBody}`;
}

function placementSummary(position: PlanetPosition, owner = "This chart") {
  return `${owner}'s ${position.planet} is in ${position.sign}${position.house ? ` in the ${position.house} house` : ""}.`;
}

function aspectSummary(first: string, aspect: string, second: string) {
  return `${first} ${aspect} ${second} shows how these two chart factors interact.`;
}

function skyAspectSummary(aspect: { from: string; type: string; to: string; meaning?: string }) {
  return aspect.meaning || `${aspect.from} ${aspect.type} ${aspect.to} is active in the selected sky window.`;
}

async function upcomingAspectRecords(start: Date, end: Date, savedRows: Map<string, SavedContentRow>) {
  const byAspect = new Map<string, {
    aspect: CalculatedAspect;
    targetDate: string;
    orb: number;
    previousOrb: number | null;
    nextOrb: number | null;
  }>();
  const dates = datesInRange(start, end);
  const skies = await Promise.all(dates.map((date) => skyForDate(date)));

  skies.forEach((sky, index) => {
    calculatedAspectsForPositions(sky.positions).forEach((aspect) => {
      const key = [aspect.from, aspect.type, aspect.to].map(slug).join("-");
      const existing = byAspect.get(key);

      if (!existing || aspect.orb < existing.orb) {
        const previousSky = skies[index - 1];
        const nextSky = skies[index + 1];
        const previousOrb = previousSky ? calculatedAspectsForPositions(previousSky.positions).find((candidate) => candidate.from === aspect.from && candidate.to === aspect.to && candidate.type === aspect.type)?.orb ?? null : null;
        const nextOrb = nextSky ? calculatedAspectsForPositions(nextSky.positions).find((candidate) => candidate.from === aspect.from && candidate.to === aspect.to && candidate.type === aspect.type)?.orb ?? null : null;

        byAspect.set(key, {
          aspect,
          targetDate: dateOnly(dates[index]),
          orb: aspect.orb,
          previousOrb,
          nextOrb
        });
      }
    });
  });

  return Array.from(byAspect.values())
    .sort((first, second) => first.targetDate.localeCompare(second.targetDate) || first.orb - second.orb)
    .map((entry) => {
      const direction = entry.nextOrb !== null && entry.nextOrb < entry.orb ? "applying" : entry.previousOrb !== null && entry.previousOrb < entry.orb ? "separating" : entry.orb <= 0.3 ? "exact" : "forming";
      const contentKey = aspectContentKey(entry.aspect, entry.targetDate);
      const baseRecord: ReviewRecord = {
        id: `calculated:${contentKey}`,
        source: "calculated",
        surface: "sky",
        status: "DRAFT",
        mode: "feed",
        title: `${entry.aspect.from} ${entry.aspect.type} ${entry.aspect.to}`,
        subtitle: `${entry.targetDate} · ${direction} · ${entry.orb.toFixed(1)}° orb`,
        targetDate: entry.targetDate,
        contentKey,
        eventType: "current-aspect",
        summary: skyAspectSummary(entry.aspect),
        body: "",
        sections: [],
        blockType: "sky_aspect",
        facts: {
          blockType: "sky_aspect",
          type: "upcoming_aspect",
          from: entry.aspect.from,
          fromSign: entry.aspect.fromSign,
          to: entry.aspect.to,
          toSign: entry.aspect.toSign,
          aspect: entry.aspect.type,
          exactDate: entry.targetDate,
          direction,
          orb: entry.orb
        },
        sourceSnapshot: null,
        reviewerNotes: null,
        updatedAt: new Date().toISOString()
      };

      return mergeSaved(baseRecord, savedRows.get(contentKey));
    });
}

async function findManualCharts(query: string) {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const params = new URLSearchParams({
    select: "id,owner_user_id,display_name,relationship_type,birth_date,birth_time,birth_time_unknown,birth_place,birth_latitude,birth_longitude,birth_timezone,natal_chart,updated_at",
    limit: "20"
  });

  if (/^[0-9a-f-]{36}$/i.test(trimmed)) {
    params.set("id", `eq.${trimmed}`);
  } else {
    params.set("display_name", `ilike.*${trimmed.replace(/[%*]/g, "")}*`);
  }

  const response = await fetch(`${supabaseUrl()}/rest/v1/manual_charts?${params}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase manual chart lookup failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return (payload ?? []) as ManualChartRow[];
}

function chartNeedsNatal(chart: ManualChartRow) {
  if (!chart.natal_chart) {
    throw new Error(`${chart.display_name} does not have a saved natal chart yet.`);
  }

  return chart.natal_chart;
}

async function transitNatalRecords(start: Date, end: Date, chart: ManualChartRow, savedRows: Map<string, SavedContentRow>) {
  const natal = chartNeedsNatal(chart);
  const byTransit = new Map<string, {
    transit: PlanetPosition;
    natal: PlanetPosition;
    aspect: ReturnType<typeof aspectForPositions>;
    targetDate: string;
  }>();
  const skies = await Promise.all(datesInRange(start, end).map((date) => skyForDate(date)));

  skies.forEach((sky) => {
    sky.positions.forEach((transitPosition) => {
      natal.positions.forEach((natalPosition) => {
        const aspect = aspectForPositions(transitPosition, natalPosition);

        if (!aspect) return;

        const key = [transitPosition.planet, aspect.type, natalPosition.planet].map(slug).join("-");
        const existing = byTransit.get(key);

        if (!existing || aspect.orbValue < (existing.aspect?.orbValue ?? Infinity)) {
          byTransit.set(key, {
            transit: transitPosition,
            natal: natalPosition,
            aspect,
            targetDate: dateOnly(new Date(sky.generatedAt))
          });
        }
      });
    });
  });

  return Array.from(byTransit.values())
    .sort((first, second) => first.targetDate.localeCompare(second.targetDate) || ((first.aspect?.orbValue ?? 0) - (second.aspect?.orbValue ?? 0)))
    .map((entry) => {
      const aspect = entry.aspect;
      const contentKey = transitNatalContentKey(entry.transit.planet, aspect?.type ?? "contact", entry.natal.planet, entry.targetDate, {
        transitSign: entry.transit.sign,
        natalSign: entry.natal.sign,
        natalHouse: entry.natal.house
      });
      const baseRecord: ReviewRecord = {
        id: `calculated:${contentKey}`,
        source: "calculated",
        surface: "you",
        status: "DRAFT",
        mode: "article",
        title: `${entry.transit.planet} ${aspect?.type ?? "contacts"} ${chart.display_name}'s ${entry.natal.planet}`,
        subtitle: `${entry.targetDate} · ${entry.transit.sign} to natal ${entry.natal.sign} · ${(aspect?.orbValue ?? 0).toFixed(1)}° orb`,
        targetDate: entry.targetDate,
        contentKey,
        eventType: "transit-to-natal",
        summary: `${entry.transit.planet} ${aspect?.type ?? "contacts"} ${entry.natal.planet} activates ${chart.display_name}'s ${entry.natal.planet} pattern in the selected window.`,
        body: "",
        sections: [],
        blockType: "transit_to_natal_aspect",
        facts: {
          blockType: "transit_to_natal_aspect",
          type: "transit_to_natal",
          transitPlanet: entry.transit.planet,
          transitSign: entry.transit.sign,
          aspect: aspect?.type,
          natalPoint: entry.natal.planet,
          natalSign: entry.natal.sign,
          natalHouse: entry.natal.house,
          exactDate: entry.targetDate,
          orb: aspect?.orbValue
        },
        sourceSnapshot: null,
        reviewerNotes: null,
        subjectId: chart.id,
        subjectType: "manual_chart",
        userId: chart.owner_user_id,
        updatedAt: new Date().toISOString()
      };

      return mergeSaved(baseRecord, savedRows.get(contentKey));
    });
}

function natalChartRecords(chart: ManualChartRow, savedRows: Map<string, SavedContentRow>) {
  const natal = chartNeedsNatal(chart);
  const placementRecords = natal.positions.map((position) => {
    const contentKey = natalPlacementContentKey(position.planet, position.sign);
    const ruler = traditionalRulerForSign(position.sign);
    const rulerPosition = ruler ? natal.positions.find((candidate) => candidate.planet === ruler) : null;
    const baseRecord: ReviewRecord = {
      id: `calculated:${chart.id}:${contentKey}`,
      source: "calculated",
      surface: "natal",
      status: "DRAFT",
      mode: "feed",
      title: `${position.planet} in ${position.sign}`,
      subtitle: `${chart.display_name} · ${position.house} house · ${position.degree}°`,
      targetDate: null,
      contentKey,
      eventType: "natal-placement",
      summary: placementSummary(position, chart.display_name),
      body: "",
      sections: [],
      facts: {
        type: "natal_placement",
        planet: position.planet,
        body: position.planet,
        point: position.planet,
        node: position.planet.toLowerCase().includes("node") ? position.planet : undefined,
        placementBody: position.planet,
        sign: position.sign,
        placementSign: position.sign,
        degree: position.degree,
        house: position.house,
        placementHouse: position.house,
        motion: position.motion,
        retrograde: position.motion === "retrograde" && !position.planet.toLowerCase().includes("node"),
        isRetrograde: position.motion === "retrograde" && !position.planet.toLowerCase().includes("node"),
        ruler,
        rulerBody: ruler,
        houseRuler: ruler,
        rulerSign: rulerPosition?.sign,
        houseRulerSign: rulerPosition?.sign,
        rulerHouse: rulerPosition?.house,
        houseRulerHouse: rulerPosition?.house
      },
      sourceSnapshot: {
        chartId: chart.id,
        chartName: chart.display_name,
        houseSystem: "whole_sign",
        positions: natal.positions.map((candidate) => ({
          planet: candidate.planet,
          body: candidate.planet,
          point: candidate.planet,
          sign: candidate.sign,
          house: candidate.house,
          degree: candidate.degree,
          motion: candidate.motion
        }))
      },
      reviewerNotes: null,
      subjectId: chart.id,
      subjectType: "manual_chart",
      userId: chart.owner_user_id,
      updatedAt: chart.updated_at
    };

    return mergeSaved(baseRecord, savedRows.get(contentKey));
  });
  const aspectRecords = natal.aspects.map((aspect) => {
    const contentKey = natalAspectContentKey(aspect.from, aspect.type, aspect.to);
    const baseRecord: ReviewRecord = {
      id: `calculated:${chart.id}:${contentKey}`,
      source: "calculated",
      surface: "natal",
      status: "DRAFT",
      mode: "feed",
      title: `${aspect.from} ${aspect.type} ${aspect.to}`,
      subtitle: `${chart.display_name} · ${aspect.orb.toFixed(1)}° orb`,
      targetDate: null,
      contentKey,
      eventType: "natal-aspect",
      summary: aspect.meaning || aspectSummary(aspect.from, aspect.type, aspect.to),
      body: "",
      sections: [],
      blockType: "natal_aspect",
      facts: {
        blockType: "natal_aspect",
        type: "natal_aspect",
        from: aspect.from,
        to: aspect.to,
        aspect: aspect.type,
        orb: aspect.orb
      },
      sourceSnapshot: null,
      reviewerNotes: null,
      subjectId: chart.id,
      subjectType: "manual_chart",
      userId: chart.owner_user_id,
      updatedAt: chart.updated_at
    };

    return mergeSaved(baseRecord, savedRows.get(contentKey));
  });

  return [...placementRecords, ...aspectRecords];
}

function relationshipRecords(charts: ManualChartRow[], savedRows: Map<string, SavedContentRow>) {
  const [firstChart, secondChart] = charts;

  if (!firstChart || !secondChart) {
    return [];
  }

  const firstNatal = chartNeedsNatal(firstChart);
  const secondNatal = chartNeedsNatal(secondChart);
  const synastryRecords = firstNatal.positions.flatMap((firstPosition) => (
    secondNatal.positions.map((secondPosition) => {
      const aspect = aspectForPositions(firstPosition, secondPosition);
      if (!aspect) return null;

      const contentKey = relationshipAspectContentKey(firstPosition.planet, aspect.type, secondPosition.planet, "synastry");
      const baseRecord: ReviewRecord = {
        id: `calculated:${firstChart.id}:${secondChart.id}:${contentKey}`,
        source: "calculated",
        surface: "synastry",
        status: "DRAFT",
        mode: "feed",
        title: `${firstChart.display_name}'s ${firstPosition.planet} ${aspect.type} ${secondChart.display_name}'s ${secondPosition.planet}`,
        subtitle: `${aspect.orbValue.toFixed(1)}° orb · synastry`,
        targetDate: null,
        contentKey,
        eventType: "synastry-aspect",
        summary: `${firstPosition.planet} ${aspect.type} ${secondPosition.planet} describes a relationship contact between ${firstChart.display_name} and ${secondChart.display_name}.`,
        body: "",
        sections: [],
        blockType: "synastry_aspect",
        facts: {
          blockType: "synastry_aspect",
          type: "synastry_aspect",
          personA: firstChart.display_name,
          personB: secondChart.display_name,
          planetA: firstPosition.planet,
          planetASign: firstPosition.sign,
          planetAHouse: firstPosition.house,
          planetB: secondPosition.planet,
          planetBSign: secondPosition.sign,
          planetBHouse: secondPosition.house,
          aspect: aspect.type,
          orb: aspect.orbValue
        },
        sourceSnapshot: null,
        reviewerNotes: null,
        subjectId: `${firstChart.id},${secondChart.id}`,
        subjectType: "chart_pair",
        userId: firstChart.owner_user_id,
        updatedAt: new Date().toISOString()
      };

      return mergeSaved(baseRecord, savedRows.get(contentKey));
    })
  )).filter((record): record is ReviewRecord => Boolean(record));
  const compositePositions = firstNatal.positions.map((firstPosition) => {
    const matchingPosition = secondNatal.positions.find((position) => position.planet === firstPosition.planet);
    if (!matchingPosition) return null;

    const firstLongitude = longitude(firstPosition);
    const secondLongitude = longitude(matchingPosition);
    const directDelta = ((secondLongitude - firstLongitude + 540) % 360) - 180;
    const midpoint = (firstLongitude + directDelta / 2 + 360) % 360;
    const sign = zodiacSigns[Math.floor((midpoint % 360) / 30)] ?? firstPosition.sign;
    const degree = midpoint % 30;

    return {
      ...firstPosition,
      sign,
      degree,
      house: 0
    };
  }).filter((position): position is PlanetPosition => Boolean(position));

  const compositeRecords = compositePositions.map((position) => {
    const contentKey = `composite-${slug(position.planet)}-in-${slug(position.sign)}`;
    const baseRecord: ReviewRecord = {
      id: `calculated:${firstChart.id}:${secondChart.id}:${contentKey}`,
      source: "calculated",
      surface: "composite",
      status: "DRAFT",
      mode: "feed",
      title: `Composite ${position.planet} in ${position.sign}`,
      subtitle: `${firstChart.display_name} + ${secondChart.display_name}`,
      targetDate: null,
      contentKey,
      eventType: "composite-placement",
      summary: `Composite ${position.planet} in ${position.sign} describes how this relationship tends to express ${position.theme}.`,
      body: "",
      sections: [],
      facts: {
        type: "composite_placement",
        planet: position.planet,
        sign: position.sign
      },
      sourceSnapshot: null,
      reviewerNotes: null,
      subjectId: `${firstChart.id},${secondChart.id}`,
      subjectType: "chart_pair",
      userId: firstChart.owner_user_id,
      updatedAt: new Date().toISOString()
    };

    return mergeSaved(baseRecord, savedRows.get(contentKey));
  }).filter((record): record is ReviewRecord => Boolean(record));
  const compositeAspectRecords = calculatedAspectsForPositions(compositePositions).map((aspect) => {
    const contentKey = relationshipAspectContentKey(aspect.from, aspect.type, aspect.to, "composite");
    const fromPosition = compositePositions.find((position) => position.planet === aspect.from);
    const toPosition = compositePositions.find((position) => position.planet === aspect.to);
    const baseRecord: ReviewRecord = {
      id: `calculated:${firstChart.id}:${secondChart.id}:${contentKey}`,
      source: "calculated",
      surface: "composite",
      status: "DRAFT",
      mode: "feed",
      title: `Composite ${aspect.from} ${aspect.type} ${aspect.to}`,
      subtitle: `${aspect.orb.toFixed(1)}° orb · composite`,
      targetDate: null,
      contentKey,
      eventType: "composite-aspect",
      summary: `Composite ${aspect.from} ${aspect.type} ${aspect.to} describes a shared relationship pattern between ${firstChart.display_name} and ${secondChart.display_name}.`,
      body: "",
      sections: [],
      blockType: "composite_aspect",
      facts: {
        blockType: "composite_aspect",
        type: "composite_aspect",
        from: aspect.from,
        fromSign: fromPosition?.sign,
        fromHouse: fromPosition?.house || undefined,
        to: aspect.to,
        toSign: toPosition?.sign,
        toHouse: toPosition?.house || undefined,
        aspect: aspect.type,
        orb: aspect.orb
      },
      sourceSnapshot: null,
      reviewerNotes: null,
      subjectId: `${firstChart.id},${secondChart.id}`,
      subjectType: "chart_pair",
      userId: firstChart.owner_user_id,
      updatedAt: new Date().toISOString()
    };

    return mergeSaved(baseRecord, savedRows.get(contentKey));
  });

  return [...synastryRecords, ...compositeRecords, ...compositeAspectRecords];
}

function counts(records: ReviewRecord[]) {
  return {
    total: records.length,
    DRAFT: records.filter((record) => record.status === "DRAFT").length,
    REVIEWED: records.filter((record) => record.status === "REVIEWED").length,
    LIVE: records.filter((record) => record.status === "LIVE").length,
    ARCHIVED: records.filter((record) => record.status === "ARCHIVED").length,
    ERROR: records.filter((record) => record.status === "ERROR").length
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Use GET." });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/admin/review-records", "http://localhost");
    const surface = (requestUrl.searchParams.get("surface") ?? "upcomingAspects") as ReviewSurface;
    const status = requestUrl.searchParams.get("status");
    const person = requestUrl.searchParams.get("person") ?? "";
    const requestedStartDate = requestUrl.searchParams.get("startDate");
    const requestedEndDate = requestUrl.searchParams.get("endDate");
    const hasDateWindow = Boolean(requestedStartDate || requestedEndDate);
    const start = parseDate(requestedStartDate, new Date());
    const end = parseDate(requestedEndDate, new Date(start.getTime() + 30 * 86_400_000));
    const startDate = dateOnly(start);
    const endDate = dateOnly(end);
    const savedRowsList = await savedContentRows(hasDateWindow ? startDate : null, hasDateWindow ? endDate : null);
    const savedRows = savedByContentKey(savedRowsList);
    let records: ReviewRecord[] = [];
    let prompt: string | null = null;

    if (surface === "upcomingAspects") {
      records = await upcomingAspectRecords(start, end, savedRows);
    } else if (surface === "relationshipLayer") {
      const chartParts = person.split(",").map((part) => part.trim()).filter(Boolean);

      if (chartParts.length < 2) {
        prompt = "Enter two chart names or ids separated by a comma in Person or Subject.";
      } else {
        const relationshipCharts = (await Promise.all(chartParts.slice(0, 2).map(findManualCharts)))
          .map((matches) => matches[0])
          .filter((chart): chart is ManualChartRow => Boolean(chart));

        if (relationshipCharts.length < 2) {
          prompt = "Enter two chart names or ids separated by a comma in Person or Subject.";
        } else {
          records = relationshipRecords(relationshipCharts, savedRows);
        }
      }
    } else {
      const charts = await findManualCharts(person);

      if (charts.length === 0) {
        prompt = "Enter a person or chart name in Person or Subject to load this review surface.";
      } else if (surface === "transitNatal") {
        records = await transitNatalRecords(start, end, charts[0], savedRows);
      } else if (surface === "natalChart") {
        records = natalChartRecords(charts[0], savedRows);
      }
    }

    records = mergeSavedOnlyRecords(surface, records, savedRowsList);

    const filteredRecords = records.filter((record) => statusAllowed(status, record.status));

    sendJson(res, 200, {
      ok: true,
      surface,
      startDate,
      endDate,
      prompt,
      rows: filteredRecords,
      counts: counts(filteredRecords)
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown review records admin error."
    });
  }
}
