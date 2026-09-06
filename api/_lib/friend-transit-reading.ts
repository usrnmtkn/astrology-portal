type RecordLike = Record<string, unknown>;

export const FRIEND_TRANSIT_READING_CONTENT_TYPE = "friend_transit_reading";
export const FRIEND_TRANSIT_READING_EVENT_TYPE = "friend-transit-reading";
export const FRIEND_TRANSITS_BRIEF_SCHEMA = "tldr.friend-transits-brief.v1";
export const FRIEND_TRANSIT_READING_PROMPT_VERSION = "friend-transit-reading-v1.1";

export type FriendTransitReadingBrief = {
  schema: typeof FRIEND_TRANSITS_BRIEF_SCHEMA;
  friendName: string;
  dateLabel: string;
  primaryThemes: FriendTransitReadingPersonalTransit[];
  relationshipActivations: Array<{
    id: string;
    headline: string;
    effectBody: string;
    activationBody: string;
    transitPlanet?: string;
  }>;
  houseContext: Array<{
    id: string;
    contentKey: string;
    transitPlanet: string;
    title: string;
    durationLabel: string | null;
    timingRange: string;
    rowSummary: string;
    termLabel: string;
    keywords: string[];
    house: number;
    houseLabel: string;
    detailAvailable: boolean;
  }>;
  daily: {
    forecast: null | {
      headline: string;
      body: string;
      moonContext: {
        sign: string;
        houseLabel: string | null;
        topic: string | null;
      };
    };
    doItems: string[];
    dontItems: string[];
  } | null;
  longerCycles: FriendTransitReadingPersonalTransit[];
  activePatterns: Array<RecordLike>;
  hasAnyTransit: boolean;
  counts: Record<string, number>;
};

export type FriendTransitReadingPersonalTransit = {
  id: string;
  title: string;
  durationLabel: string;
  rangeLabel: string;
  timingLabel: string;
  summary: string;
  orb: string;
  detailAvailable: boolean;
  evidence: {
    transitPlanet: string;
    transitSign?: string;
    aspect: string;
    natalPoint: string;
    natalSign: string;
    natalHouse?: number;
    direction?: "applying" | "separating";
    score?: number;
    significance?: string;
    timingBonuses: string[];
    contentKeys: string[];
  };
};

export type FriendTransitReadingDraft = {
  headline: string;
  tldr?: string;
  summary: string;
  body: string;
  action?: string;
  timing?: string;
  sections?: Array<{ heading?: string; body?: string }>;
};

export type FriendTransitReadingValidationIssue = {
  code: "invalid_brief" | "second_person" | "internal_field_leak" | "untraceable_body" | "untraceable_aspect" | "untraceable_sign" | "untraceable_house" | "untraceable_transit_claim" | "untraceable_degree" | "untraceable_date" | "standing_trait_language";
  value: string;
  message: string;
};

const BODY_ALIASES = new Map([
  ["sun", "sun"], ["moon", "moon"], ["mercury", "mercury"], ["venus", "venus"], ["mars", "mars"],
  ["jupiter", "jupiter"], ["saturn", "saturn"], ["uranus", "uranus"], ["neptune", "neptune"], ["pluto", "pluto"],
  ["chiron", "chiron"], ["lilith", "lilith"], ["black moon lilith", "lilith"], ["north node", "north node"], ["south node", "south node"],
  ["ascendant", "ascendant"], ["rising", "ascendant"], ["midheaven", "midheaven"], ["mc", "midheaven"],
  ["descendant", "descendant"], ["ic", "ic"], ["imum coeli", "ic"]
] as const);
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
const ASPECT_ALIASES = new Map([
  ["conjunct", "conjunction"], ["conjunction", "conjunction"], ["opposes", "opposition"], ["opposite", "opposition"], ["opposition", "opposition"],
  ["square", "square"], ["squares", "square"], ["trine", "trine"], ["trines", "trine"], ["sextile", "sextile"], ["sextiles", "sextile"]
] as const);
const BODY_PATTERN = [...BODY_ALIASES.keys()].filter((value) => value !== "rising").sort((a, b) => b.length - a.length).map(escapeRegex).join("|");
const ASPECT_PATTERN = [...ASPECT_ALIASES.keys()].sort((a, b) => b.length - a.length).map(escapeRegex).join("|");
const SIGN_PATTERN = SIGNS.map((sign) => sign.toLowerCase()).join("|");

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function record(value: unknown): RecordLike | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function canonicalBody(value: string) {
  return BODY_ALIASES.get(value.trim().toLowerCase()) ?? value.trim().toLowerCase();
}

