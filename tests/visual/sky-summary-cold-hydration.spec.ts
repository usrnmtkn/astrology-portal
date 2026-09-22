import { readerResponse } from '../helpers/reader-response';
import { expect, test } from '@playwright/test';

const moonKey = 'cms/sky-daily-summary/moon/libra/regular';
const first = 'shows the currently published Moon summary';
const second = 'shows the next explicitly published Moon summary';
const third = 'shows the publication retrieved after retry';

for (const width of [390, 1440]) {
  test(`one authoritative Daily Sky opening from a cold load at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-13T23:40:00Z'));
    let revision = 1000;
    let body = first;
    let retired = false;
    let unavailable = false;
    const updatedAt = () => `2026-09-13T23:00:00.${String(revision).padStart(6, '0')}Z`;
    const rowId = () => `moon-summary-${revision}`;
    await page.addInitScript(() => {
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }));
      (window as any).__summaryOpenings = [];
      new MutationObserver(() => {
        const text = document.querySelector('[aria-label="Daily sky summary"] > p')?.textContent?.trim();
        if (text && (window as any).__summaryOpenings.at(-1) !== text) (window as any).__summaryOpenings.push(text);
      }).observe(document, { subtree: true, childList: true, characterData: true });
    });
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [{ dateKey: '2026-09-13', events: [] }] } } }));
    // The outage fixture must include its offline plane. Do not mix synthetic
    // revision 1000 with a real nightly snapshot whose revisions may be newer.
    // An explicitly older offline publication must not resurrect old prose.
    await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
      schema: 'content-studio-last-known-good-v2', rowCount: 1,
      rows: [{ id: 'older-moon', content_key: moonKey, surface: 'sky', mode: 'feed', status: 'LIVE', lane: 'serving', review_state: null, target_date: null, event_type: null, headline: null, summary: null, body: 'contains an obsolete offline Moon summary', sections: null, model: null, updated_at: '2026-09-12T23:00:00Z' }],
      publications: [{ content_key: moonKey, state: 'live', revision: 999, row_id: 'older-moon', row_updated_at: '2026-09-12T23:00:00Z', updated_at: '2026-09-12T23:00:00Z' }]
    } }));
    await page.route('**/rest/v1/content_publications*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({ json: [
        { content_key: '__content-publication-ledger/v1', state: 'live', revision: 999, row_id: null, row_updated_at: null, updated_at: updatedAt() },
        { content_key: moonKey, state: retired ? 'retired' : 'live', revision, row_id: rowId(), row_updated_at: updatedAt(), updated_at: updatedAt() }
      ] });
    });
    await page.route('**/api/content-reader', async route => {
      const requested = route.request().postDataJSON().keys ?? [];
      if (!requested.includes(moonKey)) return route.fulfill({ json: readerResponse([]) });
      await new Promise(resolve => setTimeout(resolve, 1800));
      if (unavailable) return route.fulfill({ status: 503, json: { message: 'Synthetic read outage' } });
      await route.fulfill({ json: readerResponse(retired ? [] : [{ id: rowId(), content_key: moonKey, surface: 'sky', mode: 'feed', status: 'LIVE', lane: 'serving', review_state: null, target_date: null, event_type: null, headline: null, summary: null, body, sections: null, model: null, updated_at: updatedAt() }]) });
    });
    const notify = () => page.evaluate(key => window.dispatchEvent(new CustomEvent('tldrastro:content-update', { detail: { contentKey: key, published: true, updatedAt: new Date().toISOString() + Math.random() } })), moonKey);
    const summary = page.getByLabel('Daily sky summary', { exact: true });
    await page.goto('/?date=2026-09-13#sky');
    await expect(page.getByText('Loading the sky…', { exact: true })).toBeVisible({ timeout: 60000 });
    await expect(summary).toContainText(first, { timeout: 60000 });
    await page.waitForTimeout(4000);
    const openings = await page.evaluate(() => (window as any).__summaryOpenings as string[]);
    expect(openings.length).toBeGreaterThan(0);
    expect(openings.every(text => text.includes(first))).toBe(true);
    await expect(summary).not.toContainText('brings our attention to relationships');
    await expect(summary).not.toContainText('Moon moves through Libra');
    const height = await summary.evaluate(el => el.getBoundingClientRect().height);
    await notify();
    await page.waitForTimeout(6000);
    await expect(summary).toContainText(first);
    expect(await summary.evaluate(el => el.getBoundingClientRect().height)).toBe(height);
    revision++; body = second;
    await notify();
    await expect(summary).toContainText(second, { timeout: 30000 });
    await expect(summary).not.toContainText(first);
    revision++; retired = true;
    await notify();
    await expect(summary).toContainText('Moon moves through Libra', { timeout: 30000 });
    await expect(summary).not.toContainText(second);
    revision++; retired = false; unavailable = true; body = third;
    await notify();
    await expect(summary.getByRole('alert')).toBeVisible({ timeout: 30000 });
    await expect(summary).not.toContainText(first);
    await expect(summary).not.toContainText(second);
    await expect(summary).not.toContainText('obsolete offline Moon');
    unavailable = false;
    await summary.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(summary).toContainText(third, { timeout: 30000 });
    await expect(summary.getByRole('link', { name: 'Read about Moon in Libra' })).toHaveAttribute('href', '#sky/placement/moon/libra');
    await page.screenshot({ path: `test-results/sky-summary-cold-${width}.png` });
  });
}
