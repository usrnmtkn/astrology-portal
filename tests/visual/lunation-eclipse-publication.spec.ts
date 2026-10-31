import { expect, test } from '@playwright/test';
import { servingPackageRecords } from '../../api/_lib/serving-package-records';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  for (const key of [
    'authored/lunation-eclipse-section/pisces/rising-aries/house-12/evergreen-body',
    'authored/lunation-eclipse-house-layer/solar/house-1'
  ]) test(`Eclipse source saves reopens publishes and reaches reader ${key} ${width} ${theme}`, async ({ page }) => {
    const original = servingPackageRecords.get(key)!;
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
      const open = async () => {
        await page.getByRole('textbox', { name: 'Search composition sources', exact: true }).fill(key);
        const sources = page.getByRole('region', { name: 'Manage composition sources', exact: true });
        await sources.getByRole('button', { name: 'Edit selected source', exact: true }).click();
        return page.getByRole('dialog', { name: 'Generated content editor' });
      };
      await page.goto('/admin/content#composition-map?surface=sky-horoscopes');
      const editor = await open();
      const field = editor.locator('textarea[data-sky-field="body"]');
      await expect(field).toHaveValue(original.body);
      const body = 'Synthetic complete eclipse revision opening.\n\nThe exact synthetic ending survives publication.';
      await field.fill(body);
      await editor.getByRole('button', { name: /^Save(?: draft)?$/, exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.content_key === key)?.sections.packageDraft?.body).toBe(body);
      await page.reload();
      await open();
      await expect(field).toHaveValue(body);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect(editor.getByLabel('Reader status', { exact: true })).toHaveText('Live');
      const response = await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [key] } });
      expect(response.status).toBe(200);
      expect(response.payload.rows[0].body).toBe(body);
      expect(response.payload.rows[0].sections.packageRecord.studio_lunation_revision.schema).toBe('content-studio-lunation-revision/v1');
      const saved = (await store.call({ method: 'rows' })).find((row: any) => row.content_key === key);
      expect(saved.sections.packageOriginalRecord.body).toBe(original.body);
      await page.reload();
      await open();
      await expect(field).toHaveValue(body);
      expect(await editor.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    } finally { store.close(); }
  });
}
