import { isReaderFacingCopy, readerFacingParagraphs } from "../../content/readerSafety";
import type { LiveGeneratedContent } from "../../services/generatedContent";
import type { LunarCalendarMonth } from "../../services/ephemeris";
import {
  calendarOverviewWriting,
  calendarPreviewSeasons,
  calendarPreviewSign,
  calendarResolveOverviewField,
  calendarTemplateSegments,
  type CalendarOverviewCalculation,
  type CalendarOverviewValue
} from "./calendarOverviewResolve";

export const CALENDAR_MONTHLY_OVERVIEW_KEY = "slot-template/calendar/monthly-overview/v1";

const overviewFields = [
  "monthlyOverview", "seasonOverview", "lunarOverview", "transitOverview", "monthlyIntegration",
  "seasonOpening", "planetaryHighlights", "newMoonOverview", "fullMoonOverview", "lunationConnection"
];

export function calendarMonthlyOverviewCalculation(calendar: LunarCalendarMonth): CalendarOverviewCalculation {
  const days = calendar.days.filter(day => day.inMonth);
  const dates = new Set(days.map(day => day.dateKey));
  return {
    sky: { generatedAt: days[0]?.date ?? calendar.days[0]?.date ?? "" },
    days,
    events: calendar.events.filter(event => dates.has(event.dateKey)),
    seasonIngresses: calendar.events.filter(event => event.planet === "Sun" && event.type === "ingress"),
    timeZone: calendar.timeZone
  };
}

export function calendarMonthlyOverviewContentKeys(calendar: LunarCalendarMonth) {
  const seasons = calendarPreviewSeasons(calendarMonthlyOverviewCalculation(calendar));
  const signs = [seasons.opening?.sign, seasons.closing?.sign].filter((sign): sign is string => Boolean(sign));
  return [
    CALENDAR_MONTHLY_OVERVIEW_KEY,
    ...signs.flatMap(sign => [
      `fallback-hook/zodiac-season/${sign.toLowerCase()}`,
      `fallback-hook/zodiac-season-polar-axis/${sign.toLowerCase()}`
    ])
  ];
}

function put(values: Record<string, CalendarOverviewValue>, name: string, text: string | undefined, kind: CalendarOverviewValue["kind"], sourceKey?: string) {
  if (text) values[name] = { text, kind, sourceKey };
}

function seasonPassage(generatedContent: Map<string, LiveGeneratedContent> | undefined, sign: string, family: "zodiac-season" | "zodiac-season-polar-axis") {
  const key = `fallback-hook/${family}/${sign.toLowerCase()}`;
  const body = generatedContent?.get(key)?.body?.trim();
  if (!body || /\{\{|\}\}/u.test(body) || !isReaderFacingCopy(body)) return undefined;
  return { body, key };
}

