import fs from "node:fs";
import path from "node:path";
import { contentGenerationProvider } from "./provider-config.js";

type ContentMode = "feed" | "in_depth" | "article";
type Surface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";
type Planet = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

export type GenerateContentInput = {
  contentKey: string;
  surface: Surface;
  mode: ContentMode;
  eventType: string;
  provider?: "openai" | "claude" | "anthropic";
  headline?: string;
  targetDate?: string;
  facts: Record<string, unknown>;
  knowledgeIds?: string[];
  sourceSnapshot?: Record<string, unknown>;
  voiceNotes?: string;
  allowQualityFallback?: boolean;
};

export type GeneratedAstrologyDraft = {
  headline: string;
  tldr?: string;
  summary: string;
  body: string;
  action?: string;
  timing?: string;
  sections?: Array<{
    heading: string;
    body: string;
  }>;
  sceneLock?: TimeLordSceneLock | SceneLock;
  astrologyDrilldown?: AstrologyDrilldown;
};

type GeneratedContent = GeneratedAstrologyDraft;

export type StoredGeneratedContent = GeneratedContent & {
  responseId?: string;
  model: string;
  qualityWarning?: string;
  retryCount?: number;
  softWarnings?: string[];
  styleNotes?: string[];
};

export class ContentGenerationQualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentGenerationQualityError";
  }
}

export class ContentGenerationHardEditorialError extends ContentGenerationQualityError {
  readonly reason = "hard_editorial_violation";
  readonly violations: string[];

  constructor(violations: string[], message?: string) {
    super(message ?? `Generated content used hard editorial violation: ${violations.join(", ")}`);
    this.name = "ContentGenerationHardEditorialError";
    this.violations = violations;
  }
}

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
  sceneType?: "internal_state" | "body_signal" | "decision_point" | "task_friction" | "conversation" | "relationship_interaction";
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

export type AstrologyFactorExplanation = {
  label: string;
  technicalFact: string;
  plainMeaning: string;
};

export type AstrologyDrilldown = {
  title: string;
  summary: string;
  factors: AstrologyFactorExplanation[];
  whyThisScene: string;
  timingNote?: string;
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

type SourceBackedRevisionEntry = {
  row_id?: string;
  id?: string;
  aspect?: string;
  target_field?: string;
  original_claim_to_replace?: string;
  replacement_text?: string;
  source_supported_themes?: string;
  source_material_examples_to_use?: string;
  source_files?: string;
  codex_action?: string;
  confidence?: string;
  avoid?: string;
};

type SourceBackedRevisionCorpus = {
  id?: string;
  kind?: string;
  sourceFile?: string;
  entries?: SourceBackedRevisionEntry[];
};

type AuthoredPlacementEntry = {
  id?: string;
  matchType?: string;
  planet?: string;
  sign?: string;
  house?: string;
  title?: string;
  body?: string;
  sourceBody?: string;
  astrologyBody?: string;
  tarotNotes?: string;
  businessNotes?: string;
  appBody?: string;
  draftBody?: string;
  editStatus?: string;
  sourceDocument?: string;
  sourcePath?: string;
  sourceLineRange?: string;
  sourceType?: string;
  directUseAllowed?: boolean;
  usage?: string;
};

type AuthoredPlacementCorpus = {
  id?: string;
  kind?: string;
  sourceFiles?: string[];
  entries?: AuthoredPlacementEntry[];
};

type NatalPlacementPrimitiveEntry = {
  id?: string;
  kind?: "planet" | "sign" | "house" | "ruler" | string;
  body?: string;
  sign?: string;
  house?: string;
  title?: string;
  sourceAnchors?: string[];
  sourceNotes?: string[];
  voiceMoves?: string[];
  avoid?: string[];
};

type NatalPlacementPrimitiveCorpus = {
  id?: string;
  kind?: string;
  sourceFiles?: string[];
  entries?: NatalPlacementPrimitiveEntry[];
};

type ProjectAuthoredNatalSource = {
  role: string;
  sourcePath: string;
  id?: string;
  title?: string;
  excerpts: string[];
};

export type NatalPlacementGenerationSafetySummary = {
  isPrimaryNatalPlacement: boolean;
  sourceIds: string[];
  sourcePaths: string[];
  sourceSafety: {
    sourceBodyExcluded: boolean;
    astrologyBodySent: boolean;
    tarotNotesExcluded: boolean;
    businessNotesExcluded: boolean;
    authoredSourceGenerationAllowed: boolean;
  };
};

type PlacementAspectCardFacts = {
  primaryPlanet: string;
  primarySign: string;
  primaryHouse: string;
  aspectType: string;
  aspectPlanet: string;
  aspectPlanetSign: string;
  aspectPlanetHouse: string;
  orb: string;
};

type FrameworkSection = {
  id?: string;
  heading?: string;
  body?: string;
  items?: Array<{
    label?: string;
    body?: string;
  }>;
};

type FrameworkSnapshot = {
  id?: string;
  title?: string;
  sections?: FrameworkSection[];
};

const promptVersion = "tldr-astro-v5";
const SKY_LUNATION_FRAMEWORK_ID = "lunation-content-architecture-framework";
const SKY_LUNATION_RITUAL_ID = "lunation-ritual-practice-framework";
const defaultOpenAiModel = "gpt-4.1-mini";
const defaultClaudeModel = "claude-sonnet-4-6";
const generatedContentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "tldr", "summary", "body", "action", "timing", "sections", "sceneLock", "astrologyDrilldown"],
  properties: {
    headline: { type: "string" },
    tldr: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" },
    action: { type: "string" },
    timing: { type: "string" },
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
    },
    sceneLock: {
      type: "object",
      additionalProperties: false,
      required: ["sceneType", "sceneArena", "currentPressure", "personalSensitivity", "chosenScene", "excludedMeanings"],
      properties: {
        sceneType: {
          type: "string",
          enum: ["internal_state", "body_signal", "decision_point", "task_friction", "conversation", "relationship_interaction"]
        },
        sceneArena: { type: "string" },
        currentPressure: { type: "string" },
        personalSensitivity: { type: "string" },
        chosenScene: { type: "string" },
        excludedMeanings: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    astrologyDrilldown: {
      type: "object",
      additionalProperties: false,
      required: ["title", "summary", "factors", "whyThisScene", "timingNote"],
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        factors: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "technicalFact", "plainMeaning"],
            properties: {
              label: { type: "string" },
              technicalFact: { type: "string" },
              plainMeaning: { type: "string" }
            }
          }
        },
        whyThisScene: { type: "string" },
        timingNote: { type: "string" }
      }
    }
  }
} as const;
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
  "the lesson is",
  "themes",
  "energy",
  "activates",
  "integration",
  "life area",
  "these are not just background circumstances",
  "they affect how your",
  "when these conditions are supported",
  "when they are strained or neglected",
  "the gift is",
  "the work is",
  "has to be understood alongside",
  "this part of the chart",
  "this area of your chart",
  "care out loud",
  "the invitation is",
  "this transit invites you to",
  "consider that perhaps",
  "everything happens for a reason",
  "gentle reminder",
  "lean into",
  "step into",
  "hold space",
  "the universe",
  "universe is asking",
  "sacred container",
  "divine timing",
  "trust the process",
  "love and light",
  "high vibes only",
  "just be grateful",
  "sit with that",
  "honor your journey",
  "step into your power",
  "perform",
  "performance",
  "performing",
  "shrink",
  "shrinking",
  "cosmic",
  "cosmos",
  "manifesting",
  "divine",
  "tapestry",
  "oneness",
  "unlock"
];

const natalPlacementHardBannedPhrases = [
  "magnetic value system",
  "visible abundance",
  "this tension invites",
  "deep emotional world",
  "supportive aspect",
  "flow naturally",
  "uplift your work and reputation",
  "gain authority",
  "adds a layer",
  "emotional context",
  "mental development",
  "public life and reputation",
  "private currents",
  "larger framework",
  "laced",
  "links"
];

const natalPlacementSoftWarningPhrases = [
  "hold space",
  "realm",
  "themes",
  "activates",
  "energy",
  "broadening horizons",
  "higher learning",
  "future-oriented",
  "future orientation",
  "strong future orientation",
  "collective",
  "wider collective",
  "expansive",
  "expansive approach",
  "natural expansion",
  "progressive ideas",
  "arena",
  "orbit"
];

const natalPlacementTarotReferencePhrases = [
  "the star",
  "the devil",
  "the chariot",
  "the hermit",
  "the lovers",
  "the magician",
  "the empress",
  "major arcana",
  "tarot",
  "corresponds to",
  "jugs",
  "woman pouring water"
];

const natalPlacementTransitLanguagePhrases = [
  "right now",
  "today",
  "this week",
  "currently",
  "during this transit",
  "while this is active",
  "this period",
  "this moment",
  "use this window",
  "current season",
  "this season",
  "this month",
  "this window",
  "next few weeks",
  "next few days",
  "window to",
  "builds through",
  "strongest around"
];

const natalPlacementVisibleScaffoldPhrases = [
  "planetary meaning",
  "how it may show up",
  "how to work with it",
  "what you may notice",
  "what to do",
  "timing",
  "reflection",
  "integration"
];

const conditionalChartLanguagePhrases = [
  "if this connects",
  "depending on your chart",
  "when houses are available",
  "wherever this lands"
];

const synastryLivedExampleBank = {
  ascendant: [
    "You may notice yourself changing your tone, standing differently, softening your expression, or becoming more aware of whether you are being read the way you intended.",
    "A small comment from them can make you suddenly aware of your silence, your humor, your confidence, or the way your face gives you away before you have said anything.",
    "Around them, you may become more conscious of your outfit, your posture, your timing, or the first impression you are leaving.",
    "You may feel more visible around them, even in ordinary moments like walking into a room, sending a text, or explaining why you chose something."
  ],
  midheaven: [
    "You may be trying to finish a project, hold a role, meet a deadline, or stay composed in public, and suddenly their presence brings up what is happening behind the scenes.",
    "They may ask about the plan, the title, the launch, the money, the next step, or whether the version of you being seen by everyone else still feels honest.",
    "Their response may matter most when you are trying to stay focused, visible, professional, or in control.",
    "You may notice this around work, reputation, public choices, family pressure, or the part of your life where people expect you to have it together."
  ],
  mercury: [
    "They may ask the question that makes your plan clearer, or say one small thing that makes you rethink how you are presenting yourself.",
    "A casual comment from them can stay with you longer than expected, especially if it names something about your tone, your timing, or the way you are coming across.",
    "They may point out the part of the story that does not hold, the detail you skipped, or the sentence you keep using to avoid saying what you mean.",
    "You may find yourself explaining more than usual around them, not because they demand it, but because their questions make the vague part harder to hide."
  ],
  venus: [
    "You may notice yourself dressing differently, softening your tone, becoming more charming, or checking whether they seem pleased with you before you realize you are doing it.",
    "They may compliment your style, invite you into softer spaces, or make you feel like you do not have to work so hard to be liked.",
    "Their approval may matter in small ways: what you wear, how you show up, whether you feel attractive, or whether the room feels easier when they are in it.",
    "You may feel liked one moment and oddly self-conscious the next, especially if their warmth is inconsistent or hard to read."
  ],
  mars: [
    "They may push you to answer faster, move sooner, say the thing directly, or stop waiting for perfect conditions.",
    "Their urgency can be motivating when you are stuck, but irritating when you already know what you are doing.",
    "You may feel this as chemistry, competition, impatience, or the sudden need to defend your pace.",
    "They may interrupt the part of you that is trying to stay focused, visible, or in control."
  ],
  jupiter: [
    "They may make your idea feel more possible, encourage you to apply for the thing, or talk you into seeing a future you were too cautious to name.",
    "Around them, the plan can get bigger quickly: one conversation turns into a trip, a launch, a promise, or a version of the future that suddenly feels reachable.",
    "Their confidence can help when you are doubting yourself, but it can also make it easy to skip the part where the plan needs structure.",
    "You may leave a conversation with them feeling more hopeful, more ambitious, or more willing to believe that what you want is not unreasonable."
  ],
  saturn: [
    "They may ask about the deadline, the plan, the money, the commitment, or the part of the promise that has to survive after the feeling changes.",
    "Their presence can make you aware of what has not been handled yet: the boundary, the responsibility, the delay, or the choice you keep postponing.",
    "You may feel steadier around them, or more judged, depending on whether their standards feel supportive or withholding.",
    "They may not say much, but their silence can make you more aware of what you are avoiding."
  ],
  chiron: [
    "They may touch a place where you are quicker to defend yourself than you expected, especially around being misunderstood, dismissed, or not taken seriously.",
    "A small moment with them can bring up an older reaction: shutting down, overexplaining, apologizing too quickly, or trying to prove you are fine.",
    "They may remind you of a pattern you thought you had already moved through, not because you failed, but because the same place is asking for a different response.",
    "Care can get complicated here. You may want to help them, fix the moment, or make yourself useful before you have checked what it is bringing up in you."
  ],
  lilith: [
    "They may make it harder to pretend you are fine with something you already know you do not want.",
    "Around them, you may notice the part of you that does not want to explain, soften, negotiate, or make your refusal easier for someone else to accept.",
    "They may bring out a private instinct: the line you will not cross, the desire you will not dress up, or the part of you that does not want to be managed.",
    "You may feel more aware of where you have been performing agreement, especially in places where your body already knew the answer was no."
  ],
  uranus: [
    "They may disrupt the routine, change the plan, or make the version of you that needs more freedom harder to ignore.",
    "Around them, something can shift quickly: your mood, your plans, your certainty, or your tolerance for doing things the usual way.",
    "They may make you feel more awake, but also less settled, especially if the connection keeps changing before you have caught up.",
    "You may notice yourself wanting more space, more honesty, more experimentation, or fewer rules around who you are allowed to become."
  ],
  neptune: [
    "They may make the situation feel more meaningful than it is ready to be, especially when longing fills in details that have not been said out loud.",
    "Around them, you may feel softer, more forgiving, more inspired, or less clear about what is actually happening.",
    "A text, a silence, or a vague promise can become easy to overread when you want the connection to mean something specific.",
    "They may bring out compassion, fantasy, avoidance, or the urge to believe the best before the facts have caught up."
  ],
  pluto: [
    "They may make it harder to stay casual about something you were trying not to care about.",
    "Around them, a small moment can feel loaded: a look, a delay, a question, or the feeling that someone has more power in the room than they are naming.",
    "They may bring out intensity, suspicion, desire, protectiveness, or the need to know what is really going on underneath the surface.",
    "You may notice where you want control, where you are afraid of losing it, or where the connection is asking for honesty you cannot fake."
  ]
} as const;

const synastryBannedPhrases = [
  "soulmate",
  "twin flame",
  "karmic contract",
  "meant to be",
  "toxic",
  "destined",
  "guaranteed",
  "the hard thing",
  "hold space",
  "deeply affirming",
  "masquerade",
  "this aspect activates",
  "their energy reaches",
  "their emotional world connects",
  "who they are connects with",
  "the thing to watch",
  "give it somewhere to go",
  "this connection works best when"
];

function bannedPhrasePattern(phrase: string) {
  const escaped = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
}

function hasBannedPhrase(text: string, phrase: string) {
  return bannedPhrasePattern(phrase).test(text);
}

function badAiGenerationFlags(text: string) {
  const flags: string[] = [];

  if (/\bnot\b.{0,80}\bbut\b/i.test(text)) {
    flags.push("not X but Y construction");
  }

  if (/\bnot\b.{0,80}\binstead\b/i.test(text)) {
    flags.push("contrast-reveal construction");
  }

  if (/\b(the harder pattern is|the difficult part is|the shadow is|the gift is|the lesson is)\b/i.test(text)) {
    flags.push("formula scaffold");
  }

  if (/\bperform(?:s|ed|ing)?\b/i.test(text)) {
    flags.push("banned word: perform");
  }

  if (/\bshows where\b|\bdescribes where\b|\bcan explain why\b/i.test(text)) {
    flags.push("repetitive astrology explainer scaffold");
  }

  if (/(?:\b\w+\b,\s*){4,}/.test(text)) {
    flags.push("keyword-list cadence");
  }

  return [...new Set(flags)];
}

function hardEditorialViolation(violations: string[], message?: string): never {
  throw new ContentGenerationHardEditorialError(violations, message);
}

function isHardEditorialViolation(error: Error | null): error is ContentGenerationHardEditorialError {
  return error instanceof ContentGenerationHardEditorialError;
}

function isAdminDraftGeneration(input: GenerateContentInput) {
  return stringValue(input.facts?.adminGenerationMode) === "admin_draft";
}

function isApprovedSynastryExampleException(phrase: string, normalizedText: string, input: GenerateContentInput) {
  return isSynastryAspectInput(input)
    && phrase === "performing"
    && normalizedText.includes("performing agreement");
}

function softVoiceWarningFailures(content: GeneratedContent, input: GenerateContentInput) {
  if (!isAdminDraftGeneration(input) || !isPrimaryNatalPlacementGeneration(input)) {
    return [];
  }

  const text = normalizeText([
    content.headline,
    content.tldr,
    content.summary,
    content.body,
    content.action,
    content.timing,
    ...(content.sections ?? []).flatMap((section) => [section.heading, section.body])
  ].filter(Boolean).join("\n"));

  return natalPlacementSoftWarningPhrases.filter((phrase) => hasBannedPhrase(text, phrase));
}

function styleNotesForGeneratedContent(content: GeneratedContent, input: GenerateContentInput) {
  if (!isAdminDraftGeneration(input) || !isPrimaryNatalPlacementGeneration(input)) {
    return [];
  }

  const notes: string[] = [];
  const body = normalizeText(content.body);

  if (body.includes("may ") || body.includes("can ")) {
    notes.push("could be sharper");
  }

  if (/\b(experience|process|pattern|meaning)\b/i.test(content.body)) {
    notes.push("slightly generic");
  }

  return [...new Set(notes)];
}

function generationQualityDiagnostics(content: GeneratedContent, input: GenerateContentInput) {
  return {
    softWarnings: softVoiceWarningFailures(content, input),
    styleNotes: styleNotesForGeneratedContent(content, input)
  };
}

function withGenerationQualityDiagnostics<T extends StoredGeneratedContent>(content: T, input: GenerateContentInput): T {
  const diagnostics = generationQualityDiagnostics(content, input);

  return {
    ...content,
    softWarnings: diagnostics.softWarnings,
    styleNotes: diagnostics.styleNotes
  };
}

export function hardEditorialFailureResponse(error: ContentGenerationHardEditorialError) {
  return {
    status: "generation_failed",
    reason: error.reason,
    violations: error.violations,
    draftBody: null,
    appBody: null,
    editStatus: "needs_generation"
  };
}

const requiredHeadingsByMode: Record<ContentMode, string[]> = {
  feed: ["TLDR"],
  in_depth: ["TLDR"],
  article: []
};

