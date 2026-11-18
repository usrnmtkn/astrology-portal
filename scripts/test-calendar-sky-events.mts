import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import SwissEph from 'swisseph-wasm';
import { calendarSkyEventRoute, parseCalendarSkyEventRoute, calendarSkyEventMatches } from '../apps/web/src/services/calendarSkyEventIdentity';
import type { LunarCalendarEvent } from '../apps/web/src/services/ephemeris';
import { skyV4LunationRoute } from '../apps/web/src/features/sky/skyV4ProductSurface';

const cases = JSON.parse(readFileSync('tests/fixtures/calendar-sky-event-cases.json', 'utf8')) as { key: string; event: LunarCalendarEvent }[];
assert.equal(cases.length, 231);
const groups = Object.fromEntries(['ingress', 'return-ingress', 'station', 'lunation', 'classification', 'passage']
  .map(group => [group, cases.filter(c => c.key.startsWith(group + '/')).length]));
assert.deepEqual(groups, { ingress: 120, 'return-ingress': 8, station: 18, lunation: 72, classification: 4, passage: 9 });
const cache = path.join(process.cwd(), 'node_modules/.cache/tldrastro');
await mkdir(cache, { recursive: true });
const directory = await mkdtemp(path.join(cache, 'calendar-sky-events-'));
try {
  const outfile = path.join(directory, 'actual.mjs');
  await build({ entryPoints: ['apps/web/src/services/ephemeris.ts'], outfile, bundle: true, platform: 'node', format: 'esm',
    external: ['swisseph-wasm'], define: { 'import.meta.env': '{}' }, logLevel: 'silent' });
  const actual = await import(pathToFileURL(outfile).href);
  const swiss = new SwissEph();
  await swiss.initSwissEph();
  const location = { label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
  const ids = { Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Saturn: 6, Uranus: 7, Neptune: 8, Pluto: 9, Chiron: 15, Lilith: 13, 'North Node': 11 };
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const norm = (value: number) => (value % 360 + 360) % 360;
  const calc = (at: string | number, planet: string) => {
    const date = new Date(at);
    const jd = swiss.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600);
    return swiss.calc_ut(jd, ids[planet as keyof typeof ids], swiss.SEFLG_SWIEPH | swiss.SEFLG_SPEED);
  };
  const snapshotFamilies = new Set<string>();
  let crossSignEclipses = 0;
  for (const { key, event } of cases) {
    const route = calendarSkyEventRoute(event);
    assert(route, key);
    const identity = parseCalendarSkyEventRoute(route)!;
    const events = await actual.getLunarCalendarDayEvents(location, identity.date);
    assert.equal(events.filter((e: LunarCalendarEvent) => calendarSkyEventMatches(identity, e)).length, 1, `${key}: actual Calendar identity reconstructs uniquely on reload`);
    const family = key.startsWith('ingress/Moon/') ? key : key.split('/').slice(0, key.startsWith('station/') ? 3 : 2).join('/');
    const snapshot = snapshotFamilies.has(family) ? null : await actual.getCalendarSkyEventSnapshot(location, route);
    if (snapshot) {
      snapshotFamilies.add(family);
      assert.equal(snapshot.sky.calculationProvenance.actualEphemeris, 'swiss');
      assert(snapshot.sky.calculationProvenance.returnedEphemerisFlags.every((flag: number) => (flag & swiss.SEFLG_SWIEPH) !== 0 && (flag & swiss.SEFLG_MOSEPH) === 0));
      for (const planet of Object.keys(ids)) {
        const expected = calc(snapshot.sky.generatedAt, planet);
        const position = snapshot.sky.positions.find((p: any) => p.planet === planet);
        assert(position, `${key}: ${planet}`);
        assert.equal(position.longitude, Number(norm(expected[0]).toFixed(4)), `${key}: ${planet} direct Swiss longitude`);
        assert.equal(position.speed, Number(expected[3].toFixed(6)), `${key}: ${planet} direct Swiss speed`);
      }
    } else assert(snapshotFamilies.has(family), `${key}: snapshot must load`);
    const at = Date.parse(event.startsAt);
    if (event.type === 'ingress') {
      assert.equal(signs[Math.floor(norm(calc(at - 120000, event.planet!)[0]) / 30)], event.fromSign, `${key}: before ingress`);
      assert.equal(signs[Math.floor(norm(calc(at + 120000, event.planet!)[0]) / 30)], event.toSign, `${key}: after ingress`);
    }
    if (event.type === 'station' && event.phase?.startsWith('station-')) {
      const before = calc(at - 6 * 3600000, event.planet!)[3], after = calc(at + 6 * 3600000, event.planet!)[3];
      assert(before * after < 0, `${key}: native speed crosses zero`);
      assert.equal(after < 0 ? 'retrograde' : 'direct', event.direction);
      assert.equal(snapshot!.eventPosition.motion, event.direction);
      if (event.direction === 'retrograde' && event.planet !== 'Lilith') {
        assert(Math.abs(Date.parse(snapshot!.eventPosition.retrogradeStart) - at) < 2000, `${key}: cycle belongs to the selected station`);
        const history = await actual.getRetrogradeHistory({ planet: event.planet!, sign: event.sign,
          referenceDate: new Date(at + 60_000) });
        assert.equal(history.status, 'ready', `${key}: station history resolves on the retrograde side of the root`);
        assert(Math.abs(Date.parse(history.current.retrograde.instant) - at) < 2000,
          `${key}: history retains the actual selected station`);
      }
    }
    if (event.type === 'lunation') {
      const phase = norm(calc(at, 'Moon')[0] - calc(at, 'Sun')[0]);
      const target = /First Quarter/iu.test(event.title) ? 90 : /Last Quarter/iu.test(event.title) ? 270 : /New Moon/iu.test(event.title) ? 0 : 180;
      assert(Math.abs(((phase - target + 540) % 360) - 180) < .001, `${key}: direct native phase angle`);
      if (/^lunation\/(?:solar|lunar)\//u.test(key)) {
        const eventSky = snapshot?.sky ?? await actual.getAstrodienstSky(location, new Date(at), {
          includeTransitWindows: false, includeDailyEvents: false, includeAspectTiming: false
        });
        const distance = Math.abs(((calc(at, 'Moon')[0] - calc(at, 'North Node')[0] + 540) % 360) - 180);
        const relation = distance < 90 ? 'north-node' : 'south-node';
        assert.equal(skyV4LunationRoute({ ...event, eclipseType: key.split('/')[1] as 'solar' | 'lunar' }, eventSky.positions)?.nodeRelation,
          relation, `${key}: eclipse reading follows the actual true-node angle`);
        const closestLongitude = norm(calc(at, 'North Node')[0] + (relation === 'south-node' ? 180 : 0));
        if (signs[Math.floor(closestLongitude / 30)] !== event.sign) crossSignEclipses++;
      }
    }
  }
  assert(crossSignEclipses >= 2, 'The native matrix must include eclipses across a node sign boundary.');
  const example = calendarSkyEventRoute(cases[0].event)!;
  for (const timeZone of ['Asia/Tokyo', 'Europe/London']) {
    for (const key of ['ingress/Moon/Leo', 'station/Venus/direct', 'passage/Mars']) {
      const event = cases.find(c => c.key === key)!.event;
      const snapshot = await actual.getCalendarSkyEventSnapshot({ ...location, timeZone }, calendarSkyEventRoute(event));
      assert(snapshot, `${key}: selected zone ${timeZone} reconstructs the event`);
      assert.equal(snapshot.sky.location.timeZone, timeZone);
      if (event.phase !== 'retrograde-passage') assert(Math.abs(Date.parse(snapshot.sky.generatedAt) - Date.parse(event.startsAt)) < 2000);
      for (const planet of Object.keys(ids)) assert.equal(snapshot.sky.positions.find((p: any) => p.planet === planet).longitude,
        Number(norm(calc(snapshot.sky.generatedAt, planet)[0]).toFixed(4)), `${key} ${timeZone}: ${planet} direct Swiss longitude`);
    }
  }
  assert.equal(await actual.getCalendarSkyEventSnapshot(location, example.replace('/sun/', '/moon/')), null, 'Forged event identities cannot borrow another reading.');
  assert.equal(await actual.getCalendarSkyEventSnapshot(location, example.replace('2020-', '1799-')), null);
  for (const route of ['sky/event/ingress/sun/aries/at/invalid', 'sky/event/lunation/full-moon/aries/at/%ZZ']) assert.equal(parseCalendarSkyEventRoute(route), null);
  console.log(`PASS ${cases.length} real Calendar-to-Sky event identities; ${snapshotFamilies.size} dated snapshots with all 13 direct Swiss positions; ingress boundaries, both station directions, lunar angles and invalid routes.`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
