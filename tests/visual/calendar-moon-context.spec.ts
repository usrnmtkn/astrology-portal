import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { calendarSubscriptionFixture } from '../helpers/calendar-subscription-fixture';

const key = 'authored/calendar-moon-context/after-full-moon';
const revision = 'Synthetic context opening. Previous event: {{previousLunationSign}} on {{previousLunationDate}}. [Open event]({{previousLunationUrl}}). Synthetic context final sentence.';
for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Calendar context edits reach Day and Week at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    const store = await studioApiStore([]);
    const readings = await calendarSubscriptionFixture();
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

      await page.goto('/admin/content#calendar-writeups?view=daily-sky');
      await page.getByLabel('Content family', { exact: true }).selectOption('Moon cycle context');
      await page.getByLabel('Selected passage', { exact: true }).selectOption(key);
      const detail = page.getByRole('region', { name: 'Selected lunar passage' });
      await expect(detail).toContainText('The waning phase that follows');
      expect(await store.call({ method: 'rows' })).toEqual([]);
      await detail.getByRole('button', { name: 'Edit passage', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      const field = editor.getByLabel('Full lunar passage', { exact: true });
      await field.fill(revision);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0]?.sections?.packageDraft?.body).toBe(revision);
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await page.getByLabel('Content family', { exact: true }).selectOption('Moon cycle context');
      await page.getByLabel('Selected passage', { exact: true }).selectOption(key);
      await detail.getByRole('button', { name: 'Edit passage', exact: true }).click();
      await expect(field).toHaveValue(revision);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0]?.status).toBe('LIVE');
      await expect(editor.getByRole('alert')).toHaveCount(0);
      const published = (await store.call({ method: 'rows' }))[0];
      expect(published.body).toBe(revision);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.screenshot({ path: `test-results/calendar-context-studio-${width}-${theme}.png`, fullPage: true });
      await page.unrouteAll({ behavior: 'wait' });
      await bundledPublications(page);
      await page.route('**/api/calendar-reading?*', async route => {
        const url = new URL(route.request().url());
        const result = await readings.invoke(url.pathname + url.search);
        await route.fulfill({ status: result.status, headers: result.headers, body: result.body });
      });
      const requests: string[][] = [];
      await page.route('**/api/content-reader', route => {
        const query = route.request().postDataJSON();
        if (query.keys) requests.push(query.keys);
        const matches = (!query.keys || query.keys.includes(key)) && (!query.ids || query.ids.includes(published.id))
          && (!query.prefix || key.startsWith(query.prefix)) && (!query.provider || query.provider === published.provider);
        return route.fulfill({ json: readerResponse(matches ? [published] : [], [{ content_key: key, state: 'live', revision: 100_000, row_id: published.id, row_updated_at: published.updated_at, updated_at: published.updated_at }]) });
      });
      for (const view of ['day', 'week']) {
        await page.goto(`/?date=2026-09-29#calendar?view=${view}&date=2026-09-29`);
        await expect(page.getByText(/Synthetic context opening/).first()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText(/Synthetic context final sentence/).first()).toBeVisible();
        await expect(page.getByText(/Previous event: Aries on September 26/).first()).toBeVisible();
        expect(requests.some(keys => keys.includes(key))).toBe(true);
        const link = page.getByRole('link', { name: 'Open event', exact: true }).first();
        await expect(link).toHaveAttribute('href', /date=2026-09-26.*event=/);
        await page.screenshot({ path: `test-results/calendar-context-${view}-${width}-${theme}.png`, fullPage: true });
        await link.click();
        const reading = page.getByRole('dialog', { name: /Full Moon in Aries/ });
        await expect(reading).toBeVisible();
        await expect(reading.locator('.calendar-reading__body')).not.toBeEmpty();
      }
      expect(errors).toEqual([]);
    } finally { store.close(); readings.close(); }
  });
}

const rewrittenDays = [
  ['2026-09-27', 'wanting something and acting on it can feel very close together.', 'there is no requirement to make a decision today.'],
  ['2026-09-28', 'In Aries, the Moon emphasizes independence and the impulse to act.', 'than to starting something new.'],
  ['2026-09-29', 'The Taurus Moon brings attention to comfort', 'with more time to consider what you need.'],
  ['2026-09-30', 'The shift from Taurus to Gemini brings a different way of working through feelings', 'a possibility you had not thought of.'],
  ['2026-10-01', 'With the Moon in Gemini, talking through a feeling can help you understand it.', 'whether in a conversation or a journal.'],
  ['2026-10-02', 'As the Moon moves from Gemini to Cancer', 'time alone may be just as welcome.'],
  ['2026-10-03', 'The Cancer Moon brings attention to home, closeness, and the care you need.', 'whether your approach needs to change.']
];
for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Rewritten seven-day set is complete in Day and Week at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await bundledPublications(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
    }, theme);
    await page.goto('/?date=2026-09-27#calendar?view=week&date=2026-09-27');
    for (const [date, opening, ending] of rewrittenDays) {
      const group = page.locator(`#calendar-day-group-${date}`);
      await expect(group).toContainText(opening, { timeout: 30_000 });
      await expect(group).toContainText(ending);
      await expect(group).not.toContainText(/If you already started it yesterday|The urgency starts to wear off|Repeat what actually made yesterday easier|what the harvest proved/);
    }
    await page.screenshot({ path: `test-results/calendar-rewritten-week-${width}-${theme}.png`, fullPage: true });
    for (const [date, opening, ending] of rewrittenDays) {
      await page.goto(`/?date=${date}#calendar?view=day&date=${date}`);
      const body = page.getByRole('region', { name: 'Moon guidance', exact: true });
      await expect(body).toContainText(opening, { timeout: 30_000 });
      await expect(body).toContainText(ending);
    }
    await expect(page.getByRole('link', { name: 'New Moon in Libra on October 10' }).first()).toHaveAttribute('href', /date=2026-10-10.*event=lunation-new-moon/);
    await page.screenshot({ path: `test-results/calendar-rewritten-day-${width}-${theme}.png`, fullPage: true });
  });
}
