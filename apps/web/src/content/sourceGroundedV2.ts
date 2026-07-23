import renderFixtures from "./templateHandoffV2/fixtures/render-contract-fixtures.json";
import executableTemplateContract from "./templateHandoffV2/contracts/EXECUTABLE-TEMPLATE-CONTRACT.json";
import surfaceResolutionMatrix from "./templateHandoffV2/contracts/SURFACE-RESOLUTION-MATRIX.json";
import ccSourcePhrases from "./templateHandoffV2/sources/cc-source-phrases.json";
import sourceDerivedClauseExemplars from "./templateHandoffV2/sources/source-derived-clause-exemplars.json" with { type: "json" };
import normalizedSkySourceRecords from "../../../../scripts/content-source/normalized-sky-source-records.json";
import {
  SourceGapError as FallbackV3SourceGapError,
  type AngleFacts,
  type AspectFacts
} from "./fallbackArchitectureV3Runtime";
import { fallbackRendererV3 } from "./fallbackArchitectureV3Runtime";
import { isReaderFacingCopy } from "./readerSafety";
import { renderMustacheMadlib, type MustacheTemplateId } from "./sourceGroundedMustacheV22";

export const SOURCE_GROUNDED_V2_TEMPLATE_VERSION = "2.3.0";
const FALLBACK_V3_ASPECTS = new Set<AspectFacts["aspect"]>(["conjunction", "opposition", "square", "trine", "sextile"]);

function fallbackV3ErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export type SourceTier = "EVIDENCE_ONLY" | "REFERENCE_SCAFFOLD" | "REVIEWED_CLAUSE" | "REVIEWED_RECORD" | "RENDERED_OUTPUT" | "SOURCE_GAP";
export type RenderMode = "card" | "detail";
export type ReaderAuthority = "reviewed-exact" | "approved-fallback" | "factual-floor" | "omitted";
export type FallbackSpecificity = "exact-combination" | "surface-family" | "factual-floor" | null;
export type ReaderPerson = "self" | "friend" | "collective";
export type PronounAgreement = "singular" | "plural";
export type PronounSet = {
  subject: string;
  object: string;
  possessiveDeterminer: string;
  possessivePronoun: string;
  reflexive: string;
  agreement: PronounAgreement;
};
export type ReaderIdentity = {
  person: ReaderPerson;
  viewerId?: string;
  chartOwnerId?: string;
  locale: string;
  displayName?: string;
  shortName?: string;
  pronouns?: PronounSet;
  identityRevision?: string;
};
export type ReaderSurface =
  | "home.daily"
  | "home.moon.phase"
  | "home.moon.sign"
  | "home.planetary.list"
  | "home.planetary.detail"
  | "transit.short.card"
  | "transit.short.detail"
  | "transit.long.card"
  | "transit.long.detail"
  | "natal.placement.card"
  | "natal.placement.detail"
  | "natal.empty-house.detail"
  | "natal.angle.detail"
  | "natal.aspect.card"
  | "natal.aspect.detail"
  | "sky.collective.card"
  | "sky.collective.detail"
  | "sky.aspect.card"
  | "sky.aspect.detail"
  | "sky.retrograde.card"
  | "sky.retrograde.detail"
  | "sky.event.card"
  | "sky.event.detail";
export type SurfaceId =
  | "transits.personalized"
  | "home.planetary_horoscope"
  | "home.moon_forecast.phase"
  | "home.moon_forecast.sign"
  | "home.daily_horoscope"
  | "sky.planet_sign"
  | "sky.aspect"
  | "me.natal_placement"
  | "me.natal_angle"
  | "me.natal_aspect";

export type V2Slot = {
  text: string;
  sourceKeys: string[];
  sourceTier: Exclude<SourceTier, "SOURCE_GAP">;
};

export type V2RenderedOutput = {
  status: "READY" | "SOURCE_GAP";
  surface: SurfaceId;
  templateFamily: string;
  templateId: string;
  templateVersion: string;
  mode: RenderMode;
  recordId: string;
  sourceTier: SourceTier;
  primarySourceKeys: string[];
  supportingSourceKeys: string[];
  calculatedFactKeys: string[];
  missing?: string[];
  facts: Record<string, unknown>;
  renderedFields: Record<string, string>;
  fieldMap: Record<string, string>;
  finalVisibleStrings: string[];
  compactCopy?: string;
  expandedCopy?: string;
  exactSourceStatus: "present" | "absent";
  sourceGap: boolean;
  readerAuthority: ReaderAuthority;
  fallbackSpecificity?: FallbackSpecificity;
  fallbackId?: string;
  legacyContributors: string[];
  provenance: {
    initial: string;
    hydrated: string;
    adminPreview: string;
  };
  runtimeTrace: V2RuntimeTrace;
};

export type V2RuntimeTrace = {
  route: string;
  surface: ReaderSurface;
  surfaceId: SurfaceId;
  readerPerson: ReaderPerson;
  chartOwnerId?: string;
  identityRevision: string;
  templateId: string;
  templateVersion: "2.3.0";
  resolution: ReaderAuthority;
  primarySourceIds: string[];
  primarySourceId: string;
  supportingSourceIds: string[];
  selectedSlots: string[];
  omittedSlots: string[];
  suppressedSlots: Array<{
    slot: string;
    reason: "duplicate" | "wrong-surface" | "no-source" | "redundant" | "word-limit";
  }>;
  legacyContributors: string[];
  finalText: string;
  exactSourceStatus: "present" | "absent";
  sourceGap: boolean;
  readerAuthority: ReaderAuthority;
  fallbackSpecificity?: FallbackSpecificity;
  fallbackId?: string;
};

type SurfaceMatrix = {
  surfaces: Array<{
    surface: SurfaceId;
    templateFamily: string;
    requiredFacts: string[];
    optionalFacts?: string[];
    sourceGapWhen: string;
  }>;
};

type TemplateContract = {
  families: Record<string, {
    version: string;
    card?: TemplateModeContract;
    detail?: TemplateModeContract;
  }>;
};

type TemplateModeContract = {
  required?: string[];
  optional?: string[];
  order?: string[];
  forbidden?: string[];
};

const matrix = surfaceResolutionMatrix as unknown as SurfaceMatrix;
const templateContract = executableTemplateContract as unknown as TemplateContract;
const fixtureContract = renderFixtures as unknown as {
  fixtures?: Array<{
    id: string;
    surface: SurfaceId;
    templateFamily: string;
    renderedFields?: Record<string, string>;
  }>;
};
const ccPhrases = ccSourcePhrases as Record<string, string>;
const normalizedSkySource = normalizedSkySourceRecords as unknown as {
  clauseBanks?: {
    planetFunction?: Record<string, string>;
    signBehavior?: Record<string, string>;
    aspectBehavior?: Record<string, {
      behavior?: string;
      constructive?: string;
      verb?: string;
    }>;
  };
  overrides?: Record<string, Record<string, string>>;
  retrogradeClauses?: Record<string, Record<string, Record<string, string>>>;
};
const exemplarRecords = (sourceDerivedClauseExemplars as unknown as {
  records?: Array<{
    id: string;
    slots?: Record<string, string>;
    source_keys?: string[];
  }>;
}).records ?? [];
const FIELD_COMPONENTS: Record<string, string> = {
  editorialHeadline: "optional eyebrow/headline",
  factualEventTitle: "page title",
  factualPlacementTitle: "page title",
  factualAspectTitle: "page title",
  factualAngleTitle: "page title",
  timingDisplay: "timing row",
  compactSummary: "card summary",
  expandedNarrative: "main body",
  practicalResponse: "body guidance",
  passContext: "long-term/pass section",
  astroFooter: "technical footer",
  technicalFooter: "technical footer",
  openingClaim: "detail opening",
  focusedQuestions: "detail question module",
  compassionateAgency: "detail closing agency",
  phaseTitle: "page title",
  cycleRole: "main body",
  phaseAppropriateAction: "body guidance",
  signTitle: "page title",
  embodiedGuidance: "main body",
  boundaryOrCarePrompt: "body guidance",
  dateDisplay: "date row",
  livedScenario: "main body",
  proportionateSuggestion: "body guidance",
  recognizableCollectiveSituation: "detail opening",
  proportionateResponse: "body guidance",
  exactDateDisplay: "timing row",
  integratedSignHouseStory: "main body",
  degreeDisplay: "degree row",
  dignityClause: "conditional modifier",
  retrogradeClause: "conditional modifier",
  sectClause: "conditional modifier",
  rulerBridge: "conditional ruler module",
  supportiveAspectClause: "supportive focal pattern",
  challengingAspectClause: "challenging focal pattern",
  angleSignStory: "main body",
  integratedAspectStory: "main body",
  orbDisplay: "orb row",
  houseContext: "supporting context",
  practicalIntegration: "body guidance"
};

const REVIEWED_RECORDS: Record<string, {
  surface: SurfaceId;
  templateFamily: string;
  primarySourceKeys: string[];
  supportingSourceKeys?: string[];
  fields: Record<string, V2Slot>;
}> = {};

