import type { ContentArea, ContentBundle, KnowledgeItem, SourceFactors, VoiceContentItem } from "./types";
import { equivalentAstroContentKeys } from "./keyAliases";
import { firstReaderFacingCopy, readerFacingParagraphs } from "./readerSafety";

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
  readerCopy?: {
    summary?: string;
    body?: string;
    approvedVia?: string;
    calendarLeadIn?: "date-placements-collective-level";
  };
  status?: string;
};

export type ApprovedExactSkyAspectCopy = {
  body: string;
  calendarLeadIn?: "date-placements-collective-level";
  contentId: string;
  sourceId: string;
  summary: string;
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

type AngleEntry = {
  id: string;
  kind?: string;
  point?: string;
  sign?: string;
  tldr?: string;
  body?: string;
  approach?: string;
  shadow?: string;
  note?: string;
  status?: string;
};

type SynastryAspectEntry = {
  id: string;
  planetA?: string;
  planetB?: string;
  aspect?: string;
  plainTranslation?: string;
  summaryShort?: string;
  summaryDeep?: string;
  tension?: string;
  advice?: string;
  weight?: number;
  authoringStatus?: string;
  policy?: string;
  status?: string;
};

type SynastryHouseOverlayEntry = {
  id: string;
  planet?: string;
  house?: string | number;
  plainTranslation?: string;
  summaryShort?: string;
  summaryDeep?: string;
  tension?: string;
  advice?: string;
  weight?: number;
  authoringStatus?: string;
  policy?: string;
  status?: string;
};

type CompositeEntry = {
  id: string;
  placementType?: string;
  planet?: string;
  aspect?: string;
  sign?: string;
  house?: string | number;
  plainTranslation?: string;
  policy?: string;
  status?: string;
};

type ModifierEntry = {
  id: string;
  schema?: string;
  summary?: string;
  body?: string;
  definition?: string;
  appUsage?: string | string[];
  classes?: {
    retrogrades?: Record<string, {
      id?: string;
      planet?: string;
      plainTranslation?: string;
      status?: string;
    }>;
  };
  status?: string;
};

type KnowledgeBundle = {
  primitives?: Record<string, PrimitiveEntry[]>;
  insightCards?: InsightCard[];
  transits?: TransitEntry[];
  transitNatal?: TransitNatalEntry[];
  placements?: PlacementEntry[];
  pointPlacements?: PlacementEntry[];
  angles?: AngleEntry[];
  synastryAspects?: SynastryAspectEntry[];
  synastryHouseOverlays?: SynastryHouseOverlayEntry[];
  composite?: CompositeEntry[];
  modifiers?: ModifierEntry[];
  voiceContent?: VoiceContentItem[];
};

type PrimitiveMap = Record<string, {
  name: string;
  keywords: string[];
}>;

const personalPoints = new Set(["sun", "moon", "ascendant", "midheaven"]);
const personalPlanets = new Set(["mercury", "venus", "mars"]);
const socialPlanets = new Set(["jupiter", "saturn"]);
const outerPlanets = new Set(["uranus", "neptune", "pluto"]);
const longArcPlanets = new Set(["saturn", "uranus", "neptune", "pluto", "chiron"]);
const hardAspects = new Set(["square", "opposition"]);
const softAspects = new Set(["trine", "sextile"]);

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

const contentAreasBySign: Record<string, ContentArea[]> = {
  aries: ["identity"],
  taurus: ["money", "health"],
  gemini: ["communication"],
  cancer: ["home", "family", "emotions"],
  leo: ["creativity", "identity"],
  virgo: ["health", "daily-life"],
  libra: ["relationships", "love"],
  scorpio: ["power", "relationships"],
  sagittarius: ["growth"],
  capricorn: ["career", "daily-life"],
  aquarius: ["friendship", "growth"],
  pisces: ["spirituality", "creativity"]
};

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

function summarySentence(value: string | undefined | null) {
  const text = cleanText(value);
  return text.split(/(?<=[.!?])\s+/)[0] || text;
}

function uniqueValues<T>(values: T[]) {
  return [...new Set(values)];
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

function normalizedAreas(values: Array<string | undefined> = []): ContentArea[] {
  const aliases: Record<string, ContentArea> = {
    body: "health",
    communication: "communication",
    creativity: "creativity",
    career: "career",
    work: "career",
    money: "money",
    love: "love",
    relationship: "relationships",
    relationships: "relationships",
    emotion: "emotions",
    emotions: "emotions",
    home: "home",
    family: "family",
    power: "power",
    growth: "growth",
    spirituality: "spirituality",
    friendship: "friendship",
    "daily-life": "daily-life",
    health: "health",
    identity: "identity"
  };

  return uniqueValues(values
    .map((value) => value ? aliases[normalizeIdPart(value)] : undefined)
    .filter((value): value is ContentArea => Boolean(value)));
}

function areasForFactors(...factors: Array<string | undefined>) {
  return uniqueValues(factors.flatMap((factor) => [
    ...(factor ? contentAreasByPlanet[factor] ?? [] : []),
    ...(factor ? contentAreasBySign[factor] ?? [] : [])
  ]));
}

function skyAspectPriority(planetA: string, aspect: string, planetB: string) {
  let score = 25;

  if (planetA === "moon" || planetB === "moon") {
    score += 10;
  }

  if (hardAspects.has(aspect)) {
    score += 10;
  }

  if (softAspects.has(aspect)) {
    score += 5;
  }

  if (longArcPlanets.has(planetA) || longArcPlanets.has(planetB)) {
    score += 8;
  }

  return score;
}

function personalRelevanceScore(point: string | undefined) {
  if (!point) {
    return 0;
  }

  if (personalPoints.has(point)) {
    return 35;
  }

  if (personalPlanets.has(point)) {
    return 25;
  }

  if (socialPlanets.has(point)) {
    return 18;
  }

  if (outerPlanets.has(point)) {
    return 12;
  }

  return 8;
}

function natalAspectPriority(planetA: string | undefined, aspect: string | undefined, planetB: string | undefined, intensity?: number) {
  let score = 35 + (intensity ? intensity * 8 : 0);
  score += personalRelevanceScore(planetA);
  score += personalRelevanceScore(planetB);

  if (hardAspects.has(aspect ?? "")) {
    score += 10;
  }

  return score;
}

function transitNatalPriority(transiting: string, aspect: string, natal: string) {
  let score = longArcPlanets.has(transiting) ? 35 : 20;
  score += personalRelevanceScore(natal);

  if (hardAspects.has(aspect)) {
    score += 10;
  }

  return score;
}

function placementPriority(planet: string | undefined, sign: string | undefined, mode: "sky" | "natal") {
  if (!planet || !sign) {
    return 3;
  }

  if (mode === "sky") {
    return planet === "sun" || planet === "moon" ? 30 : 10;
  }

  return personalPoints.has(planet) ? 70 : personalPlanets.has(planet) ? 50 : 35;
}

function approvedVoiceStatus(value: VoiceContentItem["status"] | undefined) {
  return value === "APPROVED" || value === "LIVE";
}

function approvedKnowledgeStatus(value: KnowledgeItem["status"] | undefined) {
  return value === "APPROVED" || value === "SOURCE_BACKED" || value === "LIVE";
}

export function createDomainRegistry(bundleInput: unknown) {
  const bundle = bundleInput as KnowledgeBundle;
  const registryMode: "sky" | "natal" = (bundle.transits?.length ?? 0) > 0 ? "sky" : "natal";
  const planetMap = normalizePrimitiveMap(bundle.primitives?.planet);
  const aspectMap = normalizePrimitiveMap(bundle.primitives?.aspect);
  const signMap = normalizePrimitiveMap(bundle.primitives?.sign);
  const voiceBySourceAndVoice = new Map((bundle.voiceContent ?? []).map((item) => [`${item.sourceId}:${item.voiceId}`, item]));
  const approvedExactSkyAspectCopyById = new Map<string, ApprovedExactSkyAspectCopy>();
  const knowledgeById = new Map<string, KnowledgeItem>();
  const legacyIdByAlias = new Map<string, string>();
  const retrogradeMeaningByPlanet = new Map<string, string>();

  for (const modifier of bundle.modifiers ?? []) {
    const retrogrades = modifier.classes?.retrogrades;

    if (!retrogrades) {
      continue;
    }

    Object.values(retrogrades).forEach((retrograde) => {
      const planet = retrograde.planet ? normalizeIdPart(retrograde.planet) : "";
      const meaning = cleanText(retrograde.plainTranslation);

      if (planet && meaning) {
        retrogradeMeaningByPlanet.set(planet, meaning);
      }
    });
  }

  function addKnowledge(item: KnowledgeItem) {
    knowledgeById.set(item.id, item);
  }

  function addKnowledgeAlias(item: KnowledgeItem, id: string) {
    knowledgeById.set(id, {
      ...item,
      id
    });

    if (id !== item.id) {
      legacyIdByAlias.set(id, item.id);
    }
  }

  for (const card of bundle.insightCards ?? []) {
    const factor = card.sourceFactors?.[0] ?? {};
    const areas = uniqueValues([
      ...normalizedAreas(card.lifeAreas),
      ...areasForFactors(factor.planetA, factor.planetB)
    ]);

    const knowledgeItem: KnowledgeItem = {
      id: card.id,
      type: card.kind === "natal-aspect" ? "natal-aspect" : "primitive",
      sourceFactors: {
        planetA: factor.planetA,
        aspect: factor.aspect,
        planetB: factor.planetB
      },
      contentAreas: areas,
      priority: natalAspectPriority(factor.planetA, factor.aspect, factor.planetB, card.intensity),
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
    };

    addKnowledge(knowledgeItem);

    if (card.kind === "natal-aspect" && factor.planetA && factor.aspect && factor.planetB) {
      addKnowledgeAlias(knowledgeItem, natalAspectContentId(factor.planetA, factor.aspect, factor.planetB));
    }
  }

  for (const transit of bundle.transits ?? []) {
    if (!transit.transiting || !transit.aspect || !transit.other) {
      continue;
    }

    const sourceSummary = cleanText(transit.tldr) || cleanText(transit.modern) || cleanText(transit.base);
    const sourceBody = cleanText(transit.modern) || cleanText(transit.base) || cleanText(transit.tldr);
    const readerSummary = cleanText(transit.readerCopy?.summary);
    const readerBody = cleanText(transit.readerCopy?.body);
    const readerApproved = transit.status === "LIVE";

    if (readerApproved && readerBody) {
      const exactCopy = {
        body: readerBody,
        ...(transit.readerCopy?.calendarLeadIn
          ? { calendarLeadIn: transit.readerCopy.calendarLeadIn }
          : {}),
        contentId: currentSkyAspectContentId(transit.transiting, transit.aspect, transit.other),
        sourceId: transit.id,
        summary: readerSummary || readerBody
      };
      approvedExactSkyAspectCopyById.set(exactCopy.contentId, exactCopy);
      approvedExactSkyAspectCopyById.set(
        currentSkyAspectContentId(transit.other, transit.aspect, transit.transiting),
        exactCopy
      );
    }

    const knowledgeItem: KnowledgeItem = {
      id: currentSkyAspectContentId(transit.transiting, transit.aspect, transit.other),
      type: "current-sky-aspect",
      sourceFactors: {
        planetA: transit.transiting,
        aspect: transit.aspect,
        planetB: transit.other
      },
      contentAreas: areasForFactors(transit.transiting, transit.other),
      priority: skyAspectPriority(transit.transiting, transit.aspect, transit.other),
      intensity: hardAspects.has(transit.aspect) ? 4 : softAspects.has(transit.aspect) ? 3 : 2,
      interpretation: {
        coreTheme: sourceSummary,
        displaySummary: sourceSummary,
        detailParagraphs: cleanParagraphs([sourceBody]),
        livedExperience: sourceBody,
        gift: cleanText(transit.business),
        challenge: cleanText(transit.shadow)
      },
      sources: ["@tldr/astro-knowledge/sky"],
      status: reviewStatus(transit.status)
    };

    addKnowledge(knowledgeItem);
  }

  for (const transit of bundle.transitNatal ?? []) {
    if (!transit.transiting || !transit.aspect || !transit.natal) {
      continue;
    }

    const id = transitNatalContentId(transit.transiting, transit.aspect, transit.natal);
    const sourceSummary = cleanText(transit.plainTranslation);
    const sourceDetail = sourceSummary && !/\b(days?|weeks?|months?|years?)\.$/i.test(sourceSummary)
      ? sourceSummary
      : undefined;

    addKnowledge({
      id,
      type: "transit-to-natal",
      sourceFactors: {
        planetA: transit.transiting,
        aspect: transit.aspect,
        planetB: transit.natal
      },
      contentAreas: areasForFactors(transit.transiting, transit.natal),
      priority: transitNatalPriority(transit.transiting, transit.aspect, transit.natal),
      intensity: hardAspects.has(transit.aspect) ? 4 : softAspects.has(transit.aspect) ? 3 : 2,
      interpretation: {
        coreTheme: sourceSummary,
        displaySummary: sourceSummary,
        detailParagraphs: cleanParagraphs([sourceDetail, transit.policy]),
        livedExperience: sourceSummary,
        gift: "",
        challenge: ""
      },
      sources: ["@tldr/astro-knowledge/natal"],
      status: reviewStatus(transit.status)
    });
  }

  for (const placement of [...(bundle.placements ?? []), ...(bundle.pointPlacements ?? [])]) {
    const planet = placement.planet ?? placement.point;
    const sign = placement.sign ?? (placement.kind === "sign" && typeof placement.key === "string" ? placement.key : undefined);
    const mode = registryMode;
    const sourceSummary = cleanText(placement.tldr);
    const sourceBody = cleanText(placement.body);
    const sourceDetailParagraphs = cleanParagraphs([sourceBody, placement.gift, placement.challenge]);

    const knowledgeItem: KnowledgeItem = {
      id: placement.id,
      type: "placement",
      sourceFactors: {
        planetA: planet,
        sign,
        house: placement.house ? String(placement.house) : undefined
      },
      contentAreas: uniqueValues([
        ...areasForFactors(planet, sign),
        ...normalizedAreas([placement.kind])
      ]),
      priority: placementPriority(planet, sign, mode),
      intensity: placementPriority(planet, sign, mode) >= 50 ? 4 : 2,
      interpretation: {
        coreTheme: sourceSummary || placement.id,
        displaySummary: sourceSummary || sourceBody,
        detailParagraphs: sourceDetailParagraphs,
        livedExperience: sourceBody || sourceSummary,
        gift: cleanText(placement.gift),
        challenge: cleanText(placement.challenge)
      },
      sources: ["@tldr/astro-knowledge"],
      status: reviewStatus(placement.status)
    };

    addKnowledge(knowledgeItem);

    if (planet && sign) {
      const legacyId = placementContentId(planet, sign);
      const domainId = mode === "sky" ? skyPlacementContentId(planet, sign) : natalPlacementContentId(planet, sign);

      addKnowledgeAlias(knowledgeItem, legacyId);
      addKnowledgeAlias(knowledgeItem, domainId);
    }
  }

  for (const angle of bundle.angles ?? []) {
    if (!angle.point || !angle.sign) {
      continue;
    }

    const id = natalPlacementContentId(angle.point, angle.sign);
    const knowledgeItem: KnowledgeItem = {
      id,
      type: "placement",
      sourceFactors: {
        planetA: angle.point,
        sign: angle.sign
      },
      contentAreas: uniqueValues([
        "identity",
        ...areasForFactors(angle.point, angle.sign)
      ]),
      priority: placementPriority(angle.point, angle.sign, "natal"),
      intensity: 4,
      interpretation: {
        coreTheme: cleanText(angle.tldr) || id,
        displaySummary: cleanText(angle.tldr),
        detailParagraphs: cleanParagraphs([angle.body, angle.approach, angle.shadow]),
        livedExperience: cleanText(angle.body),
        gift: cleanText(angle.approach),
        challenge: cleanText(angle.shadow)
      },
      sources: ["@tldr/astro-knowledge/angles"],
      status: reviewStatus(angle.status)
    };

    addKnowledge(knowledgeItem);
    addKnowledgeAlias(knowledgeItem, placementContentId(angle.point, angle.sign));
  }

  for (const entry of bundle.synastryAspects ?? []) {
    if (!entry.planetA || !entry.planetB || !entry.aspect) {
      continue;
    }

    const planetA = normalizeIdPart(entry.planetA);
    const planetB = normalizeIdPart(entry.planetB);
    const aspect = normalizeIdPart(entry.aspect);
    const preview = cleanText(entry.summaryShort) || cleanText(entry.plainTranslation);
    const expanded = cleanText(entry.summaryDeep) || preview || cleanText(entry.plainTranslation);
    const summary = preview || `${titleize(planetA)} ${aspect} ${titleize(planetB)}`;
    const knowledgeItem: KnowledgeItem = {
      id: entry.id,
      type: "synastry-aspect",
      sourceFactors: {
        planetA,
        aspect,
        planetB
      },
      surfaceTags: ["synastry"],
      contentAreas: uniqueValues(["relationships", ...areasForFactors(planetA, planetB)]),
      priority: natalAspectPriority(planetA, aspect, planetB),
      intensity: hardAspects.has(aspect) ? 4 : softAspects.has(aspect) ? 3 : 2,
      interpretation: {
        coreTheme: summary,
        displaySummary: summary,
        detailParagraphs: cleanParagraphs([expanded, entry.tension, entry.advice, entry.policy]),
        livedExperience: expanded || summary,
        gift: cleanText(entry.advice),
        challenge: cleanText(entry.tension)
      },
      sources: ["@tldr/astro-knowledge/synastry"],
      status: reviewStatus(entry.status)
    };
    const baseId = aspectContentId(planetA, aspect, planetB);
    const reverseId = aspectContentId(planetB, aspect, planetA);

    addKnowledge(knowledgeItem);
    [baseId, reverseId].forEach((alias) => {
      addKnowledgeAlias(knowledgeItem, alias);
      addKnowledgeAlias(knowledgeItem, `synastry-${alias}`);
      addKnowledgeAlias(knowledgeItem, `relationship-${alias}`);
    });
  }

  for (const entry of bundle.synastryHouseOverlays ?? []) {
    if (!entry.planet || !entry.house) {
      continue;
    }

    const planet = normalizeIdPart(entry.planet);
    const house = String(entry.house);
    const preview = cleanText(entry.summaryShort) || cleanText(entry.plainTranslation);
    const expanded = cleanText(entry.summaryDeep) || preview || cleanText(entry.plainTranslation);
    const summary = preview || summarySentence(entry.plainTranslation) || `${titleize(planet)} in the ${house} house`;
    const knowledgeItem: KnowledgeItem = {
      id: entry.id,
      type: "synastry-overlay",
      sourceFactors: {
        planetA: planet,
        house
      },
      surfaceTags: ["synastry"],
      contentAreas: ["relationships"],
      priority: personalRelevanceScore(planet) + 20,
      intensity: personalRelevanceScore(planet) >= 25 ? 4 : 2,
      interpretation: {
        coreTheme: summary,
        displaySummary: summary,
        detailParagraphs: cleanParagraphs([expanded, entry.tension, entry.advice, entry.policy]),
        livedExperience: expanded || summary,
        gift: cleanText(entry.advice),
        challenge: cleanText(entry.tension)
      },
      sources: ["@tldr/astro-knowledge/synastry"],
      status: reviewStatus(entry.status)
    };
    const aliases = [
      `${planet}-house-${house}`,
      `${planet}-house${house}`,
      placementContentId(planet, house),
      entry.id
    ];

    addKnowledge(knowledgeItem);
    aliases.forEach((alias) => {
      addKnowledgeAlias(knowledgeItem, alias);
      addKnowledgeAlias(knowledgeItem, `synastry-${alias}`);
      addKnowledgeAlias(knowledgeItem, `relationship-${alias}`);
    });
  }

  for (const entry of bundle.composite ?? []) {
    const summary = summarySentence(entry.plainTranslation) || entry.id;
    const sourceFactors: SourceFactors = {};
    const aliases = new Set<string>([entry.id]);

    if (entry.placementType === "aspect" && entry.planet && entry.aspect) {
      const [planetA, planetB] = entry.planet.split("-").map(normalizeIdPart);
      const aspect = normalizeIdPart(entry.aspect);

      if (planetA && planetB) {
        sourceFactors.planetA = planetA;
        sourceFactors.aspect = aspect;
        sourceFactors.planetB = planetB;
        [aspectContentId(planetA, aspect, planetB), aspectContentId(planetB, aspect, planetA)].forEach((alias) => aliases.add(alias));
      }
    }

    if (entry.placementType === "sign" && entry.planet && entry.sign) {
      sourceFactors.planetA = normalizeIdPart(entry.planet);
      sourceFactors.sign = normalizeIdPart(entry.sign);
      aliases.add(placementContentId(sourceFactors.planetA, sourceFactors.sign));
    }

    if (entry.placementType === "house" && entry.planet && entry.house) {
      sourceFactors.planetA = normalizeIdPart(entry.planet);
      sourceFactors.house = String(entry.house);
      aliases.add(`${sourceFactors.planetA}-house-${sourceFactors.house}`);
      aliases.add(`${sourceFactors.planetA}-house${sourceFactors.house}`);
      aliases.add(placementContentId(sourceFactors.planetA, sourceFactors.house));
    }

    const knowledgeItem: KnowledgeItem = {
      id: entry.id,
      type: "composite",
      sourceFactors,
      surfaceTags: ["synastry"],
      contentAreas: uniqueValues(["relationships", ...areasForFactors(sourceFactors.planetA, sourceFactors.planetB, sourceFactors.sign)]),
      priority: personalRelevanceScore(sourceFactors.planetA) + personalRelevanceScore(sourceFactors.planetB) + 20,
      intensity: hardAspects.has(sourceFactors.aspect ?? "") ? 4 : 3,
      interpretation: {
        coreTheme: summary,
        displaySummary: summary,
        detailParagraphs: cleanParagraphs([entry.plainTranslation, entry.policy]),
        livedExperience: cleanText(entry.plainTranslation) || summary,
        gift: "",
        challenge: ""
      },
      sources: ["@tldr/astro-knowledge/composite"],
      status: reviewStatus(entry.status)
    };

    addKnowledge(knowledgeItem);
    aliases.forEach((alias) => {
      addKnowledgeAlias(knowledgeItem, alias);
      addKnowledgeAlias(knowledgeItem, `composite-${alias}`);
      addKnowledgeAlias(knowledgeItem, `relationship-${alias}`);
    });
  }

  function getKnowledgeItem(id: string) {
    for (const alias of equivalentAstroContentKeys(id)) {
      const knowledge = knowledgeById.get(alias);

      if (knowledge) {
        return knowledge;
      }
    }

    return null;
  }

  function getVoiceContentItem(id: string, voiceId = defaultVoiceId) {
    return voiceBySourceAndVoice.get(`${id}:${voiceId}`)
      ?? voiceBySourceAndVoice.get(`${legacyIdByAlias.get(id)}:${voiceId}`)
      ?? null;
  }

  function getContentBundle(id: string, voiceId = defaultVoiceId): ContentBundle {
    const knowledge = getKnowledgeItem(id) ?? null;
    const voice = getVoiceContentItem(id, voiceId);

    const legacyId = legacyIdByAlias.get(id);

    if (knowledge && approvedVoiceStatus(voice?.status) && (voice?.sourceId === knowledge.id || voice?.sourceId === legacyId)) {
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

    if (bundle.status === "READY" && bundle.voice) {
      const summary = bundle.voice.summary;
      const body = bundle.voice.body;
      const renderedDetailParagraphs = [
        bundle.voice.body,
        ...(bundle.knowledge?.interpretation.detailParagraphs ?? [])
      ];

      return {
        bundle,
        summary: firstReaderFacingCopy([cleanText(summary)]),
        body: firstReaderFacingCopy([cleanText(body)]),
        detailParagraphs: readerFacingParagraphs(cleanParagraphs(renderedDetailParagraphs))
      };
    }

    if (bundle.knowledge && approvedKnowledgeStatus(bundle.knowledge.status)) {
      const knowledgeDetailParagraphs = bundle.knowledge.interpretation.detailParagraphs ?? [];
      const fallbackDetailParagraphs = knowledgeDetailParagraphs.length > 0
        ? knowledgeDetailParagraphs
        : cleanParagraphs([bundle.knowledge.interpretation.livedExperience]);
      const summary = cleanText(
        bundle.knowledge.interpretation.displaySummary
      ) || cleanText(
        bundle.knowledge.interpretation.coreTheme
      );
      const body = cleanText(
        bundle.knowledge.interpretation.livedExperience
      );
      const renderedDetailParagraphs = fallbackDetailParagraphs;

      return {
        bundle,
        summary: firstReaderFacingCopy([summary]),
        body: firstReaderFacingCopy([body]),
        detailParagraphs: readerFacingParagraphs(cleanParagraphs(renderedDetailParagraphs))
      };
    }

    return {
      bundle,
      summary: null,
      body: null,
      detailParagraphs: []
    };
  }

  function retrogradePlanetMeaning(planet: string) {
    return retrogradeMeaningByPlanet.get(normalizeIdPart(planet)) ?? null;
  }

  function approvedExactSkyAspectCopy(planetA: string, aspect: string, planetB: string) {
    return approvedExactSkyAspectCopyById.get(currentSkyAspectContentId(planetA, aspect, planetB)) ?? null;
  }

  return {
    approvedExactSkyAspectCopy,
    approvedVoiceOrKnowledgeFallback,
    retrogradePlanetMeaning,
    aspectContentId,
    natalAspectContentId,
    currentSkyAspectContentId,
    transitNatalContentId,
    placementContentId,
    skyPlacementContentId,
    natalPlacementContentId
  };
}
