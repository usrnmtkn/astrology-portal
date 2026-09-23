import { transitReportEditorialGuide } from "./transit-report-editorial-guide.js";
import { transitReadingReaderText } from "./transit-reading-reader-copy.js";
import { untraceableTransitReadingDates } from "./transit-reading-dates.js";
import { extractTransitAspectClaims, isOrdinaryAspectWord, transitAspectKeysFromEvidence } from "./transit-reading-aspect-claims.js";
type RecordLike = Record<string, unknown>;

export const YOU_TRANSIT_READING_BRIEF_SCHEMA = "tldr.you-transit-reading-brief.v1";
export const YOU_DAY_READING_SUBJECT_TYPE = "you_day_reading";
export const YOU_WEEK_READING_SUBJECT_TYPE = "you_week_reading";
export const YOU_TRANSIT_READING_PROMPT_VERSION = "you-transit-reading-v1.5";

export type YouTransitReadingWindow = "day" | "week";

export type YouTransitReadingBrief = {
  schema: typeof YOU_TRANSIT_READING_BRIEF_SCHEMA;
  window: YouTransitReadingWindow;
  targetDate: string;
  periodEnd: string;
  dateLabel: string;
  approvedReaderText: RecordLike;
  technicalEvidence: RecordLike;
};

export type YouTransitReadingDraft = {
  headline: string;
  tldr?: string;
  summary: string;
  body: string;
  action?: string;
  timing?: string;
  sections?: Array<{ heading?: string; body?: string }>;
};

export type YouTransitReadingValidationIssue = {
  code:
    | "invalid_brief"
    | "internal_field_leak"
    | "untraceable_body"
    | "untraceable_aspect"
    | "untraceable_transit_claim"
    | "untraceable_sign"
    | "untraceable_house"
    | "untraceable_degree"
    | "untraceable_date"
    | "standing_trait_language";
  value: string;
  message: string;
};

const BODY_ALIASES = [
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
  "Chiron", "Lilith", "Black Moon Lilith", "North Node", "South Node", "Ascendant", "Rising", "Midheaven", "MC",
  "Descendant", "IC", "Imum Coeli"
];
const ASPECT_ALIASES = ["conjunct", "conjunction", "opposes", "opposite", "opposition", "square", "squares", "trine", "trines", "sextile", "sextiles"];
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

const BODY_PATTERN = BODY_ALIASES.sort((a, b) => b.length - a.length).map(escapeRegex).join("|");
const ASPECT_PATTERN = ASPECT_ALIASES.sort((a, b) => b.length - a.length).map(escapeRegex).join("|");
const SIGN_PATTERN = SIGNS.map((sign) => sign.toLowerCase()).join("|");

function canonicalAspect(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "conjunct" || normalized === "conjunction") return "conjunction";
  if (normalized === "opposes" || normalized === "opposite" || normalized === "opposition") return "opposition";
  if (normalized === "squares" || normalized === "square") return "square";
  if (normalized === "trines" || normalized === "trine") return "trine";
  if (normalized === "sextiles" || normalized === "sextile") return "sextile";
  return normalized;
}

function record(value: unknown): RecordLike | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isoDate(value: unknown) {
  const text = stringValue(value);
  return /^\d{4}-\d{2}-\d{2}$/u.test(text) ? text : "";
}

