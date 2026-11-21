#!/usr/bin/env node
import assert from 'node:assert/strict';
import { projectReaderRow } from '../apps/web/src/content/readerRowProjection.mjs';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { recoveryDeploymentConfig } from '../apps/web/src/content/contentStudioRecovery.mjs';
import { readPublicationSnapshot, publicationSnapshotIdentity, assertStablePublicationSnapshot, validateRecoverySnapshot } from './lib/content-studio-snapshot.mjs';
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

// Exercise actual Git trees, append-only history and competing publishers locally.
const source = process.cwd();
const original = readFileSync(snapshotPath, 'utf8');
const snapshot = JSON.parse(original);
validateRecoverySnapshot(snapshot, projectReaderRow);
for (const mutate of [
  s => { s.rows[0].status = 'DRAFT'; },
  s => { s.rows[0].privateWriterPayload = 'must never escape'; },
  s => { s.publications.push(s.publications[0]); },
  s => { s.publications = s.publications.filter(p => p.content_key !== '__content-publication-ledger/v1'); },
  s => { s.publications.find(p => p.content_key === s.rows[0].content_key).state = 'retired'; },
  s => { s.rows[0].updated_at = '2020-01-01T00:00:00Z'; },
  s => { s.sourceRevision = 'wrong'; },
  s => { s.privateFeedback = 'must never escape'; }
]) {
  const invalid = structuredClone(snapshot); mutate(invalid);
  assert.throws(() => validateRecoverySnapshot(invalid, projectReaderRow), /Invalid public recovery snapshot/u);
}
const directory = mkdtempSync(path.join(tmpdir(), 'studio-recovery-contract-'));
const git = args => execFileSync('git', args, { maxBuffer: 128 * 1024 * 1024, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
try {
  process.chdir(directory);
  git(['init', '--bare', 'remote.git']);
  git(['init', '-b', 'main', 'work']);
  process.chdir(path.join(directory, 'work'));
  git(['config', 'user.name', 'Codex']);
  git(['config', 'user.email', 'codex@users.noreply.github.com']);
  mkdirSync(path.dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, original);
  writeFileSync('trusted-code.mjs', '// Source stays on main.\n');
  git(['add', '.']); git(['commit', '-m', 'Synthetic source fixture']);
  git(['remote', 'add', 'origin', path.join(directory, 'remote.git')]);
  const sourceHead = git(['rev-parse', 'HEAD']);
  const env = { ...process.env, GITHUB_REPOSITORY: 'usrnmtkn/astrology-portal', GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'schedule', GITHUB_SHA: sourceHead };
  let exportSnapshot = original;
  let failExport = false;
  let failPrivacy = false;
  let raceAtRead = 0;
  let headReads = 0;
  const calls = [];
  const run = (command, args, options = {}) => {
    calls.push([command, ...args]);
    if (command === process.execPath) {
      if (failPrivacy && args[0].endsWith('check-project-privacy.mjs')) throw new Error('Synthetic privacy rejection');
      if (args[0].endsWith('refresh-content-studio-last-known-good.mjs')) {
        if (failExport) throw new Error('Synthetic reader outage');
        writeFileSync(snapshotPath, exportSnapshot);
      }
      return '';
    }
    assert.equal(command, 'git', 'No API, PR, check, deployment or other command is permitted.');
    if (args[0] === 'ls-remote') headReads += 1;
    if (raceAtRead && headReads === raceAtRead) {
      raceAtRead = 0;
      throw new Error('Synthetic competing publisher');
    }
    return execFileSync(command, args, { maxBuffer: 128 * 1024 * 1024, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options }).trim();
  };
  const first = publishContentStudioSnapshot({ run, env });
  assert.equal(first.state, 'synchronized');
  assert.equal(git(['rev-parse', 'HEAD']), sourceHead, 'The source checkout never switches to data.');
  assert.equal(readFileSync(snapshotPath, 'utf8'), original, 'Source snapshot is restored after publication.');
  assert.deepEqual(git(['ls-tree', '-r', '--name-only', first.head]).split('\n'), [snapshotPath, 'vercel.json']);
  assert.equal(git(['show', `${first.head}:vercel.json`]), recoveryDeploymentConfig.trim());
  assert.equal(git(['rev-list', '--count', first.head]), '1', 'The first data commit has no application ancestry.');
  const noChange = publishContentStudioSnapshot({ run, env });
  assert.equal(noChange.head, first.head, 'Unchanged publication metadata does not produce another commit.');
  const next = structuredClone(snapshot);
  next.publications.push({ ...retired, content_key: 'cms/new-retirement-only' });
  exportSnapshot = JSON.stringify(next) + '\n';
  failPrivacy = true;
  assert.throws(() => publishContentStudioSnapshot({ run, env }), /privacy rejection/u);
  assert.equal(readFileSync(snapshotPath, 'utf8'), original);
  failPrivacy = false;
  const second = publishContentStudioSnapshot({ run, env });
  assert.notEqual(second.head, first.head, 'Retirement-only updates must be backed up.');
  assert.equal(git(['rev-parse', `${second.head}^`]), first.head, 'Recovery history is append-only.');
  assert.equal(JSON.parse(git(['show', `${second.head}:${snapshotPath}`])).publications.at(-1).state, 'retired');
  failExport = true;
  assert.throws(() => publishContentStudioSnapshot({ run, env }), /reader outage/u);
  assert.equal(git(['rev-parse', 'HEAD']), sourceHead);
  assert.equal(readFileSync(snapshotPath, 'utf8'), original);
  failExport = false;
  next.publications.at(-1).revision += 1;
  exportSnapshot = JSON.stringify(next) + '\n';
  raceAtRead = headReads + 2;
  const pushesBeforeRace = calls.filter(call => call[1] === 'push').length;
  assert.throws(() => publishContentStudioSnapshot({ run, env }), /competing publisher/u);
  assert.equal(calls.filter(call => call[1] === 'push').length, pushesBeforeRace, 'A competing update stops before push.');
  assert.equal(readFileSync(snapshotPath, 'utf8'), original);
  writeFileSync('unexpected.txt', 'synthetic dirty checkout');
  assert.throws(() => publishContentStudioSnapshot({ run, env }), /clean, exact/u);
  rmSync('unexpected.txt');
  assert.throws(() => publishContentStudioSnapshot({ run, env: { ...env, GITHUB_SHA: '1'.repeat(40) } }), /clean, exact/u);
  for (const patch of [{ GITHUB_REF: 'refs/heads/untrusted' }, { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REPOSITORY: 'other/repo' }, { GITHUB_SHA: 'bad' }]) {
    const count = calls.length;
    assert.throws(() => publishContentStudioSnapshot({ run, env: { ...env, ...patch } }), /trusted main/u);
    assert.equal(calls.length, count, 'Invalid execution context stops before commands.');
  }
  assert.ok(!calls.some(call => call.includes('--force') || call.includes('--force-with-lease')));
  assert.ok(calls.filter(call => call[1] === 'push').every(call => call.at(-1).endsWith(`:refs/heads/${snapshotBranch}`)));
  assert.equal(git(['status', '--porcelain']), '');
} finally { process.chdir(source); rmSync(directory, { recursive: true, force: true }); }
console.log('Content Studio snapshot synchronization contracts passed (real local Git data history, validation, no-op, retirement, outage and context safety).');
