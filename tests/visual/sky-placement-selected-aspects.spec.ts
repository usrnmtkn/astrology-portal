import { expect, test } from '../helpers/polish-test';
import { bundledPublications } from '../helpers/bundled-publications';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Lilith selected-date aspects and Key date articles ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await bundledPublications(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-11-07T17:00:00Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({
        label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York'
      }));
    }, theme);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    const route = '/?date=2026-11-04#sky/placement/lilith/sagittarius';
    await page.goto(route);
    const currentCards = page.locator('.article-related-aspect-row');
    const verifySelectedDate = async () => {
      await expect(page.locator('.sky-detail-article')).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
      await expect(currentCards.first()).toBeVisible();
      await expect(currentCards.filter({ hasText: 'October 21' })).toHaveCount(0);
      await expect(currentCards.getByRole('heading').filter({ hasText: /sextile.*Sun/i })).toHaveCount(0);
      await expect(page.locator('.article-related-aspects__item')).toHaveCount(0);
      await expect(currentCards.getByRole('heading').filter({ hasText: /square.*Moon/i })).toHaveCount(1);
      await expect(currentCards).toContainText('Exact Wednesday.');
    };
    await verifySelectedDate();
    const dates = page.locator('.sky-placement-key-dates');
    await dates.locator(':scope > summary').click();
    const sun = dates.getByRole('link').filter({ hasText: 'sextile Sun' });
    await expect(sun).toHaveCount(1);
    await expect(sun.locator('time')).toHaveAttribute('aria-label', 'October 21, 2026');
    const destination = (await sun.getAttribute('href'))!;
    expect(destination).toMatch(/^#sky\/aspect\/lilith\/sextile\/sun\/at\//);
    expect(new Date(decodeURIComponent(destination.split('/at/')[1])).toISOString().slice(0, 10)).toBe('2026-10-21');
    await sun.click();
    await expect(page).toHaveURL(url => url.hash === destination);
    await expect(page.locator('.article-id #sky-detail-title')).toHaveText(/(?:Lilith.*sextile.*Sun|Sun.*sextile.*Lilith)/i);
    await expect(page.locator('.calendar-day-events')).toHaveCount(0);
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(page).toHaveURL(/date=2026-11-04#sky\/placement\/lilith\/sagittarius$/);
    await verifySelectedDate();
    await page.reload();
    await verifySelectedDate();
    await currentCards.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/lilith-selected-aspects-${width}-${theme}.png` });
    await page.goto('/?date=2026-11-05#sky/placement/lilith/sagittarius');
    await expect(page.locator('.sky-detail-article')).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
    const mars = currentCards.filter({ has: page.getByRole('heading', { name: /Lilith.*trine.*Mars/i }) });
    await expect(mars).toContainText(/Exact (?:Thursday|November 5)\./);
    await expect(currentCards.filter({ hasText: 'October 21' })).toHaveCount(0);
  });
}
