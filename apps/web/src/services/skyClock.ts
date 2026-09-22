export function skyCivilDate(timeZone: string | undefined, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** A selected civil day is live only when it is today in the selected location. */
export function liveSkyReference(selectedDate: string, timeZone: string | undefined, now = new Date()): Date | null {
  return selectedDate === skyCivilDate(timeZone, now) ? new Date(now) : null;
}

/** Remaining time rounds up; an elapsed interval has no minutes remaining. */
export function remainingSkyMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 60_000));
}
