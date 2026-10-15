import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { csvRecordForRow, newTransitCsvRow, writeStudioCsv } from '../../apps/admin/src/studioCsv';
import { normalizeTransitNatalPreviewInput, renderTransitNatalPreviewState, renderTransitNatalDraftStarter } from '../../api/admin/transit-natal-preview';
import { fixturePublications } from '../helpers/content-reader-route.mjs';

const key = 'authored/transit-aspect/mercury/venus/trine';
const record = { contentKey: key, content_role: 'full_copy', review_status: 'approved',
  reader_only: true, render_policy: 'personal-transit-exact-v1', headline: 'Transit version fixture',
  body_you: 'Through {{untilDate}}, Mercury {{aspectWord}} your Venus. Original You passage.',
  body_they: 'Through {{untilDate}}, Mercury {{aspectWord}} their Venus. Original Friend passage.' };
const fixture = { id: '10000000-0000-4000-8000-000000000051', content_key: key,
  surface: 'you', mode: 'feed', status: 'LIVE', lane: 'serving', review_state: null,
  provider: 'tldrastro-fallback-architecture-v3', event_type: 'transit-to-natal-aspect', block_type: 'fallback_hook',
  target_date: null, headline: record.headline, summary: '', body: record.body_you,
  updated_at: '2026-10-14T12:00:00.000Z', created_at: '2026-10-14T12:00:00.000Z',
  facts: { fallbackArchitectureV3: true, readerServing: true },
  source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', review_status: 'approved' },
  sections: { packageRecord: record } };

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`transit primary and retained alternate persist at ${width}px ${theme}`, async ({ page, context }) => {
    test.setTimeout(120_000);
    const store = await studioApiStore([fixture]);
    try {
      await context.route('**/*', route => {
        const request = route.request();
        if (new URL(request.url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) return route.abort();
        return route.continue();
      });
      await context.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, answer: async (route, url) => {
        if (url.pathname === '/api/admin/transit-natal-preview') {
          const input = normalizeTransitNatalPreviewInput(route.request().postDataJSON());
          const rows = await store.call({ method: 'rows' });
          const publications = fixturePublications(rows);
          await route.fulfill({ json: input.draftStarter
            ? { ok: true, starter: renderTransitNatalDraftStarter(input, rows, publications) }
            : { ok: true, rendered: renderTransitNatalPreviewState(input, rows, publications) } });
          return true;
        }
        if (url.pathname !== '/api/admin/content-live-status') return false;
        if (route.request().postDataJSON().action === 'composition-catalog') {
          await route.fulfill({ json: { ok: true, rows: [] } });
          return true;
        }
        await route.fulfill({ json: { ok: true, statuses: await store.call({ method: 'statuses', body: route.request().postDataJSON() }) } });
        return true;
      } });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/admin/content#exact-content');
      const imported = { ...csvRecordForRow(fixture), keep_current_as_alternate: 'yes', publish: 'yes',
        body_you: 'Through {{untilDate}}, Mercury {{aspectWord}} your Venus. Primary You passage.',
        body_they: 'Through {{untilDate}}, Mercury {{aspectWord}} their Venus. Primary Friend passage.' };
      const newKey = 'authored/transit-aspect/venus/lilith/soft';
      const newRecord = { ...csvRecordForRow(newTransitCsvRow({ content_id: `new:${newKey}`, content_key: newKey,
        saved_version: 'v:new', content_type: 'transit-to-natal-aspect' })), publish: 'yes',
        primary_owner_authored: 'yes', owner_source_uri: 'thread:01a13201-e1a0-75c0-ab9b-f1b8aa29d3ed',
        body: 'Through {{untilDate}}, Venus {{aspectWord}} your Lilith. New primary You passage.',
        body_you: 'Through {{untilDate}}, Venus {{aspectWord}} your Lilith. New primary You passage.',
        body_they: 'Through {{untilDate}}, Venus {{aspectWord}} their Lilith. New primary Friend passage.' };
      await page.getByRole('button', { name: 'Import CSV', exact: true }).click();
      await page.getByLabel('Import Content Studio CSV', { exact: true }).setInputFiles({
        name: 'approved-transit.csv', mimeType: 'text/csv', buffer: Buffer.from(writeStudioCsv([imported, newRecord])) });
      const panel = page.getByRole('region', { name: 'CSV offline editing' });
      await expect(panel).toContainText('0 conflicts or errors');
      await panel.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect(panel).toContainText('2 rows published');
      await panel.getByRole('button', { name: 'Close CSV', exact: true }).click();
      await page.reload();
      const rows = await store.call({ method: 'rows' });
      const saved = rows.find((row: any) => row.content_key === key);
      expect(saved.sections.packageRecord.body_you).toBe(imported.body_you);
      expect(saved.sections.packageRecord.body_they).toBe(imported.body_they);
      expect(saved.sections.packageRecord.body_you_alternate).toBe(record.body_you);
      expect(saved.sections.packageRecord.body_they_alternate).toBe(record.body_they);
      const created = rows.find((row: any) => row.content_key === newKey);
      expect(created.status).toBe('LIVE');
      expect(created.sections.packageRecord.body_you).toBe(newRecord.body_you);
      expect(created.sections.packageRecord.body_they).toBe(newRecord.body_they);
      expect(created.sections.packageRecord.body_you_authorship).toBe('owner_authored');
      expect(created.sections.packageRecord.alternate_copy_sha256).toBeUndefined();
      const contentRow = page.getByRole('row').filter({ hasText: key });
      await contentRow.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(page.getByLabel('Retained alternate · You', { exact: true })).toHaveValue(record.body_you);
      await expect(page.getByLabel('Retained alternate · Friend', { exact: true })).toHaveValue(record.body_they);
      await expect(page.getByLabel('Retained alternate · You', { exact: true })).not.toBeEditable();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByLabel('Retained alternate · You', { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/v21-transit-${width}-${theme}.png`, fullPage: false });
      await page.getByRole('dialog', { name: 'Generated content editor' }).getByRole('button', { name: 'Close', exact: true }).click();
      await page.goto('/admin/content#sky-writeups?view=transits-to-natal&transit=venus&aspect=trine&natal=lilith&window=Until%20October%2020%2C%202026');
      const preview = page.getByRole('region', { name: 'Effective transit to natal reader preview' });
      await expect(preview).toContainText('New primary You passage.');
      await page.getByRole('button', { name: 'Edit live Venus trine your Lilith', exact: true }).click();
      const aspect = page.getByLabel('Write-up aspect', { exact: true });
      await expect(aspect.locator('option[value="trine"]')).toHaveCount(1);
      await expect(aspect.locator('option[value="sextile"]')).toHaveCount(1);
      await expect(aspect.locator('option[value="square"]')).toHaveCount(0);
    } finally { store.close(); }
  });
}
