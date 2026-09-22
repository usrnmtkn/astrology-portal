import { natalPlacementSigns } from "./natalPlacementSources.ts";
import type { AdminDraft } from "./GeneratedContentAdminDashboard";

export const calendarAspectDefaultBodies = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith",
  "north-node",
  "south-node"
] as const;

export const calendarAspectDefaultTypes = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition"
] as const;

const calendarAspectTypes = [
  "conjunction",
  "opposition",
  "sesquiquadrate",
  "semisquare",
  "semisextile",
  "biquintile",
  "quincunx",
  "quintile",
  "sextile",
  "square",
  "trine"
] as const;

const aspectSearchAliases: Record<string, string> = {
  squares: "square",
  squared: "square",
  conjunct: "conjunction",
  conjuncts: "conjunction",
  conjunctions: "conjunction",
  opposes: "opposition",
  opposed: "opposition",
  oppositions: "opposition",
  trines: "trine",
  sextiles: "sextile"
};

const ignoredCalendarSearchTokens = new Set([
  "rx",
  "retrograde",
  "direct",
  "station",
  "stationary"
]);

const calendarAspectSigns = new Set<string>(natalPlacementSigns);

export type CalendarAspectSelection = {
  first: string;
  firstSign?: string;
  aspect: string;
  second: string;
  secondSign?: string;
};

