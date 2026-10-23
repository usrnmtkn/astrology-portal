import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { build } from 'esbuild';
import { packageLegacySkyPlacementMirror } from '../apps/web/src/services/legacySkyPlacementMirror';

const folder = 'apps/web/src/content/fallbackArchitectureV3/';
const manifest = JSON.parse(fs.readFileSync(folder + 'bundled-sky-placement-manifest-v3.json', 'utf8'));
const records = ['bundled-sky-placement-rows-v3.json', 'bundled-sky-placement-house-rows-v3.json']
  .flatMap(file => JSON.parse(fs.readFileSync(folder + file, 'utf8')).hookRows);
const rows: any[] = records.map((record: any, index: number) => ({
  id: `synthetic-legacy-${index}`, content_key: record.contentKey, status: 'LIVE', lane: 'serving', review_state: null,
  surface: 'sky', mode: 'in_depth', target_date: null, provider: 'tldrastro-fallback-architecture-v3-sky-placement',
  updated_at: '2026-10-09T00:00:00Z', headline: 'Synthetic legacy source', body: 'Synthetic complete legacy passage.', summary: '',
  sections: { packageRecord: { ...Object.fromEntries(['contentKey', 'content_role', 'grammar_frame', 'review_status', 'render_policy']
    .filter(key => record[key] !== undefined).map(key => [key, record[key]])), body_you: 'Synthetic complete legacy passage.', body_they: 'Synthetic complete legacy passage.' } },
  source_snapshot: { content_role: record.content_role, review_status: record.review_status, distributionState: 'serving',
    packageVersion: manifest.packageVersion, packagePartition: 'sky-placement', packagePartitionContentHash: manifest.contentHash,
    packagePartitionKeyManifestHash: manifest.keyManifestHash, packagePartitionKeyCount: manifest.keyCount }
}));
const packaged = await packageLegacySkyPlacementMirror(rows);
assert.equal(packaged?.bundle.rowsFile.hookRows?.length, manifest.keyCount);
assert.equal(packaged?.mirror.keyManifestHash, manifest.keyManifestHash);
assert(rows.every(row => row.body === 'Synthetic complete legacy passage.'), 'Packaging cannot rewrite incoming copy.');
assert.equal(await packageLegacySkyPlacementMirror([...rows, structuredClone(rows[0])]), null, 'Duplicate approved keys fail closed.');
for (const change of [
  { packagePartition: 'core' }, { packagePartitionKeyCount: 0 },
  { packageVersion: 'wrong-package' }, { packagePartitionKeyManifestHash: 'wrong-keys' }
]) {
  const changed = rows.map(row => ({ ...row, source_snapshot: { ...row.source_snapshot, ...change } }));
  assert.equal(await packageLegacySkyPlacementMirror(changed), null);
}
const mixed = structuredClone(rows); mixed[0].source_snapshot.packagePartitionContentHash = 'different-metadata';
assert.equal(await packageLegacySkyPlacementMirror(mixed), null, 'Mixed metadata fails closed.');
assert.equal(await packageLegacySkyPlacementMirror(rows.slice(1)), null, 'An incomplete key inventory fails closed.');
const staged = structuredClone(rows);
staged.find(row => row.content_key.startsWith('fallback-hook/sky-sign-copy/'))!.source_snapshot.distributionState = 'staged';
assert.equal(await packageLegacySkyPlacementMirror(staged), null, 'Unserved continuous rows cannot enter the mirror.');

// Execute the actual branch body; only the optional module and external inputs
// are replaced. Its import initializer counts actual dynamic-import execution.
const file = 'apps/web/src/services/generatedContent.ts';
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const node = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'readSkyPlacementBundle')!;
assert(node);
const text = ts.createPrinter().printNode(ts.EmitHint.Unspecified, node, source).replace('async function', 'export async function');
const compiled = await build({ stdin: { contents: text, loader: 'ts', resolveDir: process.cwd() }, bundle: true,
  platform: 'node', format: 'cjs', write: false, plugins: [{ name: 'optional-mirror', setup(builder) {
    builder.onResolve({ filter: /legacySkyPlacementMirror/ }, () => ({ path: 'legacy', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `fixture.imports++; if (fixture.importFailure) throw new Error('Synthetic import failure'); export const packageLegacySkyPlacementMirror = rows => fixture.pack(rows);` }));
  } }] });
