import { test, expect } from '@playwright/test';
for (const width of [390, 1440]) {
  test(`Calendar links to one shared summary editor at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-summary-fixture'));
    await page.route('**/api/admin/**', route => route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } }));
    await page.goto('/admin/content#calendar-writeups?view=daily-sky');
    const summaryLink = page.getByRole('link', { name: 'Edit Sun summaries', exact: true });
    await expect(summaryLink).toBeVisible();
    await page.screenshot({ path: `test-results/calendar-sun-summary-link-${width}.png` });
    await summaryLink.click();
    const studio = page.getByRole('region', { name: 'Daily Sky Summary editor', exact: true });
    await expect(studio).toHaveCount(1);
    await expect(studio.getByLabel('Reader layout', { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/#sky-writeups\?view=daily-summary&section=sun$/);
    await expect(studio.getByLabel('Summary section', { exact: true })).toHaveValue('Sun summaries');
    await expect(studio.getByLabel('Summary section', { exact: true })).toBeInViewport();
    await expect(studio.getByLabel('Daily Sky Summary fields').getByRole('article')).toHaveCount(12);
    await studio.getByLabel('Search summary wording', { exact: true }).fill('Virgo');
    const field = studio.getByRole('article', { name: 'Sun in Virgo', exact: true });
    await field.getByRole('button', { name: 'Edit wording', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save & publish', exact: true })).toBeVisible();
    await studio.screenshot({ path: `test-results/calendar-summary-studio-${width}.png` });
  });
}
