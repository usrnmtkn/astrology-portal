// Compare calendar dates in the selected location, independent of browser timezone or DST.
export function calendarDayDistance(from: Date, to: Date, timeZone?: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" });
  const dayNumber = (date: Date) => {
    const parts = formatter.formatToParts(date);
    const value = (type: string) => Number(parts.find(part => part.type === type)!.value);
    return Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000;
  };
  return dayNumber(to) - dayNumber(from);
}
