import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = await mkdtemp(path.join(tmpdir(), 'memory-request-'));
await build({ entryPoints: ['apps/admin/src/ownerSessionRequest.ts'], bundle: true, format: 'esm',
  outfile: path.join(dir, 'client.mjs'), define: { 'import.meta.env': JSON.stringify({
    VITE_SUPABASE_URL: 'https://memory-session.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture'
  }) } });
const { readMemoryGraph } = await import(pathToFileURL(path.join(dir, 'client.mjs')).href);
const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
const storage = new Map<string, string>();
globalThis.window = { localStorage: { getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value) } } as any;
const token = (n: string, sub = 'fixture-owner') => `header.${Buffer.from(JSON.stringify({ sub, n })).toString('base64url')}.signature`;
const old = token('old'), fresh = token('fresh');
const seed = (access = old) => storage.set('sb-memory-session-auth-token', JSON.stringify({
  access_token: access, refresh_token: 'synthetic-refresh', expires_at: Date.now() / 1000 + 3600
}));
const unavailable = () => Response.json({ ok: false, authFailure: 'content_admin_verification_unavailable',
  error: 'Verification unavailable' }, { status: 503 });
const read = (credential = 'synthetic-emergency', signal = new AbortController().signal) => readMemoryGraph('mode=visual', credential, signal);
try {
  await test('one confirmed temporary verification error retries only the same graph GET', async () => {
    const calls: any[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return calls.length === 1 ? unavailable() : Response.json({ ok: true, documents: ['complete fixture'] });
    };
    assert.deepEqual(await read(), { ok: true, documents: ['complete fixture'] });
    assert.equal(calls.length, 2);
    for (const call of calls) {
      assert.equal(call.url, '/api/admin/memory-graph?mode=visual');
      assert.equal(call.init.method, 'GET'); assert.equal(call.init.cache, 'no-store');
      assert.equal(call.init.headers['x-content-generation-secret'], 'synthetic-emergency');
      assert.equal(call.init.body, undefined);
    }
  });
  await test('persistent verification failure stops after two requests and preserves the session', async () => {
    seed(); const before = storage.get('sb-memory-session-auth-token'); let calls = 0;
    globalThis.fetch = async () => { calls++; return unavailable(); };
    await assert.rejects(read(old), error => error.status === 503);
    assert.equal(calls, 2); assert.equal(storage.get('sb-memory-session-auth-token'), before);
  });
  for (const status of [401, 403, 409, 503]) await test(`unmarked HTTP ${status} is never retried`, async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ ok: false, error: 'Denied fixture' }, { status }); };
    await assert.rejects(read(), error => error.status === status); assert.equal(calls, 1);
  });
  await test('graph reads replace a captured token with the current same-owner token', async () => {
    seed(fresh); let calls = 0;
    globalThis.fetch = async (_url, init) => {
      calls++; assert.equal((init!.headers as any)['x-content-admin-session'], fresh);
      return Response.json({ ok: true });
    };
    await read(old); assert.equal(calls, 1);
  });
  await test('only a confirmed owner-auth denial renews once before reading again', async () => {
    seed(); let graphCalls = 0, refreshCalls = 0;
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith('https://memory-session.invalid')) {
        refreshCalls++; return Response.json({ access_token: fresh, refresh_token: 'rotated-fixture', expires_in: 3600 });
      }
      graphCalls++;
      if (graphCalls === 1) return Response.json({ ok: false, authFailure: 'content_admin_unauthorized' }, { status: 401 });
      assert.equal((init!.headers as any)['x-content-admin-session'], fresh); return Response.json({ ok: true });
    };
    await read(old); assert.equal(graphCalls, 2); assert.equal(refreshCalls, 1);
  });
  await test('a changed account cannot inherit an earlier owner graph request', async () => {
    seed(token('other', 'different-owner'));
    globalThis.fetch = async () => { throw new Error('Must not dispatch'); };
    await assert.rejects(read(old), error => error.status === 401);
  });
  await test('cancelled search never starts a retry after a temporary failure', async () => {
    const controller = new AbortController(); let calls = 0;
    globalThis.fetch = async () => { calls++; controller.abort(); return unavailable(); };
    await assert.rejects(read('synthetic-emergency', controller.signal), error => error.name === 'AbortError');
    assert.equal(calls, 1);
  });
} finally {
  globalThis.fetch = originalFetch; globalThis.window = originalWindow;
  await rm(dir, { recursive: true, force: true });
}
