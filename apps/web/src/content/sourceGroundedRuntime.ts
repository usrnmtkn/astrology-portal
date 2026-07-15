import sourceGroundedBundle from "./finalSourceGroundedDashboardRecords.json" with { type: "json" };
import {
  composeNatalAspect,
  composePersonalTransit,
  natalPlacementRecordId,
  recordKeyPart,
  type AspectFact,
  type OwnerPerspective,
  type SourceGroundedComposition,
  type SourceGroundedSection
} from "./sourceGroundedModels";
import { resolveSourceGroundedV2, SOURCE_GROUNDED_V2_TEMPLATE_VERSION } from "./sourceGroundedV2";
import { isReaderFacingCopy } from "./readerSafety";
import type { PlanetPosition, SkySnapshot } from "../types";

type SourceGroundedRecord = {
  canonicalKey: string;
  clauses?: Record<string, {
    review_status?: string;
    source_keys?: string[];
    surface?: string;
    text_they?: string;
    text_you?: string;
  }>;
  family?: string;
  validation?: {
    state?: string;
  };
};

type SourceGroundedBundle = {
  records?: SourceGroundedRecord[];
  sourceGaps?: SourceGroundedRecord[];
};

const records = (sourceGroundedBundle as SourceGroundedBundle).records ?? [];
const sourceGaps = (sourceGroundedBundle as SourceGroundedBundle).sourceGaps ?? [];
const readyRecordKeys = new Set(
  records
    .filter((record) => record.validation?.state === "READY")
    .map((record) => record.canonicalKey)
);
const sourceGapKeys = new Set(sourceGaps.map((record) => record.canonicalKey));

function hasReadyRecord(key: string) {
  return readyRecordKeys.has(key);
}

function recordByKey(key: string) {
  return records.find((record) => record.canonicalKey === key);
}

function isReviewedClauseStatus(value: unknown) {
  return typeof value === "string" && /^(reviewed|approved|published)$/iu.test(value);
}

type SourceGroundedClause = NonNullable<SourceGroundedRecord["clauses"]>[string];

function hasSafeReviewedClauseText(clause: SourceGroundedClause) {
  const textValues = [clause.text_you, clause.text_they]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return textValues.length > 0 && textValues.every(isReaderFacingCopy);
}

