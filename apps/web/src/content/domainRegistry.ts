import type { ContentArea, ContentBundle, KnowledgeItem, VoiceContentItem } from "./types";

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
  policy?: string;
  status?: string;
};

type SynastryHouseOverlayEntry = {
  id: string;
  planet?: string;
  house?: string | number;
  plainTranslation?: string;
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
  voiceContent?: VoiceContentItem[];
};

type PrimitiveMap = Record<string, {
  name: string;
  keywords: string[];
}>;

const planetTopic: Record<string, string> = {
  ascendant: "how you meet the world",
  jupiter: "growth, belief, and opportunity",
  mars: "action, desire, and conflict",
  mercury: "thinking, language, and decisions",
  moon: "feelings, needs, and daily rhythm",
  neptune: "imagination, longing, and blurred edges",
  pluto: "power, control, and transformation",
  saturn: "structure, responsibility, and limits",
  sun: "attention, vitality, and self-expression",
  "true-node": "direction, timing, and what feels newly relevant",
  uranus: "change, disruption, and freedom",
  venus: "affection, pleasure, and value"
};

const skyPlanetTopic: Record<string, string> = {
  ...planetTopic,
  moon: "feelings, needs, and reactions",
  sun: "attention, vitality, and the larger tone of the season"
};

const signStyle: Record<string, string> = {
  aries: "urgency, courage, and direct action",
  taurus: "stability, patience, and material reality",
  gemini: "curiosity, language, movement, and fast-moving information",
  cancer: "memory, protection, belonging, and emotional context",
  leo: "visibility, confidence, creativity, and recognition",
  virgo: "discernment, repair, routine, and useful detail",
  libra: "relationship, fairness, aesthetics, and social balance",
  scorpio: "depth, privacy, trust, and emotional honesty",
  sagittarius: "meaning, belief, exploration, and perspective",
  capricorn: "structure, restraint, responsibility, and practical next steps",
  aquarius: "distance, systems, independence, and collective patterns",
  pisces: "sensitivity, imagination, compassion, and porous boundaries"
};

const aspectAction: Record<string, string> = {
  conjunction: "Name what is blending before you respond. One topic may be coloring the other more than you realize.",
  opposition: "Name both sides before you choose one. The useful information may be in the contrast.",
  square: "Slow the reaction down. The pressure is useful when it shows what needs a clearer choice.",
  trine: "Use the opening on purpose. A simple action may move something forward without much force.",
  sextile: "Choose one small action. The support is available, but it still needs somewhere practical to land."
};

const aspectVerb: Record<string, string> = {
  conjunction: "conjoins",
  opposition: "opposes",
  square: "squares",
  trine: "trines",
  sextile: "sextiles"
};

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

