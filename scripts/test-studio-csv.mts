import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createApiStore, fixtures as calendarFixtures } from '../tests/helpers/calendar-review-api.mjs';
import { csvChanges, csvDraftPatch, csvRecordForRow, csvWantsPublication, readStudioCsv, writeStudioCsv } from '../apps/admin/src/studioCsv.js';
import { projectReaderRow } from '../apps/web/src/content/readerRowProjection.mjs';

const original = {
  id: '10000000-0000-4000-8000-000000000001', content_key: 'cms/csv/first',
  updated_at: '2026-10-01T12:00:00.123456Z', status: 'LIVE', surface: 'sky', mode: 'feed',
  event_type: 'csv-qa', block_type: 'essay', lane: 'serving', review_state: null, target_date: null,
  headline: 'Synthetic CSV title', summary: 'Synthetic summary', body: 'Opening, with "quotes".\n\nFinal paragraph — café.\n',
  sections: {}, facts: {}, source_snapshot: {}, provider: 'manual-admin',
};
const importBody = (record: Record<string, string>) => ({ id: record.content_id, expectedUpdatedAt: record.saved_version.slice(2), ownerAction: 'import-csv-draft', csvRecord: record });

test('CSV round-trips full Unicode, formulas, commas, quotes, multiline and leading whitespace', () => {
  for (const text of [original.body, '=1+2', '+SUM(A1)', '-text', '@name', "'quotation", '\t=1', '  spaces  ', '', 'CR\r\nLF']) {
    const record = csvRecordForRow({ ...original, body: text });
    const csv = writeStudioCsv([record]);
    assert.deepEqual(readStudioCsv(csv), [record]);
    if (/^[=+\-@\t']/.test(text)) assert.ok(csv.includes(`"'${text.replaceAll('"', '""')}"`));
  }
});
test('rejects duplicate identities/columns, malformed quoting, foreign files and unsafe paths', () => {
  const record = csvRecordForRow(original), csv = writeStudioCsv([record]);
  for (const bad of [writeStudioCsv([record, record]), csv.replace('"title"', '"body"'), csv.replace('"title"', '"__proto__"'), csv.slice(0, -10), 'title,body\nabc,def', csv.replace('"format"', '"format"x')]) {
    assert.throws(() => readStudioCsv(bad));
  }
  assert.throws(() => csvChanges(original, { ...record, body: 'Changed', status: 'LIVE' }), /not editable/);
  assert.throws(() => csvChanges(original, { ...record, saved_version: 'v:2020-01-01' }), /Changed in Studio/);
  assert.deepEqual(csvChanges(original, record), []);
});
test('package columns edit declared prose and leave structure, source text and facts intact', () => {
  const row = { ...original, sections: { packageRecord: { contentKey: original.content_key, content_role: 'authored_card', body_you: 'You source.', body_they: 'Friend source.', secret: 'Not copy.', review_status: 'approved' } } };
  const record = csvRecordForRow(row);
  assert.equal(record.secret, undefined);
  const patch = csvDraftPatch(row, { ...record, body_they: 'Friend revision.\n\nFull final sentence.' });
  assert.deepEqual(patch.sections.packageRecord, row.sections.packageRecord);
  assert.equal(patch.sections.packageDraft.body_you, 'You source.');
  assert.equal(patch.sections.packageDraft.body_they, 'Friend revision.\n\nFull final sentence.');
  assert.equal(patch.reviewStatus, 'needs_review');
  const declared = { ...row, sections: { packageRecord: { ...row.sections.packageRecord, Body: 'Exact source', era_layer: { frame: 'Frame source' }, studio_editable_fields: [{ path: 'Body' }, { path: 'era_layer.frame' }] } } };
  assert.deepEqual(Object.keys(csvRecordForRow(declared)).slice(6), ['Body', 'era_layer.frame']);
});

test('publish intent defaults to no, accepts yes/no and older files, and rejects other values', () => {
  const record = csvRecordForRow(original);
  assert.equal(record.publish, 'no');
  for (const publish of ['yes', ' YES ']) {
    assert.equal(csvWantsPublication({ ...record, publish }), true);
    assert.deepEqual(csvChanges(original, { ...record, publish }), []);
  }
  for (const publish of ['', 'no', 'No']) assert.equal(csvWantsPublication({ ...record, publish }), false);
  const { publish, ...oldRecord } = record;
  assert.deepEqual(csvChanges(original, readStudioCsv(writeStudioCsv([oldRecord]))[0]), []);
  for (const publish of ['true', 'LIVE', '1', 'later']) {
    assert.throws(() => readStudioCsv(writeStudioCsv([{ ...record, publish }])), /publish column/);
    assert.throws(() => csvChanges(original, { ...record, publish }), /publish column/);
  }
});

test('publish=yes still saves a draft; only a separate exact-version publication makes it reader-visible', async () => {
  const row = { ...original, status: 'DRAFT', lane: 'reference', review_state: 'needs-review' };
  const store = await createApiStore([row]);
  try {
    const imported = { ...csvRecordForRow(row), publish: 'yes', body: 'Synthetic published opening.\n\nSynthetic final paragraph.\n' };
    const saved = await store.invoke('PATCH', importBody(imported));
    assert.equal(saved.status, 200, JSON.stringify(saved));
    const draft = saved.payload.rows[0];
    assert.equal(draft.status, 'DRAFT');
    assert.equal((await store.invoke('POST', { keys: [row.content_key] }, '/api/content-reader')).payload.rows.length, 0);
    const operation = { id: draft.id, expectedUpdatedAt: draft.updated_at, status: 'LIVE', lane: 'serving', reviewState: null };
    assert.equal((await store.invoke('PATCH', operation, undefined, 'denied')).status, 401);
    assert.equal((await store.invoke('PATCH', { ...operation, expectedUpdatedAt: row.updated_at })).status, 409);
    const published = await store.invoke('PATCH', operation);
    assert.equal(published.status, 200, JSON.stringify(published));
    assert.equal(published.payload.rows[0].status, 'LIVE');
    const reader = await store.invoke('POST', { keys: [row.content_key] }, '/api/content-reader');
    assert.equal(reader.status, 200);
    assert.equal(reader.payload.rows[0].body, imported.body);
    assert.equal(JSON.stringify(reader.payload).includes('csvHistory'), false);
    assert.equal(csvRecordForRow(published.payload.rows[0]).publish, 'no');
  } finally { await store.close(); }
});

test('CSV package publication promotes the saved proposal through the existing receipt and reader gates', async () => {
  const row = { ...structuredClone(calendarFixtures[0]), id: original.id };
  const store = await createApiStore([row]);
  try {
    const imported = { ...csvRecordForRow(row), publish: 'yes', Body: `${row.sections.packageRecord.Body}\n\nSynthetic publication ending.` };
    const saved = await store.invoke('PATCH', importBody(imported));
    assert.equal(saved.status, 200, JSON.stringify(saved));
    const draft = saved.payload.rows[0];
    assert.equal(draft.status, 'DRAFT');
    const published = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(published.status, 200, JSON.stringify(published));
    assert.equal(published.payload.publicationReceipt.currentPublicationState, 'live');
    assert.equal(published.payload.rows[0].sections.packageDraft, undefined);
    const reader = await store.invoke('POST', { keys: [row.content_key] }, '/api/content-reader');
    assert.equal(reader.payload.rows[0].body, imported.Body);
  } finally { await store.close(); }
});

test('CSV publish intent cannot bypass a template publication gate and the imported draft is retained', async () => {
  const row = { ...original, content_key: 'sky/article-template/csv-fixture', status: 'DRAFT' };
  const store = await createApiStore([row]);
  try {
    const imported = { ...csvRecordForRow(row), publish: 'yes', body: 'Synthetic template revision.' };
    const saved = await store.invoke('PATCH', importBody(imported));
    assert.equal(saved.status, 200, JSON.stringify(saved));
    const draft = saved.payload.rows[0];
    const published = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, status: 'LIVE', lane: 'serving', reviewState: null });
    assert.equal(published.status, 409, JSON.stringify(published));
    assert.equal(store.rows.get(row.id).body, imported.body);
    assert.equal(store.rows.get(row.id).status, 'DRAFT');
  } finally { await store.close(); }
});
test('structured article text preserves non-text block data and array shapes', () => {
  for (const sections of [{ kind: 'chapter', intro: 'Intro.', blocks: [{ heading: 'Heading', body: 'Section body.', level: 2 }] }, [{ heading: 'Heading', body: 'Section body.', level: 2 }]]) {
    const row = { ...original, sections };
    const record = csvRecordForRow(row);
    assert.equal(record.body, undefined);
    const patch = csvDraftPatch(row, { ...record, section_1_body: 'Revised section.\n\nFinal paragraph.' });
    const block = Array.isArray(sections) ? patch.sections[0] : patch.sections.blocks[0];
    assert.equal(block.level, 2); assert.equal(block.heading, 'Heading');
    assert.equal(block.body, 'Revised section.\n\nFinal paragraph.');
    assert.equal(Array.isArray(patch.sections), Array.isArray(sections));
  }
});

