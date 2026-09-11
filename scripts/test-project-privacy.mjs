import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { privateSafeExport, privacyMatches } from './lib/privacy-policy.mjs';
import { privacyBlobMatches } from './lib/privacy-blob.mjs';
import { readPrivateReportDocument } from '../api/_lib/private-report-documents.mjs';

const policy = [{ id: 'synthetic-identifier', pattern: /example\s+person/giu }];
const row = { body: 'Complete opening. Complete final sentence.', source_snapshot: { author: 'Example Person' } };
const safe = privateSafeExport(row, policy);
assert.equal(safe.body, row.body);
assert.deepEqual(privacyMatches(JSON.stringify(safe), policy), []);
assert.equal(row.source_snapshot.author, 'Example Person');
assert.deepEqual(privacyMatches('EXAMPLE PERSON', policy), ['synthetic-identifier']);
const archive = spawnSync('python3', ['-c', 'import io,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",zipfile.ZIP_DEFLATED); z.writestr("xl/sharedStrings.xml","<si><t>Example</t><t>Person</t></si>"); z.close(); sys.stdout.buffer.write(b.getvalue())']);
assert.equal(archive.status, 0);
assert.deepEqual(privacyBlobMatches(archive.stdout, policy), ['synthetic-identifier'], 'Compressed Office text, including split XML runs, must be inspected.');
assert.deepEqual(privacyBlobMatches(Buffer.from('A synthetic clean document'), policy), []);
assert.throws(() => privacyBlobMatches(Buffer.from('PK\x03\x04malformed'), policy), /Archive privacy inspection/);

