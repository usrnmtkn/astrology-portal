import knowledgeBundle from "@tldr/astro-knowledge/web";
import type {
  ContentArea,
  ContentBundle,
  ContentSurface,
  KnowledgeItem,
  SurfaceContentResult,
  SurfaceRule,
  SurfaceSelectionOptions,
  VoiceContentItem
} from "./types";
import { equivalentAstroContentKeys } from "./keyAliases";

export const defaultVoiceId = "tldr-astro-v1";

type CanonicalPrimitiveEntry = {
  id: string;
  name?: string;
  keywords?: string[];
  governs?: string[];
  element?: string | string[];
  mode?: string;
  modality?: string;
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

type CanonicalInsightCard = {
  id: string;
  kind: string;
  summary?: string;
  body?: string;
  gift?: string;
  shadow?: string;
  integration?: string;
  do?: string[];
  dont?: string[];
  lifeAreas?: string[];
  tags?: string[];
  collectionHints?: string[];
  intensity?: number;
  sourceFactors?: Array<{
    planetA?: string;
    aspect?: string;
    planetB?: string;
  }>;
  status?: string;
};

type CanonicalTransitNatal = {
  id: string;
  kind: string;
  transiting: string;
  natal: string;
  aspect: string;
  plainTranslation: string;
  policy?: string;
  note?: string;
  status?: string;
};

type CanonicalSkyTransit = {
  id: string;
  transiting: string;
  aspect: string;
  other: string;
  tldr?: string;
  traditional?: string;
  modern?: string;
  business?: string;
  shadow?: string;
  arcApplying?: string;
  arcSeparating?: string;
  base?: string;
  cyclic?: {
    meaning?: string;
  };
  status?: string;
};

type CanonicalPlacement = {
  id: string;
  kind: string;
  planet?: string;
  point?: string;
  key?: string | number;
  sign?: string;
  house?: string | number;
  tldr?: string;
  body?: string;
  gift?: string;
  challenge?: string;
  business?: string;
  shadow?: string;
  policy?: string;
  note?: string;
  status?: string;
};

type CanonicalVoiceContent = VoiceContentItem & {
  path?: string;
};

type CanonicalKnowledgeBundle = {
  primitives: Record<string, CanonicalPrimitiveEntry[]>;
  insightCards: CanonicalInsightCard[];
  transits: CanonicalSkyTransit[];
  transitNatal: CanonicalTransitNatal[];
  placements: CanonicalPlacement[];
  pointPlacements: CanonicalPlacement[];
  voiceContent: CanonicalVoiceContent[];
};

const canonicalKnowledge = knowledgeBundle as unknown as CanonicalKnowledgeBundle;

export const surfaceRules: Record<ContentSurface, SurfaceRule> = {
  chart_profile: {
    surface: "chart_profile",
    label: "Chart Profile",
    eligibleTypes: ["placement", "natal-aspect", "primitive"],
    preferredAreas: ["identity", "emotions", "love", "communication", "career"],
    preferredPlanets: ["sun", "moon", "ascendant", "mercury", "venus", "mars"],
    preferredHouses: ["1", "4", "7", "10"],
    preferredAspects: ["conjunction"],
    requiresVoice: false,
    userFacing: true,
    defaultLimit: 12
  },
  natal_insights: {
    surface: "natal_insights",
    label: "Natal Insights",
    eligibleTypes: ["natal-aspect", "placement"],
    preferredAreas: ["identity", "love", "emotions", "career", "growth", "power"],
    preferredPlanets: ["sun", "moon", "venus", "mars", "mercury", "saturn", "pluto"],
    preferredHouses: [],
    preferredAspects: ["conjunction", "square", "opposition", "trine", "sextile"],
    requiresVoice: true,
    userFacing: true,
    defaultLimit: 8
  },
  core_traits: {
    surface: "core_traits",
    label: "Core Traits",
    eligibleTypes: ["natal-aspect", "placement"],
    preferredAreas: ["identity", "emotions", "growth"],
    preferredPlanets: ["sun", "moon", "ascendant", "mercury", "chart-ruler"],
    preferredHouses: ["1"],
    preferredAspects: ["conjunction", "square", "opposition"],
    requiresVoice: true,
    userFacing: true,
    defaultLimit: 6
  },
  love_patterns: {
    surface: "love_patterns",
    label: "Love Patterns",
    eligibleTypes: ["natal-aspect", "placement"],
    preferredAreas: ["love", "relationships", "emotions", "power"],
    preferredPlanets: ["venus", "mars", "moon", "pluto", "saturn"],
    preferredHouses: ["5", "7", "8"],
    preferredAspects: ["conjunction", "square", "opposition", "trine"],
    requiresVoice: true,
    userFacing: true,
    defaultLimit: 6
  },
  career_patterns: {
    surface: "career_patterns",
    label: "Career Patterns",
    eligibleTypes: ["natal-aspect", "placement"],
    preferredAreas: ["career", "money", "identity", "growth", "daily-life"],
    preferredPlanets: ["sun", "saturn", "jupiter", "mars", "mercury", "venus"],
    preferredHouses: ["2", "6", "10"],
    preferredAspects: ["conjunction", "square", "opposition", "trine", "sextile"],
    requiresVoice: true,
    userFacing: true,
    defaultLimit: 6
  },
  emotional_needs: {
    surface: "emotional_needs",
    label: "Emotional Needs",
    eligibleTypes: ["natal-aspect", "placement"],
    preferredAreas: ["emotions", "home", "family", "relationships"],
    preferredPlanets: ["moon", "venus", "saturn", "neptune", "pluto"],
    preferredHouses: ["4", "8", "12"],
    preferredAspects: ["conjunction", "square", "opposition", "trine"],
    requiresVoice: true,
    userFacing: true,
    defaultLimit: 6
  },
  shadow_work: {
    surface: "shadow_work",
    label: "Shadow Work",
    eligibleTypes: ["natal-aspect", "placement"],
    preferredAreas: ["power", "emotions", "relationships", "identity", "spirituality"],
    preferredPlanets: ["pluto", "saturn", "mars", "moon", "neptune"],
    preferredHouses: ["8", "12", "4", "10"],
    preferredAspects: ["square", "opposition", "conjunction"],
    requiresVoice: true,
    userFacing: true,
    defaultLimit: 6
  },
  growth: {
    surface: "growth",
    label: "Growth",
    eligibleTypes: ["natal-aspect", "placement"],
    preferredAreas: ["growth", "identity", "career", "spirituality"],
    preferredPlanets: ["jupiter", "saturn", "uranus", "sun", "true-node"],
    preferredHouses: ["9", "10", "11"],
    preferredAspects: ["trine", "sextile", "conjunction", "square"],
    requiresVoice: true,
    userFacing: true,
    defaultLimit: 6
  },
  daily_forecast: {
    surface: "daily_forecast",
    label: "Daily Forecast",
    eligibleTypes: ["current-sky-aspect", "transit-to-natal", "placement"],
    preferredAreas: ["daily-life", "emotions", "relationships", "career"],
    preferredPlanets: ["moon", "sun", "mercury", "venus", "mars", "saturn", "jupiter"],
    preferredHouses: [],
    preferredAspects: ["conjunction", "square", "opposition", "trine", "sextile"],
    requiresVoice: false,
    userFacing: true,
    defaultLimit: 5
  },
  behind_forecast: {
    surface: "behind_forecast",
    label: "Behind Forecast",
    eligibleTypes: ["current-sky-aspect", "transit-to-natal", "placement", "primitive"],
    preferredAreas: ["daily-life", "emotions", "relationships", "career", "growth"],
    preferredPlanets: ["moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
    preferredHouses: [],
    preferredAspects: ["conjunction", "square", "opposition", "trine", "sextile"],
    requiresVoice: false,
    userFacing: true,
    defaultLimit: 12
  },
  areas_of_life: {
    surface: "areas_of_life",
    label: "Areas Of Life",
    eligibleTypes: ["current-sky-aspect", "transit-to-natal", "placement"],
    preferredAreas: ["home", "career", "love", "money", "health", "friendship", "daily-life"],
    preferredPlanets: ["moon", "venus", "mars", "jupiter", "saturn"],
    preferredHouses: ["1", "2", "4", "5", "6", "7", "8", "10", "11", "12"],
    preferredAspects: ["conjunction", "square", "opposition", "trine", "sextile"],
    requiresVoice: false,
    userFacing: true,
    defaultLimit: 8
  },
  transit_detail: {
    surface: "transit_detail",
    label: "Transit Detail",
    eligibleTypes: ["current-sky-aspect", "transit-to-natal"],
    preferredAreas: ["daily-life", "emotions", "relationships", "career", "growth"],
    preferredPlanets: ["moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
    preferredHouses: [],
    preferredAspects: ["conjunction", "square", "opposition", "trine", "sextile"],
    requiresVoice: false,
    userFacing: true,
    defaultLimit: 1
  },
  synastry: {
    surface: "synastry",
    label: "Synastry",
    eligibleTypes: ["natal-aspect"],
    preferredAreas: ["relationships", "love", "emotions", "power"],
    preferredPlanets: ["venus", "mars", "moon", "sun", "saturn", "pluto"],
    preferredHouses: ["5", "7", "8"],
    preferredAspects: ["conjunction", "square", "opposition", "trine"],
    requiresVoice: true,
    userFacing: true,
    defaultLimit: 10
  },
  admin_review: {
    surface: "admin_review",
    label: "Admin Review",
    eligibleTypes: ["natal-aspect", "current-sky-aspect", "transit-to-natal", "planet-pair", "placement", "primitive"],
    preferredAreas: [],
    preferredPlanets: [],
    preferredHouses: [],
    preferredAspects: [],
    requiresVoice: false,
    userFacing: false,
    defaultLimit: 200
  }
};

type PrimitiveKeywordSource = Record<string, {
  name?: string;
  keywords: string[];
}>;

type SignPrimitiveSource = Record<string, {
  element: string;
  keywords: string[];
  modality: string;
  name?: string;
}>;

function normalizePrimitiveMap(entries: CanonicalPrimitiveEntry[] = []): PrimitiveKeywordSource {
  return Object.fromEntries(entries.map((entry) => [
    entry.id,
    {
      name: entry.name ?? entry.label ?? titleizePrimitive(entry.id),
      keywords: entry.keywords?.length
        ? entry.keywords
        : entry.governs?.length
          ? entry.governs
          : [
            entry.plainTranslation,
            entry.dynamic,
            entry.traditional?.dynamic,
            entry.traditional?.nature,
            entry.cyclic?.meaning
          ].filter((value): value is string => Boolean(value))
    }
  ]));
}

function normalizeSignMap(entries: CanonicalPrimitiveEntry[] = []): SignPrimitiveSource {
  return Object.fromEntries(entries.map((entry) => [
    entry.id,
    {
      name: entry.name ?? titleizePrimitive(entry.id),
      element: Array.isArray(entry.element) ? entry.element.join(", ") : entry.element ?? "",
      modality: entry.modality ?? entry.mode ?? "",
      keywords: entry.keywords?.length
        ? entry.keywords
        : [
          Array.isArray(entry.element) ? entry.element.join(", ") : entry.element,
          entry.mode
        ].filter((value): value is string => Boolean(value))
    }
  ]));
}

function reviewStatus(value: string | undefined, fallback: KnowledgeItem["status"]): KnowledgeItem["status"] {
  if (value === "DRAFT" || value === "REVIEW" || value === "APPROVED" || value === "SOURCE_BACKED" || value === "INVALID" || value === "INCOMPLETE" || value === "LIVE") {
    return value;
  }

  return fallback;
}

function contentAreasFromStrings(values: string[] = []): ContentArea[] {
  const allowed = new Set<ContentArea>([
    "identity",
    "love",
    "career",
    "money",
    "communication",
    "emotions",
    "home",
    "family",
    "health",
    "creativity",
    "friendship",
    "power",
    "growth",
    "spirituality",
    "relationships",
    "daily-life"
  ]);

  return values.filter((value): value is ContentArea => allowed.has(value as ContentArea));
}

function cleanDisplayText(value: string | undefined | null) {
  return value?.replace(/\s*\u2014\s*/g, " - ").trim() ?? "";
}

function cleanParagraphs(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const paragraphs: string[] = [];

  for (const value of values) {
    const paragraph = cleanDisplayText(value);

    if (!paragraph || seen.has(paragraph)) {
      continue;
    }

    seen.add(paragraph);
    paragraphs.push(paragraph);
  }

  return paragraphs;
}

function canonicalInsightToKnowledgeItem(card: CanonicalInsightCard): KnowledgeItem {
  const factor = card.sourceFactors?.[0] ?? {};

  return {
    id: card.id,
    type: card.kind === "natal-aspect" ? "natal-aspect" : "primitive",
    sourceFactors: {
      planetA: factor.planetA,
      aspect: factor.aspect,
      planetB: factor.planetB
    },
    contentAreas: contentAreasFromStrings(card.lifeAreas),
    collectionHints: card.collectionHints,
    priority: card.intensity ? card.intensity * 15 : undefined,
    intensity: card.intensity,
    knowledgeBasis: {
      ...(factor.planetA ? { [factor.planetA]: planetPrimitiveMap[factor.planetA]?.keywords ?? [] } : {}),
      ...(factor.aspect ? { [factor.aspect]: aspectPrimitiveMap[factor.aspect]?.keywords ?? [] } : {}),
      ...(factor.planetB ? { [factor.planetB]: planetPrimitiveMap[factor.planetB]?.keywords ?? [] } : {})
    },
    interpretation: {
      coreTheme: cleanDisplayText(card.summary) || card.id,
      displaySummary: cleanDisplayText(card.summary),
      detailParagraphs: cleanParagraphs([card.body, card.integration]),
      livedExperience: cleanDisplayText(card.body) || cleanDisplayText(card.summary) || card.id,
      gift: cleanDisplayText(card.gift),
      challenge: cleanDisplayText(card.shadow)
    },
    sources: [
      "data/insights/natal-aspects",
      "data/primitives/planets.json",
      "data/primitives/aspects.json"
    ],
    status: reviewStatus(card.status, "SOURCE_BACKED")
  };
}

function canonicalTransitToKnowledgeItem(transit: CanonicalTransitNatal): KnowledgeItem {
  return {
    id: transit.id.replace(/_/g, "-"),
    type: "transit-to-natal",
    sourceFactors: {
      planetA: transit.transiting,
      aspect: transit.aspect,
      planetB: transit.natal
    },
    contentAreas: uniqueValues([
      ...(contentAreasByPlanet[transit.transiting] ?? []),
      ...(contentAreasByPlanet[transit.natal] ?? []),
      "daily-life" as ContentArea
    ]),
    priority: hardAspects.has(transit.aspect) ? 70 : 50,
    intensity: hardAspects.has(transit.aspect) ? 4 : 3,
    knowledgeBasis: {
      [transit.transiting]: planetPrimitiveMap[transit.transiting]?.keywords ?? [],
      [transit.aspect]: aspectPrimitiveMap[transit.aspect]?.keywords ?? [],
      [transit.natal]: planetPrimitiveMap[transit.natal]?.keywords ?? []
    },
    interpretation: {
      coreTheme: cleanDisplayText(transit.plainTranslation),
      displaySummary: cleanDisplayText(transit.plainTranslation),
      detailParagraphs: cleanParagraphs([transit.policy, transit.note]),
      livedExperience: cleanDisplayText(transit.plainTranslation),
      gift: "",
      challenge: ""
    },
    sources: [
      "data/transits/natal",
      "data/primitives/planets.json",
      "data/primitives/aspects.json"
    ],
    status: reviewStatus(transit.status, "SOURCE_BACKED")
  };
}

function canonicalSkyTransitToKnowledgeItem(transit: CanonicalSkyTransit): KnowledgeItem {
  const body = cleanDisplayText(transit.modern) || cleanDisplayText(transit.base) || cleanDisplayText(transit.tldr) || transit.id;
  const summary = cleanDisplayText(transit.tldr) || cleanDisplayText(transit.business) || body;

  return {
    id: currentSkyAspectContentId(transit.transiting, transit.aspect, transit.other),
    type: "current-sky-aspect",
    sourceFactors: {
      planetA: transit.transiting,
      aspect: transit.aspect,
      planetB: transit.other
    },
    surfaceTags: ["daily_forecast", "behind_forecast", "areas_of_life", "transit_detail"],
    contentAreas: uniqueValues([
      ...(contentAreasByPlanet[transit.transiting] ?? []),
      ...(contentAreasByPlanet[transit.other] ?? []),
      "daily-life" as ContentArea
    ]),
    priority: hardAspects.has(transit.aspect) ? 70 : 55,
    intensity: hardAspects.has(transit.aspect) ? 4 : 3,
    knowledgeBasis: {
      [transit.transiting]: planetPrimitiveMap[transit.transiting]?.keywords ?? [],
      [transit.aspect]: aspectPrimitiveMap[transit.aspect]?.keywords ?? [],
      [transit.other]: planetPrimitiveMap[transit.other]?.keywords ?? []
    },
    interpretation: {
      coreTheme: summary,
      displaySummary: summary,
      detailParagraphs: cleanParagraphs([transit.cyclic?.meaning]),
      livedExperience: body,
      gift: cleanDisplayText(transit.business),
      challenge: cleanDisplayText(transit.shadow)
    },
    sources: [
      "data/transits",
      "data/primitives/planets.json",
      "data/primitives/aspects.json"
    ],
    status: reviewStatus(transit.status, "SOURCE_BACKED")
  };
}

function canonicalPlacementToKnowledgeItem(placement: CanonicalPlacement): KnowledgeItem {
  const planet = placement.planet ?? placement.point;
  const sign = placement.kind === "sign" && typeof placement.key === "string" ? placement.key : undefined;
  const house = placement.kind === "house" ? String(placement.house ?? placement.key ?? "") : undefined;

  return {
    id: placement.id,
    type: "placement",
    sourceFactors: {
      planetA: planet,
      sign,
      house
    },
    surfaceTags: ["chart_profile", "natal_insights", "daily_forecast", "behind_forecast", "areas_of_life"],
    contentAreas: uniqueValues([
      ...(planet ? contentAreasByPlanet[planet] ?? [] : []),
      ...(house ? contentAreasByHouse[house] ?? [] : []),
      "daily-life" as ContentArea
    ]),
    priority: planet && ["sun", "moon", "ascendant"].includes(planet) ? 75 : 45,
    intensity: planet && ["sun", "moon", "ascendant"].includes(planet) ? 4 : 2,
    knowledgeBasis: {
      ...(planet ? { [planet]: planetPrimitiveMap[planet]?.keywords ?? [] } : {}),
      ...(sign ? { [sign]: signPrimitiveMap[sign]?.keywords ?? [] } : {})
    },
    interpretation: {
      coreTheme: cleanDisplayText(placement.tldr) || placement.id,
      displaySummary: cleanDisplayText(placement.tldr) || cleanDisplayText(placement.body),
      detailParagraphs: cleanParagraphs([
        placement.gift,
        placement.challenge,
        placement.note
      ]),
      livedExperience: cleanDisplayText(placement.body) || cleanDisplayText(placement.tldr) || placement.id,
      gift: cleanDisplayText(placement.gift),
      challenge: cleanDisplayText(placement.challenge)
    },
    sources: [
      `data/placements/${placement.kind}`
    ],
    status: reviewStatus(placement.status, "SOURCE_BACKED")
  };
}

const planetPrimitiveMap = normalizePrimitiveMap(canonicalKnowledge.primitives.planet);
const aspectPrimitiveMap = normalizePrimitiveMap(canonicalKnowledge.primitives.aspect);
const signPrimitiveMap = normalizeSignMap(canonicalKnowledge.primitives.sign);
const aspectNames = Object.keys(aspectPrimitiveMap).sort((a, b) => b.length - a.length);

function normalizeIdPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function titleizePrimitive(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sentenceList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function sentenceStart(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const currentSkyPlanetTopic: Record<string, string> = {
  jupiter: "growth, opportunity, and perspective",
  mars: "energy, conflict, and momentum",
  mercury: "thinking, communication, and decisions",
  moon: "the emotional tone",
  neptune: "imagination, longing, and uncertainty",
  pluto: "power, pressure, and deep change",
  saturn: "limits, responsibility, and structure",
  sun: "attention, vitality, and the tone of the season",
  "true-node": "the directional pull of the moment",
  uranus: "change, disruption, and new patterns",
  venus: "connection, pleasure, money, and desire"
};

const currentSkySignStyle: Record<string, string> = {
  aquarius: "systems, distance, community, and principled change",
  aries: "directness, heat, initiative, and urgency",
  cancer: "memory, protection, belonging, and emotional context",
  capricorn: "structure, restraint, responsibility, and practical next steps",
  gemini: "curiosity, language, connection, and fast-moving information",
  leo: "visibility, warmth, pride, and creative expression",
  libra: "balance, comparison, relationship, and social intelligence",
  pisces: "imagination, compassion, surrender, and porous boundaries",
  sagittarius: "belief, movement, honesty, and the larger horizon",
  scorpio: "depth, privacy, intensity, and emotional truth",
  taurus: "stability, embodiment, pleasure, and simple values",
  virgo: "discernment, repair, usefulness, and careful attention"
};

const currentSkyPlanetProcess: Record<string, string> = {
  jupiter: "growth and perspective",
  mars: "energy and conflict",
  mercury: "thinking and communication",
  moon: "the emotional tone",
  neptune: "imagination and uncertainty",
  pluto: "pressure and transformation",
  saturn: "responsibility and limits",
  sun: "attention and vitality",
  "true-node": "the directional pull of the moment",
  uranus: "change and disruption",
  venus: "connection, desire, and pleasure"
};

const pointAliases: Record<string, string> = {
  "north-node": "true-node"
};

function displayPlanetName(id: string) {
  return planetPrimitiveMap[id]?.name ?? titleizePrimitive(id);
}

function displaySignName(id: string) {
  return signPrimitiveMap[id]?.name ?? titleizePrimitive(id);
}

function currentSkyPlacementToKnowledgeItem(placement: CanonicalPlacement): KnowledgeItem | null {
  const sourcePlanet = placement.planet ?? placement.point;
  const planet = sourcePlanet ? pointAliases[sourcePlanet] ?? sourcePlanet : undefined;
  const sign = placement.kind === "sign"
    ? typeof placement.key === "string"
      ? placement.key
      : placement.sign
    : undefined;

  if (!planet || !sign) {
    return null;
  }

  return {
    id: placementContentId(planet, sign),
    type: "placement",
    sourceFactors: {
      planetA: planet,
      sign
    },
    surfaceTags: ["daily_forecast", "behind_forecast", "areas_of_life"],
    contentAreas: uniqueValues([
      ...(contentAreasByPlanet[planet] ?? []),
      "daily-life" as ContentArea
    ]),
    priority: ["sun", "moon"].includes(planet) ? 75 : 45,
    intensity: ["sun", "moon"].includes(planet) ? 4 : 2,
    knowledgeBasis: {
      [planet]: planetPrimitiveMap[planet]?.keywords ?? [],
      [sign]: signPrimitiveMap[sign]?.keywords ?? []
    },
    interpretation: {
      coreTheme: `${displayPlanetName(planet)} in ${displaySignName(sign)}`,
      displaySummary: "",
      detailParagraphs: [],
      livedExperience: "",
      gift: "",
      challenge: ""
    },
    sources: [
      `data/placements/${placement.kind}`
    ],
    status: reviewStatus(placement.status, "SOURCE_BACKED")
  };
}

function knowledgeDetailParagraphs(item: KnowledgeItem) {
  const explicitParagraphs = item.interpretation.detailParagraphs;

  if (explicitParagraphs?.length) {
    return explicitParagraphs;
  }

  return [];
}

const contentAreasByPlanet: Record<string, ContentArea[]> = {
  ascendant: ["identity"],
  jupiter: ["growth"],
  mars: ["career", "power"],
  mercury: ["communication"],
  moon: ["emotions", "home", "family"],
  neptune: ["spirituality", "creativity"],
  pluto: ["power", "growth"],
  saturn: ["career", "growth"],
  sun: ["identity", "creativity"],
  "true-node": ["growth"],
  uranus: ["growth", "friendship"],
  venus: ["love", "money", "creativity"]
};

const contentAreasByHouse: Record<string, ContentArea[]> = {
  "1": ["identity"],
  "2": ["money"],
  "3": ["communication"],
  "4": ["home", "family", "emotions"],
  "5": ["love", "creativity"],
  "6": ["health", "daily-life"],
  "7": ["relationships", "love"],
  "8": ["power", "relationships"],
  "9": ["growth", "spirituality"],
  "10": ["career"],
  "11": ["friendship", "growth"],
  "12": ["spirituality", "emotions"]
};

const hardAspects = new Set(["square", "opposition"]);
const softAspects = new Set(["trine", "sextile"]);

const canonicalPlacementItems = canonicalKnowledge.placements.map(canonicalPlacementToKnowledgeItem);
const canonicalPointPlacementItems = (canonicalKnowledge.pointPlacements ?? []).map(canonicalPlacementToKnowledgeItem);
const currentSkyPlacementItems = [
  ...canonicalKnowledge.placements,
  ...(canonicalKnowledge.pointPlacements ?? [])
]
  .map(currentSkyPlacementToKnowledgeItem)
  .filter((item): item is KnowledgeItem => Boolean(item));

const knowledgeCore = [
  ...canonicalKnowledge.insightCards.map(canonicalInsightToKnowledgeItem),
  ...canonicalKnowledge.transits.map(canonicalSkyTransitToKnowledgeItem),
  ...canonicalKnowledge.transitNatal.map(canonicalTransitToKnowledgeItem),
  ...canonicalPlacementItems,
  ...canonicalPointPlacementItems,
  ...currentSkyPlacementItems
] as KnowledgeItem[];

const voiceContent = canonicalKnowledge.voiceContent as VoiceContentItem[];

const knowledgeById = new Map(knowledgeCore.map((item) => [item.id, item]));
const voiceBySourceAndVoice = new Map(voiceContent.map((item) => [`${item.sourceId}:${item.voiceId}`, item]));

function uniqueValues<T>(values: T[]) {
  return [...new Set(values)];
}

function factorsForItem(item: KnowledgeItem) {
  return [
    item.sourceFactors.planetA,
    item.sourceFactors.planetB,
    item.sourceFactors.sign,
    item.sourceFactors.house,
    item.sourceFactors.aspect
  ].filter((value): value is string => Boolean(value));
}

function inferredAreas(item: KnowledgeItem): ContentArea[] {
  const explicit = item.contentAreas ?? [];
  const planets = [item.sourceFactors.planetA, item.sourceFactors.planetB].filter((value): value is string => Boolean(value));
  const planetAreas = planets.flatMap((planet) => contentAreasByPlanet[planet] ?? []);
  const houseAreas = item.sourceFactors.house ? contentAreasByHouse[item.sourceFactors.house] ?? [] : [];

  return uniqueValues([...explicit, ...planetAreas, ...houseAreas]);
}

function inferredSurfaceTags(item: KnowledgeItem): ContentSurface[] {
  if (item.surfaceTags?.length) {
    return item.surfaceTags;
  }

  const areas = inferredAreas(item);
  const tags: ContentSurface[] = [];

  if (item.type === "natal-aspect" || item.type === "placement") {
    tags.push("natal_insights");
  }

  if (item.type === "transit-to-natal") {
    tags.push("daily_forecast", "behind_forecast", "areas_of_life", "transit_detail");
  }

  if (areas.includes("identity") || areas.includes("emotions")) {
    tags.push("core_traits");
  }

  if (areas.includes("love") || areas.includes("relationships")) {
    tags.push("love_patterns");
  }

  if (areas.includes("career") || areas.includes("money") || areas.includes("daily-life")) {
    tags.push("career_patterns");
  }

  if (areas.includes("emotions") || areas.includes("home") || areas.includes("family")) {
    tags.push("emotional_needs");
  }

  if (areas.includes("power") || hardAspects.has(item.sourceFactors.aspect ?? "")) {
    tags.push("shadow_work");
  }

  if (areas.includes("growth") || softAspects.has(item.sourceFactors.aspect ?? "")) {
    tags.push("growth");
  }

  return uniqueValues(tags);
}

function hasApprovedVoice(item: KnowledgeItem, voiceId: string) {
  const voice = getVoiceContentItem(item.id, voiceId);
  return voice?.status === "APPROVED" || voice?.status === "LIVE";
}

function isSurfaceEligible(item: KnowledgeItem, rule: SurfaceRule, options: Required<SurfaceSelectionOptions>) {
  if (!rule.eligibleTypes.includes(item.type)) {
    return false;
  }

  if (rule.surface !== "admin_review" && !inferredSurfaceTags(item).includes(rule.surface)) {
    return false;
  }

  if (!options.includeReviewContent && item.status !== "SOURCE_BACKED" && item.status !== "APPROVED" && item.status !== "LIVE") {
    return false;
  }

  if (rule.requiresVoice && !options.includeReviewContent && !hasApprovedVoice(item, options.voiceId)) {
    return false;
  }

  return true;
}

function scoreForSurface(item: KnowledgeItem, rule: SurfaceRule) {
  const factors = factorsForItem(item);
  const areas = inferredAreas(item);
  let score = item.priority ?? 0;

  score += item.intensity ? item.intensity * 8 : 0;
  score += areas.filter((area) => rule.preferredAreas.includes(area)).length * 12;
  score += factors.filter((factor) => rule.preferredPlanets.includes(factor)).length * 10;
  score += factors.filter((factor) => rule.preferredHouses.includes(factor)).length * 8;

  if (item.sourceFactors.aspect && rule.preferredAspects.includes(item.sourceFactors.aspect)) {
    score += 8;
  }

  if (hardAspects.has(item.sourceFactors.aspect ?? "")) {
    score += rule.surface === "shadow_work" ? 14 : 4;
  }

  if (softAspects.has(item.sourceFactors.aspect ?? "")) {
    score += rule.surface === "growth" ? 10 : 2;
  }

  return score;
}

function knownKnowledgeItems() {
  return [...knowledgeById.values()];
}

export function aspectContentId(planetA: string, aspect: string, planetB: string) {
  return `${normalizeIdPart(planetA)}-${normalizeIdPart(aspect)}-${normalizeIdPart(planetB)}`;
}

export function currentSkyAspectContentId(planetA: string, aspect: string, planetB: string) {
  return `sky-${aspectContentId(planetA, aspect, planetB)}`;
}

export function placementContentId(planet: string, sign: string) {
  return `${normalizeIdPart(planet)}-in-${normalizeIdPart(sign)}`;
}

export function getKnowledgeItem(id: string) {
  for (const alias of equivalentAstroContentKeys(id)) {
    const knowledge = knowledgeById.get(alias);

    if (knowledge) {
      return knowledge;
    }
  }

  return null;
}

export function getVoiceContentItem(id: string, voiceId = defaultVoiceId) {
  return voiceBySourceAndVoice.get(`${id}:${voiceId}`) ?? null;
}

export function getContentBundle(id: string, voiceId = defaultVoiceId): ContentBundle {
  const knowledge = getKnowledgeItem(id);
  const voice = getVoiceContentItem(id, voiceId);

  if (!knowledge && voice) {
    return { id, knowledge, voice, status: "MISSING_KNOWLEDGE" };
  }

  if (knowledge && !voice) {
    return { id, knowledge, voice, status: "MISSING_VOICE" };
  }

  if (!knowledge || !voice) {
    return { id, knowledge, voice, status: "INCOMPLETE" };
  }

  if (voice.status !== "APPROVED" || voice.sourceId !== knowledge.id) {
    return { id, knowledge, voice, status: "INCOMPLETE" };
  }

  return { id, knowledge, voice, status: "READY" };
}

export function approvedVoiceOrKnowledgeFallback(id: string, voiceId = defaultVoiceId) {
  const bundle = getContentBundle(id, voiceId);
  const detailParagraphs = bundle.knowledge ? knowledgeDetailParagraphs(bundle.knowledge) : [];

  if (bundle.status === "READY" && bundle.voice) {
    const summary = bundle.voice.summary;
    const body = bundle.voice.body;
    const renderedDetailParagraphs = [
      bundle.voice.body,
      ...detailParagraphs
    ];

    return {
      bundle,
      summary: cleanDisplayText(summary),
      body: cleanDisplayText(body),
      detailParagraphs: cleanParagraphs(renderedDetailParagraphs)
    };
  }

  if (bundle.knowledge) {
    const summary = cleanDisplayText(
      bundle.knowledge.interpretation.displaySummary
    ) || cleanDisplayText(
      bundle.knowledge.interpretation.coreTheme
    );
    const body = cleanDisplayText(
      bundle.knowledge.interpretation.livedExperience
    );
    const renderedDetailParagraphs = [
      body,
      ...detailParagraphs
    ];

    return {
      bundle,
      summary,
      body,
      detailParagraphs: cleanParagraphs(renderedDetailParagraphs)
    };
  }

  return {
    bundle,
    summary: null,
    body: null,
    detailParagraphs: []
  };
}

export function hasKnowledgeForContentId(id: string) {
  return getKnowledgeItem(id) !== null;
}

export function getSurfaceRule(surface: ContentSurface) {
  return surfaceRules[surface];
}

export function listSurfaceRules() {
  return Object.values(surfaceRules);
}

export function getKnownKnowledgeItems() {
  return knownKnowledgeItems();
}

export function getKnowledgeMetadata(id: string) {
  const knowledge = getKnowledgeItem(id);

  if (!knowledge) {
    return null;
  }

  return {
    id: knowledge.id,
    type: knowledge.type,
    sourceFactors: knowledge.sourceFactors,
    surfaceTags: inferredSurfaceTags(knowledge),
    contentAreas: inferredAreas(knowledge),
    collectionHints: knowledge.collectionHints ?? [],
    priority: knowledge.priority ?? 0,
    intensity: knowledge.intensity ?? 0,
    status: knowledge.status
  };
}

export function selectContentForSurface(
  surface: ContentSurface,
  candidateIds: string[],
  options: SurfaceSelectionOptions = {}
): SurfaceContentResult {
  const rule = getSurfaceRule(surface);
  const normalizedOptions: Required<SurfaceSelectionOptions> = {
    voiceId: options.voiceId ?? defaultVoiceId,
    includeReviewContent: options.includeReviewContent ?? false,
    limit: options.limit ?? rule.defaultLimit
  };

  const candidateItems = candidateIds
    .map((id) => getKnowledgeItem(id))
    .filter((item): item is KnowledgeItem => Boolean(item));

  const selected = candidateItems
    .filter((item) => isSurfaceEligible(item, rule, normalizedOptions))
    .sort((a, b) => {
      const scoreDelta = scoreForSurface(b, rule) - scoreForSurface(a, rule);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return a.id.localeCompare(b.id);
    })
    .slice(0, normalizedOptions.limit)
    .map((item) => getContentBundle(item.id, normalizedOptions.voiceId));

  return {
    surface,
    rule,
    bundles: selected
  };
}

export function diagnoseContentCandidates(
  candidateIds: string[],
  voiceId = defaultVoiceId
) {
  return candidateIds.map((id) => {
    const bundle = getContentBundle(id, voiceId);

    return {
      id,
      knowledgeExists: Boolean(bundle.knowledge),
      voiceExists: Boolean(bundle.voice),
      voiceStatus: bundle.voice?.status ?? null,
      bundleStatus: bundle.status,
      metadata: getKnowledgeMetadata(id)
    };
  });
}
