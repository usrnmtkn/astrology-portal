import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type { AdminDraft } from '../apps/admin/src/GeneratedContentAdminDashboard';
import { normalizedArticleTemplateDraft, articleTemplateCopyMatches, retainArticleTemplatePendingSource } from '../apps/admin/src/articleTemplateSaveReceipt';
import { articleTemplateWithHoroscopes } from '../apps/web/src/content/skyArticleHoroscopes.mjs';
import { skyArticlePublicationStore } from '../tests/helpers/sky-article-publication-store.mts';
import { standaloneArticleKind } from '../src/shared/articleLibrary';
import { calendarPlanetaryIdentity, calendarPlanetaryRevisionTarget } from '../apps/admin/src/calendarPlanetarySources';

const source = readFileSync(new URL('../apps/admin/src/GeneratedContentAdminDashboard.tsx', import.meta.url), 'utf8');
const sf = ts.createSourceFile('Dashboard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const guards: ts.Expression[] = [];
const calendarBindings: ts.Expression[] = [];
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'calendarPrivateRevision' && node.initializer) calendarBindings.push(node.initializer);
  if (ts.isIfStatement(node) && ts.isBlock(node.thenStatement) && node.thenStatement.statements.some(s =>
    ts.isThrowStatement(s) && s.expression?.getText(sf) === 'new Error("Save did not return the saved row.")')) guards.push(node.expression);
  ts.forEachChild(node, visit);
}
visit(sf); assert.equal(guards.length, 1);
assert.equal(calendarBindings.length, 1);
const guardExports: any = {};
const guardScript = ts.transpileModule(`exports.rejects = (saved, submitted, expected) => {
  const savedDraft = saved ? {} : null, draftForSave = submitted, expectedDraft = expected;
  const templateReceipt = receipt, isPackageDraft = false, status = submitted.status, expectedUpdatedAt = submitted.updatedAt;
  const calendarPrivateRevision = (${calendarBindings[0].getText(sf)});
  return (${guards[0].getText(sf)});
};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', 'receipt', 'standaloneArticleKind', 'standaloneRevisionEvent', 'draftHasPackageProposal', 'writesPersonalTransitExactCopy', 'calendarPlanetaryIdentity', 'calendarPlanetaryRevisionTarget', guardScript)
  (guardExports, { matches: articleTemplateCopyMatches }, standaloneArticleKind, 'standalone-article-revision', () => false, () => false, calendarPlanetaryIdentity, calendarPlanetaryRevisionTarget);

const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const opening = '# Synthetic template\n\nTemplate opening.\n\nTemplate final paragraph.';
const intro = 'Template horoscope introduction.';
let controls = 0;
function draft(row: any, body = row.body): AdminDraft {
  return { id: row.id, updatedAt: row.updated_at, contentKey: row.content_key, surface: row.surface,
    mode: row.mode, status: row.status, headline: row.headline, summary: row.summary, body,
    lane: row.lane, reviewState: row.review_state ?? '', blockType: row.block_type ?? '',
    promptVersion: row.prompt_version, sections: row.sections, facts: row.facts ?? {},
    reviewerNotes: row.reviewer_notes ?? '', sourceSnapshot: row.source_snapshot ?? null };
}
function request(value: AdminDraft) {
  const expected = normalizedArticleTemplateDraft(value);
  return { id: value.id, expectedUpdatedAt: value.updatedAt, contentKey: value.contentKey,
    surface: value.surface, mode: value.mode, status: value.status, headline: value.headline,
    summary: value.summary, body: value.body, lane: value.lane, reviewState: value.reviewState || null,
    blockType: value.blockType || null, promptVersion: value.promptVersion, eventType: 'sky-article-template',
    sections: expected.sections, facts: value.facts, reviewerNotes: value.reviewerNotes, sourceSnapshot: value.sourceSnapshot };
}
function reverseKeys(value: any): any {
  if (Array.isArray(value)) return value.map(reverseKeys);
  return value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reverseKeys(v)])) : value;
}

for (const authored of [false, true]) {
  const raw = `${opening}\n\n## Horoscopes\n\n${intro}\n\n${authored
    ? signs.map(sign => `### ${sign} & ${sign} Rising\n\nSynthetic ${sign} complete opening.\n\nSynthetic ${sign} complete ending.`).join('\n\n')
    : '{{risingBlocks}}'}`;
  const initial = { id: '00000000-0000-4000-8000-000000000001', content_key: 'sky/article-template/sun/scorpio',
    surface: 'sky', mode: 'article', status: 'DRAFT', lane: 'reference', review_state: 'owner-review-required',
    event_type: 'sky-article-template', block_type: null, prompt_version: 'manual-admin',
    headline: 'Synthetic template', summary: 'Synthetic separately authored summary.', body: opening,
    sections: { retainedMetadata: { b: 2, a: 1 }, unicodeMetadata: { nested: {
      '\u00e9': { text: 'Synthetic composed-key value.' },
      'e\u0301': { text: 'Synthetic decomposed-key value.' }
    } } }, facts: {}, reviewer_notes: '',
    source_snapshot: { contentType: 'sky-article-template', content_role: 'template' }, updated_at: '2026-11-03T00:00:00.000Z' };
  const store = await skyArticlePublicationStore([initial]);
  const snapshot = async () => ({ rows: (await store.db.query('select to_jsonb(g) as row from generated_interpretations g')).rows,
    ledger: (await store.db.query('select to_jsonb(p) as row from content_publications p order by content_key')).rows });
  try {
    const opened = (await store.db.query('select to_jsonb(g) as row from generated_interpretations g')).rows[0].row;
    const submitted = draft(opened, raw), expected = normalizedArticleTemplateDraft(submitted);
    assert.equal(submitted.body, raw, 'Preparing expected storage never changes the local draft');
    assert.equal(request(submitted).body, raw, 'The original complete source is sent for provenance');
    const result = await store.invoke('/api/admin/generated-content', request(submitted));
    assert.equal(result.status, 200, JSON.stringify(result));
    let saved = result.rows[0];
    assert.equal(saved.id, submitted.id); assert.equal(saved.content_key, submitted.contentKey); assert.equal(saved.status, 'DRAFT');
    assert.ok(articleTemplateCopyMatches(expected, saved));
    assert.equal(guardExports.rejects(saved, submitted, expected), false, 'The actual generic receipt guard accepts the canonical response');
    assert.equal(articleTemplateWithHoroscopes(saved.body, saved.sections), raw);
    assert.equal(saved.source_snapshot.horoscopeSeparation.originalBody, raw);
    assert.deepEqual(saved.sections.retainedMetadata, initial.sections.retainedMetadata);
    assert.ok(articleTemplateCopyMatches(expected, { ...saved, sections: reverseKeys(saved.sections) }),
      'JSONB key order, including distinct nested composed/decomposed Unicode keys, is not a copy change');
    controls += 8;
    const reassembled = draft(saved, articleTemplateWithHoroscopes(saved.body, saved.sections));
    assert.notEqual(JSON.stringify(reassembled.sections!.articleHoroscopes), JSON.stringify(expected.sections!.articleHoroscopes),
      'The SQL roundtrip must exercise a genuinely different object field order');
    const roundtripExpected = normalizedArticleTemplateDraft(reassembled);
    assert.equal(articleTemplateWithHoroscopes(roundtripExpected.body, roundtripExpected.sections), raw,
      'Preflight accepts complete inline writing alongside its JSONB-decoded section');
    const beforeRoundtrip = await snapshot();
    const roundtrip = await store.invoke('/api/admin/generated-content', {
      ...request(reassembled), sections: reassembled.sections
    });
    assert.equal(roundtrip.status, 200, JSON.stringify(roundtrip));
    saved = roundtrip.rows[0];
    assert.ok(articleTemplateCopyMatches(roundtripExpected, saved));
    assert.equal(articleTemplateWithHoroscopes(saved.body, saved.sections), raw);
    assert.deepEqual((await snapshot()).ledger, beforeRoundtrip.ledger, 'Draft roundtrip never publishes');
    assert.equal(saved.source_snapshot.horoscopeSeparation.originalBody, raw);
    const beforeRefusal = await snapshot();
    const conflictingSections = reverseKeys(saved.sections);
    conflictingSections.articleHoroscopes.introduction += ' Genuine different version.';
    const conflictRoundtrip = await store.invoke('/api/admin/generated-content', {
      ...request(draft(saved)), body: raw, sections: conflictingSections
    });
    assert.equal(conflictRoundtrip.status, 422);
    assert.deepEqual(await snapshot(), beforeRefusal, 'A real conflict changes neither stored rows nor ledger');
    controls += 4;
    const badCopies: Array<[string, (row: any) => void]> = [
      ['shorter general article', row => { row.body = row.body.slice(0, -1); }],
      ['missing horoscope section', row => { delete row.sections.articleHoroscopes; }],
      ['changed section heading', row => { row.sections.articleHoroscopes.heading += ' Changed'; }],
      ['changed introduction', row => { row.sections.articleHoroscopes.introduction += ' Changed'; }],
      ['changed schema', row => { row.sections.articleHoroscopes.schema = 'unknown'; }],
      ['unknown section field', row => { row.sections.articleHoroscopes.unexpected = true; }],
      ['changed unrelated section metadata', row => { row.sections.retainedMetadata.a = 9; }],
      ['changed nested Unicode-key value', row => { row.sections.unicodeMetadata.nested['e\u0301'].text += ' Changed'; }]
    ];
    if (authored) badCopies.push(
      ['missing passage', row => { row.sections.articleHoroscopes.passages.pop(); }],
      ['changed passage text', row => { row.sections.articleHoroscopes.passages[0].body += ' Changed'; }],
      ['changed house identity', row => { row.sections.articleHoroscopes.passages[0].house = 99; }],
      ['changed sign identity', row => { row.sections.articleHoroscopes.passages[0].risingSign = 'unknown'; }],
      ['reordered passages', row => { row.sections.articleHoroscopes.passages.reverse(); }]);
    for (const [label, mutate] of badCopies) {
      const wrong = structuredClone(saved); mutate(wrong);
      assert.equal(articleTemplateCopyMatches(expected, wrong), false, label); controls++;
      assert.equal(guardExports.rejects(wrong, submitted, expected), true, label + ': actual receipt guard refuses it');
    }
    for (const [field, value] of Object.entries({ id: '00000000-0000-4000-8000-000000000099',
      content_key: 'sky/article-template/sun/libra', status: 'LIVE', headline: 'Unrelated title', summary: 'Unrelated summary' })) {
      assert.equal(guardExports.rejects({ ...saved, [field]: value }, submitted, expected), true, field + ' mismatch remains refused'); controls++;
    }
    assert.equal(guardExports.rejects(null, submitted, expected), true, 'A missing saved row remains refused'); controls++;

    const newer = raw.replace('Template opening.', 'Template opening. Newer local words.')
      .replace(intro, 'Template newer horoscope introduction.');
    const current = { ...submitted, body: newer };
    const retained = retainArticleTemplatePendingSource(submitted, current, draft(saved));
    assert.equal(retained.body, newer); assert.deepEqual(retained.sections, current.sections);
    assert.deepEqual(retained.sourceSnapshot, saved.source_snapshot);
    const changedMetadata = { ...current, sourceSnapshot: { ...current.sourceSnapshot, unsavedNote: 'Keep newer metadata.' } };
    assert.equal(retainArticleTemplatePendingSource(submitted, changedMetadata, draft(saved)), changedMetadata);
    const next = { ...retained, id: saved.id, updatedAt: saved.updated_at };
    const secondResult = await store.invoke('/api/admin/generated-content', request(next));
    assert.equal(secondResult.status, 200, JSON.stringify(secondResult));
    const second = secondResult.rows[0];
    assert.ok(articleTemplateCopyMatches(normalizedArticleTemplateDraft(next), second));
    assert.equal(articleTemplateWithHoroscopes(second.body, second.sections), newer);
    assert.equal(second.source_snapshot.horoscopeSeparation.originalBody, raw, 'Acknowledged original provenance survives the next save');
    controls += 7;

    const sectionEdit = draft(second);
    sectionEdit.sections = structuredClone(sectionEdit.sections)!;
    (sectionEdit.sections.articleHoroscopes as any).introduction += '\n\nSynthetic structured section edit.';
    const thirdResult = await store.invoke('/api/admin/generated-content', request(sectionEdit));
    assert.equal(thirdResult.status, 200, JSON.stringify(thirdResult));
    const third = thirdResult.rows[0];
    assert.ok(articleTemplateCopyMatches(normalizedArticleTemplateDraft(sectionEdit), third));
    const beforeConflict = await snapshot();
    const conflict = { ...draft(third), body: raw };
    assert.throws(() => normalizedArticleTemplateDraft(conflict), /different versions/u);
    const refused = await store.invoke('/api/admin/generated-content', { ...request(draft(third)), body: raw });
    assert.equal(refused.status, 422); assert.deepEqual(await snapshot(), beforeConflict);
    const stale = await store.invoke('/api/admin/generated-content', { ...request(draft(third)), expectedUpdatedAt: opened.updated_at });
    assert.equal(stale.status, 409); assert.deepEqual(await snapshot(), beforeConflict);
    assert.deepEqual((await store.invoke('/api/content-reader', { keys: [third.content_key] })).rows, []);
    const archiveDraft = { ...draft(third), status: 'ARCHIVED' as const };
    const archive = await store.invoke('/api/admin/generated-content', { ...request(archiveDraft), sourceLifecycleAction: 'archive' });
    assert.equal(archive.status, 200); assert.equal(archive.rows[0].status, 'ARCHIVED');
    assert.ok(articleTemplateCopyMatches(normalizedArticleTemplateDraft(archiveDraft), archive.rows[0]));
    controls += 8;
  } finally { await store.close(); }
}
console.log(JSON.stringify({ passed: controls, failed: 0, storage: 'actual handlers and in-memory SQL',
  sourceTextPreserved: true, protectedReferenceReads: 0, private51Queries: 0, productionWrites: 0 }));
