import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { csvRecordForRow, readStudioCsv, writeStudioCsv } from '../../apps/admin/src/studioCsv';
import { fixtures as calendarFixtures } from '../helpers/calendar-review-api.mjs';
import { skyPlacementSourceFixture } from '../helpers/sky-placement-source-fixture.mts';

async function closeCsvFixture(page: Page, store: Awaited<ReturnType<typeof studioApiStore>>) {
  // Publication refreshes can still own an IPC request after the assertions.
  // Detach routing before killing its API child so teardown cannot reject a
  // background handler into the following test.
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  store.close();
}

async function routeCsvInventoryApi(page: Parameters<typeof routeStudioInventoryApi>[0], options: Parameters<typeof routeStudioInventoryApi>[1]) {
  await routeStudioInventoryApi(page, { ...options, answer: async (route, url) => {
    if (options.answer && await options.answer(route, url)) return true;
    if (url.pathname !== '/api/admin/content-live-status') return false;
    const result = await options.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
    await route.fulfill({ status: result.status, json: result.payload });
    return true;
  } });
}

const fixtures = Array.from({ length: 31 }, (_, index) => ({
  id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, content_key: `content/manual/csv-${index + 1}`,
  headline: `CSV example ${String(index + 1).padStart(2, '0')}`, summary: 'Synthetic summary.',
  body: `Synthetic opening ${index + 1}, with "quotes".\n\nSynthetic final paragraph ${index + 1} — café.\n`,
  surface: 'sky', mode: 'in_depth', status: 'DRAFT', event_type: 'essay', block_type: 'essay', target_date: null,
  lane: 'reference', review_state: 'needs-review', sections: {}, facts: {}, source_snapshot: {}, provider: 'manual-admin',
  updated_at: '2026-10-01T12:00:00.123456Z', created_at: '2026-10-01T12:00:00Z',
}));
test.use({ actionTimeout: 15_000 });

