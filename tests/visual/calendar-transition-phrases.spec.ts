import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { calendarTransitionPhraseRecords as records } from '../../api/_lib/calendar-transition-phrase-sources';

const key = 'authored/calendar-moon-context/dayAfterFullMoon';
const original = records.find(row => row.contentKey === key)!;
const revision = 'Synthetic transition phrase opening stays complete.\n\nSynthetic transition phrase final sentence stays complete.';
for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Moon transition phrases browse, edit, publish and render at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const store = await studioApiStore([]);
    const errors: string[] = [];
    let failPhraseLoad = true;
    let release = () => {};
    let gate: Promise<void> | null = null;
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
          if (url.searchParams.getAll('contentKeys').includes(key)) {
            if (failPhraseLoad) return route.fulfill({ status: 503, json: { error: 'Synthetic load failure' } });
            if (gate) await gate;
          }
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
      await page.getByRole('tab', { name: 'Moon transition phrases', exact: true }).click();
      await expect(page).toHaveURL(/view=moon-transition-phrases$/);
      const workspace = page.getByRole('region', { name: 'Moon transition phrases', exact: true });
      const table = workspace.getByRole('table');
      await expect(workspace.getByRole('alert')).toContainText('Could not load your saved transition phrases.');
      failPhraseLoad = false;
      gate = new Promise<void>(resolve => { release = resolve; });
      await workspace.getByRole('button', { name: 'Retry phrases', exact: true }).click();
      await expect(workspace.getByText('Loading saved transition phrases…')).toBeVisible();
      release(); gate = null;
      await expect(table.locator('tbody tr')).toHaveCount(26);
      await expect(table).toContainText('If you already started it yesterday');
      await expect(table).toContainText('Repeat what actually made yesterday easier');
      await expect(table).toContainText('Keep the part that became clear.');
      await expect(table).toContainText('The first reaction has had some time to settle.');
      expect(await table.getByRole('columnheader', { name: 'Used when', exact: true, includeHidden: true }).evaluate(typography)).toEqual(baseline);
      await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Calendar Write-ups');
      await expect(page.getByRole('heading', { name: 'Calendar writing workspaces', exact: true })).toHaveClass('sr-only');
      expect(await page.locator('.admin-dashboard-header h1').evaluate(element => Boolean(element.compareDocumentPosition(document.querySelector('[aria-label="Moon transition phrases"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      await expect(table.getByRole('columnheader', { includeHidden: true })).toHaveText(['Used when', 'Phrase preview', 'Publication', 'Edit']);
      await expect(page.locator('main.admin-dashboard')).toHaveAttribute('data-studio-theme', theme);
      await workspace.getByLabel('When the phrase appears', { exact: true }).selectOption('Around New Moons, Full Moons & eclipses');
      await expect(table.locator('tbody tr')).toHaveCount(9);
      await workspace.getByRole('textbox', { name: 'Search transition phrases' }).fill('Keep the part');
      await expect(table.locator('tbody tr')).toHaveCount(1);
      await expect(table).toContainText(original.body);
      expect(await store.call({ method: 'rows' })).toEqual([]);
      await page.screenshot({ path: `test-results/transition-phrases-${width}-${theme}.png`, fullPage: true });
      await workspace.getByRole('button', { name: 'Edit Day after a Full Moon', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      await expect(editor.getByRole('heading', { level: 2 })).toHaveText('Edit Day after a Full Moon');
      const field = editor.getByLabel('Transition phrase', { exact: true });
      await expect(field).toHaveValue(original.body);
      await field.fill(revision);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0]?.sections?.packageDraft?.body).toBe(revision);
      expect((await store.call({ method: 'rows' }))[0].status).toBe('DRAFT');
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await workspace.getByRole('textbox', { name: 'Search transition phrases' }).fill('Synthetic transition');
      await expect(table.locator('tbody tr')).toHaveCount(1);
      await expect(table).toContainText(revision);
      await workspace.getByRole('button', { name: 'Edit Day after a Full Moon', exact: true }).click();
      await expect(field).toHaveValue(revision);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0]?.status).toBe('LIVE');
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await expect(editor.getByLabel('Reader status', { exact: true })).toHaveText('Live');
      const published = (await store.call({ method: 'rows' }))[0];
      expect(published.body).toBe(revision);
      expect(published.sections.packageRecord.calendarWritingSource.originalBody).toBe(original.body);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await workspace.getByRole('textbox', { name: 'Search transition phrases' }).fill('no-matching-phrase');
      await expect(workspace.getByText('No transition phrases match these filters.')).toBeVisible();
      await page.screenshot({ path: `test-results/transition-phrases-empty-${width}-${theme}.png`, fullPage: true });
      await workspace.getByRole('button', { name: 'Reset filters', exact: true }).click();
      await expect(table.locator('tbody tr')).toHaveCount(26);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      await workspace.getByRole('button', { name: 'Edit Moon in Aries · Continuation', exact: true }).click();
      await field.fill('Synthetic saved Aries continuation.');
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).find(row => row.content_key.endsWith('/aries'))?.status).toBe('LIVE');
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.goto('/admin/content#calendar-writeups?view=moon-transition-phrases&q=' + encodeURIComponent(key));
      await expect(editor).toBeVisible();
      await expect(field).toHaveValue(revision);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      const publishedRows = await store.call({ method: 'rows' });
      await page.unrouteAll({ behavior: 'wait' });
      await bundledPublications(page);
      await page.route('**/api/content-reader', route => {
        const query = route.request().postDataJSON();
        const matches = publishedRows.filter(row => (!query.keys || query.keys.includes(row.content_key)) && (!query.ids || query.ids.includes(row.id))
          && (!query.prefix || row.content_key.startsWith(query.prefix)) && (!query.provider || query.provider === row.provider));
        return route.fulfill({ json: readerResponse(matches, publishedRows.map(row => ({ content_key: row.content_key, state: 'live', revision: 100_000, row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at }))) });
      });
      await page.clock.setFixedTime(new Date('2026-09-28T16:00:00Z'));
      for (const view of ['day', 'weekly']) {
        await page.goto(`/?date=2026-09-27#calendar?view=${view}&date=2026-09-27`);
        const copy = view === 'day' ? page.getByLabel('Selected lunar day', { exact: true }).locator('[data-guidance-key]') : page.locator('.calendar-day-group__blurb').filter({ hasText: 'Synthetic saved Aries continuation.' });
        await expect(copy).toContainText('Synthetic saved Aries continuation.', { timeout: 60_000 });
        for (const paragraph of revision.split('\n\n')) await expect(copy).toContainText(paragraph);
        await expect(copy).not.toContainText('The Full Moon was yesterday.');
        await expect(copy).toContainText('before it enters Taurus tomorrow.');
        await expect(copy).not.toContainText(original.body);
        await page.reload();
        for (const paragraph of revision.split('\n\n')) await expect(copy).toContainText(paragraph);
        await expect(copy).not.toContainText('The Full Moon was yesterday.');
        await page.screenshot({ path: `test-results/transition-phrases-reader-${view}-${width}-${theme}.png`, fullPage: true });
      }
      expect(errors).toEqual([]);
    } finally { release(); store.close(); }
  });
}
