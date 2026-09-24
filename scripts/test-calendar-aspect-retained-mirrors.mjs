// Regression for clean Calendar edits rejected by retained pre-edit reader mirrors.
// The actual handler runs against isolated fixture storage; no production writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';

const source = JSON.parse(readFileSync(new URL('../packages/astro-knowledge/data/transits/moon-trine-mars.json', import.meta.url), 'utf8'));
const oldBody = source.readerCopy.body;
const copy = "Under the Moon trine Mars, you are armed with the audacity to ask for exactly what you want. Instead of letting minor frustrations simmer into arguments, speak up now. Instead of hoping someone notices you’re carrying too much, ask for a lifeline. You don’t need to wait until you're angry to set a firm boundary, and you don’t have to reach the point of burnout to deserve support. Channel this assertive energy to initiate the conversation you’ve been avoiding, or to dive into a passion project that excites you. Just remember: having extra energy isn't an invitation for others to drain it.";
assert.match(oldBody, /\bengine\b/iu);
assert.doesNotMatch(copy, /\bengine\b/iu);
const key = 'sky.aspect.moon.trine.mars';
const record = {
  contentKey: key, Headline: 'Moon Trine Mars', Summary: source.readerCopy.summary,
  Body: oldBody, BodyA: 'moon', BodyB: 'mars', AspectType: 'trine',
  content_role: 'full_copy', review_status: 'approved', surface: 'sky',
  render_policy: 'content-studio-exact-sky-aspect-v1',
  source_package: 'exact-sky-aspect-content-studio-v1', studio_content_type: 'aspect',
  studio_editable_fields: [{ path: 'Summary', label: 'Summary' }, { path: 'Body', label: 'Body' }],
  studio_version_status: 'approved-serving-baseline', owner_approved: true, serving_enabled: true
};
const seed = {
  id: 'retained-mirror-moon-trine-mars', content_key: key, surface: 'sky', mode: 'in_depth',
  status: 'LIVE', lane: 'serving', review_state: null, target_date: null,
  event_type: 'sky-aspect-owner-approved-exact', block_type: 'fallback_hook',
  provider: 'tldrastro-fallback-architecture-v3', headline: record.Headline,
  summary: record.Summary, body: oldBody,
  sections: { packageRecord: record, packageOriginalRecord: structuredClone(record), body_you: oldBody, body_they: oldBody },
  facts: { fallbackArchitectureV3: true, review_status: 'approved', readerServing: true, exactSkyAspect: true },
  source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', review_status: 'approved', content_role: 'full_copy', contentStudioExactAspect: true, exactSkyAspectIdentity: { a: 'moon', b: 'mars', aspect: 'trine' } },
  updated_at: '2026-09-02T02:13:00.543535+00:00', created_at: '2026-09-01T00:00:00.000Z', flags: []
};
const bundle = join(tmpdir(), `calendar-mirror-reader-${process.pid}.mjs`);
await build({ stdin: { contents: "export { loadLiveGeneratedContentForKeys } from './apps/web/src/services/generatedContent.ts';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, outfile: bundle, platform: 'node', format: 'esm', define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://calendar-api.invalid', VITE_SUPABASE_ANON_KEY: 'calendar-api-fixture-key' }) }, logLevel: 'silent' });
const reader = await import(pathToFileURL(bundle).href);

for (const state of ['DRAFT', 'LIVE']) {
  const baseline = structuredClone(seed);
  if (state === 'DRAFT') {
    baseline.status = 'DRAFT'; baseline.lane = 'reference'; baseline.review_state = 'needs-review';
    baseline.sections.packageDraft = { Body: copy };
  }
  const store = await createApiStore([baseline]);
  const { rows, invoke } = store;
  try {
    const saved = await invoke('PATCH', { id: baseline.id, expectedUpdatedAt: baseline.updated_at, sections: { packageDraft: { Body: copy } }, reviewStatus: 'needs_review' });
    assert.equal(saved.status, 200, `${state} clean revision: ${JSON.stringify(saved.payload)}`);
    const draft = saved.payload.rows[0];
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.body, oldBody, 'Saving must retain the original reader mirror.');
    assert.equal(draft.sections.packageDraft.Body, copy);
    assert.deepEqual(draft.sections.packageOriginalRecord, record);
    if (state === 'LIVE') {
      assert.notEqual(draft.id, baseline.id);
      assert.equal(rows.get(baseline.id).status, 'LIVE');
      assert.equal(rows.get(baseline.id).body, oldBody);
    }
    const reopened = await invoke('GET', undefined, `/api/admin/generated-content?id=${draft.id}`);
    assert.equal(reopened.payload.rows[0].sections.packageDraft.Body, copy);
    for (const [proposal, expected] of [
      [{ Body: `${copy} Engine.` }, /packageDraft\.Body contains banned word "engine"/u],
      [{ Body: copy, Summary: 'An ENGINE.' }, /packageDraft\.Summary contains banned word "engine"/u],
      [{ Body: `${copy} —` }, /packageDraft\.Body contains an em dash/u],
      [{ Body: `${copy} {{unlicensedVariable}}` }, /unresolved placeholder/u]
    ]) {
      const before = structuredClone([...rows]);
      const rejected = await invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, sections: { packageDraft: proposal }, reviewStatus: 'needs_review' });
      assert.equal(rejected.status, 400, JSON.stringify(rejected.payload));
      assert.match(rejected.payload.error, expected);
      assert.deepEqual([...rows], before, 'Rejected edits must not mutate stored copy.');
    }
    const stale = await invoke('PATCH', { id: draft.id, expectedUpdatedAt: '2026-09-01T00:00:00.000Z', sections: { packageDraft: { Body: copy } } });
    assert.equal(stale.status, 409);
    const unauthorized = await invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' }, undefined, 'invalid');
    assert.equal(unauthorized.status, 401);
    const published = await invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(published.status, 200, JSON.stringify(published.payload));
    const live = published.payload.rows[0];
    assert.equal(live.status, 'LIVE');
    assert.equal(live.body, copy);
    assert.equal(live.sections.packageRecord.Body, copy);
    assert.equal(live.sections.body_you, copy);
    assert.equal(live.sections.body_they, copy);
    assert.deepEqual(live.sections.packageOriginalRecord, record);
    assert.equal(live.sections.packageDraft, undefined);
    assert.equal((await reader.loadLiveGeneratedContentForKeys([key])).get(key)?.body, copy, 'The actual reader must receive the complete submitted paragraph.');
  } finally { store.close(); }
}

// A previously persisted bad proposal still cannot pass the publication gate.
const bad = structuredClone(seed);
bad.status = 'DRAFT'; bad.lane = 'reference'; bad.review_state = 'needs-review';
bad.sections.packageDraft = { Body: 'The engine.' };
const blockedStore = await createApiStore([bad]);
try {
  const before = structuredClone([...blockedStore.rows]);
  const result = await blockedStore.invoke('PATCH', { id: bad.id, expectedUpdatedAt: bad.updated_at, ownerAction: 'approve-package-revision' });
  assert.equal(result.status, 400, JSON.stringify(result.payload));
  assert.match(result.payload.error, /contains banned word "engine"/u);
  assert.deepEqual([...blockedStore.rows], before);
} finally { blockedStore.close(); }
console.log('PASS: Calendar retained-mirror regression: DRAFT and LIVE saves, reopen, exact publication/reader copy, field-specific HTTP 400 errors, original preservation, and stale/unauthorized/publication guards.');
