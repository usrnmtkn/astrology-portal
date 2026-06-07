import fs from "node:fs";
import path from "node:path";

type ContentMode = "feed" | "in_depth" | "article";
type Surface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
type Planet = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

export type GenerateContentInput = {
  contentKey: string;
  surface: Surface;
  mode: ContentMode;
  eventType: string;
  headline?: string;
  targetDate?: string;
  facts: Record<string, unknown>;
  knowledgeIds?: string[];
  sourceSnapshot?: Record<string, unknown>;
  voiceNotes?: string;
};

export type GeneratedAstrologyDraft = {
  headline: string;
  summary: string;
  body: string;
  sections?: Array<{
    heading: string;
    body: string;
  }>;
};

type GeneratedContent = GeneratedAstrologyDraft;

type StoredGeneratedContent = GeneratedContent & {
  responseId?: string;
  model: string;
};

export type GenerationContext = Pick<GenerateContentInput, "surface" | "mode" | "eventType" | "contentKey"> & {
  facts?: Record<string, unknown>;
};

export type EditorialGateResult = {
  passed: boolean;
  score: number;
  failures: EditorialFailure[];
  rewriteInstruction?: string;
};

export type EditorialFailure = {
  code: string;
  message: string;
  severity: "warning" | "fail";
};

export type SceneLock = {
  scene: string;
  mainTension: string;
  userPressure: string;
  concreteSituation: string;
  whatNotToInclude: string[];
};

export type TimeLordSceneLock = {
  sceneArena: string;
  currentPressure: string;
  personalSensitivity: string;
  chosenScene: string;
  excludedMeanings: string[];
};

export type TimeLordSceneMap = {
  planet: Planet;
  sceneArenas: string[];
  commonScenes: string[];
  avoidOverbroadTopics: string[];
};

type ApprovedExampleRow = {
  content_key?: string | null;
  surface?: string | null;
  mode?: string | null;
  event_type?: string | null;
  target_date?: string | null;
  headline?: string | null;
  summary?: string | null;
  body?: string | null;
  sections?: unknown;
  status?: string | null;
};

type ApprovedExample = {
  contentKey: string;
  surface: string;
  mode: string;
  eventType: string;
  targetDate: string;
  headline: string;
  summary: string;
  body: string;
};

type V4RewriteEntry = {
  id?: string;
  title?: string;
  itemType?: string;
  baseMeaningRewrite?: string;
  observableExperience?: string;
  observableTendency?: string;
  observableCurrentActivation?: string;
  shadowPattern?: string;
  pressurePoint?: string;
  whereItHelps?: string;
  whereItCanBecomeDifficult?: string;
  bestMove?: string;
  readerFacingSummary?: string;
  closingReflection?: string;
  symbolicStory?: string;
  lesson?: string;
  tldr?: string;
};

type V4RewriteCorpus = {
  id?: string;
  aliases?: string[];
  surface?: string;
  kind?: string;
  title?: string;
  entries?: V4RewriteEntry[];
};

