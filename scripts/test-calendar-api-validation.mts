import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Bundle the actual HTTP handler with an isolated calculation adapter. Invalid
// requests must stop before any expensive calculation; engine failures remain
// retryable server errors. Direct ephemeris/date parity is checked separately.
const directory = await mkdtemp(join(tmpdir(), 'calendar-validation-'));
try {
  const outfile = join(directory, 'handler.mjs');
  await build({
    stdin: { contents: "export { default as handler } from './api/calendar.ts'; export * from './apps/web/src/services/ephemeris.js';", resolveDir: process.cwd() },
    outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'isolated-calculation', setup(builder) {
      builder.onResolve({ filter: /\/ephemeris\.js$/ }, () => ({ path: 'ephemeris', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export const calls = [];
        let fail = false;
        export function setFailure(value) { fail = value; }
        function calculate(...args) { calls.push(args); if (fail) throw new Error('Synthetic engine failure'); return {anchor: args[1].toISOString()}; }
        export const getLunarCalendarWeek = calculate, getLunarCalendarMonth = calculate, getLunarCalendarRangeEvents = calculate;
      ` }));
    } }]
  });
  const { handler, calls, setFailure } = await import(pathToFileURL(outfile).href);
  const base = { mode: 'week', detail: 'basic', date: '2026-11-01', lat: '40.7128', lon: '-74.006', timeZone: 'America/New_York' };
  async function invoke(overrides = {}, method = 'GET') {
    const params = new URLSearchParams({ ...base, ...overrides });
    const response = { statusCode: 0, headers: {} as Record<string, string>, payload: {} as any,
      setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; },
      end(body: string) { this.payload = JSON.parse(body); } };
    await handler({ method, url: `/api/calendar?${params}` }, response);
    return response;
  }
  const invalid = [
    ...['not-a-date', '2026-02-30', '2026-13-01', '2026-00-01', '2026-01-00', '2026-01-32', '2025-02-29', '', '2026-11-01T00:00:00Z'].map(date => ({ date })),
    { lat: '' }, { lat: ' ' }, { lat: '91' }, { lat: '-91' }, { lon: '' }, { lon: '181' }, { lon: '-181' },
    { timeZone: 'invalid/zone' }, { mode: 'other' }, { detail: 'other' },
    { mode: 'range', start: 'invalid', end: '2026-11-02' },
    { mode: 'range', start: '2026-11-02', end: '2026-11-01' },
    { mode: 'range', start: '2026-01-01', end: '2026-03-01' },
    { mode: 'range', start: '2026-11-01', end: '2026-11-02', lat: '91' }
  ];
  for (const input of invalid) {
    const before = calls.length;
    const response = await invoke(input);
    assert.equal(response.statusCode, 400, `Invalid input must fail: ${JSON.stringify(input)}`);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(calls.length, before, 'Rejected inputs must not launch calculation');
    assert.equal(response.payload.ok, false);
  }
  for (const [mode, date, anchor] of [
    ['week', '2026-11-01', '2026-11-01T17:00:00.000Z'],
    ['month', '2026-03-08', '2026-03-08T16:00:00.000Z'],
    ['week', '2024-02-29', '2024-02-29T17:00:00.000Z']
  ]) {
    const response = await invoke({ mode, date });
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.calendar.anchor, anchor);
    assert.match(response.headers['cache-control'], /max-age=300/);
  }
  const range = await invoke({ mode: 'range', start: '2026-11-01T00:00:00Z', end: '2026-11-02T00:00:00Z' });
  assert.equal(range.statusCode, 200);
  const beforeMethod = calls.length;
  const method = await invoke({}, 'POST');
  assert.equal(method.statusCode, 405);
  assert.equal(method.headers.allow, 'GET');
  assert.equal(method.headers['cache-control'], 'no-store');
  assert.equal(calls.length, beforeMethod);
  setFailure(true);
  for (const input of [{}, { mode: 'month' }, { mode: 'range', start: '2026-11-01', end: '2026-11-02' }]) {
    const response = await invoke(input);
    assert.equal(response.statusCode, 503, 'Calculation outages must remain distinct from invalid requests');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.payload.ok, false);
  }
  console.log(`PASS Calendar validation: ${invalid.length} rejected requests, valid civil dates/DST/leap day/range, method and three calculation failures`);
} finally { await rm(directory, { recursive: true, force: true }); }