function hasEligibleReviewedRecord(key: string) {
  const record = recordByKey(key);
  if (!record || record.validation?.state !== "READY") return false;
  const clauses = Object.values(record.clauses ?? {});
  if (clauses.length === 0) return false;

  return clauses.every((clause) => (
    isReviewedClauseStatus(clause.review_status)
    && Array.isArray(clause.source_keys)
    && clause.source_keys.some((sourceKey) => /^cc\/|^ms\//u.test(sourceKey))
    && hasSafeReviewedClauseText(clause)
  ));
}

function hasSourceGap(key: string) {
  return sourceGapKeys.has(key);
}

function natalPlacementBaseRecordId(position: Pick<PlanetPosition, "planet" | "sign">) {
  return `dashboard.natal-placement.${recordKeyPart(position.planet)}.${recordKeyPart(position.sign)}`;
}

function supportedNatalPlacementKey(position: PlanetPosition, reliableBirthTime = true) {
  const houseKey = reliableBirthTime && position.house ? natalPlacementRecordId(position) : "";
  if (houseKey && hasReadyRecord(houseKey)) return houseKey;

  const baseKey = natalPlacementBaseRecordId(position);
  if (hasSourceGap(baseKey)) return baseKey;

  if (!reliableBirthTime) {
    const anyHouseRecord = records.find((record) => (
      record.family === "natal-placement"
      && record.canonicalKey.startsWith(`${baseKey}.house_`)
      && record.validation?.state === "READY"
    ));
    return anyHouseRecord?.canonicalKey ?? "";
  }

  return houseKey || baseKey;
}

function chartSectFromNatalSky(natalSky: SkySnapshot | null) {
  const sun = natalSky?.positions.find((position) => position.planet === "Sun");
  if (!sun?.house) return null;
  return sun.house >= 7 && sun.house <= 12 ? "day" : "night";
}

function paragraphLines(value: string | undefined) {
  return String(value ?? "")
    .split(/\n{2,}/u)
    .map((line) => line.trim())
    .filter(Boolean);
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

function natalPlacementTitleAliases(position: PlanetPosition) {
  return [
    `${position.planet} in ${position.sign}`,
    position.house ? `${position.planet} in ${position.sign} in the ${ordinal(position.house)} house` : "",
    position.motion === "retrograde" ? `${position.planet} Rx in ${position.sign}` : "",
    position.motion === "retrograde" && position.house ? `${position.planet} Rx in ${position.sign} in the ${ordinal(position.house)} house` : ""
  ].filter((alias): alias is string => Boolean(alias));
}

function decodeReaderEntities(value: string) {
  return value
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, "\"")
    .replace(/&#39;/gu, "'");
}

function comparableArticleText(value: string) {
  return decodeReaderEntities(value)
    .toLowerCase()
    .replace(/[–—]/gu, "-")
    .replace(/\s+-\s+/gu, " - ")
    .replace(/[^a-z0-9°' -]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitArticleClauses(value: string | undefined) {
  return paragraphLines(value).flatMap((paragraph) => (
    paragraph
      .split(/\n+/u)
      .map((line) => decodeReaderEntities(line).replace(/\s+/gu, " ").trim())
      .filter(Boolean)
  ));
}

function hasTerminalPunctuation(value: string) {
  return /[.!?]$/u.test(value.trim());
}

function wordCount(value: string) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function isReaderDebugClause(value: string) {
  return /\b(?:calculated timing|calculated retrograde passage phase|this is the calculated|selected template|source gap|fallback|reviewed record|hydrated|slot|record id|sourceSnapshot|templateVersion|included only as a calculated condition|read that through|Use the most concrete part of that signal|before treating the whole season as a verdict)\b/iu.test(value);
}

function normalizeArticleSentence(value: string) {
  const trimmed = decodeReaderEntities(value).replace(/\s+/gu, " ").trim();
  if (!trimmed) return "";

  const firstAlpha = trimmed.search(/[A-Za-z]/u);
  const cased = firstAlpha >= 0
    ? `${trimmed.slice(0, firstAlpha)}${trimmed.charAt(firstAlpha).toUpperCase()}${trimmed.slice(firstAlpha + 1)}`
    : trimmed;

  if (hasTerminalPunctuation(cased)) return cased;
  if (wordCount(cased) <= 4) return "";
  return `${cased}.`;
}

function detailBodyOnly(value: string | undefined, title: string, timing?: string | null, aliases: string[] = []) {
  const metadataValues = [title, timing, ...aliases]
    .filter((item): item is string => Boolean(item?.trim()))
    .map(comparableArticleText);
  const metadataSet = new Set(metadataValues);
  const [normalizedTitle, normalizedTiming] = metadataValues;
  const clauses: string[] = [];
  const seen = new Set<string>();

  for (const rawClause of splitArticleClauses(value)) {
    const normalized = comparableArticleText(rawClause);
    if (!normalized) continue;
    if (metadataSet.has(normalized)) continue;
    if (normalizedTitle && normalizedTiming && normalized === `${normalizedTitle} ${normalizedTiming}`) continue;
    if (normalizedTitle && normalized.startsWith(`${normalizedTitle} `) && normalizedTiming && normalized.endsWith(` ${normalizedTiming}`)) continue;
    if (isReaderDebugClause(rawClause)) continue;
    if (!isReaderFacingCopy(rawClause)) continue;
    if (!hasTerminalPunctuation(rawClause) && wordCount(rawClause) <= 4) continue;
    if (seen.has(normalized)) continue;

    const sentence = normalizeArticleSentence(rawClause);
    if (!sentence) continue;
    clauses.push(sentence);
    seen.add(normalized);
  }

  if (clauses.length === 0) return [];

  const body = clauses.slice(0, 3).join(" ").replace(/\s+/gu, " ").trim();
  const timingContext = clauses.slice(3).join(" ").replace(/\s+/gu, " ").trim();

  return [body, timingContext].filter(Boolean).slice(0, 2);
}

function escapeRegExpForRuntime(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const skyPlacementTopicByBody: Record<string, string> = {
  sun: "visibility, purpose, and what needs conscious attention",
  moon: "mood, instinct, belonging, and the need for emotional safety",
  mercury: "messages, decisions, timing, and the way information is handled",
  venus: "care, preference, money, and the terms of affection",
  mars: "action, friction, courage, and the way effort gets spent",
  jupiter: "growth, permission, appetite, and the places that want more room",
  saturn: "limits, responsibility, patience, and what needs structure",
  uranus: "change, disruption, invention, and the need for more freedom",
  neptune: "sensitivity, imagination, uncertainty, and what needs clearer edges",
  pluto: "power, pressure, release, and what needs to transform",
  chiron: "old pain, repair, and the wisdom that comes from tending what hurts",
  lilith: "raw truth, refusal, and the parts of the story that will not be tamed",
  "north node": "growth, appetite, and the unfamiliar direction asking for courage",
  "south node": "old habit, release, and the familiar pattern that does not need to lead"
};

const skyPlacementToneBySign: Record<string, string> = {
  aries: "directness, urgency, and the courage to begin",
  taurus: "steadiness, resources, and the body-level need for security",
  gemini: "questions, exchanges, and the movement of information",
  cancer: "memory, care, home, and emotional protection",
  leo: "visibility, warmth, and the need to be recognized",
  virgo: "discernment, repair, usefulness, and practical adjustment",
  libra: "balance, agreement, fairness, and the quality of the exchange",
  scorpio: "depth, privacy, trust, and what needs to be faced honestly",
  sagittarius: "belief, distance, meaning, and the need for a larger view",
  capricorn: "responsibility, consequence, structure, and long-term judgment",
  aquarius: "community, difference, systems, and a more future-facing response",
  pisces: "sensitivity, release, imagination, and the need for softer boundaries"
};

function normalizedSkyLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function safeSkyPlacementFallbackSummary(position: PlanetPosition) {
  const bodyTopic = skyPlacementTopicByBody[normalizedSkyLookupKey(position.planet)] ?? "the main theme of this transit";
  const signTone = skyPlacementToneBySign[normalizedSkyLookupKey(position.sign)] ?? `${position.sign} tone`;
  const summary = `This sky placement brings ${bodyTopic} into ${signTone}.`;
  return isReaderFacingCopy(summary) ? summary : "";
}

function safeSkyPlacementFallbackParagraphs(position: PlanetPosition) {
  const bodyTopic = skyPlacementTopicByBody[normalizedSkyLookupKey(position.planet)] ?? "the main theme of this transit";
  const signTone = skyPlacementToneBySign[normalizedSkyLookupKey(position.sign)] ?? `${position.sign} tone`;
  const paragraph = `This sky placement brings ${bodyTopic} into ${signTone}. Notice what needs care, what needs a boundary, and what can wait.`;
  return isReaderFacingCopy(paragraph) ? [paragraph] : [];
}

function sourceGapComposition({
  finalCopy,
  recordId,
  sections,
  sourceKeys,
  templateId
}: {
  finalCopy: string;
  recordId: string;
  sections: SourceGroundedSection[];
  sourceKeys: string[];
  templateId: string;
}): SourceGroundedComposition {
  return {
    templateId,
    templateVersion: SOURCE_GROUNDED_V2_TEMPLATE_VERSION,
    recordId,
    slots: {
      approvedFallback: {
        text: finalCopy,
        sourceKeys
      }
    },
    sourceKeys,
    finalCopy,
    sections,
    conditionalBranches: ["SOURCE_GAP", "approved-fallback"],
    sourceRoles: {
      supportingSourceKeys: sourceKeys,
      calculatedFactKeys: []
    },
    provenance: {
      initial: `source-grounded-v2:${recordId}`,
      hydrated: `source-grounded-v2:${recordId}`
    }
  };
}

export function sourceGroundedNatalPlacementSections({
  dignityLabel,
  natalSky,
  ownerPerspective,
  position,
  aspects,
  reliableBirthTime = true
}: {
  aspects?: AspectFact[];
  dignityLabel?: string | null;
  natalSky: SkySnapshot | null;
  ownerPerspective: OwnerPerspective;
  position: PlanetPosition;
  reliableBirthTime?: boolean;
}): SourceGroundedSection[] {
  const pointName = String(position.planet ?? "").toLowerCase();
  const isAnglePoint = ["ascendant", "descendant", "midheaven", "imum coeli", "ic", "mc"].includes(pointName);
  if (isAnglePoint) return [];

  const supportedKey = supportedNatalPlacementKey(position, reliableBirthTime);
  const result = resolveSourceGroundedV2("me.natal_placement", {
    natalBody: position.planet,
    natalSign: position.sign,
    natalHouse: reliableBirthTime ? position.house : null,
    degree: position.degree ? `${position.degree}°` : "",
    ownerPerspective,
    sect: reliableBirthTime ? chartSectFromNatalSky(natalSky) : "",
    reliableBirthTime,
    ...(supportedKey ? { sourceRecordKey: supportedKey } : {})
  });
  const body = detailBodyOnly(
    result.expandedCopy ?? result.finalVisibleStrings.join("\n\n"),
    `${position.planet} in ${position.sign}`,
    "",
    natalPlacementTitleAliases(position)
  );
  return body.length > 0
    ? [{
        heading: "Placement story",
        tldr: "",
        body: body.join("\n\n")
      }]
    : [];
}

export function sourceGroundedSkyPlacementParagraphs(position: PlanetPosition, duration?: string | null) {
  const result = resolveSourceGroundedV2("sky.planet_sign", {
    currentBody: position.planet,
    currentSign: position.sign,
    motion: position.motion,
    activeWindow: duration
  });
  const paragraphs = detailBodyOnly(
    result.expandedCopy ?? result.finalVisibleStrings.join("\n\n"),
    `${position.planet} in ${position.sign}`,
    duration
  );
  return paragraphs.length > 0
    ? paragraphs
    : safeSkyPlacementFallbackParagraphs(position);
}

export function sourceGroundedSkyPlacementSummary(position: PlanetPosition) {
  const result = resolveSourceGroundedV2("sky.planet_sign", {
    currentBody: position.planet,
    currentSign: position.sign,
    motion: position.motion
  }, "card");
  const summary = result.compactCopy ?? result.renderedFields.compactSummary ?? "";
  const titlePattern = new RegExp(`^${escapeRegExpForRuntime(`${position.planet} in ${position.sign}`)}\\b:?\\s*`, "i");
  if (summary.trim() && isReaderFacingCopy(summary) && !titlePattern.test(summary.trim())) {
    return summary;
  }
  return safeSkyPlacementFallbackSummary(position);
}

export function sourceGroundedNatalAspectComposition(aspect: AspectFact, ownerPerspective: OwnerPerspective): SourceGroundedComposition | null {
  const key = `dashboard.natal-aspect.${recordKeyPart(aspect.focalPlanet)}.${recordKeyPart(aspect.aspect)}.${recordKeyPart(aspect.otherPlanet)}`;
  if (!hasEligibleReviewedRecord(key)) return null;
  return composeNatalAspect(aspect, ownerPerspective);
}

export function sourceGroundedSkyAspectParagraphs(aspect: AspectFact & { timing?: string | null }) {
  const title = `${aspect.focalPlanet} ${aspect.aspect} ${aspect.otherPlanet}`;
  const result = resolveSourceGroundedV2("sky.aspect", {
    pointA: aspect.focalPlanet,
    aspect: aspect.aspect,
    pointB: aspect.otherPlanet,
    activeWindow: aspect.timing,
    exactDate: aspect.timing,
    orb: aspect.orb
  });
  return detailBodyOnly(result.expandedCopy ?? result.finalVisibleStrings.join("\n\n"), title, aspect.timing);
}

export function sourceGroundedSkyAspectSummary(aspect: AspectFact) {
  const result = resolveSourceGroundedV2("sky.aspect", {
    pointA: aspect.focalPlanet,
    aspect: aspect.aspect,
    pointB: aspect.otherPlanet,
    activeWindow: "",
    orb: aspect.orb
  }, "card");
  return result.compactCopy ?? result.renderedFields.compactSummary ?? "";
}

export function sourceGroundedPersonalTransitComposition(fact: {
  activeWindow: string;
  aspect: string;
  exactAt?: string | null;
  natalHouse?: number | null;
  natalPoint: string;
  natalSign?: string | null;
  orb?: string | null;
  pass?: string | null;
  phase?: string | null;
  term: "short" | "long";
  transitingPlanet: string;
}): SourceGroundedComposition | null {
  const key = `dashboard.personalized-transit.${recordKeyPart(fact.transitingPlanet)}.${recordKeyPart(fact.aspect)}.${recordKeyPart(fact.natalPoint)}`;
  if (!hasEligibleReviewedRecord(key)) {
    const result = resolveSourceGroundedV2("transits.personalized", {
      activeWindow: fact.activeWindow,
      aspect: fact.aspect,
      exactDate: fact.exactAt,
      natalHouse: fact.natalHouse,
      natalPoint: fact.natalPoint,
      natalSign: fact.natalSign,
      orb: fact.orb,
      passLabel: fact.pass,
      phase: fact.phase,
      transitingPoint: fact.transitingPlanet
    });
    const finalCopy = result.expandedCopy ?? result.finalVisibleStrings.join("\n\n");
    return sourceGapComposition({
      finalCopy,
      recordId: result.recordId,
      sections: [{
        heading: result.renderedFields.factualEventTitle || `${fact.transitingPlanet} ${fact.aspect} ${fact.natalPoint}`,
        tldr: result.renderedFields.timingDisplay || fact.activeWindow,
        body: finalCopy
      }],
      sourceKeys: result.supportingSourceKeys,
      templateId: result.templateId
    });
  }
  return composePersonalTransit(fact);
}
