import { expect, test } from '@playwright/test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import skyHandler from '../../api/sky';
import { bundledPublications } from '../helpers/bundled-publications';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`True Black Moon Lilith label ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-11-04T17:21:35Z'));
    await bundledPublications(page);
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({
        label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York'
      }));
    }, theme);
    await page.route('**/api/sky?**', async route => {
      const response = {
        statusCode: 200,
        setHeader() {},
        end(body: string) {
          void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
        }
      };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage,
        response as unknown as ServerResponse);
    });

    await page.goto('/?date=2026-11-04#sky');
    const card = page.getByRole('button', {
      name: 'Read more about True Black Moon Lilith in Sagittarius', exact: true
    });
    const title = card.locator('.planet-placement-row__title');
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius', { timeout: 60_000 });
    await expect(card.locator('.placement-progress > span')).toHaveText('3 days left');
    await expect(card.locator('.planet-placement-row__status')).toHaveCount(0);
    await expect(card.locator('h1,h2,h3,h4,h5,h6')).toHaveCount(0);

    const typography = (element: Element) => {
      const style = getComputedStyle(element);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight,
        style.letterSpacing, style.margin, style.textTransform, style.textAlign];
    };
    const sunTitle = page.getByRole('button', { name: 'Read more about Sun in Scorpio', exact: true })
      .locator('.planet-placement-row__title');
    expect(await title.evaluate(typography)).toEqual(await sunTitle.evaluate(typography));
    expect(await card.locator('.planet-placement-row__topline').evaluate(element =>
      element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await card.screenshot({ path: `test-results/true-black-moon-lilith-${width}-${theme}.png` });

    await card.click();
    await expect(page.locator('#sky-detail-title')).toBeVisible();
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius');
    await page.reload();
    await expect(title).toHaveText('True Black Moon Lilith in Sagittarius', { timeout: 60_000 });
  });
}
