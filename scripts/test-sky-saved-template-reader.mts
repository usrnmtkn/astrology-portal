import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { compiledReaderFixture, compiledReaderRow, compiledReaderCandidate } from '../tests/helpers/sky-saved-template-reader-fixtures.mts';
import { approvedSkyArticleReaderEdition, skyArticleReaderMarkdown } from '../apps/web/src/content/skyArticleEditionReader.ts';
import { isGeneratedContentReaderBoundaryAllowed } from '../apps/web/src/content/generatedContentEligibility.ts';
import { skyIngressEssayPublicationKeys, skyIngressEssayReaderSection } from '../apps/web/src/content/skyIngressEssayReader.ts';
import { SKY_INGRESS_ARTICLE_FORMAT } from '../apps/web/src/content/skyIngressEssay.mjs';
import { reviseSkyArticleEdition, skyArticleEditableFields } from '../apps/web/src/content/skyArticleTemplateCompiler.ts';
import { skyMoonDatedDayBounds } from '../src/shared/skyMoonDatedScope.ts';
import type { ContentPublication } from '../apps/web/src/content/contentPublicationState.ts';

const edition = await compiledReaderFixture();
const saved = compiledReaderRow(edition);
const context = { activeInstant: '1901-11-01T12:00:00.000Z', planet: 'sun', sign: 'scorpio' };
const publication: ContentPublication = { content_key: saved.content_key, state: 'live', revision: 1,
  row_id: saved.id, row_updated_at: saved.updated_at, updated_at: saved.updated_at };
const select = (rows = [saved], at = context.activeInstant) => skyIngressEssayReaderSection(rows.map(compiledReaderCandidate), { ...context, activeInstant: at });

await test('approved saved-template delivers its complete general copy and twelve companions', () => {
  assert.equal(approvedSkyArticleReaderEdition(saved), edition);
  assert.equal(isGeneratedContentReaderBoundaryAllowed(saved), true);
  const selected = select()!;
  assert.equal(selected.body, edition.body);
  assert.equal(selected.tldr, edition.tldr);
  assert.deepEqual(selected.risingHoroscopes, edition.housePassages);
  assert.equal(selected.risingHoroscopes.length, 12);
  assert.deepEqual(selected.articleSections.map(section => section.body), edition.articleSections.map(section => section.body));
  assert.ok(selected.sourceKeys.includes(edition.contentKey));
});

