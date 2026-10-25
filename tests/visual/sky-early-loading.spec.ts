import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import skyHandler from '../../api/sky';
import {createInitialSkyReaderHandler} from '../../api/sky-reader';
import { getLunarCalendarMonth } from '../../apps/web/src/services/ephemeris';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readerResponse } from '../helpers/reader-response';
import { publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { readFileSync } from 'node:fs';

const publishedAspect = JSON.parse(readFileSync('apps/web/public/content-studio-last-known-good.json', 'utf8'))
  .rows.find((row: { content_key: string }) => row.content_key === 'sky.aspect.sun.sextile.mars');

test.use({ timezoneId: 'America/New_York', viewport: { width: 390, height: 844 } });
for (const initialRoute of ["", "#sky", "#sky/placement/sun/virgo", "#sky/retrograde/neptune"]) for (const warm of [false, true]) for (const changeSelection of [false, true]) {
  test(`${warm ? 'Cached' : 'Cold'} Sky ${initialRoute || "/"} starts before App and ${changeSelection ? 'rejects a changed selection' : 'reuses the exact initial response'}`, async ({ page }) => {
    test.setTimeout(90_000);
    const initialList = !initialRoute || initialRoute === '#sky';
    const isSkyRequest=(url:URL)=>url.pathname==='/api/sky'||url.pathname==='/api/sky-reader';
    const newsreaderPath='/'+JSON.parse(readFileSync('apps/web/dist/.vite/manifest.json','utf8'))['src/assets/fonts/newsreader.woff2'].file;
    await bundledPublications(page);
    const cached = [{ content_key: '__content-publication-ledger/v1', state: 'live' as const, revision: 1,
      row_id: null, row_updated_at: null, updated_at: '2026-09-21T16:00:00Z' }];
    const emptyTag = await publicationLedgerTag(cached);
    await page.route('**/api/content-publications', route => route.fulfill({
      json: { schema: 'tldr-publications/v1', publications: cached }, headers: { etag: emptyTag }
    }));
    if (warm) await page.addInitScript(cached => localStorage.setItem('tldrastro:content-publications:v1', JSON.stringify(cached)), cached);
    const preparedHandler=createInitialSkyReaderHandler(async()=>({status:200,headers:{},value:readerResponse([])}));
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
    const errors: string[] = [];
    page.on('request', request => requests.push(new URL(request.url())));
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/\/api\/(?:sky|sky-reader)\?/, async route => {
      let body='';const response={statusCode:200,setHeader(){},end(value:string){body=value;}};
      if(new URL(route.request().url()).pathname==='/api/sky-reader'){
        const originalFetch=globalThis.fetch;
        const envKeys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_ANON_KEY'];
        const saved=envKeys.map(key=>process.env[key]);
        process.env.SUPABASE_URL='https://early-sky-fixture.supabase.test';
        process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic_early_sky';delete process.env.SUPABASE_ANON_KEY;
        globalThis.fetch=async input=>{
          const url=new URL(String(input));expect(url.origin).toBe(process.env.SUPABASE_URL);expect(url.pathname).toBe('/rest/v1/content_publications');
          const filters=url.searchParams.getAll('content_key');
          return Response.json(cached.filter(row=>filters.every(filter=>{const [op,...parts]=filter.split('.'),key=parts.join('.');return op==='eq'?row.content_key===key:op==='gte'?row.content_key>=key:op==='lt'?row.content_key<key:true;})));
        };
        try{await preparedHandler({method:'GET',url:route.request().url(),headers:{}} as IncomingMessage,response as unknown as ServerResponse);}
        finally{globalThis.fetch=originalFetch;envKeys.forEach((key,index)=>{if(saved[index]===undefined)delete process.env[key];else process.env[key]=saved[index];});}
      }else await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);
      await route.fulfill({status:response.statusCode,contentType:'application/json',body});
    });
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    try {
      await page.goto(`/${initialRoute}`, { waitUntil: 'commit' });
      await expect.poll(() => requests.some(url => /\/assets\/App-[^/]+\.js$/.test(url.pathname))).toBe(true);
      if (!initialList) await expect.poll(() => requests.some(url => /\/assets\/fallback-content-sky-placement-(?!manifest-)[^/]+\.js$/.test(url.pathname))).toBe(true);
      else expect(requests.some(url => /\/assets\/fallback-content-sky-placement-(?!manifest-)[^/]+\.js$/.test(url.pathname))).toBe(false);
      releaseReact();
      await expect.poll(() => requests.some(url => url.pathname === (initialList?'/api/sky-reader':'/api/sky'))).toBe(true);
      // The prepared list carries scoped publication proof. Full articles keep
      // the complete six-range live ledger read, including with a warm cache;
      // a cached marker must never substitute for fresh publication authority.
      expect(requests.some(url => url.pathname === '/api/content-publications')).toBe(false);
      if (!initialList) await expect.poll(() => requests.some(url => /canonical-sky-reader-transport-v1.*\.json$/.test(url.pathname))).toBe(true);
      else expect(requests.some(url => /canonical-sky-reader-transport-v1.*\.json$/.test(url.pathname))).toBe(false);
      if (initialList) expect(requests.some(url => url.pathname.endsWith('/content_publications'))).toBe(false);
      else await expect.poll(() => requests.filter(url => url.pathname.endsWith('/content_publications')).length).toBe(6);
      expect(await page.locator('.app-shell').count()).toBe(0);
      expect(requests.filter(isSkyRequest)).toHaveLength(1);
      expect(requests.find(isSkyRequest)?.searchParams.get('at')).toBe('2026-09-21T16:00:00.000Z');
      expect(requests.find(isSkyRequest)?.searchParams.get('detail')).toBe(initialList?'placements':'full');
      expect(await page.evaluate(() => (window as any).__initialSkyWorkerKinds)).toEqual([]);
      expect(wasmPaths()).toEqual([]);
      if (changeSelection) {
        await page.evaluate(() => {
          history.replaceState({}, '', '/?date=2026-03-27#sky');
          localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'Synthetic Tokyo', latitude: 35.6762, longitude: 139.6503, timeZone: 'Asia/Tokyo' }));
        });
      }
    } catch (error) { releasePlacement(); throw error; } finally { releaseReact(); releaseApp(); }
    try {
      if(!initialList)await expect.poll(()=>requests.some(url=>/canonical-sky-reader-transport-v1.*\.json$/.test(url.pathname))).toBe(true);
      await expect(page.locator('.app-shell')).toBeVisible();
    } finally { releasePlacement(); }
    if (!initialList && !changeSelection) {
      await expect(page.locator('.sky-detail-article .article-body-inner').first()).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('#sky-detail-title')).toContainText(initialRoute.includes('neptune') ? 'Neptune' : 'Sun');
      const kinds = await page.evaluate(() => (window as any).__initialSkyWorkerKinds as string[]);
      expect(kinds).not.toContain('preload');
      if (initialRoute.includes('/placement/')) {
        expect(kinds.filter(kind => kind === 'placement-sky')).toHaveLength(1);
        expect(wasmPaths()).toEqual([
          expect.stringMatching(/^\/wasm\/[a-f0-9]{16}\/swisseph\.data$/u),
          expect.stringMatching(/^\/wasm\/[a-f0-9]{16}\/swisseph\.wasm$/u)
        ]);
        expect(new Set(wasmPaths().map(path => path.slice(0, path.lastIndexOf('/')))).size).toBe(1);
      }
      expect(requests.filter(url => url.pathname === '/api/sky')).toHaveLength(1);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.fonts.check('400 16px Newsreader') && document.fonts.check('500 16px "Geist Mono"'))).toBe(true);
      expect(requests.some(url => url.pathname === newsreaderPath && url.host === new URL(page.url()).host)).toBe(true);
      expect(errors).toEqual([]);
      return;
    }
    await expect(page.getByLabel('Daily sky summary', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.planet-placement-row--sky')).toHaveCount(14);
    const skyRequests = requests.filter(isSkyRequest);
    expect(skyRequests).toHaveLength(changeSelection ? 2 : 1);
    if (changeSelection) {
      expect(skyRequests[1].searchParams.get('at')).toBe('2026-03-27T03:00:00.000Z');
      expect(skyRequests[1].searchParams.get('timeZone')).toBe('Asia/Tokyo');
      await expect(page.getByRole('button', { name: 'Read more about Sun in Aries', exact: true })).toBeVisible();
    }
    expect(requests.some(url => /fallback-content-sky-horoscopes-/.test(url.pathname))).toBe(false);
    expect(requests.some(url => /studio-editor-tools-/.test(url.pathname))).toBe(false);
    // Direct articles preload their complete archive before a subsequent route
    // change; a fresh list entry never requests that archive.
    expect(requests.filter(url => /\/assets\/fallback-content-sky-placement-(?!manifest-)[^/]+\.js$/.test(url.pathname))).toHaveLength(initialList ? 0 : 1);
    expect(await page.evaluate(() => (window as any).__initialSkyWorkerKinds)).toEqual([]);
    expect(wasmPaths()).toEqual([]);
    expect(errors).toEqual([]);
    await page.evaluate(()=>document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('400 16px Newsreader') && document.fonts.check('500 16px "Geist Mono"'))).toBe(true);
    expect(requests.some(url=>url.pathname===newsreaderPath&&url.host===new URL(page.url()).host)).toBe(true);
    await page.getByRole('button', { name: `Read more about Sun in ${changeSelection ? 'Aries' : 'Virgo'}`, exact: true }).click();
    await expect(page.locator('.article-shell')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => requests.filter(url => url.pathname === '/api/sky').at(-1)?.searchParams.get('detail')).toBe('full');
    expect(requests.filter(url => url.pathname === '/api/sky').at(-1)?.searchParams.get('at')).toBe(skyRequests.at(-1)?.searchParams.get('at'));
    await expect.poll(() => requests.some(url => /\/assets\/fallback-content-sky-placement-(?!manifest-)[^/]+\.js$/.test(url.pathname))).toBe(true);
    await expect.poll(() => requests.some(url => /fallback-content-sky-horoscopes-/.test(url.pathname))).toBe(true);
  });
}

