import astro2026Catalog from "./data/astro-2026.catalog.json" with { type: "json" };
import astro2027KeySelections from "./data/astro-2027-key-selections.json" with { type: "json" };
import {
  LUNAR_JOURNAL_INDEX,
  type LunarJournalType
} from "./lunarJournalKeys.js";

export type HandoffEventKind =
  | "lunation"
  | "eclipse"
  | "moon"
  | "ingress"
  | "station"
  | "aspect"
  | "key"
  | "affirmation"
  | "other";

export type HandoffEvent = {
  i: number;
  date: string;
  time: string;
  title: string;
  kind: HandoffEventKind;
  article?: string;
  articleTitle?: string;
  readTime?: string;
};

export type HandoffJournalType = LunarJournalType;

export type HandoffJournalIndexEntry = {
  start: string;
  end: string;
  type: HandoffJournalType;
  sign: string;
  title: string;
  contentKey?: string;
};

export type LunarJournalBlockType =
  | "para"
  | "heading"
  | "cycle"
  | "notice"
  | "section"
  | "bullets"
  | "ritual"
  | "intent"
  | "callin"
  | "prompt"
  | "tarot"
  | "times"
  | "exact"
  | "bysign";

export const ASTRO_2026_EVENTS = astro2026Catalog as HandoffEvent[];
export { LUNAR_JOURNAL_INDEX };

export function handoffEventsOnDate(dateKey: string) {
  return ASTRO_2026_EVENTS.filter((event) => event.date === dateKey);
}

export function compactHandoffTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[⭐★💗]/g, " ")
    .replace(/\bkey astro for (?:success|love):\s*/g, "")
    .replace(/^the\s+/i, "")
    .replace(/\brx\b/g, "")
    .replace(/s\b/g, "")
    .replace(/[^a-z]/g, "");
}

export function isHandoffKeyEvent(event: { title: string; dateKey?: string; startsAt?: string }, dateKey?: string) {
  const compact = compactHandoffTitle(event.title);
  // Editorial dates select an already calculated event; they never supply its
  // facts. UTC identity keeps a highlight stable across subscriber time zones.
  if (event.startsAt && Number.isFinite(Date.parse(event.startsAt))) {
    const dateUTC = new Date(event.startsAt).toISOString().slice(0, 10);
    if (astro2027KeySelections.some(item => item.dateUTC === dateUTC && compactHandoffTitle(item.title) === compact)) return true;
  }
  const day = dateKey ?? event.dateKey;
  if (!day) return false;
  return ASTRO_2026_EVENTS.some((item) => (
    item.date === day
    && item.kind === "key"
    && compactHandoffTitle(item.title) === compact
  ));
}

export function handoffArticleForTitle(title: string) {
  const match = ASTRO_2026_EVENTS.find((event) => event.title === title && event.article) ?? null;
  if (!match?.article) return null;
  try {
    const host = new URL(match.article).hostname.replace(/^www\./, "");
    if (host === "tldrastro.com" || host.endsWith(".tldrastro.com")) return match;
  } catch {
    return null;
  }
  return null;
}

export function matchJournalIndex(type: HandoffJournalType, sign: string) {
  return LUNAR_JOURNAL_INDEX.find((entry) => entry.type === type && entry.sign === sign) ?? null;
}
