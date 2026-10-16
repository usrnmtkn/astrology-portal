import { readerResponse } from '../helpers/reader-response';
import { expect, test, type Page } from '@playwright/test';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
import { readFileSync } from 'node:fs';
import skyHandler from '../../api/sky';

const key = 'sky-placement/article/sun/virgo';
const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const baseline = skyPlacementSourceRecords.get(key)!;
const firstCopy = 'Fixture published Sun passage. The same complete passage stays visible while sources refresh.';
const secondCopy = 'Fixture revised Sun passage. Only an explicitly published revision replaces the passage.';

async function observe(page: Page, theme: string) {
  await page.addInitScript(theme => {
    localStorage.setItem('tldrastro:theme', theme);
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    (window as any).__readingStates = [];
    const sample = () => {
      const card = [...document.querySelectorAll('.planet-placement-row--sky')].find(el => el.querySelector('.planet-placement-row__title')?.textContent === 'Sun in Virgo');
      const article = document.querySelector('.article-body-inner');
      const state = {
        card: card?.querySelector('.planet-placement-row__description')?.textContent?.trim() ?? '',
        article: article?.getClientRects().length ? article.textContent?.trim() ?? '' : '',
        title: document.querySelector('#sky-detail-title')?.textContent ?? ''
      };
      const states = (window as any).__readingStates;
      if (JSON.stringify(state) !== JSON.stringify(states.at(-1))) states.push(state);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, theme);
}

async function installSources(page: Page, includeCore = false) {
  let revision = 1;
  let retired = false;
  let unavailable = false;
  const timestamp = () => `2026-09-13T12:0${revision}:00.123456Z`;
  const core = includeCore ? structuredClone(JSON.parse(readFileSync('apps/web/public/content-studio-last-known-good.json', 'utf8'))
    .rows.find((row:any) => row.content_key === 'authored/station/mercury/rx')) : null;
  if (core) {
    core.updated_at = timestamp();
    core.body = core.sections.packageRecord.body = 'Synthetic complete shared station passage.';
    core.headline = core.sections.packageRecord.headline = 'Synthetic shared station';
  }
  const publications = () => [{ content_key: '__content-publication-ledger/v1', state: 'live', revision: 1,
    row_id: null, row_updated_at: null, updated_at: timestamp() }, { content_key: key, state: retired ? 'retired' : 'live', revision,
    row_id: id, row_updated_at: timestamp(), updated_at: timestamp() }, ...(core ? [{
      content_key: core.content_key, state: 'live', revision: 1, row_id: core.id,
      row_updated_at: core.updated_at, updated_at: core.updated_at
    }] : [])];
  const row = () => ({
    id, content_key: key, surface: 'sky', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null,
    target_date: null, provider: 'tldrastro-fallback-architecture-v3', updated_at: timestamp(),
    headline: baseline.headline, summary: '', body: baseline.body_you,
    sections: { packageRecord: { ...baseline, tldrWhat: '', tldrTakeaway: '',
      placementArticle: '', placementArticleDirect: revision === 1 ? firstCopy : secondCopy,
      studio_version_status: 'approved-serving-revision' } },
    facts: { fallbackArchitectureV3: true },
    source_snapshot: { sourcePackage: baseline.source_package, content_role: baseline.content_role },
    block_type: 'fallback_hook', event_type: 'fallback-hook'
  });
  // A failed fixture request must not install unrelated production publication
  // identities from the checked-in nightly snapshot before Retry is exercised.
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({
    json: { schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 }
  }));
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/content_publications')) {
      await new Promise(resolve => setTimeout(resolve, 250));
      return route.fulfill({ json: publications() });
    }
    if (url.pathname.endsWith('/content_runtime_revision')) return route.fulfill({ json: timestamp() });
    return route.fulfill({ json: [] });
  });
  await page.route('**/api/content-reader', async route => {
    const query = route.request().postDataJSON();
    await new Promise(resolve => setTimeout(resolve, 1800));
    if (unavailable) return route.fulfill({ status: 503, json: { message: 'Fixture source unavailable' } });
    const matches = !query.scope && ((!query.keys && !query.ids) || query.keys?.includes(key) || query.ids?.includes(id));
    const responseRows = [...(matches && !retired ? [row()] : []),
      ...(core && (query.scope === 'sky-article' || query.keys?.includes(core.content_key)) ? [core] : [])];
    const responseKeys = new Set(query.keys ?? responseRows.map(row => row.content_key));
    return route.fulfill({ json: readerResponse(responseRows, publications().filter(publication =>
      publication.content_key === '__content-publication-ledger/v1' || responseKeys.has(publication.content_key))) });
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  const notify = () => page.evaluate(key => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
    detail: { contentKey: key, published: true, updatedAt: new Date(Date.now() + ((window as any).__noticeSequence = ((window as any).__noticeSequence ?? 0) + 1)).toISOString() }
  })), key);
  return { notify,
    publish: async () => { revision++; await notify(); },
    retire: async () => { retired = true; revision++; await notify(); },
    fail: () => { unavailable = true; },
    recover: () => { unavailable = false; }
  };
}

