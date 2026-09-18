import { expect, test, type Page } from '@playwright/test';

async function installObservation(page: Page, theme: string) {
  await page.addInitScript(theme => {
    localStorage.setItem('tldrastro:theme', theme);
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    const observation = (window as any).__skyLayout = { frames: [] as any[], shifts: [] as any[] };
    new PerformanceObserver(list => {
      for (const entry of list.getEntries() as any) {
        if (!entry.hadRecentInput) observation.shifts.push({ at: entry.startTime, value: entry.value });
      }
    }).observe({ type: 'layout-shift', buffered: true });
    const box = (el: Element | null) => {
      if (!el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { top: Math.round(r.top + scrollY), height: Math.round(r.height), width: Math.round(r.width) };
    };
    const sample = () => {
      const summary = document.querySelector('[aria-label="Daily sky summary"]');
      const frame = {
        hero: box(document.querySelector('.today-hero')),
        loading: box(document.querySelector('.sky-reading-layout__loading')),
        summary: box(summary),
        summaryBusy: summary?.getAttribute('aria-busy'),
        transits: box(document.querySelector('[aria-label="Transits"]')),
        cards: [...document.querySelectorAll('.planet-placement-row--sky')].map(el => ({
          title: el.getAttribute('aria-label'), box: box(el), busy: el.getAttribute('aria-busy'),
        })).filter(card => card.box)
      };
      if (JSON.stringify(frame) !== JSON.stringify(observation.frames.at(-1)?.frame)) {
        observation.frames.push({ at: performance.now(), frame });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, theme);
}

async function assertStableReading(page: Page) {
  await expect(page.getByLabel('Daily sky summary', { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.planet-placement-row--sky[aria-busy="true"]')).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(2000);
  const data = await page.evaluate(() => (window as any).__skyLayout);
  await test.info().attach('layout-observation', { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
  const frames = data.frames.map((sample: any) => sample.frame);
  const reading = frames.filter((frame: any) => frame.summary);
  expect(reading.length).toBeGreaterThan(0);
  expect(reading.every((frame: any) => frame.summaryBusy === 'false' && frame.cards.length === 14 && frame.cards.every((card: any) => card.busy !== 'true')),
    'The first visible summary must arrive with resolved transit cards').toBe(true);
  for (const anchor of ['hero', 'loading', 'summary', 'transits']) {
    const boxes = frames.map((frame: any) => frame[anchor]).filter(Boolean);
    expect(new Set(boxes.map((box: any) => JSON.stringify(box))).size, `${anchor} moved after becoming visible`).toBeLessThanOrEqual(1);
  }
  const cardLayouts = reading.map((frame: any) => JSON.stringify(frame.cards));
  expect(new Set(cardLayouts).size, 'Transit rows shifted while the initial page was loading').toBe(1);
  expect(data.shifts.reduce((sum: number, shift: any) => sum + shift.value, 0), 'Unexpected movement from the first document frame').toBeLessThan(0.01);
  return data;
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Sky initial loading preserves layout through reload and return at ${width} ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-14T16:00:00Z'));
    await installObservation(page, theme);
    await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
      schema: 'content-studio-last-known-good-v1', rows: [], publications: [], rowCount: 0
    } }));
    await page.route('**/rest/v1/**', async route => {
      if (new URL(route.request().url()).pathname.endsWith('/generated_interpretations')) {
        await new Promise(resolve => setTimeout(resolve, 1800));
      }
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?date=2026-09-14#sky');
    const results = [await assertStableReading(page)];
    await page.screenshot({ path: testInfo.outputPath('cold.png') });
    await page.reload();
    results.push(await assertStableReading(page));
    await page.getByRole('button', { name: 'Read more about Sun in Virgo', exact: true }).click();
    await expect(page.locator('.sky-detail-article .article-body-inner').first()).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => { (window as any).__skyLayout.frames = []; (window as any).__skyLayout.shifts = []; });
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    results.push(await assertStableReading(page));
    await page.evaluate(() => {
      (window as any).__skyLayout.frames = [];
      (window as any).__skyLayout.shifts = [];
      window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
        detail: { contentKey: '*', published: true, updatedAt: '2026-09-14T16:05:00Z' }
      }));
    });
    await page.waitForTimeout(4000);
    results.push(await assertStableReading(page));
    expect(results.at(-1).frames.every((sample: any) => !sample.frame.loading), 'Revalidation must retain the visible reading').toBe(true);
    await testInfo.attach('layout-from-first-frame', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
    expect(errors).toEqual([]);
  });
}
