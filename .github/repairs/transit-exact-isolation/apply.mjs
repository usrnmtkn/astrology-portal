import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// One-time source transport. This does not publish content or deploy an app.
const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf8'));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const root = git('rev-parse', '--show-toplevel').trim();
assert.equal(path.resolve(process.cwd()), root, 'Run from the repository root.');
assert.equal(manifest.schema, 'transit-source-isolation-repair/v1');
assert.match(git('remote', 'get-url', 'origin').trim(), /github\.com[:/]usrnmtkn\/astrology-portal(?:\.git)?$/);
assert.equal(git('branch', '--show-current').trim(), 'fix/transit-natal-exact-editing-20260916', 'Never apply this transport to main.');
git('merge-base', '--is-ancestor', manifest.baseCommit, 'HEAD');
git('merge-base', '--is-ancestor', 'origin/main', 'HEAD');
assert.equal(git('status', '--porcelain').trim(), '', 'Preserve existing work: use a clean isolated checkout.');
const blob = data => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
const actual = entry => {
  assert.ok(!path.isAbsolute(entry.path) && !entry.path.split('/').includes('..'), 'Invalid repair path.');
  const target = path.join(root, entry.path);
  if (!fs.existsSync(target)) return null;
  assert.ok(fs.lstatSync(target).isFile(), 'Refusing non-regular target.');
  return blob(fs.readFileSync(target));
};
if (manifest.files.every(entry => actual(entry) === entry.after)) {
  console.log('Source repair is already applied. No files changed.');
  process.exit(0);
}
for (const entry of manifest.files) assert.equal(actual(entry), entry.before, `Source changed since review: ${entry.path}`);
const patch = Buffer.concat(Array.from({ length: 7 }, (_, index) => fs.readFileSync(path.join(here, `${String(index + 1).padStart(2, '0')}.patch`))));
assert.equal(createHash('sha256').update(patch).digest('hex'), manifest.patchSha256, 'Repair patch integrity mismatch.');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'transit-source-repair-'));
try {
  const patchPath = path.join(temp, 'source.patch');
  fs.writeFileSync(patchPath, patch);
  git('apply', '--check', '--index', patchPath);
  if (!process.argv.includes('--write')) {
    console.log(`Checked ${manifest.files.length} exact source changes; no files changed. Use --write to apply on this branch.`);
  } else {
    git('apply', '--index', patchPath);
    for (const entry of manifest.files) assert.equal(actual(entry), entry.after, `Applied hash mismatch: ${entry.path}`);
    console.log(`Applied and staged ${manifest.files.length} verified source changes. Runtime rebuild and release gates are still required.`);
  }
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
