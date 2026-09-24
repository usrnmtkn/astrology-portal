import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';

const key = 'sky-card/moon/aquarius/sextile/neptune/aries';
const original = 'The conversation starts slowly. There is time to hear the rest before answering.';
const revised = 'The conversation has changed. There is still time to hear the full answer.';
const date = '2026-09-21';
const row = {
  id: 'calendar-retention-fixture', content_key: key, surface: 'sky', mode: 'feed', status: 'LIVE',
  lane: 'serving', review_state: null, headline: 'Moon sextile Neptune', body: original,
  event_type: 'calendar-aspect-owner-approved-revision', block_type: 'sky_aspect',
  provider: 'owner-content-studio', updated_at: '2026-09-21T12:00:00Z',
  source_snapshot: { review_status: 'approved', owner_approved: true, serving_enabled: true,
    calendarAspectPublication: { schema: 'content-studio-calendar-publication/v1', contentKey: key } }
};

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Calendar keeps loaded aspect copy during tab refresh ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-22T13:00:00Z'));
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
    }, theme);
    await bundledPublications(page);
    let body: string | null = original;
    let failed = false;
    let gate: Promise<void> | null = null;
    let release = () => {};
    let held = 0;
    let refreshFailures = 0;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.text().includes('Calendar content refresh failed; retaining eligible loaded writing.')) refreshFailures += 1;
    });
    await page.route('**/api/content-reader', async route => {
      const keys: string[] = route.request().postDataJSON().keys ?? [];
      if (keys.includes(key) && gate) { held += 1; await gate; }
      if (keys.includes(key) && failed) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
      return route.fulfill({ json: readerResponse(keys.includes(key) && body ? [{ ...row, body }] : []) });
    });
    await page.goto(`/?date=${date}#calendar?view=day&date=${date}`);
    const card = page.locator('.calendar-day-events .calendar-stoic-card').filter({ hasText: /Moon sextiles Neptune/ });
    await expect(card).toContainText(original, { timeout: 60_000 });
    await card.click();
    const detail = page.getByRole('dialog', { name: 'Event detail' });
    await expect(detail).toContainText(original);
    const refresh = async (minute: number) => {
      gate = new Promise<void>(resolve => { release = resolve; });
      held = 0;
      await page.clock.setFixedTime(new Date(`2026-09-22T13:0${minute}:00Z`));
      await page.evaluate(() => {
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await expect.poll(() => held).toBeGreaterThan(0);
      // The network is held: these checks cannot pass by waiting for a refetch.
      await expect(card).toContainText(body!, { timeout: 1500 });
      await expect(detail).toContainText(body!, { timeout: 1500 });
    };
    try {
      await refresh(1);
      body = revised;
      release(); gate = null;
      await expect(detail).toContainText(revised);
      await expect(card).toContainText(revised);
      await detail.getByRole('button', { name: 'Close', exact: true }).click();
      gate = new Promise<void>(resolve => { release = resolve; });
      held = 0;
      await page.evaluate(() => { window.location.hash = 'sky'; });
      await expect(page.locator('.app-shell')).not.toHaveClass(/mode-calendar/);
      await page.goBack();
      await expect(card).toContainText(revised);
      expect(held).toBe(0); // Returning to the same Calendar uses its loaded keys.
      release(); gate = null;
      await card.click();
      await expect(detail).toContainText(revised);
      await refresh(2);
      failed = true;
      release(); gate = null;
      await expect.poll(() => refreshFailures).toBeGreaterThan(0);
      await expect(detail).toContainText(revised);
      await expect(card).toContainText(revised);
      failed = false;
      await refresh(3);
      body = null; // A successful empty response withdraws the cached source.
      release(); gate = null;
      await expect(detail).not.toContainText(revised);
      await expect(card).not.toContainText(revised);
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}


test('Calendar recovers when its content bundle finishes after the deadline', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await bundledPublications(page);
  let release = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/fallback-content-deferred-core-*.js', async route => {
    await held;
    await route.continue();
  });
  try {
    await page.goto(`/?date=${date}#calendar?view=day&date=${date}`);
    const day = page.getByLabel('Selected lunar day');
    await expect(day.getByRole('alert')).toContainText('This day’s reading could not load.', { timeout: 30_000 });
    await expect(day.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    release();
    await expect(day.getByRole('alert')).toHaveCount(0, { timeout: 15_000 });
    await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false');
    await expect(day.locator('.card-skeleton')).toHaveCount(0);
    await expect(day.locator('.calendar-stoic-card').first()).toBeEnabled();
    await expect(day.locator('.calendar-sky-card__body p').first()).not.toBeEmpty();
  } finally { release(); }
});
