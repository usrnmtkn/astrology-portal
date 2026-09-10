import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';

// No real credentials or storage calls, even when the handler loads local env.
const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'crud-contract-fixture', SUPABASE_URL: 'https://crud-contract.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const { default: handler } = await import(process.env.CRUD_CONTRACT_HANDLER ?? '../api/admin/generated-content.ts');
Object.assign(process.env, env);
const baseline = { id: 'qa-row', content_key: 'cms/qa/crud-contract', surface: 'sky', mode: 'feed', target_date: null, event_type: 'cms-surface-override', status: 'DRAFT', lane: 'serving', review_state: null, headline: 'QA heading', summary: '', body: 'QA original', sections: [], facts: {}, source_snapshot: { contentSystem: 'cms-surface-override', allowedSlots: [] }, provider: 'manual-admin', updated_at: '2026-09-10T12:00:00Z' };
let rows, writes, afterLookup, beforeInsert, sequence;
function reset(initial = [baseline]) {
  rows = new Map(initial.map(row => [row.id, structuredClone(row)]));
  writes = []; afterLookup = null; beforeInsert = null; sequence = 0;
}
const identity = row => JSON.stringify([row.content_key, row.target_date ?? null, row.mode]);
function matches(row, params) {
  return [...params].every(([field, value]) => {
    if (['select', 'limit', 'order', 'offset', 'on_conflict'].includes(field)) return true;
    if (value === 'is.null') return row[field] == null;
    if (value.startsWith('eq.')) return String(row[field] ?? '') === value.slice(3);
    if (value.startsWith('neq.')) return String(row[field] ?? '') !== value.slice(4);
    if (value.startsWith('in.(')) return value.slice(4, -1).split(',').map(v => v.replaceAll('"', '')).includes(String(row[field]));
    throw new Error(`Unmodeled filter ${field}=${value}`);
  });
}
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  assert.equal(url.origin, env.SUPABASE_URL);
  assert.equal(url.pathname, '/rest/v1/generated_interpretations');
  const method = init.method ?? 'GET';
  const found = [...rows.values()].filter(row => matches(row, url.searchParams));
  if (method === 'GET') {
    const snapshot = structuredClone(found);
    afterLookup?.(); afterLookup = null;
    return Response.json(snapshot);
  }
  writes.push({ method, filters: url.searchParams, prefer: init.headers?.prefer });
  if (method === 'DELETE') {
    for (const row of found) rows.delete(row.id);
    return Response.json(found);
  }
  const body = JSON.parse(init.body);
  if (method === 'PATCH') {
    const result = found.map(row => ({ ...row, ...body }));
    for (const row of result) rows.set(row.id, row);
    return Response.json(result);
  }
  if (method === 'POST') {
    beforeInsert?.(); beforeInsert = null;
    const saved = [];
    for (const incoming of Array.isArray(body) ? body : [body]) {
      const existing = [...rows.values()].find(row => identity(row) === identity(incoming));
      if (existing) {
        if (init.headers.prefer?.includes('ignore-duplicates')) continue;
        if (!init.headers.prefer?.includes('merge-duplicates')) return Response.json({ message: 'duplicate key' }, { status: 409 });
      }
      const row = { lane: 'serving', review_state: null, target_date: null, updated_at: `2026-09-10T13:00:0${++sequence}Z`, ...existing, ...incoming, id: existing?.id ?? `qa-created-${sequence}` };
      rows.set(row.id, row); saved.push(row);
    }
    return Response.json(saved);
  }
  throw new Error(`Unmodeled method ${method}`);
};
async function invoke(method, body, { raw = false, parsed = false, secret = env.CONTENT_GENERATION_SECRET, query = '' } = {}) {
  const request = Readable.from(parsed || body === undefined ? [] : [raw ? body : JSON.stringify(body)]);
  Object.assign(request, { method, url: `/api/admin/generated-content${query}`, headers: { authorization: `Bearer ${secret}` }, ...(parsed ? { body } : {}) });
  const response = { statusCode: 0, setHeader() {}, end(value) { this.payload = JSON.parse(value); } };
  await handler(request, response);
  return { status: response.statusCode, ...response.payload };
}
function writeBody(key = baseline.content_key) {
  return { contentKey: key, surface: 'sky', mode: 'feed', eventType: 'cms-surface-override', status: 'DRAFT', body: 'QA updated' };
}

