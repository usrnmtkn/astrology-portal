import type { CalendarCheckInEntry } from "../../services/calendarCheckIns";

const MOOD_LABELS = ["Terrible", "Not great", "Okay", "Good", "Great"] as const;

export type AccountJournalGroupBy = "days" | "weeks" | "months";

export type AccountJournalItem = CalendarCheckInEntry & {
  dateKey: string;
};

export type AccountJournalMoodShare = {
  mood: number;
  label: string;
  count: number;
  percent: number;
};

export type AccountJournalGroup = {
  key: string;
  label: string;
  detail: string;
  items: AccountJournalItem[];
  moods: AccountJournalMoodShare[];
};

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function localCalendarDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseAccountJournalDateKey(dateKey: string) {
  const match = DATE_KEY.exec(dateKey);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatUtc(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
}

export function formatAccountJournalDateLine(dateKey: string) {
  const date = parseAccountJournalDateKey(dateKey);
  return date ? formatUtc(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : dateKey;
}

export function formatAccountJournalDayLabel(dateKey: string) {
  const date = parseAccountJournalDateKey(dateKey);
  return date ? formatUtc(date, { weekday: "long", month: "short", day: "numeric" }) : dateKey;
}

function mondayOf(date: Date) {
  const weekday = date.getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - offset));
}

function addUtcDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function isoWeekNumber(monday: Date) {
  const thursday = addUtcDays(monday, 3);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((thursday.getTime() - yearStart.getTime()) / 86_400_000) + 1;
  return Math.ceil(dayOfYear / 7);
}

function dateKeyOf(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function checkInCountLabel(count: number) {
  return count === 1 ? "1 check-in" : `${count} check-ins`;
}

export function accountJournalMoodHighlights(items: AccountJournalItem[]): AccountJournalMoodShare[] {
  const counted = items.filter((item) => item.mood != null);
  if (!counted.length) return [];
  const totals = [0, 0, 0, 0, 0];
  for (const item of counted) {
    if (item.mood != null) totals[item.mood] += 1;
  }
  return totals.flatMap((count, mood) => (
    count
      ? [{
        mood,
        label: MOOD_LABELS[mood] ?? "Okay",
        count,
        percent: Math.round((count / counted.length) * 100)
      }]
      : []
  )).sort((left, right) => right.count - left.count || left.mood - right.mood);
}

export function accountJournalItemsFromEntries(entries: Record<string, CalendarCheckInEntry>) {
  return Object.entries(entries)
    .filter(([dateKey]) => DATE_KEY.test(dateKey))
    .map(([dateKey, entry]) => ({ dateKey, ...entry }))
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey));
}

function groupMeta(groupBy: AccountJournalGroupBy, dateKey: string) {
  const date = parseAccountJournalDateKey(dateKey);
  if (!date) return { key: dateKey, label: dateKey, detail: "" };

  if (groupBy === "months") {
    return {
      key: dateKey.slice(0, 7),
      label: formatUtc(date, { month: "long", year: "numeric" }),
      detail: ""
    };
  }

  if (groupBy === "weeks") {
    const monday = mondayOf(date);
    const sunday = addUtcDays(monday, 6);
    const sameMonth = monday.getUTCMonth() === sunday.getUTCMonth();
    const range = sameMonth
      ? `${formatUtc(monday, { month: "long", day: "numeric" })} – ${formatUtc(sunday, { day: "numeric" })}`
      : `${formatUtc(monday, { month: "short", day: "numeric" })} – ${formatUtc(sunday, { month: "short", day: "numeric" })}`;
    return {
      key: dateKeyOf(monday),
      label: `Week ${isoWeekNumber(monday)}`,
      detail: range
    };
  }

  return {
    key: dateKey,
    label: formatAccountJournalDayLabel(dateKey),
    detail: formatUtc(date, { year: "numeric" })
  };
}

export function groupAccountJournalEntries(
  items: AccountJournalItem[],
  groupBy: AccountJournalGroupBy
): AccountJournalGroup[] {
  const groups = new Map<string, AccountJournalGroup>();

  for (const item of items) {
    const meta = groupMeta(groupBy, item.dateKey);
    const existing = groups.get(meta.key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(meta.key, {
      key: meta.key,
      label: meta.label,
      detail: meta.detail,
      items: [item],
      moods: []
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    detail: groupBy === "weeks"
      ? `${group.detail} · ${checkInCountLabel(group.items.length)}`
      : group.detail
        ? `${group.detail} · ${checkInCountLabel(group.items.length)}`
        : checkInCountLabel(group.items.length),
    moods: accountJournalMoodHighlights(group.items)
  }));
}
