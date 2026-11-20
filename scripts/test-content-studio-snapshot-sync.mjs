#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPublicationSnapshot, publicationSnapshotIdentity, assertStablePublicationSnapshot } from './lib/content-studio-snapshot.mjs';
import { publishContentStudioSnapshot, snapshotBranch, snapshotPath } from './publish-content-studio-snapshot.mjs';

const ledger = { content_key: '__content-publication-ledger/v1', state: 'live', revision: 1, updated_at: '2026-01-01T00:00:00Z' };
const published = { content_key: 'cms/example', state: 'live', revision: 2, row_id: 'row-2', row_updated_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' };
const retired = { ...published, content_key: 'cms/retired', state: 'retired', revision: 3 };
const before = [ledger, published, retired];
assert.equal(publicationSnapshotIdentity(before), publicationSnapshotIdentity([...before].reverse()));
assert.throws(() => publicationSnapshotIdentity([published]), /ledger is unavailable/u);
assert.throws(() => publicationSnapshotIdentity([...before, published]), /Invalid publication/u);
assertStablePublicationSnapshot(before, [...before].reverse());
for (const patch of [{ revision: 4 }, { row_updated_at: '2026-01-03T00:00:00Z' }, { state: 'retired' }, { row_id: 'new-source' }]) {
  assert.throws(() => assertStablePublicationSnapshot(before, [ledger, { ...published, ...patch }, retired]), /changed during export/u);
}
assert.throws(() => assertStablePublicationSnapshot(before, [ledger, retired]), /changed during export/u);
let requests = 0;
const result = await readPublicationSnapshot({ supabaseUrl: 'https://example.invalid', publishableKey: 'public-test-key',
  fetchImpl: async (url, options) => {
    requests += 1;
    assert.equal(url.searchParams.get('select'), 'content_key,state,revision,row_id,row_updated_at,updated_at');
    assert.ok(options.signal);
    return { ok: true, json: async () => before };
  } });
assert.deepEqual(result, before);
assert.equal(requests, 1);
await assert.rejects(readPublicationSnapshot({ supabaseUrl: 'https://example.invalid', publishableKey: 'test',
  fetchImpl: async () => ({ ok: false, status: 503 }) }), /503/u);
await assert.rejects(readPublicationSnapshot({ supabaseUrl: 'https://example.invalid', publishableKey: 'test',
  fetchImpl: async () => ({ ok: true, json: async () => [] }) }), /ledger is unavailable/u);
const page = Array.from({ length: 1000 }, (_, i) => ({ ...published, content_key: `cms/${String(i).padStart(4, '0')}` }));
await assert.rejects(readPublicationSnapshot({ supabaseUrl: 'https://example.invalid', publishableKey: 'test',
  fetchImpl: async () => ({ ok: true, json: async () => page }) }), /did not advance/u);

const head = '1'.repeat(40);
function scenario({ pr = {}, open = true, changed = [snapshotPath], previousHead = '', env = {} } = {}) {
  const calls = [];
  let body;
  const run = (command, args) => {
    calls.push([command, ...args]);
    if (command === 'gh') {
      if (args[0] === 'pr' && args[1] === 'list') return JSON.stringify(Array.isArray(open) ? open : open ? [{ number: 7 }] : []);
      if (args[0] === 'pr' && args[1] === 'view') return JSON.stringify({ number: 7, author: { login: 'app/github-actions', is_bot: true },
        baseRefName: 'main', headRefName: snapshotBranch, headRefOid: head, isCrossRepository: false,
        files: [{ path: snapshotPath }], ...pr });
      if (args[0] === 'pr' && args[1] === 'create') {
        body = readFileSync(args[args.indexOf('--body-file') + 1], 'utf8');
        return 'https://github.com/example/repository/pull/7';
      }
      throw new Error(`Unexpected GitHub operation: ${args[0]} ${args[1]}`);
    }
    if (command === 'git' && args[0] === 'diff') return changed.join('\n');
    if (command === 'git' && args[0] === 'ls-remote') return previousHead ? `${previousHead}\trefs/heads/${snapshotBranch}` : '';
    if (command === 'git' && args[0] === 'rev-parse') return head;
    if (command === process.execPath || (command === 'git' && ['switch', 'config', 'add', 'commit', 'push'].includes(args[0]))) return '';
    throw new Error(`Unexpected operation: ${command}`);
  };
  const execute = () => publishContentStudioSnapshot({ run, env: {
    GITHUB_REPOSITORY: 'example/repository', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'schedule', ...env
  } });
  return { calls, execute, get body() { return body; } };
}
for (const conclusion of ['SUCCESS', 'FAILURE', 'SKIPPED', 'CANCELLED', null]) {
  const queued = scenario({ pr: { statusCheckRollup: ['content-studio-api', 'browser-release-gate', 'project-privacy']
    .map(name => ({ name, status: conclusion ? 'COMPLETED' : 'IN_PROGRESS', conclusion })) } });
  assert.deepEqual(queued.execute(), { state: 'queued', number: 7, head });
  assert.equal(queued.calls.length, 2, 'An existing PR permits only the two identity reads, regardless of gate state.');
  assert.ok(queued.calls.every(call => call[0] === 'gh' && call[1] === 'pr' && ['list', 'view'].includes(call[2])),
    'The publisher cannot admit, update, approve, retry, dispatch or merge a queued candidate.');
}
for (const patch of [{ author: { login: 'someone-else' } }, { author: { login: 'app/github-actions', is_bot: false } },
  { files: [{ path: snapshotPath }, { path: 'api/admin/content.ts' }] }, { isCrossRepository: true },
  { baseRefName: 'other' }, { headRefName: 'other' }, { headRefOid: 'invalid' }]) {
  const tampered = scenario({ pr: patch });
  assert.throws(tampered.execute, /identity or file scope changed/u);
  assert.equal(tampered.calls.length, 2);
}
assert.throws(scenario({ open: [{ number: 7 }, { number: 8 }] }).execute, /Multiple active/u);
const unchanged = scenario({ open: false, changed: [] });
assert.equal(unchanged.execute().state, 'synchronized');
assert.ok(!unchanged.calls.some(call => call.includes('commit')));
const created = scenario({ open: false, previousHead: '2'.repeat(40) });
assert.deepEqual(created.execute(), { state: 'queued', url: 'https://github.com/example/repository/pull/7', head });
assert.equal(created.calls.filter(call => call[1] === 'pr' && call[2] === 'create').length, 1);
assert.deepEqual(created.calls.find(call => call[0] === 'git' && call[1] === 'push'),
  ['git', 'push', `--force-with-lease=refs/heads/${snapshotBranch}:${'2'.repeat(40)}`, 'origin', `HEAD:refs/heads/${snapshotBranch}`]);
assert.ok(created.calls.filter(call => call[0] === 'gh').every(call => call[1] === 'pr' && ['list', 'create'].includes(call[2])));
assert.match(created.body, /queued for the existing release coordinator, not admitted or validated for release/u);
assert.match(created.body, /genuine pull-request checks, normal merge, main deployment and production acceptance/u);
assert.ok(created.calls.find(call => call[0] === process.execPath && call[1].endsWith('refresh-content-studio-last-known-good.mjs')).includes('--if-changed'));
const manual = scenario({ open: false, changed: [], env: { GITHUB_EVENT_NAME: 'workflow_dispatch' } });
assert.equal(manual.execute().state, 'synchronized');
assert.ok(!manual.calls.find(call => call[0] === process.execPath).includes('--if-changed'));
assert.throws(scenario({ open: false, previousHead: 'invalid' }).execute, /Invalid previous snapshot/u);
assert.throws(scenario({ open: false, changed: [snapshotPath, 'api/other.ts'] }).execute, /Unexpected source changes/u);
for (const env of [{ GITHUB_REF: 'refs/heads/untrusted' }, { GITHUB_EVENT_NAME: 'workflow_run' }, { GITHUB_REPOSITORY: '' }]) {
  const invalid = scenario({ env });
  assert.throws(invalid.execute);
  assert.deepEqual(invalid.calls, [], 'Untrusted execution contexts must stop before any command.');
}
console.log('Content Studio snapshot synchronization contracts passed.');