const promptVersion = "tldr-astro-v2";
const defaultModel = "gpt-4.1-mini";
const bannedUserFacingPhrases = [
  "same sky, different room",
  "not a permanent trait",
  "source-backed",
  "authored from approved",
  "approved project",
  "knowledge base",
  "source row",
  "backend",
  "prompt",
  "review status",
  "this placement asks",
  "this aspect teaches",
  "the lesson is"
];
export const editorialBannedPhrases = [
  "this contact",
  "this placement",
  "this transit activates",
  "bring into focus",
  "brings into focus",
  "themes around",
  "can manifest as",
  "invites you to explore",
  "energies of",
  "in the realm of",
  "may indicate",
  "points to themes of",
  "supports the expression of",
  "activates themes",
  "highlights themes",
  "asks you to explore",
  "serves as an invitation"
];
export const selfHelpTonePhrases = [
  "in your own skin",
  "hold space",
  "step into",
  "honor your truth",
  "your healing",
  "your journey",
  "sacred",
  "embodied",
  "aligned",
  "heart-centered",
  "higher self",
  "what wants to emerge",
  "what is asking to be seen",
  "move with intention",
  "trust the process",
  "lean into",
  "invite yourself",
  "give yourself permission",
  "pause long enough to honor",
  "soften into",
  "return to yourself"
];
const lifeAreaWords = [
  "trust",
  "money",
  "intimacy",
  "shared responsibility",
  "work",
  "family",
  "career",
  "health",
  "communication",
  "love",
  "relationships",
  "debt",
  "control",
  "fear",
  "vulnerability",
  "identity",
  "home",
  "belonging"
];
const astrologyMechanicTerms = [
  "ascendant",
  "conjunction",
  "eighth house",
  "house",
  "mercury",
  "moon",
  "natal",
  "opposition",
  "planet",
  "placement",
  "pluto",
  "retrograde",
  "saturn",
  "sextile",
  "square",
  "sun",
  "transit",
  "trine",
  "venus"
];
const genericAdvicePhrases = [
  "be mindful",
  "stay open",
  "trust the process",
  "reflect on what comes up",
  "move with intention",
  "stay grounded",
  "listen to your intuition"
];
const vagueFirstSentencePhrases = [
  "something unspoken",
  "there's an easy warmth",
  "there is an easy warmth",
  "a conversation may carry more feeling",
  "you may notice where",
  "may be easier to see today"
];
const listPatternPhrases = [
  "especially around",
  "themes of",
  "themes around",
  "may show up as",
  "could show up as",
  "whether this is about",
  "you may feel the pull to prove",
  "this could affect",
  "this may involve"
];
const abstractListWords = [
  "trust",
  "money",
  "intimacy",
  "responsibility",
  "power",
  "fear",
  "control",
  "vulnerability",
  "attachment",
  "communication",
  "boundaries",
  "desire",
  "identity",
  "belonging",
  "security",
  "availability",
  "generosity",
  "affection",
  "obligation"
];
export const timeLordSceneMap: Record<Planet, TimeLordSceneMap> = {
  Sun: {
    planet: "Sun",
    sceneArenas: ["visibility", "leadership", "recognition", "direction"],
    commonScenes: [
      "being asked to take the lead",
      "needing to be seen clearly",
      "deciding whether something represents you well"
    ],
    avoidOverbroadTopics: ["identity", "purpose", "confidence", "self-expression"]
  },
  Moon: {
    planet: "Moon",
    sceneArenas: ["home", "body", "mood", "care", "daily needs"],
    commonScenes: [
      "needing more support than usual",
      "reacting before you have words for it",
      "handling a domestic or emotional demand"
    ],
    avoidOverbroadTopics: ["emotions", "intuition", "nurturing", "inner world"]
  },
  Mercury: {
    planet: "Mercury",
    sceneArenas: ["messages", "decisions", "logistics", "plans", "information"],
    commonScenes: [
      "needing to clarify what was said",
      "checking the facts before responding",
      "sorting out a plan that has too many moving parts"
    ],
    avoidOverbroadTopics: ["communication", "thinking", "learning", "curiosity"]
  },
  Venus: {
    planet: "Venus",
    sceneArenas: ["care", "agreement", "affection", "money", "social obligation"],
    commonScenes: [
      "being asked for something before you know what you can give",
      "deciding whether a yes is real or just polite",
      "noticing whether attention feels steady enough to trust"
    ],
    avoidOverbroadTopics: ["love", "beauty", "pleasure", "harmony", "values"]
  },
  Mars: {
    planet: "Mars",
    sceneArenas: ["conflict", "urgency", "effort", "desire", "competition"],
    commonScenes: [
      "wanting to push back immediately",
      "feeling rushed into action",
      "needing to say no without escalating the situation"
    ],
    avoidOverbroadTopics: ["anger", "passion", "drive", "assertion"]
  },
  Jupiter: {
    planet: "Jupiter",
    sceneArenas: ["growth", "support", "permission", "opportunity", "belief"],
    commonScenes: [
      "deciding whether an opportunity is actually useful",
      "getting support but needing to define the terms",
      "being tempted to say yes because something sounds promising"
    ],
    avoidOverbroadTopics: ["abundance", "expansion", "luck", "wisdom"]
  },
  Saturn: {
    planet: "Saturn",
    sceneArenas: ["limits", "responsibility", "delay", "commitment", "structure"],
    commonScenes: [
      "needing to give a realistic answer",
      "realizing a commitment costs more than expected",
      "setting a limit before resentment builds"
    ],
    avoidOverbroadTopics: ["discipline", "karma", "restriction", "maturity"]
  }
};
const fallbackStyleGuide = [
  "# TLDR Astro Voice",
  "",
  "TLDR Astro explains what the astrology can look like in real life.",
  "Write like a smart astrologer explaining the pattern in normal language: clear, direct, emotionally aware, and grounded in real life.",
  "",
  "Core rules:",
  "- Start with lived experience.",
  "- Start with what the astrology describes, then explain what that can look like in ordinary life.",
  "- Use soft certainty without making every sentence vague. Prefer can, often, tends to, may, and there can be.",
  "- For transits and current sky, use plain action language that fits the astrology: check the facts, name the issue, take the next real step, or let the situation settle.",
  "- Do not use em dashes.",
  "- Do not use self-help language.",
  "- Do not use therapy language unless explicitly source-backed.",
  "- Do not invent childhood causes, trauma claims, karmic explanations, or psychological diagnoses.",
  "- Do not use \"you are\" as an identity statement.",
  "- Do not use \"this placement asks you to,\" \"this aspect works best when,\" or \"the useful thing to notice is.\"",
  "- Do not call out backend distinctions in user-facing copy, such as \"this is not a permanent trait,\" \"source-backed,\" or \"authored from approved material.\"",
  "- Translate source symbolism into concrete human experience.",
  "",
  "Preferred short structure: TLDR, what this looks like in real life, why the astrology describes it, useful move, timing.",
  "The reader should leave knowing why they may feel, think, remember, want, avoid, or react a certain way, and what is useful to do with that information.",
  "",
  "Sky content is current astrology. Write about the moment, the day, the season, or the active transit. Do not write it as a natal personality trait.",
  "Relationship content should describe what happens between two people, not two separate natal descriptions stitched together.",
  "If a factual astrology headline is supplied, preserve it exactly. Put the human theme in the summary or body, not in the headline."
].join("\n");

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function readTextFile(relativePath: string) {
  try {
    return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
  } catch {
    return fallbackStyleGuide;
  }
}

function modeRules(mode: ContentMode) {
  if (mode === "feed") {
    return [
      "Feed Mode: quick daily insight.",
      "Length: one or two paragraphs.",
      "Structure: TLDR, real-life signal, astrology reason, useful move, timing.",
      "Tone: direct, specific, easy to read, and useful right away."
    ].join("\n");
  }

  if (mode === "in_depth") {
    return [
      "In-Depth Mode: explain a major transit, placement, or relationship pattern.",
      "Length: three to five paragraphs.",
      "Structure: what is being activated, likely real life, why it feels that way, useful action or reflection.",
      "Tone: direct, readable, emotionally specific, and human on the first read."
    ].join("\n");
  }

  return [
    "Article Mode: collective astrology and lunar events.",
    "Length: full essay.",
    "Structure: event opening, key aspects, collective meaning, personal application, reflection questions when useful.",
    "Tone: lyrical but concrete, mythic but understandable."
  ].join("\n");
}

