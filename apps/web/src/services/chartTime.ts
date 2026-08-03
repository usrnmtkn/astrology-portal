export function twentyFourHourTimeToDisplay(value: string) {
  const [, rawHour = "", rawMinute = ""] = value.match(/^(\d{1,2}):(\d{2})/) ?? [];
  const hour = Number(rawHour);

  if (!rawHour || Number.isNaN(hour)) {
    return "12:00 PM";
  }

  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${rawMinute || "00"} ${meridiem}`;
}

export function displayTimeToTwentyFourHour(value: string | null | undefined) {
  if (!value) {
    return "12:00";
  }

  const [, rawHour = "", rawMinute = "00", meridiem = "AM"] = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i) ?? [];
  const hour = Number(rawHour);

  if (!rawHour || Number.isNaN(hour)) {
    return value.slice(0, 5);
  }

  const hour24 = meridiem.toUpperCase() === "PM"
    ? (hour % 12) + 12
    : hour % 12;

  return `${String(hour24).padStart(2, "0")}:${rawMinute}`;
}
