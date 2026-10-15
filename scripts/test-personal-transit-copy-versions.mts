import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { csvRecordForRow, csvDraftPatch, csvChanges, csvCreateTransitBody, newTransitCsvRow } from '../apps/admin/src/studioCsv.js';
import { personalTransitCopyVersion, retainPersonalTransitAlternate } from '../apps/web/src/content/fallbackArchitectureV3/resolver/personalTransitCopyVersions.mjs';
import { renderTransitNatalPreviewState, normalizeTransitNatalPreviewInput } from '../api/admin/transit-natal-preview.js';
import { fixturePublications } from '../tests/helpers/content-reader-route.mjs';
import { projectReaderRow } from '../apps/web/src/content/readerRowProjection.mjs';
import { createTransitSynastryRenderer } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';

const key = 'authored/transit-aspect/mercury/venus/trine';
const original = {
  id: 'copy-versions-fixture', content_key: key, surface: 'you', mode: 'in_depth',
  event_type: 'fallback-authored-card', block_type: 'fallback_hook', status: 'LIVE',
  lane: 'serving', review_state: null, provider: 'tldrastro-fallback-architecture-v3',
  updated_at: '2026-10-14T12:00:00.000Z', target_date: null, headline: 'Original title', summary: '',
  body: 'Through {{untilDate}}, Mercury {{aspectWord}} your Venus. Original You passage.',
  facts: { fallbackArchitectureV3: true, readerServing: true },
  source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', review_status: 'approved' },
  sections: { packageRecord: { contentKey: key, content_role: 'full_copy', review_status: 'approved',
    reader_only: true, render_policy: 'personal-transit-exact-v1', headline: 'Original title',
    body_you: 'Through {{untilDate}}, Mercury {{aspectWord}} your Venus. Original You passage.',
    body_they: 'Through {{untilDate}}, Mercury {{aspectWord}} their Venus. Original Friend passage.' } }
};

test('normal CSV edits do not retain an alternate; explicit retention validates its scope', () => {
  const record = csvRecordForRow(original);
  assert.equal(record.keep_current_as_alternate, 'no');
  assert.equal(csvDraftPatch(original, { ...record, body_you: 'Changed.' }).preserveCurrentTransitAsAlternate, undefined);
  assert.equal(csvDraftPatch(original, { ...record, body_you: 'Changed.', keep_current_as_alternate: 'yes' }).preserveCurrentTransitAsAlternate, true);
  assert.throws(() => csvChanges(original, { ...record, keep_current_as_alternate: 'perhaps' }), /yes or no/);
  assert.throws(() => personalTransitCopyVersion(original.sections.packageRecord, 'alternate'), /No verified alternate/);
});

test('the real import, reload, approval and public projection preserve both audiences exactly', async () => {
  const store = await createApiStore([original]);
  try {
    const imported = { ...csvRecordForRow(original), keep_current_as_alternate: 'yes', publish: 'yes',
      primary_owner_authored: 'yes', owner_source_uri: 'thread:01a13201-e1a0-75c0-ab9b-f1b8aa29d3ed',
      body_you: 'Through {{untilDate}}, Mercury {{aspectWord}} your Venus. Primary You passage.',
      body_they: 'Through {{untilDate}}, Mercury {{aspectWord}} their Venus. Primary Friend passage.' };
    const result = await store.invoke('PATCH', { id: original.id, expectedUpdatedAt: original.updated_at,
      ownerAction: 'import-csv-draft', csvRecord: imported });
    assert.equal(result.status, 200, JSON.stringify(result));
    const draft = result.payload.rows[0];
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.sections.packageRecord.body_you_alternate, original.sections.packageRecord.body_you);
    assert.equal(draft.sections.packageRecord.body_they_alternate, original.sections.packageRecord.body_they);
    assert.equal(draft.sections.packageRecord.alternate_source_version, original.updated_at);
    assert.equal((await store.invoke('PATCH', { id: original.id, expectedUpdatedAt: original.updated_at,
      ownerAction: 'import-csv-draft', csvRecord: imported })).status, 409);
    const publish = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(publish.status, 200, JSON.stringify(publish));
    const saved = publish.payload.rows[0];
    assert.equal(saved.status, 'LIVE');
    const projected = projectReaderRow(saved);
    const record = projected.sections.packageRecord;
    assert.equal(record.body_you, imported.body_you);
    assert.equal(record.owner_authored, true);
    assert.equal(record.body_you_authorship, 'owner_authored');
    assert.equal(record.body_they_authorship, 'owner_authored');
    assert.equal(record.body_you_word_count, imported.body_you.trim().split(/\s+/u).length);
    assert.equal(record.body_they_word_count, imported.body_they.trim().split(/\s+/u).length);
    assert.equal(record.body_you_approval.payloadSha256, record.body_you_sha256);
    assert.equal(record.body_they_approval.payloadSha256, record.body_they_sha256);
    assert.equal(record.body_they, imported.body_they);
    assert.equal(record.body_you_alternate, original.sections.packageRecord.body_you);
    assert.equal(record.body_they_alternate, original.sections.packageRecord.body_they);
    assert.equal(JSON.stringify(projected).includes('csvHistory'), false);
    const preview = renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput({ planet: 'mercury', natalPoint: 'venus', aspect: 'trine', copyVersion: 'alternate', window: 'Until October 20, 2026' }), [saved], fixturePublications([saved]));
    assert.match(preview.body, /Original You passage/);
    assert.equal(preview.paragraphs[0].sources[0].field, 'body_you_alternate');
    const renderer = createTransitSynastryRenderer({ authoredCards: [record] }, { templates: [] }, { hookRows: [], vocabularyRows: [] });
    for (const voice of ['you', 'Example Friend']) {
      const facts = { transiting: 'mercury', natal: 'venus', aspect: 'trine', voice, window: 'Until October 20, 2026' };
      assert.match(renderer.renderTransitAspect(facts).body, voice === 'you' ? /Primary You passage/ : /Primary Friend passage/);
      const alternate = renderer.renderTransitAspect({ ...facts, copyVersion: 'alternate' });
      assert.match(alternate.body, voice === 'you' ? /Original You passage/ : /Original Friend passage/);
      assert.equal(alternate.paragraphSources[0].sources[0].field, voice === 'you' ? 'body_you_alternate' : 'body_they_alternate');
    }
    assert.throws(() => personalTransitCopyVersion({ ...record, body_they_alternate: 'Tampered' }, 'alternate'), /No verified alternate/);
    assert.deepEqual(retainPersonalTransitAlternate(record, 'later'), {});
  } finally { await store.close(); }
});

