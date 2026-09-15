import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { buildMemoryIndex, queryMemory, memoryDetail, recallMemory, visualMemoryGraph, topicConnections, VISUAL_MEMORIES_PER_SOURCE, sha256 } from '../api/_lib/agent-memory.mjs';

const config = {
  authorityIndex: 'authority.md',
  sources: [
    { path: 'authority.md', kind: 'navigation' }, { path: 'rules.md', kind: 'rule' },
    { path: 'old.md', kind: 'rule' }, { path: 'current.md', kind: 'rule' },
    { path: 'examples.jsonl', kind: 'example' }, { path: 'corrections.jsonl', kind: 'correction' },
  ],
  supersedes: [{ old: 'old.md', new: 'current.md' }],
  qualifications: [{ source: 'current.md', targets: ['rules.md'] }], requiredContext: ['current.md'],
};
const text = 'One exact owner passage.\n\nIts final sentence stays intact.';
const files = {
  'config/agent-memory-sources-v1.json': JSON.stringify(config),
  'authority.md': '# Navigation\nCurrent documents.\n## 4. History\n`unlisted.md`\n',
  'rules.md': '# Writing\n## No compressed language\nUse complete sentences.\n',
  'old.md': '# Old rubric\nThe obsolete threshold is mandatory.\n',
  'current.md': '# Current ruling\nThe threshold is advisory.\n',
  'examples.jsonl': [
    { id: 'good', text, ownerApproved: true, family: 'natal', register: 'you' },
    { id: 'rejected', text: 'Rejected prose', ownerApproved: true, contentKey: 'rejected-key' },
    { id: 'candidate', text: 'Unapproved candidate', ownerApproved: false },
    { id: 'blank', text: '', ownerApproved: true },
  ].map(JSON.stringify).join('\n'),
  'corrections.jsonl': JSON.stringify({ bad: 'Rejected prose', corrected: '[rejected without replacement]', positive_evidence_revoked: true, content_key: 'rejected-key', rule: 'Owner correction' }),
};
const fixture = () => buildMemoryIndex({ readSource: name => { if (!(name in files)) throw new Error('missing'); return files[name]; }, revision: 'a'.repeat(40) });

