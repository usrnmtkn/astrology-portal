import type { PlanetPosition, SkySnapshot } from "../types";
import { getSupabaseClient } from "./auth";
import { isReaderServableGeneratedContentRow } from "./generatedContent";
import { firstReaderFacingCopy } from "../content/readerSafety";
import {
  capitalizeSentence,
  createReaderSubject,
  readerDisplayName,
  readerHeadlineFallback,
  type ReaderSubject,
  type ReaderSubjectOptions
} from "./readerSubject";

export type CareerVocabularyRow = {
  contentKey: string;
  headline: string;
  body: string;
};

export type CareerProseLayer = "source-grounded" | "madlib-fallback";

export type CareerArchetypeSection = {
  key: string;
  label: string;
  contentKey: string;
  headline: string;
  body: string;
  meta: string;
  layer: CareerProseLayer;
  tier: string;
  sourceKeys: string[];
};

export type CareerArchetypeProfile = {
  title: string;
  summary: string;
  tldr: string;
  factors: Array<{
    label: string;
    value: string;
  }>;
  sections: CareerArchetypeSection[];
};

type CareerVocabularyDbRow = {
  content_key: string;
  status?: string | null;
  lane?: string | null;
  review_state?: string | null;
  flags?: string[] | null;
  headline: string | null;
  body: string | null;
  prompt_version?: string | null;
};

type CareerArchetypeOptions = {
  ownerName?: string;
  pronouns?: ReaderSubjectOptions["pronouns"];
};

type CareerCopyContext = {
  isSelf: boolean;
  possessive: string;
  possessiveLower: string;
  subject: string;
};

const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const fireSigns = new Set(["Aries", "Leo", "Sagittarius"]);
const earthSigns = new Set(["Taurus", "Virgo", "Capricorn"]);
const airSigns = new Set(["Gemini", "Libra", "Aquarius"]);
const waterSigns = new Set(["Cancer", "Scorpio", "Pisces"]);
const cardinalSigns = new Set(["Aries", "Cancer", "Libra", "Capricorn"]);
const fixedSigns = new Set(["Taurus", "Leo", "Scorpio", "Aquarius"]);
const mutableSigns = new Set(["Gemini", "Virgo", "Sagittarius", "Pisces"]);
const careerVocabularyPrefixes = [
  "ms/career/",
  "vocab/house-career/",
  "vocab/house-cusp-element/",
  "vocab/element-career/",
  "vocab/mode-career/",
  "vocab/hemisphere/",
  "vocab/mc-element/",
  "vocab/planet-in-10th/",
  "vocab/saturn-mastery/",
  "vocab/north-node-mode/"
];

const careerVocabularyContentKeyFilter = careerVocabularyPrefixes
  .map((prefix) => `content_key.like.${prefix}%`)
  .join(",");

const fallbackCareerVocabulary: Record<string, CareerVocabularyRow> = {
  "vocab/house-career/10": {
    contentKey: "vocab/house-career/10",
    headline: "Your Public Reputation",
    body: "your career mission, professional image, and how you want to be known in the world."
  },
  "vocab/saturn-mastery/saturn": {
    contentKey: "vocab/saturn-mastery/saturn",
    headline: "Saturn mastery",
    body: "Saturn shows where consistent challenges can become areas of expertise and earned authority."
  }
};

const fallbackByPrefix: Record<string, Record<string, string>> = {
  "vocab/element-career/": {
    fire: "Work needs room for initiative, courage, and creative autonomy.",
    earth: "Work needs practical outcomes, reliability, and something real to build.",
    air: "Work needs ideas, communication, variety, and exchange.",
    water: "Work needs emotional intelligence, care, intuition, and meaningful service.",
    balanced: "Work needs enough range to engage more than one part of your nature."
  },
  "vocab/mode-career/": {
    cardinal: "You are most alive professionally when you can initiate, lead, or move something forward.",
    fixed: "You build strength through depth, consistency, and staying power.",
    mutable: "You thrive when work lets you adapt, teach, translate, and keep learning."
  },
  "vocab/hemisphere/": {
    north: "Fulfillment grows through personal skill development and individual mastery.",
    south: "Fulfillment grows through contribution, visibility, and serving something larger than yourself.",
    east: "Your career path has self-starting energy; you tend to create opportunities rather than wait for them.",
    west: "Your career path develops through responsiveness, collaboration, clients, partners, and timing."
  },
  "vocab/mc-element/": {
    fire: "You are meant to be seen as someone who energizes others and pioneers new approaches.",
    earth: "You are meant to be seen as competent, trustworthy, and able to build lasting value.",
    air: "You are meant to be seen as someone who connects ideas and people.",
    water: "You are meant to be seen as someone who offers care, support, and emotional insight."
  },
  "vocab/north-node-mode/": {
    cardinal: "You are learning to initiate and lead.",
    fixed: "You are learning to sustain effort and develop consistency.",
    mutable: "You are learning to adapt, teach, and translate."
  }
};

