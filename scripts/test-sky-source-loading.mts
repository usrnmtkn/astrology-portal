import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const built = await build({ entryPoints: ['apps/web/src/services/skyPlacementHydration.ts'], bundle: true,
  platform: 'node', format: 'cjs', write: false, plugins: [{ name: 'sources', setup(builder) {
    builder.onResolve({ filter: /fallbackArchitectureV3Runtime|generatedContent|contentPublications|skyPlacementPublicationGuard/ }, args => ({ path: args.path, namespace: 'source-fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'source-fixture' }, () => ({ contents: `
      export const loadSkyPlacementFallbackArchitectureV3Bundle = () => fixture.bundle();
      export const loadContentStudioLastKnownGoodRows = () => fixture.offline();
      export const loadFallbackArchitectureV3DashboardBundle = scope => fixture.core(scope);
      export const loadFallbackArchitectureV3SkyPlacementDashboardBundle = () => fixture.placement();
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
    core: async (scope: string) => { assert.equal(scope, "sky"); calls.push('core'); return 'core'; },
    placement: async () => { calls.push('placement'); return 'placement'; }, ...overrides
  };
  const context: any = { module: { exports: {} }, fixture, setTimeout, clearTimeout };
  vm.runInNewContext(built.outputFiles[0].text, context);
  return { calls, fixture, prepare: context.module.exports.prepareSkyPlacementSources };
}
{
  const h = harness();
  const first = h.prepare();
  assert.equal(h.prepare(), first, 'Simultaneous callers share one request, including ledger-triggered rerenders');
  assert.equal((await first).identity, 'current');
  assert.deepEqual(h.calls, ['bundle', 'refresh', 'core', 'placement']);
  await h.prepare();
  assert.equal(h.calls.filter(x => x === 'core').length, 2, 'Settled sources are revalidated on the next request');
}
{
  const h = harness({ online: false, resolved: false });
  h.fixture.offline = async () => { h.calls.push('offline'); h.fixture.resolved = true; h.fixture.identity = 'offline'; };
  assert.equal((await h.prepare()).identity, 'offline');
  assert.deepEqual(h.calls, ['bundle', 'refresh', 'offline', 'core', 'placement']);
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
console.log('PASS: live Sky avoids the offline download, coalesces requests, recovers coherent offline identities, and fails closed on missing or changing publications.');