export type CalendarAspectSourceRow = {
  content_key: string;
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isCalendarAspectType(value: string): value is (typeof calendarAspectTypes)[number] {
  return (calendarAspectTypes as readonly string[]).includes(value);
}

export function parseCalendarAspectContentKey(contentKey: string): CalendarAspectSelection | null {
  if (contentKey.startsWith("sky.aspect.")) {
    const parts = contentKey.slice("sky.aspect.".length).split(".");
    if (parts.length < 3 || !isCalendarAspectType(parts[1]) || !parts[0] || !parts[2]) return null;
    return {
      first: parts[0], aspect: parts[1], second: parts[2],
      // Legacy dated keys have a date here, rather than placement signs.
      ...(calendarAspectSigns.has(parts[3]) && calendarAspectSigns.has(parts[4])
        ? { firstSign: parts[3], secondSign: parts[4] } : {})
    };
  }

  const slashPrefix = contentKey.startsWith("sky-card/")
    ? "sky-card/"
    : contentKey.startsWith("fallback-hook/sky-aspect-sign/")
      ? "fallback-hook/sky-aspect-sign/"
      : null;
  if (!slashPrefix) return null;

  const parts = contentKey.slice(slashPrefix.length).split("/");
  if (parts.length < 5 || !isCalendarAspectType(parts[2]) || !parts[0] || !parts[3]
    || !calendarAspectSigns.has(parts[1]) || !calendarAspectSigns.has(parts[4])) return null;
  return { first: parts[0], firstSign: parts[1], aspect: parts[2], second: parts[3], secondSign: parts[4] };
}

export function calendarAspectDisplayTitle(selection: CalendarAspectSelection) {
  const first = `${titleCase(selection.first)}${selection.firstSign ? ` in ${titleCase(selection.firstSign)}` : ""}`;
  const second = `${titleCase(selection.second)}${selection.secondSign ? ` in ${titleCase(selection.secondSign)}` : ""}`;
  return `${first} ${titleCase(selection.aspect)} ${second}`;
}

/** Use the saved identity even when a five-value row still has a generic headline. */
export function calendarAspectSignedTitle(contentKey: string) {
  const selection = parseCalendarAspectContentKey(contentKey);
  return selection && (selection.firstSign || selection.secondSign)
    ? calendarAspectDisplayTitle(selection) : null;
}

/** Creation needs an exact identity; the independent browsing filters do not. */
export function calendarAspectDraft(selection: CalendarAspectSelection): AdminDraft | null {
  const bodies: readonly string[] = [...calendarAspectDefaultBodies, "nodes"];
  if (!bodies.includes(selection.first) || !bodies.includes(selection.second)
    || selection.first === selection.second || ![...calendarAspectDefaultTypes, "quincunx"].includes(selection.aspect)
    || !calendarAspectSigns.has(selection.firstSign ?? "") || !calendarAspectSigns.has(selection.secondSign ?? "")) return null;
  const isNodePole = (body: string) => body === "north-node" || body === "south-node";
  if ((isNodePole(selection.first) || selection.first === "nodes") && (isNodePole(selection.second) || selection.second === "nodes")) return null;
  const order = (body: string) => isNodePole(body) ? -1 : bodies.indexOf(body);
  const identity = order(selection.first) <= order(selection.second) ? selection : {
    first: selection.second, firstSign: selection.secondSign, aspect: selection.aspect,
    second: selection.first, secondSign: selection.firstSign
  };
  return {
    id: null,
    contentKey: `sky.aspect.${identity.first}.${identity.aspect}.${identity.second}.${identity.firstSign}.${identity.secondSign}`,
    surface: "sky", mode: "feed", status: "DRAFT",
    headline: calendarAspectDisplayTitle(identity), summary: "", body: "",
    lane: "serving", reviewState: "EDITORIAL_REVIEW_REQUIRED", blockType: "sky_aspect",
    promptVersion: "manual-admin", sections: null,
    facts: { a: identity.first, signA: identity.firstSign, aspect: identity.aspect, b: identity.second, signB: identity.secondSign },
    reviewerNotes: "",
    sourceSnapshot: { contentType: "owner-authored-sky-aspect", content_role: "authored_card",
      review_status: "needs_review", authoringSource: "admin-dashboard-calendar-aspect" }
  };
}

export function calendarAspectIdentityKeys(selection: CalendarAspectSelection) {
  const reverse = { first: selection.second, firstSign: selection.secondSign, aspect: selection.aspect,
    second: selection.first, secondSign: selection.firstSign };
  return [selection, reverse].flatMap(({ first, firstSign, aspect, second, secondSign }) => [
    `sky.aspect.${first}.${aspect}.${second}.${firstSign}.${secondSign}`,
    `sky-card/${first}/${firstSign}/${aspect}/${second}/${secondSign}`,
    `fallback-hook/sky-aspect-sign/${first}/${firstSign}/${aspect}/${second}/${secondSign}`
  ]);
}

export function normalizeCalendarAspectSearch(search: string) {
  return search
    .trim()
    .toLowerCase()
    .replace(/[-_/.:,"{}[\]]+/g, " ")
    .split(/\s+/u)
    .filter(Boolean)
    .map((token) => aspectSearchAliases[token] ?? token)
    .filter((token) => !ignoredCalendarSearchTokens.has(token))
    .join(" ");
}

export function calendarAspectSearchMatches(haystack: string, search: string) {
  const tokens = normalizeCalendarAspectSearch(search).split(/\s+/u).filter(Boolean);
  if (tokens.length === 0) return true;
  const normalizedHaystack = haystack.toLowerCase().replace(/[-_/.:,"{}[\]]+/g, " ");
  return tokens.every((token) => normalizedHaystack.includes(token));
}

export function calendarAspectSelectionOptions(rows: CalendarAspectSourceRow[]) {
  const parsed = rows
    .map((row) => parseCalendarAspectContentKey(row.content_key))
    .filter((selection): selection is CalendarAspectSelection => Boolean(selection));
  const bodies = [...new Set([
    ...calendarAspectDefaultBodies,
    ...parsed.flatMap((selection) => [selection.first, selection.second])
  ])].sort();
  const aspects = [...new Set([
    ...calendarAspectDefaultTypes,
    ...parsed.map((selection) => selection.aspect)
  ])].sort();
  return { first: bodies, aspects, second: bodies };
}

export function calendarAspectMatchesSelection(
  row: CalendarAspectSourceRow,
  selection: Partial<CalendarAspectSelection>
) {
  if (!selection.first && !selection.firstSign && !selection.aspect && !selection.second && !selection.secondSign) return true;
  const parsed = parseCalendarAspectContentKey(row.content_key);
  if (!parsed) return false;
  if (selection.aspect && parsed.aspect !== selection.aspect) return false;
  // Reverse whole placements together so a sign never matches the other planet.
  const matchesPlacement = (body: string, sign: string | undefined, selectedBody?: string, selectedSign?: string) =>
    (!selectedBody || body === selectedBody) && (!selectedSign || sign === selectedSign);
  return (matchesPlacement(parsed.first, parsed.firstSign, selection.first, selection.firstSign)
      && matchesPlacement(parsed.second, parsed.secondSign, selection.second, selection.secondSign))
    || (matchesPlacement(parsed.second, parsed.secondSign, selection.first, selection.firstSign)
      && matchesPlacement(parsed.first, parsed.firstSign, selection.second, selection.secondSign));
}
