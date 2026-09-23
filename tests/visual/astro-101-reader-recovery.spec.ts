import { expect, test } from '@playwright/test';
import { educationReaderResponse, lessonRows, privateCanary } from '../helpers/astro101-reader-fixture';
import { fixturePublications } from '../helpers/content-reader-route.mjs';
import { readerResponse } from '../helpers/reader-response';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Astro 101 chapters and house lesson through actual reader API at ${width} ${theme}`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    await context.addInitScript(theme => localStorage.setItem('tldrastro:theme', theme), theme);
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
    await page.goto('/learn');
    await expect(page.locator('.learn-chapter__title')).toHaveCount(9);
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
