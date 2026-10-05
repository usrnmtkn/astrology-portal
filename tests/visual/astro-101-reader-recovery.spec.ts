import { expect, test } from '@playwright/test';
import { educationReaderResponse, lessonRows, privateCanary } from '../helpers/astro101-reader-fixture';
import { fixturePublications } from '../helpers/content-reader-route.mjs';
import { readerResponse } from '../helpers/reader-response';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Astro 101 chapters and house lesson through actual reader API at ${width} ${theme}`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    await context.addInitScript(theme => localStorage.setItem('tldrastro:theme', theme), theme);
    const signedIn = theme === 'dark';
    if (signedIn) {
      const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'reader@example.test', app_metadata: { provider: 'email' }, user_metadata: { name: 'Fixture Reader' } };
      const authKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
      await context.addInitScript(({ user, authKey }) => {
        localStorage.setItem('tldrastro:userProfile', JSON.stringify({ id: user.id, name: 'Fixture Reader', email: user.email, provider: 'email', sun: 'Aquarius', moon: 'Cancer', rising: 'Gemini', charts: [] }));
        localStorage.setItem(authKey, JSON.stringify({ user, access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: 4102444800 }));
      }, { user, authKey });
      await context.route('**/auth/v1/**', route => route.fulfill({ json: user }));
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let retired = false;
    let failed = false;
    await context.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await context.route('**/api/content-publications*', route => route.fulfill({ json: { rows: fixturePublications(lessonRows) } }));
    await context.route('**/api/content-reader', async route => {
      const query = route.request().postDataJSON();
      if (query.prefix !== 'education/astro-101/') return route.fulfill({ json: readerResponse([]) });
      const ledger = fixturePublications(lessonRows);
      if (retired) ledger.find(row => row.content_key === lessonRows[9].content_key)!.state = 'retired';
      const response = await educationReaderResponse(query, lessonRows, ledger, failed);
      const body = await response.text();
      expect(body).not.toContain(privateCanary);
      await route.fulfill({ status: response.status, contentType: 'application/json', body });
    });
    await page.goto('/#settings');
    await expect(page.locator('.site-nav').getByRole('button', { name: 'Learn', exact: true, includeHidden: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    const menu = page.getByRole('menu', { name: 'Site menu' });
    if (signedIn) {
      await expect(menu.getByRole('menuitem', { name: 'Friends', exact: true })).toBeVisible();
      const labels = await menu.getByRole('menuitem').allTextContents();
      expect(labels.slice(labels.indexOf('Friends'), labels.indexOf('Friends') + 2)).toEqual(['Friends', 'Learn']);
    }
    await menu.getByRole('menuitem', { name: 'Learn', exact: true }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(menu).toHaveCount(0);
    await expect(page.locator('.learn-chapter__title')).toHaveCount(9);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await expect(menu.getByRole('menuitem', { name: 'Learn', exact: true })).toHaveClass('active');
    await page.screenshot({ path: `test-results/learn-overflow-${width}-${theme}.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'QA chapter 1', exact: true }).click();
    await expect(page).toHaveURL(/\/learn\/astro-101\/qa-chapter-1$/);
    await expect(page.locator('.learn-lede')).toHaveText('QA opening 1.');
    await expect(page.locator('.learn-article-body')).toContainText('QA final sentence 1.');
    await page.getByRole('button', { name: 'Back to Astro 101' }).click();
    await expect(page.locator('.learn-chapter__title')).toHaveCount(9);
    await page.getByRole('link', { name: /XI Friends Ruled by Saturn/ }).click();
    await expect(page).toHaveURL(/\/learn\/houses\/11$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('QA eleventh house');
    await expect(page.locator('.learn-lede')).toHaveText('QA opening 10.');
    await expect(page.locator('.learn-article-body')).toContainText('QA final sentence 10.');
    await page.reload();
    await expect(page.locator('.learn-article-body')).toContainText('QA final sentence 10.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/astro101-house-${width}-${theme}.png`, fullPage: true });
    retired = true;
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible();
    failed = true;
    await page.reload();
    await expect(page.getByText('Astro 101 could not load. Try again in a moment.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