function canonicalAspect(value: string) {
  return ASPECT_ALIASES.get(value.trim().toLowerCase()) ?? value.trim().toLowerCase();
}

function slug(value: string) {
  return value.trim().toLowerCase().replace(/&/gu, " and ").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function assertPersonalTransit(value: unknown): FriendTransitReadingPersonalTransit {
  const item = record(value);
  const evidence = record(item?.evidence);
  if (!item || !evidence) throw new Error("FRIEND_TRANSIT_READING_INVALID_PERSONAL_TRANSIT");
  const natalHouse = numberValue(evidence.natalHouse);
  const direction = stringValue(evidence.direction);
  return {
    id: stringValue(item.id),
    title: stringValue(item.title),
    durationLabel: stringValue(item.durationLabel),
    rangeLabel: stringValue(item.rangeLabel),
    timingLabel: stringValue(item.timingLabel),
    summary: stringValue(item.summary),
    orb: stringValue(item.orb),
    detailAvailable: item.detailAvailable === true,
    evidence: {
      transitPlanet: stringValue(evidence.transitPlanet),
      ...(stringValue(evidence.transitSign) ? { transitSign: stringValue(evidence.transitSign) } : {}),
      aspect: stringValue(evidence.aspect),
      natalPoint: stringValue(evidence.natalPoint),
      natalSign: stringValue(evidence.natalSign),
      ...(natalHouse == null ? {} : { natalHouse }),
      ...(["applying", "separating"].includes(direction) ? { direction: direction as "applying" | "separating" } : {}),
      ...(numberValue(evidence.score) == null ? {} : { score: numberValue(evidence.score) as number }),
      ...(stringValue(evidence.significance) ? { significance: stringValue(evidence.significance) } : {}),
      timingBonuses: array(evidence.timingBonuses).map(stringValue).filter(Boolean),
      contentKeys: array(evidence.contentKeys).map(stringValue).filter(Boolean)
    }
  };
}

export function assertFriendTransitReadingBrief(value: unknown): FriendTransitReadingBrief {
  const brief = record(value);
  if (!brief || brief.schema !== FRIEND_TRANSITS_BRIEF_SCHEMA) throw new Error("FRIEND_TRANSIT_READING_BRIEF_SCHEMA_INVALID");
  const friendName = stringValue(brief.friendName);
  if (!friendName) throw new Error("FRIEND_TRANSIT_READING_FRIEND_NAME_REQUIRED");
  const primaryThemes = array(brief.primaryThemes).map(assertPersonalTransit);
  const longerCycles = array(brief.longerCycles).map(assertPersonalTransit);
  if ([...primaryThemes, ...longerCycles].some((item) => (
    !item.detailAvailable
    || !item.id
    || !item.title
    || !item.summary
    || !item.evidence.transitPlanet
    || !item.evidence.aspect
    || !item.evidence.natalPoint
    || item.evidence.contentKeys.length === 0
  ))) {
    throw new Error("FRIEND_TRANSIT_READING_PERSONAL_EVIDENCE_INVALID");
  }
  const relationshipActivations = array(brief.relationshipActivations).flatMap((value) => {
    const item = record(value);
    if (!item) return [];
    return [{
      id: stringValue(item.id), headline: stringValue(item.headline), effectBody: stringValue(item.effectBody),
      activationBody: stringValue(item.activationBody), ...(stringValue(item.transitPlanet) ? { transitPlanet: stringValue(item.transitPlanet) } : {})
    }];
  });
  const houseContext = array(brief.houseContext).flatMap((value) => {
    const item = record(value);
    if (!item) return [];
    const house = numberValue(item.house);
    if (house == null || house < 1 || house > 12 || item.detailAvailable !== true) return [];
    return [{
      id: stringValue(item.id), contentKey: stringValue(item.contentKey), transitPlanet: stringValue(item.transitPlanet),
      title: stringValue(item.title), durationLabel: item.durationLabel == null ? null : stringValue(item.durationLabel),
      timingRange: stringValue(item.timingRange), rowSummary: stringValue(item.rowSummary), termLabel: stringValue(item.termLabel),
      keywords: array(item.keywords).map(stringValue).filter(Boolean), house, houseLabel: stringValue(item.houseLabel), detailAvailable: true
    }];
  });
  const dailyRecord = record(brief.daily);
  const forecastRecord = record(dailyRecord?.forecast);
  const moonContext = record(forecastRecord?.moonContext);
  const daily = dailyRecord ? {
    forecast: forecastRecord && moonContext ? {
      headline: stringValue(forecastRecord.headline), body: stringValue(forecastRecord.body),
      moonContext: {
        sign: stringValue(moonContext.sign),
        houseLabel: moonContext.houseLabel == null ? null : stringValue(moonContext.houseLabel),
        topic: moonContext.topic == null ? null : stringValue(moonContext.topic)
      }
    } : null,
    doItems: array(dailyRecord.doItems).map(stringValue).filter(Boolean),
    dontItems: array(dailyRecord.dontItems).map(stringValue).filter(Boolean)
  } : null;
  const counts = record(brief.counts) ?? {};
  return {
    schema: FRIEND_TRANSITS_BRIEF_SCHEMA,
    friendName,
    dateLabel: stringValue(brief.dateLabel),
    primaryThemes,
    relationshipActivations,
    houseContext,
    daily,
    longerCycles,
    activePatterns: array(brief.activePatterns).flatMap((item) => record(item) ? [record(item) as RecordLike] : []),
    hasAnyTransit: brief.hasAnyTransit === true,
    counts: Object.fromEntries(Object.entries(counts).flatMap(([key, value]) => numberValue(value) == null ? [] : [[key, numberValue(value) as number]]))
  };
}

export function isFriendTransitReadingInput(input: { eventType?: unknown; facts?: RecordLike }) {
  return stringValue(input.eventType) === FRIEND_TRANSIT_READING_EVENT_TYPE
    || stringValue(input.facts?.contentType) === FRIEND_TRANSIT_READING_CONTENT_TYPE;
}

export function friendTransitReadingBriefFromFacts(facts: RecordLike) {
  return assertFriendTransitReadingBrief(facts.friendTransitsBrief);
}

export function friendTransitReadingKnowledgeIds(brief: FriendTransitReadingBrief) {
  const personalIds = [...brief.primaryThemes, ...brief.longerCycles].map((transit) => (
    `you-transit-v3-${slug(transit.evidence.transitPlanet)}-${slug(transit.evidence.aspect)}-${slug(transit.evidence.natalPoint)}`
  ));
  const houseIds = brief.houseContext.map((item) => `house-${item.house}`);
  return [...new Set([...personalIds, ...houseIds])];
}

export function friendTransitReadingCanGenerate(brief: FriendTransitReadingBrief) {
  return [...brief.primaryThemes, ...brief.longerCycles].length > 0;
}

export function friendTransitReadingRequestLock(input: {
  brief: unknown;
  subjectId: string;
  targetDate: string;
}) {
  const brief = assertFriendTransitReadingBrief(input.brief);
  const subjectId = stringValue(input.subjectId);
  const targetDate = stringValue(input.targetDate);

  if (!subjectId) throw new Error("FRIEND_TRANSIT_READING_SUBJECT_REQUIRED");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(targetDate)) {
    throw new Error("FRIEND_TRANSIT_READING_TARGET_DATE_REQUIRED");
  }
  if (!friendTransitReadingCanGenerate(brief)) {
    throw new Error("FRIEND_TRANSIT_READING_NO_PERSONAL_TRANSIT_EVIDENCE");
  }

  return {
    brief,
    contentKey: `friend-transit-reading/${subjectId}/${targetDate}`,
    surface: "friends" as const,
    mode: "in_depth" as const,
    eventType: FRIEND_TRANSIT_READING_EVENT_TYPE,
    headline: `What's going on with ${brief.friendName} right now?`,
    knowledgeIds: friendTransitReadingKnowledgeIds(brief),
    facts: {
      contentType: FRIEND_TRANSIT_READING_CONTENT_TYPE,
      blockType: FRIEND_TRANSIT_READING_CONTENT_TYPE,
      friendTransitsBrief: brief
    },
    sourceSnapshot: {
      schema: "friend-transit-reading-source.v1",
      briefSchema: brief.schema,
      friendName: brief.friendName,
      dateLabel: brief.dateLabel,
      counts: brief.counts,
      targetDate
    }
  };
}

