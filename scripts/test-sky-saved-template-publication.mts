import assert from 'node:assert/strict';
import { compiledReaderFixture, compiledReaderRow, compiledReaderCandidate } from '../tests/helpers/sky-saved-template-reader-fixtures.mts';
import { skyArticlePublicationStore } from '../tests/helpers/sky-article-publication-store.mts';
import { skyIngressEssayPublicationKeys, skyIngressEssayReaderSection } from '../apps/web/src/content/skyIngressEssayReader.ts';
import { approvedSkyArticleReaderEdition, skyArticleReaderMarkdown } from '../apps/web/src/content/skyArticleEditionReader.ts';
import { reviseSkyArticleEdition, skyArticleEditableFields } from '../apps/web/src/content/skyArticleTemplateCompiler.ts';
import { skyArticleCompiledHashMatches } from '../api/_lib/sky-article-reader-integrity.ts';

const edition = await compiledReaderFixture();
const initial = { ...compiledReaderRow(edition), status: 'DRAFT', lane: 'reference', review_state: 'owner-review-required',
  target_date: null, source_snapshot: { privateNotes: 'PRIVATE_SAVED_TEMPLATE_CANARY', review_status: 'needs_review' },
  sections: { skyArticleEdition: edition, privateNotes: 'PRIVATE_SAVED_TEMPLATE_CANARY' } };
const unrelated = { ...initial, id: '00000000-0000-4000-8000-000000000002', content_key: 'article/manual/unrelated-reader-fixture',
  headline: 'Synthetic unrelated article', summary: '', body: 'Synthetic complete unrelated opening.\n\nSynthetic unrelated final sentence.',
  event_type: 'sky_article', block_type: null, lane: 'serving', review_state: null, sections: {}, source_snapshot: {} };
const store = await skyArticlePublicationStore([initial, unrelated]);
const context = { activeInstant: '1901-11-01T12:00:00.000Z', planet: 'sun', sign: 'scorpio' };
const read = (query: Record<string, unknown> = { keys: [initial.content_key] }) => store.invoke('/api/content-reader', query);
const approve = (version: string, authorized = true) => store.invoke('/api/admin/generated-content',
  { id: initial.id, expectedUpdatedAt: version, ownerAction: 'approve-sky-article-edition' }, authorized);
