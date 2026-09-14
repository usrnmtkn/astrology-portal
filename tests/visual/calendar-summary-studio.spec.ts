import { test, expect } from '@playwright/test';
for (const width of [390, 1440]) {
  test(`Calendar links to one shared summary editor at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-summary-fixture'));
    await page.route('**/api/admin/**', route => route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } }));
    await page.goto('/admin/content#fallback-hooks?section=lunar-calendar');
    await page.getByRole('link', { name: 'Edit Sun summary' }).click();
    const studio = page.getByRole('region', { name: 'Daily Sky Summary editor', exact: true });
    await expect(studio).toHaveCount(1);
    await expect(studio.getByLabel('Reader layout', { exact: true })).toHaveCount(0);
    await studio.getByLabel('Summary section', { exact: true }).selectOption('Sun summaries');
    await studio.getByLabel('Search summary wording', { exact: true }).fill('Virgo');
    const field = studio.getByRole('article', { name: 'Sun in Virgo', exact: true });
    await field.getByRole('button', { name: 'Edit wording', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save & publish', exact: true })).toBeVisible();
    await studio.screenshot({ path: `test-results/calendar-summary-studio-${width}.png` });
  });
}