function outputShapeRules(input: GenerateContentInput, lockedHeadline: string) {
  const exactHeadline = lockedHeadline
    ? `Use this exact headline: ${JSON.stringify(lockedHeadline)}.`
    : "Use a factual astrology headline, not a poetic title.";

  return [
    "OUTPUT SHAPE",
    exactHeadline,
    "Write the interpretation as: headline + what the reader may notice + why + what to do + timing.",
    "The headline stays astrology-only. The human hook belongs in summary and body.",
    "summary: one or two plain sentences that name the situation in human language. Do not summarize the astrology mechanically.",
    "body: write complete paragraphs in this order:",
    "1. What may be noticeable in real life today, this season, or during this transit.",
    "2. Why it may feel that way, using the astrology facts without turning them into a jargon list.",
    "3. What to do with it, using concrete action language.",
    "4. Timing, including exactness, active date, orb, or whether it fades soon, only when the facts support it.",
    "sections: include exactly these headings when they fit the mode: What You May Notice, Why This Is Happening, What To Do, Timing.",
    "Do not use labels inside body unless the mode is article. Body should read like natural prose.",
    "Do not write backend disclaimers, source notes, permanent-trait caveats, or process notes.",
    input.surface === "sky" ? "Sky rule: write current astrology as advice and timing. Do not make it a natal identity description." : "",
    input.surface === "you" || input.surface === "natal" ? "Natal/You rule: describe a recurring pattern with soft certainty, then give a useful way to work with it." : "",
    input.surface === "synastry" || input.surface === "composite" || input.surface === "relationship" ? "Relationship rule: describe what happens between the people, where it helps, where it gets complicated, and what makes the bond easier to handle." : ""
  ].filter(Boolean).join("\n");
}

function sceneLockRules() {
  return [
    "SCENE LOCK",
    "Before writing, internally choose one concrete scene.",
    "Do not output the scene lock as a separate field. Use it to control the final copy.",
    "Internal scene lock shape:",
    "{ scene: string, mainTension: string, userPressure: string, concreteSituation: string, whatNotToInclude: string[] }",
    "The app should not summarize every possible meaning of the transit, placement, aspect, or relationship contact.",
    "Pick the most likely human moment and commit to it.",
    "The final copy must answer: what is the one thing the reader might actually experience?",
    "Do not answer: what are all the themes this astrology could represent?",
    "Rules:",
    "- Choose one scene only.",
    "- Stay inside the chosen scene.",
    "- Do not list alternate meanings.",
    "- Do not name more than two life areas.",
    "- Do not use a sentence with three or more options joined by commas or or.",
    "- The first sentence must work without astrology knowledge.",
    "- Use astrology only after the human situation is clear.",
    "- Advice must be one specific action.",
    "- Name what meanings you are choosing not to include, then leave them out."
  ].join("\n");
}

function timeLordSceneRules(input: GenerateContentInput) {
  const planet = timeLordPlanetFromFacts(input.facts);
  const mapping = planet ? timeLordSceneMap[planet] : undefined;

  return [
    "TIME LORD SCENE SELECTOR",
    "If a time lord is present in ASTROLOGY FACTS, use it as a scene selector before writing the final TLDR.",
    "The time lord must narrow the story. It must not add more keywords.",
    "Generation order:",
    "1. Time lord -> scene arena.",
    "2. Strongest active transit -> current pressure, event, or mood.",
    "3. Natal planet or point being hit -> personal sensitivity.",
    "4. Final copy -> one concrete scene.",
    "Internal scene selection prompt:",
    "Choose one concrete scene for the user. Use the time lord as the main scene filter. Use the strongest transit as the immediate pressure. Use the natal planet or point as the personal sensitivity.",
    "Return internally: Time lord arena, current pressure, personal sensitivity, one chosen scene, and meanings you are excluding.",
    "Do not output this internal selection as a separate field.",
    "Rules:",
    "- Choose one scene only.",
    "- Do not list all possible topics for the time lord.",
    "- Do not name more than two life areas.",
    "- The scene must be something that could happen in ordinary life.",
    "- The final TLDR must stay inside this scene.",
    "- Do not explain every meaning of the time lord.",
    mapping
      ? [
          `Detected time lord: ${planet}.`,
          `Use one of these scene arenas as the filter: ${mapping.sceneArenas.join(", ")}.`,
          `Useful ordinary scenes: ${mapping.commonScenes.join("; ")}.`,
          `Avoid turning ${planet} into these overbroad topics: ${mapping.avoidOverbroadTopics.join(", ")}.`
        ].join("\n")
      : "No time lord was confidently detected. If ASTROLOGY FACTS include one under another label, infer it and apply the same rule."
  ].join("\n");
}

function rewriteCorpusRules() {
  return [
    "REWRITE CORPUS FIELD MAP",
    "Use the rewrite examples as a translation guide, not as current facts.",
    "observableExperience, observableTendency, observableCurrentActivation: use these for What You May Notice.",
    "baseMeaningRewrite, symbolicStory, tldr: use these for Why This Is Happening.",
    "shadowPattern, pressurePoint, whereItCanBecomeDifficult: use these for what can get messy or where the friction lives.",
    "bestMove, whereItHelps, closingReflection: use these for What To Do.",
    "readerFacingSummary: use this for pacing and plain-language summary style.",
    "If the examples are not an exact match, use only the style and field logic. Never import a fact that is missing from ASTROLOGY FACTS."
  ].join("\n");
}