for (const width of [390, 1440]) test(`cold guest selected and aspect transport overlaps the complete ledger ${width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-13T15:00:00Z'));
  await observe(page, 'light');
  await installSources(page, true);
  let release!: () => void;
  const ledger = new Promise<void>(resolve => { release = resolve; });
  let held = false;
  await page.route('**/rest/v1/content_publications*', async route => {
    held = true; await ledger; await route.fallback();
  });
  const requests: any[] = [], errors: string[] = [], aborted: number[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/content-reader') requests.push(request.postDataJSON()); });
  page.on('requestfailed', request => {
    if (new URL(request.url()).pathname === '/api/content-reader') aborted.push(request.postDataJSON()?.keys?.length ?? 0);
  });
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('/?date=2026-09-13#sky/placement/sun/virgo');
    await expect.poll(() => held).toBe(true);
    await expect.poll(() => requests.some(query => query.keys?.includes(key) && !query.ids)).toBe(true);
    await expect.poll(() => requests.some(query => query.keys?.some((key: string) => key.startsWith('sky.aspect.')))).toBe(true);
    expect(await page.locator('.sky-detail-article .article-body-inner').count()).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('tldrastro:sky-publication-rows:v2'))).toBeNull();
    const candidates = requests.filter(query => query.keys?.some((key: string) => key.startsWith('sky.aspect.')));
    expect(candidates).toHaveLength(1);
    expect(candidates[0].keys.length).toBeLessThanOrEqual(50);
    release();
    const article = page.locator('.sky-detail-article .article-body-inner').first();
    await expect(article).toContainText(firstCopy, { timeout: 60_000 });
    expect(aborted, 'The first complete ledger must preserve the in-flight candidate read').toEqual([]);
    expect(requests.filter(query => query.ids?.includes(id))).toHaveLength(0);
    const selected = await page.evaluate(() => JSON.parse(localStorage.getItem('tldrastro:sky-publication-rows:v2') ?? '[]'));
    expect(selected.filter((row: any) => row.id === id)).toHaveLength(1);
    expect(errors).toEqual([]);
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
});

for (const width of [390, 1440]) test(`cold article sources overlap revision without an early passage ${width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-13T15:00:00Z'));
  await observe(page, 'light');
  await installSources(page, true);
  let releaseRevision!: () => void;
  const revisionGate = new Promise<void>(resolve => { releaseRevision = resolve; });
  let revisionHeld = false, articleRowsStarted = false, manifestStarted = false, articleReads = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/content-reader') {
      if (request.postDataJSON()?.scope === 'sky-article') { articleRowsStarted = true; articleReads++; }
    }
    manifestStarted ||= /\/assets\/fallback-content-manifest-[^/]+\.js$/u.test(new URL(request.url()).pathname);
  });
  await page.route('**/rest/v1/rpc/content_runtime_revision', async route => {
    revisionHeld = true;
    await revisionGate;
    // A provider revision newer than this scope's row version exercises the
    // conservative first warm revalidation, not only the immediate cache hit.
    await route.fulfill({ json: '2026-09-14T12:01:00.123456Z' });
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('/?date=2026-09-13#sky/placement/sun/virgo');
    await expect.poll(() => revisionHeld).toBe(true);
    await expect.poll(() => articleRowsStarted).toBe(true);
    await expect.poll(() => manifestStarted).toBe(true);
    expect(await page.locator('.sky-detail-article .article-body-inner').count()).toBe(0);
    releaseRevision();
    const article = page.locator('.sky-detail-article .article-body-inner').first();
    await expect(article).toContainText(firstCopy, { timeout: 60_000 });
    const coreCache = () => page.evaluate(() => {
      const cache = JSON.parse(localStorage.getItem('tldrastro:fallbackArchitectureV3:dashboardBundle:sky-article') ?? 'null');
      return { version: cache?.dashboardVersion ?? null,
        admitted: cache?.bundle?.transitLib?.authoredCards?.some((row:any) => row.contentKey === 'authored/station/mercury/rx') ?? false };
    });
    await expect.poll(coreCache).toEqual({ version: Date.parse('2026-09-13T12:01:00.123456Z'), admitted: true });
    await page.waitForTimeout(500);
    const states = await page.evaluate(() => (window as any).__readingStates);
    expect([...new Set(states.map((state:any) => state.article).filter(Boolean))]).toHaveLength(1);
    const reopenEvidence: Array<{ attempt:number; elapsedMs:number; articleReads:number }> = [];
    for (const attempt of [1, 2]) {
      await page.getByRole('button', { name: 'Close detail', exact: true }).click();
      await expect(article).toHaveCount(0);
      await page.evaluate(() => { (window as any).__readingStates = []; });
      const started = Date.now(), beforeReads = articleReads;
      await page.getByRole('button', { name: 'Read more about Sun in Virgo', exact: true }).click();
      await expect(article).toContainText(firstCopy, { timeout: 60_000 });
      const elapsedMs = Date.now() - started;
      await page.waitForTimeout(2200);
      await expect.poll(coreCache).toEqual({ version: Date.parse('2026-09-14T12:01:00.123456Z'), admitted: true });
      reopenEvidence.push({ attempt, elapsedMs, articleReads: articleReads - beforeReads });
      expect(articleReads - beforeReads).toBe(attempt === 1 ? 1 : 0);
      const reopenedStates = await page.evaluate(() => (window as any).__readingStates);
      expect([...new Set(reopenedStates.map((state:any) => state.article).filter(Boolean))]).toHaveLength(1);
    }
    console.log(JSON.stringify({ fixtureOnlyReopens: width, evidence: reopenEvidence }));
    await page.reload();
    await expect(article).toContainText(firstCopy, { timeout: 60_000 });
    expect(errors).toEqual([]);
  } finally {
    releaseRevision();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`placement publishes one resolved passage on cold load, refresh and navigation ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-09-13T15:00:00Z'));
    await observe(page, theme);
    const sources = await installSources(page);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?date=2026-09-13#sky');
    const card = page.locator('.planet-placement-row--sky').filter({ has: page.getByText('Sun in Virgo', { exact: true }) });
    const prose = card.locator('.planet-placement-row__description');
    await expect(prose).toContainText(firstCopy, { timeout: 60_000 });
    await page.waitForTimeout(2500);
    let states = await page.evaluate(() => (window as any).__readingStates);
    expect([...new Set(states.map((s: any) => s.card).filter(Boolean))]).toEqual([firstCopy]);
    const box = await prose.boundingBox();
    await sources.notify();
    await page.waitForTimeout(4000);
    expect(await prose.boundingBox()).toEqual(box);
    states = await page.evaluate(() => (window as any).__readingStates);
    const start = states.findIndex((s: any) => s.card === firstCopy);
    expect(states.slice(start).every((s: any) => s.card === firstCopy)).toBe(true);
    await card.click();
    const article = page.locator('.sky-detail-article .article-body-inner').first();
    await expect(article).toContainText(firstCopy, { timeout: 60_000 });
    await page.waitForTimeout(2500);
    states = await page.evaluate(() => (window as any).__readingStates);
    const bodies = [...new Set<string>(states.map((s: any) => s.article).filter(Boolean))];
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain(firstCopy);
    await page.screenshot({ path: `test-results/sky-placement-resolved-${width}-${theme}.png` });
    await page.reload();
    await expect(article).toContainText(firstCopy, { timeout: 60_000 });
    await page.waitForTimeout(2500);
    states = await page.evaluate(() => (window as any).__readingStates);
    expect([...new Set(states.map((s: any) => s.article).filter(Boolean))]).toHaveLength(1);
    expect(states.filter((s: any) => s.article).every((s: any) => s.article.includes(firstCopy))).toBe(true);
    await sources.publish();
    await expect(article).toContainText(secondCopy, { timeout: 60_000 });
    await expect(article).not.toContainText(firstCopy);
    await sources.retire();
    await expect(article).toHaveCount(0, { timeout: 60_000 });
    await expect(page.locator('.sky-detail-article')).not.toContainText(secondCopy);
    expect(errors).toEqual([]);
  });
}

test('known live placement failure shows retry rather than another authored version', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-09-13T15:00:00Z'));
  await observe(page, 'light');
  const sources = await installSources(page);
  sources.fail();
  await page.goto('/?date=2026-09-13#sky/placement/sun/virgo');
  await expect(page.getByText('The placement reading could not load. Please try again.')).toBeVisible({ timeout: 60_000 });
  expect(await page.locator('.sky-detail-article .article-body-inner').first().count()).toBe(0);
  sources.recover();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.sky-detail-article .article-body-inner').first()).toContainText(firstCopy, { timeout: 60_000 });
  const states = await page.evaluate(() => (window as any).__readingStates);
  expect(states.filter((s: any) => s.article).every((s: any) => s.article.includes(firstCopy))).toBe(true);
});


for (const width of [390, 1440]) test(`WASM initialization failure recovers through article Retry ${width}`, async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-13T15:00:00Z'));
  await observe(page, 'light');
  await installSources(page);
  let failAsset = true, failedFetches = 0, restoredFetches = 0;
  let stage = 'failed';
  const errors: Array<{ stage: string; kind: string; message: string; url?: string }> = [];
  page.on('pageerror', error => errors.push({ stage, kind: 'pageerror', message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') errors.push({ stage, kind: 'console', message: message.text(), url: message.location().url });
  });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const evidence = (window as any).__swissRetry = { workers: 0, responses: [] as boolean[], fatal: [] as string[] };
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        evidence.workers++;
        this.addEventListener('message', event => evidence.responses.push(event.data.ok));
        this.addEventListener('error', event => evidence.fatal.push(event.message));
      }
    };
  });
  await context.route(/\/wasm\/.*\.wasm(?:\?.*)?$/u, async route => {
    if (failAsset) {
      failedFetches++;
      return route.fulfill({ status: 503, headers: { 'Cache-Control': 'no-store' }, body: 'Synthetic transient WASM transport failure' });
    }
    restoredFetches++;
    return route.continue();
  });
  // Keep the full-Sky path healthy with the actual local handler, so the visible
  // Retry belongs to article preparation rather than a different API failure.
  await page.route('**/api/sky?**', async route => {
    let body = '', status = 200;
    await skyHandler({ method: 'GET', url: route.request().url() } as any, {
      statusCode: 200, setHeader() {}, end(value: string) { body = value; status = this.statusCode; }
    } as any);
    await route.fulfill({ status, contentType: 'application/json', body });
  });
  await page.goto('/?date=2026-09-13#sky/placement/sun/virgo');
  await expect(page.getByText('The placement reading could not load. Please try again.', { exact: true })).toBeVisible({ timeout: 60_000 });
  expect(failedFetches).toBeGreaterThanOrEqual(2);
  const article = page.locator('.sky-detail-article .article-body-inner').first();
  await expect(article).toHaveCount(0);
  const failed = await page.evaluate(() => (window as any).__swissRetry);
  expect(failed.workers).toBe(1);
  expect(failed.responses).toContain(false);
  expect(failed.fatal).toEqual([]);
  expect(errors.some(error => error.stage === 'failed' && /wasm|WebAssembly|Aborted/iu.test(error.message))).toBe(true);
  const expectedAssetError = (error: typeof errors[number]) => error.kind === 'console' && (
    /^wasm streaming compile failed: TypeError: .*HTTP status code is not ok$/u.test(error.message)
    || error.message === 'falling back to ArrayBuffer instantiation'
    || error.message === 'failed to asynchronously prepare wasm: both async and sync fetching of the wasm failed'
    || error.message === 'Aborted(both async and sync fetching of the wasm failed)'
    || /^Failed to load resource: the server responded with a status of 503\b/u.test(error.message)
      && /\/wasm\/.*\.wasm$/u.test(error.url ?? '')
  );
  expect(errors.filter(error => error.stage === 'failed' && !expectedAssetError(error))).toEqual([]);

  failAsset = false;
  stage = 'retry';
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(article).toContainText(firstCopy, { timeout: 60_000 });
  expect(restoredFetches).toBeGreaterThan(0);
  const recovered = await page.evaluate(() => (window as any).__swissRetry);
  expect(recovered.workers).toBe(1);
  expect(recovered.responses).toContain(true);
  expect(recovered.fatal).toEqual([]);
  const completeBody = await article.textContent();
  const title = await page.locator('#sky-detail-title').textContent();
  const presentation = () => page.locator('.sky-detail-article').evaluate(root => ({
    dates: [...root.querySelectorAll('.article-duration')].map(element => element.textContent),
    headings: [...root.querySelectorAll('h1,h2,h3')].map(element => element.textContent),
    bodyTags: [...root.querySelectorAll('.article-body-inner p,.article-body-inner em,.article-body-inner strong,.article-body-inner li')]
      .map(element => [element.tagName, element.textContent])
  }));
  const completePresentation = await presentation();
  expect(completePresentation.dates.length).toBeGreaterThan(0);
  expect(completePresentation.dates.every(date => date?.trim())).toBe(true);

  const states = await page.evaluate(() => (window as any).__readingStates);
  expect([...new Set(states.map((state: any) => state.article).filter(Boolean))]).toHaveLength(1);
  stage = 'reload';
  await page.reload();
  await expect(article).toContainText(firstCopy, { timeout: 60_000 });
  expect(await article.textContent()).toBe(completeBody);
  expect(await page.locator('#sky-detail-title').textContent()).toBe(title);
  expect(await presentation()).toEqual(completePresentation);
  expect(errors.filter(error => error.stage !== 'failed')).toEqual([]);
});
