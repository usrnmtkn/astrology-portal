import { test, expect, type Locator } from '@playwright/test';
import { build } from 'esbuild';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { bundledPublications } from '../helpers/bundled-publications';
import { syntheticLibrarySkyArticle } from '../helpers/article-library-fixture';
import { publicationStorageEmitter } from '../helpers/publication-storage-emitter';
import { readerResponse } from '../helpers/reader-response';
import { routeStudioPublicReader } from '../helpers/studio-public-reader-route';

const body = 'Synthetic complete opening.\n\n## Saved section\n\nSynthetic complete final paragraph.';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Article actions reopen template results and start an unfiltered draft ${width} ${theme}`, async ({ page }) => {
    const templateKey = 'sky/article-template/sun/libra';
    const store = await studioApiStore([
      { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: templateKey,
        surface: 'sky', mode: 'article', event_type: 'sky-article-template', block_type: 'sky_article', status: 'REVIEWED', lane: 'reference',
        review_state: null, headline: 'Synthetic Sun in Libra template', body: '{{articleTitle}}\n\n{{articleBody}}', summary: '', sections: {},
        updated_at: '2026-10-09T00:00:00Z', source_snapshot: { contentType: 'sky-article-template', review_status: 'approved' } },
      { id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', content_key: 'article/manual/synthetic-actions',
        surface: 'sky', mode: 'article', status: 'DRAFT', lane: 'serving', review_state: 'EDITORIAL_REVIEW_REQUIRED',
        headline: 'Synthetic standalone article', body, summary: '', sections: {}, updated_at: '2026-10-09T00:00:00Z',
        source_snapshot: { contentType: 'authored-article' } }
    ], { uuidIds: true });
    const writes: unknown[] = [], providerRequests: string[] = [], errors: string[] = [];
    try {
      const before = await store.call({ method: 'rows' });
      await page.setViewportSize({ width, height: 1000 });
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await bundledPublications(page);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write),
        answer: async (route, url) => {
          if (route.request().method() !== 'POST' || !url.pathname.startsWith('/api/admin/sky-article-')) return false;
          providerRequests.push(url.pathname);
          await route.fulfill({ status: 500, json: { error: 'This navigation test must not generate writing.' } });
          return true;
        } });
      await page.goto('/admin/content#articles-guides');
      const results = page.getByRole('complementary', { name: 'Article rows', exact: true });
      const browse = page.getByRole('link', { name: 'Browse Sky article templates', exact: true });
      await expect(results.getByRole('row').filter({ hasText: 'article/manual/synthetic-actions' })).toBeVisible();
      // Clear filters leaves the same hash. Repeating the browse action must still apply it.
      for (let repeat = 0; repeat < 2; repeat++) {
        await browse.click();
        await expect(page.getByLabel('Search articles', { exact: true })).toHaveValue('sky/article-template/');
        await expect(results).toBeFocused();
        await expect(results.getByRole('row').filter({ hasText: templateKey })).toBeVisible();
        await expect(results.getByRole('row').filter({ hasText: 'article/manual/synthetic-actions' })).toHaveCount(0);
        if (repeat === 0) {
          await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
          await expect(page.getByLabel('Search articles', { exact: true })).toHaveValue('');
          await expect(page).toHaveURL(/#articles-guides\?q=sky%2Farticle-template%2F$/u);
        }
      }
      await expect(page.getByRole('button', { name: 'New article', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'New guide', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(page.getByRole('menuitem')).toHaveCount(2);
      await page.getByRole('menuitem', { name: /New article/u }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor', exact: true });
      await expect(page.getByLabel('Search articles', { exact: true })).toHaveValue('');
      await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
      await expect(editor.getByRole('button', { name: 'Save & publish', exact: true })).toHaveCount(0);
      await editor.getByLabel('Article title', { exact: true }).fill('Synthetic unsaved article');
      await editor.getByLabel('Article body', { exact: true }).fill('Synthetic unsaved complete body.');
      page.once('dialog', dialog => dialog.dismiss());
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(editor.getByLabel('Article body', { exact: true })).toHaveValue('Synthetic unsaved complete body.');
      await page.screenshot({ path: `test-results/article-actions-${width}-${theme}.png`, fullPage: true });
      page.once('dialog', dialog => dialog.accept());
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(editor).toHaveCount(0);
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await page.getByRole('menuitem', { name: /New guide/u }).click();
      await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
      await expect(editor.getByRole('button', { name: 'Save & publish', exact: true })).toHaveCount(0);
      await editor.locator('details.admin-editor-details > summary').click();
      await editor.locator('details.admin-editor-key-details summary').click();
      await expect(editor.getByLabel('Content key', { exact: true })).toHaveValue(/^article\/guide\//u);
      expect(await store.call({ method: 'rows' })).toEqual(before);
      expect(writes).toEqual([]); expect(providerRequests).toEqual([]); expect(errors).toEqual([]);
    } finally { try { await page.unrouteAll({ behavior: 'wait' }); } finally { store.close(); } }
  });
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Dated Sky article editor archives and restores complete saved readings ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const row = await syntheticLibrarySkyArticle();
    const store = await studioApiStore([row], { uuidIds: true });
    const writes: any[] = [];
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date('2026-10-12T16:00:00Z'));
      await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
      await bundledPublications(page);
      await page.route('**/rest/v1/content_publications*', async route => {
        const publications = await store.call({ method: 'publications' });
        const filters = new URL(route.request().url()).searchParams.getAll('content_key');
        await route.fulfill({ json: publications.filter((record: any) => filters.every(filter => {
          const [operator, ...parts] = filter.split('.'), key = parts.join('.');
          if (operator === 'eq') return record.content_key === key;
          if (operator === 'gte') return record.content_key >= key;
          if (operator === 'lt') return record.content_key < key;
          if (operator === 'gt') return record.content_key > key;
          throw new Error(`Unsupported publication fixture filter: ${operator}`);
        })) });
      });
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write), answer: async (route, url) => {
        if (await routeStudioPublicReader(route, url, message => store.call(message.method === 'reader'
          ? { method: 'POST', url: '/api/content-reader', body: message.body } : message))) return true;
        if (url.pathname !== '/api/admin/content-live-status') return false;
        const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload }); return true;
      } });
      await page.goto('/admin/content#exact-content');
      const result = page.locator('tr.admin-content-row').filter({ hasText: row.content_key });
      await result.getByRole('button', { name: 'Edit published article', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor', exact: true });
      await expect(editor.getByRole('textbox', { name: 'Sky article general copy', exact: true })).toHaveValue(row.body);
      await editor.getByLabel('Sky reader date', { exact: true }).fill('2026-10-12');
      const preview = editor.getByRole('region', { name: 'Sky reader preview', exact: true });
      const reading = preview.frameLocator('iframe').locator('.sky-detail-body').first();
      await expect(reading).toContainText('Synthetic complete dated opening.', { timeout: 60_000 });
      await expect(reading).toContainText('Synthetic complete dated ending.');
      await expect(preview.getByRole('alert')).toHaveCount(0);
      const archive = editor.getByRole('button', { name: 'Archive article', exact: true });
      await expect(archive).toBeVisible();
      const concurrent = await store.call({ method: 'PATCH', body: { id: row.id, expectedUpdatedAt: row.updated_at, reviewerNotes: 'Synthetic second editor.' } });
      expect(concurrent.status).toBe(200);
      const conflict = editor.getByRole('alert').filter({ hasText: 'This content changed after the editor was opened.' });
      await archive.click(); await expect(conflict).toBeVisible();
      await expect(archive).toBeDisabled();
      expect((await store.call({ method: 'rows' })).find((r: any) => r.id === row.id)).toEqual(concurrent.payload.rows[0]);
      await editor.getByRole('button', { name: 'Reload saved article', exact: true }).click();
      await expect(conflict).toHaveCount(0);
      await expect(archive).toBeEnabled();
      await archive.click();
      await expect(editor.getByRole('button', { name: 'Restore as draft', exact: true })).toBeVisible();
      await expect(editor.getByRole('link', { name: 'Read published article', exact: true })).toHaveCount(0);
      const archived = (await store.call({ method: 'rows' })).find((r: any) => r.id === row.id);
      expect(archived.status).toBe('ARCHIVED'); expect(archived.sections).toEqual(row.sections); expect(archived.body).toBe(row.body);
      for (const body of [{ ids: [row.id] }, { keys: [row.content_key] }]) expect((await store.call({ method: 'POST', url: '/api/content-reader', body })).payload.rows).toEqual([]);
      await page.screenshot({ path: `test-results/dated-sky-archive-${width}-${theme}.png`, fullPage: true });
      await editor.getByRole('button', { name: 'Restore as draft', exact: true }).click();
      const restored = (await store.call({ method: 'rows' })).find((r: any) => r.id === row.id);
      await expect(editor.getByRole('button', { name: 'Approve & publish complete edition', exact: true })).toBeVisible();
      expect(restored.status).toBe('DRAFT'); expect(restored.sections).toEqual(row.sections); expect(restored.body).toBe(row.body);
      expect((await store.call({ method: 'POST', url: '/api/content-reader', body: { ids: [row.id] } })).payload.rows).toEqual([]);
      expect(writes.filter(write => write.result.status === 200)).toHaveLength(2);
    } finally { try { await page.unrouteAll({ behavior: 'wait' }); } finally { store.close(); } }
  });
}

for (const width of [390, 1440]) test(`open guide follows storage-only publication and retirement ${width}`, async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 1000 });
  const key = 'article/guide/synthetic-storage';
  let revision = 1, retired = false;
  const stamp = () => `2026-10-15T00:00:0${revision}.000Z`;
  const row = () => ({ id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', content_key: key,
    surface: 'guide', mode: 'article', status: 'LIVE', lane: 'serving', review_state: null,
    headline: 'Synthetic storage guide', body: `Synthetic complete opening ${revision}.\n\nSynthetic complete ending ${revision}.`,
    updated_at: stamp(), sections: {}, source_snapshot: { contentType: 'guide' } });
  const publications = () => [{ content_key: '__content-publication-ledger/v1', state: 'live', revision: 1,
    row_id: null, row_updated_at: null, updated_at: '2026-10-15T00:00:00Z' },
    { content_key: key, state: retired ? 'retired' : 'live', revision, row_id: row().id, row_updated_at: stamp(), updated_at: stamp() }];
  await bundledPublications(page);
  await page.route('**/rest/v1/content_publications*', route => route.fulfill({ json: publications() }));
  await page.route('**/api/content-publications', route => route.fulfill({ json: { schema: 'tldr-publications/v1', publications: publications() } }));
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse(retired ? [] : [row()], publications()) }));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/#articles/${encodeURIComponent(key)}`);
  const article = page.locator('.learn-article-body');
  await expect(article).toContainText('Synthetic complete opening 1.');
  await expect(article).toContainText('Synthetic complete ending 1.');
  const emitStorage = await publicationStorageEmitter(context);
  revision++; await emitStorage(publications());
  await expect(article).toContainText('Synthetic complete opening 2.');
  await expect(article).toContainText('Synthetic complete ending 2.');
  await expect(article).not.toContainText('Synthetic complete ending 1.');
  revision++; retired = true; await emitStorage(publications());
  await expect(page.getByRole('heading', { name: 'Article unavailable', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Synthetic complete ending');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Article unavailable', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
for (const width of [390, 1440]) test(`scoped reader marker discovers omitted retirement in an open guide ${width}`, async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 1000 });
  const key = 'article/guide/synthetic-omitted-retirement';
  const otherKey = 'article/guide/synthetic-scoped-update';
  const id = 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb';
  let revision = 1, metadataReads = 0;
  const publication = (content_key: string, retired = false) => ({ content_key, state: retired ? 'retired' : 'live', revision,
    row_id: content_key.startsWith('__') ? null : id, row_updated_at: content_key.startsWith('__') ? null : '2026-10-15T00:00:01.000Z',
    updated_at: `2026-10-15T00:00:0${revision}.000Z` });
  const publications = () => [publication('__content-publication-ledger/v1'), publication(key, revision > 1), publication(otherKey)];
  const row = { id, content_key: key, surface: 'guide', mode: 'article', status: 'LIVE', lane: 'serving', review_state: null,
    headline: 'Synthetic omitted retirement guide', body: 'Synthetic complete retained opening.\n\nSynthetic complete retained ending.',
    updated_at: '2026-10-15T00:00:01.000Z', sections: {}, source_snapshot: { contentType: 'guide' } };
  await bundledPublications(page);
  await page.route('**/rest/v1/content_publications*', route => {
    metadataReads++;
    const url = new URL(route.request().url());
    const bounds = url.searchParams.getAll('content_key');
    return route.fulfill({ json: publications().filter(record => bounds.every(bound => {
      if (bound.startsWith('gte.')) return record.content_key >= bound.slice(4);
      if (bound.startsWith('lt.')) return record.content_key < bound.slice(3);
      if (bound.startsWith('gt.')) return record.content_key > bound.slice(3);
      return true;
    })) });
  });
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse(revision === 1 ? [row] : [], publications()) }));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/#articles/${encodeURIComponent(key)}`);
  await expect(page.locator('.learn-article-body')).toContainText('Synthetic complete retained ending.');
  await expect.poll(() => metadataReads).toBeGreaterThanOrEqual(6);
  await page.evaluate(async () => { for (let n = 0; n < 30; n++) await new Promise(requestAnimationFrame); });
  const before = metadataReads;
  const bundled = await build({ stdin: { contents: `export {loadReaderRows} from './apps/web/src/services/readerContentClient.ts';`, resolveDir: process.cwd() },
    bundle: true, format: 'esm', write: false, define: { 'import.meta.env': '{}' }, logLevel: 'silent' });
  const emitter = await context.newPage();
  await emitter.route('**/__scoped-retirement', route => route.fulfill({ contentType: 'text/html', body: '<script type="module">import * as qa from "/__scoped-retirement.js";window.qa=qa;</script>' }));
  await emitter.route('**/__scoped-retirement.js', route => route.fulfill({ contentType: 'text/javascript', body: bundled.outputFiles[0].text }));
  await emitter.route('**/api/content-reader', route => route.fulfill({ json: readerResponse([], [publication('__content-publication-ledger/v1'), publication(otherKey)]) }));
  await emitter.goto('/__scoped-retirement');
  await emitter.waitForFunction(() => Boolean((window as any).qa));
  revision = 2;
  expect(await emitter.evaluate(async key => (window as any).qa.loadReaderRows({ keys: [key] }), otherKey)).toMatchObject({ error: null });
  await expect(page.getByRole('heading', { name: 'Article unavailable', exact: true })).toBeVisible();
  await expect.poll(() => metadataReads - before).toBeGreaterThanOrEqual(6);
  await expect(page.locator('body')).not.toContainText('Synthetic complete retained ending.');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Article unavailable', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await emitter.close();
});
async function headingStyle(heading: Locator, role: 'section' | 'caption' = 'section') {
  const values = await heading.evaluate((element, role) => {
    const probe = document.createElement('h2');
    probe.style.cssText = role === 'caption'
      ? 'margin:0;font-family:var(--font-ui);font-size:var(--type-ui-copy-size);font-weight:var(--weight-medium);line-height:var(--leading-placement-ui);letter-spacing:var(--tracking-normal)'
      : 'margin:0;font-family:var(--font-display);font-size:var(--type-h2-size);font-weight:var(--weight-regular);line-height:var(--leading-title);letter-spacing:var(--tracking-body)';
    element.append(probe);
    const actual = getComputedStyle(element), expected = getComputedStyle(probe);
    const values = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'].map(key => [key, actual[key as any], expected[key as any]]);
    probe.remove(); return values;
  }, role);
  for (const [property, actual, expected] of values) expect(actual, property).toBe(expected);
}

