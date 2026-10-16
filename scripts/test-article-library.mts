import assert from 'node:assert/strict';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { articleKeyFromHash, articleLibraryKind, articleReaderHref } from '../src/shared/articleLibrary.ts';
import { syntheticLibrarySkyArticle } from '../tests/helpers/article-library-fixture.ts';

const sky = await syntheticLibrarySkyArticle();
const store = await createApiStore([sky], { uuidIds: true });
const body = 'Synthetic complete opening.\n\n## Saved section\n\nSynthetic complete final paragraph.';
try {
  const readSky = () => store.invoke('POST', { prefix: 'sky-article/' }, '/api/content-reader');
  assert.equal((await readSky()).payload.rows[0]?.body, sky.body, 'Dated articles keep their complete saved text');
  store.rows.set(sky.id, { ...sky, source_snapshot: {} });
  assert.deepEqual((await readSky()).payload.rows, [], 'Dated editions still require exact owner approval');
  store.rows.set(sky.id, sky);
  for (const kind of ['guide', 'manual']) {
    const contentKey = `article/${kind}/synthetic-fixture`;
    const read = () => store.invoke('POST', { prefix: `article/${kind}/` }, '/api/content-reader');
    const created: any = await store.invoke('POST', { contentKey, surface: 'sky', mode: 'article', eventType: 'sky_article',
      status: 'DRAFT', lane: 'serving', reviewState: 'EDITORIAL_REVIEW_REQUIRED', headline: 'Synthetic complete article', body,
      sourceSnapshot: { contentType: kind === 'guide' ? 'standalone-guide' : 'authored-article', privateNotes: 'PRIVATE_ARTICLE_CANARY' } });
    assert.equal(created.status, 200, JSON.stringify(created));
    const draft = created.payload.rows[0];
    assert.deepEqual((await read()).payload.rows, [], 'Draft writing stays private');
    const published: any = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, status: 'LIVE', reviewState: null });
    assert.equal(published.status, 200, JSON.stringify(published));
    const saved = published.payload.rows[0];
    const result: any = await read();
    assert.equal(result.status, 200);
    assert.equal(result.payload.rows[0]?.body, body, JSON.stringify(result));
    assert(!JSON.stringify(result.payload).includes('PRIVATE_ARTICLE_CANARY'));
    assert.equal(articleLibraryKind(saved), kind === 'guide' ? 'guide' : 'article');
    assert.equal(articleKeyFromHash(new URL(articleReaderHref(contentKey), 'https://example.invalid').hash), contentKey);
    const stale: any = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, body: 'Stale replacement.' });
    assert.equal(stale.status, 409);
    assert.equal(store.rows.get(saved.id).body, body);
    const retired: any = await store.invoke('POST', { action: 'retire', id: saved.id, contentKey, expectedUpdatedAt: saved.updated_at }, '/api/admin/content-publication');
    assert.equal(retired.status, 200, JSON.stringify(retired));
    assert.deepEqual((await read()).payload.rows, [], 'Retirement applies to the collection and direct URLs');
  }
  const variableEndpoint = '/api/admin/generated-content?variables=true';
  const definition = { name: 'articleOpening', label: 'PRIVATE_VARIABLE_LABEL', description: 'PRIVATE_VARIABLE_DESCRIPTION', tags: [], value: 'Complete frozen author phrase.', overrides: [] };
  const variableResult = await store.invoke('POST', { variable: definition }, variableEndpoint);
  assert.equal(variableResult.status, 200, JSON.stringify(variableResult));
  let variable = variableResult.payload.variable;
  for (const kind of ['manual', 'guide']) {
    const contentKey = `article/${kind}/variable-fixture`;
    const raw = 'Opening.\n\n{{articleOpening}}\n\nComplete ending.';
    const created = await store.invoke('POST', {contentKey, surface:'sky', mode:'article', eventType:'sky_article', status:'DRAFT', lane:'serving', headline:'Variable article', body:raw});
    assert.equal(created.status,200,JSON.stringify(created));
    let row = created.payload.rows[0];
    assert.equal(row.body,raw);
    assert.equal(row.sections.standaloneArticle._studioVariables[0].value,definition.value);
    const publish = () => store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});
    let published = await publish();
    assert.equal(published.status,200,JSON.stringify(published));
    row=published.payload.rows[0];
    const read = () => store.invoke('POST',{keys:[contentKey]},'/api/content-reader');
    let reader=await read();
    assert.equal(reader.payload.rows[0].body,raw.replace('{{articleOpening}}',definition.value));
    assert(!JSON.stringify(reader.payload).includes('PRIVATE_VARIABLE'));
    assert(!JSON.stringify(reader.payload).includes('_studioVariables'));
    const changed=await store.invoke('PATCH',{id:variable.id,expectedUpdatedAt:variable.updatedAt,variable:{...definition,value:'Changed library phrase.'}},variableEndpoint);
    assert.equal(changed.status,200,JSON.stringify(changed));variable=changed.payload.variable;
    assert.equal((await read()).payload.rows[0].body,raw.replace('{{articleOpening}}',definition.value),'Live copy uses frozen approved values');
    assert.equal((await publish()).status,409,'Publication rejects changed dependencies until the draft is saved again');
    const refreshed=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,body:raw,ownerAction:'save-and-publish-owner-content'});
    assert.equal(refreshed.status,200,JSON.stringify(refreshed)); row=refreshed.payload.rows[0];
    assert.equal(row.sections.standaloneArticle._studioVariables[0].value,'Changed library phrase.');
    const restored=await store.invoke('PATCH',{id:variable.id,expectedUpdatedAt:variable.updatedAt,variable:definition},variableEndpoint);
    assert.equal(restored.status,200);variable=restored.payload.variable;
  }
  const unknown=await store.invoke('POST',{contentKey:'article/manual/unknown-variable',surface:'sky',mode:'article',eventType:'sky_article',status:'LIVE',lane:'serving',headline:'Unknown variable',body:'{{missingArticleVariable}}'});
  assert.equal(unknown.status,400,JSON.stringify(unknown));
  assert.equal(articleLibraryKind({ content_key: 'education/astro-101/chapter/qa' }), null);
  assert.equal(articleLibraryKind({ content_key: 'horoscope/weekly/qa' }), null);
  assert.equal(articleLibraryKind({ content_key: 'sky/article-template/venus/scorpio' }), 'sky');
  assert.equal(articleKeyFromHash('#articles/%invalid'), null);
  assert.equal((await store.invoke('POST', { prefix: 'article/' }, '/api/content-reader')).status, 400);
  console.log('PASS Articles & Guides actual draft/publish/read/retire lifecycle, complete copy, private metadata, conflicts and bounded queries.');
} finally { await store.close(); }
