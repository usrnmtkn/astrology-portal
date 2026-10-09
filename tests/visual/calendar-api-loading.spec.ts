import { expect, test } from '@playwright/test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import calendarHandler from '../../api/calendar';
import skyHandler from '../../api/sky';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Calendar route retains a styled loader before its stylesheet arrives ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-10-02T16:00:00Z'));
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
    }, theme);
    await bundledPublications(page);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/\/api\/(calendar|sky)\?/, async route => {
      const url = new URL(route.request().url());
      const recorder = { statusCode: 200, body: '', setHeader() {}, end(body: string) { this.body = body; } };
      await (url.pathname === '/api/calendar' ? calendarHandler : skyHandler)(
        { method: 'GET', url: url.href } as IncomingMessage, recorder as unknown as ServerResponse);
      await route.fulfill({ status: recorder.statusCode, contentType: 'application/json', body: recorder.body });
    });
    let release = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    let held = false;
    await page.route(/\/assets\/CalendarRoute-[^/]+\.css(?:\?|$)/, async route => {
      held = true; await gate; await route.continue();
    });
    try {
      await page.goto('/?date=2026-10-02#calendar?view=day&date=2026-10-02', { waitUntil: 'domcontentloaded' });
      await expect.poll(() => held).toBe(true);
      const loader = page.getByRole('status', { name: 'Loading calendar…', exact: true });
      await expect(loader).toBeVisible();
      expect(await loader.evaluate(el => getComputedStyle(el).display)).toBe('grid');
      // Calendar cards depend on the held stylesheet and must not paint unstyled.
      await expect(page.locator('.calendar-day-panel')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/calendar-route-loader-${width}-${theme}.png` });
      release();
      const day = page.getByLabel('Selected lunar day', { exact: true });
      await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
      await expect(day.getByRole('button', { name: 'Mercury squares Mars', exact: true })).toBeVisible();
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { release(); }
  });
}

for (const offlineRange of [false, true]) test(`Calendar loads complete facts with ${offlineRange ? 'local range recovery' : 'no calculation-engine download'}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({width: 390, height: 844});
  await page.clock.setFixedTime(new Date('2026-10-02T16:00:00Z'));
  await bundledPublications(page);
  await page.addInitScript(() => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({
    label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York'
  })));
  const requests: URL[] = [], errors: string[] = [], overlays: any[] = [];
  page.on('request', request => {
    const url = new URL(request.url()); requests.push(url);
    if (url.pathname === '/api/content-reader') {
      const body = request.postDataJSON(); if (body.provider && !body.latestVersion) overlays.push(body);
    }
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\/api\/(calendar|sky)\?/, async route => {
    const url = new URL(route.request().url());
    if (offlineRange && url.searchParams.get('mode') === 'range') {
      await route.fulfill({status: 503, json: {ok: false, error: 'Synthetic outage'}}); return;
    }
    // A cold mobile request may queue for longer than the fast week lookup.
    if (url.searchParams.get('mode') === 'range') await new Promise(resolve => setTimeout(resolve, 3000));
    const recorder = {statusCode: 200, body: '', setHeader() {}, end(body: string) {this.body = body;}};
    const handler = url.pathname === '/api/calendar' ? calendarHandler : skyHandler;
    await handler({method: 'GET', url: url.href} as IncomingMessage, recorder as unknown as ServerResponse);
    await route.fulfill({status: recorder.statusCode, contentType: 'application/json', body: recorder.body});
  });
  const rangeResponse = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/calendar' && url.searchParams.get('mode') === 'range';
  });
  await page.goto('/?date=2026-10-02#calendar?view=day&date=2026-10-02');
  const day = page.getByLabel('Selected lunar day');
  await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false', {timeout: 60_000});
  await expect(day.getByRole('button', {name: 'Mercury squares Mars', exact: true})).toBeVisible();
  await expect(day.locator('.calendar-sky-card__meta')).not.toContainText('Lunar day');
  await expect.poll(() => requests.filter(url => url.pathname === '/api/calendar' && url.searchParams.get('mode') === 'range').length).toBeGreaterThan(0);
  expect((await rangeResponse).status()).toBe(offlineRange ? 503 : 200);
  if (offlineRange) await expect.poll(() => requests.some(url => url.pathname.endsWith('swisseph.data'))).toBe(true);
  // Let all seasonal work settle before assessing hidden downloads or errors.
  await expect(page.locator('.calendar-season-pill').first()).toContainText('Libra season');
  await page.waitForTimeout(1500);
  expect(requests.some(url => url.pathname.startsWith('/wasm/'))).toBe(offlineRange);
  expect(overlays.length).toBeGreaterThan(0);
  expect(overlays.every(body => body.scope === 'sky')).toBe(true);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `test-results/calendar-api-${offlineRange ? 'recovery' : 'healthy'}.png`, fullPage: true});
});

