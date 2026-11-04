import { expect, test } from '@playwright/test';
import { compileSkyArticleEdition, reviseSkyArticleEdition, skyArticleEditableFields } from '../../apps/web/src/content/skyArticleTemplateCompiler';
import { SKY_INGRESS_ESSAY_FORMAT, skyIngressEssayFields } from '../../apps/web/src/content/skyIngressEssay.mjs';
import { readerResponse } from '../helpers/reader-response';
import { compiledReaderFixture, compiledReaderRow } from '../helpers/sky-saved-template-reader-fixtures.mts';
import { skyArticlePublicationStore } from '../helpers/sky-article-publication-store.mts';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';
import { projectReaderRow } from '../../apps/web/src/content/readerRowProjection.mjs';


for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
 test(`approved ingress edition preserves the complete reader article after reload ${width} ${theme}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-10-09T12:00:00Z'));
  const slots = Object.fromEntries(skyIngressEssayFields.map(({ name }) => [name, `Synthetic ${name}.`]));
  Object.assign(slots, { articleTitle: 'Libra Season 2026', when: 'Synthetic calculated date field.',
   overviewHeading: 'Overview', overviewBody: 'Synthetic complete ingress opening.\n\nSynthetic overview final sentence.',
   majorTransitSections: '## Synthetic transit\n\nSynthetic transit opening.\n\nSynthetic transit final sentence.',
   priorOccurrenceSection: '', otherDatesSection: '', closingHeading: 'Synthetic close',
   closingBody: 'Synthetic close opening.\n\nSynthetic complete ingress final sentence.' });
  const edition = await compileSkyArticleEdition({ format: 'ingress-essay-v2', planet: 'sun', sign: 'libra', entryYear: 2026,
   validFrom: '2026-09-22', validTo: '2026-10-23', transitStartInstant: '2026-09-23T00:05:14Z', transitEndInstant: '2026-10-23T09:37:57Z',
   referenceTimeZone: 'America/New_York', templateKey: 'sky/article-template/sun/libra', templateBody: '',
   tldr: 'Synthetic explicit ingress summary.', slotValues: slots, housePassages: [] });
  const row = { id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', content_key: edition.contentKey, surface: 'sky', mode: 'article',
   status: 'LIVE', lane: 'serving', review_state: null, event_type: 'sky-article-edition', block_type: 'sky_article',
   updated_at: '2026-10-09T00:00:00Z', headline: edition.headline, body: edition.body, summary: edition.tldr,
   sections: { skyArticleEdition: edition }, source_snapshot: { ownerApproval: {
    approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey, templateKey: edition.templateKey,
    templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash
   } } };
  const publications = [{ content_key: row.content_key, state: 'live', revision: 1, row_id: row.id,
   row_updated_at: row.updated_at, updated_at: row.updated_at }];
  await page.addInitScript(theme => {
   localStorage.setItem('tldrastro:theme', theme);
   localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
  }, theme);
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
   schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0
  } }));
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/content-publications', route => route.fulfill({ json: { schema: 'tldr-publications/v1', publications } }));
  let exactEditionRequests = 0;
  let editionUnavailable = width === 390 && theme === 'light';
  await page.route('**/api/content-reader', route => {
   const query = route.request().postDataJSON();
   // Never hand the article to unrelated aspect/package requests. Its key
   // must be discovered from the publication ledger and explicitly fetched.
   const requested = query.keys?.includes(row.content_key) === true;
   if (requested) exactEditionRequests++;
   if (requested && editionUnavailable) return route.fulfill({ status: 503, json: { error: 'Synthetic published edition unavailable.' } });
   return route.fulfill({ json: readerResponse(requested ? [row] : [], publications) });
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?date=2026-10-09#sky');
  const sunCard = page.getByRole('list', { name: 'Daily planetary placements' })
   .getByRole('button', { name: 'Read more about Sun in Libra', exact: true });
  if (editionUnavailable) {
   await expect(page.getByText('The placement readings could not load. Please try again.', { exact: true })).toBeVisible({ timeout: 60_000 });
   await expect(sunCard).not.toContainText('Synthetic explicit ingress summary.');
   editionUnavailable = false;
   await page.getByRole('button', { name: 'Try again', exact: true }).click();
  }
  await expect(sunCard).toContainText('Synthetic explicit ingress summary.', { timeout: 60_000 });
  if (width === 1440 && theme === 'light') {
   await page.getByRole('button', { name: 'Calendar', exact: true }).click();
   await expect(page.getByRole('article', { name: 'Selected lunar day', exact: true })).toBeVisible({ timeout: 60_000 });
   editionUnavailable = true;
   await page.getByRole('button', { name: 'Sky', exact: true }).click();
   await expect(page.getByText('The placement readings could not load. Please try again.', { exact: true })).toBeVisible({ timeout: 60_000 });
   await expect(sunCard).not.toContainText('Synthetic explicit ingress summary.');
   editionUnavailable = false;
   await page.getByRole('button', { name: 'Try again', exact: true }).click();
   await expect(sunCard).toContainText('Synthetic explicit ingress summary.', { timeout: 60_000 });
  }
  await sunCard.click();
  const article = page.locator('.sky-detail-article').first();
  const assertComplete = async () => {
   await expect(article).toContainText('Synthetic complete ingress opening.', { timeout: 60_000 });
   await expect(article).toContainText('Synthetic complete ingress final sentence.');
   await expect(article).toContainText('Synthetic transit final sentence.');
   await expect(article.getByRole('heading', { name: 'Libra Season 2026', exact: true })).toBeVisible();
   await expect(article.getByRole('heading', { name: 'Overview', exact: true })).toHaveCount(0);
   await expect(article.getByRole('heading', { name: 'Synthetic transit', exact: true })).toHaveCount(1);
   await expect(article.getByRole('heading', { name: 'Synthetic close', exact: true })).toHaveCount(1);
   const headings = await article.locator('h1, h2, h3, h4, h5, h6').allTextContents();
   expect(headings.indexOf('Libra Season 2026')).toBeLessThan(headings.indexOf('Synthetic transit'));
   expect(headings.indexOf('Synthetic transit')).toBeLessThan(headings.indexOf('Synthetic close'));
   const headingStyles = await article.locator('.sky-detail-section h2').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node);
    return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
   }));
   expect(headingStyles.length).toBeGreaterThanOrEqual(3);
   for (const style of headingStyles) expect(style).toEqual(headingStyles[0]);
   await expect(article).not.toContainText('priorOccurrenceSection');
  };
  await assertComplete();
  expect(exactEditionRequests).toBeGreaterThan(0);
  const beforeReload = exactEditionRequests;
  await page.reload();
  await assertComplete();
  expect(exactEditionRequests).toBeGreaterThan(beforeReload);
  if (width === 1440 && theme === 'dark') {
   // An already-open reader must follow a publication made in another Studio
   // tab. Draft notices revalidate but must keep the current published copy.
   const studio = await page.context().newPage();
   // Keep the notifier on this origin without mounting a second unmocked
   // reader that could install the checkout's unrelated offline ledger.
   await studio.route('**/studio-notifier', route => route.fulfill({ contentType: 'text/html', body: '<title>Synthetic Studio notifier</title>' }));
   await studio.goto('/studio-notifier');
   const announce = async (published: boolean) => studio.evaluate(({ key, published }) => {
    localStorage.setItem('tldrastro:content-update', JSON.stringify({
     contentKey: key, published, updatedAt: new Date().toISOString()
    }));
   }, { key: row.content_key, published });
   await announce(false);
   await assertComplete();
   await expect(article).toContainText('Synthetic explicit ingress summary.');
   const revised = await compileSkyArticleEdition({ ...edition, templateBody: '',
    tldr: 'Synthetic newly published summary. Complete published final sentence.',
    slotValues: { ...slots, overviewBody: 'Synthetic newly published opening.\n\nSynthetic newly published ending.' }
   });
   Object.assign(row, { summary: revised.tldr, body: revised.body,
    updated_at: '2026-10-09T13:00:00Z', sections: { skyArticleEdition: revised },
    source_snapshot: { ownerApproval: { ...row.source_snapshot.ownerApproval,
     fixedProseHash: revised.fixedProseHash, compiledHash: revised.compiledHash } } });
   Object.assign(publications[0], { revision: 2, row_updated_at: row.updated_at, updated_at: row.updated_at });
   await announce(true);
   await expect(article).toContainText('Synthetic newly published opening.', { timeout: 60_000 });
   await expect(article).toContainText('Synthetic newly published ending.');
   await expect(article).toContainText(revised.tldr);
   await page.getByRole('button', { name: 'Sky', exact: true }).click();
   await expect(sunCard).toContainText(revised.tldr, { timeout: 60_000 });
   await expect(sunCard).not.toContainText('Synthetic explicit ingress summary.');
   await page.reload();
   await expect(sunCard).toContainText(revised.tldr, { timeout: 60_000 });
   const ledgerOnly = await compileSkyArticleEdition({ ...revised, templateBody: '',
    tldr: 'Synthetic ledger-only published summary.',
    slotValues: { ...slots, overviewBody: 'Synthetic ledger-only opening.\n\nSynthetic ledger-only ending.' }
   });
   Object.assign(row, { summary: ledgerOnly.tldr, body: ledgerOnly.body,
    updated_at: '2026-10-09T14:00:00Z', sections: { skyArticleEdition: ledgerOnly },
    source_snapshot: { ownerApproval: { ...row.source_snapshot.ownerApproval,
     fixedProseHash: ledgerOnly.fixedProseHash, compiledHash: ledgerOnly.compiledHash } } });
   Object.assign(publications[0], { revision: 3, row_updated_at: row.updated_at, updated_at: row.updated_at });
   // A second reader may learn the ledger without an explicit Studio notice.
   // Its storage update must invalidate this just-reloaded (<30s) reader too.
   await studio.evaluate(records => localStorage.setItem('tldrastro:content-publications:v1', JSON.stringify(records)), publications);
   await expect(sunCard).toContainText(ledgerOnly.tldr, { timeout: 60_000 });
   await sunCard.click();
   await expect(article).toContainText('Synthetic ledger-only opening.', { timeout: 60_000 });
   await expect(article).toContainText('Synthetic ledger-only ending.');
   Object.assign(publications[0], { state: 'retired', revision: 4 });
   await announce(false);
   await expect(page.locator('body')).not.toContainText('Synthetic ledger-only opening.', { timeout: 60_000 });
   await expect(page.locator('body')).not.toContainText(ledgerOnly.tldr);
   await page.getByRole('button', { name: 'Sky', exact: true }).click();
   await expect(sunCard).not.toContainText(ledgerOnly.tldr);
   await studio.close();
  }
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/sky-ingress-reader-${width}-${theme}.png`, fullPage: true });
 });
}

