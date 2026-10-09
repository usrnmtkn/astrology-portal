import { calendarMoonSources } from './calendarMoonSources';
import { useEffect, useMemo, useState } from 'react';
import type { LocationInput, SkySnapshot } from '../../types';
import type { LunarCalendarMonth } from '../../services/ephemeris';
import type { LiveGeneratedContent } from '../../services/generatedContent';
import { getSkyOnlineFirst } from '../../services/skyApi';
import { zonedDateTimeToUtc } from '../../services/timezones';
import { calendarPassageKey, resolveCalendarPassage } from './calendarPassageTemplates';
import { calendarDailyPassageValues, calendarPassageDate, calendarPeriodPassageValues } from './calendarPassageAssembly';

export function calendarPassageRequestKeys(dates: string[], timeZone: string) {
  return [...new Set(['daily', 'weekly', 'monthly'].flatMap(period => {
    const kind = period as 'daily' | 'weekly' | 'monthly';
    return [calendarPassageKey(kind), ...dates.map(date => calendarPassageKey(kind, calendarPassageDate(kind, date, []), timeZone))];
  }))];
}
export function useCalendarPassages(calendar: LunarCalendarMonth | null, dates: string[], selected: string, location: LocationInput, content?: Map<string, LiveGeneratedContent>, retry = 0) {
  const timeZone = location.timeZone || 'UTC';
  const active = Boolean(content && [...content.keys()].some(key => key.startsWith('calendar-passage/')));
  const key = active ? `${timeZone}|${location.latitude}|${location.longitude}|${dates.join(',')}|${retry}` : '';
  const [state, setState] = useState<{ key: string; skies?: Map<string, SkySnapshot>; error?: boolean }>({ key: '' });
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void Promise.all(dates.map(async date => [date, await getSkyOnlineFirst(location, zonedDateTimeToUtc(date, '12:00 PM', timeZone), false)] as const))
      .then(rows => { if (!cancelled) setState({ key, skies: new Map(rows) }); })
      .catch(() => { if (!cancelled) setState({ key, error: true }); });
    return () => { cancelled = true; };
  }, [key]);
  return useMemo(() => {
    const daily = new Map<string, NonNullable<ReturnType<typeof resolveCalendarPassage>>>();
    if (!active || !calendar || !content || state.key !== key || !state.skies) return { daily, weekly: null, monthly: null, loading: Boolean(active && (state.key !== key || !state.error && !state.skies)), error: active && state.key === key && state.error };
    for (const date of dates) {
      const values = calendarDailyPassageValues(calendar, date, state.skies.get(date), content, calendarMoonSources);
      const passage = resolveCalendarPassage('daily', date, timeZone, content, values);
      if (passage) daily.set(date, passage);
    }
    return { daily,
      weekly: resolveCalendarPassage('weekly', calendarPassageDate('weekly', selected, calendar.days), timeZone, content, calendarPeriodPassageValues('weekly', calendar, selected, state.skies, content, calendarMoonSources)),
      monthly: resolveCalendarPassage('monthly', calendarPassageDate('monthly', selected, calendar.days), timeZone, content, calendarPeriodPassageValues('monthly', calendar, selected, state.skies, content, calendarMoonSources)),
      loading: false, error: false };
  }, [active, calendar, content, state, key, selected]);
}
