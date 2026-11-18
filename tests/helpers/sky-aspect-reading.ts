import { expect, type Page } from '@playwright/test';

/** Assert every published paragraph, in order, on the actual Sky article. */
export async function expectSkyAspectBody(page: Page, body: string) {
  const article = page.locator('.sky-detail-article');
  await expect(article.locator('#sky-detail-title')).toBeVisible();
  await expect(article.locator('.sky-detail-body .article-body-inner').first().locator('.sky-detail-section p:not(aside p)'))
    .toHaveText(body.split(/\n\s*\n/u), { timeout: 60_000 });
  await expect(page.getByRole('dialog', { name: 'Event detail', exact: true })).toHaveCount(0);
  return article;
}
