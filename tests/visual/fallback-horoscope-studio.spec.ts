import { expect, test } from '@playwright/test';
import { servingPackageRecords } from '../../api/_lib/serving-package-records';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import skyHandler from '../../api/sky';

const lunarKey = 'authored/book-ritual-and-the-moon/lunation-horoscope/full-moon/taurus/rising-taurus/house-1';
const coreKey = 'house-horoscope-core/moon/sagittarius/house-1';
for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`Fallback library discovery, complete copy, empty/error and publication ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(180_000);
    const store = await studioApiStore([], { uuidIds: true });
    let failCatalog = true, failSource = true;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, { actualDocumentRoute: true,
        call: async request => {
          if (failSource && request.method === 'GET' && request.url?.includes(encodeURIComponent(lunarKey))) return { status: 503, payload: { ok: false, error: 'Synthetic source outage.' } };
          return store.call(request);
        }, answer: async (route, url) => {
          if (url.pathname === '/api/admin/content-live-status') {
            const body = route.request().postDataJSON();
            if (failCatalog && body.action === 'composition-catalog') await route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic catalog outage.' } });
            else { const result = await store.call({ method: 'POST', url: url.pathname, body }); await route.fulfill({ status: result.status, json: result.payload }); }
            return true;
          }
          if (url.pathname === '/api/content-publications') {
            const publications = canonicalPublicationLedger(await store.call({ method: 'publications' }));
            await route.fulfill({ headers: { etag: await publicationLedgerTag(publications) }, json: { schema: 'tldr-publications/v1', publications } }); return true;
          }
          if (url.pathname === '/api/content-reader') {
            const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
            await route.fulfill({ status: result.status, json: result.payload }); return true;
          }
          if (url.pathname === '/api/sky') {
            const response = { statusCode: 200, setHeader() {}, end(body: string) { void route.fulfill({ status: this.statusCode, contentType: 'application/json', body }); } };
            await skyHandler({ method: 'GET', url: route.request().url() } as any, response as any); return true;
          }
          return false;
        } });
      await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
      await page.goto('/admin/content#horoscopes');
      const headingStyle = (element: HTMLElement) => { const s = getComputedStyle(element); return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.marginTop,s.marginBottom,s.textTransform,s.textAlign]; };
      const titleStyle = await page.getByRole('heading', { name: 'Horoscopes', level: 1, exact: true }).evaluate(headingStyle);
      if (width < 768) await page.getByRole('button', { name: 'Open Content Studio navigation', exact: true }).click();
      await page.getByRole('button', { name: 'Fallback horoscopes', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Fallback horoscopes', level: 1, exact: true })).toBeVisible();
      expect(await page.getByRole('heading', { name: 'Fallback horoscopes', level: 1, exact: true }).evaluate(headingStyle)).toEqual(titleStyle);
      await expect(page.getByRole('button', { name: 'Retry fallback sources', exact: true })).toBeVisible();
      failCatalog = false;
      await page.getByRole('button', { name: 'Retry fallback sources', exact: true }).click();
      const library = page.getByRole('region', { name: 'Fallback horoscope library', exact: true });
      await expect(library.locator('p[role="status"]')).toContainText('1314 sources');
      await expect(library.getByRole('heading', { level: 2 })).toHaveClass('sr-only');
      await library.getByLabel('Horoscope type', { exact: true }).selectOption('placement');
      await expect(library.locator('p[role="status"]')).toContainText('984 sources');
      await library.getByLabel('Horoscope planet or point', { exact: true }).selectOption('moon');
      await library.getByLabel('Horoscope sign', { exact: true }).selectOption('sagittarius');
      await library.getByLabel('Selected fallback horoscope', { exact: true }).selectOption(coreKey);
      const original = servingPackageRecords.get(coreKey)!;
      const source = library.getByRole('article', { name: 'Selected fallback horoscope passage' });
      await expect(source).toContainText(original.body_you.slice(0, 80));
      await expect(source).toContainText(original.body_you.slice(-100));
      const proseStyle = (element: HTMLElement) => { const s = getComputedStyle(element); return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing]; };
      expect(await source.locator('.admin-copy-preview p').first().evaluate(proseStyle)).toEqual(await library.locator(':scope > p').first().evaluate(proseStyle));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `test-results/fallback-populated-${width}-${theme}.png` });
      await expect(library.getByRole('button', { name: 'Open Sky Placement horoscopes', exact: true })).toBeVisible();
      await library.getByLabel('Search fallback horoscopes', { exact: true }).fill('no-source-matches-this-phrase');
      await expect(library.locator('p[role="status"]')).toHaveText('0 sources');
      await expect(library).toContainText('No saved fallback matches these filters.');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `test-results/fallback-empty-${width}-${theme}.png` });
      await page.goto(`/admin/content#horoscope-fallbacks?${new URLSearchParams({ source: lunarKey })}`);
      await expect(page.getByRole('button', { name: 'Retry horoscope', exact: true })).toBeVisible();
      failSource = false;
      await page.getByRole('button', { name: 'Retry horoscope', exact: true }).click();
      await expect(source).toContainText(servingPackageRecords.get(lunarKey)!.body.slice(-100));
      await expect(source).toContainText('This passage contains tarot references.');
      await library.getByRole('button', { name: 'Edit horoscope', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      const field = editor.locator('textarea[data-sky-field="body"]');
      await expect(field).toHaveValue(servingPackageRecords.get(lunarKey)!.body);
      const tarot = 'Synthetic rewrite in progress.\n\nTarot and Major Arcana remain in this private draft.';
      await field.fill(tarot);
      await editor.getByRole('button', { name: /^Save(?: draft)?$/, exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.content_key === lunarKey)?.sections.packageDraft.body).toBe(tarot);
      await page.reload();
      await expect(library.getByLabel('Selected fallback horoscope', { exact: true })).toHaveValue(lunarKey);
      await library.getByRole('button', { name: 'Edit horoscope', exact: true }).click();
      await expect(field).toHaveValue(tarot);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect(page.getByText(/Tarot references are excluded from horoscope write-ups\./u).first()).toBeVisible();
      const clean = 'Synthetic owner rewrite opening.\n\nThe complete synthetic owner rewrite ending.';
      await field.fill(clean);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect(editor.getByLabel('Reader status', { exact: true })).toHaveText('Live');
      const response = await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [lunarKey] } });
      expect(response.payload.rows[0].body).toBe(clean);
      const saved = (await store.call({ method: 'rows' })).find((row: any) => row.content_key === lunarKey);
      expect(saved.sections.packageOriginalRecord.body).toBe(servingPackageRecords.get(lunarKey)!.body);
      expect(await editor.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: `test-results/fallback-published-${width}-${theme}.png` });
      await page.goto('/?date=2026-10-26#sky/lunation/2026-10-26/taurus');
      const card = page.locator('.sky-rising-horoscope').filter({ has: page.getByRole('heading', { name: 'Taurus & Taurus Rising', exact: true }) });
      await expect(card).toContainText(clean.split('\n\n')[0], { timeout: 90_000 });
      await expect(card).toContainText(clean.split('\n\n')[1]);
      expect(errors).toEqual([]);
    } finally { store.close(); }
  });
}

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`Planetary fallback and Sky Placement share one saved draft ${width} ${theme}`, async ({ page }) => {
    const macroKey = 'sky.placement.moon.sagittarius';
    const macro = { id: 'a0000000-0000-4000-8000-000000000601', content_key: macroKey,
      headline: 'Moon in Sagittarius', summary: '', body: 'Synthetic complete placement article.', surface: 'sky', mode: 'article',
      status: 'DRAFT', lane: 'reference', review_state: null, block_type: 'sky_article', provider: 'manual-admin',
      sections: {}, facts: {}, source_snapshot: {}, updated_at: '2026-10-31T12:00:00Z' };
    const store = await studioApiStore([macro], { uuidIds: true });
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, answer: async (route, url) => {
        if (url.pathname !== '/api/admin/content-live-status') return false;
        const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload }); return true;
      } });
      await page.goto(`/admin/content#horoscope-fallbacks?${new URLSearchParams({ source: coreKey })}`);
      const library = page.getByRole('region', { name: 'Fallback horoscope library' });
      await library.getByRole('button', { name: 'Edit horoscope', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      const field = editor.locator('textarea[data-sky-field="body_you"]');
      await expect(field).toHaveValue(servingPackageRecords.get(coreKey)!.body_you);
      const body = 'Synthetic planetary owner draft opening.\n\nThe complete planetary draft ending.';
      await field.fill(body);
      await editor.getByRole('button', { name: /^Save(?: draft)?$/, exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).filter((row: any) => row.content_key === coreKey).length).toBe(1);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(library).toContainText(body.split('\n\n')[1]);
      await library.getByRole('button', { name: 'Open Sky Placement horoscopes', exact: true }).click();
      await expect(page.getByLabel('Sky placement planet or point', { exact: true })).toHaveValue('moon');
      await expect(page.getByLabel('Sky placement zodiac sign', { exact: true })).toHaveValue('sagittarius');
      await page.getByText('Content library sources', { exact: true }).click();
      await page.getByRole('row').filter({ hasText: macroKey }).getByRole('button', { name: 'Edit', exact: true }).click();
      const related = editor.locator('.admin-sky-related-editor');
      await related.getByText('House horoscopes', { exact: true }).click();
      const houses = related.getByRole('region', { name: 'House horoscopes', exact: true });
      await expect(houses).toContainText(body.split('\n\n')[0]);
      await expect(houses).toContainText(body.split('\n\n')[1]);
      await expect(houses.getByRole('link', { name: 'Open in Fallback horoscopes', exact: true })).toHaveAttribute('href', `#horoscope-fallbacks?${new URLSearchParams({ source: coreKey })}`);
      await houses.getByRole('button', { name: 'Edit house 1 horoscope', exact: true }).click();
      await expect(field).toHaveValue(body);
      expect((await store.call({ method: 'rows' })).filter((row: any) => row.content_key === coreKey)).toHaveLength(1);
      await page.reload();
      await page.goto(`/admin/content#horoscope-fallbacks?${new URLSearchParams({ source: coreKey })}`);
      await library.getByRole('button', { name: 'Edit horoscope', exact: true }).click();
      await expect(field).toHaveValue(body);
      expect(await editor.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    } finally { store.close(); }
  });
}