for (const width of [390, 1440]) test(`Sky list reads published editions alongside its source planes ${width}`, async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width, height: 1000 });
  await bundledPublications(page);
  await page.clock.setFixedTime(new Date('2026-09-21T16:00:00Z'));
  const editionKey = 'sky-article/sun/virgo/2026/2026-08-22';
  const ledger = [{ content_key: editionKey, state: 'live', revision: 1,
    row_id: 'synthetic-published-edition', row_updated_at: '2026-09-21T16:00:00Z', updated_at: '2026-09-21T16:00:00Z' }];
  await page.route('**/rest/v1/content_publications?**', route => route.fulfill({ json: ledger }));
  await page.route('**/api/sky?**', async route => {
    const response = { statusCode: 200, setHeader() {}, end(body: string) {
      void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
    } };
    await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
  });
  let release!: () => void;
  const coreGate = new Promise<void>(resolve => { release = resolve; });
  let coreReads = 0, editionReads = 0, formattedReads = 0;
  page.on('request', request => { if (/\/assets\/FormattedWritingContent-[^/]+\.js$/u.test(new URL(request.url()).pathname)) formattedReads++; });
  await page.route('**/api/content-reader', async route => {
    const query = route.request().postDataJSON();
    if (query.scope === 'sky-list') { coreReads++; await coreGate; }
    if (query.keys?.includes(editionKey)) editionReads++;
    await route.fulfill({ json: readerResponse([], ledger) });
  });
  try {
    await page.goto('/?date=2026-09-21#sky');
    await expect.poll(() => coreReads).toBeGreaterThan(0);
    await expect.poll(() => editionReads).toBeGreaterThan(0);
    await expect.poll(() => formattedReads).toBeGreaterThan(0);
  } finally { release(); }
  // Parallel transport cannot authorize a missing published edition or expose
  // the bundled alternative as a completed reading.
  await expect(page.getByText('The placement readings could not load. Please try again.', { exact: true })).toBeVisible();
});