const bannedOutputSignatures = ["this is not", "in review", "this entry is", "currently in review"];
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
const technicalAstrologyMainCopyTerms = [
  "time lord",
  "annual time lord",
  "lord of the year",
  "profection",
  "profected",
  "natal moon",
  "natal venus",
  "natal sun",
  "natal mercury",
  "natal mars",
  "natal jupiter",
  "natal saturn",
  "mars opposite moon",
  "venus-ruled year",
  "house activation",
  "transit to natal",
  "aspect pattern",
  "natal chart",
  "birth chart mechanics"
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
const unsupportedExternalScenePhrases = [
  "someone may ask",
  "someone might ask",
  "you may be asked",
  "you might be asked",
  "a request may",
  "the request itself",
  "someone wants an answer",
  "someone needs an answer",
  "a message may arrive",
  "a conversation may start",
  "a situation may come up"
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
  "- Start with lived experience, then explain what in the chart/facts could produce it.",
  "- Use concrete, human observations before advice.",
  "- Use soft certainty without sounding vague. Prefer can, often, tends to, may, and there can be.",
  "- For transits and current sky, treat facts as timebound and practical: what is happening in this window, what may feel heightened, and what small move helps.",
  "- For natal and personal summaries, use soft certainty about patterns over time.",
  "- Do not use em dashes.",
  "- Do not use self-help language.",
  "- Do not use therapy language unless explicitly source-backed.",
  "- Do not invent childhood causes, trauma claims, karmic explanations, or psychological diagnoses.",
  "- Do not use \"you are\" as an identity statement.",
  "- Do not use \"this placement asks you to,\" \"this aspect works best when,\" or \"the useful thing to notice is.\"",
  "- Do not use these words or phrases in reader-facing copy: themes, energy, activates, integration, life area, the gift is, the work is, these are not just background circumstances, has to be understood alongside, care out loud.",
  "- For natal placements, do not define the planet, sign, and house in a fixed textbook sequence. Start with what the placement does in a person, then make the sign, house, retrograde condition, ruler, and aspects matter only when they explain real behavior.",
  "- For empty houses, do not open by saying there are no planets in the house. Start with the sign on the cusp and what that looks like in real life. Use the ruler to show where the house becomes easier to recognize through concrete choices, events, or timing.",
  "- For friend chart copy, use the friend's name naturally once, then use pronouns. Default to they, their, and them unless provided otherwise.",
  "- Keep natal aspects separate from the placement body unless explicitly asked to weave them in.",
  "- Do not call out backend distinctions in user-facing copy, such as \"this is not a permanent trait,\" \"source-backed,\" or \"authored from approved material.\"",
  "- Translate source symbolism into concrete human experience.",
  "",
  "Preferred short structure in all modes:",
  "- what is happening in the facts",
  "- what this can feel like in life",
  "- why this pattern may be this way",
  "- what is most useful to do next",
  "- timing that helps decide urgency",
  "",
  "The reader should leave knowing why they may feel, think, remember, want, avoid, or react a certain way, and what concrete move fits this moment.",
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

function envFlagEnabled(name: string) {
  return ["1", "true", "yes", "on", "enabled"].includes(comparableKey(process.env[name]));
}

function allowsPrivateSourceModelGeneration() {
  return (
    envFlagEnabled("ALLOW_PRIVATE_SOURCE_MODEL_GENERATION") ||
    envFlagEnabled("ALLOW_AUTHORED_SOURCE_MODEL_GENERATION")
  );
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
      "Structure: 4 compact blocks in order",
      "1) What you may notice",
      "2) Why this is happening",
      "3) What to do right now",
      "4) Timing",
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
    "Article Mode: full transit essay.",
    "Length: full essay in longer continuous paragraphs.",
    "Structure: one-line opening, specific validation, astrology translated into lived experience, shadow, earned permission, collective affirmation close.",
    "Tone: sharp, observational, grounded, and unsentimental. It should feel closer to an honest essay than a horoscope."
  ].join("\n");
}

function modeRulesForInput(input: GenerateContentInput) {
  if (isPersonalizedNatalPlacementAspectCard(input)) {
    return [
      "Natal Placement Aspect Card Mode: evergreen birth-chart support copy attached to a primary placement.",
      "Length: one to three developed paragraphs.",
      "Structure: begin with the primary placement, then explain what the aspect planet changes, pressures, or supports, then connect both houses as one lived pattern.",
      "Tone: warm natal voice, direct, specific, and useful without sounding like a current transit, a glossary, or a standalone aspect article."
    ].join("\n");
  }

  if (isPrimaryNatalPlacementGeneration(input)) {
    return [
      "Natal Placement Page Mode: evergreen birth-chart placement interpretation.",
      "Length: two developed paragraphs, roughly 170 to 260 words in the body.",
      "Structure: treat the primary placement as the main interpretation. Explain the planet or point, sign, house, and supplied ruler thread as one lived pattern.",
      "Tone: warm natal voice, direct, specific, and useful without sounding like a glossary, a generic sign description, or a current transit."
    ].join("\n");
  }

  if (isNatalAspectGenerationContext(input)) {
    return [
      "Natal Aspect Mode: evergreen birth-chart interpretation.",
      "Length: two to four developed paragraphs.",
      "Structure: explain the permanent chart pattern through the supplied planets, signs, houses, and aspect.",
      "Tone: warm natal voice, direct, specific, and useful without sounding like a current transit or daily update."
    ].join("\n");
  }

  return modeRules(input.mode);
}


function outputShapeRules(input: GenerateContentInput, lockedHeadline: string) {
  const exactHeadline = lockedHeadline
    ? `Use this exact headline: ${JSON.stringify(lockedHeadline)}.`
    : "Use a factual astrology headline, not a poetic title.";

  if (isPrimaryNatalPlacementGeneration(input)) {
    const hasAspects = asArray<Record<string, unknown>>(input.facts.aspects).length > 0;

    return [
      "OUTPUT SHAPE FOR NATAL PLACEMENT PAGE",
      exactHeadline,
      "Write the primary natal placement as the main interpretation.",
      "This is not current astrology, not a daily update, not a transit, and not sky weather.",
      "Return JSON only and fill every schema field.",
      "",
      "JSON field mapping:",
      "headline: factual placement title only.",
      "tldr: one direct sentence naming the core placement pattern.",
      "summary: one or two plain sentences that preview the placement without flattening it into keywords.",
      "body: the primaryPlacement.body. Write two natural paragraphs, roughly 170 to 260 words total. This is the in-depth main placement interpretation. Do not use visible labels inside the body.",
      hasAspects
        ? "sections: use sections as aspectCards. Each section heading should be a short aspect-card title such as 'Square Saturn in Aries in the 10th house'. Each section body should be a shorter supporting card, roughly 90 to 150 words, explaining what that aspect adds to the primary placement."
        : "sections: return an empty array. Do not invent aspect cards, review sections, fallback sections, or source logic sections when no aspects are supplied.",
      "action: one grounded sentence about what becomes easier to recognize or work with across life. Do not write a command list.",
      "timing: write 'Natal chart pattern.' only because the response schema requires a timing field. Do not write seasonal, weekly, current, exact-date, window, or timing guidance.",
      "astrologyDrilldown: briefly explain the factual chart mechanics with title 'Why this?'.",
      "",
      "Primary placement rules:",
      "The body must be larger and more in-depth than the aspect card sections.",
      "Use ASTROLOGY SOURCE MATERIAL as the primary interpretive source layer.",
      "Do not use TAROT / SYMBOLIC NOTES in natal placement copy unless the request is explicitly for a tarot or correspondence layer.",
      "Do not use BUSINESS NOTES unless the request is explicitly business or career mode.",
      "Explain what the planet or point represents, how the sign shapes it, how the house shows where it expresses, and how those facts combine into a lived pattern.",
      "Use supplied traditional and modern ruler placements only when they are present in the facts. Do not invent missing ruler sign or house.",
      "Do not write a keyword list. Do not define planet, sign, and house in a fixed textbook sequence.",
      "",
      "Aspect card rules:",
      "If aspects are supplied, each aspect section must keep the primary placement as the anchor and explain what the aspect planet adds to it.",
      "Do not re-explain the whole placement inside each aspect card.",
      "Do not treat natal aspects as standalone full articles.",
      "Do not use visible scaffolding such as 'The square connects these two' or 'The aspect links the houses.'",
      "",
      "Guardrails:",
      "Do not use visible labels such as Planetary meaning, How it may show up, How to work with it, What you may notice, or Timing.",
      "Do not include Timing, Reflection, Integration, What You May Notice, How It May Show Up, How To Work With It, or Planetary Meaning as section headings.",
      "No em dashes.",
      "No dash punctuation.",
      "No bullets or numbered lists.",
      "No current-weather language.",
      "No clipped command-list cadence.",
      "Do not use the words energy, perform, integration, activates, life area, or themes.",
      "Do not mention The Star, The Devil, The Chariot, The Hermit, The Lovers, The Magician, The Empress, Major Arcana, tarot cards, card illustrations, jugs, or a woman pouring water."
    ].join("\n");
  }

  if (isNatalAspectGenerationContext(input)) {
    if (isPersonalizedNatalPlacementAspectCard(input)) {
      return [
        "OUTPUT SHAPE FOR NATAL PLACEMENT ASPECT CARD",
        exactHeadline,
        "Write an evergreen birth-chart aspect card attached to the primary placement the user is already reading.",
        "This card explains what the aspect planet adds to, presses on, complicates, or supports inside the primary natal placement.",
        "This is not current astrology, not a daily update, not a transit, not sky weather, and not a standalone aspect article.",
        "Return JSON only and fill every schema field.",
        "",
        "JSON field mapping:",
        "headline: factual natal aspect title only.",
        "tldr: one direct sentence that names what this aspect adds to the primary placement.",
        "summary: one or two plain sentences that preview the placement-card pattern without flattening it into keywords.",
        "body: complete natural paragraphs. Start from the primary placement, then show how the aspect planet changes the way that placement works. Use the signs and houses as known chart facts, not possibilities. Do not use visible labels inside the body.",
        "Do not write a planet-by-planet report. Do not give equal weight to both planets as if this were a standalone aspect article. The primary placement is the home base.",
        "Connect the primary house and the aspect planet house as one lived pattern. Do not merely list two house topics.",
        "action: one grounded sentence about what becomes easier to recognize or work with across life. Do not write a command list.",
        "timing: write 'Natal chart pattern.'",
        "sections: include two or three review sections only. Use headings from this set when they fit: What This Adds, Where It Lives, What Becomes Easier To Name. Do not use Reflection, Integration, Timing, or What You May Notice.",
        "astrologyDrilldown: briefly explain the factual chart mechanics with title 'Why this?'.",
        "",
        "Source hierarchy:",
        "Use ASTROLOGY SOURCE MATERIAL as the primary interpretive source layer.",
        "Use natal placement primitives as backup support.",
        "Use source-backed aspect rows only for base aspect accuracy and claim safety.",
        "Do not imitate generic astrology reference prose. Do not write a glossary.",
        "",
        "Guardrails:",
        "No em dashes.",
        "No dash punctuation.",
        "No bullets or numbered lists.",
        "No current-weather language.",
        "No clipped command-list cadence.",
        "Do not use the words energy, perform, integration, activates, life area, or themes.",
        "Do not use report phrases like positions itself, stands in for, adds a layer, the realm of, arena of, this exact pairing, unlike a similar aspect, or the way these signs and houses position the planets.",
        "Do not open with textbook constructions like 'Planet in sign in house shapes,' 'Planet in sign in house brings,' or 'Planet in sign in house loves.' Open from the lived pattern instead, while naming the chart fact naturally.",
        "Do not use scaffolding phrases like 'the square between these two,' 'the opposition between these two,' 'the trine between these two,' 'the trine between Moon and Jupiter,' or 'the aspect links the houses.' Make the house connection human instead.",
        "Do not start sentences with 'The square/opposition/trine between...' or 'In this square/opposition/trine...' because that turns the card into an aspect report. Start from the person living the primary placement.",
        "Do not write conditional chart language when signs and houses are supplied."
      ].join("\n");
    }

    return [
      "OUTPUT SHAPE FOR NATAL ASPECT",
      exactHeadline,
      "Write an evergreen birth-chart aspect interpretation in the TLDR Astro warm natal voice.",
      "This is a permanent natal chart pattern, not current astrology, not a daily update, not a transit, and not sky weather.",
      "Return JSON only and fill every schema field.",
      "",
      "JSON field mapping:",
      "headline: factual natal aspect title only.",
      "tldr: one direct sentence that names the core natal pattern without sounding like advice for today.",
      "summary: one or two plain sentences that preview the chart pattern without flattening it into keywords.",
      "body: complete natural paragraphs. Explain the planets, aspect, signs, and houses as one chart-specific birth-chart pattern. Do not use visible labels inside the body.",
      "Do not produce a planet-by-planet report. Do not write one sentence for planet A, one sentence for planet B, and one sentence explaining the aspect. Weave the chart facts into a natural interpretation that sounds written after understanding the whole aspect.",
      "action: one grounded sentence about how this pattern becomes easier to recognize or work with across life. Do not write a command list.",
      "timing: write 'Natal chart pattern.'",
      "sections: include two or three review sections only. Use headings from this set when they fit: How This Works, Where It Lives, What Becomes Easier To Name. Do not use Reflection, Integration, Timing, or What You May Notice.",
      "astrologyDrilldown: briefly explain the factual chart mechanics with title 'Why this?'.",
      "",
      "Guardrails:",
      "No em dashes.",
      "No dash punctuation.",
      "No bullets or numbered lists.",
      "No current-weather language.",
      "No clipped command-list cadence.",
      "Do not use the words energy, perform, integration, activates, life area, or themes.",
      "Do not use report phrases like positions itself, stands in for, adds a layer, the realm of, arena of, this exact pairing, unlike a similar aspect, or the way these signs and houses position the planets.",
      "Do not open with textbook constructions like 'Planet in sign in house shapes,' 'Planet in sign in house brings,' or 'Planet in sign in house loves.' Open from the lived pattern instead, while naming the chart fact naturally.",
      "Do not use scaffolding phrases like 'the square between these two,' 'the opposition between these two,' 'the trine between these two,' or 'the aspect links the houses.' Make the house connection human instead.",
      "Good natal-aspect openings sound like: 'With Mercury in Cancer in your 3rd house, words are not separate from memory.' Or: 'With Venus in Leo in your 2nd house, being wanted and being valued can get tangled together.' Or: 'With the Moon in Scorpio in your 6th house, daily life is rarely just daily life.'",
      "End by naming what becomes easier to say, recognize, choose, or stop carrying. Do not end with a generalized summary about a unique shape, a wider presence, a larger framework, or inner and outer life.",
      "Do not write conditional chart language when signs and houses are supplied."
    ].join("\n");
  }

  if (isDailySkyFeedAspect(input)) {
    return [
      "OUTPUT SHAPE FOR DAILY SKY-FEED ASPECT",
      exactHeadline,
      "Write a daily astrology transit interpretation in the TLDR Astro voice.",
      "This is a current transit happening in the sky for everyone. There is no birth chart and no house placement.",
      "Do not invent personalization, natal placements, houses, or private reader circumstances.",
      "Return JSON only and fill every schema field.",
      "",
      "The reader-facing write-up must read as a continuous article, not a labeled template.",
      "Start with one plain-language situation the reader may notice today. The first sentence must make sense without astrology knowledge. Mention the aspect and date or timing only after that human situation is clear. Make the transit feel useful and specific.",
      "Then explain what each planet represents in everyday terms and what happens when the two planets work together or create tension through the aspect.",
      "Use 2-3 concrete life examples inside the prose. They should feel recognizable, not like a checklist. Use conversations, decisions, responsibilities, emotions, relationships, work, money, boundaries, or timing.",
      "Give practical guidance tied directly to the planets and aspect. The advice should feel like insight, not productivity coaching.",
      "",
      "JSON field mapping:",
      "headline: factual aspect title only.",
      "tldr: the TLDR section as 3-4 natural sentences.",
      "summary: 1-2 concise sentences that name one ordinary-life scene and the useful core dynamic without sounding mechanical.",
      "body: the polished write-up in clear paragraphs, not bullets. Do not include visible labels in the body text. The first reader-facing sentence must not begin with the aspect, planet names, or astrology mechanics.",
      "Do not start the body with TLDR:, Planetary meaning:, How it may show up:, How to work with it:, Timing:, What You May Notice, What To Do, Reflection, Integration, or similar scaffold labels.",
      "Do not use markdown bullets or numbered lists.",
      "action: one specific, grounded move tied to the aspect.",
      "timing: one clean timing sentence.",
      "sections: return an empty array unless the schema requires it. If sections are required, do not use visible scaffold headings such as TLDR, Planetary Meaning, How It May Show Up, How To Work With It, What You May Notice, What To Do, or Timing.",
      "astrologyDrilldown: keep the astrology explanation short, plain, and tied only to the provided facts.",
      "",
      "Voice rules:",
      "Direct, grounded, emotionally intelligent, and plain. Translate astrology into lived experience without sounding mystical, generic, therapeutic, or overly poetic.",
      "Use natural sentences with variation in length.",
      "Use soft certainty: may, can, often, more likely, easier, harder.",
      "Make advice specific enough to be useful, but open enough that the reader can find themselves in it.",
      "Concrete examples should feel lived-in: a bill, a boundary, a conversation, a deadline, a commitment, a choice, a pattern, a responsibility, a relationship.",
      "Do not use windup framing, slogans, or filler lines.",
      "Avoid 'not through X, but through Y' and similar antithesis-punch constructions.",
      "Avoid: This is not dramatic astrology, the invitation is, lean into, step into, honor, release, unlock, universe, cosmic, manifesting.",
      "Do not sound like a therapist, guru, or productivity coach.",
      "Say the Moon and the Sun for transiting sky planets. Never say your Moon or your Sun on this surface.",
      "No em dashes."
    ].join("\n");
  }

  if (isTransitArticle(input)) {
    return [
      "OUTPUT SHAPE FOR TRANSIT ARTICLE",
      exactHeadline,
      "Write a transit article in the longform voice about the supplied transit, aspect, retrograde, ingress, lunation, or sky event.",
      "This is a full article, not a feed card. The body should move in longer, continuous paragraphs where a full thought deepens as it goes.",
      "Return JSON only and fill every schema field.",
      "",
      "Article voice:",
      "Direct, observational, and grounded. Name patterns plainly without cushioning them and without dramatizing them.",
      "The voice should feel like the smartest, most honest friend in the room: someone who notices what the reader is doing before they have admitted it to themselves, and tells them plainly.",
      "Closer to a sharp essay than a horoscope. If a line could be read aloud in a quiet room and still feel true, keep it. If it sounds like a card from a gift shop, cut it.",
      "",
      "Body development:",
      "Open with one specific human pattern or pressure point. Let it land before moving on.",
      "Build specific, restrained validation. Name behavior, not just feeling. One or two specifics is enough.",
      "State the transit plainly: planet, sign, aspect when present, date or active range when available. Translate immediately into observable life.",
      "Name what goes wrong with this transit and the coping pattern it can make easy to believe.",
      "Include grounded permission or action language only after the honest read.",
      "Close with a collective image only if it feels natural. Do not force a fixed ending structure.",
      "",
      "Opening options. Pick ONE:",
      "- No one knows {specific internal effort} it has taken just to {specific action}.",
      "- There is a point where {pattern} stops being {protective function} and starts becoming {problem}.",
      "- What looks like {surface behavior} may actually be {deeper motivation}.",
      "- Your body may register {truth, desire, resistance, or fatigue} before your mind can explain it.",
      "- You may take longer to {act, decide, or respond} because {specific reason}.",
      "- Something may build quietly before it ever becomes visible.",
      "- At some point, not choosing also becomes a choice.",
      "- Courage may look less like {dramatic action} and more like {grounded action}.",
      "- You may already know the pattern. The harder part is deciding what to do once you see it.",
      "- There is a moment when {old strategy} no longer gives you the protection it used to.",
      "- There is a difference between {healthy expression} and {distorted expression}.",
      "- Maybe the issue is not {obvious problem}. Maybe the issue is {deeper pattern}.",
      "",
      "JSON field mapping:",
      "headline: factual transit title only. Preserve the supplied headline when present.",
      "tldr: one direct sentence that names the core human pattern in the article.",
      "summary: two or three sentences max. It should preview the article without flattening it into keywords.",
      "body: the full polished article from the opening line through the collective close. Do not use markdown headings inside body. Do not use bullets or numbered lists.",
      "action: one grounded permission or action from the article.",
      "timing: one clean timing sentence from the provided facts.",
      "sections: return an empty array unless a content-specific supporting section is necessary for review. Do not use fixed template headings.",
      "astrologyDrilldown: explain the factual transit mechanics briefly, with title 'Why this?'.",
      "",
      "Close rules:",
      "Do not use a fixed close, sign-off, or repeated sentence frame.",
      "End in plain language that follows from the article.",
      "",
      "Guardrails:",
      "No em dashes.",
      "No bullets in the body.",
      "No punchy fragment stacks.",
      "No gift-shop lines.",
      "No 'everything happens for a reason'.",
      "No 'the universe is asking'.",
      "No 'this transit invites you to'.",
      "No 'hold space for'.",
      "No 'sacred container'.",
      "No 'divine timing'.",
      "No 'trust the process'.",
      "No 'love and light'.",
      "No 'high vibes only'.",
      "No 'just be grateful'.",
      "No 'sit with that'.",
      "No 'honor your journey'.",
      "No 'step into your power'.",
      "No perform, performance, or performing. Say what is actually happening: playing a role, running a script, putting on a face, or going through the motions.",
      "No shrink or shrinking. Say what is actually happening: making yourself smaller for someone's comfort, swallowing what you wanted to say, or taking up less room than you need.",
      "Do not over-explain astrology as astrology. Connect the technical facts to lived experience seamlessly.",
      "Do not invent events that are not supported by the facts.",
      "Use restraint. Specific behavior matters more than emotional intensity."
    ].join("\n");
  }

  return [
    "OUTPUT SHAPE",
    exactHeadline,
    "Return separate main-card copy and astrology drilldown copy.",
    "Main card = lived guidance. Drilldown = astrology logic.",
    "The headline stays astrology-only. The human hook belongs in tldr, summary, body, action, and timing.",
    "tldr: one direct sentence of guidance. It must read without astrology knowledge.",
    "summary: one or two plain sentences that name the one ordinary-life scene. Do not summarize the astrology mechanically.",
    "body: write complete paragraphs as a continuous article, not a labeled template.",
    "Start with what may be noticeable in real life today, this season, or during this transit.",
    "Then name the pressure or tension inside that one scene, without overloading the reader with astrology mechanics.",
    "Then give concrete action language and timing only when the facts support it.",
    "action: one specific useful move.",
    "timing: one plain timing sentence.",
    "sections: use section objects for main-card clarity and review.",
    "Do not use visible scaffold headings such as TLDR, What You May Notice, What To Do, Timing, Reflection, Integration, Planetary Meaning, How It May Show Up, or How To Work With It.",
    "Do not use labels inside body. Body should read like natural prose.",
    "Do not write backend disclaimers, source notes, permanent-trait caveats, or process notes.",
    "Do not put technical astrology in summary, body, action, timing, or main sections. Put it only in astrologyDrilldown.",
    "Main copy must not say: time lord, profection, natal Moon, natal Venus, Mars opposite Moon, Venus-ruled year, house activation, transit to natal, aspect pattern.",
    "Do not invent external events. Do not write someone asks, a message arrives, a conversation starts, or a situation comes up unless ASTROLOGY FACTS explicitly include that event.",
    "A concrete scene can be an internal state, body signal, decision point, task friction, conversation, or relationship interaction. Choose the scene type that the facts actually support.",
    "The main copy must still make sense if no obvious external event happens.",
    "astrologyDrilldown: explain why the app is saying this today. Keep it short, clear, and plain.",
    "astrologyDrilldown.title: use 'Why this?'.",
    "astrologyDrilldown.summary: two plain sentences max about the astrology logic.",
    "astrologyDrilldown.factors: include the time lord, strongest pressure, natal target, timing factor, or other relevant factors that actually appear in ASTROLOGY FACTS.",
    "astrologyDrilldown.whyThisScene: explain why this one scene was chosen and what meanings were excluded.",
    "astrologyDrilldown.whyThisScene must name the scene type and explain why no external event was invented when the facts do not support one.",
    "astrologyDrilldown.timingNote: optional timing strength.",
    input.surface === "sky" ? "Sky rule: write current astrology as advice and timing. Do not make it a natal identity description." : "",
    input.surface === "you" || input.surface === "natal" ? "Natal/You rule: describe a recurring pattern with soft certainty, then give a useful way to work with it." : "",
    input.surface === "synastry" || input.surface === "composite" || input.surface === "relationship" ? "Relationship rule: describe what happens between the people, where it helps, where it gets complicated, and what makes the bond easier to handle." : ""
  ].filter(Boolean).join("\n");
}

function sceneLockRules() {
  return [
    "SCENE LOCK",
    "Before writing, internally choose one supported lived-experience scene.",
    "Do not output the scene lock as a separate field. Use it to control the final copy.",
    "Internal scene lock shape:",
    "{ sceneType: 'internal_state' | 'body_signal' | 'decision_point' | 'task_friction' | 'conversation' | 'relationship_interaction', scene: string, mainTension: string, userPressure: string, concreteSituation: string, whatNotToInclude: string[] }",
    "The app should not summarize every possible meaning of the transit, placement, aspect, or relationship contact.",
    "Pick the most likely supported experience and commit to it.",
    "The final copy must answer: what is the one thing the reader might actually notice?",
    "Do not answer: what are all the themes this astrology could represent?",
    "Rules:",
    "- Choose one scene type only.",
    "- Stay inside the chosen scene.",
    "- Do not list alternate meanings.",
    "- Do not name more than two life areas.",
    "- Do not use a sentence with three or more options joined by commas or or.",
    "- The first sentence must work without astrology knowledge.",
    "- Use astrology only after the human situation is clear.",
    "- Advice must be one specific action.",
    "- Do not invent external events. If the facts do not show an interaction, do not write someone asks, a message arrives, a conversation starts, or a situation comes up.",
    "- The copy should still fit if no visible event happens.",
    "- Name what meanings and external events you are choosing not to include, then leave them out."
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
    "2. Strongest active transit -> current pressure, body signal, threshold, decision point, or mood.",
    "3. Natal planet or point being hit -> personal sensitivity.",
    "4. Final copy -> one supported lived-experience scene.",
    "Internal scene selection prompt:",
    "Choose one supported scene type for the user. Use the time lord as the main scene filter. Use the strongest transit as the immediate pressure. Use the natal planet or point as the personal sensitivity.",
    "Return internally: Time lord arena, current pressure, personal sensitivity, scene type, one chosen scene, meanings you are excluding, and external events you are not inventing.",
    "Do not output this internal selection as a separate field.",
    "Rules:",
    "- Choose one scene type only.",
    "- Do not list all possible topics for the time lord.",
    "- Do not name more than two life areas.",
    "- The scene must be something that could be noticed in ordinary life, including an internal state or body signal.",
    "- The final TLDR must stay inside this scene.",
    "- Do not explain every meaning of the time lord.",
    "- Do not turn the time lord into a fictional interaction. Venus can be a change in taste, satisfaction, attachment, ease, or cost without anyone asking for anything.",
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

function sourceMethodRules() {
  return [
    "SOURCE-INFORMED METHOD",
    "Use the reviewed books as method, not as wording.",
    "Synthesis rule: read systematically before summarizing. Do not let one factor become the whole interpretation unless it clearly outranks the rest.",
    "Daily horoscope rule: include lunar contacts for feeling and reaction. For longer timing, start with slower planets and then layer faster triggers.",
    "Transit rule: a transit becomes personal when it contacts the natal chart. Interpret the current planet, the natal planet or point, the house being activated, and the existing natal pattern.",
    "Skepticism rule: avoid Barnum statements, vague comfort, mystical opportunity language, and broad predictions. Specific does not mean inventing an event.",
    "Fit test: after drafting, ask whether the main copy still works if no external event happens. If it depends on a guessed event, rewrite it as a body signal, internal state, decision point, or task friction."
  ].join("\n");
}

function rewriteCorpusRules() {
  return [
    "REWRITE CORPUS FIELD MAP",
    "Use the rewrite examples as a translation guide, not as current facts.",
    "observableExperience, observableTendency, observableCurrentActivation: use these for lived effects and reader-facing observations.",
    "baseMeaningRewrite, symbolicStory, tldr: use these for the core astrology logic and plain-language summary.",
    "shadowPattern, pressurePoint, whereItCanBecomeDifficult: use these for what can get messy or where the friction lives.",
    "bestMove, whereItHelps, closingReflection: use these for grounded action language without visible labels.",
    "readerFacingSummary: use this for pacing and plain-language summary style.",
    "If the examples are not an exact match, use only the style and field logic. Never import a fact that is missing from ASTROLOGY FACTS."
  ].join("\n");
}

function natalPlacementPrimitiveRules() {
  return [
    "PRIMARY NATAL PLACEMENT PRIMITIVES",
    "Use these authored planet, sign, and house building blocks before generic placement rewrite rows.",
    "For sign blocks, prioritize the matching planet and sign notes.",
    "For house blocks, prioritize the matching planet and house notes.",
    "For full placement essays, synthesis, or legacy placement rows, synthesize planet + sign + house + ruler notes when available.",
    "sourceAnchors identify where the material came from. Do not quote or name the book in reader-facing copy.",
    "sourceNotes and voiceMoves are the preferred interpretation method. avoid lists wording and flattening patterns to stay away from."
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
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

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

function compactBody(value: string, maxLength = 1400) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trim()}...` : trimmed;
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

function countMatches(text: string, phrases: string[]) {
  const normalized = normalizeText(text);
  return phrases.filter((phrase) => normalized.includes(normalizeText(phrase))).length;
}

function matchedPhrases(text: string, phrases: string[]) {
  const normalized = normalizeText(text);
  return phrases.filter((phrase) => normalized.includes(normalizeText(phrase)));
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

function mainCopyText(draft: GeneratedAstrologyDraft) {
  return [
    draft.tldr,
    draft.summary,
    draft.body,
    draft.action,
    draft.timing,
    ...(draft.sections ?? []).flatMap((section) => [section.heading, section.body])
  ].filter(Boolean).join("\n");
}

function technicalAstrologyInMainCopy(draft: GeneratedAstrologyDraft) {
  const text = mainCopyText(draft);
  const normalized = normalizeText(text);
  const phraseMatches = technicalAstrologyMainCopyTerms.filter((term) => normalized.includes(normalizeText(term)));
  const aspectMechanics = /\b(conjunction|opposition|square|trine|sextile)\b/i.test(text);
  const houseMechanics = /\b\d+(st|nd|rd|th)\s+house\b/i.test(text);

  return {
    hasTechnicalAstrology: phraseMatches.length > 0 || aspectMechanics || houseMechanics,
    matches: phraseMatches
  };
}

function unsupportedExternalSceneInMainCopy(draft: GeneratedAstrologyDraft, facts?: Record<string, unknown>) {
  const text = mainCopyText(draft);
  const factText = normalizeText(JSON.stringify(facts ?? {}));
  const matches = matchedPhrases(text, unsupportedExternalScenePhrases);
  const factsSupportExternalScene = /\b(message|conversation|request|invitation|meeting|email|call|relationship|partner|friend|social|event)\b/i.test(factText);

  return {
    hasUnsupportedExternalScene: matches.length > 0 && !factsSupportExternalScene,
    matches
  };
}

function isNatalAspectGenerationContext(input: Pick<GenerateContentInput, "surface" | "eventType"> & { facts?: Record<string, unknown> }) {
  return [
    stringValue(input.facts?.blockType),
    stringValue(input.facts?.type),
    stringValue(input.eventType)
  ].some((value) => value === "natal_aspect" || comparableKey(value) === "natal-aspect");
}

function hasPersonalizedNatalAspectFacts(facts?: Record<string, unknown>) {
  const signA = stringValue(facts?.primarySign) || stringValue(facts?.placementSign) || stringValue(facts?.sign1) || stringValue(facts?.fromSign) || stringValue(facts?.planetASign);
  const signB = stringValue(facts?.aspectPlanetSign) || stringValue(facts?.otherSign) || stringValue(facts?.sign2) || stringValue(facts?.toSign) || stringValue(facts?.planetBSign);
  const houseA = stringValue(facts?.primaryHouse) || stringValue(facts?.placementHouse) || stringValue(facts?.house1) || stringValue(facts?.fromHouse) || stringValue(facts?.planetAHouse);
  const houseB = stringValue(facts?.aspectPlanetHouse) || stringValue(facts?.otherHouse) || stringValue(facts?.house2) || stringValue(facts?.toHouse) || stringValue(facts?.planetBHouse);

  return Boolean((signA && signB) || (houseA && houseB));
}

function clippedCommandListCadence(text: string) {
  const imperativeVerbs = new Set([
    "ask", "call", "choose", "clarify", "define", "decide", "do", "get", "listen", "make", "move", "name", "notice", "organize", "say", "send", "set", "speak", "start", "use", "write"
  ]);
  let consecutive = 0;

  for (const sentence of sentencesFrom(text)) {
    const words = sentence.replace(/^[^a-z]+/i, "").split(/\s+/).filter(Boolean);
    const firstWord = comparableKey(words[0]);
    const isShortCommand = words.length > 0 && words.length <= 8 && imperativeVerbs.has(firstWord);

    consecutive = isShortCommand ? consecutive + 1 : 0;

    if (consecutive >= 3) {
      return sentence;
    }
  }

  return "";
}

function natalAspectConditionalChartLanguage(text: string) {
  return sentencesFrom(text).find((sentence) => /\b(if this connects|if this is in|depending on your chart|when houses are available|wherever this lands|this may fall in|if your planet is|when present|when available|whichever house|could fall in|may fall in|if this moves through)\b/i.test(sentence)) ?? "";
}

function natalAspectTransitLanguage(text: string) {
  return sentencesFrom(text).find((sentence) => /\b(right now|today|this week|during this transit|while this is active|the next few days|use this window|currently|at this time|for now|this period|this moment|current weather|transit|transiting|forming|separating|sky window|date window|during this window)\b/i.test(sentence)) ?? "";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type PersonalizedNatalAspectFacts = {
  signA: string;
  signB: string;
  houseA: string;
  houseB: string;
};

function personalizedNatalAspectFacts(facts?: Record<string, unknown>): PersonalizedNatalAspectFacts {
  return {
    signA: stringValue(facts?.primarySign) || stringValue(facts?.placementSign) || stringValue(facts?.sign1) || stringValue(facts?.fromSign) || stringValue(facts?.planetASign),
    signB: stringValue(facts?.aspectPlanetSign) || stringValue(facts?.otherSign) || stringValue(facts?.sign2) || stringValue(facts?.toSign) || stringValue(facts?.planetBSign),
    houseA: stringValue(facts?.primaryHouse) || stringValue(facts?.placementHouse) || stringValue(facts?.house1) || stringValue(facts?.fromHouse) || stringValue(facts?.planetAHouse),
    houseB: stringValue(facts?.aspectPlanetHouse) || stringValue(facts?.otherHouse) || stringValue(facts?.house2) || stringValue(facts?.toHouse) || stringValue(facts?.planetBHouse)
  };
}

function ordinalHouseWord(value: string) {
  const number = Number.parseInt(value, 10);

  return [
    "",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
    "eleventh",
    "twelfth"
  ][number] ?? "";
}

function ordinalHouseNumber(value: string) {
  const number = Number.parseInt(value, 10);

  if (!Number.isFinite(number)) return "";

  const suffix = number % 100 >= 11 && number % 100 <= 13
    ? "th"
    : number % 10 === 1
      ? "st"
      : number % 10 === 2
        ? "nd"
        : number % 10 === 3
          ? "rd"
          : "th";

  return String(number) + suffix;
}

function signMentioned(text: string, sign: string) {
  return Boolean(sign && new RegExp("\\b" + escapeRegex(sign) + "\\b", "i").test(text));
}

function houseMentioned(text: string, house: string) {
  const numeric = ordinalHouseNumber(house);
  const word = ordinalHouseWord(house);
  const patterns = [
    numeric ? escapeRegex(numeric) + "\\s+house" : "",
    word ? escapeRegex(word) + "\\s+house" : "",
    "house\\s+" + escapeRegex(house)
  ].filter(Boolean);

  return patterns.some((pattern) => new RegExp("\\b" + pattern + "\\b", "i").test(text));
}

function hasHouseConnectionLanguage(text: string) {
  return /\b(tied to|connected to|connects|carries into|carry into|shows up through|becomes linked with|linked with|affects how|turns into pressure around|moves between|between|does not stay separate from|runs through|feeds into|has consequences for|becomes part of|spills into|interacts with|interplay between|pulls .* into|brings .* into)\b/i.test(text);
}

function housesConnectedInChartStory(text: string, firstHouse: string, secondHouse: string) {
  if (!firstHouse || !secondHouse) return true;

  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const sentences = sentencesFrom(text);
  const sentenceWindows = sentences.map((sentence, index) => [sentence, sentences[index + 1], sentences[index + 2]].filter(Boolean).join(" "));
  const candidates = [...paragraphs, ...sentenceWindows];

  return candidates.some((candidate) => (
    houseMentioned(candidate, firstHouse)
    && houseMentioned(candidate, secondHouse)
    && hasHouseConnectionLanguage(candidate)
  ));
}

function personalizedNatalAspectFactUsageFailure(text: string, facts?: Record<string, unknown>) {
  const personalizedFacts = personalizedNatalAspectFacts(facts);

  if (personalizedFacts.signA && !signMentioned(text, personalizedFacts.signA)) {
    return "missing planet A sign '" + personalizedFacts.signA + "' in body";
  }

  if (personalizedFacts.signB && !signMentioned(text, personalizedFacts.signB)) {
    return "missing planet B sign '" + personalizedFacts.signB + "' in body";
  }

  if (personalizedFacts.houseA && !houseMentioned(text, personalizedFacts.houseA)) {
    return "missing planet A house '" + personalizedFacts.houseA + "' in body";
  }

  if (personalizedFacts.houseB && !houseMentioned(text, personalizedFacts.houseB)) {
    return "missing planet B house '" + personalizedFacts.houseB + "' in body";
  }

  if (personalizedFacts.houseA && personalizedFacts.houseB && !housesConnectedInChartStory(text, personalizedFacts.houseA, personalizedFacts.houseB)) {
    return "houses " + personalizedFacts.houseA + " and " + personalizedFacts.houseB + " are not connected into one chart story";
  }

  return "";
}

function natalAspectVagueFiller(text: string) {
  return sentencesFrom(text).find((sentence) => /\b(you may notice|you might notice|notice how|a natural ease|natural ease|gentle expansion|subtle pressure|real movement forward|this pattern plays out steadily|the influence you feel|emotional needs with a sense of optimism|feel roomier|important conversations and choices throughout life|in response to any specific event or moment|everyday feelings feel roomier|try making|notice one way|mind tuned|private currents|wider presence|long-term success|expansive possibility|natural expansion|sense of faith|public standing|lived rhythm|neither flaw nor gift|larger framework|wider framework|unique shape|inner and outer life|vision into the world|not just inward|contributes to a wider)\b/i.test(sentence)) ?? "";
}

function natalAspectReportPhrase(text: string) {
  const reportPhrases = [
    "positions itself",
    "stands in for",
    "adds a layer",
    "the realm of",
    "arena of",
    "public role and long-term goals",
    "emotional transformation",
    "expansive ideals",
    "this exact pairing",
    "this exact trine shapes a pattern",
    "unlike a similar aspect",
    "the visible expression of one's values",
    "the visible expression of one’s values",
    "the way these signs and houses position the planets",
    "personal assets or pleasure",
    "shared transformation",
    "deep emotional connections",
    "larger emotional or financial webs",
    "visible achievement",
    "external results",
    "internal emotional process",
    "shapes your communication",
    "brings an emotional life",
    "loves to show affection",
    "the opposition between",
    "the square between",
    "the trine between",
    "the trine connects these two",
    "the opposition links",
    "the aspect links",
    "makes a bridge",
    "together, this pattern"
  ];

  return sentencesFrom(text).find((sentence) => {
    const normalizedSentence = normalizeText(sentence);
    return reportPhrases.some((phrase) => normalizedSentence.includes(normalizeText(phrase)));
  }) ?? "";
}

function natalAspectTextbookOpening(text: string) {
  const firstSentence = sentencesFrom(text)[0] ?? "";
  if (!firstSentence) {
    return "";
  }

  const bodies = "(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|north node|south node)";
  const signs = "(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)";
  const ordinal = "\\d+(?:st|nd|rd|th)";
  const textbookVerbs = "(shapes|brings|expresses|carries|adds|positions|stands|loves|pulls)";
  const pattern = new RegExp(
    "^\\s*(with\\s+)?"
    + bodies
    + "\\s+in\\s+"
    + signs
    + "\\s+in\\s+(your\\s+)?"
    + ordinal
    + "\\s+house\\s+"
    + textbookVerbs
    + "\\b",
    "i"
  );

  return pattern.test(firstSentence) ? firstSentence : "";
}

function qualityRetryInstruction(input: GenerateContentInput) {
  const facts = personalizedNatalAspectFacts(input.facts);

  if (isPersonalizedNatalPlacementAspectCard(input)) {
    const cardFacts = placementAspectCardFacts(input);

    return [
      "Regenerate the entire draft as an evergreen natal placement aspect card.",
      `The primary placement is ${displayAstroName(cardFacts.primaryPlanet)} in ${displayAstroName(cardFacts.primarySign)} in the ${ordinalHouseNumber(cardFacts.primaryHouse)} house.`,
      `The aspect card is ${comparableKey(cardFacts.aspectType)} ${displayAstroName(cardFacts.aspectPlanet)} in ${displayAstroName(cardFacts.aspectPlanetSign)} in the ${ordinalHouseNumber(cardFacts.aspectPlanetHouse)} house.`,
      "The body must explain what the aspect planet adds to the primary placement the user is reading.",
      "Use the project-authored placement-card source material first, then natal placement primitives, then source-backed aspect rows only for base aspect accuracy.",
      "Do not write a standalone aspect article, planet-by-planet report, current transit, daily update, conditional chart language, vague AI filler, clipped command-list cadence, or report-style phrases.",
      "Do not use banned self-help phrases such as step into, lean into, honor, release, unlock, cosmic, divine, or healing journey."
    ].join(" ");
  }

  if (isNatalAspectGenerationContext(input) && hasPersonalizedNatalAspectFacts(input.facts)) {
    const bodyA = stringValue(input.facts?.body1) || stringValue(input.facts?.from) || stringValue(input.facts?.planetA) || "body A";
    const bodyB = stringValue(input.facts?.body2) || stringValue(input.facts?.to) || stringValue(input.facts?.planetB) || "body B";

    return [
      "Regenerate the entire draft as evergreen natal copy.",
      `The body must explicitly include ${bodyA} in ${facts.signA} and ${bodyB} in ${facts.signB}.`,
      `The body must explicitly include the ${ordinalHouseNumber(facts.houseA)} house and the ${ordinalHouseNumber(facts.houseB)} house, and connect those houses in one chart story.`,
      "Do not use transit timing, current-sky language, conditional chart language, vague AI filler, clipped command-list cadence, or report-style phrases.",
      "Do not write a planet-by-planet report. Start from the lived pattern and weave the chart facts into one interpretation.",
      "Do not open with 'Planet in sign in house expresses/brings/shapes.' Do not use 'the aspect between these two' scaffolding."
    ].join(" ");
  }

  return "Regenerate the entire draft. Keep the factual headline. Write one direct human situation first. Use astrology as explanation only.";
}

function sentenceContainingViolation(text: string, violation: string) {
  return sentencesFrom(text).find((sentence) => hasBannedPhrase(sentence, violation))
    || sentencesFrom(text).find((sentence) => normalizeText(sentence).includes(normalizeText(violation)))
    || "";
}

function hardViolationReplacementDirection(violation: string, input: GenerateContentInput) {
  const phrase = normalizeText(violation);
  const facts = natalPlacementSourceFacts(input);
  const placement = [
    displayAstroName(facts.body),
    displayAstroName(facts.sign),
    facts.house ? `${ordinalHouseNumber(facts.house)} house` : ""
  ].filter(Boolean).join(" in ");
  const traditionalRuler = [
    displayAstroName(facts.traditionalRulerBody),
    displayAstroName(facts.traditionalRulerSign),
    facts.traditionalRulerHouse ? `${ordinalHouseNumber(facts.traditionalRulerHouse)} house` : ""
  ].filter(Boolean).join(" in ");

  if (phrase === "realm" || phrase === "arena" || phrase === "orbit") {
    return [
      "Replace the abstract container word with the specific life material from the chart.",
      "Do not use area, domain, sphere, field, zone, realm, arena, orbit, or similar container language.",
      "Use concrete wording such as study, beliefs, teaching, publishing, travel, home, family, daily routines, work, health, responsibility, role, money, relationships, body, or what the person is expected to handle.",
      placement ? `For this chart, name what ${placement} is doing in concrete life language.` : "",
      traditionalRuler ? `If the ruler thread is used, make ${traditionalRuler} concrete instead of abstract.` : ""
    ].filter(Boolean).join(" ");
  }

  if (phrase === "adds a layer") {
    return [
      "Do not use 'adds a layer' or any synonym that stacks astrology as an extra coating.",
      "Replace it with the actual chart behavior.",
      traditionalRuler
        ? `${traditionalRuler} should bring the idea back to the concrete topics of that ruler placement, not appear as an abstract addition.`
        : "Name what the second chart factor changes, pressures, supports, or makes harder in concrete life."
    ].join(" ");
  }

  if (phrase === "people with") {
    return "Do not write about people generally. Rewrite directly to the reader using you, your, or this placement in your chart.";
  }

  if (phrase === "future-oriented mindset" || phrase === "strong future orientation" || phrase === "progressive ideas") {
    return [
      "Do not use generic Aquarius filler.",
      "Translate the idea into behavior: questioning inherited beliefs, noticing group assumptions, testing ideas against real life, or seeing what people are agreeing to before they understand it."
    ].join(" ");
  }

  if (phrase === "links") {
    return [
      "Do not use 'links' as generic report scaffolding.",
      "Write the actual consequence in human language: what gets carried from one part of life into another, what becomes harder to ignore, or what has to be said, chosen, built, or stopped."
    ].join(" ");
  }

  if (phrase === "laced") {
    return "Do not use laced. Rewrite the sentence plainly without decorative texture language.";
  }

  if (phrase === "energy") {
    return [
      "Do not use energy as a placeholder.",
      "Name the actual function instead: confidence, attention, drive, pressure, stamina, desire, responsibility, curiosity, need, or the part of life being described."
    ].join(" ");
  }

  return [
    "Remove the violation completely.",
    "Do not swap in a synonym that keeps the same report-style problem.",
    "Rewrite the sentence in plain, concrete language tied to the supplied chart facts."
  ].join(" ");
}

function hardEditorialRetryInstruction(error: ContentGenerationHardEditorialError, failedDraft: GeneratedContent, input: GenerateContentInput) {
  const text = mainCopyText(failedDraft);
  const failures = error.violations.map((violation) => {
    const sentence = sentenceContainingViolation(text, violation);

    return [
      `Violation: ${JSON.stringify(violation)}.`,
      sentence ? `Failed sentence: ${JSON.stringify(sentence)}.` : "Failed sentence: not available from parsed draft.",
      `Correction: ${hardViolationReplacementDirection(violation, input)}`
    ].join("\n");
  });

  return [
    "HARD EDITORIAL VIOLATION RETRY",
    "The previous draft failed a hard editorial gate. Regenerate the entire JSON draft, but make a surgical repair for each violation below.",
    "Remove each banned phrase completely.",
    "Do not use a synonym that creates the same abstract, report-style, generic, or non-TLDR Astro problem.",
    "Rewrite the failed sentence in plain, concrete language using the supplied chart facts and authored astrology source material.",
    ...failures,
    "Approved replacement directions: use concrete life language such as work, beliefs, study, teaching, publishing, home, family, daily routines, health, money, relationships, body, responsibility, role, what the reader says, what they agree to, what they question, what they build, and what they stop carrying.",
    qualityRetryInstruction(input)
  ].join("\n");
}

function retryInstructionForError(error: Error, failedDraft: StoredGeneratedContent | null, input: GenerateContentInput) {
  if (error instanceof ContentGenerationHardEditorialError && failedDraft) {
    return hardEditorialRetryInstruction(error, failedDraft, input);
  }

  return qualityRetryInstruction(input);
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
    failedCodes.has("TECHNICAL_ASTROLOGY_IN_MAIN_COPY") ? "Reject this draft. The main card teaches astrology mechanics. Rewrite the main card as lived guidance only, with no time lord, profection, natal, house, transit-to-natal, or aspect terms. Put the astrology explanation only in astrologyDrilldown." : "",
    failedCodes.has("UNSUPPORTED_EXTERNAL_SCENE") ? "Reject this draft. It invented an external event that is not in the facts. Rewrite the main card as an internal state, body signal, decision point, or task friction that still fits if no one says or does anything obvious." : "",
    failedCodes.has("DRILLDOWN_TOO_THIN") ? "Add a concise astrologyDrilldown that answers 'Why this?' with the actual factors used, why this scene was chosen, and the timing strength." : "",
    failedCodes.has("TOO_MANY_LIFE_AREAS") ? "Do not mention more than two life areas." : "",
    failedCodes.has("NO_DOMINANT_STORYLINE") ? "Choose one main story. Do not give equal weight to every possible interpretation." : "",
    failedCodes.has("ASTROLOGY_OVERLOAD") ? "Lead with the plain situation. Use astrology facts only as support, not as the main language." : "",
    failedCodes.has("TEXTBOOK_PHRASE") ? "Remove textbook astrology phrasing. Rewrite the sentence in plain language." : "",
    failedCodes.has("GENERIC_ADVICE") ? "Give the user one specific, concrete next step. Make it direct, not therapeutic or vague." : "",
    failedCodes.has("RELATIONSHIP_COPY_TOO_ABSTRACT") ? "Rewrite relationship copy so it sounds normal and concrete. Avoid technical labels and soft self-help phrasing." : "",
    failures.some((failure) => failure.code === "SELF_HELP_TONE") ? "Make the tone more direct and less self-help or new-age." : ""
  ].filter(Boolean);

  return instructions.join(" ");
}

function hasEnoughSectionContent(sections: Array<{ heading?: string; body?: string }>) {
  return sections.filter((section) => stringValue(section.heading) && stringValue(section.body).length >= 40).length >= 2;
}

function isDailySkyFeedAspect(input: Pick<GenerateContentInput, "surface" | "mode" | "eventType"> & { facts?: Record<string, unknown> }) {
  const factType = stringValue(input.facts?.type);
  const aspect = stringValue(input.facts?.aspect);

  return input.surface === "sky"
    && input.mode === "feed"
    && (
      input.eventType === "current-aspect"
      || factType === "upcoming_aspect"
      || Boolean(aspect)
    );
}

function isTransitArticle(input: Pick<GenerateContentInput, "surface" | "mode" | "eventType"> & { facts?: Record<string, unknown> }) {
  if (isNatalAspectGenerationContext(input)) {
    return false;
  }

  const factType = stringValue(input.facts?.type);
  const contentType = stringValue(input.facts?.contentType);
  const eventType = normalizeText(input.eventType);

  return input.mode === "article" && (
    input.surface === "sky" ||
    eventType.includes("transit") ||
    eventType.includes("retrograde") ||
    eventType.includes("aspect") ||
    eventType.includes("ingress") ||
    eventType.includes("lunation") ||
    normalizeText(factType).includes("transit") ||
    normalizeText(factType).includes("retrograde") ||
    normalizeText(contentType).includes("transit")
  );
}

function requiredSectionHeadingsForInput(input: Pick<GenerateContentInput, "surface" | "mode" | "eventType"> & { facts?: Record<string, unknown> }) {
  if (isPrimaryNatalPlacementGeneration(input)) {
    return [];
  }

  if (isNatalAspectGenerationContext(input)) {
    return [];
  }

  if (isDailySkyFeedAspect(input)) {
    return [];
  }

  if (isTransitArticle(input)) {
    return [];
  }

  return requiredHeadingsByMode[input.mode] ?? [];
}

function sectionHeadingSetMatch(sectionHeadings: string[], required: string[]) {
  const normalizedSet = new Set(sectionHeadings.map((heading) => normalizeText(heading)));
  return required.filter((requiredHeading) => normalizedSet.has(normalizeText(requiredHeading)));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeWords(value: string) {
  return value.toLowerCase().trim();
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function loadSkyFrameworks() {
  try {
    const skyPath = path.join(process.cwd(), "packages/astro-knowledge/dist/sky.json");
    const sky = JSON.parse(fs.readFileSync(skyPath, "utf8")) as {
      frameworks?: FrameworkSnapshot[];
    };

    return asArray<FrameworkSnapshot>(sky.frameworks);
  } catch {
    return [];
  }
}

function formatFrameworkSection(framework: FrameworkSnapshot | undefined, sectionId: string) {
  const section = asArray<FrameworkSection>(framework?.sections).find((item) => item?.id === sectionId);

  if (!section) {
    return "";
  }

  const body = stringValue(section.body);
  const lines = [section.heading ? `${section.heading}: ${body}` : body].filter(Boolean);
  const items = asArray<{ label?: string; body?: string }>(section.items).map((item) => {
    const label = stringValue(item.label);
    const itemBody = stringValue(item.body);
    return label || itemBody ? `- ${label}: ${itemBody}`.replace(/- : /g, "- ") : "";
  }).filter(Boolean);

  if (items.length) {
    lines.push("", "Items:", ...items);
  }

  return lines.join("\n");
}

function formatLunationTemplateInstruction(input: GenerateContentInput) {
  if (input.surface !== "sky") {
    return "";
  }

  const sourceSnapshot = isRecord(input.sourceSnapshot) ? input.sourceSnapshot : {};
  let frameworks = asArray<FrameworkSnapshot>(sourceSnapshot.frameworks);

  if (!frameworks.length) {
    frameworks = loadSkyFrameworks();
  }

  const architecture = asArray<FrameworkSnapshot>(frameworks).find((framework) => framework?.id === SKY_LUNATION_FRAMEWORK_ID);
  const ritual = asArray<FrameworkSnapshot>(frameworks).find((framework) => framework?.id === SKY_LUNATION_RITUAL_ID);

  if (!architecture) {
    return "";
  }

  const moonEvent = factRecord(input.facts, "moonEvent");
  const eventSignature = normalizeWords(stringValue(moonEvent?.name) || stringValue(input.facts.type) || input.eventType);
  const eventLabel = slug(eventSignature).includes("full")
    ? "full moon"
    : slug(eventSignature).includes("new")
      ? "new moon"
      : slug(eventSignature).includes("eclipse")
        ? "eclipse"
        : "";

  const modeLine = input.mode === "feed"
    ? "Use Feed Mode structure for brief timing-focused delivery."
    : input.mode === "in_depth"
      ? "Use In-Depth Mode with mechanism, behavior, and integration."
      : "Use Article Mode with clear sections and reflective practical close.";

  const cardStructure = formatFrameworkSection(architecture, "sky-card-structure");
  const planetaryContext = formatFrameworkSection(architecture, "planetary-context");
  const houseSignLinking = formatFrameworkSection(architecture, "house-and-sign-bridging");
  const toneGuide = formatFrameworkSection(architecture, "tone-guide");

  const eventSection = asArray<FrameworkSection>(architecture.sections).find((section) => section?.id === "lunar-event-templates");
  const eventItem = eventSection
    ? asArray<{ label?: string; body?: string }>(eventSection.items).find((item) => {
        const label = normalizeWords(stringValue(item.label));
        return eventLabel ? label.includes(eventLabel) : false;
      })
    : undefined;

  const eventGuidance = eventItem
    ? `LUNAR EVENT TEMPLATE (${stringValue(eventItem.label)}): ${stringValue(eventItem.body)}`
    : "Choose the strongest lunar event template from the framework by event type.";

  const modeSection = formatFrameworkSection(architecture, "content-modes");
  const modeGuidance = modeSection || `Use ${input.mode.replace("_", " ").toUpperCase()} mode guidance from the framework.`;

  const ritualNotes = ritual ? `RITUAL PRACTICE FRAMEWORK (reference):\n${JSON.stringify(ritual, null, 2)}` : "";
  const sourceMode = eventSignature ? `LUNATION EVENT: ${eventSignature}.` : "";

  return [
    "LUNATION FRAMEWORK",
    sourceMode,
    modeLine,
    modeGuidance,
    modeSection ? `Mode section:\n${modeSection}` : "",
    cardStructure ? `Sky Card Structure:\n${cardStructure}` : "",
    eventGuidance ? `Event-specific guidance:\n${eventGuidance}` : "",
    planetaryContext ? `Planetary context:\n${planetaryContext}` : "",
    houseSignLinking ? `House/sign bridging:\n${houseSignLinking}` : "",
    toneGuide ? `Tone guide:\n${toneGuide}` : "",
    ritualNotes
  ].filter(Boolean).join("\n\n");
}

type SynastryExampleKey = keyof typeof synastryLivedExampleBank;

function synastryExampleKey(value: string): SynastryExampleKey | undefined {
  const normalized = slug(value);
  const aliases: Record<string, SynastryExampleKey> = {
    asc: "ascendant",
    ascendant: "ascendant",
    rising: "ascendant",
    mc: "midheaven",
    midheaven: "midheaven",
    mercury: "mercury",
    venus: "venus",
    mars: "mars",
    jupiter: "jupiter",
    saturn: "saturn",
    chiron: "chiron",
    lilith: "lilith",
    "black-moon-lilith": "lilith",
    uranus: "uranus",
    neptune: "neptune",
    pluto: "pluto"
  };

  return aliases[normalized];
}

function isSynastryAspectInput(input: GenerateContentInput) {
  const blockType = stringValue(input.facts.blockType);
  return blockType === "synastry_aspect"
    || (
      input.surface === "synastry"
      && (
        input.eventType.includes("synastry-aspect")
        || input.eventType.includes("synastry-contact")
      )
    );
}

function selectedSynastryExampleBank(input: GenerateContentInput) {
  const facts = input.facts;
  const candidates = [
    stringValue(facts.body1),
    stringValue(facts.planetA),
    stringValue(facts.from),
    stringValue(facts.body2),
    stringValue(facts.planetB),
    stringValue(facts.to),
    input.headline ?? "",
    input.contentKey
  ];
  const keys = new Set<SynastryExampleKey>();

  for (const candidate of candidates) {
    const directKey = synastryExampleKey(candidate);
    if (directKey) {
      keys.add(directKey);
      continue;
    }

    for (const part of candidate.split(/[^A-Za-z]+/)) {
      const partKey = synastryExampleKey(part);
      if (partKey) {
        keys.add(partKey);
      }
    }
  }

  const selectedKeys = keys.size ? [...keys] : Object.keys(synastryLivedExampleBank) as SynastryExampleKey[];

  return selectedKeys.reduce<Record<string, readonly string[]>>((bank, key) => {
    bank[`${key}_examples`] = synastryLivedExampleBank[key];
    return bank;
  }, {});
}

function synastryWritingSystemPrompt(input: GenerateContentInput) {
  if (!isSynastryAspectInput(input)) {
    return "";
  }

  const bank = selectedSynastryExampleBank(input);

  return [
    "SYNASTRY WRITING SYSTEM",
    "Use this for client-facing synastry aspect copy.",
    "",
    "POV AND QUESTION",
    "Anchor the POV on the reader looking at a friend's planet contacting the reader's chart.",
    "The main question is: what does this person bring out in me?",
    "Lead with how one person makes the other feel in plain language, then translate the astrology into daily relationship experience.",
    "Use names when supplied in ASTROLOGY FACTS. Be direct, specific, and human.",
    "Do not explain astrology mechanics in the body. The title already carries the chart label.",
    "Do not overstate fate, trauma, permanence, compatibility, or harm.",
    "",
    "STRUCTURE",
    "Open with the felt experience of being around this person.",
    "Explain what one person brings out in the other and how it may feel on both sides.",
    "For supportive aspects, name what feels easy, then name the catch: comfort can replace facing the issue, or encouragement can pass for progress.",
    "For challenging aspects, name the concrete mismatch, expectation, or recurring tension without making either person the villain.",
    "For conjunctions, write immediacy and concentration.",
    "For oppositions, write reflection, polarity, projection, or one part of life pulling against another.",
    "End with one practical move in plain language.",
    "If writing a TLDR, use three short sentences: the feeling, why it works, and one thing to watch.",
    "",
    "LIVED EXAMPLES",
    "Use one or two examples maximum, only where they naturally fit inside a paragraph.",
    "Do not ask the model to invent examples. Do not create new examples. If you include an example, use one of the approved examples below verbatim or lightly adapted only for pronouns/names.",
    "Do not turn examples into bullets or a list.",
    "Keep examples optional with may, can, or you may notice.",
    JSON.stringify(bank, null, 2),
    "",
    "LANGUAGE RULES",
    "Never use em dashes.",
    "Do not use the word real as a filler modifier.",
    "Avoid overusing ease or discomfort.",
    "Avoid phrases like their energy reaches your private side, their emotional world connects with your direction, who they are connects with, or this aspect activates.",
    "Do not overuse the thing to watch, give it somewhere to go, or this connection works best when.",
    "Banned words and phrases: soulmate, twin flame, karmic contract, meant to be, toxic, destined, guaranteed, the hard thing, hold space, deeply affirming, masquerade.",
    "",
    "GOOD SHAPE",
    "{{personA}}'s Mars opposes your Midheaven, so they may interrupt the part of you that is trying to stay focused, visible, or in control. You may be trying to finish a project, hold a role, meet a deadline, or stay composed in public, and suddenly their urgency brings up what is happening behind the scenes.",
    "",
    "BAD SHAPE",
    "Do not write: {{personA}}'s Mars opposes your Midheaven, so their Mars energy activates your IC axis."
  ].join("\n");
}

function natalPlacementFactInstruction(input: GenerateContentInput) {
  const facts = input.facts;
  const type = stringValue(facts.type) || input.eventType;
  const blockType = stringValue(facts.blockType);
  const placementSourceFacts = natalPlacementSourceFacts(input);
  const placementBody = placementSourceFacts.body;
  const placementSign = placementSourceFacts.sign;
  const placementHouse = placementSourceFacts.house;
  const rulerBody = stringValue(facts.rulerBody) || stringValue(facts.ruler) || stringValue(facts.houseRuler);
  const rulerSign = stringValue(facts.rulerSign) || stringValue(facts.houseRulerSign);
  const rulerHouse = stringValue(facts.rulerHouse) || stringValue(facts.houseRulerHouse);
  const traditionalRulerBody = placementSourceFacts.traditionalRulerBody || rulerBody;
  const traditionalRulerSign = placementSourceFacts.traditionalRulerSign || rulerSign;
  const traditionalRulerHouse = placementSourceFacts.traditionalRulerHouse || rulerHouse;
  const modernRulerBody = placementSourceFacts.modernRulerBody;
  const modernRulerSign = placementSourceFacts.modernRulerSign;
  const modernRulerHouse = placementSourceFacts.modernRulerHouse;
  const aspectBodyA = stringValue(facts.body1) || stringValue(facts.planetA) || stringValue(facts.from);
  const aspectBodyB = stringValue(facts.body2) || stringValue(facts.planetB) || stringValue(facts.to);
  const aspectType = stringValue(facts.aspect);
  const aspectSignA = blockType === "natal_aspect"
    ? stringValue(facts.sign1) || stringValue(facts.fromSign) || stringValue(facts.planetASign)
    : stringValue(facts.sign1) || stringValue(facts.fromSign) || stringValue(facts.transitSign) || stringValue(facts.planetASign);
  const aspectSignB = blockType === "natal_aspect"
    ? stringValue(facts.sign2) || stringValue(facts.toSign) || stringValue(facts.planetBSign)
    : stringValue(facts.sign2) || stringValue(facts.toSign) || stringValue(facts.natalSign) || stringValue(facts.planetBSign);
  const aspectHouseA = stringValue(facts.house1) || stringValue(facts.fromHouse) || stringValue(facts.planetAHouse);
  const aspectHouseB = blockType === "natal_aspect"
    ? stringValue(facts.house2) || stringValue(facts.toHouse) || stringValue(facts.planetBHouse)
    : stringValue(facts.house2) || stringValue(facts.toHouse) || stringValue(facts.natalHouse) || stringValue(facts.planetBHouse);
  const exactDate = stringValue(facts.exactDate) || input.targetDate || "";
  const direction = stringValue(facts.direction);
  const orb = stringValue(facts.orb);

  if (blockType.endsWith("_aspect")) {
    const commonRules = [
      "ASPECT FAMILY FACT LOCK",
      `Block type: ${blockType}.`,
      `Body A: ${aspectBodyA || "missing"}.`,
      `Aspect: ${aspectType || "missing"}.`,
      `Body B: ${aspectBodyB || "missing"}.`,
      "No em dashes."
    ];

    if (blockType === "natal_aspect") {
      const hasSigns = Boolean(aspectSignA && aspectSignB);
      const hasHouses = Boolean(aspectHouseA && aspectHouseB);
      const personalizedRules = [
        "Family: natal aspect. This is evergreen natal wiring, not sky weather or a transit.",
        "Natal sign A: " + (aspectSignA || "missing") + ".",
        "Natal house A: " + (aspectHouseA || "missing") + ".",
        "Natal sign B: " + (aspectSignB || "missing") + ".",
        "Natal house B: " + (aspectHouseB || "missing") + ".",
        "Orb/strength: " + (orb || "missing") + ".",
        "Use the signs and houses as known chart facts when they are supplied. Do not write conditional chart language such as 'if this connects to your 3rd house' or 'depending on your chart'.",
        "Do not use current-weather language such as right now, today, this week, currently, transit, forming, or separating.",
        "You must use the supplied signs and houses in the body. Do not treat them as optional. Do not write generic planet-pair copy when chart facts are supplied.",
        `The body must explicitly name "${aspectBodyA} in ${aspectSignA || "the supplied sign"}" and "${aspectBodyB} in ${aspectSignB || "the supplied sign"}" when signs are supplied.`,
        hasHouses
          ? `The body must explicitly name both the ${ordinalHouseNumber(aspectHouseA)} house and the ${ordinalHouseNumber(aspectHouseB)} house, then connect those two houses in one chart story.`
          : "Do not invent house language when houses are missing.",
        hasHouses
          ? `Include one natural sentence that names both the ${ordinalHouseNumber(aspectHouseA)} house and the ${ordinalHouseNumber(aspectHouseB)} house and uses a connection verb such as connects, ties, carries, pulls, or brings.`
          : "",
        "Let the signs change how the planets behave and let the houses change where the pattern is lived. Do not compare this to the same aspect in other signs or houses.",
        "Write the planets, aspect type, signs, and houses as one chart-specific natal interpretation. The signs and houses should change the meaning, not sit beside it as labels.",
        "Do not produce a planet-by-planet report. Do not write one sentence for planet A, one sentence for planet B, and one sentence explaining the aspect. Weave the chart facts into a natural interpretation.",
        "Do not open with a textbook construction such as 'Mercury in Cancer in the 3rd house shapes,' 'Venus in Leo in the 2nd house loves,' or 'Moon in Scorpio in the 6th house brings.' Open from the lived pattern while naming the chart facts naturally.",
        "Use concrete life language instead of stiff abstractions. Prefer money, value, desire, affection, trust, debt, intimacy, family patterns, work, reputation, authority, responsibility, daily conversations, routines, health, pressure, and what other people expect.",
        "Do not use report phrases such as positions itself, stands in for, adds a layer, the realm of, arena of, public role and long-term goals, emotional transformation, expansive ideals, this exact pairing, unlike a similar aspect, or the way these signs and houses position the planets.",
        "Do not write 'the square between these two,' 'the opposition between these two,' 'the trine between these two,' 'the aspect links,' or similar scaffolding. Make the connection human: what the reader says, wants, owes, carries, hides, earns, shares, protects, or is expected to handle.",
        "Good openings sound like: 'With Mercury in Cancer in your 3rd house, words are not separate from memory.' Or: 'With Venus in Leo in your 2nd house, being wanted and being valued can get tangled together.' Or: 'With the Moon in Scorpio in your 6th house, daily life is rarely just daily life.' Use these as voice examples, not as templates.",
        "End by naming what becomes easier to say, recognize, choose, or stop carrying. Do not end with a generalized summary about a unique shape, a wider presence, a larger framework, or inner and outer life.",
        "Avoid vague AI astrology filler such as 'You may notice,' 'You might notice,' 'Notice how,' 'natural ease,' 'gentle expansion,' 'subtle pressure,' 'real movement forward,' 'This pattern plays out steadily,' and 'the influence you feel.' Open with specific chart language instead.",
        "Do not use the words energy, perform, or integration. Do not use dash punctuation. Use commas, periods, or semicolons instead. Do not give today advice. Do not write 'try making,' 'notice one way,' 'notice how,' or any instruction that sounds like a current transit prompt."
      ];

      if (hasSigns || hasHouses) {
        return [
          ...commonRules,
          ...personalizedRules,
          hasHouses
            ? "Connect the houses directly as the life areas where this natal wiring is lived."
            : "Houses are not fully supplied, so do not mention houses or imply missing house data.",
          "Write in the warm natal voice. Keep it natal and chart-specific."
        ].join("\n");
      }

      return [
        ...commonRules,
        "Family: base natal aspect. This is evergreen natal wiring.",
        "Inputs are pair and type only. Do not mention dates, current timing, orb, forming, separating, signs, houses, transits, or now.",
        "Write in the warm natal voice. Keep it reusable for anyone with this aspect."
      ].join("\n");
    }

    if (blockType === "sky_aspect") {
      return [
        ...commonRules,
        "Family: sky aspect. This is current collective weather.",
        `Current sign A: ${aspectSignA || "missing"}.`,
        `Current sign B: ${aspectSignB || "missing"}.`,
        `Exact/date window: ${exactDate || "missing"}.`,
        `Orb: ${orb || "missing"}.`,
        `Forming/separating: ${direction || "missing"}.`,
        "Use the ephemeris facts above as source of truth. If timing, signs, or orb are missing, keep the copy generic about the pair and do not invent the missing timing.",
        "Write in present tense, practical transit voice. It may say the full aspect with signs, such as Mercury in Cancer sextile Mars in Taurus."
      ].join("\n");
    }

    if (blockType === "transit_to_natal_aspect") {
      return [
        ...commonRules,
        "Family: transit to natal aspect. This is touching the member's chart right now.",
        `Transiting sign: ${aspectSignA || "missing"}.`,
        `Natal sign: ${aspectSignB || "missing"}.`,
        `Natal house: ${aspectHouseB || "missing"}.`,
        `Exact/date window: ${exactDate || "missing"}.`,
        `Orb: ${orb || "missing"}.`,
        `Forming/separating: ${direction || "missing"}.`,
        "Preserve direction: Body A is the transiting planet, Body B is the member's natal planet.",
        "Use personalized transit voice. Do not treat this as natal wiring."
      ].join("\n");
    }

    if (blockType === "synastry_aspect") {
      return [
        ...commonRules,
        "Family: synastry aspect. This is a directional relationship dynamic between two charts.",
        `Person A body sign: ${aspectSignA || "missing"}.`,
        `Person A body house: ${aspectHouseA || "missing"}.`,
        `Person B body sign: ${aspectSignB || "missing"}.`,
        `Person B body house: ${aspectHouseB || "missing"}.`,
        "Preserve direction: Person A's body to Person B's body. Do not canonicalize or reverse the meaning.",
        "Write the body from the reader's lived experience of the other person's contact, not as abstract compatibility mechanics.",
        "Name the felt effect first, then the practical pattern, then one concrete move.",
        "Use one or two approved lived examples from the Synastry Writing System when they fit. Do not invent examples.",
        "No therapy-speak, no fate language, no soulmate language."
      ].join("\n");
    }

    if (blockType === "composite_aspect") {
      return [
        ...commonRules,
        "Family: composite aspect. This is the relationship's shared chart pattern.",
        `Composite sign A: ${aspectSignA || "missing"}.`,
        `Composite house A: ${aspectHouseA || "missing"}.`,
        `Composite sign B: ${aspectSignB || "missing"}.`,
        `Composite house B: ${aspectHouseB || "missing"}.`,
        "The pair is symmetric and reusable for the relationship's shared pattern. Do not write this as either person's natal wiring.",
        "Relationship voice kit is not final yet, so write direct plain relationship copy. No therapy-speak, no fate language, no soulmate language."
      ].join("\n");
    }
  }

  if (input.surface === "natal" && blockType && blockType !== "essay" && blockType !== "synthesis") {
    const commonRules = [
      "NATAL MODULAR BLOCK FACT LOCK",
      `Block type: ${blockType}.`,
      "Write this as one reusable interpretation block, not a full placement essay.",
      "Only interpret the facts listed for this block. Do not import missing sign, house, ruler, or aspect details from examples."
    ];

    if (blockType === "sign") {
      return [
        ...commonRules,
        `Placement body: ${placementBody || "missing"}.`,
        `Placement sign: ${placementSign || "missing"}.`,
        "Write only the body-in-sign meaning. Do not mention house, ruler placement, timing, or aspects."
      ].join("\n");
    }

    if (blockType === "house") {
      return [
        ...commonRules,
        `Placement body: ${placementBody || "missing"}.`,
        `Placement house: ${placementHouse || "missing"}.`,
        "Write only how this body expresses through this house. Do not mention sign, ruler placement, timing, or aspects."
      ].join("\n");
    }

    if (blockType === "ruler") {
      return [
        ...commonRules,
        `Ruler body: ${rulerBody || placementBody || "missing"}.`,
        "Write only a reusable ruler/dispositor meaning for this ruling body. Do not mention a specific sign or house unless those facts are explicitly provided."
      ].join("\n");
    }

  }

  const isNatalPlacement = input.eventType.includes("natal-placement")
    || type === "natal_placement"
    || (input.surface === "natal" && Boolean(stringValue(facts.sign) && stringValue(facts.house)));

  if (!isNatalPlacement) {
    return "";
  }

  const retrogradeValue = facts.retrograde ?? facts.isRetrograde;
  const isRetrograde = retrogradeValue === true || (typeof retrogradeValue === "string" && retrogradeValue.toLowerCase() === "true");
  const isNode = ["north node", "south node", "true node"].includes(placementBody.toLowerCase());

  return [
    "NATAL PLACEMENT FACT LOCK",
    "This is a natal placement. These placement facts are required source facts, not optional color.",
    `Placement body: ${placementBody || "missing"}.`,
    `Placement sign: ${placementSign || "missing"}.`,
    `Placement house: ${placementHouse || "missing"}.`,
    `Traditional ruler: ${traditionalRulerBody || "missing"}.`,
    `Traditional ruler sign in this chart: ${traditionalRulerSign || "missing"}.`,
    `Traditional ruler house in this chart: ${traditionalRulerHouse || "missing"}.`,
    `Modern ruler: ${modernRulerBody || "none"}.`,
    `Modern ruler sign in this chart: ${modernRulerSign || "missing"}.`,
    `Modern ruler house in this chart: ${modernRulerHouse || "missing"}.`,
    `Retrograde: ${isNode ? "not applicable for nodes" : isRetrograde ? "yes" : "no"}.`,
    "Write the placement as the body or node in its sign, expressed through its house.",
    "Use the traditional ruler placement as the main chart-specific route: its sign and house show where this placement develops, routes, or becomes easier to recognize in lived experience.",
    "If a modern ruler is provided, use it as an additional modern/outer-planet layer, not a replacement for the traditional ruler.",
    "Do not skip the house. Do not skip available ruler placements when ruler sign and ruler house are provided.",
    "For North Node and South Node, never mention retrograde. Treat them as valid placements with sign, house, and sign ruler."
  ].join("\n");
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
  if (isPrimaryNatalPlacementGeneration(input)) {
    const natalTitle = natalPlacementTitleFromFacts(natalPlacementSourceFacts(input));
    if (natalTitle) {
      return natalTitle;
    }
  }

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

function loadSourceBackedRevisionCorpora() {
  const corporaRoot = path.join(process.cwd(), "packages/astro-knowledge/generated/tldr-astro/source-backed-revisions");

  return listJsonFiles(corporaRoot).flatMap((filePath) => {
    try {
      return [JSON.parse(fs.readFileSync(filePath, "utf8")) as SourceBackedRevisionCorpus];
    } catch {
      return [];
    }
  });
}

function loadNatalPlacementPrimitiveCorpora() {
  const corporaRoot = path.join(process.cwd(), "packages/astro-knowledge/generated/tldr-astro/natal-placement-primitives");

  return listJsonFiles(corporaRoot).flatMap((filePath) => {
    try {
      return [JSON.parse(fs.readFileSync(filePath, "utf8")) as NatalPlacementPrimitiveCorpus];
    } catch {
      return [];
    }
  });
}

function loadAuthoredPlacementCorpora() {
  const corporaRoot = path.join(process.cwd(), "packages/astro-knowledge/generated/tldr-astro/authored-placements");

  return listJsonFiles(corporaRoot).flatMap((filePath) => {
    try {
      return [JSON.parse(fs.readFileSync(filePath, "utf8")) as AuthoredPlacementCorpus];
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

function comparableKey(value?: string) {
  return stringValue(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function displayAstroName(value?: string) {
  const key = comparableKey(value);

  if (!key) return "";

  return key.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function repoSourcePath(relativePath: string) {
  return `packages/astro-knowledge/data/${relativePath}`;
}

function readProjectJson(relativePath: string): Record<string, unknown> | null {
  const filePath = path.join(process.cwd(), repoSourcePath(relativePath));

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sourceExcerpt(value: unknown) {
  const text = stringValue(value).trim();

  return text.length > 900 ? `${text.slice(0, 900).trim()}...` : text;
}

function pushProjectSource(
  sources: ProjectAuthoredNatalSource[],
  role: string,
  relativePath: string,
  data: Record<string, unknown> | null,
  excerpts: unknown[]
) {
  const cleanExcerpts = excerpts.map(sourceExcerpt).filter(Boolean);

  if (!data || !cleanExcerpts.length) {
    return;
  }

  sources.push({
    role,
    sourcePath: repoSourcePath(relativePath),
    id: stringValue(data.id),
    title: stringValue(data.title) || stringValue(data.label) || stringValue(data.name),
    excerpts: cleanExcerpts
  });
}

function arrayRecordValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function primitiveEntry(relativePath: string, id: string) {
  const data = readProjectJson(relativePath);
  const entries = arrayRecordValue(data?.entries);
  const key = comparableKey(id);

  return entries.find((entry) => comparableKey(stringValue(entry.id) || stringValue(entry.label) || stringValue(entry.name)) === key) ?? null;
}

function ordinalHouseKey(value?: string) {
  const key = comparableKey(value);
  const match = key.match(/\d+/);

  return match ? match[0] : "";
}

function houseLabel(value?: string) {
  const ordinal = ordinalHouseNumber(ordinalHouseKey(value));

  return ordinal ? `${ordinal} house` : "";
}

function natalPlacementTitleFromFacts(facts: ReturnType<typeof natalPlacementSourceFacts>) {
  const body = displayAstroName(facts.body);
  const sign = displayAstroName(facts.sign);
  const house = houseLabel(facts.house);

  return [body, sign, house].every(Boolean)
    ? `${body} in ${sign} in the ${house}`
    : "";
}

function authoredPlacementEntries() {
  return loadAuthoredPlacementCorpora().flatMap((corpus) => arrayRecordValue(corpus.entries) as AuthoredPlacementEntry[]);
}

function authoredPlacementHouseId(value?: string) {
  const ordinal = ordinalHouseNumber(ordinalHouseKey(value));

  return ordinal ? ordinal + "-house" : "";
}

function authoredPlacementMatchId(matchType: string, facts: ReturnType<typeof natalPlacementSourceFacts>) {
  const type = comparableKey(matchType).replace(/-/g, "_");
  const body = comparableKey(facts.body);
  const sign = comparableKey(facts.sign);
  const house = authoredPlacementHouseId(facts.house);

  if (type === "planet_sign_house") return [body, sign, house].filter(Boolean).join("-");
  if (type === "planet_sign") return [body, sign].filter(Boolean).join("-");
  if (type === "sign_house") return [sign, house].filter(Boolean).join("-");
  if (type === "planet_house") return [body, house].filter(Boolean).join("-");
  if (type === "planet") return body;
  if (type === "sign") return sign;
  if (type === "house") return house;

  return "";
}

function authoredPlacementEntryMatches(entry: AuthoredPlacementEntry, matchType: string, facts: ReturnType<typeof natalPlacementSourceFacts>) {
  const expectedId = authoredPlacementMatchId(matchType, facts);
  const entryId = comparableKey(entry.id);

  if (expectedId && entryId === expectedId) {
    return true;
  }

  const type = comparableKey(entry.matchType).replace(/-/g, "_");

  if (type !== matchType) {
    return false;
  }

  const body = comparableKey(facts.body);
  const sign = comparableKey(facts.sign);
  const house = ordinalHouseKey(facts.house);

  if (matchType.includes("planet") && comparableKey(entry.planet) !== body) return false;
  if (matchType.includes("sign") && comparableKey(entry.sign) !== sign) return false;
  if (matchType.includes("house") && ordinalHouseKey(entry.house) !== house) return false;

  return true;
}

function authoredNatalPlacementMatches(facts: ReturnType<typeof natalPlacementSourceFacts>) {
  const entries = authoredPlacementEntries();
  const priority = [
    "planet_sign_house",
    "planet_sign",
    "sign_house",
    "planet_house",
    "planet",
    "sign",
    "house"
  ];

  return priority.flatMap((matchType) => {
    const entry = entries.find((candidate) => authoredPlacementEntryMatches(candidate, matchType, facts));

    return entry ? [{ matchType, entry }] : [];
  });
}

function authoredPlacementAppBody(entry: AuthoredPlacementEntry) {
  const status = comparableKey(entry.editStatus);

  if (!["approved", "published", "live"].includes(status)) {
    return "";
  }

  return stringValue(entry.appBody) || stringValue(entry.body);
}

function authoredPlacementParagraphs(entry: AuthoredPlacementEntry) {
  return authoredPlacementAppBody(entry)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function compositeAuthoredNatalPlacementBody(matches: Array<{ matchType: string; entry: AuthoredPlacementEntry }>) {
  const paragraphs = matches.map((match) => authoredPlacementParagraphs(match.entry));
  const firstParagraph = paragraphs.map((parts) => parts[0]).filter(Boolean).join(" ");
  const secondParagraph = paragraphs.map((parts) => parts.slice(1).join(" ")).filter(Boolean).join(" ");

  return [firstParagraph, secondParagraph].filter(Boolean).join("\n\n");
}

function authoredNatalPlacementBody(facts: ReturnType<typeof natalPlacementSourceFacts>) {
  const matches = authoredNatalPlacementMatches(facts);
  const exact = matches.find((match) => match.matchType === "planet_sign_house" && authoredPlacementAppBody(match.entry));

  if (exact) {
    return {
      sourceType: "exact-authored",
      matches: [exact],
      body: authoredPlacementAppBody(exact.entry)
    };
  }

  const composite = matches.filter((match) => authoredPlacementAppBody(match.entry));

  if (composite.length) {
    return {
      sourceType: "composite-authored",
      matches: composite,
      body: compositeAuthoredNatalPlacementBody(composite)
    };
  }

  return {
    sourceType: "deterministic-fallback",
    matches: [],
    body: ""
  };
}

function aspectDisplayLabel(value?: string) {
  const aspect = canonicalAspectKey(value);

  if (aspect === "opposition") return "Opposite";
  if (aspect === "conjunction") return "Conjunct";
  if (aspect === "square") return "Square";
  if (aspect === "trine") return "Trine";
  if (aspect === "sextile") return "Sextile";

  return displayAstroName(aspect);
}

function lowerAspectDisplayLabel(value?: string) {
  const label = aspectDisplayLabel(value);

  return label ? label.toLowerCase() : "aspect";
}

function deterministicPlanetFunction(planet: string) {
  const key = comparableKey(planet);
  const byPlanet: Record<string, string> = {
    sun: "identity, confidence, vitality, and direction",
    moon: "response, memory, protection, need, and the body signals that keep asking for attention",
    mercury: "noticing, thinking, speaking, deciding, and making sense of what is happening",
    venus: "value, affection, taste, loyalty, giving, receiving, and what feels worth keeping",
    mars: "action, defense, pursuit, desire, anger, and the way a choice becomes movement",
    jupiter: "belief, confidence, learning, judgment, and the desire to make meaning from experience",
    saturn: "pressure, responsibility, limits, timing, discipline, and what has to become solid",
    uranus: "disruption, distance, invention, refusal, and the need to break a pattern that has stopped working",
    neptune: "longing, imagination, sensitivity, idealization, and the pull toward what cannot be fully proven",
    pluto: "power, control, exposure, survival, and the places where something cannot stay buried",
    chiron: "the sore point that keeps teaching you what needs care, skill, and language",
    "north-node": "growth, appetite, risk, and the unfamiliar direction that keeps pulling you forward",
    "south-node": "habit, memory, old skill, and the familiar pattern that can become too automatic"
  };

  return byPlanet[key] ?? "attention, choice, and the way this part of the chart works";
}

function planetSubjectName(planet: string) {
  const name = displayAstroName(planet);
  const key = comparableKey(planet);

  return ["sun", "moon"].includes(key) ? `the ${name}` : name;
}

function deterministicSignExpression(sign: string) {
  const key = comparableKey(sign);
  const bySign: Record<string, string> = {
    aries: "directness, urgency, courage, and the need to act before everything is settled",
    taurus: "steadiness, appetite, repetition, patience, and the need for something that can hold",
    gemini: "language, movement, comparison, curiosity, and the need to keep the mind in motion",
    cancer: "memory, protection, family patterning, and what feels personal enough to name",
    leo: "warmth, pride, loyalty, style, and the desire to be seen clearly",
    virgo: "precision, repair, usefulness, discernment, and the need to make the details work",
    libra: "comparison, fairness, beauty, agreement, and the pressure of relationship",
    scorpio: "intensity, privacy, focus, control, and the need to understand what is happening underneath",
    sagittarius: "belief, distance, humor, study, risk, and the need to test a bigger meaning",
    capricorn: "structure, consequence, ambition, restraint, and the need to build something real",
    aquarius: "questions, pattern recognition, refusal, distance, and the ability to notice what a group is agreeing to before it understands the cost",
    pisces: "porosity, imagination, surrender, compassion, and the difficulty of keeping a clean edge"
  };

  return bySign[key] ?? "the sign's pattern, pace, and way of responding";
}

function deterministicPlanetSentence(planet: string, sign: string) {
  const planetKey = comparableKey(planet);
  const signKey = comparableKey(sign);
  const byPlanet: Record<string, string> = {
    sun: "Your sense of self needs a direction that can hold up in real life, not only in private thought.",
    moon: "Your needs may register before you have words for them, which makes the body and daily response important to read carefully.",
    mercury: "Your mind may pick up what is unsaid before a conversation has a clean explanation.",
    venus: "Feeling valued is not a small thing here, because affection, effort, beauty, and loyalty all need to be recognized in a real way.",
    mars: "Desire moves through the body quickly here, so action often begins before the whole situation has been explained.",
    jupiter: "Belief grows through experience here, especially when an idea has to become something you can actually live by.",
    saturn: "Pressure tends to show where a stronger structure is needed, especially around the part of life this placement keeps testing.",
    uranus: "You may notice the pattern that everyone else has learned to accept, and that can make ordinary agreement feel too small.",
    neptune: "Longing can blur the edge between what is possible and what is being projected, so clarity has to be earned slowly.",
    pluto: "This placement tends to notice where control is hiding, especially when something polite is covering a stronger need.",
    chiron: "The sore point here is not random; it keeps returning to show where skill, language, and care have to develop.",
    "north-node": "This placement pulls you toward a less familiar way of living, even when the old pattern would be easier to repeat.",
    "south-node": "This placement carries an old skill, but it can become too automatic when life asks for a different response."
  };

  if (planetKey === "sun" && signKey === "aquarius") {
    return "You may notice what people are agreeing to before they understand what that agreement asks from them.";
  }

  if (planetKey === "venus" && signKey === "leo") {
    return "Feeling valued is not a small thing here, because love, effort, taste, loyalty, and generosity need to be seen in a real way.";
  }

  if (planetKey === "mercury" && signKey === "cancer") {
    return "Your mind may pick up what is unsaid before a conversation has a clean explanation, so words often carry memory, protection, and personal history with them.";
  }

  if (planetKey === "moon" && signKey === "scorpio") {
    return "Your needs may register intensely and privately, which can make small daily pressures feel larger when something underneath has not been named.";
  }

  return byPlanet[planetKey] ?? "This placement needs to be understood through what it repeatedly notices, chooses, protects, or refuses.";
}

function deterministicHouseTopics(house: string) {
  const key = ordinalHouseKey(house);
  const byHouse: Record<string, string> = {
    "1": "presence, identity, body, and the first impression you make without trying",
    "2": "money, possessions, appetite, self-worth, and what you are willing to keep or build",
    "3": "speech, writing, siblings, neighbors, daily decisions, and the messages that move through ordinary life",
    "4": "home, family, roots, privacy, and the emotional ground you return to",
    "5": "pleasure, creativity, romance, children, risk, and the desire to make something that feels alive",
    "6": "work habits, health, skill, maintenance, and the daily systems that either support or wear down the body",
    "7": "partnership, conflict, negotiation, attraction, and the people who meet you directly",
    "8": "shared money, debt, intimacy, trust, inheritance, and what becomes complicated once another person is involved",
    "9": "study, belief, travel, teaching, publishing, religion, law, and the ideas that organize how you understand the world",
    "10": "work, visibility, leadership, reputation, responsibility, and what other people can recognize about your direction",
    "11": "friendship, audience, community, networks, hopes, and the groups or systems you move through",
    "12": "privacy, retreat, dreams, grief, hidden patterns, and what is hard to explain in public"
  };

  return byHouse[key] ?? "the part of life named by this house";
}

function deterministicShortPlanetAction(planet: string) {
  const key = comparableKey(planet);
  const byPlanet: Record<string, string> = {
    sun: "identity and direction",
    moon: "need and response",
    mercury: "thought, speech, and decisions",
    venus: "value, affection, and worth",
    mars: "action, anger, and pursuit",
    jupiter: "belief, confidence, and meaning",
    saturn: "pressure, limits, and responsibility",
    uranus: "disruption and refusal",
    neptune: "longing and imagination",
    pluto: "power and control",
    chiron: "the sore point that needs language",
    "north-node": "growth and appetite",
    "south-node": "habit and memory"
  };

  return byPlanet[key] ?? "attention and choice";
}

function deterministicShortSignStyle(sign: string) {
  const key = comparableKey(sign);
  const bySign: Record<string, string> = {
    aries: "direct and urgent",
    taurus: "steady and practical",
    gemini: "curious and verbal",
    cancer: "protective and personal",
    leo: "warm and proud",
    virgo: "precise and useful",
    libra: "relational and fair-minded",
    scorpio: "private and intense",
    sagittarius: "restless and meaning-seeking",
    capricorn: "structured and consequence-aware",
    aquarius: "questioning and pattern-aware",
    pisces: "sensitive and imaginal"
  };

  return bySign[key] ?? "specific";
}

function deterministicShortHouseTopics(house: string) {
  const key = ordinalHouseKey(house);
  const byHouse: Record<string, string> = {
    "1": "body and identity",
    "2": "money, possessions, and self-worth",
    "3": "speech, messages, siblings, and daily decisions",
    "4": "home, family, and privacy",
    "5": "pleasure, creativity, and risk",
    "6": "work habits, health, and maintenance",
    "7": "partnership and conflict",
    "8": "shared money, debt, intimacy, and trust",
    "9": "study, belief, travel, and teaching",
    "10": "work, visibility, leadership, and responsibility",
    "11": "friends, audience, community, and networks",
    "12": "privacy, retreat, dreams, and hidden patterns"
  };

  return byHouse[key] ?? "this part of life";
}

function deterministicAspectEffect(value?: string) {
  const aspect = canonicalAspectKey(value);

  if (aspect === "square") return "presses on";
  if (aspect === "opposition") return "pulls against";
  if (aspect === "trine") return "works with";
  if (aspect === "sextile") return "opens a path for";
  if (aspect === "conjunction") return "intensifies";

  return "changes";
}

function deterministicAspectPattern(value?: string) {
  const aspect = canonicalAspectKey(value);

  if (aspect === "square") return "The pattern can make the primary placement feel tested by consequence, timing, or resistance.";
  if (aspect === "opposition") return "The pattern can make the primary placement meet itself through another person, demand, or exchange.";
  if (aspect === "trine") return "The pattern can give the primary placement an easier channel, but it still needs to be used deliberately.";
  if (aspect === "sextile") return "The pattern can make the primary placement more usable when attention turns into a concrete choice.";
  if (aspect === "conjunction") return "The pattern can make the primary placement louder, more concentrated, and harder to ignore.";

  return "The pattern changes how the primary placement moves through the chart.";
}

function deterministicNatalAspectTitle(aspect: Record<string, unknown>) {
  const type = stringValue(aspect.aspect) || stringValue(aspect.aspectType) || stringValue(aspect.type);
  const planet = stringValue(aspect.otherPoint) || stringValue(aspect.aspectPlanet) || stringValue(aspect.planetB) || stringValue(aspect.to);
  const sign = stringValue(aspect.otherSign) || stringValue(aspect.aspectPlanetSign) || stringValue(aspect.planetBSign) || stringValue(aspect.toSign);
  const house = stringValue(aspect.otherHouse) || stringValue(aspect.aspectPlanetHouse) || stringValue(aspect.planetBHouse) || stringValue(aspect.toHouse);
  const parts = [
    aspectDisplayLabel(type),
    displayAstroName(planet),
    "in",
    displayAstroName(sign),
    "in the",
    houseLabel(house)
  ].filter(Boolean);

  return parts.join(" ");
}

function deterministicNatalPlacementBody(facts: ReturnType<typeof natalPlacementSourceFacts>) {
  void facts;
  return "";
}

function deterministicNatalAspectBody(
  placementFacts: ReturnType<typeof natalPlacementSourceFacts>,
  aspect: Record<string, unknown>
) {
  void placementFacts;
  void aspect;
  return "";
}

function natalPlacementBannedPhraseFailures(content: GeneratedContent) {
  const text = normalizeText([
    content.headline,
    content.tldr,
    content.summary,
    content.body,
    ...(content.sections ?? []).flatMap((section) => [section.heading, section.body])
  ].filter(Boolean).join("\n"));

  return natalPlacementHardBannedPhrases.filter((phrase) => hasBannedPhrase(text, phrase));
}

function natalPlacementTarotReferenceFailures(content: GeneratedContent) {
  const text = normalizeText(mainCopyText(content));
  return natalPlacementTarotReferencePhrases.filter((phrase) => hasBannedPhrase(text, phrase));
}

function natalPlacementTransitLanguageFailures(content: GeneratedContent) {
  const text = normalizeText(mainCopyText(content));
  return natalPlacementTransitLanguagePhrases.filter((phrase) => hasBannedPhrase(text, phrase));
}

function natalPlacementVisibleScaffoldFailures(content: GeneratedContent) {
  const headings = (content.sections ?? [])
    .map((section) => normalizeText(stringValue(section.heading)).replace(/[:.]+$/g, "").trim())
    .filter(Boolean);
  const visibleLines = mainCopyText(content)
    .split(/\r?\n/)
    .map((line) => normalizeText(line).replace(/[:.]+$/g, "").trim())
    .filter(Boolean);

  return natalPlacementVisibleScaffoldPhrases.filter((phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    return headings.some((heading) => heading === normalizedPhrase)
      || visibleLines.some((line) => line === normalizedPhrase || line.startsWith(`${normalizedPhrase}:`));
  });
}

function conditionalChartLanguageFailures(content: GeneratedContent) {
  const text = normalizeText(mainCopyText(content));
  return conditionalChartLanguagePhrases.filter((phrase) => hasBannedPhrase(text, phrase));
}

function deterministicNatalPlacementDraft(input: GenerateContentInput): StoredGeneratedContent {
  const facts = natalPlacementSourceFacts(input);
  const headline = natalPlacementTitleFromFacts(facts) || factualHeadlineFor(input) || stringValue(input.headline);
  const authored = authoredNatalPlacementBody(facts);
  const body = authored.body;

  if (!body) {
    throw new ContentGenerationQualityError(
      `No approved appBody exists for ${headline}. Refusing to display sourceBody or deterministic natal placement filler.`
    );
  }

  const sections: StoredGeneratedContent["sections"] = [];
  const tldr = firstSentence(body);
  const content: StoredGeneratedContent = {
    headline,
    tldr,
    summary: tldr,
    body,
    sections,
    astrologyDrilldown: {
      title: "Why this?",
      summary: tldr,
      factors: [
        {
          label: `${displayAstroName(facts.body)} in ${displayAstroName(facts.sign)}`,
          technicalFact: `${displayAstroName(facts.body)} in ${displayAstroName(facts.sign)}`,
          plainMeaning: `${deterministicPlanetFunction(facts.body)} through ${deterministicSignExpression(facts.sign)}.`
        },
        {
          label: `The ${houseLabel(facts.house)}`,
          technicalFact: `${displayAstroName(facts.body)} in the ${houseLabel(facts.house)}`,
          plainMeaning: deterministicHouseTopics(facts.house)
        }
      ],
      whyThisScene: authored.matches.length
        ? "This page is assembled from authored natal placement source entries: " + authored.matches.map((match) => stringValue(match.entry.id)).join(", ") + "."
        : "This page is assembled from the natal placement facts for " + headline + "."
    },
    model: authored.sourceType === "deterministic-fallback" ? "deterministic-natal-placement-v1" : "authored-natal-placement-" + authored.sourceType + "-v1"
  };

  const banned = natalPlacementBannedPhraseFailures(content);
  if (banned.length) {
    throw new ContentGenerationQualityError(`Deterministic natal placement copy used banned phrase: ${banned.join(", ")}`);
  }

  validateGeneratedContentForInput(content, input);

  return content;
}

function natalPlacementSourceFacts(input: { facts?: Record<string, unknown> }) {
  const facts = input.facts ?? {};
  const placement = recordValue(facts.placement);
  const rulers = arrayRecordValue(facts.rulers);
  const traditionalRuler = recordValue(facts.traditionalRuler);
  const modernRuler = recordValue(facts.modernRuler);
  const traditionalRulerFromList = rulers.find((entry) => comparableKey(stringValue(entry.system)) === "traditional") ?? {};
  const modernRulerFromList = rulers.find((entry) => comparableKey(stringValue(entry.system)) === "modern") ?? {};
  const body = stringValue(facts.placementBody)
    || stringValue(facts.planet)
    || stringValue(facts.body)
    || stringValue(facts.point)
    || stringValue(facts.node)
    || stringValue(placement.planet)
    || stringValue(placement.body)
    || stringValue(placement.point)
    || stringValue(placement.node);
  const sign = stringValue(facts.placementSign)
    || stringValue(facts.sign)
    || stringValue(facts.planetSign)
    || stringValue(placement.sign);
  const house = stringValue(facts.placementHouse)
    || stringValue(facts.house)
    || stringValue(facts.houseNumber)
    || stringValue(placement.house);
  const traditionalRulerBody = stringValue(facts.traditionalRulerBody)
    || stringValue(facts.traditionalRuler)
    || stringValue(facts.rulerBody)
    || stringValue(facts.ruler)
    || stringValue(facts.houseRuler)
    || stringValue(traditionalRuler.body)
    || stringValue(traditionalRulerFromList.body);
  const traditionalRulerSign = stringValue(facts.traditionalRulerSign)
    || stringValue(facts.rulerSign)
    || stringValue(facts.houseRulerSign)
    || stringValue(traditionalRuler.sign)
    || stringValue(traditionalRulerFromList.sign);
  const traditionalRulerHouse = stringValue(facts.traditionalRulerHouse)
    || stringValue(facts.rulerHouse)
    || stringValue(facts.houseRulerHouse)
    || stringValue(traditionalRuler.house)
    || stringValue(traditionalRulerFromList.house);
  const modernRulerBody = stringValue(facts.modernRulerBody)
    || stringValue(facts.modernRuler)
    || stringValue(modernRuler.body)
    || stringValue(modernRulerFromList.body);
  const modernRulerSign = stringValue(facts.modernRulerSign)
    || stringValue(modernRuler.sign)
    || stringValue(modernRulerFromList.sign);
  const modernRulerHouse = stringValue(facts.modernRulerHouse)
    || stringValue(modernRuler.house)
    || stringValue(modernRulerFromList.house);

  return {
    body,
    sign,
    house,
    traditionalRulerBody,
    traditionalRulerSign,
    traditionalRulerHouse,
    modernRulerBody,
    modernRulerSign,
    modernRulerHouse
  };
}

function isPrimaryNatalPlacementGeneration(input: Pick<GenerateContentInput, "eventType"> & { facts?: Record<string, unknown> }) {
  const type = comparableKey(stringValue(input.facts?.type) || input.eventType);
  const blockType = comparableKey(stringValue(input.facts?.blockType));
  const placement = natalPlacementSourceFacts(input);

  if (blockType && !["essay", "placement", "natal-placement"].includes(blockType)) {
    return false;
  }

  return Boolean(
    placement.body &&
    placement.sign &&
    placement.house &&
    (type.includes("natal-placement") || type.includes("natal-placement-writeup") || type === "natal-placement" || type === "you-natal-placement")
  );
}

function placementAspectCardFacts(input: GenerateContentInput): PlacementAspectCardFacts {
  const facts = input.facts;
  const primaryPlanet = stringValue(facts.primaryPlanet)
    || stringValue(facts.placementBody)
    || stringValue(facts.body1)
    || stringValue(facts.from)
    || stringValue(facts.planetA)
    || stringValue(facts.body)
    || stringValue(facts.planet);
  const primarySign = stringValue(facts.primarySign)
    || stringValue(facts.placementSign)
    || stringValue(facts.sign1)
    || stringValue(facts.fromSign)
    || stringValue(facts.planetASign)
    || stringValue(facts.sign);
  const primaryHouse = stringValue(facts.primaryHouse)
    || stringValue(facts.placementHouse)
    || stringValue(facts.house1)
    || stringValue(facts.fromHouse)
    || stringValue(facts.planetAHouse)
    || stringValue(facts.house);
  const aspectPlanet = stringValue(facts.aspectPlanet)
    || stringValue(facts.otherPlanet)
    || stringValue(facts.body2)
    || stringValue(facts.to)
    || stringValue(facts.planetB);
  const aspectPlanetSign = stringValue(facts.aspectPlanetSign)
    || stringValue(facts.otherSign)
    || stringValue(facts.sign2)
    || stringValue(facts.toSign)
    || stringValue(facts.planetBSign);
  const aspectPlanetHouse = stringValue(facts.aspectPlanetHouse)
    || stringValue(facts.otherHouse)
    || stringValue(facts.house2)
    || stringValue(facts.toHouse)
    || stringValue(facts.planetBHouse);
  const aspectType = stringValue(facts.aspectType) || stringValue(facts.aspect) || stringValue(facts.type);
  const orb = stringValue(facts.orb);

  return {
    primaryPlanet,
    primarySign,
    primaryHouse,
    aspectType,
    aspectPlanet,
    aspectPlanetSign,
    aspectPlanetHouse,
    orb
  };
}

function isPersonalizedNatalPlacementAspectCard(input: GenerateContentInput) {
  const facts = placementAspectCardFacts(input);

  return isNatalAspectGenerationContext(input)
    && Boolean(facts.primaryPlanet && facts.primarySign && facts.primaryHouse && facts.aspectPlanet && facts.aspectPlanetSign && facts.aspectPlanetHouse);
}

function projectAuthoredNatalAspectCardSources(input: GenerateContentInput) {
  if (!isPersonalizedNatalPlacementAspectCard(input)) {
    return [];
  }

  const facts = placementAspectCardFacts(input);
  const primaryPlanet = comparableKey(facts.primaryPlanet);
  const primarySign = comparableKey(facts.primarySign);
  const primaryHouse = ordinalHouseKey(facts.primaryHouse);
  const aspectPlanet = comparableKey(facts.aspectPlanet);
  const aspectSign = comparableKey(facts.aspectPlanetSign);
  const aspectHouse = ordinalHouseKey(facts.aspectPlanetHouse);
  const aspectType = canonicalAspectKey(facts.aspectType);
  const sources: ProjectAuthoredNatalSource[] = [];

  const primaryPlacementPath = `placements/sign/${primaryPlanet}-${primarySign}.json`;
  const primaryPlacement = readProjectJson(primaryPlacementPath);
  pushProjectSource(sources, "primary planet in sign", primaryPlacementPath, primaryPlacement, [
    primaryPlacement?.tldr,
    primaryPlacement?.body,
    primaryPlacement?.note
  ]);

  const aspectPlacementPath = `placements/sign/${aspectPlanet}-${aspectSign}.json`;
  const aspectPlacement = readProjectJson(aspectPlacementPath);
  pushProjectSource(sources, "aspect planet in sign", aspectPlacementPath, aspectPlacement, [
    aspectPlacement?.tldr,
    aspectPlacement?.body,
    aspectPlacement?.note
  ]);

  for (const [role, planet, sign] of [
    ["primary planet support", primaryPlanet, primarySign],
    ["aspect planet support", aspectPlanet, aspectSign]
  ] as const) {
    const planetPath = `planetary/${planet}.json`;
    const planetData = readProjectJson(planetPath);
    const signEntries = arrayRecordValue(planetData?.signs);
    const signEntry = signEntries.find((entry) => comparableKey(stringValue(entry.sign)) === sign);

    pushProjectSource(sources, role, planetPath, planetData, [
      planetData?.overview,
      planetData?.cycle,
      signEntry ? `${stringValue(signEntry.sign)}: ${stringValue(signEntry.body)}` : ""
    ]);
  }

  for (const [role, planet] of [
    ["primary planet primitive", primaryPlanet],
    ["aspect planet primitive", aspectPlanet]
  ] as const) {
    const entry = primitiveEntry("primitives/planets.json", planet);

    pushProjectSource(sources, role, "primitives/planets.json", entry, [
      entry ? `${stringValue(entry.label)} governs ${stringValue(entry.governs)}.` : "",
      entry ? `Verb: ${stringValue(entry.verb)}. Tempo: ${stringValue(entry.tempo)}. Shadow: ${stringValue(entry.shadow)}.` : ""
    ]);
  }

  for (const [role, sign] of [
    ["primary sign primitive", primarySign],
    ["aspect sign primitive", aspectSign]
  ] as const) {
    const entry = primitiveEntry("primitives/signs.json", sign);

    pushProjectSource(sources, role, "primitives/signs.json", entry, [
      entry ? `${stringValue(entry.label)} is ${stringValue(entry.element)} and ${stringValue(entry.mode)}.` : "",
      entry ? `Rulers: ${Array.isArray(entry.rulers) ? entry.rulers.map(stringValue).join(", ") : stringValue(entry.rulers)}.` : "",
      entry ? `Keywords: ${Array.isArray(entry.keywords) ? entry.keywords.map(stringValue).join(", ") : stringValue(entry.keywords)}.` : ""
    ]);
  }

  for (const [role, house] of [
    ["primary house primitive", primaryHouse],
    ["aspect house primitive", aspectHouse]
  ] as const) {
    const entry = primitiveEntry("primitives/houses.json", house);

    pushProjectSource(sources, role, "primitives/houses.json", entry, [
      entry ? `${stringValue(entry.label)}: ${stringValue(entry.plainTranslation)}` : ""
    ]);
  }

  const aspectEntry = primitiveEntry("primitives/aspects.json", aspectType);
  pushProjectSource(sources, "aspect relationship primitive", "primitives/aspects.json", aspectEntry, [
    aspectEntry ? `${stringValue(aspectEntry.label)}: ${stringValue(aspectEntry.traditionalMeaning)}` : "",
    aspectEntry ? `Cyclic meaning: ${stringValue(aspectEntry.cyclicMeaning)}` : ""
  ]);

  return sources;
}

function projectAuthoredNatalPlacementSources(input: GenerateContentInput) {
  if (!isPrimaryNatalPlacementGeneration(input)) {
    return [];
  }

  const facts = natalPlacementSourceFacts(input);
  const body = comparableKey(facts.body);
  const sign = comparableKey(facts.sign);
  const house = ordinalHouseKey(facts.house);
  const traditionalRuler = comparableKey(facts.traditionalRulerBody);
  const traditionalRulerSign = comparableKey(facts.traditionalRulerSign);
  const traditionalRulerHouse = ordinalHouseKey(facts.traditionalRulerHouse);
  const modernRuler = comparableKey(facts.modernRulerBody);
  const modernRulerSign = comparableKey(facts.modernRulerSign);
  const modernRulerHouse = ordinalHouseKey(facts.modernRulerHouse);
  const sources: ProjectAuthoredNatalSource[] = [];

  for (const match of authoredNatalPlacementMatches(facts)) {
    const entry = match.entry;
    const astrologyExcerpt = sourceExcerpt(entry.astrologyBody);

    if (astrologyExcerpt) {
      sources.push({
        role: "ASTROLOGY SOURCE MATERIAL - authored placement " + match.matchType,
        sourcePath: entry.sourcePath ? "packages/astro-knowledge/" + entry.sourcePath : "packages/astro-knowledge/generated/tldr-astro/authored-placements/authored-placements.json",
        id: stringValue(entry.id),
        title: stringValue(entry.title),
        excerpts: [astrologyExcerpt]
      });
    }
  }

  const placementPath = `placements/sign/${body}-${sign}.json`;
  const placement = readProjectJson(placementPath);
  pushProjectSource(sources, "primary planet in sign", placementPath, placement, [
    placement?.tldr,
    placement?.body,
    placement?.gift,
    placement?.challenge,
    placement?.note
  ]);

  const planetPath = `planetary/${body}.json`;
  const planetData = readProjectJson(planetPath);
  const planetSignEntry = arrayRecordValue(planetData?.signs)
    .find((entry) => comparableKey(stringValue(entry.sign)) === sign);
  pushProjectSource(sources, "primary planet meaning", planetPath, planetData, [
    planetData?.overview,
    planetData?.cycle,
    planetSignEntry ? `${stringValue(planetSignEntry.sign)}: ${stringValue(planetSignEntry.body)}` : ""
  ]);

  const planetPrimitive = primitiveEntry("primitives/planets.json", body);
  pushProjectSource(sources, "primary planet primitive", "primitives/planets.json", planetPrimitive, [
    planetPrimitive ? `${stringValue(planetPrimitive.label)} governs ${stringValue(planetPrimitive.governs)}.` : "",
    planetPrimitive ? `Verb: ${stringValue(planetPrimitive.verb)}. Tempo: ${stringValue(planetPrimitive.tempo)}. Shadow: ${stringValue(planetPrimitive.shadow)}.` : ""
  ]);

  const signPrimitive = primitiveEntry("primitives/signs.json", sign);
  pushProjectSource(sources, "primary sign primitive", "primitives/signs.json", signPrimitive, [
    signPrimitive ? `${stringValue(signPrimitive.label)} is ${stringValue(signPrimitive.element)} and ${stringValue(signPrimitive.mode)}.` : "",
    signPrimitive ? `Traditional ruler: ${stringValue(signPrimitive.traditionalRuler)}. Modern ruler: ${stringValue(signPrimitive.modernRuler)}.` : "",
    signPrimitive ? `Keywords: ${Array.isArray(signPrimitive.keywords) ? signPrimitive.keywords.map(stringValue).join(", ") : stringValue(signPrimitive.keywords)}.` : ""
  ]);

  const housePrimitive = primitiveEntry("primitives/houses.json", house);
  pushProjectSource(sources, "primary house primitive", "primitives/houses.json", housePrimitive, [
    housePrimitive ? `${stringValue(housePrimitive.label)}: ${stringValue(housePrimitive.plainTranslation)}` : ""
  ]);

  for (const [role, ruler, rulerSign, rulerHouse] of [
    ["traditional ruler support", traditionalRuler, traditionalRulerSign, traditionalRulerHouse],
    ["modern ruler support", modernRuler, modernRulerSign, modernRulerHouse]
  ] as const) {
    if (!ruler) continue;

    const rulerPlanetPath = `planetary/${ruler}.json`;
    const rulerPlanetData = readProjectJson(rulerPlanetPath);
    const rulerSignEntry = arrayRecordValue(rulerPlanetData?.signs)
      .find((entry) => comparableKey(stringValue(entry.sign)) === rulerSign);
    pushProjectSource(sources, role, rulerPlanetPath, rulerPlanetData, [
      rulerPlanetData?.overview,
      rulerSignEntry ? `${stringValue(rulerSignEntry.sign)}: ${stringValue(rulerSignEntry.body)}` : ""
    ]);

    if (rulerHouse) {
      const chartRulerHousePath = `chart-rulers/chart-ruler-house-${rulerHouse}.json`;
      const chartRulerHouse = readProjectJson(chartRulerHousePath);
      pushProjectSource(sources, `${role} house thread`, chartRulerHousePath, chartRulerHouse, [
        chartRulerHouse?.tldr,
        chartRulerHouse?.meaning,
        chartRulerHouse?.shadow
      ]);
    }
  }

  for (const aspect of arrayRecordValue(input.facts.aspects).slice(0, 4)) {
    const aspectType = canonicalAspectKey(stringValue(aspect.aspect));
    const aspectPlanet = comparableKey(stringValue(aspect.otherPoint) || stringValue(aspect.planetB) || stringValue(aspect.to));
    const aspectSign = comparableKey(stringValue(aspect.otherSign) || stringValue(aspect.planetBSign) || stringValue(aspect.toSign));
    const aspectHouse = ordinalHouseKey(stringValue(aspect.otherHouse) || stringValue(aspect.planetBHouse) || stringValue(aspect.toHouse));
    const aspectPlanetPath = aspectPlanet ? `planetary/${aspectPlanet}.json` : "";
    const aspectPlanetData = aspectPlanetPath ? readProjectJson(aspectPlanetPath) : null;
    const aspectSignEntry = arrayRecordValue(aspectPlanetData?.signs)
      .find((entry) => comparableKey(stringValue(entry.sign)) === aspectSign);

    pushProjectSource(sources, `aspect card planet support: ${aspectType} ${displayAstroName(aspectPlanet)}`, aspectPlanetPath, aspectPlanetData, [
      aspectPlanetData?.overview,
      aspectSignEntry ? `${stringValue(aspectSignEntry.sign)}: ${stringValue(aspectSignEntry.body)}` : ""
    ]);

    const aspectEntry = primitiveEntry("primitives/aspects.json", aspectType);
    pushProjectSource(sources, `aspect card relationship support: ${aspectType}`, "primitives/aspects.json", aspectEntry, [
      aspectEntry ? `${stringValue(aspectEntry.label)}: ${stringValue(aspectEntry.traditionalMeaning)}` : "",
      aspectEntry ? `Cyclic meaning: ${stringValue(aspectEntry.cyclicMeaning)}` : ""
    ]);

    if (aspectHouse) {
      const aspectHouseEntry = primitiveEntry("primitives/houses.json", aspectHouse);
      pushProjectSource(sources, `aspect card house support: ${ordinalHouseNumber(aspectHouse)}`, "primitives/houses.json", aspectHouseEntry, [
        aspectHouseEntry ? `${stringValue(aspectHouseEntry.label)}: ${stringValue(aspectHouseEntry.plainTranslation)}` : ""
      ]);
    }
  }

  return sources;
}

export function natalPlacementGenerationSafetySummary(input: GenerateContentInput): NatalPlacementGenerationSafetySummary {
  const isPrimaryNatalPlacement = isPrimaryNatalPlacementGeneration(input);
  const sourceSnapshot = isRecord(input.sourceSnapshot) ? input.sourceSnapshot : {};
  const snapshotSourceId = stringValue(sourceSnapshot.kbId);
  const snapshotSourcePath = stringValue(sourceSnapshot.sourcePath);
  const snapshotContentType = stringValue(sourceSnapshot.contentType);
  const requestedSourceIds = (input.knowledgeIds ?? []).map((id) => id.trim()).filter(Boolean);

  const authoredSources = isPrimaryNatalPlacement ? projectAuthoredNatalPlacementSources(input) : [];
  const authoredPlacementSources = authoredSources.filter((source) => source.role.startsWith("ASTROLOGY SOURCE MATERIAL - authored placement"));
  const sourceIds = isPrimaryNatalPlacement
    ? authoredPlacementSources.map((source) => source.id).filter((id): id is string => Boolean(id))
    : Array.from(new Set([...requestedSourceIds, snapshotSourceId].filter(Boolean)));
  const sourcePaths = isPrimaryNatalPlacement
    ? Array.from(new Set(authoredPlacementSources.map((source) => source.sourcePath).filter(Boolean)))
    : Array.from(new Set([snapshotSourcePath].filter(Boolean)));
  const astrologyBodySent = isPrimaryNatalPlacement
    ? authoredPlacementSources.some((source) => source.excerpts.some((excerpt) => excerpt.trim().length > 0))
    : Boolean(sourceIds.length || sourcePaths.length || snapshotContentType);

  return {
    isPrimaryNatalPlacement,
    sourceIds,
    sourcePaths,
    sourceSafety: {
      sourceBodyExcluded: true,
      astrologyBodySent,
      tarotNotesExcluded: true,
      businessNotesExcluded: true,
      authoredSourceGenerationAllowed: allowsPrivateSourceModelGeneration()
    }
  };
}

function projectAuthoredNatalAspectCardPrompt(input: GenerateContentInput) {
  if (!isPersonalizedNatalPlacementAspectCard(input)) {
    return "No placement-card authored source material requested.";
  }

  const facts = placementAspectCardFacts(input);
  const sources = projectAuthoredNatalAspectCardSources(input);

  return JSON.stringify({
    placementCardFacts: {
      blockType: "natal_aspect",
      surface: "natal_placement_aspect_card",
      primaryPlanet: displayAstroName(facts.primaryPlanet),
      primarySign: displayAstroName(facts.primarySign),
      primaryHouse: ordinalHouseNumber(facts.primaryHouse),
      aspectType: comparableKey(facts.aspectType),
      aspectPlanet: displayAstroName(facts.aspectPlanet),
      aspectPlanetSign: displayAstroName(facts.aspectPlanetSign),
      aspectPlanetHouse: ordinalHouseNumber(facts.aspectPlanetHouse),
      orb: facts.orb
    },
    authoredSources: sources
  }, null, 2);
}

function projectAuthoredNatalPlacementPrompt(input: GenerateContentInput) {
  if (!isPrimaryNatalPlacementGeneration(input)) {
    return "No primary natal placement authored source material requested.";
  }

  const facts = natalPlacementSourceFacts(input);

  return JSON.stringify({
    primaryPlacement: {
      title: `${displayAstroName(facts.body)} in ${displayAstroName(facts.sign)} in the ${ordinalHouseNumber(facts.house)} house`,
      planet: displayAstroName(facts.body),
      sign: displayAstroName(facts.sign),
      house: ordinalHouseNumber(facts.house),
      traditionalRuler: displayAstroName(facts.traditionalRulerBody),
      traditionalRulerSign: displayAstroName(facts.traditionalRulerSign),
      traditionalRulerHouse: ordinalHouseNumber(facts.traditionalRulerHouse),
      modernRuler: displayAstroName(facts.modernRulerBody),
      modernRulerSign: displayAstroName(facts.modernRulerSign),
      modernRulerHouse: ordinalHouseNumber(facts.modernRulerHouse)
    },
    aspectCards: arrayRecordValue(input.facts.aspects).slice(0, 4),
    authoredSources: projectAuthoredNatalPlacementSources(input)
  }, null, 2);
}

function entrySearchText(entry: V4RewriteEntry) {
  return [entry.id, entry.title, entry.itemType].filter(Boolean).join(" ").toLowerCase();
}

function sourceBackedRevisionSearchText(entry: SourceBackedRevisionEntry) {
  return [
    entry.row_id,
    entry.id,
    entry.aspect,
    entry.target_field,
    entry.replacement_text,
    entry.source_supported_themes,
    entry.source_material_examples_to_use
  ].filter(Boolean).join(" ").toLowerCase();
}

const aspectTypeNames = ["conjunction", "opposition", "square", "trine", "sextile"];

function canonicalAspectKey(value?: string) {
  const aspect = comparableKey(value);

  if (aspect === "opposite" || aspect === "opposes") return "opposition";
  if (aspect === "conjunct") return "conjunction";

  return aspect;
}

function aspectFamily(value: string) {
  const aspect = canonicalAspectKey(value);

  if (["square", "opposition"].includes(aspect)) return "hard";
  if (["trine", "sextile"].includes(aspect)) return "flow";
  if (aspect === "conjunction") return "conjunction";

  return aspect;
}

function aspectPartsFromKey(value?: string) {
  const key = comparableKey(value);

  if (!key) return null;

  for (const aspect of aspectTypeNames) {
    const token = "-" + aspect + "-";
    const index = key.indexOf(token);

    if (index === -1) continue;

    const first = key.slice(0, index);
    const second = key.slice(index + token.length);

    if (first && second) {
      return { first, aspect, second };
    }
  }

  return null;
}

function aspectPartsFromFacts(input: GenerateContentInput) {
  const facts = input.facts;
  const first = comparableKey(stringValue(facts.primaryPlanet) || stringValue(facts.placementBody) || stringValue(facts.body1) || stringValue(facts.planetA) || stringValue(facts.from));
  const second = comparableKey(stringValue(facts.aspectPlanet) || stringValue(facts.otherPlanet) || stringValue(facts.body2) || stringValue(facts.planetB) || stringValue(facts.to));
  const aspect = canonicalAspectKey(stringValue(facts.aspect) || stringValue(facts.aspectType) || stringValue(facts.type));

  if (!first || !second || !aspect || !aspectTypeNames.includes(aspect)) return null;

  return { first, aspect, second };
}

function sourceBackedAspectParts(entry: SourceBackedRevisionEntry) {
  return aspectPartsFromKey(entry.id)
    || aspectPartsFromKey(entry.aspect)
    || aspectPartsFromKey(entry.row_id);
}

function hasSameUnorderedAspectPair(
  first: { first: string; second: string },
  second: { first: string; second: string }
) {
  return (first.first === second.first && first.second === second.second)
    || (first.first === second.second && first.second === second.first);
}

function scoreSourceBackedRevisionEntry(
  entry: SourceBackedRevisionEntry,
  input: GenerateContentInput,
  searchText: string
) {
  const id = comparableKey(entry.id);
  const aspect = comparableKey(entry.aspect);
  const contentKey = comparableKey(input.contentKey);
  const headline = comparableKey(factualHeadlineFor(input));
  const rowText = sourceBackedRevisionSearchText(entry);
  const inputAspect = aspectPartsFromFacts(input);
  const entryAspect = sourceBackedAspectParts(entry);
  let score = 0;

  if (inputAspect && entryAspect) {
    if (hasSameUnorderedAspectPair(inputAspect, entryAspect) && inputAspect.aspect === entryAspect.aspect) {
      score += 220;
    } else if (hasSameUnorderedAspectPair(inputAspect, entryAspect) && aspectFamily(inputAspect.aspect) === aspectFamily(entryAspect.aspect)) {
      score += 150;
    } else if (hasSameUnorderedAspectPair(inputAspect, entryAspect)) {
      score += 100;
    } else if (inputAspect.aspect === entryAspect.aspect) {
      score += 35;
    }
  }

  if (id && input.knowledgeIds?.some((knowledgeId) => comparableKey(knowledgeId) === id)) score += 90;
  if (id && contentKey.includes(id)) score += 70;
  if (aspect && contentKey.includes(aspect)) score += 70;
  if (id && headline.includes(id)) score += 60;
  if (aspect && headline.includes(aspect)) score += 60;
  if (id && searchText.includes(id.replace(/-/g, " "))) score += 30;
  if (aspect && searchText.includes(aspect.replace(/-/g, " "))) score += 30;

  for (const token of searchText.split(/[^a-z0-9]+/).filter((part) => part.length > 3)) {
    if (rowText.includes(token)) score += 1;
  }

  return score;
}

function compactSourceBackedRevisionEntry(entry: SourceBackedRevisionEntry) {
  return {
    id: entry.id,
    aspect: entry.aspect,
    targetField: entry.target_field,
    replacementText: entry.replacement_text,
    sourceSupportedThemes: entry.source_supported_themes,
    sourceMaterialExamplesToUse: entry.source_material_examples_to_use,
    codexAction: entry.codex_action,
    avoid: entry.avoid,
    confidence: entry.confidence
  };
}

function compactSourceBackedRevisionSupportEntry(entry: ReturnType<typeof compactSourceBackedRevisionEntry>) {
  return {
    id: entry.id,
    aspect: entry.aspect,
    sourceSupportedThemes: entry.sourceSupportedThemes,
    avoid: entry.avoid,
    confidence: entry.confidence
  };
}

function natalFactParts(input: GenerateContentInput) {
  const facts = input.facts;

  return {
    blockType: comparableKey(stringValue(facts.blockType)),
    body: comparableKey(
      stringValue(facts.placementBody)
      || stringValue(facts.planet)
      || stringValue(facts.body)
      || stringValue(facts.point)
      || stringValue(facts.node)
    ),
    sign: comparableKey(stringValue(facts.placementSign) || stringValue(facts.sign) || stringValue(facts.planetSign)),
    house: comparableKey(stringValue(facts.placementHouse) || stringValue(facts.house) || stringValue(facts.houseNumber)),
    ruler: comparableKey(stringValue(facts.traditionalRulerBody) || stringValue(facts.traditionalRuler) || stringValue(facts.rulerBody) || stringValue(facts.ruler) || stringValue(facts.houseRuler)),
    rulerSign: comparableKey(stringValue(facts.traditionalRulerSign) || stringValue(facts.rulerSign) || stringValue(facts.houseRulerSign)),
    rulerHouse: comparableKey(stringValue(facts.traditionalRulerHouse) || stringValue(facts.rulerHouse) || stringValue(facts.houseRulerHouse)),
    modernRuler: comparableKey(stringValue(facts.modernRulerBody) || stringValue(facts.modernRuler)),
    modernRulerSign: comparableKey(stringValue(facts.modernRulerSign)),
    modernRulerHouse: comparableKey(stringValue(facts.modernRulerHouse))
  };
}

function shouldLoadNatalSourceMaterial(input: GenerateContentInput) {
  const parts = natalFactParts(input);
  const type = stringValue(input.facts.type) || input.eventType;

  return input.surface === "natal"
    || input.surface === "you"
    || type.includes("natal")
    || Boolean(parts.blockType && ["sign", "house", "ruler", "essay", "synthesis"].includes(parts.blockType));
}

function scoreNatalPlacementPrimitiveEntry(entry: NatalPlacementPrimitiveEntry, input: GenerateContentInput) {
  const parts = natalFactParts(input);
  const kind = comparableKey(entry.kind);
  const body = comparableKey(entry.body);
  const sign = comparableKey(entry.sign);
  const house = comparableKey(entry.house);
  let score = 0;

  if (kind === "planet" && body && body === parts.body) score += 90;
  if (kind === "planet" && body && body === parts.ruler) score += parts.blockType === "ruler" ? 90 : 40;
  if (kind === "planet" && body && body === parts.modernRuler) score += parts.blockType === "ruler" ? 70 : 30;
  if (kind === "sign" && sign && sign === parts.sign) score += 90;
  if (kind === "sign" && sign && sign === parts.rulerSign) score += parts.blockType === "ruler" ? 70 : 30;
  if (kind === "sign" && sign && sign === parts.modernRulerSign) score += parts.blockType === "ruler" ? 60 : 20;
  if (kind === "house" && house && house === parts.house) score += 90;
  if (kind === "house" && house && house === parts.rulerHouse) score += parts.blockType === "ruler" ? 70 : 30;
  if (kind === "house" && house && house === parts.modernRulerHouse) score += parts.blockType === "ruler" ? 60 : 20;

  if (parts.blockType === "sign" && kind === "house") score -= 90;
  if (parts.blockType === "house" && kind === "sign") score -= 90;
  if (parts.blockType === "ruler" && kind === "planet" && body === parts.body && body !== parts.ruler) score -= 30;

  return score;
}

function compactNatalPlacementPrimitiveEntry(entry: NatalPlacementPrimitiveEntry) {
  return {
    id: entry.id,
    kind: entry.kind,
    body: entry.body,
    sign: entry.sign,
    house: entry.house,
    title: entry.title,
    sourceAnchors: entry.sourceAnchors,
    sourceNotes: entry.sourceNotes,
    voiceMoves: entry.voiceMoves,
    avoid: entry.avoid
  };
}

function loadNatalPlacementPrimitiveExamples(input: GenerateContentInput) {
  if (!shouldLoadNatalSourceMaterial(input)) {
    return [];
  }

  const entries = loadNatalPlacementPrimitiveCorpora().flatMap((corpus) => corpus.entries ?? []);

  if (!entries.length) {
    return [];
  }

  return entries
    .map((entry, index) => ({ entry, index, score: scoreNatalPlacementPrimitiveEntry(entry, input) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 8)
    .map(({ entry }) => compactNatalPlacementPrimitiveEntry(entry));
}

function natalPlacementPrimitivePrompt(input: GenerateContentInput) {
  const examples = loadNatalPlacementPrimitiveExamples(input);

  if (!examples.length) {
    return "No matching natal placement primitives are available yet.";
  }

  return JSON.stringify(examples, null, 2);
}

function loadSourceBackedRevisionExamples(input: GenerateContentInput) {
  const entries = loadSourceBackedRevisionCorpora().flatMap((corpus) => corpus.entries ?? []);

  if (!entries.length) {
    return [];
  }

  if (isPersonalizedNatalPlacementAspectCard(input)) {
    const inputAspect = aspectPartsFromFacts(input);

    if (!inputAspect) {
      return [];
    }

    const seen = new Set<string>();

    return entries
      .filter((entry) => {
        const entryAspect = sourceBackedAspectParts(entry);

        return Boolean(
          entryAspect
          && inputAspect.aspect === entryAspect.aspect
          && hasSameUnorderedAspectPair(inputAspect, entryAspect)
        );
      })
      .filter((entry) => {
        const key = stringValue(entry.id) || [entry.aspect, entry.target_field].map((value) => stringValue(value)).join("|");

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, 4)
      .map((entry) => compactSourceBackedRevisionEntry(entry));
  }

  const searchText = factSearchText(input);
  const scored = entries
    .map((entry, index) => ({ entry, index, score: scoreSourceBackedRevisionEntry(entry, input, searchText) }))
    .filter(({ score }) => score >= 30)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, 4).map(({ entry }) => compactSourceBackedRevisionEntry(entry));
}

function sourceBackedRevisionPrompt(input: GenerateContentInput) {
  if (!aspectPartsFromFacts(input)) {
    return "No matching source-backed aspect revision rows are available for this task.";
  }

  const examples = loadSourceBackedRevisionExamples(input);

  if (!examples.length) {
    return "No matching source-backed aspect revision rows are available for this task.";
  }

  const promptExamples = isPersonalizedNatalPlacementAspectCard(input)
    ? examples.map(compactSourceBackedRevisionSupportEntry)
    : examples;

  return JSON.stringify(promptExamples, null, 2);
}

function unsupportedClaimPatterns() {
  return [
    /\bThis often traces back\b/i,
    /\blove and safety had to be earned\b/i,
    /\bhow you were cared for when you were young\b/i,
    /\bYou attract the distant ones\b/i,
    /\bThe struggle was never the proof\b/i,
    /\bEasy love is what you actually wanted\b/i,
    /\b(childhood|when you were young|early life|caregiver|caregivers|parent|parents|mother|father|family system)\b/i,
    /\b(trauma|traumatic|attachment wound|wounded attachment|earned love|had to earn love|had to prove you were lovable)\b/i,
    /\byou attract (the|people|partners|someone)\b/i
  ];
}

function containsUnsupportedClaim(value?: string) {
  if (!value) {
    return false;
  }

  return unsupportedClaimPatterns().some((pattern) => pattern.test(value));
}

function replaceUnsupportedClaimParagraphs(value: string, replacement: string) {
  if (!containsUnsupportedClaim(value) || !replacement.trim()) {
    return value;
  }

  const paragraphs = value.split(/\n{2,}/);

  if (paragraphs.length <= 1) {
    return replacement.trim();
  }

  return paragraphs
    .map((paragraph) => containsUnsupportedClaim(paragraph) ? replacement.trim() : paragraph)
    .join("\n\n")
    .trim();
}

function applySourceBackedRevisionScrub(content: GeneratedContent, input: GenerateContentInput): GeneratedContent {
  const examples = loadSourceBackedRevisionExamples(input);

  if (!examples.length) {
    return content;
  }

  return normalizeGeneratedCopyFields(examples.reduce<GeneratedContent>((draft, entry) => {
    const replacement = entry.replacementText?.trim();

    if (!replacement) {
      return draft;
    }

    const targetField = entry.targetField?.toLowerCase();

    if (targetField === "summary" || targetField === "tldr") {
      const summary = containsUnsupportedClaim(draft.summary) ? replacement : draft.summary;
      const tldr = containsUnsupportedClaim(draft.tldr) ? replacement : draft.tldr;

      return {
        ...draft,
        summary,
        tldr
      };
    }

    if (targetField === "body") {
      return {
        ...draft,
        body: replaceUnsupportedClaimParagraphs(draft.body, replacement)
      };
    }

    return {
      ...draft,
      summary: containsUnsupportedClaim(draft.summary) ? replacement : draft.summary,
      tldr: containsUnsupportedClaim(draft.tldr) ? replacement : draft.tldr,
      body: replaceUnsupportedClaimParagraphs(draft.body, replacement)
    };
  }, content));
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
    sourceMethodRules(),
    "",
    "CONTENT MODE",
    modeRulesForInput(input),
    "",
    "SURFACE",
    input.surface,
    formatLunationTemplateInstruction(input),
    "",
    "EVENT TYPE",
    input.eventType,
    "",
    natalPlacementFactInstruction(input),
    synastryWritingSystemPrompt(input),
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
    "ASTROLOGY SOURCE MATERIAL",
    "Use this repo-safe astrology material as the primary interpretive source layer for natal placement pages and personalized natal placement aspect cards. For primary placement pages, treat the placement as the main interpretation. For aspect cards, treat the primary placement as the home base and the aspect planet as a modifier to that placement. Use house material to connect where the primary placement lives with where aspect or ruler material presses, supports, or complicates it. Do not imitate generic astrology reference prose.",
    projectAuthoredNatalPlacementPrompt(input),
    projectAuthoredNatalAspectCardPrompt(input),
    "TAROT / SYMBOLIC NOTES - DO NOT USE IN NATAL PLACEMENT COPY",
    "Any source packet marked as tarot, symbolic, correspondence, card, or archetype material is preserved for review only. Do not include it in natal placement page copy.",
    "BUSINESS NOTES - USE ONLY IN BUSINESS MODE",
    "Any source packet marked as business material is preserved for business/career-specific generation only. Do not include it in ordinary natal placement page copy.",
    "TECHNICAL ASPECT NOTES",
    "Use technical aspect notes only to preserve aspect accuracy and to keep aspect cards attached to the primary natal placement.",
    "",
    "VOICE RULES",
    natalPlacementPrimitiveRules(),
    natalPlacementPrimitivePrompt(input),
    "",
    "SOURCE-BACKED ASPECT REFERENCES",
    "Use these source-backed rows only as base aspect accuracy and claim-safety support after ASTROLOGY SOURCE MATERIAL and natal placement primitives. For personalized natal placement aspect cards, they are not prose examples; use only their themes to respect and claims to avoid. Do not let these rows override supplied signs, houses, or project-authored placement material. Do not imitate their prose style, sentence structure, or generic aspect-article openings.",
    sourceBackedRevisionPrompt(input),
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

function validateGeneratedContentQuality(content: GeneratedContent, input: GenerateContentInput) {
  const userFacingText = [
    content.headline,
    content.tldr,
    content.summary,
    content.body,
    content.action,
    content.timing,
    ...(content.sections ?? []).flatMap((section) => [section.heading, section.body])
  ].filter(Boolean).join("\n");
  const normalized = normalizeText(userFacingText);
  const sectionHeadings = (content.sections ?? []).map((section) => stringValue(section.heading));
  const requiredHeadings = requiredSectionHeadingsForInput(input);
  const matchedRequired = sectionHeadingSetMatch(sectionHeadings, requiredHeadings);

  if (userFacingText.includes("—")) {
    throw new Error("Generated content used an em dash. Please regenerate after revising the prompt or voice notes.");
  }

  const badAiFlags = badAiGenerationFlags(userFacingText);

  if (badAiFlags.length) {
    hardEditorialViolation(badAiFlags, `Generated content matched bad AI generation pattern: ${badAiFlags.join(", ")}`);
  }

  const softWarnings = softVoiceWarningFailures(content, input);

  for (const phrase of bannedUserFacingPhrases) {
    if (softWarnings.includes(phrase)) {
      continue;
    }

    if (isApprovedSynastryExampleException(phrase, normalized, input)) {
      continue;
    }

    if (hasBannedPhrase(normalized, phrase)) {
      hardEditorialViolation([phrase], `Generated content used banned phrase: ${phrase}`);
    }
  }

  for (const signature of bannedOutputSignatures) {
    if (normalized.includes(signature)) {
      hardEditorialViolation([signature], `Generated content included disallowed phrase: ${signature}`);
    }
  }

  if (isSynastryAspectInput(input)) {
    const synastryMatches = synastryBannedPhrases.filter((phrase) => hasBannedPhrase(normalized, phrase));

    if (synastryMatches.length) {
      hardEditorialViolation(synastryMatches, `Generated synastry content used banned phrase: ${synastryMatches.join(", ")}`);
    }
  }

  if (isNatalAspectGenerationContext(input)) {
    const natalAspectText = mainCopyText(content);
    const natalAspectBody = content.body.trim();
    const clippedCommand = clippedCommandListCadence(natalAspectText);
    const transitSentence = natalAspectTransitLanguage(natalAspectText);
    const conditionalSentence = natalAspectConditionalChartLanguage(natalAspectText);
    const vagueFillerSentence = natalAspectVagueFiller(natalAspectBody);
    const reportPhraseSentence = natalAspectReportPhrase(natalAspectBody);
    const textbookOpeningSentence = natalAspectTextbookOpening(natalAspectBody);
    const factUsageFailure = hasPersonalizedNatalAspectFacts(input.facts)
      ? personalizedNatalAspectFactUsageFailure(natalAspectBody, input.facts)
      : "";

    if (clippedCommand) {
      hardEditorialViolation(["clipped command-list cadence"], `Generated natal aspect copy used clipped command-list cadence: ${clippedCommand}`);
    }

    if (transitSentence) {
      hardEditorialViolation(["transit/current-sky language"], `Generated natal aspect copy used transit/current-weather language: ${transitSentence}`);
    }

    if (hasPersonalizedNatalAspectFacts(input.facts) && conditionalSentence) {
      hardEditorialViolation(["conditional chart language"], `Generated personalized natal aspect copy used conditional chart language: ${conditionalSentence}`);
    }

    if (vagueFillerSentence) {
      hardEditorialViolation(["vague AI astrology filler"], `Generated natal aspect copy used vague AI astrology filler: ${vagueFillerSentence}`);
    }

    if (reportPhraseSentence) {
      hardEditorialViolation(["report-style phrasing"], `Generated natal aspect copy used report-style phrasing: ${reportPhraseSentence}`);
    }

    if (textbookOpeningSentence) {
      throw new Error(`Generated natal aspect copy used a textbook opening: ${textbookOpeningSentence}`);
    }

    if (factUsageFailure) {
      throw new Error(`Generated personalized natal aspect copy ignored supplied chart facts: ${factUsageFailure}`);
    }
  }

  if (content.summary.trim().length < 40) {
    throw new Error("Generated summary is too thin for editorial review.");
  }

  if (content.body.trim().length < 180) {
    throw new Error("Generated body is too thin for editorial review.");
  }

  if (isPrimaryNatalPlacementGeneration(input)) {
    const hasAspectInputs = arrayRecordValue(input.facts.aspects).length > 0;
    const natalBanned = natalPlacementBannedPhraseFailures(content);
    const tarotReferences = natalPlacementTarotReferenceFailures(content);
    const natalTransitLanguage = natalPlacementTransitLanguageFailures(content);
    const visibleScaffold = natalPlacementVisibleScaffoldFailures(content);
    const conditionalChartLanguage = conditionalChartLanguageFailures(content);
    const aspectCardSections = (content.sections ?? [])
      .filter((section) => stringValue(section.heading) && stringValue(section.body).length >= 60);

    if (natalBanned.length) {
      hardEditorialViolation(natalBanned, `Generated natal placement copy used banned phrase: ${natalBanned.join(", ")}`);
    }

    if (tarotReferences.length) {
      hardEditorialViolation(tarotReferences, `Generated natal placement copy used tarot references: ${tarotReferences.join(", ")}`);
    }

    if (natalTransitLanguage.length) {
      hardEditorialViolation(natalTransitLanguage, `Generated natal placement copy used transit/current-sky language: ${natalTransitLanguage.join(", ")}`);
    }

    if (visibleScaffold.length) {
      hardEditorialViolation(visibleScaffold, `Generated natal placement copy used visible article scaffolding: ${visibleScaffold.join(", ")}`);
    }

    if (conditionalChartLanguage.length) {
      hardEditorialViolation(conditionalChartLanguage, `Generated natal placement copy used conditional chart language: ${conditionalChartLanguage.join(", ")}`);
    }

    if (!hasAspectInputs && (content.sections ?? []).length > 0) {
      hardEditorialViolation(["pseudo sections"], "Generated natal placement page included pseudo-sections even though no aspects were supplied.");
    }

    if (hasAspectInputs && aspectCardSections.length < 1) {
      throw new Error("Generated natal placement page did not include a usable aspect card section.");
    }

    for (const section of aspectCardSections) {
      if (section.body.trim().length >= content.body.trim().length) {
        throw new Error("Generated natal placement aspect card was not shorter than the primary placement body.");
      }
    }

    return;
  }

  if (!hasEnoughSectionContent(content.sections ?? [])) {
    throw new Error("Generated sections are too shallow for review quality.");
  }

  if (requiredHeadings.length > 0 && matchedRequired.length < requiredHeadings.length - 1) {
    throw new Error(
      `Generated sections missing required headings. Expected includes: ${requiredHeadings.join(", ")}`
    );
  }
}

function validateAstrologyDrilldownQuality(content: GeneratedContent) {
  const drilldown = content.astrologyDrilldown;

  if (!drilldown) {
    throw new Error("Generated content did not include astrologyDrilldown.");
  }

  if (stringValue(drilldown.title) !== "Why this?") {
    throw new Error("Generated astrologyDrilldown must use title: Why this?");
  }

  if (stringValue(drilldown.summary).length < 50) {
    throw new Error("Generated astrologyDrilldown summary is too thin.");
  }

  if (!Array.isArray(drilldown.factors) || drilldown.factors.length < 2) {
    throw new Error("Generated astrologyDrilldown must include at least two astrology factors.");
  }

  const invalidFactor = drilldown.factors.find((factor) => (
    stringValue(factor.label).length < 3 ||
    stringValue(factor.technicalFact).length < 8 ||
    stringValue(factor.plainMeaning).length < 20
  ));

  if (invalidFactor) {
    throw new Error("Generated astrologyDrilldown contains a factor that is too thin.");
  }

  if (stringValue(drilldown.whyThisScene).length < 80) {
    throw new Error("Generated astrologyDrilldown must explain why this scene was chosen.");
  }

  const drilldownText = [
    drilldown.title,
    drilldown.summary,
    ...drilldown.factors.flatMap((factor) => [factor.label, factor.technicalFact, factor.plainMeaning]),
    drilldown.whyThisScene,
    drilldown.timingNote
  ].filter(Boolean).join("\n");

  if (drilldownText.includes("—")) {
    throw new Error("Generated astrologyDrilldown used an em dash.");
  }

  if (countMatches(drilldownText, editorialBannedPhrases) > 2) {
    throw new Error("Generated astrologyDrilldown sounds too much like generic astrology copy.");
  }
}

export function evaluateEditorialCoherence(
  draft: GeneratedAstrologyDraft,
  context: GenerationContext
): EditorialGateResult {
  const failures: EditorialFailure[] = [];
  const isTransitArticleContext = isTransitArticle(context);
  const isNatalAspectContext = isNatalAspectGenerationContext(context);
  const summary = stringValue(draft.summary);
  const body = stringValue(draft.body);
  const firstSummarySentence = isTransitArticleContext ? firstSentence(body || summary) : firstSentence(summary || body);
  const openingBody = firstParagraph(body);
  const reviewText = [summary, openingBody, ...(draft.sections ?? []).map((section) => section.body)].join("\n");
  const normalizedFirstSentence = normalizeText(firstSummarySentence);
  const summaryLifeAreas = lifeAreasIn(summary);
  const openingLifeAreas = lifeAreasIn([summary, openingBody].join(" "));
  const textbookMatches = matchedPhrases(reviewText, editorialBannedPhrases);
  const selfHelpMatches = matchedPhrases(reviewText, selfHelpTonePhrases);
  const genericAdviceMatches = matchedPhrases(reviewText, genericAdvicePhrases);
  const astrologyTermCount = countMatches([firstSummarySentence, openingBody].join(" "), astrologyMechanicTerms);
  const keywordListSentence = sentencesFrom([summary, openingBody].join(" ")).find(sentenceHasKeywordListing);
  const technicalMainCopy = technicalAstrologyInMainCopy(draft);
  const unsupportedExternalScene = unsupportedExternalSceneInMainCopy(draft, context.facts);
  const timeLordPlanet = timeLordPlanetFromFacts(context.facts);
  const isDailySkyAspect = isDailySkyFeedAspect(context);
  const timeLordSceneText = [
    summary,
    openingBody,
    isRecord(draft.sceneLock) ? Object.values(draft.sceneLock).flat().join(" ") : "",
    draft.astrologyDrilldown?.whyThisScene ?? ""
  ].join(" ");
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

  if (!isDailySkyAspect && !isTransitArticleContext && !isNatalAspectContext && technicalMainCopy.hasTechnicalAstrology) {
    addEditorialFailure(
      failures,
      "TECHNICAL_ASTROLOGY_IN_MAIN_COPY",
      "The main card includes technical astrology that belongs in the drilldown."
    );
  }

  if (unsupportedExternalScene.hasUnsupportedExternalScene) {
    addEditorialFailure(
      failures,
      "UNSUPPORTED_EXTERNAL_SCENE",
      "The main card invents an external event that is not supported by the facts."
    );
  }

  if (timeLordPlanet && (timeLordMisuseSentence || !timeLordUsedAsSceneFilter(timeLordSceneText, timeLordPlanet))) {
    addEditorialFailure(
      failures,
      "TIME_LORD_NOT_USED_AS_SCENE_FILTER",
      `The ${timeLordPlanet} time lord was not used to choose one ordinary life scene.`
    );
  }

  if (
    !draft.astrologyDrilldown ||
    draft.astrologyDrilldown.factors.length < 2 ||
    stringValue(draft.astrologyDrilldown.whyThisScene).length < 80
  ) {
    addEditorialFailure(
      failures,
      "DRILLDOWN_TOO_THIN",
      "The astrology drilldown does not clearly explain why this scene was chosen."
    );
  }

  if (summaryLifeAreas.length > 2) {
    addEditorialFailure(
      failures,
      "TOO_MANY_LIFE_AREAS",
      "The summary names more than two life areas."
    );
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

  if (!isDailySkyAspect && !isTransitArticleContext && !isNatalAspectContext && (astrologyTermCount >= 5 || /\b(activates|activation|venusian|plutonian|8th house|eighth house)\b/i.test(reviewText))) {
    addEditorialFailure(
      failures,
      "ASTROLOGY_OVERLOAD",
      "Astrology mechanics carry the prose instead of supporting the human situation."
    );
  }

  textbookMatches.forEach((phrase) => {
    addEditorialFailure(
      failures,
      "TEXTBOOK_PHRASE",
      `The phrase '${phrase}' sounds like generic astrology copy.`
    );
  });

  selfHelpMatches.forEach((phrase) => {
    addEditorialFailure(
      failures,
      "SELF_HELP_TONE",
      `The phrase '${phrase}' sounds too self-help or new-age.`,
      context.mode === "article" ? "warning" : "fail"
    );
  });

  genericAdviceMatches.forEach((phrase) => {
    addEditorialFailure(
      failures,
      "GENERIC_ADVICE",
      `The advice phrase '${phrase}' is too generic.`
    );
  });

  const actionSections = (draft.sections ?? []).filter((section) => /what to do|action|advice/i.test(section.heading));
  const actionText = actionSections.map((section) => section.body).join(" ") || body.split(/\n\s*\n/).slice(-1)[0] || "";
  if (
    actionText &&
    !/\b(ask|check|say|wait|get|write|send|schedule|name|choose|do not|don't|call|clarify|make)\b/i.test(actionText)
  ) {
    addEditorialFailure(
      failures,
      "GENERIC_ADVICE",
      "The advice does not give one specific action."
    );
  }

  if (
    context.surface === "synastry" ||
    context.surface === "composite" ||
    context.surface === "relationship"
  ) {
    const relationshipAbstractPhrases = [
      "this contact can feel",
      "socially smooth",
      "easy warmth",
      "at home in your own skin",
      "feel liked, comfortable"
    ];
    const relationshipMatches = matchedPhrases(reviewText, relationshipAbstractPhrases);

    relationshipMatches.forEach((phrase) => {
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

function parseGeneratedContentJson(raw: string, lockedHeadline: string): GeneratedContent {
  const parsed = JSON.parse(raw) as Partial<GeneratedContent>;

  if (!parsed.headline || !parsed.summary || !parsed.body) {
    throw new Error("Model response did not include headline, summary, and body.");
  }

  return normalizeGeneratedCopyFields({
    headline: lockedHeadline ?? parsed.headline,
    tldr: parsed.tldr,
    summary: parsed.summary,
    body: parsed.body,
    action: parsed.action,
    timing: parsed.timing,
    sceneLock: parsed.sceneLock,
    astrologyDrilldown: parsed.astrologyDrilldown,
    sections: parsed.sections ?? []
  });
}

function stripGeneratedTldrPrefix(value: string) {
  return value.trim().replace(/^tldr\s*:\s*/i, "").trim();
}

function splitGeneratedLeadingTldr(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^tldr\s*:\s*([\s\S]*?)(?:\n{2,}([\s\S]*)|$)/i);

  if (!match) {
    return {
      tldr: "",
      body: value
    };
  }

  return {
    tldr: match[1]?.trim() ?? "",
    body: match[2]?.trim() ?? ""
  };
}

function normalizeGeneratedCopyFields(content: GeneratedContent): GeneratedContent {
  const splitBody = splitGeneratedLeadingTldr(content.body);
  const tldr = stripGeneratedTldrPrefix(content.tldr ?? "") || splitBody.tldr || stripGeneratedTldrPrefix(content.summary);
  const body = (splitBody.tldr ? splitBody.body : content.body).trim() || content.body.trim();

  return {
    ...content,
    tldr,
    summary: tldr,
    body
  };
}

function validateGeneratedContentForInput(content: GeneratedContent, input: GenerateContentInput) {
  validateGeneratedContentQuality(content, input);
  validateAstrologyDrilldownQuality(content);

  if (isNatalAspectGenerationContext(input)) {
    return;
  }

  if (isPrimaryNatalPlacementGeneration(input)) {
    return;
  }

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
}

function parseResponseJson(raw: string, lockedHeadline: string, input: GenerateContentInput): GeneratedContent {
  const content = applySourceBackedRevisionScrub(parseGeneratedContentJson(raw, lockedHeadline), input);

  validateGeneratedContentForInput(content, input);

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
  if (isPrimaryNatalPlacementGeneration(input) && !allowsPrivateSourceModelGeneration()) {
    return deterministicNatalPlacementDraft(input);
  }

  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_MODEL ?? defaultOpenAiModel;
  const lockedHeadline = factualHeadlineFor(input);
  const approvedExamples = await loadApprovedExamples(input);
  let qualityFeedback = "";
  let lastError: Error | null = null;
  let lastDraft: StoredGeneratedContent | null = null;

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
            schema: generatedContentSchema
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
      const draft = {
        ...applySourceBackedRevisionScrub(parseGeneratedContentJson(outputText, lockedHeadline || ""), input),
        responseId: payload.id,
        model,
        retryCount: attempt
      };

      lastDraft = draft;
      validateGeneratedContentForInput(draft, input);

      return withGenerationQualityDiagnostics(draft, input);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Generated content failed quality gates.");
      qualityFeedback = [
        lastError.message,
        retryInstructionForError(lastError, lastDraft, input)
      ].join("\n");
    }
  }

  if (input.allowQualityFallback && lastDraft) {
    if (isHardEditorialViolation(lastError)) {
      throw lastError;
    }

    return {
      ...withGenerationQualityDiagnostics(lastDraft, input),
      qualityWarning: lastError?.message ?? "Generated content failed quality gates."
    };
  }

  if (isHardEditorialViolation(lastError)) {
    throw lastError;
  }

  throw new ContentGenerationQualityError(lastError?.message ?? "Generated content failed quality gates.");
}

function claudeToolInput(payload: {
  content?: Array<{
    type?: string;
    name?: string;
    input?: unknown;
  }>;
}) {
  return payload.content?.find((content) => (
    content.type === "tool_use" &&
    content.name === "tldr_astro_generated_content" &&
    content.input
  ))?.input;
}

export async function generateWithClaude(input: GenerateContentInput): Promise<StoredGeneratedContent> {
  if (isPrimaryNatalPlacementGeneration(input) && !allowsPrivateSourceModelGeneration()) {
    return deterministicNatalPlacementDraft(input);
  }

  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL ?? defaultClaudeModel;
  const lockedHeadline = factualHeadlineFor(input);
  const approvedExamples = await loadApprovedExamples(input);
  let qualityFeedback = "";
  let lastError: Error | null = null;
  let lastDraft: StoredGeneratedContent | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 5000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildPrompt(input, approvedExamples, qualityFeedback)
              }
            ]
          }
        ],
        tools: [
          {
            name: "tldr_astro_generated_content",
            description: "Return the final TLDR Astro generated content draft.",
            input_schema: generatedContentSchema
          }
        ],
        tool_choice: {
          type: "tool",
          name: "tldr_astro_generated_content"
        }
      })
    });

    const payload = await response.json() as {
      id?: string;
      content?: Array<{
        type?: string;
        name?: string;
        input?: unknown;
      }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Claude request failed with ${response.status}.`);
    }

    const toolInput = claudeToolInput(payload);

    if (!toolInput) {
      throw new Error("Claude response did not include generated content.");
    }

    try {
      const draft = {
        ...applySourceBackedRevisionScrub(parseGeneratedContentJson(JSON.stringify(toolInput), lockedHeadline || ""), input),
        responseId: payload.id,
        model,
        retryCount: attempt
      };

      lastDraft = draft;
      validateGeneratedContentForInput(draft, input);

      return withGenerationQualityDiagnostics(draft, input);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Generated content failed quality gates.");
      qualityFeedback = [
        lastError.message,
        retryInstructionForError(lastError, lastDraft, input)
      ].join("\n");
    }
  }

  if (input.allowQualityFallback && lastDraft) {
    if (isHardEditorialViolation(lastError)) {
      throw lastError;
    }

    return {
      ...withGenerationQualityDiagnostics(lastDraft, input),
      qualityWarning: lastError?.message ?? "Generated content failed quality gates."
    };
  }

  if (isHardEditorialViolation(lastError)) {
    throw lastError;
  }

  throw new ContentGenerationQualityError(lastError?.message ?? "Generated content failed quality gates.");
}

