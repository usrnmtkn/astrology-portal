import assert from 'node:assert/strict';
import { test } from 'node:test';
import { skyPlacementSourceFixture } from '../tests/helpers/sky-placement-source-fixture.mts';
import { skyReaderPreviewDraftMap } from '../apps/web/src/features/sky/studioSkyReaderPreviewModel';
import { skyIngressEssayReaderSection } from '../apps/web/src/content/skyIngressEssayReader';
import { isSkyReaderPreviewDate, skyPreviewReferenceDate, isTrustedSkyPreviewParent, skyReaderDateHref } from '../src/shared/skyReaderPreview';

test('reader and CSV links use the same validated date and reader origin', () => {
  assert.equal(skyReaderDateHref('https://example.invalid', 'sun', 'scorpio', '2026-10-24'), '/?date=2026-10-24#/sky/placement/sun/scorpio');
  assert.equal(skyReaderDateHref('http://localhost:5174', 'sun', 'scorpio', '2026-10-24', true), 'http://localhost:5173/?date=2026-10-24&studioExport=sky-article-csv#/sky/placement/sun/scorpio');
  assert.throws(() => skyReaderDateHref('https://example.invalid', 'sun', 'scorpio', '2026-02-29'));
});

test('draft simulation follows actual dated selection and boundaries without changing published rows', async () => {
  const fixture = await skyPlacementSourceFixture();
  const row = { id: fixture.active.id, contentKey: fixture.active.content_key, status: 'LIVE', lane: 'serving', reviewState: null,
    sections: fixture.active.sections, sourceSnapshot: fixture.active.source_snapshot, updatedAt: fixture.active.updated_at,
    body: fixture.active.body, surface: 'sky', mode: 'article' as const, eventType: fixture.active.event_type,
    targetDate: null, headline: fixture.active.headline, summary: fixture.active.summary, model: null };
  const published = new Map([[row.contentKey, row]]);
  const before = structuredClone([...published]);
  const simulation = skyReaderPreviewDraftMap(published, { edition: fixture.pending.sections.skyArticleEdition,
    baseCompiledHash: fixture.edition.compiledHash }, 'saturn', 'aries');
  const select = (rows: typeof simulation, instant: string) => skyIngressEssayReaderSection(rows.values(), { planet: 'saturn', sign: 'aries', activeInstant: instant });
  assert.equal(select(published, '2026-10-21T12:00:00Z')?.body, fixture.active.body);
  assert.equal(select(simulation, '2026-10-21T12:00:00Z')?.body, fixture.pending.body);
  assert.ok(select(simulation, fixture.edition.transitStartInstant));
  assert.equal(select(simulation, fixture.edition.transitEndInstant), null);
  assert.equal(select(simulation, '2026-09-21T23:59:59Z'), null);
  assert.deepEqual([...published], before);
  assert.equal(simulation.get(row.contentKey)?.sourceSnapshot?.previewOnly, true);
});

test('a stale baseline or different placement cannot be presented as the proposed publication', async () => {
  const fixture = await skyPlacementSourceFixture();
  const row = { contentKey: fixture.active.content_key, sections: fixture.active.sections, updatedAt: fixture.active.updated_at } as any;
  const published = new Map([[row.contentKey, row]]);
  const draft = { edition: fixture.pending.sections.skyArticleEdition, baseCompiledHash: 'stale-hash' };
  assert.throws(() => skyReaderPreviewDraftMap(published, draft, 'saturn', 'aries'), /published article changed/);
  assert.throws(() => skyReaderPreviewDraftMap(published, draft, 'saturn', 'pisces'), /different Sky placement/);
  assert.throws(() => skyReaderPreviewDraftMap(new Map(), { ...draft, requiresPublishedBase: true }, 'saturn', 'aries'), /original published article/);
  assert.throws(() => skyReaderPreviewDraftMap(published, { ...draft, baseVersion: '2020-01-01T00:00:00Z' }, 'saturn', 'aries'), /published version changed/);
});

test('preview dates reject impossible civil dates', () => {
  for (const value of ['2026-10-21', '2028-02-29']) assert.equal(isSkyReaderPreviewDate(value), true);
  for (const value of ['', '2026-02-29', '2026-04-31', '2026-13-01', '10/21/2026']) assert.equal(isSkyReaderPreviewDate(value), false);
  assert.equal(skyPreviewReferenceDate('2026-10-22T01:00:00Z', 'America/New_York'), '2026-10-21');
});

test('preview frames accept only the Studio origin or the declared development pair', () => {
  assert.ok(isTrustedSkyPreviewParent('https://example.invalid', 'https://example.invalid'));
  assert.ok(isTrustedSkyPreviewParent('http://127.0.0.1:4174', 'http://127.0.0.1:4173'));
  assert.ok(isTrustedSkyPreviewParent('https://studio.example.invalid', 'https://example.invalid', 'https://studio.example.invalid'));
  assert.equal(isTrustedSkyPreviewParent('https://other.invalid', 'https://example.invalid'), false);
  assert.equal(isTrustedSkyPreviewParent('https://example.invalid/path', 'https://example.invalid'), false);
  assert.equal(isTrustedSkyPreviewParent('null', 'https://example.invalid'), false);
});
