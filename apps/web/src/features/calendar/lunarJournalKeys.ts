import type { LunarCalendarEvent } from "../../services/ephemeris";
import lunarJournalIndex from "./data/lunar-journal.index.json" with { type: "json" };

export const LUNAR_JOURNAL_PREFIX = "authored/lunar-journal/";

export type LunarJournalType =
  | "season"
  | "new"
  | "full"
  | "firstq"
  | "lastq"
  | "eclipse"
  | "equinox";

export type LunarJournalIndexEntry = {
  start: string;
  end: string;
  type: LunarJournalType;
  sign: string;
  title: string;
  contentKey?: string;
};

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

export const LUNAR_JOURNAL_INDEX = lunarJournalIndex as LunarJournalIndexEntry[];

export function isLunarJournalContentKey(key: string) {
  return key.startsWith(LUNAR_JOURNAL_PREFIX);
}

export function journalInstant(value: string) {
  if (/^\d{8}T\d{6}Z$/u.test(value)) {
    return Date.UTC(
      Number(value.slice(0, 4)),
      Number(value.slice(4, 6)) - 1,
      Number(value.slice(6, 8)),
      Number(value.slice(9, 11)),
      Number(value.slice(11, 13)),
      Number(value.slice(13, 15))
    );
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function journalTypeForEvent(event: Pick<LunarCalendarEvent, "title" | "type" | "planet" | "eclipseType">): LunarJournalType | null {
  const title = event.title ?? "";
  if (event.eclipseType || /eclipse/i.test(title)) return "eclipse";
  if (/new moon/i.test(title)) return "new";
  if (/full moon/i.test(title)) return "full";
  if (/first quarter/i.test(title)) return "firstq";
  if (/last quarter|third quarter/i.test(title)) return "lastq";
  if (/equinox|solstice/i.test(title)) return "equinox";
  if (event.type === "ingress" && event.planet === "Sun") return "season";
  if (/season|sun enters/i.test(title)) return "season";
  return null;
}

function signFromTitle(title: string) {
  return SIGNS.find((sign) => new RegExp(`\\b${sign}\\b`, "i").test(title)) ?? "";
}

export function matchLunarJournalIndex(event: LunarCalendarEvent) {
  const type = journalTypeForEvent(event);
  if (!type) return null;
  const sign = (event.sign ?? event.toSign ?? signFromTitle(event.title)).trim();
  const at = Date.parse(event.startsAt);
  const pool = LUNAR_JOURNAL_INDEX.filter((entry) => entry.type === type);
  const inWindow = pool.find((entry) => {
    const signOk = type === "equinox" || !entry.sign || !sign || entry.sign.toLowerCase() === sign.toLowerCase();
    const start = journalInstant(entry.start);
    const end = journalInstant(entry.end);
    return signOk && Number.isFinite(at) && Number.isFinite(start) && Number.isFinite(end) && at >= start && at <= end;
  });
  if (inWindow) return inWindow;
  return pool.find((entry) => entry.sign && sign && entry.sign.toLowerCase() === sign.toLowerCase())
    ?? pool.at(-1)
    ?? null;
}

export function lunarJournalContentKeyForEvent(event: LunarCalendarEvent) {
  return matchLunarJournalIndex(event)?.contentKey ?? null;
}