try {
  assert.equal((await read()).status, 200);
  assert.deepEqual((await read()).rows, [], 'Draft edition has no anonymous projection');
  assert.equal((await approve(initial.updated_at, false)).status, 401);
  assert.equal((await approve('1901-01-01T00:00:00.000Z')).status, 409);
  assert.equal((await store.db.query('select * from content_publications where content_key=$1', [initial.content_key])).rows.length, 0);

  const opened = (await store.db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [initial.id])).rows[0].row as any;
  const result = await approve(opened.updated_at);
  assert.equal(result.status, 200, JSON.stringify(result));
  const published = result.rows[0];
  assert.equal(published.body, edition.body);
  assert.deepEqual(published.sections.skyArticleEdition, edition, 'Publication never rewrites compiled copy or companions');
  assert.equal(published.source_snapshot.ownerApproval.compiledHash, edition.compiledHash);
  const exactLedger = (await store.db.query('select to_jsonb(p) as row from content_publications p where content_key=$1', [initial.content_key])).rows[0].row as any;
  assert.equal(exactLedger.row_id, initial.id);
  assert.equal(Date.parse(exactLedger.row_updated_at), Date.parse(published.updated_at));
  assert.deepEqual(skyIngressEssayPublicationKeys([exactLedger], context), [edition.contentKey]);
  for (const query of [{ keys: [edition.contentKey] }, { ids: [published.id] }, { prefix: 'sky-article/' }, { surfaces: ['sky'] }]) {
    const response = await read(query);
    assert.equal(response.status, 200, JSON.stringify(response));
    assert.equal(response.rows.length, 1);
    assert.ok(!JSON.stringify(response).includes('PRIVATE_SAVED_TEMPLATE_CANARY'), 'Reader projection excludes private Studio metadata');
    const row = response.rows[0];
    const { slotValues: privateSourceValues, ...publicEdition } = edition;
    assert.ok(privateSourceValues);
    assert.deepEqual(row.sections.skyArticleEdition, publicEdition, 'Anonymous projection retains all compiled reader fields');
    assert.ok(!Object.hasOwn(row.sections.skyArticleEdition, 'slotValues'), 'Authoring source values stay private');
    const approved = approvedSkyArticleReaderEdition(row)!;
    assert.ok(approved);
    const article = skyArticleReaderMarkdown(approved);
    assert.ok(article.includes('Synthetic saved-template opening.'));
    assert.ok(article.includes('Synthetic final general sentence.'));
    for (const passage of edition.housePassages) assert.ok(article.includes(passage.body));
    const candidate = compiledReaderCandidate(row);
    const selected = skyIngressEssayReaderSection([candidate], context, () => exactLedger)!;
    assert.equal(selected.body, edition.body);
    assert.deepEqual(selected.risingHoroscopes, edition.housePassages);
    assert.equal(skyIngressEssayReaderSection([candidate], { ...context, activeInstant: edition.transitEndInstant }), null);
  }
  assert.equal((await approve(initial.updated_at)).status, 409, 'Old saved versions cannot republish');

  for (const mutation of ["state='retired'", "row_id='00000000-0000-4000-8000-000000000099'", "row_updated_at=row_updated_at+interval '1 microsecond'"]) {
    await store.db.query(`update content_publications set ${mutation} where content_key=$1`, [edition.contentKey]);
    assert.deepEqual((await read()).rows, [], 'Retirement and exact SQL identity/version gates refuse publication');
    await store.db.query('update content_publications set state=$2,row_id=$3,row_updated_at=$4 where content_key=$1',
      [edition.contentKey, exactLedger.state, exactLedger.row_id, exactLedger.row_updated_at]);
  }
  await store.db.query('delete from content_publications where content_key=$1', [edition.contentKey]);
  assert.deepEqual((await read()).rows, [], 'A live label without a publication record is private');
  const repaired = await approve(published.updated_at);
  assert.equal(repaired.status, 200, JSON.stringify(repaired));
  assert.equal((await read()).rows[0].body, edition.body, 'Exact owner approval can repair a missing ledger without rewriting');

  const baseline = (await store.db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [published.id])).rows[0].row as any;
  const baselineLedger = (await store.db.query('select to_jsonb(p) as row from content_publications p where content_key=$1', [edition.contentKey])).rows[0].row as any;
  const openedUnrelated = (await store.db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [unrelated.id])).rows[0].row as any;
  const unrelatedPublication = await store.invoke('/api/admin/generated-content', { id: unrelated.id,
    expectedUpdatedAt: openedUnrelated.updated_at, ownerAction: 'publish-owner-content' });
  assert.equal(unrelatedPublication.status, 200, JSON.stringify(unrelatedPublication));
  const save = async (row: any) => {
    await store.db.query('update generated_interpretations set (status,lane,review_state,headline,summary,body,sections,source_snapshot)=\
      (select status,lane,review_state,headline,summary,body,sections,source_snapshot from jsonb_populate_record(null::generated_interpretations,$1)) where id=$2',
      [JSON.stringify(row), row.id]);
  };
  const mutations: Array<[string, (row: any) => void]> = [
    ['draft', row => { row.status = 'DRAFT'; }],
    ['reference', row => { row.lane = 'reference'; }],
    ['review hold', row => { row.review_state = 'owner-review-required'; }],
    ['body drift', row => { row.body += ' Changed.'; }],
    ['approval hash drift', row => { row.source_snapshot.ownerApproval.compiledHash = 'altered'; }],
    ['extra house property outside the approved hash', row => { row.sections.skyArticleEdition.housePassages[0].extra = 'Changed.'; }],
    ['house drift', row => { row.sections.skyArticleEdition.housePassages[11].body += ' Changed.'; }],
    ['matching house and markdown drift under old approval', row => {
      const saved = row.sections.skyArticleEdition;
      const old = saved.housePassages[11].body;
      saved.housePassages[11].body += ' Changed.';
      saved.compiledMarkdown = saved.compiledMarkdown.replace(old, saved.housePassages[11].body);
    }]
  ];
  for (const [label, mutate] of mutations) {
    assert.equal((await read()).rows[0]?.body, edition.body, 'Each refusal starts from a reader-verified publication: ' + label);
    const changed = structuredClone(baseline); mutate(changed); await save(changed);
    assert.deepEqual((await read()).rows, [], 'Actual reader refuses ' + label);
    const mixed = await read({ keys: [edition.contentKey, unrelated.content_key] });
    assert.equal(mixed.status, 200);
    assert.deepEqual(mixed.rows.map((row: any) => [row.content_key, row.body]), [[unrelated.content_key, unrelated.body]], 'Refusing one edition leaves unrelated reader copy available');
    await save(baseline);
    await store.db.query('update content_publications set state=$2,row_id=$3,row_updated_at=$4 where content_key=$1',
      [edition.contentKey, baselineLedger.state, baselineLedger.row_id, baselineLedger.row_updated_at]);
  }
  assert.equal((await read()).rows[0].body, edition.body);
  console.log('PASS saved-template actual owner action → SQL publication ledger → anonymous reader → complete general/12-house delivery, private metadata, stale versions, retirement and tamper refusals.');
} finally { await store.close(); }

