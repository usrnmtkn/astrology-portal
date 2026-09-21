import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { bundledPublications } from '../helpers/bundled-publications';
const source = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json', 'utf8'));
const placementBody = source.hookRows.find((row: any) => row.contentKey === 'fallback-hook/sky-placement-lived/moon/libra').body_you as string;
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
    await bundledPublications(page);
    await page.route('**/assets/fallback-content-sky-placement-*.js', async route => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.continue();
    });
    await page.addInitScript(() => {
      const observed: string[] = [];
      (window as typeof window & { moonCopyObserved: string[] }).moonCopyObserved = observed;
      new MutationObserver(() => {
        const copy = document.querySelector('[data-guidance-key] p')?.textContent?.trim();
        if (copy && !observed.includes(copy)) observed.push(copy);
      }).observe(document, { subtree: true, childList: true, characterData: true });
    });
    await page.goto(`/?date=${dateKey}#calendar?view=day&date=${dateKey}`);
    const card = page.getByLabel("Selected lunar day", { exact: true });
    const moon = card.locator("[data-guidance-key]").first();
    const sun = card.getByRole('region', { name: 'Sun in season', exact: true });
    await expect(sun.getByRole('link', { name: /Sun in Virgo at \d+°/ })).toBeVisible({ timeout: 60_000 });
    const sunClause = JSON.parse(readFileSync('apps/web/src/content/skyDailySummaryClauses.json', 'utf8')).sun.virgo;
    await expect(sun).toContainText(sunClause);
    await expect(moon.locator('p').first()).toBeVisible();
    expect(await moon.getAttribute("data-guidance-key")).not.toContain("sky-placement-lived");
    await expect(moon).not.toContainText(placementBody.split(/\n\n/)[0]);
    const firstMoonParagraph = (await moon.locator('p').first().innerText()).trim();
    expect(await page.evaluate(() => (window as typeof window & { moonCopyObserved: string[] }).moonCopyObserved))
      .toEqual([firstMoonParagraph]);
    await expect(moon.getByText(/Moon in Libra at \d+°/)).toHaveCount(0);
    await expect(card.getByRole('region', { name: 'Daily Calendar overview' })).toHaveCount(0);
    await expect(card.locator('mark')).toHaveCount(0);
    await expect(card.getByRole('region', { name: 'Exact today', exact: true })).toHaveCount(0);
    const primaryEvents = events.filter(event => event.primary);
    if (empty) await expect(card.locator('.calendar-stoic-card')).toHaveCount(day.voidOfCourse ? 1 : 0);
    for (const event of primaryEvents) {
      const [from, to] = event.planets;
      const title = new RegExp(`${from}(?: Rx)? ${event.aspect}s ${to}(?: Rx)?`, 'i');
      const trigger = card.locator('.calendar-day-events').getByRole('button', { name: title });
      await expect(trigger).toHaveCount(1);
      await trigger.click();
      const reading = page.getByRole('dialog', { name: 'Event detail', exact: true });
      const copy = JSON.parse(readFileSync(`packages/astro-knowledge/data/transits/${from.toLowerCase()}-${event.aspect}-${to.toLowerCase()}.json`, 'utf8')).readerCopy;
      await expect(reading).toContainText(copy.body);
      await reading.getByRole('button', { name: 'Close', exact: true }).click();
    }
    expect(await card.locator('.calendar-sky-card__body').evaluate(el => [...el.querySelectorAll('section')].map(child => child.getAttribute('aria-label') || child.getAttribute('aria-labelledby'))))
      .toEqual(expect.arrayContaining(['Sun in season']));
    const sunEnd = await sun.locator('p').last().boundingBox();
    const moonStart = await moon.locator('p').first().boundingBox();
    expect(moonStart!.y).toBeGreaterThan(sunEnd!.y);
    const moonParagraphs = moon.locator('p');
    if (await moonParagraphs.count() > 1) {
      const moonNext = await moonParagraphs.nth(1).boundingBox();
      expect(moonStart!.y - sunEnd!.y - sunEnd!.height)
        .toBeCloseTo(moonNext!.y - moonStart!.y - moonStart!.height, 1);
    }
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

test('Calendar and Sky preserve formatted summary lists and placement links', async ({ page }) => {
  test.setTimeout(90_000);
  const dateKey = '2026-09-12';
  const row = { id: 'format-summary', content_key: 'cms/sky-daily-summary/sun/virgo', surface: 'sky', mode: 'card',
    status: 'LIVE', lane: 'serving', review_state: null, headline: 'QA summary',
    body: 'QA opening.\n\n- **First QA item**\n- *Final QA item*',
    source_snapshot: { contentType: 'mustache-template', contentSystem: 'cms-surface-override', allowedSlots: [] } };
  await page.clock.setFixedTime(new Date(`${dateKey}T16:00:00Z`));
  await page.addInitScript(location => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location)), location);
  await bundledPublications(page);
  await page.route('**/rest/v1/generated_interpretations?**', route => route.fulfill({ json: [row] }));
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
    schema: 'content-studio-last-known-good-v1', rowCount: 1, rows: [row], publications: []
  } }));
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: {
    month: '2026-09', timeZone: location.timeZone, location, events: [], days: [{ date: `${dateKey}T16:00:00Z`, dateKey,
      inMonth: true, moonSign: 'Libra', moonSignGlyph: '♎', moonPhase: 'Waxing Crescent', illumination: 4, activeAspects: [], events: [], voidOfCourse: null }]
  } } }));
  for (const route of [`?date=${dateKey}#calendar?view=day&date=${dateKey}`, `?date=${dateKey}#sky`]) {
    await page.goto(`/${route}`);
    const summary = route.includes('#calendar') ? page.getByRole('region', { name: 'Sun in season', exact: true }) : page.getByLabel('Daily sky summary', { exact: true });
    await expect(summary).toContainText('QA opening.', { timeout: 60_000 });
    await expect(summary.locator('ul > li strong')).toHaveText('First QA item');
    await expect(summary.locator('ul > li em')).toHaveText('Final QA item');
    await expect(summary.locator('a[href$="#sky/placement/sun/virgo"]')).toHaveText(/Sun in Virgo at \d+°/);
    await expect(summary.locator('p ul, p ol')).toHaveCount(0);
  }
});
