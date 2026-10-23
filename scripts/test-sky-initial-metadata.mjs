import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import { isInitialSkyReaderHash } from '../apps/web/src/services/initialSkyRoute.mjs';

const root = new URL('../', import.meta.url);
const parse = (path, kind = ts.ScriptKind.TS) => {
  const source = readFileSync(new URL(path, root), 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
  assert.equal(ast.parseDiagnostics.length, 0);
  return ast;
};
function literalArray(path, name) {
  const ast = parse(path);
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
const apiAst = parse('apps/web/src/services/skyApi.ts');
const functions = ['startInitialSkyLoad', 'matchingInitialSkyLoad'].map(name => {
  const matches = apiAst.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1);
  return matches[0].getText(apiAst).replace(/^export /u, '');
}).join('\n');
const transpile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
assert.equal((functions.match(/import\("\.\.\/content\/skyPlacementSourceAssets"\)/gu) ?? []).length, 1);
const runnableApi = transpile(functions).replace('import("../content/skyPlacementSourceAssets")', 'loadAssets()');
const entryAst = parse('apps/web/src/main.tsx', ts.ScriptKind.TSX);
const declarations = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'initialSkyLoadPromise') declarations.push(node);
  ts.forEachChild(node, visit);
}
visit(entryAst);
assert.equal(declarations.length, 1);
const dispatch = declarations[0].getText(entryAst);
assert.match(dispatch, /startInitialSkyLoad\(\)/u);
assert.equal((dispatch.match(/import\("\.\/services\/skyApi"\)/gu) ?? []).length, 1);
const runnableMain = transpile('const ' + dispatch + ';').replace('import("./services/skyApi")', 'loadSkyApi()');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const drain = async () => { for (let tick = 0; tick < 24; tick++) await Promise.resolve(); };
const valid = 'https://synthetic.test/#sky/placement/sun/libra';
async function run({ href = valid, holdMetadata = false, rejectMetadata = false, rejectAssets = false,
  rejectAssetRead = false, throwCapture = false, studioReturn = false, rejectApi = false, storedMode = null } = {}) {
  const metadata = deferred(), api = deferred();
  const location = { href, hash: new URL(href).hash };
  const selectedLocation = { label: 'Synthetic location', latitude: 40, longitude: -74, timeZone: 'America/New_York' };
  const date = new Date('2026-10-16T07:00:00Z');
  let metadataImports = 0, captures = 0, apiReads = 0, assetImports = 0, assetReads = 0, localReads = 0, captured;
  const context = vm.createContext({ URL, Date, performance, window: { location, localStorage: { getItem: () => storedMode } },
    rememberStudioReturnPath: () => studioReturn,
    getInitialTransitDate: () => { if (throwCapture) throw Error('Synthetic capture failure'); return '2026-10-16'; },
    getInitialLocation: () => ({ location: selectedLocation }), withTimeZone: value => value,
    skyDateTimeFromInput: () => date, liveSkyReference: () => true,
    getSkyFromApi: (value, at) => { assert.equal(value, selectedLocation); assert.equal(at, date); apiReads++; return api.promise; },
    getSkyLocally: () => { localReads++; throw Error('Speculative local calculation forbidden'); },
    loadAssets: () => { assetImports++; return rejectAssets ? Promise.reject(Error('Synthetic asset import failure')) : Promise.resolve({
      loadSkyPlacementSourceAssets: () => { assetReads++; return rejectAssetRead ? Promise.reject(Error('Synthetic asset failure')) : Promise.resolve(); }
    }); },
    loadSkyApi: () => { metadataImports++; return metadata.promise; }
  });
  vm.runInContext('const isInitialSkyReaderHash = ' + isInitialSkyReaderHash.toString() + ';', context);
  vm.runInContext(runnableApi, context);
  vm.runInContext(runnableMain, context);
  const releaseMetadata = () => rejectMetadata ? metadata.reject(Error('Synthetic metadata import failure')) : metadata.resolve({
    startInitialSkyLoad: () => { captures++; captured = context.startInitialSkyLoad(); return captured; }
  });
  if (!holdMetadata && metadataImports) releaseMetadata();
  if (rejectApi) api.reject(Error('Synthetic API failure'));
  await drain();
  return { location, releaseMetadata, get captured() { return captured; }, get counts() {
    return { metadataImports, captures, apiReads, assetImports, assetReads, localReads };
  }, result: () => vm.runInContext('initialSkyLoadPromise', context) };
}
const points = literalArray('apps/web/src/astrologyConfig.ts', 'SKY_BODY_ORDER').map(s => s.toLowerCase().replaceAll(' ', '-'));
const signs = literalArray('apps/web/src/services/chartMath.ts', 'zodiacSigns').map(s => s.toLowerCase());
assert.equal(points.length, 14); assert.equal(signs.length, 12);
for (const point of points) for (const sign of signs) for (const slash of ['', '/']) {
  const runResult = await run({ href: `https://synthetic.test/#${slash}sky/placement/${point}/${sign}${slash}` });
  assert.equal(await runResult.result(), runResult.captured, 'Return exact selection metadata without awaiting its unresolved API request.');
  assert.deepEqual(runResult.counts, { metadataImports: 1, captures: 1, apiReads: 1, assetImports: 1, assetReads: 1, localReads: 0 });
}
for (const path of ['/', '/#sky', '/#sky/', '/#/sky', '/#sky/placement/sun', '/#sky/retrograde/venus']) {
  const runResult = await run({ href: 'https://synthetic.test' + path });
  assert.equal(await runResult.result(), runResult.captured);
  assert.equal(runResult.counts.apiReads, 1); assert.equal(runResult.counts.localReads, 0);
  assert.equal(runResult.counts.assetReads, path.includes('/placement/') || path.includes('/retrograde/') ? 1 : 0,
    'List sources wait for App; direct articles retain their early complete-source load.');
}
for (const path of ['/#calendar', '/#you', '/#friends', '/#articles', '/#sky/aspect/sun/trine/pluto',
  '/#sky/placement/sun/libra/extra', '/#access_token=synthetic', '/admin/content#sky/placement/sun/libra',
  '/memory#sky/placement/sun/libra', '/?auth=login#sky/placement/sun/libra']) {
  const runResult = await run({ href: 'https://synthetic.test' + path });
  assert.equal(await runResult.result(), null, path);
  assert.equal(runResult.counts.apiReads, 0, path); assert.equal(runResult.counts.assetImports, 0, path);
}
for (const options of [{ studioReturn: true }, { throwCapture: true }, { rejectMetadata: true }]) {
  const runResult = await run(options);
  assert.equal(await runResult.result(), null);
  assert.equal(runResult.counts.apiReads, 0); assert.equal(runResult.counts.assetImports, 0);
}
for (const path of ['/#calendar', '/admin/content#sky/placement/sun/libra', '/?auth=login#sky/placement/sun/libra']) {
  const held = await run({ holdMetadata: true });
  assert.equal(held.counts.apiReads, 0);
  held.location.href = 'https://synthetic.test' + path;
  held.location.hash = new URL(held.location.href).hash;
  held.releaseMetadata(); await drain();
  assert.equal(await held.result(), null, 'Recheck the current route after the metadata module arrives.');
  assert.equal(held.counts.apiReads, 0); assert.equal(held.counts.assetImports, 0);
}
for (const options of [{ rejectAssets: true }, { rejectAssetRead: true }, { rejectApi: true }]) {
  const runResult = await run(options);
  assert.equal(await runResult.result(), runResult.captured, 'An optional asset or API failure must not poison captured selection metadata.');
  assert.equal(runResult.counts.localReads, 0, 'Only the mounted selection may request the local fallback.');
  if (options.rejectApi) assert.equal(await runResult.captured.result, null);
}
console.log('PASS: actual initial Sky dispatcher and capture, 168 placements with slash variants, exact unresolved metadata identity, route/login/Studio guards, delayed route changes, asset/API failures and no speculative local calculation.');

for (const storedMode of [null, 'guest', 'member', 'profile', 'friends', 'calendar', 'horoscopes', 'account', 'settings']) {
  const entry = await run({ href: 'https://synthetic.test/', storedMode });
  await entry.result();
  assert.equal(entry.counts.apiReads, [null, 'guest', 'member'].includes(storedMode) ? 1 : 0, 'Bare entry preserves the saved destination.');
  assert.equal(entry.counts.assetReads, 0, 'Bare entry cannot preload the full article sources.');
}
