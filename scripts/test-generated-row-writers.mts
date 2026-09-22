import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { assertNewGeneratedInterpretation, saveGeneratedInterpretation } from '../api/_lib/content-generation.ts';
import { GeneratedRowWriteConflict } from '../api/_lib/generated-row-writes.ts';

const priorFetch = globalThis.fetch;
const environment = { SUPABASE_URL: 'https://writer-race.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic', CONTENT_GENERATION_SECRET: 'synthetic' };
Object.assign(process.env, environment);
const version = '2026-09-21T18:00:00.123456+00:00';
const original = { id: 'synthetic-row', updated_at: version, status: 'LIVE', content_key: 'sky.placement.topper.venus.scorpio.sextile.mars', body: 'Complete synthetic owner passage.' };
let stored: any = structuredClone(original), calls = 0, writes = 0;
globalThis.fetch = async (input, init) => {
  calls++;
  const url = new URL(String(input));
  assert.equal(url.origin, environment.SUPABASE_URL, 'This test must never contact a provider.');
  assert.equal(url.pathname, '/rest/v1/generated_interpretations');
  if ((init?.method ?? 'GET') === 'GET') return Response.json(stored ? [{ id: stored.id }] : []);
  writes++;
  const payload = JSON.parse(String(init?.body));
  const prefer = new Headers(init?.headers).get('prefer') ?? '';
  assert(prefer.includes('return=representation'));
  if (init?.method === 'PATCH') {
    assert.equal(url.searchParams.get('id'), `eq.${original.id}`);
    assert.equal(url.searchParams.get('updated_at'), `eq.${version}`, 'The exact fetched baseline must reach storage.');
    if (!stored || stored.updated_at !== version) return Response.json([]);
    stored = { ...stored, ...payload }; return Response.json([stored]);
  }
  assert.equal(init?.method, 'POST');
  assert(prefer.includes('ignore-duplicates'), 'Background inserts must not merge over owner writing.');
  if (stored) return Response.json([]);
  stored = { ...payload, id: 'synthetic-created', updated_at: version };return Response.json([stored]);
};
const outfile = path.resolve(`api/cron/.generated-writer-test-${process.pid}.mjs`);
try {
  const input: any = { contentKey: original.content_key, surface: 'sky', mode: 'feed', targetDate: null, facts: {}, provider: 'openai' };
  const generated: any = { body: 'Synthetic generated candidate.', headline: 'Fixture', model: 'synthetic' };
  await assert.rejects(assertNewGeneratedInterpretation(input), GeneratedRowWriteConflict);
  assert.equal(writes, 0, 'Existing writing must stop at the read-only preflight.');
  const { default: handler } = await import('../api/generate-content.ts');
  Object.assign(process.env, environment);
  let responseBody: any;
  const response: any = { statusCode: 200, setHeader() {}, end(value: string) { responseBody = JSON.parse(value); } };
  const before = calls;
  await handler({ method: 'POST', headers: { authorization: 'Bearer synthetic' }, body: input } as any, response);
  assert.equal(response.statusCode, 409); assert.equal(responseBody.ok, false);
  assert.equal(calls, before + 1, 'The actual handler must stop before any provider call for existing writing.');
  assert.equal(writes, 0);
  stored = null; await assertNewGeneratedInterpretation(input);
  stored = structuredClone(original); // An owner creates the row while generation is in progress.
  await assert.rejects(saveGeneratedInterpretation(input, generated), GeneratedRowWriteConflict);
  assert.deepEqual(stored, original);
  stored = null; assert.equal((await saveGeneratedInterpretation(input, generated))[0].body, generated.body);
  assert.equal(stored.status, 'DRAFT'); assert.equal(stored.sections.ownerApproved, false);

  // Export the actual private storage callers from an isolated build; never substitute their write logic.
  await build({ stdin: { contents: await fs.readFile('api/cron/generate-sky-placements.ts', 'utf8') + '\nexport { savePlacementCard, savePlacementTopper, deactivateTopper, reactivateTopperDraft };', resolveDir: path.resolve('api/cron'), loader: 'ts' },
    outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
    external: ['../../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js', '../../packages/astro-knowledge/scripts/editorial-judge-runtime.js', '../../src/astro-writing/productionPreCallGate.cjs', '../../src/astro-writing/skyPlacementCachePolicy.cjs'],
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' } });
  const cron = await import(pathToFileURL(outfile).href);
  const contact = { planet: 'venus', sign: 'scorpio', aspect: 'sextile', other: 'mars', otherSign: 'virgo', orb: 1 };
  const routed = { result: { facts: { ...contact, placementSource: 'data/placements/sign/venus-scorpio.json' }, text: generated.body, status: 'clean', lint: { score: 3, fails: 0 }, provider: 'synthetic', model: 'synthetic' }, attempts: 1, judgePasses: 1 };
  const actions = [
    () => cron.savePlacementCard(contact, original, routed),
    () => cron.savePlacementTopper(contact, original, original, routed),
    () => cron.deactivateTopper(original, 'Synthetic expired contact'),
    () => cron.reactivateTopperDraft(original, 'SKY_PLACEMENT_TOPPER_VOICE_REVIEW_REQUIRED')
  ];
  for (const action of actions) {
    stored = { ...original, body: 'Newer synthetic owner passage.', updated_at: '2026-09-21T18:00:00.123457+00:00' };
    const newer = structuredClone(stored);
    await assert.rejects(action(), /already exists or changed/);
    assert.deepEqual(stored, newer, 'A cron race must preserve the winning owner edit.');
    stored = structuredClone(original); await action(); assert.equal(stored.status, 'DRAFT');
  }
  stored = structuredClone(original);
  await assert.rejects(cron.savePlacementTopper(contact, original, null, routed), /already exists or changed/);
  assert.deepEqual(stored, original);
  assert(calls > 0);
  console.log('Actual generation storage and placement writers preserve owner edits, reject empty writes, and insert drafts without replacing rows.');
} finally { globalThis.fetch = priorFetch; await fs.unlink(outfile).catch(() => {}); }
