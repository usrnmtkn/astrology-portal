import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json', 'utf8'));
const moonBody = rows.hookRows.find((row: { contentKey: string }) => row.contentKey === 'fallback-hook/sky-placement-lived/moon/libra').body_you as string;
const sunClause = JSON.parse(readFileSync('apps/web/src/content/skyDailySummaryClauses.json', 'utf8')).sun.virgo as string;

// No mocked API or publication data: run this against the actual release URL.
for (const width of [390, 1440]) {
  test(`Calendar release writing and spacing ${width}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
      localStorage.setItem('tldrastro:theme', 'light');
    });
    await page.goto('/?date=2026-09-12#calendar?view=day&date=2026-09-12');
    const card = page.getByRole('region', { name: 'Selected lunar day', exact: true });
    const sun = card.getByRole('region', { name: 'Sun in season', exact: true });
    const moon = card.getByRole('region', { name: 'Moon guidance', exact: true });
    await expect(sun).toContainText(sunClause, { timeout: 90_000 });
    await expect(sun.getByRole('link', { name: 'Sun in Virgo at 19°', exact: true })).toHaveAttribute('href', '?date=2026-09-12#sky/placement/sun/virgo');
    await expect(moon.locator('p')).toHaveText(moonBody.split(/\n\n/));
    await expect(moon.getByRole('link')).toHaveCount(0);
    await expect(card.getByRole('region', { name: 'Daily Calendar overview' })).toHaveCount(0);
    const exact = card.getByRole('region', { name: 'Exact today', exact: true });
    await expect(exact.locator('p').first()).toBeVisible();
    await expect(exact.getByRole('link')).toHaveCount(0);
    const sunBox = await sun.locator('p').last().boundingBox();
    const moonBox = await moon.locator('p').first().boundingBox();
    const secondBox = await moon.locator('p').nth(1).boundingBox();
    expect(moonBox!.y - sunBox!.y - sunBox!.height)
      .toBeCloseTo(secondBox!.y - moonBox!.y - moonBox!.height, 1);
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await card.screenshot({ path: `test-results/calendar-release-${width}.png` });
  });
}
