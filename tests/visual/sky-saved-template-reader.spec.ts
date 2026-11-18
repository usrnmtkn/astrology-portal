import { expect, test, type Locator } from '@playwright/test';
import { compiledReaderFixture, compiledReaderRow, legacyIngressReaderFixture } from '../helpers/sky-saved-template-reader-fixtures.mts';
import { skyArticlePublicationStore } from '../helpers/sky-article-publication-store.mts';
import { emptyLastKnownGoodSnapshot } from '../helpers/bundled-publications';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';

for (const legacy of [false, true]) for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`${legacy ? 'legacy Overview' : 'saved-template'} actual publication reaches complete Sky and standalone readers ${width} ${theme}`, async ({ page, context, baseURL }) => {
    test.setTimeout(120_000);
    const edition = legacy ? await legacyIngressReaderFixture() : await compiledReaderFixture({ templateBody: '# Synthetic saved-template article\n\nSynthetic saved-template opening.\n\nSynthetic final general sentence.\n\n## Horoscopes\n\nSynthetic complete companion introduction.\n\n{{risingBlocks}}' });
    const initial = { ...compiledReaderRow(edition), ...(legacy ? {} : { status: 'DRAFT', lane: 'reference', review_state: 'owner-review-required' }),
      target_date: null, source_snapshot: { ...(legacy ? compiledReaderRow(edition).source_snapshot : {}),
        privateNotes: 'PRIVATE_READER_CANARY', review_status: legacy ? 'approved' : 'needs_review' } };
    const store = await skyArticlePublicationStore([initial]);
    const previewOrigin = new URL(baseURL!).origin;
    const guard = await installSyntheticNetworkGuard(context, previewOrigin);
    const errors: string[] = [], privatePayloads: string[] = [];
    let exactRequests = 0, directLedgerRequests = 0;
    page.on('pageerror', error => errors.push(error.message));
    try {
      if (!legacy) {
        const opened = (await store.db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [initial.id])).rows[0].row as any;
        const published = await store.invoke('/api/admin/generated-content', { id: initial.id,
          expectedUpdatedAt: opened.updated_at, ownerAction: 'approve-sky-article-edition' });
        expect(published.status).toBe(200);
        expect(published.rows[0].sections.skyArticleEdition).toEqual(edition);
      }
      await page.setViewportSize({ width, height: 1000 });
      // The selected historical date comes from the reader URL. Keep the
      // browser clock modern so zero-initialized transport caches expire.
      await page.clock.setFixedTime(new Date('2026-11-03T12:00:00.000Z'));
      await context.addInitScript(theme => {
        localStorage.setItem('tldrastro:theme', theme);
        localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
      }, theme);
      await emptyLastKnownGoodSnapshot(page);
      await context.route('**/api/**', async route => {
        const request = route.request();
        const message = `Unexpected synthetic reader API: ${request.method()} ${new URL(request.url()).pathname}`;
        await route.fulfill({ status: 501, json: { error: message } });
        throw new Error(message);
      });
      await context.route('**/rest/v1/**', async route => {
        const request = route.request(), url = new URL(request.url());
        expect(url.origin).toBe('https://visual-smoke.supabase.test');
        if (url.pathname === '/rest/v1/content_publications') {
          expect(request.method()).toBe('GET');
          directLedgerRequests++;
          return route.fulfill({ json: await store.anonymousPublications(url.searchParams) });
        }
        if (url.pathname === '/rest/v1/rpc/content_runtime_revision') {
          expect(request.method()).toBe('POST');
          expect(url.search).toBe('');
          const body = request.postDataJSON();
          expect(Object.keys(body)).toEqual(['p_provider']);
          return route.fulfill({ json: await store.anonymousRuntimeRevision(body.p_provider) });
        }
        const message = `Unexpected synthetic reader REST: ${request.method()} ${url.pathname}`;
        await route.fulfill({ status: 501, json: { error: message } });
        throw new Error(message);
      });
      await context.route(/\/api\/(?:sky|sky-reader|calendar)\?/u, async route => {
        expect(route.request().method()).toBe('GET');
        const url = new URL(route.request().url());
        expect(url.origin).toBe(previewOrigin);
        const result = await store.invoke(`${url.pathname}${url.search}` as `/api/sky${string}` | `/api/calendar${string}`);
        const { status, headers, ...payload } = result;
        expect(status, 'The actual local Sky calculation handler must return complete facts.').toBe(200);
        await route.fulfill({ status, headers, json: payload });
      });
      await context.route('**/api/content-publications*', async route => {
        expect(route.request().method()).toBe('GET');
        const url = new URL(route.request().url());
        expect(url.origin).toBe(previewOrigin);
        expect(url.pathname).toBe('/api/content-publications');
        const result = await store.invoke(`/api/content-publications${url.search}`);
        const { status, headers, ...payload } = result;
        await route.fulfill({ status, headers, json: payload });
      });
      await context.route('**/api/content-reader', async route => {
        expect(route.request().method()).toBe('POST');
        expect(new URL(route.request().url()).origin).toBe(previewOrigin);
        const query = route.request().postDataJSON();
        if (query.keys?.includes(edition.contentKey)) exactRequests++;
        const result = await store.invoke('/api/content-reader', query);
        const { status, headers, ...payload } = result;
        if (JSON.stringify(payload).includes('PRIVATE_READER_CANARY')) privatePayloads.push('private source metadata');
        await route.fulfill({ status, headers, json: payload });
      });
      const assertCopy = async (article: Locator, standalone = false) => {
        await expect(article).toContainText(legacy ? 'Synthetic ingress opening.' : 'Synthetic saved-template opening.', { timeout: 60_000 });
        await expect(article).toContainText(legacy ? 'Synthetic ingress final sentence.' : 'Synthetic final general sentence.');
        await expect(article.getByText('Synthetic complete companion introduction.', { exact: true })).toHaveCount(legacy ? 0 : 1);
        await expect(article.getByRole('heading', { name: edition.headline, exact: true })).toHaveCount(1);
        const houses = standalone ? article.locator('.learn-article-body > h3') : article.locator('.sky-rising-horoscope');
        await expect(houses).toHaveCount(legacy && !standalone ? 12 : edition.housePassages.length);
        if (legacy && !standalone) {
          await expect(houses.locator('h3')).toHaveText(['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].map(sign => `${sign} & ${sign} Rising`));
          for (const reading of await houses.all()) await expect(reading.locator('p').first()).not.toBeEmpty();
        }
        for (const [index, passage] of edition.housePassages.entries()) {
          if (!standalone) {
            const sign = passage.risingSign![0].toUpperCase() + passage.risingSign!.slice(1);
            await expect(houses.nth(index).getByRole('heading', { level: 3 })).toHaveText(`${sign} & ${sign} Rising`);
            await expect(houses.nth(index).locator('p')).toHaveText(passage.body.split('\n\n'));
          }
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
      // Let the normal native view transition finish before capturing the long
      // page; capturing its root snapshot can compress it into one viewport.
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-transition'), undefined, { timeout: 10_000 });
      await sky.getByRole('heading', { name: edition.headline, exact: true }).scrollIntoViewIfNeeded();
      await expect(sky.getByRole('heading', { name: edition.headline, exact: true })).toBeInViewport();
      const layout = await sky.evaluate(element => {
        const box = element.getBoundingClientRect();
        const ancestors = [];
        for (let current: HTMLElement | null = element as HTMLElement; current; current = current.parentElement) {
          const style = getComputedStyle(current);
          ancestors.push({ tag: current.tagName, className: current.className, transform: style.transform,
            height: current.getBoundingClientRect().height, offsetHeight: current.offsetHeight, scrollTop: current.scrollTop });
        }
        return { width: box.width, height: box.height, offsetWidth: (element as HTMLElement).offsetWidth,
          offsetHeight: (element as HTMLElement).offsetHeight, paragraphFontSize: parseFloat(getComputedStyle(element.querySelector('p')!).fontSize), ancestors };
      });
      expect(Math.abs(layout.height - layout.offsetHeight)).toBeLessThanOrEqual(2);
      expect(layout.paragraphFontSize).toBeGreaterThanOrEqual(12);
      await test.info().attach('settled-sky-layout', { body: JSON.stringify(layout), contentType: 'application/json' });
      const artifact = legacy ? 'legacy-overview' : 'saved-template';
      await page.screenshot({ path: `test-results/${artifact}-sky-top-${width}-${theme}.png` });
      await page.screenshot({ path: `test-results/${artifact}-sky-${width}-${theme}.png`, fullPage: true });
      const finalHouseSentence = sky.getByText(legacy ? 'Synthetic ingress final sentence.' : edition.housePassages.at(-1)!.body.split('\n\n').at(-1)!, { exact: true });
      await finalHouseSentence.scrollIntoViewIfNeeded();
      await expect(finalHouseSentence).toBeInViewport();
      await page.screenshot({ path: `test-results/${artifact}-sky-bottom-${width}-${theme}.png` });
      await page.getByRole('button', { name: 'Close detail', exact: true }).click();
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
      expect(directLedgerRequests).toBeGreaterThan(0);
      await page.reload();
      await assertCopy(standalone, true);
      await page.screenshot({ path: `test-results/${artifact}-standalone-${width}-${theme}.png`, fullPage: true });
      await store.db.query("update content_publications set state='retired',revision=default where content_key=$1", [edition.contentKey]);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Article unavailable', exact: true })).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Synthetic house 12 final sentence.');
      expect(privatePayloads).toEqual([]);
      expect(errors).toEqual([]);
      expect(guard.unhandledExternal).toEqual([]);
    } finally {
      try {
        await guard.finishStaticFonts();
        await page.unrouteAll({ behavior: 'wait' });
        await context.unrouteAll({ behavior: 'wait' });
      } finally { await store.close(); }
    }
  });
}
