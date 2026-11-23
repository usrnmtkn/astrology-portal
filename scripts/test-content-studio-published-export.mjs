#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exportContentStudioSnapshots } from './refresh-content-studio-last-known-good.mjs';
import { READER_ROW_SCHEMA, projectReaderRow } from '../apps/web/src/content/readerRowProjection.mjs';
import { validateRecoverySnapshot, validatePublishedSnapshot, validateSnapshotPair } from './lib/content-studio-snapshot.mjs';

const stamp = '2026-11-21T12:00:00.123456Z';
const row = (key, number, target_date = null) => ({ id: `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
  content_key: key, status: 'LIVE', lane: 'serving', review_state: null, target_date,
  updated_at: stamp, headline: 'Complete published headline', summary: 'Exact published summary.',
  body: 'First complete paragraph.\n\nSecond complete paragraph, including its punctuation!',
  sections: { body_you: 'The complete You reading.', body_they: 'The complete Friend reading.' },
  provider: 'owner-published' });
const durable = Array.from({ length: 110 }, (_, i) => row(`cms/synthetic-${i}`, i + 1));
const families = [
  ['horoscope/daily/2026-11-21', '2026-11-21'], ['horoscope/weekly/2026-11-16', '2026-11-16'],
  ['horoscope/monthly/2026-11', '2026-11-01'], ['horoscope/seasonal/2026-scorpio', '2026-10-23'],
  ['horoscope/planetary/chiron', '2026-11-21'], ['sky-article/dated-visit', '2026-08-01'],
  ['calendar/day/2026-11-21', '2026-11-21'], ['cms/lunation-article/2026-11-09', '2026-11-09'],
  ['article/manual/future-dated-but-already-released', '2027-01-01'],
  ['education/astro-101/example', null], ['house-horoscope-core/example', null],
  ['new-published-family/example', null]
];
const editions = families.map(([key, date], i) => row(key, i + 201, date));
editions[0].sections = { horoscopeEdition: { schema: 'horoscope-edition/v1',
  window: { period: 'daily', audience: 'sun', timeZone: 'America/New_York', startsAt: '2026-11-21T05:00:00Z', endsAt: '2026-11-22T05:00:00Z' },
  passages: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
    .map(sign => ({ sign, headline: `${sign} headline`, body: `${sign}: a complete, independently saved passage.\n\nAnd its second paragraph.` })) } };
editions[5].sections = { skyArticleEdition: { body: 'Complete compiled dated Sky article.',
  articleSections: [{ heading: 'Full article section', body: 'The complete saved section.' }],
  housePassages: [{ risingSign: 'aries', house: 1, body: 'Complete house passage.' }] } };
const scheduled = row('article/manual/scheduled-release', 300);
scheduled.sections.articlePublication = { publishAt: '2026-11-22T12:00:00.000Z', timeZone: 'UTC' };
const publication = r => ({ content_key: r.content_key, state: 'live', revision: 2,
  row_id: r.id, row_updated_at: r.updated_at, updated_at: stamp });
const sentinel = { content_key: '__content-publication-ledger/v1', state: 'live', revision: 1, updated_at: stamp };
let admitted = [...durable, ...editions,
  row(editions[0].content_key, 401, '2026-11-20'),
  { ...row(editions[0].content_key, 402, editions[0].target_date), mode: 'article' },
  row(durable[0].content_key, 403, '2026-11-20')];
let ledger = [sentinel, ...[...admitted, scheduled].filter(r => r.target_date == null).map(publication)];
let ledgerReads = 0, readerReads = 0, readerPasses = 0, changeDuringExport = false;
let readerFailure = null, ledgerChange = false, repeatCursor = false, truncate = false;
const fetchImpl = async (url, options) => {
  assert.notEqual(new URL(url).pathname, '/rest/v1/writing_run_archives', 'Public synchronization never reads private writing-run storage.');
  if (String(url).includes('/rest/v1/content_publications')) {
    ledgerReads += 1;
    const values = structuredClone(ledger);
    if (ledgerChange && ledgerReads % 2 === 0) values[1].revision += 1;
    return { ok: true, json: async () => values };
  }
  readerReads += 1;
  const query = JSON.parse(options.body);
  if (!query.afterId) readerPasses += 1;
  assert.equal(options.method, 'POST');
  assert.ok(!query.targetDate && !query.provider && !query.prefix && !query.horoscope, 'Enumeration cannot restrict families or editions.');
  if (readerFailure) return { ok: false, status: 503 };
  if (truncate) return { ok: true, json: async () => ({ schema: READER_ROW_SCHEMA, rows: [],
    nextCursor: String(readerReads).padStart(12, '0') }) };
  const offset = query.afterId ? admitted.findIndex(r => r.id === query.afterId) + 1 : 0;
  const batch = admitted.slice(offset, offset + 60).map(r => changeDuringExport && readerPasses % 2 === 0 && r.id === editions[0].id
    ? { ...r, updated_at: '2026-11-21T12:00:01Z', body: 'Concurrent dated revision.' } : r);
  return { ok: true, json: async () => ({ schema: READER_ROW_SCHEMA, rows: batch,
    nextCursor: repeatCursor ? admitted[59].id : offset + 60 < admitted.length ? batch.at(-1).id : null }) };
};
const directory = mkdtempSync(path.join(tmpdir(), 'studio-published-export-'));
const outPath = path.join(directory, 'runtime.json'), publishedPath = path.join(directory, 'published.json');
const exportAll = () => { ledgerReads = 0; readerPasses = 0; return exportContentStudioSnapshots({ outPath, publishedPath, fetchImpl, privacyPolicy: [], ifChanged: true }); };
const read = file => JSON.parse(readFileSync(file, 'utf8'));
try {
  const counts = await exportAll();
  assert.equal(counts.rowCount, durable.length);
  assert.equal(counts.publishedRowCount, admitted.length);
  const recovery = read(outPath), archive = read(publishedPath);
  validateSnapshotPair(recovery, archive, projectReaderRow);
  for (const source of admitted) assert.deepEqual(archive.rows.find(r => r.id === source.id), projectReaderRow(source));
  assert.deepEqual(archive.rows.find(r => r.id === editions[0].id).sections.horoscopeEdition.passages, editions[0].sections.horoscopeEdition.passages);
  assert.equal(archive.rows.some(r => r.id === scheduled.id), false, 'The public reader withholds scheduled, not-yet-released writing.');
  assert.equal(archive.rows.filter(r => r.content_key === editions[0].content_key).length, 3, 'Different dated/mode instances never overwrite each other.');
  assert.equal(recovery.rows.some(r => r.target_date != null), false, 'Archived dates never become current runtime fallback.');
  assert.throws(() => validateRecoverySnapshot(archive, projectReaderRow), /Invalid public/u);
  assert.throws(() => validateRecoverySnapshot({ ...archive, schema: recovery.schema }, projectReaderRow), /Invalid public/u);
  const initialReads = readerReads;
  await exportAll();
  assert.ok(readerReads > initialReads, 'All-published synchronization checks release timing even with unchanged metadata.');
  assert.deepEqual(read(publishedPath), archive, 'No clock timestamp creates artificial changes.');

  // Simulate the reader admitting a scheduled release after its time arrives,
  // without a ledger update. Its exact stored release schedule is preserved.
  admitted.push(scheduled);
  await exportAll();
  assert.deepEqual(read(publishedPath).rows.find(r => r.id === scheduled.id), scheduled);
  assert.deepEqual(read(outPath), recovery, 'An archive-only release leaves runtime recovery unchanged.');

  // Newer private drafts are not on the controlled reader. The published row
  // stays byte-for-byte unchanged until the reader admits another publication.
  const privateDraft = { ...editions[0], id: 'private-draft', status: 'DRAFT', body: 'Unpublished private replacement.' };
  assert.ok(!read(publishedPath).rows.some(r => r.id === privateDraft.id || r.body === privateDraft.body));
  const privateRun = { request_body: 'Exact private writer request', evidence: { fields: [{ pointer: '/input', value: 'Private selected evidence' }] } };
  admitted[durable.length] = { ...editions[0], privateWriterHistory: 'Never exported', writing_run_archives: [privateRun], ...privateRun,
    source_snapshot: { writerRuns: ['Private prompt and output'], judgeRuns: ['Private verdict'], savedWritingStyle: 'Private style', privateFeedback: 'Private feedback' },
    sections: { ...editions[0].sections, privateRejections: ['Never exported'], prompt: 'Private prompt', rawOutput: 'Private output' } };
  await exportAll();
  assert.deepEqual(read(publishedPath).rows.find(r => r.id === editions[0].id), { ...projectReaderRow(editions[0]), source_snapshot: {} });

  const unchanged = [readFileSync(outPath, 'utf8'), readFileSync(publishedPath, 'utf8')];
  const rejectsUnchanged = async (pattern) => {
    await assert.rejects(exportAll(), pattern);
    assert.equal(readFileSync(outPath, 'utf8'), unchanged[0]);
    assert.equal(readFileSync(publishedPath, 'utf8'), unchanged[1]);
  };
  changeDuringExport = true; await rejectsUnchanged(/inventory changed/u); changeDuringExport = false;
  ledgerChange = true; await rejectsUnchanged(/changed during export/u); ledgerChange = false;
  readerFailure = true; await rejectsUnchanged(/503/u); readerFailure = false;
  repeatCursor = true; await rejectsUnchanged(/did not advance/u); repeatCursor = false;
  truncate = true; await rejectsUnchanged(/safety limit/u); truncate = false;
  const good = admitted[durable.length];
  const undated = admitted[0];
  admitted[0] = { ...undated, updated_at: '2026-11-21T12:00:00.123457Z' };
  await rejectsUnchanged(/publication identity/u); admitted[0] = undated;
  admitted.push(good); await rejectsUnchanged(/Invalid public/u); admitted.pop();
  admitted[durable.length] = { ...good, status: 'DRAFT' }; await rejectsUnchanged(/Invalid public/u); admitted[durable.length] = good;
  admitted[durable.length] = { ...good, target_date: '2026-02-30' }; await rejectsUnchanged(/Invalid public/u); admitted[durable.length] = good;
  const corrupted = structuredClone(read(publishedPath)); corrupted.rows[0].privateFeedback = 'Never allowed';
  assert.throws(() => validatePublishedSnapshot(corrupted, projectReaderRow), /Invalid public/u);

  // Retirements remove current text from both views while Git preserves earlier
  // public snapshots. Deleting the source row still retains its ledger tombstone.
  const removed = admitted.shift();
  admitted = admitted.filter(r => r.content_key !== removed.content_key);
  ledger = ledger.map(p => p.content_key === removed.content_key ? { ...p, state: 'retired', revision: p.revision + 1 } : p);
  await exportAll();
  for (const file of [outPath, publishedPath]) {
    assert.equal(read(file).rows.some(r => r.content_key === removed.content_key), false);
    assert.equal(read(file).publications.find(p => p.content_key === removed.content_key).state, 'retired');
  }
  const datedVersion = admitted.find(r => r.id === editions[0].id);
  const beforeDatedLedger = JSON.stringify(ledger);
  admitted = admitted.map(r => r.id === datedVersion.id ? { ...r, updated_at: '2026-11-22T12:00:00.000001Z', body: 'The newly published dated replacement.\n\nComplete second paragraph.' } : r);
  await exportAll();
  assert.equal(read(publishedPath).rows.find(r => r.id === datedVersion.id).body, admitted.find(r => r.id === datedVersion.id).body);
  admitted = admitted.filter(r => r.id !== datedVersion.id);
  await exportAll();
  assert.equal(read(publishedPath).rows.some(r => r.id === datedVersion.id), false, 'Deleted dated instances leave the current archive.');
  assert.equal(JSON.stringify(ledger), beforeDatedLedger, 'Dated changes are detected without a reusable-key ledger change.');
  assert.equal(readdirSync(directory).some(file => file.endsWith('.tmp')), false);
} finally { rmSync(directory, { recursive: true, force: true }); }
console.log(`Published Studio export contracts passed: ${families.length} dated/undated family fixtures, complete prose, timing, version identity, retirement, pagination, privacy and failure preservation.`);
