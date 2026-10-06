import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { bundledPublications } from '../helpers/bundled-publications';
import { calendarRxFixture, calendarDefaultBody, calendarRxBody } from '../helpers/calendar-rx-fixture';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Calendar optional Rx version preserves the default ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(120000);
    const store = await studioApiStore([calendarRxFixture()]);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let failSave = false;
    try {
      // Isolate the publication plane before Studio can seed a reader cache.
      await bundledPublications(page);
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
        localStorage.setItem('tldrastro:theme', theme);
        localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
      }, theme);
      await routeStudioInventoryApi(page, {
        // Match the real inventory's updated_at.desc ordering after a draft fork.
        listRows: rows => rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
        call: async message => {
        if (failSave && message.method === 'PATCH') return { status: 503, payload: { ok: false, error: 'Synthetic storage failure. Retry saving.' } };
        return store.call(message);
      }, answer: async (route, url) => {
        if (url.pathname !== '/api/admin/content-live-status') return false;
        await route.fulfill({ json: { ok: true, statuses: await store.call({ method: 'statuses', body: route.request().postDataJSON() }) } });
        return true;
      } });
      await page.goto('/admin/content#exact-content?category=Calendar+Aspects&first=moon&aspect=trine&second=saturn');
      const item = page.locator('.admin-content-row').filter({ hasText: 'Moon Trine Saturn' }).first();
      await item.getByRole('button', { name: 'Edit', exact: true }).click();
      const editor = page.getByRole('dialog');
      const field = editor.getByRole('textbox', { name: 'Retrograde version · Saturn Rx', exact: true });
      const defaultField = editor.getByLabel('Fallback field Default version', { exact: true });
      await expect(defaultField).toHaveValue(calendarDefaultBody);
      await expect(field).toHaveValue('');
      await expect(editor.getByRole('textbox', { name: /Retrograde version · Moon/ })).toHaveCount(0);
      expect(await field.evaluate(element => (element as HTMLTextAreaElement).labels?.length)).toBe(1);
      await field.fill(calendarRxBody);
      // Field typography follows the established editor role in every theme/width.
      const style = (element: Element) => {
        const css = getComputedStyle(element);
        return ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'].map(key => css[key as keyof CSSStyleDeclaration]);
      };
      expect(await field.evaluate(style)).toEqual(await defaultField.evaluate(style));
      if (width === 1440 && theme === 'light') {
        failSave = true;
        await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
        await expect(editor).toContainText('Synthetic storage failure. Retry saving.');
        await expect(field).toHaveValue(calendarRxBody);
        failSave = false;
      }
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).some((row: any) => row.sections?.packageDraft?.RetrogradeBodyB === calendarRxBody)).toBe(true);
      expect((await store.call({ method: 'rows' })).find((row: any) => row.id === 'calendar-rx-fixture').body).toBe(calendarDefaultBody);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await item.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(field).toHaveValue(calendarRxBody);
      await expect(defaultField).toHaveValue(calendarDefaultBody);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.id === 'calendar-rx-fixture')?.sections?.packageRecord?.RetrogradeBodyB).toBe(calendarRxBody);
      const live = (await store.call({ method: 'rows' })).find((row: any) => row.id === 'calendar-rx-fixture');
      expect(live.body).toBe(calendarDefaultBody);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await field.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/calendar-rx-editor-${width}-${theme}.png` });

      await page.unroute('**/api/**');
      await bundledPublications(page);
      await page.route('**/api/content-publications', async route => route.fulfill({ json: {
        schema: 'tldr-publications/v1', publications: await store.call({ method: 'publications' })
      } }));
      await page.route('**/api/content-reader', async route => {
        const result = await store.call({ method: 'POST', url: '/api/content-reader', body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload });
      });
      await page.clock.setFixedTime(new Date('2026-10-05T16:00:00Z'));
      await page.goto('/?date=2026-10-05#calendar?view=day&date=2026-10-05');
      const card = page.locator('.calendar-day-events .calendar-stoic-card').filter({ hasText: /Moon trines Saturn/ });
      await expect(card).toContainText('Synthetic retrograde opening.', { timeout: 60000 });
      await expect(card).toContainText('Synthetic retrograde final sentence.');
      await expect(card).not.toContainText('Synthetic default opening.');
      await card.click();
      const detail = page.getByRole('dialog', { name: 'Event detail' });
      await expect(detail).toContainText('Synthetic retrograde opening.');
      await expect(detail).toContainText('Synthetic retrograde final sentence.');
      await page.reload();
      await expect(card).toContainText('Synthetic retrograde final sentence.', { timeout: 60000 });
      expect(errors).toEqual([]);
    } finally { store.close(); }
  });
}