test('dated Sky articles remain discoverable with their complete saved history', async ({ page }) => {
  const row = await syntheticLibrarySkyArticle();
  const store = await studioApiStore([row]);
  try {
    await bundledPublications(page);
    await page.route('**/api/content-reader', async route => {
      const result = await store.call({ method: 'POST', body: route.request().postDataJSON(), url: '/api/content-reader' });
      await route.fulfill({ status: result.status, json: result.payload });
    });
    await page.goto('/#articles');
    const library = page.getByRole('region', { name: 'Articles & Guides', exact: true });
    await library.getByRole('tab', { name: 'Articles', exact: true }).click();
    await expect(library.getByRole('link', { name: /Synthetic dated Sky article/u })).toBeVisible();
    await library.getByRole('link', { name: /Synthetic dated Sky article/u }).click();
    await expect(page).toHaveURL(new RegExp(encodeURIComponent(row.content_key)));
    await expect(library).toContainText('Synthetic complete dated opening.');
    await expect(library).toContainText('Synthetic complete dated ending.');
    await page.reload();
    await expect(library).toContainText('Synthetic complete dated ending.');
  } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); store.close(); }
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Articles & Guides save, publish, read and retire ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    const store = await studioApiStore([{ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: 'sky/article-template/venus/scorpio',
      surface: 'sky', mode: 'article', event_type: 'sky-article-template', block_type: 'sky_article', status: 'REVIEWED', lane: 'reference',
      review_state: null, headline: 'Synthetic Sky template', body: '# Synthetic template\n\n{{entryDate}}', summary: '', sections: {},
      updated_at: '2026-10-09T00:00:00Z', source_snapshot: { contentType: 'sky-article-template', review_status: 'approved' } }], { uuidIds: true });
    let readerFailure = false;
    let raceVariable = false;
    let variableForRace: any;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:theme', theme);
        localStorage.setItem('tldrastro:studio-theme', theme);
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
      }, theme);
      await bundledPublications(page);
      await routeStudioInventoryApi(page, { call: async request => {
        if (raceVariable && request.method === 'PATCH' && (request.body as any)?.ownerAction === 'publish-standalone-article-revision') {
          raceVariable = false;
          const changed = await store.call({ method: 'PATCH', url: '/api/admin/generated-content?variables=true', body: {
            id: variableForRace.id, expectedUpdatedAt: variableForRace.updatedAt,
            variable: { ...definition, value: 'Latest complete author opening.' }
          } });
          expect(changed.status).toBe(200); variableForRace = changed.payload.variable;
        }
        return store.call(request);
      }, actualDocumentRoute: true, answer: async (route, url) => {
        if (url.pathname === '/api/content-reader') {
          if (readerFailure) { await route.fulfill({ status: 503, json: { error: 'Synthetic read failure' } }); return true; }
          const result = await store.call({ method: 'POST', body: route.request().postDataJSON(), url: '/api/content-reader' });
          await route.fulfill({ status: result.status, json: result.payload }); return true;
        }
        if (url.pathname === '/api/admin/content-publication') {
          const result = await store.call({ method: 'POST', body: route.request().postDataJSON(), url: url.pathname });
          await route.fulfill({ status: result.status, json: result.payload }); return true;
        }
        if (url.pathname === '/api/admin/content-live-status') {
          const statuses = await store.call({ method: 'statuses', body: route.request().postDataJSON() });
          await route.fulfill({ json: { ok: true, statuses } }); return true;
        }
        return false;
      } });
      await page.goto('/admin/content#articles'); // Saved links keep working.
      await expect(page.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();
      const collectionLink = page.getByRole('link', { name: 'Open Articles & Guides in the app', exact: true });
      await expect(collectionLink).toHaveAttribute('href', '/#articles');
      await expect(collectionLink).toHaveAttribute('target', '_blank');
      const [collectionPage] = await Promise.all([page.waitForEvent('popup'), collectionLink.click()]);
      await expect(collectionPage).toHaveURL(/\/#articles$/u);
      await expect(collectionPage.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();
      await collectionPage.close();
      await expect(page.getByRole('row').filter({ hasText: 'sky/article-template/venus/scorpio' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/articles-studio-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
      await page.getByRole('link', { name: 'Browse Sky article templates', exact: true }).click();
      await expect(page).toHaveURL(/#articles-guides\?q=/u);
      await expect(page.getByLabel('Search articles')).toHaveValue('sky/article-template/');
      const definition = {name:'articleOpening',label:'Private fixture label',description:'Private fixture description',tags:[],value:'Synthetic complete opening.',overrides:[]};
      const variable = await store.call({method:'POST',url:'/api/admin/generated-content?variables=true',body:{variable:definition}});
      expect(variable.status).toBe(200);
      const guideTemplate = body.replace('Synthetic complete opening.','{{articleOpening}}');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await page.getByRole('menuitem', { name: /New guide/u }).click();
      const editor = page.getByRole('dialog');
      await editor.getByLabel('Article title', { exact: true }).fill('Synthetic saved guide');
      await editor.getByLabel('Article body', { exact: true }).fill(guideTemplate);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.content_key.startsWith('article/guide/'))?.body).toBe(guideTemplate);
      const saved = (await store.call({ method: 'rows' })).find((row: any) => row.content_key.startsWith('article/guide/'));
      expect(saved.status).toBe('DRAFT');
      await page.reload();
      await page.getByRole('row').filter({ hasText: saved.content_key }).getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(editor.getByLabel('Article body', { exact: true })).toHaveValue(guideTemplate);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id)?.status).toBe('LIVE');
      await expect(editor.getByLabel('Reader status', { exact: true })).toHaveText('Live');
      await page.goto('/#articles');
      const library = page.getByRole('region', { name: 'Articles & Guides', exact: true });
      await expect(library.getByRole('heading', { name: 'Articles & Guides', level: 1 })).toBeVisible();
      await headingStyle(library.locator('.article-cover__caption h2'), 'caption');
      await expect(library.locator('h1,h2')).toHaveText(['Articles & Guides', 'Synthetic saved guide']);
      await library.getByRole('tab', { name: 'Guides', exact: true }).click();
      await library.getByLabel('Search articles and guides').fill('no-match');
      await expect(library.getByRole('status')).toHaveText('No articles or guides match “no-match”.');
      await library.getByLabel('Search articles and guides').fill('');
      await page.screenshot({ path: `test-results/articles-library-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
      await library.getByRole('link', { name: /Synthetic saved guide/u }).click();
      const directURL = page.url();
      await expect(library.locator('.learn-article-body')).toContainText('Synthetic complete final paragraph.');
      await expect(library.locator('h1,h2')).toHaveText(['Synthetic saved guide', 'Saved section']);
      await headingStyle(library.locator('.learn-article-body h2'));
      await page.reload();
      await expect(library.locator('.learn-article-body p')).toHaveText(['Synthetic complete opening.', 'Synthetic complete final paragraph.']);
      const changedVariable = await store.call({ method: 'PATCH', url: '/api/admin/generated-content?variables=true', body: {
        id: variable.payload.variable.id, expectedUpdatedAt: variable.payload.variable.updatedAt,
        variable: { ...definition, value: 'Updated complete author opening.' }
      } });
      expect(changedVariable.status).toBe(200);
      variableForRace = changedVariable.payload.variable;
      await page.reload();
      await expect(library.locator('.learn-article-body p')).toHaveText(['Synthetic complete opening.', 'Synthetic complete final paragraph.']);
      await page.goto('/admin/content#articles-guides');
      await page.getByRole('row').filter({ hasText: saved.content_key }).getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(editor.getByLabel('Article body', { exact: true })).toHaveValue(guideTemplate);
      if (width === 390 && theme === 'light') {
        // A failed lazy publication control must retain the saved revision and
        // leave the complete live edition intact until a fresh-page retry.
        const publishedBefore = (await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id);
        await page.route('**/studioRevisionPublication-*.js', route => route.abort('failed'));
        await editor.getByRole('button', { name: 'Publish to app', exact: true }).click();
        await expect(editor.getByRole('alert')).toBeVisible();
        await expect(editor.getByLabel('Article body', { exact: true })).toHaveValue(guideTemplate);
        expect((await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id)).toEqual(publishedBefore);
        expect((await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [saved.content_key] } }))
          .payload.rows[0]?.body).toBe(body);
        await page.unroute('**/studioRevisionPublication-*.js');
        await page.reload();
        await page.getByRole('row').filter({ hasText: saved.content_key }).filter({ hasText: 'Draft' })
          .getByRole('button', { name: 'Edit', exact: true }).click();
        await expect(editor.getByLabel('Article body', { exact: true })).toHaveValue(guideTemplate);
      }
      await editor.getByRole('button', { name: 'Publish to app', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [saved.content_key] } }))
        .payload.rows[0]?.body).toBe(body.replace('Synthetic complete opening.', 'Updated complete author opening.'));
      await page.goto(directURL); await page.reload();
      await expect(library.locator('.learn-article-body p')).toHaveText(['Updated complete author opening.', 'Synthetic complete final paragraph.']);
      // Saving/reopening an edit must not withdraw the reader's approved edition.
      await page.goto('/admin/content#articles-guides');
      await page.getByRole('row').filter({ hasText: saved.content_key }).filter({ hasText: 'Live' }).getByRole('button', { name: 'Edit', exact: true }).click();
      const revisedTemplate = `${guideTemplate}\n\nSynthetic complete revised ending.`;
      await editor.getByLabel('Article body', { exact: true }).fill(revisedTemplate);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(editor.getByText('All changes saved', { exact: true })).toBeVisible();
      await page.reload();
      await page.getByRole('row').filter({ hasText: saved.content_key }).filter({ hasText: 'Draft' })
        .getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(editor.getByLabel('Article body', { exact: true })).toHaveValue(revisedTemplate);
      const resavedTemplate = `${revisedTemplate}\n\nSynthetic complete second saved ending.`;
      await editor.getByLabel('Article body', { exact: true }).fill(resavedTemplate);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(editor.getByText('All changes saved', { exact: true })).toBeVisible();
      await page.reload();
      await page.getByRole('row').filter({ hasText: saved.content_key }).filter({ hasText: 'Draft' })
        .getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(editor.getByLabel('Article body', { exact: true })).toHaveValue(resavedTemplate);
      await page.goto(directURL);
      await expect(library.locator('.learn-article-body p')).toHaveText(['Updated complete author opening.', 'Synthetic complete final paragraph.']);
      await page.goto('/admin/content#articles-guides');
      await page.getByRole('row').filter({ hasText: saved.content_key }).filter({ hasText: 'Draft' })
        .getByRole('button', { name: 'Edit', exact: true }).click();
      if (width === 1440) {
        raceVariable = true;
        await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
        await expect(editor.getByRole('alert')).toContainText('changed or was deleted');
        await expect(editor.getByLabel('Article body', { exact: true })).toHaveValue(resavedTemplate);
        const retained = (await store.call({ method: 'rows' })).find((row: any) => row.event_type === 'standalone-article-revision');
        expect(retained.status).toBe('DRAFT'); expect(retained.body).toBe(resavedTemplate);
        expect((await store.call({ method: 'POST', url: '/api/content-reader', body: { keys: [saved.content_key] } }))
          .payload.rows[0]?.body).toBe(body.replace('Synthetic complete opening.', 'Updated complete author opening.'));
      }
      await editor.getByRole('button', { name: width === 390 ? 'Save & publish' : 'Publish to app', exact: true }).click();
      await expect(editor.getByLabel('Reader status', { exact: true })).toHaveText('Live');
      await page.goto(directURL);
      await page.reload();
      await expect(library.locator('.learn-article-body p')).toHaveText([width === 1440 ? 'Latest complete author opening.' : 'Updated complete author opening.', 'Synthetic complete final paragraph.', 'Synthetic complete revised ending.', 'Synthetic complete second saved ending.']);
      await page.screenshot({ path: `test-results/articles-reading-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      readerFailure = true;
      await page.reload();
      await expect(library.getByRole('alert')).toContainText('could not load');
      readerFailure = false;
      await library.getByRole('button', { name: 'Try again' }).click();
      await expect(library.getByRole('heading', { name: 'Synthetic saved guide', exact: true })).toBeVisible();
      const latest = (await store.call({ method: 'rows' })).find((row: any) => row.id === saved.id);
      const retired = await store.call({ method: 'POST', url: '/api/admin/content-publication', body: { action: 'retire', id: saved.id, contentKey: saved.content_key, expectedUpdatedAt: latest.updated_at } });
      expect(retired.status).toBe(200);
      await page.goto(directURL);
      await page.reload();
      await expect(library.getByRole('heading', { name: 'Article unavailable' })).toBeVisible();
      await library.getByRole('link', { name: 'Go to the Guide', exact: true }).click();
      await expect(library.getByRole('status')).toHaveText('No articles or guides are published yet.');
      await expect.poll(() => library.evaluate(element => {
        for (let node: Element | null = element; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (Number(style.opacity) < 1 || style.visibility === 'hidden' || style.display === 'none') return false;
        }
        return true;
      })).toBe(true);
      await page.screenshot({ path: `test-results/articles-empty-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
      expect(errors).toEqual([]);
    } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); store.close(); }
  });
}
