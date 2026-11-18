import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { Page } from '@playwright/test';
import { watchBrowserErrors } from '../tests/visual/qaRuntimeGuards';

const origin = 'https://reader.example.test';
const cancelled = () => Object.assign(new Error('serialized WebKit message'), {
  stack: `Fetch API cannot load ${origin}/api/content-reader due to access control checks.\n    at fetchReader`
});
function fixture(enabled = true) {
  const page = new EventEmitter() as EventEmitter & {
    url(): string; mainFrame(): object; reload(): Promise<unknown>;
  };
  const frame = {};
  page.url = () => origin;
  page.mainFrame = () => frame;
  const response = { status: () => 200, finished: async () => null, request: () => ({ failure: () => null }) };
  page.reload = async () => { page.emit('framenavigated', frame); return response; };
  return { page, frame, response, guard: watchBrowserErrors(page as unknown as Page, { webkitReaderReload: enabled }) };
}

let cases = 0;
{
  const f = fixture();
  f.page.reload = async () => { f.page.emit('pageerror', cancelled()); f.page.emit('framenavigated', f.frame); return f.response; };
  await f.guard.reload(); f.guard(); assert.equal(f.guard.reloadCancellations.length, 1); cases++;
}
for (const variant of ['outside', 'after-commit', 'different-origin', 'different-path', 'ordinary-error', 'disabled']) {
  const f = fixture(variant !== 'disabled');
  const error = cancelled();
  if (variant === 'different-origin') error.stack = error.stack!.replace(origin, 'https://unrelated.example.test');
  if (variant === 'different-path') error.stack = error.stack!.replace('/api/content-reader', '/api/calendar');
  if (variant === 'ordinary-error') error.stack = 'TypeError: broken reader';
  if (variant === 'outside') f.page.emit('pageerror', error);
  else {
    f.page.reload = async () => {
      if (variant === 'after-commit') f.page.emit('framenavigated', f.frame);
      f.page.emit('pageerror', error);
      f.page.emit('framenavigated', f.frame);
      return f.response;
    };
    await f.guard.reload();
  }
  assert.throws(() => f.guard(), /Unexpected browser errors/);
  assert.equal(f.guard.reloadCancellations.length, 0); cases++;
}
{
  const f = fixture();
  f.page.reload = async () => { throw new Error('reload failed'); };
  await assert.rejects(f.guard.reload(), /reload failed/);
  f.page.emit('pageerror', cancelled());
  assert.throws(() => f.guard(), /Unexpected browser errors/); cases++;
}
for (const failure of ['http', 'body', 'request']) {
  const f = fixture();
  f.page.reload = async () => ({
    status: () => failure === 'http' ? 503 : 200,
    finished: async () => failure === 'body' ? new Error('truncated') : null,
    request: () => ({ failure: () => failure === 'request' ? { errorText: 'cancelled' } : null })
  });
  await assert.rejects(f.guard.reload()); cases++;
}
{
  const f = fixture();
  f.page.reload = async () => {
    f.page.emit('requestfailed', { url: () => `${origin}/assets/chunk.js`, failure: () => ({ errorText: 'cancelled' }), frame: () => ({ isDetached: () => false }) });
    f.page.emit('framenavigated', f.frame); return f.response;
  };
  await f.guard.reload(); assert.throws(() => f.guard(), /Unexpected browser errors/); cases++;
}
console.log(`Browser reload guard: ${cases} cases passed.`);
