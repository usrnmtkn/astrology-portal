import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { build } from 'esbuild';

const file = join(mkdtempSync(join(tmpdir(), 'sky-cold-aspects-')), 'reader.mjs');
await build({ stdin: { resolveDir: process.cwd(), contents: `
  export * from './apps/web/src/services/skyDetailContent.ts';
  export { installContentPublications, contentPublication } from './apps/web/src/content/contentPublicationState.ts';
  export { contentStudioExactSkyAspectKeys } from './apps/web/src/services/skyAspectContent.ts';
  export { SKY_BODY_ORDER, SKY_PLACEMENT_ASPECT_TARGETS, transitAspectDefinitions } from './apps/web/src/astrologyConfig.ts';
` }, bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent', define: { 'import.meta.env': '{}' }, plugins: [{ name: 'online-fixture', setup(builder) {
  builder.onResolve({ filter: /^\.\/contentPublications$/ }, () => ({ path: 'online', namespace: 'fixture' }));
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const contentPublicationsAvailableOnline = () => globalThis.fixtureOnline === true; export const refreshContentPublications = async () => {};' }));
} }] });
const qa = await import(pathToFileURL(file).href);
const stamp = '2026-10-16T07:00:00.000001Z';
const row = (key: string) => ({ contentKey: key, id: key, updatedAt: stamp, targetDate: null,
  body: 'Synthetic complete passage, including its original final sentence.' });
let revision = 1;
function publish(keys: string[], state = 'live') {
  revision++;
  qa.installContentPublications(keys.map(key => ({ content_key: key, state, revision,
    row_id: key, row_updated_at: stamp, updated_at: stamp })));
}
const all = [...new Set<string>(qa.SKY_BODY_ORDER.flatMap((first: string) => qa.SKY_BODY_ORDER.flatMap((second: string) =>
  qa.transitAspectDefinitions.flatMap((aspect: any) => qa.contentStudioExactSkyAspectKeys(first, aspect.type, second)))))];
publish(all);
assert.deepEqual(qa.coldSkyPlacementAspectKeys('north-node', new Map()), [], 'More than one 50-key batch disables the whole optional read.');
assert.equal(qa.coldSkyPlacementAspectKeys('sun', new Map()).length, 45);
assert.deepEqual(qa.SKY_PLACEMENT_ASPECT_TARGETS, ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Lilith']);
assert.match(readFileSync('apps/web/src/services/ephemeris.ts', 'utf8'), /const otherPlanets = SKY_PLACEMENT_ASPECT_TARGETS\.filter/u);
publish(all, 'retired');
const [selected] = qa.contentStudioExactSkyAspectKeys('Sun', 'trine', 'Mars');
const [unused] = qa.contentStudioExactSkyAspectKeys('Sun', 'square', 'Pluto');
const nodeKeys = qa.contentStudioExactSkyAspectKeys('North Node', 'conjunction', 'Sun');
assert.equal(nodeKeys.length, 2, 'Canonical node polarity must retain both existing exact keys.');
publish([selected, unused, ...nodeKeys]);
assert.deepEqual(qa.coldSkyPlacementAspectKeys('sun', new Map()).sort(), [selected, unused].sort());
assert.deepEqual(qa.coldSkyPlacementAspectKeys('north-node', new Map()).sort(), nodeKeys.slice().sort());
assert.deepEqual(qa.coldSkyPlacementAspectKeys('south-node', new Map()), [nodeKeys[1]]);
assert(!qa.coldSkyPlacementAspectKeys('sun', new Map([[selected, row(selected)]] )).includes(selected));
assert(qa.coldSkyPlacementAspectKeys('sun', new Map([[selected, { ...row(selected), updatedAt: '2000-01-01T00:00:00Z' }]])).includes(selected));

const app = readFileSync('apps/web/src/App.tsx', 'utf8');
const ast = ts.createSourceFile('App.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(ast.parseDiagnostics.length, 0);
const prepare = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'prepareSkyPlacementArticleContent');
assert(prepare);
const transpile = (source: string) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const admit = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'admitInitialSkyArticlePublication');
assert(admit);
for (const scenario of ['initial', 'partial-first', 'later-revision', 'generation-gap', 'cached-ledger', 'explicit-refresh-batched'] as const) {
  const preparation = { initialPublication: scenario !== 'cached-ledger', generation: 0, refreshVersion: 0,
    snapshot: Promise.resolve('same-facts'), request: Promise.resolve('same-writing'), early: {} };
  const originals = { ...preparation };
  const context = vm.createContext({ preparation, contentPublicationGeneration: scenario === 'generation-gap' ? 2 : 1 });
  vm.runInContext(transpile(admit.getText(ast)), context);
  if (scenario === 'partial-first') vm.runInContext('admitInitialSkyArticlePublication(preparation, "partial")', context);
  vm.runInContext('admitInitialSkyArticlePublication(preparation, "complete-live")', context);
  const admitted = ['initial', 'later-revision', 'explicit-refresh-batched'].includes(scenario);
  assert.equal(preparation.generation, admitted ? 1 : 0, scenario);
  assert.equal(preparation.refreshVersion, admitted ? 1 : 0, scenario);
  assert.equal(preparation.initialPublication, false);
  assert.equal(preparation.snapshot, originals.snapshot);
  assert.equal(preparation.request, originals.request);
  assert.equal(preparation.early, originals.early);
  if (scenario === 'later-revision') {
    context.contentPublicationGeneration = 2;
    vm.runInContext('admitInitialSkyArticlePublication(preparation, "complete-live")', context);
    assert.notEqual(preparation.generation, context.contentPublicationGeneration, 'Later revisions must invalidate preparation.');
  }
  if (scenario === 'explicit-refresh-batched') assert.notEqual(preparation.refreshVersion, 2,
    'An explicit refresh batched with initial publication must still invalidate preparation.');
}
let coldPredicate = '', guestPredicate = '';

