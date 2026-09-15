import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';

test.use({ timezoneId: 'Pacific/Honolulu' });
for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
  test(`Venus visit and residency metadata ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-14T12:00:00Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Test location', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    }, theme);
    await bundledPublications(page);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?date=2026-09-14#sky');
    const card = page.getByRole('button', { name: 'Read more about Venus in Scorpio', exact: true });
    await expect(card.locator('.planet-placement-row__meta--timing')).toHaveText('Sep 10 - Oct 25', { timeout: 60_000 });
    await card.click();
    const dates = page.locator('.sky-detail-id .article-duration');
    await expect(dates).toHaveText(['September 10 to October 25, 2026', 'Full residency in Scorpio: September 10, 2026 to January 7, 2027'], { timeout: 60_000 });
    await expect(page.getByLabel('Article details')).toContainText('41D');
    const typography = await dates.evaluateAll(elements => elements.map(element => {
      const s = getComputedStyle(element);
      return { font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight, spacing: s.letterSpacing, margin: s.margin, casing: s.textTransform, alignment: s.textAlign };
    }));
    expect(typography[1]).toEqual(typography[0]);
    await expect(page.locator('.sky-detail-article h1')).toHaveText(['Venus in Scorpio']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Assert the complete source body remains identical through hydration/reopen.
    const body = await page.locator('.article-body-inner').first().innerText();
    expect(body).toContain('When Venus reaches Scorpio, intimacy and connection stop being separable from power dynamics.');
    expect(body).toContain('Trust gets stronger when the terms can be named without turning vulnerability into leverage.');
    await page.locator('.sky-detail-id').screenshot({ path: `test-results/venus-visit-${theme}-${width}.png` });
    await page.reload();
    await expect(dates).toHaveText(['September 10 to October 25, 2026', 'Full residency in Scorpio: September 10, 2026 to January 7, 2027'], { timeout: 60_000 });
    await expect(page.locator('.article-body-inner').first()).toHaveText(body, { useInnerText: true });
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(card.locator('.planet-placement-row__meta--timing')).toHaveText('Sep 10 - Oct 25');
    await page.goto('/?date=2026-12-10#sky/placement/venus/scorpio');
    await expect(dates).toHaveText(['December 4, 2026 to January 7, 2027', 'Full residency in Scorpio: September 10, 2026 to January 7, 2027'], { timeout: 60_000 });
    await expect(page.getByLabel('Article details')).toContainText('28D');
    expect(errors).toEqual([]);
  });
}
