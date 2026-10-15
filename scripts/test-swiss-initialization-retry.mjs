import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Only initialization transport is synthetic. Exercise the actual ephemeris
// module's promise lifecycle without substituting any astronomical results.
const key = Symbol.for('tldrastro.swiss-initialization-contract');
const state = { constructors: 0, initializations: [] };
globalThis[key] = state;
const cacheRoot = path.resolve('node_modules/.cache/tldrastro');
await mkdir(cacheRoot, { recursive: true });
const directory = await mkdtemp(path.join(cacheRoot, 'swiss-initialization-'));
const until = async predicate => {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'Initialization scheduling must settle');
    await new Promise(resolve => setImmediate(resolve));
  }
};
try {
  const outfile = path.join(directory, 'actual-ephemeris.mjs');
  await build({
    entryPoints: ['apps/web/src/services/ephemeris.ts'], bundle: true,
    platform: 'node', format: 'esm', outfile,
    define: { 'import.meta.env': '{}' }, logLevel: 'silent',
    plugins: [{ name: 'synthetic-initialization-transport', setup(builder) {
      builder.onResolve({ filter: /^swisseph-wasm$/ }, () => ({ path: 'initialization', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'js', contents: `
        const state = globalThis[Symbol.for('tldrastro.swiss-initialization-contract')];
        export default class SyntheticSwissInitialization {
          constructor() { state.constructors++; }
          initSwissEph() {
            return new Promise((resolve, reject) => state.initializations.push({ resolve, reject }));
          }
        }
      ` }));
    } }]
  });
  const { preloadSwissEphemeris } = await import(pathToFileURL(outfile).href);
  for (const attempt of [1, 2]) {
    const settled = Promise.allSettled([preloadSwissEphemeris(), preloadSwissEphemeris()]);
    await until(() => state.initializations.length === attempt);
    assert.equal(state.constructors, attempt, 'Concurrent callers share one initialization');
    const original = new Error(`Synthetic explicit initialization failure ${attempt}`);
    state.initializations[attempt - 1].reject(original);
    const results = await settled;
    assert.ok(results.every(result => result.status === 'rejected' && result.reason === original),
      'Every existing caller receives the same original rejection object');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(state.constructors, attempt, 'Failure does not automatically retry');
  }
  const recovered = Promise.all([preloadSwissEphemeris(), preloadSwissEphemeris()]);
  await until(() => state.initializations.length === 3);
  assert.equal(state.constructors, 3, 'A later explicit demand may initialize again');
  state.initializations[2].resolve();
  await recovered;
  await Promise.all([preloadSwissEphemeris(), preloadSwissEphemeris()]);
  assert.equal(state.initializations.length, 3, 'Successful initialization remains shared');
  assert.equal(state.constructors, 3);
  console.log('PASS: actual initialization shares original failures, allows explicit recovery, never retries automatically and retains successful dedupe.');
} finally {
  delete globalThis[key];
  await rm(directory, { recursive: true, force: true });
}
