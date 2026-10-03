import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestStudioJson, saveGeneratedContentDraft } from '../apps/admin/src/generatedContentClient.ts';

const originalFetch = globalThis.fetch;
const originalTimeout = globalThis.setTimeout;
const originalClear = globalThis.clearTimeout;
const baseline = { id: 'draft-1', content_key: 'sky/test/source', status: 'DRAFT', updated_at: '2026-10-03T12:00:00.000Z' };
const sections = { packageDraft: { Body: 'Exact saved writing.' } };
const saved = { ...baseline, updated_at: '2026-10-03T12:00:01.000Z', sections };

try {
  await test('secondary saves survive the read deadline and still have a bounded mutation deadline', async () => {
    const scheduled: Array<{ fn: () => void; ms: number }> = [];
    globalThis.setTimeout = ((fn: () => void, ms: number) => { scheduled.push({ fn, ms }); return scheduled.length; }) as any;
    globalThis.clearTimeout = (() => {}) as any;
    let finish!: () => void;
    let signal!: AbortSignal;
    globalThis.fetch = (async (_path, options) => {
      signal = options!.signal!;
      await new Promise<void>((resolve, reject) => {
        finish = resolve;
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
      return Response.json({ ok: true, rows: [saved] });
    }) as typeof fetch;
    const pending = requestStudioJson('/api/admin/generated-content', 'fixture', { method: 'PATCH' });
    // Advance past 10 seconds without waiting on the wall clock.
    for (const timer of scheduled.filter(timer => timer.ms <= 11_000)) timer.fn();
    const prematurelyAborted = signal.aborted;
    finish();
    await pending.catch(() => null);
    assert.equal(prematurelyAborted, false, 'A valid save must not be cancelled at the read deadline.');
    assert.equal(scheduled[0].ms, 45_000);
  });
  globalThis.setTimeout = originalTimeout;
  globalThis.clearTimeout = originalClear;

  for (const [method, deadline] of [['GET', 10_000], ['PATCH', 45_000]] as const) await test(`${method} stops waiting at its deadline`, async () => {
    let expire!: () => void;
    globalThis.setTimeout = ((fn: () => void, ms: number) => { assert.equal(ms, deadline); expire = fn; return 1; }) as any;
    globalThis.clearTimeout = (() => {}) as any;
    globalThis.fetch = (async (_path, options) => new Promise<Response>((_resolve, reject) => {
      options!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })) as typeof fetch;
    const pending = requestStudioJson('/api/admin/generated-content', 'fixture', { method });
    const rejected = assert.rejects(pending, method === 'GET' ? /no changes were submitted/ : /save has not been confirmed/);
    expire();
    await rejected;
    globalThis.setTimeout = originalTimeout;
    globalThis.clearTimeout = originalClear;
  });

  await test('a lost save response is reconciled once through an exact saved-row read', async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (path, options) => {
      calls.push(options?.method ?? 'GET');
      if (options?.method === 'PATCH') throw new TypeError('Failed to fetch');
      assert.equal(new URL(String(path), 'https://fixture.invalid').searchParams.get('contentKey'), baseline.content_key);
      return Response.json({ ok: true, rows: [saved] });
    }) as typeof fetch;
    assert.deepEqual(await saveGeneratedContentDraft(baseline, sections, 'fixture'), saved);
    assert.deepEqual(calls, ['PATCH', 'GET'], 'Recovery must never repeat a mutation.');
  });

  for (const candidate of [
    { ...saved, id: 'unrelated-draft' },
    { ...saved, updated_at: baseline.updated_at },
    { ...saved, updated_at: '2026-10-02T12:00:00Z' },
    { ...saved, sections: { packageDraft: { Body: 'Competing writing.' } } }
  ]) await test(`an ambiguous save cannot confirm an unrelated or unchanged draft: ${JSON.stringify(candidate)}`, async () => {
    let writes = 0;
    globalThis.fetch = (async (_path, options) => {
      if (options?.method === 'PATCH') { writes++; throw new Error('Upstream storage request timed out.'); }
      return Response.json({ ok: true, rows: [candidate] });
    }) as typeof fetch;
    await assert.rejects(saveGeneratedContentDraft(baseline, sections, 'fixture'));
    assert.equal(writes, 1);
  });

  await test('a confirmed version conflict never enters uncertain-save recovery', async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; return Response.json({ ok: false, error: 'This content changed.' }, { status: 409 }); }) as typeof fetch;
    await assert.rejects(saveGeneratedContentDraft(baseline, sections, 'fixture'), /This content changed/);
    assert.equal(calls, 1);
  });
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalTimeout;
  globalThis.clearTimeout = originalClear;
}
