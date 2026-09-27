import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';

for (const width of [390, 1440]) {
  test(`Calendar keeps its loaded day through repeated route and background checks ${width}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.install({ time: new Date('2026-09-27T16:00:00Z') });
    await page.addInitScript(() => {
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
      // A full/quota-limited browser cache must not evict the open reading.
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.startsWith('tldr-lunar-calendar')) throw new DOMException('Full', 'QuotaExceededError');
        setItem.call(this, key, value);
      };
    });
    await bundledPublications(page);
    let requests = 0;
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/calendar') requests++; });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?date=2026-10-02#calendar?view=day&date=2026-10-02');
    const day = page.getByLabel('Selected lunar day');
    await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
    const card = day.getByRole('button', { name: 'Mercury squares Mars', exact: true });
    await expect(card).toBeVisible();
    await card.click();
    const dialog = page.getByRole('dialog', { name: 'Event detail' });
    await expect(dialog).toBeVisible();
    const before = await dialog.innerText();
    const beforeRequests = requests;
    await page.evaluate(() => {
      const panel = document.querySelector('[aria-label="Selected lunar day"]')!;
      const dialog = document.querySelector('[role="dialog"]')!;
      (window as any).__calendarStability = { panel, dialog, flashes: 0, scroll: window.scrollY };
      new MutationObserver(() => {
        if (!panel.isConnected || !dialog.isConnected || panel.querySelector('.card-skeleton, [aria-busy="true"]')) {
          (window as any).__calendarStability.flashes++;
        }
      }).observe(document.querySelector('#root')!, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy'] });
      // Browser URL restoration may announce the same selection more than once.
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await page.clock.runFor(1000);
    expect(requests, 'The same date/location should reuse its facts').toBe(beforeRequests);
    for (let cycle = 0; cycle < 2; cycle++) {
      await page.clock.fastForward(301_000);
      await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
      await page.clock.runFor(1000);
      await expect(dialog).toHaveText(before, { useInnerText: true });
      const stability = await page.evaluate(() => {
        const state = (window as any).__calendarStability;
        return { flashes: state.flashes, samePanel: state.panel.isConnected, sameDialog: state.dialog.isConnected, scroll: window.scrollY - state.scroll };
      });
      expect(stability).toEqual({ flashes: 0, samePanel: true, sameDialog: true, scroll: 0 });
    }
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Next day', exact: true }).click();
    await expect(day).toHaveAttribute('data-calendar-date', '2026-10-03');
    await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false');
    await page.reload();
    await expect(day).toHaveAttribute('data-calendar-date', '2026-10-03', { timeout: 60_000 });
    await expect(day.locator('.calendar-sky-card__body')).toHaveAttribute('aria-busy', 'false');
    expect(errors).toEqual([]);
  });
}
