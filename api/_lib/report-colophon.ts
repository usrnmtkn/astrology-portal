type FactRecord = Record<string, unknown>;
const POINTS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

function record(value: unknown): FactRecord | null { return value && typeof value === "object" && !Array.isArray(value) ? value as FactRecord : null; }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function num(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function root(facts: FactRecord) { return record(facts.reportWindow) ?? facts; }
function positionList(value: unknown) { return Array.isArray(value) ? value.map(record).filter(Boolean) as FactRecord[] : []; }
function positionByPoint(value: unknown, point: string) { return positionList(value).find((position) => text(position.point) === point); }
function ordinal(value: number) { const mod = value % 100; return `${value}${mod >= 11 && mod <= 13 ? "th" : value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"}`; }
function degree(position: FactRecord | undefined) {
  if (!position) throw new Error("REPORT_COLOPHON_POSITION_MISSING");
  const degree = num(position.degree);
  const minute = num(position.minute);
  const sign = text(position.sign);
  if (degree === null || minute === null || !sign) throw new Error(`REPORT_COLOPHON_POSITION_INCOMPLETE: ${text(position.point)}`);
  return `${degree}°${String(minute).padStart(2, "0")}' ${sign}`;
}
function angle(value: FactRecord | null, name: "Ascendant" | "Midheaven") {
  const direct = record(value?.[name]);
  if (direct) return direct;
  return positionList(value).find((entry) => text(entry.point) === name);
}
function formattedDate(value: string, timeZone: string, includeYear = true) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...(includeYear ? { year: "numeric" as const } : {}), timeZone }).format(new Date(value));
}
function reportPeriodLine(periodStart: string, periodEnd: string, timeZone: string) {
  const start = formattedDate(`${periodStart}T12:00:00Z`, timeZone);
  const end = formattedDate(`${periodEnd}T12:00:00Z`, timeZone);
  return `${start} - ${end}`;
}

export function reportGlyphLine(facts: FactRecord) {
  const natal = record(root(facts).natal);
  const sun = positionByPoint(natal?.positions, "Sun");
  const moon = positionByPoint(natal?.positions, "Moon");
  const asc = angle(record(natal?.angles), "Ascendant");
  if (!sun || !moon || !asc) throw new Error("REPORT_GLYPH_FACTS_MISSING: Sun, Moon, and Ascendant are required.");
  return `☉ ${text(sun.sign)} · ☽ ${text(moon.sign)} · ↑ ${text(asc.sign)}`;
}

export function buildCustomerReportColophon(input: { facts: FactRecord; periodStart: string; periodEnd: string; displayName: string }) {
  const facts = root(input.facts);
  const subject = record(facts.reportSubject);
  const datetime = record(subject?.datetime);
  const birthLocation = record(subject?.location);
  const solarReturn = record(facts.solarReturn);
  const returnLocation = record(solarReturn?.location) ?? birthLocation;
  const timeZone = text(returnLocation?.timeZone) || text(datetime?.timeZone) || "UTC";
  const natal = record(facts.natal);
  const srChart = record(solarReturn?.chart);
  const natalPositions = positionList(natal?.positions);
  const sun = positionByPoint(srChart?.positions, "Sun");
  const srAsc = angle(record(srChart?.angles), "Ascendant");
  const asc = angle(record(natal?.angles), "Ascendant");
  const mc = angle(record(natal?.angles), "Midheaven");
  const birthDate = text(datetime?.date);
  const birthTime = text(datetime?.time);
  const returnMoment = text(solarReturn?.returnMoment);
  const exclusiveEnd = text(facts.endsAt);
  const place = text(birthLocation?.label) || text(returnLocation?.label);
  if (!birthDate || !birthTime || !returnMoment || !place || !asc || !mc || !sun || !srAsc) throw new Error("REPORT_COLOPHON_FACTS_MISSING: canonical subject, birth, return, place, and angle facts are required.");
  const [birthHourText, birthMinute = "00"] = birthTime.split(":");
  const birthHour = Number(birthHourText);
  const time = `${birthHour % 12 || 12}:${birthMinute.padStart(2, "0")} ${birthHour >= 12 ? "PM" : "AM"}`;
  const returnDateTime = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone, timeZoneName: "short" }).format(new Date(returnMoment)).replace(" at ", ", ");
  const natalLine = POINTS.map((point) => {
    const position = positionByPoint(natalPositions, point);
    if (!position) throw new Error(`REPORT_COLOPHON_POSITION_MISSING: ${point}`);
    const house = ["Sun", "Moon"].includes(point) && num(position.house) ? ` (${ordinal(num(position.house) as number)})` : "";
    return `${point} ${degree(position)}${house}${position.retrograde === true ? " Rx" : ""}`;
  });
  natalLine.splice(2, 0, `Asc ${degree(asc)}`, `MC ${degree(mc)}`);
  const inclusiveEnd = exclusiveEnd
    ? new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(new Date(Date.parse(exclusiveEnd) - 24 * 60 * 60 * 1000))
    : input.periodEnd;
  return {
    periodLine: reportPeriodLine(input.periodStart, inclusiveEnd, timeZone),
    entries: [
      `${new Intl.DateTimeFormat("en-US", { month: "short", timeZone }).format(new Date(returnMoment)).toUpperCase()} ${new Date(returnMoment).getUTCFullYear()} - ${new Date(`${inclusiveEnd}T12:00:00Z`).getUTCFullYear()} READING`,
      `FOR ${input.displayName.toUpperCase()}, BORN ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${birthDate}T12:00:00Z`)).toUpperCase()}, ${time.toUpperCase()}`,
      place.toUpperCase(),
      `Solar Return: Sun at ${degree(sun)}, ${text(srAsc.sign)} rising, ${returnDateTime}.`,
      `Natal: ${natalLine.join(" · ")} · houses whole-sign from ${text(asc.sign)}.`
    ]
  };
}
