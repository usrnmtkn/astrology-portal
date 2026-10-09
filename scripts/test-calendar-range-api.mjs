import assert from 'node:assert/strict';
import handler from '../api/calendar.ts';
import { getLunarCalendarRangeEvents } from '../apps/web/src/services/ephemeris.ts';
import { getLunarCalendarRangeEventsFromApi } from '../apps/web/src/services/calendarApi.ts';
import { calendarLunarDayNumber } from '../apps/web/src/features/calendar/calendarMoonCycle.ts';

const originalFetch = globalThis.fetch;
let requests = 0;
async function call(url, method = 'GET') {
  const res = { statusCode: 0, headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = value; } };
  await handler({ method, url }, res);
  return res;
}
try {
  const moon = (dateKey, startsAt = `${dateKey}T19:00:00Z`) => ({type: 'lunation', title: 'New Moon', dateKey, startsAt});
  assert.equal(calendarLunarDayNumber({dateKey: '2026-10-08'}, [moon('2026-10-10')]), null,
    'A waning crescent without the preceding New Moon must not be guessed as lunar day 1');
  assert.equal(calendarLunarDayNumber({dateKey: '2026-10-10'}, [moon('2026-10-10')]), 1);
  assert.equal(calendarLunarDayNumber({dateKey: '2026-10-11'}, [moon('2026-10-10')]), 2);
  assert.equal(calendarLunarDayNumber({dateKey: '2026-11-02'}, [moon('2026-10-31', '2026-11-01T03:30:00Z')]), 3,
    'Calendar labels count local dates across DST, not elapsed 24-hour periods');
  assert.equal(calendarLunarDayNumber({dateKey: '2026-11-11'}, [moon('2026-10-10')]), null);
  globalThis.fetch = async (url) => {
    requests++;
    const res = await call(String(url));
    return new Response(res.body, { status: res.statusCode, headers: res.headers });
  };
  for (const timeZone of ['America/New_York', 'Asia/Tokyo']) for (const [start, end] of [
    ['2026-09-22T00:00:00Z', '2026-10-23T00:00:00Z'],
    ['2026-10-25T00:00:00Z', '2026-11-25T00:00:00Z']
  ]) {
    const location = { label: timeZone, latitude: timeZone === 'Asia/Tokyo' ? 35.6762 : 40.7128,
      longitude: timeZone === 'Asia/Tokyo' ? 139.6503 : -74.006, timeZone };
    const before = requests;
    const [first, second] = await Promise.all([
      getLunarCalendarRangeEventsFromApi(location, new Date(start), new Date(end)),
      getLunarCalendarRangeEventsFromApi(location, new Date(start), new Date(end))
    ]);
    assert.equal(requests, before + 1, 'Concurrent seasonal reads share one bounded request');
    assert.equal(first, second);
    assert(first.some(event => event.type === 'lunation'));
    assert.deepEqual(first, JSON.parse(JSON.stringify(await getLunarCalendarRangeEvents(location, new Date(start), new Date(end)))),
      'API facts and exact timestamps must equal the established offline calculation');
  }
  const location = { label: 'Fixture', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
  const start = new Date('2026-09-22T00:00:00Z'), end = new Date('2026-10-23T00:00:00Z');
  for (const params of [
    {start: 'invalid', end: end.toISOString()}, {start: end.toISOString(), end: start.toISOString()},
    {start: start.toISOString(), end: start.toISOString()}, {start: start.toISOString(), end: '2027-01-01T00:00:00Z'},
    {start: start.toISOString(), end: end.toISOString(), lat: '91'}
  ]) {
    const res = await call(`/api/calendar?${new URLSearchParams({mode: 'range', lat: '40', lon: '-74', ...params})}`);
    assert.equal(res.statusCode, 400, 'Invalid/unbounded public calculations must be rejected');
  }
  assert.equal((await call('/api/calendar?mode=range', 'POST')).statusCode, 405);
  globalThis.fetch = async () => Response.json({ok: true, mode: 'range', start: start.toISOString(), end: start.toISOString(), events: []});
  await assert.rejects(getLunarCalendarRangeEventsFromApi(location, start, end), /wrong event range/);
  globalThis.fetch = async () => Response.json({ok: true, mode: 'range', start: start.toISOString(), end: end.toISOString(), events: [null]});
  await assert.rejects(getLunarCalendarRangeEventsFromApi(location, start, end), /wrong event range/);
  globalThis.fetch = async () => new Response('unavailable', {status: 503});
  await assert.rejects(getLunarCalendarRangeEventsFromApi(location, start, end), /503/);
  globalThis.fetch = async url => { const res = await call(String(url)); return new Response(res.body, {status: res.statusCode, headers: res.headers}); };
  assert((await getLunarCalendarRangeEventsFromApi(location, start, end)).length, 'A failed request must allow retry');
  let signal;
  globalThis.fetch = (_url, init) => { signal = init.signal; return new Promise(() => {}); };
  const began = performance.now();
  await assert.rejects(getLunarCalendarRangeEventsFromApi(location, start, end), {name: 'TimeoutError'});
  assert(signal.aborted); assert(performance.now() - began < 9500, 'A hung API must release the offline fallback');
  console.log('PASS Calendar range actual handler/client: four real ephemeris/date/zone comparisons, request coalescing, bounds, identity, retry and deadline.');
} finally { globalThis.fetch = originalFetch; }
