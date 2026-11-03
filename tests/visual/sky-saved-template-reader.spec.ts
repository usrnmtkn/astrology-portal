import { expect, test, type Locator } from '@playwright/test';
import { compiledReaderFixture, compiledReaderRow } from '../helpers/sky-saved-template-reader-fixtures.mts';
import { skyArticlePublicationStore } from '../helpers/sky-article-publication-store.mts';
import { emptyLastKnownGoodSnapshot } from '../helpers/bundled-publications';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`saved-template actual publication reaches complete Sky and standalone readers ${width} ${theme}`, async ({ page, context, baseURL }) => {
    test.setTimeout(120_000);
    const edition = await compiledReaderFixture({ templateBody: '# Synthetic saved-template article\n\nSynthetic saved-template opening.\n\nSynthetic final general sentence.\n\n## Horoscopes\n\nSynthetic complete companion introduction.\n\n{{risingBlocks}}' });
    const initial = { ...compiledReaderRow(edition), status: 'DRAFT', lane: 'reference', review_state: 'owner-review-required',
      target_date: null, source_snapshot: { privateNotes: 'PRIVATE_READER_CANARY', review_status: 'needs_review' } };
    const store = await skyArticlePublicationStore([initial]);
    const guard = await installSyntheticNetworkGuard(context, new URL(baseURL!).origin);
    const errors: string[] = [], privatePayloads: string[] = [];
    let exactRequests = 0;
    page.on('pageerror', error => errors.push(error.message));
    try {
      const opened = (await store.db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [initial.id])).rows[0].row as any;
      const published = await store.invoke('/api/admin/generated-content', { id: initial.id,
        expectedUpdatedAt: opened.updated_at, ownerAction: 'approve-sky-article-edition' });
      expect(published.status).toBe(200);
      expect(published.rows[0].sections.skyArticleEdition).toEqual(edition);
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date('1901-11-01T12:00:00.000Z'));
      await context.addInitScript(theme => {
        localStorage.setItem('tldrastro:theme', theme);
        localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
      }, theme);
      await emptyLastKnownGoodSnapshot(page);
      await context.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
      await context.route('**/api/content-publications*', async route => {
        const url = new URL(route.request().url());
        const result = await store.invoke(`/api/content-publications${url.search}`);
        const { status, headers, ...payload } = result;
        await route.fulfill({ status, headers, json: payload });
      });
      await context.route('**/api/content-reader', async route => {
        const query = route.request().postDataJSON();
        if (query.keys?.includes(edition.contentKey)) exactRequests++;
        const result = await store.invoke('/api/content-reader', query);
        const { status, headers, ...payload } = result;
        if (JSON.stringify(payload).includes('PRIVATE_READER_CANARY')) privatePayloads.push('private source metadata');
        await route.fulfill({ status, headers, json: payload });
      });
      await context.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
      const assertCopy = async (article: Locator, standalone = false) => {
        await expect(article).toContainText('Synthetic saved-template opening.', { timeout: 60_000 });
        await expect(article).toContainText('Synthetic final general sentence.');
        await expect(article.getByText('Synthetic complete companion introduction.', { exact: true })).toHaveCount(1);
        await expect(article.getByRole('heading', { name: edition.headline, exact: true })).toHaveCount(1);
        const houses = standalone ? article.locator('.learn-article-body > h3') : article.locator('.sky-rising-horoscope');
        await expect(houses).toHaveCount(12);
        for (const [index, passage] of edition.housePassages.entries()) {
          if (!standalone) await expect(houses.nth(index).locator('p')).toHaveText(passage.body.split('\n\n'));
          else for (const paragraph of passage.body.split('\n\n')) await expect(article.getByText(paragraph, { exact: true })).toHaveCount(1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      };
      await page.goto('/?date=1901-11-01#sky');
      const sun = page.getByRole('list', { name: 'Daily planetary placements' }).getByRole('button', { name: 'Read more about Sun in Scorpio', exact: true });
      await expect(sun).toContainText(edition.tldr, { timeout: 60_000 });
      await sun.click();
      const sky = page.locator('.sky-detail-article').first();
      await assertCopy(sky);
      await page.screenshot({ path: `test-results/saved-template-sky-${width}-${theme}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Sky', exact: true }).click();
      await expect(sun).toContainText(edition.tldr);
      await sun.click();
      await assertCopy(sky);
      await page.reload();
      await assertCopy(sky);
      expect(exactRequests).toBeGreaterThan(0);

      const href = '/#articles/' + encodeURIComponent(edition.contentKey);
      await page.goto(href);
      const standalone = page.locator('.learn-sheet--article');
      await assertCopy(standalone, true);
      await page.reload();
      await assertCopy(standalone, true);
      await page.screenshot({ path: `test-results/saved-template-standalone-${width}-${theme}.png`, fullPage: true });
      await store.db.query("update content_publications set state='retired',revision=default where content_key=$1", [edition.contentKey]);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Article unavailable', exact: true })).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Synthetic house 12 final sentence.');
      expect(privatePayloads).toEqual([]);
      expect(errors).toEqual([]);
      expect(guard.unhandledExternal).toEqual([]);
    } finally {
      await guard.finishStaticFonts();
      await page.unrouteAll({ behavior: 'wait' });
      await context.unrouteAll({ behavior: 'wait' });
      await store.close();
    }
  });
}