const houseCareerThemes: Record<number, string> = {
  1: "identity, body, first impressions, courage, and the way you initiate",
  2: "money, values, resources, earning power, and self-worth",
  3: "communication, writing, learning, siblings, neighbors, and local networks",
  4: "home, family patterns, roots, emotional security, and the private foundation beneath public life",
  5: "creativity, visibility, performance, leadership through joy, and what you make from the heart",
  6: "daily work, service, routines, craft, health, and the systems that keep life functioning",
  7: "clients, partners, agreements, collaboration, and how you meet people one-to-one",
  8: "shared resources, psychology, research, crisis, intimacy, and transformation",
  9: "teaching, publishing, travel, belief, higher learning, and the search for meaning",
  10: "career, reputation, authority, ambition, and the role you are known for",
  11: "audience, groups, networks, community, allies, and long-term goals",
  12: "behind-the-scenes service, solitude, retreat, institutions, healing, and hidden work"
};

const signCareerTones: Record<string, string> = {
  Aries: "Aries brings independence, speed, courage, and a need to act before everything is fully proven.",
  Taurus: "Taurus brings patience, craft, beauty, resources, and a need to build something steady and tangible.",
  Gemini: "Gemini brings language, curiosity, translation, teaching, and a need for variety.",
  Cancer: "Cancer brings protection, memory, care, belonging, and work that feels emotionally meaningful.",
  Leo: "Leo brings creative authority, performance, warmth, authorship, and the need to be recognized for what is heartfelt.",
  Virgo: "Virgo brings discernment, skill, repair, usefulness, editing, and the ability to make messy things workable.",
  Libra: "Libra brings design, diplomacy, taste, justice, partnership, and the ability to balance competing needs.",
  Scorpio: "Scorpio brings depth, strategy, investigation, transformation, and the courage to work with what others avoid.",
  Sagittarius: "Sagittarius brings teaching, belief, exploration, publishing, humor, and the need for a wider horizon.",
  Capricorn: "Capricorn brings structure, responsibility, strategy, mastery, and the patience to build over time.",
  Aquarius: "Aquarius brings systems, networks, future-facing ideas, community intelligence, and a willingness to be different.",
  Pisces: "Pisces brings imagination, intuition, compassion, spirituality, art, and the need for work that has soul."
};

const signCareerEssences: Record<string, string> = {
  Aries: "independent, brave, and self-starting",
  Taurus: "steady, tactile, and value-building",
  Gemini: "curious, verbal, and connective",
  Cancer: "protective, caring, and emotionally meaningful",
  Leo: "creative, visible, and heart-led",
  Virgo: "skilled, practical, discerning, and useful",
  Libra: "relational, balanced, tasteful, and diplomatic",
  Scorpio: "deep, strategic, investigative, and transformative",
  Sagittarius: "teaching-oriented, exploratory, and meaning-seeking",
  Capricorn: "structured, responsible, and mastery-oriented",
  Aquarius: "future-facing, networked, idea-led, and unconventional",
  Pisces: "imaginative, intuitive, compassionate, and soulful"
};

const planetInTenthMeanings: Record<string, string> = {
  Sun: "The Sun in the 10th asks you to become visible through leadership, authorship, and a public identity that feels genuinely yours.",
  Moon: "The Moon in the 10th makes reputation emotional and responsive; people may know you for care, attunement, timing, or public sensitivity.",
  Mercury: "Mercury in the 10th makes your mind part of your public role. Communication, writing, teaching, analysis, naming patterns, and connecting information can become career currency.",
  Venus: "Venus in the 10th makes beauty, taste, connection, harmony, values, or relational skill part of what people recognize in your work.",
  Mars: "Mars in the 10th brings drive, initiative, competition, advocacy, and the need to act decisively in public life.",
  Jupiter: "Jupiter in the 10th expands visibility through teaching, guidance, publishing, optimism, and the ability to help others see the bigger picture.",
  Saturn: "Saturn in the 10th makes authority central. Career grows through responsibility, patience, standards, and earning trust over time."
};

const planetInTenthTldr: Record<string, string> = {
  Sun: "leadership and authorship",
  Moon: "care, timing, and emotional attunement",
  Mercury: "communication, writing, teaching, analysis, and pattern-naming",
  Venus: "taste, connection, beauty, values, and relational intelligence",
  Mars: "initiative, courage, advocacy, and decisive action",
  Jupiter: "teaching, guidance, publishing, and big-picture thinking",
  Saturn: "responsibility, standards, patience, and earned authority"
};

