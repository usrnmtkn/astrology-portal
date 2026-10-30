import { expect, test } from '@playwright/test';
import { servingPackageRecords } from '../../api/_lib/serving-package-records';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  for (const key of [
    'house-horoscope-core/moon/sagittarius/house-1',
    'authored/book-ritual-and-the-moon/lunation-horoscope/full-moon/taurus/rising-aries/house-2'
  ]) test(`Complete composition source without DB mirror ${key} ${width} ${theme}`, async ({ page }) => {
    const source = servingPackageRecords.get(key)!;
    const copy = source.body_you ?? source.body;
    const fieldName = source.body_you ? 'body_you' : 'body';
    const store = await studioApiStore([]);
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, answer: async (route, url) => {
        if (url.pathname !== '/api/admin/content-live-status') return false;
        const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload }); return true;
      } });
      const select = async () => {
        await page.getByRole('textbox', { name: 'Search composition sources', exact: true }).fill(key);
        const sources = page.getByRole('region', { name: 'Manage composition sources', exact: true });
        await expect(sources.locator('.admin-composition-source-copy')).toContainText(copy.slice(0, 70));
        await expect(sources.locator('.admin-composition-source-copy')).toContainText(copy.slice(-80));
        return sources;
      };
      await page.goto('/admin/content#composition-map?surface=sky-horoscopes');
      const sources = await select();
      await sources.getByRole('button', { name: 'Edit selected source', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      await expect(editor.locator(`textarea[data-sky-field="${fieldName}"]`)).toHaveValue(copy);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await select();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await store.call({ method: 'rows' })).toEqual([]);
    } finally { store.close(); }
  });
}
