import venusConjunctionSaturnKnowledge from "../../astro-knowledge/data/insights/natal-aspects/venus-conjunction-saturn.json";
import aspectPrimitives from "../../astro-knowledge/data/primitives/aspects.json";
import planetPrimitives from "../../astro-knowledge/data/primitives/planets.json";
import signPrimitives from "../../astro-knowledge/data/primitives/signs.json";
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

type SignPrimitiveSource = Record<string, {
  element: string;
  keywords: string[];
  modality: string;
  name?: string;
}>;

const planetPrimitiveMap = planetPrimitives as PrimitiveKeywordSource;
const aspectPrimitiveMap = aspectPrimitives as PrimitiveKeywordSource;
const signPrimitiveMap = signPrimitives as SignPrimitiveSource;
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
