import { expect, test } from '../helpers/polish-test';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { expectReadableTheme } from '../helpers/theme-contrast';
import { bundledPublications } from '../helpers/bundled-publications';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`supplied wheel design retains calculated facts and inspector ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-10-13T16:00:00Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    }, theme);
    await bundledPublications(page);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    await page.route('**/api/sky?**', async route => {
      const response = { statusCode: 200, setHeader() {}, end(body: string) {
        void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
      } };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
    });
    await page.goto('/?date=2026-10-13#sky');
    const wheel = page.getByRole('region', { name: 'Current sky', exact: true });
    const svg = wheel.locator('svg.interactive-zodiac-wheel__svg').first();
    await expect(svg.locator('.interactive-wheel-planet')).toHaveCount(15);
    await expect(svg.locator('.interactive-wheel-angle')).toHaveCount(4);
    await expectReadableTheme(page, '.interactive-wheel-angle text');
    await expect(svg.locator('.interactive-wheel-house')).toHaveCount(12);
    const referenceGeometry = await svg.locator('.interactive-wheel-paper').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('r'))));
    expect(referenceGeometry).toEqual([292, 112]);
    expect(await svg.locator('.interactive-wheel-aspects > g').count()).toBeGreaterThan(0);
    const facts = await svg.locator('.interactive-wheel-planet-button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    const sun = svg.locator('[data-planet="Sun"] [role="button"]');
    await sun.focus();
    await page.keyboard.press('Enter');
    await expect(sun).toHaveAttribute('aria-pressed', 'true');
    await expect(wheel.locator('.interactive-wheel-detail')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(wheel.locator('.interactive-wheel-detail')).toHaveCount(0);
    expect(await svg.locator('.interactive-wheel-planet-button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).toEqual(facts);
    await wheel.screenshot({ path: `test-results/design-wheel-${width}-${theme}.png` });
    await page.goto('/?date=2026-09-07#sky');
    await expect(sun).not.toHaveAttribute('aria-label', facts[0]!);
    await expect(svg.locator('.interactive-wheel-planet')).toHaveCount(15);
    expect(await svg.locator('.interactive-wheel-aspects > g').count()).toBeGreaterThan(0);
    await page.reload();
    await expect(svg.locator('.interactive-wheel-angle')).toHaveCount(4);
    await expectReadableTheme(page, '.interactive-wheel-angle text');
  });
}
