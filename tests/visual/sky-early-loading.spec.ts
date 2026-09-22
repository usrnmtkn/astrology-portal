import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

test.use({ timezoneId: 'America/New_York', viewport: { width: 390, height: 844 } });
for (const changeSelection of [false, true]) {
  test(`Sky starts before App and ${changeSelection ? 'rejects a changed selection' : 'reuses the exact initial response'}`, async ({ page }) => {
    test.setTimeout(90_000);
    await bundledPublications(page);
    // The two normal reader fonts must work without the optional external
    // accessibility/symbol stylesheet or another origin's font connection.
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.clock.setFixedTime(new Date('2026-09-21T16:00:00Z'));
    await page.addInitScript(() => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({
      label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York'
    })));
    let releaseApp!: () => void;
    const appGate = new Promise<void>(resolve => { releaseApp = resolve; });
    await page.route(/\/assets\/App-[^/]+\.js$/, async route => { await appGate; await route.continue(); });
    const requests: URL[] = [];
    const errors: string[] = [];
    page.on('request', request => requests.push(new URL(request.url())));
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/sky?**', async route => {
      const response = { statusCode: 200, setHeader() {}, end(body: string) {
        void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
      } };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
    });
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    try {
      await page.goto('/#sky', { waitUntil: 'commit' });
      await expect.poll(() => requests.some(url => url.pathname === '/api/sky')).toBe(true);
      await expect.poll(() => requests.some(url => /sky-v4-canonical-content-studio-stage.*\.json$/.test(url.pathname))).toBe(true);
      await expect.poll(() => requests.some(url => url.pathname.endsWith('/content_publications'))).toBe(true);
      expect(await page.locator('.app-shell').count()).toBe(0);
      expect(requests.find(url => url.pathname === '/api/sky')?.searchParams.get('at')).toBe('2026-09-21T16:00:00.000Z');
      if (changeSelection) {
        await page.evaluate(() => {
          history.replaceState({}, '', '/?date=2026-03-27#sky');
          localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic Tokyo', latitude: 35.6762, longitude: 139.6503, timeZone: 'Asia/Tokyo' }));
        });
      }
    } finally { releaseApp(); }
    await expect(page.getByLabel('Daily sky summary', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.planet-placement-row--sky')).toHaveCount(14);
    const skyRequests = requests.filter(url => url.pathname === '/api/sky');
    expect(skyRequests).toHaveLength(changeSelection ? 2 : 1);
    if (changeSelection) {
      expect(skyRequests[1].searchParams.get('at')).toBe('2026-03-27T03:00:00.000Z');
      expect(skyRequests[1].searchParams.get('timeZone')).toBe('Asia/Tokyo');
      await expect(page.getByRole('button', { name: 'Read more about Sun in Aries', exact: true })).toBeVisible();
    }
    expect(requests.some(url => /fallback-content-sky-horoscopes-/.test(url.pathname))).toBe(false);
    expect(requests.some(url => url.pathname.startsWith('/wasm/'))).toBe(false);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.fonts.check('400 16px Newsreader') && document.fonts.check('500 16px "Geist Mono"'))).toBe(true);
    expect(requests.some(url => /newsreader-latin.*\.woff2$/.test(url.pathname) && url.host === new URL(page.url()).host)).toBe(true);
    await page.getByRole('button', { name: `Read more about Sun in ${changeSelection ? 'Aries' : 'Virgo'}`, exact: true }).click();
    await expect(page.locator('.article-shell')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => requests.some(url => /fallback-content-sky-horoscopes-/.test(url.pathname))).toBe(true);
  });
}
