import type { LocationInput } from "../types";

const stateTimeZones: Record<string, string> = {
  AL: "America/Chicago",
  Alabama: "America/Chicago",
  AK: "America/Anchorage",
  Alaska: "America/Anchorage",
  AZ: "America/Phoenix",
  Arizona: "America/Phoenix",
  AR: "America/Chicago",
  Arkansas: "America/Chicago",
  CA: "America/Los_Angeles",
  California: "America/Los_Angeles",
  CO: "America/Denver",
  Colorado: "America/Denver",
  CT: "America/New_York",
  Connecticut: "America/New_York",
  DC: "America/New_York",
  DE: "America/New_York",
  Delaware: "America/New_York",
  FL: "America/New_York",
  Florida: "America/New_York",
  GA: "America/New_York",
  Georgia: "America/New_York",
  HI: "Pacific/Honolulu",
  Hawaii: "Pacific/Honolulu",
  IA: "America/Chicago",
  Iowa: "America/Chicago",
  ID: "America/Boise",
  Idaho: "America/Boise",
  IL: "America/Chicago",
  Illinois: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  Indiana: "America/Indiana/Indianapolis",
  KS: "America/Chicago",
  Kansas: "America/Chicago",
  KY: "America/New_York",
  Kentucky: "America/New_York",
  LA: "America/Chicago",
  Louisiana: "America/Chicago",
  MA: "America/New_York",
  Massachusetts: "America/New_York",
  MD: "America/New_York",
  Maryland: "America/New_York",
  ME: "America/New_York",
  Maine: "America/New_York",
  MI: "America/Detroit",
  Michigan: "America/Detroit",
  MN: "America/Chicago",
  Minnesota: "America/Chicago",
  MO: "America/Chicago",
  Missouri: "America/Chicago",
  MS: "America/Chicago",
  Mississippi: "America/Chicago",
  MT: "America/Denver",
  Montana: "America/Denver",
  NC: "America/New_York",
  "North Carolina": "America/New_York",
  ND: "America/Chicago",
  "North Dakota": "America/Chicago",
  NE: "America/Chicago",
  Nebraska: "America/Chicago",
  NH: "America/New_York",
  "New Hampshire": "America/New_York",
  NJ: "America/New_York",
  "New Jersey": "America/New_York",
  NM: "America/Denver",
  "New Mexico": "America/Denver",
  NV: "America/Los_Angeles",
  Nevada: "America/Los_Angeles",
  NY: "America/New_York",
  "New York": "America/New_York",
  OH: "America/New_York",
  Ohio: "America/New_York",
  OK: "America/Chicago",
  Oklahoma: "America/Chicago",
  OR: "America/Los_Angeles",
  Oregon: "America/Los_Angeles",
  PA: "America/New_York",
  Pennsylvania: "America/New_York",
  RI: "America/New_York",
  "Rhode Island": "America/New_York",
  SC: "America/New_York",
  "South Carolina": "America/New_York",
  SD: "America/Chicago",
  "South Dakota": "America/Chicago",
  TN: "America/Chicago",
  Tennessee: "America/Chicago",
  TX: "America/Chicago",
  Texas: "America/Chicago",
  UT: "America/Denver",
  Utah: "America/Denver",
  VA: "America/New_York",
  Virginia: "America/New_York",
  VT: "America/New_York",
  Vermont: "America/New_York",
  WA: "America/Los_Angeles",
  Washington: "America/Los_Angeles",
  WI: "America/Chicago",
  Wisconsin: "America/Chicago",
  WV: "America/New_York",
  "West Virginia": "America/New_York",
  WY: "America/Denver",
  Wyoming: "America/Denver"
};

const provinceTimeZones: Record<string, string> = {
  Alberta: "America/Edmonton",
  "British Columbia": "America/Vancouver",
  Manitoba: "America/Winnipeg",
  "New Brunswick": "America/Moncton",
  Newfoundland: "America/St_Johns",
  "Newfoundland and Labrador": "America/St_Johns",
  "Nova Scotia": "America/Halifax",
  Ontario: "America/Toronto",
  Quebec: "America/Toronto",
  Saskatchewan: "America/Regina"
};

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function timeZoneForLocation(location: Pick<LocationInput, "label" | "latitude" | "longitude"> & { region?: string }) {
  const text = `${location.label}, ${location.region ?? ""}`;

  for (const [region, timeZone] of Object.entries({ ...stateTimeZones, ...provinceTimeZones })) {
    if (new RegExp(`(^|,|\\s)${region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(,|\\s|$)`, "i").test(text)) {
      return timeZone;
    }
  }

  const { latitude, longitude } = location;

  if (latitude > 49 && longitude > -11 && longitude < 3) return "Europe/London";
  if (latitude > 41 && latitude < 52 && longitude > -6 && longitude < 10) return "Europe/Paris";
  if (latitude > 35 && latitude < 72 && longitude > -25 && longitude < 45) return "Europe/London";
  if (latitude > 18 && latitude < 72 && longitude > -170 && longitude < -50) {
    if (longitude < -135) return "America/Anchorage";
    if (longitude < -115) return "America/Los_Angeles";
    if (longitude < -100) return "America/Denver";
    if (longitude < -85) return "America/Chicago";
    return "America/New_York";
  }

  return browserTimeZone();
}

export function withTimeZone<T extends LocationInput>(location: T): T {
  return {
    ...location,
    timeZone: location.timeZone ?? timeZoneForLocation(location)
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const valueFor = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    valueFor("year"),
    valueFor("month") - 1,
    valueFor("day"),
    valueFor("hour") % 24,
    valueFor("minute"),
    valueFor("second")
  );

  return asUtc - date.getTime();
}

export function zonedDateTimeToUtc(dateValue: string, timeValue: string, timeZone = browserTimeZone()) {
  const [, year = "", month = "", day = ""] = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  const [, hour = "12", minute = "00", meridiem = "PM"] = timeValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i) ?? [];
  let hour24 = Number(hour) % 12;

  if (meridiem.toUpperCase() === "PM") {
    hour24 += 12;
  }

  const utcGuess = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour24, Number(minute), 0));
  const firstOffset = timeZoneOffsetMs(utcGuess, timeZone);
  const firstUtc = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = timeZoneOffsetMs(firstUtc, timeZone);

  return new Date(utcGuess.getTime() - secondOffset);
}
