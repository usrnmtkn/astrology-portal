import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { skyPlacementSourceFixture } from '../helpers/sky-placement-source-fixture.mts';
import { calendarPassageRecord } from '../../src/shared/features/calendar/calendarPassageTemplates';
import { getLunarCalendarMonth } from '../../apps/web/src/services/ephemeris';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { parseStudioPassageEdit } from '../../src/shared/studioPassageEdit';

const date = '2026-10-21', timeZone = 'America/New_York';
const calendarKey = `calendar-passage/daily/${date}/${encodeURIComponent(timeZone)}`;
const calendarWriting = (status: 'LIVE' | 'DRAFT') => {
  const body = status === 'LIVE' ? 'Synthetic published daily overview: {{moonSign}}.' : 'Synthetic saved Calendar draft: {{moonSign}}.\n\nComplete draft ending.';
  const record = { ...calendarPassageRecord(calendarKey, body), review_status: status === 'LIVE' ? 'approved' : 'needs_review' };
  return { id: status === 'LIVE' ? '11111111-1111-4111-a111-111111111111' : '22222222-2222-4222-a222-222222222222',
    content_key: calendarKey, surface: 'sky', mode: status === 'LIVE' ? 'feed' : 'studio-draft', status,
    lane: status === 'LIVE' ? 'serving' : 'reference', review_state: status === 'LIVE' ? null : 'owner-review-required',
    event_type: 'calendar-passage', block_type: 'fallback_hook', headline: 'Daily overview', body, summary: '',
    provider: 'tldrastro-fallback-architecture-v3', facts: { fallbackArchitectureV3: true },
    sections: { packageRecord: record, ...(status === 'DRAFT' ? { packageDraft: record } : {}) },
    source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: 'full_copy', review_status: status === 'LIVE' ? 'approved' : 'needs_review' },
    created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-20T12:00:00Z' };
};