// Focused legacy ingress regression: the signed compilation owns presentation.
const legacyIngressFixtureOrigin = process.env.STUDIO_DEPLOYED_FIXTURE_ORIGIN
  ?? process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test';
const legacyIngressTest = test.extend({
  context: async ({ context, baseURL }, use, info) => {
    const origin = new URL(baseURL!).origin;
    const network = await installSyntheticNetworkGuard(context, origin, {
      deployedFixture: { supabaseOrigin: legacyIngressFixtureOrigin }
    });
    await context.route('**/content-studio-last-known-good.json', async route => {
      expect(route.request().method()).toBe('GET');
      expect(new URL(route.request().url()).origin).toBe(origin);
      await route.fulfill({ json: { schema: 'content-studio-last-known-good-v2', rowCount: 0, rows: [], publications: [] } });
    });
    try { await use(context); }
    finally {
      await Promise.all(context.pages().map(page => page.close()));
      await network.finishStaticFonts();
      await info.attach('strict-network-ledger', { contentType: 'application/json',
        body: JSON.stringify({ unhandledExternal: network.unhandledExternal,
          syntheticRealtimeRequests: network.syntheticRealtimeRequests, staticFontRequests: network.staticFontRequests }) });
      expect(network.unhandledExternal).toEqual([]);
    }
  }
});

