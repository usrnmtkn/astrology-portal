import { test, expect } from '@playwright/test';
for (const width of [390, 1440]) {
  test(`Calendar links to one shared summary editor at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-summary-fixture'));
    await page.route('**/api/admin/**', route => route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } }));
    await page.goto('/admin/content#calendar-writeups?view=daily-sky');
    await page.getByText('Reference templates and source previews', {exact:true}).click();
    const summaryLink = page.getByRole('link', { name: 'Edit Sun summaries', exact: true });
    await expect(summaryLink).toBeVisible();
    await page.screenshot({ path: `test-results/calendar-sun-summary-link-${width}.png` });
    await summaryLink.click();
    const studio = page.getByRole('region', { name: 'Daily Sky Summary editor', exact: true });
    await expect(studio).toHaveCount(1);
    await expect(studio.getByLabel('Reader layout', { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/#sky-writeups\?view=daily-summary&section=sun$/);
    const workspace = studio.getByLabel('Summary editing workspace', { exact: true });
    await expect(workspace.getByLabel('Summary wording', { exact: true })).toHaveValue('cms/sky-daily-summary/sun/virgo');
    await expect(workspace.getByLabel('Summary wording', { exact: true })).toBeInViewport();
    await expect(workspace.getByLabel('Summary wording text', { exact: true })).toBeEnabled();
    await expect(workspace.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible();
    await expect(workspace.getByRole('button', { name: 'Review & publish', exact: true })).toBeVisible();
    await expect(workspace.getByLabel('Summary preview passage', { exact: true })).toContainText('Sun in Virgo');
    await studio.screenshot({ path: `test-results/calendar-summary-studio-${width}.png` });
  });
}
