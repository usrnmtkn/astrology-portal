import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';

const key = 'authored/calendar-moon-transition/virgo/libra';
const body = 'Once the Moon enters Libra, the synthetic ingress passage begins.\n\nThe complete synthetic ending stays intact.';
const moonSignBody = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json', 'utf8'))
  .authoredCards.find((row: any) => row.contentKey === 'authored/calendar-weekly-moon/libra').body as string;
const guidanceParagraphs = `Synthetic Moon-sign introduction for Libra at 4:10 AM EDT. ${moonSignBody} ${body}`.split('\n\n');
const opening = 'Synthetic Moon-sign introduction for {{nextMoonSign}} at {{nextMoonSignEntryTime}}.';
const rows = [
  { content_key: key, body },
  { content_key: 'authored/calendar-timing/earlyIngress', body: opening },
].map((row, index) => ({ ...row, id: `ingress-reading-${index}`, updated_at: '2026-10-09T08:00:00Z',
  status: 'LIVE', lane: 'serving', review_state: null, surface: 'sky', mode: 'in_depth',
  provider: 'manual', headline: index === 0 ? 'Moon enters Libra' : 'Synthetic timing source' }));

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Ingress reading uses complete copy and event timing at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-10-09T16:00:00Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY',
        latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
    }, theme);
    await bundledPublications(page);
    await page.route('**/api/content-reader', route => {
      const query = route.request().postDataJSON();
      return route.fulfill({ json: readerResponse(rows.filter(row =>
        (!query.keys || query.keys.includes(row.content_key)) && (!query.ids || query.ids.includes(row.id))
        && (!query.prefix || row.content_key.startsWith(query.prefix)) && (!query.provider || query.provider === row.provider))) });
    });
    await page.goto('/?date=2026-10-09#calendar?view=day&date=2026-10-09');
    const day = page.getByLabel('Selected lunar day', { exact: true });
    const dayCopy = day.locator('[data-guidance-key]');
    await expect(dayCopy.locator('p')).toHaveText(guidanceParagraphs, { timeout: 60_000 });
    const event = day.getByRole('button', { name: 'Moon enters Libra', exact: true });
    await expect(event).toContainText('4:10a');
    await page.getByRole('tab', { name: 'Week', exact: true }).click();
    const friday = page.locator('#calendar-day-group-2026-10-09');
    const copy = friday.locator('.calendar-day-group__blurb');
    for (let reload = 0; reload < 2; reload++) {
      if (reload) await page.reload();
      await expect(copy.locator('p')).toHaveText(guidanceParagraphs, { timeout: 60_000 });
      await expect(friday.getByRole('button', { name: 'Moon enters Libra 4:10a', exact: true })).toBeVisible();
      await expect(copy).not.toContainText('most of today');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/ingress-reading-${width}-${theme}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
