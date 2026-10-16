import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readerResponse } from '../helpers/reader-response';
import { publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';

test.use({ timezoneId: 'America/New_York', viewport: { width: 390, height: 844 } });
for (const initialRoute of ["#sky", "#sky/placement/sun/virgo", "#sky/retrograde/neptune"]) for (const warm of [false, true]) for (const changeSelection of [false, true]) {
  test(`${warm ? 'Cached' : 'Cold'} Sky ${initialRoute} starts before App and ${changeSelection ? 'rejects a changed selection' : 'reuses the exact initial response'}`, async ({ page }) => {
    test.setTimeout(90_000);
    await bundledPublications(page);
    const cached = [{ content_key: '__content-publication-ledger/v1', state: 'live' as const, revision: 1,
      row_id: null, row_updated_at: null, updated_at: '2026-09-21T16:00:00Z' }];
    const emptyTag = await publicationLedgerTag(cached);
    await page.route('**/api/content-publications', route => route.fulfill({
      json: { schema: 'tldr-publications/v1', publications: cached }, headers: { etag: emptyTag }
    }));
    if (warm) await page.addInitScript(cached => localStorage.setItem('tldrastro:content-publications:v1', JSON.stringify(cached)), cached);
    // The two normal reader fonts must work without the optional external
    // accessibility/symbol stylesheet or another origin's font connection.
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.clock.setFixedTime(new Date('2026-09-21T16:00:00Z'));
    await page.addInitScript(() => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({
      label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York'
    })));
    await page.addInitScript(() => {
      const kinds = (window as any).__initialSkyWorkerKinds = [] as string[];
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        postMessage(message: any, ...args: any[]) {
          kinds.push(message.kind);
          super.postMessage(message, ...args);
        }
      };
    });
    const initialPlacement = initialRoute.startsWith('#sky/placement/');
    let releaseApp!: () => void;
    const appGate = new Promise<void>(resolve => { releaseApp = resolve; });
    let releaseReact!: () => void;
    const reactGate = new Promise<void>(resolve => { releaseReact = resolve; });
    let releasePlacement!: () => void;
    const placementGate = new Promise<void>(resolve => { releasePlacement = resolve; });
    await page.route(/\/assets\/fallback-content-sky-placement-(?!manifest-)[^/]+\.js$/, async route => { await placementGate; await route.continue(); });
    await page.route(/\/assets\/App-[^/]+\.js$/, async route => { await appGate; await route.continue(); });
    await page.route(/\/assets\/react-[^/]+\.js$/, async route => { await reactGate; await route.continue(); });
    const requests: URL[] = [];
    const wasmPaths = () => requests.filter(url => url.pathname.startsWith('/wasm/')).map(url => url.pathname).sort();
    let initializationPaths: string[] = [];
    const errors: string[] = [];
    page.on('request', request => requests.push(new URL(request.url())));
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/sky?**', async route => {
      const response = { statusCode: 200, setHeader() {}, end(body: string) {
        void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
      } };
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
    });
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    try {
      await page.goto(`/${initialRoute}`, { waitUntil: 'commit' });
      await expect.poll(() => requests.some(url => /\/assets\/App-[^/]+\.js$/.test(url.pathname))).toBe(true);
      await expect.poll(() => requests.some(url => /\/assets\/fallback-content-sky-placement-(?!manifest-)[^/]+\.js$/.test(url.pathname))).toBe(true);
      releaseReact();
      await expect.poll(() => requests.some(url => url.pathname === '/api/sky')).toBe(true);
      if (warm) await expect.poll(() => requests.some(url => url.pathname === '/api/content-publications')).toBe(true);
      else expect(requests.some(url => url.pathname === '/api/content-publications')).toBe(false);
      await expect.poll(() => requests.some(url => /newsreader-latin.*\.woff2$/.test(url.pathname))).toBe(true);
      await expect.poll(() => requests.some(url => /sky-v4-canonical-content-studio-stage.*\.json$/.test(url.pathname))).toBe(true);
      if (warm) expect(requests.some(url => url.pathname.endsWith('/content_publications'))).toBe(false);
      else await expect.poll(() => requests.some(url => url.pathname.endsWith('/content_publications'))).toBe(true);
      expect(await page.locator('.app-shell').count()).toBe(0);
      expect(requests.filter(url => url.pathname === '/api/sky')).toHaveLength(1);
      expect(requests.find(url => url.pathname === '/api/sky')?.searchParams.get('at')).toBe('2026-09-21T16:00:00.000Z');
      if (initialPlacement) {
        await expect.poll(() => page.evaluate(() => (window as any).__initialSkyWorkerKinds)).toEqual(['preload']);
        await expect.poll(wasmPaths).toEqual([
          expect.stringMatching(/^\/wasm\/[a-f0-9]{16}\/swisseph\.data$/u),
          expect.stringMatching(/^\/wasm\/[a-f0-9]{16}\/swisseph\.wasm$/u)
        ]);
        initializationPaths = wasmPaths();
        expect(new Set(initializationPaths.map(path => path.slice(0, path.lastIndexOf('/')))).size).toBe(1);
      } else {
        expect(await page.evaluate(() => (window as any).__initialSkyWorkerKinds)).toEqual([]);
        expect(requests.some(url => url.pathname.startsWith('/wasm/'))).toBe(false);
      }
      if (changeSelection) {
        await page.evaluate(() => {
          history.replaceState({}, '', '/?date=2026-03-27#sky');
          localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic Tokyo', latitude: 35.6762, longitude: 139.6503, timeZone: 'Asia/Tokyo' }));
        });
      }
    } catch (error) { releasePlacement(); throw error; } finally { releaseReact(); releaseApp(); }
    try {
      await expect.poll(() => requests.some(url => /sky-v4-canonical-content-studio-stage.*\.json$/.test(url.pathname))).toBe(true);
      await expect(page.locator('.app-shell')).toBeVisible();
    } finally { releasePlacement(); }
    if (initialRoute !== '#sky' && !changeSelection) {
      await expect(page.locator('.sky-detail-article .article-body-inner').first()).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('#sky-detail-title')).toContainText(initialRoute.includes('neptune') ? 'Neptune' : 'Sun');
      expect(requests.filter(url => url.pathname === '/api/sky')).toHaveLength(1);
      expect(errors).toEqual([]);
      return;
    }
    await expect(page.getByLabel('Daily sky summary', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.planet-placement-row--sky')).toHaveCount(14);
    const skyRequests = requests.filter(url => url.pathname === '/api/sky');
    expect(skyRequests).toHaveLength(changeSelection ? 2 : 1);
    if (changeSelection) {
      expect(skyRequests[1].searchParams.get('at')).toBe('2026-03-27T03:00:00.000Z');
      expect(skyRequests[1].searchParams.get('timeZone')).toBe('Asia/Tokyo');
      await expect(page.getByRole('button', { name: 'Read more about Sun in Aries', exact: true })).toBeVisible();
    }
    expect(requests.some(url => /fallback-content-sky-horoscopes-/.test(url.pathname))).toBe(false);
    expect(requests.filter(url => /\/assets\/fallback-content-sky-placement-(?!manifest-)[^/]+\.js$/.test(url.pathname))).toHaveLength(1);
    expect(await page.evaluate(() => (window as any).__initialSkyWorkerKinds)).toEqual(initialPlacement ? ['preload'] : []);
    expect(wasmPaths()).toEqual(initializationPaths);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.fonts.check('400 16px Newsreader') && document.fonts.check('500 16px "Geist Mono"'))).toBe(true);
    expect(requests.some(url => /newsreader-latin.*\.woff2$/.test(url.pathname) && url.host === new URL(page.url()).host)).toBe(true);
    await page.getByRole('button', { name: `Read more about Sun in ${changeSelection ? 'Aries' : 'Virgo'}`, exact: true }).click();
    await expect(page.locator('.article-shell')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => requests.some(url => /fallback-content-sky-horoscopes-/.test(url.pathname))).toBe(true);
  });
}