function approvedReaderText(brief: FriendTransitReadingBrief) {
  return {
    daily: brief.daily,
    relationshipActivations: brief.relationshipActivations.map(({ headline, effectBody, activationBody }) => ({ headline, effectBody, activationBody })),
    primaryThemes: brief.primaryThemes.map(({ title, durationLabel, rangeLabel, timingLabel, summary }) => ({ title, durationLabel, rangeLabel, timingLabel, summary })),
    houseContext: brief.houseContext.map(({ title, durationLabel, timingRange, rowSummary, termLabel, keywords, houseLabel }) => ({ title, durationLabel, timingRange, rowSummary, termLabel, keywords, houseLabel })),
    longerCycles: brief.longerCycles.map(({ title, durationLabel, rangeLabel, timingLabel, summary }) => ({ title, durationLabel, rangeLabel, timingLabel, summary })),
    activePatterns: brief.activePatterns.map((pattern) => ({
      id: stringValue(pattern.id),
      activationCopy: stringValue(pattern.activationCopy),
      title: stringValue(pattern.title)
    })).filter((item) => item.activationCopy)
  };
}

function compactTechnicalTransit(item: FriendTransitReadingPersonalTransit) {
  return {
    id: item.id,
    transitPlanet: item.evidence.transitPlanet,
    transitSign: item.evidence.transitSign ?? null,
    aspect: item.evidence.aspect,
    natalPoint: item.evidence.natalPoint,
    natalSign: item.evidence.natalSign,
    natalHouse: item.evidence.natalHouse ?? null,
    direction: item.evidence.direction ?? null
  };
}