for (const width of [390, 1440]) test(`Cold article stages core transport behind its complete publication gate ${width}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
  await bundledPublications(page);
  expect(publishedAspect).toBeTruthy();
  const ledger = [{ content_key: publishedAspect.content_key, state: 'live', revision: 1,
    row_id: publishedAspect.id, row_updated_at: publishedAspect.updated_at, updated_at: publishedAspect.updated_at }];
  let release!: () => void, releaseCalculation!: () => void;
  const ledgerGate = new Promise<void>(resolve => { release = resolve; });
  const calculationGate = new Promise<void>(resolve => { releaseCalculation = resolve; });
  let ledgerReads = 0, coreReads = 0, coreResponses = 0, aspectReads = 0;
  await page.route('**/wasm/**', async route => { await calculationGate; await route.continue(); });
  await page.route('**/rest/v1/content_publications?**', async route => {
    ledgerReads++;
    await ledgerGate;
    const predicates = new URL(route.request().url()).searchParams.getAll('content_key');
    await route.fulfill({ json: ledger.filter(row => predicates.every(predicate =>
      predicate.startsWith('gte.') ? row.content_key >= predicate.slice(4)
        : predicate.startsWith('lt.') ? row.content_key < predicate.slice(3)
          : predicate.startsWith('gt.') ? row.content_key > predicate.slice(3) : true)) });
  });
  await page.route('**/api/content-reader', async route => {
    const query = route.request().postDataJSON();
    if (query.provider === 'tldrastro-fallback-architecture-v3' && query.scope === 'sky-article') coreReads++;
    if (query.keys?.includes(publishedAspect.content_key)) {
      aspectReads++;
      return route.fulfill({ json: readerResponse([publishedAspect], ledger) });
    }
    await route.fulfill({ json: readerResponse([], query.scope === 'sky-article' ? [] : ledger) });
  });
  page.on('response', response => {
    if (new URL(response.url()).pathname !== '/api/content-reader') return;
    const query = response.request().postDataJSON();
    if (query.provider === 'tldrastro-fallback-architecture-v3' && query.scope === 'sky-article') coreResponses++;
  });
  await page.route('**/api/sky?**', async route => {
    await calculationGate;
    const response = { statusCode: 200, setHeader() {}, end(body: string) {
      void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
    } };
    await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage, response as unknown as ServerResponse);
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const body = page.locator('.sky-detail-article .article-body-inner').first();
  try {
    await page.goto('/#sky/placement/sun/virgo', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => ledgerReads).toBe(6);
    await expect.poll(() => coreResponses).toBe(1);
    expect(coreReads).toBe(1);
    await expect(body).toHaveCount(0);
    release();
    await expect.poll(() => aspectReads).toBe(1);
    await expect(body).toHaveCount(0);
  } finally { release(); releaseCalculation(); }
  await expect(body).toContainText('The system that works is the one that makes your life easier to live.', { timeout: 60_000 });
  const first = await body.textContent();
  await page.evaluate(() => new Promise<void>(resolve => {
    let frames = 0; const tick = () => ++frames === 30 ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick);
  }));
  expect(await body.textContent()).toBe(first);
  expect(coreReads).toBe(1);
  expect(errors).toEqual([]);
});

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

// Use native computed events and actual API handlers. Only transport delivery is
// held; a quarter must not enter the New/Full exact-time calculation path.
let computedLunationMonth: ReturnType<typeof getLunarCalendarMonth> | undefined;
for (const phase of ['First Quarter Moon', 'Last Quarter Moon', 'New Moon', 'Full Moon']) {
  test(`Sky summary skips quarter-only core work and retains primary work: ${phase}`, async ({ page }) => {
    test.setTimeout(90_000);
    const location = { label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
    computedLunationMonth ??= getLunarCalendarMonth(location, new Date('2026-10-18T16:00:00Z'));
    const calendar = await computedLunationMonth;
    const phaseEvent = calendar.days.flatMap(day => day.events).find(event => event.type === 'lunation'
      && event.dateKey.startsWith('2026-10-') && event.title.startsWith(phase));
    expect(phaseEvent).toBeTruthy();
    const primary = phase === 'New Moon' || phase === 'Full Moon';
    expect(phaseEvent!.primary).toBe(primary);
    await bundledPublications(page);
    await page.route('**/api/content-publications', route => route.fulfill({ json: {
      schema: 'tldr-publications/v1', publications: [{ content_key: '__content-publication-ledger/v1',
        state: 'live', revision: 1, row_id: null, row_updated_at: null, updated_at: '2026-10-01T00:00:00Z' }]
    } }));
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar } }));
    await page.clock.setFixedTime(new Date(`${phaseEvent!.dateKey}T16:00:00Z`));
    await page.addInitScript(location => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify(location)), location);
    const core: import('@playwright/test').Request[] = [];
    let fullSky: any, fullFinished = false, releaseCore!: () => void;
    const coreGate = new Promise<void>(resolve => { releaseCore = resolve; });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/sky?**', async route => {
      const url = new URL(route.request().url());
      const isCore = url.searchParams.get('detail') === 'core';
      if (isCore) { core.push(route.request()); await coreGate; }
      let status = 200, body = '';
      await skyHandler({ method: 'GET', url: route.request().url() } as IncomingMessage,
        { setHeader() {}, set statusCode(value: number) { status = value; }, get statusCode() { return status; },
          end(value: string) { body = value; } } as unknown as ServerResponse);
      expect(status).toBe(200);
      if (!isCore) fullSky = JSON.parse(body).sky;
      await route.fulfill({ status, contentType: 'application/json', body });
      if (!isCore) fullFinished = true;
    });
    try {
      await page.goto('/#sky');
      await expect.poll(() => fullFinished).toBe(true);
      const actual = fullSky.dailyEvents.find((event: any) => event.id === phaseEvent!.id);
      expect(actual).toBeTruthy(); expect(actual.primary).toBe(primary);
      const summary = page.getByLabel('Daily sky summary', { exact: true });
      if (primary) {
        await expect.poll(() => core.length).toBe(1);
        expect(new URL(core[0].url()).searchParams.get('at')).toBe(phaseEvent!.startsAt);
        await expect(summary).toHaveAttribute('aria-busy', 'true');
        await expect(summary).not.toContainText(`${phase} in ${phaseEvent!.sign}`);
        releaseCore();
        const response = await core[0].response();
        expect(response?.status()).toBe(200); expect(await response!.finished()).toBeNull();
        await expect(summary).toHaveAttribute('aria-busy', 'false');
        await expect(summary.getByRole('link', { name: new RegExp(`^${phase} in `) })).toBeVisible();
        expect(core).toHaveLength(1);
      } else {
        await expect(summary).toHaveAttribute('aria-busy', 'false');
        const moon = fullSky.positions.find((position: any) => position.planet === 'Moon');
        await expect(summary.getByRole('link', { name: `Read about Moon in ${moon.sign}`, exact: true })).toBeVisible();
        await expect(page.locator('.sky-reading-layout')).toHaveAttribute('aria-busy', 'false');
        await page.evaluate(() => new Promise<void>(resolve => {
          let frames = 0; const next = () => ++frames === 30 ? resolve() : requestAnimationFrame(next);
          requestAnimationFrame(next);
        }));
        expect(core, 'A computed quarter cannot block the summary behind a held exact-time request.').toHaveLength(0);
      }
      expect(errors).toEqual([]);
    } finally { releaseCore(); await page.unrouteAll({ behavior: 'wait' }); }
  });
}
