import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { loadPrivacyPolicy, privacyMatches } from './lib/privacy-policy.mjs';
import { privacyBlobMatches } from './lib/privacy-blob.mjs';

// pre-push receives exact local/remote refs on stdin. Inspect every outgoing
// commit, including an identifier added and deleted before the branch tip.
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const policy = loadPrivacyPolicy();
const zero = '0'.repeat(40);
const refs = fs.readFileSync(0, 'utf8').trim().split('\n').filter(Boolean);
const commits = new Set();
// Only the receiving remote can establish that an ancestor is already there.
// Local tracking refs can be stale or fabricated and must not suppress scans.
const remoteName = process.argv[2] || 'origin';
const advertised = spawnSync('git', ['ls-remote', '--heads', remoteName], { encoding: 'utf8', timeout: 20_000 });
const existingRemoteHeads = advertised.status === 0
  ? advertised.stdout.trim().split('\n').map(line => line.split(/\s+/u)[0]).filter(oid =>
    /^[a-f0-9]{40}$/u.test(oid) && spawnSync('git', ['cat-file', '-e', `${oid}^{commit}`], { stdio: 'ignore' }).status === 0)
  : [];
// A stale worktree may still have pre-cleanup remote-tracking refs. Check the
// entire ancestry against the privately stored retired commit IDs before using
// remote refs to narrow the ordinary content scan.
const retiredFile = process.env.PROJECT_PRIVACY_RETIRED_COMMITS_FILE || spawnSync('git', ['config', '--get', 'projectPrivacy.retiredCommitsFile'], { encoding: 'utf8' }).stdout?.trim();
const retired = new Set(retiredFile ? fs.readFileSync(retiredFile, 'utf8').trim().split(/\s+/u) : []);
for (const line of refs) {
  const [localRef, local, remoteRef, remote] = line.split(/\s+/u);
  if (local === zero) continue;
  if (retired.size && git(['rev-list', local]).split('\n').some(commit => retired.has(commit))) throw new Error('This branch contains retired private history. Move your changes to a fresh clone of the cleaned repository before pushing.');
  if (privacyMatches(`${localRef} ${remoteRef}`, policy).length) throw new Error('Private identifier in a branch name.');
  const knownRemote = remote !== zero && spawnSync('git', ['cat-file', '-e', `${remote}^{commit}`], { stdio: 'ignore' }).status === 0;
  const args = ['rev-list', knownRemote ? `${remote}..${local}` : local];
  if (existingRemoteHeads.length) args.push('--not', ...existingRemoteHeads);
  for (const commit of git(args).trim().split('\n').filter(Boolean)) commits.add(commit);
}
for (const commit of commits) {
  const metadata = git(['show', '-s', '--format=%an%n%ae%n%cn%n%ce%n%B', commit]);
  if (privacyMatches(metadata, policy).length) throw new Error('Private identifier in outgoing commit metadata.');
}
// Scan unique blobs once, rather than each full tree for every commit.
if (commits.size) {
  const objects = new Map();
  for (const commit of commits) {
    for (const entry of git(['diff-tree', '--root', '-m', '--no-commit-id', '-r', '--raw', '--no-abbrev', commit]).trim().split('\n').filter(Boolean)) {
      const [header, file] = entry.split('\t');
      const oid = header.split(' ')[3];
      // A deletion contributes no new path or blob. Earlier additions remain
      // scanned in their own commits, and retired ancestry is checked above.
      if (oid === zero) continue;
      if (privacyMatches(file || '', policy).length || /(^|\/)\.private-documents\//u.test(file || '') || file === '.privacy-policy.json') throw new Error('Private path in outgoing history.');
      objects.set(oid, true);
    }
  }
  for (const oid of objects.keys()) {
    const body = execFileSync('git', ['cat-file', 'blob', oid], { maxBuffer: 128 * 1024 * 1024 });
    if (privacyBlobMatches(body, policy).length) throw new Error('Private information in outgoing history.');
  }
}
console.log(`Privacy push check passed (${commits.size} outgoing commits).`);