const nodeModeMeanings: Record<string, string> = {
  cardinal: "For the North Node, cardinal growth means practicing initiative: starting before every permission slip arrives, choosing direction, and letting leadership be learned through action.",
  fixed: "For the North Node, fixed growth means practicing steadiness: staying with the work long enough for confidence, value, and mastery to become visible.",
  mutable: "For the North Node, mutable growth means practicing adaptation: learning, translating, teaching, and letting the path evolve without treating change as failure."
};

const hemisphereTldrThemes: Record<string, string> = {
  north: "private development, personal skill, and individual mastery",
  south: "public contribution, visibility, and serving something larger",
  east: "self-starting choices, initiative, and creating opportunities",
  west: "partnerships, clients, timing, and responsiveness"
};

let cachedCareerVocabulary: Map<string, CareerVocabularyRow> | null = null;
let loadingCareerVocabulary: Promise<Map<string, CareerVocabularyRow>> | null = null;

function slug(value: string | number) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function elementForSign(sign: string) {
  if (fireSigns.has(sign)) return "fire";
  if (earthSigns.has(sign)) return "earth";
  if (airSigns.has(sign)) return "air";
  if (waterSigns.has(sign)) return "water";
  return "";
}

function modeForSign(sign: string) {
  if (cardinalSigns.has(sign)) return "cardinal";
  if (fixedSigns.has(sign)) return "fixed";
  if (mutableSigns.has(sign)) return "mutable";
  return "";
}

function signAtWholeSignHouse(ascendant: string, house: number) {
  const ascendantIndex = signs.indexOf(ascendant);

  if (ascendantIndex < 0) {
    return "";
  }

  return signs[(ascendantIndex + house - 1) % signs.length];
}

function strongestHemisphere(positions: PlanetPosition[]) {
  const visibleBodies = positions.filter((position) => typeof position.house === "number" && position.house >= 1 && position.house <= 12);
  const north = visibleBodies.filter((position) => position.house >= 1 && position.house <= 6).length;
  const south = visibleBodies.filter((position) => position.house >= 7 && position.house <= 12).length;
  const east = visibleBodies.filter((position) => position.house >= 10 || position.house <= 3).length;
  const west = visibleBodies.filter((position) => position.house >= 4 && position.house <= 9).length;
  const scores = [
    { key: "north", score: north },
    { key: "south", score: south },
    { key: "east", score: east },
    { key: "west", score: west }
  ].sort((first, second) => second.score - first.score);

  return scores[0]?.score > scores[1]?.score ? scores[0].key : "";
}

function fallbackRow(contentKey: string, headline: string): CareerVocabularyRow {
  const direct = fallbackCareerVocabulary[contentKey];

  if (direct) return direct;

  for (const [prefix, rows] of Object.entries(fallbackByPrefix)) {
    if (contentKey.startsWith(prefix)) {
      const key = contentKey.replace(prefix, "");
      const body = rows[key];

      if (body) {
        return { contentKey, headline, body };
      }
    }
  }

  return { contentKey, headline, body: "" };
}

function normalizeCareerVocabularyKey(contentKey: string) {
  const houseCareer = contentKey.match(/^vocab\/house-career\/house_(\d+)$/);

  if (houseCareer) {
    return `vocab/house-career/${houseCareer[1]}`;
  }

  const hemisphereAliases: Record<string, string> = {
    eastern: "east",
    northern: "north",
    southern: "south",
    western: "west"
  };
  const hemisphere = contentKey.match(/^vocab\/hemisphere\/(eastern|northern|southern|western)$/);

  if (hemisphere) {
    return `vocab/hemisphere/${hemisphereAliases[hemisphere[1]]}`;
  }

  return contentKey;
}

function careerRow(vocabulary: Map<string, CareerVocabularyRow> | null, contentKey: string, headline: string) {
  return vocabulary?.get(contentKey) ?? fallbackRow(contentKey, headline);
}

function careerRowLayer(vocabulary: Map<string, CareerVocabularyRow> | null, contentKey: string): CareerProseLayer {
  return vocabulary?.has(contentKey) ? "source-grounded" : "madlib-fallback";
}

function storedCareerRow(vocabulary: Map<string, CareerVocabularyRow> | null, contentKey: string) {
  return vocabulary?.get(contentKey) ?? null;
}

function careerSourceBadge(layer: CareerProseLayer) {
  return layer === "source-grounded" ? "Admin" : "Fallback";
}

function possessiveOwnerName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Their";
  }

  return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
}