test('review preview refuses missing sign-in configuration and privileged browser keys before building', () => {
  for (const key of ['', 'sb_secret_must_not_reach_browser']) {
    const result = spawnSync(process.execPath, ['scripts/build-agent-memory-preview.mjs'], {
      encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: 'https://memory-auth.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: key, VITE_SUPABASE_ANON_KEY: '' },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, key ? /Privileged keys are not permitted/ : /Owner sign-in is not configured/);
  }
});

test('exact examples retain full text, source lines, hashes, and role boundary', () => {
  const index = fixture(), good = index.records.find(r => r.title === 'good');
  const detail = memoryDetail(index, good.id);
  assert.equal(detail.body, text); assert.equal(detail.bodySha256, sha256(text));
  assert.equal(detail.sourceSha256, sha256(files['examples.jsonl']));
  assert.equal(detail.line, 1); assert.equal(detail.writerPacketEligible, false);
  assert.match(detail.sourceUrl, /\/blob\/a{40}\/examples.jsonl#L1$/);
});
test('superseded and rejected records are absent by default but connected in history', () => {
  const index = fixture();
  assert.equal(queryMemory(index, { query: 'obsolete' }).total, 0);
  assert.equal(queryMemory(index, { kind: 'example' }).total, 1);
  assert.equal(queryMemory(index, { kind: 'example', history: true }).total, 3);
  assert.equal(queryMemory(index, { query: 'obsolete', history: true }).total, 1);
  assert(index.edges.some(e => e.relation === 'rejects'));
  assert(index.edges.some(e => e.relation === 'supersedes'));
});
test('later qualifications accompany recall and cannot be dropped by keyword filtering', () => {
  const index = fixture();
  const packet = recallMemory(index, 'complete sentences');
  assert(packet.groups.rule.some(r => r.metadata.qualifiedBy === 'current.md'));
  assert(packet.requiredContext.some(r => r.body.includes('threshold is advisory')));
});
test('search filters, pagination, and hostile query characters are handled as data', () => {
  const index = fixture();
  assert.equal(queryMemory(index, { kind: 'example', family: 'natal', register: 'you' }).total, 1);
  assert.equal(queryMemory(index, { kind: 'example', register: 'they' }).total, 0);
  assert(queryMemory(index, { kind: 'example' }).sources.every(source => source.kind === 'example'));
  assert.equal(queryMemory(index, { query: 'absent-unique-phrase' }).sources.length, 0);
  assert.equal(queryMemory(index, { query: "' OR 1=1 -- <script>" }).total, 0);
  const first = queryMemory(index, { limit: 1 }), second = queryMemory(index, { limit: 1, offset: 1 });
  assert.notEqual(first.records[0].id, second.records[0].id);
  assert(!Object.hasOwn(first.records[0], 'body'));
  assert.throws(() => queryMemory(index, { limit: NaN }), /pagination/);
  assert.throws(() => queryMemory(index, { query: 'x'.repeat(501) }), /500/);
  assert.throws(() => queryMemory(index, { kind: '../../secret' }), /Unknown/);
});
test('missing sources and tampered indexed text fail closed; empty examples are reported', () => {
  const index = fixture(); assert.equal(index.skipped.length, 1);
  const r = index.records.find(r => r.kind === 'example'); r.body = 'changed';
  assert.throws(() => memoryDetail(index, r.id), /integrity/);
  assert.throws(() => buildMemoryIndex({ readSource: name => name === 'rules.md' ? (() => { throw new Error('missing'); })() : files[name] }), /missing/);
});
test('real repository search finds the documented replacement and excludes empty rows', () => {
  const index = buildMemoryIndex({ root: process.cwd() });
  const result = recallMemory(index, 'the catch');
  assert(result.groups.rule.some(r => r.body.includes('the challenge')));
  assert.equal(index.skipped.length, 1);
  assert(index.records.every(r => r.body.length > 0));
  const spec = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const packaging = spec.functions['api/admin/memory-graph.ts'].includeFiles;
  for (const config of Object.values(spec.functions)) assert(config.includeFiles.length <= 256, 'Vercel includeFiles exceeds its 256-character limit');
  const packaged = new Set(fs.globSync(packaging));
  assert.deepEqual(index.sources.filter(source => !packaged.has(source.path)).map(source => source.path), []);
});

test('cross-surface date rule and owner task provenance are retrievable in deployed sources', () => {
  const index = buildMemoryIndex({ root: process.cwd() });
  const rule = queryMemory(index, { query: 'Cross-surface event dates and placement windows', phrase: true, kind: 'rule' }).records
    .find(record => record.path === 'AGENTS.md');
  assert(rule, 'The date verification rule must be searchable, not only a local note');
  const detail = memoryDetail(index, rule.id);
  for (const phrase of ['You/Friends', 'continuous visit', 'full-residency', 'station-to-station', 'DST', 'hydration']) assert(detail.body.includes(phrase));
  assert.equal(detail.bodySha256, sha256(detail.body));
  assert.equal(detail.sourceSha256, sha256(fs.readFileSync('AGENTS.md')));
  const note = index.records.find(record => record.metadata.id === 'cross-surface-placement-dates-2026-09-14');
  assert(note);
  assert.equal(note.metadata.source_uri, 'thread:01a0a070-33be-7811-9a73-86df25435b3d');
  assert.equal(note.writerPacketEligible, false);
  assert.equal(note.metadata.ownerApproved, false);
});

Object.assign(process.env, { NODE_ENV: 'production', CONTENT_GENERATION_SECRET: 'memory-test-secret', VITE_SUPABASE_URL: 'https://memory-test.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture', CONTENT_ADMIN_EMAILS: 'owner@example.invalid' });
const { default: handler } = await import('../api/admin/memory-graph.ts');
async function request(url = '', headers = {}, method = 'GET') {
  const response = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(value) { this.body = JSON.parse(value); } };
  await handler({ method, url: '/api/admin/memory-graph' + url, headers }, response);
  return response;
}
test('actual handler blocks anonymous and non-admin identities, with no data in denial', async () => {
  assert.equal((await request()).statusCode, 401);
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async input => {
      assert.equal(String(input), 'https://memory-test.invalid/auth/v1/user');
      return Response.json({ email: 'reader@example.invalid', app_metadata: { role: 'user' }, user_metadata: { role: 'admin' } });
    };
    const denied = await request('', { 'x-content-admin-session': 'reader-token' });
    assert.equal(denied.statusCode, 401); assert(!denied.body.records);
    globalThis.fetch = async () => Response.json({ email: 'owner@example.invalid', app_metadata: {} });
    const allowed = await request('?limit=2', { 'x-content-admin-session': 'owner-token' });
    assert.equal(allowed.statusCode, 200); assert.equal(allowed.body.records.length, 2);
    assert.equal(allowed.headers['cache-control'], 'private, no-store');
  } finally { globalThis.fetch = originalFetch; }
});
test('actual handler serves complete detail and rejects invalid methods and input', async () => {
  const headers = { 'x-content-generation-secret': 'memory-test-secret' };
  const graph = await request('?kind=example&limit=1', headers);
  assert.equal(graph.statusCode, 200);
  const detail = await request('?mode=detail&id=' + graph.body.records[0].id, headers);
  assert.equal(detail.statusCode, 200); assert(detail.body.record.body.length > 0);
  assert.equal(detail.body.record.bodySha256, sha256(detail.body.record.body));
  assert.equal((await request('?mode=detail&id=unknown', headers)).statusCode, 404);
  assert.equal((await request('?limit=nan', headers)).statusCode, 400);
  assert.equal((await request('', headers, 'POST')).statusCode, 405);
});
test('local development never grants anonymous or arbitrary-secret memory access', async () => {
  const oldEnv = process.env.NODE_ENV, oldSecret = process.env.CONTENT_GENERATION_SECRET;
  try {
    process.env.NODE_ENV = 'development'; delete process.env.CONTENT_GENERATION_SECRET;
    assert.equal((await request()).statusCode, 401);
    assert.equal((await request('', { authorization: 'Bearer made-up-secret' })).statusCode, 401);
    assert.equal((await request('', { 'x-content-admin-session': '   ' })).statusCode, 401);
  } finally { process.env.NODE_ENV = oldEnv; process.env.CONTENT_GENERATION_SECRET = oldSecret; }
});


test('canvas projection preserves complete exact text and separates recorded links from suggestions', () => {
  const index = fixture(), graph = visualMemoryGraph(index);
  const entries = graph.documents.flatMap(doc => doc.memoryEntries);
  assert(entries.some(memory => memory.content === text));
  for (const doc of graph.documents) {
    assert(doc.memoryEntries.length <= VISUAL_MEMORIES_PER_SOURCE);
    assert.equal(doc.summaryEmbedding, undefined);
    for (const entry of doc.memoryEntries) {
      const original = index.records.find(record => record.id === entry.id);
      assert.equal(entry.documentId, original.sourceId);
      assert.equal(entry.content, original.body);
      assert.equal(sha256(entry.content), entry.metadata.bodySha256);
      assert(['current', 'unverified'].includes(entry.metadata.status));
      assert.equal(entry.createdAt, ''); // Unknown dates must not fabricate recency.
    }
  }
});
test('visual data requires the same real owner authorization as detail and recall', async () => {
  assert.equal((await request('?mode=visual')).statusCode, 401);
  const response = await request('?mode=visual', { 'x-content-generation-secret': 'memory-test-secret' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'private, no-store');
  assert(response.body.documents.length > 0);
});
test('pinned graph renderer keeps reference patches and rejects dependency drift', async () => {
  const { adaptMemoryGraph } = await import('./memory-graph-reference-plugin.mjs');
  const code = fs.readFileSync(new URL('../node_modules/@supermemory/memory-graph/dist/memory-graph.js', import.meta.url), 'utf8');
  const patched = adaptMemoryGraph(code);
  assert(patched.includes('children: "IQ Cluster"'));
  assert(patched.includes('children: "New this week"'));
  assert(patched.includes('zt = !tt && new Date(ot.createdAt).getTime() > Date.now() - 1e3 * 60 * 60 * 24 * 7;'));
  assert(patched.includes('Date not recorded'));
  assert.throws(() => adaptMemoryGraph('upgraded component'), /changed/);
});

test('reference search matches the complete phrase while recall retains ranked keywords', () => {
  const index = fixture();
  assert(queryMemory(index, { query: 'exact owner', phrase: true }).records.some(r => r.title === 'good'));
  assert.equal(queryMemory(index, { query: 'owner exact', phrase: true }).total, 0);
  assert(queryMemory(index, { query: 'owner exact' }).total > 0);
});

test('local preview accepts the same owner session or emergency key as Content Studio, never anonymous access', async () => {
  const { createPreviewMemoryAuthorizer, studioAccessCheckUrl } = await import('./memory-preview-auth.mjs');
  const calls = [];
  const authorize = createPreviewMemoryAuthorizer(async () => false, async (url, options) => {
    calls.push({ url, options });
    const allowed = options.headers['x-content-admin-session'] === 'verified-studio-owner'
      || options.headers['x-content-generation-secret'] === 'current-studio-secret';
    return Response.json(allowed ? { ok: true, rows: [] } : { error: 'Unauthorized.' }, { status: allowed ? 200 : 401 });
  });
  assert.equal(await authorize({ headers: {} }), false);
  assert.equal(calls.length, 0);
  assert.equal(await authorize({ headers: { 'x-content-admin-session': 'ordinary-member' } }), false);
  assert.equal(await authorize({ headers: { 'x-content-generation-secret': 'wrong-key' } }), false);
  assert.equal(await authorize({ headers: { 'x-content-admin-session': 'verified-studio-owner', cookie: 'must-not-forward' } }), true);
  assert.equal(await authorize({ headers: { 'x-content-generation-secret': 'current-studio-secret' } }), true);
  for (const { url, options } of calls) {
    assert.equal(url, studioAccessCheckUrl); assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error'); assert.equal(options.body, undefined);
    assert.equal(options.headers.cookie, undefined);
  }
});

test('preview access fails closed on upstream errors and does not turn a public HTML response into authorization', async () => {
  const { createPreviewMemoryAuthorizer } = await import('./memory-preview-auth.mjs');
  for (const response of [Response.json({ok:true},{status:503}), Response.json({ok:true}), new Response('<html>login</html>')]) {
    const authorize = createPreviewMemoryAuthorizer(async () => false, async () => response);
    await assert.rejects(() => authorize({headers:{'x-content-admin-session':'token'}}));
  }
  const { createMemoryGraphHandler } = await import('../api/admin/memory-graph.ts');
  const h = createMemoryGraphHandler(async () => { throw new Error('Network unavailable'); });
  const res = { statusCode:0,setHeader(){},end(value){this.body=JSON.parse(value);} };
  await h({method:'GET',url:'/api/admin/memory-graph',headers:{'x-content-admin-session':'token'}},res);
  assert.equal(res.statusCode,503); assert.equal(res.body.ok,false); assert.equal(res.body.records,undefined);
});


test('topic suggestions need specific overlap across sources and remain bounded and deterministic', () => {
  const records = [
    { id:'a', sourceId:'one', title:'Ephemeris validation', body:'Validate ephemeris planetary coordinates against independent calculations.' },
    { id:'b', sourceId:'two', title:'Planetary calculations', body:'Independent ephemeris calculations validate planetary coordinates.' },
    { id:'c', sourceId:'three', title:'Login', body:'Sign in with an account and password.' },
    { id:'d', sourceId:'one', title:'Copy', body:'Validate ephemeris planetary coordinates against independent calculations.' },
  ];
  const edges = topicConnections(records);
  assert(edges.some(edge => edge.source === 'a' && edge.target === 'b'));
  assert(!edges.some(edge => edge.source === 'c' || edge.target === 'c'));
  assert(!edges.some(edge => edge.source === 'a' && edge.target === 'd'));
  assert.deepEqual(edges, topicConnections(records));
  for (const edge of edges) { assert.equal(edge.basis, 'suggested'); assert(edge.terms.length >= 3); }
  for (const record of records) assert(edges.filter(edge => edge.source === record.id || edge.target === record.id).length <= 2);
});

test('literal citations and actual qualifications are drawn without inventing semantic authority', async () => {
  const index = fixture();
  const edgesBefore = JSON.stringify(index.edges);
  const graph = visualMemoryGraph(index);
  assert(graph.connections.some(edge => edge.relation === 'qualifies' && edge.basis === 'recorded'));
  assert.equal(JSON.stringify(index.edges), edgesBefore);
  assert(!graph.connections.some(edge => edge.relation === 'supersedes')); // Superseded endpoints are hidden.
  const linkedIndex = buildMemoryIndex({ readSource: name => name === 'rules.md' ? files[name] + '\nSee [current ruling](current.md#ruling).\n' : files[name] });
  const citation = linkedIndex.edges.find(edge => edge.relation === 'cites');
  assert.equal(citation.evidence.reference, 'current.md#ruling');
  const { projectGraphConnections } = await import('./memory-graph-reference-plugin.mjs');
  const live = visualMemoryGraph(buildMemoryIndex({root:process.cwd()}));
  const nodes = live.documents.flatMap(doc => [doc, ...doc.memoryEntries]);
  const rendered = projectGraphConnections(live.documents, nodes, { connection:{medium:'topic'}, relations:{extends:'qualifies',updates:'supersedes',derives:'cites'} });
  assert.equal(rendered.length, live.connections.length);
  assert(rendered.some(edge => edge.edgeType === 'doc-doc'));
  assert(rendered.some(edge => edge.edgeType === 'version' && edge.relationType === 'qualifies'));
  assert.equal(new Set(rendered.map(edge => edge.id)).size, rendered.length);
});

test('canvas sampling reaches the end of long sources and related details preserve exact passages', () => {
  const index = buildMemoryIndex({root:process.cwd()}), graph=visualMemoryGraph(index);
  for (const doc of graph.documents) {
    const eligible=index.records.filter(record=>record.sourceId===doc.id && ['current','unverified'].includes(record.status));
    assert(doc.memoryEntries.some(entry=>entry.id===eligible.at(-1).id));
  }
  const suggested=graph.connections.find(edge=>edge.basis==='suggested');
  const detail=memoryDetail(index,suggested.source);
  assert(detail.connections.some(edge=>edge.target.id===suggested.target && edge.terms.length>=3));
  assert.equal(sha256(detail.body),detail.bodySha256);
});