function harness() {
  const fixture: any = { ledger: false, client: {}, cached: null, version: 2, imports: 0, current: true,
    requests: [], writes: [], clears: 0, warnings: 0, rows: { data: [{}], error: null },
    latest: { data: [{}], error: null }, pack: async () => ({ bundle: 'legacy', mirror: 'mirror' }) };
  const context: any = { fixture, module: { exports: {} }, console: { warn: () => { fixture.warnings++; } },
    publicationLedgerReady: () => fixture.ledger, contentPublicationRecords: () => [],
    isSkyPlacementPublishedReaderKey: () => false, loadPublishedSkyBundle: async () => 'published',
    publicReaderAvailable: async () => Boolean(fixture.client), readCachedFallbackArchitectureV3SkyPlacementBundle: async () => fixture.cached,
    loadReaderRows: async (query: any) => { fixture.requests.push(query); return query.latestVersion ? fixture.latest : fixture.rows; },
    fallbackArchitectureV3SkyPlacementProvider: 'synthetic-provider', fallbackArchitectureV3DashboardVersionFromRows: () => fixture.version,
    clearCachedFallbackArchitectureV3SkyPlacementBundle: () => { fixture.clears++; },
    cacheFallbackArchitectureV3SkyPlacementBundle: (...values: any[]) => fixture.writes.push(values) };
  vm.runInNewContext(compiled.outputFiles[0].text, context);
  return { fixture, run: () => context.module.exports.readSkyPlacementBundle('article:sun/libra', undefined, () => fixture.current) };
}
for (const kind of ['published', 'offline-published', 'unconfigured', 'zero', 'cache-hit', 'version-error', 'rows-error']) {
  const h = harness();
  if (kind.includes('published')) h.fixture.ledger = true;
  if (kind === 'offline-published' || kind === 'unconfigured') h.fixture.client = null;
  if (kind === 'zero') h.fixture.version = 0;
  if (kind === 'cache-hit') h.fixture.cached = { version: 2, bundle: 'cached' };
  if (kind === 'version-error') h.fixture.latest = { data: null, error: new Error('Synthetic version failure') };
  if (kind === 'rows-error') h.fixture.rows = { data: null, error: new Error('Synthetic rows failure') };
  await h.run(); assert.equal(h.fixture.imports, 0, `${kind} must not import optional legacy packaging.`);
}
{
  const h = harness(); assert.equal(await h.run(), 'legacy'); assert.equal(h.fixture.imports, 1); assert.equal(h.fixture.writes.length, 1);
}
for (const current of [true, false]) {
  const h = harness(); h.fixture.current = current; h.fixture.pack = async () => null;
  assert.equal(await h.run(), null); assert.equal(h.fixture.clears, current ? 1 : 0); assert.equal(h.fixture.writes.length, 0);
}
{
  const h = harness(); h.fixture.pack = async () => { h.fixture.current = false; return { bundle: 'legacy', mirror: 'mirror' }; };
  assert.equal(await h.run(), 'legacy'); assert.equal(h.fixture.writes.length, 0, 'A superseded generation cannot stamp a legacy cache.');
}
{
  const h = harness(); h.fixture.importFailure = true; h.fixture.cached = { version: 1, bundle: 'cached' };
  assert.equal(await h.run(), 'cached'); assert.equal(h.fixture.warnings, 1); assert.equal(h.fixture.writes.length, 0);
}
console.log('PASS: pure legacy mirror parity/invalid/duplicate/mixed/staged controls and actual optional-import early-return/cache/fallback boundaries.');

