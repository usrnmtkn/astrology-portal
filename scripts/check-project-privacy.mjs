#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadPrivacyPolicy, privacyMatches } from './lib/privacy-policy.mjs';

const staged = process.argv.includes('--staged');
const refFlag = process.argv.indexOf('--ref');
const ref = refFlag < 0 ? null : process.argv[refFlag + 1];
if (ref !== null && !/^[a-f0-9]{40}$/u.test(ref)) throw new Error('Expected an exact Git commit.');
const root = process.cwd();
const policy = loadPrivacyPolicy(root);
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const directoryFlag = process.argv.indexOf('--directory');
const directory = directoryFlag < 0 ? null : process.argv[directoryFlag + 1];
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Public output cannot contain symlinks.');
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const paths = directory ? walk(directory) : [...new Set(git(ref ? ['ls-tree', '-r', '--name-only', '-z', ref] : staged ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'] : ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).toString().split('\0').filter(Boolean))];
const findings = [];
for (const file of paths) {
  if (!staged && !ref && !fs.existsSync(file)) continue;
  const body = ref ? git(['show', `${ref}:${file}`]) : staged ? git(['show', `:${file}`]) : fs.readFileSync(file);
  const matches = [...new Set([...privacyMatches(file, policy), ...privacyMatches(body.toString('utf8'), policy)])];
  if (/(^|\/)\.private-documents\//u.test(file) || /(^|\/)\.privacy-policy\.json$/u.test(file)) matches.push('private-storage');
  if (matches.length) {
    // Paths can themselves identify a person. Report only a stable opaque index.
    findings.push({ fileNumber: paths.indexOf(file) + 1, rules: matches });
  }
}
if (findings.length) {
  console.error(JSON.stringify({ ok: false, affectedFiles: findings.length, findings }));
  process.exitCode = 1;
} else console.log(JSON.stringify({ ok: true, checkedFiles: paths.length, staged }));