const prior = process.env.PRIVATE_REPORT_DOCUMENTS;
try {
  const body = 'A complete synthetic source document.\nIts final sentence remains intact.\n';
  const record = { body, sha256: createHash('sha256').update(body).digest('hex') };
  const bundle = { schema: 'private-reports/v1', documents: { 'private:report/general-2026': record } };
  const encode = () => gzipSync(JSON.stringify(bundle)).toString('base64');
  process.env.PRIVATE_REPORT_DOCUMENTS = encode();
  assert.equal(readPrivateReportDocument('private:report/general-2026'), body);
  const commonJsRuntime = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', `
    const assert = require('node:assert/strict');
    const { readPrivateReportDocument } = require('./api/_lib/private-report-documents.cjs');
    require('./src/astro-writing/productionPreCallGate.cjs');
    assert.equal(readPrivateReportDocument('private:report/general-2026'), ${JSON.stringify(body)});
  `], { cwd: fileURLToPath(new URL('../', import.meta.url)), env: process.env, encoding: 'utf8' });
  assert.equal(commonJsRuntime.status, 0, commonJsRuntime.stderr);

  record.body += 'tampered'; process.env.PRIVATE_REPORT_DOCUMENTS = encode();
  assert.throws(() => readPrivateReportDocument('private:report/general-2026'), /integrity/);
  assert.throws(() => readPrivateReportDocument('../../arbitrary-file'), /Unknown/);
} finally {
  if (prior === undefined) delete process.env.PRIVATE_REPORT_DOCUMENTS;
  else process.env.PRIVATE_REPORT_DOCUMENTS = prior;
}
console.log('Privacy export and private source integrity tests passed.');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'project-privacy-test-'));
try {
  const env = { ...process.env, PROJECT_PRIVACY_POLICY: JSON.stringify({ schema: 'project-privacy/v1', patterns: [{ id: 'test-only', regex: 'example\\s+person' }] }) };
  const run = (command, args, input) => spawnSync(command, args, { cwd: temporary, env, input, encoding: 'utf8' });
  const git = args => { const result = run('git', args); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); };
  git(['init', '-q']); git(['config', 'user.name', 'Synthetic Tester']); git(['config', 'user.email', 'test@example.invalid']);
  fs.writeFileSync(path.join(temporary, 'case.txt'), 'Example Person'); git(['add', 'case.txt']);
  const scanner = fileURLToPath(new URL('./check-project-privacy.mjs', import.meta.url));
  fs.writeFileSync(path.join(temporary, 'case.txt'), 'clean working copy');
  let result = run(process.execPath, [scanner, '--staged']);
  assert.equal(result.status, 1, 'Staged secrets must be detected even when the working copy is clean.');
  assert.ok(!`${result.stdout}${result.stderr}`.includes('Example Person'), 'Findings must not repeat identifiers.');
  git(['commit', '-qm', 'Synthetic unsafe historical fixture']);
  git(['add', 'case.txt']); git(['commit', '-qm', 'Remove synthetic identifier']);
  assert.equal(run(process.execPath, [scanner, '--ref', git(['rev-parse', 'HEAD'])]).status, 0);
  result = run(process.execPath, [fileURLToPath(new URL('./check-project-privacy-push.mjs', import.meta.url))], `refs/heads/test ${git(['rev-parse', 'HEAD'])} refs/heads/test ${'0'.repeat(40)}\n`);
  assert.notEqual(result.status, 0, 'A clean tip must not hide private data in intermediate history.');
  const pushScanner = fileURLToPath(new URL('./check-project-privacy-push.mjs', import.meta.url));
  const privatePath = path.join(temporary, 'Example Person.md');
  fs.writeFileSync(privatePath, 'Synthetic old private document.');
  git(['add', 'Example Person.md']); git(['commit', '-qm', 'Existing synthetic private path']);
  const beforeRemoval = git(['rev-parse', 'HEAD']);
  git(['rm', 'Example Person.md']); git(['commit', '-qm', 'Delete existing private path']);
  const afterRemoval = git(['rev-parse', 'HEAD']);
  result = run(process.execPath, [pushScanner], `refs/heads/test ${afterRemoval} refs/heads/test ${beforeRemoval}\n`);
  assert.equal(result.status, 0, 'Deleting an existing private path must be allowed.', result.stderr);
  git(['update-ref', 'refs/remotes/origin/main', beforeRemoval]);
  result = run(process.execPath, [pushScanner], `refs/heads/test ${afterRemoval} refs/heads/test ${git(['rev-parse', `${beforeRemoval}~1`])}\n`);
  assert.equal(result.status, 0, 'A cleanup rebase must not reclassify already-published main history as newly introduced.', result.stderr);
  fs.writeFileSync(privatePath, 'Synthetic reintroduced private path.');
  git(['add', 'Example Person.md']); git(['commit', '-qm', 'Reintroduce synthetic private path']);
  git(['rm', 'Example Person.md']); git(['commit', '-qm', 'Remove it again']);
  result = run(process.execPath, [pushScanner], `refs/heads/test ${git(['rev-parse', 'HEAD'])} refs/heads/test ${afterRemoval}\n`);
  assert.notEqual(result.status, 0, 'A newly introduced private path must be blocked even when later deleted.');
  assert.match(result.stderr, /Private path in outgoing history/);
  const retiredFile = path.join(temporary, 'retired-commits.txt');
  fs.writeFileSync(retiredFile, git(['rev-parse', 'HEAD~1']) + '\n');
  git(['config', 'projectPrivacy.retiredCommitsFile', retiredFile]);
  git(['update-ref', 'refs/remotes/origin/stale', git(['rev-parse', 'HEAD'])]);
  result = run(process.execPath, [fileURLToPath(new URL('./check-project-privacy-push.mjs', import.meta.url))], `refs/heads/test ${git(['rev-parse', 'HEAD'])} refs/heads/test ${'0'.repeat(40)}\n`);
  assert.notEqual(result.status, 0, 'Stale remote refs must not hide retired private ancestry.');
  assert.match(result.stderr, /retired private history/);
  fs.mkdirSync(path.join(temporary, 'public')); fs.writeFileSync(path.join(temporary, 'public', 'download.json'), '{"author":"Example Person"}');
  assert.equal(run(process.execPath, [scanner, '--directory', 'public']).status, 1);
  fs.writeFileSync(path.join(temporary, 'workbook.xlsx'), archive.stdout);
  git(['add', 'workbook.xlsx']);
  result = run(process.execPath, [scanner, '--staged']);
  assert.equal(result.status, 1, 'The staged scanner must inspect compressed workbook content.');
  assert.ok(!`${result.stdout}${result.stderr}`.includes('Example Person'));
  console.log('Privacy staged, historical push, and public-download regressions passed.');
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