export function assertYouTransitReadingBrief(value: unknown): YouTransitReadingBrief {
  const brief = record(value);
  if (!brief || brief.schema !== YOU_TRANSIT_READING_BRIEF_SCHEMA) {
    throw new Error("YOU_TRANSIT_READING_BRIEF_SCHEMA_INVALID");
  }
  const window = brief.window === "day" || brief.window === "week" ? brief.window : null;
  const targetDate = isoDate(brief.targetDate);
  const periodEnd = isoDate(brief.periodEnd);
  const approvedReaderText = record(brief.approvedReaderText);
  const technicalEvidence = record(brief.technicalEvidence);
  if (!window || !targetDate || !periodEnd || periodEnd < targetDate || !approvedReaderText || !technicalEvidence) {
    throw new Error("YOU_TRANSIT_READING_BRIEF_INVALID");
  }
  if (!JSON.stringify(approvedReaderText).replace(/[{}[\]",:]/gu, "").trim()) {
    throw new Error("YOU_TRANSIT_READING_READER_TEXT_REQUIRED");
  }
  return {
    schema: YOU_TRANSIT_READING_BRIEF_SCHEMA,
    window,
    targetDate,
    periodEnd,
    dateLabel: stringValue(brief.dateLabel),
    approvedReaderText,
    technicalEvidence
  };
}

export function youTransitReadingSubjectType(window: YouTransitReadingWindow) {
  return window === "day" ? YOU_DAY_READING_SUBJECT_TYPE : YOU_WEEK_READING_SUBJECT_TYPE;
}

export function youTransitReadingRequestLock(input: { brief: unknown }) {
  const brief = assertYouTransitReadingBrief(input.brief);
  const subjectType = youTransitReadingSubjectType(brief.window);
  const headline = brief.window === "day" ? "Your day, in depth" : "Your week, in depth";
  return {
    brief,
    subjectType,
    subjectId: `self:${brief.window}`,
    contentKey: `you-transit-reading/${brief.window}/${brief.targetDate}`,
    surface: "you" as const,
    mode: "in_depth" as const,
    eventType: brief.window === "day" ? "you-day-reading" : "you-week-reading",
    headline,
    knowledgeIds: [],
    facts: {
      contentType: subjectType,
      blockType: subjectType,
      youTransitReadingBrief: brief
    },
    sourceSnapshot: {
      schema: "you-transit-reading-source.v1",
      briefSchema: brief.schema,
      reportWindow: brief.window,
      subjectLabel: "You",
      targetDate: brief.targetDate,
      periodEnd: brief.periodEnd,
      dateLabel: brief.dateLabel
    }
  };
}

export function compactYouTransitReadingBrief(brief: YouTransitReadingBrief): YouTransitReadingBrief {
  if (brief.window === "day") return brief;
  const approved = { ...brief.approvedReaderText };
  const technical = { ...brief.technicalEvidence };
  if (Array.isArray(approved.aspects)) approved.aspects = approved.aspects.slice(0, 3);
  if (Array.isArray(technical.readings)) technical.readings = technical.readings.slice(0, 4);
  return { ...brief, approvedReaderText: approved, technicalEvidence: technical };
}

export function youTransitReadingPrompt(input: { brief: YouTransitReadingBrief; headline: string }) {
  const { brief } = input;
  const bodyContract = brief.window === "day"
    ? "body: 2-3 natural paragraphs, roughly 120-200 words. The TLDR already states the main observation, so begin with the next supported consequence, distinction, or action and end with a practical consequence or useful perspective."
    : "body: 3-5 natural paragraphs, usually 180-300 words. If the brief has only one meaningful reader-safe source, 140-220 words is enough. Develop the main theme and its distinct supported consequences, without section headings or a mandatory paragraph sequence. Advance the TLDR instead of restarting it. Preserve supplied timing and distinguish the main theme from secondary pressure or support; advice is optional and must follow from the supplied meaning.";
  return [
    "TLDR ASTRO PERSONAL TRANSIT SYNTHESIS V1.5",
    "",
    "TASK",
    `Write one in-depth ${brief.window} report for the reader.`,
    "Write directly to the reader in second person using you/your.",
    "Use the same synthesis standard as the governed Friends transit reading: what matters first, astrology only as needed, concrete known life domains when they are actually supplied, and clearly hypothetical illustrations supported by the supplied meaning.",
    "This is synthesis only. TLDR Astro has already calculated and selected the evidence and already supplied reader-safe source text.",
    "Reader-facing meaning must come from APPROVED READER TEXT. TECHNICAL EVIDENCE may confirm names, dates, houses, aspects, and timing, but it does not authorize a new behavioral interpretation, motive, outcome, or life circumstance from general astrology knowledge. If a technical transit has no reader-safe meaning in APPROVED READER TEXT, omit its interpretation instead of explaining it.",
    "Do not calculate astrology. Do not add a transit, placement, aspect, sign, house, date, degree, orb, or interpretation that is not present below. Hypothetical illustrations follow the current owner report direction below.",
    "Do not turn a temporary transit into a permanent personality claim.",
    "Do not expose source units, IDs, schemas, scores, derivation fields, approval state, or backend language.",
    "No tarot. No em dashes. No bullets. No section labels inside the body.",
    "Use an ordinary hypothetical example only when the supplied reader meaning supports its domain and consequence; never assert that it happened.",
    "Prefer concrete nouns already present in the approved reader text instead of retreating to vague phrases such as 'something important' or 'an area of life.'",
    "Do not animate abstractions. An opening or opportunity may appear, be available, or be used; do not make it sit, become a door, point, carry weight, form a longer arc, or 'point the same way' unless that wording is explicitly supplied in APPROVED READER TEXT.",
    "Do not use report-scaffolding phrases such as 'the trap is,' 'what this means,' 'what this looks like in practice,' 'the conditions right now,' or 'not today's headline.' State the supported condition or consequence directly.",
    "The TLDR has already made the opening observation. The body must not restate it or repeat its example list with synonyms. Every paragraph must add a distinct supported consequence, explanation, distinction, or action. If the evidence is thin, write shorter rather than padding the report.",
    "For a week report, use supplied date/day/timing information to organize the sequence only when it is present. Do not invent a day, progression across the week, or consequence in the following week when the brief does not supply it.",
    "",
    "OUTPUT",
    `headline: return exactly ${JSON.stringify(input.headline)}.`,
    "tldr: 1-2 natural sentences that answer what matters in this period.",
    "summary: return the same text as tldr. These are compatibility aliases for one visible TLDR, not two reader-facing passages.",
    bodyContract,
    "Do not add a generic coaching closer.",
    "Return JSON only.",
    "",
    transitReportEditorialGuide(),
    "",
    "APPROVED READER TEXT",
    JSON.stringify(brief.approvedReaderText, null, 2),
    "",
    "TECHNICAL EVIDENCE - FACT LOCK ONLY",
    JSON.stringify(brief.technicalEvidence, null, 2)
  ].join("\n");
}

function renderedText(draft: YouTransitReadingDraft) {
  return transitReadingReaderText(draft);
}

function sourceText(brief: YouTransitReadingBrief) {
  return JSON.stringify({ approvedReaderText: brief.approvedReaderText, technicalEvidence: brief.technicalEvidence }).toLowerCase();
}

function sourceContainsHouse(source: string, houseNumber: number) {
  const compactSource = source.replace(/\s+/gu, "");
  if (compactSource.includes(`\"house\":${houseNumber}`)) return true;
  return new RegExp(`\\b${houseNumber}(?:st|nd|rd|th)?\\s+house\\b`, "iu").test(source);
}

export function validateYouTransitReadingDraft(input: {
  draft: YouTransitReadingDraft;
  brief: YouTransitReadingBrief;
  expectedHeadline: string;
}) {
  const issues: YouTransitReadingValidationIssue[] = [];
  const text = renderedText(input.draft);
  const source = sourceText(input.brief);
  if (input.draft.headline.trim() !== input.expectedHeadline.trim()) {
    issues.push({ code: "invalid_brief", value: input.draft.headline, message: "You transit reading headline changed from the locked report title." });
  }
  for (const match of text.matchAll(/\b(?:source units?|source rows?|approval state|schema|backend|derivation|qualifying transits?)\b/giu)) {
    issues.push({ code: "internal_field_leak", value: match[0], message: "You transit reading exposed an internal evidence field." });
  }
  for (const match of text.matchAll(new RegExp(`\\b(${BODY_PATTERN})\\b`, "giu"))) {
    if (!source.includes(match[0].toLowerCase())) issues.push({ code: "untraceable_body", value: match[0], message: `${match[0]} is not present in the governed report brief.` });
  }
  for (const match of text.matchAll(new RegExp(`\\b(${ASPECT_PATTERN})\\b`, "giu"))) {
    if (isOrdinaryAspectWord(text, match.index ?? 0, match[0])) continue;
    if (!source.includes(canonicalAspect(match[0]))) issues.push({ code: "untraceable_aspect", value: match[0], message: `${match[0]} is not present in the governed report brief.` });
  }
  const allowedClaims = transitAspectKeysFromEvidence({
    approvedReaderText: input.brief.approvedReaderText,
    technicalEvidence: input.brief.technicalEvidence
  });
  for (const claim of extractTransitAspectClaims(text)) {
    if (!allowedClaims.has(claim.key)) issues.push({
      code: "untraceable_transit_claim", value: claim.text,
      message: `${claim.text} does not match a complete transit/aspect/natal-point claim in the governed report brief.`
    });
  }
  for (const match of text.matchAll(new RegExp(`\\b(${SIGN_PATTERN})\\b`, "giu"))) {
    if (!source.includes(match[0].toLowerCase())) issues.push({ code: "untraceable_sign", value: match[0], message: `${match[0]} is not present in the governed report brief.` });
  }
  for (const match of text.matchAll(/\b([1-9]|1[0-2])(?:st|nd|rd|th)?\s+house\b/giu)) {
    if (!sourceContainsHouse(source, Number(match[1]))) issues.push({ code: "untraceable_house", value: match[0], message: `${match[0]} is not present in the governed report brief.` });
  }
  for (const match of text.matchAll(/\b\d{1,3}(?:\.\d+)?°/gu)) {
    if (!source.includes(match[0].toLowerCase())) issues.push({ code: "untraceable_degree", value: match[0], message: `${match[0]} is not present in the governed report brief.` });
  }
  for (const date of untraceableTransitReadingDates(text, input.brief)) {
    issues.push({ code: "untraceable_date", value: date, message: `${date} is not present in the governed report brief.` });
  }
  for (const match of text.matchAll(/\b(?:you always|you usually|you tend to|this is who you are|this is how you are)\b/giu)) {
    issues.push({ code: "standing_trait_language", value: match[0], message: "Temporary transit synthesis became a permanent personality claim." });
  }
  return { passed: issues.length === 0, issues };
}