// Execute the actual legacy cache reader and actual integrity verifier. Only
// browser storage and manifest production are synthetic; import is observable.
const cacheSource = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const cacheNode = cacheSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'readCachedFallbackArchitectureV3SkyPlacementBundle')!;
const cacheWriterNode = cacheSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'cacheFallbackArchitectureV3SkyPlacementBundle')!;
const cacheText = ts.createPrinter().printNode(ts.EmitHint.Unspecified, cacheNode, cacheSource).replace('async function', 'export async function')
  + '\n' + ts.createPrinter().printNode(ts.EmitHint.Unspecified, cacheWriterNode, cacheSource).replace('function', 'export function');
const verifier = fs.readFileSync('apps/web/src/services/fallbackArchitectureV3MirrorValidation.ts', 'utf8')
  .replace(/import[\s\S]*?from "[^"\n]+";/, 'const fallbackArchitectureV3BundledManifestSummary = fixture.summary; const fallbackArchitectureV3ManifestForBundle = () => fixture.manifest;');
const cacheBuilt = await build({ stdin: { contents: cacheText, loader: 'ts', resolveDir: process.cwd() }, bundle: true,
  platform: 'node', format: 'cjs', write: false, plugins: [{ name: 'actual-legacy-verifier', setup(builder) {
    builder.onResolve({ filter: /fallbackArchitectureV3MirrorValidation/ }, () => ({ path: 'verifier', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'ts', contents:
      `fixture.imports++; if (fixture.importFailure) throw new Error('Synthetic verifier import failure'); ${verifier}` }));
  } }] });
function cacheHarness() {
  const manifest = { keyManifestHash: 'synthetic-keys', keyCount: 3, contentHash: 'synthetic-copy' };
  const summary = { packageVersion: 'synthetic-version', runtimeCapability: 'synthetic-runtime', partitions: { skyPlacement: manifest } };
  const bundle = { transitLib: {}, rowsFile: {}, templatesFile: {} };
  const envelope: any = { schema: 'synthetic-schema', runtimeCapability: summary.runtimeCapability,
    bundledPackageVersion: summary.packageVersion, bundledContentHash: manifest.contentHash, bundledKeyManifestHash: manifest.keyManifestHash,
    mirrorPackageVersion: summary.packageVersion, mirrorContentHash: manifest.contentHash, mirrorKeyManifestHash: manifest.keyManifestHash,
    mirrorKeyCount: manifest.keyCount, dashboardVersion: 2, bundle };
  const fixture: any = { summary, manifest, imports: 0, clears: 0, writes: [], version: '2', raw: () => JSON.stringify(envelope) };
  const context: any = { fixture, module: { exports: {} }, fallbackArchitectureV3BundledManifestSummary: summary,
    fallbackArchitectureV3SkyPlacementBundleVersionKey: 'version', fallbackArchitectureV3SkyPlacementBundleCacheKey: 'cache',
    fallbackArchitectureV3SkyPlacementBundleCacheSchema: 'synthetic-schema', loadFallbackArchitectureV3BundledSkyPlacementManifest: async () => manifest,
    clearCachedFallbackArchitectureV3SkyPlacementBundle: () => { fixture.clears++; },
    window: { localStorage: { getItem: (key: string) => key === 'version' ? fixture.version : fixture.raw(),
      setItem: (key: string, value: string) => { if (fixture.storageBlocked) throw Error('Synthetic blocked storage'); fixture.writes.push([key, value]); } } } };
  vm.runInNewContext(cacheBuilt.outputFiles[0].text, context);
  return { fixture, envelope, run: () => context.module.exports.readCachedFallbackArchitectureV3SkyPlacementBundle(),
    write: (version: number, bundle: unknown = envelope.bundle) => context.module.exports.cacheFallbackArchitectureV3SkyPlacementBundle(version, bundle, { ...manifest, packageVersion: summary.packageVersion }),
    removeWindow: () => { delete context.window; } };
}
for (const kind of ['empty', 'zero', 'missing-raw', 'malformed', 'schema', 'runtime', 'package', 'hash', 'version', 'shape']) {
  const h = cacheHarness();
  if (kind === 'empty' || kind === 'zero') h.fixture.version = kind === 'empty' ? null : '0';
  if (kind === 'missing-raw') h.fixture.raw = () => null;
  if (kind === 'malformed') h.fixture.raw = () => '{';
  if (kind === 'schema') h.envelope.schema = 'bad';
  if (kind === 'runtime') h.envelope.runtimeCapability = 'bad';
  if (kind === 'package') h.envelope.bundledPackageVersion = 'bad';
  if (kind === 'hash') h.envelope.bundledContentHash = 'bad';
  if (kind === 'version') h.envelope.dashboardVersion = 3;
  if (kind === 'shape') delete h.envelope.bundle.rowsFile;
  assert.equal(await h.run(), null); assert.equal(h.fixture.imports, 0, `${kind} must not import the verifier.`);
  assert.equal(h.fixture.clears, ['empty', 'zero', 'missing-raw'].includes(kind) ? 0 : 1);
}
{
  const h = cacheHarness(); const result = await h.run();
  assert.equal(result.version, 2); assert.equal(result.mirror.keyManifestHash, 'synthetic-keys');
  assert.equal(h.fixture.imports, 1); assert.equal(h.fixture.clears, 0);
  // This reader has no client prerequisite: an unconfigured legacy client
  // still validates and returns its actual cache via this identical path.
}
for (const kind of ['integrity', 'import-failure']) {
  const h = cacheHarness();
  if (kind === 'integrity') h.envelope.mirrorKeyManifestHash = 'bad';
  else h.fixture.importFailure = true;
  assert.equal(await h.run(), null); assert.equal(h.fixture.imports, 1); assert.equal(h.fixture.clears, 1);
}
console.log('PASS: actual legacy cache preflight/import boundary and actual integrity validation preserve positive, invalid and failed-import clearing.');

