import { expect, test } from '@playwright/test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import calendarHandler from '../../api/calendar';
import skyHandler from '../../api/sky';
import { bundledPublications } from '../helpers/bundled-publications';

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
