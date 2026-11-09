import { expect, test } from '@playwright/test';
import { educationReaderResponse, lessonRows, privateCanary } from '../helpers/astro101-reader-fixture';
import { fixturePublications } from '../helpers/content-reader-route.mjs';
import { readerResponse } from '../helpers/reader-response';
import { astro101RevisionFixture } from '../helpers/astro101-revision-fixture';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { bundledPublications } from '../helpers/bundled-publications';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const kind of ['chapter', 'house'] as const) {
  test(`Learn ${kind} edits remain private until explicit publication ${width} ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const initial = astro101RevisionFixture(kind, width === 390 ? 'all' : 'article');
    const unrelated = { ...astro101RevisionFixture(kind === 'chapter' ? 'article' : 'chapter'), status: 'LIVE' };
    const store = await studioApiStore([initial, unrelated], { uuidIds: true, projectSelect: true, sqlArticleLifecycle: true });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let failSave = false;
    try {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:theme', theme);
        localStorage.setItem('tldrastro:studio-theme', theme);
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
      }, theme);
      await bundledPublications(page);
      await routeStudioInventoryApi(page, { actualDocumentRoute: true, call: async request => {
        if (failSave && request.method === 'PATCH' && (request.body as any)?.status === 'DRAFT') {
          failSave = false;
          return { status: 503, payload: { ok: false, error: 'Synthetic save unavailable. Your changes are intact.' } };
        }
        return store.call(request);
      }, answer: async (route, url) => {
        if (url.pathname === '/api/content-reader' || url.pathname === '/api/admin/content-publication') {
          const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
          await route.fulfill({ status: result.status, json: result.payload }); return true;
        }
        if (url.pathname === '/api/content-publications') {
          await route.fulfill({ json: { schema: 'tldr-publications/v1', publications: await store.call({ method: 'publications' }) } }); return true;
        }
        if (url.pathname === '/api/admin/content-live-status') {
          await route.fulfill({ json: { ok: true, statuses: await store.call({ method: 'statuses', body: route.request().postDataJSON() }) } }); return true;
        }
        return false;
      } });
      const editor = page.getByRole('dialog', { name: 'Generated content editor', exact: true });
      const openRow = async (title: string) => {
        await page.goto('/admin/content#astro-101');
        await page.getByRole('row').filter({ hasText: title }).getByRole('button', { name: 'Edit', exact: true }).click();
        await expect(editor.getByLabel('Card title', { exact: true })).toHaveValue(title);
      };
      const readLive = async (opening: string, ending: string) => {
        await page.goto('/learn');
        if (kind === 'chapter') await expect(page.getByText(initial.headline, { exact: true }).first()).toBeVisible();
        else await expect(page.locator(`a[href="${initial.facts.slug}"]`).first()).toBeVisible();
        await page.goto(initial.facts.slug);
        await expect(page.getByText(opening, { exact: true })).toBeVisible();
        await expect(page.getByText(ending, { exact: true })).toBeVisible();
        await page.reload();
        await expect(page.getByText(ending, { exact: true })).toBeVisible();
      };
      await openRow(initial.headline);
      await editor.getByRole('button', { name: 'Publish to app', exact: true }).click();
      await expect(editor).toContainText('Visible in app');
      let rows = await store.call({ method: 'rows' });
      const live = rows.find((row: any) => row.id === initial.id);
      failSave = true;
      await expect(editor.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0);
      await expect(editor.getByRole('button', { name: 'Move to draft', exact: true })).toHaveCount(0);
      await editor.getByLabel('Article intro', { exact: true }).fill('Synthetic private opening.');
      await editor.getByLabel('Section 1 body', { exact: true }).fill('Synthetic private final sentence.');
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(editor).toContainText('Synthetic save unavailable.');
      await expect(editor.getByLabel('Article intro', { exact: true })).toHaveValue('Synthetic private opening.');
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(editor).toContainText('Private revision');
      rows = await store.call({ method: 'rows' });
      const revision = rows.find((row: any) => row.event_type === 'standalone-article-revision');
      expect(revision).toBeTruthy();
      expect(rows.find((row: any) => row.id === live.id)).toEqual(live);
      expect(rows.find((row: any) => row.id === unrelated.id)).toEqual(unrelated);
      await readLive(initial.sections.intro, initial.sections.blocks[0].body);
      await page.goto('/admin/content#astro-101');
      // Source keys have a published row and a private proposal. Select the draft explicitly.
      if (await editor.isVisible()) await editor.getByRole('button', { name: 'Close', exact: true }).click();
      const draftRow = page.getByRole('row').filter({ hasText: initial.headline }).filter({ hasText: 'Draft' });
      await draftRow.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(editor).toContainText('Private revision');
      await expect(editor.getByLabel('Article intro', { exact: true })).toHaveValue('Synthetic private opening.');
      await expect(editor.getByLabel('Section 1 body', { exact: true })).toHaveValue('Synthetic private final sentence.');
      await editor.getByLabel('Section 1 heading', { exact: true }).fill('Synthetic reviewed section');
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
      expect((await store.call({ method: 'rows' })).find((row: any) => row.id === initial.id)).toEqual(live);
      await page.screenshot({ path: testInfo.outputPath(`private-${kind}-${width}-${theme}.png`), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await editor.getByRole('button', { name: 'Publish to app', exact: true }).click();
      await expect(editor).toContainText('Visible in app');
      rows = await store.call({ method: 'rows' });
      const published = rows.find((row: any) => row.id === initial.id);
      expect(published.mode).toBe(initial.mode);
      expect(published.sections.blocks[0].heading).toBe('Synthetic reviewed section');
      expect(rows.find((row: any) => row.id === revision.id).status).toBe('ARCHIVED');
      expect(rows.find((row: any) => row.id === unrelated.id)).toEqual(unrelated);
      await readLive('Synthetic private opening.', 'Synthetic private final sentence.');
      expect(errors).toEqual([]);
    } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); store.close(); }
  });
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Learn keeps its shell in place while code and content load at ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem('tldrastro:theme', theme), theme);
    let releaseModule!: () => void, releaseContent!: () => void;
    const moduleGate = new Promise<void>(resolve => { releaseModule = resolve; });
    const contentGate = new Promise<void>(resolve => { releaseContent = resolve; });
    await page.route(/\/assets\/LearnExperience-[^/]+\.js$/, async route => { await moduleGate; await route.continue(); });
    await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await page.route('**/api/content-publications*', route => route.fulfill({ json: { rows: fixturePublications(lessonRows) } }));
    let contentRequested = false;
    await page.route('**/api/content-reader', async route => {
      const query = route.request().postDataJSON();
      if (query.prefix !== 'education/astro-101/') return route.fulfill({ json: readerResponse([]) });
      contentRequested = true;
      await contentGate;
      const response = await educationReaderResponse(query, lessonRows, fixturePublications(lessonRows), false);
      await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
    });
    const shell = page.locator('.app-shell.mode-learn');
    const assertPosition = async () => {
      await expect(shell).toBeVisible();
      expect((await shell.boundingBox())?.y).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    try {
      await page.goto('/learn', { waitUntil: 'domcontentloaded' });
      await expect(shell.locator('.app-loading')).toBeVisible();
      await assertPosition();
      releaseModule();
      await expect.poll(() => contentRequested).toBe(true);
      await expect(page.getByText('Loading Astro 101…', { exact: true })).toBeVisible();
      await assertPosition();
      releaseContent();
      await expect(page.locator('.learn-chapter__title')).toHaveCount(9);
      await assertPosition();
    } finally { releaseModule(); releaseContent(); }
  });
}

for (const width of [390, 1440]) for (const failure of ['connection', 'malformed'] as const) {
  test(`Astro 101 handles ${failure} response bodies at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await page.route('**/api/content-publications*', route => route.fulfill({ json: { rows: fixturePublications(lessonRows) } }));
    let requests = 0;
    await page.route('**/api/content-reader', async route => {
      const query = route.request().postDataJSON();
      if (query.prefix !== 'education/astro-101/') return route.fulfill({ json: readerResponse([]) });
      requests++;
      const response = await educationReaderResponse(query, lessonRows, fixturePublications(lessonRows), false);
      await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
    });
    // The actual handler supplies the page. Interrupt its first successful body
    // separately from headers; a route.abort() would only test fetch rejection.
    await page.addInitScript(failure => {
      const originalFetch = window.fetch.bind(window);
      let interrupted = false;
      window.fetch = async (input, init) => {
        const response = await originalFetch(input, init);
        if (String(input) !== '/api/content-reader' || interrupted || !response.ok
          || JSON.parse(String(init?.body)).prefix !== 'education/astro-101/') return response;
        interrupted = true;
        await response.body?.cancel();
        if (failure === 'malformed') return new Response('{"rows":[', { status: 200 });
        return new Response(new ReadableStream({ start(controller) {
          controller.enqueue(new TextEncoder().encode('{"rows":['));
          controller.error(new TypeError('Synthetic connection interrupted during body download'));
        } }), { status: 200 });
      };
    }, failure);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/learn/astro-101/qa-chapter-1');
    if (failure === 'connection') {
      await expect(page.locator('.learn-lede')).toHaveText('QA opening 1.');
      await expect(page.locator('.learn-article-body')).toContainText('QA final sentence 1.');
      expect(requests).toBe(2);
      await page.reload();
      await expect(page.locator('.learn-lede')).toHaveText('QA opening 1.');
      await expect(page.locator('.learn-article-body')).toContainText('QA final sentence 1.');
      expect(requests).toBe(4);
    } else {
      await expect(page.getByRole('alert').filter({hasText:'Astro 101 could not load.'})).toBeVisible();
      expect(requests).toBe(1);
      await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Astro 101 chapters and house lesson through actual reader API at ${width} ${theme}`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    await context.addInitScript(theme => localStorage.setItem('tldrastro:theme', theme), theme);
    const signedIn = theme === 'dark';
    if (signedIn) {
      const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'reader@example.test', app_metadata: { provider: 'email' }, user_metadata: { name: 'Fixture Reader' } };
      const authKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
      await context.addInitScript(({ user, authKey }) => {
        localStorage.setItem('tldrastro:userProfile', JSON.stringify({ id: user.id, name: 'Fixture Reader', email: user.email, provider: 'email', sun: 'Aquarius', moon: 'Cancer', rising: 'Gemini', charts: [] }));
        localStorage.setItem(authKey, JSON.stringify({ user, access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: 4102444800 }));
      }, { user, authKey });
      await context.route('**/auth/v1/**', route => route.fulfill({ json: user }));
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let retired = false;
    let failed = false;
    await context.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await context.route('**/api/content-publications*', route => route.fulfill({ json: { rows: fixturePublications(lessonRows) } }));
    await context.route('**/api/content-reader', async route => {
      const query = route.request().postDataJSON();
      if (query.prefix !== 'education/astro-101/') return route.fulfill({ json: readerResponse([]) });
      const ledger = fixturePublications(lessonRows);
      if (retired) ledger.find(row => row.content_key === lessonRows[9].content_key)!.state = 'retired';
      const response = await educationReaderResponse(query, lessonRows, ledger, failed);
      const body = await response.text();
      expect(body).not.toContain(privateCanary);
      await route.fulfill({ status: response.status, contentType: 'application/json', body });
    });
    await page.goto('/#settings');
    await expect(page.locator('.site-nav').getByRole('button', { name: 'Learn', exact: true, includeHidden: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    const menu = page.getByRole('menu', { name: 'Site menu' });
    if (signedIn) {
      await expect(menu.getByRole('menuitem', { name: 'Friends', exact: true })).toBeVisible();
      const labels = await menu.getByRole('menuitem').allTextContents();
      expect(labels.slice(0, 7)).toEqual(['Sky', 'Calendar', 'Horoscopes', 'Guide', 'You', 'Friends', 'Learn']);
    }
    await menu.getByRole('menuitem', { name: 'Learn', exact: true }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(menu).toHaveCount(0);
    await expect(page.locator('.learn-chapter__title')).toHaveCount(9);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await expect(menu.getByRole('menuitem', { name: 'Learn', exact: true })).toHaveClass('active');
    await page.screenshot({ path: `test-results/learn-overflow-${width}-${theme}.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'QA chapter 1', exact: true }).click();
    await expect(page).toHaveURL(/\/learn\/astro-101\/qa-chapter-1$/);
    await expect(page.locator('.learn-lede')).toHaveText('QA opening 1.');
    await expect(page.locator('.learn-article-body')).toContainText('QA final sentence 1.');
    await page.getByRole('button', { name: 'Back to Astro 101' }).click();
    await expect(page.locator('.learn-chapter__title')).toHaveCount(9);
    await page.getByRole('link', { name: /XI Friends Ruled by Saturn/ }).click();
    await expect(page).toHaveURL(/\/learn\/houses\/11$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('QA eleventh house');
    await expect(page.locator('.learn-lede')).toHaveText('QA opening 10.');
    await expect(page.locator('.learn-article-body')).toContainText('QA final sentence 10.');
    await page.reload();
    await expect(page.locator('.learn-article-body')).toContainText('QA final sentence 10.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/astro101-house-${width}-${theme}.png`, fullPage: true });
    retired = true;
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible();
    failed = true;
    await page.reload();
    await expect(page.getByRole('alert').filter({hasText:'Astro 101 could not load.'})).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
