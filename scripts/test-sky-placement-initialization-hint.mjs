import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { eligiblePlacementHintHref, eligiblePlacementHintContinuation } from '../apps/web/src/services/initialSkyRoute.mjs';
const root = new URL('../', import.meta.url).pathname;
function literalArray(path, name) {
  const ast = ts.createSourceFile(path, readFileSync(root + '/' + path, 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let values;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      let expression = node.initializer;
      if (ts.isAsExpression(expression)) expression = expression.expression;
      assert.ok(ts.isArrayLiteralExpression(expression));
      assert.ok(expression.elements.every(ts.isStringLiteral));
      assert.equal(values, undefined);
      values = expression.elements.map(element => element.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(values?.length);
  return values;
}

const points = literalArray('apps/web/src/astrologyConfig.ts', 'SKY_BODY_ORDER').map(s => s.toLowerCase().replaceAll(' ', '-'));
const signs = literalArray('apps/web/src/services/chartMath.ts', 'zodiacSigns').map(s => s.toLowerCase());
assert.equal(points.length, 14);
assert.equal(signs.length, 12);
let canonical = 0;
for (const point of points)
  for (const sign of signs) {
    assert.equal(eligiblePlacementHintHref('https://synthetic.test/#sky/placement/' + point + '/' + sign), true);
    canonical++;
  }
const valid = 'https://synthetic.test/#sky/placement/sun/libra';
for (const fragment of ['#sky/placement/sun/libra', '#/sky/placement/sun/libra', '#sky/placement/sun/libra/', '#/sky/placement/sun/libra/'])
  assert.equal(eligiblePlacementHintHref('https://synthetic.test/' + fragment), true);
const excluded = [
  '/#sky',
  '/#sky/placement/sun',
  '/#sky/placement/sun/unknown',
  '/#sky/placement/unknown/libra',
  '/#sky/placement/sun/libra/extra',
  '/#sky/placement/sun/libra?x=1',
  '/#sky/placement/Sun/Libra',
  '/#sky/retrograde/venus',
  '/#sky/aspect/sun/trine/pluto',
  '/#calendar',
  '/#you',
  '/#friends',
  '/#articles',
  '/admin/content#sky/placement/sun/libra',
  '/memory#sky/placement/sun/libra',
  '/?auth=login#sky/placement/sun/libra',
  '/?auth=signup#sky/placement/sun/libra',
  '/?code=synthetic#sky/placement/sun/libra',
  '/?error=synthetic#sky/placement/sun/libra',
  '/#access_token=synthetic'
];
for (const path of excluded)
  assert.equal(eligiblePlacementHintHref('https://synthetic.test' + path), false, path);
assert.equal(eligiblePlacementHintContinuation(valid, valid, true, true), true);
for (const input of [
  [valid, valid, false, true],
  [valid, valid, true, false],
  ['https://synthetic.test/?code=synthetic#sky/placement/sun/libra', valid, true, true],
  [valid, 'https://synthetic.test/#calendar', true, true],
  [valid, 'https://other.test/#sky/placement/sun/libra', true, true]
])
  assert.equal(eligiblePlacementHintContinuation(...input), false);
// Predicate inventory is checked against the actual supported calculation inputs.
console.log(JSON.stringify({ canonical, delimiterExamples: 4, excluded: excluded.length, continuationPositive: 1, continuationNegative: 5, passed: true, scope: 'Pure source/predicate controls, not browser or admission acceptance' }));
const entryPath = 'apps/web/src/main.tsx';
const entry = readFileSync(root + entryPath, 'utf8');
const ast = ts.createSourceFile(entryPath, entry, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const hints = [];
function findHint(node) {
  if (ts.isIfStatement(node) && node.expression.getText(ast).includes('eligiblePlacementHintHref(callbackUrl.href)'))
    hints.push(node);
  ts.forEachChild(node, findHint);
}
findHint(ast);
assert.equal(hints.length, 1);
const hint = hints[0].getText(ast);
assert.equal((hint.match(/eligiblePlacementHintContinuation\(/gu) ?? []).length, 2);
assert.equal((hint.match(/import\("\.\/services\/skyCalculationClient"\)/gu) ?? []).length, 1);
assert.doesNotMatch(hint, /\.resolve\(|calculate[A-Za-z]*\(|Date\(|fetch\(/u);
const runnable = ts.transpileModule(hint, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace('import("./services/skyCalculationClient")', 'loadClient()');
const execute = new Function('Worker', 'callbackUrl', 'initialSkyLoadPromise', 'window', 'eligiblePlacementHintHref', 'eligiblePlacementHintContinuation', 'loadClient', runnable);
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};
const drain = async () => {
  for (let index = 0;index < 12;index++) await Promise.resolve();
};
async function run({
  href = valid,
  current = valid,
  worker = true,
  initial = { resolve() { throw Error('API resolution must not be demanded'); } },
  holdInitial = false,
  holdClient = false,
  rejectClient = false,
  rejectInitialization = false
} = {}) {
  const captured = deferred();
  const client = deferred();
  const location = { href: current };
  let imports = 0;
  let preloads = 0;
  execute(worker ? function Worker() { } : undefined, new URL(href), captured.promise,
    { location }, eligiblePlacementHintHref, eligiblePlacementHintContinuation, () => {
      imports++;
      return client.promise;
    });
  const releaseClient = () => rejectClient
    ? client.reject(Error('synthetic module failure'))
    : client.resolve({
      preloadSwissEphemerisOffMainThread() {
        preloads++;
        return rejectInitialization
          ? Promise.reject(Error('synthetic initialization failure'))
          : Promise.resolve();
      }
    });
  if (!holdInitial) captured.resolve(initial);
  if (!holdClient) releaseClient();
  await drain();
  return {
    get imports() { return imports; },
    get preloads() { return preloads; },
    captured,
    releaseClient,
    location
  };
}

const normal = await run();
assert.equal(normal.imports, 1);
assert.equal(normal.preloads, 1);
const held = await run({ holdInitial: true, holdClient: true });
assert.equal(held.imports, 0);
held.captured.resolve({});
await drain();
assert.equal(held.imports, 1);
held.location.href = 'https://synthetic.test/#articles';
held.releaseClient();
await drain();
assert.equal(held.preloads, 0);
for (const options of [{ worker: false }, { initial: null }, { href: 'https://synthetic.test/?code=synthetic#sky/placement/sun/libra' }, { current: 'https://synthetic.test/#calendar' }]) {
  const r = await run(options);
  assert.equal(r.imports, 0);
  assert.equal(r.preloads, 0);
}
for (const options of [{ rejectClient: true }, { rejectInitialization: true }]) {
  const r = await run(options);
  assert.equal(r.imports, 1);
  assert.equal(r.preloads, options.rejectClient ? 0 : 1);
}
console.log('Actual startup hint: held metadata, route abandonment, eligibility, import/init failure and no API resolve contracts PASS.');
