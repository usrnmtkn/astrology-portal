import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { build } from 'esbuild';
import SwissEph from 'swisseph-wasm';

const filename = 'apps/web/src/services/ephemeris.ts';
const source = readFileSync(filename, 'utf8');
const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
assert.equal(ast.parseDiagnostics.length, 0);
const functions = new Map(ast.statements.filter(ts.isFunctionDeclaration)
  .filter(node => node.name).map(node => [node.name!.text, node]));
const scannerSource = ['refineResidualPass', 'scanResidualPasses', 'scanLastResidualPass']
  .map(name => { assert(functions.has(name)); return functions.get(name)!.getText(ast); }).join('\n');
const runnable = ts.transpileModule(scannerSource + '\n({ scanResidualPasses, scanLastResidualPass });', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const { scanResidualPasses: full, scanLastResidualPass: last } = vm.runInNewContext(runnable);
const day = 86_400_000, start = new Date('2026-01-01T00:00:00Z');
const cases: Array<[string, (time: number) => number[], number | null, number, number, string?]> = [
  ['interior', time => [time - 2.25], 0, 1, 10],
  ['start', time => [time], 0, 1, 10],
  ['end', time => [time - 10], 0, 1, 10],
  ['two passes', time => [(time - 2.25) * (time - 8.25)], 0, 1, 10],
  ['no previous', time => [time + 1], 0, 1, 10],
  ['fixed second branch', time => [time - 1.25, time - 4.25], 1, 1, 10],
  ['all branches fallback', time => [time - 1.25, time - 4.25], null, 1, 10],
  ['dense dedupe chain', time => [Math.sin((time - 0.01) * Math.PI * 8)], 0, 1 / 24, 3],
  ['floating grid drift', time => [time - 130.12345], 0, 5.123456789123, 220],
  ['NaN current after exact prior', time => [time === 0 ? 0 : NaN], 0, 1, 10],
  ['wrap discontinuity', time => [time < 5 ? -179 : 179], 0, 1, 10],
  ['shortened last cell', time => [time - 10.3], 0, 3, 10.33],
  ['exact six-hour roots', time => [time * (time - 0.25)], 0, 1 / 24, 0.5],
  ['pre-1970 TimeClip and drift', time => [time - 5.12345], 0, 0.123456789123, 10, '1969-12-25T00:00:00Z'],
  ['empty range', time => [time], 0, 1, 0]
];
let fewerSamples = 0;
for (const [name, residual, branch, step, length, origin] of cases) {
  const beginning = origin ? new Date(origin) : start;
  const end = new Date(+beginning + length * day), samples: number[] = [], nearestSamples: number[] = [];
  const expected = full((date: Date) => { samples.push(+date); return residual((+date - +beginning) / day); }, beginning, end, step, branch).at(-1) ?? null;
  const actual = last((date: Date) => { nearestSamples.push(+date); return residual((+date - +beginning) / day); }, beginning, end, step, branch);
  assert.equal(actual?.toISOString() ?? null, expected?.toISOString() ?? null, name);
  const originalSamples = new Set(samples);
  assert(nearestSamples.every(time => originalSamples.has(time)), `${name}: original grid/bracket/refinement timestamps`);
  if (nearestSamples.length < samples.length) fewerSamples++;
}
assert(fewerSamples >= 3, 'Nearest search must actually avoid unused historical samples.');
const sentinel = new Error('Required Swiss sample failed');
assert.throws(() => last(() => { throw sentinel; }, start, new Date(+start + 10 * day), 1, 0), error => error === sentinel);
// A nearest query does not execute irrelevant history before its last root.
const withUnusedHistoricalError = (date: Date) => {
  if (+date < +start + day) throw sentinel;
  return [(+date - +start) / day - 8.25];
};
assert.throws(() => full(withUnusedHistoricalError, start, new Date(+start + 10 * day), 1, 0), error => error === sentinel);
assert.equal(last(withUnusedHistoricalError, start, new Date(+start + 10 * day), 1, 0).toISOString(), new Date(+start + 8.25 * day).toISOString());

// Reference keeps the original complete ascending historical scan. No copied
// astronomy, rounded dates, sampled-field comparison, or synthetic success.
const timing = functions.get('skyAspectTimingFor')!;
const historicalCalls: ts.CallExpression[] = [];
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'findLastExactAspectPass') historicalCalls.push(node);
  ts.forEachChild(node, visit);
}
visit(timing);
assert.equal(historicalCalls.length, 1, 'Only previous cycle selection uses the nearest query.');
const call = historicalCalls[0];
const replacement = `(scanExactAspectPasses(${call.arguments.map(argument => argument.getText(ast)).join(', ')}).at(-1) ?? null)`;
const referenceSource = source.slice(0, call.getStart(ast)) + replacement + source.slice(call.end);
assert.equal((source.match(/findLastExactAspectPass\(/gu) ?? []).length, 2, 'Helper plus its one previous-cycle caller.');
const cacheRoot = path.join(process.cwd(), 'node_modules/.cache/tldrastro');
await mkdir(cacheRoot, { recursive: true });
const directory = await mkdtemp(path.join(cacheRoot, 'previous-cycle-parity-'));
try {
  const modules: any[] = [];
  for (const reference of [true, false]) {
    const outfile = path.join(directory, reference ? 'reference.mjs' : 'nearest.mjs');
    await build({ entryPoints: [filename], bundle: true, platform: 'node', format: 'esm', outfile,
      external: ['swisseph-wasm'], define: { 'import.meta.env': '{}' }, logLevel: 'silent',
      plugins: [{ name: 'original-historical-reference', setup(builder) {
        if (reference) {
          builder.onLoad({ filter: /\/services\/ephemeris\.ts$/ }, () => ({ loader: 'ts', contents: referenceSource,
            resolveDir: path.join(process.cwd(), 'apps/web/src/services') }));
          builder.onResolve({ filter: /swissCalculationCache\.js$/ }, () => ({ path: 'direct-swiss', namespace: 'reference' }));
          builder.onLoad({ filter: /.*/, namespace: 'reference' }, () => ({ loader: 'js', contents: 'export const memoizeSwissCalculation = calculate => calculate;' }));
        }
      } }] });
    modules.push(await import(pathToFileURL(outfile).href));
  }
  const [reference, nearest] = modules, swiss = new SwissEph();
  await swiss.initSwissEph();
  const location = { label: 'Synthetic New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' };
  const fixtures = [
    ...[2000, 2010, 2026, 2030, 2040].map(year => ({ at: `${year}-10-18T07:00:39.733Z`, planet: 'sun', sign: 'libra' })),
    { at: '2026-09-20T16:00:00.000Z', planet: 'venus', sign: 'scorpio', motion: 'direct' },
    { at: '2026-10-15T16:00:00.000Z', planet: 'venus', sign: 'scorpio', motion: 'retrograde' }
  ];
  for (const fixture of fixtures) {
    const date = new Date(fixture.at);
    const expected = await reference.getSkyPlacementSnapshot(location, fixture.planet, fixture.sign, date, true, 'placement');
    const actual = await nearest.getSkyPlacementSnapshot(location, fixture.planet, fixture.sign, date, true, 'placement');
    assert.deepEqual(actual, expected, `${fixture.at} ${fixture.planet}: complete direct-Swiss snapshot equality`);
    assert.equal(actual.calculationProvenance.actualEphemeris, 'swiss');
    const selected = actual.positions.find((position: any) => position.planet.toLowerCase() === fixture.planet);
    if ('motion' in fixture) assert.equal(selected.motion, fixture.motion, 'Direct and retrograde fixture coverage');
    const at = new Date(actual.generatedAt);
    const jd = swiss.julday(at.getUTCFullYear(), at.getUTCMonth() + 1, at.getUTCDate(),
      at.getUTCHours() + at.getUTCMinutes() / 60 + at.getUTCSeconds() / 3600);
    const vector = swiss.calc_ut(jd, fixture.planet === 'sun' ? swiss.SE_SUN : swiss.SE_VENUS, swiss.SEFLG_SWIEPH | swiss.SEFLG_SPEED);
    assert.equal(selected.longitude, Number((((vector[0] % 360) + 360) % 360).toFixed(4)));
    assert.equal(selected.speed, Number(vector[3].toFixed(6)));
  }
} finally { await rm(directory, { recursive: true, force: true }); }
console.log('PASS: actual nearest historical scanner grid/refinement/dedupe/errors and complete direct-Swiss snapshots across five decades and direct/retrograde Venus.');
