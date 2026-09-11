import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { buildSkyWritingMemory } from '../api/_lib/sky-writing-memory.mjs';
import { buildMemoryIndex } from '../api/_lib/agent-memory.mjs';

const sourcePath = 'data/writing/owner-corrections.jsonl';
const config = { authorityIndex: 'authority.md', sources: [{ path: sourcePath, kind: 'correction' }],
  supersedes: [], qualifications: [], requiredContext: [] };
const row = (bad, extra = {}) => ({ bad, corrected: `Replace ${bad}`, family: 'sky-placement', ...extra });
const rows = [row('Fixture Sun Leo wording', { rejected_at: '2026-09-01' }),
  row('Fixture unrelated wording'), row('Fixture natal wording', { family: 'natal-placement' }),
  row('Fixture old wording', { status: 'superseded' }),
  row('Fixture conflict', { corrected: 'First replacement' }), row('Fixture conflict', { corrected: 'Other replacement' }),
  row('Fixture repeated wording'), row('Fixture repeated wording'),
  row('Fixture unknown date', { rejected_at: 'not-a-date' })];
const files = { 'config/agent-memory-sources-v1.json': JSON.stringify(config),
  [sourcePath]: rows.map(JSON.stringify).join('\n'), 'authority.md': '' };
const readSource = name => { if (!(name in files)) throw new Error(`Missing fixture source ${name}`); return files[name]; };
const identity = { kind: 'placement', args: { planet: 'sun', sign: 'leo' } };
const packet = buildSkyWritingMemory(identity, { readSource, revision: 'a'.repeat(40) });
assert.equal(packet.receipt.selected.length, 4);
assert.equal(packet.receipt.selected[0].line, 1);
assert(!packet.prompt.includes('Fixture natal wording'));
assert(!packet.prompt.includes('Fixture old wording'));
assert(!packet.prompt.includes('First replacement'));
assert.equal(packet.receipt.excluded.filter(item => item.reason === 'conflicting_corrections').length, 2);
assert.equal(packet.receipt.excluded.filter(item => item.reason === 'duplicate').length, 1);
assert.match(packet.prompt, /Only the owner can approve exact prose/);
assert(!JSON.stringify(packet.receipt).includes('Fixture Sun Leo wording'), 'Receipt must not leak correction bodies.');
const graph = buildMemoryIndex({ readSource, revision: 'a'.repeat(40) });
for (const ref of packet.receipt.selected) {
  const match = graph.records.find(record => record.id === ref.memoryId);
  assert.equal(match.path, ref.path); assert.equal(match.line, ref.line);
  assert.equal(match.bodySha256, ref.bodySha256);
  assert.equal(graph.sources.find(source => source.path === ref.path).sha256, ref.sourceSha256);
}
const changed = buildSkyWritingMemory(identity, { readSource: name => name === sourcePath
  ? files[name].replace('Replace Fixture Sun Leo wording', 'Different replacement') : readSource(name) });
assert.notEqual(changed.receipt.promptSha256, packet.receipt.promptSha256);
assert.throws(() => buildSkyWritingMemory(identity, { readSource: () => { throw new Error('missing'); } }), /missing/);
assert.throws(() => buildSkyWritingMemory({ kind: 'natal', args: {} }, { readSource }), /Unsupported/);
const superseded = buildSkyWritingMemory(identity, { readSource: name => name === 'config/agent-memory-sources-v1.json'
  ? JSON.stringify({ ...config, supersedes: [{ old: sourcePath, new: 'current.md' }] }) : readSource(name) });
assert.equal(superseded.receipt.selected.length, 0);
const pending = buildSkyWritingMemory(identity, { readSource: name => name === sourcePath
  ? JSON.stringify(row('Fixture unapproved correction', { status: 'needs_review' })) : readSource(name) });
assert.equal(pending.receipt.selected.length, 0);
const deployment = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const pattern = deployment.functions['api/admin/sky-draft-writing.ts'].includeFiles;
assert(pattern.length <= 256);
const packaged = new Set(fs.globSync(pattern));
for (const file of fs.globSync(deployment.functions['api/**/*.ts'].includeFiles)) {
  assert(packaged.has(file), `Studio writing lost an existing runtime asset: ${file}`);
}
const realConfig = JSON.parse(fs.readFileSync('config/agent-memory-sources-v1.json', 'utf8'));
for (const spec of realConfig.sources.filter(item => item.kind === 'correction')) {
  assert(packaged.has(spec.path), `Correction source is not deployed: ${spec.path}`);
}