await test('malformed, missing, primitive, array and invalid typed bodies fail without writes', async () => {
  for (const [body, options] of [[undefined, {}], ['{', { raw: true }], [null, {}], [[], {}], [true, {}], [42, {}], [[], { parsed: true }], ['{', { parsed: true }], [{ contentKey: 7 }, {}], [{ rows: [null] }, {}], [{ rows: [] }, {}], [{ status: '' }, {}]]) {
    reset(); const result = await invoke('POST', body, options);
    assert.equal(result.status, 400, JSON.stringify({ body, result }));
    assert.deepEqual(writes, []);
  }
  reset(); assert.equal((await invoke('POST', writeBody('cms/qa/parsed'), { parsed: true })).status, 200);
});

await test('empty and unsupported updates cannot mutate versions, history, or prose', async () => {
  for (const packageRow of [false, true]) {
    const original = packageRow ? { ...baseline, facts: { fallbackArchitectureV3: true }, sections: { packageRecord: { contentKey: baseline.content_key, content_role: 'authored_card', Body: 'QA original', review_status: 'needs_review' } } } : baseline;
    for (const body of [{ id: original.id }, { id: original.id, lane: null }, { id: original.id, surface: '' }, { id: original.id, sourceLifecycleAction: '' }, { id: original.id, unknownField: 'ignored' }, { id: original.id, ownerAction: 'unknown-action', body: 'QA unsafe' }]) {
      reset([original]); assert.equal((await invoke('PATCH', body)).status, 400);
      assert.deepEqual([...rows.values()], [original]); assert.deepEqual(writes, []);
    }
  }
  reset(); assert.equal((await invoke('POST', { ...writeBody(), ownerAction: 'approve-package-revision' })).status, 400);
});

await test('publication rejects held/reference states on both create and update', async () => {
  for (const fields of [{ status: 'LIVE', reviewState: 'owner-review-required' }, { status: 'LIVE', lane: 'reference' }]) {
    for (const method of ['POST', 'PATCH']) {
      reset(); const result = await invoke(method, method === 'POST' ? { ...writeBody('cms/qa/new'), ...fields } : { id: baseline.id, ...fields });
      assert.equal(result.status, 409); assert.deepEqual(writes, []);
    }
  }
  for (const fields of [{ reviewState: 'owner-review-required' }, { lane: 'reference' }]) {
    reset([{ ...baseline, status: 'LIVE' }]); assert.equal((await invoke('PATCH', { id: baseline.id, ...fields })).status, 409);
    assert.deepEqual(writes, []);
  }
  reset([{ ...baseline, lane: 'reference', review_state: 'owner-review-required' }]);
  assert.equal((await invoke('POST', { rows: [{ ...writeBody(), status: 'LIVE' }] })).status, 409);
  assert.deepEqual(writes, []);
  assert.equal((await invoke('POST', { rows: [{ ...writeBody(), status: 'LIVE', lane: 'serving', reviewState: null }] })).status, 200);
  assert.equal(rows.get(baseline.id).status, 'LIVE'); assert.equal(rows.get(baseline.id).review_state, null);
});

await test('create/read/edit/reopen/review/publish/archive/restore/delete with stale-write protection', async () => {
  reset([]);
  const created = await invoke('POST', writeBody()); assert.equal(created.status, 200);
  let row = created.rows[0];
  assert.equal((await invoke('POST', writeBody())).status, 409);
  const originalVersion = row.updated_at;
  for (const fields of [{ body: 'QA first revision' }, { body: 'QA second revision' }, { status: 'REVIEWED' }, { status: 'LIVE', lane: 'serving', reviewState: null }]) {
    const result = await invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, ...fields });
    assert.equal(result.status, 200, JSON.stringify(result)); row = result.rows[0];
    assert.deepEqual((await invoke('GET', undefined, { query: `?id=${row.id}&status=all&visibility=all` })).rows[0], row);
  }
  assert.equal(row.body, 'QA second revision'); assert.equal(row.review_state, null);
  assert.equal((await invoke('PATCH', { id: row.id, expectedUpdatedAt: originalVersion, body: 'QA stale' })).status, 409);
  assert.equal((await invoke('DELETE', undefined, { query: `?id=${row.id}` })).status, 409);
  for (const status of ['ARCHIVED', 'DRAFT']) {
    const result = await invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, status });
    assert.equal(result.status, 200); row = result.rows[0]; assert.equal(row.body, 'QA second revision');
  }
  assert.equal((await invoke('DELETE', undefined, { query: `?id=${row.id}&expectedUpdatedAt=${originalVersion}` })).status, 409);
  assert.equal((await invoke('DELETE', undefined, { query: `?id=${row.id}&expectedUpdatedAt=${encodeURIComponent(row.updated_at)}` })).status, 200);
  assert.equal(rows.size, 0);
});