await test('standalone article renders the complete approved markdown with its title once', () => {
  const markdown = skyArticleReaderMarkdown(edition);
  assert.equal(markdown, edition.compiledMarkdown.replace(/^# Synthetic saved-template article\n/u, ''));
  assert.doesNotMatch(markdown, /^# /mu);
  assert.match(markdown, /Synthetic saved-template opening\./u);
  assert.match(markdown, /Synthetic final general sentence\./u);
  for (const house of edition.housePassages) assert.ok(markdown.includes(house.body));
});

await test('publication discovery includes base-year and dated keys without widening unrelated families', () => {
  const keys = skyIngressEssayPublicationKeys([
    publication,
    { ...publication, content_key: 'sky-article/sun/scorpio/1901/1901-10-23' },
    { ...publication, content_key: 'sky-article/sun/scorpio/1901/workspace' },
    { ...publication, content_key: 'sky-article/sun/scorpio/1901', state: 'retired' },
    { ...publication, content_key: 'sky-article/venus/scorpio/1901' }
  ], context);
  assert.deepEqual(keys, [saved.content_key, 'sky-article/sun/scorpio/1901/1901-10-23']);
});

await test('draft, reference, review-held, altered and malformed editions remain unavailable', () => {
  const mutations: Array<[string, (row: any) => void]> = [
    ['draft', row => { row.status = 'DRAFT'; }],
    ['reviewed', row => { row.status = 'REVIEWED'; }],
    ['reference', row => { row.lane = 'reference'; }],
    ['review hold', row => { row.review_state = 'owner-review-required'; }],
    ['approval absent', row => { delete row.source_snapshot.ownerApproval; }],
    ['approval hash', row => { row.source_snapshot.ownerApproval.compiledHash = 'changed'; }],
    ['body drift', row => { row.body += ' Changed.'; }],
    ['headline drift', row => { row.headline += ' Changed'; }],
    ['summary drift', row => { row.summary += ' Changed.'; }],
    ['wrong identity', row => { row.content_key += '/unrelated'; }],
    ['unknown format', row => { row.sections.skyArticleEdition.format = 'unknown'; }],
    ['incomplete companions', row => { row.sections.skyArticleEdition.housePassages.pop(); }],
    ['empty companion', row => { row.sections.skyArticleEdition.housePassages[0].body = ''; }],
    ['companion disagrees with compilation', row => { row.sections.skyArticleEdition.housePassages[11].body += ' Changed.'; }],
    ['section disagrees with compilation', row => { row.sections.skyArticleEdition.articleSections[0].body += ' Changed.'; }],
    ['invalid interval', row => { row.sections.skyArticleEdition.transitEndInstant = row.sections.skyArticleEdition.transitStartInstant; }],
    ['unknown coverage', row => { row.sections.skyArticleEdition.scope = 'unknown'; }]
  ];
  for (const [label, mutate] of mutations) {
    const row = structuredClone(saved); mutate(row);
    assert.equal(approvedSkyArticleReaderEdition(row), null, label);
    assert.equal(isGeneratedContentReaderBoundaryAllowed(row), false, label);
    assert.equal(select([row]), null, label);
  }
});

await test('exact row and publication versions remain required; retirement does not expose an edition', () => {
  const rows = [compiledReaderCandidate(saved)];
  assert.ok(skyIngressEssayReaderSection(rows, context, () => publication));
  for (const value of [undefined, { ...publication, state: 'retired' as const },
    { ...publication, row_id: 'another-row' }, { ...publication, row_updated_at: '2026-11-03T00:00:01.000Z' }]) {
    assert.equal(skyIngressEssayReaderSection(rows, context, () => value), null);
  }
});

await test('Sky uses the half-open interval while standalone historical access remains eligible', () => {
  assert.equal(select([saved], '1901-10-22T23:59:59.999Z'), null);
  assert.ok(select([saved], edition.transitStartInstant));
  assert.equal(select([saved], edition.transitEndInstant), null);
  assert.equal(approvedSkyArticleReaderEdition(saved), edition);
});

await test('equal-coverage ingress retains prior selection; a later saved-template visit still wins', async () => {
  const ingress = await compiledReaderFixture({ format: SKY_INGRESS_ARTICLE_FORMAT });
  const second = await reviseSkyArticleEdition(ingress, { ...skyArticleEditableFields(ingress), headline: 'Second synthetic ingress' });
  const firstRow = compiledReaderRow(ingress, '00000000-0000-4000-8000-000000000099');
  const secondRow = compiledReaderRow(second, '00000000-0000-4000-8000-000000000002');
  const selected = select([saved, firstRow, secondRow])!;
  assert.equal(selected.heading, ingress.headline);
  assert.equal(selected.body, ingress.body);
  assert.equal(selected.risingHoroscopes.length, 0);
  assert.ok(approvedSkyArticleReaderEdition(saved), 'Inactive on Sky does not mean unavailable in Articles.');
  const later = await compiledReaderFixture({ validFrom: '1901-11-01', transitStartInstant: '1901-11-01T00:00:00.000Z' });
  assert.equal(select([firstRow, compiledReaderRow(later)])?.heading, later.headline);
});

await test('dated Moon day scope still takes precedence over a visit', async () => {
  const visit = await compiledReaderFixture({ format: SKY_INGRESS_ARTICLE_FORMAT, planet: 'moon', templateKey: 'sky/article-template/moon/ingress' });
  const bounds = skyMoonDatedDayBounds('1901-11-01');
  const day = await compiledReaderFixture({ format: SKY_INGRESS_ARTICLE_FORMAT, planet: 'moon', templateKey: 'sky/article-template/moon/ingress',
    scope: 'day', validFrom: bounds.day, validTo: bounds.nextDay, transitStartInstant: bounds.start, transitEndInstant: bounds.end });
  const result = skyIngressEssayReaderSection([compiledReaderCandidate(compiledReaderRow(visit)),
    compiledReaderCandidate(compiledReaderRow(day, '00000000-0000-4000-8000-000000000002'))], { ...context, planet: 'moon' });
  assert.ok(result?.sourceKeys.includes(day.contentKey));
});

function actualFunction(file: string, name: string) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.FunctionDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node;
    ts.forEachChild(node, visit);
  };
  visit(parsed); assert.ok(declaration, name);
  return ts.transpileModule('(' + declaration.getText(parsed).replace(/^export /u, '') + ')', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
}

await test('actual Sky normalization retains one complete approved edition and still protects ordinary fallbacks', async () => {
  const protectedMap = new Map(edition.housePassages.map(passage => ['house-horoscope-core/sun/scorpio/house-' + passage.house,
    { body_you: 'Synthetic protected fallback ' + passage.house, contentKey: 'synthetic/protected/' + passage.house }]));
  const protect = new Function('protectedPassagesByKey', 'return ' + actualFunction('../apps/web/src/content/protectedOwnerSkyPlacementPassages.ts', 'preserveProtectedOwnerSkyPlacementPassage'))(protectedMap);
  const fallback = { slot: 'meaning', layer: 'authored', body: 'Synthetic fallback.', risingHoroscopes: edition.housePassages.map(passage => ({ ...passage })) };
  const normalize = new Function('skyIngressEssayReaderSection', 'isFallbackOnlySkyPlacementPreview', 'normalizeContentIdPart', 'skyPlacementWritingSection',
    'zodiacSigns', 'wholeSignHouseForSign', 'preserveProtectedOwnerSkyPlacementPassage',
    'return ' + actualFunction('../apps/web/src/App.tsx', 'normalizeSkyPlacementSurface'))(
      skyIngressEssayReaderSection, () => false, (value: string) => value.toLowerCase(), () => fallback,
      ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'],
      () => { throw new Error('This synthetic test supplies stored houses, not ephemeris calculations.'); }, protect);
  const compiled = normalize({ planet: 'Sun', sign: 'Scorpio' }, null, new Map([[saved.content_key, compiledReaderCandidate(saved)]]), [], context.activeInstant, {});
  assert.deepEqual(compiled.sections[0].risingHoroscopes, edition.housePassages);
  assert.equal(compiled.sections[0].body, edition.body);
  const articleOnly = await compiledReaderFixture({ format: SKY_INGRESS_ARTICLE_FORMAT });
  const articleOnlyRow = compiledReaderRow(articleOnly);
  const withFallback = normalize({ planet: 'Sun', sign: 'Scorpio' }, null, new Map([[articleOnlyRow.content_key, compiledReaderCandidate(articleOnlyRow)]]), [], context.activeInstant, {});
  assert.equal(withFallback.sections[0].body, articleOnly.body, 'A general article keeps its exact approved body.');
  assert.equal(withFallback.sections[0].risingHoroscopes.length, 12, 'Publishing general copy cannot suppress the existing sign readings.');
  for (const [index, passage] of withFallback.sections[0].risingHoroscopes.entries()) {
    assert.equal(passage.body, 'Synthetic protected fallback ' + (index + 1));
    assert.equal(passage.contentKey, 'synthetic/protected/' + (index + 1));
  }
  const ordinary = normalize({ planet: 'Sun', sign: 'Scorpio' }, null, new Map(), [], context.activeInstant, {});
  for (const [index, passage] of ordinary.sections[0].risingHoroscopes.entries()) {
    assert.equal(passage.body, 'Synthetic protected fallback ' + (index + 1));
    assert.equal(passage.contentKey, 'synthetic/protected/' + (index + 1));
  }
});
