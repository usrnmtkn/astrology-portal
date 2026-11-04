import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { compiledReaderFixture, compiledReaderRow, compiledReaderCandidate } from '../tests/helpers/sky-saved-template-reader-fixtures.mts';
import { SKY_INGRESS_ESSAY_FORMAT, skyIngressEssayFields } from '../apps/web/src/content/skyIngressEssay.mjs';
import { reviseSkyArticleEdition, skyArticleEditableFields } from '../apps/web/src/content/skyArticleTemplateCompiler.ts';
import { approvedSkyArticleReaderEdition } from '../apps/web/src/content/skyArticleEditionReader.ts';
import { skyIngressEssayReaderSection } from '../apps/web/src/content/skyIngressEssayReader.ts';
import { skyArticleCompiledHashMatches } from '../api/_lib/sky-article-reader-integrity.ts';

// This actual-handler check has no database, owner session, or real transport.
// Production mode prevents the local-env helper from loading any credentials.
process.env.NODE_ENV = 'production';
process.env.SUPABASE_URL = 'https://sky-ingress-section.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-read-only';
const { default: readerHandler, readerRowIsEligible } = await import('../api/content-reader.ts');
const originalFetch = globalThis.fetch;
const context = { planet: 'mercury', sign: 'scorpio', activeInstant: '1901-11-01T12:00:00.000Z' };
const imported = await compiledReaderFixture({
  format: SKY_INGRESS_ESSAY_FORMAT, planet: 'mercury', sign: 'scorpio',
  entryYear: 1901, validFrom: '1901-10-24', validTo: '1901-11-13',
  transitStartInstant: '1901-10-24T00:00:00.000Z', transitEndInstant: '1901-11-13T00:00:00.000Z',
  slotValues: Object.fromEntries(skyIngressEssayFields.map(({ name }) => [name, `Synthetic complete ${name}.`])),
  housePassages: [], aspectPassages: []
});
const canonical = await reviseSkyArticleEdition(imported, {
  ...skyArticleEditableFields(imported),
  body: 'Synthetic complete opening.\n\nSynthetic complete final paragraph.'
});
const canonicalRow = compiledReaderRow(canonical);
const legacyRow = structuredClone(canonicalRow);
legacyRow.sections.skyArticleEdition.articleSections[0].heading = 'UNSIGNED_LEGACY_LABEL';
const publication = (row: typeof canonicalRow) => ({ content_key: row.content_key, state: 'live', revision: 1,
  row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at });
let selectedRow: any = canonicalRow;
let selectedPublication: any = publication(canonicalRow);
let calls = 0, contracts = 0;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  assert.equal(url.origin, process.env.SUPABASE_URL, 'Unknown network is forbidden');
  assert.equal(init.method ?? 'GET', 'GET', 'Reader storage is read-only');
  calls += 1;
  if (url.pathname === '/rest/v1/generated_interpretations') {
    assert.equal(url.searchParams.get('status'), 'eq.LIVE');
    assert.equal(url.searchParams.get('lane'), 'eq.serving');
    assert.equal(url.searchParams.get('review_state'), 'is.null');
    assert.ok(url.searchParams.get('content_key')?.includes(selectedRow.content_key));
    // Return adversarial lifecycle rows too, so handler admission must reject them.
    return Response.json([selectedRow]);
  }
  assert.equal(url.pathname, '/rest/v1/content_publications');
  return Response.json([
    { content_key: '__content-publication-ledger/v1', state: 'live', revision: 1,
      row_id: null, row_updated_at: null, updated_at: canonicalRow.updated_at },
    selectedPublication
  ]);
};

async function read(row: any, pin = publication(row)) {
  selectedRow = row; selectedPublication = pin;
  const req = { method: 'POST', url: '/api/content-reader', headers: {}, body: { keys: [row.content_key] } };
  const res = { statusCode: 200, value: {} as any, setHeader() {}, end(text: string) { this.value = JSON.parse(text); } };
  await readerHandler(req as any, res as any);
  assert.equal(res.statusCode, 200, JSON.stringify(res.value));
  assert.equal(res.value.schema, 'content-reader-row-v1');
  return res.value.rows as any[];
}

