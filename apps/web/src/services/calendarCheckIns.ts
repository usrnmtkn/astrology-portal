import { getSupabaseClient, getVerifiedAuthUser } from "./auth";
import { withRequestDeadline } from "./requestDeadline";

export type CalendarCheckInEntry = {
  mood: number | null;
  sleep: number;
  social: number;
  moodNote: string;
  note: string;
  tags: string[];
  people: string[];
};

export const CALENDAR_CHECK_IN_MOOD_NOTE_MAX = 4000;
export const CALENDAR_CHECK_IN_NOTE_MAX = 8000;
export const CALENDAR_CHECK_IN_LABEL_MAX = 80;
export const CALENDAR_CHECK_IN_LIST_MAX = 24;
const CHECK_IN_PAGE_SIZE = 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type CalendarCheckInLibrary = {
  tags: string[];
  people: string[];
};

export type CalendarCheckInLibraryKind = "tag" | "person";

type CalendarCheckInRow = {
  user_id: string;
  date_key: string;
  mood: number | null;
  sleep: number;
  social: number;
  mood_note: string;
  note: string;
  tags: string[] | null;
  people: string[] | null;
};

type CalendarCheckInLibraryRow = {
  user_id: string;
  kind: CalendarCheckInLibraryKind;
  label: string;
};

