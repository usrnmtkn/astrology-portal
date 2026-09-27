import {calendarLunationMacroKey} from '../features/calendar/calendarDayMoonReading.js';
/** One date-specific identity shared by Studio, Calendar and the Sky article. */
export function datedLunationContentKey(event: {startsAt: string; sign?: string; phase?: string; eclipseType?: string | null; title?: string; glyph?: string}) {
  const phase = event.eclipseType === 'solar' ? 'new-moon' : event.eclipseType === 'lunar' ? 'full-moon'
    : ['new-moon','full-moon'].includes(event.phase ?? '') ? event.phase
    : /new moon/iu.test(event.title ?? '') || event.glyph === '●' ? 'new-moon'
    : /full moon/iu.test(event.title ?? '') || event.glyph === '○' ? 'full-moon' : null;
  const sign = event.sign?.toLowerCase();
  const instant = Date.parse(event.startsAt);
  if (!phase || !sign || !/^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$/u.test(sign) || !Number.isFinite(instant)) return '';
  return `cms/lunation-article/${new Date(instant).toISOString().slice(0,10)}/${phase}/${sign}`;
}

export function lunationReaderContentKeys(event:Parameters<typeof datedLunationContentKey>[0]) {
  return [datedLunationContentKey(event),calendarLunationMacroKey({title:event.title??'',sign:event.sign,eclipseType:event.eclipseType??undefined},event.sign??'')].filter(Boolean);
}
