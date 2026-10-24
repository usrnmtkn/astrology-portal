import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const built = await build({ entryPoints: ['apps/web/src/services/skyPlacementHydration.ts'], bundle: true,
  platform: 'node', format: 'cjs', write: false, plugins: [{ name: 'sources', setup(builder) {
    builder.onResolve({ filter: /fallbackArchitectureV3Runtime|generatedContent|contentPublications|skyPlacementPublicationGuard/ }, args => ({ path: args.path, namespace: 'source-fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'source-fixture' }, () => ({ contents: `
      export const loadSkyPlacementFallbackArchitectureV3Bundle = () => fixture.bundle();
      export const loadInitialSkyListFallbackArchitectureV3Bundle = () => fixture.listBundle();
      export const loadContentStudioLastKnownGoodRows = () => fixture.offline();
      const pendingCore = new Map(), pendingSelected = new Map();
      function owned(map, key, read) {
        let request = map.get(key);
        if (!request) { request = Promise.resolve().then(read).finally(() => { if (map.get(key) === request) map.delete(key); }); map.set(key, request); }
        return request;
      }
      export const loadFallbackArchitectureV3DashboardBundle = (scope, early) => owned(pendingCore, fixture.identity + ':' + scope, () => fixture.core(scope, early));
      export const prefetchColdSkyArticleRows = publications => fixture.prefetch(publications);
      export const prefetchColdSkyPlacementRows = (selection, publications) => fixture.selected(selection, publications);
      export const loadFallbackArchitectureV3SkyPlacementDashboardBundle = (selection, early) => owned(pendingSelected, fixture.identity + ':' + selection, () => fixture.placement(selection, early));
      export const refreshContentPublications = () => fixture.refresh();
      export const contentPublicationsResolved = () => fixture.resolved;
      export const contentPublicationsAvailableOnline = () => fixture.online;
      export const skyPlacementPublicationIdentity = () => fixture.identity;
      export const missingSkyPlacementPublications = () => fixture.missing;
    `, loader: 'js' }));
  } }] });
function harness(overrides = {}, clock = { setTimeout, clearTimeout }) {
  const calls: string[] = [];
  const fixture: any = {
    identity: 'current', online: true, resolved: true, missing: [],
    bundle: async () => { calls.push('bundle'); }, refresh: async () => { calls.push('refresh'); },
    listBundle: async () => { calls.push('list-bundle'); },
    offline: async () => { calls.push('offline'); },
    prefetch: () => { calls.push('prefetch'); return undefined; },
    selected: () => { calls.push('selected'); return undefined; },
    core: async (scope: string) => { assert.equal(scope, "sky"); calls.push('core'); return 'core'; },
    placement: async () => { calls.push('placement'); return 'placement'; }, ...overrides
  };
  const context: any = { module: { exports: {} }, fixture, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout };
  vm.runInNewContext(built.outputFiles[0].text, context);
  return { calls, fixture, prepare: context.module.exports.prepareSkyPlacementSources, attach: context.module.exports.prefetchColdSkyPlacementSources };
}
{
  const h = harness();
  const first = h.prepare();
  const second = h.prepare();
  assert.notEqual(second, first, 'Real callers have independent completion/deadline ownership; only transport is shared.');
  assert.equal((await first).identity, 'current'); await second;
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
  const second = h.prepare('article:sun/libra');
  assert.notEqual(second, first, 'Caller completions are independent; publication/core/selected work remains coalesced.');
  assert.deepEqual(h.calls, ['bundle', 'prefetch']);
  release();
  assert.equal((await first).identity, 'newer'); await second;
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
  const fullBundle = new Promise<void>(resolve => { release = resolve; });
  const h = harness({ bundle: () => { h.calls.push('bundle'); return fullBundle; }, core: async () => 'core' });
  const list = h.prepare('sun/aries', { initialList: true });
  let fullDone = false;
  const full = h.prepare('sun/aries');
  void full.then(() => { fullDone = true; });
  await list;
  assert.equal(fullDone, false, 'A full consumer cannot inherit initial-list readiness for the same selection.');
  assert.equal(h.calls.filter(call => call === 'list-bundle').length, 1);
  assert.equal(h.calls.filter(call => call === 'bundle').length, 1);
  release(); await full;
}

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
  const second = h.prepare('article:sun/libra');
  assert.notEqual(second, first, 'Late confirmation attaches transport to the shared preparation, not a shared completion timer.');
  h.attach('article:sun/libra');
  assert.equal(h.calls.filter(x => x === 'selected').length, 1, 'A rerender cannot duplicate selected transport.');
  release(); await Promise.all([first, second]);
  assert.equal(h.calls.filter(x => x === 'core').length, 1);
  assert.equal(h.calls.filter(x => x === 'placement').length, 1);
  assert.equal(h.calls.at(-1), 'selected-discard');
  h.attach('article:sun/libra');
  assert.equal(h.calls.at(-1), 'selected-discard', 'Auth completion cannot restart a settled warm/member source load.');
}

// Consumer completion differs; transport and the publication epoch do not.
{
  let release!: (value: string) => void;
  const selected = new Promise<string>(resolve => { release = resolve; });
  const h = harness({ placement: () => { h.calls.push('placement'); return selected; } });
  const candidate = Promise.resolve('current');
  const guest = h.prepare(undefined, { compiledGuest: candidate });
  const member = h.prepare(); let memberDone = false;
  void member.then(() => { memberDone = true; });
  const result = await guest;
  assert.equal(result.scope, 'compiled-guest'); assert.equal(result.placementBundle, null);
  assert.equal(memberDone, false);
  const joiningMember = h.prepare(); assert.notEqual(joiningMember, member);
  let joinedDone = false; void joiningMember.then(() => { joinedDone = true; });
  assert.equal(joinedDone, false, 'A late member cannot inherit the completed subset.');
  assert.equal(h.calls.filter(call => call === 'refresh').length, 1);
  assert.equal(h.calls.filter(call => call === 'core').length, 1);
  assert.equal(h.calls.filter(call => call === 'placement').length, 1);
  release('selected'); assert.equal((await member).placementBundle, 'selected'); await joiningMember;
  assert.equal((await member).scope, 'full');
}
for (const identity of [null, 'stale']) {
  let release!: (value: string) => void;
  const selected = new Promise<string>(resolve => { release = resolve; });
  const h = harness({ placement: () => selected });
  let done = false;
  const guest = h.prepare(undefined, { compiledGuest: Promise.resolve(identity) });
  void guest.then(() => { done = true; });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(done, false, 'Absent/stale admitted edition retains the full selected requirement.');
  release('selected'); assert.equal((await guest).scope, 'full');
}
{
  const h = harness({ online: false });
  const result = await h.prepare(undefined, { compiledGuest: Promise.resolve('current') });
  assert.equal(result.scope, 'full', 'Offline ledgers never admit the guest subset.');
  assert.equal(result.placementBundle, 'placement');
}
{
  const callbacks = new Map<number, () => void>(); let next = 0;
  const clock: any = { setTimeout: (callback: () => void, ms: number) => {
    assert.equal(ms, 20_000); callbacks.set(++next, callback); return next;
  }, clearTimeout: (id: number) => callbacks.delete(id) };
  let transportDeadline!: (error: Error) => void;
  const physicalRead = new Promise<string>((_, reject) => { transportDeadline = reject; });
  const h = harness({ placement: () => physicalRead }, clock);
  const guestRequest = h.prepare(undefined, { compiledGuest: Promise.resolve('current') });
  const full = h.prepare();
  const guest = await guestRequest;
  assert.equal(guest.scope, 'compiled-guest');
  assert.equal(callbacks.size, 1, 'Only the unfinished full completion retains its own20s timer.');
  const failed = assert.rejects(full, /timed out/);
  for (const callback of [...callbacks.values()]) callback();
  await failed; assert.equal(callbacks.size, 0);
  transportDeadline(new Error('Synthetic physical transport deadline'));
  for (let turn = 0; turn < 8; turn++) await Promise.resolve();
  h.fixture.placement = async () => 'retried';
  assert.equal((await h.prepare()).placementBundle, 'retried', 'A timed-out full request does not poison Retry.');
}
console.log('PASS: compiled guests and full readers share transport, retain separate required completion, exact identity, offline and20s retry semantics.');

{
  let release!: (value: string) => void;
  const selected = new Promise<string>(resolve => { release = resolve; });
  const h = harness({ placement: () => selected }); let cores = 0;
  h.fixture.core = async () => { h.calls.push('core'); if (++cores === 1) h.fixture.identity = 'revised'; return 'core'; };
  let done = false;
  const guest = h.prepare(undefined, { compiledGuest: Promise.resolve('current') });
  void guest.then(() => { done = true; });
  // An admitted edition from the old generation cannot authorize a subset of
  // a new generation. The bounded source retry still requires selected rows.
  for (let turn = 0; turn < 30 && cores < 2; turn++) await Promise.resolve();
  assert.ok(cores >= 2 && cores <= 4, 'Each full/guest completion has at most two identity attempts.');
  assert.equal(done, false);
  release('selected');
  assert.equal((await guest).scope, 'full');
  assert.equal((await guest).identity, 'revised');
  assert.ok(cores >= 2 && cores <= 4);
}
{
  let rejectSelected!: (error: Error) => void;
  const selected = new Promise<string>((_, reject) => { rejectSelected = reject; });
  const h = harness({ placement: () => selected });
  const guestRequest = h.prepare(undefined, { compiledGuest: Promise.resolve('current') });
  const full = h.prepare();
  const guest = await guestRequest;
  const fullFailure = assert.rejects(full, /Synthetic selected failure/);
  rejectSelected(new Error('Synthetic selected failure'));
  await fullFailure;
  assert.equal(guest.scope, 'compiled-guest', 'Optional selected failure cannot rewrite the completed guest result.');
  h.fixture.placement = async () => 'recovered';
  assert.equal((await h.prepare()).scope, 'full');
}


// A still-pending guest must not pin a settled full result across epochs.
{
  let admitGuest!: (identity: string | null) => void;
  const admission = new Promise<string | null>(resolve => { admitGuest = resolve; });
  const h = harness();
  const guest = h.prepare(undefined, { compiledGuest: admission });
  const first = h.prepare(); assert.equal((await first).identity, 'current');
  h.fixture.identity = 'revision-b';
  const current = h.prepare(); assert.notEqual(current, first);
  assert.equal((await current).identity, 'revision-b');
  const staleGuest = assert.rejects(guest, /changed during loading/);
  admitGuest(null); await staleGuest;
  assert.ok(h.calls.filter(call => call === 'core').length >= 2);
}
{
  let admitGuest!: (identity: string | null) => void;
  const admission = new Promise<string | null>(resolve => { admitGuest = resolve; });
  const callbacks = new Map<number, () => void>(); let next = 0;
  const clock: any = { setTimeout: (callback: () => void) => { callbacks.set(++next, callback); return next; },
    clearTimeout: (id: number) => callbacks.delete(id) };
  let releaseSelected!: (value: string) => void;
  const selected = new Promise<string>(resolve => { releaseSelected = resolve; });
  const h = harness({ placement: () => { h.calls.push('placement'); return selected; } }, clock);
  const guest = h.prepare(undefined, { compiledGuest: admission });
  const first = h.prepare(); const failure = assert.rejects(first, /timed out/);
  // Guest was the first real caller; its timer must survive the full caller timeout.
  callbacks.get(2)!(); await failure;
  const retry = h.prepare(); assert.notEqual(retry, first);
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
  assert.equal(h.calls.filter(call => call === 'placement').length, 1, 'Retry joins while the original physical response is still held.');
  releaseSelected('current'); admitGuest('current');
  assert.equal((await retry).scope, 'full'); await guest;
  assert.equal(h.calls.filter(call => call === 'placement').length, 1,
    'Retry over still-valid in-flight selected transport does not duplicate the read.');
  assert.equal(callbacks.size, 0);
}
{
  let admitGuest!: (identity: string | null) => void;
  const admission = new Promise<string | null>(resolve => { admitGuest = resolve; });
  const h = harness({ placement: async () => { throw new Error('Synthetic full failure'); } });
  const guest = h.prepare(undefined, { compiledGuest: admission });
  const failed = h.prepare(); await assert.rejects(failed, /Synthetic full failure/);
  h.fixture.placement = async () => 'recovered';
  const retry = h.prepare(); assert.notEqual(retry, failed);
  assert.equal((await retry).placementBundle, 'recovered');
  admitGuest('current'); await guest;
  assert.equal(h.calls.filter(call => call === 'core').length, 2, 'A settled core may revalidate while the rejected selected read retries; in-flight sharing is tested at its actual owner.');
}


{
  let releaseA!: (value: string) => void;
  const selectedA = new Promise<string>(resolve => { releaseA = resolve; });
  const h = harness({ placement: () => { h.calls.push('selected-a'); return selectedA; } });
  const guestA = await h.prepare(undefined, { compiledGuest: Promise.resolve('current') });
  const oldFull = h.prepare();
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
  assert.equal(h.calls.filter(call => call === 'selected-a').length, 1);
  const oldRejected = assert.rejects(oldFull, /changed during loading/);
  h.fixture.identity = 'revision-b';
  h.fixture.placement = async () => { h.calls.push('selected-b'); return 'selected-b'; };
  const fullB = h.prepare(); let resolvedB = false;
  void fullB.then(() => { resolvedB = true; });
  try {
    for (let turn = 0; turn < 50 && !resolvedB; turn++) await Promise.resolve();
    assert.equal(resolvedB, true, 'Revision B must not wait for the held revision A selected request or deadline.');
    assert.equal((await fullB).identity, 'revision-b');
    assert.equal((await fullB).placementBundle, 'selected-b');
    assert.equal(h.calls.filter(call => call === 'selected-a').length, 1);
    assert.equal(h.calls.filter(call => call === 'selected-b').length, 1);
  } finally { releaseA('stale-a'); await oldRejected; }
}

// Guest completion owns no unused full completion or shadow deadline. Claimed
// selected work remains owned below preparation and is reusable by a late full.
{
  const callbacks = new Map<number, () => void>(); let next = 0;
  const clock: any = { setTimeout: (callback: () => void) => { callbacks.set(++next, callback); return next; },
    clearTimeout: (id: number) => callbacks.delete(id) };
  let release!: (value: string) => void;
  const selected = new Promise<string>(resolve => { release = resolve; });
  const h = harness({ placement: () => { h.calls.push('physical-selected'); return selected; } }, clock);
  assert.equal((await h.prepare(undefined, { compiledGuest: Promise.resolve('current') })).scope, 'compiled-guest');
  assert.equal(callbacks.size, 0, 'Completed guest leaves no automatic full timer.');
  const full = h.prepare(); let done = false; void full.then(() => { done = true; });
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
  assert.equal(done, false, 'Late full must wait for its required selected plane.');
  assert.equal(h.calls.filter(x => x === 'physical-selected').length, 1, 'Guest cleanup preserves claimed physical selected work.');
  release('late-selected'); assert.equal((await full).placementBundle, 'late-selected');
  assert.equal(callbacks.size, 0);
}
for (const online of [true, false]) {
  const callbacks = new Map<number, () => void>(); let next = 0;
  const clock: any = { setTimeout: (callback: () => void) => { callbacks.set(++next, callback); return next; },
    clearTimeout: (id: number) => callbacks.delete(id) };
  let release!: () => void;
  const publications = new Promise<void>(resolve => { release = resolve; });
  const h = harness({ online, refresh: () => publications }, clock);
  const request = h.prepare(); const failed = assert.rejects(request, /timed out/);
  for (const callback of [...callbacks.values()]) callback(); await failed;
  release(); for (let turn = 0; turn < 20; turn++) await Promise.resolve();
  assert.equal(h.calls.includes('offline'), false, 'Abandoned setup cannot launch offline recovery.');
  assert.equal(h.calls.includes('core'), false, 'Abandoned setup cannot launch core work.');
  assert.equal(h.calls.includes('placement'), false, 'Abandoned setup cannot launch selected work.');
  assert.equal(callbacks.size, 0);
}
console.log('PASS: no guest shadow deadline, late full joins selected, and abandoned setup starts no loaders.');
