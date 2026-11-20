#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const snapshotBranch = 'automation/content-studio-snapshot';
export const snapshotPath = 'apps/web/public/content-studio-last-known-good.json';

const execute = (command, args, options = {}) => execFileSync(command, args, {
  encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options
}).trim();

// Prepare one frozen PR. The existing coordinator owns admission and release.
export function publishContentStudioSnapshot({ run = execute, env = process.env } = {}) {
  const repo = env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repo ?? '')) throw new Error('A GitHub repository is required.');
  if (env.GITHUB_REF !== 'refs/heads/main') throw new Error('Snapshot preparation must start from main.');
  if (!['schedule', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)) {
    throw new Error('Snapshot preparation requires a schedule or manual dispatch on main.');
  }
  const gh = args => run('gh', [...args, '--repo', repo]);
  const json = args => JSON.parse(gh(args));
  const open = json(['pr', 'list', '--base', 'main', '--head', snapshotBranch,
    '--state', 'open', '--json', 'number']);
  if (open.length > 1) throw new Error('Multiple active snapshot pull requests require review.');
  if (open.length) {
    const pr = json(['pr', 'view', String(open[0].number), '--json',
      'number,author,baseRefName,headRefName,headRefOid,isCrossRepository,files']);
    if (!pr.author?.is_bot || !['app/github-actions', 'github-actions[bot]'].includes(pr.author.login) || pr.baseRefName !== 'main'
      || pr.headRefName !== snapshotBranch || pr.isCrossRepository || !/^[a-f0-9]{40}$/u.test(pr.headRefOid)
      || pr.files.length !== 1 || pr.files[0].path !== snapshotPath) {
      throw new Error('Snapshot pull request identity or file scope changed; manual review is required.');
    }
    return { state: 'queued', number: pr.number, head: pr.headRefOid };
  }

  const refresh = ['scripts/refresh-content-studio-last-known-good.mjs'];
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch') refresh.push('--if-changed');
  run(process.execPath, refresh);
  run(process.execPath, ['scripts/test-content-studio-last-known-good.mjs']);
  run(process.execPath, ['scripts/test-content-studio-snapshot-sync.mjs']);
  const changed = run('git', ['diff', '--name-only']).split('\n').filter(Boolean);
  if (!changed.length) return { state: 'synchronized' };
  if (changed.length !== 1 || changed[0] !== snapshotPath) throw new Error('Unexpected source changes in the snapshot publisher.');
  const remote = run('git', ['ls-remote', '--heads', 'origin', `refs/heads/${snapshotBranch}`]);
  const previousHead = remote.split(/\s/u)[0];
  if (previousHead && !/^[a-f0-9]{40}$/u.test(previousHead)) throw new Error('Invalid previous snapshot branch identity.');
  run('git', ['switch', '-c', snapshotBranch]);
  run('git', ['config', 'user.name', 'github-actions[bot]']);
  run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  run('git', ['add', snapshotPath]);
  run('git', ['commit', '-m', 'chore(content): synchronize published Studio snapshot']);
  const head = run('git', ['rev-parse', 'HEAD']);
  run('git', ['push', `--force-with-lease=refs/heads/${snapshotBranch}:${previousHead}`, 'origin', `HEAD:refs/heads/${snapshotBranch}`]);
  const directory = mkdtempSync(path.join(tmpdir(), 'studio-snapshot-pr-'));
  let url;
  try {
    const bodyPath = path.join(directory, 'body.md');
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
    writeFileSync(bodyPath, `Synchronize the generated offline copy with Content Studio's published revisions through ${snapshot.sourceRevision}.\n\nStudio remains the editorial authority. This export preserves complete reader fields and retirement records; it changes no drafts, approvals, or original writing.\n\nLocal snapshot and synchronization contracts passed before committing ${head}. This frozen candidate is queued for the existing release coordinator, not admitted or validated for release. Follow docs/qa/release-queue.md for the scoped preflight, genuine pull-request checks, normal merge, main deployment and production acceptance. The scheduled publisher does not dispatch checks, approve runs, assign itself a slot or merge.\n`);
    url = gh(['pr', 'create', '--base', 'main', '--head', snapshotBranch,
      '--title', 'Synchronize published Content Studio snapshot', '--body-file', bodyPath]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  return { state: 'queued', url, head };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify(publishContentStudioSnapshot()));
  } catch (error) {
    // Preserve command diagnostics without dumping API records or reader copy.
    console.error(error instanceof Error ? error.message : 'Snapshot synchronization failed.');
    process.exitCode = 1;
  }
}