function technicalEvidence(brief: FriendTransitReadingBrief) {
  return {
    primaryThemes: brief.primaryThemes.map(compactTechnicalTransit),
    longerCycles: brief.longerCycles.map(compactTechnicalTransit),
    houseContext: brief.houseContext.map((item) => ({ id: item.id, transitPlanet: item.transitPlanet, house: item.house })),
    dailyMoonContext: brief.daily?.forecast?.moonContext ?? null,
    relationshipTransitPlanets: brief.relationshipActivations.map((item) => item.transitPlanet).filter(Boolean)
  };
}

export function friendTransitReadingMeaningPlan(brief: FriendTransitReadingBrief) {
  return {
    schema: "friend-transit-reading-meaning-plan.v1",
    rankingAuthority: "brief-order-is-final",
    friendName: brief.friendName,
    leadLane: brief.daily?.forecast ? "daily" : brief.primaryThemes.length ? "primaryThemes" : "longerCycles",
    laneOrder: ["daily", "relationshipActivations", "primaryThemes", "houseContext", "longerCycles", "activePatterns"],
    primaryThemeIds: brief.primaryThemes.map((item) => item.id),
    longerCycleIds: brief.longerCycles.map((item) => item.id),
    guardrails: [
      "Do not calculate astrology.",
      "Do not re-rank the brief.",
      "Do not invent a concrete life event or example.",
      "Do not turn relationship context into a claim about the friend's own life.",
      "Do not turn current transits into permanent personality traits."
    ]
  };
}

