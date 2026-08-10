export const birthTimeInputMessage = "Enter a valid birth time, such as 11:20 AM or 23:20.";

export class BirthTimeValidationError extends Error {
  readonly code = "BIRTH_TIME_INVALID";

  constructor(message = birthTimeInputMessage) {
    super(message);
    this.name = "BirthTimeValidationError";
  }
}

export function normalizeBirthTime(value: string | null | undefined) {
  const input = value?.trim() ?? "";
  if (!input) throw new BirthTimeValidationError();

  const meridiemMatch = input.match(/^(\d{1,2})(?:(?:\s*[:.]\s*|\s*)(\d{2}))?\s*([ap])\.?\s*m\.?$/iu);
  const compactMatch = input.match(/^(\d{1,2})(\d{2})$/u);
  const separatedMatch = input.match(/^(\d{1,2})(?:\s*[:.]\s*(\d{1,2})(?:\s*:\s*(\d{1,2})(?:\.\d+)?)?)?$/u);
  let rawHour = "";
  let rawMinute = "00";
  let meridiem = "";
  let rawSecond = "00";

  if (meridiemMatch) {
    [, rawHour = "", rawMinute = "00", meridiem = ""] = meridiemMatch;
  } else if (compactMatch) {
    [, rawHour = "", rawMinute = "00"] = compactMatch;
  } else if (separatedMatch) {
    [, rawHour = "", rawMinute = "00", rawSecond = "00"] = separatedMatch;
  } else {
    throw new BirthTimeValidationError();
  }

  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  const second = Number(rawSecond);
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new BirthTimeValidationError();
  if (!Number.isInteger(second) || second < 0 || second > 59) throw new BirthTimeValidationError();

  let hour24 = hour;
  if (meridiem) {
    if (!Number.isInteger(hour) || hour < 1 || hour > 12) throw new BirthTimeValidationError();
    hour24 = meridiem.toLowerCase() === "p" ? (hour % 12) + 12 : hour % 12;
  } else if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new BirthTimeValidationError();
  }

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function twentyFourHourTimeToDisplay(value: string) {
  let normalized: string;
  try {
    normalized = normalizeBirthTime(value);
  } catch {
    return "12:00 PM";
  }
  const [rawHour = "", rawMinute = ""] = normalized.split(":");
  const hour = Number(rawHour);

  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${rawMinute || "00"} ${meridiem}`;
}

export function displayTimeToTwentyFourHour(value: string | null | undefined) {
  if (!value) {
    return "12:00";
  }
  try {
    return normalizeBirthTime(value);
  } catch {
    return value.slice(0, 5);
  }
}
