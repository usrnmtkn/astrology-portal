import assert from 'node:assert/strict';
import { checkBrowserReleaseGate } from './check-browser-release-gate.mjs';

const result = value => ({ result: value });
checkBrowserReleaseGate({ scope: result('success'), reader: result('success'), studio: result('skipped') });
checkBrowserReleaseGate({ scope: result('success'), reader: result('skipped'), studio: result('skipped') });
for (const state of ['failure', 'cancelled', 'pending', undefined]) {
  assert.throws(() => checkBrowserReleaseGate({ scope: result('success'), reader: result(state) }));
}
for (const state of ['failure', 'cancelled', 'skipped']) {
  assert.throws(() => checkBrowserReleaseGate({ scope: result(state), reader: result('skipped') }));
}
assert.throws(() => checkBrowserReleaseGate({}));
assert.throws(() => checkBrowserReleaseGate({ scope: result('success') }));
const readerScope = { ...result('success'), outputs: { reader: 'true' } };
checkBrowserReleaseGate({ scope: readerScope, 'reader-surface-suites': result('success'), 'reader-overlays': result('success') });
for (const state of ['failure', 'cancelled', 'skipped', 'pending', undefined]) {
  assert.throws(() => checkBrowserReleaseGate({ scope: readerScope, 'reader-surface-suites': result('success'), 'reader-overlays': result(state) }));
}
assert.throws(() => checkBrowserReleaseGate({ scope: readerScope, 'reader-surface-suites': result('success') }));
checkBrowserReleaseGate({ scope: { ...result('success'), outputs: { reader: 'false' } }, 'reader-overlays': result('skipped') });
console.log('PASS browser aggregate rejects failed/cancelled jobs and failed scope; accepts intentional scope skips');
