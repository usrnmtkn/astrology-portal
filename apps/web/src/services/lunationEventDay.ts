function localDateKey(date: Date, timeZone: string) {
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const valueFor = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const year = valueFor("year");
  const month = valueFor("month");
  const day = valueFor("day");

  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function lunationEventOccursOnLocalDate({
  occursAt,
  selectedDate,
  timeZone
}: {
  occursAt: string;
  selectedDate: string;
  timeZone: string;
}) {
  return localDateKey(new Date(occursAt), timeZone) === selectedDate;
}