function careerCopyContext(ownerName = ""): CareerCopyContext {
  const trimmed = ownerName.trim();

  if (!trimmed) {
    return {
      isSelf: true,
      possessive: "Your",
      possessiveLower: "your",
      subject: "you"
    };
  }

  const possessive = possessiveOwnerName(trimmed);

  return {
    isSelf: false,
    possessive,
    possessiveLower: possessive,
    subject: trimmed
  };
}

function ownerizeCareerCopy(value: string, context: CareerCopyContext) {
  if (context.isSelf) {
    return value;
  }

  return value
    .replace(/\bYou are\b/g, `${context.subject} is`)
    .replace(/\byou are\b/g, `${context.subject} is`)
    .replace(/\bYou want\b/g, `${context.subject} wants`)
    .replace(/\byou want\b/g, `${context.subject} wants`)
    .replace(/\bYou need\b/g, `${context.subject} needs`)
    .replace(/\byou need\b/g, `${context.subject} needs`)
    .replace(/\bYou build\b/g, `${context.subject} builds`)
    .replace(/\byou build\b/g, `${context.subject} builds`)
    .replace(/\bYou thrive\b/g, `${context.subject} thrives`)
    .replace(/\byou thrive\b/g, `${context.subject} thrives`)
    .replace(/\bYou tend\b/g, `${context.subject} tends`)
    .replace(/\byou tend\b/g, `${context.subject} tends`)
    .replace(/\bYour\b/g, context.possessive)
    .replace(/\byour\b/g, context.possessiveLower);
}

function normalizeStoredCareerCopy(value: string, context: CareerCopyContext) {
  return ownerizeCareerCopy(value, context)
    .replace(/\s+/g, " ")
    .replace(/\b, the ([a-z][^.!?]+?)\./g, ": the $1.")
    .trim();
}

function composeBody(baseBody: string, explanation = "") {
  const trimmedBase = baseBody.trim();
  const trimmedExplanation = explanation.trim();

  if (!trimmedExplanation) {
    return trimmedBase;
  }

  if (!trimmedBase) {
    return trimmedExplanation;
  }

  return `${trimmedBase} ${trimmedExplanation}`;
}

function section(
  vocabulary: Map<string, CareerVocabularyRow> | null,
  key: string,
  label: string,
  contentKey: string,
  fallbackHeadline: string,
  meta: string,
  context: CareerCopyContext,
  explanation = ""
): CareerArchetypeSection | null {
  const row = careerRow(vocabulary, contentKey, fallbackHeadline);
  const body = ownerizeCareerCopy(composeBody(row.body, explanation), context);

  if (!body.trim()) {
    return null;
  }

  return {
    key,
    label,
    contentKey,
    headline: ownerizeCareerCopy(row.headline || fallbackHeadline, context),
    body,
    meta,
    layer: careerRowLayer(vocabulary, contentKey),
    tier: careerRowLayer(vocabulary, contentKey) === "source-grounded" ? "stored-source-vocabulary" : "source-based-local-career",
    sourceKeys: [contentKey]
  };
}

function msCareerKey(facet: string, key: string) {
  return key ? `ms/career/${facet}/${slug(key)}` : "";
}

function msHemisphereKey(hemisphere: string) {
  const keys: Record<string, string> = {
    east: "eastern",
    north: "northern",
    south: "southern",
    west: "western"
  };

  return hemisphere ? msCareerKey("hemisphere", keys[hemisphere] ?? hemisphere) : "";
}

function sourceCareerRows(vocabulary: Map<string, CareerVocabularyRow> | null, contentKeys: string[]) {
  return contentKeys
    .filter(Boolean)
    .map((contentKey) => storedCareerRow(vocabulary, contentKey))
    .filter((row): row is CareerVocabularyRow => Boolean(row?.body.trim()));
}

function careerSourceSection({
  context,
  fallbackHeadline,
  rows
}: {
  context: CareerCopyContext;
  fallbackHeadline: string;
  rows: CareerVocabularyRow[];
}): CareerArchetypeSection | null {
  if (rows.length === 0) {
    return null;
  }

  const body = rows
    .map((row) => normalizeStoredCareerCopy(row.body, context))
    .filter(Boolean)
    .join(" ");

  if (!body) {
    return null;
  }

  return {
    key: "career-pattern",
    label: "Career pattern",
    contentKey: "ms/career/*",
    headline: fallbackHeadline,
    body,
    meta: `${careerSourceBadge("source-grounded")} · Career reading assembled from reviewed dashboard rows.`,
    layer: "source-grounded",
    tier: "stored-source-vocabulary",
    sourceKeys: rows.map((row) => row.contentKey)
  };
}

