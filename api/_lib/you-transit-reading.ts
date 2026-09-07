type RecordLike = Record<string, unknown>;

export const YOU_TRANSIT_READING_BRIEF_SCHEMA = "tldr.you-transit-reading-brief.v1";
export const YOU_DAY_READING_SUBJECT_TYPE = "you_day_reading";
export const YOU_WEEK_READING_SUBJECT_TYPE = "you_week_reading";
export const YOU_TRANSIT_READING_PROMPT_VERSION = "you-transit-reading-v1.1";

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
    ? "body: 2-3 natural paragraphs, roughly 120-220 words. Start with what matters today, connect the strongest supplied threads, and end with the practical consequence or useful perspective."
    : "body: 3-5 natural paragraphs, roughly 220-380 words. Give the week a clear through-line, preserve supplied timing when it matters, and distinguish the main theme from secondary pressure or support.";
  return [
    "TLDR ASTRO PERSONAL TRANSIT SYNTHESIS V1.1",
    "",
    "TASK",
    `Write one in-depth ${brief.window} report for the reader.`,
    "Write directly to the reader in second person using you/your.",
    "Use the same synthesis standard as the governed Friends transit reading: what matters first, astrology only as needed, concrete known life domains when they are actually supplied, and no invented scenes.",
    "This is synthesis only. TLDR Astro has already calculated and selected the evidence and already supplied reader-safe source text.",
    "Do not calculate astrology. Do not add a transit, placement, aspect, sign, house, date, degree, orb, interpretation, example, or life event that is not present below.",
    "Do not turn a temporary transit into a permanent personality claim.",
    "Do not expose source units, IDs, schemas, scores, derivation fields, approval state, or backend language.",
    "No tarot. No em dashes. No bullets. No section labels inside the body.",
    "Do not invent texting, workplace, money, family, health, dating, shopping, travel, or other concrete examples unless that situation is already present in APPROVED READER TEXT.",
    "Prefer concrete nouns already present in the approved reader text instead of retreating to vague phrases such as 'something important' or 'an area of life.'",
    "For a week report, use supplied date/day/timing information to organize the sequence only when it is present. Do not invent a day for a theme that has no supplied timing.",
    "",
    "OUTPUT",
    `headline: return exactly ${JSON.stringify(input.headline)}.`,
    "tldr: 1-2 natural sentences that answer what matters in this period.",
    "summary: use the same core answer in 1-2 sentences, at least 40 characters.",
    bodyContract,
    "Do not add a generic coaching closer.",
    "Return JSON only.",
    "",
    "APPROVED READER TEXT",
    JSON.stringify(brief.approvedReaderText, null, 2),
    "",
    "TECHNICAL EVIDENCE - FACT LOCK ONLY",
    JSON.stringify(brief.technicalEvidence, null, 2)
  ].join("\n");
}

function renderedText(draft: YouTransitReadingDraft) {
  return [draft.headline, draft.tldr, draft.summary, draft.body, draft.action, draft.timing, ...(draft.sections ?? []).flatMap((section) => [section.heading, section.body])]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n");
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
    if (!source.includes(canonicalAspect(match[0]))) issues.push({ code: "untraceable_aspect", value: match[0], message: `${match[0]} is not present in the governed report brief.` });
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
  for (const match of text.matchAll(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/giu)) {
    if (!source.includes(match[0].toLowerCase())) issues.push({ code: "untraceable_date", value: match[0], message: `${match[0]} is not present in the governed report brief.` });
  }
  for (const match of text.matchAll(/\b(?:you always|you usually|you tend to|this is who you are|this is how you are)\b/giu)) {
    issues.push({ code: "standing_trait_language", value: match[0], message: "Temporary transit synthesis became a permanent personality claim." });
  }
  return { passed: issues.length === 0, issues };
}
