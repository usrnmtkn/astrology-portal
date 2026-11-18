import { test, expect } from '@playwright/test';
import { createApiStore } from '../helpers/calendar-review-api.mjs';
import { studioApiStore } from '../helpers/studio-api-store';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { syntheticPublicationPage } from '../helpers/synthetic-publication-page';
import { isSkyListPublicationKey } from '../../apps/web/src/content/skyListPublicationScope';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`Composite Review loads complete saved writing ${theme} ${width}`, async ({ page }) => {
    const row = { id: 'composite-review-fixture', content_key: 'composite-mars-trine-pluto', surface: 'composite', mode: 'feed', status: 'DRAFT', lane: 'serving', review_state: null, headline: 'Saved composite fixture', summary: '', body: 'Shared fixture opening.\n\nFinal shared fixture sentence.', sections: { byRelationshipType: { friendship: { body: 'Friendship fixture opening.\n\nFinal friendship fixture sentence.' }, romantic: { body: 'Romantic fixture only.' }, exes: ' \n\t ' } }, source_snapshot: {}, facts: {}, updated_at: '2026-10-09T12:00:00Z', provider: 'manual-admin' };
    const store = await createApiStore([row]);
    let failDetail = theme === 'light' && width === 1440;
    let releaseDetail!: () => void;
    const detailReady = new Promise<void>(resolve => { releaseDetail = resolve; });
    let details = 0;
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
    await page.route('**/api/admin/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/admin/generated-content-inventory' && url.searchParams.has('id')) {
        details++;
        await detailReady;
        if (failDetail) return route.fulfill({ status: 503, json: { ok: false, error: 'Fixture saved document temporarily unavailable.' } });
        const result = await store.invoke('GET', undefined, url.pathname + url.search);
        return route.fulfill({ status: result.status, json: result.payload });
      }
      if (url.pathname === '/api/admin/generated-content-inventory') return route.fulfill({ json: { ok: true, rows: [{ ...row, body: '', summary: '', sections: {}, inventory_only: true }], nextCursor: null } });
      return route.fulfill({ json: { ok: true, rows: [], statuses: [], nextCursor: null } });
    });
    try {
      await page.goto('/admin/content#composite-review');
      const card = page.locator('.admin-template-card').filter({ has: page.getByRole('heading', { name: 'Saved composite fixture', exact: true }) });
      await expect(card.getByRole('status')).toHaveText('Loading saved writing…');
      await expect(card.getByText('No shared meaning is saved yet.')).toHaveCount(0);
      releaseDetail();
      if (failDetail) {
        await expect(card.getByRole('alert')).toContainText('Saved writing could not be loaded.');
        await expect(card.getByText('No shared meaning is saved yet.')).toHaveCount(0);
        failDetail = false;
        await card.getByRole('button', { name: 'Retry saved writing' }).click();
      }
      await expect(card).toContainText('Shared fixture opening.');
      await expect(card).toContainText('Final shared fixture sentence.');
      await expect(card).toContainText('Friendship fixture opening.');
      await expect(card).toContainText('Final friendship fixture sentence.');
      await expect(card.locator('.admin-variable-source-prose').first()).toHaveCSS('white-space', 'pre-wrap');
      await expect(card.locator('.admin-dependency-map-grid > article').first()).toHaveCSS('display', 'grid');
      await expect(card.locator('.admin-dependency-map-grid > article').filter({ has: page.getByText('exes', { exact: true }) })).toContainText('Falls back');
      await card.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Full passage / body', exact: true })).toHaveValue(row.body);
      await page.reload();
      await expect(card).toContainText('Final friendship fixture sentence.');
      expect(details).toBeGreaterThanOrEqual(2);
      await page.screenshot({ path: `test-results/studio-composite-review-${theme}-${width}.png`, fullPage: true });
    } finally { store.close(); }
  });
}

