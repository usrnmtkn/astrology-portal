import type { SkySnapshot } from '../../types';
import type { LunarCalendarDay, LunarCalendarEvent, LunarCalendarMonth } from '../../../../apps/web/src/services/ephemeris';
import type { LiveGeneratedContent } from '../../../../apps/web/src/services/generatedContent';
import type { CalendarOverviewValue } from './calendarOverviewResolve';
import { calendarSunSummary } from './calendarDaySummary';
import { calendarMoonCycleFactsForDays } from './calendarMoonCycle';
import type { CalendarMoonSources } from './calendarMoonSourcesCore';
import { calendarMoonWritingParagraphs } from './calendarDayMoonReading';
import { calendarMonthlyOverviewFacts, resolveCalendarMonthlyOverview } from './monthlyOverview';
import type { CalendarPassagePeriod } from './calendarPassageTemplates';

export type CalendarPassageContext = { days: LunarCalendarDay[]; events: LunarCalendarEvent[]; cycleEvents?: LunarCalendarEvent[]; seasonIngresses?: LunarCalendarEvent[]; timeZone: string };
export function calendarPassageDate(period: CalendarPassagePeriod, selected: string, days: LunarCalendarDay[]) {
  if (period === 'daily') return selected;
  if (period === 'monthly') return `${selected.slice(0, 7)}-01`;
  // Use the same Sunday-start week as the reader's Calendar strip.
  const date = new Date(`${selected}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}
export function calendarDailyPassageValues(context: CalendarPassageContext, date: string, sky: SkySnapshot | undefined | null, content: Map<string, LiveGeneratedContent>, moonSources: CalendarMoonSources) {
  const { days, events, cycleEvents, timeZone } = context;
  const { calendarMoonResolvedByDate, moonWritingForDay, packagedWeeklyMoon } = moonSources;
  const day = days.find(day => day.dateKey === date);
  if (!day) return {};
  const factsByDate = calendarMoonCycleFactsForDays(days, [...(cycleEvents ?? []), ...events], timeZone);
  const facts = factsByDate.get(date);
  const resolved = calendarMoonResolvedByDate(days, factsByDate, content);
  const moon = moonWritingForDay(day, content, packagedWeeklyMoon(day, facts, content, resolved));
  const paragraphs = moon.flatMap(piece => calendarMoonWritingParagraphs([piece], piece.role === 'lunation' ? 1 : undefined));
  const lunation = day.events.find(event => event.type === 'lunation' && (event.primary || event.eclipseType));
  const lunarLink = lunation && moon.some(piece => piece.role === 'lunation')
    ? `\n\n[Read more](?date=${date}#sky/lunation/${date}/${(lunation.sign || day.moonSign).toLowerCase()})` : '';
  const sun = sky?.positions.find(position => position.planet === 'Sun');
  const sunParts = calendarSunSummary(sky ?? null, content, day.events);
  const values: Record<string, CalendarOverviewValue> = {};
  const fact = (name: string, text: string | undefined) => { if (text) values[name] = { text, kind: 'fact' }; };
  fact('date', new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone }).format(new Date(day.date)));
  fact('sunSign', sun?.sign); fact('moonSign', facts?.moonSign || day.moonSign); fact('moonPhase', day.moonPhase);
  fact('nextMoonSign', facts?.nextMoonSign); fact('nextMoonSignEntryTime', facts?.nextMoonSignEntryTime); fact('seasonName', facts?.seasonName);
  const position = sunParts.filter(part => part.action === 'sun').map(part => part.text).join('');
  fact('sunPosition', position);
  if (sunParts.length) values.sunSummary = { text: sunParts.map(part => part.action === 'sun'
    ? `[${part.text}](?date=${date}#sky/placement/sun/${sun?.sign.toLowerCase()})` : part.text).join(''), kind: 'copy', sourceKey: sunParts.find(part => part.sourceKey)?.sourceKey };
  if (paragraphs.length) values.moonWriteup = { text: paragraphs.join('\n\n') + lunarLink, kind: 'copy', sourceKey: moon[0]?.contentKey };
  return values;
}
export function calendarPeriodPassageValues(period: CalendarPassagePeriod, context: CalendarPassageContext, date: string, skies: ReadonlyMap<string, SkySnapshot>, content: Map<string, LiveGeneratedContent>, moonSources: CalendarMoonSources) {
  if (period === 'daily') return calendarDailyPassageValues(context, date, skies.get(date), content, moonSources);
  const start = calendarPassageDate(period, date, context.days);
  const days = context.days.filter(day => period === 'monthly' ? day.dateKey.startsWith(date.slice(0, 7)) : day.dateKey >= start && day.dateKey < new Date(Date.parse(`${start}T12:00Z`) + 7 * 86400000).toISOString().slice(0, 10));
  const dates = new Set(days.map(day => day.dateKey));
  const calendar = { ...context, days: days.map(day => ({ ...day, inMonth: true })), events: [...context.events.filter(event => dates.has(event.dateKey)), ...(context.seasonIngresses ?? context.events.filter(event => event.planet === "Sun" && event.type === "ingress"))].filter((event, index, all) => all.findIndex(other => other.id === event.id) === index) } as LunarCalendarMonth;
  const { values } = calendarMonthlyOverviewFacts(calendar, content);
  if (values.monthRange) values.weekRange = values.monthRange;
  if (period === 'monthly') {
    const overview = resolveCalendarMonthlyOverview(calendar, content);
    if (overview) values.overview = { text: overview.paragraphs.join('\n\n'), kind: 'copy', sourceKey: overview.contentKey };
  }
  for (const day of days) {
    const name = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: context.timeZone }).format(new Date(day.date)).toLowerCase();
    const dayValues = calendarDailyPassageValues(context, day.dateKey, skies.get(day.dateKey), content, moonSources);
    if (dayValues.date) values[`${name}Date`] = dayValues.date;
    if (dayValues.moonWriteup) values[`${name}Writeup`] = dayValues.moonWriteup;
  }
  return values;
}
/** Expand complete copy for this date. Preserve explicit tokens; rendered words
 * cannot identify their source fact (the Sun and Moon may share a sign). */
export function calendarEditablePassage(body: string, values: Record<string, CalendarOverviewValue>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/gu, (token, name) => {
    return values[name]?.kind === 'copy' && values[name].text ? values[name].text : token;
  });
}
