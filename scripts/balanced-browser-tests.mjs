#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function balanceTests(tests, count, timings) {
  assert(Number.isInteger(count) && count > 0 && count <= tests.length);
  assert.equal(new Set(tests).size, tests.length, 'Duplicate test identities');
  const bins = Array.from({ length: count }, () => ({ seconds: 0, tests: [] }));
  const duration = name => timings.durations[name] ?? timings.fallbackSeconds;
  for (const name of [...tests].sort((a, b) => duration(b) - duration(a) || a.localeCompare(b))) {
    const bin = bins.reduce((best, current) => current.seconds < best.seconds ? current : best);
    bin.tests.push(name);
    bin.seconds += duration(name);
  }
  return bins;
}

function identities(report) {
  const names = [];
  function visit(suite, parents = []) {
    const nested = suite.file && suite.title === suite.file ? parents : [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const project = test.projectName ? `[${test.projectName}] › ` : '';
        names.push(project + `tests/visual/${spec.file.replace(/^.*tests\/visual\//u, '')} › ${[...nested, spec.title].join(' › ')}`);
      }
    }
    for (const child of suite.suites ?? []) visit(child, nested);
  }
  for (const suite of report.suites) visit(suite);
  return names;
}

export function withShardLists(bins, run) {
  // Playwright clears outputDir before resolving --test-list. Keep selections
  // outside its artifacts directory and isolate simultaneous invocations.
  const directory = mkdtempSync(join(tmpdir(), 'tldr-browser-shards-'));
  try {
    const files = bins.map((bin, index) => {
      const file = join(directory, `shard-${index + 1}.txt`);
      writeFileSync(file, bin.tests.map(name => name.replace('tests/visual/', '')).join('\n') + '\n');
      return file;
    });
    return run(files);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function main(args) {
  const [configFlag, config, shard, mode] = args;
  assert.equal(configFlag, '--config');
  const durationFiles = {
    'playwright.horoscope-reader.config.ts': 'config/browser-test-durations.json',
    'playwright.sky-placement-reader.config.ts': 'config/sky-reader-test-durations.json'
  };
  assert(Object.hasOwn(durationFiles, config), 'Unknown balanced browser suite');
  assert(/^\d+\/\d+$/u.test(shard));
  assert(mode === undefined || mode === '--plan');
  const [index, count] = shard.split('/').map(Number);
  assert(index >= 1 && index <= count);
  const cli = 'node_modules/@playwright/test/cli.js';
  const base = ['test', '-c', config, '--fully-parallel', '--workers=1'];
  const report = JSON.parse(execFileSync(process.execPath, [cli, ...base, '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
  assert.equal(report.errors.length, 0, 'Test discovery failed');
  const tests = identities(report);
  const timings = JSON.parse(readFileSync(durationFiles[config], 'utf8'));
  const bins = balanceTests(tests, count, timings);
  return withShardLists(bins, files => {
    // Ask Playwright to resolve every generated list before running any tests.
    // A stale/ambiguous selector cannot silently drop or duplicate coverage.
    const selected = bins.flatMap((bin, i) => {
      const resolved = JSON.parse(execFileSync(process.execPath, [cli, ...base, '--test-list', files[i], '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
      assert.equal(resolved.errors.length, 0);
      const actual = identities(resolved);
      assert.deepEqual([...actual].sort(), [...bin.tests].sort());
      return actual;
  });
  assert.deepEqual([...selected].sort(), [...tests].sort());
  console.log(JSON.stringify({ tests: tests.length, shard: index, bins: bins.map(b => ({ tests: b.tests.length, estimatedSeconds: b.seconds })), unmeasured: tests.filter(t => timings.durations[t] === undefined).length }));
  if (mode === '--plan') return 0;
  const result = spawnSync(process.execPath, [cli, ...base, '--test-list', files[index - 1]], { stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main(process.argv.slice(2));
