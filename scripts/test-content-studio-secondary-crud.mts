import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'secondary-crud-test', SUPABASE_URL: 'https://secondary-crud.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const { default: publication } = await import('../api/admin/content-publication.ts');
const { adminFetchJson } = await import('../api/_lib/admin-http.ts');
const { default: personalized } = await import('../api/admin/user-generated-content.ts');
Object.assign(process.env, env);
const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const version = '2026-09-10T12:00:00.123456Z';
const input = { id, expectedUpdatedAt: version, body: 'QA revised passage.' };
const publicationInput = { id, expectedUpdatedAt: version, contentKey: 'cms/qa/secondary', action: 'retire' };
let calls: Array<{url: URL; init: RequestInit}> = [];
let storage: (url: URL, init: RequestInit) => Promise<Response>;
const original = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input)); assert.equal(url.origin, env.SUPABASE_URL);
  calls.push({ url, init }); return storage(url, init);
};
async function invoke(handler: any, method: string, body?: unknown, raw = false, secret = env.CONTENT_GENERATION_SECRET, query = '') {
  const req = Object.assign(Readable.from(body === undefined ? [] : [raw ? String(body) : JSON.stringify(body)]), { method, url: `/api/admin/test${query}`,  headers: { 'x-content-generation-secret': secret } });
  const res = { statusCode: 0, result: {} as any, setHeader() {}, end(body: string) { this.result = JSON.parse(body); } };
  await handler(req, res); return { status: res.statusCode, ...res.result };
}
try {
  await test('secondary CRUD rejects malformed and invalid typed requests before storage', async () => {
    for (const [handler, method, valid, invalid] of [
      [publication, 'POST', publicationInput, [{ contentKey: 12 }, { contentKey: '   ' }, { id: [] }, { expectedUpdatedAt: 123 }]],
      [personalized, 'PATCH', input, [{ id: 12 }, { expectedUpdatedAt: 'bad' }, { body: {} }, { summary: null }, { headline: [] }, { status: '' }, { status: false }]]
    ] as const) {
      for (const value of ['{', null, [], true, ...invalid.map(fields => ({ ...valid, ...fields }))]) {
        calls = []; storage = async () => Response.json([{ ...input }]);
        const result = await invoke(handler, method, value, value === '{');
        assert.equal(result.status, 400, JSON.stringify({ value, result })); assert.equal(calls.length, 0);
      }
    }
  });
  await test('personalized CRUD rejects unconfirmed storage shapes instead of false success or missing-row errors', async () => {
    for (const method of ['GET', 'PATCH']) for (const value of [null, {}, [null], 'invalid-json']) {
      storage = async () => value === 'invalid-json' ? new Response('{') : Response.json(value);
      const result = await invoke(personalized, method, method === 'PATCH' ? input : undefined);
      assert.equal(result.status, 502, JSON.stringify({ method, value, result }));
    }
    storage = async () => Response.json([{ id: 'wrong-row', updated_at: version }]);
    assert.equal((await invoke(personalized, 'PATCH', input)).status, 502);
    storage = async () => Response.json({ message: 'unavailable' }, { status: 503 });
    assert.equal((await invoke(personalized, 'GET')).status, 502);
  });
  await test('personalized inventory filters support the current database surfaces', async () => {
    for (const surface of ['friends', 'year_ahead']) {
      calls = [];
      storage = async (url) => {
        assert.equal(url.searchParams.get('surface'), `eq.${surface}`);
        return Response.json([{ id, updated_at: version, surface }]);
      };
      const result = await invoke(personalized, 'GET', undefined, false, env.CONTENT_GENERATION_SECRET, `?surface=${surface}`);
      assert.equal(result.status, 200, surface); assert.equal(result.rows[0].surface, surface); assert.equal(calls.length, 1);
    }
    calls = [];
    assert.equal((await invoke(personalized, 'GET', undefined, false, env.CONTENT_GENERATION_SECRET, '?surface=unknown')).status, 400);
    assert.equal(calls.length, 0);
  });
  await test('personalized repeated edits preserve complete strings and reject stale or missing rows', async () => {
    let row: any = { id, updated_at: version, status: 'DRAFT', body: 'QA original.' };
    storage = async (url, init) => {
      if (init.method !== 'PATCH') return Response.json(row ? [row] : []);
      assert.equal(url.searchParams.get('id'), `eq.${id}`);
      if (!row || url.searchParams.get('updated_at') !== `eq.${row.updated_at}`) return Response.json([]);
      row = { ...row, ...JSON.parse(String(init.body)) }; return Response.json([row]);
    };
    for (const body of ['QA complete first paragraph.\n\nQA final sentence. ', '']) {
      const result = await invoke(personalized, 'PATCH', { ...input, expectedUpdatedAt: row.updated_at, body });
      assert.equal(result.status, 200); assert.equal(result.rows[0].body, body);
      assert.equal((await invoke(personalized, 'GET')).rows[0].body, body);
    }
    assert.equal((await invoke(personalized, 'PATCH', input)).status, 409);
    row = null; assert.equal((await invoke(personalized, 'PATCH', input)).status, 404);
  });
  await test('publication propagates timeout and protocol errors and verifies the published identity', async () => {
    storage = async () => { throw new DOMException('timeout', 'AbortError'); };
    assert.equal((await invoke(publication, 'POST', publicationInput)).status, 504);
    for (const value of [null, {}, 'invalid-json']) {
      storage = async () => value === 'invalid-json' ? new Response('{') : Response.json(value);
      assert.equal((await invoke(publication, 'POST', publicationInput)).status, 502);
    }
    const receipt = { content_key: publicationInput.contentKey, state: 'retired', revision: 1, row_id: id, row_updated_at: version, updated_at: version };
    for (const fields of [{ row_id: 'wrong-row' }, { row_updated_at: '2026-09-10T12:00:00.123457Z' }]) {
      storage = async (url) => url.pathname.endsWith('/generated_interpretations')
        ? Response.json([{ id, content_key: publicationInput.contentKey, status: 'LIVE', lane: 'serving', review_state: null, body: 'QA passage.', provider: 'manual-admin', updated_at: version }])
        : Response.json({ ...receipt, state: 'live', ...fields });
      assert.equal((await invoke(publication, 'POST', { ...publicationInput, action: 'publish' })).status, 502);
    }
    storage = async () => Response.json(receipt);
    assert.equal((await invoke(publication, 'POST', publicationInput)).status, 200);
  });
  await test('storage deadline covers stalled JSON bodies after headers arrive', async () => {
    let aborted = false;
    storage = async (_url, init) => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{'));
        init.signal?.addEventListener('abort', () => { aborted = true; controller.error(new DOMException('timeout', 'AbortError')); });
      }
    }));
    await assert.rejects(adminFetchJson(`${env.SUPABASE_URL}/rest/v1/test`, {}, 10), (error: any) => error.statusCode === 504);
    assert.equal(aborted, true);
  });
  await test('secondary endpoints reject unauthorized requests without storage access', async () => {
    calls = [];
    assert.equal((await invoke(publication, 'POST', publicationInput, false, 'wrong')).status, 401);
    assert.equal((await invoke(personalized, 'PATCH', input, false, 'wrong')).status, 401);
    assert.equal(calls.length, 0);
  });
} finally { globalThis.fetch = original; }
