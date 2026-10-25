import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createApiStore, fixtures as calendarFixtures } from '../tests/helpers/calendar-review-api.mjs';
import { csvChanges, csvDraftPatch, csvRecordForRow, csvUnavailableReason, csvWantsPublication, readStudioCsv, writeStudioCsv } from '../apps/admin/src/studioCsv.js';
import { studioListingFacts, studioListingRow } from '../src/shared/studio-listing-facts';
import { projectReaderRow } from '../apps/web/src/content/readerRowProjection.mjs';
import { csvSourceContext } from '../apps/admin/src/studioCsvContext';
import { skyReaderCsvRecord } from '../apps/web/src/features/sky/skyReaderCsvExport';
import { articleKeyFromHash } from '../src/shared/articleLibrary';

const original = {
  id: '10000000-0000-4000-8000-000000000001', content_key: 'cms/csv/first',
  updated_at: '2026-10-01T12:00:00.123456Z', status: 'LIVE', surface: 'sky', mode: 'feed',
  event_type: 'csv-qa', block_type: 'essay', lane: 'serving', review_state: null, target_date: null,
  headline: 'Synthetic CSV title', summary: 'Synthetic summary', body: 'Opening, with "quotes".\n\nFinal paragraph — café.\n',
  sections: {}, facts: {}, source_snapshot: {}, provider: 'manual-admin',
};
const importBody = (record: Record<string, string>) => ({ id: record.content_id, expectedUpdatedAt: record.saved_version.slice(2), ownerAction: 'import-csv-draft', csvRecord: record });

for (const kind of ['manual', 'guide']) test(`CSV ${kind} article import preserves its live edition until explicit revision publication`, async () => {
  const source = { ...original, content_key: `article/${kind}/csv-revision`, mode: 'article' };
  const store = await createApiStore([source], { uuidIds: true });
  try {
    const imported = { ...csvRecordForRow(source), publish: 'yes', body: 'Complete offline opening.\n\nComplete offline final paragraph.' };
    const saved = await store.invoke('PATCH', importBody(imported));
    assert.equal(saved.status, 200, JSON.stringify(saved));
    const proposal = saved.payload.rows[0];
    assert.notEqual(proposal.id, source.id);
    assert.equal(proposal.event_type, 'standalone-article-revision');
    assert.equal(proposal.body, imported.body);
    assert.deepEqual(proposal.source_snapshot.editorialImport.csvHistory[0].imported, imported);
    assert.deepEqual(store.rows.get(source.id), source);
    const read = () => store.invoke('POST', { keys: [source.content_key] }, '/api/content-reader');
    assert.equal((await read()).payload.rows[0]?.body, source.body);
    assert.equal((await store.invoke('PATCH', importBody(imported))).status, 409, 'Reimport cannot overwrite a saved private revision');
    assert.equal(store.rows.get(proposal.id).body, imported.body);
    const published = await store.invoke('PATCH', { id: proposal.id, expectedUpdatedAt: proposal.updated_at,
      ownerAction: 'publish-standalone-article-revision' });
    assert.equal(published.status, 200, JSON.stringify(published));
    assert.equal(published.payload.rows[0].id, source.id);
    assert.equal((await read()).payload.rows[0]?.body, imported.body);
    assert.equal(store.rows.get(proposal.id).status, 'ARCHIVED');
  } finally { await store.close(); }
});

test('CSV eligibility excludes dedicated article editions before their full documents load', () => {
  for (const [content_key, event_type] of [
    ['sky-article/sun/libra/2026/2026-09-22', 'sky-article-edition'],
    ['sky-article-revision/sun/libra/2026/2026-09-22', 'sky-article-edition-revision'],
    ['horoscope/daily/20261021040000000/America/New_York', 'horoscope-edition'],
    ['content/manual/synthetic-edition', 'sky-article-edition'],
  ]) {
    const row = { ...original, content_key, event_type, sections: { skyArticleEdition: { schema: 'synthetic' } } };
    const listing = studioListingRow(row, studioListingFacts(row)) as unknown as typeof row;
    assert.equal(listing.sections, null);
    assert.match(csvUnavailableReason(listing) ?? '', /dedicated editor/, content_key);
    assert.throws(() => csvRecordForRow(row), /dedicated editor/);
  }
  assert.equal(csvUnavailableReason(original), null);
  assert.equal(csvUnavailableReason({ ...original, content_key: 'sky-season-fallback/libra-2026/moon/pisces/2026-10-21' }), null);
  for (const field of ['skyArticleEdition', 'horoscopeEdition', 'articleHoroscopes']) {
    assert.match(csvUnavailableReason({ ...original, sections: { [field]: {} } }) ?? '', /dedicated editor/);
  }
});