test('actual handler imports draft, preserves source history, reloads exactly and rejects stale or unsafe writes', async () => {
  const store = await createApiStore([original]);
  try {
    const record = csvRecordForRow(original);
    const revised = { ...record, body: 'Synthetic revised opening, "quoted".\n\nSynthetic final paragraph — café.\n', summary: '' };
    for (const body of [{ ...importBody(revised), status: 'LIVE' }, importBody({ ...revised, content_key: 'cms/csv/other' }), importBody({ ...revised, facts: '{"changed":true}' }), importBody({ ...revised, body: 123 } as any)]) {
      assert.ok((await store.invoke('PATCH', body)).status >= 400);
      assert.deepEqual(store.rows.get(original.id), original);
    }
    assert.equal((await store.invoke('PATCH', importBody(revised), undefined, 'denied')).status, 401);
    const result = await store.invoke('PATCH', importBody(revised));
    assert.equal(result.status, 200, JSON.stringify(result));
    const saved = result.payload.rows[0];
    assert.equal(saved.status, 'DRAFT');
    assert.equal(saved.body, revised.body); assert.equal(saved.summary, '');
    assert.deepEqual(saved.facts, original.facts);
    const receipt = saved.source_snapshot.editorialImport.csvHistory[0];
    assert.deepEqual(receipt.original, record); assert.deepEqual(receipt.imported, revised);
    assert.equal(receipt.sourceSha256, createHash('sha256').update(JSON.stringify(revised)).digest('hex'));
    assert.equal(JSON.stringify(projectReaderRow(saved)).includes('csvHistory'), false, 'Import originals and private history must not enter reader payloads.');
    const reopened = await store.invoke('GET', undefined, `/api/admin/generated-content-inventory?id=${original.id}&status=all&visibility=all&limit=1`);
    assert.equal(reopened.payload.rows[0].body, revised.body);
    assert.equal((await store.invoke('PATCH', importBody(revised))).status, 409);
    assert.equal(store.rows.get(original.id).body, revised.body);
    // A race after lookup must still fail at the conditional storage write.
    const current = csvRecordForRow(saved);
    const fetcher = globalThis.fetch;
    let raced = false;
    globalThis.fetch = async (url, options) => {
      const response = await fetcher(url, options);
      if (!raced && String(url).includes('generated_interpretations') && (!options?.method || options.method === 'GET')) {
        raced = true; store.rows.set(original.id, { ...store.rows.get(original.id), body: 'Newer Studio edit', updated_at: '2030-01-01T00:00:00Z' });
      }
      return response;
    };
    assert.equal((await store.invoke('PATCH', importBody({ ...current, body: 'Stale edit' }))).status, 409);
    assert.equal(store.rows.get(original.id).body, 'Newer Studio edit');
    globalThis.fetch = fetcher;
  } finally { await store.close(); }
});

