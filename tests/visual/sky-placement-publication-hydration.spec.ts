import { readerResponse } from '../helpers/reader-response';
import { expect, test } from '@playwright/test';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import {isSkyListPublicationKey} from '../../apps/web/src/content/skyListPublicationScope';
import { publicationStorageEmitter } from '../helpers/publication-storage-emitter';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const delivery of ['external edit', 'storage ledger']) {
 test(`owner-authored signed aspect replaces generic exact copy ${width} ${theme} ${delivery}`, async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-26T01:36:23Z'));
  const key = 'sky.aspect.sun.opposition.neptune.libra.aries';
  const genericKey = 'sky.aspect.sun.opposition.neptune';
  let revision = 1, retired = false;
  const stamp = () => `2026-09-26T01:00:00.${String(revision).padStart(6, '0')}Z`;
  const row = () => ({ id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', content_key: key,
   surface: 'sky', mode: 'feed', status: 'LIVE', lane: 'serving', review_state: null, target_date: null,
   event_type: 'collective-aspect-card', block_type: 'sky_aspect', judge_score: null, judge_gate: 'human-review',
   updated_at: stamp(), headline: 'Sun Opposition Neptune', summary: null,
   body: `Synthetic owned sign-specific opening ${revision}.\n\nSynthetic complete owned ending ${revision}.`, sections: {},
   source_snapshot: { contentType: 'owner-authored-sky-aspect', contentSystem: 'authored', review_status: 'approved',
    pairSource: 'content-studio/manual', pairKey: 'sun-neptune',
    cardFacts: { a: 'sun', b: 'neptune', aspect: 'opposition', signA: 'libra', signB: 'aries' },
    skyAspectVoiceLint: { score: 3, fails: 0 },
    studioWritingCheck: { reviewPolicy: 'owner-final-v1', contentKey: key, bodyHash: 'f'.repeat(64) }
   } });
  const generic = { ...row(), id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: genericKey,
   event_type: 'sky-aspect-owner-approved-exact', updated_at: '2026-09-01T00:00:00Z',
   body: 'Synthetic older generic exact opening. Synthetic older generic exact ending.',
   source_snapshot: { contentStudioExactAspect: true, review_status: 'approved',
    exactSkyAspectIdentity: { a: 'sun', b: 'neptune', aspect: 'opposition' } } };
  const publications = () => [{ content_key: '__content-publication-ledger/v1', state: 'live', revision: 1,
   row_id: null, row_updated_at: null, updated_at: '2026-09-01T00:00:00Z' },
   { content_key: genericKey, state: 'live', revision: 1, row_id: generic.id,
    row_updated_at: generic.updated_at, updated_at: generic.updated_at },
   { content_key: key, state: retired ? 'retired' : 'live', revision, row_id: row().id,
    row_updated_at: stamp(), updated_at: stamp() }];
  await page.addInitScript(theme => {
   localStorage.setItem('tldrastro:theme', theme);
   localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
  }, theme);
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
   schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
  await page.route('**/rest/v1/**', route => route.fulfill({ json: publications() }));
  await page.route('**/api/content-publications', route => route.fulfill({ json: { schema: 'tldr-publications/v1', publications: publications() } }));
  let signedRequests = 0;
  await page.route('**/api/content-reader', route => {
   const query = route.request().postDataJSON();
   if (query.keys?.includes(key)) signedRequests++;
   const rows = [generic, ...(!retired ? [row()] : [])].filter(r => query.keys?.includes(r.content_key));
   return route.fulfill({ json: readerResponse(rows, publications()) });
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#sky/aspect/sun/opposition/neptune/at/2026-09-26T01%3A36%3A23.000Z');
  const article = page.locator('.sky-detail-article').first();
  const assertOwned = async () => {
   await expect(article).toContainText(`Synthetic owned sign-specific opening ${revision}.`, { timeout: 60_000 });
   await expect(article).toContainText(`Synthetic complete owned ending ${revision}.`);
   await expect(article).not.toContainText('Synthetic older generic exact opening.');
   await expect(article.getByRole('heading', { name: 'Sun Opposition Neptune Rx', exact: true })).toBeVisible();
   await expect(article.getByRole('heading', { name: 'Overview', exact: true })).toHaveCount(0);
  };
  await assertOwned();
  expect(signedRequests).toBeGreaterThan(0);
  await page.reload(); await assertOwned();
  const emitStorage = delivery === 'storage ledger' ? await publicationStorageEmitter(context) : null;
  const notify = () => emitStorage ? emitStorage(publications()) : page.evaluate(({key,stamp,published}) => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
   detail: { contentKey: key, published, updatedAt: stamp }
  })), { key, stamp: stamp(), published: !retired });
  revision++; await notify(); await assertOwned();
  retired = true; revision++; await notify();
  await expect(page.locator('body')).not.toContainText('Synthetic complete owned ending', { timeout: 60_000 });
  expect(errors).toEqual([]);
 });
}