test('a displayed saved revision cannot borrow the package Live badge', async ({ page }) => {
  const { build } = await import('esbuild');
  const { servingPackageRecords } = await import('../../api/_lib/content-live-status');
  const key = 'authored/sky-lunation-macro/new-moon/virgo';
  const source = servingPackageRecords.get(key)!;
  const row = { id: 'saved-revision', content_key: key, status: 'DRAFT', lane: 'reference', updated_at: '2026-10-09T12:00:00Z', sections: { packageRecord: source, packageDraft: { ...source, body: 'Synthetic pending revision.' } } };
  const store = await createApiStore([row]);
  const requested: string[] = [];
  const script = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Badge, {ContentLiveStatusProvider, useContentLiveStatusLoader} from './apps/admin/src/ContentLiveStatus'; import {studioServingStatusRow} from './apps/admin/src/studioServingStatus';
    function View({row,contentKey}) { const load=useContentLiveStatusLoader(async ids => { const result=await fetch('/api/admin/content-live-status', {method:'POST',body:JSON.stringify({ids})}); return (await result.json()).statuses; }, 'fixture'); return <ContentLiveStatusProvider value={load}><Badge row={studioServingStatusRow(row,contentKey)} label="Saved revision"/><Badge row={studioServingStatusRow(undefined,contentKey)} label="Package baseline"/></ContentLiveStatusProvider>; }
    window.mountStatus=props=>createRoot(document.getElementById('root')).render(<View {...props}/>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
  await page.route('**/__studio-status-fixture', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }));
  await page.route('**/api/admin/content-live-status', async route => {
    const body = route.request().postDataJSON(); requested.push(...body.ids);
    const result = await store.invoke('POST', body, '/api/admin/content-live-status');
    await route.fulfill({ status: result.status, json: result.payload });
  });
  try {
    await page.goto('/__studio-status-fixture');
    await page.addScriptTag({ content: script.outputFiles[0].text });
    await page.evaluate(props => (window as any).mountStatus(props), { row: { id: row.id, status: row.status, updated_at: row.updated_at }, contentKey: key });
    await expect(page.getByLabel('Saved revision', { exact: true })).toHaveText('Draft');
    await expect(page.getByLabel('Package baseline', { exact: true })).toHaveText('Live');
    expect(requested).toContain(row.id);
  } finally { store.close(); }
});

