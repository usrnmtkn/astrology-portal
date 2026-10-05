import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'inventory-audit-fixture', SUPABASE_URL: 'https://inventory-audit.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const { default: handler } = await import('../api/admin/generated-content-inventory.ts');
const { calendarMoonIngressPackageRecords: records } = await import('../api/_lib/calendar-moon-ingress-sources.ts');
Object.assign(process.env, env);
const prefix = 'authored/calendar-moon-transition/';
const saved = records.slice(0, 2).map((record, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`, content_key: record.contentKey,
  status: 'DRAFT', lane: 'reference', surface: 'sky', mode: 'in_depth',
  updated_at: `2026-10-0${5-index}T12:00:00.123456Z`, body: `Synthetic saved opening ${index}.\n\nComplete synthetic ending ${index}.`
}));
let storageRows = saved;
let requests: URL[] = [];
let failPresence = false;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  assert.equal(url.origin, env.SUPABASE_URL);
  assert.equal(url.pathname, '/rest/v1/generated_interpretations');
  assert.equal(init.method ?? 'GET', 'GET', 'Inventory browsing never writes.');
  requests.push(url);
  const p = url.searchParams;
  if (p.get('select') === 'content_key' && failPresence) return Response.json({ error: 'synthetic failure' }, { status: 503 });
  let rows = storageRows.filter(row => {
    for (const [field, value] of p) {
      if (['select', 'order', 'limit'].includes(field)) continue;
      if (field === 'or') {
        const match = /^\(updated_at\.lt\.([^,]+),and\(updated_at\.eq\.[^,]+,id\.lt\.([^()]+)\)\)$/.exec(value);
        assert.ok(match, `Unexpected cursor predicate: ${value}`);
        if (!(row.updated_at < match[1] || row.updated_at === match[1] && row.id < match[2])) return false;
      } else if (field === 'and') {
        const match = /^\(content_key\.gte\."([^"]+)",content_key\.lt\."([^"]+)"\)$/.exec(value);
        assert.ok(match);
        if (!(row.content_key >= match[1] && row.content_key < match[2])) return false;
      } else if (value.startsWith('eq.')) { if (row[field] !== value.slice(3)) return false; }
      else if (value.startsWith('neq.')) { if (row[field] === value.slice(4)) return false; }
      else if (value.startsWith('lte.')) { if (row[field] > value.slice(4)) return false; }
      else if (field === 'content_key' && value.startsWith('in.(')) {
        if (!value.slice(4,-1).split(',').map(x => x.replaceAll('"','')).includes(row.content_key)) return false;
      } else throw new Error(`Unmodeled storage predicate ${field}=${value}`);
    }
    return true;
  });
  rows = [...rows].sort((a,b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id)).slice(0, Number(p.get('limit') ?? 1000));
  return Response.json(p.get('select') === 'content_key' ? rows.map(row => ({ content_key: row.content_key })) : rows);
};
async function invoke(params: Record<string,string>) {
  const req = Object.assign(Readable.from([]), { method: 'GET', url: `/api/admin/generated-content-inventory?${new URLSearchParams(params)}`, headers: { authorization: `Bearer ${env.CONTENT_GENERATION_SECRET}` } });
  const res = { statusCode: 0, headers: {}, payload: undefined as any, setHeader(k,v) { this.headers[k] = v; }, end(raw) { this.payload = JSON.parse(raw); } };
  await handler(req, res as any);
  assert.equal(res.headers['cache-control'], 'no-store');
  return res;
}

test('malformed and unsafe cursors fail as input errors before storage', async () => {
  for (const value of ['not-base64-json', ...[null, {}, {id:'x',updatedAt:'not-a-date'}, {id:'x),status.eq.LIVE',updatedAt:'2026-10-05T00:00:00Z'}].map(x => Buffer.from(JSON.stringify(x)).toString('base64url'))]) {
    requests = [];
    assert.equal((await invoke({ cursor: value })).statusCode, 400);
    assert.equal(requests.length, 0);
  }
});

test('all pages contain one source per ingress and preserve complete saved copy', async () => {
  for (const limit of [1, 2, 3, 80]) {
    storageRows = saved; requests = [];
    let cursor: string | null = null;
    const all: any[] = [];
    const seen = new Set<string>();
    do {
      const result = await invoke({ contentKeyPrefix: prefix, limit: String(limit), status: 'all', visibility: 'all', ...(cursor ? {cursor} : {}) });
      assert.equal(result.statusCode, 200);
      all.push(...result.payload.rows);
      cursor = result.payload.nextCursor;
      if (cursor) { assert.ok(!seen.has(cursor)); seen.add(cursor); }
    } while (cursor);
    assert.equal(all.length, 12, 'A later page must not resurrect bundled originals for earlier saved rows.');
    for (const row of saved) {
      const matching = all.filter(candidate => candidate.content_key === row.content_key);
      assert.equal(matching.length, 1);
      assert.equal(matching[0].id, row.id);
      const detail = await invoke({ contentKey: row.content_key, limit: '1' });
      assert.equal(detail.payload.rows[0].body, row.body);
    }
  }
});

test('filters do not leak draft starters or replace an archived saved source', async () => {
  storageRows = [{...saved[0], status:'ARCHIVED'}, {...saved[1], status:'LIVE', lane:'serving'}];
  for (const params of [{status:'LIVE'}, {visibility:'editorial'}, {surface:'natal'}, {mode:'card'}]) {
    const result = await invoke({contentKeyPrefix:prefix, ...params});
    assert.equal(result.statusCode, 200);
    assert.ok(result.payload.rows.every(row => !row.package_starter));
  }
  const result = await invoke({contentKey:saved[0].content_key, status:'DRAFT'});
  assert.deepEqual(result.payload.rows, [], 'A filtered-out saved row must not be presented as its original unsaved source.');
});

test('unconfirmed source absence cannot become a successful fallback inventory', async () => {
  storageRows = saved; failPresence = true;
  try {
    const cursor = Buffer.from(JSON.stringify({id:saved[1].id,updatedAt:saved[1].updated_at})).toString('base64url');
    const result = await invoke({contentKeyPrefix:prefix, cursor});
    assert.equal(result.statusCode, 502);
    assert.equal(result.payload.rows, undefined);
  } finally { failPresence = false; }
});