for (const [width, theme] of [[1440, 'light'], [390, 'dark'], [390, 'light'], [1440, 'dark']] as const) {
  test(`Content Library finds and opens Sky and Calendar writing ${width} ${theme}`, async ({ page, context }) => {
    test.setTimeout(180_000);
    const fixture = await skyPlacementSourceFixture('sun', 'libra');
    fixture.active.headline = 'Libra Season 2026';
    fixture.pending.headline = 'Libra Season 2026';
    const unrelatedMoon = { ...structuredClone(fixture.fallback), id: '33333333-3333-4333-a333-333333333333',
      status: 'DRAFT', lane: 'reference', review_state: 'owner-review-required', headline: 'Moon in Scorpio · October 11, 2026',
      content_key: 'sky-season-fallback/libra-2026/moon/scorpio/2026-10-11' };
    const season = { ...structuredClone(fixture.active), id: '44444444-4444-4444-a444-444444444444',
      content_key: 'article/manual/libra-season-2026', block_type: 'article', event_type: 'article', sections: {}, source_snapshot: {} };
    const store = await studioApiStore([unrelatedMoon, season, fixture.pending, fixture.active, calendarWriting('LIVE'), calendarWriting('DRAFT')], { uuidIds: true });
    const calendar = await getLunarCalendarMonth({ label: 'QA reference', latitude: 0, longitude: 0, timeZone }, new Date(`${date}T16:00:00Z`));
    const writes: unknown[] = [], errors: string[] = [];
    let failOpening = false, failStatus = false;
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(theme => {
      localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
      localStorage.setItem('tldrastro:studio-theme', theme);
    }, theme);
    await context.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await context.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
    await routeStudioInventoryApi(context, { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write), answer: async (route, url) => {
      if (url.pathname === '/api/calendar') { await route.fulfill({ json: { ok: true, calendar } }); return true; }
      if (url.pathname === '/api/content-publications') {
        const publications = canonicalPublicationLedger(await store.call({ method: 'publications' }));
        await route.fulfill({ headers: { etag: await publicationLedgerTag(publications) }, json: { schema: 'tldr-publications/v1', publications } }); return true;
      }
      if (url.pathname === '/api/admin/content-live-status' || url.pathname === '/api/content-reader') {
        if (failStatus && url.pathname === '/api/admin/content-live-status') { await route.fulfill({ status: 503, json: { error: 'Synthetic status outage.' } }); return true; }
        const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload }); return true;
      }
      if (!url.pathname.startsWith('/api/admin/')) { await route.fulfill({ status: 503, json: { error: 'Optional API unavailable in this isolated fixture.' } }); return true; }
      return false;
    } });
    await context.route('**/api/admin/generated-content-inventory?**', async route => {
      if (failOpening && new URL(route.request().url()).searchParams.getAll('contentKeys').includes(fixture.active.content_key)) {
        await route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic article source unavailable.' } }); return;
      }
      await route.fallback();
    });
    const before = await store.call({ method: 'rows' }), ledger = await store.call({ method: 'publications' });
    const results = page.locator('tr.admin-content-row');
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/admin/content#exact-content');
      const search = page.getByRole('searchbox', { name: 'Search content', exact: true });
      await expect(results.filter({ hasText: unrelatedMoon.content_key })).toBeVisible();
      await search.fill('Libra Season 2026');
      await expect(results).toHaveCount(3);
      await expect(results.first()).toContainText('Libra Season 2026');
      await expect(results.filter({ hasText: unrelatedMoon.content_key })).toHaveCount(0);
      await expect(results.filter({ hasText: season.content_key })).toContainText('Sky & Calendar · Season article');
      await expect(results.filter({ hasText: fixture.active.content_key })).toContainText('Sky · Dated article');
      await expect(results.filter({ hasText: fixture.active.content_key }).getByRole('button', { name: 'Edit published article', exact: true })).toBeVisible();
      await expect(results.filter({ hasText: fixture.pending.content_key }).getByRole('button', { name: 'Continue draft', exact: true })).toBeVisible();
      await page.reload();
      await expect(search).toHaveValue('Libra Season 2026');
      await expect(results).toHaveCount(3);
      await results.filter({ hasText: fixture.pending.content_key }).getByRole('button', { name: 'Continue draft', exact: true }).click();
      const skyEditor = page.getByRole('dialog');
      await expect(skyEditor.getByRole('textbox', { name: 'Sky article general copy', exact: true })).toHaveValue(/Synthetic pending revision opening[\s\S]*Synthetic pending revision final sentence/u, { timeout: 60_000 });
      await expect(page.getByLabel('Passage opened from Content Library', { exact: true })).toContainText(fixture.active.content_key);
      expect(parseStudioPassageEdit(new URL(page.url()).hash)).toMatchObject({ surface: 'sky', date: '2026-09-22', sourceKey: fixture.active.content_key });
      await skyEditor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.goBack();
      await expect(search).toHaveValue('Libra Season 2026');
      if (width === 1440 && theme === 'light') {
        await results.filter({ hasText: fixture.active.content_key }).getByRole('button', { name: 'Edit published article', exact: true }).click();
        await expect(skyEditor.getByRole('textbox', { name: 'Sky article general copy', exact: true })).toHaveValue(/Synthetic pending revision final sentence/u);
        await skyEditor.getByRole('button', { name: 'Close', exact: true }).click();
        await page.goBack();
      }
      await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
      await page.getByRole('button', { name: 'Calendar', exact: true }).click();
      await expect(results).toHaveCount(3); // Shared season article and the two dated overview versions.
      await search.fill('2026-10-21');
      await expect(results).toHaveCount(2);
      await expect(results.first()).toContainText('Calendar · Daily overview');
      await expect(results.first()).toContainText('America/New_York');
      await expect(results.getByRole('button', { name: 'Edit published passage', exact: true })).toBeVisible();
      for (const row of await results.all()) {
        expect(await row.getByRole('button', { name: /^Details for/u }).evaluate(button => {
          const text = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.includes('Details'));
          if (!text) return false;
          const range = document.createRange(); range.selectNodeContents(text);
          return range.getClientRects().length === 1;
        })).toBe(true);
      }
      await page.getByLabel('Generated content records', { exact: true }).screenshot({ path: `test-results/content-library-${width}-${theme}.png` });
      await results.getByRole('button', { name: 'Continue draft', exact: true }).click();
      const calendarEditor = page.getByRole('region', { name: 'Assembled Calendar passage', exact: true });
      await expect(calendarEditor.getByRole('textbox', { name: 'Complete passage wording', exact: true })).toHaveValue(calendarWriting('DRAFT').body, { timeout: 60_000 });
      expect(parseStudioPassageEdit(new URL(page.url()).hash)).toEqual({ surface: 'calendar', date, timeZone, sourceKey: calendarKey });
      const preview = calendarEditor.getByRole('region', { name: 'Calendar reader workspace', exact: true });
      await expect(preview.getByRole('button', { name: 'Published', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(calendarEditor.getByLabel('Assembled passage preview')).toContainText('Synthetic published daily overview');
      await preview.getByRole('button', { name: 'Draft', exact: true }).click();
      await expect(calendarEditor.getByLabel('Assembled passage preview')).toContainText('Complete draft ending.');
      await page.reload();
      await expect(calendarEditor.getByRole('textbox', { name: 'Complete passage wording', exact: true })).toHaveValue(calendarWriting('DRAFT').body);
      await page.goBack();
      await expect(search).toHaveValue('2026-10-21');
      await expect(page.getByRole('button', { name: 'Calendar', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await search.fill('no matching synthetic article');
      await expect(page.getByText('No rows match these filters.', { exact: true })).toBeVisible();
      await search.fill(unrelatedMoon.content_key);
      await page.getByRole('button', { name: 'Sky', exact: true }).click();
      await expect(results).toHaveCount(1);
      await expect(results).toContainText('Moon in Scorpio');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 1440 && theme === 'light') {
        await search.fill('Libra Season 2026');
        failOpening = true;
        await results.filter({ hasText: fixture.pending.content_key }).getByRole('button', { name: 'Continue draft', exact: true }).click();
        await expect(page.getByRole('alert').filter({ hasText: 'Synthetic article source unavailable.' })).toBeVisible();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        failOpening = false;
        await page.getByRole('button', { name: 'Retry opening passage', exact: true }).click();
        await expect(skyEditor.getByRole('textbox', { name: 'Sky article general copy', exact: true })).toHaveValue(/Synthetic pending revision final sentence/u);
        await skyEditor.getByRole('button', { name: 'Close', exact: true }).click();
        await page.goBack();
        failStatus = true;
        await page.reload();
        const unavailable = results.filter({ hasText: fixture.active.content_key });
        await expect(unavailable).toContainText('Unavailable');
        await expect(unavailable.getByRole('button', { name: 'Open article', exact: true })).toBeVisible();
        await expect(unavailable.getByRole('button', { name: 'Edit published article', exact: true })).toHaveCount(0);
        let failedLibraryLoads = 0;
        const libraryChunk = '**/assets/contentLibraryNavigation-*.js';
        await context.route(libraryChunk, route => { failedLibraryLoads++; return route.abort(); });
        await page.reload();
        await expect(page.getByRole('alert').filter({ hasText: 'This section could not load.' })).toBeVisible();
        expect(failedLibraryLoads).toBeGreaterThan(0);
        await expect(results).toHaveCount(0);
        await context.unroute(libraryChunk);
        await page.reload();
        await expect(results).toHaveCount(3);
      }
      expect(writes).toEqual([]);
      expect(await store.call({ method: 'rows' })).toEqual(before);
      expect(await store.call({ method: 'publications' })).toEqual(ledger);
      expect(errors).toEqual([]);
    } finally { await context.unrouteAll({ behavior: 'ignoreErrors' }); store.close(); }
  });
}
