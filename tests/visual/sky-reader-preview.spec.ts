import { readFile } from 'node:fs/promises';
import { readerCsvCells } from '../helpers/reader-csv';
import { test, expect } from '@playwright/test';
import { expectStudioPanel, expectStudioReadingType } from '../helpers/studio-readability';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { skyPlacementSourceFixture } from '../helpers/sky-placement-source-fixture.mts';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';

async function prepare(page: any, theme = 'light', saved: boolean | 'active' = true, planet = 'saturn', sign = 'aries') {
  const fixture = await skyPlacementSourceFixture(planet, sign);
  const store = await studioApiStore(saved ? saved === 'active' ? [fixture.active] : [fixture.active, fixture.pending] : []);
  const writes: unknown[] = [];
  let failReader = false;
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.addInitScript((theme: string) => {
    localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
    localStorage.setItem('tldrastro:studio-theme', theme);
  }, theme);
  await routeStudioInventoryApi(page.context(), { call: store.call, actualDocumentRoute: true, onWrite: write => writes.push(write), answer: async (route, url) => {
    if (url.pathname === '/api/content-publications') {
      const publications = canonicalPublicationLedger(await store.call({ method: 'publications' }));
      await route.fulfill({ headers: { etag: await publicationLedgerTag(publications) }, json: { schema: 'tldr-publications/v1', publications } });
      return true;
    }
    if (url.pathname === '/api/admin/content-live-status' || url.pathname === '/api/content-reader') {
      if (url.pathname === '/api/content-reader' && failReader) await route.fulfill({ status: 503, json: { error: 'Synthetic preview reader outage.' } });
      else {
        const result = await store.call({ method: 'POST', url: url.pathname, body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload });
      }
      return true;
    }
    if (url.pathname === '/api/calendar') {
      await route.fulfill({ json: { ok: true, calendar: { days: [] } } }); return true;
    }
    if (!url.pathname.startsWith('/api/admin/')) {
      await route.fulfill({ status: 503, json: { error: 'Optional public API is unavailable in this isolated fixture.' } }); return true;
    }
    return false;
  } });
  await page.context().route('**/content-studio-last-known-good.json', (route: any) => route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
  await page.context().route('**/rest/v1/**', async (route: any) => {
    const url = new URL(route.request().url());
    const publications = url.pathname.endsWith('/content_publications') ? await store.call({ method: 'publications' }) : [];
    const filters = url.searchParams.getAll('content_key');
    await route.fulfill({ json: publications.filter((row: any) => filters.every(filter => {
      const [operator, ...parts] = filter.split('.');
      const key = parts.join('.');
      if (operator === 'eq') return row.content_key === key;
      if (operator === 'gte') return row.content_key >= key;
      if (operator === 'lt') return row.content_key < key;
      if (operator === 'gt') return row.content_key > key;
      throw new Error(`Unsupported publication fixture filter: ${operator}`);
    })) });
  });
  await page.goto('/admin/content#sky-writeups');
  await page.getByLabel('Sky placement planet or point').selectOption(planet);
  await page.getByLabel('Sky placement zodiac sign').selectOption(sign);
  const sources = page.getByRole('region', { name: 'Sky placement reader sources', exact: true });
  await expect(sources.getByRole('button', { name: 'Preview reader', exact: true })).toBeEnabled();
  return {
    fixture, store, writes, sources,
    failReader: (value: boolean) => { failReader = value; },
    close: async () => {
      // Assertions have finished. Detach background routes before terminating
      // their API process, so expected shutdown cannot reject a pending route.
      // Waiting for every optional background route can itself hang cleanup.
      await page.context().unrouteAll({ behavior: 'ignoreErrors' });
      store.close();
    }
  };
}

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`Sky reader preview selects Published and Draft by date at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 1000 });
    const state = await prepare(page, theme);
    try {
      await state.sources.getByRole('button', { name: 'Preview reader', exact: true }).click();
      const preview = page.getByRole('region', { name: 'Sky reader preview', exact: true });
      const reader = preview.frameLocator('iframe');
      await expect(preview.getByRole('heading', { level: 4, name: 'Sky reader preview', exact: true })).toBeVisible();
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.', { timeout: 60_000 });
      await expect(reader.locator('.sky-detail-body').first()).not.toContainText('Synthetic pending revision');
      await expect(preview.locator('p').filter({ hasText: /^Source used:/ })).toContainText('Published · Dated article');
      await preview.screenshot({ path: `test-results/sky-reader-preview-published-${width}-${theme}.png` });
      await preview.getByRole('button', { name: 'Draft', exact: true }).click();
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic pending revision final sentence.');
      await expect(reader.getByRole('status').filter({ hasText: 'Draft preview · Unpublished simulation' })).toBeVisible();
      await expect(preview.locator('p').filter({ hasText: /^Source used:/ })).toContainText('Draft simulation');
      await expect(preview.getByRole('region', { name: 'Sky publication impact' })).toContainText('publishing would select this revision');
      await preview.screenshot({ path: `test-results/sky-reader-preview-${width}-${theme}.png` });
      if (width === 1440 && theme === 'light') {
        const exported = page.waitForEvent('popup').then(async popup => {
          const file = await popup.waitForEvent('download', { timeout: 90_000 });
          const csv = readerCsvCells(await readFile((await file.path())!, 'utf8'));
          expect(csv.reference_instant).toContain('2026-10-21');
          expect(csv.body).toContain('Synthetic published final sentence.');
          expect(csv.body).not.toContain('Synthetic pending revision');
          await expect(popup.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.');
          await popup.close();
        });
        await state.sources.getByRole('link', { name: 'Export what readers see', exact: true }).click();
        await exported;
        await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic pending revision final sentence.');
      }

      const readerOrigin = new URL((await preview.locator('iframe').getAttribute('src'))!).origin;
      const readerLink = new URL((await preview.getByRole('link', { name: 'Read this date in Sky' }).getAttribute('href'))!, page.url());
      expect(readerLink.origin).toBe(readerOrigin);
      expect(readerLink.search + readerLink.hash).toBe('?date=2026-10-21#/sky/placement/saturn/aries');
      await state.sources.getByLabel('Sky reader date').fill('2026-10-23');
      await expect(preview.getByRole('region', { name: 'Sky publication impact' })).toContainText('this revision is not selected', { timeout: 60_000 });
      await expect(reader.locator('.sky-detail-body').first()).not.toContainText('Synthetic pending revision');
      await expect(preview.locator('p').filter({ hasText: /^Source used:/ })).toContainText('Shared fallback');
      await state.sources.getByLabel('Sky reader date').fill('2026-09-22');
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic pending revision final sentence.', { timeout: 60_000 });
      await preview.getByRole('button', { name: 'Published', exact: true }).click();
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.');
      await state.sources.getByLabel('Sky reader date').fill('');
      await expect(preview.getByRole('alert')).toHaveText('Choose a valid preview date.');
      await expect(preview.locator('iframe')).toBeHidden();
      await state.sources.getByLabel('Sky reader date').fill('2026-10-21');
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.');
      await page.clock.fastForward(61_000);
      await expect(preview.getByRole('alert')).toHaveCount(0);
      expect(state.writes).toEqual([]);
      expect((await state.store.call({ method: 'rows' })).find((row: any) => row.id === state.fixture.active.id).body).toBe(state.fixture.active.body);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await preview.getByRole('button', { name: 'Close preview', exact: true }).click();
      await page.reload();
      await page.getByLabel('Sky placement planet or point').selectOption('saturn');
      await page.getByLabel('Sky placement zodiac sign').selectOption('aries');
      await expect(state.sources.getByRole('button', { name: 'Open pending revision' })).toBeVisible();
    } finally { await state.close(); }
  });
}

test('Sky reader preview recovers from a public read failure without substituting a draft', async ({ page }) => {
  test.setTimeout(120_000);
  const state = await prepare(page);
  try {
    state.failReader(true);
    await state.sources.getByLabel('Sky reader date').fill('2026-10-20');
    await state.sources.getByRole('button', { name: 'Preview reader', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Sky reader preview', exact: true });
    await expect(preview.getByRole('alert')).toBeVisible({ timeout: 60_000 });
    await expect(preview.locator('p').filter({ hasText: /^Source used:/ })).toHaveCount(0);
    state.failReader(false);
    await preview.getByRole('button', { name: 'Refresh preview' }).click();
    await expect(preview.frameLocator('iframe').locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.', { timeout: 60_000 });
    expect(state.writes).toEqual([]);
  } finally { await state.close(); }
});

test('Sky reader preview follows editor changes, preserves the selected date and verifies the published result', async ({ page }) => {
  test.setTimeout(180_000);
  const state = await prepare(page);
  try {
    await state.sources.getByLabel('Sky reader date').fill('2026-09-23');
    await state.sources.getByRole('button', { name: 'Open pending revision' }).click();
    await expect(state.sources.getByLabel('Sky reader date')).toHaveValue('2026-09-23');
    const editor = page.getByRole('dialog');
    const copy = editor.getByLabel('Sky article general copy', { exact: true });
    const revised = 'Synthetic preview edit opening.\n\nSynthetic preview edit final sentence.';
    await copy.fill(revised);
    await expect(editor.getByText('Draft saved · Changes not published', { exact: true })).toBeVisible();
    await editor.getByRole('button', { name: 'Preview reader', exact: true }).click();
    const preview = editor.getByRole('region', { name: 'Sky reader preview', exact: true });
    const reader = preview.frameLocator('iframe');
    const readerOrigin = new URL((await preview.locator('iframe').getAttribute('src'))!).origin;
    await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.', { timeout: 60_000 });
    await preview.getByRole('button', { name: 'Draft', exact: true }).click();
    await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic preview edit final sentence.');
    await state.sources.getByLabel('Sky reader date').fill('2026-09-23');
    await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic preview edit final sentence.', { timeout: 60_000 });
    const again = 'Synthetic second preview opening.\n\nSynthetic second preview final sentence.';
    await copy.fill(again);
    await expect(editor.getByText('Draft saved · Changes not published', { exact: true })).toBeVisible();
    await expect(state.sources.getByLabel('Sky reader date')).toHaveValue('2026-09-23');
    await expect(preview.getByRole('button', { name: 'Draft', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic second preview final sentence.');
    await copy.fill('');
    await expect(preview.getByRole('button', { name: 'Draft', exact: true })).toBeDisabled();
    await expect(preview.getByRole('alert')).toContainText('Draft preview unavailable:');
    await preview.getByRole('button', { name: 'Published', exact: true }).click();
    await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.');
    await expect(preview.getByRole('region', { name: 'Sky publication impact' })).toContainText('Complete the required draft fields before publishing.');
    await copy.fill(again);
    await expect(editor.getByText('Draft saved · Changes not published', { exact: true })).toBeVisible();
    await preview.getByRole('button', { name: 'Draft', exact: true }).click();
    await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic second preview final sentence.');
    expect((await state.store.call({ method: 'rows' })).find((row: any) => row.id === state.fixture.active.id).body).toBe(state.fixture.active.body);
    await preview.getByRole('button', { name: 'Published', exact: true }).click();
    await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.');
    const beforePublication = (await state.store.call({ method: 'publications' })).find((row: any) => row.content_key === state.fixture.active.content_key);
    await editor.getByRole('button', { name: 'Review & publish', exact: true }).click();
    await editor.getByRole('button', { name: 'Publish changes', exact: true }).click();
    await expect(editor.getByText('Published copy is unchanged.', { exact: true })).toBeVisible();
    const afterPublication = (await state.store.call({ method: 'publications' })).find((row: any) => row.content_key === state.fixture.active.content_key);
    expect(Number(afterPublication.revision)).toBeGreaterThan(Number(beforePublication.revision));
    await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic second preview final sentence.', { timeout: 60_000 });
    await expect(state.sources.getByLabel('Sky reader date')).toHaveValue('2026-09-23');
    await page.goto(`${readerOrigin}/?date=2026-09-23#sky/placement/saturn/aries`);
    await expect(page.locator('.sky-detail-body').first()).toContainText('Synthetic second preview final sentence.', { timeout: 60_000 });
    await page.reload();
    await expect(page.locator('.sky-detail-body').first()).toContainText('Synthetic second preview final sentence.');
  } finally { await state.close(); }
});

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`dated Sky variable controls preserve sources through publication at ${width} ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 1000 });
    const existingRevision = width === 1440 && theme === 'dark';
    const state = await prepare(page, theme, existingRevision ? true : 'active', 'sun', 'libra');
    try {
      await state.sources.getByLabel('Sky reader date').fill('2026-10-21');
      await state.sources.getByRole('button', { name: existingRevision ? 'Open pending revision' : 'Edit active article', exact: true }).click();
      const editor = page.getByRole('dialog');
      const copy = editor.getByLabel('Sky article general copy', { exact: true });
      const original = 'Synthetic dated opening. TARGET\n\nSynthetic dated final sentence.';
      await copy.fill(original);
      await editor.locator('[data-dated-article-variables] > summary').click();
      const controls = editor.locator('[data-dated-article-variables]');
      await editor.getByLabel('Passage variable values').locator(':scope > summary').click();
      await editor.getByText('Resolved passage', { exact: true }).click();
      if (width === 1440 && theme === 'light') {
        await editor.getByLabel('Dated article variable target').selectOption('headline');
        const title = editor.getByLabel('Sky article headline', { exact: true });
        await title.fill('Article TARGET');
        await title.evaluate((node: HTMLInputElement) => node.setSelectionRange(8, 14));
        await controls.getByLabel('Find Sky variable', { exact: true }).fill('planet name');
        await controls.getByRole('button', { name: 'Insert {{planetTitle}}', exact: true }).click();
        await expect(title).toHaveValue('Article {{planetTitle}}');
        await editor.getByLabel('Dated article variable target').selectOption('tldr');
        const summary = editor.getByLabel('Sky article TL;DR', { exact: true });
        await summary.fill('Summary TARGET final.');
        await summary.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(8, 14));
        await controls.getByLabel('Find Sky variable', { exact: true }).fill('zodiac sign');
        await controls.getByRole('button', { name: 'Insert {{signTitle}}', exact: true }).click();
        await expect(summary).toHaveValue('Summary {{signTitle}} final.');
        await editor.getByLabel('Dated article variable target').selectOption('body');
        await copy.focus();
      }
      await controls.getByLabel('Find Sky variable', { exact: true }).fill('zodiac sign');
      await controls.getByLabel('Sky variable type', { exact: true }).selectOption('fact');
      await copy.evaluate((node: HTMLTextAreaElement) => { const start = node.value.indexOf('TARGET'); node.setSelectionRange(start, start + 6); });
      await controls.getByRole('button', { name: 'Insert {{signTitle}}', exact: true }).click();
      await expect(copy).toBeFocused();
      await expect(copy).toHaveValue(original.replace('TARGET', '{{signTitle}}'));
      await expect(editor.getByLabel('Assembled dated article section')).toContainText('Synthetic dated opening. Libra');
      await expect(editor.getByLabel('Assembled dated article section')).toContainText('Synthetic dated final sentence.');
      await controls.getByLabel('Only variables used in this section', { exact: true }).check();
      await expect(controls.getByRole('table', { name: 'Calculated Sky variable values' })).toContainText('Zodiac sign');
      if (width === 1440 && theme === 'light') {
        await controls.getByLabel('Only variables used in this section', { exact: true }).uncheck();
        await controls.getByLabel('Find Sky variable', { exact: true }).fill('entry date');
        await expect(controls.getByRole('table', { name: 'Calculated Sky variable values' })).toContainText('Needs calculated occurrence');
        await controls.getByRole('button', { name: 'Calculate dated article values', exact: true }).click();
        await expect(controls.getByRole('table', { name: 'Calculated Sky variable values' })).toContainText('September 23, 2026', { timeout: 60_000 });
        await controls.getByLabel('Find Sky variable', { exact: true }).fill('zodiac sign');
      }
      await controls.getByText('Original compilation values', { exact: true }).click();
      await controls.getByText('Overview Body · {{edition_overviewBody}}', { exact: true }).click();
      await copy.evaluate((node: HTMLTextAreaElement) => { const start = node.value.indexOf('Synthetic dated final'); node.setSelectionRange(start, start); });
      await controls.getByRole('button', { name: 'Insert original overviewBody', exact: true }).click();
      const template = original.replace('TARGET', '{{signTitle}}').replace('Synthetic dated final', '{{edition_overviewBody}}Synthetic dated final');
      await expect(copy).toHaveValue(template);
      await expect(editor.getByLabel('Assembled dated article section')).toContainText('Synthetic published opening.');
      await expect(editor.getByLabel('Assembled dated article section')).toContainText('Synthetic published final sentence.');
      await expect(editor.getByText('Draft saved · Changes not published', { exact: true })).toBeVisible();
      const active = (await state.store.call({ method: 'rows' })).find((row: any) => row.id === state.fixture.active.id);
      expect(active.body).toBe(state.fixture.active.body);
      await controls.getByLabel('Find Sky variable', { exact: true }).evaluate(node => node.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: `test-results/dated-sky-picker-${width}-${theme}.png` });
      await editor.getByLabel('Assembled dated article section').evaluate(node => node.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: `test-results/dated-sky-assembly-${width}-${theme}.png` });
      await copy.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/dated-sky-variables-${width}-${theme}.png` });
      await editor.getByRole('button', { name: 'Preview reader', exact: true }).click();
      const preview = editor.getByRole('region', { name: 'Sky reader preview', exact: true });
      const reader = preview.frameLocator('iframe');
      const datedReaderOrigin = new URL((await preview.locator('iframe').getAttribute('src'))!).origin;
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.', { timeout: 60_000 });
      await preview.getByRole('button', { name: 'Draft', exact: true }).click();
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic dated opening. Libra');
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic dated final sentence.');
      await expect(reader.locator('.sky-detail-body').first()).not.toContainText('{{');
      await copy.fill(template + '{{unknownFixtureVariable}}');
      await expect(preview.getByRole('button', { name: 'Draft', exact: true })).toBeDisabled();
      await expect(preview.getByRole('alert')).toContainText('needs a complete value');
      await copy.fill(template);
      await expect(editor.getByText('Draft saved · Changes not published', { exact: true })).toBeVisible();
      await editor.getByRole('button', { name: 'Done', exact: true }).click();
      await state.sources.getByRole('button', { name: 'Open pending revision', exact: true }).click();
      await expect(editor.getByLabel('Sky article general copy', { exact: true })).toHaveValue(template);
      await expect(editor.getByRole('button', { name: 'Use current value for signTitle', exact: true })).toHaveCount(0);
      await editor.getByRole('button', { name: 'Review & publish', exact: true }).click();
      await expect(editor.getByRole('region', { name: 'Review Sky article changes' })).toContainText('Variable sources');
      await editor.getByRole('button', { name: 'Publish changes', exact: true }).click();
      await expect(editor.getByText('Published copy is unchanged.', { exact: true })).toBeVisible();
      const published = (await state.store.call({ method: 'rows' })).find((row: any) => row.id === state.fixture.active.id);
      expect(published.sections.skyArticleVariableDraft.templates.body).toBe(template);
      expect(published.body).toContain('Synthetic dated opening. Libra');
      expect(published.body).toContain('Synthetic published final sentence.');
      expect(published.body).toContain('Synthetic dated final sentence.');
      const publicPage = await page.context().newPage();
      await publicPage.addInitScript(() => localStorage.removeItem('tldrastro:contentAdminSecret'));
      let loginSdkRequests = 0;
      publicPage.on('request', request => {
        if (/\/assets\/supabase-[^/]+\.js$/u.test(new URL(request.url()).pathname)) loginSdkRequests++;
      });
      await publicPage.goto(`${datedReaderOrigin}/?date=2026-10-21#sky/placement/sun/libra`);
      await expect(publicPage.locator('.sky-detail-body').first()).toContainText('Synthetic dated opening. Libra', { timeout: 60_000 });
      await expect(publicPage.locator('.sky-detail-body').first()).toContainText('Synthetic dated final sentence.');
      await publicPage.reload();
      await expect(publicPage.locator('.sky-detail-body').first()).toContainText('Synthetic dated final sentence.');
      if (testInfo.config.metadata.anonymousReaderFixture === true) {
        expect(loginSdkRequests, 'The anonymous full reader must not wait for the login SDK.').toBe(0);
      } else {
        expect(loginSdkRequests, 'Legacy configurations retain the working SDK recovery path.').toBeGreaterThan(0);
      }
      await publicPage.close();
    } finally { await state.close(); }
  });
}

