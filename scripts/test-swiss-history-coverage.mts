import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import SwissEph from 'swisseph-wasm';

const cacheRoot = path.join(process.cwd(), 'node_modules/.cache/tldrastro');
await mkdir(cacheRoot, { recursive: true });
const directory = await mkdtemp(path.join(cacheRoot, 'swiss-history-coverage-'));
try {
  const outfile = path.join(directory, 'actual.mjs');
  await build({
    stdin: { contents: "export {default as handler} from './api/sky.ts'; export * from './apps/web/src/services/ephemeris.ts';", resolveDir: process.cwd() },
    outfile, bundle: true, platform: 'node', format: 'esm', external: ['swisseph-wasm'],
    define: { 'import.meta.env': '{}' }, logLevel: 'silent',
    plugins: [{ name: 'actual-history-test-access', setup(builder) {
      builder.onLoad({ filter: /\/services\/ephemeris\.ts$/ }, args => ({ loader: 'ts',
        contents: readFileSync(args.path, 'utf8') + '\nexport {calculateSwissUt, previousSameSignResidencyFor, SwissEphemerisCoverageError};',
        resolveDir: path.dirname(args.path) }));
    } }]
  });
  const actual = await import(pathToFileURL(outfile).href);
  const swiss = new SwissEph();
  await swiss.initSwissEph();
  const location = { label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
  const ids = [['Sun', 0], ['Moon', 1], ['Mercury', 2], ['Venus', 3], ['Mars', 4], ['Jupiter', 5],
    ['Saturn', 6], ['Uranus', 7], ['Neptune', 8], ['Pluto', 9], ['Chiron', 15], ['Lilith', 13], ['North Node', 11]] as const;
  const norm = (value: number) => (value % 360 + 360) % 360;
  const julianDay = (date: Date) => swiss.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600);
  for (const at of ['2026-11-04T17:00:00Z', '2044-08-12T16:00:00Z', '2044-08-13T16:00:00Z', '2044-08-14T16:00:00Z', '2045-08-13T16:00:00Z']) {
    const response = { statusCode: 0, body: '', setHeader() {}, end(body: string) { this.body = body; } };
    await actual.handler({ method: 'GET', url: `/api/sky?${new URLSearchParams({ at, lat: String(location.latitude), lon: String(location.longitude), timeZone: location.timeZone, version: 'tldrastro-calculation-v4', detail: 'full' })}` }, response);
    assert.equal(response.statusCode, 200, `${at}: actual full Sky handler must succeed`);
    const { sky } = JSON.parse(response.body);
    assert.equal(sky.calculationProvenance.actualEphemeris, 'swiss');
    assert.equal(sky.calculationProvenance.lilithType, 'true');
    assert.equal(sky.calculationProvenance.nodeType, 'true');
    assert(sky.calculationProvenance.returnedEphemerisFlags.every((flag: number) => (flag & swiss.SEFLG_SWIEPH) !== 0 && (flag & swiss.SEFLG_MOSEPH) === 0));
    for (const [planet, id] of ids) {
      const expected = swiss.calc_ut(julianDay(new Date(at)), id, swiss.SEFLG_SWIEPH | swiss.SEFLG_SPEED);
      const position = sky.positions.find((p: any) => p.planet === planet);
      assert.equal(position.longitude, Number(norm(expected[0]).toFixed(4)), `${at} ${planet}: direct Swiss longitude`);
      assert.equal(position.speed, Number(expected[3].toFixed(6)), `${at} ${planet}: direct Swiss speed`);
      assert.equal(position.motion, expected[3] < -0.0001 ? 'retrograde' : 'direct');
    }
    if (at.startsWith('2044')) {
      const pluto = sky.positions.find((p: any) => p.planet === 'Pluto');
      assert.equal(pluto.sign, 'Pisces');
      assert(pluto.transitStart && pluto.transitEnd, 'The calculated current residency remains available.');
      assert.equal(pluto.previousSignResidencyStart, null, 'A prior residency crossing before 1800 is unavailable.');
      assert.equal(pluto.previousSignResidencyEnd, null, 'Never publish a clipped historical residency.');
      const neptune = sky.positions.find((p: any) => p.planet === 'Neptune');
      assert(neptune.previousSignResidencyStart && neptune.previousSignResidencyEnd, 'Complete in-range historical evidence remains available.');
    }
    if (at === '2044-08-13T16:00:00Z') assert(sky.dailyEvents.some((e: any) => e.type === 'aspect' && e.aspect === 'conjunction' && e.planets.includes('Jupiter') && e.planets.includes('Lilith')));
  }

  for (const at of ['1800-01-01T12:00:00Z', '2399-12-31T12:00:00Z']) {
    const jd = julianDay(new Date(at));
    const expected = swiss.calc_ut(jd, 9, swiss.SEFLG_SWIEPH);
    const observed = actual.calculateSwissUt(swiss, jd, 9, swiss.SEFLG_SWIEPH);
    assert.deepEqual(Array.from(observed.values), Array.from(expected), `${at}: coverage endpoints retain direct Swiss results`);
    assert((observed.returnedFlags & swiss.SEFLG_SWIEPH) !== 0);
  }

  const sentinel = new Error('Synthetic in-range Swiss failure');
  const faultEngine = new SwissEph();
  await faultEngine.initSwissEph();
  const native = faultEngine.SweModule.ccall.bind(faultEngine.SweModule);
  let faulted = false;
  let nativeCalculations = 0;
  faultEngine.SweModule.ccall = (name: string, returnType: any, argTypes: any, args: any[]) => {
    if (name === 'swe_calc_ut') {
      nativeCalculations++;
      if (new Error().stack?.includes('signTransitWindowFor')) { faulted = true; throw sentinel; }
    }
    return native(name, returnType, argTypes, args);
  };
  assert.throws(() => actual.previousSameSignResidencyFor(faultEngine, 'Pluto', 9, 'Pisces', new Date('2043-01-01T00:00:00Z')), error => error === sentinel,
    'Optional history must not swallow a genuine in-range calculation error.');
  assert(faulted);
  const beforeCoverageChecks = nativeCalculations;
  for (const at of ['1799-12-31T23:59:59Z', '2400-01-01T00:00:00Z']) {
    assert.throws(() => actual.calculateSwissUt(faultEngine, julianDay(new Date(at)), 9, swiss.SEFLG_SWIEPH), actual.SwissEphemerisCoverageError);
  }
  assert.equal(nativeCalculations, beforeCoverageChecks, 'Out-of-coverage probes must not invoke native calculation or Moshier.');
} finally { await rm(directory, { recursive: true, force: true }); }
console.log('PASS: full Sky handler across five dates, all direct-Swiss positions/motions, complete current windows, bounded optional history, and preserved real-error/provenance boundaries.');