function calendarMonthlyOverviewFacts(
  calendar: LunarCalendarMonth,
  generatedContent?: Map<string, LiveGeneratedContent>
) {
  const values: Record<string, CalendarOverviewValue> = {};
  const calculation = calendarMonthlyOverviewCalculation(calendar);
  const { days, events, timeZone } = calculation;
  const seasons = calendarPreviewSeasons(calculation);
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone }).format(new Date(value));
  const formatTime = (value: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone }).format(new Date(value));
  const timedEvents = (items: typeof events) => items.filter(event => event.phase !== "retrograde-passage")
    .map(event => `${formatTime(event.startsAt)} · ${event.title}`).join("\n");
  const openingSign = calendarPreviewSign(seasons.opening?.sign ?? "");
  put(values, "openingSeasonSign", openingSign, "fact");
  put(values, "signTitle", openingSign, "fact");
  if (openingSign) {
    const season = seasonPassage(generatedContent, openingSign, "zodiac-season");
    const axis = seasonPassage(generatedContent, openingSign, "zodiac-season-polar-axis");
    put(values, "openingZodiacSeason", season?.body, "copy", season?.key);
    put(values, "openingZodiacSeasonPolarAxis", axis?.body, "copy", axis?.key);
  }
  if (seasons.closing) {
    const closingSign = calendarPreviewSign(seasons.closing.sign);
    put(values, "closingSeasonSign", closingSign, "fact");
    put(values, "hasSeasonTransition", "yes", "fact");
    put(values, "seasonChangeDate", formatTime(seasons.closing.startsAt), "fact");
    if (closingSign) {
      const season = seasonPassage(generatedContent, closingSign, "zodiac-season");
      const axis = seasonPassage(generatedContent, closingSign, "zodiac-season-polar-axis");
      put(values, "closingZodiacSeason", season?.body, "copy", season?.key);
      put(values, "closingZodiacSeasonPolarAxis", axis?.body, "copy", axis?.key);
    }
  }
  if (seasons.opening) {
    put(values, "entryDate", formatTime(seasons.opening.startsAt), "fact");
    put(values, "exitDate", formatTime(seasons.opening.endsAt), "fact");
  }
  const timed = events.filter(event => event.phase !== "retrograde-passage");
  const lunations = timed.filter(event => event.type === "lunation" && (event.primary || event.eclipseType));
  const newMoons = lunations.filter(event => event.eclipseType === "solar" || event.glyph === "●");
  const fullMoons = lunations.filter(event => event.eclipseType === "lunar" || event.glyph === "○");
  const changes = timed.filter(event => ["ingress", "station"].includes(event.type) && event.planet !== "Moon");
  const aspects = timed.filter(event => event.type === "aspect" && !event.planets?.includes("Moon"));
  put(values, "lunationDates", timedEvents(lunations) || undefined, "fact");
  if (newMoons.length) {
    put(values, "hasNewMoon", "yes", "fact");
    put(values, "newMoonDate", newMoons.map(event => formatDate(event.startsAt)).join("; "), "fact");
    put(values, "newMoonSign", [...new Set(newMoons.map(event => calendarPreviewSign(event.sign ?? "")))].filter(Boolean).join(", "), "fact");
  }
  if (fullMoons.length) {
    put(values, "hasFullMoon", "yes", "fact");
    put(values, "fullMoonDate", fullMoons.map(event => formatDate(event.startsAt)).join("; "), "fact");
    put(values, "fullMoonSign", [...new Set(fullMoons.map(event => calendarPreviewSign(event.sign ?? "")))].filter(Boolean).join(", "), "fact");
  }
  if (newMoons.some(event => event.eclipseType === "solar")) put(values, "hasSolarEclipse", "yes", "fact");
  if (fullMoons.some(event => event.eclipseType === "lunar")) put(values, "hasLunarEclipse", "yes", "fact");
  put(values, "planetaryChanges", timedEvents(changes) || undefined, "fact");
  put(values, "planetaryAspects", timedEvents(aspects) || undefined, "fact");
  if (days.length) {
    put(values, "monthName", new Intl.DateTimeFormat("en-US", { month: "long", timeZone }).format(new Date(calculation.sky.generatedAt)), "fact");
    put(values, "monthRange", `${formatDate(days[0].date)} – ${formatDate(days[days.length - 1].date)}`, "fact");
  }
  return { values, calculation };
}

export function resolveCalendarMonthlyOverview(
  calendar: LunarCalendarMonth,
  generatedContent?: Map<string, LiveGeneratedContent>
) {
  const template = generatedContent?.get(CALENDAR_MONTHLY_OVERVIEW_KEY);
  const pattern = template?.body?.trim();
  if (!template || !pattern || !isReaderFacingCopy(pattern.replace(/\{\{[^}]+\}\}/gu, "x"))) return null;
  const writing = calendarOverviewWriting(template.sections);
  const { values, calculation } = calendarMonthlyOverviewFacts(calendar, generatedContent);
  const nested: Record<string, string> = {};
  for (const name of overviewFields) {
    const body = writing[name]?.trim();
    if (!body || !isReaderFacingCopy(body.replace(/\{\{[^}]+\}\}/gu, "x"))) continue;
    const text = calendarResolveOverviewField(name, body, values, nested, calculation);
    if (!text.trim() || /\{\{/.test(text) || !isReaderFacingCopy(text)) continue;
    values[name] = { text, kind: "copy", sourceKey: CALENDAR_MONTHLY_OVERVIEW_KEY };
    nested[name] = text;
    if (name === "planetaryHighlights") values.hasPlanetaryHighlights = { text: "yes", kind: "copy", sourceKey: CALENDAR_MONTHLY_OVERVIEW_KEY };
    if (name === "lunationConnection") values.hasLunationConnection = { text: "yes", kind: "copy", sourceKey: CALENDAR_MONTHLY_OVERVIEW_KEY };
  }
  const rendered = calendarTemplateSegments(pattern, values, nested).map(segment => segment.text).join("");
  const paragraphs = readerFacingParagraphs([rendered.replace(/\{\{\s*[\w.]+\s*\}\}/gu, "")]);
  const hasCopy = overviewFields.some(name => values[name]?.kind === "copy")
    || Boolean(values.openingZodiacSeason || values.closingZodiacSeason);
  if (!hasCopy || paragraphs.length === 0) return null;
  return { contentKey: CALENDAR_MONTHLY_OVERVIEW_KEY, paragraphs };
}
