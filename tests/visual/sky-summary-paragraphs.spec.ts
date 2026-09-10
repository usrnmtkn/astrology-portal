import { expect, test } from '@playwright/test';
for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
  test(`summary paragraphs ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.clock.setFixedTime(new Date('2026-09-07T21:51:00Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
    }, theme);
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: '2026-09-07', events: [{ id: 'moon-mercury', type: 'aspect', planets: ['Moon', 'Mercury'], aspect: 'sextile', startsAt: '2026-09-07T20:00:00Z', dateKey: '2026-09-07' }] }] } } }));
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/#sky');
    const summary = page.getByLabel('Daily sky summary');
    await expect(summary.locator(':scope > p')).toHaveCount(3, { timeout: 60_000 });
    await expect(summary.locator(':scope > p').nth(1)).toHaveText('Today brings one exact aspect: Moon sextiles Mercury.');
    await expect(summary.locator(':scope > p').nth(2)).toHaveText('The next New Moon in Virgo is in 3 days.');
    const link = summary.getByRole('link', { name: 'Moon sextiles Mercury', exact: true });
    await expect(link).toHaveAttribute('href', '#sky/aspect/moon/sextile/mercury/at/2026-09-07T20%3A00%3A00Z');
    const styles = await summary.locator(':scope > p').evaluateAll(ps => ps.map(p => {
      const s = getComputedStyle(p);
      return { margin: parseFloat(s.marginTop), font: s.fontFamily, size: s.fontSize };
    }));
    expect(styles[1].margin).toBeGreaterThan(0);
    expect(styles[2].margin).toEqual(styles[1].margin);
    expect(styles[1].font).toEqual(styles[0].font);
    expect(styles[1].size).toEqual(styles[0].size);
    expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toContain('underline');
    expect(await summary.locator("a").evaluateAll(links => links.every(el => getComputedStyle(el).fontWeight === "400"))).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/sky-paragraphs-${theme}-${width}.png`, fullPage: false });
  });
}
