import { test, expect } from '@playwright/test';
import { lunarJournalPackageRecords, lunarJournalDetailRow } from '../../api/_lib/lunar-journal-sources';
import { calendarWritingStudioHref } from '../../apps/web/src/features/calendar/calendarWritingStudio';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { studioApiStore } from '../helpers/studio-api-store';

const key = 'authored/lunar-journal/season/libra/20250922t181900z';
const libra = lunarJournalPackageRecords.find(record => record.contentKey === key)!;
const records = lunarJournalPackageRecords.map(lunarJournalDetailRow);
const seasons = lunarJournalPackageRecords.filter(record => record.type === 'season');
const typography = (element: Element) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
};

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Season sidebar opens full season readings at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    const store = await studioApiStore([]);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      // Remote release verification uses this same isolated API: browsing cannot write live rows.
      await page.context().route('**/*', route => {
        if (new URL(route.request().url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(route.request().method())) return route.abort();
        return route.continue();
      });
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(value => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', value);
      }, theme);
      await routeStudioInventoryApi(page, { call: store.call, listRows: () => records });
      await page.goto('/admin/content#calendar-writeups?view=season-transitions');
      const baseline = await page.getByRole('table', { name: 'Season transition passages' }).getByRole('columnheader', { name: 'Transition', exact: true, includeHidden: true }).evaluate(typography);
      if (width === 390) await page.getByRole('button', { name: 'Open Content Studio navigation', exact: true }).click();
      const nav = page.getByRole('navigation', { name: 'Content operations' });
      const navEntry = nav.getByRole('button', { name: 'Season write-ups', exact: true });
      expect(await navEntry.evaluate(typography)).toEqual(await nav.getByRole('button', { name: 'Season transitions', exact: true }).evaluate(typography));
      await navEntry.click();
      await expect(page).toHaveURL(/#calendar-writeups\?view=season-writeups$/);
      if (width === 390) await page.getByRole('button', { name: 'Open Content Studio navigation', exact: true }).click();
      await expect(navEntry).toHaveAttribute('aria-current', 'page');
      if (width === 390) await page.getByRole('button', { name: 'Hide Content Studio navigation', exact: true }).click();
      const tab = page.getByRole('tab', { name: 'Season write-ups', exact: true });
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      const tabBox = await tab.boundingBox();
      const strip = await page.getByRole('tablist', { name: 'Calendar Write-ups workspaces' }).boundingBox();
      expect(tabBox!.x).toBeGreaterThanOrEqual(strip!.x);
      expect(tabBox!.x + tabBox!.width).toBeLessThanOrEqual(strip!.x + strip!.width + 1);
      const workspace = page.getByRole('region', { name: 'Season write-ups', exact: true });
      const table = workspace.getByRole('table', { name: 'Season passages' });
      await expect(table.locator('tbody tr')).toHaveCount(12);
      await expect(table.locator('tbody tr').getByRole('cell').filter({ hasText: /^Season · / })).toHaveCount(12);
      for (const cell of await table.locator('td[data-label="Saved passage"]').all()) {
        expect(Array.from((await cell.innerText()).trim()).length).toBeLessThanOrEqual(200);
      }
      await expect(page.getByRole('region', { name: 'Calendar template preview' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Add leftover write-up' })).toHaveCount(0);
      await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Calendar Write-ups');
      await expect(page.getByRole('heading', { name: 'Calendar writing workspaces' })).toHaveClass('sr-only');
      expect(await page.locator('.admin-dashboard-header h1').evaluate(element => Boolean(element.compareDocumentPosition(document.querySelector('[aria-label="Season write-ups"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      await expect(table.getByRole('columnheader', { includeHidden: true })).toHaveText(['Season', 'Saved passage', 'Publication', 'Edit']);
      expect(await table.getByRole('columnheader', { name: 'Season', exact: true, includeHidden: true }).evaluate(typography)).toEqual(baseline);
      const sign = workspace.getByLabel('Season sign', { exact: true });
      await sign.selectOption('libra');
      await expect(table.locator('tbody tr')).toHaveCount(1);
      const preview = (await table.getByRole('cell').nth(1).innerText()).trim();
      expect(preview).toMatch(/…$/u);
      expect(libra.body.startsWith(preview.slice(0, -1))).toBe(true);
      expect(preview).not.toContain('What relationships need me to show up more honestly?');
      await expect(page.locator('main.admin-dashboard')).toHaveAttribute('data-studio-theme', theme);
      await page.screenshot({ path: `test-results/season-writeups-${width}-${theme}.png`, fullPage: true });
      await table.getByRole('button', { name: 'Edit Season · Libra', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      await expect(editor.getByRole('heading', { level: 2 })).toHaveText('Edit Libra Season');
      await expect(editor.getByLabel('Full lunar passage', { exact: true })).toHaveValue(libra.body);
      await expect(editor.getByLabel('Full lunar passage', { exact: true })).toBeFocused();
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      const search = workspace.getByRole('textbox', { name: 'Search season write-ups' });
      await search.fill('What relationships need me to show up more honestly?');
      await expect(table.locator('tbody tr')).toHaveCount(1);
      await expect(table.getByRole('cell').nth(1)).toHaveText(preview);
      await search.fill('no-matching-season-writeup');
      await expect(workspace.getByText('No season write-ups match these filters.')).toBeVisible();
      await expect(table.locator('tbody tr')).toHaveCount(0);
      await page.screenshot({ path: `test-results/season-writeups-empty-${width}-${theme}.png`, fullPage: true });
      await workspace.getByRole('button', { name: 'Reset filters' }).click();
      await expect(sign).toHaveValue('all');
      await expect(workspace.getByRole('status')).toHaveText(`${seasons.length} passages`);
      await page.reload();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(table.locator('tbody tr')).toHaveCount(12);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.goto(`/admin/content${new URL(calendarWritingStudioHref(key)).hash}`);
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(editor.getByLabel('Full lunar passage', { exact: true })).toHaveValue(libra.body);
      expect(await store.call({ method: 'rows' })).toEqual([]);
      expect(errors).toEqual([]);
    } finally { store.close(); }
  });
}
