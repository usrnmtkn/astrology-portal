import aspectPairSourcePhrases from "./aspectPairSourcePhrases.json" with { type: "json" };
import finalSourceGroundedDashboardRecords from "./finalSourceGroundedDashboardRecords.json" with { type: "json" };
import sourceDerivedClauseExemplars from "./templateHandoffV2/sources/source-derived-clause-exemplars.json" with { type: "json" };
import type { PlanetPosition, SkySnapshot } from "../types";

export type OwnerPerspective = "you" | "they";
export type SourceGroundedSection = {
  heading: string;
  tldr: string;
  body: string;
};
export type SourceGroundedSlot = {
  text: string;
  sourceKeys: string[];
};
export type SourceGroundedComposition = {
  templateId: string;
  templateVersion: string;
  recordId: string;
  slots: Record<string, SourceGroundedSlot>;
  sourceKeys: string[];
  finalCopy: string;
  sections: SourceGroundedSection[];
  conditionalBranches?: string[];
  sourceRoles?: {
    primaryPairSourceKeys?: string[];
    supportingSourceKeys?: string[];
    calculatedFactKeys?: string[];
  };
  provenance: {
    initial: string;
    hydrated: string;
  };
};

export type AspectFact = {
  focalPlanet: string;
  focalSign?: string;
  focalHouse?: number | null;
  otherPlanet: string;
  otherSign?: string;
  otherHouse?: number | null;
  aspect: string;
  orb?: string;
};

type TransitFact = {
  transitingPlanet: string;
  natalPoint: string;
  aspect: string;
  natalHouse?: number | null;
  activeWindow: string;
  exactAt?: string | null;
  pass?: string | null;
  phase?: string | null;
  orb?: string | null;
  natalSign?: string | null;
  term: "short" | "long";
};

type ChartSect = "day" | "night";

const ORIGINAL_PACKAGE_TEMPLATE_VERSION = "2.3.0";
const READER_UNAVAILABLE_COPY = "";
export const ORIGINAL_SOURCE_GROUNDED_TEMPLATE_VERSION = ORIGINAL_PACKAGE_TEMPLATE_VERSION;

const SIGN_RULERS: Record<string, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter"
};

const HOUSE_SCENES: Record<number, string> = {
  1: "how you enter the room and start again after a setback",
  2: "money, appetite, and the question of what is worth keeping",
  3: "daily conversations and the messages that set the pace",
  4: "home life, privacy, and the foundation you return to when the public world gets loud",
  5: "creative risk and the part of life that asks for aliveness",
  6: "work, health, and the habits that decide how much energy the day costs",
  7: "partnership and the people who show you what agreement requires",
  8: "trust, shared resources, and the places where control gets negotiated",
  9: "the beliefs you test, the teachers you trust, and the bigger story you use to orient yourself",
  10: "career, public responsibility, and the role other people can actually see",
  11: "friends, networks, and the future that gets built with other people",
  12: "rest, retreat, and the private work that cannot be rushed"
};

const HOUSE_LABELS: Record<number, string> = {
  1: "self and body",
  2: "money and resources",
  3: "mind and local life",
  4: "home and roots",
  5: "creativity and pleasure",
  6: "work and routine",
  7: "partnership and contracts",
  8: "intimacy and shared resources",
  9: "travel, study, and belief",
  10: "career and public life",
  11: "community and networks",
  12: "solitude and the unseen"
};

const PLANET_LIVED_FUNCTION: Record<string, string> = {
  Sun: "direction and confidence when it is time to be seen",
  Moon: "the instinct to restore safety when something feels personal",
  Mercury: "thoughts becoming messages, plans, or decisions",
  Venus: "desire and attachment where connection asks for a real agreement",
  Mars: "anger and courage at the moment action has to start",
  Jupiter: "faith and appetite where life asks for a wider view",
  Saturn: "responsibility and the skill that comes from staying with what is hard",
  Uranus: "the need to break a pattern that has gone rigid",
  Neptune: "longing and sensitivity where certainty starts to soften",
  Pluto: "pressure and honesty where nothing can stay superficial",
  Chiron: "tenderness where old pain becomes practical wisdom",
  "North Node": "growth where the next risk asks for more courage"
};

const SIGN_METHOD: Record<string, string> = {
  Aries: "by acting before the room has finished deciding",
  Taurus: "by protecting what is steady enough to return to",
  Gemini: "by asking another question before the story hardens into certainty",
  Cancer: "by tracking memory and the emotional cost of a decision",
  Leo: "by letting warmth and creative risk become visible",
  Virgo: "by noticing what is not working and making the next practical adjustment",
  Libra: "by weighing fairness against the effect a choice has on another person",
  Scorpio: "by staying with what is intense enough to require honesty",
  Sagittarius: "by testing the story against experience and the need for a wider horizon",
  Capricorn: "by respecting time, consequence, and the structure that can hold the work",
  Aquarius: "by thinking independently and questioning a rule everyone else has stopped noticing",
  Pisces: "by listening for what is compassionate or hard to name"
};

