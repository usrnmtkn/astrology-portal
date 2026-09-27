import { test, expect } from '@playwright/test';
import { studioListingFacts, studioListingRow } from '../../api/_lib/studio-listing-facts';
import { readerResponse } from '../helpers/reader-response';
import { bundledPublications } from '../helpers/bundled-publications';
const standard = 'With the {sunPlacement}, this is the saved standard fixture. The standard closing stays complete.';
const retrograde = 'The {sunPlacement} starts the saved retrograde fixture. {rulerName} is retrograde and the closing stays complete.';
const key = 'cms/sky-daily-summary/sun/libra';
const rows = [standard, retrograde].map((body, i) => ({
  id: `sun-season-${i}`, content_key: `${key}${i ? '/ruler-retrograde' : ''}`, surface: 'sky', mode: 'feed',
  status: 'LIVE', lane: 'serving', review_state: null, body, headline: null, summary: null, sections: null,
  source_snapshot: { contentSystem: 'cms-surface-override', contentType: 'mustache-template', allowedSlots: i ? ['sunPlacement', 'rulerName'] : ['sunPlacement'] },
  updated_at: '2026-09-26T12:00:00Z', target_date: null, event_type: 'sky-daily-summary'
}));
for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Sun editor direct load, filters and saved variants ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'sun-season-fixture'));
    const scopes: string[][] = [];
    await page.route('**/api/admin/**', async route => {
      const url = new URL(route.request().url());
      let found: any[] = [];
      if (/\/generated-content(?:-inventory)?$/.test(url.pathname)) {
        const keys = [...url.searchParams.getAll('contentKey'), ...url.searchParams.getAll('contentKeys')];
        const ids = url.searchParams.getAll('id');
        const prefixes = url.searchParams.getAll('contentKeyPrefix');
        if (url.pathname.endsWith('-inventory')) scopes.push(prefixes);
        found = rows.filter(row => keys.length ? keys.includes(row.content_key) : ids.length ? ids.includes(row.id) : prefixes.length ? prefixes.some(prefix => row.content_key.startsWith(prefix)) : true);
        if (url.pathname.endsWith('-inventory') && !keys.length && !ids.length) found = found.map(row => studioListingRow(row, studioListingFacts(row)));
      }
      await route.fulfill({ json: { ok: true, rows: found, statuses: [], records: [], nextCursor: null } });
    });
    await page.goto('/admin/content#sky-writeups?view=daily-summary&section=sun');
    await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
    const studio = page.getByRole('region', { name: 'Daily Sky Summary editor', exact: true });
    await expect(studio.getByRole('article', { name: 'Sun in Libra', exact: true })).toContainText(standard);
    expect(scopes.some(prefixes => prefixes.includes('cms/sky-daily-summary/'))).toBe(true);
    await studio.getByLabel('Sun passage sign').selectOption('Libra');
    await studio.getByLabel('Sun passage version').selectOption('retrograde');
    await expect(studio.getByLabel('Daily Sky Summary fields').getByRole('article')).toHaveCount(1);
    const entry = studio.getByRole('article', { name: 'Sun in Libra · Ruler retrograde', exact: true });
    await expect(entry).toContainText(retrograde);
    await entry.getByRole('button', { name: 'Edit wording', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Insert Sun placement', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Insert ruler name', exact: true })).toBeVisible();
    await expect(page.getByLabel('Summary wording', { exact: true })).toHaveValue(retrograde);
    await expect(page.getByRole('button', { name: 'Save & publish', exact: true })).toBeVisible();
    await page.getByRole('dialog', { name: 'Generated content editor' }).getByRole('button', { name: 'Close', exact: true }).click();
    await studio.getByLabel('Sun passage sign').selectOption('Cancer');
    await expect(studio.getByLabel('Sun passage version')).toHaveValue('standard');
    await expect(studio.getByLabel('Sun passage version').locator('option')).toHaveCount(1);
    await studio.getByLabel('Sun passage sign').selectOption('Leo');
    await expect(studio.getByLabel('Sun passage version').locator('option')).toHaveCount(1);
    await page.screenshot({ path: `test-results/sun-season-editor-${width}-${theme}.png` });
    await page.reload();
    await expect(studio.getByRole('article', { name: 'Sun in Libra', exact: true })).toContainText(standard);
  });
}
for (const date of ['2026-09-24', '2026-10-05']) {
  test(`Sun variant on both reader surfaces for ${date}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.setFixedTime(new Date('2026-09-26T12:00:00Z'));
    const location = { label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
    await page.addInitScript(location => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location)), location);
    await bundledPublications(page);
    await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse(rows) }));
    await page.route('**/api/sky?**', route => route.abort());
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: {
      month: date.slice(0, 7), timeZone: location.timeZone, location, events: [], days: [{
        date: `${date}T16:00:00Z`, dateKey: date, inMonth: true, moonSign: 'Pisces', moonSignGlyph: '♓',
        moonPhase: 'Waxing Gibbous', illumination: 90, activeAspects: [], events: [], voidOfCourse: null
      }]
    } } }));
    const expected = date === '2026-09-24' ? 'this is the saved standard fixture' : 'starts the saved retrograde fixture';
    const ending = date === '2026-09-24' ? 'The standard closing stays complete.' : 'Venus is retrograde and the closing stays complete.';
    for (const surface of ['sky', 'calendar?view=day&date=' + date]) {
      await page.goto(`/?date=${date}#${surface}`);
      const summary = surface === 'sky' ? page.getByLabel('Daily sky summary', { exact: true }) : page.getByRole('region', { name: 'Sun in season', exact: true });
      await expect(summary).toContainText(expected, { timeout: 90_000 });
      await expect(summary).toContainText(ending);
      await expect(summary.getByRole('link').filter({ hasText: /^Sun in Libra at \d+°$/ })).toHaveCount(1);
      await expect(summary).not.toContainText('{sunPlacement}');
    }
  });
}
