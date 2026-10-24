import { isInitialSkyReaderHash } from "../apps/web/src/services/initialSkyRoute.mjs";
import assert from 'node:assert/strict';
import { matchingInitialSkyLoad, startInitialSkyLoad, type InitialSkyLoad } from '../apps/web/src/services/skyApi';
import { skyDateTimeFromInput, isDateInputValue, transitDateFromUrl } from '../apps/web/src/services/skySelection';

const ny = { label: 'Synthetic New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
const tokyo = { label: 'Synthetic Tokyo', latitude: 35.6, longitude: 139.6, timeZone: 'Asia/Tokyo' };
const now = new Date('2026-09-21T02:30:00Z');
assert.equal(skyDateTimeFromInput('2026-09-20', ny, true, now).toISOString(), now.toISOString());
assert.equal(skyDateTimeFromInput('2026-09-21', tokyo, true, now).toISOString(), now.toISOString());
assert.equal(skyDateTimeFromInput('2026-09-20', tokyo, true, now).toISOString(), '2026-09-20T03:00:00.000Z');
assert.equal(skyDateTimeFromInput('2026-11-01', ny, false, now).toISOString(), '2026-11-01T17:00:00.000Z');
assert.equal(isDateInputValue('2026-02-30'), false);
assert.equal(isDateInputValue('2026-02-28'), true);
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
try {
  for (const [route, expected] of [
    ['/#calendar?view=day&date=2026-09-12', '2026-09-12'],
    ['/?date=2026-09-30#calendar?view=day&date=2026-09-12', '2026-09-12'],
    ['/?date=2026-11-01#calendar?view=day', '2026-11-01'],
    ['/?date=2026-09-30#calendar?date=2026-02-30', '2026-09-30'],
    ['/#calendar?date=2026-02-30', null],
    ['/?date=2026-09-30#sky?date=2026-09-12', '2026-09-30'],
    ['/#sky?date=2026-09-12', null]
  ]) {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { href: `https://example.invalid${route}` } } });
    assert.equal(transitDateFromUrl(), expected, route ?? '');
  }
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}
const day = new Intl.DateTimeFormat('en-CA', { timeZone: ny.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const initial: InitialSkyLoad = { day, location: ny, date: new Date(), live: true, startedAt: performance.now(), result: Promise.resolve(null), matches: () => initial, resolve: async () => { throw new Error("Unused test stub"); } };
assert.equal(matchingInitialSkyLoad(initial, day, ny), initial);
const listInitial={...initial,detail:'placements' as const};
assert.equal(matchingInitialSkyLoad(listInitial,day,ny),null,'A full reader cannot adopt a placement-list bootstrap.');
assert.equal(matchingInitialSkyLoad(listInitial,day,ny,'placements'),listInitial);
assert.equal(matchingInitialSkyLoad({...initial,detail:'full'},day,ny,'placements'),null,'Bootstrap completion must match the requested scope.');
assert.equal(matchingInitialSkyLoad(initial, day, ny), initial, 'StrictMode replay retains the same exact request');
assert.equal(matchingInitialSkyLoad(initial, day, { ...ny, label: 'Renamed' }), initial);
assert.equal(matchingInitialSkyLoad(initial, '2026-01-02', ny), null);
assert.equal(matchingInitialSkyLoad(initial, day, tokyo), null);
assert.equal(matchingInitialSkyLoad(initial, day, { ...ny, timeZone: 'UTC' }), null);
assert.equal(matchingInitialSkyLoad({ ...initial, live: false }, day, ny), null);
assert.equal(matchingInitialSkyLoad({ ...initial, startedAt: performance.now() - 10_001 }, day, ny), null);
console.log('PASS: exact initial instant, selected-zone noon and DST, changed date/location/clock mode, StrictMode reuse and expired bootstrap rejection.');

for (const hash of ['#sky', '#/sky/', '#sky/placement/sun/libra', '#sky/placement/north-node/aquarius', '#sky/placement/venus', '#sky/retrograde/venus', '#/sky/retrograde/neptune/']) assert.equal(isInitialSkyReaderHash(hash), true, hash);
for (const hash of ['#you', '#calendar', '#sky/archive/sun/libra/2026', '#sky/aspect/sun/trine/pluto', '#sky/placement/', '#sky/placement/sun/libra/extra', '#sky/retrograde/', '#sky/retrograde/venus/extra', '#sky?date=2026-10-14', '#sky/placement/sun/libra?access_token=secret']) assert.equal(isInitialSkyReaderHash(hash), false, hash);

try {
  for (const route of ['/admin/content#sky/placement/sun/libra', '/?auth=login#sky/placement/sun/libra', '/?returnTo=%2Fadmin%2Fcontent#sky/retrograde/venus']) {
    const url = new URL(route, 'https://example.invalid');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: url } });
    assert.equal(startInitialSkyLoad(), null, `Protected route must not preload: ${route}`);
  }
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}
