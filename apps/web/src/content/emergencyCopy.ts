import emergencyCopy from "./emergencyCopy.json";
import ccSourcePhrases from "./templateHandoffV2/sources/cc-source-phrases.json";
import { isReaderFacingCopy } from "./readerSafety";

type EmergencyCopySlots = Record<string, string | number | null | undefined>;

type EmergencyCopyData = typeof emergencyCopy;
type EmergencyCopyTemplates = Record<string, string | undefined>;
type SourcePhraseKey = keyof typeof ccSourcePhrases;

function sourcePhrase(key: SourcePhraseKey) {
  return ccSourcePhrases[key] ?? "";
}

const pointAliases: Record<string, string> = {
  "black-moon-lilith": "lilith",
  "imum-coeli": "imum-coeli",
  "midheaven": "midheaven",
  "north-node": "north-node",
  "south-node": "south-node",
  "true-node": "north-node"
};

const displayAliases: Record<string, string> = {
  "north-node": "North Node",
  "south-node": "South Node",
  "true-node": "North Node",
  "black-moon-lilith": "Black Moon Lilith",
  "imum-coeli": "IC"
};

function normalizedEmergencyKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return pointAliases[normalized] ?? normalized;
}

function displayName(value: string) {
  const normalized = normalizedEmergencyKey(value);

  return displayAliases[normalized] ?? value;
}

function isEmergencyAngle(value: string) {
  return ["ascendant", "descendant", "midheaven", "imum-coeli"].includes(normalizedEmergencyKey(value));
}

function titleCaseValue(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function ordinalHouse(value?: string | number | null) {
  const parsed = value === null || value === undefined ? NaN : Number(String(value).replace(/\D/g, ""));

  if (!Number.isFinite(parsed) || parsed < 1) {
    return "";
  }

  const mod100 = parsed % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? "th"
    : parsed % 10 === 1
      ? "st"
      : parsed % 10 === 2
        ? "nd"
        : parsed % 10 === 3
          ? "rd"
          : "th";

  return `${parsed}${suffix}`;
}

function sentenceCase(value: string) {
  const trimmed = value.trim();

  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : "";
}

function template(name: string) {
  return (emergencyCopy.templates as EmergencyCopyTemplates)[name] ?? "";
}

function slotAliases(rawKey: string) {
  const withoutBraces = rawKey.trim();
  const lower = withoutBraces.toLowerCase();
  const lowerFirst = `${withoutBraces.charAt(0).toLowerCase()}${withoutBraces.slice(1)}`;
  const upperFirst = `${withoutBraces.charAt(0).toUpperCase()}${withoutBraces.slice(1)}`;

  return Array.from(new Set([withoutBraces, lowerFirst, upperFirst, lower]));
}

function slotValue(slots: EmergencyCopySlots, rawKey: string) {
  for (const key of slotAliases(rawKey)) {
    if (Object.prototype.hasOwnProperty.call(slots, key)) {
      const value = slots[key];

      return value === null || value === undefined ? "" : String(value);
    }
  }

  return "";
}

function interpolateEmergencyCopy(source: string, slots: EmergencyCopySlots) {
  return source.replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (_, rawKey: string) => slotValue(slots, rawKey));
}

function containsBannedPhrase(value: string) {
  const normalized = value.toLowerCase();

  return emergencyCopy.compositionRules.bannedPhrases.some((phrase) => normalized.includes(phrase.toLowerCase()));
}

function cleanComposedCopy(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\ba ([aeiou])/gi, "an $1")
    .replace(/\ban ([^aeiou\s])/gi, "a $1")
    .replace(/\bhouse (\d+(?:st|nd|rd|th))\b/gi, "$1 house")
    .replace(/\bin house (\d+(?:st|nd|rd|th))\b/gi, "in the $1 house")
    .replace(/\bin the house (\d+(?:st|nd|rd|th))\b/gi, "in the $1 house")
    .trim();
}

function isSafeEmergencyCopy(candidate: string) {
  return Boolean(candidate)
    && !/\{\{[^}]+\}\}/.test(candidate)
    && !containsBannedPhrase(candidate)
    && isReaderFacingCopy(candidate);
}

function safeComposedCopy(value: string, fallback: string) {
  const cleaned = cleanComposedCopy(value);
  const cleanedFallback = cleanComposedCopy(fallback);

  if (isSafeEmergencyCopy(cleaned)) {
    return cleaned;
  }

  if (isSafeEmergencyCopy(cleanedFallback)) {
    return cleanedFallback;
  }

  return "This chart pattern is close enough to read. The title and timing give the clearest available frame.";
}

