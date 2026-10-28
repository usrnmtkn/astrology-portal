import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { studioApiStore } from '../helpers/studio-api-store';
import { skyPlacementSourceFixture } from '../helpers/sky-placement-source-fixture.mts';
import { readStudioCsv } from '../../apps/admin/src/studioCsv';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';

import { readerCsvCells as cells } from '../helpers/reader-csv';

for (const [width, theme, dated, planet, sign] of [
  [390, 'light', true, 'saturn', 'aries'], [390, 'dark', false, 'saturn', 'aries'],
  [1440, 'light', false, 'saturn', 'aries'], [1440, 'dark', true, 'saturn', 'aries'],
  [390, 'light', true, 'sun', 'libra'], [1440, 'dark', true, 'sun', 'libra'],
] as const) {
  test(`Reader CSV exports the resolved ${dated ? 'dated edition' : 'fallback'} for ${planet} at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await skyPlacementSourceFixture(planet, sign);
    const store = await studioApiStore(dated ? [fixture.active, fixture.pending] : []);
    let failRead = dated && width === 390;
    const downloads: unknown[] = [], writes: unknown[] = [];
    page.on('download', download => downloads.push(download));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date('2026-10-25T02:40:00Z'));
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:theme', theme);
        localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
      }, theme);
      await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
      await page.route('**/rest/v1/**', async route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/content_publications') ? await store.call({ method: 'publications' }) : [] }));
      await page.route('**/api/content-publications', async route => {
        const publications = canonicalPublicationLedger(await store.call({ method: 'publications' }));
        await route.fulfill({ headers: { etag: await publicationLedgerTag(publications) }, json: { schema: 'tldr-publications/v1', publications } });
      });
      await page.route('**/api/content-reader', async route => {
        if (failRead) return route.fulfill({ status: 503, json: { error: 'Synthetic reader outage.' } });
        const result = await store.call({ method: 'POST', url: '/api/content-reader', body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload });
      });
      await page.route('**/api/admin/**', route => { writes.push(route.request().url()); return route.abort(); });
      await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
      const download = page.waitForEvent('download', { timeout: 90_000 });
      const announced = page.getByRole('status').filter({ hasText: 'Sky article CSV downloaded.' }).waitFor({state:'visible',timeout:90000});
      await page.goto(`/?date=2026-10-21&studioExport=sky-article-csv#sky/placement/${planet}/${sign}`);
      if (failRead) {
        await expect(page.getByRole('alert').filter({hasText:'This placement could not load.'})).toBeVisible({ timeout: 60_000 });
        expect(downloads).toHaveLength(0);
        failRead = false;
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
      }
      const downloaded = await download;
      expect(downloaded.suggestedFilename()).toBe(`content-studio-reader-sky-placement-${planet}-${sign}-2026-10-21.csv`);
      const text = await readFile((await downloaded.path())!, 'utf8');
      const exported = cells(text);
      const article = page.locator('.sky-detail-article');
      await announced;
      expect(exported.title).toBe(await article.locator('h1').innerText());
      const summary = article.locator('.article-tldr__copy');
      expect(exported.summary).toBe(await summary.count() ? await summary.innerText() : '');
      const visibleParagraphs = await article.locator('.sky-detail-body p').allInnerTexts();
      for (const paragraph of visibleParagraphs.filter(Boolean)) expect(exported.body).toContain(paragraph.trim());
      const aspectPassages = article.locator('.article-related-aspects__copy');
      if (planet === 'sun') await expect(aspectPassages).toHaveCount(6);
      for (const passage of await aspectPassages.all()) {
        for (const text of await passage.locator('h4, p').allTextContents()) expect(exported.aspect_details).toContain(text.trim());
        const href = await passage.locator('a[href]').first().getAttribute('href');
        expect(exported.aspect_details).toContain(new URL(href!, exported.reader_url).href);
      }
      for (const label of await article.locator('.article-related-aspects__label--outside').allTextContents()) expect(exported.aspect_details).toContain(label.trim());
      expect(exported.aspect_details).not.toContain('studioExport');
      expect(exported.aspect_details).not.toContain('Where it lands for you');
      expect(exported.publication_status).toBe(dated ? 'Live' : 'Bundled fallback');
      expect(exported.source_role).toBe(dated ? 'Active dated article' : 'Shared fallback');
      expect(exported.reader_url).toContain(`#sky/placement/${planet}/${sign}`);
      expect(exported.reader_url).not.toContain('studioExport');
      expect(exported.reference_instant).toContain('2026-10-21');
      expect(exported.reference_date).toBe('2026-10-21');
      expect(exported.time_zone).toBe('America/New_York');
      expect(exported.body).not.toContain('Synthetic pending revision');
      if (dated) {
        expect(exported.source_keys).toContain(fixture.active.content_key);
        expect(exported.valid_from).toBe('2026-09-22');
        expect(exported.valid_to).toBe('2026-10-23');
        expect(exported.body).toContain('Synthetic published final sentence.');
      }
      expect(() => readStudioCsv(text)).toThrow(/Reader exports are read-only/);
      expect(downloads).toHaveLength(1);
      expect(writes).toEqual([]);
      await page.screenshot({ path: `test-results/sky-reader-csv-${planet}-${width}-${theme}.png` });
      await page.reload();
      await expect(article.locator('h1')).toHaveText(exported.title);
      expect(downloads).toHaveLength(1);
    } finally { store.close(); }
  });
}
