import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { validContentPublication, publicationLedgerBoundaries } from '../apps/web/src/content/contentPublicationState';

const built = await build({ entryPoints: ['apps/web/src/services/contentPublications.ts'], bundle: true,
  platform: 'node', format: 'cjs', write: false, plugins: [{ name: 'ledger-fixture', setup(builder) {
    builder.onResolve({ filter: /\/auth$|contentPublicationState$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
      export const getSupabaseClient = async () => fixture.client;
      export const publicationLedgerBoundaries = ${JSON.stringify(publicationLedgerBoundaries)};
      export const installContentPublications = rows => fixture.installed.push(rows);
      export const validContentPublication = value => fixture.valid(value);
      export const publicationLedgerReady = () => false;
      export const contentPublicationRecords = () => [];
    ` }));
  } }] });
const row = (content_key: string) => ({ content_key, state: 'live', revision: 1,
  row_id: content_key, row_updated_at: '2026-09-21T16:00:00Z', updated_at: '2026-09-21T16:00:00Z' });
const records = ['!', '__content-publication-ledger/v1', 'authored/compat-pair/s', 'authored/transit-aspect/s', 'authored/transit-house-sign/s', 'fallback-hook/n', 'sky-placement', 'zz/future',
  ...Array.from({ length: 2010 }, (_, i) => `authored/compat-pair/a-${String(i).padStart(4, '0')}`)].sort().map(row);
function harness(reply?: (request: any, data: any[]) => Promise<any>, inventory = records) {
  const requests: any[] = [], installed: any[] = [];
  const client = { from(table: string) {
    assert.equal(table, 'content_publications');
    const request: any = { filters: [] };
    const query: any = {
      select: () => query, order: () => query, limit: (limit: number) => { request.limit = limit; return query; },
      retry: (enabled: boolean) => { assert.equal(enabled, false, 'Unavailable ledgers must reach offline recovery without stacked transport retries'); return query; },
      gte: (_: string, value: string) => { request.filters.push(['gte', value]); return query; },
      lt: (_: string, value: string) => { request.filters.push(['lt', value]); return query; },
      gt: (_: string, value: string) => { request.filters.push(['gt', value]); return query; },
      abortSignal: async (signal: AbortSignal) => {
        assert(signal instanceof AbortSignal); requests.push(request);
        const data = inventory.filter(row => request.filters.every(([op, value]: string[]) =>
          op === 'gte' ? row.content_key >= value : op === 'lt' ? row.content_key < value : row.content_key > value)).slice(0, request.limit);
        return reply ? reply(request, data) : { data, error: null };
      }
    };
    return query;
  } };
  const context: any = { module: { exports: {} }, fixture: { client, installed, valid: validContentPublication }, AbortSignal,
    fetch: async () => new Response('{}', { status: 503 }) };
  vm.runInNewContext(built.outputFiles[0].text, context);
  return { ...context.module.exports, requests, installed };
}
{
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const h = harness(async (_request, data) => { await held; return { data }; });
  const pending = h.refreshContentPublications(true);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.requests.length, 6, 'Six ranges must start without waiting for the first response');
  assert.equal(h.installed.length, 0, 'Partial ranges never install');
  const same = h.refreshContentPublications(true);
  release(); await Promise.all([pending, same]);
  assert.equal(h.requests.length, 8, 'Large ranges keep paging; simultaneous callers coalesce');
  assert.equal(h.installed.length, 1);
  assert.deepEqual(Array.from(h.installed[0], (r: any) => r.content_key).sort(), records.map(r => r.content_key));
  assert(h.contentPublicationsAvailableOnline());
}
for (const failure of ['network', 'invalid', 'cursor']) {
  const h = harness(async (request, data) => {
    if (request.filters.some(([op]: string[]) => op === 'gt')) {
      if (failure === 'network') return { error: { message: 'offline' } };
      if (failure === 'invalid') return { data: [{}] };
      return { data: Array.from({ length: 1000 }, () => records[0]) };
    }
    return { data };
  });
  await h.refreshContentPublications(true);
  assert.equal(h.installed.length, 0, `${failure}: keep the previous complete ledger`);
  assert.equal(h.contentPublicationsAvailableOnline(), false);
}
console.log('PASS: concurrent disjoint publication ranges, boundary/future keys, large-range pagination, coalescing, all-or-nothing failure and non-advancing cursor.');
{
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const changed = records.find(record => record.content_key === 'zz/future')!;
  const h = harness(async (_request, data) => {
    const snapshot = structuredClone(data);
    await held;
    return { data: snapshot };
  });
  const pending = h.refreshContentPublications();
  await Promise.resolve(); await Promise.resolve();
  changed.revision = 2;
  const publicationNotice = h.refreshContentPublicationsAfterUpdate();
  const duplicateNotice = h.refreshContentPublicationsAfterUpdate();
  release();
  await Promise.all([pending, publicationNotice, duplicateNotice]);
  assert.equal(h.installed.at(-1).find((record: any) => record.content_key === changed.content_key).revision, 2,
    'A publication notice during an older ledger read must fetch the post-publication state.');
  assert.equal(h.installed.length, 2, 'Concurrent notices share one follow-up read.');
  assert.equal(h.requests.length, 16, 'Do not recursively reload the complete ledger.');
  changed.revision = 1;
  console.log('PASS publication notice during an older ledger read, fresh revision and coalesced follow-up without a refresh loop.');
}
{
  const h = harness();
  let release!: (rows: unknown[]) => void;
  const relay = new Promise<unknown[]>(resolve => { release = resolve; });
  const early = h.refreshContentPublications(false, () => relay);
  const mounted = h.refreshContentPublications();
  assert.equal(h.requests.length, 0, 'App must join the relay while its module/data is still loading');
  release(records);
  await Promise.all([early, mounted]);
  assert.equal(h.requests.length, 0);
  assert.equal(h.installed.length, 1);
  assert(h.contentPublicationsAvailableOnline());
}
{
  const h = harness();
  await h.refreshContentPublications(true, async () => { throw new Error('Relay unavailable'); });
  assert.equal(h.installed.length, 1, 'An unavailable relay falls back to the complete direct read');
  assert.equal(h.requests.length, 8);
  assert(h.contentPublicationsAvailableOnline());
}

{
  const inventory = ['authored/compat-pair/a-', 'authored/transit-aspect/a-',
    'authored/transit-house-sign/a-', 'authored/transit-house-sign/t-',
    'fallback-hook/p-', 'sky-placement/article/'].flatMap(prefix =>
      Array.from({ length: 700 }, (_, i) => row(`${prefix}${String(i).padStart(4, '0')}`))).sort((a,b) => a.content_key.localeCompare(b.content_key));
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const h = harness(async (_request, data) => { await held; return { data }; }, inventory);
  const pending = h.refreshContentPublications(true);
  await Promise.resolve(); await Promise.resolve();
  const firstWave = h.requests.length;
  release(); await pending;
  assert.equal(h.requests.length, firstWave, 'Balanced current families must finish in one concurrent wave, without a second network round trip');
  assert.equal(h.installed.length, 1);
  assert.deepEqual(Array.from(h.installed[0], (r: any) => r.content_key).sort(), inventory.map(r => r.content_key).sort());
  console.log('PASS balanced ledger completes in one concurrent wave with every publication intact.');
}

{
  let unavailable = false;
  let warmGate: Promise<void> | undefined;
  const h = harness(async (_request, data) => { await warmGate; return unavailable ? { error: { message: 'Synthetic offline' } } : { data }; });
  const availability: boolean[] = [], secondary: boolean[] = [], order: string[] = [];
  const stop = h.subscribeToContentPublicationAvailability(() => { availability.push(h.contentPublicationsAvailableOnline()); order.push('first'); });
  const stopSecondary = h.subscribeToContentPublicationAvailability(() => { secondary.push(h.contentPublicationsAvailableOnline()); order.push('second'); });
  await h.refreshContentPublications(true);
  assert.deepEqual(availability, [true]);
  let releaseWarm!: () => void;
  warmGate = new Promise<void>(resolve => { releaseWarm = resolve; });
  const warm = h.refreshContentPublications(true);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.contentPublicationsAvailableOnline(), true, 'Pending unchanged revalidation keeps last settled online availability.');
  assert.deepEqual(availability, [true]);
  releaseWarm(); await warm; warmGate = undefined;
  assert.deepEqual(availability, [true], 'Successful unchanged revalidation does not emit a false offline transition.');
  const savedLedger = h.installed.at(-1);
  unavailable = true;
  await h.refreshContentPublications(true);
  assert.deepEqual(availability, [true, false], 'Same-ledger transport failure must revoke guest readiness even without a publication change.');
  assert.deepEqual(secondary, [true, false]);
  assert.deepEqual(order, ['first', 'second', 'first', 'second'], 'Independent listeners retain registration order.');
  stopSecondary();
  assert.equal(h.installed.at(-1), savedLedger, 'Offline transition preserves the complete prior ledger.');
  unavailable = false;
  await h.refreshContentPublications(true);
  assert.deepEqual(availability, [true, false, true]);
  assert.deepEqual(secondary, [true, false], 'Removing one listener leaves the other active.');
  assert.deepEqual(order, ['first', 'second', 'first', 'second', 'first']);
  stop(); unavailable = true;
  await h.refreshContentPublications(true);
  assert.deepEqual(availability, [true, false, true], 'Availability subscriptions clean up with the owning reader.');
}