test('Cold Calendar starts its complete publication read while App is still downloading', async ({ page }) => {
  await bundledPublications(page);
  let releaseApp!: () => void;
  const appGate = new Promise<void>(resolve => { releaseApp = resolve; });
  let ledgerReads = 0;
  await page.route(/\/assets\/App-[^/]+\.js$/, async route => { await appGate; await route.continue(); });
  await page.route('**/rest/v1/content_publications?**', async route => {
    ledgerReads++;
    await route.fulfill({ json: [] });
  });
  try {
    await page.goto('/#calendar', { waitUntil: 'commit' });
    await expect.poll(() => ledgerReads).toBe(6);
    expect(await page.locator('.app-shell').count()).toBe(0);
  } finally {
    releaseApp();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

for (const width of [390, 1440]) test(`Direct article preparation overlaps full Sky without an incomplete paint ${width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
  await bundledPublications(page);
  await page.addInitScript(() => {
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
    const observed = (window as any).__directPreparation = { requests: [] as any[], paints: [] as string[] };
    const WorkerClass = window.Worker;
    window.Worker = class extends WorkerClass {
      postMessage(message: any, ...args: any[]) {
        if (message.kind === 'placement-sky') observed.requests.push(message);
        super.postMessage(message, ...args);
      }
    };
    new MutationObserver(() => {
      const body = document.querySelector('.sky-detail-article .article-body-inner')?.textContent;
      if (body?.trim() && observed.paints.at(-1) !== body) observed.paints.push(body);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  let releaseSky!: () => void;
  const skyGate = new Promise<void>(resolve => { releaseSky = resolve; });
  const requests: URL[] = [];
  const writingReads: any[] = [];
  let releaseWriting!: () => void;
  const writingGate = new Promise<void>(resolve => { releaseWriting = resolve; });
  await page.route('**/api/content-reader', async route => {
    if (route.request().postDataJSON()?.keys?.some((key: string) => key.startsWith('sky.aspect.sun.'))) await writingGate;
    await route.fallback();
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url()); requests.push(url);
    if (url.pathname === '/api/content-reader' && request.postDataJSON()?.keys?.some((key: string) => key.startsWith('sky.aspect.sun.'))) writingReads.push(request.postDataJSON());
  });
  await page.route('**/api/sky?**', async route => {
    await skyGate;
    const response = { statusCode: 200, setHeader() {}, end(body: string) {
      void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
    } };
    await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  try {
    await page.goto('/#sky/placement/sun/virgo', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => writingReads.length, { timeout: 60_000, message: 'Selected Sun in-sign aspect writing must start before the full Sky response' }).toBeGreaterThan(0);
    expect(await page.locator('.sky-detail-article .article-body-inner').count()).toBe(0);
    await page.clock.setFixedTime(new Date('2026-09-10T04:20:02Z'));
  } finally { releaseWriting(); releaseSky(); }
  const body = page.locator('.sky-detail-article .article-body-inner').first();
  await expect(body).toContainText('The Sun in Virgo makes the systems', { timeout: 60_000 });
  await expect(body).toContainText('Today’s New Moon');
  await expect(body).toContainText('The system that works is the one that makes your life easier to live.');
  await expect(page.locator('.sky-detail-id .article-duration').first()).toHaveText('August 22 to September 22, 2026');
  const observed = await page.evaluate(() => (window as any).__directPreparation);
  expect(observed.requests).toHaveLength(1);
  expect(observed.requests[0].date).toBe('2026-09-10T04:20:00.000Z');
  expect(observed.requests[0].timingScope).toBe('placement');
  expect(observed.paints).toEqual([await body.textContent()]);
  expect(requests.filter(url => url.pathname === '/api/sky')).toHaveLength(1);
  expect(errors).toEqual([]);
});

for (const width of [390, 1440]) test(`Initial publication installation shares one complete vocabulary read ${width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
  await bundledPublications(page);
  const stamp = '2026-09-10T04:00:00.000Z';
  const vocabulary = { id: '00000000-0000-4000-8000-000000000001', content_key: 'fallback-vocab/planet-topic/sun',
    updated_at: stamp, surface: 'modifier', mode: 'article', status: 'LIVE', lane: 'serving', review_state: null,
    target_date: null, body: 'Synthetic complete Sun vocabulary.', sections: { topic: { sky: 'Synthetic approved solar topic.' } },
    source_snapshot: { contentType: 'manual' } };
  const ledger = [
    { content_key: '__content-publication-ledger/v1', state: 'live', revision: 1, row_id: null, row_updated_at: null, updated_at: stamp },
    { content_key: vocabulary.content_key, state: 'live', revision: 1, row_id: vocabulary.id, row_updated_at: stamp, updated_at: stamp }
  ];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let ledgerReads = 0, vocabularyReads = 0;
  await page.route('**/rest/v1/content_publications?**', async route => {
    ledgerReads++; await gate;
    const predicates = new URL(route.request().url()).searchParams.getAll('content_key');
    await route.fulfill({ json: ledger.filter(row => predicates.every(predicate =>
      predicate.startsWith('gte.') ? row.content_key >= predicate.slice(4)
        : predicate.startsWith('lt.') ? row.content_key < predicate.slice(3)
          : predicate.startsWith('gt.') ? row.content_key > predicate.slice(3) : true)) });
  });
  await page.route('**/api/content-publications', route => route.fulfill({ json: { schema: 'tldr-publications/v1', publications: ledger } }));
  await page.route('**/api/content-reader', route => {
    const query = route.request().postDataJSON();
    if (query.vocabularyOnly) { vocabularyReads++; return route.fulfill({ json: readerResponse([vocabulary], ledger) }); }
    return route.fulfill({ json: readerResponse([], ledger) });
  });
  await page.route('**/api/sky?**', async route => {
    const response = { statusCode: 200, setHeader() {}, end(body: string) {
      void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
    } };
    await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('/#sky/placement/sun/virgo', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app-shell')).toBeVisible();
    await expect.poll(() => ledgerReads).toBeGreaterThanOrEqual(6);
    expect(vocabularyReads).toBe(0);
  } finally { release(); }
  const body = page.locator('.sky-detail-article .article-body-inner').first();
  await expect(body).toContainText('The system that works is the one that makes your life easier to live.', { timeout: 60_000 });
  const first = await body.textContent();
  await page.evaluate(() => new Promise<void>(resolve => {
    let frames = 0; const tick = () => ++frames === 30 ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick);
  }));
  expect(vocabularyReads).toBe(1);
  await page.reload();
  await expect(body).toHaveText(first!, { timeout: 60_000 });
  await page.evaluate(() => new Promise<void>(resolve => {
    let frames = 0; const tick = () => ++frames === 30 ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick);
  }));
  expect(vocabularyReads).toBe(2);
  expect(errors).toEqual([]);
});