export function careerVocabularyFromRows(rows: CareerVocabularyDbRow[]) {
  const vocabulary = new Map<string, CareerVocabularyRow>();

  for (const row of rows) {
    const contentKey = normalizeCareerVocabularyKey(row.content_key);

    if (!careerVocabularyPrefixes.some((prefix) => contentKey.startsWith(prefix))) {
      continue;
    }

    const body = firstReaderFacingCopy([row.body]) ?? "";

    if (!body) {
      continue;
    }

    vocabulary.set(contentKey, {
      contentKey,
      headline: row.headline?.trim() || contentKey.split("/").at(-1) || contentKey,
      body
    });
  }

  return vocabulary;
}

export async function loadCareerVocabulary() {
  if (cachedCareerVocabulary) {
    return cachedCareerVocabulary;
  }

  if (loadingCareerVocabulary) {
    return loadingCareerVocabulary;
  }

  loadingCareerVocabulary = (async () => {
    const supabase = await getSupabaseClient();

    if (!supabase) {
      cachedCareerVocabulary = new Map();
      return cachedCareerVocabulary;
    }

    const { data, error } = await supabase
      .from("generated_interpretations")
      .select("content_key, status, lane, review_state, flags, headline, body, prompt_version")
      .eq("status", "LIVE")
      .eq("lane", "serving")
      .is("review_state", null)
      .or(careerVocabularyContentKeyFilter)
      .returns<CareerVocabularyDbRow[]>();

    if (error) {
      console.warn("Career vocabulary failed to load; local career fallbacks will be used.", error);
      cachedCareerVocabulary = new Map();
      return cachedCareerVocabulary;
    }

    cachedCareerVocabulary = careerVocabularyFromRows((data ?? []).filter(isReaderServableGeneratedContentRow));
    return cachedCareerVocabulary;
  })();

  return loadingCareerVocabulary;
}

export function resolveCareerArchetypeProfile(
  sky: SkySnapshot | null | undefined,
  vocabulary: Map<string, CareerVocabularyRow> | null = cachedCareerVocabulary,
  options: CareerArchetypeOptions = {}
): CareerArchetypeProfile | null {
  if (!sky?.ascendant || !sky.positions.length) {
    return null;
  }

  const tenthHouseSign = signAtWholeSignHouse(sky.ascendant, 10);
  const subject = createReaderSubject({
    mode: options.ownerName ? "friend" : "self",
    name: options.ownerName,
    pronouns: options.pronouns
  });
  const tenthHousePlanets = sky.positions.filter((position) => position.house === 10 && careerPlanetSupported(position.planet));
  const sun = findCareerPosition(sky.positions, "Sun");
  const moon = findCareerPosition(sky.positions, "Moon");
  const northNode = sky.positions.find((position) => position.planet === "North Node");
  const northNodeMode = northNode ? modeForSign(northNode.sign) : "";
  const mcRuler = traditionalCareerSignRuler(sky.midheaven);
  const mcRulerPosition = mcRuler ? findCareerPosition(sky.positions, mcRuler) : null;
  const visiblePlanet = tenthHousePlanets[0] ?? null;
  const workCondition = findCareerPosition(sky.positions, "Saturn") ?? findCareerPosition(sky.positions, "Moon");
  const saturn = findCareerPosition(sky.positions, "Saturn");
  const hemisphere = strongestHemisphere(sky.positions);
  const sourceRows = sourceCareerRows(vocabulary, [
    msCareerKey("sun", elementForSign(sun?.sign ?? "")),
    msCareerKey("moon", elementForSign(moon?.sign ?? "")),
    msCareerKey("rising", elementForSign(sky.ascendant)),
    msCareerKey("mc", elementForSign(sky.midheaven)),
    msCareerKey("mode", modeForSign(sky.midheaven)),
    msHemisphereKey(hemisphere),
    ...tenthHousePlanets.map((position) => msCareerKey("planet10", position.planet)),
    msCareerKey("saturn", elementForSign(saturn?.sign ?? "")),
    msCareerKey("northnode", northNodeMode)
  ]);
  const title = readerHeadlineFallback(subject, "career pattern");
  const summary = careerNarrativeSummary({
    mcSign: sky.midheaven,
    mcRuler,
    mcRulerPosition,
    northNode,
    northNodeMode,
    subject,
    tenthHouseSign,
    visiblePlanet,
    workCondition
  });
  const tldr = careerCompactLine({ mcSign: sky.midheaven, mcRuler, mcRulerPosition, subject, tenthHouseSign });
  const fallbackSection: CareerArchetypeSection = {
    key: "career-pattern",
    label: "Career pattern",
    contentKey: "career.pattern",
    headline: title,
    body: summary,
    meta: `${careerSourceBadge("madlib-fallback")} · Career reading assembled from Midheaven, Midheaven ruler, tenth-house emphasis, and selected work-condition modifiers.`,
    layer: "madlib-fallback",
    tier: "source-based-local-career",
    sourceKeys: [
      "career.midHeaven",
      "career.midHeavenRuler",
      "career.tenthHouse",
      "career.workCondition",
      "career.northNodeMode"
    ]
  };
  const sourceSection = careerSourceSection({
    context: careerCopyContext(options.ownerName),
    fallbackHeadline: title,
    rows: sourceRows
  });
  const visibleSection = sourceSection ?? fallbackSection;
  const visibleSummary = sourceSection?.body ?? summary;

  return {
    title,
    summary: visibleSummary,
    tldr,
    factors: [
      { label: "10th house", value: tenthHouseSign || "Pending" },
      { label: "Midheaven", value: sky.midheaven || "Pending" },
      { label: "MC ruler", value: mcRulerPosition ? `${mcRuler} in ${mcRulerPosition.sign}, house ${mcRulerPosition.house}` : mcRuler || "Pending" },
      { label: "Visible planet", value: visiblePlanet ? `${visiblePlanet.planet} in ${visiblePlanet.sign}` : "None" },
      { label: "North Node", value: northNode ? `${northNode.sign} (${northNodeMode})` : "Pending" }
    ],
    sections: [visibleSection]
  };
}