const SOURCE_KEYS = {
  sunAquarius: ["cc/fallback-hook/monthly/aquarius/v1", "ms/midheaven/aquarius"],
  mercuryRetroCancer: ["cc/event-action/mercury-retrograde", "cc/fallback-hook/retrograde/cancer/v1", "ms/mercury-rx/sign/cancer"],
  marsAscendantTransit: ["cc/planet/mars/function", "cc/ref/transit-principles/fast-vs-slow", "ms/synastry-bank/receive/ascendant"],
  saturnVenusTransit: ["cc/ref/outer-planets/saturn-transit", "cc/ref/transit-principles/triple-pass", "cc/aspect-pair/venus-square-saturn", "ms/chart-comparison/planet/venus"],
  sunJupiter: ["cc/planet/sun", "cc/planet/jupiter", "cc/aspect/opposition"],
  sunSaturn: ["cc/aspect-pair/sun-square-saturn", "cc/planet/sun", "cc/planet/saturn"],
  venusSaturn: ["cc/aspect-pair/venus-square-saturn", "ms/chart-comparison/verdict/saturn/square", "ms/chart-comparison/planet/venus"],
  moonNode: ["cc/aspect-pair/moon-conjunction-north-node", "cc/aspect/trine", "ms/chart-comparison/planet/moon"]
};

type PackageClause = {
  text_you?: string;
  text_they?: string;
  source_keys?: string[];
};

type PersonalizedTransitPackageRecord = {
  canonicalKey?: string;
  family?: string;
  clauses?: {
    immediate_observation?: PackageClause;
  };
  sourceKeys?: string[];
};

const personalizedTransitPackageRecords = ((finalSourceGroundedDashboardRecords as {
  records?: PersonalizedTransitPackageRecord[];
}).records ?? []).filter((record) => record.family === "personalized-transit");
const aspectPairPhraseBank = (aspectPairSourcePhrases as {
  phrases?: Record<string, string>;
}).phrases ?? {};
const sourceExemplars = (sourceDerivedClauseExemplars as unknown as {
  records?: Array<{
    id: string;
    slots?: Record<string, string>;
    source_keys?: string[];
  }>;
}).records ?? [];

function exactPersonalizedTransitRecord(fact: Pick<TransitFact, "transitingPlanet" | "aspect" | "natalPoint">) {
  const direct = `dashboard.personalized-transit.${recordKeyPart(fact.transitingPlanet)}.${recordKeyPart(fact.aspect)}.${recordKeyPart(fact.natalPoint)}`;
  const reverse = `dashboard.personalized-transit.${recordKeyPart(fact.natalPoint)}.${recordKeyPart(fact.aspect)}.${recordKeyPart(fact.transitingPlanet)}`;

  return personalizedTransitPackageRecords.find((record) => record.canonicalKey === direct)
    ?? personalizedTransitPackageRecords.find((record) => record.canonicalKey === reverse)
    ?? null;
}

function sentencesFromSourceClause(value: string) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sentenceCase(value: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : "";
}

function sentenceWithPeriod(value: string) {
  const sentence = sentenceCase(value);
  return /[.!?]$/u.test(sentence) ? sentence : `${sentence}.`;
}

function adaptPairSentence(value: string) {
  const sentence = sentenceWithPeriod(value);

  if (/\bfeel it move through your body\b/iu.test(sentence)) {
    return "Let the feeling register before brushing it off or holding back.";
  }

  if (/\bmove through\b/iu.test(sentence)) {
    return "Let the feeling pass before you decide what it proves.";
  }

  return sentence;
}

function houseTransitLocator(house?: number | null) {
  const contexts: Record<number, string> = {
    1: "how you meet the moment directly",
    2: "what has to feel materially worth it",
    3: "the conversation that keeps setting the tone",
    4: "the private foundation underneath the issue",
    5: "the risk of wanting something openly",
    6: "the daily agreement that has to be lived, not just promised",
    7: "the one-to-one agreement in front of you",
    8: "shared trust or responsibility",
    9: "the belief guiding your next choice",
    10: "the visible responsibility other people can see",
    11: "the group promise or friendship pattern involved",
    12: "the private cost you may not have named yet"
  };

  return house ? contexts[house] ?? null : null;
}

function practicalSentenceFromPairSource(sourceSentences: string[]) {
  const directInstruction = sourceSentences.find((sentence) => isPracticalPairSentence(sentence));
  if (!directInstruction) {
    return "Name the pressure directly before you decide what to do next.";
  }

  if (/\bmove through\b/iu.test(directInstruction)) {
    return "Let the feeling pass before you decide what it proves.";
  }

  return sentenceWithPeriod(directInstruction);
}

function isPracticalPairSentence(sentence: string) {
  return /\b(ask|move|say|use|treat|aim|check|stay|pursue|make|get|name|let)\b/iu.test(sentence);
}

