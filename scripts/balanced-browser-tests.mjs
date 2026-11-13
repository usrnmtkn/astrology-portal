#!/usr/bin/env node
import assert from 'node:assert/strict';
import ts from 'typescript';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {affectedTestPlan,affectedBrowserIdentities} from './ci-test-plan.mjs';

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

/** File grouping preserves serial suites and beforeAll/afterAll lifetimes.
 * Unknown test identities still contribute their full fallback estimate. */
export function balanceTestFiles(tests, count, timings, independentFiles = []) {
  assert.equal(new Set(tests).size, tests.length, 'Duplicate test identities');
  const files = new Map();
  for (const name of tests) {
    const file = name.match(/tests\/visual\/[^›]+\.spec\.ts/u)?.[0];
    assert(file, 'Missing test file identity');
    const group = independentFiles.includes(file) ? name : file;
    files.set(group, [...(files.get(group) ?? []), name]);
  }
  const durations = Object.fromEntries([...files].map(([file, names]) => [file,
    names.reduce((sum, name) => sum + (timings.durations[name] ?? timings.fallbackSeconds), 0)]));
  return balanceTests([...files.keys()], count, { durations, fallbackSeconds: timings.fallbackSeconds })
    .map(bin => ({ seconds: bin.seconds, tests: bin.tests.flatMap(file => files.get(file)) }));
}

/** Only files already safe for independent cases may span timing bins. */
export function assertIndependentBrowserFile(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const call = node.expression.getText(ast).replace(/\s/gu, '');
      assert(!/^test\.(?:beforeAll|afterAll|extend|describe\.(?:serial|configure))$/u.test(call)
        && !/^test\[/u.test(call), `${file} has a shared or configured fixture lifetime; keep its complete file together.`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}

export function identities(report,{testListFiles=false}={}) {
  const names = [];
  function visit(suite, parents = []) {
    const nested = suite.file && suite.title === suite.file ? parents : [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const project = test.projectName ? `[${test.projectName}] › ` : '';
        const file=testListFiles?spec.file:`tests/visual/${spec.file.replace(/^.*tests\/visual\//u, '')}`;
        names.push(project + `${file} › ${[...nested, spec.title].join(' › ')}`);
      }
    }
    for (const child of suite.suites ?? []) visit(child, nested);
  }
  for (const suite of report.suites) visit(suite);
  return names;
}

export function withShardLists(bins, run, {preservePaths=false}={}) {
  // Playwright clears outputDir before resolving --test-list. Keep selections
  // outside its artifacts directory and isolate simultaneous invocations.
  const directory = mkdtempSync(join(tmpdir(), 'tldr-browser-shards-'));
  try {
    const files = bins.map((bin, index) => {
      const file = join(directory, `shard-${index + 1}.txt`);
      writeFileSync(file, bin.tests.map(name => preservePaths?name:name.replace('tests/visual/', '')).join('\n') + '\n');
      return file;
    });
    return run(files);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function main(args,{cli='node_modules/@playwright/test/cli.js'}={}) {
  const [configFlag, config, shard, mode] = args;
  assert.equal(configFlag, '--config');
  const durationFiles = {
    'playwright.horoscope-reader.config.ts': 'config/browser-test-durations.json',
    'playwright.sky-placement-reader.config.ts': 'config/sky-reader-test-durations.json',
    'playwright.reader-surfaces.config.ts': 'config/reader-surface-test-durations.json',
    'playwright.studio-ui.config.ts': 'config/studio-ui-test-durations.json',
    'playwright.studio-admin-flows.config.ts': 'config/studio-admin-flow-test-durations.json'
  };
  assert(Object.hasOwn(durationFiles, config), 'Unknown balanced browser suite');
  assert(/^\d+\/\d+$/u.test(shard));
  assert(mode === undefined || mode === '--plan');
  const [index, count] = shard.split('/').map(Number);
  assert(index >= 1 && index <= count);
  const byFile = ['playwright.reader-surfaces.config.ts', 'playwright.studio-ui.config.ts', 'playwright.studio-admin-flows.config.ts'].includes(config);
  const base = ['test', '-c', config, ...(byFile ? [] : ['--fully-parallel']), '--workers=1'];
  const report = JSON.parse(execFileSync(process.execPath, [cli, ...base, '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
  assert.equal(report.errors.length, 0, 'Test discovery failed');
  const plan=affectedTestPlan();
  const tests = affectedBrowserIdentities(identities(report),plan);
  if(!tests.length) {
    assert(plan,'No tests discovered');
    console.log('No affected browser cases in this suite.');return 0;
  }
  const timings = JSON.parse(readFileSync(durationFiles[config], 'utf8'));
  const independentFiles = {
    'playwright.reader-surfaces.config.ts': ['tests/visual/calendar-event-sky-navigation.spec.ts'],
    'playwright.studio-admin-flows.config.ts': ['tests/visual/content-dashboard-admin-user-flows.spec.ts']
  }[config] ?? [];
  for (const file of independentFiles) if(tests.some(name=>name.includes(file)))assertIndependentBrowserFile(readFileSync(file, 'utf8'), file);
  const groupCount=byFile?new Set(tests.map(name=>{
    const file=name.match(/tests\/visual\/[^›]+\.spec\.ts/u)[0];return independentFiles.includes(file)?name:file;
  })).size:tests.length;
  const activeCount=plan?Math.min(count,groupCount):count;
  const bins = byFile ? balanceTestFiles(tests, activeCount, timings, independentFiles) : balanceTests(tests, activeCount, timings);
  const nativeRows=identities(report,{testListFiles:true});
  const native=new Map(identities(report).map((name,index)=>[name,nativeRows[index]]));
  return withShardLists(bins.map(bin=>({...bin,tests:bin.tests.map(name=>native.get(name))})), files => {
    // Ask Playwright to resolve every generated list before running any tests.
    // A stale/ambiguous selector cannot silently drop or duplicate coverage.
    const selected = bins.flatMap((bin, i) => {
      const resolved = JSON.parse(execFileSync(process.execPath, [cli, ...base, '--test-list', files[i], '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
      assert.equal(resolved.errors.length, 0);
      const actual = identities(resolved);
      assert.deepEqual([...actual].sort(), [...bin.tests].sort());
      return actual;
  },{preservePaths:true});
  assert.deepEqual([...selected].sort(), [...tests].sort());
  console.log(JSON.stringify({ tests: tests.length, shard: index, bins: bins.map(b => ({ tests: b.tests.length, estimatedSeconds: b.seconds })), unmeasured: tests.filter(t => timings.durations[t] === undefined).length }));
  if (mode === '--plan') return 0;
  if(index>activeCount){console.log('No affected cases in this shard; the complete selected union is covered above.');return 0;}
  const result = spawnSync(process.execPath, [cli, ...base, '--test-list', files[index - 1]], { stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main(process.argv.slice(2));