test('Sky reader preview explains bundled writing when no dated revision is saved', async ({ page }) => {
  test.setTimeout(120_000);
  const state = await prepare(page, 'dark', false);
  try {
    await state.sources.getByRole('button', { name: 'Preview reader', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Sky reader preview', exact: true });
    await expect(preview.getByRole('button', { name: 'Draft', exact: true })).toBeDisabled();
    await expect(preview.locator('p').filter({ hasText: /^Source used:/ })).toContainText('Bundled fallback · Shared fallback', { timeout: 60_000 });
    await expect(preview.getByText('No dated draft revision is available. Open a dated article to edit its draft.', { exact: true })).toBeVisible();
    await expect(preview.frameLocator('iframe').locator('.sky-detail-body').first()).toBeVisible();
    await state.sources.getByLabel('Sky reader date').fill('2026-01-01');
    await expect(preview.getByText(/^Saturn in Aries is not active on 2026-01-01\. Saturn is in Pisces/)).toBeVisible({ timeout: 60_000 });
    await expect(preview.locator('p').filter({ hasText: /^Reference:/ })).toContainText('2026-01-01T');
    await expect(preview.getByRole('link', { name: 'Read this date in Sky' })).toHaveAttribute('href', /\?date=2026-01-01#\/sky\/placement\/saturn\/pisces$/);
    expect(state.writes).toEqual([]);
  } finally { await state.close(); }
});

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`Sky preview keeps October 24 in 2026 when Sun leaves Libra at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 1000 });
    const state = await prepare(page, theme, true, 'sun', 'libra');
    try {
      await state.sources.getByRole('button', { name: 'Preview reader', exact: true }).click();
      const preview = page.getByRole('region', { name: 'Sky reader preview', exact: true });
      const reader = preview.frameLocator('iframe');
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.', { timeout: 60_000 });
      await preview.getByRole('button', { name: 'Draft', exact: true }).click();
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic pending revision final sentence.');
      await state.sources.getByLabel('Sky reader date').fill('2026-10-24');
      await expect(preview.getByText(/^Sun in Libra is not active on 2026-10-24\. Sun is in Scorpio/)).toBeVisible({ timeout: 60_000 });
      await expect(state.sources.getByLabel('Sky reader date')).toHaveValue('2026-10-24');
      await expect(state.sources.locator('p').filter({ hasText: /^Editing:/ })).toHaveText('Editing: Sun in Libra');
      await expect(state.sources.locator('p').filter({ hasText: /^Readers see:/ })).toContainText('Sun in Scorpio · 2026-10-24');
      await expect(state.sources.getByLabel('Active dated article')).toContainText('No published dated article is active on 2026-10-24.');
      await expect(state.sources.getByLabel('Pending revision')).toContainText('Revisions for Sun in Libra.');
      const readUrl = new URL((await state.sources.getByRole('link', { name: 'Read in Sky', exact: true }).getAttribute('href'))!, page.url());
      const csvUrl = new URL((await state.sources.getByRole('link', { name: 'Export what readers see', exact: true }).getAttribute('href'))!, page.url());
      expect(readUrl.search + readUrl.hash).toBe('?date=2026-10-24#/sky/placement/sun/scorpio');
      expect(csvUrl.search + csvUrl.hash).toBe('?date=2026-10-24&studioExport=sky-article-csv#/sky/placement/sun/scorpio');
      expect(readUrl.origin).toBe(new URL((await preview.locator('iframe').getAttribute('src'))!).origin);
      await expect(preview.locator('p').filter({ hasText: /^Reference:/ })).toContainText('2026-10-24T');
      await expect(preview.getByRole('region', { name: 'Sky publication impact' })).toContainText('For 2026-10-24, this revision is not selected because Sun is in Scorpio.');
      await expect(reader.getByRole('status').filter({ hasText: 'Draft preview · Revision not selected for this date' })).toBeVisible();
      await expect(reader.locator('.sky-detail-body').first()).not.toContainText('Synthetic pending revision');
      const outsideBody = (await reader.locator('.sky-detail-body').first().textContent())!;
      await preview.getByRole('button', { name: 'Published', exact: true }).click();
      await expect(reader.getByRole('status').filter({ hasText: 'Published reader preview' })).toBeVisible();
      await expect(reader.locator('.sky-detail-body').first()).toHaveText(outsideBody);
      await preview.screenshot({ path: `test-results/sky-preview-selected-date-${width}-${theme}.png` });
      await state.sources.getByLabel('Sky reader date').fill('2025-10-01');
      await expect(preview.locator('p').filter({ hasText: /^Reference:/ })).toContainText('2025-10-01T', { timeout: 60_000 });
      await expect(preview.getByText(/is not active on/)).toHaveCount(0);
      await expect(reader.locator('.sky-detail-body').first()).not.toContainText('Synthetic published');
      await state.sources.getByLabel('Sky reader date').fill('2026-10-21');
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.', { timeout: 60_000 });
      await preview.getByRole('button', { name: 'Draft', exact: true }).click();
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic pending revision final sentence.');
      await state.sources.getByLabel('Sky reader date').fill('2026-10-24');
      const link = preview.getByRole('link', { name: 'Read this date in Sky' });
      await expect(link).toHaveAttribute('href', /\?date=2026-10-24#\/sky\/placement\/sun\/scorpio$/, { timeout: 60_000 });
      const exportAction = state.sources.getByRole('link', { name: 'Export what readers see', exact: true });
      const downloaded = page.waitForEvent('popup').then(async popup => {
        const download = await popup.waitForEvent('download', { timeout: 90_000 });
        const csv = readerCsvCells(await readFile((await download.path())!, 'utf8'));
        await expect(popup.locator('.sky-detail-body').first()).toHaveText(outsideBody, { timeout: 60_000 });
        expect(csv.reference_instant).toContain('2026-10-24');
        expect(csv.reader_url).toContain('?date=2026-10-24#/sky/placement/sun/scorpio');
        expect(csv.body).not.toContain('Synthetic pending revision');
        for (const paragraph of await popup.locator('.sky-detail-body p').allInnerTexts()) expect(csv.body).toContain(paragraph.trim());
        await popup.close();
      });
      await exportAction.click();
      await downloaded;
      const readerHref = new URL((await link.getAttribute('href'))!, page.url()).href;
      expect(state.writes).toEqual([]);
      await page.goto(readerHref);
      await expect(page.locator('.sky-detail-body').first()).toHaveText(outsideBody, { timeout: 60_000 });
      await page.reload();
      await expect(page.locator('.sky-detail-body').first()).toHaveText(outsideBody);
      expect(state.writes).toEqual([]);
    } finally { await state.close(); }
  });
}

test('Sky reader preview also renders Sun and Moon placement articles', async ({ page }) => {
  test.setTimeout(180_000);
  const state = await prepare(page, 'dark', false);
  try {
    for (const [planet, sign] of [['sun', 'libra'], ['moon', 'aries']]) {
      await page.getByLabel('Sky placement planet or point').selectOption(planet);
      await page.getByLabel('Sky placement zodiac sign').selectOption(sign);
      await expect(state.sources.getByRole('button', { name: 'Preview reader', exact: true })).toBeEnabled();
      await state.sources.getByRole('button', { name: 'Preview reader', exact: true }).click();
      const preview = page.getByRole('region', { name: 'Sky reader preview', exact: true });
      const reader = preview.frameLocator('iframe');
      await expect(reader.locator('.sky-detail-article h1')).toBeVisible({ timeout: 60_000 });
      await expect(reader.locator('.sky-detail-body').first()).toBeVisible();
      await expect(preview.locator('p').filter({ hasText: /^Source used:/ })).toBeVisible();
      await preview.getByRole('button', { name: 'Close preview', exact: true }).click();
    }
    expect(state.writes).toEqual([]);
  } finally { await state.close(); }
});

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`dated article workspace keeps passage, values and reader together at ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 1000 });
    const state = await prepare(page, theme, 'active', 'sun', 'libra');
    try {
      await state.sources.getByLabel('Sky reader date').fill('2026-10-21');
      await state.sources.getByRole('button', { name: 'Edit active article', exact: true }).click();
      const editor = page.getByRole('dialog');
      const workspace = editor.getByLabel('Dated Sky article workspace', { exact: true });
      const copy = workspace.getByLabel('Sky article general copy', { exact: true });
      const preview = workspace.getByRole('region', { name: 'Sky reader preview', exact: true });
      const reader = preview.frameLocator('iframe');
      const comparison = preview.getByRole('status', { name: 'Reader wording comparison' });
      const assembly=workspace.getByLabel('Passage variable values');
      await expect(assembly).not.toHaveAttribute('open','');
      await expect(workspace.getByRole('button',{name:'Save draft',exact:true})).toBeVisible();
      await assembly.locator(':scope > summary').click();
      await expect(workspace.getByText('No variables in this field. Its complete wording is stored directly in the dated article.', { exact: true })).toBeVisible();
      await assembly.locator(':scope > summary').click();
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.', { timeout: 60_000 });
      await expect(comparison).toContainText('Reader wording unchanged');
      await expect(workspace.getByRole('status',{name:'Sky draft save status'})).toHaveText('Published copy unchanged.');
      await expectStudioPanel(workspace.locator('.studio-dated-passage'));
      await expectStudioPanel(workspace.locator('.studio-dated-reader'));
      await expectStudioPanel(comparison);
      await expectStudioReadingType(copy);
      await expectStudioReadingType(comparison.locator('p').first());
      await workspace.evaluate(node=>node.scrollIntoView({block:'start'}));
      await page.screenshot({path:`test-results/sky-readability-workspace-${width}-${theme}.png`});
      await workspace.locator('[data-dated-article-variables] > summary').click();
      const controls = workspace.locator('[data-dated-article-variables]');
      await controls.getByText('Original compilation values', { exact: true }).click();
      await controls.getByText('Overview Body · {{edition_overviewBody}}', { exact: true }).click();
      const template = state.fixture.edition.body.replace(state.fixture.edition.slotValues.overviewBody, '{{edition_overviewBody}}');
      await copy.evaluate((node: HTMLTextAreaElement, text: string) => { const start = node.value.indexOf(text); node.setSelectionRange(start, start + text.length); }, state.fixture.edition.slotValues.overviewBody);
      await controls.getByRole('button', { name: 'Insert original overviewBody', exact: true }).click();
      await expect(copy).toHaveValue(template);
      await expect(editor.getByText('Draft saved · Changes not published', { exact: true })).toBeVisible();
      await controls.locator(':scope > summary').click();
      await expect(comparison).toContainText('Reader wording unchanged');
      await expect(comparison).toContainText('Publishing saves variable sources only.');
      await assembly.locator(':scope > summary').click();
      const values = workspace.getByLabel('Passage variable values').getByText('Original saved writing', { exact: false });
      await expect(values).toContainText(state.fixture.edition.templateKey);
      await expect(workspace.locator('.studio-dated-passage')).toContainText('Synthetic published opening.');
      await expect(workspace.locator('.studio-dated-passage')).toContainText('Synthetic published final sentence.');
      await expectStudioReadingType(workspace.locator('.studio-variable-value').first());
      await preview.getByRole('button', { name: 'Draft', exact: true }).click();
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published opening.');
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic published final sentence.');
      await expect(reader.locator('.sky-detail-body').first()).not.toContainText('{{');
      const left = await workspace.locator('.studio-dated-passage').boundingBox();
      const right = await workspace.locator('.studio-dated-reader').boundingBox();
      if (width > 1000) expect(left!.x + left!.width).toBeLessThan(right!.x);
      else expect(left!.y + left!.height).toBeLessThan(right!.y);
      const typography = await workspace.evaluate(node => {
        const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign'];
        const style = (element: Element) => { const computed = getComputedStyle(element); return props.map(prop => computed[prop as keyof CSSStyleDeclaration]); };
        const source = [...node.querySelectorAll('[aria-label="Sky reader preview"] > p')].find(p => p.textContent?.startsWith('Source used:'))!;
        return { heading: style(node.querySelector('h4')!), copy: style(node.querySelector('[aria-label="Reader wording comparison"] p')!), source: style(source) };
      });
      expect(typography.copy).toEqual(typography.source);
      const heading = editor.getByRole('heading', { name: 'Reader sources', exact: true });
      expect(await heading.evaluate(node => { const s = getComputedStyle(node); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing, s.textTransform, s.textAlign]; })).toEqual(typography.heading);
      await expect(editor.getByRole('heading', { name: 'Sky reader preview' })).toHaveJSProperty('tagName', 'H4');
      await expect(editor.getByRole('heading', { name: 'Reader sources' })).toHaveJSProperty('tagName', 'H3');
      await workspace.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/dated-workspace-${width}-${theme}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await editor.getByRole('button', { name: 'Done', exact: true }).click();
      await page.reload();
      await page.getByLabel('Sky placement planet or point').selectOption('sun');
      await page.getByLabel('Sky placement zodiac sign').selectOption('libra');
      const savedVisit = page.getByRole('region', { name: 'Saved visits', exact: true });
      await savedVisit.getByRole('button', { name: 'Open saved draft', exact: true }).click();
      await expect(copy).toHaveValue(template);
      await expect(comparison).toContainText('Reader wording unchanged');
      await preview.getByRole('button', { name: 'Draft', exact: true }).click();
      await copy.fill('Synthetic changed opening. Synthetic changed final sentence.');
      await expect(comparison).toContainText('Reader wording changed');
      await expect(comparison).not.toContainText('Reader wording unchanged');
      await expect(reader.locator('.sky-detail-body').first()).toContainText('Synthetic changed final sentence.');
      await copy.fill('{{unknownFixtureVariable}}');
      await expect(preview.getByRole('button', { name: 'Draft', exact: true })).toBeDisabled();
      await expect(preview.getByRole('alert')).toContainText('needs a complete value');
      await expect(comparison).toHaveCount(0);
      await copy.fill(template);
      await expect(editor.getByText('Draft saved · Changes not published', { exact: true })).toBeVisible();
      await expect(comparison).toContainText('Reader wording unchanged');
      if (width === 1440 && theme === 'light') {
        state.failReader(true);
        await preview.getByRole('button', { name: 'Refresh preview', exact: true }).click();
        await expect(preview.getByRole('alert')).toBeVisible({ timeout: 60_000 });
        await expect(comparison).toHaveCount(0);
        state.failReader(false);
        await preview.getByRole('button', { name: 'Refresh preview', exact: true }).click();
        await expect(comparison).toContainText('Reader wording unchanged', { timeout: 60_000 });
      }
      await state.sources.getByLabel('Sky reader date').fill('2026-10-24');
      await expect(preview.locator('p').filter({ hasText: /^Source used:/ })).toContainText('Scorpio', { timeout: 60_000 });
      await expect(comparison).toHaveCount(0);
      expect((await state.store.call({ method: 'rows' })).find((row: any) => row.id === state.fixture.active.id).body).toBe(state.fixture.active.body);
    } finally { await state.close(); }
  });
}
