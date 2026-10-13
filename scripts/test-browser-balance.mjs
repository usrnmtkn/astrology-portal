import assert from 'node:assert/strict';
import { balanceTests, withShardLists } from './balanced-browser-tests.mjs';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const timings = { durations: { a: 220, b: 215, c: 210, d: 205, e: 50, f: 45 }, fallbackSeconds: 30 };
const names = ['a', 'b', 'c', 'd', 'e', 'f', 'new'];
const bins = balanceTests(names, 3, timings);
assert.deepEqual(bins.flatMap(bin => bin.tests).sort(), [...names].sort());
assert.deepEqual(balanceTests([...names].reverse(), 3, timings), bins, 'Discovery order must not change shard assignments');
assert.equal(bins.reduce((n, bin) => n + bin.seconds, 0), 975, 'New tests receive a nonzero estimate');
assert(bins.every(bin => bin.seconds <= 415));
assert.throws(() => balanceTests(['a', 'a'], 2, timings));
assert.throws(() => balanceTests(names, 0, timings));
console.log('PASS: deterministic duration balancing, complete coverage and new-test fallback.');

// Listing alone misses Playwright's outputDir cleanup before real execution.
const directory = realpathSync(mkdtempSync(join(tmpdir(), 'tldr-browser-balance-test-')));
try {
  const outputDir = join(directory, 'test-results');
  mkdirSync(outputDir);
  const sentinel = join(outputDir, 'old-artifact.txt');
  writeFileSync(sentinel, 'Playwright must remove this before running.');
  const config = join(directory, 'playwright.config.cjs');
  writeFileSync(config, `module.exports = ${JSON.stringify({ testDir: directory, outputDir, workers: 1, reporter: 'json' })};`);
  writeFileSync(join(directory, 'selection.spec.cjs'), `
    const {test, expect} = require(${JSON.stringify(resolve('node_modules/@playwright/test'))});
    test('selected journey', () => expect(1).toBe(1));
    test('excluded journey', () => { throw new Error('Unselected test ran'); });
  `);
  let listFile;
  withShardLists([{ tests: ['tests/visual/selection.spec.cjs › selected journey'] }], files => {
    listFile = files[0];
    const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '-c', config, '--test-list', listFile], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(JSON.parse(result.stdout).stats.expected, 1, `Execute exactly the selected test: ${result.stdout}`);
    assert(!existsSync(sentinel), 'Exercise real outputDir cleanup');
    assert(existsSync(listFile), 'Selection must survive until the run completes');
  });
  assert(!existsSync(listFile), 'Remove temporary selections after the run');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log('PASS: actual Playwright execution preserves shard selection through artifact cleanup.');

// Resolve all production shard lists, including every newly discovered test,
// through Playwright itself. Neither timing data nor a config move may lose
// coverage or accidentally match a test twice.
for (const [config, shard] of [
  ['playwright.horoscope-reader.config.ts', '1/3'],
  ['playwright.sky-placement-reader.config.ts', '1/2']
]) {
  const result = spawnSync(process.execPath, ['scripts/balanced-browser-tests.mjs', '--config', config, shard, '--plan'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log(result.stdout.trim());
}