for (const width of [390, 1440]) test(`placement publication stays authoritative at ${width}px`, async ({ page, context }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-13T23:40:00Z'));
  const key = 'sky-placement/article/sun/virgo';
  const base = skyPlacementSourceRecords.get(key)!;
  let revision = 1000;
  let retired = false;
  const ledger = { content_key: '__content-publication-ledger/v1', state: 'live' as const, revision: 1,
    row_id: null, row_updated_at: null, updated_at: '2026-09-13T23:00:00Z' };
  const copy = () => `{{myCustomOpening}}\n\nFixture published final sentence ${revision}.`;
  const timestamp = () => `2026-09-13T23:00:00.${String(revision).padStart(6, '0')}Z`;
  const row = () => ({
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', content_key: key, surface: 'sky', mode: 'in_depth',
    status: 'LIVE', lane: 'serving', review_state: null, target_date: null,
    provider: 'tldrastro-fallback-architecture-v3', updated_at: timestamp(), headline: base.headline,
    body: copy(), summary: base.summary, sections: { packageRecord: { ...base,
      _studioVariables: [{ id: 'fixture-custom-variable', name: 'myCustomOpening', value: 'Fixture shared opening.', overrides: [{ scope: 'placement', planet: 'sun', sign: 'virgo', value: `Fixture published opening ${revision}.` }] }],
      studio_version_status: 'approved-serving-revision', placementArticle: copy(), placementArticleDirect: copy(),
      fallback: { ...base.fallback, sections: [{ id: 'fixture', label: '', body: copy() }] }
    } }, facts: { fallbackArchitectureV3: true },
    source_snapshot: { sourcePackage: base.source_package, content_role: base.content_role },
    block_type: 'fallback_hook', event_type: 'fallback-hook'
  });
  await page.addInitScript(({ ledger, key }) => {
    if (!localStorage.getItem('tldrastro:content-publications:v1')) localStorage.setItem('tldrastro:content-publications:v1', JSON.stringify([
      ledger, { content_key: key, state: 'live', revision: 999, row_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', row_updated_at: '2026-09-13T23:00:00.000999Z', updated_at: '2026-09-13T23:00:00.000999Z' }
    ]));
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    (window as any).__articlePaints = [];
    new MutationObserver(() => {
      const article = document.querySelector('.article-body-inner');
      const text = article?.textContent?.trim();
      if (!text) return;
      const samples = (window as any).__articlePaints;
      if (samples.at(-1) !== text) samples.push(text);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, { ledger, key });
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
  const relayStatuses: number[] = [];
  const unrelatedId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  let unrelatedRevision = 1;
  const unrelatedDated = () => ({ content_key: 'sky-article/chiron/pisces/2011/2011-02-08',
    state: 'retired' as const, revision: unrelatedRevision, row_id: null, row_updated_at: null, updated_at: timestamp() });
  const readDelayMs = Number(process.env.SKY_ARTICLE_READ_DELAY_MS ?? 2500);
  const contentQueries: Array<{ids?: string[];scope?: string;keys?: string[];startedAt:number;finishedAt?:number}> = [];
  await page.route('**/api/content-publications*', async route => {
    const scoped=new URL(route.request().url()).searchParams.get('scope')==='sky-list';
    const publications = canonicalPublicationLedger([ledger, unrelatedDated(), {content_key:'sky-placement/article/jupiter/capricorn',state:'live',revision:1,row_id:unrelatedId,row_updated_at:timestamp(),updated_at:timestamp()}, { content_key: key, state: retired ? 'retired' : 'live', revision,
      row_id: row().id, row_updated_at: timestamp(), updated_at: timestamp() }].filter(record=>!scoped||isSkyListPublicationKey(record.content_key)));
    const etag = await publicationLedgerTag(publications);
    const unchanged = route.request().headers()['if-none-match'] === etag;
    relayStatuses.push(unchanged ? 304 : 200);
    await route.fulfill({ status: unchanged ? 304 : 200, headers: { etag: `W/${etag}`, 'cache-control': 'private, no-store', 'content-type': 'application/json' },
      body: unchanged ? undefined : JSON.stringify({ schema: scoped?'tldr-sky-list-publications/v1':'tldr-publications/v1', publications }) });
  });
  await page.route('**/rest/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/content_publications')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return route.fulfill({ json: [unrelatedDated(), { content_key: key, state: retired ? 'retired' : 'live', revision,
        row_id: row().id, row_updated_at: timestamp(), updated_at: timestamp() }] });
    }
    return route.fulfill({ json: [] });
  });
  await page.route('**/api/content-reader', async route => {
    const query = route.request().postDataJSON();
    const measured = { ...query, startedAt: Date.now(), finishedAt: undefined as number | undefined };
    contentQueries.push(measured);
    expect(query.ids ?? []).not.toContain(unrelatedId);
    await new Promise(resolve => setTimeout(resolve, readDelayMs));
    measured.finishedAt = Date.now();
    return route.fulfill({ json: readerResponse(retired ? [] : [row()], [
      { content_key: key, state: retired ? 'retired' : 'live', revision, row_id: row().id, row_updated_at: timestamp(), updated_at: timestamp() }
    ]) });
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  const article = page.locator('.article-body-inner').first();
  const assertCopy = async () => {
    await expect(article).toContainText(`Fixture published opening ${revision}.`, { timeout: 60_000 });
    await expect(article).toContainText(`Fixture published final sentence ${revision}.`);
    await page.waitForTimeout(4000);
    const paints = await page.evaluate(() => (window as any).__articlePaints as string[]);
    expect(paints.length).toBeGreaterThan(0);
    expect(paints.every(text => text.includes('Fixture published opening'))).toBe(true);
  };
  let releaseArchive!: () => void;
  const archiveGate = new Promise<void>(resolve => { releaseArchive = resolve; });
  const archivePattern = /\/assets\/fallback-content-sky-placement-(?!manifest-)[^/]+\.js$/;
  await page.route(archivePattern, async route => { await archiveGate; await route.continue(); });
  const publishedRowRequest = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname === '/api/content-reader' && request.postDataJSON()?.ids?.includes(row().id) === true;
  });
  try {
    await page.goto('/?date=2026-09-13#sky', { waitUntil: 'domcontentloaded' });
    await publishedRowRequest;
    await expect(article).toHaveCount(0);
  } finally { releaseArchive(); }
  await expect(page.getByLabel('Daily sky summary', { exact: true })).toBeVisible({ timeout: 60_000 });
  await page.reload();
  await expect(page.getByLabel('Daily sky summary', { exact: true })).toBeVisible({ timeout: 60_000 });
  expect(relayStatuses).toEqual([200, 304]);
  const openingStarted = Date.now();
  const openingQueryOffset = contentQueries.length;
  await page.getByRole('button', { name: 'Read more about Sun in Virgo', exact: true }).click();
  await expect(article).toContainText(`Fixture published opening ${revision}.`, { timeout: 60_000 });
  console.log(JSON.stringify({width,articleOpeningMs:Date.now()-openingStarted,readDelayMs}));
  const openingQueries = contentQueries.slice(openingQueryOffset);
  const sharedRead = openingQueries.find(query => query.scope === 'sky-article');
  const writingRead = openingQueries.find(query => query.keys?.length);
  expect(sharedRead?.finishedAt).toBeDefined();
  expect(writingRead?.startedAt).toBeDefined();
  expect(writingRead!.startedAt, 'Complete article writing starts while shared placement sources are still loading').toBeLessThan(sharedRead!.finishedAt!);
  await assertCopy();
  expect(contentQueries.some(query=>query.scope==='sky-article')).toBe(true);
  expect(contentQueries.some(query=>query.scope==='sky')).toBe(false);
  await page.reload();
  await assertCopy();
  await page.getByRole('button', { name: 'Close detail', exact: true }).click();
  await page.goto('/?date=2026-09-13#sky/placement/sun/virgo');
  await assertCopy();
  const notify = () => page.evaluate(key => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
    detail: { contentKey: key, published: true, updatedAt: new Date().toISOString() + Math.random() }
  })), key);
  const height = await article.evaluate(el => el.getBoundingClientRect().height);
  await notify();
  for (let sample = 0; sample < 12; sample++) {
    await expect(article).toContainText('Fixture published final sentence 1000.');
    expect(await article.evaluate(el => el.getBoundingClientRect().height)).toBe(height);
    await page.waitForTimeout(300);
  }
  // A different dated edition must not replace this complete article with a loader.
  const unchangedText = await article.textContent();
  const emitStorage = await publicationStorageEmitter(context);
  unrelatedRevision++;
  await emitStorage([unrelatedDated()]);
  for (let sample = 0; sample < 12; sample++) {
    const visible = await page.evaluate(() => {
      const body = document.querySelector('.sky-detail-article .article-body-inner');
      return { height: body?.getBoundingClientRect().height ?? 0, text: body?.textContent ?? null };
    });
    expect(visible.height, 'Unrelated dated publication retains the complete article on every sample').toBe(height);
    expect(visible.text).toBe(unchangedText);
    await page.waitForTimeout(300);
  }
  revision++;
  await notify();
  await expect(article).toContainText('Fixture published final sentence 1001.', { timeout: 30_000 });
  await expect(article).not.toContainText('Fixture published opening 1000.');
  retired = true; revision++;
  await notify();
  await expect(page.locator('.sky-detail-article')).not.toContainText('Fixture published opening', { timeout: 30_000 });
  await expect(article).toHaveCount(0);
  await expect(page.locator('.sky-detail-article')).not.toContainText('Virgo season makes');
  await expect(page.locator('.sky-detail-article')).not.toContainText('After moving through Leo');
});