export function emergencyPlanetFunction(planet: string) {
  const key = normalizedEmergencyKey(planet);

  return emergencyCopy.planetFunction[key as keyof typeof emergencyCopy.planetFunction]
    ?? emergencyCopy.angleFunction[key as keyof typeof emergencyCopy.angleFunction]
    ?? "a chart function that needs a more specific reading";
}

export function emergencySignTone(sign: string) {
  const key = normalizedEmergencyKey(sign);

  return emergencyCopy.signTone[key as keyof typeof emergencyCopy.signTone]
    ?? "a clear, present-tense";
}

export function emergencyHouseArea(house?: number | string | null) {
  const key = house === null || house === undefined ? "" : String(house).replace(/\D/g, "");

  return emergencyCopy.houseArea[key as keyof typeof emergencyCopy.houseArea] ?? "";
}

export function emergencySignRuler(sign: string) {
  const key = normalizedEmergencyKey(sign);
  const ruler = emergencyCopy.signRuler[key as keyof typeof emergencyCopy.signRuler] ?? "";

  return ruler ? titleCaseValue(ruler) : "";
}

export function emergencyPointFunction(point: string) {
  return emergencyPlanetFunction(point);
}

export function emergencyAspectBehavior(aspect: string) {
  const key = normalizedEmergencyKey(aspect);

  return emergencyCopy.aspectBehavior[key as keyof typeof emergencyCopy.aspectBehavior]
    ?? "the two points are active together, and the overlap changes how each one behaves";
}

export function emergencyAspectVerb(aspect: string) {
  const key = normalizedEmergencyKey(aspect);

  return emergencyCopy.aspectVerb[key as keyof typeof emergencyCopy.aspectVerb]
    ?? (key === "opposition" ? "opposite" : key || "aspecting");
}

export function emergencyAspectAdjective(aspect: string) {
  const key = normalizedEmergencyKey(aspect);
  const aspectAdjectives: Record<string, string> = {
    conjunction: "conjunct",
    opposition: "opposite",
    sextile: "sextile",
    square: "square",
    trine: "trine"
  };

  return aspectAdjectives[key] ?? key;
}

export function emergencyIngressCopy(planet: string, sign: string) {
  const composed = interpolateEmergencyCopy(template("ingress"), {
    Planet: displayName(planet),
    Sign: sign,
    planet: displayName(planet),
    sign,
    planetFunction: emergencyPlanetFunction(planet),
    planetTopic: emergencyPlanetFunction(planet),
    signTone: emergencySignTone(sign),
    signStyle: emergencySignTone(sign)
  });

  return safeComposedCopy(
    composed,
    `${displayName(planet)} enters ${sign}. Notice what changes pace, then respond to the clearest thing in front of you.`
  );
}

export function emergencyStationCopy(planet: string, direction: "direct" | "retrograde" | "shadow") {
  const templateName = direction === "direct"
    ? "retrograde-direct"
    : direction === "shadow"
      ? "retrograde-shadow"
      : "station";
  const phase = direction === "direct"
    ? "post-retrograde-shadow"
    : direction === "shadow"
      ? "pre-retrograde-shadow"
      : "retrograde";
  const retroPhase = emergencyCopy.retroPhase[phase as keyof typeof emergencyCopy.retroPhase]
    ?? emergencyCopy.retroPhase.retrograde;
  const composed = interpolateEmergencyCopy(template(templateName as keyof EmergencyCopyData["templates"]), {
    Planet: displayName(planet),
    Sign: "",
    planet: displayName(planet),
    sign: "",
    planetTopic: emergencyPlanetFunction(planet),
    signStyle: "",
    retroPhase
  });

  return safeComposedCopy(composed, `${displayName(planet)} is stationing. Notice what is slowing down enough to review.`);
}

export function emergencySkyAspectCopy(planetA: string, aspect: string, planetB: string) {
  const composed = interpolateEmergencyCopy(template("sky-aspect"), {
    PlanetA: displayName(planetA),
    PlanetB: displayName(planetB),
    planetA: displayName(planetA),
    planetB: displayName(planetB),
    aspect: aspect.trim().toLowerCase(),
    aspectAdj: emergencyAspectAdjective(aspect),
    aspectFeel: emergencyAspectBehavior(aspect),
    planetATopic: emergencyPlanetFunction(planetA),
    planetBTopic: emergencyPlanetFunction(planetB),
    aspectBehavior: sentenceCase(emergencyAspectBehavior(aspect))
  });

  return safeComposedCopy(
    composed,
    `${displayName(planetA)} ${aspect.trim().toLowerCase()} ${displayName(planetB)} is exact enough to notice. One part of the contact changes how the other one behaves.`
  );
}

