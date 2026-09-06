import southNodeAuthorization from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/owner-batch-authorization.json";
import southNodeChiron from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/chiron.json";
import southNodeJupiter from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/jupiter.json";
import southNodeLilith from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/lilith.json";
import southNodeMars from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/mars.json";
import southNodeMercury from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/mercury.json";
import southNodeMoon from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/moon.json";
import southNodeNeptune from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/neptune.json";
import southNodePluto from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/pluto.json";
import southNodeSaturn from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/saturn.json";
import southNodeSun from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/sun.json";
import southNodeUranus from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/uranus.json";
import southNodeVenus from "../../../../packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/venus.json";
import type {
  ApprovedExactSkyAspectCopy,
  ResolvedSkyCalendarComposedCard
} from "../content/domainRegistry";
import { isReaderFacingCopy } from "../content/readerSafety";
import {
  interpolateTemplateString,
  type TemplateSlotValues
} from "./templateInterpolation";

export type ApprovedExactSkyAspectLookup = (
  planetA: string,
  aspect: string,
  planetB: string
) => ApprovedExactSkyAspectCopy | null;

export type ResolvedApprovedExactSkyAspectCopy = {
  body: string;
  heading: string;
  layer: "authored";
  sourceKeys: string[];
  tier: "approved-exact-sky-aspect-v1";
};

type SouthNodeReviewRecord = {
  aspect: string;
  body: string;
  contentKey: string;
  mirroredNorthNodeAspect: string;
  summary: string;
};

type SouthNodeReviewPacket = {
  counterpartBody: string;
  records: SouthNodeReviewRecord[];
};

type SouthNodeApprovedCopy = {
  record: SouthNodeReviewRecord;
  sourcePath: string;
};

