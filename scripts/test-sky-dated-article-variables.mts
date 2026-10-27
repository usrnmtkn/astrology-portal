import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skyPlacementSourceFixture } from '../tests/helpers/sky-placement-source-fixture.mts';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { skyArticleEditableFields, reviseSkyArticleEdition } from '../apps/web/src/content/skyArticleTemplateCompiler';
import { projectReaderRow } from '../apps/web/src/content/readerRowProjection.mjs';
import { skyArticleVariableDraftForFields, resolveSkyArticleVariableFields, skyArticleVariableDraftRecord } from '../src/shared/skyArticleVariableDraft';
import { skyDatedArticleChanges } from '../apps/admin/src/skyDatedArticleDraft';

test('dated article archive and draft restoration preserve complete copy and reject stale versions', async () => {
  const { active } = await skyPlacementSourceFixture('sun', 'libra');
  const store = await createApiStore([active], { uuidIds: true });
  try {
    const before = structuredClone(store.rows.get(active.id));
    const request = { id: active.id, expectedUpdatedAt: active.updated_at, status: 'ARCHIVED' };
    assert.equal((await store.invoke('PATCH', request, undefined, 'wrong')).status, 401);
    assert.equal((await store.invoke('PATCH', { ...request, expectedUpdatedAt: '2026-09-01T00:00:00Z' })).status, 409);
    assert.deepEqual(store.rows.get(active.id), before);
    const result = await store.invoke('PATCH', request);
    assert.equal(result.status, 200, JSON.stringify(result.payload));
    const archived = result.payload.rows[0];
    assert.equal(archived.status, 'ARCHIVED');
    assert.deepEqual(archived.sections, before.sections); assert.equal(archived.body, before.body);
    for (const body of [{ ids: [active.id] }, { keys: [active.content_key] }]) {
      const read = await store.invoke('POST', body, '/api/content-reader');
      assert.equal(read.status, 200); assert.deepEqual(read.payload.rows, []);
    }
    const restored = await store.invoke('PATCH', { id: active.id, expectedUpdatedAt: archived.updated_at, status: 'DRAFT' });
    assert.equal(restored.status, 200, JSON.stringify(restored.payload));
    assert.equal(restored.payload.rows[0].status, 'DRAFT');
    assert.deepEqual(restored.payload.rows[0].sections, before.sections);
    assert.deepEqual((await store.invoke('POST', { keys: [active.content_key] }, '/api/content-reader')).payload.rows, []);
  } finally { await store.close(); }
});

test('dated variables preserve complete source text and companion passages while compiling reader strings', async () => {
  const { edition } = await skyPlacementSourceFixture('sun', 'libra');
  const original = structuredClone(edition);
  const fields = { ...skyArticleEditableFields(edition), headline: '{{planetTitle}} in {{signTitle}}', body: 'Complete opening. {{savedPassage}} Complete final sentence.' };
  const values = { planetTitle: { text: 'Sun', kind: 'Calculated fact', source: 'calculated#planetTitle' }, signTitle: { text: 'Libra', kind: 'Calculated fact', source: 'calculated#signTitle' },
    savedPassage: { text: 'Synthetic complete first sentence.\n\nSynthetic complete final sentence.', kind: 'Saved writing', source: 'fixture/passage#body', version: 'fixture-version' } };
  const draft = skyArticleVariableDraftForFields(fields, values);
  const compiled = await reviseSkyArticleEdition(edition, fields, draft);
  assert.equal(compiled.headline, 'Sun in Libra');
  assert.equal(compiled.body, 'Complete opening. Synthetic complete first sentence.\n\nSynthetic complete final sentence. Complete final sentence.');
  assert.deepEqual(compiled.housePassages, original.housePassages);
  assert.deepEqual(compiled.aspectPassages, original.aspectPassages);
  assert.deepEqual(edition, original);
  assert.match(draft.templates.body, /\{\{savedPassage\}\}/);
  assert.ok(skyDatedArticleChanges(edition, fields, draft).some(change => change.fieldId === 'variableSources'));
  assert.throws(() => resolveSkyArticleVariableFields({ ...fields, body: '{{unknown}}' }, draft), /needs a complete value/);
  assert.throws(() => resolveSkyArticleVariableFields({ ...fields, body: '{{#signTitle}}' }, draft), /complete named variables/);
  assert.equal(skyArticleVariableDraftRecord({ ...draft, values: { constructor: values.savedPassage } }), null);
});

