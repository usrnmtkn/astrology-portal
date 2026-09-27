import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';

const cases = [
  { view: 'planetary-ingresses', label: 'Planetary ingresses', key: 'sky.ingress.mercury.scorpio', planet: 'mercury', field: 'Enters sign', date: '2026-09-30', title: 'Mercury enters Scorpio' },
  { view: 'planetary-stations', label: 'Planetary stations', key: 'sky.station.venus.scorpio.retrograde', planet: 'venus', field: 'Station sign', date: '2026-10-03', title: 'Venus stations retrograde' }
];
const typography = (element: Element) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
};

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Planetary workspaces save, reopen, publish and reach Calendar ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(150_000);
    const store = await studioApiStore([]);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let failLookup = false;
    try {
      await page.context().route('**/*', route => new URL(route.request().url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(route.request().method()) ? route.abort() : route.continue());
      // Studio also loads and caches the publication ledger. Isolate it before
      // the first navigation so real row identities cannot reject fixture rows.
      await bundledPublications(page);
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(value => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', value);
        localStorage.setItem('tldrastro:theme', value);
        localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
      }, theme);
      await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (['/api/admin/generated-content-inventory', '/api/admin/generated-content'].includes(url.pathname)) {
          if (failLookup && url.searchParams.has('contentKeys')) return route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic lookup failure' } });
          const result = await store.call({ method: request.method(), url: url.pathname + url.search, body: request.method() === 'GET' ? undefined : request.postDataJSON() });
          return route.fulfill({ status: result.status, json: result.payload });
        }
        if (url.pathname === '/api/admin/content-live-status') {
          const body = request.postDataJSON();
          return route.fulfill({ json: body.action === 'composition-catalog' ? { ok: true, rows: [] } : { ok: true, statuses: await store.call({ method: 'statuses', body }) } });
        }
        return route.fulfill({ json: { ok: true, rows: [], statuses: [], nextCursor: null } });
      });

      for (const item of cases) {
        const passage = `Synthetic ${item.view} opening.\n\nComplete synthetic ${item.view} final sentence.`;
        await page.goto(`/admin/content#calendar-writeups?view=${item.view}`);
        await expect(page.getByRole('heading', { name: 'Calendar Write-ups', exact: true })).toHaveJSProperty('tagName', 'H1');
        await expect(page.getByRole('heading', { name: 'Calendar writing workspaces', exact: true })).toHaveJSProperty('tagName', 'H2');
        const tabs = page.getByRole('tablist', { name: 'Calendar Write-ups workspaces' });
        const tab = tabs.getByRole('tab', { name: item.label, exact: true });
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        expect(await tab.evaluate(typography)).toEqual(await tabs.getByRole('tab', { name: 'Lunar ingresses', exact: true }).evaluate(typography));
        const names = await tabs.getByRole('tab').allTextContents();
        expect(names.slice(names.indexOf('Lunar ingresses'), names.indexOf('Lunar ingresses') + 4)).toEqual(['Lunar ingresses', 'Planetary ingresses', 'Planetary stations', 'Season write-ups']);
        const workspace = page.getByRole('region', { name: item.label, exact: true });
        await workspace.getByLabel('Planet or point', { exact: true }).selectOption('');
        await workspace.getByLabel(item.field, { exact: true }).selectOption('');
        await expect(workspace).toContainText('No saved write-ups match this selection.');
        await expect(workspace.getByRole('button', { name: 'Open write-up', exact: true })).toBeDisabled();
        await workspace.getByLabel('Planet or point', { exact: true }).selectOption(item.planet);
        await workspace.getByLabel(item.field, { exact: true }).selectOption('scorpio');
        await page.screenshot({ path: `test-results/${item.view}-empty-${width}-${theme}.png`, fullPage: true });
        if (width === 1440 && theme === 'light' && item.view === 'planetary-ingresses') {
          failLookup = true;
          await workspace.getByRole('button', { name: 'Open write-up', exact: true }).click();
          await expect(page.getByRole('status').filter({ hasText: 'Could not open this write-up.' })).toBeVisible();
          await expect(page.getByRole('dialog', { name: 'Generated content editor' })).toHaveCount(0);
          expect(await store.call({ method: 'rows' })).toEqual([]);
          failLookup = false;
        }
        await workspace.getByRole('button', { name: 'Open write-up', exact: true }).click();
        const editor = page.getByRole('dialog', { name: 'Generated content editor' });
        await expect(editor.getByRole('heading', { level: 2 })).toContainText(`Write ${item.title}`);
        await expect(editor.getByLabel('Content key', { exact: true })).toHaveValue(item.key);
        const body = editor.getByLabel('Event write-up', { exact: true });
        await expect(body).toHaveValue('');
        await expect(editor.getByRole('button', { name: 'Save & publish', exact: true })).toBeDisabled();
        await body.fill(passage);
        await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
        await expect(editor).toContainText('All changes saved');
        expect((await store.call({ method: 'rows' })).find((row: any) => row.content_key === item.key)).toMatchObject({ status: 'DRAFT', body: passage });
        await editor.getByRole('button', { name: 'Close', exact: true }).click();
        await page.reload();
        const edit = workspace.getByRole('button', { name: `Edit ${item.key}`, exact: true });
        await edit.click();
        await expect(body).toHaveValue(passage);
        await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
        await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.content_key === item.key)?.status).toBe('LIVE');
        await expect(editor.getByRole('alert')).toHaveCount(0);
        await editor.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(workspace.getByRole('table').getByText('Live', { exact: true })).toBeVisible();
        await workspace.getByLabel('Planet or point', { exact: true }).selectOption(item.planet);
        await workspace.getByLabel(item.field, { exact: true }).selectOption('scorpio');
        await workspace.getByRole('button', { name: 'Open write-up', exact: true }).click();
        await expect(body).toHaveValue(passage);
        await expect(editor.getByRole('heading', { level: 2 })).toContainText(`Edit ${item.title}`);
        await editor.getByRole('button', { name: 'Close', exact: true }).click();
        if (item.view === 'planetary-stations') {
          await workspace.getByLabel('Station direction', { exact: true }).selectOption('direct');
          await expect(edit).toHaveCount(0);
          await workspace.getByLabel('Station direction', { exact: true }).selectOption('retrograde');
          await expect(edit).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `test-results/${item.view}-saved-${width}-${theme}.png`, fullPage: true });
      }

      const saved = await store.call({ method: 'rows' });
      expect(saved).toHaveLength(2);
      await page.unrouteAll({ behavior: 'wait' });
      await bundledPublications(page);
      await page.route('**/api/content-reader', route => {
        const keys = route.request().postDataJSON().keys ?? [];
        return route.fulfill({ json: readerResponse(saved.filter((row: any) => keys.includes(row.content_key))) });
      });
      for (const item of cases) {
        await page.goto(`/?date=${item.date}#calendar?view=day&date=${item.date}`);
        const card = page.locator('.calendar-day-events .calendar-stoic-card').filter({ hasText: item.title });
        await expect(card).toContainText(`Synthetic ${item.view} opening.`, { timeout: 45_000 });
        await card.click();
        const detail = page.getByRole('dialog', { name: 'Event detail' });
        await expect(detail).toContainText(`Complete synthetic ${item.view} final sentence.`);
      }
      expect(errors).toEqual([]);
    } finally { await page.unrouteAll({ behavior: 'wait' }); await page.close(); store.close(); }
  });
}
