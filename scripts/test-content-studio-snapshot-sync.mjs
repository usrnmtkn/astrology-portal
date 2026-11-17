#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readPublicationSnapshot, publicationSnapshotIdentity, assertStablePublicationSnapshot } from './lib/content-studio-snapshot.mjs';
import { publishContentStudioSnapshot, snapshotBranch, snapshotPath, snapshotGates } from './publish-content-studio-snapshot.mjs';

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
const successful = Object.keys(snapshotGates).map(name => ({ name, status: 'COMPLETED', conclusion: 'SUCCESS', startedAt: '2026-01-01T00:00:00Z' }));
function scenario({ pr = {}, open = true, runs = [], changed = [snapshotPath], mergeFailure = false, ahead = 0, env = {} } = {}) {
  const calls = [];
  const run = (command, args) => {
    calls.push([command, ...args]);
    if (command === 'gh') {
      if (args[0] === 'pr' && args[1] === 'list') return JSON.stringify(open ? [{ number: 7 }] : []);
      if (args[0] === 'pr' && args[1] === 'view') return JSON.stringify({ number: 7, author: { login: 'app/github-actions', is_bot: true },
        baseRefName: 'main', headRefName: snapshotBranch, headRefOid: head, isCrossRepository: false,
        files: [{ path: snapshotPath }], statusCheckRollup: successful, ...pr });
      if (args[0] === 'api') return JSON.stringify({ workflow_runs: runs, ahead_by: ahead });
      if (args[0] === 'pr' && args[1] === 'merge' && mergeFailure) throw new Error('Branch policy prohibits this merge.');
      if (args[0] === 'pr' && args[1] === 'create') return 'https://github.com/example/repository/pull/7';
      return '';
    }
    if (command === 'git' && args[0] === 'diff') return changed.join('\n');
    if (command === 'git' && args[0] === 'rev-parse') return head;
    return '';
  };
  const execute = () => publishContentStudioSnapshot({ run, env: {
    GITHUB_REPOSITORY: 'example/repository', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'schedule', ...env
  } });
  return { calls, execute };
}
const merged = scenario();
assert.equal(merged.execute().state, 'merged');
const merge = merged.calls.find(call => call[0] === 'gh' && call[1] === 'pr' && call[2] === 'merge');
assert.ok(merge.includes('--match-head-commit') && merge.includes(head));
assert.ok(!merge.includes('--admin') && !merge.includes('--auto'));
assert.equal(merged.calls.filter(call => call.includes('--ref') && call.includes('main')).length, 3);
assert.ok(!merged.calls.some(call => call[0] === process.execPath), 'A pending candidate stays frozen.');
const behind = scenario({ ahead: 2 });
assert.equal(behind.execute().state, 'base_update_pending');
assert.ok(behind.calls.some(call => call.includes('PUT') && call.includes(`expected_head_sha=${head}`)));
assert.ok(!behind.calls.some(call => call[2] === 'merge'), 'Updated bases require new-head evidence before merging.');
const pending = scenario({ pr: { statusCheckRollup: successful.slice(1) } });
assert.equal(pending.execute().state, 'checks_pending');
assert.equal(pending.calls.filter(call => call[1] === 'workflow' && call[2] === 'run').length, 1);
assert.ok(!pending.calls.some(call => call[2] === 'merge'));
const running = scenario({ pr: { statusCheckRollup: [] }, runs: [{ head_sha: head, status: 'in_progress' }] });
assert.equal(running.execute().state, 'checks_pending');
assert.ok(!running.calls.some(call => call[1] === 'workflow'), 'Running checks must not be duplicated.');
for (const conclusion of ['FAILURE', 'SKIPPED', 'CANCELLED']) {
  const failed = scenario({ pr: { statusCheckRollup: [{ ...successful[0], conclusion }, ...successful.slice(1)] } });
  assert.throws(failed.execute, /failed or was skipped/u);
  assert.ok(!failed.calls.some(call => call[1] === 'workflow' || call[2] === 'merge'));
}
const retried = scenario({ pr: { statusCheckRollup: [...successful, { ...successful[0], startedAt: '2026-01-02T00:00:00Z', status: 'IN_PROGRESS', conclusion: null }] } });
assert.equal(retried.execute().state, 'checks_pending', 'An older passing check cannot mask its newer pending rerun.');
for (const patch of [{ author: { login: 'someone-else' } }, { files: [{ path: 'api/admin/content.ts' }] }, { isCrossRepository: true }, { baseRefName: 'other' }, { headRefName: 'other' }]) {
  const tampered = scenario({ pr: patch });
  assert.throws(tampered.execute, /identity or file scope changed/u);
  assert.ok(!tampered.calls.some(call => call[2] === 'merge'));
}
assert.throws(scenario({ mergeFailure: true }).execute, /Branch policy/u);
const idle = scenario({ open: false, env: { GITHUB_EVENT_NAME: 'workflow_run' } });
assert.equal(idle.execute().state, 'no_pending_snapshot');
assert.ok(!idle.calls.some(call => call[0] === process.execPath));
const unchanged = scenario({ open: false, changed: [] });
assert.equal(unchanged.execute().state, 'synchronized');
assert.ok(!unchanged.calls.some(call => call.includes('commit')));
const created = scenario({ open: false });
assert.equal(created.execute().state, 'checks_pending');
assert.equal(created.calls.filter(call => call[1] === 'workflow' && call[2] === 'run').length, 3);
assert.equal(created.calls.filter(call => call[1] === 'pr' && call[2] === 'create').length, 1);
assert.ok(created.calls.find(call => call[0] === 'git' && call[1] === 'push').some(arg => arg.startsWith('--force-with-lease=')));
assert.ok(!created.calls.some(call => call[2] === 'merge'));
assert.throws(scenario({ open: false, changed: [snapshotPath, 'api/other.ts'] }).execute, /Unexpected source changes/u);
assert.throws(scenario({ open: false, env: { GITHUB_REF: 'refs/heads/untrusted' } }).execute, /must start from main/u);
console.log('Content Studio snapshot synchronization contracts passed.');