function careerNarrativeSummary({
  mcSign,
  mcRuler,
  mcRulerPosition,
  northNode,
  northNodeMode,
  subject,
  tenthHouseSign,
  visiblePlanet,
  workCondition
}: {
  mcSign: string;
  mcRuler: string;
  mcRulerPosition: PlanetPosition | null;
  northNode: PlanetPosition | undefined;
  northNodeMode: string;
  subject: ReaderSubject;
  tenthHouseSign: string;
  visiblePlanet: PlanetPosition | null;
  workCondition: PlanetPosition | null;
}) {
  const display = readerDisplayName(subject);
  const direction = mcSign || tenthHouseSign || "public";
  const directionPhrase = direction === "public" ? "the public part of the chart" : `${direction} qualities`;
  const directionVerb = direction === "public" ? "has" : "have";
  const opener = subject.mode === "self"
    ? `Your work becomes clearer when ${directionPhrase} ${directionVerb} a form other people can recognize and return to.`
    : `${capitalizeSentence(display)}'s work becomes clearer when ${directionPhrase} ${directionVerb} a form other people can recognize and return to.`;
  const ruler = mcRuler && mcRulerPosition
    ? `${direction} answers to ${mcRuler}. With ${mcRuler} in ${mcRulerPosition.sign} in the ${ordinal(mcRulerPosition.house)} house, the path develops through ${houseCareerScene(mcRulerPosition.house)}.`
    : `The Midheaven gives the work a visible direction, and daily choices show how that direction becomes practical.`;
  const visible = visiblePlanet
    ? `${visiblePlanet.planet} in the tenth house makes the pattern easier for other people to notice; ${planetCareerAction(visiblePlanet.planet, subject)} in a ${signEssence(visiblePlanet.sign) || visiblePlanet.sign.toLowerCase()} way.`
    : `The pattern becomes steadier when the Midheaven ruler and daily choices give the work a repeatable shape.`;
  const condition = workCondition
    ? `${workCondition.planet} adds a working condition: ${planetWorkCondition(workCondition.planet, subject)} through the ${ordinal(workCondition.house)} house.`
    : "";
  const growth = northNode && northNodeMode
    ? `Growth comes from choosing one usable next step and letting the direction become visible through practice.`
    : `The next useful move is to make the path visible through one concrete practice.`;

  return cleanCareerReaderText([opener, ruler, visible, condition, growth].filter(Boolean).join(" "));
}

function careerCompactLine({
  mcSign,
  mcRuler,
  mcRulerPosition,
  subject,
  tenthHouseSign
}: {
  mcSign: string;
  mcRuler: string;
  mcRulerPosition: PlanetPosition | null;
  subject: ReaderSubject;
  tenthHouseSign: string;
}) {
  const direction = mcSign || tenthHouseSign || "the public part of the chart";
  const ownerWork = subject.mode === "self"
    ? "your work"
    : `${subject.name ? possessiveOwnerName(subject.name) : subject.possessive} work`;
  const directionTone = signEssence(direction);
  const publicShape = directionTone
    ? `${direction} gives ${ownerWork} a ${directionTone} public tone.`
    : `The public part of the chart gives ${ownerWork} a clearer shape.`;
  const delivery = mcRuler && mcRulerPosition
    ? `${mcRuler} in ${mcRulerPosition.sign} gives that direction structure and a repeatable way to move.`
    : `Steady choices give that direction structure and a repeatable way to move.`;

  return `${publicShape} ${delivery}`;
}

