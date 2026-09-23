import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { calendarMoonIngressPackageRecords as records } from '../../api/_lib/calendar-moon-ingress-sources';

const key = 'authored/calendar-moon-transition/aquarius/pisces';
const original = records.find(row => row.contentKey === key)!;
const revision = 'Synthetic lunar ingress opening stays complete.\n\nSynthetic lunar ingress final sentence stays complete.';
for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Lunar ingresses browse, edit, publish and render at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    const store = await studioApiStore([]);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      // Safe on production assets too: every API request and write is isolated.
      await page.context().route('**/*', route => {
        const request = route.request();
        if (new URL(request.url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) return route.abort();
        return route.continue();
      });
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(value => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', value);
        localStorage.setItem('tldrastro:theme', value);
        localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
      }, theme);
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (['/api/admin/generated-content-inventory', '/api/admin/generated-content'].includes(url.pathname)) {
          const result = await store.call({ method: route.request().method(), url: `${url.pathname}${url.search}`, body: route.request().method() === 'GET' ? undefined : route.request().postDataJSON() });
          return route.fulfill({ status: result.status, json: result.payload });
        }
        if (url.pathname === '/api/admin/content-live-status') {
          const body = route.request().postDataJSON();
          return route.fulfill({ json: body.action === 'composition-catalog' ? { ok: true, rows: [] } : { ok: true, statuses: await store.call({ method: 'statuses', body }) } });
        }
        return route.fulfill({ json: { ok: true, rows: [], statuses: [], nextCursor: null } });
      });
      await page.goto('/admin/content#calendar-writeups?view=season-transitions');
      const typography = (element: Element) => {
        const style = getComputedStyle(element);
        return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
      };
      const baseline = await page.getByRole('table', { name: 'Season transition passages', exact: true }).getByRole('columnheader', { name: 'Transition', exact: true, includeHidden: true }).evaluate(typography);
      await page.getByRole('tab', { name: 'Lunar ingresses', exact: true }).click();
      await expect(page).toHaveURL(/view=lunar-ingresses$/);
      const workspace = page.getByRole('region', { name: 'Lunar ingresses', exact: true });
      const table = workspace.getByRole('table');
      await expect(table.locator('tbody tr')).toHaveCount(12);
      await expect(table.locator('tbody tr').first().getByRole('cell').first()).toHaveText('Moon enters Aries');
      await expect(table.locator('tbody tr').last().getByRole('cell').first()).toHaveText('Moon enters Pisces');
      expect(await table.getByRole('columnheader', { name: 'Moon ingress', exact: true, includeHidden: true }).evaluate(typography)).toEqual(baseline);
      await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Calendar Write-ups');
      await expect(page.getByRole('heading', { name: 'Calendar writing workspaces', exact: true })).toHaveClass('sr-only');
      expect(await page.locator('.admin-dashboard-header h1').evaluate(element => Boolean(element.compareDocumentPosition(document.querySelector('[aria-label="Lunar ingresses"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      await expect(table.getByRole('columnheader', { includeHidden: true })).toHaveText(['Moon ingress', 'Saved passage', 'Publication', 'Edit']);
      await expect(page.locator('main.admin-dashboard')).toHaveAttribute('data-studio-theme', theme);
      await workspace.getByLabel('Moon enters', { exact: true }).selectOption('pisces');
      await expect(table.locator('tbody tr')).toHaveCount(1);
      await expect(table).toContainText(original.body);
      expect(await store.call({ method: 'rows' })).toEqual([]);
      await page.screenshot({ path: `test-results/lunar-ingress-${width}-${theme}.png`, fullPage: true });
      await workspace.getByRole('button', { name: 'Edit Moon enters Pisces', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      await expect(editor.getByRole('heading', { level: 2 })).toHaveText('Edit Moon enters Pisces');
      const field = editor.getByLabel('Lunar ingress passage', { exact: true });
      await expect(field).toHaveValue(original.body);
      await field.fill(revision);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0]?.sections?.packageDraft?.body).toBe(revision);
      expect((await store.call({ method: 'rows' }))[0].status).toBe('DRAFT');
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await workspace.getByRole('textbox', { name: 'Search lunar ingresses' }).fill('Synthetic lunar');
      await expect(table.locator('tbody tr')).toHaveCount(1);
      await expect(table).toContainText(revision);
      await workspace.getByRole('button', { name: 'Edit Moon enters Pisces', exact: true }).click();
      await expect(field).toHaveValue(revision);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0]?.status).toBe('LIVE');
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await expect(editor.getByLabel('Reader status', { exact: true })).toHaveText('Live');
      const published = (await store.call({ method: 'rows' }))[0];
      expect(published.body).toBe(revision);
      expect(published.sections.packageRecord.calendarWritingSource.originalBody).toBe(original.body);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await workspace.getByRole('textbox', { name: 'Search lunar ingresses' }).fill('no-matching-ingress');
      await expect(workspace.getByText('No lunar ingresses match these filters.')).toBeVisible();
      await page.screenshot({ path: `test-results/lunar-ingress-empty-${width}-${theme}.png`, fullPage: true });
      await workspace.getByRole('button', { name: 'Reset filters', exact: true }).click();
      await expect(table.locator('tbody tr')).toHaveCount(12);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      await page.unrouteAll({ behavior: 'wait' });
      await bundledPublications(page);
      await page.route('**/api/content-reader', route => {
        const query = route.request().postDataJSON();
        const matches = (!query.keys || query.keys.includes(key)) && (!query.ids || query.ids.includes(published.id))
          && (!query.prefix || key.startsWith(query.prefix)) && (!query.provider || query.provider === published.provider);
        return route.fulfill({ json: readerResponse(matches ? [published] : [], [{ content_key: key, state: 'live', revision: 100_000, row_id: published.id, row_updated_at: published.updated_at, updated_at: published.updated_at }]) });
      });
      await page.goto('/?date=2026-09-23#calendar?view=day&date=2026-09-23');
      const card = page.locator('.calendar-stoic-card').filter({ has: page.getByText('Moon enters Pisces', { exact: true }) });
      for (const paragraph of revision.split('\n\n')) await expect(card).toContainText(paragraph, { timeout: 30_000 });
      await card.click();
      const drawer = page.getByRole('dialog');
      for (const paragraph of revision.split('\n\n')) await expect(drawer).toContainText(paragraph);
      await page.screenshot({ path: `test-results/lunar-ingress-reader-${width}-${theme}.png`, fullPage: true });
      expect(errors).toEqual([]);
    } finally { store.close(); }
  });
}
