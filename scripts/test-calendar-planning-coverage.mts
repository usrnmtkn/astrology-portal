import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import SwissEph from 'swisseph-wasm';
import { getCalendarSubscriptionEvents, getLunarCalendarMonth, getCalendarPlanningContexts } from '../apps/web/src/services/ephemeris.js';
import { calendarActivityGuidance } from '../src/shared/features/calendar/calendarActivityGuidance.js';
import { calendarSubscriptionFixture } from '../tests/helpers/calendar-subscription-fixture.js';
import { calendarFeedCategories, calendarLocationParams } from '../src/shared/features/calendar/calendarSubscription.js';
import { planetaryHourCycle } from '../src/shared/features/calendar/calendarPlanetaryHours.js';
import { calendarLocalDateKey } from '../src/shared/features/calendar/calendarPhaseLabel.js';
import { calendarFeedDescription } from '../apps/web/src/features/calendar/calendarFeedPreview.js';

const swe = new SwissEph();
await swe.initSwissEph();
const ids: Record<string, number> = { Sun: swe.SE_SUN, Moon: swe.SE_MOON, Mercury: swe.SE_MERCURY,
  Venus: swe.SE_VENUS, Mars: swe.SE_MARS, Jupiter: swe.SE_JUPITER, Saturn: swe.SE_SATURN,
  Uranus: swe.SE_URANUS, Neptune: swe.SE_NEPTUNE, Pluto: swe.SE_PLUTO, Lilith: 13, Chiron: 15, 'North Node': swe.SE_TRUE_NODE };
const angles: Record<string, number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
const norm = (n: number) => (n % 360 + 360) % 360;
function longitude(planet: string, at: string) {
  const date = new Date(at);
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + (date.getUTCSeconds() + date.getUTCMilliseconds() / 1000) / 3600);
  return norm(swe.calc_ut(jd, ids[planet], swe.SEFLG_SWIEPH)[0]);
}
const separation = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const locations = { 'America/New_York': { label: 'New York', latitude: 40.7128, longitude: -74.006 },
  'Pacific/Kiritimati': { label: 'Kiritimati', latitude: 1.8721, longitude: -157.4278 } };
const monday = planetaryHourCycle('2026-10-26', '2026-10-26T11:00:00Z', '2026-10-26T22:00:00Z', '2026-10-27T11:00:00Z');
assert.equal(monday.length, 24);
assert.deepEqual(monday.slice(0, 8).map(hour => hour.ruler), ['Moon', 'Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']);
assert.equal(Date.parse(monday[0].end) - Date.parse(monday[0].start), 55 * 60000);
assert.equal(Date.parse(monday[12].end) - Date.parse(monday[12].start), 65 * 60000);
assert.equal(planetaryHourCycle('2026-10-26', null, null, null).length, 0, 'Polar dates cannot invent sunrise or hours');
for (const [date, duration] of [['2026-03-08', 23], ['2026-11-01', 25]] as const) {
  const [context] = await getCalendarPlanningContexts(date, date, 'America/New_York', locations['America/New_York']);
  const hours = context.planetaryHours.hours;
  assert.equal(hours.reduce((sum, hour) => sum + Date.parse(hour.end) - Date.parse(hour.start), 0), duration * 3600000);
  assert.equal(hours[0].planetaryDate, new Date(Date.parse(`${date}T12:00:00Z`) - 86400000).toISOString().slice(0, 10), 'Predawn belongs to the previous planetary day');
  assert.equal(hours.find(hour => hour.period === 'day' && hour.planetaryDate === date)?.ruler, 'Sun', 'Sunday begins with the Sun at sunrise');
  assert(hours.every((hour, index) => index === 0 || hour.start === hours[index - 1].end), 'DST has no missing or duplicated instant');
}
const [polar] = await getCalendarPlanningContexts('2026-06-21', '2026-06-21', 'Arctic/Longyearbyen', { label: 'Longyearbyen', latitude: 78.2232, longitude: 15.6469 });
assert.equal(polar.planetaryHours.hours.length, 0);
for (const year of [2026, 2027]) {
  const facts = await getCalendarSubscriptionEvents(year);
  for (const planet of ['Chiron', 'North Node']) {
    const contacts = facts.filter(event => event.type === 'aspect' && event.planets?.includes(planet));
    assert(contacts.length > 20);
    for (const event of [contacts[0], contacts.at(-1)!]) {
      const [a, b] = event.planets!;
      assert(Math.abs(separation(longitude(a, event.startsAt), longitude(b, event.startsAt)) - angles[event.aspect!]) < 0.001,
        `${event.title} is exact in independent Swiss calculation at ${event.startsAt}`);
    }
  }
  for (const aspect of ['conjunction', 'opposition']) {
    const event = facts.find(event => event.type === 'aspect' && event.aspect === aspect && !event.planets?.includes('Lilith'))!;
    assert(event, `Calendar detects ${aspect} crossings`);
    assert(Math.abs(separation(longitude(event.planets![0], event.startsAt), longitude(event.planets![1], event.startsAt)) - angles[aspect]) < 0.001);
  }
  assert(facts.filter(event => event.nodeAxis).every(event => event.planets![1] === 'North Node'));
  assert(!facts.some(event => event.planets?.every(body => body.includes('Node'))), 'The nodal axis cannot aspect itself');
  const voids = facts.filter(event => event.type === 'void');
  assert(voids.length > 100);
  for (const event of [voids[0], voids.at(-1)!]) {
    assert(event.endsAt! > event.startsAt);
    const before = new Date(Date.parse(event.endsAt!) - 60000).toISOString();
    const after = new Date(Date.parse(event.endsAt!) + 60000).toISOString();
    assert.notEqual(Math.floor(longitude('Moon', before) / 30), Math.floor(longitude('Moon', after) / 30), 'VOC ends at the calculated ingress');
    assert(Object.keys(ids).filter(p => !['Moon', 'Chiron', 'North Node', 'Lilith'].includes(p)).some(p =>
      Object.values(angles).some(angle => Math.abs(separation(longitude('Moon', event.startsAt), longitude(p, event.startsAt)) - angle) < 0.001)),
    'VOC starts at an exact major lunar aspect to a Sun-through-Pluto body');
    for (const planet of Object.keys(ids).filter(p => !['Moon', 'Chiron', 'North Node', 'Lilith'].includes(p))) {
      for (const target of [0, 60, 90, 120, 180, 240, 270, 300]) {
        let previous: number | undefined;
        for (let at = Date.parse(event.startsAt) + 60000; at < Date.parse(event.endsAt!) - 60000; at += 15 * 60000) {
          const instant = new Date(at).toISOString();
          const distance = norm(longitude('Moon', instant) - longitude(planet, instant) - target + 180) - 180;
          assert(previous === undefined || previous * distance > 0 || Math.abs(distance - previous) >= 180,
            'An independent quarter-hour scan finds no later major lunar aspect inside the VOC interval');
          previous = distance;
        }
      }
    }
  }
  const quarter = facts.filter(event => event.type === 'lunation' && !event.primary);
  assert(quarter.length >= 24 && quarter.length <= 26);
  for (const event of [quarter[0], quarter.at(-1)!]) assert(Math.abs(separation(longitude('Sun', event.startsAt), longitude('Moon', event.startsAt)) - 90) < 0.001);
}

