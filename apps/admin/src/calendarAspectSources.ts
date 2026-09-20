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

export type CalendarAspectSelection = {
  first: string;
  aspect: string;
  second: string;
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
    return { first: parts[0], aspect: parts[1], second: parts[2] };
  }

  const slashPrefix = contentKey.startsWith("sky-card/")
    ? "sky-card/"
    : contentKey.startsWith("fallback-hook/sky-aspect-sign/")
      ? "fallback-hook/sky-aspect-sign/"
      : null;
  if (!slashPrefix) return null;

  const parts = contentKey.slice(slashPrefix.length).split("/");
  if (parts.length < 5 || !isCalendarAspectType(parts[2]) || !parts[0] || !parts[3]) return null;
  return { first: parts[0], aspect: parts[2], second: parts[3] };
}

export function calendarAspectDisplayTitle(selection: CalendarAspectSelection) {
  return `${titleCase(selection.first)} ${titleCase(selection.aspect)} ${titleCase(selection.second)}`;
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
  if (!selection.first && !selection.aspect && !selection.second) return true;
  const parsed = parseCalendarAspectContentKey(row.content_key);
  if (!parsed) return false;
  if (selection.aspect && parsed.aspect !== selection.aspect) return false;
  if (selection.first && selection.second) {
    return (parsed.first === selection.first && parsed.second === selection.second)
      || (parsed.first === selection.second && parsed.second === selection.first);
  }
  const selectedBody = selection.first || selection.second;
  return !selectedBody || parsed.first === selectedBody || parsed.second === selectedBody;
}
