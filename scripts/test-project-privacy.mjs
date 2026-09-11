import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { privateSafeExport, privacyMatches } from './lib/privacy-policy.mjs';
import { readPrivateReportDocument } from '../api/_lib/private-report-documents.mjs';

const policy = [{ id: 'synthetic-identifier', pattern: /example\s+person/giu }];
const row = { body: 'Complete opening. Complete final sentence.', source_snapshot: { author: 'Example Person' } };
const safe = privateSafeExport(row, policy);
assert.equal(safe.body, row.body);
assert.deepEqual(privacyMatches(JSON.stringify(safe), policy), []);
assert.equal(row.source_snapshot.author, 'Example Person');
assert.deepEqual(privacyMatches('EXAMPLE PERSON', policy), ['synthetic-identifier']);

const prior = process.env.PRIVATE_REPORT_DOCUMENTS;
try {
  const body = 'A complete synthetic source document.\nIts final sentence remains intact.\n';
  const record = { body, sha256: createHash('sha256').update(body).digest('hex') };
  const bundle = { schema: 'private-reports/v1', documents: { 'private:report/general-2026': record } };
  const encode = () => gzipSync(JSON.stringify(bundle)).toString('base64');
  process.env.PRIVATE_REPORT_DOCUMENTS = encode();
  assert.equal(readPrivateReportDocument('private:report/general-2026'), body);
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
  fs.mkdirSync(path.join(temporary, 'public')); fs.writeFileSync(path.join(temporary, 'public', 'download.json'), '{"author":"Example Person"}');
  assert.equal(run(process.execPath, [scanner, '--directory', 'public']).status, 1);
  console.log('Privacy staged, historical push, and public-download regressions passed.');
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
