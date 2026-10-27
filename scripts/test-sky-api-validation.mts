import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Exercise the actual handler while counting calculation calls. Bad inputs must
// never normalize into a different location/date or start an expensive full read.
const directory = await mkdtemp(join(tmpdir(), 'sky-validation-'));
try {
  const outfile = join(directory, 'handler.mjs');
  await build({
    stdin: { contents: "export { default as handler } from './api/sky.ts'; export * from './apps/web/src/services/ephemeris.js';", resolveDir: process.cwd() },
    outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'isolated-calculation', setup(builder) {
      builder.onResolve({ filter: /\/(ephemeris|astrologyFacts)\.js$/ }, args => ({ path: args.path.endsWith('/astrologyFacts.js') ? 'astrologyFacts' : 'ephemeris', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.includes('astrologyFacts') ? `
        export const ASTROLOGY_CALCULATION_CONTRACT = { calculationVersion: 'tldrastro-calculation-v4' };
        export const factsFromSkySnapshot = () => [];
      ` : `
        export const calls = [];
        let fail = false;
        export function setFailure(value) { fail = value; }
        export function getAstrodienstSky(location, date, options) {
          calls.push({ location, date, options });
          if (fail) throw new Error('Synthetic engine failure');
          return { generatedAt: date.toISOString(), location, calculationProvenance: {} };
        }
        export function getLunarCalendarDayEvents() { return []; }
      ` }));
    } }]
  });
  const { handler, calls, setFailure } = await import(pathToFileURL(outfile).href);
  const base = { at: '2026-10-14T12:00:00Z', lat: '40.7128', lon: '-74.006', timeZone: 'America/New_York', version: 'tldrastro-calculation-v4', detail: 'core' };
  async function invoke(overrides = {}, method = 'GET') {
    const response = { statusCode: 0, headers: {} as Record<string, string>, payload: {} as any,
      setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; },
      end(body: string) { this.payload = JSON.parse(body); } };
    await handler({ method, url: `/api/sky?${new URLSearchParams({ ...base, ...overrides })}` }, response);
    return response;
  }
  const invalid = [
    ...['', ' ', 'NaN', '91', '-91'].map(lat => ({ lat })),
    ...['', ' ', 'Infinity', '181', '-181'].map(lon => ({ lon })),
    ...['', 'invalid', '2026-02-30', '2025-02-29T12:00:00Z', '2026-02-30T01:00:00-05:00', '2026-10-14T24:00:00Z', '2026-10-14T12:00:00', '1799-01-01', '2400-01-01'].map(at => ({ at })),
    { detail: 'other' }, { detail: '' }, { version: 'other' }, { version: 'tldrastro-calculation-v3' }, { timeZone: 'invalid/zone' }
  ];
  for (const input of invalid) {
    const before = calls.length, response = await invoke(input);
    assert.equal(response.statusCode, 400, `Invalid input must fail: ${JSON.stringify(input)}`);
    assert.equal(response.headers['cache-control'], 'private, no-store');
    assert.equal(calls.length, before, 'Rejected inputs must not launch calculation');
    assert.equal(response.payload.sky, undefined);
  }
  for (const [at, expected] of [
    ['2024-02-29', '2024-02-29T00:00:00.000Z'],
    ['2026-11-01T01:30:00-04:00', '2026-11-01T05:30:00.000Z'],
    ['2026-11-01T01:30:00-05:00', '2026-11-01T06:30:00.000Z'],
    ['2026-01-01T00:30:00+14:00', '2025-12-31T10:30:00.000Z']
  ]) {
    const response = await invoke({ at, lat: '0', lon: '0' });
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.sky.generatedAt, expected);
    assert.equal(response.payload.sky.location.latitude, 0);
  }
  const full = await invoke({ detail: 'full' });
  assert.equal(full.statusCode, 200);
  assert.equal(calls.at(-1).options.includeTransitWindows, true);
  const beforeMethod = calls.length, method = await invoke({}, 'POST');
  assert.equal(method.statusCode, 405); assert.equal(method.headers.allow, 'GET');
  assert.equal(calls.length, beforeMethod);
  setFailure(true);
  assert.equal((await invoke()).statusCode, 503);
  console.log(`PASS Sky validation: ${invalid.length} invalid requests rejected before calculation; zero coordinates, leap dates, DST offsets, full details and server failures preserved`);
} finally { await rm(directory, { recursive: true, force: true }); }
