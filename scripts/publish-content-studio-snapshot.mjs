#!/usr/bin/env node
import { projectReaderRow } from '../apps/web/src/content/readerRowProjection.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recoveryBranch, recoverySnapshotPath, recoveryDeploymentConfig } from '../apps/web/src/content/contentStudioRecovery.mjs';

import { publishedSnapshotPath, validateRecoverySnapshot, validateSnapshotPair } from './lib/content-studio-snapshot.mjs';

export const snapshotBranch = recoveryBranch;
export const snapshotPath = recoverySnapshotPath;
const execute = (command, args, options = {}) => execFileSync(command, args, {
  maxBuffer: 128 * 1024 * 1024, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options
}).trim();

// Trusted main code writes public data only; recovery history is append-only.
export function publishContentStudioSnapshot({ run = execute, env = process.env } = {}) {
  if (env.GITHUB_REPOSITORY !== 'usrnmtkn/astrology-portal' || env.GITHUB_REF !== 'refs/heads/main'
    || !['schedule', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) || !/^[a-f0-9]{40}$/u.test(env.GITHUB_SHA ?? '')) {
    throw new Error('Recovery synchronization requires a trusted main schedule or dispatch.');
  }
  if (run('git', ['rev-parse', 'HEAD']) !== env.GITHUB_SHA || run('git', ['status', '--porcelain'])) {
    throw new Error('Recovery synchronization requires the clean, exact workflow source.');
  }
  const remoteHead = () => run('git', ['ls-remote', '--heads', 'origin', `refs/heads/${snapshotBranch}`]).split(/\s/u)[0];
  const previousHead = remoteHead();
  if (previousHead && !/^[a-f0-9]{40}$/u.test(previousHead)) throw new Error('Invalid recovery branch head.');
  const original = readFileSync(snapshotPath, 'utf8');
  let previous = '';
  let previousPublished = '';
  const directory = mkdtempSync(path.join(tmpdir(), 'studio-recovery-'));
  const publishedPath = path.join(directory, publishedSnapshotPath);
  try {
    if (previousHead) {
      run('git', ['fetch', '--no-tags', 'origin', `refs/heads/${snapshotBranch}`]);
      if (run('git', ['rev-parse', 'FETCH_HEAD']) !== previousHead) throw new Error('Recovery branch moved during fetch.');
      const files = run('git', ['ls-tree', '-r', '--name-only', previousHead]).split('\n').sort();
      const legacyFiles = [snapshotPath, 'vercel.json'].sort();
      const completeFiles = [...legacyFiles, publishedSnapshotPath].sort();
      if (![legacyFiles, completeFiles].some(expected => JSON.stringify(files) === JSON.stringify(expected))
        || run('git', ['ls-tree', '-r', previousHead]).split('\n').some(entry => !/^100644 blob /u.test(entry))
        || run('git', ['show', `${previousHead}:vercel.json`]) !== recoveryDeploymentConfig.trim()) {
        throw new Error('Unexpected recovery branch scope or deployment configuration.');
      }
      previous = run('git', ['show', `${previousHead}:${snapshotPath}`]);
      validateRecoverySnapshot(JSON.parse(previous), projectReaderRow);
      if (files.includes(publishedSnapshotPath)) {
        previousPublished = run('git', ['show', `${previousHead}:${publishedSnapshotPath}`]);
        validateSnapshotPair(JSON.parse(previous), JSON.parse(previousPublished), projectReaderRow);
        writeFileSync(publishedPath, `${previousPublished}\n`);
      }
      writeFileSync(snapshotPath, `${previous}\n`);
    }
    const refresh = ['scripts/refresh-content-studio-last-known-good.mjs', '--published-output', publishedPath];
    if (env.GITHUB_EVENT_NAME === 'schedule') refresh.push('--if-changed');
    run(process.execPath, refresh);
    validateSnapshotPair(JSON.parse(readFileSync(snapshotPath, 'utf8')), JSON.parse(readFileSync(publishedPath, 'utf8')), projectReaderRow);
    run(process.execPath, ['scripts/test-content-studio-last-known-good.mjs']);
    run(process.execPath, ['scripts/test-content-studio-snapshot-sync.mjs']);
    run(process.execPath, ['scripts/test-content-studio-published-export.mjs']);
    const changed = run('git', ['diff', '--name-only']).split('\n').filter(Boolean);
    if (changed.some(file => file !== snapshotPath)) throw new Error('Unexpected source changes in recovery export.');
    if (previous && previousPublished && readFileSync(snapshotPath, 'utf8').trim() === previous.trim()
      && readFileSync(publishedPath, 'utf8').trim() === previousPublished.trim()) return { state: 'synchronized', head: previousHead };
    const configPath = path.join(directory, 'vercel.json');
    writeFileSync(configPath, recoveryDeploymentConfig);
    writeFileSync(path.join(directory, 'snapshot.json'), readFileSync(snapshotPath));
    run(process.execPath, ['scripts/check-project-privacy.mjs', '--directory', directory]);
    const snapshotBlob = run('git', ['hash-object', '-w', snapshotPath]);
    const publishedBlob = run('git', ['hash-object', '-w', publishedPath]);
    const configBlob = run('git', ['hash-object', '-w', configPath]);
    const gitEnv = { ...env, GIT_INDEX_FILE: path.join(directory, 'index'),
      GIT_AUTHOR_NAME: 'github-actions[bot]', GIT_COMMITTER_NAME: 'github-actions[bot]',
      GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
      GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com' };
    const git = args => run('git', args, { env: gitEnv });
    git(['read-tree', '--empty']);
    git(['update-index', '--add', '--cacheinfo', `100644,${snapshotBlob},${snapshotPath}`]);
    git(['update-index', '--add', '--cacheinfo', `100644,${publishedBlob},${publishedSnapshotPath}`]);
    git(['update-index', '--add', '--cacheinfo', `100644,${configBlob},vercel.json`]);
    const tree = git(['write-tree']);
    const head = git(['commit-tree', tree, ...(previousHead ? ['-p', previousHead] : []),
      '-m', `Synchronize published Studio recovery data (source ${env.GITHUB_SHA})`]);
    if (previousHead) run('git', ['merge-base', '--is-ancestor', previousHead, head]);
    if (remoteHead() !== previousHead) throw new Error('Recovery branch moved before publication.');
    // No force, PR, main write, check attestation, code checkout or app deployment.
    run('git', ['push', 'origin', `${head}:refs/heads/${snapshotBranch}`]);
    if (remoteHead() !== head) throw new Error('Recovery branch readback did not match the published commit.');
    return { state: 'synchronized', head };
  } finally {
    writeFileSync(snapshotPath, original);
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(publishContentStudioSnapshot())); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Recovery synchronization failed.'); process.exitCode = 1; }
}