const standaloneCsvCases = [
  ...[390, 1440].flatMap(width => ['manual', 'guide'].map(kind => ({ width, kind, conflict: false }))),
  { width: 390, kind: 'manual', conflict: true }
];
for (const { width, kind, conflict } of standaloneCsvCases) test(`CSV standalone ${kind} revision preserves its published edition ${width}${conflict ? ' conflict' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  const source = { ...fixtures[0], content_key: `article/${kind}/csv-standalone-fixture`, mode: 'article',
    status: 'LIVE', lane: 'serving', review_state: null };
  const revised = 'Complete offline article opening.\n\nComplete offline article final paragraph — café.';
  const concurrent = 'Complete newer published opening.\n\nComplete newer published final paragraph.';
  const store = await studioApiStore([source], { uuidIds: true });
  let readerDuringPublication: string | undefined;
  try {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
    await routeCsvInventoryApi(page, { call: async request => {
      if (request.method === 'PATCH' && (request.body as any)?.ownerAction?.startsWith('publish-')) {
        const rows = await store.call({ method: 'rows' });
        expect(rows.find((row: any) => row.id === source.id)).toEqual(source);
        const before = await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [source.content_key] } });
        readerDuringPublication = before.payload.rows[0]?.body;
        if (conflict) {
          const newer = await store.call({ method: 'PATCH', body: { id: source.id, expectedUpdatedAt: source.updated_at,
            ownerAction: 'save-and-publish-owner-content', body: concurrent } });
          expect(newer.status).toBe(200);
        }
      }
      return store.call(request);
    }, actualDocumentRoute: true, answer: async (route, url) => {
      if (url.pathname !== '/api/content-reader') return false;
      const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
      await route.fulfill({ status: result.status, json: result.payload }); return true;
    } });
    await page.goto('/admin/content#articles-guides');
    await page.getByRole('button', { name: 'Export sources for bulk editing', exact: true }).click();
    const panel = page.getByRole('region', { name: 'CSV offline editing' });
    await page.getByLabel('Import Content Studio CSV', { exact: true }).setInputFiles({ name: 'article-revision.csv',
      mimeType: 'text/csv', buffer: Buffer.from(writeStudioCsv([{ ...csvRecordForRow(source), body: revised, publish: 'yes' }])) });
    await expect(panel).toContainText('1 changed');
    await panel.getByRole('button', { name: 'Save & publish', exact: true }).click();
    await expect(panel).toContainText(conflict ? '1 edit saved; 0 rows published.' : '1 edit saved; 1 row published.');
    if (conflict) await expect(panel).toContainText('This edit was saved as a draft; publication was not confirmed.');
    expect(readerDuringPublication).toBe(source.body);
    const rows = await store.call({ method: 'rows' });
    expect(rows.find((row: any) => row.id === source.id)?.body).toBe(conflict ? concurrent : revised);
    const privateRevision = rows.find((row: any) => row.event_type === 'standalone-article-revision');
    expect(privateRevision?.status).toBe(conflict ? 'DRAFT' : 'ARCHIVED');
    expect(privateRevision?.body).toBe(revised);
    await page.goto(`/#articles/${encodeURIComponent(source.content_key)}`);
    const reader = page.getByRole('region', { name: 'Articles & Guides', exact: true }).locator('.learn-article-body');
    await expect.poll(() => reader.innerText()).toBe(conflict ? concurrent : revised);
    await page.reload(); await expect.poll(() => reader.innerText()).toBe(conflict ? concurrent : revised);
  } finally { await closeCsvFixture(page, store); }
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`CSV picker excludes dedicated editions and exports supported sources at ${width} ${theme}`, async ({ page, context }) => {
    test.setTimeout(120_000);
    const fixture = await skyPlacementSourceFixture();
    const editions = [{ ...fixture.active, headline: 'Unavailable CSV edition' }, { ...fixture.pending, headline: 'Unavailable CSV revision' }];
    const store = await studioApiStore([fixtures[0], ...editions]);
    const writes: unknown[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
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
      await routeCsvInventoryApi(page, { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write) });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/admin/content#exact-content');
      await page.getByRole('button', { name: 'Export sources for bulk editing', exact: true }).click();
      const panel = page.getByRole('region', { name: 'CSV offline editing' });
      await expect(panel).toContainText('1 available for CSV editing · 2 excluded.');
      const types = panel.getByLabel('CSV content type', { exact: true });
      await expect(types.locator('option')).toHaveText(['Choose a content type', 'essay (1)']);
      await panel.getByText('Choose rows for this export', { exact: true }).click();
      await expect(panel.getByRole('checkbox')).toHaveCount(1);
      await expect(panel.getByRole('checkbox', { name: `Export ${fixtures[0].headline}`, exact: true })).toBeVisible();
      for (const row of editions) await expect(panel.getByRole('checkbox', { name: `Export ${row.headline}`, exact: true })).toHaveCount(0);
      await panel.getByText('Choose rows for this export', { exact: true }).click();
      const download = page.waitForEvent('download');
      await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
      const records = readStudioCsv(await readFile((await (await download).path())!, 'utf8'));
      expect(records.map(record => record.content_id)).toEqual([fixtures[0].id]);
      expect(records[0].body).toBe(fixtures[0].body);
      await expect(panel).toContainText('Exported 1 rows.');
      await page.getByRole('searchbox', { name: 'Search content', exact: true }).fill('Unavailable');
      await expect(panel).toContainText('0 available for CSV editing · 2 excluded.');
      await expect(types.locator('option')).toHaveText(['Choose a content type']);
      await expect(panel.getByRole('button', { name: 'Download CSV', exact: true })).toBeDisabled();
      const typography = (element: Element) => {
        const style = getComputedStyle(element);
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
      };
      expect(await panel.getByText('0 available for CSV editing · 2 excluded. Open structured articles in their dedicated editor.', { exact: true }).evaluate(typography))
        .toEqual(await panel.locator('.admin-field-hint').first().evaluate(typography));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await panel.screenshot({ path: `test-results/studio-csv-eligibility-${width}-${theme}.png` });
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
    } finally { await closeCsvFixture(page, store); }
  });

  test(`CSV export, offline edit, preview, save and reload at ${width} ${theme}`, async ({ page, context }) => {
    test.setTimeout(120_000);
    const store = await studioApiStore(fixtures);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
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
      await routeCsvInventoryApi(page, { call: store.call, actualDocumentRoute: true, answer: async (route, url) => {
        if (url.pathname !== '/api/admin/content-live-status') return false;
        await route.fulfill({ json: { ok: true, statuses: await store.call({ method: 'statuses', body: route.request().postDataJSON() }) } }); return true;
      } });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/admin/content#exact-content');
      const exportButton = page.getByRole('button', { name: 'Export sources for bulk editing', exact: true });
      await expect(exportButton).toBeEnabled();
      await exportButton.click();
      const panel = page.getByRole('region', { name: 'CSV offline editing' });
      await expect(panel).toContainText('31 rows matching these filters');
      const download = page.waitForEvent('download');
      await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
      const downloaded = await download;
      const text = await readFile((await downloaded.path())!, 'utf8');
      const records = readStudioCsv(text);
      expect(records).toHaveLength(31);
      expect(records.every(record => record.publish === 'no')).toBe(true);
      expect(records.every(record => record.publication_status === 'DRAFT' && record.source_role === 'Editable source')).toBe(true);
      expect(records.every(record => record.exported_at && record.reference_date)).toBe(true);
      for (const row of fixtures) expect(records.find(record => record.content_id === row.id)?.body).toBe(row.body);
      await panel.getByText('Choose rows for this export', { exact: true }).click();
      const selection = panel.getByRole('checkbox', { name: `Export ${fixtures[0].headline}`, exact: true });
      await selection.check();
      await expect(panel).toContainText('1 selected row');
      const selectedDownload = page.waitForEvent('download');
      await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
      expect(readStudioCsv(await readFile((await (await selectedDownload).path())!, 'utf8')).map(record => record.content_id)).toEqual([fixtures[0].id]);
      await selection.uncheck();
      await panel.getByText('Choose rows for this export', { exact: true }).click();
      const file = page.getByLabel('Import Content Studio CSV', { exact: true });
      await file.setInputFiles({ name: 'unchanged.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
      await expect(panel).toContainText('0 changed · 31 unchanged · 0 conflicts');
      await expect(panel.getByRole('button', { name: 'Save 0 drafts', exact: true })).toBeDisabled();
      const edited = records.find(record => record.content_id === fixtures[0].id)!;
      edited.body = 'Synthetic offline opening, "quoted".\n\nSynthetic offline final paragraph — café.\n';
      edited.summary = '';
      edited.publish = 'yes';
      const draftEdit = { ...records.find(record => record.content_id === fixtures[2].id)!, body: 'Synthetic draft-only revision.' };
      const publishUnchanged = { ...records.find(record => record.content_id === fixtures[3].id)!, publish: 'yes' };
      await file.setInputFiles({ name: 'offline.csv', mimeType: 'text/csv', buffer: Buffer.from(writeStudioCsv([edited, records.find(record => record.content_id === fixtures[1].id)!, draftEdit, publishUnchanged])) });
      await expect(panel).toContainText('2 changed · 2 unchanged · 0 conflicts');
      await expect(panel).toContainText('2 to publish');
      await expect(panel.locator('[data-csv-preview] summary').first()).toContainText('Will publish');
      await expect(panel).toContainText('Save draft');
      expect((await store.call({ method: 'rows' }))[0].body).toBe(fixtures[0].body);
      await panel.locator('[data-csv-preview] summary').first().click();
      await expect(panel).toContainText('clears this field');
      await expect(panel).toContainText('Synthetic offline final paragraph');
      const diff = panel.locator('[data-csv-preview]').first().locator('.studio-csv-diff').last();
      expect(await diff.evaluate(element => getComputedStyle(element).display)).toBe('grid');
      expect(await diff.locator('p').last().evaluate(element => getComputedStyle(element).whiteSpace)).toBe('pre-wrap');
      const positions = await diff.locator(':scope > div').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().x));
      expect(positions[0] === positions[1]).toBe(width === 390);
      const typography = (element: Element) => {
        const style = getComputedStyle(element);
        return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
      };
      expect(await diff.locator('p').last().evaluate(typography)).toEqual(await panel.locator(':scope > p').first().evaluate(typography));
      await expect(file).toBeHidden();
      await panel.screenshot({ path: `test-results/studio-csv-${width}-${theme}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await panel.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect(panel).toContainText('2 edits saved; 2 rows published.');
      const saved = (await store.call({ method: 'rows' })).find((row: any) => row.id === fixtures[0].id);
      expect(saved.body).toBe(edited.body); expect(saved.summary).toBe(''); expect(saved.status).toBe('LIVE');
      expect((await store.call({ method: 'rows' })).find((row: any) => row.id === fixtures[2].id).status).toBe('DRAFT');
      const reader = await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: fixtures.slice(0, 4).map(row => row.content_key) } });
      expect(reader.payload.rows.map((row: any) => row.id).sort()).toEqual([fixtures[0].id, fixtures[3].id]);
      expect(reader.payload.rows.find((row: any) => row.id === fixtures[0].id).body).toBe(edited.body);
      // Removed rows were not deleted or updated.
      expect((await store.call({ method: 'rows' })).filter((row: any) => row.updated_at === fixtures[0].updated_at)).toHaveLength(28);
      await file.setInputFiles({ name: 'stale.csv', mimeType: 'text/csv', buffer: Buffer.from(writeStudioCsv([edited])) });
      await expect(panel).toContainText('1 conflicts or errors');
      await panel.locator('[data-csv-preview] summary').first().click();
      await expect(panel).toContainText('Changed in Studio since export');
      await expect(panel.getByRole('button', { name: /^Save \d+ drafts?$/ })).toBeDisabled();
      await page.reload();
      await expect(exportButton).toBeEnabled();
      await page.getByText(fixtures[0].headline, { exact: true }).first().click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      await expect(editor.getByLabel('Full passage / body', { exact: true })).toHaveValue(edited.body);
      expect(errors).toEqual([]);
    } finally { await closeCsvFixture(page, store); }
  });
}

test('CSV stops on a mid-batch conflict and reports confirmed saves', async ({ page, context }) => {
  test.setTimeout(90_000);
  const store = await studioApiStore(fixtures.slice(0, 3).map((row, index) => ({ ...row, status: index === 0 ? 'LIVE' : row.status })));
  const writes: unknown[] = [];
  try {
    await context.route('**/*', route => {
      const request = route.request();
      if (new URL(request.url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) return route.abort();
      return route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
    await routeCsvInventoryApi(page, { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write) });
    await page.goto('/admin/content#exact-content');
    await page.getByRole('button', { name: 'Export sources for bulk editing', exact: true }).click();
    const panel = page.getByRole('region', { name: 'CSV offline editing' });
    const download = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
    const records = readStudioCsv(await readFile((await (await download).path())!, 'utf8')).sort((a, b) => a.content_id.localeCompare(b.content_id));
    records.forEach((record, index) => { record.body = `Synthetic offline revision ${index + 1}.`; });
    await page.getByLabel('Import Content Studio CSV', { exact: true }).setInputFiles({ name: 'batch.csv', mimeType: 'text/csv', buffer: Buffer.from(writeStudioCsv(records)) });
    await expect(panel).toContainText('3 changed · 0 unchanged · 0 conflicts');
    await expect(panel).toContainText('saving moves the live row to draft until you publish it again');
    const concurrent = await store.call({ method: 'PATCH', body: { id: fixtures[1].id, expectedUpdatedAt: fixtures[1].updated_at, body: 'Synthetic newer Studio edit.' } });
    expect(concurrent.status).toBe(200);
    await panel.getByRole('button', { name: 'Save 3 drafts', exact: true }).click();
    await expect(panel).toContainText('1 draft confirmed saved. Stopped at');
    const saved = await store.call({ method: 'rows' });
    expect(saved.find((row: any) => row.id === fixtures[0].id).body).toBe(records[0].body);
    expect(saved.find((row: any) => row.id === fixtures[0].id).status).toBe('DRAFT');
    expect(saved.find((row: any) => row.id === fixtures[1].id).body).toBe('Synthetic newer Studio edit.');
    expect(saved.find((row: any) => row.id === fixtures[2].id).body).toBe(fixtures[2].body);
    expect(writes).toHaveLength(2);
    await expect(panel.getByRole('button', { name: /^Save \d+ drafts?$/ })).toBeDisabled();
  } finally { await closeCsvFixture(page, store); }
});

test('CSV empty state and failed reads recover without partial exports or writes', async ({ page, context }) => {
  const store = await studioApiStore(fixtures.slice(0, 2));
  let showRows = false, failDocuments = false;
  let downloads = 0;
  const writes: unknown[] = [];
  page.on('download', () => downloads++);
  try {
    await context.route('**/*', route => {
      const request = route.request();
      if (new URL(request.url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) return route.abort();
      return route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
    await routeCsvInventoryApi(page, {
      listRows: rows => showRows ? rows : [], actualDocumentRoute: true, onWrite: write => writes.push(write),
      call: request => failDocuments && request.method === 'GET' && request.url?.includes('?id=')
        ? Promise.resolve({ status: 503, payload: { ok: false, error: 'Synthetic document load failure.' } })
        : store.call(request)
    });
    await page.goto('/admin/content#exact-content');
    await page.getByRole('button', { name: 'Export sources for bulk editing', exact: true }).click();
    const panel = page.getByRole('region', { name: 'CSV offline editing' });
    await expect(panel).toContainText('0 rows matching these filters');
    await expect(panel.getByRole('button', { name: 'Download CSV', exact: true })).toBeDisabled();
    showRows = true;
    await page.reload();
    await page.getByRole('button', { name: 'Export sources for bulk editing', exact: true }).click();
    failDocuments = true;
    await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
    await expect(panel).toContainText('Could not load the complete saved row.');
    expect(downloads).toBe(0);
    await page.getByLabel('Import Content Studio CSV', { exact: true }).setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from('title,body\nInvalid,synthetic') });
    await expect(panel).toContainText('Use a CSV exported by Content Studio');
    expect(writes).toHaveLength(0);
    failDocuments = false;
    const download = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
    expect(readStudioCsv(await readFile((await (await download).path())!, 'utf8'))).toHaveLength(2);
  } finally { await closeCsvFixture(page, store); }
});

for (const failure of ['validation', 'race', 'lost-response']) {
  test(`CSV publishing stops after ${failure} and distinguishes saved drafts from confirmed publications`, async ({ page, context }) => {
    const rows = fixtures.slice(0, 3).map((row, index) => ({ ...row,
      content_key: failure === 'validation' && index === 1 ? 'sky/article-template/csv-blocked' : row.content_key
    }));
    const store = await studioApiStore(rows);
    const writes: unknown[] = [];
    try {
      await context.route('**/*', route => {
        const request = route.request();
        if (new URL(request.url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) return route.abort();
        return route.continue();
      });
      await context.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
      await routeCsvInventoryApi(page, { actualDocumentRoute: true, onWrite: write => writes.push(write), call: async request => {
        const result = await store.call(request);
        const body = request.body as any;
        if (request.method === 'PATCH' && body?.id === rows[1].id) {
          if (failure === 'race' && body.csvRecord) {
            const draft = result.payload.rows[0];
            const concurrent = await store.call({ method: 'PATCH', body: { id: draft.id, expectedUpdatedAt: draft.updated_at, body: 'Synthetic concurrent revision.' } });
            expect(concurrent.status).toBe(200);
          }
          if (failure === 'lost-response' && body.ownerAction === 'publish-owner-content') {
            expect(result.status).toBe(200);
            return { status: 504, payload: { ok: false, error: 'Synthetic response loss after commit.' } };
          }
        }
        return result;
      } });
      await page.goto('/admin/content#exact-content');
      await page.getByRole('button', { name: 'Export sources for bulk editing', exact: true }).click();
      const panel = page.getByRole('region', { name: 'CSV offline editing' });
      const download = page.waitForEvent('download');
      await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
      const records = readStudioCsv(await readFile((await (await download).path())!, 'utf8')).sort((a, b) => a.content_id.localeCompare(b.content_id));
      records.forEach((record, index) => { record.publish = 'yes'; record.body = `Synthetic imported revision ${index + 1}.`; });
      await page.getByLabel('Import Content Studio CSV', { exact: true }).setInputFiles({ name: 'publish.csv', mimeType: 'text/csv', buffer: Buffer.from(writeStudioCsv(records)) });
      await expect(panel).toContainText('3 to publish');
      expect(writes).toHaveLength(0);
      await panel.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect(panel).toContainText(`2 edits saved; 1 row published. Stopped at ${rows[1].content_key}`);
      await expect(panel).toContainText('publication was not confirmed');
      const saved = await store.call({ method: 'rows' });
      expect(saved.find((row: any) => row.id === rows[0].id).status).toBe('LIVE');
      expect(saved.find((row: any) => row.id === rows[1].id).status).toBe(failure === 'lost-response' ? 'LIVE' : 'DRAFT');
      expect(saved.find((row: any) => row.id === rows[1].id).body).toBe(failure === 'race' ? 'Synthetic concurrent revision.' : records[1].body);
      expect(saved.find((row: any) => row.id === rows[2].id).body).toBe(rows[2].body);
      expect(writes).toHaveLength(4);
      await expect(panel.getByRole('button', { name: /^(Save & publish|Save \d+ drafts?)$/ })).toBeDisabled();
    } finally { await closeCsvFixture(page, store); }
  });
}

test('CSV publishes a separately saved package revision and reloads the exact live passage', async ({ page, context }) => {
  const source = { ...structuredClone(calendarFixtures[0]), id: fixtures[0].id };
  const store = await studioApiStore([source], { uuidIds: true });
  try {
    const initial = await store.call({ method: 'PATCH', body: { id: source.id, expectedUpdatedAt: source.updated_at, ownerAction: 'approve-package-revision' } });
    expect(initial.status).toBe(200);
    const live = initial.payload.rows[0];
    await context.route('**/*', route => {
      const request = route.request();
      if (new URL(request.url()).pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) return route.abort();
      return route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
    const writes: any[] = [];
    await routeCsvInventoryApi(page, { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write) });
    await page.goto('/admin/content#exact-content');
    await page.getByRole('button', { name: 'Export sources for bulk editing', exact: true }).click();
    const panel = page.getByRole('region', { name: 'CSV offline editing' });
    const download = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
    const records = readStudioCsv(await readFile((await (await download).path())!, 'utf8'));
    records[0].publish = 'yes'; records[0].Body += '\n\nSynthetic offline publication ending.';
    await page.getByLabel('Import Content Studio CSV', { exact: true }).setInputFiles({ name: 'package.csv', mimeType: 'text/csv', buffer: Buffer.from(writeStudioCsv(records)) });
    await expect(panel).toContainText('1 to publish');
    await panel.getByRole('button', { name: 'Save & publish', exact: true }).click();
    await expect(panel).toContainText('1 edit saved; 1 row published.');
    expect(writes).toHaveLength(2);
    const proposal = writes[0].result.payload.rows[0];
    expect(proposal.id).not.toBe(live.id);
    expect(writes[1].body).toEqual({ id: proposal.id, expectedUpdatedAt: proposal.updated_at, ownerAction: 'approve-package-revision' });
    const reader = await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [live.content_key] } });
    expect(reader.payload.rows[0].body).toBe(records[0].Body);
    await page.reload();
    await page.getByRole('button', { name: 'Export sources for bulk editing', exact: true }).click();
    const exported = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
    const reopened = readStudioCsv(await readFile((await (await exported).path())!, 'utf8'));
    expect(reopened[0].Body).toBe(records[0].Body); expect(reopened[0].publish).toBe('no');
  } finally { await closeCsvFixture(page, store); }
});


test('CSV author publication accepts exact Sky wording without a model verdict',async({page,context})=>{
  const {baseline}=await import('../helpers/sky-review-workflow-api.mjs');
  const row={...baseline,id:'a0000000-0000-4000-8000-000000000099',summary:'',sections:{},body:'You always remember the message you left unanswered.\n\nThe complete author ending remains.'};
  const store=await studioApiStore([row]);
  try {
    await context.route('**/*',route=>{
      const request=route.request();
      return new URL(request.url()).pathname.startsWith('/api/')||!['GET','HEAD'].includes(request.method())?route.abort():route.continue();
    });
    await context.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    await routeCsvInventoryApi(page,{actualDocumentRoute:true,call:store.call});
    await page.goto('/admin/content#exact-content');
    await page.getByRole('button',{name:'Export sources for bulk editing',exact:true}).click();
    const panel=page.getByRole('region',{name:'CSV offline editing'});
    const download=page.waitForEvent('download');
    await panel.getByRole('button',{name:'Download CSV',exact:true}).click();
    const records=readStudioCsv(await readFile((await(await download).path())!,'utf8'));
    records[0].publish='yes';
    await page.getByLabel('Import Content Studio CSV',{exact:true}).setInputFiles({name:'owner.csv',mimeType:'text/csv',buffer:Buffer.from(writeStudioCsv(records))});
    await panel.getByRole('button',{name:'Save & publish',exact:true}).click();
    await expect(panel).toContainText('0 edits saved; 1 row published.');
    const saved=(await store.call({method:'rows'}))[0];
    expect(saved.status).toBe('LIVE');expect(saved.body).toBe(row.body);
    expect(saved.source_snapshot.studioOwnerApproval.action).toBe('publish-owner-content');
    const reader=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[row.content_key]}});
    expect(reader.payload.rows[0].body).toBe(row.body);
  } finally { await closeCsvFixture(page, store); }
});

test('Editable export stops when publication status is unavailable and recovers without a partial file', async ({ page, context }) => {
  const store = await studioApiStore(fixtures.slice(0, 2));
  let failStatus = false;
  const downloads: unknown[] = [], writes: unknown[] = [];
  page.on('download', download => downloads.push(download));
  try {
    await context.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
    await routeCsvInventoryApi(page, { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write), answer: async (route, url) => {
      if (url.pathname !== '/api/admin/content-live-status' || !failStatus) return false;
      await route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic publication status outage.' } });
      return true;
    } });
    await page.goto('/admin/content#exact-content');
    await page.getByRole('button', { name: 'Export sources for bulk editing', exact: true }).click();
    const panel = page.getByRole('region', { name: 'CSV offline editing' });
    failStatus = true;
    await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('/api/admin/content-live-status failed with HTTP 503.');
    expect(downloads).toHaveLength(0);
    failStatus = false;
    const download = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download CSV', exact: true }).click();
    const exported = readStudioCsv(await readFile((await (await download).path())!, 'utf8'));
    expect(exported).toHaveLength(2);
    expect(exported.every(row => row.publication_status === 'DRAFT')).toBe(true);
    expect(writes).toEqual([]);
  } finally { await closeCsvFixture(page, store); }
});


test('CSV fixture cleanup handles an in-flight background reader request', async ({ page }) => {
  const store = await studioApiStore([]);
  let readStarted!: () => void;
  const reading = new Promise<void>(resolve => { readStarted = resolve; });
  await page.route('**/__csv-cleanup-fixture', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><title>Synthetic CSV cleanup</title>'
  }));
  await page.route('**/__csv-background-read', async route => {
    const result = store.call({ method: 'POST', url: '/api/content-reader', body: { keys: ['content/manual/synthetic-cleanup'] } });
    readStarted();
    await route.fulfill({ json: await result });
  });
  try {
    await page.goto('/__csv-cleanup-fixture');
    // The browser may abort this read on close; its Node handler must not leave
    // an unhandled IPC rejection after the owning test has ended.
    void page.evaluate(() => fetch('/__csv-background-read').catch(() => null)).catch(() => {});
    await reading;
  } finally { await closeCsvFixture(page, store); }
});