try {
  assert.equal(canonical.articleSections.length, 1);
  assert.equal(canonical.articleSections[0].heading, '');
  assert.equal(canonical.articleSections[0].body, canonical.body);
  assert.equal(skyArticleCompiledHashMatches(legacyRow.sections.skyArticleEdition), true);
  assert.equal((await read(canonicalRow)).length, 1, 'Modern canonical control is eligible'); contracts += 1;

  const before = JSON.stringify(legacyRow);
  const rows = await read(legacyRow);
  console.log(JSON.stringify({ legacyPredicate: readerRowIsEligible(legacyRow), legacyHandlerRows: rows.length,
    sourceUnchanged: JSON.stringify(legacyRow) === before, signedHashValid: true }));
  assert.equal(rows.length, 1, 'An intact approved legacy ingress must reach the actual reader handler');
  const projected = rows[0].sections.skyArticleEdition;
  assert.deepEqual(projected.articleSections, canonical.articleSections);
  assert.ok(!JSON.stringify(rows).includes('UNSIGNED_LEGACY_LABEL'), 'Unsigned labels never enter public presentation');
  assert.equal(rows[0].body, canonical.body);
  assert.equal(projected.compiledMarkdown, canonical.compiledMarkdown);
  assert.equal(projected.compiledHash, canonical.compiledHash);
  assert.deepEqual(rows[0].source_snapshot.ownerApproval, legacyRow.source_snapshot.ownerApproval);
  assert.equal(JSON.stringify(legacyRow), before, 'Read-time projection never edits stored source'); contracts += 1;

  // The client must also normalize already-cached pre-projection rows.
  const cached = skyIngressEssayReaderSection([compiledReaderCandidate(legacyRow)], context,
    () => publication(legacyRow) as any)!;
  assert.ok(cached);
  assert.equal(cached.body, canonical.body);
  assert.deepEqual(cached.articleSections.map(({ heading, body }) => ({ heading, body })), canonical.articleSections);
  assert.ok(!JSON.stringify(cached).includes('UNSIGNED_LEGACY_LABEL')); contracts += 1;

  const mutations: Array<[string, (row: any) => void]> = [
    ['top-level body', row => { row.body += ' Changed.'; }],
    ['summary', row => { row.summary += ' Changed.'; }],
    ['headline', row => { row.headline += ' Changed.'; }],
    ['embedded body', row => { row.sections.skyArticleEdition.body += ' Changed.'; row.body += ' Changed.'; }],
    ['section copy', row => { row.sections.skyArticleEdition.articleSections[0].body += ' Changed.'; }],
    ['extra section', row => { row.sections.skyArticleEdition.articleSections.push({ heading: '', body: 'Additional copy.' }); }],
    ['missing section', row => { row.sections.skyArticleEdition.articleSections = []; }],
    ['non-string label', row => { row.sections.skyArticleEdition.articleSections[0].heading = null; }],
    ['compiled H1', row => { row.headline += ' Changed'; row.sections.skyArticleEdition.headline += ' Changed'; }],
    ['approval', row => { row.source_snapshot.ownerApproval.approved = false; }],
    ['approval hash', row => { row.source_snapshot.ownerApproval.compiledHash = 'a'.repeat(64); }],
    ['identity', row => { row.sections.skyArticleEdition.contentKey += '/other'; }],
    ['draft', row => { row.status = 'DRAFT'; }],
    ['reference', row => { row.lane = 'reference'; }],
    ['review hold', row => { row.review_state = 'owner-review-required'; }],
    ['unknown format', row => { row.sections.skyArticleEdition.format = 'unknown'; }],
    ['ingress companion', row => { row.sections.skyArticleEdition.housePassages = [{ house: 1, body: 'Unrequested copy.' }]; }],
    ['invalid transit', row => { row.sections.skyArticleEdition.transitEndInstant = row.sections.skyArticleEdition.transitStartInstant; }]
  ];
  for (const [label, mutate] of mutations) {
    const row = structuredClone(legacyRow); mutate(row);
    assert.deepEqual(await read(row), [], 'Actual handler rejects ' + label);
    assert.equal(approvedSkyArticleReaderEdition(row), null, label); contracts += 1;
  }
  const hashDrift = structuredClone(legacyRow);
  hashDrift.sections.skyArticleEdition.tldr += ' Changed.';
  hashDrift.summary = hashDrift.sections.skyArticleEdition.tldr;
  assert.equal(skyArticleCompiledHashMatches(hashDrift.sections.skyArticleEdition), false);
  assert.deepEqual(await read(hashDrift), [], 'Matching duplicate fields cannot bypass a stale signed hash'); contracts += 1;

  for (const pin of [
    { ...publication(legacyRow), state: 'retired' },
    { ...publication(legacyRow), row_id: '00000000-0000-4000-8000-000000000099' },
    { ...publication(legacyRow), row_updated_at: '2026-11-03T00:00:00.000001Z' }
  ]) {
    assert.deepEqual(await read(legacyRow, pin), [], 'Exact publication identity/version remains required');
    assert.equal(skyIngressEssayReaderSection([compiledReaderCandidate(legacyRow)], context, () => pin as any), null); contracts += 1;
  }

  const headed = await reviseSkyArticleEdition(canonical, { ...skyArticleEditableFields(canonical),
    body: '## Signed heading\n\nSynthetic complete headed paragraph.' });
  const headedRow = compiledReaderRow(headed);
  assert.deepEqual((await read(headedRow))[0].sections.skyArticleEdition.articleSections, headed.articleSections);
  const changedHeading = structuredClone(headedRow);
  changedHeading.sections.skyArticleEdition.articleSections[0].heading = 'Unsigned replacement';
  assert.deepEqual(await read(changedHeading), [], 'Real compiled H2 headings cannot be relabeled'); contracts += 1;

  const saved = compiledReaderRow(await compiledReaderFixture());
  assert.equal((await read(saved))[0].sections.skyArticleEdition.housePassages.length, 12);
  const relabeledSaved = structuredClone(saved);
  relabeledSaved.sections.skyArticleEdition.articleSections[0].heading = 'Unsigned saved-template label';
  assert.deepEqual(await read(relabeledSaved), [], 'The ingress compatibility rule never widens saved templates');
  const incompleteSaved = structuredClone(saved);
  incompleteSaved.sections.skyArticleEdition.housePassages.pop();
  assert.deepEqual(await read(incompleteSaved), [], 'Saved templates retain all twelve companions'); contracts += 1;

  assert.equal(JSON.stringify(legacyRow), before);
  assert.equal(createHash('sha256').update(legacyRow.body).digest('hex'), createHash('sha256').update(canonical.body).digest('hex'));
  console.log(JSON.stringify({ passed: contracts, failed: 0, handlerStorageReads: calls,
    realNetwork: 0, productionWrites: 0, protectedInputs: false, sourceRowsUnchanged: true }));
} finally { globalThis.fetch = originalFetch; }