test('a missing group key is created as a draft and only explicit approval publishes it', async () => {
  const newKey = 'authored/transit-aspect/mars/chiron/hard';
  const identity = { format: 'content-studio-csv/v1', content_id: `new:${newKey}`, content_key: newKey,
    saved_version: 'v:new', content_type: 'transit-to-natal-aspect', publish: 'yes' };
  const imported = { ...csvRecordForRow(newTransitCsvRow(identity)), publish: 'yes',
    body: 'Through {{untilDate}}, Mars {{aspectWord}} your Chiron. New You passage.',
    body_you: 'Through {{untilDate}}, Mars {{aspectWord}} your Chiron. New You passage.',
    body_they: 'Through {{untilDate}}, Mars {{aspectWord}} their Chiron. New Friend passage.' };
  const store = await createApiStore([]);
  try {
    const create = await store.invoke('POST', csvCreateTransitBody(imported));
    assert.equal(create.status, 200, JSON.stringify(create));
    const draft = create.payload.rows[0];
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.sections.packageRecord.alternate_copy_sha256, undefined);
    const approved = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at,
      reviewStatus: 'approved' });
    assert.equal(approved.status, 200, JSON.stringify(approved));
    const record = projectReaderRow(approved.payload.rows[0]).sections.packageRecord;
    assert.equal(record.body_you, imported.body_you);
    const renderer = createTransitSynastryRenderer({ authoredCards: [record] }, { templates: [] }, { hookRows: [], vocabularyRows: [] });
    assert.match(renderer.renderTransitAspect({ transiting: 'mars', natal: 'chiron', aspect: 'square', window: 'Until October 20, 2026' }).body, /New You passage/);
    assert.throws(() => renderer.renderTransitAspect({ transiting: 'mars', natal: 'chiron', aspect: 'square', copyVersion: 'alternate' }), /No verified alternate/);
  } finally { await store.close(); }
  assert.throws(() => newTransitCsvRow({ ...identity, content_key: 'authored/transit-aspect/mars/not-a-point/hard' }), /Invalid new/);
});


test('Lilith soft contacts require an exact approved saved passage; square remains unavailable', () => {
  const contentKey = 'authored/transit-aspect/venus/lilith/soft';
  const source = { contentKey, content_role: 'full_copy', review_status: 'approved',
    body_you: 'Through {{untilDate}}, Venus {{aspectWord}} your Lilith. Approved soft passage.',
    body_they: 'Through {{untilDate}}, Venus {{aspectWord}} their Lilith. Approved Friend soft passage.' };
  const create = record => createTransitSynastryRenderer({ authoredCards: [record] }, { templates: [] }, { hookRows: [], vocabularyRows: [] });
  assert.throws(() => create(source).renderTransitAspect({ transiting: 'venus', natal: 'lilith', aspect: 'trine' }), /SOURCE_GAP/);
  const approved = { ...source, approval: { approvalLevel: 'exact_owner_approved', recordPath: '/api/admin/generated-content?contentKey=' + contentKey,
    payloadSha256: 'a'.repeat(64), approvedAt: '2026-10-14T23:00:00Z' } };
  for (const aspect of ['trine', 'sextile']) for (const voice of ['you', 'Example Friend']) {
    assert.match(create(approved).renderTransitAspect({ transiting: 'venus', natal: 'lilith', aspect, voice, window: 'Until October 20, 2026' }).body, /Approved/);
  }
  assert.throws(() => create(approved).renderTransitAspect({ transiting: 'venus', natal: 'lilith', aspect: 'square' }), /SOURCE_GAP/);
});