{
  const h = cacheHarness();
  const body = 'Synthetic indivisible cached passage, including its complete ending.';
  const bundle = { transitLib: {}, templatesFile: {}, rowsFile: { hookRows: [{ body_you: body, body_they: body }] } };
  const before = JSON.stringify(bundle); h.write(2, bundle);
  assert.equal(JSON.stringify(bundle), before, 'Legacy writer cannot mutate incoming copy or bundle.');
  assert.equal(h.fixture.writes.length, 2); assert.deepEqual(h.fixture.writes[0], ['version', '2']);
  assert.equal(h.fixture.writes[1][0], 'cache');
  const saved = JSON.parse(h.fixture.writes[1][1]);
  assert.equal(saved.schema, 'synthetic-schema'); assert.equal(saved.dashboardVersion, 2);
  assert.equal(saved.runtimeCapability, h.fixture.summary.runtimeCapability);
  assert.equal(saved.bundledPackageVersion, h.fixture.summary.packageVersion);
  assert.equal(saved.bundledContentHash, h.fixture.manifest.contentHash);
  assert.equal(saved.bundledKeyManifestHash, h.fixture.manifest.keyManifestHash);
  assert.equal(saved.mirrorPackageVersion, h.fixture.summary.packageVersion);
  assert.equal(saved.mirrorContentHash, h.fixture.manifest.contentHash);
  assert.equal(saved.mirrorKeyManifestHash, h.fixture.manifest.keyManifestHash);
  assert.equal(saved.mirrorKeyCount, h.fixture.manifest.keyCount);
  assert.equal(JSON.stringify(saved.bundle), before);
}
for (const kind of ['zero', 'missing-partition', 'blocked-storage', 'no-window']) {
  const h = cacheHarness();
  if (kind === 'missing-partition') delete h.fixture.summary.partitions.skyPlacement;
  if (kind === 'blocked-storage') h.fixture.storageBlocked = true;
  if (kind === 'no-window') h.removeWindow();
  h.write(kind === 'zero' ? 0 : 2); assert.equal(h.fixture.writes.length, 0);
}
console.log('PASS actual legacy writer: exact envelope, complete byte-preserved synthetic body, zero/missing partition/blocked storage/no-window controls.');