function bannedPhraseRules() {
  return [
    "BANNED USER-FACING LANGUAGE",
    "Do not use em dashes.",
    "Do not use these phrases or close variants:",
    ...bannedUserFacingPhrases.map((phrase) => `- ${phrase}`),
    ...editorialBannedPhrases.map((phrase) => `- ${phrase}`),
    "Avoid vague spiritual/self-help language such as lean into, step into your power, highest self, divine timing, embodiment, alignment, or healing journey.",
    "Prefer concrete actions: get it in writing, ask the clarifying question, wait a day, narrow the field, name the expectation, make the call, schedule the meeting, separate the feeling from the fact."
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizePlanet(value: unknown): Planet | undefined {
  const text = stringValue(value);
  const match = (Object.keys(timeLordSceneMap) as Planet[]).find((planet) => normalizeText(planet) === normalizeText(text));

  return match;
}

function timeLordPlanetFromFacts(facts: Record<string, unknown> | undefined): Planet | undefined {
  const seen = new Set<unknown>();
  const timeLordKeys = new Set([
    "timelord",
    "time_lord",
    "yearlord",
    "year_lord",
    "activatedtimelord",
    "activated_time_lord",
    "profectiontimelord",
    "profection_time_lord"
  ]);

  function visit(value: unknown, keyHint = "", depth = 0): Planet | undefined {
    if (!value || depth > 5 || seen.has(value)) {
      return undefined;
    }

    if (typeof value === "string") {
      return timeLordKeys.has(normalizeText(keyHint).replace(/[^a-z_]/g, "")) ? normalizePlanet(value) : undefined;
    }

    if (!isRecord(value)) {
      return undefined;
    }

    seen.add(value);

    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = normalizeText(key).replace(/[^a-z_]/g, "");

      if (timeLordKeys.has(normalizedKey)) {
        const direct = normalizePlanet(nested);

        if (direct) {
          return direct;
        }

        if (isRecord(nested)) {
          const fromPlanet = normalizePlanet(nested.planet) ?? normalizePlanet(nested.name) ?? normalizePlanet(nested.ruler);

          if (fromPlanet) {
            return fromPlanet;
          }
        }
      }

      const found = visit(nested, key, depth + 1);

      if (found) {
        return found;
      }
    }

    return undefined;
  }

  return visit(facts);
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function firstSentence(value: string) {
  return stringValue(value).split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
}

function firstParagraph(value: string) {
  return stringValue(value).split(/\n\s*\n/)[0]?.trim() ?? "";
}

function matchedPhrases(text: string, phrases: string[]) {
  const normalized = normalizeText(text);
  return phrases.filter((phrase) => normalized.includes(normalizeText(phrase)));
}

function countMatches(text: string, phrases: string[]) {
  return matchedPhrases(text, phrases).length;
}

function lifeAreasIn(text: string) {
  return matchedPhrases(text, lifeAreaWords);
}

function hasCommaHeavyList(text: string) {
  const compact = stringValue(text);
  return (compact.match(/,/g) ?? []).length >= 3 || /\b(and|or)\b[^.!?]*,\s*/i.test(compact);
}

function sentencesFrom(text: string) {
  return stringValue(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sentenceHasKeywordListing(sentence: string) {
  const normalized = normalizeText(sentence);
  const abstractCount = countMatches(sentence, abstractListWords);
  const commaCount = (sentence.match(/,/g) ?? []).length;
  const patternMatch = listPatternPhrases.some((phrase) => normalized.includes(normalizeText(phrase)));
  const optionList = commaCount >= 3 || /\b(whether|about|prove|involve|affect)\b[^.!?]+,\s+[^.!?]+,\s+(or|and)\s+/i.test(sentence);

  return patternMatch || abstractCount > 2 || optionList;
}

function sentenceMisusesTimeLord(sentence: string, planet: Planet) {
  const mapping = timeLordSceneMap[planet];
  const normalized = normalizeText(sentence);
  const mentionsPlanet = normalized.includes(normalizeText(planet));
  const overbroadMatches = matchedPhrases(sentence, mapping.avoidOverbroadTopics);
  const arenaMatches = matchedPhrases(sentence, mapping.sceneArenas);
  const listLanguage = /\b(themes?|topics?|areas?|realm|symboli[sz]es|represents|brings|rules|governs)\b/i.test(sentence);
  const commaList = (sentence.match(/,/g) ?? []).length >= 2 && /\b(and|or)\b/i.test(sentence);

  return mentionsPlanet && (
    overbroadMatches.length >= 2 ||
    arenaMatches.length >= 3 ||
    (listLanguage && (overbroadMatches.length > 0 || arenaMatches.length > 1 || commaList))
  );
}

function timeLordUsedAsSceneFilter(text: string, planet: Planet) {
  const mapping = timeLordSceneMap[planet];
  const normalized = normalizeText(text);
  const sceneMatches = mapping.commonScenes.filter((scene) => {
    const importantWords = normalizeText(scene).split(" ").filter((word) => word.length > 4);
    return importantWords.length > 0 && importantWords.some((word) => normalized.includes(word));
  });
  const arenaMatches = matchedPhrases(text, mapping.sceneArenas);

  return sceneMatches.length > 0 || arenaMatches.length > 0;
}

function addEditorialFailure(failures: EditorialFailure[], code: string, message: string, severity: EditorialFailure["severity"] = "fail") {
  if (!failures.some((failure) => failure.code === code && failure.message === message)) {
    failures.push({ code, message, severity });
  }
}

function editorialRewriteInstruction(failures: EditorialFailure[]) {
  const failedCodes = new Set(failures.filter((failure) => failure.severity === "fail").map((failure) => failure.code));
  const instructions = [
    "Reject this draft. Rewrite it around one direct, useful human problem.",
    failedCodes.has("FIRST_SENTENCE_TOO_ASTROLOGICAL") ? "Rewrite the first sentence so it names a plain situation. Do not start with astrology mechanics. Do not make it poetic, mystical, or self-help." : "",
    failedCodes.has("SUMMARY_LISTS_TOPICS") ? "The summary lists categories instead of naming one specific situation. Choose one concrete situation." : "",
    failedCodes.has("KEYWORD_LISTING") ? "It lists possible meanings instead of choosing one scene. Pick one concrete situation and write only that. Do not include more than two abstract life areas. Do not use a sentence with three or more options joined by commas or or." : "",
    failedCodes.has("TIME_LORD_NOT_USED_AS_SCENE_FILTER") ? "Reject this draft. The time lord was used as a topic list instead of a scene filter. Use the time lord to choose one ordinary life scene, then write only that scene. Do not explain every meaning of the time lord." : "",
    failedCodes.has("TOO_MANY_LIFE_AREAS") ? "Do not mention more than two life areas." : "",
    failedCodes.has("NO_DOMINANT_STORYLINE") ? "Choose one main story. Do not give equal weight to every possible interpretation." : "",
    failedCodes.has("ASTROLOGY_OVERLOAD") ? "Lead with the plain situation. Use astrology facts only as support, not as the main language." : "",
    failedCodes.has("TEXTBOOK_PHRASE") ? "Remove textbook astrology phrasing. Rewrite the sentence in plain language." : "",
    failedCodes.has("GENERIC_ADVICE") ? "Give the user one specific thing to do today. Make it direct, not therapeutic or vague." : "",
    failedCodes.has("RELATIONSHIP_COPY_TOO_ABSTRACT") ? "Rewrite relationship copy so it sounds normal and concrete. Avoid technical labels and soft self-help phrasing." : "",
    failures.some((failure) => failure.code === "SELF_HELP_TONE") ? "Make the tone more direct and less self-help or new-age." : ""
  ].filter(Boolean);

  return instructions.join(" ");
}

function compactBody(value: string, maxLength = 1400) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trim()}...` : trimmed;
}

function exampleFromRow(row: ApprovedExampleRow): ApprovedExample | null {
  const headline = stringValue(row.headline);
  const summary = stringValue(row.summary);
  const body = stringValue(row.body);

  if (!headline || !body) {
    return null;
  }

  return {
    contentKey: stringValue(row.content_key),
    surface: stringValue(row.surface),
    mode: stringValue(row.mode),
    eventType: stringValue(row.event_type),
    targetDate: stringValue(row.target_date),
    headline,
    summary,
    body: compactBody(body)
  };
}

function factRecord(facts: Record<string, unknown>, key: string) {
  const value = facts[key];
  return isRecord(value) ? value : null;
}

function aspectHeadline(aspect: Record<string, unknown>) {
  const from = stringValue(aspect.from);
  const type = stringValue(aspect.type);
  const to = stringValue(aspect.to);

  return from && type && to ? `${from} ${type} ${to}` : "";
}

function seasonHeadline(sun: Record<string, unknown> | null) {
  const sign = stringValue(sun?.sign);
  return sign ? `${sign} Season` : "";
}

function moonHeadline(facts: Record<string, unknown>) {
  const moon = factRecord(facts, "moon");
  const sign = stringValue(moon?.sign);
  const supportingAspect = factRecord(facts, "supportingAspect");

  if (!sign) {
    return "";
  }

  if (supportingAspect) {
    const type = stringValue(supportingAspect.type);
    const from = stringValue(supportingAspect.from);
    const to = stringValue(supportingAspect.to);
    const otherPlanet = from === "Moon" ? to : from;

    if (type && otherPlanet) {
      return `Moon in ${sign} ${type} ${otherPlanet}`;
    }
  }

  return `Moon in ${sign}`;
}

function retrogradeHeadline(facts: Record<string, unknown>) {
  const planet = factRecord(facts, "planet");
  const planetName = stringValue(planet?.planet);
  return planetName ? `${planetName} retrograde` : "";
}

function lunationHeadline(facts: Record<string, unknown>) {
  const moonEvent = factRecord(facts, "moonEvent");
  const name = stringValue(moonEvent?.name);
  const sign = stringValue(moonEvent?.sign);

  return name && sign ? `${name} in ${sign}` : "";
}

function dailySkyHeadline(facts: Record<string, unknown>) {
  const sunSign = stringValue(factRecord(facts, "sun")?.sign);
  const moonSign = stringValue(factRecord(facts, "moon")?.sign);
  const parts = [
    sunSign ? `${sunSign} Season` : "",
    moonSign ? `${moonSign} Moon` : ""
  ].filter(Boolean);

  return parts.join(", ");
}

function factualHeadlineFor(input: GenerateContentInput) {
  const supplied = stringValue(input.headline);

  if (supplied) {
    return supplied;
  }

  const facts = input.facts;
  const type = stringValue(facts.type) || input.eventType;
  const aspect = factRecord(facts, "aspect");

  if (aspect) {
    const headline = aspectHeadline(aspect);
    if (headline) {
      return headline;
    }
  }

  if (type === "seasonal_current" || type === "seasonal_weather") {
    return seasonHeadline(factRecord(facts, "sun"));
  }

  if (type === "lunar_cycle" || type === "lunar_weather") {
    return moonHeadline(facts);
  }

  if (type === "retrograde") {
    return retrogradeHeadline(facts);
  }

  if (type === "lunation") {
    return lunationHeadline(facts);
  }

  if (type === "daily_overview" || input.eventType === "daily-sky") {
    return dailySkyHeadline(facts);
  }

  return "";
}

function approvedExamplesPrompt(examples: ApprovedExample[]) {
  if (!examples.length) {
    return "No approved examples available yet.";
  }

  return examples.map((example, index) => [
    `APPROVED EXAMPLE ${index + 1}`,
    `Surface: ${example.surface || "unknown"}`,
    `Mode: ${example.mode || "unknown"}`,
    `Event type: ${example.eventType || "unknown"}`,
    example.targetDate ? `Target date: ${example.targetDate}` : "",
    `Headline: ${example.headline}`,
    example.summary ? `Summary: ${example.summary}` : "",
    "Body:",
    example.body
  ].filter(Boolean).join("\n")).join("\n\n");
}

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return listJsonFiles(entryPath);
    }

    return entry.name.endsWith(".json") ? [entryPath] : [];
  });
}

function loadRewriteCorpora() {
  const corporaRoot = path.join(process.cwd(), "packages/astro-knowledge/generated/tldr-astro/rewrite-corpora");

  return listJsonFiles(corporaRoot).flatMap((filePath) => {
    try {
      return [JSON.parse(fs.readFileSync(filePath, "utf8")) as V4RewriteCorpus];
    } catch {
      return [];
    }
  });
}

function targetV4CorpusId(input: GenerateContentInput) {
  if (input.surface === "sky") {
    return "tldr-v4-sky-rewrites";
  }

  if (input.eventType.includes("transit") || input.eventType.includes("forecast")) {
    return "tldr-v4-transit-to-natal-rewrites";
  }

  if (input.surface === "you" || input.surface === "natal") {
    return "tldr-v4-natal-chart-rewrites";
  }

  return "";
}

function factSearchText(input: GenerateContentInput) {
  return [
    input.contentKey,
    input.eventType,
    factualHeadlineFor(input),
    JSON.stringify(input.facts)
  ].join(" ").toLowerCase();
}

function entrySearchText(entry: V4RewriteEntry) {
  return [entry.id, entry.title, entry.itemType].filter(Boolean).join(" ").toLowerCase();
}

function scoreV4Entry(entry: V4RewriteEntry, input: GenerateContentInput, searchText: string) {
  const entryText = entrySearchText(entry);
  let score = 0;

  if (entry.id && input.knowledgeIds?.includes(entry.id)) score += 50;
  if (entry.itemType && input.eventType.toLowerCase().includes(entry.itemType.toLowerCase())) score += 20;
  if (entry.id && searchText.includes(entry.id.toLowerCase())) score += 12;
  if (entry.title && searchText.includes(entry.title.toLowerCase())) score += 10;

  for (const token of searchText.split(/[^a-z0-9]+/).filter((part) => part.length > 3)) {
    if (entryText.includes(token)) score += 1;
  }

  return score;
}

function compactV4Entry(entry: V4RewriteEntry) {
  return {
    id: entry.id,
    title: entry.title,
    itemType: entry.itemType,
    baseMeaningRewrite: entry.baseMeaningRewrite,
    observableExperience: entry.observableExperience ?? entry.observableTendency ?? entry.observableCurrentActivation,
    friction: entry.shadowPattern ?? entry.pressurePoint ?? entry.whereItCanBecomeDifficult,
    usefulMove: entry.bestMove ?? entry.whereItHelps ?? entry.closingReflection,
    readerFacingSummary: entry.readerFacingSummary,
    symbolicStory: entry.symbolicStory,
    lesson: entry.lesson,
    tldr: entry.tldr
  };
}

function loadV4RewriteExamples(input: GenerateContentInput) {
  const corpusId = targetV4CorpusId(input);

  if (!corpusId) {
    return [];
  }

  const corpus = loadRewriteCorpora().find((entry) => (
    entry.id === corpusId || entry.aliases?.includes(corpusId)
  ));
  const entries = corpus?.entries ?? [];

  if (!entries.length) {
    return [];
  }

  const searchText = factSearchText(input);
  const scored = entries
    .map((entry, index) => ({ entry, index, score: scoreV4Entry(entry, input, searchText) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, 4).map(({ entry }) => compactV4Entry(entry));
}

function v4ExamplesPrompt(input: GenerateContentInput) {
  const examples = loadV4RewriteExamples(input);

  if (!examples.length) {
    return "No V4 rewrite examples are available in the knowledge bundle yet.";
  }

  return JSON.stringify(examples, null, 2);
}

function buildPrompt(input: GenerateContentInput, approvedExamples: ApprovedExample[] = [], qualityFeedback = "") {
  const styleGuide = readTextFile("packages/astro-knowledge/voice/tldr-astro/style-guide.md");
  const lockedHeadline = factualHeadlineFor(input);
  const headlineRule = lockedHeadline
    ? [
        "HEADLINE RULE",
        `Return this exact headline string: ${JSON.stringify(lockedHeadline)}.`,
        "Do not rewrite it as a human-theme title. Keep the headline as the astrology aspect, placement, transit, season, retrograde, or lunation label.",
        "Put the readable hook, advice, and emotional interpretation in summary and body."
      ].join("\n")
    : [
        "HEADLINE RULE",
        "Use a factual astrology headline whenever possible, such as Mercury square Neptune, Moon in Aquarius trine Uranus, Gemini Season, Pluto retrograde, or New Moon in Cancer.",
        "Do not replace the astrology headline with a purely editorial theme."
      ].join("\n");

  return [
    styleGuide,
    "",
    "TASK",
    "Write one TLDR Astro interpretation from the provided astrology facts and source material.",
    "Do not invent astrology. Every interpretive claim must be supported by the facts or source snapshot.",
    "Do not mention the knowledge base, source rows, backend, prompt, or review status.",
    "Do not use em dashes.",
    "Return JSON only.",
    "",
    headlineRule,
    "",
    outputShapeRules(input, lockedHeadline),
    "",
    sceneLockRules(),
    "",
    timeLordSceneRules(input),
    "",
    "CONTENT MODE",
    modeRules(input.mode),
    "",
    "SURFACE",
    input.surface,
    "",
    "EVENT TYPE",
    input.eventType,
    "",
    "TARGET DATE",
    input.targetDate ?? "not specified",
    "",
    "ASTROLOGY FACTS",
    JSON.stringify(input.facts, null, 2),
    "",
    "SOURCE SNAPSHOT",
    JSON.stringify(input.sourceSnapshot ?? {}, null, 2),
    "",
    "SOURCE-BACKED V4 REWRITE EXAMPLES",
    rewriteCorpusRules(),
    "Use these to understand field logic, voice shape, and TLDR Astro interpretation style. Do not copy astrology facts from them unless those facts are also present above.",
    v4ExamplesPrompt(input),
    "",
    "APPROVED TLDR ASTRO EXAMPLES",
    "Use these only as examples of voice, pacing, specificity, structure, and editorial quality.",
    "Do not copy their astrology facts unless they are also present in ASTROLOGY FACTS for the current task.",
    approvedExamplesPrompt(approvedExamples),
    "",
    bannedPhraseRules(),
    "",
    qualityFeedback ? `QUALITY FEEDBACK FROM PRIOR DRAFT\n${qualityFeedback}` : "",
    qualityFeedback ? "" : "",
    "EXTRA VOICE NOTES",
    input.voiceNotes ?? "None."
  ].join("\n");
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
}

function approvedExampleQueryUrl(input: GenerateContentInput, eventType?: string, limit = 3) {
  const baseUrl = supabaseUrl();

  if (!baseUrl) {
    return "";
  }

  const params = new URLSearchParams({
    select: "content_key,surface,mode,event_type,target_date,headline,summary,body,sections,status",
    status: "in.(LIVE,REVIEWED)",
    surface: `eq.${input.surface}`,
    mode: `eq.${input.mode}`,
    content_key: `neq.${input.contentKey}`,
    order: "updated_at.desc",
    limit: String(limit)
  });

  if (eventType) {
    params.set("event_type", `eq.${eventType}`);
  }

  return `${baseUrl}/rest/v1/generated_interpretations?${params.toString()}`;
}

async function loadApprovedExamples(input: GenerateContentInput) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return [];
  }

  const eventType = input.eventType.trim();
  const queries = [
    approvedExampleQueryUrl(input, eventType, 3),
    approvedExampleQueryUrl(input, undefined, 3)
  ].filter(Boolean);
  const examples: ApprovedExample[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (examples.length >= 3) {
      break;
    }

    try {
      const response = await fetch(query, {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`
        }
      });

      if (!response.ok) {
        continue;
      }

      const rows = await response.json() as ApprovedExampleRow[];

      for (const row of rows) {
        const example = exampleFromRow(row);
        const key = example?.contentKey;

        if (!example || !key || seen.has(key)) {
          continue;
        }

        seen.add(key);
        examples.push(example);

        if (examples.length >= 3) {
          break;
        }
      }
    } catch {
      continue;
    }
  }

  return examples;
}