test('actual handler saves package proposal without promoting it or changing the original prose', async () => {
  const row = { ...original, status: 'DRAFT', content_key: 'fallback-hook/csv-qa/source', provider: 'tldrastro-fallback-architecture-v3', facts: { fallbackArchitectureV3: true },
    sections: { packageRecord: { contentKey: 'fallback-hook/csv-qa/source', content_role: 'fallback_hook', body_you: 'Synthetic first source.', body_they: 'Synthetic friend source.', review_status: 'needs_review' } }, source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3' } };
  const store = await createApiStore([row]);
  try {
    const revised = { ...csvRecordForRow(row), body_they: 'Synthetic offline friend revision.\n\nSynthetic final sentence.' };
    const result = await store.invoke('PATCH', importBody(revised));
    assert.equal(result.status, 200, JSON.stringify(result));
    const saved = result.payload.rows[0];
    assert.equal(saved.status, 'DRAFT');
    assert.equal(saved.sections.packageDraft.body_they, revised.body_they);
    assert.equal(saved.sections.packageRecord.body_they, row.sections.packageRecord.body_they);
    assert.equal(saved.sections.packageDraft.body_you, row.sections.packageRecord.body_you);
    assert.equal(saved.source_snapshot.editorialImport.csvHistory[0].original.body_they, row.sections.packageRecord.body_they);
    if (process.env.STUDIO_CSV_AUDIT_ROWS) writeFileSync(process.env.STUDIO_CSV_AUDIT_ROWS, JSON.stringify([...store.rows.values()]));
  } finally { await store.close(); }
});

test('LIVE governed imports create a separate draft and refuse to overwrite an existing revision', async () => {
  const row = { ...structuredClone(calendarFixtures[0]), id: original.id, mode: 'feed', status: 'LIVE', lane: 'serving', review_state: null };
  const store = await createApiStore([row]);
  try {
    const imported = { ...csvRecordForRow(row), Body: `${row.sections.packageRecord.Body}\n\nSynthetic CSV revision.` };
    const result = await store.invoke('PATCH', importBody(imported));
    assert.equal(result.status, 200, JSON.stringify(result));
    const saved = result.payload.rows[0];
    assert.notEqual(saved.id, row.id); assert.equal(saved.status, 'DRAFT');
    assert.equal(saved.sections.packageDraft.Body, imported.Body);
    assert.deepEqual(store.rows.get(row.id), row);
    assert.equal((await store.invoke('PATCH', importBody({ ...imported, Body: 'Unopened revision edit.' }))).status, 409);
    assert.equal(store.rows.get(saved.id).sections.packageDraft.Body, imported.Body);
  } finally { await store.close(); }
});