function sentenceList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function sentenceStart(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function aspectBridge(aspect: string, planetBTheme: string) {
  switch (aspect) {
    case "conjunction":
      return `may blend with ${planetBTheme}`;
    case "opposition":
      return `may pull against ${planetBTheme}`;
    case "square":
      return `may press against ${planetBTheme}`;
    case "trine":
      return `may move with less resistance alongside ${planetBTheme}`;
    case "sextile":
      return `may cooperate with ${planetBTheme} if you use the opening`;
    default:
      return `may interact with ${planetBTheme}`;
  }
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

function readableAspectSummary(planetA: string, aspect: string, planetB: string, mode: "sky" | "natal") {
  const planetALabel = titleize(planetA);
  const planetBLabel = titleize(planetB);
  const planetATheme = mode === "sky" ? skyPlanetTopic[planetA] ?? planetTopic[planetA] : planetTopic[planetA];
  const planetBTheme = mode === "sky" ? skyPlanetTopic[planetB] ?? planetTopic[planetB] : planetTopic[planetB];
  const verb = aspectVerb[aspect] ?? aspect;

  if (mode === "sky") {
    return `${planetALabel} ${verb} ${planetBLabel} today. ${sentenceStart(planetATheme)} ${aspectBridge(aspect, planetBTheme)}.`;
  }

  return `${planetALabel} ${aspect} ${planetBLabel} can link ${planetATheme} with ${planetBTheme}.`;
}

function skyAspectHeadline(planetA: string, aspect: string, planetB: string) {
  const pair = [planetA, planetB].sort().join("-");
  const specific: Record<string, string> = {
    "mercury-neptune": "Conversations may blur today.",
    "moon-uranus": "Try a different response today.",
    "sun-saturn": "Turn one idea into action.",
    "venus-saturn": "Affection may need proof today.",
    "mars-saturn": "Do not force what needs patience.",
    "moon-venus": "Comfort may be easier to reach.",
    "mercury-saturn": "Say the practical thing clearly.",
    "venus-mars": "Desire may need better timing.",
    "sun-neptune": "Do not rush to believe the story.",
    "moon-pluto": "A feeling may run deeper than expected."
  };

  if (specific[pair]) {
    return specific[pair];
  }

  if (hardAspects.has(aspect)) {
    return "Something may need a clearer choice today.";
  }

  if (softAspects.has(aspect)) {
    return "A small opening may be easier to use today.";
  }

  return "Two parts of the day may be hard to separate.";
}

function skyAspectNotice(planetA: string, aspect: string, planetB: string) {
  const planetALabel = titleize(planetA);
  const planetBLabel = titleize(planetB);
  const firstTopic = skyPlanetTopic[planetA] ?? planetTopic[planetA] ?? `${planetALabel.toLowerCase()} themes`;
  const secondTopic = skyPlanetTopic[planetB] ?? planetTopic[planetB] ?? `${planetBLabel.toLowerCase()} themes`;
  const pair = [planetA, planetB].sort().join("-");
  const specific: Record<string, string> = {
    "mercury-neptune": "Conversations can blur today. You may think you said one thing while someone else hears another, or a message may land in a tone nobody intended.",
    "moon-uranus": "Your usual reaction may not fit today. A feeling can change quickly, or something small may interrupt the plan you thought you were following.",
    "sun-saturn": "The day can make scattered ideas easier to organize. If your attention has been split across too many choices, one useful next step may become clearer.",
    "venus-saturn": "Affection may feel more believable when it shows up through actions. Empty reassurance may not land as well as consistency, follow-through, or a practical gesture.",
    "mars-saturn": "Effort may meet a limit today. Pushing harder can waste energy if the timing, structure, or responsibility underneath the action has not been handled.",
    "moon-venus": "Comfort may be easier to name today. A small act of care, beauty, food, rest, or reassurance can do more than a big emotional conversation.",
    "mercury-saturn": "The practical conversation may be the one that helps most today. Details, timing, and limits can make a message clearer instead of colder.",
    "venus-mars": "Attraction and urgency can get tangled today. Wanting something does not automatically mean the timing is right.",
    "sun-neptune": "The story may be softer than the facts today. Inspiration is possible, but so is seeing what you want to see.",
    "moon-pluto": "A reaction may carry more history than the moment explains. The feeling may be real, but it may not be only about what just happened."
  };

  if (specific[pair]) {
    return specific[pair];
  }

  if (hardAspects.has(aspect)) {
    return `${planetALabel} ${aspectVerb[aspect] ?? aspect} ${planetBLabel} today, so ${firstTopic} may run into ${secondTopic}. You may notice the tension through a conversation, plan, reaction, or choice that does not settle as quickly as you want it to.`;
  }

  if (softAspects.has(aspect)) {
    return `${planetALabel} ${aspectVerb[aspect] ?? aspect} ${planetBLabel} today, so ${firstTopic} may work more easily with ${secondTopic}. You may notice a small opening where a usual pattern can shift without needing a dramatic push.`;
  }

  return `${planetALabel} ${aspectVerb[aspect] ?? aspect} ${planetBLabel} today, blending ${firstTopic} with ${secondTopic}. You may notice these two themes showing up at the same time instead of as separate issues.`;
}

function skyAspectWhy(planetA: string, aspect: string, planetB: string) {
  const planetALabel = titleize(planetA);
  const planetBLabel = titleize(planetB);
  const firstTopic = skyPlanetTopic[planetA] ?? planetTopic[planetA] ?? `${planetALabel.toLowerCase()} themes`;
  const secondTopic = skyPlanetTopic[planetB] ?? planetTopic[planetB] ?? `${planetBLabel.toLowerCase()} themes`;
  const pair = [planetA, planetB].sort().join("-");
  const specific: Record<string, string> = {
    "mercury-neptune": "Mercury describes how information moves. Neptune softens boundaries, so facts, impressions, memories, and wishes can slide into each other. The square creates friction between what is being said and what is actually clear.",
    "moon-uranus": "The Moon describes instinct and immediate need. Uranus brings disruption, freedom, and the urge to break pattern. A trine can make the change easier to use if you do not treat the first reaction as the only option.",
    "sun-saturn": "The Sun shows where attention is going. Saturn adds structure, discipline, and reality checks. A sextile is an opening, so focus is available if you choose one concrete place to put it.",
    "venus-saturn": "Venus describes affection, pleasure, and value. Saturn asks for proof, patience, and maturity. The contact can make care feel more serious, but also more trustworthy when it is backed by action.",
    "mars-saturn": "Mars wants movement. Saturn slows things down until the structure is strong enough to hold the effort. The aspect can feel frustrating, but it is useful for choosing the action that will actually work.",
    "moon-venus": "The Moon describes need and response. Venus describes pleasure, ease, and affection. The contact can make it easier to understand what would feel supportive in a simple, concrete way.",
    "mercury-saturn": "Mercury handles words and decisions. Saturn brings limits, time, and responsibility. The contact favors clarity over performance.",
    "venus-mars": "Venus wants connection and pleasure. Mars wants action and desire. The aspect can show where attraction needs timing, consent, or a cleaner choice.",
    "sun-neptune": "The Sun brings attention. Neptune brings imagination, longing, and blur. The contact can inspire, but it can also make the obvious facts harder to hold.",
    "moon-pluto": "The Moon describes emotional need. Pluto brings depth, control, fear, and transformation. The contact can pull a feeling up from underneath the surface."
  };
  const aspectMeaning: Record<string, string> = {
    conjunction: "A conjunction blends the planets, so it can be harder to tell where one topic ends and the other begins.",
    opposition: "An opposition creates contrast, so the day may show two needs, views, or instincts facing each other.",
    square: "A square creates friction, so the issue may become obvious through pressure, interruption, or a choice that cannot stay vague.",
    trine: "A trine is a supportive angle, so the useful part may feel available without much force.",
    sextile: "A sextile is an opening, but it usually works best when you take a small step toward it."
  };

  if (specific[pair]) {
    return specific[pair];
  }

  return `${planetALabel} describes ${firstTopic}. ${planetBLabel} brings in ${secondTopic}. ${aspectMeaning[aspect] ?? "The aspect shows how these two parts of the sky are interacting."}`;
}

function skyAspectMove(planetA: string, aspect: string, planetB: string) {
  const pair = [planetA, planetB].sort().join("-");
  const specific: Record<string, string> = {
    "mercury-neptune": "Get important details in writing. Ask the clarifying question before reacting, and wait before making a decision that depends on certainty.",
    "moon-uranus": "Try a different response before repeating the old one. Take enough space to think clearly, then make one practical adjustment.",
    "sun-saturn": "Narrow the field. Pick the idea with the clearest next step and put it on a timeline.",
    "venus-saturn": "Look for care in actions, not only in words. Let consistency matter more than a quick reassurance.",
    "mars-saturn": "Move slowly enough to avoid wasting energy. Choose the task that can actually be completed.",
    "moon-venus": "Make comfort concrete. Say what would feel supportive instead of hoping the other person guesses.",
    "mercury-saturn": "Keep the message simple. Say what is true, what is possible, and what needs more time.",
    "venus-mars": "Notice the difference between attraction and urgency. Let desire move, but do not let it make the whole decision.",
    "sun-neptune": "Check the facts before committing to the story. Inspiration is useful, but only if it can survive a little daylight.",
    "moon-pluto": "Do not dismiss the feeling just because it is intense. Name what is underneath it before trying to control it."
  };

  return specific[pair] ?? aspectAction[aspect] ?? "Pause long enough to name what is happening, then choose the next step that still makes sense tomorrow.";
}

function skyAspectTiming(planetA: string, planetB: string) {
  if (planetA === "moon" || planetB === "moon") {
    return "This is strongest today and should ease within the next day.";
  }

  if (longArcPlanets.has(planetA) || longArcPlanets.has(planetB)) {
    return "This is active now, with the strongest effect around the exact aspect.";
  }

  return "This is strongest today and should start easing over the next day or so.";
}

function skyAspectAdvice(planetA: string, aspect: string, planetB: string) {
  return `${skyAspectNotice(planetA, aspect, planetB)} ${skyAspectMove(planetA, aspect, planetB)} ${skyAspectTiming(planetA, planetB)}`;
}

function skyAspectDetailParagraphs(planetA: string, aspect: string, planetB: string) {
  return cleanParagraphs([
    skyAspectNotice(planetA, aspect, planetB),
    skyAspectWhy(planetA, aspect, planetB),
    `${skyAspectMove(planetA, aspect, planetB)} ${skyAspectTiming(planetA, planetB)}`
  ]);
}

function natalAspectAdvice(planetA: string, aspect: string, planetB: string) {
  const planetALabel = titleize(planetA);
  const planetBLabel = titleize(planetB);
  const action = aspectAction[aspect] ?? "This pattern is easier to work with when both sides are named clearly.";

  return `In a birth chart, ${planetALabel} ${aspect} ${planetBLabel} describes a recurring way these two parts of life interact. ${action}`;
}

function transitNatalSummary(transiting: string, aspect: string, natal: string) {
  const transitingLabel = titleize(transiting);
  const natalLabel = titleize(natal);
  const transitingTheme = planetTopic[transiting] ?? `${transitingLabel.toLowerCase()} themes`;
  const natalTheme = planetTopic[natal] ?? `${natalLabel.toLowerCase()} themes`;
  const verb = aspectVerb[aspect] ?? aspect;

  return `${transitingLabel} ${verb} your natal ${natalLabel}, bringing ${transitingTheme} into contact with ${natalTheme}.`;
}

function transitNatalAdvice(transiting: string, aspect: string, natal: string) {
  const transitingLabel = titleize(transiting);
  const natalLabel = titleize(natal);
  const transitTheme = planetTopic[transiting] ?? `${transitingLabel.toLowerCase()} themes`;
  const natalTheme = planetTopic[natal] ?? `${natalLabel.toLowerCase()} themes`;

  const actionByAspect: Record<string, string> = {
    conjunction: "Notice where the two topics are blending. Choose one concrete response instead of letting the whole pattern run the day.",
    opposition: "The useful move is naming both sides before you react. Look for the contrast between what is being stirred up now and what your chart already tends to carry.",
    square: "The pressure is useful when it shows what needs adjustment. Slow the response down, clarify the choice, and make the next step smaller than your first impulse.",
    trine: "There may be a natural opening here. Use it deliberately by taking the simple action that supports the pattern instead of waiting for it to resolve itself.",
    sextile: "The support is available, but it still needs participation. Pick one small action that gives the opening somewhere practical to land."
  };

  return `This transit can show where ${transitingLabel} themes are activating your natal ${natalLabel} pattern: ${natalTheme}. ${actionByAspect[aspect] ?? "Treat it as a short window for noticing the pattern and choosing the cleanest next step."}`;
}

function placementSummary(planet: string, sign: string, mode: "sky" | "natal") {
  const planetLabel = titleize(planet);
  const signLabel = titleize(sign);
  const topic = mode === "sky" ? skyPlanetTopic[planet] ?? planetTopic[planet] : planetTopic[planet];
  const style = signStyle[sign] ?? `${signLabel.toLowerCase()} themes`;

  if (mode === "sky") {
    if (planet === "sun") {
      return `${signLabel} season puts attention on ${style}.`;
    }

    if (planet === "moon") {
      return `Today may move through ${style}.`;
    }

    return `${planetLabel} is moving through ${signLabel}, bringing ${topic} into ${style}.`;
  }

  return `${planetLabel} in ${signLabel} can describe ${topic} through ${style}.`;
}

function placementAdvice(planet: string, sign: string, mode: "sky" | "natal") {
  const planetLabel = titleize(planet);
  const signLabel = titleize(sign);
  const topic = mode === "sky" ? skyPlanetTopic[planet] ?? planetTopic[planet] : planetTopic[planet];
  const style = signStyle[sign] ?? `${signLabel.toLowerCase()} themes`;

  if (mode === "sky") {
    if (planet === "sun") {
      return `${signLabel} season brings attention to ${style}. Use it by giving your attention a clearer question, conversation, decision, or next step.`;
    }

    if (planet === "moon") {
      return `The Moon is moving through ${signLabel}, so the emotional tone of the day may be filtered through ${style}. Notice what you need before you decide how quickly to respond.`;
    }

    return `${planetLabel} is moving through ${signLabel}, so ${topic} may be filtered through ${style}. Notice where this shows up in the day, then choose one response that is concrete enough to act on.`;
  }

  return `This placement can make ${topic} easier to understand through ${style}. Notice where this pattern helps you name what is happening, then choose the response that keeps the strength without repeating the habit.`;
}

function skyPlacementDetailParagraphs(planet: string, sign: string) {
  const planetLabel = titleize(planet);
  const signLabel = titleize(sign);
  const topic = skyPlanetTopic[planet] ?? planetTopic[planet] ?? `${planetLabel.toLowerCase()} themes`;
  const style = signStyle[sign] ?? `${signLabel.toLowerCase()} themes`;

  if (planet === "sun") {
    return cleanParagraphs([
      `${signLabel} season brings attention to ${style}. You may notice the day keeps pulling you back to the conversations, choices, and patterns connected to that sign.`,
      `The Sun describes attention, vitality, and the larger tone of the season. In ${signLabel}, that tone moves through ${style}.`,
      `Give the season one clear place to go. Choose the question, conversation, or next step that makes the broader theme useful in real life.`
    ]);
  }

  if (planet === "moon") {
    return cleanParagraphs([
      `The Moon is in ${signLabel} today, so feelings, needs, and reactions may move through ${style}.`,
      `The Moon describes what people need quickly and instinctively. In ${signLabel}, the mood of the day is more likely to look for ${style}.`,
      `Notice what you need before you answer too fast. A simple pause can keep the feeling from turning into an automatic reaction.`
    ]);
  }

  return cleanParagraphs([
    `${planetLabel} is moving through ${signLabel}, bringing ${topic} into ${style}.`,
    `${planetLabel} describes ${topic}. In ${signLabel}, that topic takes on ${style}.`,
    `Look for where this shows up in ordinary decisions today. Choose one response that is concrete enough to act on.`
  ]);
}

export function createDomainRegistry(bundleInput: unknown) {
  const bundle = bundleInput as KnowledgeBundle;
  const registryMode: "sky" | "natal" = (bundle.transits?.length ?? 0) > 0 ? "sky" : "natal";
  const planetMap = normalizePrimitiveMap(bundle.primitives?.planet);
  const aspectMap = normalizePrimitiveMap(bundle.primitives?.aspect);
  const signMap = normalizePrimitiveMap(bundle.primitives?.sign);
  const voiceBySourceAndVoice = new Map((bundle.voiceContent ?? []).map((item) => [`${item.sourceId}:${item.voiceId}`, item]));
  const knowledgeById = new Map<string, KnowledgeItem>();
  const legacyIdByAlias = new Map<string, string>();

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

    const body = skyAspectAdvice(transit.transiting, transit.aspect, transit.other);
    const summary = skyAspectHeadline(transit.transiting, transit.aspect, transit.other);

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
        coreTheme: summary,
        displaySummary: summary,
        detailParagraphs: skyAspectDetailParagraphs(transit.transiting, transit.aspect, transit.other),
        livedExperience: body,
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
    const generatedSummary = transitNatalSummary(transit.transiting, transit.aspect, transit.natal);
    const body = transitNatalAdvice(transit.transiting, transit.aspect, transit.natal);
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
        coreTheme: generatedSummary,
        displaySummary: generatedSummary,
        detailParagraphs: cleanParagraphs([sourceDetail, transit.policy]),
        livedExperience: body,
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
    const generatedSummary = planet && sign ? placementSummary(planet, sign, mode) : "";
    const generatedBody = planet && sign ? placementAdvice(planet, sign, mode) : "";
    const generatedDetailParagraphs = planet && sign && mode === "sky"
      ? skyPlacementDetailParagraphs(planet, sign)
      : cleanParagraphs([placement.gift, placement.challenge, placement.note]);

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
        coreTheme: cleanText(placement.tldr) || generatedSummary || placement.id,
        displaySummary: generatedSummary || cleanText(placement.tldr) || cleanText(placement.body),
        detailParagraphs: generatedDetailParagraphs,
        livedExperience: generatedBody || cleanText(placement.body) || cleanText(placement.tldr) || placement.id,
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
        coreTheme: cleanText(angle.tldr) || placementSummary(angle.point, angle.sign, "natal"),
        displaySummary: cleanText(angle.tldr) || placementSummary(angle.point, angle.sign, "natal"),
        detailParagraphs: cleanParagraphs([angle.body, angle.approach, angle.shadow, angle.note]),
        livedExperience: cleanText(angle.body) || placementAdvice(angle.point, angle.sign, "natal"),
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
    const summary = summarySentence(entry.plainTranslation) || `${titleize(planetA)} ${aspect} ${titleize(planetB)}`;
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
        detailParagraphs: cleanParagraphs([entry.plainTranslation, entry.policy]),
        livedExperience: cleanText(entry.plainTranslation) || summary,
        gift: "",
        challenge: ""
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
    const summary = summarySentence(entry.plainTranslation) || `${titleize(planet)} in the ${house} house`;
    const knowledgeItem: KnowledgeItem = {
      id: entry.id,
      type: "synastry-overlay",
      sourceFactors: {
        planetA: planet,
        house
      },
      surfaceTags: ["synastry"],
      contentAreas: uniqueValues(["relationships", ...(houseLifeAreas[Number(house)] ? normalizedAreas([houseLifeAreas[Number(house)]]) : [])]),
      priority: personalRelevanceScore(planet) + 20,
      intensity: personalRelevanceScore(planet) >= 25 ? 4 : 2,
      interpretation: {
        coreTheme: summary,
        displaySummary: summary,
        detailParagraphs: cleanParagraphs([entry.plainTranslation, entry.policy]),
        livedExperience: cleanText(entry.plainTranslation) || summary,
        gift: "",
        challenge: ""
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

  function generatedAspectKnowledge(id: string): KnowledgeItem | null {
    const aspectName = Object.keys(aspectMap).sort((a, b) => b.length - a.length).find((aspect) => id.includes(`-${aspect}-`));

    if (!aspectName) {
      return null;
    }

    const normalizedId = id.replace(/^(sky|natal)-/, "");
    const [planetA, planetB] = normalizedId.split(`-${aspectName}-`);

    if (!planetA || !planetB) {
      return null;
    }

    const planetAThemes = primitiveThemes(planetMap, planetA);
    const planetBThemes = primitiveThemes(planetMap, planetB);
    const aspectThemes = primitiveThemes(aspectMap, aspectName);
    const mode = id.startsWith("sky-") || registryMode === "sky" ? "sky" : "natal";

    const summary = mode === "sky"
      ? skyAspectHeadline(planetA, aspectName, planetB)
      : readableAspectSummary(planetA, aspectName, planetB, mode);

    return {
      id,
      type: mode === "sky" ? "current-sky-aspect" : "natal-aspect",
      sourceFactors: {
        planetA,
        aspect: aspectName,
        planetB
      },
      contentAreas: areasForFactors(planetA, planetB),
      priority: mode === "sky" ? skyAspectPriority(planetA, aspectName, planetB) : natalAspectPriority(planetA, aspectName, planetB),
      intensity: hardAspects.has(aspectName) ? 4 : softAspects.has(aspectName) ? 3 : 2,
      knowledgeBasis: {
        [planetA]: planetAThemes,
        [aspectName]: aspectThemes,
        [planetB]: planetBThemes
      },
      interpretation: {
        coreTheme: mode === "sky" ? summary : `${sentenceList(planetAThemes)} meets ${sentenceList(planetBThemes)}.`,
        displaySummary: summary,
        detailParagraphs: mode === "sky" ? skyAspectDetailParagraphs(planetA, aspectName, planetB) : [],
        livedExperience: mode === "sky" ? skyAspectAdvice(planetA, aspectName, planetB) : natalAspectAdvice(planetA, aspectName, planetB),
        gift: "",
        challenge: ""
      },
      sources: ["@tldr/astro-knowledge/primitives"],
      status: "SOURCE_BACKED"
    };
  }

  function generatedPlacementKnowledge(id: string): KnowledgeItem | null {
    const normalizedId = id.replace(/^(sky|natal)-/, "");
    const [planet, sign] = normalizedId.split("-in-");

    if (!planet || !sign) {
      return null;
    }

    const planetName = planetMap[planet]?.name ?? titleize(planet);
    const signName = signMap[sign]?.name ?? titleize(sign);
    const planetThemes = primitiveThemes(planetMap, planet);
    const signThemes = primitiveThemes(signMap, sign);
    const mode = id.startsWith("sky-") ? "sky" : registryMode;

    return {
      id,
      type: "placement",
      sourceFactors: {
        planetA: planet,
        sign
      },
      contentAreas: areasForFactors(planet, sign),
      priority: placementPriority(planet, sign, mode),
      intensity: placementPriority(planet, sign, mode) >= 50 ? 4 : 2,
      knowledgeBasis: {
        [planet]: planetThemes,
        [sign]: signThemes
      },
      interpretation: {
        coreTheme: mode === "sky" ? placementSummary(planet, sign, mode) : `${planetName} expresses ${sentenceList(planetThemes)} through ${signName}.`,
        displaySummary: placementSummary(planet, sign, mode),
        detailParagraphs: mode === "sky" ? skyPlacementDetailParagraphs(planet, sign) : [],
        livedExperience: placementAdvice(planet, sign, mode),
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
      return {
        bundle,
        summary: cleanText(bundle.voice.summary),
        body: cleanText(bundle.voice.body),
        detailParagraphs: cleanParagraphs([bundle.voice.body, ...(bundle.knowledge?.interpretation.detailParagraphs ?? [])])
      };
    }

    if (bundle.knowledge) {
      const knowledgeDetailParagraphs = bundle.knowledge.interpretation.detailParagraphs ?? [];
      const fallbackDetailParagraphs = knowledgeDetailParagraphs.length > 0
        ? knowledgeDetailParagraphs
        : cleanParagraphs([bundle.knowledge.interpretation.livedExperience]);

      return {
        bundle,
        summary: cleanText(bundle.knowledge.interpretation.displaySummary) || cleanText(bundle.knowledge.interpretation.coreTheme),
        body: cleanText(bundle.knowledge.interpretation.livedExperience),
        detailParagraphs: fallbackDetailParagraphs
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
