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
let coldPredicate = '';
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'coldGuest') {
    assert.equal(coldPredicate, ''); coldPredicate = node.initializer!.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast); assert(coldPredicate);
for (const override of [{}, { sky: {} }, { mode: 'you' }, { userProfile: {} }, { authAccountChecked: false },
  { remoteAccountId: 'synthetic' }, { authAccountError: 'synthetic' }, { stored: true }, { cached: {} }]) {
  const state = { sky: null, mode: 'guest', userProfile: null, authAccountChecked: true, remoteAccountId: null,
    authAccountError: null, stored: false, cached: null, ...override };
  const accepted = vm.runInNewContext(transpile('Boolean(' + coldPredicate + ')'), { ...state,
    hasStoredSupabaseSession: () => state.stored, readCachedFallbackArchitectureV3Bundle: () => state.cached });
  assert.equal(accepted, Object.keys(override).length === 0, 'Only an established uncached initial guest starts optional transport.');
}
const deferred = () => {
  let resolve!: (value?: any) => void;
  const promise = new Promise<any>(yes => { resolve = yes; });
  return { promise, resolve };
};
const drain = async () => { for (let tick = 0; tick < 24; tick++) await Promise.resolve(); };
const dated = 'synthetic/dated-ingress';
for (const scenario of ['overlap', 'late-auth', 'retirement', 'revision', 'transport-failure', 'all-unused', 'already-calculated', 'offline', 'warm'] as const) {
  publish([selected, unused, ...nodeKeys]);
  (globalThis as any).fixtureOnline = scenario !== 'offline';
  const publications = deferred(), facts = deferred(), transport = deferred();
  const requests: string[][] = [];
  const context = vm.createContext({ Map, Set, Promise,
    loadContentRegistry: async () => {}, refreshContentPublications: () => publications.promise,
    prefetchSkyPlacementAspectContent: qa.prefetchSkyPlacementAspectContent,
    eligibleSkyDetailContent: qa.eligibleSkyDetailContent, loadSkyDetailContent: qa.loadSkyDetailContent,
    skyRoutePartMatches: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
    skyIngressEssayPublicationKeys: () => [dated], contentPublicationRecords: () => [], normalizeContentIdPart: (x: string) => x,
    filterPlacementTimelineEvents: (events: any[]) => events, skyPlacementArticleTimelineWindow: () => null,
    skyPlacementInSignAspectContentKeys: () => scenario === 'all-unused' ? [] : [selected],
    loadLiveGeneratedContentForKeys: async (keys: string[], options?: { requireFresh: boolean }) => {
      requests.push(keys);
      if (options?.requireFresh) {
        await transport.promise;
        if (scenario === 'transport-failure') throw Error('Synthetic transport failure');
        return new Map(keys.map(key => [key, row(key)]));
      }
      return qa.eligibleSkyDetailContent(new Map(keys.map(key => [key, { ...row(key), updatedAt: qa.contentPublication(key)?.row_updated_at ?? stamp }])));
    }
  });
  vm.runInContext(transpile(prepare.getText(ast)), context);
  const snapshot = { positions: [{ planet: 'Sun' }], generatedAt: stamp, placementAspectFacts: { inSign: [] } };
  let early: any;
  const pending = context.prepareSkyPlacementArticleContent(facts.promise, 'sun', 'libra', new Map(), () => early);
  let settled = false;
  void pending.then(() => { settled = true; });
  const attachEarly = () => { early = qa.prefetchSkyPlacementAspectContent('sun', new Map(), publications.promise, facts.promise,
    (keys: string[]) => context.loadLiveGeneratedContentForKeys(keys, { requireFresh: true })); };
  if (!['warm', 'late-auth'].includes(scenario)) attachEarly();
  await drain(); assert.equal(requests.length, 0, 'Publication readiness precedes speculative keys.');
  if (scenario === 'already-calculated') facts.resolve(snapshot);
  await drain(); publications.resolve(); await drain();
  if (scenario === 'late-auth') {
    assert.equal(requests.length, 0, 'Pending auth cannot start speculative transport.');
    attachEarly(); await drain();
  }
  const overlapped = !['already-calculated', 'offline', 'warm'].includes(scenario);
  assert.equal(requests.length, overlapped ? 1 : scenario === 'already-calculated' ? 1 : 0);
  if (overlapped) assert.deepEqual([...requests[0]].sort(), [selected, unused].sort());
  if (scenario === 'retirement') publish([selected], 'retired');
  if (scenario === 'revision') qa.installContentPublications([{ ...qa.contentPublication(selected), revision: ++revision,
    row_updated_at: '2026-10-16T07:00:00.000002Z' }]);
  facts.resolve(snapshot); await drain();
  assert(requests.some(keys => keys.includes(dated)), 'A required dated key starts while optional transport is still held.');
  if (scenario === 'all-unused') assert.equal(settled, true, 'An entirely unrelated optional batch must not delay the actual article.');
  transport.resolve();
  const result = await pending;
  assert(!result.content.has(unused), 'Unrelated candidates must never enter the selected article map.');
  assert(result.content.has(dated), 'The calculated dated ingress still uses its normal required-key request.');
  assert(requests.some(keys => keys.includes(dated)));
  if (scenario === 'overlap' || scenario === 'late-auth') assert(!requests.at(-1)!.includes(selected), 'Eligible selected candidates eliminate the later aspect read.');
  else if (scenario !== 'all-unused') assert(requests.slice(overlapped ? 1 : 0).some(keys => keys.includes(selected)), 'Failed, stale, retired or skipped candidates never establish absence.');
  if (scenario === 'revision') assert.equal(result.content.get(selected)?.updatedAt, '2026-10-16T07:00:00.000002Z');
  if (scenario === 'retirement') assert.equal(result.content.has(selected), false);
  assert.equal(result.content.get(dated)?.body, row(dated).body);
}
let rejectedLedgerReads = 0;
const rejected = qa.prefetchSkyPlacementAspectContent('sun', new Map(), Promise.reject(Error('Synthetic ledger failure')),
  new Promise(() => {}), async () => { rejectedLedgerReads++; return new Map([[selected, row(selected)]]); });
assert.equal((await rejected.rows).size, 0);
assert.equal(rejectedLedgerReads, 0, 'Rejected readiness must not dispatch a content request.');
Reflect.deleteProperty(globalThis, 'fixtureOnline');
console.log('PASS: bounded canonical candidate keys, node polarity, actual guest predicate and preparation, ledger/calculation overlap, actual-key-only admission, microsecond revision, retirement, failure, dated fallback and warm/offline bypass.');
