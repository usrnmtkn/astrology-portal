import venusConjunctionSaturnKnowledge from "../../astro-knowledge/data/insights/natal-aspects/venus-conjunction-saturn.json";
import aspectPrimitives from "../../astro-knowledge/data/primitives/aspects.json";
import planetPrimitives from "../../astro-knowledge/data/primitives/planets.json";
import saturnSquareVenusKnowledge from "../../astro-knowledge/data/transits/natal/saturn_venus_square.json";
import venusConjunctionSaturnVoice from "../../astro-knowledge/generated/tldr-astro/natal-aspects/venus-conjunction-saturn.json";
import type { ContentBundle, KnowledgeItem, VoiceContentItem } from "./types";

export const defaultVoiceId = "tldr-astro-v1";

const knowledgeCore = [
  venusConjunctionSaturnKnowledge,
  saturnSquareVenusKnowledge
] as KnowledgeItem[];

const voiceContent = [
  venusConjunctionSaturnVoice
] as VoiceContentItem[];

const knowledgeById = new Map(knowledgeCore.map((item) => [item.id, item]));
const voiceBySourceAndVoice = new Map(voiceContent.map((item) => [`${item.sourceId}:${item.voiceId}`, item]));

type PrimitiveKeywordSource = Record<string, {
  name?: string;
  keywords: string[];
}>;

const planetPrimitiveMap = planetPrimitives as PrimitiveKeywordSource;
const aspectPrimitiveMap = aspectPrimitives as PrimitiveKeywordSource;
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

export function aspectContentId(planetA: string, aspect: string, planetB: string) {
  return `${normalizeIdPart(planetA)}-${normalizeIdPart(aspect)}-${normalizeIdPart(planetB)}`;
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
    knowledgeBasis: {
      [factors.planetA]: planetAThemes,
      [factors.aspect]: aspectThemes,
      [factors.planetB]: planetBThemes
    },
    interpretation: {
      coreTheme: `${planetAName} ${factors.aspect} ${planetBName}: ${sentenceList(planetAThemes)} meets ${sentenceList(planetBThemes)} through ${sentenceList(aspectThemes)}.`,
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

export function getKnowledgeItem(id: string) {
  return knowledgeById.get(id) ?? generatedAspectKnowledge(id);
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

  if (bundle.status === "READY" && bundle.voice) {
    return {
      bundle,
      summary: bundle.voice.summary,
      body: bundle.voice.body
    };
  }

  if (bundle.knowledge) {
    return {
      bundle,
      summary: bundle.knowledge.interpretation.coreTheme,
      body: bundle.knowledge.interpretation.livedExperience
    };
  }

  return {
    bundle,
    summary: null,
    body: null
  };
}

export function hasKnowledgeForContentId(id: string) {
  return getKnowledgeItem(id) !== null;
}
