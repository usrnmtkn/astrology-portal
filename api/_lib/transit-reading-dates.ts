const MONTH = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const LAST_DAY = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dateKey(month: string, day: string) {
  const index = MONTH_KEYS.indexOf(month.slice(0, 3).toLowerCase());
  const number = Number(day);
  return index >= 0 && number >= 1 && number <= LAST_DAY[index] ? `${index + 1}-${number}` : null;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

function namedDates(text: string) {
  return text.matchAll(new RegExp(`\\b(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s*(?:[-–—]|to|through)\\s*(?:(${MONTH})\\.?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\b)?`, "giu"));
}

/** Compare month/day claims, including explicitly supplied range endpoints.
 * A range does not license an invented event date inside it. Each source string
 * is parsed separately so unrelated fields cannot form an accidental range. */
export function untraceableTransitReadingDates(text: string, brief: unknown): string[] {
  const allowed = new Set<string>();
  for (const source of strings(brief)) {
    for (const match of namedDates(source)) {
      const start = dateKey(match[1], match[2]);
      if (start) allowed.add(start);
      if (match[4] && (match[3] || Number(match[4]) >= Number(match[2]))) {
        const end = dateKey(match[3] ?? match[1], match[4]);
        if (end) allowed.add(end);
      }
    }
    for (const match of source.matchAll(/\b\d{4}-(\d{2})-(\d{2})\b/gu)) {
      const month = MONTH_KEYS[Number(match[1]) - 1];
      const key = month && dateKey(month, match[2]);
      if (key) allowed.add(key);
    }
  }
  const missing: string[] = [];
  for (const match of namedDates(text)) {
    const start = dateKey(match[1], match[2]);
    if (!start || !allowed.has(start)) missing.push(`${match[1]} ${match[2]}`);
    if (match[4]) {
      const end = dateKey(match[3] ?? match[1], match[4]);
      if (!end || !allowed.has(end)) missing.push(`${match[3] ?? match[1]} ${match[4]}`);
    }
  }
  return missing;
}
