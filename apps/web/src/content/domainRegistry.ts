import type { ContentBundle, KnowledgeItem, VoiceContentItem } from "./types";

export const defaultVoiceId = "tldr-astro-v1";

type PrimitiveEntry = {
  id: string;
  name?: string;
  keywords?: string[];
  governs?: string[];
  label?: string;
  plainTranslation?: string;
  dynamic?: string;
  traditional?: {
    dynamic?: string;
    nature?: string;
  };
  cyclic?: {
    meaning?: string;
  };
};

type InsightCard = {
  id: string;
  kind?: string;
  summary?: string;
  body?: string;
  gift?: string;
  shadow?: string;
  integration?: string;
  lifeAreas?: string[];
  intensity?: number;
  sourceFactors?: Array<{
    planetA?: string;
    aspect?: string;
    planetB?: string;
  }>;
  status?: string;
};

type TransitEntry = {
  id: string;
  transiting?: string;
  aspect?: string;
  other?: string;
  tldr?: string;
  modern?: string;
  base?: string;
  business?: string;
  shadow?: string;
  status?: string;
};

type TransitNatalEntry = {
  id: string;
  transiting?: string;
  natal?: string;
  aspect?: string;
  plainTranslation?: string;
  policy?: string;
  note?: string;
  status?: string;
};

type PlacementEntry = {
  id: string;
  kind?: string;
  planet?: string;
  point?: string;
  key?: string | number;
  sign?: string;
  house?: string | number;
  tldr?: string;
  body?: string;
  gift?: string;
  challenge?: string;
  note?: string;
  status?: string;
};

type KnowledgeBundle = {
  primitives?: Record<string, PrimitiveEntry[]>;
  insightCards?: InsightCard[];
  transits?: TransitEntry[];
  transitNatal?: TransitNatalEntry[];
  placements?: PlacementEntry[];
  pointPlacements?: PlacementEntry[];
  voiceContent?: VoiceContentItem[];
};

type PrimitiveMap = Record<string, {
  name: string;
  keywords: string[];
}>;

function normalizeIdPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function titleize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanText(value: string | undefined | null) {
  return value?.replace(/\s*\u2014\s*/g, " - ").trim() ?? "";
}

function cleanParagraphs(values: Array<string | undefined | null>) {
  return values.map(cleanText).filter(Boolean);
}

function reviewStatus(value: string | undefined): KnowledgeItem["status"] {
  if (value === "DRAFT" || value === "REVIEW" || value === "APPROVED" || value === "SOURCE_BACKED" || value === "INVALID" || value === "INCOMPLETE" || value === "LIVE") {
    return value;
  }

  return "SOURCE_BACKED";
}

function normalizePrimitiveMap(entries: PrimitiveEntry[] = []): PrimitiveMap {
  return Object.fromEntries(entries.map((entry) => [
    entry.id,
    {
      name: entry.name ?? entry.label ?? titleize(entry.id),
      keywords: entry.keywords?.length
        ? entry.keywords
        : [
          ...(entry.governs ?? []),
          entry.plainTranslation,
          entry.dynamic,
          entry.traditional?.dynamic,
          entry.traditional?.nature,
          entry.cyclic?.meaning
        ].filter((value): value is string => Boolean(value))
    }
  ]));
}

export function aspectContentId(planetA: string, aspect: string, planetB: string) {
  return `${normalizeIdPart(planetA)}-${normalizeIdPart(aspect)}-${normalizeIdPart(planetB)}`;
}

export function natalAspectContentId(planetA: string, aspect: string, planetB: string) {
  return `natal-${aspectContentId(planetA, aspect, planetB)}`;
}

export function currentSkyAspectContentId(planetA: string, aspect: string, planetB: string) {
  return `sky-${aspectContentId(planetA, aspect, planetB)}`;
}

export function transitNatalContentId(transiting: string, aspect: string, natal: string) {
  return `transit-natal-${aspectContentId(transiting, aspect, natal)}`;
}

export function placementContentId(planet: string, sign: string) {
  return `${normalizeIdPart(planet)}-in-${normalizeIdPart(sign)}`;
}

export function skyPlacementContentId(planet: string, sign: string) {
  return `sky-${placementContentId(planet, sign)}`;
}

export function natalPlacementContentId(planet: string, sign: string) {
  return `natal-${placementContentId(planet, sign)}`;
}

function primitiveThemes(map: PrimitiveMap, id: string | undefined) {
  return id ? map[id]?.keywords.slice(0, 3) ?? [] : [];
}

function sentenceList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

