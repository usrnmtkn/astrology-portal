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
    const svg = wheel.locator('svg.sky-wheel').first();
    await expect(svg).toHaveClass(/sky-wheel--handoff/u);
    await expect(svg.locator('.planet-marker')).toHaveCount(14);
    await expect(svg.locator('.zodiac-wheel__angle-badge')).toHaveCount(4);
    await expectReadableTheme(page, '.zodiac-wheel__angle-badge text');
    await expect(svg.locator('.house-labels text')).toHaveCount(12);
    const referenceGeometry = await svg.locator('.wheel-surfaces circle').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('r'))));
    expect(referenceGeometry).toEqual([284, 240, 132, 96]);
    expect(await svg.locator('.aspect-lines > g').count()).toBeGreaterThan(0);
    const facts = await svg.locator('.planet-marker').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    const sun = svg.locator('.planet-marker[data-inspector-point-id="Sun"]');
    await sun.focus();
    await page.keyboard.press('Enter');
    await expect(sun).toHaveClass(/aspect-inspector-point--selected/u);
    await expect(wheel.locator('.aspect-inspector-summary')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(wheel.locator('.aspect-inspector-summary')).toHaveCount(0);
    expect(await svg.locator('.planet-marker').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).toEqual(facts);
    await wheel.screenshot({ path: `test-results/design-wheel-${width}-${theme}.png` });
    await page.goto('/?date=2026-09-07#sky');
    await expect(sun).not.toHaveAttribute('aria-label', facts[0]!);
    await expect(svg.locator('.planet-marker')).toHaveCount(14);
    expect(await svg.locator('.aspect-lines > g').count()).toBeGreaterThan(0);
    await page.reload();
    await expect(svg.locator('.zodiac-wheel__angle-badge')).toHaveCount(4);
    await expectReadableTheme(page, '.zodiac-wheel__angle-badge text');
  });
}