test('export context identifies source roles, verified publication, dates and exact reader links without granting import authority', () => {
  const row = { ...original, content_key: 'sky-placement/article/saturn/aries' };
  const status = { id: row.id, live: false, label: 'Not live' as const, detail: 'Not the current published version.', source: null, updatedAt: row.updated_at };
  const context = csvSourceContext(row, status, 'https://example.invalid', '2026-10-21T12:00:00Z');
  assert.equal(context.publication_status, 'Inactive');
  assert.equal(context.source_role, 'Shared fallback');
  assert.equal(context.valid_from, '');
  assert.match(context.reader_url, /^https:\/\/example.invalid\/\?date=2026-10-21#\/sky\/placement\/saturn\/aries$/);
  const exported = csvRecordForRow(row, context);
  assert.deepEqual(readStudioCsv(writeStudioCsv([exported])), [exported]);
  assert.deepEqual(csvChanges(row, { ...exported, publication_status: 'Live', reader_url: 'https://changed.invalid' }), []);
  const patch = csvDraftPatch(row, { ...exported, body: 'Synthetic pending wording.', publication_status: 'Live' });
  assert.equal(patch.status, 'DRAFT');
  assert.equal(patch.publication_status, undefined);
  const seasonal = { ...row, content_key: 'sky-season-fallback/libra-2026/moon/aries/2026-09-25', target_date: '2026-09-25', sections: { seasonFallback: {
    entry: '2026-09-25T00:00:00Z', exit: '2026-09-28T00:00:00Z', seasonStart: '2026-09-26T00:00:00Z', seasonEnd: '2026-09-27T00:00:00Z'
  } } };
  const live = csvSourceContext(seasonal, { ...status, live: true, label: 'Live' }, 'https://example.invalid', '2026-09-26T12:00:00Z');
  assert.equal(live.publication_status, 'Live');
  assert.equal(live.source_role, 'Dated article');
  assert.equal(live.target_date, '2026-09-25');
  assert.equal(live.valid_from, seasonal.sections.seasonFallback.seasonStart);
  assert.equal(live.valid_to, seasonal.sections.seasonFallback.seasonEnd);
  assert.match(live.reader_url, /#\/sky\/placement\/moon\/aries$/);
});

test('bulk-edit CSV article links resolve the exact published source in the reader router', () => {
  for (const key of ['article/manual/synthetic-csv-guide', 'cms/guide/synthetic-csv-guide']) {
    const row = { ...original, content_key: key };
    const status = { id: row.id, live: true, label: 'Live' as const, detail: 'Published.', source: null, updatedAt: row.updated_at };
    const live = csvSourceContext(row, status, 'https://example.invalid', '2026-10-21T12:00:00Z');
    assert.equal(articleKeyFromHash(new URL(live.reader_url).hash), key);
    assert.equal(csvSourceContext(row, { ...status, live: false }, 'https://example.invalid', '2026-10-21T12:00:00Z').reader_url, '');
  }
});

test('reader snapshot reports the selected seasonal publication window and local reference date', () => {
  const text = { innerText: 'Synthetic public paragraph.', closest: () => null, parentElement: null };
  const article = { querySelectorAll: (selector: string) => selector === '.article-related-aspects-card' ? [] : [text], querySelector: () => text } as unknown as HTMLElement;
  const record = skyReaderCsvRecord(article, { title: 'Synthetic seasonal article', glyph: '', kicker: '', meta: '', body: [], readerExport: {
    keys: ['sky-season-fallback/libra-2026/moon/aries/2026-09-25'], instant: '2026-09-27T01:00:00Z', timeZone: 'America/New_York',
    rows: [{ contentKey: 'sky-season-fallback/libra-2026/moon/aries/2026-09-25', status: 'LIVE', sections: { seasonFallback: {
      entry: '2026-09-25T00:00:00Z', exit: '2026-09-28T00:00:00Z', seasonStart: '2026-09-26T00:00:00Z', seasonEnd: '2026-09-27T00:00:00Z'
    } } }]
  } }, 'https://example.invalid/?studioExport=sky-article-csv#sky/placement/moon/aries');
  assert.equal(record.valid_from, '2026-09-26T00:00:00Z');
  assert.equal(record.valid_to, '2026-09-27T00:00:00Z');
  assert.equal(record.reference_date, '2026-09-26');
  assert.equal(record.publication_status, 'Live');
  assert.match(record.reader_url, /\?date=2026-09-26#sky\/placement\/moon\/aries$/);
});

test('reader snapshots cannot be imported as editable source files', () => {
  const snapshot = { format: 'content-studio-reader-csv/v1', content_type: 'sky-reader', title: 'Synthetic reader snapshot', body: 'Synthetic public prose.' };
  assert.throws(() => readStudioCsv(writeStudioCsv([snapshot])), /Reader exports are read-only/);
});

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
    const revised = { ...record, publication_status: 'Live', source_role: 'Editable source', valid_from: '2026-10-21', reader_url: 'https://example.invalid', body: 'Synthetic revised opening, "quoted".\n\nSynthetic final paragraph — café.\n', summary: '' };
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