function validateGeneratedContentQuality(content: GeneratedContent) {
  const userFacingText = [
    content.headline,
    content.summary,
    content.body,
    ...(content.sections ?? []).flatMap((section) => [section.heading, section.body])
  ].join("\n");
  const normalized = userFacingText.toLowerCase();

  if (userFacingText.includes("—")) {
    throw new Error("Generated content used an em dash. Please regenerate after revising the prompt or voice notes.");
  }

  for (const phrase of bannedUserFacingPhrases) {
    if (normalized.includes(phrase)) {
      throw new Error(`Generated content used banned phrase: ${phrase}`);
    }
  }

  if (content.summary.trim().length < 40) {
    throw new Error("Generated summary is too thin for editorial review.");
  }

  if (content.body.trim().length < 180) {
    throw new Error("Generated body is too thin for editorial review.");
  }
}

export function evaluateEditorialCoherence(
  draft: GeneratedAstrologyDraft,
  context: GenerationContext
): EditorialGateResult {
  const failures: EditorialFailure[] = [];
  const summary = stringValue(draft.summary);
  const body = stringValue(draft.body);
  const firstSummarySentence = firstSentence(summary || body);
  const openingBody = firstParagraph(body);
  const reviewText = [summary, openingBody, ...(draft.sections ?? []).map((section) => section.body)].join("\n");
  const summaryLifeAreas = lifeAreasIn(summary);
  const openingLifeAreas = lifeAreasIn([summary, openingBody].join(" "));
  const astrologyTermCount = countMatches([firstSummarySentence, openingBody].join(" "), astrologyMechanicTerms);
  const keywordListSentence = sentencesFrom([summary, openingBody].join(" ")).find(sentenceHasKeywordListing);
  const timeLordPlanet = timeLordPlanetFromFacts(context.facts);
  const timeLordMisuseSentence = timeLordPlanet
    ? sentencesFrom([summary, openingBody].join(" ")).find((sentence) => sentenceMisusesTimeLord(sentence, timeLordPlanet))
    : undefined;

  if (
    astrologyTermCount >= 3 ||
    /^(this\s+(contact|placement|transit|aspect)|[a-z]+\s+(retrograde|sextile|square|trine|opposition|conjunction)\b)/i.test(firstSummarySentence) ||
    matchedPhrases(firstSummarySentence, vagueFirstSentencePhrases).length > 0
  ) {
    addEditorialFailure(
      failures,
      "FIRST_SENTENCE_TOO_ASTROLOGICAL",
      "The first sentence does not name a direct plain-language situation."
    );
  }

  if (summaryLifeAreas.length > 2 || (hasCommaHeavyList(summary) && summaryLifeAreas.length > 1)) {
    addEditorialFailure(
      failures,
      "SUMMARY_LISTS_TOPICS",
      "The summary lists multiple life areas or topics instead of naming one specific situation."
    );
  }

  if (keywordListSentence) {
    addEditorialFailure(
      failures,
      "KEYWORD_LISTING",
      "The copy lists possible meanings instead of choosing one concrete pressure point."
    );
  }

  if (timeLordPlanet && (timeLordMisuseSentence || !timeLordUsedAsSceneFilter([summary, openingBody].join(" "), timeLordPlanet))) {
    addEditorialFailure(
      failures,
      "TIME_LORD_NOT_USED_AS_SCENE_FILTER",
      `The ${timeLordPlanet} time lord was not used to choose one ordinary life scene.`
    );
  }

  if (summaryLifeAreas.length > 2) {
    addEditorialFailure(failures, "TOO_MANY_LIFE_AREAS", "The summary names more than two life areas.");
  }

  if (
    openingLifeAreas.length > 3 ||
    /\b(could affect|may involve|especially around|as well as|long-term plans)\b/i.test([summary, openingBody].join(" "))
  ) {
    addEditorialFailure(
      failures,
      "NO_DOMINANT_STORYLINE",
      "The copy gives equal weight to too many possible interpretations instead of choosing one main story."
    );
  }

  if (astrologyTermCount >= 5 || /\b(activates|activation|venusian|plutonian|8th house|eighth house)\b/i.test(reviewText)) {
    addEditorialFailure(
      failures,
      "ASTROLOGY_OVERLOAD",
      "Astrology mechanics carry the prose instead of supporting the human situation."
    );
  }

  matchedPhrases(reviewText, editorialBannedPhrases).forEach((phrase) => {
    addEditorialFailure(failures, "TEXTBOOK_PHRASE", `The phrase '${phrase}' sounds like generic astrology copy.`);
  });

  matchedPhrases(reviewText, selfHelpTonePhrases).forEach((phrase) => {
    addEditorialFailure(
      failures,
      "SELF_HELP_TONE",
      `The phrase '${phrase}' sounds too self-help or new-age.`,
      context.mode === "article" ? "warning" : "fail"
    );
  });

  matchedPhrases(reviewText, genericAdvicePhrases).forEach((phrase) => {
    addEditorialFailure(failures, "GENERIC_ADVICE", `The advice phrase '${phrase}' is too generic.`);
  });

  const actionSections = (draft.sections ?? []).filter((section) => /what to do|action|advice/i.test(section.heading));
  const actionText = actionSections.map((section) => section.body).join(" ") || body.split(/\n\s*\n/).slice(-1)[0] || "";
  if (
    actionText &&
    !/\b(ask|check|say|wait|get|write|send|schedule|name|choose|do not|don't|call|clarify|make)\b/i.test(actionText)
  ) {
    addEditorialFailure(failures, "GENERIC_ADVICE", "The advice does not give one specific action.");
  }

  if (context.surface === "synastry" || context.surface === "composite" || context.surface === "relationship") {
    matchedPhrases(reviewText, [
      "this contact can feel",
      "socially smooth",
      "easy warmth",
      "at home in your own skin",
      "feel liked, comfortable"
    ]).forEach((phrase) => {
      addEditorialFailure(
        failures,
        "RELATIONSHIP_COPY_TOO_ABSTRACT",
        `The relationship phrase '${phrase}' is too abstract or soft.`
      );
    });
  }

  const score = Math.max(0, 100 - failures.reduce((total, failure) => total + (failure.severity === "fail" ? 18 : 8), 0));
  const passed = !failures.some((failure) => failure.severity === "fail") && score >= 70;

  return {
    passed,
    score,
    failures,
    rewriteInstruction: passed ? undefined : editorialRewriteInstruction(failures)
  };
}

function parseResponseJson(raw: string, lockedHeadline: string | undefined, input: GenerateContentInput): GeneratedContent {
  const parsed = JSON.parse(raw) as Partial<GeneratedContent>;

  if (!parsed.headline || !parsed.summary || !parsed.body) {
    throw new Error("OpenAI response did not include headline, summary, and body.");
  }

  const content = {
    headline: lockedHeadline ?? parsed.headline,
    summary: parsed.summary,
    body: parsed.body,
    sections: parsed.sections ?? []
  };

  validateGeneratedContentQuality(content);

  const editorialResult = evaluateEditorialCoherence(content, {
    contentKey: input.contentKey,
    eventType: input.eventType,
    facts: input.facts,
    mode: input.mode,
    surface: input.surface
  });

  if (!editorialResult.passed) {
    throw new Error(`Editorial coherence gate failed (${editorialResult.score}/100): ${editorialResult.rewriteInstruction}`);
  }

  return content;
}

function responseOutputText(payload: {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .trim();
}

export async function generateWithOpenAI(input: GenerateContentInput): Promise<StoredGeneratedContent> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_MODEL ?? defaultModel;
  const lockedHeadline = factualHeadlineFor(input);
  const approvedExamples = await loadApprovedExamples(input);
  let qualityFeedback = "";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: buildPrompt(input, approvedExamples, qualityFeedback),
        text: {
          format: {
            type: "json_schema",
            name: "tldr_astro_generated_content",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["headline", "summary", "body", "sections"],
              properties: {
                headline: { type: "string" },
                summary: { type: "string" },
                body: { type: "string" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["heading", "body"],
                    properties: {
                      heading: { type: "string" },
                      body: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      })
    });

    const payload = await response.json() as {
      id?: string;
      output_text?: string;
      output?: Array<{
        content?: Array<{
          text?: string;
        }>;
      }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(payload.error?.message ?? `OpenAI request failed with ${response.status}.`);
    }

    const outputText = responseOutputText(payload);

    if (!outputText) {
      throw new Error("OpenAI response did not include generated text.");
    }

    try {
      return {
        ...parseResponseJson(outputText, lockedHeadline || undefined, input),
        responseId: payload.id,
        model
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Generated content failed quality gates.");
      qualityFeedback = [
        lastError.message,
        "Regenerate the entire draft. Keep the factual headline. Write one direct human situation first. Use astrology as explanation only."
      ].join("\n");
    }
  }

  throw lastError ?? new Error("Generated content failed quality gates.");
}

export async function saveGeneratedInterpretation(input: GenerateContentInput, generated: StoredGeneratedContent) {
  const supabaseUrl = process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      content_key: input.contentKey,
      surface: input.surface,
      mode: input.mode,
      status: "DRAFT",
      event_type: input.eventType,
      target_date: input.targetDate,
      facts: input.facts,
      knowledge_ids: input.knowledgeIds ?? [],
      source_snapshot: input.sourceSnapshot ?? {},
      prompt_version: promptVersion,
      model: generated.model,
      headline: generated.headline,
      summary: generated.summary,
      body: generated.body,
      sections: generated.sections ?? {},
      openai_response_id: generated.responseId
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase save failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

export function loadSkySourceSnapshot() {
  const skyPath = path.join(process.cwd(), "packages/astro-knowledge/dist/sky.json");
  const sky = JSON.parse(fs.readFileSync(skyPath, "utf8")) as {
    transits?: Array<Record<string, unknown>>;
    modifiers?: Array<Record<string, unknown>>;
    primitives?: Record<string, unknown>;
  };

  const retrogradeModifiers = (sky.modifiers ?? []).filter((modifier) => {
    const id = stringValue(modifier.id);
    const category = stringValue(modifier.category);
    const schema = stringValue(modifier.schema);

    return id.includes("retrograde") || category.includes("retrograde") || schema.includes("retrograde");
  });

  return {
    primitives: sky.primitives,
    modifiers: retrogradeModifiers,
    transits: (sky.transits ?? []).slice(0, 12)
  };
}