function traditionalCareerSignRuler(sign: string) {
  const rulers: Record<string, string> = {
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

  return rulers[sign] ?? "";
}

function findCareerPosition(positions: PlanetPosition[], planet: string) {
  return positions.find((position) => normalizeCareerPlanet(position.planet) === normalizeCareerPlanet(planet)) ?? null;
}

function normalizeCareerPlanet(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function houseCareerScene(house: number) {
  const scenes: Record<number, string> = {
    1: "presence, identity, and the courage to be seen directly",
    2: "money, worth, skills, and the resources that support the work",
    3: "language, teaching, writing, local networks, and repeatable communication",
    4: "home, lineage, foundations, private stability, and what must be protected",
    5: "creative risk, play, performance, and work that can carry joy",
    6: "craft, service, daily rhythm, health, and the systems that keep the work possible",
    7: "clients, collaborators, contracts, and the mirror of other people",
    8: "shared resources, trust, debt, grief, intimacy, and deep change",
    9: "study, belief, publishing, travel, and the larger story behind the work",
    10: "visibility, authority, reputation, and public responsibility",
    11: "community, networks, collective aims, and the people the work gathers",
    12: "rest, retreat, hidden labor, spiritual repair, and work done behind the scenes"
  };

  return scenes[house] ?? "the part of life that keeps asking for attention";
}

function planetCareerAction(planet: string, subject: ReaderSubject) {
  const actions: Record<string, string> = {
    Sun: `${subject.subject} lead`,
    Moon: `${subject.subject} respond`,
    Mercury: `${subject.subject} communicate`,
    Venus: `${subject.subject} choose and connect`,
    Mars: `${subject.subject} act`,
    Jupiter: `${subject.subject} teach, grow, and gather meaning`,
    Saturn: `${subject.subject} build with responsibility`
  };

  return actions[planet] ?? `${subject.subject} make the work visible`;
}

function planetWorkCondition(planet: string, subject: ReaderSubject) {
  const conditions: Record<string, string> = {
    Sun: `${subject.possessive} energy has to stay connected to purpose`,
    Moon: `${subject.possessive} emotional rhythm has to be respected`,
    Mercury: `${subject.possessive} thinking has to stay clear enough to share`,
    Venus: `${subject.possessive} values have to be part of the choice`,
    Mars: `${subject.possessive} effort has to have somewhere direct to go`,
    Jupiter: `${subject.possessive} growth has to stay connected to meaning`,
    Saturn: `${subject.possessive} standards have to become structure instead of pressure`
  };

  return conditions[planet] ?? `${subject.possessive} choices have to become concrete`;
}

function cleanCareerReaderText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\bhouse 4 says\b/gi, "the fourth house shows")
    .replace(/\bmutable movement\b/gi, "adaptable movement")
    .trim();
}

function ordinal(value: number) {
  const suffix = value % 10 === 1 && value % 100 !== 11
    ? "st"
    : value % 10 === 2 && value % 100 !== 12
      ? "nd"
      : value % 10 === 3 && value % 100 !== 13
        ? "rd"
        : "th";

  return `${value}${suffix}`;
}

function careerPlanetSupported(planet: string) {
  return ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(planet);
}

function signTone(sign: string) {
  return signCareerTones[sign] ?? "";
}

function signEssence(sign: string) {
  return signCareerEssences[sign] ?? "";
}

function houseTheme(house: number | null | undefined) {
  if (typeof house !== "number") {
    return "";
  }

  return houseCareerThemes[house] ?? "";
}

function tenthHouseExplanation(sign: string, context: CareerCopyContext) {
  const tone = signTone(sign);

  if (!tone) {
    return "";
  }

  return `With ${sign} on the 10th house, ${context.possessiveLower} public path is colored by this style: ${tone}`;
}

function midheavenExplanation(sign: string) {
  const tone = signTone(sign);

  if (!tone) {
    return "";
  }

  return `The Midheaven is the chart's visibility point. ${tone}`;
}

function tenthHousePlanetExplanation(position: PlanetPosition) {
  const planetMeaning = planetInTenthMeanings[position.planet] ?? "";
  const tone = signTone(position.sign);

  return [planetMeaning, tone ? `Because it is in ${position.sign}, the public expression carries this tone: ${tone}` : ""]
    .filter(Boolean)
    .join(" ");
}

