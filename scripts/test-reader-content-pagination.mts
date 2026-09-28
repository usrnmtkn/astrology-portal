import assert from 'node:assert/strict';
import { loadReaderRows } from '../apps/web/src/services/readerContentClient.ts';
import { READER_ROW_SCHEMA } from '../apps/web/src/content/readerRowSchema.mjs';

const originalFetch = globalThis.fetch;
const originalTimeout = AbortSignal.timeout;
let now = 0;
let page = 0;
let pageDuration = 6_000;
let repeatCursor = false;
let timers: { deadline: number; controller: AbortController }[] = [];
const cursors: unknown[] = [];
AbortSignal.timeout = (milliseconds: number) => {
  const controller = new AbortController();
  timers.push({ deadline: now + milliseconds, controller });
  return controller.signal;
};
globalThis.fetch = async (input, init) => {
  assert.equal(input, '/api/content-reader');
  const query = JSON.parse(String(init?.body));
  cursors.push(query.afterId);
  now += pageDuration;
  for (const timer of timers) if (timer.deadline <= now) timer.controller.abort(new DOMException('Timed out', 'TimeoutError'));
  init?.signal?.throwIfAborted();
  page += 1;
  return Response.json({ schema: READER_ROW_SCHEMA, rows: [{ id: `source-${page}` }], publications: [],
    nextCursor: page < 5 ? `00000000-0000-0000-0000-${String(repeatCursor ? 1 : page).padStart(12, '0')}` : null });
};
function reset() { now = 0; page = 0; timers = []; cursors.length = 0; pageDuration = 6_000; repeatCursor = false; }
try {
  const complete = await loadReaderRows({ provider: 'tldrastro-fallback-architecture-v3' });
  assert.equal(complete.error, null, 'Healthy individual pages must finish even when the library takes over 20 seconds.');
  assert.equal(now, 30_000);
  assert.deepEqual(complete.data?.map(row => row.id), ['source-1', 'source-2', 'source-3', 'source-4', 'source-5']);
  assert.equal(cursors[0], undefined);
  assert.equal(cursors[4], '00000000-0000-0000-0000-000000000004');

  reset();
  const deadline = await loadReaderRows({ surfaces: ['you'] }, AbortSignal.timeout(8_000));
  assert.equal(deadline.data, null, 'An explicit caller deadline must not expose an incomplete library.');
  assert.ok(deadline.error instanceof DOMException);
  assert.equal(page, 1);

  reset(); pageDuration = 21_000;
  const stalled = await loadReaderRows({ provider: 'tldrastro-fallback-architecture-v3' });
  assert.equal(stalled.data, null);
  assert.ok(stalled.error instanceof DOMException, 'Each page still has a timeout.');
  assert.equal(page, 0);

  reset(); repeatCursor = true;
  const invalidCursor = await loadReaderRows({ provider: 'tldrastro-fallback-architecture-v3' });
  assert.equal(invalidCursor.data, null);
  assert.match(String(invalidCursor.error), /pagination did not advance/);
  console.log('PASS reader pagination across the full library, caller deadlines, page timeouts, and cursor safety.');
} finally {
  globalThis.fetch = originalFetch;
  AbortSignal.timeout = originalTimeout;
}
