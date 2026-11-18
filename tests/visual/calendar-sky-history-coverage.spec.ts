import { expect, test } from '@playwright/test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import calendarHandler from '../../api/calendar';
import skyHandler from '../../api/sky';
import { defaultLocation, getLunarCalendarMonth } from '../../apps/web/src/services/ephemeris';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { expectSkyAspectBody } from '../helpers/sky-aspect-reading';
import { watchBrowserErrors } from './qaRuntimeGuards';

const date = '2044-08-13';
const key = 'sky.aspect.jupiter.conjunction.lilith';
const body = 'Synthetic complete Jupiter and Lilith opening. The published wording must remain intact.\n\nA separate middle paragraph verifies that this is the full reading.\n\nThe complete final paragraph survives Calendar navigation and a dated Sky reload.';

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Calendar 2044 opens full Sky reading with bounded history ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const assertNoErrors = watchBrowserErrors(page);
    const useWorker = (width === 390) === (theme === 'dark');
    const event = (await getLunarCalendarMonth(defaultLocation, new Date(`${date}T16:00:00Z`))).events
      .find(e => e.dateKey === date && e.type === 'aspect' && e.aspect === 'conjunction' && e.planets?.includes('Jupiter') && e.planets.includes('Lilith'))!;
    expect(event).toBeDefined();
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await page.addInitScript(({ theme, location }) => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
      (window as any).__coverageSwissSnapshots = [];
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.addEventListener('message', event => {
            const provenance = event.data?.value?.calculationProvenance;
            if (provenance) (window as any).__coverageSwissSnapshots.push(provenance);
          });
        }
      };
    }, { theme, location: defaultLocation });
    await bundledPublications(page);
    await page.route('**/api/content-reader', route => {
      const keys: string[] = route.request().postDataJSON().keys ?? [];
      return route.fulfill({ json: readerResponse(keys.includes(key) ? [{
        id: 'synthetic-2044-history-reading', content_key: key, body, summary: null, headline: 'Jupiter Conjunction Lilith',
        surface: 'sky', mode: 'feed', block_type: 'sky_aspect', event_type: 'sky-aspect-owner-approved-exact',
        status: 'LIVE', lane: 'serving', review_state: null, provider: 'manual-admin', updated_at: '2026-11-08T06:00:00Z',
        source_snapshot: { contentStudioExactAspect: true, exactSkyAspectIdentity: { a: 'jupiter', b: 'lilith', aspect: 'conjunction' } }
      }] : []) });
    });
    let skyCalls = 0;
    await page.route(/\/api\/(calendar|sky)\?/, async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/sky') {
        skyCalls++;
        if (useWorker) return route.fulfill({ status: 503, json: { error: 'Synthetic unavailable Sky service' } });
      }
      const response = { statusCode: 200, body: '', setHeader() {}, end(body: string) { this.body = body; } };
      await (url.pathname === '/api/calendar' ? calendarHandler : skyHandler)(
        { method: 'GET', url: url.href } as IncomingMessage, response as unknown as ServerResponse);
      expect(response.statusCode).toBe(200);
      if (url.pathname === '/api/sky') expect(JSON.parse(response.body).sky.calculationProvenance.actualEphemeris).toBe('swiss');
      await route.fulfill({ status: response.statusCode, contentType: 'application/json', body: response.body });
    });
    await page.goto(`/?date=${date}#calendar?view=day&date=${date}`);
    const card = page.locator('.calendar-day-events').getByRole('button', { name: /Jupiter(?: Rx)? conjoins Lilith(?: Rx)?/ });
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card).toContainText(body.split('\n\n')[2]);
    await card.click();
    await expect(page).toHaveURL(new RegExp(`#sky/aspect/jupiter/conjunction/lilith/at/${encodeURIComponent(event.startsAt)}$`), { timeout: 60_000 });
    await expectSkyAspectBody(page, body);
    await expect(page.locator('.sky-detail-id .article-duration').first()).toContainText('Exact · August 13, 2044');
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`#calendar\\?view=day&date=${date}$`));
    await card.click();
    await expectSkyAspectBody(page, body);
    await page.reload();
    await expectSkyAspectBody(page, body);
    if (useWorker) {
      await expect.poll(() => page.evaluate(() => (window as any).__coverageSwissSnapshots.length)).toBeGreaterThan(0);
      const snapshots = await page.evaluate(() => (window as any).__coverageSwissSnapshots);
      expect(snapshots.every((p: any) => p.actualEphemeris === 'swiss' && p.lilithType === 'true' && p.nodeType === 'true')).toBe(true);
    }
    expect(skyCalls).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#calendar\\?view=day&date=${date}$`));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    assertNoErrors();
  });
}
