import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const source = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json', 'utf8'));
const moonBody = source.hookRows.find((row: any) => row.contentKey === 'fallback-hook/sky-placement-lived/moon/libra').body_you;
const location = { label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
const facts = {
  '2026-09-12': [
    ['Moon', 'trine', 'Pluto', '2026-09-12T05:48:08.999Z'], ['Moon', 'trine', 'Uranus', '2026-09-12T10:03:07.999Z'],
    ['Mercury', 'trine', 'Pluto', '2026-09-12T15:59:04.999Z'], ['Moon', 'square', 'Lilith', '2026-09-12T23:40:39.999Z'],
    ['Saturn', 'square', 'Lilith', '2026-09-13T02:09:43.999Z']
  ],
  '2026-09-13': [
    ['Moon', 'sextile', 'Jupiter', '2026-09-13T05:07:49.999Z'], ['Moon', 'square', 'Mars', '2026-09-13T14:26:29.999Z'],
    ['Mercury', 'trine', 'Uranus', '2026-09-14T02:39:33.999Z']
  ]
};
for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) for (const empty of [false, true]) {
  test(`Calendar Sun and Moon ${width} ${theme} ${empty ? "empty" : "populated"}`, async ({ page }) => {
    test.setTimeout(120_000);
    const dateKey = theme === 'light' ? '2026-09-12' : '2026-09-13';
    const events = (empty ? [] : facts[dateKey]).map(([from, aspect, to, startsAt], i) => ({ id: `calendar-summary-${i}`, type: 'aspect',
      title: `${from} ${aspect} ${to}`, startsAt, dateKey, planets: [from, to], aspect, glyph: '', primary: from !== 'Moon',
      fromMotion: from === 'Saturn' ? 'retrograde' : 'direct', toMotion: ['Pluto', 'Uranus', 'Lilith'].includes(to) ? 'retrograde' : 'direct' }));
    const day = { date: `${dateKey}T16:00:00Z`, dateKey, inMonth: true, moonSign: 'Libra', moonSignGlyph: '♎', moonPhase: 'Waxing Crescent', illumination: 4, activeAspects: [], events,
      voidOfCourse: dateKey.endsWith('13') ? { startsAt: '2026-09-13T14:26:29.999Z', until: '2026-09-14T06:43:00Z', nextSign: 'Scorpio', durationLabel: '16h 17m', remainingLabel: '4h' } : null };
    await page.clock.setFixedTime(new Date('2026-09-14T12:00:00Z'));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(({ location, theme }) => {
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location));
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:dyslexiaFont', 'false');
    }, { location, theme });
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { month: '2026-09', timeZone: location.timeZone, location, days: [day], events } } }));
    await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await page.goto(`/?date=${dateKey}#calendar?view=day&date=${dateKey}`);
    const card = page.getByRole('region', { name: 'Selected lunar day', exact: true });
    const moon = card.getByRole('region', { name: 'Moon guidance', exact: true });
    const sun = card.getByRole('region', { name: 'Sun in season', exact: true });
    await expect(sun.getByRole('link', { name: /Sun in Virgo at \d+°/ })).toBeVisible({ timeout: 60_000 });
    const sunClause = JSON.parse(readFileSync('apps/web/src/content/skyDailySummaryClauses.json', 'utf8')).sun.virgo;
    await expect(sun).toContainText(sunClause);
    await expect(moon.locator('p').first()).toHaveText(moonBody.split(/\n\n/)[0]);
    for (const paragraph of moonBody.split(/\n\n/)) await expect(moon.getByText(paragraph, { exact: true })).toBeVisible();
    await expect(moon.locator('p')).toHaveCount(moonBody.split(/\n\n/).length);
    await expect(moon.getByText(/Moon in Libra at \d+°/)).toHaveCount(0);
    await expect(card.getByRole('region', { name: 'Daily Calendar overview' })).toHaveCount(0);
    await expect(card.locator('mark')).toHaveCount(0);
    const exact = card.getByRole('region', { name: 'Exact today', exact: true });
    const primaryEvents = events.filter(event => event.primary).reverse();
    if (empty) await expect(exact).toHaveCount(0);
    else {
      // Preserve the live aspect selection, latest-first order, and paragraph layout.
      await expect(exact.getByRole('heading')).toHaveText('Exact today');
      await expect(exact.getByRole('link')).toHaveCount(0);
      await expect(exact.locator('p')).toHaveCount(primaryEvents.length);
      for (const [i, event] of primaryEvents.entries()) {
        const [from, to] = event.planets;
        const copy = JSON.parse(readFileSync(`packages/astro-knowledge/data/transits/${from.toLowerCase()}-${event.aspect}-${to.toLowerCase()}.json`, 'utf8')).readerCopy;
        await expect(exact.locator('p').nth(i)).toHaveText(copy.body);
      }
      const movements = card.getByLabel('Daily transits and aspects');
      await expect(movements.getByRole('button')).toHaveCount(primaryEvents.length);
    }
    expect(await card.locator('.lunar-selected-card__body').evaluate(el => [...el.querySelectorAll('section')].map(child => child.getAttribute('aria-label') || child.getAttribute('aria-labelledby'))))
      .toEqual(['Sun in season', 'Moon guidance', ...(empty ? [] : ['lunar-selected-exact-heading'])]);
    const sunEnd = await sun.locator('p').last().boundingBox();
    const moonStart = await moon.locator('p').first().boundingBox();
    const moonNext = await moon.locator('p').nth(1).boundingBox();
    expect(moonStart!.y - sunEnd!.y - sunEnd!.height)
      .toBeCloseTo(moonNext!.y - moonStart!.y - moonStart!.height, 1);
    const typography = (el: Element) => {
      const style = getComputedStyle(el);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
    };
    expect(await sun.locator('p').evaluate(typography)).toEqual(await moon.locator('p').first().evaluate(typography));
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await card.screenshot({ path: `test-results/calendar-summary-${width}-${theme}${empty ? '-empty' : ''}.png` });
    await sun.getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`date=${dateKey}#sky/placement/sun/virgo`));
  });
}