export class CalendarCheckInAuthError extends Error {
  constructor(message = "Sign in to save this check-in with your account.") {
    super(message);
    this.name = "CalendarCheckInAuthError";
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function sanitizeText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

export function sanitizeLibraryLabel(value: unknown) {
  if (typeof value !== "string") return null;
  const label = value.trim().slice(0, CALENDAR_CHECK_IN_LABEL_MAX);
  return label.length > 0 ? label : null;
}

function sanitizeLabelList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const labels: string[] = [];
  for (const item of value) {
    const label = sanitizeLibraryLabel(item);
    if (!label || labels.includes(label)) continue;
    labels.push(label);
    if (labels.length >= CALENDAR_CHECK_IN_LIST_MAX) break;
  }
  return labels;
}

export function isCalendarDateKey(value: string) {
  return DATE_KEY_PATTERN.test(value);
}

export function sanitizeCheckInEntry(value: Partial<CalendarCheckInEntry> | undefined): CalendarCheckInEntry {
  const mood = typeof value?.mood === "number" && Number.isFinite(value.mood)
    ? clampInt(value.mood, 0, 4, 0)
    : null;

  return {
    mood: value?.mood == null ? null : mood,
    sleep: clampInt(value?.sleep, 0, 100, 50),
    social: clampInt(value?.social, 0, 100, 50),
    moodNote: sanitizeText(value?.moodNote, CALENDAR_CHECK_IN_MOOD_NOTE_MAX),
    note: sanitizeText(value?.note, CALENDAR_CHECK_IN_NOTE_MAX),
    tags: sanitizeLabelList(value?.tags),
    people: sanitizeLabelList(value?.people)
  };
}

function rowToEntry(row: CalendarCheckInRow): CalendarCheckInEntry {
  return sanitizeCheckInEntry({
    mood: row.mood,
    sleep: row.sleep,
    social: row.social,
    moodNote: row.mood_note,
    note: row.note,
    tags: row.tags ?? [],
    people: row.people ?? []
  });
}

function dateKeyFromRow(row: CalendarCheckInRow) {
  return String(row.date_key).slice(0, 10);
}

async function requireVerifiedUser(signal?: AbortSignal, expectedUserId?: string) {
  const client = await getSupabaseClient();
  if (!client) {
    throw new CalendarCheckInAuthError("Saving check-ins is unavailable.");
  }

  signal?.throwIfAborted();
  const user = await getVerifiedAuthUser(client);
  signal?.throwIfAborted();
  if (!user || (expectedUserId && user.id !== expectedUserId)) {
    throw new CalendarCheckInAuthError();
  }

  return { client, user };
}

function publicStoreError(fallback: string) {
  return new Error(fallback);
}

type CheckInRequestOptions = { signal?: AbortSignal; expectedUserId?: string };

type CheckInRange = { fromDateKey: string; toDateKey: string };

function validateRange(range: CheckInRange) {
  if (!isCalendarDateKey(range.fromDateKey) || !isCalendarDateKey(range.toDateKey) || range.fromDateKey > range.toDateKey) {
    throw publicStoreError("Those days could not load.");
  }
}

// Full history is for the account archive/export; calendar readers supply a range.
export async function listCalendarCheckIns(options: CheckInRequestOptions & Partial<CheckInRange> = {}): Promise<Record<string, CalendarCheckInEntry>> {
  if (options.fromDateKey || options.toDateKey) validateRange(options as CheckInRange);
  return withRequestDeadline(async signal => {
    const { client, user } = await requireVerifiedUser(signal, options.expectedUserId);
    const entries: Record<string, CalendarCheckInEntry> = {};
    for (let from = 0; ; from += CHECK_IN_PAGE_SIZE) {
      signal.throwIfAborted();
      let query = client.from("calendar_check_ins")
        .select("user_id, date_key, mood, sleep, social, mood_note, note, tags, people")
        .eq("user_id", user.id);
      if (options.fromDateKey && options.toDateKey) {
        query = query.gte("date_key", options.fromDateKey).lte("date_key", options.toDateKey);
      }
      const { data, error } = await query.order("date_key", { ascending: true })
        .range(from, from + CHECK_IN_PAGE_SIZE - 1).abortSignal(signal);
      if (error) throw publicStoreError("Your check-ins could not load.");
      const rows = (data ?? []) as CalendarCheckInRow[];
      for (const row of rows) {
        const dateKey = dateKeyFromRow(row);
        if (row.user_id !== user.id || !isCalendarDateKey(dateKey)) continue;
        if (options.fromDateKey && dateKey < options.fromDateKey) continue;
        if (options.toDateKey && dateKey > options.toDateKey) continue;
        entries[dateKey] = rowToEntry(row);
      }
      if (rows.length < CHECK_IN_PAGE_SIZE) break;
    }
    return entries;
  }, options);
}

export async function loadCalendarCheckIn(dateKey: string, options: CheckInRequestOptions = {}) {
  const entries = await listCalendarCheckIns({ ...options, fromDateKey: dateKey, toDateKey: dateKey });
  return entries[dateKey];
}

export type CalendarCheckInSummary = Pick<CalendarCheckInEntry, "mood">;

// Month indicators never need private journal bodies, tags, or people.
export async function listCalendarCheckInSummaries(range: CheckInRange, options: CheckInRequestOptions = {}) {
  validateRange(range);
  return withRequestDeadline(async signal => {
    const { client, user } = await requireVerifiedUser(signal, options.expectedUserId);
    const { data, error } = await client.from("calendar_check_ins")
      .select("user_id, date_key, mood").eq("user_id", user.id)
      .gte("date_key", range.fromDateKey).lte("date_key", range.toDateKey)
      .order("date_key", { ascending: true }).abortSignal(signal);
    if (error) throw publicStoreError("Your check-ins could not load.");
    const entries: Record<string, CalendarCheckInSummary> = {};
    for (const row of (data ?? []) as CalendarCheckInRow[]) {
      const dateKey = dateKeyFromRow(row);
      if (row.user_id !== user.id || dateKey < range.fromDateKey || dateKey > range.toDateKey) continue;
      entries[dateKey] = { mood: sanitizeCheckInEntry({ mood: row.mood }).mood };
    }
    return entries;
  }, options);
}

export async function upsertCalendarCheckIn(dateKey: string, entry: CalendarCheckInEntry, options: CheckInRequestOptions = {}): Promise<CalendarCheckInEntry> {
  return withRequestDeadline(async signal => {
    if (!isCalendarDateKey(dateKey)) {
      throw publicStoreError("That day could not be saved.");
    }

    const { client, user } = await requireVerifiedUser(signal, options.expectedUserId);
    const sanitized = sanitizeCheckInEntry(entry);
    const payload: CalendarCheckInRow = {
      user_id: user.id,
      date_key: dateKey,
      mood: sanitized.mood,
      sleep: sanitized.sleep,
      social: sanitized.social,
      mood_note: sanitized.moodNote,
      note: sanitized.note,
      tags: sanitized.tags,
      people: sanitized.people
    };

    const { data, error } = await client
      .from("calendar_check_ins")
      .upsert(payload, { onConflict: "user_id,date_key" })
      .select("user_id, date_key, mood, sleep, social, mood_note, note, tags, people")
      .abortSignal(signal).single();

    if (error || !data) {
      console.warn("Calendar check-in could not save.", { name: error?.name, code: error?.code });
      throw publicStoreError("This check-in could not be saved. Try again.");
    }

    const row = data as CalendarCheckInRow;
    if (row.user_id !== user.id) {
      throw publicStoreError("This check-in could not be saved. Try again.");
    }

    return rowToEntry(row);
  }, options);
}

export async function listCalendarCheckInLibrary(options: CheckInRequestOptions = {}): Promise<CalendarCheckInLibrary> {
  return withRequestDeadline(async signal => {
    const { client, user } = await requireVerifiedUser(signal, options.expectedUserId);
    const tags = new Set<string>();
    const people = new Set<string>();
    for (let from = 0; ; from += CHECK_IN_PAGE_SIZE) {
      signal.throwIfAborted();
      const { data, error } = await client.from("calendar_check_in_library")
        .select("user_id, kind, label").eq("user_id", user.id)
        .order("kind", { ascending: true }).order("label", { ascending: true })
        .range(from, from + CHECK_IN_PAGE_SIZE - 1).abortSignal(signal);
      if (error) throw publicStoreError("Your tags and people could not load.");
      const rows = (data ?? []) as CalendarCheckInLibraryRow[];
      for (const row of rows) {
        if (row.user_id !== user.id) continue;
        const label = sanitizeLibraryLabel(row.label);
        if (!label) continue;
        if (row.kind === "tag") tags.add(label);
        if (row.kind === "person") people.add(label);
      }
      if (rows.length < CHECK_IN_PAGE_SIZE) break;
    }
    return { tags: [...tags], people: [...people] };
  }, options);
}

export async function addCalendarCheckInLibraryItem(kind: CalendarCheckInLibraryKind, label: string, options: CheckInRequestOptions = {}) {
  return withRequestDeadline(async signal => {
    const sanitized = sanitizeLibraryLabel(label);
    if (!sanitized) return sanitized;

    const { client, user } = await requireVerifiedUser(signal, options.expectedUserId);
    const payload: CalendarCheckInLibraryRow = {
      user_id: user.id,
      kind,
      label: sanitized
    };
    const { error } = await client
      .from("calendar_check_in_library")
      .upsert(payload, { onConflict: "user_id,kind,label" }).abortSignal(signal);

    if (error) {
      console.warn("Calendar check-in library item could not save.", { name: error.name, code: error.code });
      throw publicStoreError("That label could not be saved.");
    }

    return sanitized;
  }, options);
}

export async function removeCalendarCheckInLibraryItem(kind: CalendarCheckInLibraryKind, label: string, options: CheckInRequestOptions = {}) {
  return withRequestDeadline(async signal => {
    const sanitized = sanitizeLibraryLabel(label);
    if (!sanitized) return;

    const { client, user } = await requireVerifiedUser(signal, options.expectedUserId);
    const { error } = await client
      .from("calendar_check_in_library")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("label", sanitized).abortSignal(signal);

    if (error) {
      console.warn("Calendar check-in library item could not delete.", { name: error.name, code: error.code });
      throw publicStoreError("That label could not be removed.");
    }
  }, options);
}

export type CalendarCheckInExportBundle = {
  checkIns: Array<{ dateKey: string } & CalendarCheckInEntry>;
  tags: string[];
  people: string[];
};

export async function exportCalendarCheckInBundle(options: CheckInRequestOptions = {}): Promise<CalendarCheckInExportBundle> {
  const [checkIns, library] = await Promise.all([
    listCalendarCheckIns(options),
    listCalendarCheckInLibrary(options)
  ]);

  return {
    checkIns: Object.entries(checkIns)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dateKey, entry]) => ({ dateKey, ...entry })),
    tags: library.tags,
    people: library.people
  };
}

export async function deleteAllCalendarCheckInData(options: CheckInRequestOptions = {}) {
  const { client, user } = await requireVerifiedUser(options.signal, options.expectedUserId);

  const { error: entriesError } = await client
    .from("calendar_check_ins")
    .delete()
    .eq("user_id", user.id);

  if (entriesError) {
    console.warn("Calendar check-ins could not delete.", { name: entriesError.name, code: entriesError.code });
    throw publicStoreError("Your check-ins could not be deleted. Try again.");
  }

  const { error: libraryError } = await client
    .from("calendar_check_in_library")
    .delete()
    .eq("user_id", user.id);

  if (libraryError) {
    console.warn("Calendar check-in library could not delete.", { name: libraryError.name, code: libraryError.code });
    throw publicStoreError("Your check-ins could not be deleted. Try again.");
  }
}