function bridgeSentenceFromPairSource(primaryPairSourceKey: string | undefined, sourceSentences: string[]) {
  const nonInstruction = sourceSentences.slice(1).find((sentence) => !isPracticalPairSentence(sentence));

  if (nonInstruction) {
    return adaptPairSentence(nonInstruction);
  }

  if (primaryPairSourceKey === "cc/aspect-pair/venus-square-saturn") {
    return "The test is whether distance is asking for a clearer request, steadier behavior, or proof through action.";
  }

  return "This transit makes the behavior harder to sidestep once it is happening in real time.";
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function ordinal(value: number) {
  const rem100 = value % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${value}th`;
  return `${value}${{ 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th"}`;
}

function subject(perspective: OwnerPerspective) {
  return perspective === "they" ? "they" : "you";
}

function possessive(perspective: OwnerPerspective) {
  return perspective === "they" ? "their" : "your";
}

function houseScene(house: number | null | undefined, perspective: OwnerPerspective) {
  const scene = HOUSE_SCENES[house ?? 0] ?? (house ? `the ${ordinal(house)} house` : "the relevant house");
  if (perspective === "you") return scene;

  return scene
    .replace(/\byou\b/giu, "they")
    .replace(/\byour\b/giu, "their")
    .replace(/\byourself\b/giu, "themselves");
}

function cap(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function slot(text: string, sourceKeys: string[]): SourceGroundedSlot {
  return { text, sourceKeys };
}

export function recordKeyPart(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

export function natalPlacementRecordId(position: Pick<PlanetPosition, "planet" | "sign"> & { house?: number | null }) {
  return position.house
    ? `dashboard.natal-placement.${recordKeyPart(position.planet)}.${recordKeyPart(position.sign)}.house_${position.house}`
    : `dashboard.natal-placement.${recordKeyPart(position.planet)}.${recordKeyPart(position.sign)}.no_birth_time`;
}

function planetSignStory(position: Pick<PlanetPosition, "planet" | "sign">, perspective: OwnerPerspective) {
  if (position.planet === "Sun" && position.sign === "Aquarius") {
    return perspective === "they"
      ? "Their sense of direction sharpens when they can think independently and contribute something useful to a larger group. They may be the person who questions a rule everyone else blindly follows."
      : "Your sense of direction sharpens when you can think independently and contribute something useful to a larger group. You may be the person who questions a rule everyone else blindly follows.";
  }

  const functionText = PLANET_LIVED_FUNCTION[position.planet] ?? "this part of the chart";
  const signMethod = SIGN_METHOD[position.sign] ?? `through ${position.sign}`;
  return `${cap(possessive(perspective))} ${functionText.replace(/^the\s+/i, "")} tends to work ${signMethod}. It becomes easier to recognize in the choice ${subject(perspective)} make before there is time to make it look polished.`;
}

function signHouseSynthesis(position: PlanetPosition, perspective: OwnerPerspective) {
  if (!position.house) return null;
  const scene = houseScene(position.house, perspective);

  if (position.planet === "Sun" && position.sign === "Aquarius" && position.house === 9) {
    return perspective === "they"
      ? "In the 9th house, that independent streak gets tested through the beliefs they question, the teachers they trust, and the bigger story they use to orient themselves. Their confidence grows when they can challenge an inherited worldview without cutting themselves off from meaning altogether."
      : "In the 9th house, that independent streak gets tested through the beliefs you question, the teachers you trust, and the bigger story you use to orient yourself. Your confidence grows when you can challenge an inherited worldview without cutting yourself off from meaning altogether.";
  }

  return `In the ${ordinal(position.house)} house, that same pattern develops through ${scene}. The placement becomes more useful when ${subject(perspective)} make the ${position.sign} approach specific enough to live with.`;
}

function dignityModifier(position: PlanetPosition, dignityLabel: string | null | undefined, perspective: OwnerPerspective) {
  if (!dignityLabel) return null;
  if (/detriment|fall|constrained/i.test(dignityLabel)) {
    return `${position.planet} has to work less automatically in ${position.sign}. That does not make the placement broken. It means ${subject(perspective)} may need to stop performing the expected version of ${position.planet} and let a stranger, more useful version take shape.`;
  }
  if (/domicile|exalt/i.test(dignityLabel)) {
    return `${position.planet} has a clearer path in ${position.sign}. The ease becomes useful when ${subject(perspective)} do something deliberate with it instead of assuming it will carry itself.`;
  }
  return null;
}

function retrogradeModifier(position: PlanetPosition, perspective: OwnerPerspective) {
  if (position.motion !== "retrograde") return null;
  return `${position.planet} was retrograde at birth, so this part of the chart may develop through return, revision, and delayed trust. ${cap(subject(perspective))} may need more time before this placement feels ready to act in public.`;
}

function sectModifier(position: PlanetPosition, chartSect: ChartSect | null | undefined, perspective: OwnerPerspective) {
  if (!chartSect) return null;
  if (chartSect === "day" && position.planet === "Sun") {
    return `The Sun is the light leader in this day chart. That makes ${possessive(perspective)} Sun one of the places to watch first when a transit asks what direction, confidence, or visibility needs more care. Jupiter and Saturn are on the same day-chart team, so their contacts can carry extra weight.`;
  }
  if (chartSect === "night" && position.planet === "Moon") {
    return `The Moon is the light leader in this night chart. That makes ${possessive(perspective)} Moon one of the places to watch first when a transit asks what safety, appetite, or response pattern needs more care. Venus and Mars are on the same night-chart team, so their contacts can carry extra weight.`;
  }
  return null;
}

function rulerBridge(position: PlanetPosition, natalSky: SkySnapshot | null, perspective: OwnerPerspective) {
  if (!position.house) return null;
  const ruler = SIGN_RULERS[position.sign];
  const rulerPosition = ruler ? natalSky?.positions.find((candidate) => candidate.planet === ruler) : null;
  if (!ruler || !rulerPosition?.house) return null;
  const scene = houseScene(rulerPosition.house, perspective);
  return `${position.sign} answers to ${ruler}. With ${ruler} in ${rulerPosition.sign} in the ${ordinal(rulerPosition.house)} house, this placement keeps developing through ${scene}.`;
}

function aspectClassification(aspect: string, otherPlanet: string) {
  if (aspect === "trine" || aspect === "sextile") return "supportive";
  if ((aspect === "square" || aspect === "opposition") && ["Venus", "Jupiter"].includes(otherPlanet)) return "supportive";
  if (aspect === "square" || aspect === "opposition") return "challenging";
  if (aspect === "conjunction" && ["Mars", "Saturn"].includes(otherPlanet)) return "challenging";
  return "supportive";
}

function aspectSentence(aspect: AspectFact, perspective: OwnerPerspective) {
  const focalFunction = PLANET_LIVED_FUNCTION[aspect.focalPlanet] ?? `${aspect.focalPlanet}'s part of the chart`;
  const otherFunction = PLANET_LIVED_FUNCTION[aspect.otherPlanet] ?? `${aspect.otherPlanet}'s pressure`;
  const you = subject(perspective);

  if (aspect.focalPlanet === "Venus" && aspect.otherPlanet === "Saturn" && aspect.aspect === "square") {
    return `Saturn square Venus can make affection feel like something that has to prove itself. You may notice where a relationship, expense, or desire starts asking for clearer terms before you can relax into it.`;
  }

  if (aspect.focalPlanet === "Saturn" && aspect.otherPlanet === "Venus" && aspect.aspect === "square") {
    return `Venus square Saturn presses on the part of the chart that carries responsibility. You may notice where pleasure, closeness, or money exposes a limit you have been trying to manage quietly.`;
  }

  if (aspect.focalPlanet === "Sun" && aspect.otherPlanet === "Saturn" && aspect.aspect === "square") {
    return `Saturn square Sun can make confidence feel like it has to pass a test first. The useful move is to name the real limit without letting the limit decide who ${you} are allowed to become.`;
  }

  if (aspect.focalPlanet === "Sun" && aspect.otherPlanet === "Jupiter" && aspect.aspect === "opposition") {
    return `Jupiter opposite Sun can pull your confidence toward a bigger promise than the moment can hold. This can support the placement when hope stays honest and the next step is sized to real life.`;
  }

  if (aspect.aspect === "square") {
    return `${aspect.otherPlanet} square ${aspect.focalPlanet} puts pressure on ${possessive(perspective)} ${focalFunction}. The growth is in naming the limit before it starts making the choice for ${you}.`;
  }
  if (aspect.aspect === "trine" || aspect.aspect === "sextile") {
    return `${aspect.otherPlanet} ${aspect.aspect} ${aspect.focalPlanet} gives ${possessive(perspective)} ${focalFunction} an easier route. Let the opening become one practical choice instead of assuming ease will do the work alone.`;
  }
  return `${aspect.otherPlanet} ${aspect.aspect} ${aspect.focalPlanet} concentrates ${possessive(perspective)} ${focalFunction}. The useful question is what gets louder when this contact is active.`;
}

function sourceKeysForAspect(aspect: AspectFact) {
  if (aspect.focalPlanet === "Venus" && aspect.otherPlanet === "Saturn" && aspect.aspect === "square") return SOURCE_KEYS.venusSaturn;
  if (aspect.focalPlanet === "Saturn" && aspect.otherPlanet === "Venus" && aspect.aspect === "square") return SOURCE_KEYS.venusSaturn;
  if (aspect.focalPlanet === "Sun" && aspect.otherPlanet === "Saturn" && aspect.aspect === "square") return SOURCE_KEYS.sunSaturn;
  if (aspect.focalPlanet === "Sun" && aspect.otherPlanet === "Jupiter" && aspect.aspect === "opposition") return SOURCE_KEYS.sunJupiter;
  return [`cc/aspect/${recordKeyPart(aspect.aspect)}`, `cc/planet/${recordKeyPart(aspect.focalPlanet)}`, `cc/planet/${recordKeyPart(aspect.otherPlanet)}`];
}

function aspectSection(aspect: AspectFact, perspective: OwnerPerspective): SourceGroundedSection {
  return {
    heading: `${aspect.otherPlanet} ${aspect.aspect} ${aspect.focalPlanet}`,
    tldr: "",
    body: aspectSentence(aspect, perspective)
  };
}

function skyPlacementClauses(planet: string, sign: string) {
  const key = `${planet}.${sign}`;
  const sourceFunction = PLANET_LIVED_FUNCTION[planet] ?? "the current sky";
  const sourceMethod = SIGN_METHOD[sign] ?? `through ${sign}`;
  const specific: Record<string, {
    compactSkyBehaviorClause: string;
    skyShiftClause: string;
    collectiveBehaviorClause: string;
    recognizableSituationClause: string;
    currentChoiceClause: string;
  }> = {
    "Venus.Virgo": {
      compactSkyBehaviorClause: "sorts desire through what is workable enough to repair",
      skyShiftClause: "putting more attention on the details that decide whether ease can actually last",
      collectiveBehaviorClause: "Care works best when the terms are concrete, mutual, and easy to follow.",
      recognizableSituationClause: "A small mismatch in effort, taste, or expectation can reveal what needs adjustment before resentment gathers.",
      currentChoiceClause: "Make the repair specific enough that everyone knows what has changed."
    },
    "Mars.Gemini": {
      compactSkyBehaviorClause: "speeds up the argument or errand that needs a clearer channel",
      skyShiftClause: "putting more heat into the words and unfinished threads already in the room",
      collectiveBehaviorClause: "Momentum needs one clear channel before every question turns into an errand.",
      recognizableSituationClause: "A conversation can become the place where impatience, curiosity, and conflict all try to drive at once.",
      currentChoiceClause: "Choose the message that actually needs to be sent before chasing the next one."
    },
    "Jupiter.Leo": {
      compactSkyBehaviorClause: "amplifies confidence where creative risk wants a warmer reception",
      skyShiftClause: "putting more room around confidence and the desire to make something visible",
      collectiveBehaviorClause: "A bigger promise may need enough sincerity and craft to hold the attention it asks for",
      recognizableSituationClause: "A public choice can reveal where hope is asking for more scale than the plan can yet hold.",
      currentChoiceClause: "Let the generous move stay honest about what it can actually sustain."
    },
    "Saturn.Aries": {
      compactSkyBehaviorClause: "tests whether courage can become disciplined enough to begin well",
      skyShiftClause: "Putting pressure on first moves and the responsibility of acting before certainty arrives",
      collectiveBehaviorClause: "Initiative may need a stronger container before speed becomes useful",
      recognizableSituationClause: "A rushed start can show where patience is part of the action rather than a refusal to act.",
      currentChoiceClause: "Build the first step carefully enough that it can carry the next one."
    },
    "Uranus.Gemini": {
      compactSkyBehaviorClause: "disrupts stale messages and the assumptions that travel with them",
      skyShiftClause: "putting more voltage into language and the systems people use to connect",
      collectiveBehaviorClause: "Information can reroute quickly when a familiar explanation stops working",
      recognizableSituationClause: "A surprising message, technical shift, or change in the conversation can break open a different path.",
      currentChoiceClause: "Leave room for the useful interruption without making every disruption the new rule."
    },
    "Sun.Cancer": {
      compactSkyBehaviorClause: "draws attention to belonging and the cost of protection",
      skyShiftClause: "putting more attention on what people protect and how they react when something feels personal",
      collectiveBehaviorClause: "Decisions may be shaped by loyalty, family pressure, or the need to defend what already feels familiar",
      recognizableSituationClause: "A home matter, old memory, or protective reflex can carry more force than the immediate issue deserves.",
      currentChoiceClause: "Check what actually needs care before answering from habit."
    }
  };

  return specific[key] ?? {
    compactSkyBehaviorClause: `${sign} gives ${sourceFunction} a more specific tone and pace`,
    skyShiftClause: `${sign} gives ${sourceFunction} a more specific tone, pace, and set of priorities`,
    collectiveBehaviorClause: `${sign} gives ${sourceFunction} a more specific tone, so the next response may need clearer limits and timing.`,
    recognizableSituationClause: "A conversation, plan, or responsibility may ask for a clearer next step before more energy goes into it.",
    currentChoiceClause: "Choose one practical response before giving the moment more energy."
  };
}

export function composeNatalPlacement(options: {
  position: PlanetPosition;
  natalSky: SkySnapshot | null;
  ownerPerspective: OwnerPerspective;
  chartSect?: ChartSect | null;
  dignityLabel?: string | null;
  reliableBirthTime?: boolean;
  aspects?: AspectFact[];
}): SourceGroundedComposition {
  const { position, natalSky, ownerPerspective, aspects = [] } = options;
  const reliableBirthTime = options.reliableBirthTime !== false;
  const baseSourceKeys = position.planet === "Sun" && position.sign === "Aquarius"
    ? SOURCE_KEYS.sunAquarius
    : [`cc/planet/${recordKeyPart(position.planet)}`, `cc/sign/${recordKeyPart(position.sign)}/lived-behaviors`];
  const recordId = natalPlacementRecordId(reliableBirthTime ? position : { ...position, house: null });
  const slots: Record<string, SourceGroundedSlot> = {
    planetInSignStory: slot(planetSignStory(position, ownerPerspective), baseSourceKeys)
  };
  const sections: SourceGroundedSection[] = [
    { heading: `${position.planet} in ${position.sign}`, tldr: "TLDR", body: slots.planetInSignStory.text }
  ];
  const conditionalBranches: string[] = ["layer_1_sign"];

  if (reliableBirthTime && position.house) {
    slots.signHouseSynthesis = slot(signHouseSynthesis(position, ownerPerspective) ?? "", [...baseSourceKeys, `cc/house/${position.house}`]);
    sections.push({ heading: `... in the ${ordinal(position.house)} house of ${HOUSE_LABELS[position.house] ?? `the ${ordinal(position.house)} house`}`, tldr: "", body: slots.signHouseSynthesis.text });
    conditionalBranches.push("layer_2_house");
  } else {
    conditionalBranches.push("without_birth_time");
  }

  const retro = retrogradeModifier(position, ownerPerspective);
  if (retro) {
    slots.retrogradeModifier = slot(retro, baseSourceKeys);
    sections.push({ heading: `${position.planet} retrograde`, tldr: "", body: retro });
    conditionalBranches.push("layer_4_retrograde_at_birth");
  }

  const sect = reliableBirthTime ? sectModifier(position, options.chartSect, ownerPerspective) : null;
  if (sect) {
    const sectBody = options.chartSect === "day" ? "sun" : "moon";
    slots.sectModifier = slot(sect, [`cc/planet/${sectBody}`, "cc/ref/transit-principles/fast-vs-slow"]);
    sections.push({ heading: `The ${position.planet} is your light leader`, tldr: "", body: sect });
    conditionalBranches.push(`layer_3_importance_sect_${options.chartSect}`);
  }

  const dignity = dignityModifier(position, options.dignityLabel, ownerPerspective);
  if (dignity) {
    slots.dignityModifier = slot(dignity, baseSourceKeys);
    sections.push({ heading: `${position.planet} in ${position.sign}`, tldr: "", body: dignity });
    conditionalBranches.push("layer_5_dignity_note");
  }

  const bridge = reliableBirthTime ? rulerBridge(position, natalSky, ownerPerspective) : null;
  if (bridge) {
    slots.rulerBridge = slot(bridge, [...baseSourceKeys, `cc/house/${position.house}`, `cc/planet/${recordKeyPart(SIGN_RULERS[position.sign])}`]);
    sections.push({ heading: `${position.sign} ruled by ${SIGN_RULERS[position.sign]}`, tldr: "", body: bridge });
    conditionalBranches.push("ruler_bridge");
  }

  const supportive = aspects.filter((aspect) => aspectClassification(aspect.aspect, aspect.otherPlanet) === "supportive");
  const challenging = aspects.filter((aspect) => aspectClassification(aspect.aspect, aspect.otherPlanet) === "challenging");

  if (supportive.length) {
    const text = supportive.map((aspect) => aspectSentence(aspect, ownerPerspective)).join("\n\n");
    slots.supportivePatterns = slot(text, unique(supportive.flatMap(sourceKeysForAspect)));
    sections.push({ heading: "What supports this", tldr: "", body: text });
    conditionalBranches.push("layer_6_supportive_patterns");
  }

  if (challenging.length) {
    const text = challenging.map((aspect) => aspectSentence(aspect, ownerPerspective)).join("\n\n");
    slots.challengingPatterns = slot(text, unique(challenging.flatMap(sourceKeysForAspect)));
    sections.push({ heading: "What makes this harder", tldr: "", body: text });
    conditionalBranches.push("layer_6_challenging_patterns");
  }

  const finalCopy = sections.map((section) => `${section.heading}\n${section.body}`).join("\n\n");

  return {
    templateId: reliableBirthTime ? "natal-planet-sign-house-layered-v1" : "natal-planet-sign-without-birth-time-v1",
    templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
    recordId,
    slots,
    sourceKeys: unique(Object.values(slots).flatMap((item) => item.sourceKeys)),
    finalCopy,
    sections,
    conditionalBranches,
    provenance: {
      initial: "source-grounded-local-template",
      hydrated: "source-grounded-local-template"
    }
  };
}

export function composeSkyRetrograde(options: {
  planet: string;
  sign: string;
  phase: string;
  start: string;
  end: string;
  currentDate: string;
}): SourceGroundedComposition {
  const recordId = `sky.retrograde.${recordKeyPart(options.planet)}.${recordKeyPart(options.sign)}.${recordKeyPart(options.phase)}`;
  const exemplar = options.planet === "Mercury" && options.sign === "Cancer"
    ? sourceExemplars.find((record) => record.id === "exemplar.sky.mercury-retrograde.cancer")
    : null;
  const sourceKeys = exemplar?.source_keys ?? [];
  const reviewSituation = exemplar?.slots?.recognizableMoment ?? READER_UNAVAILABLE_COPY;
  const response = exemplar?.slots?.practicalResponse ?? "";
  const timing = `${options.currentDate} falls inside the calculated ${options.start} to ${options.end} retrograde window.`;
  const slots = {
    reviewSituation: slot(reviewSituation, sourceKeys),
    practicalResponse: slot(response, sourceKeys),
    timing: slot(timing, ["calculated:retrograde-window"])
  };
  const finalCopy = [reviewSituation, response, timing].filter(Boolean).join(" ");

  return {
    templateId: "retrograde-phase.retrograde-passage",
    templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
    recordId,
    slots,
    sourceKeys,
    finalCopy,
    sections: [{ heading: `${options.planet} retrograde in ${options.sign}`, tldr: "TLDR", body: finalCopy }],
    conditionalBranches: ["approved-fallback", `phase_${recordKeyPart(options.phase)}`],
    provenance: {
      initial: "source-grounded-local-template",
      hydrated: "source-grounded-local-template"
    }
  };
}

export function composeSkyPlacement(options: {
  planet: string;
  sign: string;
  duration?: string | null;
}): SourceGroundedComposition {
  const slots = {
    sourceGap: slot(READER_UNAVAILABLE_COPY, [])
  };
  const finalCopy = READER_UNAVAILABLE_COPY;

  return {
    templateId: "current-sky-placement",
    templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
    recordId: `sky.placement.${recordKeyPart(options.planet)}.${recordKeyPart(options.sign)}`,
    slots,
    sourceKeys: [],
    finalCopy,
    sections: [{ heading: `${options.planet} in ${options.sign}`, tldr: "TLDR", body: finalCopy }],
    conditionalBranches: ["SOURCE_GAP", "expanded", "template_section_sky_planet_in_sign"],
    provenance: {
      initial: "source-grounded-local-template",
      hydrated: "source-grounded-local-template"
    }
  };
}

export function composeSkyPlacementCompact(options: {
  planet: string;
  sign: string;
}): SourceGroundedComposition {
  const slots = {
    sourceGap: slot(READER_UNAVAILABLE_COPY, [])
  };
  const finalCopy = READER_UNAVAILABLE_COPY;

  return {
    templateId: "current-sky-placement",
    templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
    recordId: `sky.placement.${recordKeyPart(options.planet)}.${recordKeyPart(options.sign)}`,
    slots,
    sourceKeys: [],
    finalCopy,
    sections: [{ heading: `${options.planet} in ${options.sign}`, tldr: "", body: finalCopy }],
    conditionalBranches: ["SOURCE_GAP", "compact", "template_section_sky_planet_in_sign"],
    provenance: {
      initial: "source-grounded-local-template",
      hydrated: "source-grounded-local-template"
    }
  };
}

export function composeSkyAspect(aspect: AspectFact & { timing?: string | null }): SourceGroundedComposition {
  const slots = {
    sourceGap: slot(READER_UNAVAILABLE_COPY, [])
  };
  const finalCopy = READER_UNAVAILABLE_COPY;

  return {
    templateId: "current-sky-aspect",
    templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
    recordId: `sky.aspect.${recordKeyPart(aspect.focalPlanet)}.${recordKeyPart(aspect.aspect)}.${recordKeyPart(aspect.otherPlanet)}`,
    slots,
    sourceKeys: [],
    finalCopy,
    sections: [{ heading: `${aspect.focalPlanet} ${aspect.aspect} ${aspect.otherPlanet}`, tldr: "TLDR", body: finalCopy }],
    conditionalBranches: ["SOURCE_GAP", "expanded", "template_section_sky_current_aspect"],
    provenance: {
      initial: "source-grounded-local-template",
      hydrated: "source-grounded-local-template"
    }
  };
}

export function composeSkyAspectCompact(aspect: AspectFact): SourceGroundedComposition {
  const slots = {
    sourceGap: slot(READER_UNAVAILABLE_COPY, [])
  };
  const finalCopy = READER_UNAVAILABLE_COPY;

  return {
    templateId: "current-sky-aspect",
    templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
    recordId: `sky.aspect.${recordKeyPart(aspect.focalPlanet)}.${recordKeyPart(aspect.aspect)}.${recordKeyPart(aspect.otherPlanet)}`,
    slots,
    sourceKeys: [],
    finalCopy,
    sections: [{ heading: `${aspect.focalPlanet} ${aspect.aspect} ${aspect.otherPlanet}`, tldr: "", body: finalCopy }],
    conditionalBranches: ["SOURCE_GAP", "compact", "template_section_sky_current_aspect"],
    provenance: {
      initial: "source-grounded-local-template",
      hydrated: "source-grounded-local-template"
    }
  };
}

export function composeNatalAspect(aspect: AspectFact, perspective: OwnerPerspective): SourceGroundedComposition {
  const body = aspectSentence(aspect, perspective);
  const slots = {
    focalBaselineClause: slot(`${cap(possessive(perspective))} ${PLANET_LIVED_FUNCTION[aspect.focalPlanet] ?? `${aspect.focalPlanet} placement`} is the part of the chart being asked to respond.`, sourceKeysForAspect(aspect)),
    modifyingActionClause: slot(body, sourceKeysForAspect(aspect)),
    recognizableExampleClause: slot(`This is most visible when the ${aspect.focalPlanet} part of the chart has to respond through a real choice instead of an idea about the choice.`, sourceKeysForAspect(aspect))
  };
  const classification = aspectClassification(aspect.aspect, aspect.otherPlanet);
  const finalCopy = classification === "challenging"
    ? `${slots.focalBaselineClause.text} ${slots.modifyingActionClause.text} ${slots.recognizableExampleClause.text}`
    : `${slots.focalBaselineClause.text} ${slots.modifyingActionClause.text} ${slots.recognizableExampleClause.text}`;

  return {
    templateId: `natal-aspect-focal-${classification}-v1`,
    templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
    recordId: `dashboard.natal-aspect.${recordKeyPart(aspect.focalPlanet)}.${recordKeyPart(aspect.aspect)}.${recordKeyPart(aspect.otherPlanet)}`,
    slots,
    sourceKeys: unique(Object.values(slots).flatMap((item) => item.sourceKeys)),
    finalCopy,
    sections: [{ ...aspectSection(aspect, perspective), tldr: classification }],
    conditionalBranches: [`classification_${classification}`],
    provenance: {
      initial: "source-grounded-local-template",
      hydrated: "source-grounded-local-template"
    }
  };
}

export function composePersonalTransit(fact: TransitFact): SourceGroundedComposition {
  const long = fact.term === "long";
  const recordId = `dashboard.personalized-transit.${recordKeyPart(fact.transitingPlanet)}.${recordKeyPart(fact.aspect)}.${recordKeyPart(fact.natalPoint)}`;
  const pairRecord = exactPersonalizedTransitRecord(fact);
  const pairClause = pairRecord?.clauses?.immediate_observation ?? null;
  const pairClauseSourceKeys = pairClause?.source_keys ?? pairRecord?.sourceKeys ?? [];
  const primaryPairSourceKeys = pairClauseSourceKeys.filter((key) => key.startsWith("cc/aspect-pair/"));
  const pairClauseText = primaryPairSourceKeys
    .map((key) => aspectPairPhraseBank[key])
    .find((value): value is string => Boolean(value?.trim()))
    ?? pairClause?.text_you
    ?? "";
  const supportingSourceKeys = [
    ...pairClauseSourceKeys.filter((key) => !key.startsWith("cc/aspect-pair/")),
    ...(fact.natalHouse ? [`cc/house/${fact.natalHouse}`] : [])
  ];
  const calculatedFactKeys = ["calculated:transit-window", "calculated:transit-fact"];
  const houseLocator = houseTransitLocator(fact.natalHouse);
  const aspectVerb = fact.aspect === "conjunction"
    ? "conjuncts"
    : fact.aspect === "opposition"
      ? "opposes"
      : `${fact.aspect}s`;
  const technicalFooter = `The astro: Transiting ${fact.transitingPlanet} ${aspectVerb} your natal ${fact.natalPoint}${fact.natalSign ? ` in ${fact.natalSign}` : ""}${fact.natalHouse ? ` in the ${ordinal(fact.natalHouse)} house` : ""}${fact.orb ? `. Orb: ${fact.orb}` : ""}.`;

  if (!pairRecord || !pairClauseText || primaryPairSourceKeys.length === 0) {
    const slots = {
      sourceGap: slot(
        `SOURCE_GAP: no exact aspect-pair lived-situation source exists for ${fact.transitingPlanet} ${fact.aspect} natal ${fact.natalPoint}.`,
        []
      ),
      astroFooter: slot(technicalFooter, ["calculated:transit-fact"])
    };

    return {
      templateId: long ? "personalized-transit-long-term-v1" : "personalized-transit-short-term-v1",
      templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
      recordId,
      slots,
      sourceKeys: [],
      sourceRoles: {
        primaryPairSourceKeys: [],
        supportingSourceKeys,
        calculatedFactKeys
      },
      finalCopy: slots.astroFooter.text,
      sections: [{ heading: "Transit facts", tldr: "", body: slots.astroFooter.text }],
      conditionalBranches: ["SOURCE_GAP", long ? "long_term" : "short_term"],
      provenance: {
        initial: "source-grounded-local-template",
        hydrated: "source-grounded-local-template"
      }
    };
  }

  const pairSentences = sentencesFromSourceClause(pairClauseText);
  const recognizableFromPair = adaptPairSentence(pairSentences[0] ?? pairClauseText);
  const revealFromPair = bridgeSentenceFromPairSource(primaryPairSourceKeys[0], pairSentences);
  const practicalFromPair = practicalSentenceFromPairSource(pairSentences.slice(1));
  const locatorPhrase = houseLocator ? ` In this chart, locate it through ${houseLocator}.` : "";
  const slots: Record<string, SourceGroundedSlot> = long
    ? {
          recognizableLivedMoment: slot(
            `${recognizableFromPair}${locatorPhrase}`,
            primaryPairSourceKeys
          ),
          repeatingPattern: slot(
            revealFromPair,
            primaryPairSourceKeys
          ),
          pressureMeaning: slot(
            "Let that be the situation you respond to, rather than treating the pressure as a verdict.",
            primaryPairSourceKeys
          ),
          concreteAction: slot(
            practicalFromPair,
            primaryPairSourceKeys
          ),
          longTermContext: slot(
            `${fact.activeWindow} is a long process${fact.pass ? `, with this contact marked as ${fact.pass}` : ""}. Let the repeated timing show whether the response becomes more consistent.`,
            ["calculated:transit-window", ...primaryPairSourceKeys, ...supportingSourceKeys]
          ),
          astroFooter: slot(technicalFooter, ["calculated:transit-fact"])
        }
    : {
        immediateObservation: slot(`${recognizableFromPair}${locatorPhrase}`, primaryPairSourceKeys),
        specificSituation: slot(revealFromPair, primaryPairSourceKeys),
        practicalResponse: slot(practicalFromPair, primaryPairSourceKeys),
        timing: slot(`Active window: ${fact.activeWindow}${fact.exactAt ? `. Exact: ${fact.exactAt}` : ""}.`, ["calculated:transit-window"]),
        astroFooter: slot(technicalFooter, ["calculated:transit-fact"])
      };
  const orderedLongSlots = [
    "recognizableLivedMoment",
    "repeatingPattern",
    "pressureMeaning",
    "concreteAction",
    "longTermContext",
    "astroFooter"
  ];
  const orderedShortSlots = ["immediateObservation", "specificSituation", "practicalResponse", "timing", "astroFooter"];
  const orderedSlotNames = long ? orderedLongSlots : orderedShortSlots;
  const finalCopy = orderedSlotNames.map((name) => slots[name]?.text).filter(Boolean).join("\n\n");

  return {
    templateId: long ? "personalized-transit-long-term-v1" : "personalized-transit-short-term-v1",
    templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
    recordId,
    slots,
    sourceKeys: unique(Object.values(slots).flatMap((item) => item.sourceKeys)),
    sourceRoles: {
      primaryPairSourceKeys,
      supportingSourceKeys,
      calculatedFactKeys
    },
    finalCopy,
    sections: [{
      heading: long ? "Long-term" : "Short-term",
      tldr: long ? `${fact.activeWindow} · Long-term` : slots.timing.text,
      body: finalCopy
    }],
    conditionalBranches: [long ? "long_term" : "short_term", fact.pass ? "pass_note" : "single_pass"],
    provenance: {
      initial: "source-grounded-local-template",
      hydrated: "source-grounded-local-template"
    }
  };
}
