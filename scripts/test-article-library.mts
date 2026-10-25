import assert from 'node:assert/strict';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { articleKeyFromHash, articleLibraryKind, articleReaderHref } from '../src/shared/articleLibrary.ts';
import { syntheticLibrarySkyArticle } from '../tests/helpers/article-library-fixture.ts';
import { createPublicationDb, seedPublicationRow, callPublicationRpc } from '../tests/helpers/studio-publication-db.mjs';

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
    let saved = published.payload.rows[0];
    const result: any = await read();
    assert.equal(result.status, 200);
    assert.equal(result.payload.rows[0]?.body, body, JSON.stringify(result));
    assert(!JSON.stringify(result.payload).includes('PRIVATE_ARTICLE_CANARY'));
    assert.equal(articleLibraryKind(saved), kind === 'guide' ? 'guide' : 'article');
    assert.equal(articleKeyFromHash(new URL(articleReaderHref(contentKey), 'https://example.invalid').hash), contentKey);
    const stale: any = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, body: 'Stale replacement.' });
    assert.equal(stale.status, 409);
    assert.equal(store.rows.get(saved.id).body, body);
    const revisionBody = `${body}\n\nComplete revised ending.`;
    const revision = await store.invoke('PATCH', { id: saved.id, expectedUpdatedAt: saved.updated_at,
      status: 'DRAFT', headline: saved.headline, body: revisionBody });
    assert.equal(revision.status, 200, JSON.stringify(revision));
    assert.equal((await read()).payload.rows[0]?.body, body, 'Saving a revision preserves the complete published article');
    const revisionRow = revision.payload.rows[0];
    assert.equal(revisionRow.status, 'DRAFT');
    assert.equal(revisionRow.body, revisionBody);
    const publishRevision = (row = revisionRow, secret?: string) => store.invoke('PATCH', {
      id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: 'publish-standalone-article-revision'
    }, '/api/admin/generated-content', secret);
    assert.equal((await publishRevision(revisionRow, 'unauthorized-fixture')).status, 401);
    assert.equal((await publishRevision({ ...revisionRow, updated_at: saved.updated_at })).status, 409);
    store.rows.set(revisionRow.id, { ...revisionRow, source_snapshot: { ...revisionRow.source_snapshot, targetRowId: sky.id } });
    assert.equal((await publishRevision()).status, 409, 'A revision cannot promote a different article key');
    store.rows.set(revisionRow.id, revisionRow);
    const republished = await store.invoke('PATCH', { id: revisionRow.id, expectedUpdatedAt: revisionRow.updated_at,
      ownerAction: 'publish-standalone-article-revision' });
    assert.equal(republished.status, 200, JSON.stringify(republished));
    saved = republished.payload.rows[0];
    assert.equal((await read()).payload.rows[0]?.body, revisionBody, 'Only explicit publication replaces the reader edition');
    const replayed = await publishRevision();
    assert.equal(replayed.status, 200, JSON.stringify(replayed));
    assert.equal(replayed.payload.rows[0].updated_at, saved.updated_at, 'A recovered publication receipt does not replay the write');
    const pending = await store.invoke('PATCH', { id: saved.id, expectedUpdatedAt: saved.updated_at, status: 'DRAFT', body: 'Retained pending revision.' });
    assert.equal(pending.status, 200, JSON.stringify(pending));
    const concurrentBody = `${revisionBody}\n\nAnother complete explicit revision.`;
    store.rows.set(saved.id, { ...saved, body: concurrentBody, updated_at: new Date(Date.parse(saved.updated_at) + 1000).toISOString() });
    assert.equal((await publishRevision(pending.payload.rows[0])).status, 409, 'A stale target cannot overwrite newer published copy');
    assert.equal(store.rows.get(pending.payload.rows[0].id).body, 'Retained pending revision.');
    assert.equal(store.rows.get(saved.id).body, concurrentBody);
    store.rows.set(saved.id, saved);
    const discarded = await store.invoke('PATCH', { id: pending.payload.rows[0].id,
      expectedUpdatedAt: pending.payload.rows[0].updated_at, status: 'ARCHIVED' });
    assert.equal(discarded.status, 200, JSON.stringify(discarded));
    assert.equal((await read()).payload.rows[0]?.body, revisionBody, 'Discarding a revision preserves the live article');
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

const db = await createPublicationDb();
try {
  const signature = 'public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)';
  const grants = await db.query('select has_function_privilege($1,$4,$5) as anon, has_function_privilege($2,$4,$5) as authenticated, has_function_privilege($3,$4,$5) as service', ['anon', 'authenticated', 'service_role', signature, 'EXECUTE']);
  assert.deepEqual(grants.rows[0], { anon: false, authenticated: false, service: true }, 'Revision migration preserves server-only execution');
  const target = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', content_key: 'article/manual/sql-boundary', mode: 'article', status: 'LIVE',
    lane: 'serving', review_state: null, body: 'Complete original article.', headline: 'SQL fixture', sections: {}, updated_at: '2026-10-25T00:00:00.000Z' };
  const proposal = { ...target, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', content_key: 'article/guide/wrong-key',
    mode: 'studio-draft', event_type: 'standalone-article-revision', status: 'DRAFT', lane: 'reference', review_state: 'owner-review-required',
    body: 'Complete pending article.', source_snapshot: { targetRowId: target.id, targetRowUpdatedAt: target.updated_at, targetContentKey: target.content_key } };
  await seedPublicationRow(db, target); await seedPublicationRow(db, proposal);
  const publications = await db.query('select to_jsonb(p) as publication from content_publications p where content_key=$1', [target.content_key]);
  const args = { p_operation_id: 'a'.repeat(64), p_actor: 'synthetic-owner', p_request_sha256: 'b'.repeat(64),
    p_action: 'publish-standalone-article-revision', p_proposal_id: proposal.id, p_proposal_version: proposal.updated_at,
    p_target_id: target.id, p_target_version: target.updated_at, p_patch: { body: proposal.body, status: 'LIVE', lane: 'serving', review_state: null },
    p_validation_context: { targetPublication: publications.rows[0].publication }, p_dependencies: [] };
  await assert.rejects(callPublicationRpc(db, 'content_studio_publish_revision', args), { code: '22023' }, 'SQL itself rejects cross-key article promotion');
  await db.query('update generated_interpretations set content_key=$1,mode=$2 where id=$3', [target.content_key, 'article', proposal.id]);
  await assert.rejects(callPublicationRpc(db, 'content_studio_publish_revision', args), { code: '22023' }, 'SQL itself requires a private revision row');
  const retained = await db.query('select body,status from generated_interpretations where id=$1', [target.id]);
  assert.deepEqual(retained.rows[0], { body: target.body, status: 'LIVE' });
  console.log('PASS standalone article revision SQL target boundaries and unchanged server-only grants.');
} finally { await db.close(); }