export async function generateContent(input: GenerateContentInput): Promise<StoredGeneratedContent> {
  if (isPrimaryNatalPlacementGeneration(input) && !allowsPrivateSourceModelGeneration()) {
    return deterministicNatalPlacementDraft(input);
  }

  const provider = contentGenerationProvider({
    requestedProvider: input.provider,
    blockType: typeof input.facts.blockType === "string" ? input.facts.blockType : null,
    contentType: typeof input.facts.contentType === "string" ? input.facts.contentType : null
  });

  if (provider === "claude") {
    return generateWithClaude(input);
  }

  if (provider === "openai") {
    return generateWithOpenAI(input);
  }

  throw new Error(`Unsupported content generation provider '${provider}'. Use 'openai' or 'claude'.`);
}

export async function saveGeneratedInterpretation(input: GenerateContentInput, generated: StoredGeneratedContent) {
  const supabaseUrl = process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const blockType = typeof input.facts.blockType === "string" ? input.facts.blockType : null;
  const provider = contentGenerationProvider({
    requestedProvider: input.provider,
    blockType: typeof input.facts.blockType === "string" ? input.facts.blockType : null,
    contentType: typeof input.facts.contentType === "string" ? input.facts.contentType : null
  });
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
      block_type: blockType,
      facts: input.facts,
      knowledge_ids: input.knowledgeIds ?? [],
      source_snapshot: input.sourceSnapshot ?? {},
      prompt_version: promptVersion,
      provider,
      model: generated.model,
      headline: generated.headline,
      summary: generated.summary,
      body: generated.body,
      sections: {
        sections: generated.sections ?? [],
        sceneLock: generated.sceneLock ?? null,
        astrologyDrilldown: generated.astrologyDrilldown ?? null
      },
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
    frameworks?: Array<Record<string, unknown>>;
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
    transits: (sky.transits ?? []).slice(0, 12),
    frameworks: asArray(sky.frameworks).filter((framework) => {
      const frameworkId = stringValue((framework as { id?: unknown }).id);
      return frameworkId === SKY_LUNATION_FRAMEWORK_ID || frameworkId === SKY_LUNATION_RITUAL_ID || frameworkId === "traditional-transit-framework";
    })
  };
}