export function createDomainRegistry(bundleInput: unknown) {
  const bundle = bundleInput as KnowledgeBundle;
  const planetMap = normalizePrimitiveMap(bundle.primitives?.planet);
  const aspectMap = normalizePrimitiveMap(bundle.primitives?.aspect);
  const signMap = normalizePrimitiveMap(bundle.primitives?.sign);
  const voiceBySourceAndVoice = new Map((bundle.voiceContent ?? []).map((item) => [`${item.sourceId}:${item.voiceId}`, item]));
  const knowledgeById = new Map<string, KnowledgeItem>();

  function addKnowledge(item: KnowledgeItem) {
    knowledgeById.set(item.id, item);
  }

  for (const card of bundle.insightCards ?? []) {
    const factor = card.sourceFactors?.[0] ?? {};
    addKnowledge({
      id: card.id,
      type: card.kind === "natal-aspect" ? "natal-aspect" : "primitive",
      sourceFactors: {
        planetA: factor.planetA,
        aspect: factor.aspect,
        planetB: factor.planetB
      },
      contentAreas: [],
      priority: card.intensity ? card.intensity * 15 : undefined,
      intensity: card.intensity,
      knowledgeBasis: {
        ...(factor.planetA ? { [factor.planetA]: primitiveThemes(planetMap, factor.planetA) } : {}),
        ...(factor.aspect ? { [factor.aspect]: primitiveThemes(aspectMap, factor.aspect) } : {}),
        ...(factor.planetB ? { [factor.planetB]: primitiveThemes(planetMap, factor.planetB) } : {})
      },
      interpretation: {
        coreTheme: cleanText(card.summary) || card.id,
        displaySummary: cleanText(card.summary),
        detailParagraphs: cleanParagraphs([card.body, card.integration]),
        livedExperience: cleanText(card.body) || cleanText(card.summary) || card.id,
        gift: cleanText(card.gift),
        challenge: cleanText(card.shadow)
      },
      sources: ["@tldr/astro-knowledge"],
      status: reviewStatus(card.status)
    });
  }

  for (const transit of bundle.transits ?? []) {
    if (!transit.transiting || !transit.aspect || !transit.other) {
      continue;
    }

    const body = cleanText(transit.modern) || cleanText(transit.base) || cleanText(transit.tldr) || transit.id;
    const summary = cleanText(transit.tldr) || cleanText(transit.business) || body;

    addKnowledge({
      id: currentSkyAspectContentId(transit.transiting, transit.aspect, transit.other),
      type: "current-sky-aspect",
      sourceFactors: {
        planetA: transit.transiting,
        aspect: transit.aspect,
        planetB: transit.other
      },
      interpretation: {
        coreTheme: summary,
        displaySummary: summary,
        detailParagraphs: [],
        livedExperience: body,
        gift: cleanText(transit.business),
        challenge: cleanText(transit.shadow)
      },
      sources: ["@tldr/astro-knowledge/sky"],
      status: reviewStatus(transit.status)
    });
  }

  for (const transit of bundle.transitNatal ?? []) {
    if (!transit.transiting || !transit.aspect || !transit.natal) {
      continue;
    }

    const id = aspectContentId(transit.transiting, transit.aspect, transit.natal);
    const summary = cleanText(transit.plainTranslation);

    addKnowledge({
      id,
      type: "transit-to-natal",
      sourceFactors: {
        planetA: transit.transiting,
        aspect: transit.aspect,
        planetB: transit.natal
      },
      interpretation: {
        coreTheme: summary,
        displaySummary: summary,
        detailParagraphs: cleanParagraphs([transit.policy, transit.note]),
        livedExperience: summary,
        gift: "",
        challenge: ""
      },
      sources: ["@tldr/astro-knowledge/natal"],
      status: reviewStatus(transit.status)
    });
  }

  for (const placement of [...(bundle.placements ?? []), ...(bundle.pointPlacements ?? [])]) {
    addKnowledge({
      id: placement.id,
      type: "placement",
      sourceFactors: {
        planetA: placement.planet ?? placement.point,
        sign: placement.sign ?? (placement.kind === "sign" && typeof placement.key === "string" ? placement.key : undefined),
        house: placement.house ? String(placement.house) : undefined
      },
      interpretation: {
        coreTheme: cleanText(placement.tldr) || placement.id,
        displaySummary: cleanText(placement.tldr) || cleanText(placement.body),
        detailParagraphs: cleanParagraphs([placement.gift, placement.challenge, placement.note]),
        livedExperience: cleanText(placement.body) || cleanText(placement.tldr) || placement.id,
        gift: cleanText(placement.gift),
        challenge: cleanText(placement.challenge)
      },
      sources: ["@tldr/astro-knowledge"],
      status: reviewStatus(placement.status)
    });
  }

  function generatedAspectKnowledge(id: string): KnowledgeItem | null {
    const aspectName = Object.keys(aspectMap).sort((a, b) => b.length - a.length).find((aspect) => id.includes(`-${aspect}-`));

    if (!aspectName) {
      return null;
    }

    const [planetA, planetB] = id.split(`-${aspectName}-`);

    if (!planetA || !planetB) {
      return null;
    }

    const planetAThemes = primitiveThemes(planetMap, planetA);
    const planetBThemes = primitiveThemes(planetMap, planetB);
    const aspectThemes = primitiveThemes(aspectMap, aspectName);
    const planetAName = planetMap[planetA]?.name ?? titleize(planetA);
    const planetBName = planetMap[planetB]?.name ?? titleize(planetB);

    return {
      id,
      type: "natal-aspect",
      sourceFactors: {
        planetA,
        aspect: aspectName,
        planetB
      },
      knowledgeBasis: {
        [planetA]: planetAThemes,
        [aspectName]: aspectThemes,
        [planetB]: planetBThemes
      },
      interpretation: {
        coreTheme: `${sentenceList(planetAThemes)} meets ${sentenceList(planetBThemes)}.`,
        displaySummary: `${planetAName} ${aspectName} ${planetBName}.`,
        detailParagraphs: [],
        livedExperience: `${planetAName} and ${planetBName} are connected through a ${aspectName}.`,
        gift: "",
        challenge: ""
      },
      sources: ["@tldr/astro-knowledge/primitives"],
      status: "SOURCE_BACKED"
    };
  }

  function generatedPlacementKnowledge(id: string): KnowledgeItem | null {
    const [planet, sign] = id.split("-in-");

    if (!planet || !sign) {
      return null;
    }

    const planetName = planetMap[planet]?.name ?? titleize(planet);
    const signName = signMap[sign]?.name ?? titleize(sign);
    const planetThemes = primitiveThemes(planetMap, planet);
    const signThemes = primitiveThemes(signMap, sign);

    return {
      id,
      type: "placement",
      sourceFactors: {
        planetA: planet,
        sign
      },
      knowledgeBasis: {
        [planet]: planetThemes,
        [sign]: signThemes
      },
      interpretation: {
        coreTheme: `${planetName} expresses ${sentenceList(planetThemes)} through ${signName}.`,
        displaySummary: `${planetName} in ${signName}.`,
        detailParagraphs: [],
        livedExperience: `${planetName} in ${signName} brings ${sentenceList(planetThemes)} through ${sentenceList(signThemes)}.`,
        gift: "",
        challenge: ""
      },
      sources: ["@tldr/astro-knowledge/primitives"],
      status: "SOURCE_BACKED"
    };
  }

  function getKnowledgeItem(id: string) {
    return knowledgeById.get(id) ?? generatedAspectKnowledge(id) ?? generatedPlacementKnowledge(id);
  }

  function getVoiceContentItem(id: string, voiceId = defaultVoiceId) {
    return voiceBySourceAndVoice.get(`${id}:${voiceId}`) ?? null;
  }

  function getContentBundle(id: string, voiceId = defaultVoiceId): ContentBundle {
    const knowledge = getKnowledgeItem(id) ?? null;
    const voice = getVoiceContentItem(id, voiceId);

    if (knowledge && voice?.status === "APPROVED" && voice.sourceId === knowledge.id) {
      return { id, knowledge, voice, status: "READY" };
    }

    if (knowledge && !voice) {
      return { id, knowledge, voice, status: "MISSING_VOICE" };
    }

    if (!knowledge && voice) {
      return { id, knowledge, voice, status: "MISSING_KNOWLEDGE" };
    }

    return { id, knowledge, voice, status: "INCOMPLETE" };
  }

  function approvedVoiceOrKnowledgeFallback(id: string, voiceId = defaultVoiceId) {
    const bundle = getContentBundle(id, voiceId);
    const detailParagraphs = bundle.knowledge?.interpretation.detailParagraphs ?? [];

    if (bundle.status === "READY" && bundle.voice) {
      return {
        bundle,
        summary: cleanText(bundle.voice.summary),
        body: cleanText(bundle.voice.body),
        detailParagraphs: cleanParagraphs([bundle.voice.body, ...detailParagraphs])
      };
    }

    if (bundle.knowledge) {
      const summary = cleanText(bundle.knowledge.interpretation.displaySummary) || cleanText(bundle.knowledge.interpretation.coreTheme);
      const body = cleanText(bundle.knowledge.interpretation.livedExperience);

      return {
        bundle,
        summary,
        body,
        detailParagraphs: cleanParagraphs([body, ...detailParagraphs])
      };
    }

    return {
      bundle,
      summary: null,
      body: null,
      detailParagraphs: []
    };
  }

  return {
    approvedVoiceOrKnowledgeFallback,
    aspectContentId,
    natalAspectContentId,
    currentSkyAspectContentId,
    transitNatalContentId,
    placementContentId,
    skyPlacementContentId,
    natalPlacementContentId
  };
}