const southNodePacketSources: Array<{ packet: SouthNodeReviewPacket; sourcePath: string }> = [
  { packet: southNodeSun, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/sun.json" },
  { packet: southNodeMoon, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/moon.json" },
  { packet: southNodeMercury, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/mercury.json" },
  { packet: southNodeVenus, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/venus.json" },
  { packet: southNodeMars, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/mars.json" },
  { packet: southNodeJupiter, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/jupiter.json" },
  { packet: southNodeSaturn, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/saturn.json" },
  { packet: southNodeUranus, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/uranus.json" },
  { packet: southNodeNeptune, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/neptune.json" },
  { packet: southNodePluto, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/pluto.json" },
  { packet: southNodeChiron, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/chiron.json" },
  { packet: southNodeLilith, sourcePath: "packages/astro-knowledge/review/sky-calendar-south-node-60-v1/records/lilith.json" }
];

const northToSouthAspect: Record<string, string> = {
  conjunction: "opposition",
  sextile: "trine",
  square: "square",
  trine: "sextile",
  opposition: "conjunction"
};

function normalizedPoint(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function southNodeCopyKey(counterpart: string, aspect: string) {
  return `sky.aspect.${normalizedPoint(counterpart)}.${aspect.trim().toLowerCase()}.south-node`;
}

function buildSouthNodeApprovedCopy() {
  const authorized = southNodeAuthorization.decision === "approve"
    && southNodeAuthorization.memberCount === 60
    && southNodeAuthorization.approvalEffect === "exact_wording_approval";

  if (!authorized) return new Map<string, SouthNodeApprovedCopy>();

  const entries = southNodePacketSources.flatMap(({ packet, sourcePath }) => (
    packet.records.map((record) => [record.contentKey, { record, sourcePath }] as const)
  ));

  if (entries.length !== 60 || new Set(entries.map(([key]) => key)).size !== 60) {
    return new Map<string, SouthNodeApprovedCopy>();
  }

  return new Map<string, SouthNodeApprovedCopy>(entries);
}

const southNodeApprovedCopyByKey = buildSouthNodeApprovedCopy();

export function approvedSouthNodeExactCopyCount() {
  return southNodeApprovedCopyByKey.size;
}

function southNodeApprovedCopyFor(counterpart: string, aspect: string) {
  return southNodeApprovedCopyByKey.get(southNodeCopyKey(counterpart, aspect)) ?? null;
}

function southNodeCounterpart(first: string, second: string, node: "north-node" | "south-node") {
  const normalizedFirst = normalizedPoint(first);
  const normalizedSecond = normalizedPoint(second);

  if (normalizedFirst === node && normalizedSecond !== "north-node" && normalizedSecond !== "south-node") {
    return normalizedSecond;
  }
  if (normalizedSecond === node && normalizedFirst !== "north-node" && normalizedFirst !== "south-node") {
    return normalizedFirst;
  }

  return null;
}

function renderedSouthNodeBody(copy: SouthNodeApprovedCopy, slots: TemplateSlotValues) {
  return interpolateTemplateString(copy.record.body, slots, {
    contentKey: copy.record.contentKey,
    field: "body"
  })
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");
}

const calendarAspectLeadVerb: Record<string, string> = {
  conjunction: "conjoins",
  opposition: "opposes",
  quincunx: "quincunxes",
  sextile: "sextiles",
  square: "squares",
  trine: "trines"
};

function lowerSentenceStart(value: string) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function calendarExactLeadIn(
  body: string,
  aspect: string,
  slots: TemplateSlotValues
) {
  const dateLine = String(slots.dateLine ?? "").trim();
  const planetA = String(slots.planetA ?? "").trim();
  const planetB = String(slots.planetB ?? "").trim();
  const signA = String(slots.signA ?? "").trim();
  const signB = String(slots.signB ?? "").trim();
  const aspectVerb = calendarAspectLeadVerb[aspect.trim().toLowerCase()] ?? "";

  if (!dateLine || !planetA || !planetB || !signA || !signB || !aspectVerb) {
    return null;
  }

  return `${dateLine}, ${planetA} in ${signA} ${aspectVerb} ${planetB} in ${signB}, and on a collective level, ${lowerSentenceStart(body)}`;
}

export type SkyCalendarComposedCardLookup = (
  planetA: string,
  signA: string,
  aspect: string,
  planetB: string,
  signB: string
) => ResolvedSkyCalendarComposedCard | null;

export type ResolvedComposedSkyCalendarCard = {
  body: string;
  details: string;
  heading: string;
  layer: "authored";
  sourceKeys: string[];
  tier: "composed-sky-calendar-card-v1";
};

export function resolveComposedSkyCalendarCard({
  aspect,
  first,
  heading,
  lookup,
  second,
  slots
}: {
  aspect: string;
  first: string;
  heading: string;
  lookup?: SkyCalendarComposedCardLookup | null;
  second: string;
  slots: TemplateSlotValues;
}): ResolvedComposedSkyCalendarCard | null {
  const signA = String(slots.signA ?? "").trim();
  const signB = String(slots.signB ?? "").trim();

  if (!signA || !signB) {
    return null;
  }

  const card = lookup?.(first, signA, aspect, second, signB);

  if (!card) {
    return null;
  }

  // The stored forecast begins lowercase and the Calendar composes the date
  // lead-in. Without a date line there is nothing to lead with, so the card
  // stays unserved rather than rendering a fragment.
  const dateLine = String(slots.dateLine ?? "").trim();

  if (!dateLine) {
    return null;
  }

  const body = `${dateLine}, ${lowerSentenceStart(card.forecast)}`;

  if (!isReaderFacingCopy(body) || !isReaderFacingCopy(card.details)) {
    return null;
  }

  return {
    body,
    details: card.details,
    heading,
    layer: "authored",
    sourceKeys: [
      card.contentId,
      "packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json"
    ],
    tier: "composed-sky-calendar-card-v1"
  };
}

type SkyAspectPrecedenceCandidates<T> = {
  composed?: T | null;
  signSpecific?: T | null;
  exact?: T | null;
  phrasebook?: T | null;
  generated?: T | null;
  fallback?: T | null;
};

export function selectSkyAspectCopyByPrecedence<T>({
  composed,
  signSpecific,
  exact,
  phrasebook,
  generated,
  fallback
}: SkyAspectPrecedenceCandidates<T>): T | null {
  return composed ?? exact ?? signSpecific ?? phrasebook ?? generated ?? fallback ?? null;
}

export function resolveApprovedExactSkyAspectCopy({
  aspect,
  first,
  heading,
  lookup,
  second,
  slots
}: {
  aspect: string;
  first: string;
  heading: string;
  lookup?: ApprovedExactSkyAspectLookup | null;
  second: string;
  slots: TemplateSlotValues;
}): ResolvedApprovedExactSkyAspectCopy | null {
  const normalizedAspect = aspect.trim().toLowerCase();
  const directSouthCounterpart = southNodeCounterpart(first, second, "south-node");
  const northCounterpart = southNodeCounterpart(first, second, "north-node");
  const directSouthCopy = directSouthCounterpart
    ? southNodeApprovedCopyFor(directSouthCounterpart, normalizedAspect)
    : null;
  const mirroredSouthCopy = northCounterpart && northToSouthAspect[normalizedAspect]
    ? southNodeApprovedCopyFor(northCounterpart, northToSouthAspect[normalizedAspect])
    : null;
  const copy = lookup?.(first, aspect, second) ?? null;

  if (!copy && !directSouthCopy && !mirroredSouthCopy) {
    return null;
  }

  let body = "";
  const sourceKeys: string[] = [];

  if (copy) {
    const storedBody = interpolateTemplateString(copy.body, slots, {
      contentKey: copy.contentId,
      field: "body"
    })
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .join("\n\n");
    body = copy.calendarLeadIn === "date-placements-collective-level"
      && slots.dateLine
      ? calendarExactLeadIn(storedBody, aspect, slots) ?? ""
      : storedBody;
    sourceKeys.push(copy.contentId, `packages/astro-knowledge/data/transits/${copy.sourceId}.json`);
  }

  if (directSouthCopy) {
    const southBody = renderedSouthNodeBody(directSouthCopy, slots);
    body = southBody;
    sourceKeys.push(directSouthCopy.record.contentKey, directSouthCopy.sourcePath);
  } else if (mirroredSouthCopy) {
    const southBody = renderedSouthNodeBody(mirroredSouthCopy, slots);
    if (southBody) {
      body = body
        ? `${body}\n\nSouth Node (${mirroredSouthCopy.record.aspect}): ${southBody}`
        : `South Node (${mirroredSouthCopy.record.aspect}): ${southBody}`;
      sourceKeys.push(mirroredSouthCopy.record.contentKey, mirroredSouthCopy.sourcePath);
    }
  }

  if (!body || !isReaderFacingCopy(body)) {
    return null;
  }

  return {
    body,
    heading,
    layer: "authored",
    sourceKeys,
    tier: "approved-exact-sky-aspect-v1"
  };
}