await test('bulk lookup race cannot overwrite a newer edit or publication', async () => {
  for (const status of ['DRAFT', 'LIVE']) {
    reset(); afterLookup = () => rows.set(baseline.id, { ...baseline, status, body: 'QA newer owner copy', updated_at: '2026-09-10T12:01:00Z' });
    const result = await invoke('POST', { rows: [writeBody()] });
    assert.equal(result.status, 409); assert.deepEqual(result.savedRows, []);
    assert.equal(rows.get(baseline.id).body, 'QA newer owner copy');
    assert.equal(rows.get(baseline.id).status, status);
  }
});

await test('bulk insert race preserves a newly created row', async () => {
  reset([]); beforeInsert = () => rows.set(baseline.id, { ...baseline, status: 'LIVE', body: 'QA competing insert' });
  assert.equal((await invoke('POST', { rows: [writeBody()] })).status, 409);
  assert.equal(rows.get(baseline.id).body, 'QA competing insert');
});

await test('legacy update/delete still guard changes made after the API lookup', async () => {
  for (const method of ['PATCH', 'DELETE']) {
    reset(); afterLookup = () => rows.set(baseline.id, { ...baseline, body: 'QA newer concurrent draft', updated_at: '2026-09-10T12:01:00Z' });
    const result = method === 'PATCH'
      ? await invoke(method, { id: baseline.id, body: 'QA outdated write' })
      : await invoke(method, undefined, { query: `?id=${baseline.id}` });
    assert.equal(result.status, 409); assert.equal(rows.get(baseline.id).body, 'QA newer concurrent draft');
  }
});

await test('bulk saves preserve live rows, validate before writing, and report partial completion', async () => {
  reset([{ ...baseline, status: 'LIVE' }]);
  const skipped = await invoke('POST', { rows: [writeBody()] });
  assert.equal(skipped.status, 200); assert.equal(skipped.skippedLiveRows.length, 1); assert.deepEqual(writes, []);
  reset(); assert.equal((await invoke('POST', { rows: [writeBody(), writeBody()] })).status, 400); assert.deepEqual(writes, []);
  reset(); assert.equal((await invoke('POST', { rows: [writeBody(), { contentKey: 'cms/qa/incomplete' }] })).status, 400); assert.deepEqual(writes, []);
  reset(); assert.equal((await invoke('POST', { rows: [{ ...writeBody(), expectedUpdatedAt: '2020-01-01T00:00:00Z' }] })).status, 409); assert.deepEqual(writes, []);
  reset(); assert.equal((await invoke('POST', { rows: [writeBody()] })).status, 200); assert.equal(rows.get(baseline.id).body, 'QA updated');
  reset(); afterLookup = () => rows.set(baseline.id, { ...baseline, body: 'QA competing edit', updated_at: '2026-09-10T12:01:00Z' });
  const partial = await invoke('POST', { rows: [writeBody('cms/qa/new-batch-row'), writeBody()] });
  assert.equal(partial.status, 409); assert.equal(partial.savedRows.length, 1);
  assert.equal(partial.savedRows[0].content_key, 'cms/qa/new-batch-row'); assert.equal(rows.get(baseline.id).body, 'QA competing edit');
});

await test('unauthorized requests never reach storage', async () => {
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    reset(); assert.equal((await invoke(method, writeBody(), { secret: 'incorrect' })).status, 401); assert.deepEqual(writes, []);
  }
});

await test('superseded compositions cannot publish through create, bulk upsert, or update', async () => {
  for (const key of ['cms/personal-transit-aspect/you/template', 'fallback-hook/transit-house-event-frame/sun', 'fallback-template/transit.house-event']) {
    for (const method of ['POST', 'PATCH']) {
      reset([{ ...baseline, content_key: key }]);
      const body = method === 'POST' ? { ...writeBody(key), status: 'LIVE' } : { id: baseline.id, status: 'LIVE' };
      const result = await invoke(method, body);
      assert.equal(result.status, 409, JSON.stringify(result)); assert.deepEqual(writes, []);
    }
    for (const ownerAction of ['approve-package-revision', 'approve-and-schedule', 'publish-sky-article-edition-revision']) {
      reset([{ ...baseline, content_key: key }]);
      assert.equal((await invoke('PATCH', { id: baseline.id, ownerAction })).status, 409);
      assert.deepEqual(writes, []);
    }
    reset();
    assert.equal((await invoke('POST', { rows: [{ ...writeBody(key), status: 'LIVE' }] })).status, 409);
    assert.deepEqual(writes, []);
  }
});