const skyPointGeneralCopy: Record<string, string> = {
  chiron: "Chiron names the wounded-healer pattern: the place where an old hurt can become skill, mentorship, and repair.",
  lilith: [
    sourcePhrase("cc/guide-phrase/076"),
    sourcePhrase("cc/guide-phrase/255").replace("your chart", "the chart"),
    sourcePhrase("cc/guide-phrase/165")
  ].filter(Boolean).join(" "),
  "north-node": "The North Node points toward growth direction: the unfamiliar pattern that asks for practice, courage, and repetition.",
  "south-node": "The South Node points toward a familiar pattern: what comes easily, what may be overused, and what is ready to be released or rebalanced."
};

const skyPointSignCopy: Record<string, Record<string, string>> = {
  chiron: {
    aries: "Chiron in Aries can make impulsiveness a mentor. The point is not to erase the spark, but to learn when courage needs care around it.",
    gemini: "Chiron in Gemini can make curiosity a mentor. Questions become medicine when they help name what was confusing, unsaid, or misunderstood.",
    scorpio: "Chiron in Scorpio does not skim the surface. This placement points toward deep material that asks to be met honestly rather than avoided."
  }
};

export function emergencySkyPointPlacementCopy(point: string, sign?: string | null) {
  const pointKey = normalizedEmergencyKey(point);
  const signKey = sign ? normalizedEmergencyKey(sign) : "";
  const copy = signKey ? skyPointSignCopy[pointKey]?.[signKey] : "";
  const fallback = skyPointGeneralCopy[pointKey];

  if (!copy && !fallback) {
    return "";
  }

  return safeComposedCopy(copy || fallback || "", fallback || "");
}

export function emergencySkyPlacementCopy(planet: string, sign: string, options: { retrograde?: boolean } = {}) {
  const pointCopy = emergencySkyPointPlacementCopy(planet, sign);

  if (pointCopy) {
    return pointCopy;
  }

  const planetName = displayName(planet);
  const templateName = options.retrograde ? "sky.planetary-placement-retrograde" : "sky.planetary-placement";
  const composed = interpolateEmergencyCopy(template(templateName), {
    Planet: planetName,
    Sign: sign,
    planet: planetName,
    sign,
    planetFunction: emergencyPlanetFunction(planet),
    planetTopic: emergencyPlanetFunction(planet),
    signTone: emergencySignTone(sign),
    signStyle: emergencySignTone(sign)
  });

  const fallback = options.retrograde
    ? `${planetName} is retrograde in ${sign}. This transit asks for review before the next response is finalized.`
    : `${planetName} is in ${sign}. The planet and sign together give the clearest available read.`;

  return safeComposedCopy(composed, fallback);
}

export function emergencyNatalPlacementCopy({
  house,
  point,
  possessive = "Their",
  sign
}: {
  house?: number | string | null;
  point: string;
  possessive?: string;
  sign: string;
}) {
  const houseNumber = house === null || house === undefined ? "" : String(house).replace(/\D/g, "");
  const houseLabel = ordinalHouse(houseNumber);
  const signCopy = `${possessive} ${displayName(point)} is in ${sign}. This placement describes how ${emergencyPlanetFunction(point)} moves through ${emergencySignTone(sign)} conditions.`;

  if (!houseLabel) {
    const noHouseCopy = `${possessive} ${displayName(point)} is in ${sign}. In this placement, ${emergencyPlanetFunction(point)} takes on ${emergencySignTone(sign)} timing, tone, and style. Without a confirmed house, the sign still gives the clearest read on the placement's expression.`;

    return safeComposedCopy(noHouseCopy, signCopy);
  }

  const houseArea = emergencyHouseArea(houseNumber) || "the part of life asking for attention";
  const houseCopy = `${possessive} ${displayName(point)} is in the ${houseLabel} house. This points attention toward ${houseArea}, where the placement asks for one clear, grounded response.`;

  return safeComposedCopy(houseCopy, signCopy);
}

export function emergencyRulerBridgeCopy({
  point,
  ruler,
  rulerHouse,
  rulerSign,
  sign
}: {
  point: string;
  ruler: string;
  rulerHouse?: number | string | null;
  rulerSign?: string | null;
  sign: string;
}) {
  if (!ruler || !rulerHouse || !rulerSign) {
    return "";
  }

  const rulerHouseNumber = String(rulerHouse).replace(/\D/g, "");
  const rulerHouseLabel = ordinalHouse(rulerHouseNumber);
  const rulerHouseArea = emergencyHouseArea(rulerHouseNumber);
  const templateName = normalizedEmergencyKey(point) === "ascendant"
    ? "ruler-bridge-chart-ruler"
    : "ruler-bridge";
  const composed = interpolateEmergencyCopy(template(templateName), {
    Point: displayName(point),
    Ruler: displayName(ruler),
    RulerHouse: rulerHouseLabel || rulerHouseNumber,
    RulerSign: rulerSign,
    Sign: sign,
    point: displayName(point),
    ruler: displayName(ruler),
    rulerHouse: rulerHouseLabel || rulerHouseNumber,
    rulerSign,
    sign,
    rulerFunction: emergencyPlanetFunction(ruler),
    rulerTopic: emergencyPlanetFunction(ruler),
    rulerHouseArea,
    rulerHouseLifeArea: rulerHouseArea,
    rulerSignTone: emergencySignTone(rulerSign),
    rulerSignStyle: emergencySignTone(rulerSign)
  });

  return safeComposedCopy(
    composed,
    `${sign} is ruled by ${displayName(ruler)}. ${displayName(ruler)} is in ${rulerSign} in the ${rulerHouseLabel || rulerHouseNumber} house, so this bridge points back to ${rulerHouseArea || "that part of life"}.`
  );
}