test('actual article API saves, reloads and publishes matching source snapshots, rejects mismatches and stale writes, and keeps tokens private', async () => {
  const { edition, active } = await skyPlacementSourceFixture('sun', 'libra');
  const store = await createApiStore([active], { uuidIds: true });
  try {
    const fields = { ...skyArticleEditableFields(edition), body: 'Synthetic opening. {{savedPassage}} Synthetic ending.' };
    const draft = skyArticleVariableDraftForFields(fields, { savedPassage: { text: 'Complete captured first sentence. Complete captured final sentence.', kind: 'Saved writing', source: 'fixture/source#body', version: 'fixture-version' } });
    const revised = await reviseSkyArticleEdition(edition, fields, draft);
    const wrong = structuredClone(draft); wrong.values.savedPassage.text = 'A different value.';
    let result = await store.invoke('PATCH', { id: active.id, expectedUpdatedAt: active.updated_at, ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised, skyArticleVariableDraft: wrong } });
    assert.equal(result.status, 400); assert.match(result.payload.error, /do not match/);
    result = await store.invoke('PATCH', { id: active.id, expectedUpdatedAt: active.updated_at, ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised, skyArticleVariableDraft: draft } });
    assert.equal(result.status, 200, JSON.stringify(result.payload));
    const saved = result.payload.rows[0];
    assert.deepEqual(saved.sections.skyArticleVariableDraft, draft);
    assert.equal(store.rows.get(active.id).body, active.body, 'Saving cannot change the live article.');
    const reloaded = await store.invoke('GET', undefined, `/api/admin/generated-content?id=${saved.id}`);
    assert.deepEqual(reloaded.payload.rows[0].sections.skyArticleVariableDraft, draft);
    result = await store.invoke('PATCH', { id: saved.id, expectedUpdatedAt: '2000-01-01T00:00:00Z', ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised, skyArticleVariableDraft: draft } });
    assert.equal(result.status, 409);
    result = await store.invoke('PATCH', { id: saved.id, expectedUpdatedAt: saved.updated_at, ownerAction: 'publish-sky-article-edition-revision' });
    assert.equal(result.status, 200, JSON.stringify(result.payload));
    const published = store.rows.get(active.id);
    assert.equal(published.body, revised.body); assert.deepEqual(published.sections.skyArticleVariableDraft, draft);
    const reader = projectReaderRow(published);
    assert.equal(reader.body, revised.body);
    assert.equal(reader.sections.skyArticleVariableDraft, undefined);
    assert.equal(JSON.stringify(reader).includes('{{savedPassage}}'), false);
    assert.equal(skyDatedArticleChanges(revised, fields, draft, draft).length, 0);
  } finally { store.close(); }
});

test('variable-only revisions preserve reader wording and remain explicit publishable source changes', async () => {
  const { edition, active } = await skyPlacementSourceFixture('sun', 'libra');
  const store = await createApiStore([active], { uuidIds: true });
  try {
    const fields = { ...skyArticleEditableFields(edition), body: '{{savedWholeArticle}}' };
    const draft = skyArticleVariableDraftForFields(fields, { savedWholeArticle: { text: edition.body, kind: 'Saved writing', source: edition.contentKey + '#body', version: edition.compiledHash } });
    const revised = await reviseSkyArticleEdition(edition, fields, draft);
    assert.equal(revised.compiledHash, edition.compiledHash);
    let result = await store.invoke('PATCH', { id: active.id, expectedUpdatedAt: active.updated_at, ownerAction: 'save-sky-article-edition-revision', sections: { skyArticleEdition: revised, skyArticleVariableDraft: draft } });
    assert.equal(result.status, 200, JSON.stringify(result.payload));
    const saved = result.payload.rows[0];
    assert.equal(saved.source_snapshot.changedFields[0].fieldId, 'variableSources');
    result = await store.invoke('PATCH', { id: saved.id, expectedUpdatedAt: saved.updated_at, ownerAction: 'publish-sky-article-edition-revision' });
    assert.equal(result.status, 200, JSON.stringify(result.payload));
    assert.equal(store.rows.get(active.id).body, edition.body);
    assert.deepEqual(store.rows.get(active.id).sections.skyArticleVariableDraft, draft);
  } finally { store.close(); }
});