export function friendTransitReadingPrompt(input: { brief: FriendTransitReadingBrief; headline: string }) {
  const { brief } = input;
  return [
    "TLDR ASTRO FRIEND TRANSIT SYNTHESIS V1",
    "",
    "TASK",
    `Write one short answer to: ${input.headline}`,
    `Write ${brief.friendName}\'s personal astrology in third person using their name and they/them/their.`,
    `When using Between You Two relationship context, address the reader directly and prefer the bridge: "Things between you and ${brief.friendName}..." Do not use you/your outside relationship context.`,
    "This is synthesis only. TLDR Astro has already calculated, selected, ordered, and content-gated the astrology.",
    "Do not calculate astrology. Do not add a transit, placement, aspect, sign, house, date, degree, orb, interpretation, example, or life event that is not present below.",
    "Do not re-rank the evidence. Preserve the supplied order inside each lane.",
    "Do not make a permanent personality claim from temporary transits.",
    "Do not turn Between You Two material into a claim about the friend's life outside the relationship.",
    "Do not expose scores, significance labels, timing bonuses, content keys, IDs, source rows, approval state, schemas, or backend language.",
    "No tarot. No em dashes. No bullets. No section labels inside the body.",
    "Do not invent a menu-ordering, texting, workplace, money, family, health, or relationship example unless that concrete situation is already in the approved reader text.",
    "",
    "CONTENT PRIORITY",
    "Daily is immediate context, not the master ranking.",
    "Between You Two is relationship context and must remain distinct.",
    `If relationship context is used, speak to the reader naturally as "Things between you and ${brief.friendName}..." rather than referring to both people as "the two of them."`,
    "Primary themes are the friend's own short-term transits in final upstream order.",
    "House context says where an already-selected transit lands. It is not a new ranked theme.",
    "Longer cycles are background pressure or support, not a replacement for what is immediate.",
    "Active natal patterns may be mentioned only when their supplied activationCopy adds something necessary.",
    "",
    "OUTPUT",
    `headline: return exactly ${JSON.stringify(input.headline)}.`,
    "tldr: 1-2 natural sentences that answer the question directly.",
    "summary: use the same core answer in 1-2 sentences, at least 40 characters.",
    "body: 2-3 natural paragraphs, roughly 120-220 words. Start with what matters, explain the astrology only as needed, and end with the practical consequence or useful perspective. Do not add a generic coaching closer.",
    "action: return an empty string.",
    "timing: return an empty string.",
    "sections: return an empty array.",
    "sceneLock: return null.",
    "astrologyDrilldown: return null.",
    "Return JSON only.",
    "",
    "APPROVED READER TEXT",
    JSON.stringify(approvedReaderText(brief), null, 2),
    "",
    "TECHNICAL EVIDENCE - FACT LOCK ONLY",
    JSON.stringify(technicalEvidence(brief), null, 2)
  ].join("\n");
}

function renderedText(draft: FriendTransitReadingDraft) {
  return [draft.headline, draft.tldr, draft.summary, draft.body, draft.action, draft.timing, ...(draft.sections ?? []).flatMap((section) => [section.heading, section.body])]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0).join("\n");
}

function sourceText(brief: FriendTransitReadingBrief) {
  return JSON.stringify({ approvedReaderText: approvedReaderText(brief), technicalEvidence: technicalEvidence(brief) }).toLowerCase();
}

function allowedTechnicalFacts(brief: FriendTransitReadingBrief) {
  const transits = [...brief.primaryThemes, ...brief.longerCycles];
  return {
    bodies: new Set([
      ...transits.flatMap((item) => [item.evidence.transitPlanet, item.evidence.natalPoint]),
      ...brief.houseContext.map((item) => item.transitPlanet),
      ...brief.relationshipActivations.map((item) => item.transitPlanet ?? ""),
      brief.daily?.forecast ? "Moon" : ""
    ].filter(Boolean).map((value) => canonicalBody(value))),
    aspects: new Set(transits.map((item) => canonicalAspect(item.evidence.aspect))),
    signs: new Set([
      ...transits.flatMap((item) => [item.evidence.transitSign ?? "", item.evidence.natalSign]),
      brief.daily?.forecast?.moonContext.sign ?? ""
    ].filter(Boolean).map((value) => value.toLowerCase())),
    houses: new Set([
      ...transits.map((item) => item.evidence.natalHouse).filter((value): value is number => typeof value === "number"),
      ...brief.houseContext.map((item) => item.house),
      ...(brief.daily?.forecast?.moonContext.houseLabel?.match(/\b([1-9]|1[0-2])(?:st|nd|rd|th)?\s+house\b/iu)?.[1]
        ? [Number(brief.daily.forecast.moonContext.houseLabel.match(/\b([1-9]|1[0-2])(?:st|nd|rd|th)?\s+house\b/iu)?.[1])]
        : [])
    ]),
    transitClaims: new Set(transits.map((item) => `${canonicalBody(item.evidence.transitPlanet)}|${canonicalAspect(item.evidence.aspect)}|${canonicalBody(item.evidence.natalPoint)}`))
  };
}

function relationshipSecondPersonAllowed(text: string, matchIndex: number, brief: FriendTransitReadingBrief) {
  if (brief.relationshipActivations.length === 0 || matchIndex < 0) return false;
  const starts = [
    text.lastIndexOf(".", matchIndex),
    text.lastIndexOf("!", matchIndex),
    text.lastIndexOf("?", matchIndex),
    text.lastIndexOf("\n", matchIndex)
  ];
  const start = Math.max(...starts) + 1;
  const endings = [
    text.indexOf(".", matchIndex),
    text.indexOf("!", matchIndex),
    text.indexOf("?", matchIndex),
    text.indexOf("\n", matchIndex)
  ].filter((value) => value >= 0);
  const end = endings.length > 0 ? Math.min(...endings) : text.length;
  const sentence = text.slice(start, end);
  const friendNamePattern = new RegExp(`\\b${escapeRegex(brief.friendName)}\\b`, "iu");
  return friendNamePattern.test(sentence)
    && /\b(?:between|connection|relationship)\b/iu.test(sentence);
}

