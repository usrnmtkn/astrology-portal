import assert from 'node:assert/strict';
import { measureDeploymentEnvironment, ENVIRONMENT_LIMIT_BYTES } from './check-deployment-env-size.mjs';

assert.equal(measureDeploymentEnvironment({ A: 'é😀' }).bytes, 9);
assert.equal(measureDeploymentEnvironment({ A: 'x'.repeat(ENVIRONMENT_LIMIT_BYTES - 3) }).status, 'near-limit');
assert.equal(measureDeploymentEnvironment({ A: 'x'.repeat(ENVIRONMENT_LIMIT_BYTES - 2) }).status, 'over-limit');
assert.equal(measureDeploymentEnvironment({ A: 'x'.repeat(40_000), B: 'x'.repeat(30_000) }).status, 'over-limit');
for (const input of [null, {}, [], { A: null }, { A: '*****' }, { A: '[REDACTED]' }]) assert.throws(() => measureDeploymentEnvironment(input));
const secret = 'synthetic-secret-must-never-appear';
assert(!JSON.stringify(measureDeploymentEnvironment({ PRIVATE_DOCUMENT: secret })).includes(secret));
console.log('PASS: environment aggregate/UTF-8 boundaries, masked input rejection and value-free output.');

// Exercise the public CLI, including its failure output, using synthetic secrets.
const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const { spawnSync } = await import('node:child_process');
const directory = mkdtempSync(join(tmpdir(), 'environment-budget-'));
try {
  const file = join(directory, 'complete.json');
  for (const [payload, exit] of [
    [JSON.stringify({ PRIVATE_DOCUMENT: secret }), 0],
    [JSON.stringify({ PRIVATE_DOCUMENT: secret.repeat(2500) }), 1],
    [JSON.stringify({ PRIVATE_DOCUMENT: '[REDACTED]' }), 1],
    [`{"PRIVATE_DOCUMENT":"${secret}`, 1]
  ]) {
    writeFileSync(file, payload, { mode: 0o600 });
    const result = spawnSync(process.execPath, ['scripts/check-deployment-env-size.mjs', '--json-file', file], { encoding: 'utf8' });
    assert.equal(result.status, exit);
    assert(!`${result.stdout}${result.stderr}`.includes(secret), 'Neither successful output nor parser errors may reveal values');
  }
  writeFileSync(file, 'PRIVATE_DOCUMENT="multiline\nvalue"\nUNICODE="é😀"\n');
  const result = spawnSync(process.execPath, ['scripts/check-deployment-env-size.mjs', '--env-file', file], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).bytes, measureDeploymentEnvironment({ PRIVATE_DOCUMENT: 'multiline\nvalue', UNICODE: 'é😀' }).bytes);
} finally { rmSync(directory, { recursive: true }); }
console.log('PASS: blocking preflight CLI, dotenv parsing, malformed input and secret-safe diagnostics.');
