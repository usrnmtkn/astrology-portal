#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const snapshotBranch = 'automation/content-studio-snapshot';
export const snapshotPath = 'apps/web/public/content-studio-last-known-good.json';
export const snapshotGates = {
  'content-studio-api': 'content-studio-api.yml',
  'browser-release-gate': 'visual-smoke.yml',
  'project-privacy': 'project-privacy.yml'
};

const execute = (command, args, options = {}) => execFileSync(command, args, {
  encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options
}).trim();

// A completed gate wakes this script again. No polling, bypass, or new token is needed.
export function publishContentStudioSnapshot({ run = execute, env = process.env } = {}) {
  const repo = env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repo ?? '')) throw new Error('A GitHub repository is required.');
  const gh = args => run('gh', [...args, '--repo', repo]);
  const json = args => JSON.parse(gh(args));
  const api = endpoint => JSON.parse(run('gh', ['api', `repos/${repo}/${endpoint}`]));
  const dispatch = ref => {
    for (const workflow of Object.values(snapshotGates)) gh(['workflow', 'run', workflow, '--ref', ref]);
  };
  const open = json(['pr', 'list', '--base', 'main', '--head', snapshotBranch,
    '--state', 'open', '--json', 'number']);
  if (open.length > 1) throw new Error('Multiple active snapshot pull requests require review.');
  if (open.length) {
    const pr = json(['pr', 'view', String(open[0].number), '--json',
      'number,author,baseRefName,headRefName,headRefOid,isCrossRepository,files,statusCheckRollup,mergeStateStatus']);
    if (!pr.author?.is_bot || !['app/github-actions', 'github-actions[bot]'].includes(pr.author.login) || pr.baseRefName !== 'main'
      || pr.headRefName !== snapshotBranch || pr.isCrossRepository || !/^[a-f0-9]{40}$/u.test(pr.headRefOid)
      || pr.files.length !== 1 || pr.files[0].path !== snapshotPath) {
      throw new Error('Snapshot pull request identity or file scope changed; manual review is required.');
    }
    const latest = new Map();
    for (const check of pr.statusCheckRollup ?? []) {
      if (!Object.hasOwn(snapshotGates, check.name)) continue;
      if (!latest.has(check.name) || check.startedAt > latest.get(check.name).startedAt) latest.set(check.name, check);
    }
    for (const [name, workflow] of Object.entries(snapshotGates)) {
      const check = latest.get(name);
      if (check?.status === 'COMPLETED' && check.conclusion !== 'SUCCESS') {
        throw new Error(`Snapshot ${name} failed or was skipped on ${pr.headRefOid}; inspect its recorded result.`);
      }
      if (!check) {
        const runs = api(`actions/workflows/${workflow}/runs?branch=${snapshotBranch}&per_page=100`).workflow_runs;
        const existing = runs.find(run => run.head_sha === pr.headRefOid);
        if (existing?.status === 'completed') throw new Error(`Snapshot ${name} did not report a successful gate; inspect its workflow.`);
        if (!existing) gh(['workflow', 'run', workflow, '--ref', snapshotBranch]);
      }
    }
    if (!Object.keys(snapshotGates).every(name => latest.get(name)?.status === 'COMPLETED'
      && latest.get(name)?.conclusion === 'SUCCESS')) return { state: 'checks_pending', number: pr.number, head: pr.headRefOid };
    // Strict branch protection requires the current main tree in the candidate.
    // Wait for this head's checks before updating it, then check the new head afresh.
    const comparison = api(`compare/${pr.headRefOid}...main`);
    if (!Number.isSafeInteger(comparison.ahead_by)) throw new Error('Could not verify the current main ancestry.');
    if (comparison.ahead_by > 0) {
      run('gh', ['api', '--method', 'PUT', `repos/${repo}/pulls/${pr.number}/update-branch`,
        '-f', `expected_head_sha=${pr.headRefOid}`]);
      return { state: 'base_update_pending', number: pr.number, head: pr.headRefOid };
    }
    // GitHub enforces all additional current branch rules. Never use --admin or --auto.
    gh(['pr', 'merge', String(pr.number), '--squash', '--match-head-commit', pr.headRefOid, '--delete-branch']);
    // GITHUB_TOKEN merges do not trigger push workflows; verify the actual main commit explicitly.
    dispatch('main');
    return { state: 'merged', number: pr.number, head: pr.headRefOid };
  }

  if (env.GITHUB_EVENT_NAME === 'workflow_run') return { state: 'no_pending_snapshot' };
  if (env.GITHUB_REF !== 'refs/heads/main') throw new Error('Snapshot publishing must start from main.');
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
    writeFileSync(bodyPath, `Synchronize the generated offline copy with Content Studio's published revisions through ${snapshot.sourceRevision}.\n\nStudio remains the editorial authority. This export preserves complete reader fields and retirement records; it changes no drafts, approvals, or original writing.\n\nValidation: snapshot and synchronization contracts passed on ${head}. Required API, browser and privacy workflows are dispatched for this exact head. The publisher merges only after their successful completion and GitHub's remaining branch requirements.\n`);
    url = gh(['pr', 'create', '--base', 'main', '--head', snapshotBranch,
      '--title', 'Synchronize published Content Studio snapshot', '--body-file', bodyPath]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  dispatch(snapshotBranch);
  return { state: 'checks_pending', url, head };
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