export function validateFriendTransitReadingDraft(input: { draft: FriendTransitReadingDraft; brief: FriendTransitReadingBrief; expectedHeadline: string }) {
  const issues: FriendTransitReadingValidationIssue[] = [];
  const text = renderedText(input.draft);
  const normalized = text.toLowerCase();
  const source = sourceText(input.brief);
  const allowed = allowedTechnicalFacts(input.brief);
  if (input.draft.headline.trim() !== input.expectedHeadline.trim()) {
    issues.push({ code: "invalid_brief", value: input.draft.headline, message: "Friend transit reading headline changed from the locked question." });
  }
  for (const match of text.matchAll(/\b(?:you|your|yours|yourself|yourselves)\b/giu)) {
    if (!relationshipSecondPersonAllowed(text, match.index ?? -1, input.brief)) {
      issues.push({ code: "second_person", value: match[0], message: "Friend transit reading used second person outside explicit relationship context." });
    }
  }
  for (const match of text.matchAll(/\b(?:score|significance|timing bonuses?|content keys?|source rows?|approval state|schema|backend)\b/giu)) {
    issues.push({ code: "internal_field_leak", value: match[0], message: "Friend transit reading exposed an internal brief field." });
  }
  for (const match of text.matchAll(new RegExp(`\\b(${BODY_PATTERN})\\b`, "giu"))) {
    const body = canonicalBody(match[1]);
    if (!allowed.bodies.has(body)) issues.push({ code: "untraceable_body", value: match[0], message: `${match[0]} is not present in the governed brief.` });
  }
  for (const match of text.matchAll(new RegExp(`\\b(${ASPECT_PATTERN})\\b`, "giu"))) {
    const aspect = canonicalAspect(match[1]);
    if (!allowed.aspects.has(aspect)) issues.push({ code: "untraceable_aspect", value: match[0], message: `${match[0]} is not present in the governed brief.` });
  }
  for (const match of text.matchAll(new RegExp(`\\b(${SIGN_PATTERN})\\b`, "giu"))) {
    if (!allowed.signs.has(match[1].toLowerCase())) issues.push({ code: "untraceable_sign", value: match[0], message: `${match[0]} is not present in the governed brief.` });
  }
  for (const match of text.matchAll(/\b([1-9]|1[0-2])(?:st|nd|rd|th)?\s+house\b/giu)) {
    if (!allowed.houses.has(Number(match[1]))) issues.push({ code: "untraceable_house", value: match[0], message: `${match[0]} is not present in the governed brief.` });
  }
  for (const match of text.matchAll(new RegExp(`\\b(${BODY_PATTERN})\\s+(${ASPECT_PATTERN})\\s+(?:their\\s+|natal\\s+|their natal\\s+)?(${BODY_PATTERN})\\b`, "giu"))) {
    const key = `${canonicalBody(match[1])}|${canonicalAspect(match[2])}|${canonicalBody(match[3])}`;
    if (!allowed.transitClaims.has(key)) issues.push({ code: "untraceable_transit_claim", value: match[0], message: `${match[0]} is not a transit in the governed brief.` });
  }
  for (const match of text.matchAll(/\b\d{1,3}(?:\.\d+)?°/gu)) {
    if (!source.includes(match[0].toLowerCase())) issues.push({ code: "untraceable_degree", value: match[0], message: `${match[0]} is not present in the governed brief.` });
  }
  for (const match of text.matchAll(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/giu)) {
    if (!source.includes(match[0].toLowerCase())) issues.push({ code: "untraceable_date", value: match[0], message: `${match[0]} is not present in the governed brief.` });
  }
  for (const match of text.matchAll(/\b(?:they always|they usually|they tend to|this is who they are|this is how they are)\b/giu)) {
    issues.push({ code: "standing_trait_language", value: match[0], message: "Temporary transit synthesis became a permanent personality claim." });
  }
  return { passed: issues.length === 0, issues };
}
