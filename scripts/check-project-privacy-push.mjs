import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { loadPrivacyPolicy, privacyMatches } from './lib/privacy-policy.mjs';

// pre-push receives exact local/remote refs on stdin. Inspect every outgoing
// commit, including an identifier added and deleted before the branch tip.
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const policy = loadPrivacyPolicy();
const zero = '0'.repeat(40);
const refs = fs.readFileSync(0, 'utf8').trim().split('\n').filter(Boolean);
const commits = new Set();
for (const line of refs) {
  const [localRef, local, remoteRef, remote] = line.split(/\s+/u);
  if (local === zero) continue;
  if (privacyMatches(`${localRef} ${remoteRef}`, policy).length) throw new Error('Private identifier in a branch name.');
  const knownRemote = remote !== zero && spawnSync('git', ['cat-file', '-e', `${remote}^{commit}`], { stdio: 'ignore' }).status === 0;
  const args = knownRemote ? ['rev-list', `${remote}..${local}`] : ['rev-list', local, '--not', '--remotes=origin'];
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
      if (privacyMatches(file || '', policy).length || /(^|\/)\.private-documents\//u.test(file || '') || file === '.privacy-policy.json') throw new Error('Private path in outgoing history.');
      if (oid !== zero) objects.set(oid, true);
    }
  }
  for (const oid of objects.keys()) {
    if (privacyMatches(git(['cat-file', 'blob', oid]), policy).length) throw new Error('Private information in outgoing history.');
  }
}
console.log(`Privacy push check passed (${commits.size} outgoing commits).`);
