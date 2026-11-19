import { expect, syntheticMemberTest as test, type Page } from '../helpers/polish-test';
import { bundledSkyPublications } from '../helpers/bundled-publications';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

const instant = '2026-11-06T12:00:00.000Z';
function health(ready: boolean) {
  return { schema: 'ephemeris-health/v1', timestamp: instant, ok: ready, status: ready ? 'ok' : 'degraded',
    dependencies: { ephemeris: { ok: true, elapsedMs: 10, detail: { actualEngine: "swiss" } }, skyCalculationApi: { ok: ready, elapsedMs: 20, detail: { actualEngine: "swiss" } } } };
}

async function expectWarningAboveNavigation(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const warning = document.querySelector('[data-ephemeris-status]')!;
    const header = document.querySelector('.topbar')!;
    const warningBox = warning.getBoundingClientRect();
    const navigationBox = header.querySelector('.nav-pill')!.getBoundingClientRect();
    return {
      top: warningBox.top,
      aboveNavigation: warningBox.bottom <= navigationBox.top,
      beforeNavigation: Boolean(warning.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING)
    };
  })).toEqual({ top: 0, aboveNavigation: true, beforeNavigation: true });
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
    await page.screenshot({ path: info.outputPath(`ephemeris-above-navigation-${width}-${theme}.png`) });
    await expectWarningAboveNavigation(page);
    const headerBox = (await page.locator('.topbar').boundingBox())!;
    await page.screenshot({ path: info.outputPath(`ephemeris-header-${width}-${theme}.png`), clip: {
      x: 0, y: 0, width, height: Math.ceil(headerBox.y + headerBox.height + 24)
    } });
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expectWarningAboveNavigation(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    await expectWarningAboveNavigation(page);
    await page.evaluate(() => document.fonts.ready);
    const reading = page.getByLabel('Daily sky summary');
    const readingTop = (await reading.boundingBox())!.y;
    ready = true;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(warning).toHaveCount(0);
    await expect.poll(async () => Math.abs((await reading.boundingBox())!.y - readingTop)).toBeLessThan(2);
    ready = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(warning).toBeVisible();
    await expect.poll(async () => Math.abs((await reading.boundingBox())!.y - readingTop)).toBeLessThan(2);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(warning).toHaveCSS('background-color', theme === 'light' ? 'rgb(251, 236, 200)' : 'rgb(59, 49, 30)');
    await expect(warning).toHaveCSS('color', theme === 'light' ? 'rgb(122, 79, 0)' : 'rgb(245, 215, 143)');
    await expect(warning.locator('p')).toHaveCSS('color', theme === 'light' ? 'rgb(122, 79, 0)' : 'rgb(245, 215, 143)');
    await expect(warning).toHaveAccessibleName('Astronomy service warning');
    await expect(warning).toHaveAttribute('role', 'status');
    await expect(warning).toHaveAttribute('aria-live', 'polite');
    const icon = warning.locator('.ephemeris-status__icon');
    await expect(icon).toBeVisible();
    const retry = warning.getByRole('button', { name: 'Check again', exact: true });
    await expect(retry).toHaveText('');
    await expect(retry).toHaveAttribute('title', 'Check again');
    await expect(retry.locator('svg[aria-hidden="true"]')).toBeVisible();
    await expect(retry).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.keyboard.press('Shift+Tab');
    await expect(retry).toBeFocused();
    await expect(retry).toHaveCSS('outline-style', 'solid');
    const layout = await warning.evaluate(element => {
      const rect = (selector: string) => {
        const box = element.querySelector(selector)!.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, height: box.height };
      };
      const style = getComputedStyle(element.querySelector('p')!);
      return { icon: rect('svg'), copy: rect('p'), action: rect('button'), typography: {
        family: style.fontFamily, size: style.fontSize, weight: style.fontWeight,
        leading: style.lineHeight, tracking: style.letterSpacing
      } };
    });
    expect(layout.icon.right).toBeLessThan(layout.copy.left);
    expect(layout.action.height).toBeGreaterThanOrEqual(44);
    if (width < 800) {
      expect(layout.action.top).toBeGreaterThanOrEqual(layout.copy.bottom);
      expect(layout.action.left).toBe(layout.copy.left);
    } else {
      expect(layout.copy.right).toBeLessThan(layout.action.left);
    }
    expect(layout.typography).toMatchObject({ size: '15px', weight: '400', leading: '22.5px', tracking: 'normal' });
    expect(layout.typography.family).toContain('sans-serif');
    await info.attach('warning-layout', { body: JSON.stringify(layout), contentType: 'application/json' });
    await page.locator('.sky-header-date-button').click();
    const dateDialog = page.getByRole('dialog', { name: 'Date and location', exact: true });
    await dateDialog.getByRole('tab', { name: 'Date', exact: true }).click();
    await page.setViewportSize({ width, height: 390 });
    const days = dateDialog.locator('.date-picker-grid button');
    const expectReachableDates = async () => {
      await expect.poll(async () => dateDialog.locator('.header-date-content').evaluate(element => element.clientHeight))
        .toBeGreaterThanOrEqual((await days.first().boundingBox())!.height);
      for (const day of [days.first(), days.last()]) {
        await day.scrollIntoViewIfNeeded();
        expect(await day.evaluate(element => {
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return hit === element || Boolean(hit && element.contains(hit));
        }), 'Date controls stay reachable as warning availability changes').toBe(true);
      }
    };
    await expectReachableDates();
    await page.screenshot({ path: info.outputPath(`ephemeris-date-dialog-${width}-${theme}.png`) });
    ready = true;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(warning).toHaveCount(0);
    await expectReachableDates();
    await page.keyboard.press('Escape');
    await expect(dateDialog).toBeHidden();
    ready = false;
    await page.setViewportSize({ width, height: 1000 });
    await page.reload();
    await expect(warning).toBeVisible({ timeout: 60_000 });
    await expectWarningAboveNavigation(page);
    ready = true;
    await warning.getByRole('button', { name: 'Check again', exact: true }).click();
    await expect(warning).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--app-notice-height').trim())).toBe('0px');
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

test('Failed refresh labels retained facts and removes an expired live snapshot', async ({ page }, info) => {
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
  for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    const warning = page.locator('[data-ephemeris-status]');
    await expect(warning.locator('p')).toHaveCSS('color', theme === 'light' ? 'rgb(122, 79, 0)' : 'rgb(245, 215, 143)');
    await expectWarningAboveNavigation(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await warning.screenshot({ path: info.outputPath(`ephemeris-retained-${width}-${theme}.png`) });
  }
  await page.clock.fastForward(31 * 60_000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.sky-content-column .load-error')).toBeVisible({ timeout: 60_000 });
  await expect(summary).toHaveCount(0);
  await expect(page.locator('[data-ephemeris-status]')).not.toContainText('Showing the last verified calculation');
});
