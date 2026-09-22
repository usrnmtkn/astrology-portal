import { readerResponse } from '../helpers/reader-response';
import { expect, test } from '@playwright/test';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';

for (const width of [390, 1440]) test(`placement publication stays authoritative at ${width}px`, async ({ page }) => {
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
  await page.route('**/api/content-publications', async route => {
    const publications = canonicalPublicationLedger([ledger, { content_key: key, state: retired ? 'retired' : 'live', revision,
      row_id: row().id, row_updated_at: timestamp(), updated_at: timestamp() }]);
    const etag = await publicationLedgerTag(publications);
    const unchanged = route.request().headers()['if-none-match'] === etag;
    relayStatuses.push(unchanged ? 304 : 200);
    await route.fulfill({ status: unchanged ? 304 : 200, headers: { etag: `W/${etag}`, 'cache-control': 'private, no-store', 'content-type': 'application/json' },
      body: unchanged ? undefined : JSON.stringify({ schema: 'tldr-publications/v1', publications }) });
  });
  await page.route('**/rest/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/content_publications')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return route.fulfill({ json: [{ content_key: key, state: retired ? 'retired' : 'live', revision,
        row_id: row().id, row_updated_at: timestamp(), updated_at: timestamp() }] });
    }
    return route.fulfill({ json: [] });
  });
  await page.route('**/api/content-reader', async route => {
    await new Promise(resolve => setTimeout(resolve, 2500));
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
  await page.getByRole('button', { name: 'Read more about Sun in Virgo', exact: true }).click();
  await assertCopy();
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
