import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const built = await build({ entryPoints: ['apps/web/src/services/skyPlacementHydration.ts'], bundle: true,
  platform: 'node', format: 'cjs', write: false, plugins: [{ name: 'sources', setup(builder) {
    builder.onResolve({ filter: /fallbackArchitectureV3Runtime|generatedContent|contentPublications|skyPlacementPublicationGuard/ }, args => ({ path: args.path, namespace: 'source-fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'source-fixture' }, () => ({ contents: `
      export const loadSkyPlacementFallbackArchitectureV3Bundle = () => fixture.bundle();
      export const loadContentStudioLastKnownGoodRows = () => fixture.offline();
      export const loadFallbackArchitectureV3DashboardBundle = (scope, early) => fixture.core(scope, early);
      export const prefetchColdSkyArticleRows = publications => fixture.prefetch(publications);
      export const prefetchColdSkyPlacementRows = (selection, publications) => fixture.selected(selection, publications);
      export const loadFallbackArchitectureV3SkyPlacementDashboardBundle = (selection, early) => fixture.placement(selection, early);
      export const refreshContentPublications = () => fixture.refresh();
      export const contentPublicationsResolved = () => fixture.resolved;
      export const contentPublicationsAvailableOnline = () => fixture.online;
      export const skyPlacementPublicationIdentity = () => fixture.identity;
      export const missingSkyPlacementPublications = () => fixture.missing;
    `, loader: 'js' }));
  } }] });
function harness(overrides = {}) {
  const calls: string[] = [];
  const fixture: any = {
    identity: 'current', online: true, resolved: true, missing: [],
    bundle: async () => { calls.push('bundle'); }, refresh: async () => { calls.push('refresh'); },
    offline: async () => { calls.push('offline'); },
    prefetch: () => { calls.push('prefetch'); return undefined; },
    selected: () => { calls.push('selected'); return undefined; },
    core: async (scope: string) => { assert.equal(scope, "sky"); calls.push('core'); return 'core'; },
    placement: async () => { calls.push('placement'); return 'placement'; }, ...overrides
  };
  const context: any = { module: { exports: {} }, fixture, setTimeout, clearTimeout };
  vm.runInNewContext(built.outputFiles[0].text, context);
  return { calls, fixture, prepare: context.module.exports.prepareSkyPlacementSources, attach: context.module.exports.prefetchColdSkyPlacementSources };
}
{
  const h = harness();
  const first = h.prepare();
  assert.equal(h.prepare(), first, 'Simultaneous callers share one request, including ledger-triggered rerenders');
  assert.equal((await first).identity, 'current');
  assert.deepEqual(h.calls, ['refresh', 'bundle', 'core', 'placement']);
  await h.prepare();
  assert.equal(h.calls.filter(x => x === 'core').length, 2, 'Settled sources are revalidated on the next request');
}
{
  const h = harness({ online: false, resolved: false });
  h.fixture.offline = async () => { h.calls.push('offline'); h.fixture.resolved = true; h.fixture.identity = 'offline'; };
  assert.equal((await h.prepare()).identity, 'offline');
  assert.deepEqual(h.calls, ['refresh', 'bundle', 'offline', 'core', 'placement']);
}
{
  const h = harness(); let calls = 0;
  h.fixture.core = async () => { if (++calls === 1) h.fixture.identity = 'recovered'; return calls; };
  const result = await h.prepare();
  assert.equal(calls, 2, 'A fallback-ledger change must re-resolve both source planes');
  assert.equal(result.identity, 'recovered');
  assert.equal(result.coreBundle, 2);
}
{
  const h = harness(); let calls = 0;
  h.fixture.core = async () => { h.fixture.identity = String(++calls); };
  await assert.rejects(h.prepare(), /changed during loading/);
  assert.equal(calls, 2, 'Continuous publication changes fail closed after a bounded retry');
}
{
  const h = harness({ missing: ['sky-placement/article/sun/virgo'] });
  await assert.rejects(h.prepare(), /Current Sky publications did not load/);
  h.fixture.missing = [];
  assert.equal((await h.prepare()).identity, 'current', 'A failed request must not poison Retry');
}
{
  const h = harness({ online: false, resolved: false });
  await assert.rejects(h.prepare(), /publication state is unavailable/);
  assert.equal(h.calls.includes('core'), false, 'Unknown publication state must not reveal bundled copy');
}
{
  let release!: () => void;
  const publications = new Promise<void>(resolve => { release = resolve; });
  const h = harness({ refresh: () => publications });
  const handle = { discard: () => h.calls.push('discard') };
  h.fixture.prefetch = (gate: Promise<void>) => { assert.equal(gate, publications); h.calls.push('prefetch'); return handle; };
  let attempts = 0;
  h.fixture.core = async (scope: string, early: unknown) => {
    assert.equal(scope, 'sky-article');
    assert.equal(early, attempts++ === 0 ? handle : undefined, 'An identity retry cannot reuse early rows.');
    h.fixture.identity = 'newer';
    return 'core';
  };
  const first = h.prepare('article:sun/libra');
  assert.equal(h.prepare('article:sun/libra'), first);
  assert.deepEqual(h.calls, ['bundle', 'prefetch']);
  release();
  assert.equal((await first).identity, 'newer');
  assert.equal(attempts, 2);
  assert.equal(h.calls.at(-1), 'discard');
}
{
  const h = harness({ online: false, resolved: false });
  h.fixture.prefetch = () => ({ discard: () => h.calls.push('discard') });
  h.fixture.offline = async () => { h.calls.push('offline'); h.fixture.resolved = true; };
  h.fixture.core = async (scope: string, early: unknown) => {
    assert.equal(scope, 'sky-article'); assert.equal(early, undefined); h.calls.push('core');
  };
  await h.prepare('article:sun/libra');
  assert(h.calls.indexOf('discard') < h.calls.indexOf('offline'), 'A failed live ledger discards transport before offline recovery.');
}
console.log('PASS: live Sky avoids the offline download, coalesces requests, recovers coherent offline identities, and fails closed on missing or changing publications.');

{
  let release!: () => void;
  const publications = new Promise<void>(resolve => { release = resolve; });
  const h = harness({ refresh: () => publications });
  const handle = { discard: () => h.calls.push('selected-discard') };
  h.fixture.selected = (selection: string, gate: Promise<void>) => {
    assert.equal(selection, 'article:sun/libra'); assert.equal(gate, publications);
    h.calls.push('selected'); return handle;
  };
  h.fixture.core = async () => { h.calls.push('core'); return 'core'; };
  h.fixture.placement = async (selection: string, early: unknown) => {
    assert.equal(selection, 'article:sun/libra'); assert.equal(early, handle);
    h.calls.push('placement'); return 'placement';
  };
  const first = h.prepare('article:sun/libra');
  assert.equal(h.calls.includes('selected'), false, 'Unresolved auth cannot start selected speculation.');
  h.attach('article:sun/libra');
  assert.equal(h.prepare('article:sun/libra'), first, 'Late guest confirmation must attach to the same preparation.');
  h.attach('article:sun/libra');
  assert.equal(h.calls.filter(x => x === 'selected').length, 1, 'A rerender cannot duplicate selected transport.');
  release(); await first;
  assert.equal(h.calls.filter(x => x === 'core').length, 1);
  assert.equal(h.calls.filter(x => x === 'placement').length, 1);
  assert.equal(h.calls.at(-1), 'selected-discard');
  h.attach('article:sun/libra');
  assert.equal(h.calls.at(-1), 'selected-discard', 'Auth completion cannot restart a settled warm/member source load.');
}
