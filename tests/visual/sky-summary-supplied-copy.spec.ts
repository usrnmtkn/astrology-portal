import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
test.beforeEach(async ({ page }) => bundledPublications(page));

for (const width of [390, 1440]) {
  test(`supplied Sagittarius Sun and Virgo Moon summaries appear ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/?date=2026-11-30#sky');
    const summary = page.getByLabel('Daily sky summary', { exact: true });
    await expect(summary).toContainText('makes the bigger question, the farther trip, or the next thing to learn more compelling', { timeout: 60000 });
    await expect(summary).toContainText('separates signal from noise');
    await expect(summary).toContainText('. The Moon in Virgo');
    const links = summary.locator('a');
    expect(await links.evaluateAll(elements => elements.every(element => {
      const style = getComputedStyle(element);
      return style.fontWeight === '400' && style.textDecorationLine.includes('underline');
    }))).toBe(true);
    await page.screenshot({ path: `test-results/sky-supplied-summary-${width}.png` });
  });
}
