import { expect, test, type Request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import skyHandler from '../../api/sky';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
import { syntheticLibrarySkyArticle } from '../helpers/article-library-fixture';
import { readerResponse } from '../helpers/reader-response';
import { emptyLastKnownGoodSnapshot } from '../helpers/bundled-publications';

const canonicalKey = 'sky-placement/article/sun/libra';
const houseKey = 'house-horoscope-core/sun/libra/house-7';
const stamp = '2026-10-09T00:00:00.123456Z';

const cases = [
  ...[390, 1440].flatMap(width => [true, false].map(hasEdition => ({ width, hasEdition, account: 'guest', flow: 'stable' }))),
  ...['profile', 'restoring'].map(account => ({ width: 390, hasEdition: true, account, flow: 'stable' })),
  ...['navigate', 'retire', 'offline', 'revalidate', 'location', 'member-reload', 'member-spa', 'revision', 'date', 'edition-error', 'registry-held', 'registry-error', 'aspect-control', 'aspect-error', 'aspect-revision', 'aspect-handoff', 'aspect-handoff-partial', 'aspect-handoff-stale', 'advancing-live', 'advancing-historical'].map(flow => ({ width: 390, hasEdition: true, account: 'guest', flow }))
];
for (const { width, hasEdition, account, flow } of cases) {
  test(`compiled guest required sources ${width}, edition ${hasEdition}, ${account}, ${flow}`, async ({ page }) => {
    test.setTimeout(90_000);
    page.setDefaultTimeout(15_000);
    await page.setViewportSize({ width, height: 1000 });
    const advancing = flow.startsWith('advancing-');
    if (advancing) {
      // Keep the synthetic 2026 edition in season while time runs normally.
      // A frozen Date would hide distinct click/preparation calculation keys.
      await page.clock.install({ time: new Date('2026-10-13T16:00:00Z') });
      await page.clock.resume();
    } else await page.clock.setFixedTime(new Date('2026-10-12T16:00:00Z'));
    await page.addInitScript(() => localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({
      label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York'
    })));
    // Observe only native worker request kind/id and completion. Calculations
    // and response values remain untouched; this is a positive preparation
    // barrier for negative admission tests, never an app readiness substitute.
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      const completed: Array<{ kind: string; ok: boolean }> = [];
      (window as any).__qaSkyWorkerCompleted = completed;
      const placementCalls: Array<{ id: number; referenceDate: string; finished?: boolean; ok?: boolean; generatedAt?: string; location?: unknown }> = [];
      (window as any).__qaSkyPlacementCalls = placementCalls;
      window.Worker = class extends NativeWorker {
        private kinds = new Map<number, string>();
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.addEventListener('message', event => {
            const kind = this.kinds.get(event.data?.id);
            if (kind) completed.push({ kind, ok: event.data.ok === true });
            const placement = placementCalls.find(call => call.id === event.data?.id);
            if (placement) {
              placement.finished = true;
              placement.ok = event.data.ok === true;
              placement.generatedAt = event.data.value?.generatedAt;
              placement.location = event.data.value?.location;
            }
          });
        }
        postMessage(message: any, options?: any) {
          if (message && typeof message.id === 'number') this.kinds.set(message.id, message.kind);
          if (message?.kind === 'placement-sky') placementCalls.push({ id: message.id, referenceDate: message.date });
          super.postMessage(message, options);
        }
      };
    });
    let registryHeld = false, releaseRegistry!: () => void;
    const registryGate = new Promise<void>(resolve => { releaseRegistry = resolve; });
    let failRegistry = flow === 'registry-error';
    if (flow === 'registry-held' || flow === 'registry-error') await page.route('**/assets/skyRegistry-*.js', async route => {
      registryHeld = true;
      if (failRegistry) return route.fulfill({ status: 503, body: 'Synthetic required registry unavailable.' });
      if (flow === 'registry-held') await registryGate;
      await route.continue();
    });
    let releaseAccount!: () => void;
    const accountGate = new Promise<void>(resolve => { releaseAccount = resolve; });
    if (account !== 'guest') {
      const location = { label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
      const profile = { id: 'dddddddd-dddd-4ddd-addd-dddddddddddd', name: 'Synthetic Reader', email: 'reader@example.test',
        provider: 'email', sun: 'Aquarius', moon: 'Scorpio', rising: 'Gemini', currentLocation: location.label, currentLocationData: location,
        charts: [{ id: 'synthetic-chart', name: 'Synthetic Reader', type: 'Birth chart', birthDate: '1990-01-01', birthTime: '12:00 PM', birthCity: location.label, birthLocation: location }] };
      const user = { id: profile.id, email: profile.email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { name: profile.name } };
      const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
      await page.addInitScript(({ profile, user, storageKey, account }) => {
        if (account === 'restoring') localStorage.setItem(storageKey, JSON.stringify({ access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
        else localStorage.setItem('tldrastro:userProfile', JSON.stringify(profile));
      }, { profile, user, storageKey, account });
      await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
      await page.route('**/rest/v1/user_profiles*', async route => { await accountGate; await route.fulfill({ json: { data: { version: 1, profile } } }); });
    }
    await emptyLastKnownGoodSnapshot(page);
    const houses = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json', 'utf8')).hookRows;
    const selectedKeys = [canonicalKey, ...Array.from({ length: 12 }, (_, i) => `house-horoscope-core/sun/libra/house-${i + 1}`)];
    const rows: any[] = selectedKeys.map((key, index) => {
      const baseline = skyPlacementSourceRecords.get(key) ?? houses.find((row: any) => row.contentKey === key);
      const record = Object.fromEntries(['contentKey', 'content_role', 'grammar_frame', 'review_status', 'source_package',
        'serving_enabled', 'owner_approved', 'studio_content_type'].filter(field => baseline[field] !== undefined).map(field => [field, baseline[field]]));
      const body = index === 0 ? 'Synthetic complete canonical opening. Synthetic complete canonical ending.' : `Synthetic complete house ${index} passage.`;
      Object.assign(record, { body_you: body, body_they: body });
      if (!index) Object.assign(record, { placementArticle: '', placementArticleDirect: body, placementArticleRetrograde: '',
        studio_version_status: 'approved-serving-revision', tldrWhat: '', tldrTakeaway: '' });
      return { id: `aaaaaaaa-aaaa-4aaa-aaaa-${String(index + 1).padStart(12, '0')}`, content_key: key,
        surface: 'sky', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null, target_date: null,
        provider: 'tldrastro-fallback-architecture-v3', updated_at: stamp, headline: 'Synthetic selected source', body, summary: '',
        sections: { packageRecord: record }, source_snapshot: { content_role: record.content_role, review_status: 'approved' },
        event_type: 'fallback-hook', block_type: 'fallback_hook' };
    });
    const handoffFlow = flow.startsWith('aspect-handoff');
    const heldBroadFlow = flow === 'aspect-control' || flow === 'aspect-error' || handoffFlow;
    let releaseCalculation!: () => void, releaseBroad!: () => void;
    const calculationGate = new Promise<void>(resolve => { releaseCalculation = resolve; });
    const broadGate = new Promise<void>(resolve => { releaseBroad = resolve; });
    const broadRequests: Request[] = [];
    if (heldBroadFlow) await page.route('**/wasm/**', async route => {
      await calculationGate;
      await route.continue();
    });
    const aspectKey = 'sky.aspect.sun.trine.pluto';
    const exactAspectRequests: Request[] = []; let exactAspectFinished = 0;
    let failAspect = flow === 'aspect-error', aspectRequests = 0, holdAspect = false, aspectHeld = false;
    let releaseAspect!: () => void; const aspectGate = new Promise<void>(resolve => { releaseAspect = resolve; });
    if (flow === 'aspect-control' || flow === 'aspect-error' || flow === 'aspect-revision' || handoffFlow) rows.push({
      id: 'cccccccc-cccc-4ccc-accc-cccccccccccc', content_key: aspectKey, surface: 'sky', mode: 'feed', status: 'LIVE', lane: 'serving',
      review_state: null, target_date: null, event_type: 'sky-aspect-owner-approved-exact', block_type: 'sky_aspect', provider: 'manual-admin',
      updated_at: stamp, headline: 'Synthetic Sun Trine Pluto', summary: null,
      body: 'Synthetic required aspect exact opening. Synthetic required aspect exact ending.', sections: {},
      source_snapshot: { contentStudioExactAspect: true, review_status: 'approved', exactSkyAspectIdentity: { a: 'sun', b: 'pluto', aspect: 'trine' } }
    });
    const edition = await syntheticLibrarySkyArticle(); edition.updated_at = stamp;
    let editionRetired = !hasEdition, failEdition = flow === 'edition-error', holdEdition = false, editionHeld = false, editionFinished = 0;
    let releaseEdition!: () => void; const editionGate = new Promise<void>(resolve => { releaseEdition = resolve; });
    rows.push(edition);
    const publications = [{ content_key: '__content-publication-ledger/v1', state: 'live', revision: 1,
      row_id: null, row_updated_at: null, updated_at: stamp }, ...rows.map(row => ({ content_key: row.content_key,
      state: row === edition && !hasEdition ? 'retired' : 'live', revision: 1, row_id: row.id, row_updated_at: stamp, updated_at: stamp }))];
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    let selectedStarted = false, selectedFinished = false;
    const selectedRequests: Request[] = []; const editionRequests: Request[] = []; let selectedFailures = 0;
    page.on('requestfailed', request => { if (selectedRequests.includes(request)) selectedFailures++; });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    let holdLedger = false, ledgerHeld = false, releaseLedger!: () => void;
    const ledgerGate = new Promise<void>(resolve => { releaseLedger = resolve; });
    await page.route('**/rest/v1/**', async route => {
      if (account !== 'guest' && route.request().url().includes('/user_profiles')) return route.fallback();
      if (holdLedger && route.request().url().includes('content_publications')) { ledgerHeld = true; await ledgerGate; }
      return route.fulfill({ json: route.request().url().includes('content_publications') ? publications : [] });
    });
    await page.route('**/api/content-publications', route => route.fulfill({ json: { schema: 'tldr-publications/v1', publications } }));
    await page.route('**/api/content-reader', async route => {
      const query = route.request().postDataJSON();
      // Identify the actual canonical+house consumer, not its request key count.
      const isSelected = query.keys?.includes(canonicalKey) && query.keys?.includes(houseKey)
        || query.ids?.includes(rows[0].id) && query.ids?.includes(rows[7].id);
      if (isSelected) { selectedRequests.push(route.request()); selectedStarted = true; await held; }
      const isEdition = query.keys?.includes(edition.content_key) || query.ids?.includes(edition.id);
      if (isEdition) editionRequests.push(route.request());
      const isAspect = query.keys?.includes(aspectKey) || query.ids?.includes('cccccccc-cccc-4ccc-accc-cccccccccccc');
      const isBroad = heldBroadFlow && query.keys?.length === 45 && isAspect;
      if (isBroad) { broadRequests.push(route.request()); releaseCalculation(); await broadGate; }
      if (isAspect && !isBroad) { aspectRequests++; exactAspectRequests.push(route.request()); if (holdAspect || handoffFlow) { aspectHeld = true; await aspectGate; } if (failAspect) return route.fulfill({ status: 503, json: { error: 'Synthetic current required aspect unavailable.' } }); }
      if (isEdition && holdEdition) { editionHeld = true; await editionGate; }
      if (isEdition && failEdition) return route.fulfill({ status: 503, json: { error: 'Synthetic required edition unavailable.' } });
      let admitted = rows.filter(row => (row !== edition || !editionRetired)
        && (query.keys?.includes(row.content_key) || query.ids?.includes(row.id)));
      if (isBroad && flow === 'aspect-handoff-partial') admitted = admitted.filter(row => row.content_key !== aspectKey);
      if (isBroad && flow === 'aspect-handoff-stale') admitted = admitted.map(row => row.content_key === aspectKey
        ? { ...row, updated_at: '2026-10-08T00:00:00.123456Z' } : row);
      const keys = new Set(query.keys ?? admitted.map(row => row.content_key));
      await route.fulfill({ json: readerResponse(admitted, publications.filter(p =>
        p.content_key === '__content-publication-ledger/v1' || keys.has(p.content_key))) }).catch(error => {
          if (flow === 'registry-error' && route.request().failure()) return;
          throw error;
        });
      if (isSelected) selectedFinished = true;
      if (isEdition) editionFinished++;
      if (isAspect && !isBroad) exactAspectFinished++;
    });
    const editionResponseComplete = async () => {
      await expect.poll(() => editionRequests.length).toBeGreaterThan(0);
      for (const request of editionRequests) {
        const response = await request.response();
        expect(response).not.toBeNull(); expect(response!.status()).toBe(200);
        expect(await response!.finished()).toBeNull(); expect(request.failure()).toBeNull();
      }
    };
    const selectedResponseComplete = async () => {
      expect(selectedRequests.length).toBeGreaterThan(0);
      for (const request of selectedRequests) {
        const response = await request.response();
        expect(response, 'The exact held request must have a successful response').not.toBeNull();
        expect(response!.status()).toBe(200);
        expect(await response!.finished()).toBeNull();
        expect(request.failure()).toBeNull();
      }
      expect(selectedFailures).toBe(0);
      await expect.poll(() => page.evaluate(({ key, id, version }) => {
        const rows = JSON.parse(localStorage.getItem('tldrastro:sky-publication-rows:v2') ?? '[]');
        return rows.some((row: any) => row.content_key === key && row.id === id && row.updated_at === version);
      }, { key: canonicalKey, id: rows[0].id, version: stamp })).toBe(true);
    };
    // This finite barrier starts only after the exact response body completed
    // and its admitted row/version entered the normal cache. Thirty animation
    // frames cover queued React effects/paints; this is not an unbounded proof.
    const articleFrames = () => page.evaluate(() => new Promise<string[]>(resolve => {
      const frames: string[] = [];
      const sample = () => {
        frames.push(document.querySelector('.sky-detail-article')?.outerHTML ?? '');
        if (frames.length === 30) resolve(frames); else requestAnimationFrame(sample);
      };
      requestAnimationFrame(() => requestAnimationFrame(sample));
    }));
    let holdNewSky = heldBroadFlow, newSkyHeld = false, releaseNewSky!: () => void;
    const newSkyGate = new Promise<void>(resolve => { releaseNewSky = resolve; });
    let lastSky: any, newSkyUrl = ''; 
    await page.route('**/api/sky?**', async route => {
      if (holdNewSky) { newSkyUrl = route.request().url(); newSkyHeld = true; await newSkyGate; }
      const res = { statusCode: 200, setHeader() {}, end(body: string) {
        lastSky = JSON.parse(body).sky;
        void route.fulfill({ status: this.statusCode, contentType: 'application/json', body });
      } };
      await skyHandler({ method: 'GET', url: route.request().url() } as any, res as any);
    });
    await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
    const advancingFullSky = advancing ? page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === '/api/sky' && url.searchParams.get('detail') === 'full' && response.status() === 200;
    }) : null;
    try {
      await page.goto(flow === 'advancing-live' ? '/#sky/placement/sun/libra' : '/?date=2026-10-12#sky/placement/sun/libra');
      await expect.poll(() => selectedStarted).toBe(true);
      const article = page.locator('.sky-detail-article');
      if (flow === 'registry-error') {
        await expect.poll(() => registryHeld).toBe(true);
        await expect(page.getByText('This page could not load. Try another page or reload to try again.', { exact: true })).toBeVisible();
        expect([...new Set(await articleFrames())]).toEqual(['']); expect(selectedFinished).toBe(false);
        failRegistry = false;
        const abandoned = selectedRequests.splice(0); selectedFailures = 0; editionRequests.splice(0); selectedStarted = false;
        await page.getByRole('button', { name: 'Reload page', exact: true }).click();
        await expect.poll(() => selectedStarted).toBe(true);
        await expect.poll(() => abandoned.every(request => request.failure() !== null)).toBe(true);
      }
      if (heldBroadFlow) await expect.poll(() => broadRequests.length).toBe(1);
      if (handoffFlow) {
        await expect.poll(() => aspectHeld).toBe(true);
        await expect.poll(() => page.evaluate(() => (window as any).__qaSkyWorkerCompleted.some((job: any) => job.kind === 'placement-sky' && job.ok))).toBe(true);
        expect([...new Set(await articleFrames())]).toEqual(['']);
        expect(broadRequests[0].postDataJSON().keys).toHaveLength(45);
        releaseBroad();
        for (const request of broadRequests) {
          const response = await request.response(); expect(response?.status()).toBe(200);
          expect(await response!.finished()).toBeNull(); expect(request.failure()).toBeNull();
        }
        if (flow === 'aspect-handoff') {
          // The actual complete staged subset releases the article while the
          // independently owned exact request remains held, without cancellation.
          await expect(article).toContainText('Synthetic complete dated ending.');
          await expect(article).toContainText('Synthetic required aspect exact ending.');
        } else {
          await page.evaluate(() => new Promise<void>(resolve => {
            let frames = 0; const frame = () => ++frames === 30 ? resolve() : requestAnimationFrame(frame); requestAnimationFrame(frame);
          }));
          expect([...new Set(await articleFrames())]).toEqual(['']);
        }
        expect(exactAspectFinished).toBe(0);
        expect(exactAspectRequests.length).toBeGreaterThan(0);
        for (const request of exactAspectRequests) expect(request.failure()).toBeNull();
        releaseAspect();
        for (const request of exactAspectRequests) {
          const response = await request.response(); expect(response?.status()).toBe(200);
          expect(await response!.finished()).toBeNull(); expect(request.failure()).toBeNull();
        }
      }
      if (flow === 'aspect-error') {
        await expect.poll(() => aspectRequests).toBeGreaterThan(0);
        await expect(page.getByText('The placement reading could not load. Please try again.', { exact: true })).toBeVisible();
        expect([...new Set(await articleFrames())]).toEqual(['']); expect(selectedFinished).toBe(false);
        failAspect = false;
        await page.getByRole('button', { name: /Retry|Try again/i }).click();
      }
      if (flow === 'edition-error') {
        await expect(page.getByText('The placement reading could not load. Please try again.', { exact: true })).toBeVisible();
        expect(selectedFinished).toBe(false); await expect(article).toHaveCount(0);
        failEdition = false;
        await page.getByRole('button', { name: /Retry|Try again/i }).click();
      }
      if (flow === 'registry-held') {
        await expect.poll(() => registryHeld).toBe(true);
        await expect.poll(() => editionFinished).toBeGreaterThan(0);
        await editionResponseComplete();
        await expect.poll(() => page.evaluate(() => (window as any).__qaSkyWorkerCompleted.some((job: any) => job.kind === 'placement-sky' && job.ok))).toBe(true);
        expect([...new Set(await articleFrames())]).toEqual(['']);
        releaseRegistry();
      }
      if (hasEdition && account === 'guest') {
        await expect(article).toContainText('Synthetic complete dated opening.', { timeout: 60_000 });
        await expect(article).toContainText('Synthetic complete dated ending.');
        expect(selectedFinished).toBe(false);
        if (flow === 'aspect-control' || flow === 'aspect-error' || flow === 'aspect-revision' || handoffFlow) {
          expect(aspectRequests).toBeGreaterThan(0);
          await expect(article).toContainText('Synthetic required aspect exact opening.');
          await expect(article).toContainText('Synthetic required aspect exact ending.');
        }
        await expect(article.locator('#sky-personalized-placement')).toHaveCount(0);
        await expect(article.locator('#sky-rising-horoscopes')).toHaveCount(0);
        if (heldBroadFlow) {
          // Actual required content and Retry finish while the broad read is held.
          const complete = await article.evaluate(node => node.outerHTML);
          releaseBroad();
          for (const request of broadRequests) {
            const response = await request.response();
            expect(response?.status()).toBe(200);
            expect(await response!.finished()).toBeNull();
            expect(request.failure()).toBeNull();
          }
          expect([...new Set(await articleFrames())]).toEqual([complete]);
          releaseNewSky();
        }
        const before = await article.evaluate(node => node.outerHTML);
        if (flow === 'navigate') {
          await page.evaluate(() => { window.location.hash = 'sky'; });
          await expect(article).toHaveCount(0);
          release(); await selectedResponseComplete();
          expect([...new Set(await articleFrames())]).toEqual(['']);
        } else if (flow === 'revalidate') {
          holdLedger = true;
          await page.evaluate(() => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
            detail: { contentKey: '*', published: true, updatedAt: '2026-10-12T16:00:01Z' }
          })));
          await expect.poll(() => ledgerHeld).toBe(true);
          await page.getByRole('button', { name: 'Open menu', exact: true }).click();
          await page.getByRole('button', { name: 'Close menu', exact: true }).click();
          await expect(article).toContainText('Synthetic complete dated ending.');
          expect([...new Set(await articleFrames())]).toEqual([before]);
          holdLedger = false; releaseLedger(); release(); await selectedResponseComplete();
          expect([...new Set(await articleFrames())]).toEqual([before]);
        } else if (flow === 'member-reload' || flow === 'member-spa') {
          release(); await selectedResponseComplete();
          expect([...new Set(await articleFrames())]).toEqual([before]);
          const readsBeforeMember = selectedRequests.length;
          const location = { label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
          const profile = { id: 'dddddddd-dddd-4ddd-addd-dddddddddddd', name: 'Synthetic Reader', email: 'reader@example.test', provider: 'email',
            sun: 'Aquarius', moon: 'Scorpio', rising: 'Gemini', currentLocation: location.label, currentLocationData: location,
            charts: [{ id: 'synthetic-chart', name: 'Synthetic Reader', type: 'Birth chart', birthDate: '1990-01-01', birthTime: '12:00 PM', birthCity: location.label, birthLocation: location }] };
          await page.addInitScript(profile => localStorage.setItem('tldrastro:userProfile', JSON.stringify(profile)), profile);
          await page.route('**/auth/v1/**', route => route.fulfill({ json: { id: profile.id, email: profile.email,
            aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { name: profile.name } } }));
          if (flow === 'member-reload') await page.reload();
          else {
            const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
            const user = { id: profile.id, email: profile.email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { name: profile.name } };
            await page.route('**/rest/v1/user_profiles*', route => route.fulfill({ json: { data: { version: 1, profile } } }));
            await page.evaluate(({ profile, user, storageKey }) => {
              localStorage.setItem('tldrastro:userProfile', JSON.stringify(profile));
              const session = { user, access_token: 'synthetic-spa', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600 };
              localStorage.setItem(storageKey, JSON.stringify(session));
              const channel = new BroadcastChannel(storageKey); channel.postMessage({ event: 'SIGNED_IN', session }); channel.close();
              window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
            }, { profile, user, storageKey });
            await page.getByRole('button', { name: 'Open menu', exact: true }).click();
            await expect(page.getByRole('menuitem', { name: 'Sign out', exact: true })).toBeVisible();
            await page.getByRole('button', { name: 'Close menu', exact: true }).click();
          }
          await expect(article).toContainText('Synthetic complete dated ending.', { timeout: 60_000 });
          await expect(article.locator('#sky-personalized-placement')).toContainText('Synthetic complete house');
          expect(selectedRequests.length).toBe(readsBeforeMember);
        } else if (flow === 'location' || flow === 'date') {
          await page.getByRole('button', { name: 'Close detail', exact: true }).click();
          await expect(article).toHaveCount(0);
          holdNewSky = true;
          if (flow === 'location') {
          await page.getByRole('button', { name: /Today, Synthetic New York/ }).click();
          await page.getByRole('dialog', { name: 'Sky controls' }).getByRole('button', { name: 'Synthetic New York', exact: true }).click();
          await page.getByRole('textbox', { name: 'City', exact: true }).fill('Synthetic Retained Point, California');
          await page.getByRole('button', { name: 'Update', exact: true }).click();
          } else await page.evaluate(() => {
            const url = new URL(window.location.href); url.searchParams.set('date', '2026-10-13');
            history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate'));
          });
          await expect.poll(() => newSkyHeld).toBe(true);
          const requested = new URL(newSkyUrl);
          if (flow === 'date') {
            expect(requested.searchParams.get('at')).toContain('2026-10-13');
            await expect(page.getByRole('button', { name: /Tomorrow, Synthetic New York/ })).toBeVisible();
          }
          else {
            // Independently fixed target for the normal free-text location UI.
            expect(requested.searchParams.get('lat')).toBe('-5.5');
            expect(requested.searchParams.get('lon')).toBe('-105.5');
            expect(requested.searchParams.get('timeZone')).toBe('America/Los_Angeles');
          }
          await page.evaluate(() => { window.location.hash = 'sky/placement/sun/libra'; });
          await expect(article).toHaveCount(0);
          holdNewSky = false; releaseNewSky();
          await expect(article).toContainText('Synthetic complete dated ending.', { timeout: 60_000 });
          expect(selectedFinished).toBe(false);
          await expect.poll(() => page.evaluate(({ latitude, longitude, timeZone, at }) => Object.keys(localStorage)
            .filter(key => key.startsWith('tldrastro:verifiedSky:v2:')).some(key => {
              const snapshot = JSON.parse(localStorage.getItem(key)!).snapshot;
              return snapshot.location.latitude === latitude && snapshot.location.longitude === longitude && snapshot.location.timeZone === timeZone && snapshot.generatedAt === at;
            }), flow === 'location' ? { latitude: -5.5, longitude: -105.5, timeZone: 'America/Los_Angeles', at: requested.searchParams.get('at') } : { latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York', at: requested.searchParams.get('at') })).toBe(true);
          const relocated = await article.evaluate(node => node.outerHTML);
          release(); await selectedResponseComplete();
          expect([...new Set(await articleFrames())]).toEqual([relocated]);
        } else if (flow === 'aspect-revision') {
          holdAspect = true;
          const row = rows.find(row => row.content_key === aspectKey)!;
          row.updated_at = '2026-10-09T00:00:00.123457Z';
          row.body = 'Synthetic updated required aspect opening. Synthetic updated required aspect ending.';
          const publication = publications.find(row => row.content_key === aspectKey)!;
          publication.revision++; publication.row_updated_at = row.updated_at; publication.updated_at = row.updated_at;
          await page.evaluate(contentKey => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
            detail: { contentKey, published: true, updatedAt: '2026-10-12T16:00:01Z' }
          })), aspectKey);
          await expect.poll(() => aspectHeld).toBe(true);
          expect([...new Set(await articleFrames())]).toEqual(['']);
          holdAspect = false; releaseAspect();
          await expect(article).toContainText('Synthetic updated required aspect ending.');
          await expect(article).not.toContainText('Synthetic required aspect exact opening.');
          expect(selectedFinished).toBe(false);
          const revised = await article.evaluate(node => node.outerHTML);
          release(); await selectedResponseComplete();
          expect([...new Set(await articleFrames())]).toEqual([revised]);
        } else if (flow === 'revision') {
          holdEdition = true;
          const updated = '2026-10-09T00:00:00.123457Z';
          edition.updated_at = updated;
          const publication = publications.find(row => row.content_key === edition.content_key)!;
          publication.revision++; publication.row_updated_at = updated; publication.updated_at = updated;
          await page.evaluate(contentKey => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
            detail: { contentKey, published: true, updatedAt: '2026-10-12T16:00:01Z' }
          })), edition.content_key);
          await expect.poll(() => editionHeld).toBe(true);
          expect([...new Set(await articleFrames())]).toEqual(['']);
          holdEdition = false; releaseEdition();
          await expect(article).toContainText('Synthetic complete dated ending.', { timeout: 60_000 });
          expect(selectedFinished).toBe(false);
          const revised = await article.evaluate(node => node.outerHTML);
          release(); await selectedResponseComplete();
          expect([...new Set(await articleFrames())]).toEqual([revised]);
        } else if (flow === 'retire') {
          editionRetired = true;
          const publication = publications.find(row => row.content_key === edition.content_key)!;
          publication.state = 'retired'; publication.revision++;
          await page.evaluate(contentKey => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
            detail: { contentKey, published: true, updatedAt: '2026-10-12T16:00:01Z' }
          })), edition.content_key);
          await expect(article).toHaveCount(0);
          release();
          await expect(article).toContainText('Synthetic complete canonical ending.', { timeout: 60_000 });
          await expect(article).not.toContainText('Synthetic complete dated opening.');
        } else if (flow === 'offline') {
          await page.context().setOffline(true);
          await page.evaluate(() => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
            detail: { contentKey: '*', published: true, updatedAt: '2026-10-12T16:00:01Z' }
          })));
          await expect(article).toHaveCount(0);
          await page.context().setOffline(false); release();
          await page.evaluate(() => window.dispatchEvent(new CustomEvent('tldrastro:content-update', {
            detail: { contentKey: '*', published: true, updatedAt: '2026-10-12T16:00:02Z' }
          })));
          await expect(article).toContainText('Synthetic complete dated ending.', { timeout: 60_000 });
        } else {
          release(); await selectedResponseComplete();
          expect([...new Set(await articleFrames())]).toEqual([before]);
        }
      } else {
        await expect(article).toHaveCount(0);
        if (account !== 'guest') {
          releaseAccount();
          await expect.poll(() => editionFinished).toBeGreaterThan(0);
        await editionResponseComplete();
          await expect.poll(() => page.evaluate(() => (window as any).__qaSkyWorkerCompleted.some((job: any) => job.kind === 'placement-sky' && job.ok))).toBe(true);
          await page.getByRole('button', { name: 'Open menu', exact: true }).click();
          await expect(page.getByRole('menuitem', { name: account === 'restoring' ? 'Sign out' : 'Account', exact: true })).toBeVisible();
          await page.getByRole('button', { name: 'Close menu', exact: true }).click();
          expect(selectedFinished).toBe(false);
          expect([...new Set(await articleFrames())]).toEqual(['']);
        }
        release(); releaseAccount();
        if (hasEdition) {
          await expect(article).toContainText('Synthetic complete dated opening.', { timeout: 60_000 });
          await expect(article).toContainText('Synthetic complete dated ending.');
        } else {
          await expect(article).toContainText('Synthetic complete canonical opening.', { timeout: 60_000 });
          await expect(article).toContainText('Synthetic complete canonical ending.');
          await expect(article.locator('#sky-rising-horoscopes')).toBeVisible();
        }
      }
      if (flow === 'registry-error') {
        const recovered = await article.evaluate(node => node.outerHTML);
        await page.reload();
        await expect(article).toContainText('Synthetic complete dated ending.', { timeout: 60_000 });
        expect([...new Set(await articleFrames())]).toEqual([recovered]);
      }
      if (advancing) {
        const fullSky = await advancingFullSky!;
        expect(await fullSky.finished()).toBeNull();
        await expect.poll(() => lastSky?.generatedAt).toBe(new URL(fullSky.url()).searchParams.get('at'));
        await expect.poll(() => page.evaluate(() => (window as any).__qaSkyPlacementCalls.every((call: any) => call.finished))).toBe(true);
        const body = article.locator('.article-body-inner').first();
        const completeBody = await body.innerHTML();
        const assertSuccessfulPlacement = (call: any) => {
          expect(call.ok).toBe(true);
          expect(call.generatedAt).toBe(call.referenceDate);
          expect(call.location).toEqual({ label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' });
        };
        for (const call of await page.evaluate(() => (window as any).__qaSkyPlacementCalls)) assertSuccessfulPlacement(call);
        let previousInstant = lastSky.generatedAt;
        for (const attempt of [1, 2]) {
          await expect(page.locator('html')).not.toHaveAttribute('data-page-transition', 'active');
          await page.getByRole('button', { name: 'Close detail', exact: true }).click();
          await expect(body).toHaveCount(0);
          await expect(page.locator('html')).not.toHaveAttribute('data-page-transition', 'active');
          await expect(page.getByLabel('Daily sky summary', { exact: true })).toBeVisible();
          await expect(page.locator('.planet-placement-row--sky')).toHaveCount(14);
          const before = await page.evaluate(() => (window as any).__qaSkyPlacementCalls.length);
          const openedAt = await page.evaluate(() => Date.now());
          await page.getByRole('button', { name: 'Read more about Sun in Libra', exact: true }).click();
          await expect(body).toContainText('Synthetic complete dated ending.', { timeout: 60_000 });
          await expect.poll(() => page.evaluate(() => (window as any).__qaSkyPlacementCalls.every((call: any) => call.finished))).toBe(true);
          expect(await body.innerHTML(), `Complete writing on reopen ${attempt}`).toBe(completeBody);
          const calls = await page.evaluate(before => (window as any).__qaSkyPlacementCalls.slice(before), before);
          expect(await page.evaluate(() => Date.now())).toBeGreaterThan(openedAt);
          if (flow === 'advancing-live') {
            expect(calls, 'A current reopen performs one fresh placement calculation.').toHaveLength(1);
            assertSuccessfulPlacement(calls[0]);
            expect(Date.parse(calls[0].referenceDate)).toBeGreaterThanOrEqual(openedAt);
            expect(Date.parse(calls[0].referenceDate)).toBeGreaterThan(Date.parse(previousInstant));
            previousInstant = calls[0].referenceDate;
          } else {
            expect(calls, 'An unchanged historical instant reuses the existing exact-input cache.').toHaveLength(0);
          }
        }
        if (flow === 'advancing-live') {
          // Authored strings intentionally cannot supply HTML/Markdown links.
          // Exercise delegation through an actual related-aspect anchor.
          await expect(page.locator('html')).not.toHaveAttribute('data-page-transition', 'active');
          const related = article.getByRole('link', { name: 'Read more about Sun Trine Pluto', exact: true });
          const destination = (await related.getAttribute('href'))!;
          const expectedAspectCopy = await related.locator('..').locator('p:not(.article-related-aspects__date)').allTextContents();
          expect(expectedAspectCopy.length).toBeGreaterThan(0);
          await related.click();
          await expect(page).toHaveURL(url => url.hash === destination);
          await expect(article.locator('#sky-detail-title')).toHaveText(/Sun.*Trine.*Pluto/i);
          for (const paragraph of expectedAspectCopy) await expect(body).toContainText(paragraph);
          await page.getByRole('button', { name: 'Close detail', exact: true }).click();
          await expect(page).toHaveURL(url => url.hash === '#sky/placement/sun/libra');
          await expect(body).toContainText('Synthetic complete dated ending.');
          expect(await body.innerHTML()).toBe(completeBody);

          await expect(page.locator('html')).not.toHaveAttribute('data-page-transition', 'active');
          await page.getByRole('button', { name: 'Close detail', exact: true }).click();
          await expect(page.getByLabel('Daily sky summary', { exact: true })).toBeVisible();
          await expect(page.locator('html')).not.toHaveAttribute('data-page-transition', 'active');
          const before = await page.evaluate(() => (window as any).__qaSkyPlacementCalls.length);
          const openedAt = await page.evaluate(() => Date.now());
          await page.getByRole('button', { name: 'Read more about Venus Rx in Scorpio', exact: true }).click();
          await expect(page).toHaveURL(url => url.hash === '#sky/placement/venus/scorpio');
          await expect(article.locator('#sky-detail-title')).toHaveText(/Venus.*Scorpio/i);
          await expect(body.locator('p').last()).toBeVisible();
          await expect.poll(() => page.evaluate(() => (window as any).__qaSkyPlacementCalls.every((call: any) => call.finished))).toBe(true);
          const calls = await page.evaluate(before => (window as any).__qaSkyPlacementCalls.slice(before), before);
          expect(calls, 'The retrograde placement card performs one fresh placement calculation.').toHaveLength(1);
          assertSuccessfulPlacement(calls[0]);
          expect(Date.parse(calls[0].referenceDate)).toBeGreaterThanOrEqual(openedAt);
          const retrogradeBody = await body.innerHTML();
          const retrogradeDates = await article.locator('.article-duration').allTextContents();
          expect(retrogradeDates).toHaveLength(2);
          expect(retrogradeDates[0].trim()).toBeTruthy();
          expect(retrogradeDates[1]).toContain('Full residency in Scorpio:');
          await page.reload();
          await expect(article.locator('#sky-detail-title')).toHaveText(/Venus.*Scorpio/i);
          await expect(body).toHaveJSProperty('innerHTML', retrogradeBody);
          await expect(article.locator('.article-duration')).toHaveText(retrogradeDates);
          for (const call of await page.evaluate(() => (window as any).__qaSkyPlacementCalls)) assertSuccessfulPlacement(call);
        }
      }
      expect(errors).toEqual([]);
    } finally { releaseCalculation(); releaseBroad(); release(); releaseAccount(); releaseLedger(); releaseNewSky(); releaseRegistry(); releaseEdition(); releaseAspect(); await page.context().setOffline(false); await page.unrouteAll({ behavior: 'wait' }); }
  });
}
