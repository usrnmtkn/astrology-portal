import type { KnowledgeItem } from "./types";

export type TemplateInterpolationContext = Record<string, string | number | null | undefined>;

const slotPattern = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const warningCache = new Set<string>();

function readableValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function titleize(value: string | number | null | undefined) {
  const normalized = readableValue(value);

  if (!normalized) {
    return "";
  }

  return normalized
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bRx\b/g, "Rx");
}

function firstKeyword(item: KnowledgeItem | null | undefined, key: string) {
  const keywords = item?.knowledgeBasis?.[key];
  return keywords?.find((keyword) => readableValue(keyword)) ?? "";
}

function warnMissingSlots(contentId: string, fieldName: string, missingSlots: string[]) {
  const cacheKey = `${contentId}:${fieldName}:${missingSlots.join(",")}`;

  if (warningCache.has(cacheKey)) {
    return;
  }

  warningCache.add(cacheKey);
  console.warn(
    `[TLDR Astro] Template copy for "${contentId}" could not render "${fieldName}" because these slots were missing: ${missingSlots.join(", ")}.`
  );
}

export function interpolateTemplateString(
  template: string | null | undefined,
  context: TemplateInterpolationContext,
  options: {
    contentId: string;
    fieldName: string;
  }
) {
  const text = readableValue(template);

  if (!text) {
    return "";
  }

  const missingSlots: string[] = [];

  text.replace(slotPattern, (_match, slotName: string) => {
    if (!readableValue(context[slotName])) {
      missingSlots.push(slotName);
    }

    return "";
  });

  if (missingSlots.length > 0) {
    warnMissingSlots(options.contentId, options.fieldName, Array.from(new Set(missingSlots)));
    return "";
  }

  return text
    .replace(slotPattern, (_match, slotName: string) => readableValue(context[slotName]))
    .replace(/\s+/g, " ")
    .trim();
}

export function templateContextFromKnowledge(item: KnowledgeItem | null | undefined): TemplateInterpolationContext {
  const factors = item?.sourceFactors ?? {};
  const planetA = factors.planetA;
  const planetB = factors.planetB;
  const planet = factors.planetA;
  const aspect = factors.aspect;
  const sign = factors.sign;
  const house = factors.house;

  return {
    ...factors,
    aspect: titleize(aspect).toLowerCase(),
    house,
    houseLifeArea: firstKeyword(item, house ?? ""),
    lifeArea: titleize(firstKeyword(item, house ?? "")),
    lifeAreaDescription: firstKeyword(item, house ?? ""),
    natalPoint: titleize(planetB),
    natalPointTopic: firstKeyword(item, planetB ?? ""),
    person: "",
    personA: "",
    personB: "",
    planet: titleize(planet),
    planetA: titleize(planetA),
    planetATopic: firstKeyword(item, planetA ?? ""),
    planetB: titleize(planetB),
    planetBTopic: firstKeyword(item, planetB ?? ""),
    planetTopic: firstKeyword(item, planet ?? ""),
    sign: titleize(sign),
    signStyle: firstKeyword(item, sign ?? ""),
    topic: "",
    transitPlanet: titleize(planetA),
    transitPlanetTopic: firstKeyword(item, planetA ?? "")
  };
}

export function interpolateKnowledgeText(
  contentId: string,
  fieldName: string,
  value: string | null | undefined,
  item: KnowledgeItem | null | undefined,
  extraContext: TemplateInterpolationContext = {}
) {
  return interpolateTemplateString(value, {
    ...templateContextFromKnowledge(item),
    ...extraContext
  }, {
    contentId,
    fieldName
  });
}

export function interpolateKnowledgeParagraphs(
  contentId: string,
  fieldName: string,
  values: Array<string | null | undefined>,
  item: KnowledgeItem | null | undefined,
  extraContext: TemplateInterpolationContext = {}
) {
  return values
    .map((value, index) => interpolateKnowledgeText(contentId, `${fieldName}.${index}`, value, item, extraContext))
    .filter(Boolean);
}