for (const construction of ['imported', 'hydrated-imported', 'natural-sign-imported', 'revised'] as const) {
  const section = { schema: 'sky-article-horoscopes-v1', heading: '## Horoscopes for every rising sign', introduction: 'Synthetic companion introduction.',
    passages: edition.housePassages.map(({ risingSign, house, body }) => ({ risingSign, house,
      heading: '### ' + risingSign![0].toUpperCase() + risingSign!.slice(1) + ' & ' + risingSign![0].toUpperCase() + risingSign!.slice(1) + ' Rising', body })) };
  if (construction === 'natural-sign-imported') {
    const signs = 'aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces'.split(' ');
    section.passages.sort((a, b) => signs.indexOf(a.risingSign!) - signs.indexOf(b.risingSign!));
  }
  // Model the actual imported source-template hydration separately from the
  // compiled edition's later JSONB roundtrip.
  const staging = await skyArticlePublicationStore([]);
  let compiled;
  try {
    const sections = construction === 'hydrated-imported'
      ? (await staging.db.query('select $1::jsonb as value', [JSON.stringify({ articleHoroscopes: section })])).rows[0].value
      : { articleHoroscopes: section };
    compiled = await compiledReaderFixture({ templateBody: '# Synthetic imported article\n\nSynthetic imported opening.\n\nSynthetic imported final sentence.',
      templateSections: sections });
    if (construction === 'revised') {
      const hydrated = (await staging.db.query('select $1::jsonb as value', [JSON.stringify(compiled)])).rows[0].value as typeof compiled;
      compiled = await reviseSkyArticleEdition(hydrated, { ...skyArticleEditableFields(hydrated), body: hydrated.body + '\n\nSynthetic complete revised ending.' });
      assert.ok(compiled.compiledMarkdown.includes('Synthetic companion introduction.'), 'A revision retains the complete existing horoscope introduction');
      assert.ok(compiled.compiledMarkdown.includes(section.heading + '\n'), 'A revision retains the existing authored horoscope heading');
      assert.deepEqual(compiled.housePassages, hydrated.housePassages, 'General-only revisions retain every complete companion and its identity');
    }
  } finally { await staging.close(); }
  const draft = { ...compiledReaderRow(compiled), status: 'DRAFT', lane: 'reference', review_state: 'owner-review-required',
    target_date: null, source_snapshot: { review_status: 'needs_review' } };
  const lifecycle = await skyArticlePublicationStore([draft]);
  try {
    const opened = (await lifecycle.db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [draft.id])).rows[0].row as any;
    assert.equal(skyArticleCompiledHashMatches(opened.sections.skyArticleEdition), true, construction + ' hash survives actual JSONB roundtrip');
    assert.equal(opened.sections.skyArticleEdition.housePassages[0].heading, section.passages.find(passage => passage.house === 1)!.heading, 'Imported heading metadata stays in the hashed input');
    const published = await lifecycle.invoke('/api/admin/generated-content', { id: draft.id, expectedUpdatedAt: opened.updated_at,
      ownerAction: 'approve-sky-article-edition' });
    assert.equal(published.status, 200, JSON.stringify(published));
    const response = await lifecycle.invoke('/api/content-reader', { keys: [compiled.contentKey] });
    assert.equal(response.status, 200);
    assert.equal(response.rows.length, 1, construction + ' remains publicly readable');
    assert.equal(response.rows[0].sections.skyArticleEdition.compiledMarkdown, compiled.compiledMarkdown);
    assert.deepEqual(response.rows[0].sections.skyArticleEdition.housePassages.map((passage: any) => passage.body), compiled.housePassages.map(passage => passage.body));
    const selected = skyIngressEssayReaderSection([compiledReaderCandidate(response.rows[0])], context)!;
    assert.ok(selected.articleSections.some(section => section.body === 'Synthetic companion introduction.'), construction + ': Sky retains the complete authored horoscope introduction');
  } finally { await lifecycle.close(); }
}
console.log('PASS stored hash compatibility: generic, imported, hydrated-imported and revised editions roundtrip actual JSONB with original hashes and complete reader copy.');
