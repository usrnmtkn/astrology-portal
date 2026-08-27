import type { TemplateVariableReference } from "./templateVariableReference";

// These prefixes mirror the keys requested by the fallback resolvers. They let
// Content Studio take an editor from a template slot to the saved writing that
// can fill it. Variables omitted here are calculated by the app and do not have
// an editable content row.
const sourcePrefixExceptions: Record<string, string[]> = {
  planetIntro: ["fallback-hook/planet-lived/", "fallback-hook/planet-intro/"],
  placementSentences: ["fallback-hook/placement-sentence/"],
  placementGerundText: ["fallback-vocab/placement-gerund/"],
  modifierSentences: ["fallback-template/natal.modifier."],
  transitTopic: ["fallback-vocab/planet-topic/"],
  natalCore: ["fallback-hook/natal-core/", "fallback-vocab/planet-core/"],
  natalArea: ["fallback-vocab/planet-topic/", "fallback-vocab/angle-area/"],
  transitEffect: ["fallback-hook/transit-effect-soft/", "fallback-hook/transit-effect-hard/", "fallback-hook/transit-effect/"],
  houseLivedBehavior: ["fallback-hook/placement-house-lived/", "fallback-hook/house-lived/"],
  placementHouseSentences: ["fallback-hook/placement-house-sentence/"],
  topicN: ["fallback-vocab/house-topic/"],
  topicM: ["fallback-vocab/house-topic/"],
  angleSignSentences: ["fallback-hook/angle-sign/"],
  aspectTypeLine: ["fallback-hook/aspect-type/"],
  planetACore: ["fallback-vocab/planet-core/"],
  planetBCore: ["fallback-vocab/planet-core/"],
  pairSentences: ["fallback-hook/synastry-pair/", "fallback-hook/aspect-pair/"],
  rulerHouseTopic: ["fallback-vocab/house-topic/"],
  oppositeDirection: ["fallback-vocab/node-direction/"],
  synAspectLine: ["fallback-hook/synastry-aspect-type/"],
  modeA: ["fallback-hook/planet-mode/"],
  modeB: ["fallback-hook/planet-mode/"],
  askA: ["fallback-vocab/planet-ask/"],
  askB: ["fallback-vocab/planet-ask/"],
  gratesA: ["fallback-hook/planet-grates/"],
  gratesB: ["fallback-hook/planet-grates/"],
  sceneA: ["fallback-vocab/planet-scene/"],
  sceneB: ["fallback-vocab/planet-scene/"],
  compatDomain: ["fallback-hook/compat-domain/", "fallback-vocab/compatibility-", "fallback-vocab/relationship-"],
  elementPattern: ["fallback-vocab/element-pattern/", "fallback-hook/element-pattern/"],
  transitTypeLine: ["fallback-hook/transit-aspect-type/", "fallback-hook/transit-type/"],
  transitEffectLine: ["fallback-hook/transit-effect-soft/", "fallback-hook/transit-effect-hard/", "fallback-hook/transit-effect/"],
  houseEffect: ["fallback-vocab/transit-house/", "fallback-hook/transit-effect-house/"],
  retroMeaning: ["fallback-hook/transit-retro/", "fallback-hook/retrograde/", "fallback-hook/retro-"],
  signCopy: ["fallback-hook/sky-sign-copy/", "fallback-hook/sky-placement-sign/"],
  windowFrame: ["fallback-hook/sky-placement/"],
  currentAspects: ["fallback-hook/sky-aspect-sign/", "fallback-hook/sky-aspect-exact/", "fallback-hook/sky-aspect-pair/", "fallback-hook/sky-placement-aspect/"],
  aspectInsert: ["fallback-hook/sky-aspect-sign/", "fallback-hook/sky-aspect-exact/", "fallback-hook/sky-aspect-pair/", "fallback-hook/sky-placement-aspect/"],
  planetFrame: ["fallback-hook/sky-placement-frame/", "fallback-hook/sky-placement-retro-frame/"],
  signLore: ["fallback-hook/sky-placement-lore/"],
  articleHeadline: ["sky-article/"],
  articleBody: ["sky-article/"]
};

const sourceSelectionNotes: Record<string, string> = {
  transitTopic: "The resolver selects one planet-topic phrase using the transiting planet.",
};

export type TemplateVariableSourceRow = {
  id: string;
  content_key: string;
};

const contextualValues = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron",
  "north-node", "south-node", "ascendant", "midheaven",
  "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
  "conjunction", "opposition", "square", "trine", "sextile", "quincunx",
  ...Array.from({ length: 12 }, (_, index) => String(index + 1))
]);

function templateContextTokens(contentKey: string) {
  return contentKey
    .toLowerCase()
    .split(/[/.]/u)
    .flatMap((part) => part.match(/north-node|south-node|[a-z]+|\d+/gu) ?? [])
    .filter((part) => contextualValues.has(part));
}

export function templateVariableSourceKeyPrefixes(reference: Pick<TemplateVariableReference, "name" | "source" | "sourceKind">) {
  const exception = sourcePrefixExceptions[reference.name];
  if (exception) return exception;
  if (reference.sourceKind !== "saved-copy") return [];
  const keyPart = reference.name
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/-sentences?$/u, "")
    .toLowerCase();
  return [`fallback-${/vocabulary/iu.test(reference.source) ? "vocab" : "hook"}/${keyPart}/`];
}

export function templateVariableSourceSelectionNote(reference: Pick<TemplateVariableReference, "name" | "sourceKind">) {
  const synastrySide = reference.name.match(/^(?:mode|ask|grates|scene)(A|B)$/u)?.[1];
  if (synastrySide) return `The resolver selects this row using the ${synastrySide === "A" ? "first" : "second"} chart point in the synastry contact.`;
  return sourceSelectionNotes[reference.name]
    ?? (reference.sourceKind === "saved-copy" ? "Selected using chart and template context." : null);
}

export function templateVariableSourceCandidates<T extends TemplateVariableSourceRow>(
  reference: Pick<TemplateVariableReference, "name" | "source" | "sourceKind">,
  rows: T[],
  templateContentKey: string
): T[] {
  const prefixes = templateVariableSourceKeyPrefixes(reference);
  if (prefixes.length === 0) return [];
  const candidates = rows.filter((row) => prefixes.some((prefix) => row.content_key.startsWith(prefix)));
  const context = templateContextTokens(templateContentKey);
  if (context.length === 0) return candidates.sort((left, right) => left.content_key.localeCompare(right.content_key));
  const contextualCandidates = candidates.filter((row) => {
    const parts = new Set(row.content_key.toLowerCase().split("/"));
    return context.some((token) => parts.has(token));
  });
  return (contextualCandidates.length > 0 ? contextualCandidates : candidates)
    .sort((left, right) => left.content_key.localeCompare(right.content_key));
}
