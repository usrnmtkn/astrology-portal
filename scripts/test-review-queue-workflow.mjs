import assert from 'node:assert/strict';
import { createWorkflowStore, baseline, source, original, importedComposite } from '../tests/helpers/sky-review-workflow-api.mjs';
import { skyWritingIssues, reviewWorkBucket } from '../apps/web/src/content/contentReviewReadiness.ts';
const store = await createWorkflowStore();
let row = store.rows.get(baseline.id);
assert.equal(reviewWorkBucket(row), 'changes');
assert.equal(reviewWorkBucket(source), 'source');
assert.equal((await store.write({ action: 'recheck', contentKey: row.content_key, expectedUpdatedAt: row.updated_at }, 'wrong')).status, 401);
assert.equal((await store.write({ action: 'oops', contentKey: row.content_key })).status, 400);
assert.equal((await store.write({ action: 'generate', contentKey: row.content_key, expectedUpdatedAt: row.updated_at })).status, 409);
let result = await store.write({ action: 'recheck', contentKey: row.content_key, expectedUpdatedAt: row.updated_at });
assert.equal(result.status, 200, JSON.stringify(result));
row = result.payload.rows[0];
assert.equal(row.body, original);
assert.deepEqual(skyWritingIssues(row), []);
assert.equal(reviewWorkBucket(row), 'ready');
result = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: 'approve-and-schedule' });
assert.equal(result.status, 200, JSON.stringify(result));
row = result.payload.rows[0];
assert.equal(row.status, 'LIVE');
assert.equal(row.body, original);
const { resolveSkyAspectGeneratedContent } = await import('../apps/web/src/services/skyAspectContent.ts');
const live = { ...row, contentKey: row.content_key, sourceSnapshot: row.source_snapshot, judgeScore: row.judge_score, judgeGate: row.judge_gate };
const reader = resolveSkyAspectGeneratedContent({ generatedContent: new Map([[row.content_key, live]]), first: 'chiron', second: 'nodes', aspect: 'sextile', firstSign: 'taurus', secondSign: 'aquarius' });
assert.equal(reader?.body, original, 'Actual reader selector must receive the exact approved body');
const { isReaderServableGeneratedContentRow, isGeneratedContentReaderBoundaryAllowed } = await import('../apps/web/src/content/generatedContentEligibility.ts');
assert.equal(isReaderServableGeneratedContentRow(row), true, 'Published row must pass reader hydration');
assert.equal(isGeneratedContentReaderBoundaryAllowed(row), true, 'Published row must pass reader boundary');
const { contentLiveStatuses } = await import('../api/_lib/content-live-status.ts');
assert.equal(contentLiveStatuses([row], [row])[0].live, true, 'Studio live status must agree with reader eligibility');
// A new edit invalidates both browser readiness and server authorization for the old check.
result = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, body: original + ' Changed.' });
assert.equal(result.status, 200, JSON.stringify(result));
row = result.payload.rows[0];
assert.equal(row.source_snapshot.studioWritingCheck, null);
assert.ok(skyWritingIssues(row).length);
assert.equal((await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: 'approve-and-schedule' })).status, 409);
// Existing owner text is never replaced by the generator or a stale model response.
store.rows.set(baseline.id, structuredClone(baseline));
row = store.rows.get(baseline.id);
store.race(() => store.rows.set(row.id, { ...store.rows.get(row.id), body: 'Newer owner copy.', updated_at: '2099-01-01T00:00:00Z' }));
result = await store.write({ action: 'recheck', contentKey: row.content_key, expectedUpdatedAt: row.updated_at });
assert.equal(result.status, 409);
assert.equal(store.rows.get(row.id).body, 'Newer owner copy.');
const missing = 'sky.aspect.mercury.trine.pluto.virgo.aquarius';
result = await store.write({ action: 'generate', contentKey: missing });
assert.equal(result.status, 200, JSON.stringify(result));
assert.equal(result.payload.rows[0].body, original);
assert.equal(result.payload.rows[0].source_snapshot.studioWritingMemory.schema, 'tldr-sky-writing-memory/v1');
const generated = result.payload.rows[0];
const recheckedMemory = await store.write({ action: 'recheck', contentKey: generated.content_key, expectedUpdatedAt: generated.updated_at });
assert.equal(recheckedMemory.status, 200);
assert.deepEqual(recheckedMemory.payload.rows[0].source_snapshot.studioWritingMemory, generated.source_snapshot.studioWritingMemory);
assert.equal((await store.write({ action: 'generate', contentKey: missing })).status, 409);
// Source edits retain history and remove approval until the new revision is explicitly reviewed.
result = await store.invoke('PATCH', { id: source.id, expectedUpdatedAt: source.updated_at, body: 'Fixture source revised.' });
assert.equal(result.status, 200, JSON.stringify(result));
row = result.payload.rows[0];
assert.equal(row.status, 'DRAFT');
assert.equal(row.lane, 'reference');
assert.equal(row.source_snapshot.studioRevisionHistory[0].body, source.body);
result = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, status: 'REVIEWED' });
assert.equal(result.status, 200);
row = result.payload.rows[0];
const { approvedStudioPairSources } = await import('../api/_lib/sky-studio-sources.ts');
const approved = await approvedStudioPairSources();
assert.equal(approved.get('sun-chiron').value.sourceText, 'Fixture source revised.');
result = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, status: 'LIVE', lane: 'serving' });
assert.equal(result.status, 409);
store.fail(true);
const failed = 'sky.aspect.moon.square.uranus.virgo.gemini';
result = await store.write({ action: 'generate', contentKey: failed });
assert.equal(result.status, 500);
const placeholder = [...store.rows.values()].find(row => row.content_key === failed);
assert.equal(placeholder.source_snapshot.studioWritingOperation, null);
assert.equal(placeholder.body, '');
store.fail(false);
result = await store.write({ action: 'generate', contentKey: failed, expectedUpdatedAt: placeholder.updated_at });
assert.equal(result.status, 200);
console.log('Review Queue actual-handler workflow passed: checks, approval, generation, source revisions, stale/concurrent edits, failure recovery.');
// Recheck uses the real deterministic checker, not the test writer or any model gate.
const { runStudioSkyWriting } = await import('../api/_lib/sky-studio-writing.ts');
const checked = await runStudioSkyWriting(baseline.content_key, 'recheck', original);
assert.equal(checked.text, original);
assert.equal(checked.judge, null);
console.log('Real saved-text recheck preserves bytes and makes zero model calls.');
// Approved saved source wording reaches the real writer prompt, with provenance.
const generator = (await import('../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js')).default;
const pair = approved.get('sun-chiron');
const args = { a: 'sun', b: 'chiron', aspect: 'trine', signA: 'leo', signB: 'taurus' };
assert.ok(generator.buildPrompt(args, { pairSourceOverride: pair }).includes('Fixture source revised.'));
assert.equal(generator.normalizeCardArgs(args, { pairSourceOverride: pair }).pairSourceRevision.bodyHash, pair.revision.bodyHash);
// Personal You Transits cannot be sent through collective Sky generation.
assert.equal((await store.write({ action: 'generate', contentKey: 'transit/mars/square/natal-venus' })).status, 400);
assert.deepEqual(skyWritingIssues({ content_key: 'transit/mars/square/natal-venus', block_type: 'transit_aspect', body: 'Owner personal writing.' }), []);
// Placement checks never falsely report package candidates as Live.
result = await store.write({ action: 'generate', contentKey: 'sky.placement.base.jupiter.leo' });
assert.equal(result.status, 200, JSON.stringify(result));
row = result.payload.rows[0];
result = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: 'approve-and-schedule' });
assert.equal(result.status, 200, JSON.stringify(result));
assert.equal(result.payload.rows[0].status, 'REVIEWED');
assert.equal(result.payload.rows[0].lane, 'reference');

