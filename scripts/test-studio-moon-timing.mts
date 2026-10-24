import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAstrodienstSky, getLunarCalendarWeek } from '../apps/web/src/services/ephemeris';
import { zonedDateTimeToUtc } from '../apps/web/src/services/timezones';
import { calendarMoonCycleFactsForDays } from '../src/shared/features/calendar/calendarMoonCycle';
import { calendarPassageMoonTiming } from '../apps/admin/src/calendarPassageMoonTiming';
import { calendarPassageVariableLabel, calendarPassageVariableHelp, variableLabel } from '../apps/admin/src/variablePresentation';

test('Moon timing labels are scoped to passage variables and explain the retained tokens', () => {
  assert.equal(calendarPassageVariableLabel('moonSign'), 'Moon sign at start of day');
  assert.equal(variableLabel('moonSign'), 'Moon Sign');
  assert.match(calendarPassageVariableHelp('nextMoonSign')!, /later date/);
  assert.match(calendarPassageVariableHelp('nextMoonSignEntryTime')!, /date and time zone/);
  assert.equal(calendarPassageMoonTiming(undefined, '2026-10-21', 'Aquarius'), null);
});

for (const scenario of [
  { date: '2026-10-21', zone: 'America/New_York', start: 'Aquarius', noon: 'Pisces', change: /Aquarius → Pisces · Oct 21, 2026, 8:35 AM EDT/ },
  { date: '2026-10-22', zone: 'America/New_York', start: 'Pisces', noon: 'Pisces', next: /Pisces → Aries · Oct 23, 2026, 3:53 PM EDT/ },
  { date: '2026-10-23', zone: 'America/New_York', start: 'Pisces', noon: 'Pisces', change: /Pisces → Aries · Oct 23, 2026, 3:53 PM EDT/ },
  { date: '2026-10-21', zone: 'Asia/Tokyo', start: 'Aquarius', noon: 'Aquarius', change: /Aquarius → Pisces · Oct 21, 2026, 9:35 PM GMT\+9/ },
  { date: '2026-10-24', zone: 'Asia/Tokyo', start: 'Pisces', noon: 'Aries', change: /Pisces → Aries · Oct 24, 2026, 4:53 AM GMT\+9/ },
]) test(`Moon timing matches direct ephemeris at midnight and noon: ${scenario.date} ${scenario.zone}`, async () => {
  const location = { label: 'Geocentric reference', latitude: 0, longitude: 0, timeZone: scenario.zone };
  const noon = zonedDateTimeToUtc(scenario.date, '12:00 PM', scenario.zone);
  const [calendar, startSky, sky] = await Promise.all([
    getLunarCalendarWeek(location, noon),
    getAstrodienstSky(location, zonedDateTimeToUtc(scenario.date, '12:00 AM', scenario.zone)),
    getAstrodienstSky(location, noon),
  ]);
  const facts = calendarMoonCycleFactsForDays(calendar.days, [...calendar.events, ...(calendar.cycleEvents ?? [])], scenario.zone).get(scenario.date)!;
  const calculation = { ...calendar, sky, timeZone: scenario.zone };
  const before = JSON.stringify(calculation);
  const timing = calendarPassageMoonTiming(calculation, scenario.date, facts.moonSign)!;
  assert.equal(startSky.calculationProvenance?.actualEphemeris, 'swiss');
  assert.equal(sky.calculationProvenance?.actualEphemeris, 'swiss');
  assert.equal(timing.startingSign, scenario.start);
  assert.equal(timing.startingSign, startSky.positions.find(p => p.planet === 'Moon')!.sign);
  assert.equal(timing.readerSign, scenario.noon);
  assert.equal(timing.readerSign, sky.positions.find(p => p.planet === 'Moon')!.sign);
  if (scenario.change) assert.match(timing.change!, scenario.change);
  else {
    assert.equal(timing.change, 'No Moon sign change this local day.');
    assert.match(timing.nextChange!, scenario.next!);
  }
  assert.equal(JSON.stringify(calculation), before, 'Labels must not mutate calculated facts.');
});