// Exercise the real service and memory loader; only the provider-facing kernel and generator are fixtures.
const outfile = `${process.cwd()}/api/_lib/.sky-memory-test-${process.pid}.mjs`;
globalThis.__skyMemoryPrompts = [];
try {
  await build({ entryPoints: ['api/_lib/sky-studio-writing.ts'], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
    external: ['../../packages/astro-knowledge/scripts/lint-sky-voice.js'],
    plugins: [{ name: 'isolated-sky-provider', setup(builder) {
      builder.onResolve({ filter: /cron\/generate-sky-(?:aspects|placements)\.js$/ }, () => ({ path: 'kernel', namespace: 'fixture' }));
      builder.onResolve({ filter: /generate-sky-aspect-cards\.js$/ }, () => ({ path: 'generator', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: path === 'kernel'
        ? `const kernel = () => ({ generateFn: async (prompt) => { globalThis.__skyMemoryPrompts.push(prompt); return 'Fixture complete generated draft.'; }, generationMetadata: {} }); export const placementKernel = kernel; export const skyAspectKernel = kernel;`
        : `const generate = async (_args, options) => ({ text: await options.generateFn('Fixture original meaning and approved voice evidence'), lint: null }); export default {generateCard: generate, generatePlacementCard: generate};`, loader: 'js' }));
    } }] });
  const { runStudioSkyWriting } = await import(pathToFileURL(outfile).href);
  const result = await runStudioSkyWriting('sky.placement.base.sun.leo', 'generate', '');
  assert(result.memoryReceipt.selected.length > 0);
  assert.equal(globalThis.__skyMemoryPrompts.length, 1);
  assert.match(globalThis.__skyMemoryPrompts[0], /^Fixture original meaning and approved voice evidence/);
  assert.match(globalThis.__skyMemoryPrompts[0], /TLDR ASTRO MEMORY/);
  assert.match(globalThis.__skyMemoryPrompts[0], /Effective TLDR Astro writing rules/);
  const rechecked = await runStudioSkyWriting('sky.placement.base.sun.leo', 'recheck', 'Fixture original text.');
  assert.equal(rechecked.text, 'Fixture original text.');
  assert.equal(globalThis.__skyMemoryPrompts.length, 1, 'Recheck must never generate.');
  assert.equal(rechecked.memoryReceipt, undefined);
  // Live Studio corrections reach the real service; only model output is synthetic.
  const live = { id: '11111111-1111-4111-8111-111111111111', source_row_id: '22222222-2222-4222-8222-222222222222',
    content_key: 'sky.placement.base.sun.leo', family: 'sky-placement', before_text: 'Synthetic former Studio text.',
    after_text: 'Synthetic approved Studio replacement.', before_version: '2026-09-10T12:00:00Z', after_version: '2026-09-10T12:01:00Z',
    status: 'active', scope: 'passage', reason: 'Synthetic passage-specific correction.', version: 2,
    created_at: '2026-09-10T12:01:00Z', updated_at: '2026-09-10T12:02:00Z' };
  Object.assign(process.env, { STUDIO_MEMORY_FEEDBACK_ENABLED: 'true', SUPABASE_URL: 'https://studio-memory.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic' });
  globalThis.fetch = async input => {
    assert.equal(String(input), 'https://studio-memory.invalid/rest/v1/rpc/studio_memory_active_snapshot');
    return Response.json([{ snapshot: { rows: [live] } }]);
  };
  const withFeedback = await runStudioSkyWriting(live.content_key, 'generate', '');
  assert.match(globalThis.__skyMemoryPrompts.at(-1), /Synthetic approved Studio replacement/);
  assert.equal(withFeedback.memoryReceipt.studioFeedback.selected[0].version, 2);
  assert.equal(withFeedback.memoryReceipt.selected.filter(row => row.memoryId.startsWith('studio-')).length, 1);
  assert(!JSON.stringify(withFeedback.memoryReceipt).includes(live.after_text));
  const count = globalThis.__skyMemoryPrompts.length;
  globalThis.fetch = async () => { throw new Error('Synthetic outage'); };
  await assert.rejects(runStudioSkyWriting(live.content_key, 'generate', ''), /Storage request failed/);
  await runStudioSkyWriting(live.content_key, 'recheck', 'Synthetic saved text.');
  assert.equal(globalThis.__skyMemoryPrompts.length, count, 'Outage and recheck must not call a model');
} finally { fs.rmSync(outfile, { force: true }); delete globalThis.__skyMemoryPrompts; delete process.env.STUDIO_MEMORY_FEEDBACK_ENABLED; }
console.log('Sky writing memory passed: scoped corrections, graph provenance, conflict exclusions, freshness, real service prompt delivery, and model-free recheck.');