for (const timeZone of ['America/New_York', 'Pacific/Kiritimati']) for (const date of ['2026-03-08', '2026-11-01']) {
  const month = await getLunarCalendarMonth({ label: timeZone, latitude: 0, longitude: 0, timeZone }, new Date(`${date}T00:00:00Z`));
  const shortVoid = month.events.find(event => event.type === 'void' && Date.parse(event.endsAt!) - Date.parse(event.startsAt) < 3 * 3600000)!;
  assert(shortVoid);
  assert(month.days.some(day => day.voidOfCourse?.startsAt === shortVoid.startsAt), 'Short VOC windows must not disappear between noon snapshots');
}

const fixture = await calendarSubscriptionFixture();
try {
  const august = await getLunarCalendarMonth({ label: 'New York', latitude: 0, longitude: 0, timeZone: 'America/New_York' }, new Date('2026-08-13T16:00:00Z'));
  const doubleVoid = august.days.find(day => day.dateKey === '2026-08-13')!;
  assert.equal(doubleVoid.voidOfCoursePeriods?.length, 2, 'A sign change can separate two VOC windows on one civil date');
  assert.notEqual(doubleVoid.voidOfCoursePeriods![0].sign, doubleVoid.voidOfCoursePeriods![1].sign, 'Each period retains its actual Moon sign');
  assert.equal((await fixture.invoke('/api/calendar-subscriptions', 'POST', { include: ['daily-guidance'], reminder: 'None', timeZone: 'UTC' })).status, 400);
  const created = await fixture.invoke('/api/calendar-subscriptions', 'POST', { include: [...calendarFeedCategories], reminder: 'None', timeZone: 'America/New_York', location: locations['America/New_York'] });
  assert.equal(created.status, 201, 'All eleven categories pass option validation');
  const token = created.json().subscription.token;
  const response = await fixture.invoke(`/feed/${token}.ics`);
  assert.equal(response.status, 200);
  const feed = response.body.replace(/\r\n /gu, '');
  assert(feed.includes('CATEGORIES:quarter-moons'));
  assert(feed.includes('CATEGORIES:void-moons'));
  assert(feed.includes('Chiron'));
  assert(feed.includes('North Node'));
  const daily = feed.split('BEGIN:VEVENT').filter(entry => entry.includes('CATEGORIES:daily-guidance'));
  const currentYear = new Date().getUTCFullYear();
  assert.equal(daily.length, (Date.UTC(currentYear + 2, 0, 1) - Date.UTC(currentYear, 0, 1)) / 86400000, 'A complete planning reading is available for each local date across two years');
  assert(response.chunkCount > 1 && response.maxChunkBytes <= 65536, 'The full feed streams bounded chunks instead of a response over the Vercel buffered limit');
  assert(feed.endsWith('END:VCALENDAR\r\n'), 'Streaming preserves the complete calendar');
  const ids = [...feed.matchAll(/\r\nUID:([^\r]+)/gu)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'Overlapping VOC intervals at year boundaries retain one UID');
  for (const date of ['2026-03-08', '2026-11-01']) for (const timeZone of ['America/New_York', 'Pacific/Kiritimati'] as const) {
    const response = await fixture.invoke(`/api/calendar-reading?${new URLSearchParams({ id: `daily-${date}`, date, timeZone, ...calendarLocationParams(locations[timeZone]) })}`);
    assert.equal(response.status, 200);
    const reading = response.json().reading;
    assert.equal(reading.start, date);
    for (const label of ['Love', 'Work', 'Creativity', 'Rest']) assert(reading.body.includes(label));
    assert(!reading.body.includes('{{'));
    assert(reading.body.includes('Venus hours') && reading.body.includes('Moon hours') && !reading.body.includes('Neptune hours'));
    const link = new URLSearchParams(new URL(reading.url).hash.split('?')[1]);
    assert.equal(link.get('latitude'), String(locations[timeZone].latitude));
    if (timeZone === 'America/New_York') {
      const entry = daily.find(entry => entry.includes(`UID:daily-${date}@tldrastro`))!;
      const description = entry.match(/\r\nDESCRIPTION:([^\r]*)/u)![1]
        .replace(/\\([nN,;\\])/gu, (_, escaped) => /n/iu.test(escaped) ? '\n' : escaped);
      assert.equal(description, calendarFeedDescription(reading.body, reading.url, Infinity),
        'The app and full ICS daily entry contain the same guidance');
    }
  }
  const boundaryFacts = (await Promise.all([currentYear, currentYear + 1].map(year =>
    getCalendarSubscriptionEvents(year, { includeLocalYearBoundaries: true })))).flat();
  for (const timeZone of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
    const adjacent = boundaryFacts.filter(event => event.type === 'aspect'
      && (event.startsAt < `${currentYear}-01-01` || event.startsAt >= `${currentYear + 2}-01-01`)
      && calendarLocalDateKey(event.startsAt, timeZone) >= `${currentYear}-01-01`
      && calendarLocalDateKey(event.startsAt, timeZone) <= `${currentYear + 1}-12-31`);
    assert(adjacent.length, 'The boundary fixture has local-year events outside its UTC years');
    const created = await fixture.invoke('/api/calendar-subscriptions', 'POST', { include: ['aspects'], reminder: 'None', timeZone });
    assert.equal(created.status, 201);
    const boundaryFeed = await fixture.invoke(`/feed/${created.json().subscription.token}.ics`);
    assert.equal(boundaryFeed.status, 200);
    for (const event of adjacent) assert(boundaryFeed.body.replace(/\r\n /gu, '').includes(`UID:astro-${createHash('sha256').update(event.id).digest('hex')}@tldrastro`),
      'Local Jan 1 and Dec 31 keep exact events from an adjacent UTC year');
  }
  assert.equal((await fixture.invoke('/api/calendar-reading?id=daily-2026-03-08&date=2026-03-09')).status, 404);
  assert.equal((await fixture.invoke('/api/calendar-reading?id=daily-2026-03-08&date=2026-03-08')).status, 400);
  const context = { id: 'context', title: 'Lunar context', body: 'Complete approved context.' };
  const held = calendarActivityGuidance('2026-10-01', [], () => '', 'UTC', context);
  assert.equal(held.length, 1);
  assert.deepEqual(held[0].activities, ['love', 'work', 'creativity', 'rest']);
  assert.equal(held[0].body, context.body, 'A shared source remains complete, verbatim and displayed once');
  const moonOnly = calendarActivityGuidance('2026-08-13', august.events.filter(event => event.planet === 'Moon'),
    () => 'Complete approved Moon passage.', 'America/New_York', context);
  assert(moonOnly.find(reading => reading.activities.includes('love'))?.event.title.startsWith('Lunar context'),
    'A general Moon passage cannot silently become activity-specific love guidance');
  console.log('PASS calendar planning: two-year direct Swiss checks, short VOCs, DST/local dates, Chiron/True Node, quarter moons, all categories, 730 complete daily entries and source preservation.');
} finally { await fixture.close(); }