function saturnExplanation(saturn: PlanetPosition | undefined) {
  if (!saturn) {
    return "";
  }

  const signMeaning = signTone(saturn.sign);
  const houseMeaning = houseTheme(saturn.house);
  const housePhrase = houseMeaning ? `the part of life connected to ${houseMeaning}` : `house ${saturn.house}`;
  const signPhrase = signMeaning ? ` In ${saturn.sign}, that growth has a clear tone: ${signMeaning}` : "";

  return `In this chart, Saturn points to where authority is earned slowly. Saturn in ${saturn.sign} in house ${saturn.house} builds mastery through ${housePhrase}.${signPhrase} The growth edge is to stop treating pressure as proof of inadequacy; this placement becomes strong when responsibility turns into skill, boundaries, and lived competence.`;
}

function northNodeExplanation(northNode: PlanetPosition | undefined, nodeMode: string) {
  if (!northNode) {
    return "";
  }

  const modeMeaning = nodeModeMeanings[nodeMode] ?? "";
  const signMeaning = signTone(northNode.sign);

  return [modeMeaning, signMeaning ? `Because the North Node is in ${northNode.sign}, growth also asks for this tone: ${signMeaning}` : ""]
    .filter(Boolean)
    .join(" ");
}

function careerTldr(
  tenthHouseSign: string,
  midheaven: string,
  tenthHousePlanets: PlanetPosition[],
  saturn: PlanetPosition | undefined,
  northNode: PlanetPosition | undefined,
  northNodeMode: string,
  hemisphere: string,
  context: CareerCopyContext
) {
  const tenthHouseEssence = signEssence(tenthHouseSign);
  const midheavenEssence = signEssence(midheaven);
  const planetTools = tenthHousePlanets
    .map((position) => planetInTenthTldr[position.planet])
    .filter(Boolean);
  const saturnEssence = saturn
    ? `Saturn in ${saturn.sign}, house ${saturn.house} says authority grows through ${signEssence(saturn.sign) || saturn.sign.toLowerCase()} work connected to ${houseTheme(saturn.house) || "the area of life where discipline is required"}.`
    : "";
  const nodeEssence = northNode
    ? `The North Node in ${northNode.sign}${northNodeMode ? ` (${northNodeMode})` : ""} points growth toward ${signEssence(northNode.sign) || northNode.sign.toLowerCase()} development${northNodeMode ? ` through ${northNodeMode} movement` : ""}.`
    : "";
  const visibility = midheavenEssence
    ? `${context.isSelf ? "You are" : `${context.subject} is`} meant to be seen in a ${midheavenEssence} way`
    : `${context.possessive} Midheaven points to how ${context.possessiveLower} work becomes visible`;
  const publicPath = tenthHouseEssence
    ? `${context.possessive} career wants to feel ${tenthHouseEssence}`
    : `${context.possessive} 10th house points to the public role ${context.isSelf ? "you grow" : `${context.subject} grows`} into`;
  const tools = planetTools.length
    ? ` ${tenthHousePlanets.map((position) => position.planet).join(", ")} in the 10th makes ${joinList(planetTools)} part of the career toolkit.`
    : "";
  const hemisphereTheme = hemisphereTldrThemes[hemisphere] ?? "";
  const hemisphereNote = hemisphereTheme
    ? `${capitalize(hemisphere)} hemisphere emphasis makes this path develop through ${hemisphereTheme}.`
    : hemisphere
      ? `${capitalize(hemisphere)} hemisphere emphasis shapes how this path develops.`
      : "";

  return [`${publicPath}.`, `${visibility}.`, tools.trim(), saturnEssence, nodeEssence, hemisphereNote]
    .filter(Boolean)
    .join(" ");
}

function careerSummary(tenthHouseSign: string, midheaven: string, tenthHousePlanets: PlanetPosition[], context: CareerCopyContext) {
  const publicRole = tenthHouseSign ? `${context.possessive} 10th house runs through ${tenthHouseSign}` : `${context.possessive} 10th house sets the public role`;
  const visibility = midheaven ? `${context.possessiveLower} Midheaven is in ${midheaven}` : `${context.possessiveLower} Midheaven points to visibility`;
  const planets = tenthHousePlanets.length
    ? ` ${tenthHousePlanets.map((position) => position.planet).join(", ")} in the 10th makes that career story more visible.`
    : " With no supported planets in the 10th, the section leans more on the house ruler, Midheaven, Saturn, and whole-chart emphasis.";

  return `${publicRole}, and ${visibility}.${planets}`;
}

function careerArchetypeTitle(tenthHouseSign: string, midheaven: string) {
  if (tenthHouseSign && midheaven && tenthHouseSign !== midheaven) {
    return `${tenthHouseSign} / ${midheaven} Career`;
  }

  if (tenthHouseSign || midheaven) {
    return `${tenthHouseSign || midheaven} Career`;
  }

  return "Career Archetype";
}

function joinList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