const legacyIngressCases = [
  { name: 'active-current-article', width: 1440, theme: 'light', date: '2026-11-01', active: true, raw: false, fault: false },
  { name: 'historical-list-and-selection', width: 390, theme: 'dark', date: '1901-11-01', active: false, raw: false, fault: false },
  { name: 'retained-legacy-row-label-exclusion', width: 390, theme: 'dark', date: '2026-11-01', active: true, raw: true, fault: false },
  { name: 'required-publication-failure-and-retry', width: 1440, theme: 'light', date: '2026-11-01', active: true, raw: false, fault: true }
];
for (const scenario of legacyIngressCases) legacyIngressTest(scenario.name, async ({ page, context, baseURL }) => {
  const imported = await compiledReaderFixture({ format: SKY_INGRESS_ESSAY_FORMAT,
    planet: 'mercury', sign: 'scorpio', entryYear: 2026, validFrom: '2026-09-30', validTo: '2026-11-13',
    transitStartInstant: '2026-09-30T00:00:00.000Z', transitEndInstant: '2026-11-13T00:00:00.000Z',
    slotValues: Object.fromEntries(skyIngressEssayFields.map(({ name }) => [name, `Synthetic complete ${name}.`])),
    housePassages: [], aspectPassages: [] });
  const edition = await reviseSkyArticleEdition(imported, { ...skyArticleEditableFields(imported),
    headline: 'Synthetic approved Mercury article',
    body: 'Synthetic complete ingress opening.\n\nSynthetic complete ingress final paragraph.' });
  const legacy = structuredClone(edition);
  legacy.articleSections[0].heading = 'UNSIGNED_LEGACY_LABEL';
  const row = { ...compiledReaderRow(legacy), target_date: null, facts: {}, flags: [] };
  const store = await skyArticlePublicationStore([row]);
  const origin = new URL(baseURL!).origin;
  const service = legacyIngressFixtureOrigin;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let omitRequired = scenario.fault, exactReads = 0, rawResponses = 0, omittedResponses = 0;
  try {
    const stored = (await store.db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [row.id])).rows[0].row as any;
    const rawPublic = projectReaderRow(stored)!;
    const originalStored = JSON.stringify(stored);
    await page.setViewportSize({ width: scenario.width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-11-03T12:00:00.000Z'));
    await context.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    }, scenario.theme);
    await context.route('**/api/**', async route => {
      const message = 'Unexpected fixture API: ' + route.request().method() + ' ' + new URL(route.request().url()).pathname;
      await route.fulfill({ status: 501, json: { error: message } });
      throw new Error(message);
    });
    await context.route('**/rest/v1/**', async route => {
      const request = route.request(), url = new URL(request.url());
      expect(url.origin).toBe(service);
      if (url.pathname === '/rest/v1/content_publications') {
        expect(request.method()).toBe('GET');
        return route.fulfill({ json: await store.anonymousPublications(url.searchParams) });
      }
      expect(url.pathname).toBe('/rest/v1/rpc/content_runtime_revision');
      expect(request.method()).toBe('POST'); expect(url.search).toBe('');
      const body = request.postDataJSON(); expect(Object.keys(body)).toEqual(['p_provider']);
      return route.fulfill({ json: await store.anonymousRuntimeRevision(body.p_provider) });
    });
    await context.route(/\/api\/(?:sky|sky-reader|calendar)\?/u, async route => {
      const request = route.request(), url = new URL(request.url());
      expect(request.method()).toBe('GET'); expect(url.origin).toBe(origin);
      const result = await store.invoke(`${url.pathname}${url.search}` as any);
      const { status, headers, ...payload } = result; expect(status).toBe(200);
      // Exercise the ordinary source gate that failed natively, not an optional prefill.
      if (url.pathname === '/api/sky-reader') payload.initialReader = null;
      await route.fulfill({ status, headers, json: payload });
    });
    await context.route('**/api/content-publications*', async route => {
      const url = new URL(route.request().url()); expect(url.origin).toBe(origin);
      expect(route.request().method()).toBe('GET');
      const { status, headers, ...payload } = await store.invoke(`/api/content-publications${url.search}`);
      await route.fulfill({ status, headers, json: payload });
    });
    await context.route('**/api/content-reader', async route => {
      expect(route.request().method()).toBe('POST'); expect(new URL(route.request().url()).origin).toBe(origin);
      const query = route.request().postDataJSON();
      if (query.keys?.includes(edition.contentKey)) exactReads++;
      const { status, headers, ...payload } = await store.invoke('/api/content-reader', query);
      if (scenario.raw) payload.rows = payload.rows.map((item: any) => {
        if (item.content_key !== edition.contentKey) return item;
        rawResponses++; return rawPublic; // Controlled pre-projection retained-row compatibility.
      });
      if (omitRequired) payload.rows = payload.rows.filter((item: any) => {
        if (item.content_key !== edition.contentKey) return true;
        omittedResponses++; return false; // Explicit successful-empty-response fault injection.
      });
      await route.fulfill({ status, headers, json: payload });
    });
    await page.goto(`/?date=${scenario.date}#sky`);
    const failure = page.getByText('The placement readings could not load. Please try again.', { exact: true });
    if (scenario.fault) {
      await expect(failure).toBeVisible(); expect(omittedResponses).toBeGreaterThan(0);
      await expect(page.locator('body')).not.toContainText(edition.headline);
      await expect(page.locator('body')).not.toContainText('Synthetic complete ingress opening.');
      omitRequired = false;
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
    }
    const placements = page.getByRole('list', { name: 'Daily planetary placements' });
    const mercury = placements.getByRole('button', { name: /Read more about Mercury.*Scorpio/u });
    await expect(mercury).toBeVisible(); await expect(failure).toHaveCount(0);
    if (scenario.active) await expect(mercury).toContainText(edition.tldr);
    else await expect(mercury).not.toContainText(edition.tldr);
    await mercury.click();
    const detail = page.locator('.sky-detail-article').first();
    const assertReading = async () => {
      await expect(detail).toBeVisible();
      if (scenario.active) {
        await expect(detail).toContainText('Synthetic complete ingress opening.');
        await expect(detail).toContainText('Synthetic complete ingress final paragraph.');
        await expect(detail.getByRole('heading', { name: edition.headline, exact: true })).toHaveCount(1);
      } else {
        await expect(detail).not.toContainText(edition.headline);
        await expect(detail).not.toContainText('Synthetic complete ingress opening.');
        await expect(detail.locator('.sky-rising-horoscope')).toHaveCount(12);
      }
      await expect(page.locator('body')).not.toContainText('UNSIGNED_LEGACY_LABEL');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await assertReading();
    await page.getByRole('button', { name: 'Close detail', exact: true }).click();
    await expect(mercury).toBeVisible(); await expect(failure).toHaveCount(0);
    await mercury.click(); await assertReading();
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-transition'));
    await page.screenshot({ path: `test-results/sky-ingress-compat-rehearsal/${scenario.name}.png` });
    const after = (await store.db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [row.id])).rows[0].row;
    expect(JSON.stringify(after)).toBe(originalStored);
    expect(exactReads).toBeGreaterThan(0); if (scenario.raw) expect(rawResponses).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    await test.info().attach('fixture-reading-proof', { contentType: 'application/json', body: JSON.stringify({
      exactReads, rawResponses, omittedResponses, sourceStoredUnchanged: true, originalCompiledHash: edition.compiledHash,
      sourceBody: edition.body, activeEditionExpected: scenario.active }) });
  } finally {
    await Promise.all(context.pages().map(page => page.close()));
    await store.close();
  }
});