export function emergencyTransitToNatalCopy({
  aspect,
  natalPoint,
  transitPlanet
}: {
  aspect: string;
  natalPoint: string;
  transitPlanet: string;
}) {
  const aspectText = aspect.trim().toLowerCase();
  const composed = interpolateEmergencyCopy(template("transit-to-natal"), {
    Aspect: aspectText,
    NatalPoint: displayName(natalPoint),
    Planet: displayName(transitPlanet),
    TransitPlanet: displayName(transitPlanet),
    aspect: aspectText,
    aspectAdj: emergencyAspectAdjective(aspect),
    aspectFeel: emergencyAspectBehavior(aspect),
    aspectBehavior: sentenceCase(emergencyAspectBehavior(aspect)),
    natalPoint: displayName(natalPoint),
    natalPointTopic: emergencyPointFunction(natalPoint),
    planet: displayName(transitPlanet),
    planetTopic: emergencyPlanetFunction(transitPlanet),
    transitPlanet: displayName(transitPlanet),
    transitPlanetTopic: emergencyPlanetFunction(transitPlanet)
  });

  return safeComposedCopy(
    composed,
    `${displayName(transitPlanet)} ${aspectText} your natal ${displayName(natalPoint)} is exact enough to notice. Keep the facts clear and choose one response you can follow through on.`
  );
}

export function emergencySynastryAspectCopy({
  aspect,
  comparisonIsSelf = true,
  comparisonName = "the other person",
  comparisonPoint,
  primaryName,
  primaryPoint
}: {
  aspect: string;
  comparisonIsSelf?: boolean;
  comparisonName?: string;
  comparisonPoint: string;
  primaryName: string;
  primaryPoint: string;
}) {
  const aspectText = aspect.trim().toLowerCase();
  const primaryLabel = primaryName.trim() || "This person";
  const comparisonLabel = comparisonIsSelf ? "your" : `${comparisonName.trim() || "the other person's"}'s`;
  const primaryTopic = emergencyPointFunction(primaryPoint);
  const comparisonTopic = emergencyPointFunction(comparisonPoint);
  const aspectBehavior = sentenceCase(emergencyAspectBehavior(aspect));
  const composed = `${primaryLabel}'s ${displayName(primaryPoint)} ${aspectText} ${comparisonLabel} ${displayName(comparisonPoint)} brings ${primaryTopic} into contact with ${comparisonTopic}. ${aspectBehavior}. Name what each side needs before deciding what to do together.`;

  return safeComposedCopy(
    composed,
    `${primaryLabel}'s ${displayName(primaryPoint)} ${aspectText} ${comparisonLabel} ${displayName(comparisonPoint)} is close enough to read. Name what each side needs, then choose one concrete way to handle it.`
  );
}

export function emergencySkyPlacementAspectRowCopy(planetA: string, aspect: string, planetB: string) {
  const composed = interpolateEmergencyCopy(template("sky-aspect-row"), {
    PlanetA: displayName(planetA),
    PlanetB: displayName(planetB),
    planetA: displayName(planetA),
    planetB: displayName(planetB),
    aspect: aspect.trim().toLowerCase(),
    aspectAdj: emergencyAspectAdjective(aspect),
    aspectFeel: emergencyAspectBehavior(aspect),
    planetATopic: emergencyPlanetFunction(planetA),
    planetBTopic: emergencyPlanetFunction(planetB),
    aspectBehavior: sentenceCase(emergencyAspectBehavior(aspect))
  });

  return safeComposedCopy(
    composed,
    `${displayName(planetA)} ${aspect.trim().toLowerCase()} ${displayName(planetB)} is exact enough to notice.`
  );
}

export function emergencyEclipseCopy(kind: "lunar" | "solar") {
  return kind === "lunar"
    ? "A lunar eclipse brings something to a visible threshold. Notice what is ready to be released or understood differently."
    : "A solar eclipse resets a cycle. Let the new direction begin without forcing the whole answer at once.";
}