// Competing requests for one saved version may start only one writer operation.
store.rows.set(baseline.id, structuredClone(baseline));
const callsBefore = store.calls;
const concurrent = await Promise.all([1, 2].map(() => store.write({action: 'recheck', contentKey: baseline.content_key, expectedUpdatedAt: baseline.updated_at})));
assert.deepEqual(concurrent.map(value => value.status).sort(), [200, 409]);
assert.equal(store.calls - callsBefore, 1);

// Reject a reversed identity before creating an unreachable duplicate reader key.
const countBeforeInvalidIdentity = store.rows.size;
assert.equal((await store.write({action: 'generate', contentKey: 'sky.aspect.pluto.trine.mercury.aquarius.virgo'})).status, 400);
assert.equal(store.rows.size, countBeforeInvalidIdentity);

// Historical auto-publish scores do not enable the current owner-action endpoint.
assert.ok(skyWritingIssues({...baseline, judge_gate:'auto-publish', judge_score:3, source_snapshot:{skyAspectVoiceLint:{score:3,fails:0}}}).length);

// Imported Composite authoring notes are not a publishable reader article.
assert.equal(reviewWorkBucket(importedComposite), 'source');
assert.equal((await store.invoke('PATCH', {id: importedComposite.id, expectedUpdatedAt: importedComposite.updated_at, status:'LIVE'})).status, 409);