function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'isSettledGuestReader') {
    assert.equal(guestPredicate, ''); guestPredicate = node.getText(ast);
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'coldGuest') {
    assert.equal(coldPredicate, ''); coldPredicate = node.initializer!.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast); assert(coldPredicate); assert(guestPredicate);
let sourceDependencies: ts.ArrayLiteralExpression | undefined;
function findSourceDependencies(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
    && node.arguments[0]?.getText(ast).includes('const sourceRequest = prepareSkyPlacementSources')) {
    assert.equal(sourceDependencies, undefined); sourceDependencies = node.arguments[1] as ts.ArrayLiteralExpression;
  }
  ts.forEachChild(node, findSourceDependencies);
}
findSourceDependencies(ast); assert(sourceDependencies);
const geometryDependencies = sourceDependencies.elements.filter(node => node.getText(ast).includes('sky?.location.'));
assert.equal(geometryDependencies.length, 3);
const selectedLocation = { latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
const geometry = (sky: unknown) => geometryDependencies.map(node => vm.runInNewContext(node.getText(ast), { sky, location: selectedLocation, requestedArticleLocation: selectedLocation }));
const initialGeometry = geometry(null);
assert.deepEqual(geometry({ location: selectedLocation }), initialGeometry,
  'Arrival of the matching full Sky must not restart the same source preparation after its core read settled.');
for (const change of [{ latitude: 0 }, { longitude: 0 }, { timeZone: 'America/Los_Angeles' }]) {
  assert.notDeepEqual(geometry({ location: { ...selectedLocation, ...change } }), initialGeometry,
    'Actual same-instant geometry changes must still invalidate preparation.');
}

for (const override of [{}, { sky: {} }, { mode: 'you' }, { userProfile: {} }, { authAccountChecked: false },
  { remoteAccountId: 'synthetic' }, { authAccountError: 'synthetic' }, { stored: true }, { cached: {} }, { profileNatalSky: { ascendant: 'Aries' } }]) {
  const state = { sky: null, mode: 'guest', userProfile: null, profileNatalSky: null, authAccountChecked: true, remoteAccountId: null,
    authAccountError: null, stored: false, cached: null, ...override };
  const accepted = vm.runInNewContext(transpile(guestPredicate + '\nBoolean(' + coldPredicate + ')'), { ...state,
    hasStoredSupabaseSession: () => state.stored, readCachedFallbackArchitectureV3Bundle: () => state.cached });
  assert.equal(accepted, Object.keys(override).length === 0, 'Only an established uncached initial guest starts optional transport.');
}
const deferred = () => {
  let resolve!: (value?: any) => void;
  const promise = new Promise<any>(yes => { resolve = yes; });
  return { promise, resolve };
};
const drain = async () => { for (let tick = 0; tick < 24; tick++) await Promise.resolve(); };
let creation: ts.IfStatement | undefined;
function findCreation(node: ts.Node) {
  if (ts.isIfStatement(node) && node.expression.getText(ast).includes('skyArticlePreparationRef.current?.key !== preparationKey')) {
    assert.equal(creation, undefined); creation = node;
  }
  ts.forEachChild(node, findCreation);
}
findCreation(ast); assert(creation);
for (const notification of [false, true]) {
  const ledger = deferred(), calculation = deferred();
  const context = vm.createContext({
    canLoadPlacementArticle: true, skyArticlePreparationRef: { current: null as any }, preparationKey: 'synthetic-route',
    contentRefreshVersion: 0, contentPublicationGeneration: 0, articleLocation: {}, routePlanet: 'Sun', placementSign: 'Virgo',
    skyDate: '2026-09-13', initial: null, availableDetailContent: new Map(),
    contentPublicationsResolved: () => false, refreshContentPublications: () => ledger.promise,
    requestSkyPlacementArticleSnapshot: () => calculation.promise, prepareSkyPlacementArticleContent: () => calculation.promise
  });
  vm.runInContext(transpile(admit.getText(ast) + '\n' + creation.getText(ast)), context);
  const preparation = context.skyArticlePreparationRef.current;
  assert.equal(preparation.initialPublication, true);
  if (notification) {
    context.contentPublicationGeneration = 1;
    vm.runInContext('admitInitialSkyArticlePublication(skyArticlePreparationRef.current, "complete-live")', context);
  }
  ledger.resolve(); await drain();
  assert.equal(preparation.initialPublication, false, 'First lookup completion closes eligibility even without a notification or calculated facts.');
  assert.equal(preparation.generation, notification ? 1 : 0);
  context.contentPublicationGeneration += 1;
  vm.runInContext('admitInitialSkyArticlePublication(skyArticlePreparationRef.current, "complete-live")', context);
  assert.notEqual(preparation.generation, context.contentPublicationGeneration, 'A later changed ledger cannot become initial admission.');
}
const dated = 'synthetic/dated-ingress';
const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
for (const scenario of ['overlap', 'late-auth', 'retirement', 'revision', 'transport-failure', 'all-unused', 'already-calculated', 'offline', 'warm', 'slow-ingress', 'cancel-before-start', 'load-throw', 'required-current-failure'] as const) {
  publish([selected, unused, ...nodeKeys, dated]);
  (globalThis as any).fixtureOnline = false;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: scenario !== 'offline' } });
  const publications = deferred(), facts = deferred(), transport = deferred(), ingressTransport = deferred();
  const requests: Array<{ kind: string; keys: string[] }> = [];
  let missingCurrent = scenario === 'required-current-failure';
  const context = vm.createContext({ Map, Set, Promise,
    loadContentRegistry: async () => {}, refreshContentPublications: () => publications.promise,
    eligibleSkyDetailContent: qa.eligibleSkyDetailContent, loadSkyDetailContent: qa.loadSkyDetailContent,
    skyRoutePartMatches: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
    skyIngressEssayPublicationKeys: () => [dated], contentPublicationRecords: () => [], normalizeContentIdPart: (x: string) => x,
    filterPlacementTimelineEvents: (events: any[]) => events, skyPlacementArticleTimelineWindow: () => null,
    skyPlacementInSignAspectContentKeys: () => scenario === 'all-unused' ? [] : [selected, 'synthetic/noncandidate-aspect'],
    loadLiveGeneratedContentForKeys: async (keys: string[]) => {
      requests.push({ kind: 'normal', keys });
      return qa.eligibleSkyDetailContent(new Map(keys.filter(key => !missingCurrent || key !== selected).map(key => [key, { ...row(key), updatedAt: qa.contentPublication(key)?.row_updated_at ?? stamp }])));
    }
  });
  vm.runInContext(transpile(prepare.getText(ast)), context);
  const snapshot = { positions: [{ planet: 'Sun' }], generatedAt: stamp, placementAspectFacts: { inSign: [] } };
  let early: any, cancelled = false;
  const pending = context.prepareSkyPlacementArticleContent(facts.promise, 'sun', 'libra', new Map(), () => early);
  let settled = false;
  void pending.then(() => { settled = true; }, () => { settled = true; });
  const attachEarly = () => { early = qa.prefetchSkyPlacementAspectContent('sun', new Map(), publications.promise, facts.promise,
    (keys: string[], ready: Promise<void>) => {
      if (scenario === 'load-throw') throw Error('Synthetic synchronous transport setup failure');
      requests.push({ kind: 'candidates', keys });
      return { get rows() { return Promise.all([transport.promise, ready]).then(() => {
        if (cancelled || scenario === 'transport-failure' || missingCurrent || !(globalThis as any).fixtureOnline) return new Map();
        return qa.eligibleSkyDetailContent(new Map(keys.map(key => [key, row(key)])));
      }); }, discard: () => { cancelled = true; } };
    }, async () => {
      requests.push({ kind: 'ingress', keys: [dated] });
      if (scenario === 'slow-ingress') await ingressTransport.promise;
      return new Map([[dated, row(dated)]]);
    }); };
  if (scenario === 'already-calculated') facts.resolve(snapshot);
  if (!['warm', 'late-auth'].includes(scenario)) attachEarly();
  if (scenario === 'cancel-before-start') early.discard();
  await drain();
  const shouldStage = !['warm', 'late-auth', 'already-calculated', 'offline', 'cancel-before-start', 'load-throw'].includes(scenario);
  assert.equal(requests.filter(x => x.kind === 'candidates').length, shouldStage ? 1 : 0,
    'Only an uncancelled, uncalculated online guest stages before the complete ledger.');
  if (shouldStage) assert.equal(requests[0].keys.length, 45, 'Pre-ledger candidates use the complete bounded canonical set.');
  assert.equal(requests.filter(x => x.kind === 'ingress').length, 0, 'Ingress discovery still waits for the complete ledger.');
  (globalThis as any).fixtureOnline = scenario !== 'offline'; publications.resolve(); await drain();
  if (scenario === 'late-auth') { attachEarly(); await drain(); }
  if (scenario === 'retirement') publish([selected], 'retired');
  if (scenario === 'revision') qa.installContentPublications([{ ...qa.contentPublication(selected), revision: ++revision,
    row_updated_at: '2026-10-16T07:00:00.000002Z' }]);
  if (!['already-calculated', 'offline', 'warm', 'cancel-before-start'].includes(scenario)) {
    assert(requests.some(x => x.kind === 'ingress'), 'Known ingress candidates start before astronomy settles.');
  }
  facts.resolve(snapshot); await drain();
  if (scenario === 'slow-ingress') assert(requests.some(x => x.kind === 'normal' && x.keys.includes('synthetic/noncandidate-aspect')),
    'A held ingress request cannot serialize actual missing aspect transport.');
  if (scenario === 'all-unused') assert.equal(settled, true, 'An unrelated candidate batch must not delay the actual article.');
  transport.resolve(); ingressTransport.resolve();
  if (scenario === 'required-current-failure') {
    await assert.rejects(pending, /current article publication could not load/);
    missingCurrent = false;
    const recovered = await context.prepareSkyPlacementArticleContent(Promise.resolve(snapshot), 'sun', 'libra', new Map(), () => undefined);
    assert.equal(recovered.content.get(selected)?.updatedAt, qa.contentPublication(selected)?.row_updated_at);
    assert.equal(recovered.content.get(selected)?.body, row(selected).body);
    continue;
  }
  const result = await pending;
  assert(!result.content.has(unused), 'Unrelated candidates must never enter the selected article map.');
  assert(result.content.has(dated), 'Required ingress must come from staged or normal exact-key completion.');
  if (scenario === 'overlap' || scenario === 'late-auth') assert(!requests.some(x => x.kind === 'normal' && x.keys.includes(selected)),
    'Admitted current candidates eliminate the later aspect read.');
  if (scenario === 'revision') assert.equal(result.content.get(selected)?.updatedAt, '2026-10-16T07:00:00.000002Z');
  if (scenario === 'retirement') assert.equal(result.content.has(selected), false);
  if (scenario === 'warm' || scenario === 'offline') assert.equal(requests.some(x => x.kind !== 'normal'), false,
    'Warm/member-equivalent and offline paths retain normal demand-driven loading.');
  assert.equal(result.content.get(dated)?.body, row(dated).body);
}
if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
else Reflect.deleteProperty(globalThis, 'navigator');
Reflect.deleteProperty(globalThis, 'fixtureOnline');
console.log('PASS: bounded canonical candidates, exact guest predicate, pre-ledger private transport, late auth, cancellation, ingress/actual-aspect concurrency, microsecond revisions, retirement, failures, and warm/offline bypass.');
