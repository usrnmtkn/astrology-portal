import { expect, syntheticMemberTest as test } from '../helpers/polish-test';
import { bundledSkyPublications } from '../helpers/bundled-publications';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

const instant = '2026-11-06T12:00:00.000Z';
function health(ready: boolean) {
  return { schema: 'ephemeris-health/v1', timestamp: instant, ok: ready, status: ready ? 'ok' : 'degraded',
    dependencies: { ephemeris: { ok: true, elapsedMs: 10, detail: { actualEngine: "swiss" } }, skyCalculationApi: { ok: ready, elapsedMs: 20, detail: { actualEngine: "swiss" } } } };
}

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`Ephemeris outage alert and recovery ${width} ${theme}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date(instant));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic Greenwich', latitude: 0, longitude: 0, timeZone: 'UTC' }));
    }, theme);
    await bundledSkyPublications(page);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    let ready = false;
    let healthRequests = 0;
    await page.route('**/api/health?scope=ephemeris', route => {
      healthRequests++;
      return route.fulfill({ status: ready ? 200 : 503, json: health(ready) });
    });
    // The reading uses the real application handler and configured Swiss engine,
    // independently of the synthetic upstream readiness outage.
    await page.route(/\/api\/sky(?:-reader)?\?/, async route => {
      let body = '';
      const res = { statusCode: 200, setHeader() {}, end(value: string) { body = value; } };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, res as unknown as ServerResponse);
      await route.fulfill({ status: res.statusCode, contentType: 'application/json', body });
    });
    await page.goto('/#sky');
    const warning = page.locator('[data-ephemeris-status="degraded"]');
    await expect(warning).toBeVisible({ timeout: 60_000 });
    await expect(warning).toContainText('astronomy calculations are temporarily unavailable');
    await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await warning.screenshot({ path: info.outputPath(`ephemeris-warning-${width}-${theme}.png`) });
    await page.reload();
    await expect(warning).toBeVisible({ timeout: 60_000 });
    ready = true;
    await warning.getByRole('button', { name: 'Check again', exact: true }).click();
    await expect(warning).toHaveCount(0);
    await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
    expect(healthRequests).toBeGreaterThanOrEqual(3);
  });
}

test('Invalid facts and a hung fallback reach an error, then retry admits only verified facts', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date(instant));
  await bundledSkyPublications(page);
  await page.addInitScript(() => {
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic Greenwich', latitude: 0, longitude: 0, timeZone: 'UTC' }));
    window.Worker = class extends EventTarget { postMessage() {} terminate() {} } as unknown as typeof Worker;
    const timer = window.setTimeout.bind(window);
    window.setTimeout = ((callback, delay, ...args) => timer(callback, delay === 30_000 ? 50 : delay, ...args)) as typeof setTimeout;
  });
  let valid = false;
  await page.route(/\/api\/sky(?:-reader)?\?/, async route => {
    if (!valid) return route.fulfill({ json: { sky: { generatedAt: '2020-01-01T00:00:00Z', facts: [] } } });
    let body = '';
    const res = { statusCode: 200, setHeader() {}, end(value: string) { body = value; } };
    await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, res as unknown as ServerResponse);
    await route.fulfill({ status: res.statusCode, contentType: 'application/json', body });
  });
  await page.goto('/#sky');
  const error = page.locator('.sky-content-column .load-error');
  await expect(error).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel('Daily sky summary')).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('tldrastro:verifiedSky:v2')))).toEqual([]);
  valid = true;
  await error.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(error).toHaveCount(0);
  await expect(page.getByLabel('Daily sky summary')).toBeVisible({ timeout: 60_000 });
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('tldrastro:verifiedSky:v2')).length)).toBeGreaterThan(0);
});

test('Failed refresh labels retained facts and removes an expired live snapshot', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install({ time: new Date(instant) });
  await bundledSkyPublications(page);
  await page.addInitScript(() => {
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic Greenwich', latitude: 0, longitude: 0, timeZone: 'UTC' }));
    window.Worker = class extends EventTarget { postMessage() {} terminate() {} } as unknown as typeof Worker;
    const timer = window.setTimeout.bind(window);
    window.setTimeout = ((callback, delay, ...args) => timer(callback, delay === 30_000 ? 50 : delay, ...args)) as typeof setTimeout;
  });
  let valid = true;
  await page.route(/\/api\/sky(?:-reader)?\?/, async route => {
    if (!valid) return route.fulfill({ status: 503, json: { error: 'Synthetic engine outage' } });
    let body = '';
    const res = { statusCode: 200, setHeader() {}, end(value: string) { body = value; } };
    await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, res as unknown as ServerResponse);
    await route.fulfill({ status: res.statusCode, contentType: 'application/json', body });
  });
  await page.goto('/#sky');
  const summary = page.getByLabel('Daily sky summary');
  await expect(summary).toBeVisible({ timeout: 60_000 });
  valid = false;
  await page.evaluate(() => window.dispatchEvent(new Event('tldr:ephemeris-retry')));
  await expect(page.locator('[data-ephemeris-status]')).toContainText('last verified calculation from');
  await expect(summary).toBeVisible();
  await page.clock.fastForward(31 * 60_000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.sky-content-column .load-error')).toBeVisible({ timeout: 60_000 });
  await expect(summary).toHaveCount(0);
  await expect(page.locator('[data-ephemeris-status]')).not.toContainText('Showing the last verified calculation');
});
