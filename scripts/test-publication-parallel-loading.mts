import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { validContentPublication } from '../apps/web/src/content/contentPublicationState';

const built = await build({ entryPoints: ['apps/web/src/services/contentPublications.ts'], bundle: true,
  platform: 'node', format: 'cjs', write: false, plugins: [{ name: 'ledger-fixture', setup(builder) {
    builder.onResolve({ filter: /\/auth$|contentPublicationState$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
      export const getSupabaseClient = async () => fixture.client;
      export const installContentPublications = rows => fixture.installed.push(rows);
      export const validContentPublication = value => fixture.valid(value);
      export const publicationLedgerReady = () => false;
      export const contentPublicationRecords = () => [];
    ` }));
  } }] });
const row = (content_key: string) => ({ content_key, state: 'live', revision: 1,
  row_id: content_key, row_updated_at: '2026-09-21T16:00:00Z', updated_at: '2026-09-21T16:00:00Z' });
const records = ['!', '__content-publication-ledger/v1', 'authored/compat-pair/s', 'authored/transit-house-sign/m', 'fallback-hook/n', 'zz/future',
  ...Array.from({ length: 2010 }, (_, i) => `authored/compat-pair/a-${String(i).padStart(4, '0')}`)].sort().map(row);
function harness(reply?: (request: any, data: any[]) => Promise<any>) {
  const requests: any[] = [], installed: any[] = [];
  const client = { from(table: string) {
    assert.equal(table, 'content_publications');
    const request: any = { filters: [] };
    const query: any = {
      select: () => query, order: () => query, limit: (limit: number) => { request.limit = limit; return query; },
      gte: (_: string, value: string) => { request.filters.push(['gte', value]); return query; },
      lt: (_: string, value: string) => { request.filters.push(['lt', value]); return query; },
      gt: (_: string, value: string) => { request.filters.push(['gt', value]); return query; },
      abortSignal: async (signal: AbortSignal) => {
        assert(signal instanceof AbortSignal); requests.push(request);
        const data = records.filter(row => request.filters.every(([op, value]: string[]) =>
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
  assert.equal(h.requests.length, 4, 'Four ranges must start without waiting for the first response');
  assert.equal(h.installed.length, 0, 'Partial ranges never install');
  const same = h.refreshContentPublications(true);
  release(); await Promise.all([pending, same]);
  assert.equal(h.requests.length, 6, 'Large ranges keep paging; simultaneous callers coalesce');
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
  assert.equal(h.requests.length, 6);
  assert(h.contentPublicationsAvailableOnline());
}
