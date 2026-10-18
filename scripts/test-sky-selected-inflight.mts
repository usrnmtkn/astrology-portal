import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { transformSync } from 'esbuild';

// Execute the actual loader-owner declarations, with only transport replaced.
const file = 'apps/web/src/services/generatedContent.ts';
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const names = ['pendingDashboardBundles', 'shareDashboardBundle', 'loadFallbackArchitectureV3SkyPlacementDashboardBundle', 'prefetchColdSkyPlacementRows', 'loadFallbackArchitectureV3DashboardBundle'];
const selected = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text ?? '')
  || ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && names.includes(declaration.name.text)));
assert.equal(selected.length, 5);
const printer = ts.createPrinter();
const code = transformSync(selected.map(node => printer.printNode(ts.EmitHint.Unspecified, node, source)).join('\n'), { loader: 'ts', format: 'cjs' }).code;
function harness() {
  const fixture: any = { generation: 1, reads: [], coreReads: [], speculations: 0, refresh: async () => {} };
  const context: any = { module: { exports: {} }, refreshContentPublications: () => fixture.refresh(),
    readSkyPlacementBundle: (selection: string, staged: unknown, canCache: () => boolean) => {
      let resolve!: (value: string) => void, reject!: (error: Error) => void;
      const promise = new Promise<string>((yes, no) => { resolve = yes; reject = no; });
      fixture.reads.push({ selection, staged, canCache, resolve, reject }); return promise;
    }, readFallbackArchitectureV3DashboardBundle: (scope: string, canCache: () => boolean, early: unknown) => {
      let resolve!: (value: string) => void, reject!: (error: Error) => void;
      const promise = new Promise<string>((yes, no) => { resolve = yes; reject = no; });
      fixture.coreReads.push({ scope, early, canCache, resolve, reject }); return promise;
    }, contentPublicationsAvailableOnline: () => false, readCachedFallbackArchitectureV3Bundle: () => null,
    loadFallbackArchitectureV3BundledSkyPlacementManifest: () => { fixture.speculations++; throw Error('Unexpected speculative transport'); } };
  Object.defineProperty(context, 'contentPublicationGeneration', { get: () => fixture.generation });
  vm.runInNewContext(code, context);
  return { fixture, core: context.module.exports.loadFallbackArchitectureV3DashboardBundle, load: context.module.exports.loadFallbackArchitectureV3SkyPlacementDashboardBundle,
    prefetch: context.module.exports.prefetchColdSkyPlacementRows };
}
const turns = async () => { for (let turn = 0; turn < 8; turn++) await Promise.resolve(); };
{
  const h = harness(); let releaseLedger!: () => void;
  h.fixture.refresh = () => new Promise<void>(resolve => { releaseLedger = resolve; });
  let consumed = 0, cancelled = 0;
  const owned = { request: Promise.resolve({ data: [], error: null }), cancel: () => { cancelled++; } };
  const first = h.load('article:sun/libra', { consume: () => { consumed++; return owned; } });
  assert.equal(consumed, 1, 'The original owner claims early transport before awaiting the ledger.');
  releaseLedger(); await turns();
  let joiningCancelled = 0;
  h.fixture.refresh = async () => {};
  const joined = h.load('article:sun/libra', { consume: () => ({ request: Promise.resolve({ data: [] }), cancel: () => { joiningCancelled++; } }) });
  await turns();
  assert.equal(h.fixture.reads.length, 1); assert.equal(cancelled, 0); assert.equal(joiningCancelled, 1);
  assert.equal(h.prefetch('article:sun/libra', Promise.resolve()), undefined);
  assert.equal(h.fixture.speculations, 0, 'A retry cannot speculate duplicate selected transport before joining.');
  h.fixture.reads[0].resolve('current');
  assert.equal(await first, 'current'); assert.equal(await joined, 'current'); assert.equal(cancelled, 1);
}
{
  const h = harness();
  const first = h.load('article:sun/libra'); await turns();
  const otherSelection = h.load('article:venus/scorpio'); await turns();
  assert.equal(h.fixture.reads.length, 2);
  h.fixture.generation++;
  const next = h.load('article:sun/libra'); await turns();
  assert.equal(h.fixture.reads.length, 3);
  assert.equal(h.fixture.reads[0].canCache(), false); assert.equal(h.fixture.reads[2].canCache(), true);
  h.fixture.reads[0].resolve('old'); await first;
  const joinsNext = h.load('article:sun/libra'); await turns();
  assert.equal(h.fixture.reads.length, 3, 'Old completion cannot erase the newer generation entry.');
  h.fixture.reads[1].resolve('other'); h.fixture.reads[2].resolve('new');
  assert.deepEqual(await Promise.all([otherSelection, next, joinsNext]), ['other', 'new', 'new']);
}
{
  const h = harness(); const failed = h.load('article:sun/libra'); await turns();
  const rejection = assert.rejects(failed, /Synthetic failure/);
  h.fixture.reads[0].reject(new Error('Synthetic failure')); await rejection;
  const retry = h.load('article:sun/libra'); await turns();
  assert.equal(h.fixture.reads.length, 2); h.fixture.reads[1].resolve('recovered');
  assert.equal(await retry, 'recovered');
}
console.log('PASS: actual selected owner shares generation/selection, owns early cancellation, prevents retry speculation, guards stale cache and permits failed-read Retry.');


{
  const h = harness(); let consumed = false, aborted = 0;
  const physical = Promise.resolve({ data: [], error: null });
  const first = h.core('sky-article', { consume: () => { consumed = true; return physical; }, discard: () => { if (!consumed) aborted++; } });
  await turns(); assert.equal(consumed, true); assert.equal(aborted, 0);
  assert.equal(h.fixture.coreReads[0].early, physical);
  let joinedDiscard = 0;
  const joined = h.core('sky-article', { consume: () => { throw Error('Joining core cannot claim transport'); }, discard: () => { joinedDiscard++; } });
  await turns(); assert.equal(joinedDiscard, 1); assert.equal(h.fixture.coreReads.length, 1);
  h.fixture.generation++;
  const next = h.core('sky-article'); await turns();
  assert.equal(h.fixture.coreReads[0].canCache(), false); assert.equal(h.fixture.coreReads[1].canCache(), true);
  h.fixture.coreReads[0].resolve('old'); await Promise.all([first, joined]);
  const nextJoin = h.core('sky-article'); await turns();
  assert.equal(h.fixture.coreReads.length, 2);
  h.fixture.coreReads[1].resolve('new'); assert.deepEqual(await Promise.all([next, nextJoin]), ['new', 'new']);
}
{
  const h = harness(); const first = h.core('sky-article'); await turns();
  const rejected = assert.rejects(first, /Synthetic core failure/);
  h.fixture.coreReads[0].reject(new Error('Synthetic core failure')); await rejected;
  const retry = h.core('sky-article'); await turns();
  assert.equal(h.fixture.coreReads.length, 2); h.fixture.coreReads[1].resolve('retried'); assert.equal(await retry, 'retried');
}
console.log('PASS: actual core owner keeps separate early claim/discard, generation cache fencing, old-completion isolation and retry semantics.');
