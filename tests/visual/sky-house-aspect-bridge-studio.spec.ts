import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { skyPlacementAspectBridgeKey } from '../../apps/web/src/content/skyPlacementAspectBridge';

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`House × aspect bridge draft saves and reopens ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    const store = await studioApiStore([]);
    try {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true });
      const entry = process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/';
      await page.goto(`${entry}#sky-writeups?view=house-aspect-bridges`);
      const region = page.getByRole('region', { name: 'House × aspect bridges', exact: true });
      await expect(region).toBeVisible();
      await expect(region.getByRole('heading', { level: 2, name: 'House × aspect bridges', exact: true })).toBeVisible();
      await expect(region.getByRole('combobox', { name: 'House', exact: true })).toHaveValue('8');
      await expect(region.getByRole('combobox', { name: 'Transiting planet', exact: true })).toHaveValue('venus');
      await expect(region.getByRole('combobox', { name: 'Aspect', exact: true })).toHaveValue('trine');
      await expect(region.getByRole('combobox', { name: 'Natal point', exact: true })).toHaveValue('mars');
      await region.getByRole('button', { name: 'Open bridge', exact: true }).click();
      const editor = page.getByRole('dialog');
      const field = editor.locator('textarea[data-sky-field="body"]');
      await expect(field).toHaveValue('');
      expect(await store.call({ method: 'rows' })).toEqual([]);
      const body = 'Synthetic house bridge opening.\n\nSynthetic bridge final sentence.';
      await field.fill(body);
      await editor.getByRole('button', { name: /^Save(?: draft)?$/, exact: true }).click();
      const key = skyPlacementAspectBridgeKey({ house: 8, transiting: 'venus', aspect: 'trine', natal: 'mars' });
      await expect.poll(async () => (await store.call({ method: 'rows' })).length).toBe(1);
      const rows = await store.call({ method: 'rows' });
      expect(rows[0].status).toBe('DRAFT');
      expect(rows[0].content_key).toBe(key);
      expect(rows[0].sections.packageDraft?.body ?? rows[0].sections.packageRecord.body).toBe(body);
      await page.reload();
      await region.getByRole('button', { name: 'Open bridge', exact: true }).click();
      await expect(field).toHaveValue(body);
      await expect(editor).toContainText('Transit aspect · natal contact');
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0].status).toBe('LIVE');
      await page.reload();
      await region.getByRole('button', { name: 'Open bridge', exact: true }).click();
      await expect(field).toHaveValue(body);
      await editor.screenshot({ path: `test-results/house-aspect-bridge-studio-${width}-${theme}.png` });
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await region.getByRole('combobox', { name: 'House', exact: true }).selectOption('7');
      await region.getByRole('button', { name: 'Open bridge', exact: true }).click();
      await expect(field).toHaveValue('');
      expect((await store.call({ method: 'rows' })).length).toBe(1);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { store.close(); }
  });
}