function sentence(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n?/gu, "\n")
    .replace(/[ \t]+/gu, " ")
    .replace(/\s+([,.;:!?])/gu, "$1")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function titlePart(value: unknown) {
  return sentence(value).replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugPart(value: unknown) {
  return sentence(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dateParts(value: string) {
  const [start = "", end = ""] = value.split(/\s+-\s+/u).map((part) => part.trim());
  return { start, end };
}

function concisePhrase(value: string | undefined) {
  return sentence(value)
    .split(/;\s*|(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .find(Boolean) ?? "";
}

function decodeReaderEntities(value: string) {
  return sentence(value)
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, "\"")
    .replace(/&apos;/giu, "'")
    .replace(/&#39;/giu, "'")
    .replace(/&nbsp;/giu, " ");
}

function normalizeReaderText(value: string) {
  return normalizeWhitespace(decodeReaderEntities(value).replace(/<[^>]*>/gu, ""));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function ensureTerminalPunctuation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  const firstAlpha = trimmed.search(/[A-Za-z]/u);
  if (firstAlpha < 0) return trimmed;

  return `${trimmed.slice(0, firstAlpha)}${trimmed.charAt(firstAlpha).toUpperCase()}${trimmed.slice(firstAlpha + 1)}`;
}

function stripLeadingSkyTitle(value: string, body: string, sign: string) {
  const title = `${body} in ${sign}`;
  return normalizeReaderText(value)
    .replace(new RegExp(`^${escapeRegExp(title)}\\s*[:\\-–—]?\\s*`, "iu"), "")
    .replace(new RegExp(`^${escapeRegExp(body)}\\s+is\\s+in\\s+${escapeRegExp(sign)}\\s*[.:\\-–—]?\\s*`, "iu"), "")
    .replace(/\s+/gu, " ")
    .trim();
}

function isUnsafeReaderClause(value: string) {
  return (
    !isReaderFacingCopy(value)
    ||
    /\bactive in the current sky\b/iu.test(value)
    || /\bAfter the mile-a-minute chats\b/iu.test(value)
    || /\bthe cosmos is turning our attention\b/iu.test(value)
    || /\bover the coming weeks\b/iu.test(value)
    || /\bplanet of communication\b/iu.test(value)
    || /\bmind-map\b/iu.test(value)
    || /\bthe sign's register\b/iu.test(value)
    || /\bthe sign's texture\b/iu.test(value)
    || /\be\.g\./iu.test(value)
    || /^\s*puts attention on\b/iu.test(value)
    || /^\s*putting\b/iu.test(value)
    || /^\s*(?:amplifies|answers|calls|disrupts|draws|holds|opens|presses|sorts|speeds|tests)\b/iu.test(value)
    || /\bread that through\b/iu.test(value)
    || /\bincluded only as a calculated condition\b/iu.test(value)
    || /\bUse the most concrete part of that signal\b/iu.test(value)
    || /\bbefore treating the whole season as a verdict\b/iu.test(value)
    || /[{}]/u.test(value)
    || /&(?:[a-z]+|#[0-9]+);/iu.test(value)
  );
}

function sourcePhrase(key: string) {
  return normalizeReaderText(ccPhrases[key] ?? "");
}

function skyOverride(key: string, slot: string) {
  return normalizeReaderText(normalizedSkySource.overrides?.[key]?.[slot] ?? "");
}

function skyClauseBank(kind: "planetFunction" | "signBehavior", key: string) {
  return normalizeReaderText(normalizedSkySource.clauseBanks?.[kind]?.[key] ?? "");
}

function skyAspectBank(aspect: unknown, slot: "behavior" | "constructive" | "verb") {
  return normalizeReaderText(normalizedSkySource.clauseBanks?.aspectBehavior?.[sentence(aspect).toLowerCase()]?.[slot] ?? "");
}

function ccSignLane(sign: string, lane: "lived-behaviors" | "actions" | "hook-moves" | "closings") {
  return normalizeReaderText(ccPhrases[`cc/sign/${slugPart(sign)}/${lane}`] ?? "");
}

function sourceLaneSentence(value: string | undefined) {
  const parts = sentence(value)
    .split(/;\s*|(?<=[.!?])\s+/u)
    .map((part) => normalizeReaderText(part).replace(/[“”"]/gu, ""))
    .filter((part) => {
      if (!part || isUnsafeReaderClause(part)) return false;
      if (part.split(",").length > 2) return false;
      const wordCount = part.split(/\s+/u).filter(Boolean).length;
      return wordCount >= 2 && wordCount <= 24;
    });

  for (const part of parts) {
    const wordCount = part.split(/\s+/u).filter(Boolean).length;
    if (wordCount >= 6) return ensureTerminalPunctuation(sentenceCase(part));
  }

  const combined = parts.slice(0, 2).map((part) => sentenceCase(part)).join(". ");
  const combinedWordCount = combined.split(/\s+/u).filter(Boolean).length;
  return combinedWordCount >= 6 && combinedWordCount <= 32 ? ensureTerminalPunctuation(sentenceCase(combined)) : "";
}

function sourceLaneParagraph(value: string | undefined) {
  const parts = sentence(value)
    .split(/;\s*|(?<=[.!?])\s+/u)
    .map((part) => normalizeReaderText(part).replace(/[“”"]/gu, ""))
    .filter((part) => {
      if (!part || isUnsafeReaderClause(part)) return false;
      if (part.split(",").length > 2) return false;
      const wordCount = part.split(/\s+/u).filter(Boolean).length;
      return wordCount >= 2 && wordCount <= 24;
    })
    .slice(0, 6)
    .map((part) => ensureTerminalPunctuation(sentenceCase(part)));

  const paragraph = parts.join(" ");
  const wordCount = paragraph.split(/\s+/u).filter(Boolean).length;
  return wordCount >= 6 && wordCount <= 90 ? paragraph : sourceLaneSentence(value);
}

function safeReaderParagraphs(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const paragraphs: string[] = [];

  for (const value of values) {
    const normalized = normalizeReaderText(value ?? "");
    if (!normalized || isUnsafeReaderClause(normalized)) continue;
    const parts = normalized
      .split(/\n{2,}/u)
      .flatMap((paragraph) => sentences(paragraph).length > 1 ? [paragraph] : [paragraph])
      .map((paragraph) => ensureTerminalPunctuation(normalizeReaderText(paragraph)))
      .filter((paragraph) => paragraph && !isUnsafeReaderClause(paragraph));

    for (const paragraph of parts) {
      const comparable = paragraph.toLowerCase().replace(/\s+/gu, " ").trim();
      if (!comparable || seen.has(comparable)) continue;
      seen.add(comparable);
      paragraphs.push(paragraph);
    }
  }

  return paragraphs;
}

function stripTemplateHeaderParagraphs(rendered: string, titles: string[]) {
  const metadata = new Set(titles.map((title) => normalizeReaderText(title).toLowerCase()).filter(Boolean));
  return rendered
    .split(/\n{2,}/u)
    .map((paragraph) => (
      paragraph
        .split(/\n/u)
        .map((line) => normalizeReaderText(line))
        .filter((line) => line && !metadata.has(line.toLowerCase()))
        .join(" ")
    ))
    .map((paragraph) => normalizeReaderText(paragraph))
    .filter((paragraph) => {
      if (!paragraph) return false;
      const comparable = paragraph.toLowerCase();
      if (metadata.has(comparable)) return false;
      return !isUnsafeReaderClause(paragraph);
    });
}

function readerIdentityFor(surface: SurfaceId, facts: Record<string, unknown>): ReaderIdentity {
  const explicitPerson = sentence(facts.readerPerson).toLowerCase();
  const person: ReaderPerson = explicitPerson === "friend"
    ? "friend"
    : surface.startsWith("sky.") || surface === "home.daily_horoscope" || surface.startsWith("home.moon_")
      ? "collective"
      : "self";

  return {
    person,
    chartOwnerId: sentence(facts.chartOwnerId) || undefined,
    displayName: sentence(facts.displayName) || undefined,
    identityRevision: sentence(facts.identityRevision) || "default",
    locale: sentence(facts.locale) || "en-US",
    shortName: sentence(facts.shortName) || undefined,
    viewerId: sentence(facts.viewerId) || undefined
  };
}

function readerSurfaceFor(surface: SurfaceId, facts: Record<string, unknown>, mode: RenderMode): ReaderSurface {
  if (surface === "sky.planet_sign") {
    const retrograde = sentence(facts.motion || facts.direction).toLowerCase() === "retrograde";
    if (retrograde) return mode === "card" ? "sky.retrograde.card" : "sky.retrograde.detail";
    return mode === "card" ? "sky.collective.card" : "sky.collective.detail";
  }
  if (surface === "sky.aspect") return mode === "card" ? "sky.aspect.card" : "sky.aspect.detail";
  if (surface === "home.planetary_horoscope") return mode === "card" ? "home.planetary.list" : "home.planetary.detail";
  if (surface === "home.moon_forecast.phase") return "home.moon.phase";
  if (surface === "home.moon_forecast.sign") return "home.moon.sign";
  if (surface === "home.daily_horoscope") return "home.daily";
  if (surface === "me.natal_placement") return mode === "card" ? "natal.placement.card" : "natal.placement.detail";
  if (surface === "me.natal_angle") return "natal.angle.detail";
  if (surface === "me.natal_aspect") return mode === "card" ? "natal.aspect.card" : "natal.aspect.detail";
  const longTransit = /saturn|uranus|neptune|pluto/iu.test(sentence(facts.transitingPoint)) || sentence(facts.term).toLowerCase() === "long";
  if (longTransit) return mode === "card" ? "transit.long.card" : "transit.long.detail";
  return mode === "card" ? "transit.short.card" : "transit.short.detail";
}

function sentenceReadySkyCardClaim(value: string | undefined, body: string, sign: string) {
  const sourceValue = value ?? "";
  if (/["“”]/u.test(sourceValue)) return "";
  const rawClaim = stripLeadingSkyTitle(sourceValue, body, sign)
    .replace(/[“”"]/gu, "")
    .replace(/;\s*/gu, ". ");
  const claim = normalizeReaderText(sentences(rawClaim)[0] ?? rawClaim);
  if (!claim) return "";
  if (claim === `${body} in ${sign}`) return "";
  if (isUnsafeReaderClause(claim)) return "";
  if (claim.split(",").length > 3) return "";
  const words = claim.split(/\s+/u).filter(Boolean).length;
  if (words < 4 || words > 28) return "";
  if (/\.\.\.$/u.test(claim)) return "";
  return ensureTerminalPunctuation(sentenceCase(claim));
}

function sentenceReadySkyDetailParagraphs(value: string | undefined, body: string, sign: string) {
  const claim = stripLeadingSkyTitle(value ?? "", body, sign)
    .replace(/[“”"]/gu, "")
    .replace(/;\s*/gu, ". ");
  if (!claim || isUnsafeReaderClause(claim)) return [];
  return sentences(claim)
    .map((part) => normalizeReaderText(part))
    .filter((part) => part && !part.includes("...") && !isUnsafeReaderClause(part) && part.split(/\s+/u).filter(Boolean).length >= 8)
    .slice(0, 2)
    .map((part) => ensureTerminalPunctuation(sentenceCase(part)));
}

type LegacySkySnapshotRow = {
  summary?: string;
  body?: string;
  sourceSnapshot?: {
    sourceKeys?: string[];
  };
};

function safeSkySnapshotRow(body: string, sign: string): LegacySkySnapshotRow | undefined {
  void body;
  void sign;

  // The legacy sky snapshot predates the current fallback-hook + slot-template
  // model and contains archived prose that should not be promoted back into
  // reader routes. Keep the parser in place for regenerated snapshots, but do
  // not source live copy from this file until the snapshot is rebuilt from the
  // current content contract.
  return undefined;
}

function snapshotCardClaim(body: string, sign: string) {
  const row = safeSkySnapshotRow(body, sign);
  const candidates = [row?.summary, row?.body]
    .flatMap((value) => sentences(stripLeadingSkyTitle(value ?? "", body, sign)));

  for (const candidate of candidates) {
    const claim = normalizeReaderText(candidate);
    if (!claim) continue;
    if (claim === `${body} in ${sign}` || claim === `${body} is in ${sign}`) continue;
    if (isUnsafeReaderClause(claim)) continue;
    if (/["“”]/u.test(claim)) continue;
    if (claim.split(",").length > 3) continue;
    if (claim.split(/\s+/u).filter(Boolean).length > 28) continue;
    if (/\.\.\.$/u.test(claim)) continue;
    return ensureTerminalPunctuation(sentenceCase(claim));
  }

  return "";
}

function snapshotDetailParagraphs(body: string, sign: string) {
  const row = safeSkySnapshotRow(body, sign);
  const source = row?.body || row?.summary || "";
  const paragraphs = sentences(stripLeadingSkyTitle(source, body, sign))
    .map((part) => normalizeReaderText(part))
    .filter((part) => (
      part
      && !isUnsafeReaderClause(part)
      && !part.includes(";")
      && part.split(/\s+/u).filter(Boolean).length >= 7
      && part.split(/\s+/u).filter(Boolean).length <= 34
    ))
    .slice(0, 3)
    .map((part) => ensureTerminalPunctuation(sentenceCase(part)));

  return paragraphs;
}

function snapshotSourceKeys(body: string, sign: string) {
  return safeSkySnapshotRow(body, sign)?.sourceSnapshot?.sourceKeys?.filter((key) => /^cc\/|^ms\//u.test(key)) ?? [];
}

function skyPlacementCardClaim(candidates: Array<string | undefined>, body: string, sign: string) {
  for (const candidate of candidates) {
    const claim = sentenceReadySkyCardClaim(candidate, body, sign);
    if (claim) return claim;
  }

  return "";
}

function skyPlacementDetailParagraphs(candidates: Array<string | undefined>, body: string, sign: string, minimum = 2) {
  const paragraphs: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    for (const paragraph of sentenceReadySkyDetailParagraphs(candidate, body, sign)) {
      const comparable = paragraph.toLowerCase().replace(/\s+/gu, " ").trim();
      if (!comparable || seen.has(comparable)) continue;
      seen.add(comparable);
      paragraphs.push(paragraph);
      if (paragraphs.length >= minimum) return paragraphs;
    }
  }

  return paragraphs;
}

function ownerPerspectiveFor(facts: Record<string, unknown>) {
  return sentence(facts.ownerPerspective).toLowerCase() === "they" ? "they" : "you";
}

function ownerFallbackVoiceFor(facts: Record<string, unknown>) {
  if (ownerPerspectiveFor(facts) === "you") {
    return "you";
  }

  const displayName = sentence(facts.ownerDisplayName).trim();

  return displayName || "they";
}

function perspectiveClause(value: string, perspective: "you" | "they") {
  const normalized = normalizeReaderText(value);
  if (perspective === "you") return normalized;

  const adapted = normalized
    .replace(/\bYour\b/gu, "Their")
    .replace(/\byour\b/gu, "their")
    .replace(/\byou can\b/giu, "they can")
    .replace(/\byou may\b/giu, "they may")
    .replace(/\byou are\b/giu, "they are")
    .replace(/\byou\b/giu, "they")
    .replace(/\byourself\b/giu, "themselves");

  return adapted ? `${adapted.charAt(0).toUpperCase()}${adapted.slice(1)}` : "";
}

function sentences(value: string | undefined) {
  return sentence(value)
    .split(/(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sourceLaneFragments(value: string | undefined) {
  return sentence(value)
    .split(/;\s*|(?<=[.!?])\s+/u)
    .map((part) => normalizeReaderText(part).replace(/[“”"]/gu, "").replace(/[.!?]$/u, "").trim())
    .filter((part) => {
      if (!part || isUnsafeReaderClause(part)) return false;
      const wordCount = part.split(/\s+/u).filter(Boolean).length;
      return wordCount >= 2 && wordCount <= 28;
    });
}

function lowerFirst(value: string) {
  const trimmed = value.trim();
  const firstAlpha = trimmed.search(/[A-Za-z]/u);
  if (firstAlpha < 0) return trimmed;

  return `${trimmed.slice(0, firstAlpha)}${trimmed.charAt(firstAlpha).toLowerCase()}${trimmed.slice(firstAlpha + 1)}`;
}

function fallbackFragmentSentence(fragment: string) {
  const text = lowerFirst(fragment.replace(/[.!?]$/u, "").trim());
  if (!text) return "";

  if (/^(?:needs|guards|pushes|overthinks|chooses|risks|wants|seeks|looks|moves|works|protects|reacts|settles|opens|closes|holds|tests|asks|notices|keeps|makes|brings|meets|tracks|checks)\b/iu.test(text)) {
    return ensureTerminalPunctuation(sentenceCase(`it ${text}`));
  }

  return ensureTerminalPunctuation(sentenceCase(`it can show up as ${text}`));
}

function hasEnoughSourceForFallback(fragments: string[]) {
  if (fragments.length >= 2) return true;
  const wordCount = fragments[0]?.split(/\s+/u).filter(Boolean).length ?? 0;
  return wordCount >= 6;
}

function omittedFallback({
  fallbackId,
  fieldMap,
  renderedFields,
  supportingSourceKeys = []
}: {
  fallbackId: string;
  fieldMap: Record<string, string>;
  renderedFields: Record<string, string>;
  supportingSourceKeys?: string[];
}) {
  return {
    fallbackId,
    fallbackSpecificity: "factual-floor" as FallbackSpecificity,
    finalVisibleStrings: [],
    renderedFields,
    fieldMap,
    compactCopy: "",
    expandedCopy: "",
    readerAuthority: "omitted" as ReaderAuthority,
    supportingSourceKeys
  };
}

function readerPossessive(perspective: "you" | "they") {
  return perspective === "they" ? "their" : "your";
}

function adaptReaderPossessives(value: string, perspective: "you" | "they") {
  return perspective === "they"
    ? value.replace(/\byour\b/giu, "their").replace(/\byou\b/giu, "they")
    : value.replace(/\btheir\b/giu, "your").replace(/\bthey\b/giu, "you");
}

const HOUSE_FALLBACK_TOPICS: Record<number, string> = {
  1: "the body, first reactions, appearance, and the way a room meets you before you explain yourself",
  2: "money, food, possessions, self-worth, and the practical conditions that make life feel stable",
  3: "daily conversations, siblings, neighbors, messages, and the nervous system of ordinary life",
  4: "home, family memory, privacy, ancestry, and the place you return to when the outside world gets loud",
  5: "creative risk, pleasure, romance, children, and the places where joy asks to be emotionally safe",
  6: "work, health, routines, chores, caretaking, and the way daily life uses your energy",
  7: "partnership, conflict, agreements, and the people whose responses shape your emotional weather",
  8: "trust, shared resources, grief, intimacy, debt, and the places where control has to be negotiated",
  9: "belief, study, travel, teachers, publishing, and the larger story that helps you orient yourself",
  10: "career, visibility, reputation, responsibility, and the role other people can recognize",
  11: "friendship, groups, networks, audience, and the future you build with other people",
  12: "rest, retreat, grief, solitude, hidden stress, and what the body carries before the mind explains it"
};

function natalPlacementFallbackSignStory({
  body,
  perspective,
  sign,
  source
}: {
  body: string;
  perspective: "you" | "they";
  sign: string;
  source: string;
}) {
  const fragments = sourceLaneFragments(source);
  if (!hasEnoughSourceForFallback(fragments)) return "";
  const firstFragment = fragments[0] ?? "";

  const followup = fallbackFragmentSentence(fragments[1] ?? "");
  const possessive = perspective === "they" ? "their" : "your";
  const opening = ensureTerminalPunctuation(sentenceCase(`${possessive} ${titlePart(body)} in ${titlePart(sign)} can show up as ${lowerFirst(firstFragment)}`));
  return [opening, followup].filter(Boolean).join(" ");
}

function natalPlacementFallbackHouseStory({
  body,
  house,
  perspective,
  sign,
  source
}: {
  body: string;
  house: number | null;
  perspective: "you" | "they";
  sign: string;
  source: string;
}) {
  if (!house || !source) return "";

  const possessive = perspective === "they" ? "their" : "your";
  const topic = adaptReaderPossessives(HOUSE_FALLBACK_TOPICS[house] ?? "the part of life described by this house", perspective);
  const fragments = sourceLaneFragments(source);
  if (!hasEnoughSourceForFallback(fragments)) return "";
  const sourceSentence = fallbackFragmentSentence(fragments[0] ?? "");
  const houseOpening = ensureTerminalPunctuation(sentenceCase(`${possessive} ${titlePart(body)} in ${titlePart(sign)} in the ${ordinal(house)} house brings that pattern into ${topic}`));
  const houseSource = sourceSentence
    ? sourceSentence.replace(/^It\b/u, "In that area, it")
    : "";

  return [houseOpening, houseSource].filter(Boolean).join(" ");
}

function surfaceInfo(surface: SurfaceId) {
  const found = matrix.surfaces.find((entry) => entry.surface === surface);
  if (!found) throw new Error(`Unknown v2 surface: ${surface}`);
  return found;
}

function missingFacts(surface: SurfaceId, facts: Record<string, unknown>) {
  return surfaceInfo(surface).requiredFacts.filter((fact) => {
    const value = facts[fact];
    return value === undefined || value === null || value === "";
  });
}

function templateIdFor(surface: SurfaceId, family: string, mode: RenderMode) {
  return `${surface}.${family}.${mode}.v2`;
}

function fieldOrder(templateFamily: string, mode: RenderMode) {
  const contract = templateContract.families[templateFamily]?.[mode];
  return [...(contract?.required ?? []), ...(contract?.optional ?? [])];
}

function outputFromRecord({
  facts,
  mode,
  recordId,
  surface
}: {
  facts: Record<string, unknown>;
  mode: RenderMode;
  recordId: string;
  surface: SurfaceId;
}): V2RenderedOutput {
  const record = REVIEWED_RECORDS[recordId];
  if (!record) {
    return sourceGap(surface, facts, [`reviewed record ${recordId}`], mode);
  }

  const missing = missingFacts(surface, facts);
  if (missing.length > 0) {
    return sourceGap(surface, facts, missing, mode);
  }

  const familyContract = templateContract.families[record.templateFamily]?.[mode];
  const allowed = new Set([...(familyContract?.required ?? []), ...(familyContract?.optional ?? [])]);
  const forbidden = new Set(familyContract?.forbidden ?? []);
  const renderedFields: Record<string, string> = {};
  const fieldMap: Record<string, string> = {};

  for (const field of fieldOrder(record.templateFamily, mode)) {
    if (forbidden.has(field)) continue;
    const factField = factFieldValue(field, facts);
    const slotField = record.fields[field]?.text;
    const text = sentence(factField || slotField);
    if (!text || !allowed.has(field)) continue;
    renderedFields[field] = text;
    fieldMap[field] = FIELD_COMPONENTS[field] ?? "reader field";
  }

  const required = familyContract?.required ?? [];
  const missingRequired = required.filter((field) => !renderedFields[field]);
  if (missingRequired.length > 0) {
    return sourceGap(surface, facts, missingRequired, mode, record.templateFamily);
  }

  const visible = visibleStrings(record.templateFamily, mode, renderedFields);
  const compactCopy = renderedFields.compactSummary;
  const expandedCopy = [renderedFields.expandedNarrative, renderedFields.practicalResponse, renderedFields.passContext, renderedFields.integratedSignHouseStory].filter(Boolean).join("\n\n");

  return {
    status: "READY",
    surface,
    templateFamily: record.templateFamily,
    templateId: templateIdFor(surface, record.templateFamily, mode),
    templateVersion: SOURCE_GROUNDED_V2_TEMPLATE_VERSION,
    mode,
    recordId,
    sourceTier: "RENDERED_OUTPUT",
    primarySourceKeys: record.primarySourceKeys,
    supportingSourceKeys: record.supportingSourceKeys ?? [],
    calculatedFactKeys: Object.keys(facts).map((key) => `calculated:${key}`),
    facts,
    renderedFields,
    fieldMap,
    finalVisibleStrings: visible,
    compactCopy,
    expandedCopy,
    exactSourceStatus: "present",
    sourceGap: false,
    readerAuthority: "reviewed-exact",
    legacyContributors: [],
    provenance: parityProvenance(recordId),
    runtimeTrace: runtimeTrace({
      exactSourceStatus: "present",
      facts,
      finalText: visible.join("\n\n"),
      mode,
      primarySourceId: record.primarySourceKeys[0] ?? "",
      readerAuthority: "reviewed-exact",
      recordId,
      selectedSlots: Object.keys(renderedFields),
      sourceGap: false,
      supportingSourceIds: record.supportingSourceKeys ?? [],
      suppressedSlots: [],
      surface,
      templateId: templateIdFor(surface, record.templateFamily, mode)
    })
  };
}

function factFieldValue(field: string, facts: Record<string, unknown>) {
  switch (field) {
    case "factualEventTitle":
      if (facts.transitingPoint && facts.aspect && facts.natalPoint) return `${titlePart(facts.transitingPoint)} ${sentence(facts.aspect)} your ${titlePart(facts.natalPoint)}`;
      if (facts.pointA && facts.aspect && facts.pointB) return `${titlePart(facts.pointA)} ${sentence(facts.aspect)} ${titlePart(facts.pointB)}`;
      return "";
    case "factualPlacementTitle":
      if (facts.currentBody && facts.currentSign) return `${titlePart(facts.currentBody)} in ${titlePart(facts.currentSign)}`;
      if (facts.natalBody && facts.natalSign && facts.natalHouse) return `${titlePart(facts.natalBody)} in ${titlePart(facts.natalSign)} in the ${facts.natalHouse} house`;
      if (facts.natalBody && facts.natalSign) return `${titlePart(facts.natalBody)} in ${titlePart(facts.natalSign)}`;
      return "";
    case "phaseTitle":
      return titlePart(facts.moonPhase);
    case "signTitle":
      return facts.moonSign ? `Moon in ${titlePart(facts.moonSign)}` : "";
    case "factualAngleTitle":
      return facts.angle && facts.sign ? `${titlePart(facts.angle)} in ${titlePart(facts.sign)}` : "";
    case "factualAspectTitle":
      return facts.natalPointA && facts.aspect && facts.natalPointB ? `${titlePart(facts.natalPointA)} ${sentence(facts.aspect)} ${titlePart(facts.natalPointB)}` : "";
    case "timingDisplay":
      return sentence(facts.activeWindow || facts.timestamp || facts.timingDisplay);
    case "dateDisplay":
      return sentence(facts.date);
    case "degreeDisplay":
      return sentence(facts.degree);
    case "orbDisplay":
      return sentence(facts.orb);
    case "exactDateDisplay":
      return sentence(facts.exactDate);
    case "astroFooter":
      if (facts.transitingPoint && facts.aspect && facts.natalPoint) {
        const sign = facts.natalSign ? ` in ${titlePart(facts.natalSign)}` : "";
        const house = facts.natalHouse ? ` in the ${ordinal(facts.natalHouse)} house` : "";
        const orb = facts.orb ? `. Orb: ${facts.orb}` : "";
        return `The astro: Transiting ${titlePart(facts.transitingPoint)} ${aspectVerb(facts.aspect)} your natal ${titlePart(facts.natalPoint)}${sign}${house}${orb}.`;
      }
      return "";
    default:
      return "";
  }
}

function ordinal(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return sentence(value);
  const rem100 = number % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${number}th`;
  return `${number}${{ 1: "st", 2: "nd", 3: "rd" }[number % 10] ?? "th"}`;
}

function aspectVerb(aspect: unknown) {
  const normalized = sentence(aspect).toLowerCase();
  if (normalized === "conjunction") return "conjuncts";
  if (normalized === "opposition") return "opposes";
  return `${normalized}s`;
}

function fallbackV3Angle(value: unknown): AngleFacts["angle"] | null {
  const normalized = slugPart(value);
  if (normalized === "ascendant" || normalized === "descendant" || normalized === "midheaven") return normalized;
  if (normalized === "imum-coeli" || normalized === "ic") return "imum-coeli";
  return null;
}

function fallbackV3Aspect(value: unknown): AspectFacts["aspect"] | null {
  const normalized = slugPart(value).replace(/^conjunct$/u, "conjunction");
  return FALLBACK_V3_ASPECTS.has(normalized as AspectFacts["aspect"])
    ? normalized as AspectFacts["aspect"]
    : null;
}

function visibleStrings(templateFamily: string, mode: RenderMode, fields: Record<string, string>) {
  const order = templateContract.families[templateFamily]?.[mode]?.order
    ?? [...(templateContract.families[templateFamily]?.[mode]?.required ?? []), ...(templateContract.families[templateFamily]?.[mode]?.optional ?? [])];
  return order.map((field: string) => fields[field]).filter(Boolean);
}

function parityProvenance(recordId: string) {
  const value = `v2-surface-resolver:${recordId}`;
  return { initial: value, hydrated: value, adminPreview: value };
}

function approvedFallbackFor(surface: SurfaceId, facts: Record<string, unknown>, mode: RenderMode): {
  fallbackId: string | null;
  fallbackSpecificity: FallbackSpecificity;
  finalVisibleStrings: string[];
  renderedFields: Record<string, string>;
  fieldMap: Record<string, string>;
  compactCopy?: string;
  expandedCopy?: string;
  readerAuthority: ReaderAuthority;
  supportingSourceKeys: string[];
} {
  const body = titlePart(facts.currentBody || facts.natalBody || facts.transitingPoint || "");
  const sign = titlePart(facts.currentSign || facts.natalSign || facts.moonSign || "");
  const window = sentence(facts.activeWindow || facts.timestamp || facts.date);
  const windowParts = dateParts(window);
  const fieldMap = {
    factualPlacementTitle: "page title",
    factualEventTitle: "page title",
    factualAspectTitle: "page title",
    factualAngleTitle: "page title",
    phaseTitle: "page title",
    signTitle: "page title",
    timingDisplay: "timing row",
    dateDisplay: "date row",
    compactSummary: "card summary",
    expandedNarrative: "main body",
    practicalResponse: "body guidance",
    passContext: "long-term/pass section",
    astroFooter: "technical footer",
    degreeDisplay: "degree row",
    orbDisplay: "orb row",
    integratedSignHouseStory: "main body",
    integratedAspectStory: "main body"
  };

  const unwiredSkyPointPlacements = new Set([
    "chiron",
    "lilith",
    "north-node",
    "north_node",
    "south-node",
    "south_node",
    "true-node",
    "true_node"
  ]);

  const isUnwiredSkyPointPlacement = (value: string) => unwiredSkyPointPlacements.has(slugPart(value));

  if (surface === "sky.planet_sign" && body && sign) {
    const title = `${body} in ${sign}`;
    if (isUnwiredSkyPointPlacement(body)) {
      return {
        fallbackId: null,
        fallbackSpecificity: "factual-floor",
        finalVisibleStrings: [],
        renderedFields: {
          factualPlacementTitle: title,
          ...(window ? { timingDisplay: window } : {})
        },
        fieldMap,
        compactCopy: "",
        expandedCopy: "",
        readerAuthority: "omitted",
        supportingSourceKeys: []
      };
    }

    if (sentence(facts.motion).toLowerCase() === "retrograde" || sentence(facts.direction).toLowerCase() === "retrograde") {
      const exemplar = body === "Mercury" && sign === "Cancer"
        ? exemplarRecords.find((record) => record.id === "exemplar.sky.mercury-retrograde.cancer")
        : null;
      const reviewSituation = exemplar?.slots?.recognizableMoment
        || ccPhrases[`cc/fallback/retrograde/collective-${slugPart(body)}-flavor`]
        || sourceLaneSentence(skyClauseBank("signBehavior", sign))
        || sourceLaneSentence(ccSignLane(sign, "lived-behaviors"))
        || snapshotCardClaim(body, sign)
        || `${title} is retrograde.`;
      const compactReview = skyPlacementCardClaim([
        reviewSituation,
        sourceLaneSentence(ccSignLane(sign, "lived-behaviors")),
        sourceLaneSentence(skyClauseBank("signBehavior", sign)),
        snapshotCardClaim(body, sign)
      ], body, sign);
      const reviewAction = exemplar?.slots?.practicalResponse ?? "";
      const snapshotParagraphs = snapshotDetailParagraphs(body, sign);
      const sourceKeys = exemplar?.source_keys ?? snapshotSourceKeys(body, sign);
      const rendered = renderMustacheMadlib("sky.retrograde.passage", {
        facts: {
          body,
          sign,
          retrograde_start: windowParts.start,
          retrograde_end: windowParts.end
        },
        primary: {
          review_situation: compactReview,
          return_or_complication: exemplar ? "" : sourceLaneSentence(ccSignLane(sign, "lived-behaviors")) || sourceLaneSentence(skyClauseBank("signBehavior", sign)) || "",
        },
        action: {
          review_action: reviewAction || sourceLaneSentence(ccSignLane(sign, "actions")) || snapshotParagraphs[2] || ""
        },
        modifier: {
          phase_context: ""
        }
      });
      const visibleRendered = stripTemplateHeaderParagraphs(rendered, [`${body} Rx in ${sign}`, window]);

      return {
        fallbackId: `fallback-hook/sky.retrograde/${slugPart(body)}/${slugPart(sign)}`,
        fallbackSpecificity: "exact-combination",
        finalVisibleStrings: mode === "card" ? [compactReview].filter(Boolean) : visibleRendered,
        renderedFields: {
          factualPlacementTitle: `${body} Rx in ${sign}`,
          ...(window ? { timingDisplay: window } : {}),
          ...(mode === "card" && compactReview ? { compactSummary: compactReview } : {}),
          ...(mode === "detail" && visibleRendered.length > 0 ? { expandedNarrative: visibleRendered.join("\n\n") } : {})
        },
        fieldMap,
        compactCopy: compactReview,
        expandedCopy: visibleRendered.join("\n\n"),
        readerAuthority: visibleRendered.length > 0 || compactReview ? "approved-fallback" : "omitted",
        supportingSourceKeys: sourceKeys.length > 0 ? sourceKeys : ["approved-fallback/sky.retrograde"]
      };
    }
    const exactKey = `cc/planet-in-sign/${slugPart(body)}-in-${slugPart(sign)}`;
    const familyKey = `cc/planet-in-sign/${slugPart(body)}-in-sign`;
    const signKey = `cc/sign/${slugPart(sign)}/actions`;
    const overrideKey = `sky.placement.${slugPart(body)}.${slugPart(sign)}`;
    const sourceKeys = [exactKey, familyKey, signKey].filter((key) => ccPhrases[key]);
    const exactPhrase = ccPhrases[exactKey] || ccPhrases[familyKey] || "";
    const actionPhrase = skyOverride(overrideKey, "currentChoiceClause") || concisePhrase(ccPhrases[signKey]);
    const collectiveShift = skyOverride(overrideKey, "collectiveBehaviorClause");
    const recognizableSituation = skyOverride(overrideKey, "recognizableSituationClause");
    const bankFallback = skyClauseBank("signBehavior", sign);
    const signLivedBehavior = sourceLaneSentence(ccSignLane(sign, "lived-behaviors"));
    const signAction = sourceLaneSentence(ccSignLane(sign, "actions"));
    const snapshotKeys = snapshotSourceKeys(body, sign);
    const snapshotParagraphs = snapshotDetailParagraphs(body, sign);
    const snapshotCard = snapshotCardClaim(body, sign);
    const cardCandidates = body === "Sun" && sign === "Cancer"
      ? [snapshotCard, exactPhrase, collectiveShift, recognizableSituation, bankFallback, signLivedBehavior, snapshotParagraphs[0]]
      : [snapshotCard, snapshotParagraphs[0], collectiveShift, recognizableSituation, bankFallback, signLivedBehavior, exactPhrase];
    const compact = skyPlacementCardClaim(cardCandidates, body, sign);
    const safeAction = sentenceReadySkyDetailParagraphs(actionPhrase, body, sign)[0] ?? signAction;
    const detailCandidates = snapshotParagraphs.length >= 2
      ? [
          ...snapshotParagraphs,
          safeAction,
          collectiveShift,
          recognizableSituation,
          bankFallback,
          signLivedBehavior,
          exactPhrase
        ]
      : [
          collectiveShift,
          recognizableSituation,
          bankFallback,
          signLivedBehavior,
          safeAction,
          exactPhrase,
          ...snapshotParagraphs
        ];
    const detailMinimum = snapshotParagraphs.length >= 3 ? 3 : 2;
    const expandedParagraphs = skyPlacementDetailParagraphs(detailCandidates, body, sign, detailMinimum);
    const expanded = renderMustacheMadlib("sky.planet_sign.detail", {
      facts: { body, sign, start_date: windowParts.start, end_date: windowParts.end },
      primary: {
        collective_shift: expandedParagraphs[0] ?? snapshotParagraphs[0] ?? bankFallback,
        recognizable_collective_situation: expandedParagraphs[1] ?? snapshotParagraphs[1] ?? ""
      },
      action: {
        collective_response: (expandedParagraphs[2] ?? safeAction) || snapshotParagraphs[2] || ""
      }
    });
    const visibleExpanded = stripTemplateHeaderParagraphs(expanded, [title, window]);
    return {
      fallbackId: `fallback-hook/sky.planetary-placement/${slugPart(body)}/${slugPart(sign)}`,
      fallbackSpecificity: sourceKeys.length > 0 || collectiveShift ? "exact-combination" : "surface-family",
      finalVisibleStrings: mode === "card" ? [compact].filter(Boolean) : visibleExpanded,
      renderedFields: {
        factualPlacementTitle: title,
        ...(window ? { timingDisplay: window } : {}),
        ...(mode === "card" && compact ? { compactSummary: compact } : {}),
        ...(mode === "detail" && visibleExpanded.length > 0 ? { expandedNarrative: visibleExpanded.join("\n\n") } : {})
      },
      fieldMap,
      compactCopy: compact,
      expandedCopy: visibleExpanded.join("\n\n"),
      readerAuthority: visibleExpanded.length > 0 || compact ? "approved-fallback" : "factual-floor",
      supportingSourceKeys: [...new Set([...sourceKeys, ...snapshotKeys])].length > 0 ? [...new Set([...sourceKeys, ...snapshotKeys])] : ["approved-fallback/sky.planet-sign"]
    };
  }

  if (surface === "sky.aspect" && facts.pointA && facts.aspect && facts.pointB) {
    const title = `${titlePart(facts.pointA)} ${sentence(facts.aspect)} ${titlePart(facts.pointB)}`;
    const exactDate = sentence(facts.exactDate || facts.date || facts.activeWindow);
    if (mode === "card") {
      return {
        fallbackId: null,
        fallbackSpecificity: null,
        finalVisibleStrings: [title],
        renderedFields: {
          factualAspectTitle: title,
          ...(facts.orb ? { orbDisplay: sentence(facts.orb) } : {})
        },
        fieldMap,
        readerAuthority: "omitted",
        supportingSourceKeys: []
      };
    }
    const aspectKey = `cc/aspect/${slugPart(facts.aspect)}`;
    const overrideKey = `sky.aspect.${slugPart(facts.pointA)}.${slugPart(facts.aspect)}.${slugPart(facts.pointB)}`;
    const reverseOverrideKey = `sky.aspect.${slugPart(facts.pointB)}.${slugPart(facts.aspect)}.${slugPart(facts.pointA)}`;
    const aspectPhrase = ccPhrases[aspectKey] || "";
    const overrideHeadline = skyOverride(overrideKey, "headline") || skyOverride(reverseOverrideKey, "headline");
    const overrideBehavior = skyOverride(overrideKey, "aspectBehaviorClause") || skyOverride(reverseOverrideKey, "aspectBehaviorClause");
    const overrideSituation = skyOverride(overrideKey, "recognizableSituationClause") || skyOverride(reverseOverrideKey, "recognizableSituationClause");
    const overrideAction = skyOverride(overrideKey, "constructiveUseClause") || skyOverride(reverseOverrideKey, "constructiveUseClause");
    const overrideTiming = skyOverride(overrideKey, "timingClause") || skyOverride(reverseOverrideKey, "timingClause");
    const expanded = renderMustacheMadlib("sky.aspect", {
      facts: {
        body_a: titlePart(facts.pointA),
        aspect_name: sentence(facts.aspect),
        body_b: titlePart(facts.pointB),
        exact_date: exactDate
      },
      primary: (overrideBehavior || aspectPhrase) ? {
        collective_contact_situation: overrideHeadline || overrideBehavior || aspectPhrase,
        development: overrideSituation || skyAspectBank(facts.aspect, "behavior")
      } : null,
      action: {
        response: overrideAction || overrideTiming || skyAspectBank(facts.aspect, "constructive")
      }
    });
    const visibleExpanded = stripTemplateHeaderParagraphs(expanded, [title, exactDate]);
    return {
      fallbackId: "fallback-hook/sky.aspect-row",
      fallbackSpecificity: overrideBehavior ? "exact-combination" : "surface-family",
      finalVisibleStrings: visibleExpanded,
      renderedFields: {
        factualAspectTitle: title,
        ...(facts.exactDate ? { exactDateDisplay: sentence(facts.exactDate) } : {})
      },
      fieldMap,
      expandedCopy: visibleExpanded.join("\n\n"),
      readerAuthority: visibleExpanded.length > 0 ? "approved-fallback" : "factual-floor",
      supportingSourceKeys: overrideBehavior ? [`normalized-sky-source/overrides/${overrideHeadline ? overrideKey : reverseOverrideKey}`] : aspectPhrase ? [aspectKey] : ["approved-fallback/sky.aspect/factual-floor"]
    };
  }

  if (surface === "home.planetary_horoscope" && body && sign) {
    const house = facts.resolvedWholeSignHouse ? ` in your ${ordinal(facts.resolvedWholeSignHouse)} house` : "";
    const title = `${body} in ${sign}${house}`;
    const houseKey = facts.resolvedWholeSignHouse ? `cc/house/${facts.resolvedWholeSignHouse}` : "";
    const planetKey = `cc/planet-in-sign/${slugPart(body)}-in-${slugPart(sign)}`;
    const housePhrase = houseKey ? ccPhrases[houseKey] : "";
    const planetPhrase = ccPhrases[planetKey] || ccPhrases[`cc/planet/${slugPart(body)}`] || "";
    const compactClaim = housePhrase
      ? `${body} in ${sign} is active for the part of your chart connected with ${housePhrase}.`
      : `${body} in ${sign} is active for this chart.`;
    const expanded = renderMustacheMadlib(mode === "card" ? "home.planetary.card" : "home.planetary.detail", {
      facts: { body, sign, start_date: windowParts.start, end_date: windowParts.end },
      primary: {
        compact_claim: compactClaim,
        house_localized_claim: compactClaim,
        reflective_development: planetPhrase
      },
      action: {
        personal_response: ""
      }
    });
    return {
      fallbackId: `fallback-hook/home.planetary-horoscope/${slugPart(facts.risingSign) || "unknown-rising"}/${slugPart(body)}-${slugPart(sign)}`,
      fallbackSpecificity: "exact-combination",
      finalVisibleStrings: expanded.split("\n\n").filter(Boolean),
      renderedFields: {
        factualPlacementTitle: title,
        ...(window ? { timingDisplay: window } : {}),
        ...(mode === "card" ? { compactSummary: expanded } : { expandedNarrative: expanded })
      },
      fieldMap,
      compactCopy: mode === "card" ? expanded : undefined,
      expandedCopy: mode === "detail" ? expanded : undefined,
      readerAuthority: "approved-fallback",
      supportingSourceKeys: [planetKey, houseKey].filter(Boolean)
    };
  }

  if (surface === "home.moon_forecast.phase") {
    const title = titlePart(facts.moonPhase || "Moon phase");
    const expanded = `${title} is the calculated lunar phase for this moment.`;
    return {
      fallbackId: "fallback-hook/home.moon-phase",
      fallbackSpecificity: "surface-family",
      finalVisibleStrings: [title, window, expanded].filter(Boolean),
      renderedFields: {
        phaseTitle: title,
        ...(window ? { timingDisplay: window } : {}),
        expandedNarrative: expanded
      },
      fieldMap: {
        phaseTitle: "page title",
        timingDisplay: "timing row",
        expandedNarrative: "main body"
      },
      expandedCopy: expanded,
      readerAuthority: "approved-fallback",
      supportingSourceKeys: ["approved-fallback/home.moon-phase"]
    };
  }

  if (surface === "home.moon_forecast.sign") {
    const title = sign ? `Moon in ${sign}` : "Moon sign";
    const expanded = `${title} is the calculated Moon sign for this moment.`;
    return {
      fallbackId: `fallback-hook/home.moon-sign/${slugPart(sign) || "unknown"}`,
      fallbackSpecificity: sign ? "exact-combination" : "surface-family",
      finalVisibleStrings: [title, window, expanded].filter(Boolean),
      renderedFields: {
        signTitle: title,
        ...(window ? { timingDisplay: window } : {}),
        expandedNarrative: expanded
      },
      fieldMap: {
        signTitle: "page title",
        timingDisplay: "timing row",
        expandedNarrative: "main body"
      },
      expandedCopy: expanded,
      readerAuthority: "approved-fallback",
      supportingSourceKeys: [`cc/sign/${slugPart(sign)}/lived-behaviors`]
    };
  }

  if (surface === "transits.personalized" && facts.transitingPoint && facts.aspect && facts.natalPoint) {
    const title = `${titlePart(facts.transitingPoint)} ${sentence(facts.aspect)} your ${titlePart(facts.natalPoint)}`;
    const footer = factFieldValue("astroFooter", facts);
    const exactPairKey = `cc/aspect-pair/${slugPart(facts.natalPoint)}-${slugPart(facts.aspect)}-${slugPart(facts.transitingPoint)}`;
    const pairPhrase = ccPhrases[exactPairKey];
    const hasPair = Boolean(pairPhrase);
    const long = mode === "detail" && /saturn|uranus|neptune|pluto/iu.test(sentence(facts.transitingPoint));
    const phraseSentences = sentences(pairPhrase);
    const practical = phraseSentences.find((item) => /\bask|make|let|name|move|say|check|treat\b/iu.test(item)) ?? "";
    const repeatingPattern = phraseSentences.find((item) => item !== phraseSentences[0] && item !== practical) ?? "";
    const rendered = hasPair
      ? renderMustacheMadlib(long ? "transit.long" : "transit.short", {
          ui: { editorial_headline: title },
          facts: {
            start_date: windowParts.start,
            end_date: windowParts.end,
            exact_date: sentence(facts.exactDate),
            pass_label: sentence(facts.passLabel || facts.passNumber)
          },
          primary: long ? {
            recognizable_situation: phraseSentences[0] ?? pairPhrase,
            repeating_pattern: repeatingPattern,
            deeper_pressure: phraseSentences[2] ?? ""
          } : {
            immediate_situation: phraseSentences[0] ?? pairPhrase,
            consequence_or_tension: repeatingPattern
          },
          action: long ? {
            long_term_response: practical
          } : {
            immediate_response: practical
          },
          modifier: {
            pass_context: sentence(facts.passLabel || facts.passNumber) ? `${sentence(facts.passLabel || facts.passNumber)} belongs to the calculated transit pass sequence.` : ""
          },
          technical: {
            transiting_body: titlePart(facts.transitingPoint),
            aspect_phrase: aspectVerb(facts.aspect),
            natal_point: titlePart(facts.natalPoint),
            natal_sign: titlePart(facts.natalSign),
            natal_house: facts.natalHouse ? `${ordinal(facts.natalHouse)} house` : "",
            orb: sentence(facts.orb)
          }
        })
      : [title, window, footer].filter(Boolean).join("\n\n");
    return {
      fallbackId: `fallback-hook/transits.personalized/${slugPart(facts.transitingPoint)}-${slugPart(facts.aspect)}-${slugPart(facts.natalPoint)}`,
      fallbackSpecificity: hasPair ? "exact-combination" : "factual-floor",
      finalVisibleStrings: rendered.split("\n\n").filter(Boolean),
      renderedFields: {
        factualEventTitle: title,
        ...(window ? { timingDisplay: window } : {}),
        ...(hasPair ? { expandedNarrative: rendered } : {}),
        ...(footer ? { astroFooter: footer } : {})
      },
      fieldMap,
      expandedCopy: rendered,
      readerAuthority: hasPair ? "approved-fallback" : "factual-floor",
      supportingSourceKeys: hasPair ? [exactPairKey] : ["approved-fallback/transits.personalized/factual-floor"]
    };
  }

  if (surface === "me.natal_angle" && facts.angle && facts.sign) {
    const angle = fallbackV3Angle(facts.angle);
    const signKey = slugPart(facts.sign);
    const title = `${titlePart(facts.angle)} in ${titlePart(facts.sign)}`;

    if (!angle) {
      return omittedFallback({
        fallbackId: `fallback-hook/me.natal-angle/${slugPart(facts.angle)}-${signKey}`,
        fieldMap,
        renderedFields: {
          factualAngleTitle: title,
          sourceMaterialStatus: "needs-source-material"
        },
        supportingSourceKeys: [`SOURCE_GAP: unsupported natal angle ${sentence(facts.angle)}`]
      });
    }

    try {
      const rendered = fallbackRendererV3.renderNatalAngle({
        angle,
        sign: signKey,
        voice: "you"
      });
      const expandedNarrative = rendered.parts.join("\n\n");

      return {
        fallbackId: `fallback-hook/me.natal-angle/${angle}-${signKey}`,
        fallbackSpecificity: "exact-combination",
        finalVisibleStrings: rendered.parts,
        renderedFields: {
          factualAngleTitle: title,
          expandedNarrative,
          ...(facts.degree ? { degreeDisplay: sentence(facts.degree) } : {})
        },
        fieldMap,
        expandedCopy: expandedNarrative,
        readerAuthority: "approved-fallback",
        supportingSourceKeys: [
          "tldrastro-fallback-architecture-v3",
          rendered.templateKey,
          `fallback-hook/angle-intro/${angle}`,
          `fallback-hook/angle-sign/${angle}/${signKey}`
        ]
      };
    } catch (error) {
      if (!(error instanceof FallbackV3SourceGapError)) throw error;
      return omittedFallback({
        fallbackId: `fallback-hook/me.natal-angle/${angle}-${signKey}`,
        fieldMap,
        renderedFields: {
          factualAngleTitle: title,
          sourceMaterialStatus: "needs-source-material"
        },
        supportingSourceKeys: [fallbackV3ErrorMessage(error)]
      });
    }
  }

  if (surface === "me.natal_aspect" && facts.natalPointA && facts.aspect && facts.natalPointB) {
    const aspect = fallbackV3Aspect(facts.aspect);
    const planetA = slugPart(facts.natalPointA);
    const planetB = slugPart(facts.natalPointB);
    const title = `${titlePart(facts.natalPointA)} ${sentence(facts.aspect)} ${titlePart(facts.natalPointB)}`;

    if (!aspect) {
      return omittedFallback({
        fallbackId: `fallback-hook/me.natal-aspect/${planetA}-${slugPart(facts.aspect)}-${planetB}`,
        fieldMap,
        renderedFields: {
          factualAspectTitle: title,
          sourceMaterialStatus: "needs-source-material"
        },
        supportingSourceKeys: [`SOURCE_GAP: unsupported natal aspect ${sentence(facts.aspect)}`]
      });
    }

    try {
      const rendered = fallbackRendererV3.renderNatalAspect({
        aspect,
        planetA,
        planetB,
        voice: ownerFallbackVoiceFor(facts)
      });
      const expandedNarrative = rendered.parts.join("\n\n");

      return {
        fallbackId: `fallback-hook/me.natal-aspect/${planetA}-${aspect}-${planetB}`,
        fallbackSpecificity: "surface-family",
        finalVisibleStrings: rendered.parts,
        renderedFields: {
          factualAspectTitle: title,
          expandedNarrative,
          ...(facts.orb ? { orbDisplay: sentence(facts.orb) } : {})
        },
        fieldMap,
        expandedCopy: expandedNarrative,
        readerAuthority: "approved-fallback",
        supportingSourceKeys: [
          "tldrastro-fallback-architecture-v3",
          rendered.templateKey,
          `fallback-vocab/aspect-adj/${aspect}`,
          `fallback-vocab/planet-core/${planetA}`,
          `fallback-vocab/planet-core/${planetB}`
        ]
      };
    } catch (error) {
      if (!(error instanceof FallbackV3SourceGapError)) throw error;
      return omittedFallback({
        fallbackId: `fallback-hook/me.natal-aspect/${planetA}-${aspect}-${planetB}`,
        fieldMap,
        renderedFields: {
          factualAspectTitle: title,
          sourceMaterialStatus: "needs-source-material"
        },
        supportingSourceKeys: [fallbackV3ErrorMessage(error)]
      });
    }
  }

  if (surface === "me.natal_placement" && facts.natalBody && facts.natalSign) {
    const house = facts.natalHouse ? ` in the ${ordinal(facts.natalHouse)} house` : "";
    const title = `${titlePart(facts.natalBody)} in ${titlePart(facts.natalSign)}${house}`;
    try {
      const planetKey = slugPart(facts.natalBody);
      const signKey = slugPart(facts.natalSign);
      const rendered = fallbackRendererV3.renderNatalPlacement({
        planet: planetKey,
        sign: signKey,
        house: facts.natalHouse ? Number(facts.natalHouse) : null,
        voice: "you"
      });
      const [planetSignFallbackStory = "", planetSignHouseFallbackStory = ""] = rendered.parts;
      const expandedNarrative = rendered.parts.join("\n\n");

      return {
        fallbackId: `fallback-hook/me.natal-placement/${slugPart(facts.natalBody)}-${slugPart(facts.natalSign)}${facts.natalHouse ? `-house-${facts.natalHouse}` : ""}`,
        fallbackSpecificity: facts.natalHouse ? "exact-combination" : "surface-family",
        finalVisibleStrings: rendered.parts,
        renderedFields: {
          factualPlacementTitle: title,
          planetSignFallbackStory,
          ...(planetSignHouseFallbackStory ? { planetSignHouseFallbackStory } : {}),
          integratedSignHouseStory: expandedNarrative,
          ...(facts.degree ? { degreeDisplay: sentence(facts.degree) } : {})
        },
        fieldMap,
        expandedCopy: expandedNarrative,
        readerAuthority: "approved-fallback",
        supportingSourceKeys: [
          "tldrastro-fallback-architecture-v3",
          rendered.templateKey,
          `fallback-vocab/planet-topic/${planetKey}`,
          `fallback-vocab/sign-need/${signKey}`,
          ...(facts.natalHouse ? [`fallback-hook/house-meaning/${facts.natalHouse}`] : [])
        ]
      };
    } catch (error) {
      if (!(error instanceof FallbackV3SourceGapError)) throw error;
      return omittedFallback({
        fallbackId: `fallback-hook/me.natal-placement/${slugPart(facts.natalBody)}-${slugPart(facts.natalSign)}${facts.natalHouse ? `-house-${facts.natalHouse}` : ""}`,
        fieldMap,
        renderedFields: {
          factualPlacementTitle: title,
          sourceMaterialStatus: "needs-source-material"
        },
        supportingSourceKeys: [fallbackV3ErrorMessage(error)]
      });
    }
  }

  const title = surface.replace(/[._-]+/g, " ");
  return {
    fallbackId: `fallback-hook/${surface}`,
    fallbackSpecificity: "factual-floor",
    finalVisibleStrings: [title],
    renderedFields: { factualEventTitle: title },
    fieldMap: { factualEventTitle: "page title" },
    readerAuthority: "factual-floor",
    supportingSourceKeys: ["approved-fallback/factual-floor"]
  };
}

function sourceGap(surface: SurfaceId, facts: Record<string, unknown>, missing: string[], mode: RenderMode, templateFamily = surfaceInfo(surface).templateFamily): V2RenderedOutput {
  const recordId = `SOURCE_GAP.${surface}.${missing.map(slugPart).join(".") || "unknown"}`;
  const templateId = templateIdFor(surface, templateFamily, mode);
  const fallback = approvedFallbackFor(surface, facts, mode);
  const text = fallback.finalVisibleStrings.join("\n\n");
  return {
    status: "SOURCE_GAP",
    surface,
    templateFamily,
    templateId,
    templateVersion: SOURCE_GROUNDED_V2_TEMPLATE_VERSION,
    mode,
    recordId,
    sourceTier: "SOURCE_GAP",
    primarySourceKeys: [],
    supportingSourceKeys: fallback.supportingSourceKeys,
    calculatedFactKeys: Object.keys(facts).map((key) => `calculated:${key}`),
    missing,
    facts,
    renderedFields: fallback.renderedFields,
    fieldMap: fallback.fieldMap,
    finalVisibleStrings: fallback.finalVisibleStrings,
    compactCopy: fallback.compactCopy,
    expandedCopy: fallback.expandedCopy,
    exactSourceStatus: "absent",
    sourceGap: true,
    readerAuthority: fallback.readerAuthority,
    fallbackSpecificity: fallback.fallbackSpecificity,
    ...(fallback.fallbackId ? { fallbackId: fallback.fallbackId } : {}),
    legacyContributors: [],
    provenance: parityProvenance(recordId),
    runtimeTrace: runtimeTrace({
      exactSourceStatus: "absent",
      facts,
      ...(fallback.fallbackId ? { fallbackId: fallback.fallbackId } : {}),
      fallbackSpecificity: fallback.fallbackSpecificity,
      finalText: text,
      mode,
      primarySourceId: "",
      readerAuthority: fallback.readerAuthority,
      recordId,
      selectedSlots: [],
      sourceGap: true,
      supportingSourceIds: fallback.supportingSourceKeys,
      suppressedSlots: missing.map((slot) => ({ slot, reason: "no-source" })),
      surface,
      templateId
    })
  };
}

function runtimeTrace({
  exactSourceStatus,
  fallbackId,
  fallbackSpecificity,
  finalText,
  facts,
  mode,
  primarySourceId,
  readerAuthority,
  recordId,
  selectedSlots,
  sourceGap,
  supportingSourceIds,
  suppressedSlots,
  surface,
  templateId
}: {
  exactSourceStatus: "present" | "absent";
  fallbackId?: string;
  fallbackSpecificity?: FallbackSpecificity;
  finalText: string;
  facts: Record<string, unknown>;
  mode: RenderMode;
  primarySourceId: string;
  readerAuthority: ReaderAuthority;
  recordId: string;
  selectedSlots: string[];
  sourceGap: boolean;
  supportingSourceIds: string[];
  suppressedSlots: V2RuntimeTrace["suppressedSlots"];
  surface: SurfaceId;
  templateId: string;
}): V2RuntimeTrace {
  const identity = readerIdentityFor(surface, facts);
  return {
    route: recordId,
    surface: readerSurfaceFor(surface, facts, mode),
    surfaceId: surface,
    readerPerson: identity.person,
    chartOwnerId: identity.chartOwnerId,
    identityRevision: identity.identityRevision ?? "default",
    templateId,
    templateVersion: "2.3.0",
    resolution: readerAuthority,
    primarySourceIds: primarySourceId ? [primarySourceId] : [],
    primarySourceId,
    supportingSourceIds,
    selectedSlots,
    omittedSlots: suppressedSlots.map((slot) => slot.slot),
    suppressedSlots,
    legacyContributors: [],
    finalText,
    exactSourceStatus,
    sourceGap,
    readerAuthority,
    fallbackSpecificity,
    fallbackId
  };
}

export function resolveSourceGroundedV2(surface: SurfaceId, facts: Record<string, unknown>, mode: RenderMode = "detail"): V2RenderedOutput {
  const missing = missingFacts(surface, facts);
  if (missing.length > 0) return sourceGap(surface, facts, missing, mode);

  if (surface === "transits.personalized") {
    const key = `${slugPart(facts.transitingPoint)}-${slugPart(facts.aspect)}-${slugPart(facts.natalPoint)}`;
    if (key === "saturn-square-venus") return sourceGap(surface, facts, [`eligible reviewed exact aspect-pair clause for ${key}`], mode);
    return sourceGap(surface, facts, [`reviewed exact aspect-pair source for ${key}`], mode);
  }

  if (surface === "sky.planet_sign" && slugPart(facts.currentBody) === "sun" && slugPart(facts.currentSign) === "cancer") {
    return sourceGap(surface, facts, ["eligible reviewed Sky planet-sign clause for sun-cancer"], mode);
  }

  if (surface === "home.planetary_horoscope" && slugPart(facts.currentBody) === "sun" && slugPart(facts.currentSign) === "cancer" && slugPart(facts.risingSign) === "gemini") {
    return sourceGap(surface, facts, ["eligible reviewed Home planetary horoscope clause for sun-cancer-gemini-rising"], mode);
  }

  if (surface === "home.moon_forecast.sign" && slugPart(facts.moonSign) === "cancer") {
    return sourceGap(surface, facts, ["eligible reviewed Moon-sign clause for cancer"], mode);
  }

  if (surface === "home.moon_forecast.phase") {
    return sourceGap(surface, facts, [`reviewed Moon-phase source for ${facts.moonPhase ?? "unknown phase"}`], mode);
  }

  if (surface === "me.natal_placement") {
    if (facts.reliableBirthTime === false && slugPart(facts.natalBody) === "sun" && slugPart(facts.natalSign) === "aquarius") {
      return sourceGap(surface, facts, ["eligible reviewed natal placement clause for sun-aquarius without reliable birth time"], mode);
    }
    if (slugPart(facts.natalBody) === "sun" && slugPart(facts.natalSign) === "aquarius" && Number(facts.natalHouse) === 9) {
      return sourceGap(surface, facts, ["eligible reviewed natal placement clause for sun-aquarius-9h"], mode);
    }
    if (slugPart(facts.natalBody) === "moon" && slugPart(facts.natalSign) === "cancer" && Number(facts.natalHouse) === 4 && facts.sect === "night") {
      return sourceGap(surface, facts, ["eligible reviewed natal placement night-sect clause for moon-cancer-4h"], mode);
    }
  }

  return sourceGap(surface, facts, [`reviewed source for ${surface}`], mode);
}

export function v2FixtureContractIds() {
  return (fixtureContract.fixtures ?? []).map((fixture) => fixture.id);
}
