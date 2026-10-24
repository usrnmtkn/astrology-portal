import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

for (const failure of ['headers', '503'] as const) for (const width of [390, 1440]) {
  test(`cold Sky recovers a transient ${failure} source failure at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
    await page.addInitScript(() => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({
      label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York'
    })));
    await bundledPublications(page);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    await page.route('**/api/sky?**', async route => {
      const response = { statusCode: 200, setHeader() {}, end(body: string) {
        void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
      } };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
    });
    const requests = new Map<string, number>();
    const failures: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failures.push(new URL(request.url()).pathname));
    // Keep the first header request withheld until context teardown. The reader
    // must abort it at its real deadline and recover without a click or reload.
    await page.route(/\/assets\/canonical-sky-reader-transport-v1.*\.json$/, async route => {
      const url = new URL(route.request().url()).pathname;
      const count = (requests.get(url) ?? 0) + 1;
      requests.set(url, count);
      if (url.includes('canonical-sky-reader-transport') && count === 1) {
        if (failure === 'headers') return;
        return route.fulfill({ status: 503, body: 'Temporary source outage' });
      }
      return route.continue();
    });
    const start = performance.now();
    await page.goto('/?date=2026-09-10#sky');
    await expect(page.getByLabel('Daily sky summary', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.planet-placement-row--sky')).toHaveCount(14);
    expect(performance.now() - start).toBeLessThan(20_000);
    // The complete compiled reader inventory is one immutable request.
    expect([...requests.values()].sort()).toEqual([2]);
    if (failure === 'headers') expect(failures.some(url => url.includes('canonical-sky-reader-transport'))).toBe(true);
    await page.getByRole('button', { name: 'Read more about Sun in Virgo', exact: true }).click();
    const article = page.locator('.article-body-inner').first();
    await expect(article).toContainText('The Sun in Virgo makes the systems', { timeout: 15_000 });
    await expect(article).toContainText('The system that works is the one that makes your life easier to live.');
    await expect(article).toContainText('Today’s New Moon');
    expect([...requests.values()].sort()).toEqual([2]);
    expect(errors).toEqual([]);
  });
}