test('loading composite documents preserves inventory order and the selected page', async ({ page }) => {
  const rows = Array.from({ length: 12 }, (_, index) => ({ id: `composite-page-${index}`, content_key: `composite.fixture-${index}`, surface: 'composite', mode: 'feed', status: 'DRAFT', lane: 'serving', review_state: null, headline: `Composite page fixture ${index}`, body: `Complete fixture ${index}. Final sentence ${index}.`, sections: {}, source_snapshot: {}, updated_at: '2026-10-09T12:00:00Z' }));
  const store = await createApiStore(rows);
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
  await page.route('**/api/admin/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/admin/generated-content-inventory' && url.searchParams.has('id')) {
      const result = await store.invoke('GET', undefined, url.pathname + url.search);
      return route.fulfill({ status: result.status, json: result.payload });
    }
    if (url.pathname === '/api/admin/generated-content-inventory') return route.fulfill({ json: { ok: true, rows: rows.map(row => ({ ...row, body: '', inventory_only: true })), nextCursor: null } });
    return route.fulfill({ json: { ok: true, rows: [], statuses: [], nextCursor: null } });
  });
  try {
    await page.goto('/admin/content#composite-review');
    const cards = page.locator('.admin-template-card');
    await expect(cards).toHaveCount(10);
    await expect(cards.first()).toContainText('Final sentence 0.');
    await expect(cards.last()).toContainText('Final sentence 9.');
    await expect(cards.locator('h3')).toHaveText(rows.slice(0, 10).map(row => row.headline));
    const pagination = page.getByRole('navigation', { name: 'Composite Review pagination' });
    await pagination.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Final sentence 10.');
    await expect(cards.last()).toContainText('Final sentence 11.');
    await expect(pagination).toContainText('Showing 11–12 of 12');
  } finally { store.close(); }
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const scope of ['personalized', 'shared', 'sample'] as const) {
  test(`Composite publication respects ${scope} scope ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const row = { id: '11111111-1111-4111-8111-111111111111',
      content_key: scope === 'personalized' ? 'composite-mars-trine-pluto' : 'composite.aspect.mars.trine.pluto',
      surface: 'composite', mode: 'feed', status: 'DRAFT', lane: 'serving', review_state: null,
      headline: 'Synthetic Composite scope', summary: '', body: 'Synthetic complete opening.\n\nSynthetic complete final sentence.',
      sections: { byRelationshipType: { friendship: { body: 'Complete synthetic friendship passage.' } } },
      facts: scope === 'sample' ? { sampleOnly: true } : {}, source_snapshot: {},
      updated_at: '2026-10-15T12:00:00.000Z', provider: 'manual-admin' };
    const store = await studioApiStore([row]);
    let drainRoutes: (() => Promise<void>) | undefined;
    try {
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await page.route('**/rest/v1/content_publications?**', async route => {
        const rows = await store.call({ method: 'publications' });
        await route.fulfill({ json: syntheticPublicationPage(rows, new URL(route.request().url()).searchParams) });
      });
      drainRoutes = await routeStudioInventoryApi(page, {
        call: store.call,
        actualDocumentRoute: true,
        answer: async (route, url) => {
          if (url.pathname === '/api/content-publications') {
            const rows = canonicalPublicationLedger(await store.call({ method: 'publications' }));
            const scoped = url.searchParams.get('scope') === 'sky-list';
            const publications = scoped ? rows.filter(row => isSkyListPublicationKey(row.content_key)) : rows;
            await route.fulfill({ headers: { etag: await publicationLedgerTag(publications) },
              json: { schema: scoped ? 'tldr-sky-list-publications/v1' : 'tldr-publications/v1', publications } });
            return true;
          }
          if (url.pathname !== '/api/admin/content-live-status' && url.pathname !== '/api/admin/content-publication') return false;
          const request = route.request();
          const result = await store.call({ method: request.method(), body: request.postData() ? request.postDataJSON() : undefined, url: url.pathname + url.search });
          await route.fulfill({ status: result.status, json: result.payload });
          return true;
        }
      });
      await page.goto('/admin/content#composite-review');
      const card = page.locator('.admin-template-card').filter({ has: page.getByRole('heading', { name: row.headline, exact: true }) });
      await card.getByRole('button', { name: 'Edit', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor', exact: true });
      const body = editor.getByRole('textbox', { name: 'Full passage / body', exact: true });
      let complete = row.body + '\n\nA complete manually saved addition.';
      await body.fill(complete);
      await editor.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0].body).toBe(complete);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await card.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(body).toHaveValue(complete);
      await editor.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0].status).toBe('REVIEWED');
      const publish = editor.getByRole('button', { name: 'Publish to app', exact: true });
      if (scope === 'shared') {
        await expect(publish).toBeEnabled();
        await publish.click();
        await expect.poll(async () => (await store.call({ method: 'rows' }))[0].status).toBe('LIVE');
        const reader = await store.call({ method: 'POST', url: '/api/content-reader', body: { ids: [row.id] } });
        expect(reader.status).toBe(200);
        expect(reader.payload.rows[0].body).toBe(complete);
        expect(reader.payload.rows[0].sections.byRelationshipType).toEqual(row.sections.byRelationshipType);
        const previous = complete;
        complete += '\n\nA private revision with its full ending.';
        await body.fill(complete);
        await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
        const readPublicBody = async () => {
          const result = await store.call({method:'POST', url:'/api/content-reader', body:{ids:[row.id]}});
          expect(result.status).toBe(200);
          return result.payload.rows[0]?.body;
        };
        await expect.poll(async () => (await store.call({ method:'rows' })).some((item:any) =>
          item.id !== row.id && item.status === 'DRAFT' && item.body === complete)).toBe(true);
        await expect(editor.getByText('All changes saved', { exact: true })).toBeVisible();
        await expect(editor.getByRole('alert')).toHaveCount(0);
        await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
        expect(await readPublicBody()).toBe(previous);
        await page.reload();
        await expect(card).toHaveCount(1);
        await card.getByRole('button', { name: 'Edit', exact: true }).click();
        await expect(body).toHaveValue(complete);
        await editor.getByRole('button', { name: 'Mark reviewed', exact: true }).click();
        await expect.poll(async () => (await store.call({method:'rows'})).some((item:any) =>
          item.id !== row.id && item.status === 'REVIEWED' && item.body === complete)).toBe(true);
        expect(await readPublicBody()).toBe(previous);
        await publish.click();
        await expect.poll(readPublicBody).toBe(complete);
      } else {
        await expect(publish).toHaveCount(0);
        await expect(editor.getByText('This personalized reading cannot be published for everyone.', { exact: false })).toBeVisible();
        await expect(editor.getByLabel('Status', { exact: true }).locator('option[value="LIVE"]')).toHaveAttribute('disabled', '');
        const saved = (await store.call({ method: 'rows' }))[0];
        const refused = await store.call({ method: 'PATCH', body: { id: row.id, expectedUpdatedAt: saved.updated_at, status: 'LIVE' } });
        expect(refused.status).toBe(400);
        expect(refused.payload.error).toMatch(/Personalized content test rows cannot be published globally/);
        expect((await store.call({ method: 'rows' }))[0]).toEqual(saved);
      }
      await editor.locator('summary').filter({ hasText: 'More actions' }).click();
      await editor.getByRole('button', { name: 'Archive source', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0].status).toBe('ARCHIVED');
      const archived = (await store.call({ method: 'rows' }))[0];
      expect(archived.body).toBe(complete);
      expect(archived.sections.byRelationshipType).toEqual(row.sections.byRelationshipType);
      const reader = await store.call({ method: 'POST', url: '/api/content-reader', body: { ids: [row.id] } });
      expect(reader.status).toBe(200);
      expect(reader.payload.rows).toEqual([]);
      if (scope !== 'shared') await expect(editor.getByRole('button', { name: 'Publish again', exact: true })).toHaveCount(0);
    } finally {
      await page.close({ runBeforeUnload: false });
      await drainRoutes?.();
      store.close();
    }
  });
}
