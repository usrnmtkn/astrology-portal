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

for (const [width, theme] of [[390, 'light'], [1440, 'dark']] as const) {
  for (const key of [
    'house-horoscope-core/moon/sagittarius/house-1',
    'authored/book-ritual-and-the-moon/lunation-horoscope/full-moon/taurus/rising-aries/house-2'
  ]) test(`Partial composition source preserves edits and clears ${key} ${width} ${theme}`, async ({ page }) => {
    const baseline = servingPackageRecords.get(key)!;
    const field = baseline.body_you ? 'body_you' : 'body';
    const copy = baseline[field];
    const record = { contentKey: key, content_role: baseline.content_role,
      review_status: 'needs_review', owner_approved: false, serving_enabled: false, body_they: '' };
    const source = { id: 'partial-composition-source', content_key: key, headline: 'Synthetic partial source', summary: '', body: '',
      status: 'LIVE', surface: 'sky', mode: 'in_depth', lane: 'serving', review_state: null, target_date: null,
      provider: 'tldrastro-fallback-architecture-v3', event_type: 'fallback-hook', block_type: 'fallback_hook',
      updated_at: '2026-10-01T12:00:00.123456Z', sections: { packageRecord: record },
      source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3' }, facts: { fallbackArchitectureV3: true } };
    const store = await studioApiStore([source]);
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true });
      const open = async (expected: string) => {
        await page.getByRole('textbox', { name: 'Search composition sources', exact: true }).fill(key);
        const sources = page.getByRole('region', { name: 'Manage composition sources', exact: true });
        await expect(sources.locator('.admin-composition-source-copy')).toContainText(expected.slice(0, 70));
        await expect(sources.locator('.admin-composition-source-copy')).toContainText(expected.slice(-80));
        await sources.getByRole('button', { name: 'Edit selected source', exact: true }).click();
        return page.getByRole('dialog', { name: 'Generated content editor' });
      };
      await page.goto('/admin/content#composition-map?surface=sky-horoscopes');
      let editor = await open(copy);
      const writing = () => editor.locator(`textarea[data-sky-field="${field}"]`);
      await expect(writing()).toHaveValue(copy);
      expect((await store.call({ method: 'rows' })).find((row: any) => row.id === source.id)).toEqual(source);
      const edited = 'During this transit, synthetic edited composition opening.\n\nComplete synthetic final sentence survives reload.';
      await writing().fill(edited);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).some((row: any) => row.sections?.packageDraft?.[field] === edited)).toBe(true);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload(); editor = await open(edited);
      await expect(writing()).toHaveValue(edited);
      await writing().fill('');
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).some((row: any) => row.sections?.packageDraft?.[field] === '')).toBe(true);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await page.getByRole('textbox', { name: 'Search composition sources', exact: true }).fill(key);
      await page.getByRole('region', { name: 'Manage composition sources', exact: true }).getByRole('button', { name: 'Edit selected source', exact: true }).click();
      editor = page.getByRole('dialog', { name: 'Generated content editor' });
      await expect(writing()).toHaveValue('');
      expect((await store.call({ method: 'rows' })).find((row: any) => row.id === source.id)).toEqual(source);
      const pending = (await store.call({ method: 'rows' })).find((row: any) => row.status === 'DRAFT');
      expect(pending.sections.packageDraft.body_they).toBe('');
      expect(pending.sections.packageOriginalRecord).toEqual(record);
      await page.screenshot({ path: `test-results/generic-partial-source-${width}-${theme}-${field}.png` });
    } finally { store.close(); }
  });
}
