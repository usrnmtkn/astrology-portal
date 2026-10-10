import { test, expect, type Locator } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { bundledPublications } from '../helpers/bundled-publications';
import { syntheticLibrarySkyArticle } from '../helpers/article-library-fixture';

const body = 'Synthetic complete opening.\n\n## Saved section\n\nSynthetic complete final paragraph.';
async function headingStyle(heading: Locator) {
  const values = await heading.evaluate(element => {
    const probe = document.createElement('h2');
    probe.style.cssText = 'margin:0;font-family:var(--font-display);font-size:var(--type-h2-size);font-weight:var(--weight-regular);line-height:var(--leading-title);letter-spacing:var(--tracking-body)';
    element.append(probe);
    const actual = getComputedStyle(element), expected = getComputedStyle(probe);
    const values = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'].map(key => [key, actual[key as any], expected[key as any]]);
    probe.remove(); return values;
  });
  for (const [property, actual, expected] of values) expect(actual, property).toBe(expected);
}

test('dated Sky articles remain discoverable with their complete saved history', async ({ page }) => {
  const row = await syntheticLibrarySkyArticle();
  const store = await studioApiStore([row]);
  try {
    await bundledPublications(page);
    await page.route('**/api/content-reader', async route => {
      const result = await store.call({ method: 'POST', body: route.request().postDataJSON(), url: '/api/content-reader' });
      await route.fulfill({ status: result.status, json: result.payload });
    });
    await page.goto('/#articles');
    const library = page.getByRole('region', { name: 'Articles & Guides', exact: true });
    await library.getByRole('combobox', { name: 'Type', exact: true }).selectOption('sky');
    await expect(library).toContainText(row.summary);
    await library.getByRole('link', { name: /Synthetic dated Sky article/u }).click();
    await expect(page).toHaveURL(new RegExp(encodeURIComponent(row.content_key)));
    await expect(library).toContainText('Synthetic complete dated opening.');
    await expect(library).toContainText('Synthetic complete dated ending.');
    await page.reload();
    await expect(library).toContainText('Synthetic complete dated ending.');
  } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); store.close(); }
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Articles & Guides save, publish, read and retire ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const store = await studioApiStore([{ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: 'sky/article-template/venus/scorpio',
      surface: 'sky', mode: 'article', event_type: 'sky-article-template', block_type: 'sky_article', status: 'REVIEWED', lane: 'reference',
      review_state: null, headline: 'Synthetic Sky template', body: '# Synthetic template\n\n{{entryDate}}', summary: '', sections: {},
      updated_at: '2026-10-09T00:00:00Z', source_snapshot: { contentType: 'sky-article-template', review_status: 'approved' } }], { uuidIds: true });
    let readerFailure = false;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:theme', theme);
        localStorage.setItem('tldrastro:studio-theme', theme);
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
      }, theme);
      await bundledPublications(page);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, answer: async (route, url) => {
        if (url.pathname === '/api/content-reader') {
          if (readerFailure) { await route.fulfill({ status: 503, json: { error: 'Synthetic read failure' } }); return true; }
          const result = await store.call({ method: 'POST', body: route.request().postDataJSON(), url: '/api/content-reader' });
          await route.fulfill({ status: result.status, json: result.payload }); return true;
        }
        if (url.pathname === '/api/admin/content-publication') {
          const result = await store.call({ method: 'POST', body: route.request().postDataJSON(), url: url.pathname });
          await route.fulfill({ status: result.status, json: result.payload }); return true;
        }
        if (url.pathname === '/api/admin/content-live-status') {
          const statuses = await store.call({ method: 'statuses', body: route.request().postDataJSON() });
          await route.fulfill({ json: { ok: true, statuses } }); return true;
        }
        return false;
      } });
      await page.goto('/admin/content#articles'); // Saved links keep working.
      await expect(page.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();
      const collectionLink = page.getByRole('link', { name: 'Open Articles & Guides in the app', exact: true });
      await expect(collectionLink).toHaveAttribute('href', '/#articles');
      await expect(collectionLink).toHaveAttribute('target', '_blank');
      const [collectionPage] = await Promise.all([page.waitForEvent('popup'), collectionLink.click()]);
      await expect(collectionPage).toHaveURL(/\/#articles$/u);
      await expect(collectionPage.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();
      await collectionPage.close();
      await expect(page.getByRole('row').filter({ hasText: 'sky/article-template/venus/scorpio' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/articles-studio-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
      await page.getByRole('link', { name: 'Dated Sky article templates', exact: true }).click();
      await expect(page).toHaveURL(/#articles-guides\?q=/u);
      await expect(page.getByLabel('Search articles')).toHaveValue('sky/article-template/');
      await page.getByRole('button', { name: 'New guide', exact: true }).click();
      const editor = page.getByRole('dialog');
      await editor.getByLabel('Article title', { exact: true }).fill('Synthetic saved guide');
      await editor.getByLabel('Article body', { exact: true }).fill(body);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.content_key.startsWith('article/guide/'))?.body).toBe(body);
      const saved = (await store.call({ method: 'rows' })).find((row: any) => row.content_key.startsWith('article/guide/'));
      expect(saved.status).toBe('DRAFT');
      await page.reload();
      await page.getByRole('row').filter({ hasText: saved.content_key }).getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(editor.getByLabel('Article body', { exact: true })).toHaveValue(body);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id)?.status).toBe('LIVE');
      await page.goto('/#articles');
      const library = page.getByRole('region', { name: 'Articles & Guides', exact: true });
      await expect(library.getByRole('heading', { name: 'Articles & Guides', level: 1 })).toBeVisible();
      await headingStyle(library.locator('.articles-library-card h2'));
      await expect(library.locator('h1,h2')).toHaveText(['Articles & Guides', 'Synthetic saved guide']);
      await library.getByRole('combobox', { name: 'Type', exact: true }).selectOption('guide');
      await library.getByLabel('Search articles and guides').fill('no-match');
      await expect(library.getByRole('status')).toHaveText('No articles match these filters.');
      await library.getByLabel('Search articles and guides').fill('');
      await page.screenshot({ path: `test-results/articles-library-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
      await library.getByRole('link', { name: /Synthetic saved guide/u }).click();
      const directURL = page.url();
      await expect(library.locator('.learn-article-body')).toContainText('Synthetic complete final paragraph.');
      await expect(library.locator('h1,h2')).toHaveText(['Synthetic saved guide', 'Saved section']);
      await headingStyle(library.locator('.learn-article-body h2'));
      await page.reload();
      await expect(library.locator('.learn-article-body p')).toHaveText(['Synthetic complete opening.', 'Synthetic complete final paragraph.']);
      await page.screenshot({ path: `test-results/articles-reading-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      readerFailure = true;
      await page.reload();
      await expect(library.getByRole('alert')).toContainText('could not load');
      readerFailure = false;
      await library.getByRole('button', { name: 'Try again' }).click();
      await expect(library.getByRole('heading', { name: 'Synthetic saved guide', exact: true })).toBeVisible();
      const latest = (await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id);
      const retired = await store.call({ method: 'POST', url: '/api/admin/content-publication', body: { action: 'retire', id: saved.id, contentKey: saved.content_key, expectedUpdatedAt: latest.updated_at } });
      expect(retired.status).toBe(200);
      await page.goto(directURL);
      await page.reload();
      await expect(library.getByRole('heading', { name: 'Article unavailable' })).toBeVisible();
      await library.getByRole('link', { name: 'Back to Articles & Guides' }).click();
      await expect(library.getByRole('status')).toHaveText('No articles or guides are published yet.');
      await expect.poll(() => library.evaluate(element => {
        for (let node: Element | null = element; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (Number(style.opacity) < 1 || style.visibility === 'hidden' || style.display === 'none') return false;
        }
        return true;
      })).toBe(true);
      await page.screenshot({ path: `test-results/articles-empty-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
      expect(errors).toEqual([]);
    } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); store.close(); }
  });
}