for (const scenario of [
  { date: '2026-10-09', timeZone: 'America/New_York', latitude: 40.7128, longitude: -74.006, noon: '16:00:00.000Z', sun: 'Libra', offline: false },
  { date: '2026-11-01', timeZone: 'America/New_York', latitude: 40.7128, longitude: -74.006, noon: '17:00:00.000Z', sun: 'Scorpio', offline: false },
  { date: '2026-03-08', timeZone: 'Asia/Tokyo', latitude: 35.6762, longitude: 139.6503, noon: '03:00:00.000Z', sun: 'Pisces', offline: false },
  { date: '2026-10-09', timeZone: 'America/New_York', latitude: 40.7128, longitude: -74.006, noon: '16:00:00.000Z', sun: 'Libra', offline: true }
]) test(`Published Calendar passage uses ${scenario.offline ? 'offline recovery' : 'API facts'} on ${scenario.date} in ${scenario.timeZone}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date(`${scenario.date}T12:00:00Z`));
  await bundledPublications(page);
  await page.addInitScript(location => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location)), {
    label: 'Synthetic passage location', latitude: scenario.latitude, longitude: scenario.longitude, timeZone: scenario.timeZone
  });
  const row = { id: 'qa-published-passage', content_key: 'calendar-passage/daily/shared',
    body: 'Synthetic passage under {{sunSign}}.\n\nComplete synthetic ending.', status: 'LIVE', lane: 'serving',
    review_state: null, surface: 'sky', mode: 'in_depth', provider: 'manual', updated_at: '2026-01-01T00:00:00Z' };
  await page.route('**/api/content-reader', route => {
    const query = route.request().postDataJSON();
    const matches = (!query.keys || query.keys.includes(row.content_key)) && (!query.ids || query.ids.includes(row.id))
      && (!query.prefix || row.content_key.startsWith(query.prefix)) && (!query.provider || query.provider === row.provider);
    return route.fulfill({ json: readerResponse(matches ? [row] : []) });
  });
  const requests: URL[] = [], errors: string[] = [];
  page.on('request', request => requests.push(new URL(request.url())));
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\/api\/(calendar|sky)\?/, async route => {
    const url = new URL(route.request().url());
    if (scenario.offline && url.pathname === '/api/sky' && url.searchParams.get('detail') === 'core') {
      return route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic passage API outage' } });
    }
    const recorder = { statusCode: 200, body: '', setHeader() {}, end(body: string) { this.body = body; } };
    const handler = url.pathname === '/api/calendar' ? calendarHandler : skyHandler;
    await handler({ method: 'GET', url: url.href } as IncomingMessage, recorder as unknown as ServerResponse);
    return route.fulfill({ status: recorder.statusCode, contentType: 'application/json', body: recorder.body });
  });
  await page.goto(`/?date=${scenario.date}#calendar?view=day&date=${scenario.date}`);
  const day = page.getByLabel('Selected lunar day', { exact: true });
  await expect(day).toContainText(`Synthetic passage under ${scenario.sun}.`, { timeout: 60_000 });
  await expect(day).toContainText('Complete synthetic ending.');
  const cores = requests.filter(url => url.pathname === '/api/sky' && url.searchParams.get('detail') === 'core');
  expect(cores).toHaveLength(7);
  expect(new Set(cores.map(url => url.searchParams.get('at'))).size).toBe(7);
  expect(cores.every(url => url.searchParams.get('at')?.endsWith(scenario.noon)
    && url.searchParams.get('timeZone') === scenario.timeZone)).toBe(true);
  expect(requests.some(url => url.pathname.startsWith('/wasm/'))).toBe(scenario.offline);
  await page.reload();
  await expect(day).toContainText(`Synthetic passage under ${scenario.sun}.`, { timeout: 60_000 });
  await expect(day).toContainText('Complete synthetic ending.');
  expect(requests.some(url => url.pathname.startsWith('/wasm/'))).toBe(scenario.offline);
  expect(errors).toEqual([]);
});
