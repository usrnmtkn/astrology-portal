import knowledgeBundle from "@yourorg/astro-knowledge";
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

type CanonicalVoiceContent = VoiceContentItem & {
  path?: string;
};

type CanonicalKnowledgeBundle = {
  primitives: Record<string, CanonicalPrimitiveEntry[]>;
  insightCards: CanonicalInsightCard[];
  transitNatal: CanonicalTransitNatal[];
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
    eligibleTypes: ["transit-to-natal", "placement"],
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
    eligibleTypes: ["transit-to-natal", "placement", "primitive"],
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
    eligibleTypes: ["transit-to-natal", "placement"],
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
    eligibleTypes: ["transit-to-natal"],
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
    eligibleTypes: ["natal-aspect", "transit-to-natal", "planet-pair", "placement", "primitive"],
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
      coreTheme: card.summary ?? card.id,
      displaySummary: card.summary,
      detailParagraphs: [card.body, card.integration].filter((value): value is string => Boolean(value)),
      livedExperience: card.body ?? card.summary ?? card.id,
      gift: card.gift ?? "",
      challenge: card.shadow ?? ""
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
      coreTheme: transit.plainTranslation,
      displaySummary: transit.plainTranslation,
      detailParagraphs: [transit.policy, transit.note].filter((value): value is string => Boolean(value)),
      livedExperience: transit.plainTranslation,
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

const rowThemeByPlanet: Record<string, string> = {
  ascendant: "presence",
  jupiter: "growth",
  mars: "momentum",
  mercury: "thinking",
  moon: "mood",
  neptune: "imagination",
  pluto: "depth",
  saturn: "structure",
  sun: "identity",
  "true-node": "direction",
  uranus: "change",
  venus: "desire"
};

const rowPhraseByAspect: Record<string, string> = {
  conjunction: "blend into one field today.",
  opposition: "pull into clearer awareness through contrast.",
  sextile: "can cooperate with a little invitation.",
  square: "create friction that wants a cleaner choice.",
  trine: "move with unusual ease today."
};

const detailPhraseByAspect: Record<string, string> = {
  conjunction: "This contact puts two planetary themes in the same room. Watch what gets louder, simpler, or harder to ignore.",
  opposition: "This aspect tends to ask for integration. It can be useful when you name both sides instead of forcing one to win.",
  sextile: "This aspect tends to move with less resistance. It can be useful when you want cooperation, ease, or a cleaner path through the day.",
  square: "This aspect tends to ask for adjustment. It can be productive when you name the tension instead of trying to move around it.",
  trine: "This aspect tends to move with less resistance. It can be useful when you want cooperation, ease, or a cleaner path through the day."
};

function generatedAspectDisplaySummary(planetAId: string, aspectId: string, planetBId: string, planetAThemes: string[], planetBThemes: string[]) {
  const planetATheme = rowThemeByPlanet[planetAId] ?? planetAThemes[0] ?? titleizePrimitive(planetAId).toLowerCase();
  const planetBTheme = rowThemeByPlanet[planetBId] ?? planetBThemes[0] ?? titleizePrimitive(planetBId).toLowerCase();
  const phrase = rowPhraseByAspect[aspectId] ?? "ask to be read together today.";

  return `${sentenceStart(planetATheme)} and ${planetBTheme} ${phrase}`;
}

function generatedAspectDetailParagraphs(planetAName: string, aspectId: string, planetBName: string) {
  return [
    `${planetAName} and ${planetBName} are in a ${aspectId} today. The smaller the orb, the more exact the contact feels.`,
    detailPhraseByAspect[aspectId] ?? detailPhraseByAspect.conjunction
  ];
}

function generatedPlacementDisplaySummary(planetName: string, signName: string, planetThemes: string[], signThemes: string[]) {
  const planetTheme = rowThemeByPlanet[normalizeIdPart(planetName)] ?? planetThemes[0] ?? planetName.toLowerCase();
  const signTheme = signThemes[0] ?? signName.toLowerCase();

  return `${sentenceStart(planetTheme)} moves through ${signName}'s ${signTheme} style.`;
}

function generatedPlacementDetailParagraphs(planetName: string, signName: string, element: string, modality: string) {
  return [
    `${planetName} is moving through ${signName} in the current sky.`,
    `${signName} gives this planet its style: ${element.toLowerCase()} element, ${modality.toLowerCase()} modality, and the way this sign tends to move through experience.`,
    "The planet names the topic. The sign describes how that topic is expressing itself right now."
  ];
}

function displayPlanetName(id: string) {
  return planetPrimitiveMap[id]?.name ?? titleizePrimitive(id);
}

function knowledgeDetailParagraphs(item: KnowledgeItem) {
  const explicitParagraphs = item.interpretation.detailParagraphs;

  if (explicitParagraphs?.length) {
    return explicitParagraphs;
  }

  const { planetA, aspect, planetB } = item.sourceFactors;

  if (!planetA || !aspect || !planetB) {
    return [];
  }

  return generatedAspectDetailParagraphs(displayPlanetName(planetA), aspect, displayPlanetName(planetB));
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

const knowledgeCore = [
  ...canonicalKnowledge.insightCards.map(canonicalInsightToKnowledgeItem),
  ...canonicalKnowledge.transitNatal.map(canonicalTransitToKnowledgeItem)
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

export function placementContentId(planet: string, sign: string) {
  return `${normalizeIdPart(planet)}-in-${normalizeIdPart(sign)}`;
}

function parseAspectContentId(id: string) {
  const matchedAspect = aspectNames.find((aspectName) => id.includes(`-${aspectName}-`));

  if (!matchedAspect) {
    return null;
  }

  const [planetA, planetB] = id.split(`-${matchedAspect}-`);

  if (!planetA || !planetB) {
    return null;
  }

  return { planetA, aspect: matchedAspect, planetB };
}

function generatedAspectKnowledge(id: string): KnowledgeItem | null {
  const factors = parseAspectContentId(id);

  if (!factors) {
    return null;
  }

  const planetA = planetPrimitiveMap[factors.planetA];
  const planetB = planetPrimitiveMap[factors.planetB];
  const aspect = aspectPrimitiveMap[factors.aspect];

  if (!planetA || !planetB || !aspect) {
    return null;
  }

  const planetAName = planetA.name ?? titleizePrimitive(factors.planetA);
  const planetBName = planetB.name ?? titleizePrimitive(factors.planetB);
  const aspectName = titleizePrimitive(factors.aspect);
  const planetAThemes = planetA.keywords.slice(0, 3);
  const planetBThemes = planetB.keywords.slice(0, 3);
  const aspectThemes = aspect.keywords.slice(0, 3);

  return {
    id,
    type: "natal-aspect",
    sourceFactors: {
      planetA: factors.planetA,
      aspect: factors.aspect,
      planetB: factors.planetB
    },
    surfaceTags: inferredSurfaceTags({
      id,
      type: "natal-aspect",
      sourceFactors: {
        planetA: factors.planetA,
        aspect: factors.aspect,
        planetB: factors.planetB
      },
      interpretation: {
        coreTheme: "",
        livedExperience: "",
        gift: "",
        challenge: ""
      },
      sources: [],
      status: "SOURCE_BACKED"
    }),
    contentAreas: uniqueValues([
      ...(contentAreasByPlanet[factors.planetA] ?? []),
      ...(contentAreasByPlanet[factors.planetB] ?? [])
    ]),
    priority: hardAspects.has(factors.aspect) ? 70 : 55,
    intensity: hardAspects.has(factors.aspect) ? 4 : 3,
    knowledgeBasis: {
      [factors.planetA]: planetAThemes,
      [factors.aspect]: aspectThemes,
      [factors.planetB]: planetBThemes
    },
    interpretation: {
      coreTheme: `${sentenceStart(sentenceList(planetAThemes))} meets ${sentenceList(planetBThemes)} through ${sentenceList(aspectThemes)}.`,
      displaySummary: generatedAspectDisplaySummary(factors.planetA, factors.aspect, factors.planetB, planetAThemes, planetBThemes),
      detailParagraphs: generatedAspectDetailParagraphs(planetAName, factors.aspect, planetBName),
      livedExperience: `${planetAName} and ${planetBName} are connected through a ${aspectName.toLowerCase()}, so the day may ask these two themes to be read together rather than separately.`,
      gift: `A clearer relationship between ${planetAName.toLowerCase()} themes and ${planetBName.toLowerCase()} themes.`,
      challenge: `Letting one side of the aspect dominate before the other has been understood.`
    },
    sources: [
      "data/primitives/planets.json",
      "data/primitives/aspects.json"
    ],
    status: "SOURCE_BACKED"
  };
}

function parsePlacementContentId(id: string) {
  const [planet, sign] = id.split("-in-");

  if (!planet || !sign) {
    return null;
  }

  return { planet, sign };
}

function generatedPlacementKnowledge(id: string): KnowledgeItem | null {
  const factors = parsePlacementContentId(id);

  if (!factors) {
    return null;
  }

  const planet = planetPrimitiveMap[factors.planet];
  const sign = signPrimitiveMap[factors.sign];

  if (!planet || !sign) {
    return null;
  }

  const planetName = planet.name ?? titleizePrimitive(factors.planet);
  const signName = sign.name ?? titleizePrimitive(factors.sign);
  const planetThemes = planet.keywords.slice(0, 3);
  const signThemes = sign.keywords.slice(0, 3);

  return {
    id,
    type: "placement",
    sourceFactors: {
      planetA: factors.planet,
      sign: factors.sign
    },
    surfaceTags: ["chart_profile", "natal_insights"],
    contentAreas: uniqueValues(contentAreasByPlanet[factors.planet] ?? []),
    priority: ["sun", "moon", "ascendant"].includes(factors.planet) ? 75 : 45,
    intensity: ["sun", "moon", "ascendant"].includes(factors.planet) ? 4 : 2,
    knowledgeBasis: {
      [factors.planet]: planetThemes,
      [factors.sign]: signThemes
    },
    interpretation: {
      coreTheme: `${planetName} expresses ${sentenceList(planetThemes)} through ${signName}'s ${sentenceList(signThemes)} style.`,
      displaySummary: generatedPlacementDisplaySummary(planetName, signName, planetThemes, signThemes),
      detailParagraphs: generatedPlacementDetailParagraphs(planetName, signName, sign.element, sign.modality),
      livedExperience: `${planetName} in ${signName} brings ${sentenceList(planetThemes)} through a ${sign.element.toLowerCase()}, ${sign.modality.toLowerCase()} style.`,
      gift: `A clearer read on how ${planetName.toLowerCase()} topics are moving through ${signName}.`,
      challenge: `Mistaking the sign's style for the whole story of the planet.`
    },
    sources: [
      "data/primitives/planets.json",
      "data/primitives/signs.json"
    ],
    status: "SOURCE_BACKED"
  };
}

export function getKnowledgeItem(id: string) {
  return knowledgeById.get(id) ?? generatedAspectKnowledge(id) ?? generatedPlacementKnowledge(id);
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
    return {
      bundle,
      summary: bundle.voice.summary,
      body: bundle.voice.body,
      detailParagraphs: [bundle.voice.body, ...detailParagraphs]
    };
  }

  if (bundle.knowledge) {
    return {
      bundle,
      summary: bundle.knowledge.interpretation.displaySummary ?? bundle.knowledge.interpretation.coreTheme,
      body: bundle.knowledge.interpretation.livedExperience,
      detailParagraphs: [
        bundle.knowledge.interpretation.livedExperience,
        ...detailParagraphs
      ]
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
