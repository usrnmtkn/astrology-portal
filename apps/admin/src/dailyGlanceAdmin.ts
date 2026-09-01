export type DailyGlanceAdminRow = {
  id: string;
  content_key: string;
  headline: string | null;
  summary: string | null;
  body: string | null;
  sections: unknown;
  updated_at?: string | null;
};

export type DailyGlancePair = {
  selector: string;
  label: string;
  headlineRow: DailyGlanceAdminRow;
  passageRow: DailyGlanceAdminRow;
};

export type DailyGlanceContextInput = {
  date: string;
  person: string;
  timeZone: string;
};

const dailyHeadlinePrefix = "fallback-hook/daily-headline/";
const dailyPassagePrefix = "fallback-hook/daily-body/";

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function words(value: string) {
  return value
    .replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function ordinal(value: number) {
  const mod100 = value % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? "th"
    : value % 10 === 1
      ? "st"
      : value % 10 === 2
        ? "nd"
        : value % 10 === 3
          ? "rd"
          : "th";
  return `${value}${suffix}`;
}

export function dailyGlanceSelector(contentKey: string) {
  if (contentKey.startsWith(dailyHeadlinePrefix)) {
    return contentKey.slice(dailyHeadlinePrefix.length);
  }
  if (contentKey.startsWith(dailyPassagePrefix)) {
    return contentKey.slice(dailyPassagePrefix.length);
  }
  return null;
}

export function dailyGlanceSelectorLabel(selector: string) {
  const [context = "", subject = ""] = selector.split("/");
  if (context === "house" && /^\d+$/u.test(subject)) {
    return `${ordinal(Number(subject))} House fallback`;
  }
  const contact = context === "soft" ? "soft contact" : context;
  return `Moon ${words(contact)} natal ${words(subject)}`;
}

export function dailyGlancePackageField(row: DailyGlanceAdminRow, field: "body_you" | "body_they") {
  const sections = objectRecord(row.sections);
  const packageDraft = objectRecord(sections?.packageDraft);
  const packageRecord = objectRecord(sections?.packageRecord);
  const value = packageDraft?.[field] ?? sections?.[field] ?? packageRecord?.[field];
  if (typeof value === "string") return value;
  return field === "body_you" ? row.body ?? "" : "";
}

export function dailyGlancePairs(rows: DailyGlanceAdminRow[]) {
  const bySelector = new Map<string, { headlineRow?: DailyGlanceAdminRow; passageRow?: DailyGlanceAdminRow }>();

  rows.forEach((row) => {
    const selector = dailyGlanceSelector(row.content_key);
    if (!selector) return;
    const entry = bySelector.get(selector) ?? {};
    if (row.content_key.startsWith(dailyHeadlinePrefix)) entry.headlineRow = row;
    if (row.content_key.startsWith(dailyPassagePrefix)) entry.passageRow = row;
    bySelector.set(selector, entry);
  });

  return [...bySelector.entries()]
    .filter((entry): entry is [string, { headlineRow: DailyGlanceAdminRow; passageRow: DailyGlanceAdminRow }] => (
      Boolean(entry[1].headlineRow && entry[1].passageRow)
    ))
    .map(([selector, pair]) => ({
      selector,
      label: dailyGlanceSelectorLabel(selector),
      headlineRow: pair.headlineRow,
      passageRow: pair.passageRow
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "en", { numeric: true }));
}

export function dailyGlancePairSearchText(pair: DailyGlancePair) {
  return [
    pair.selector,
    pair.label,
    pair.headlineRow.content_key,
    pair.passageRow.content_key,
    pair.headlineRow.headline,
    pair.passageRow.headline,
    pair.headlineRow.summary,
    pair.passageRow.summary,
    dailyGlancePackageField(pair.headlineRow, "body_you"),
    dailyGlancePackageField(pair.headlineRow, "body_they"),
    dailyGlancePackageField(pair.passageRow, "body_you"),
    dailyGlancePackageField(pair.passageRow, "body_they")
  ].join(" ").toLowerCase();
}

export function dailyGlanceContextSearchParams(input: DailyGlanceContextInput) {
  return new URLSearchParams({
    surface: "dailyGlance",
    status: "all",
    person: input.person,
    startDate: input.date,
    endDate: input.date,
    timeZone: input.timeZone
  });
}
