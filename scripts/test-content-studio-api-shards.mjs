import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { apiCommandShards, apiShardCount } from './run-content-studio-api-shard.mjs';

const script = JSON.parse(readFileSync('package.json', 'utf8')).scripts['test:content-studio-api'];
const shards = apiCommandShards(script);
assert.equal(shards.length, 3);
assert(shards.every(commands => commands.length > 0));
assert.deepEqual(shards.flat(), script.split(' && '), 'Every full API command must occur exactly once, in original order.');
assert(shards.flat().includes('node --import tsx scripts/test-calendar-eclipse-classification.mts'));
assert(shards.flat().includes('node --import tsx scripts/test-calendar-sky-events.mts'));
assert.deepEqual(apiCommandShards(`${script} && node scripts/new-api-regression.mjs`).flat(),
  [...script.split(' && '), 'node scripts/new-api-regression.mjs'], 'New commands cannot fall out of the matrix.');
for (const invalid of ['', 'node a.mjs && node b.mjs | true', 'node a.mjs && false', 'node a.mjs; node b.mjs']) {
  assert.throws(() => apiCommandShards(invalid));
}

const directory = mkdtempSync(join(tmpdir(), 'studio-api-shards-'));
const runner = resolve('scripts/run-content-studio-api-shard.mjs');
try {
  writeFileSync(join(directory, 'fixture.mjs'), `import {appendFileSync} from 'node:fs';
appendFileSync('executed.txt', process.argv[2] + '\\n');
if (process.argv[2] === 'fail') process.exit(7);
`);
  const commands = Array.from({ length: 8 }, (_, index) => `node fixture.mjs ${index}`);
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ scripts: { 'test:content-studio-api': commands.join(' && ') } }));
  for (let shard = 1; shard <= apiShardCount; shard++) {
    const result = spawnSync(process.execPath, [runner, '--shard', String(shard)], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  assert.deepEqual(readFileSync(join(directory, 'executed.txt'), 'utf8').trim().split('\n'),
    commands.map((_, index) => String(index)), 'Actual child execution covers every command once and preserves shard order.');
  const before = readFileSync(join(directory, 'executed.txt'), 'utf8');
  for (const args of [[], ['--shard', '0'], ['--shard', '4'], ['--shard', '1', '--skip']]) {
    const result = spawnSync(process.execPath, [runner, ...args], { cwd: directory, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
  }
  assert.equal(readFileSync(join(directory, 'executed.txt'), 'utf8'), before, 'Invalid selectors cannot execute tests.');
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ scripts: {
    'test:content-studio-api': 'node fixture.mjs fail && node fixture.mjs forbidden && node fixture.mjs peer && node fixture.mjs peer2 && node fixture.mjs peer3 && node fixture.mjs peer4'
  } }));
  const failed = spawnSync(process.execPath, [runner, '--shard', '1'], { cwd: directory, encoding: 'utf8' });
  assert.equal(failed.status, 7, 'A real failing child must fail its shard.');
  assert.equal(readFileSync(join(directory, 'executed.txt'), 'utf8'), `${before}fail\n`, 'Failure prevents later commands in that shard.');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log(`PASS all ${shards.flat().length} unchanged API commands assigned once; actual child coverage, new-command admission, invalid selectors and failure propagation.`);
