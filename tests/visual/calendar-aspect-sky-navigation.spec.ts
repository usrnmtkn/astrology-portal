import { expect, test } from '@playwright/test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import calendarHandler from '../../api/calendar';
import skyHandler from '../../api/sky';
import { defaultLocation, getLunarCalendarMonth } from '../../apps/web/src/services/ephemeris';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { expectSkyAspectBody } from '../helpers/sky-aspect-reading';
import { watchBrowserErrors } from './qaRuntimeGuards';

const date = '2026-04-07';
const key = 'sky.aspect.moon.square.mercury';
const body = 'Synthetic updated Moon square Mercury opening. The full published passage belongs in Sky.\n\nA separate complete final paragraph must survive navigation, Back, and reload.';

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) for (const view of ['day', 'week', 'month']) {
  test(`Calendar ${view} opens the complete published Moon reading in Sky ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const assertNoErrors = watchBrowserErrors(page);
    const event = (await getLunarCalendarMonth(defaultLocation, new Date(`${date}T16:00:00Z`))).events
      .find(event => event.dateKey === date && event.type === 'aspect' && event.aspect === 'square' && event.planets?.includes('Moon') && event.planets.includes('Mercury'))!;
    expect(event).toBeDefined();
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date(`${date}T16:00:00Z`));
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await page.addInitScript(({ theme, location }) => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
    }, { theme, location: defaultLocation });
    await bundledPublications(page);
    await page.route('**/api/content-reader', route => {
      const keys: string[] = route.request().postDataJSON().keys ?? [];
      return route.fulfill({ json: readerResponse(keys.includes(key) ? [{
        id: 'synthetic-moon-navigation', content_key: key, body, summary: null, headline: 'Moon Square Mercury',
        surface: 'sky', mode: 'feed', block_type: 'sky_aspect', event_type: 'sky-aspect-owner-approved-exact',
        status: 'LIVE', lane: 'serving', review_state: null, provider: 'manual-admin', updated_at: '2026-11-08T06:00:00Z',
        source_snapshot: { contentStudioExactAspect: true, exactSkyAspectIdentity: { a: 'moon', b: 'mercury', aspect: 'square' } }
      }] : []) });
    });
    // Exercise the actual calculated facts handlers; only reader prose is synthetic.
    await page.route(/\/api\/(calendar|sky)\?/, async route => {
      const url = new URL(route.request().url());
      const response = { statusCode: 200, body: '', setHeader() {}, end(body: string) { this.body = body; } };
      await (url.pathname === '/api/calendar' ? calendarHandler : skyHandler)(
        { method: 'GET', url: url.href } as IncomingMessage, response as unknown as ServerResponse);
      await route.fulfill({ status: response.statusCode, contentType: 'application/json', body: response.body });
    });
    const routeView = view === 'week' ? 'weekly' : view;
    const calendarUrl = `/?date=${date}#calendar?view=${routeView}&date=${date}`;
    await page.goto(calendarUrl);
    const openAspect = async () => {
      if (view === 'month') await page.locator(`.lunar-calendar-day[data-calendar-date="${date}"]`).click();
      const scope = view === 'week' ? page.locator(`#calendar-day-group-${date}`) : page.locator('.calendar-day-events');
      const card = scope.getByRole('button', { name: /Moon squares Mercury/ });
      await expect(card).toBeVisible({ timeout: 60_000 });
      if (view !== 'week') await expect(card).toContainText(body.split('\n\n')[0]);
      await card.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`#sky/aspect/moon/square/mercury/at/${encodeURIComponent(event.startsAt)}$`));
      await expectSkyAspectBody(page, body);
    };
    await openAspect();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`#calendar\\?view=${routeView}&date=${date}$`));
    await expect(page.getByRole('tab', { name: view[0].toUpperCase() + view.slice(1), exact: true })).toHaveAttribute('aria-selected', 'true');
    await openAspect();
    await page.reload();
    await expectSkyAspectBody(page, body);
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#calendar\\?view=${routeView}&date=${date}$`));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    assertNoErrors();
  });
}
