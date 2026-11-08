import { expect, test } from '@playwright/test';
import { compileSkyArticleEdition } from '../../apps/web/src/content/skyArticleTemplateCompiler';
import { skyIngressEssayFields } from '../../apps/web/src/content/skyIngressEssay.mjs';
import { readerResponse } from '../helpers/reader-response';
import { skyPlacementInSignAspectContentKeys } from '../../apps/web/src/services/skyPlacementInSignAspectSections';
import { filterPlacementTimelineEvents, placementArticleTimelineWindow } from '../../apps/web/src/services/skyPlacementArticleTimeline';
import { contentStudioExactSkyAspectKeys } from '../../apps/web/src/services/skyAspectContent';
import { expectReadableTheme } from '../helpers/theme-contrast';

let savedPeriodFixture: ReturnType<typeof createSavedPeriodFixture> | undefined;
async function createSavedPeriodFixture() {
 const { getSkyPlacementSnapshot } = await import('../../apps/web/src/services/ephemeris');
 const sky = await getSkyPlacementSnapshot({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' },
  'mercury', 'Cancer', new Date('2026-07-10T12:00:00Z'), true, 'placement');
 const position = sky.positions.find(position => position.planet === 'Mercury')!;
 const start = position.transitStart!, end = position.transitEnd!;
 const chapter = placementArticleTimelineWindow({ generatedAt: sky.generatedAt, isRetrograde: true,
  visitStart: new Date(start), visitEnd: new Date(end), retrogradeStart: position.retrogradeStart, retrogradeEnd: position.retrogradeEnd });
 expect(chapter).not.toBeNull();
 const events = sky.placementAspectFacts!.inSign.filter(event => Date.parse(event.occursAt) >= Date.parse(start) && Date.parse(event.occursAt) < Date.parse(end));
 const chapterKeys = new Set(skyPlacementInSignAspectContentKeys(filterPlacementTimelineEvents(events, chapter)));
 const activeKeys = new Set(sky.aspects.filter(aspect => aspect.from === 'Mercury' || aspect.to === 'Mercury')
  .flatMap(aspect => contentStudioExactSkyAspectKeys(aspect.from, aspect.type, aspect.to)));
 const extensionKey = skyPlacementInSignAspectContentKeys(events).find(key => !chapterKeys.has(key) && !activeKeys.has(key));
 expect(extensionKey, 'The real saved visit must need writing outside its selected retrograde chapter').toBeTruthy();
 const edition = await compileSkyArticleEdition({ format: 'ingress-essay-v3', planet: 'mercury', sign: 'cancer', entryYear: 2026,
  validFrom: start.slice(0, 10), validTo: end.slice(0, 10), transitStartInstant: start, transitEndInstant: end,
  referenceTimeZone: 'America/New_York', templateKey: 'sky/article-template/ingress-layout/v3', templateBody: '',
  tldr: 'Synthetic complete saved-visit summary.', housePassages: [], aspectPassages: [],
  slotValues: { articleTitle: 'Synthetic complete Mercury visit', articleBody: 'Synthetic saved-visit opening.\n\nSynthetic saved-visit final sentence.', when: 'Synthetic saved visit.' } });
 const stamp = '2026-07-10T00:00:00.000001Z';
 const article = { id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', content_key: edition.contentKey, surface: 'sky', mode: 'article',
  status: 'LIVE', lane: 'serving', review_state: null, event_type: 'sky-article-edition', block_type: 'sky_article', target_date: null,
  updated_at: stamp, headline: edition.headline, body: edition.body, summary: edition.tldr, sections: { skyArticleEdition: edition },
  source_snapshot: { ownerApproval: { approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey,
   templateKey: edition.templateKey, templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash } } };
 const sourceEvents = new Map(events.flatMap(event => contentStudioExactSkyAspectKeys(event.planet, event.aspect, event.otherPlanet).map(key => [key, event] as const)));
 const aspectRows = [...sourceEvents].map(([key], index) => ({
  id: `cccccccc-cccc-4ccc-accc-${String(index + 1).padStart(12, '0')}`, content_key: key, surface: 'sky', mode: 'feed',
  status: 'LIVE', lane: 'serving', review_state: null, target_date: null, updated_at: stamp,
  event_type: 'sky-aspect-owner-approved-exact', block_type: 'sky_aspect', headline: 'Synthetic exact aspect', summary: null,
  body: `Synthetic period aspect ${index} opening.\n\nSynthetic period aspect ${index} final sentence.`, sections: {},
  source_snapshot: { contentStudioExactAspect: true, review_status: 'approved', exactSkyAspectIdentity: {
   a: key.split('.')[2], b: key.split('.')[4], aspect: key.split('.')[3] } }
 }));
 const rows = [article, ...aspectRows];
 const publications = [{ content_key: '__content-publication-ledger/v1', state: 'live', revision: 1,
  row_id: null, row_updated_at: null, updated_at: stamp }, ...rows.map(row => ({ content_key: row.content_key, state: 'live', revision: 1,
  row_id: row.id, row_updated_at: stamp, updated_at: stamp }))];
 return { start, end, events, extensionKey: extensionKey!, extension: aspectRows.find(row => row.content_key === extensionKey)!, rows, publications };
}

for (const [width, delivery] of [[390, 'late'], [1440, 'completed']] as const) {
 test(`saved visit waits for complete aspect writing and reuses it ${width} ${delivery}`, async ({ page }) => {
  test.setTimeout(120_000);
  const theme = width === 390 ? 'dark' : 'light';
  const fixture = await (savedPeriodFixture ??= createSavedPeriodFixture());
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-07-10T12:00:00Z'));
  await page.addInitScript(theme => {
   localStorage.setItem('tldrastro:theme', theme);
   localStorage.setItem('tldrastro:pageAnimations', 'off');
   localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label: 'New York', latitude: 40.7, longitude: -74, timeZone: 'America/New_York' }));
   (window as any).__savedVisitPaints = [];
   new MutationObserver(() => {
    const article = document.querySelector('.sky-detail-article .article-body-inner');
    if (!article?.getClientRects().length) return;
    const text = article.textContent?.trim();
    const paints = (window as any).__savedVisitPaints;
    if (text && paints.at(-1) !== text) paints.push(text);
   }).observe(document, { subtree: true, childList: true, characterData: true });
  }, theme);
  let releaseBroad!: () => void, releaseExtension!: () => void, releaseCompleted!: () => void;
  const broadGate = new Promise<void>(resolve => { releaseBroad = resolve; });
  const extensionGate = new Promise<void>(resolve => { releaseExtension = resolve; });
  const completedGate = new Promise<void>(resolve => { releaseCompleted = resolve; });
  let broadSeen = false, extensionHeld = false;
  const requests: Array<{ keys: string[]; startedAt: number; finishedAt?: number }> = [];
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json: {
   schema: 'content-studio-last-known-good-v2', rows: [], publications: [], rowCount: 0 } }));
  await page.route('**/rest/v1/**', async route => {
   const url = new URL(route.request().url());
   if (!url.pathname.endsWith('/content_publications')) return route.fulfill({ json: [] });
   if (delivery === 'completed') await completedGate;
   const constraints = url.searchParams.getAll('content_key');
   return route.fulfill({ json: fixture.publications.filter(row => constraints.every(constraint => {
    if (constraint.startsWith('gte.')) return row.content_key >= constraint.slice(4);
    if (constraint.startsWith('gt.')) return row.content_key > constraint.slice(3);
    if (constraint.startsWith('lt.')) return row.content_key < constraint.slice(3);
    return true;
   })) });
  });
  await page.route('**/api/content-publications*', async route => {
   if (delivery === 'completed') await completedGate;
   await route.fulfill({ json: { schema: 'tldr-publications/v1', publications: fixture.publications } });
  });
  await page.route('**/api/content-reader', async route => {
   const query = route.request().postDataJSON();
   const measured = { keys: query.keys ?? [], startedAt: Date.now(), finishedAt: undefined as number | undefined };
   requests.push(measured);
   const aspectRead = measured.keys.some((key: string) => key.startsWith('sky.aspect.'));
   const firstBroad = aspectRead && !broadSeen;
   if (firstBroad) {
    broadSeen = true;
    if (delivery === 'late') await broadGate;
   } else if (delivery === 'late' && measured.keys.includes(fixture.extensionKey)) {
    extensionHeld = true;
    await extensionGate;
   }
   const rows = fixture.rows.filter(row => query.keys?.includes(row.content_key) || query.ids?.includes(row.id));
   const requestedKeys = new Set([...(query.keys ?? []), ...rows.map(row => row.content_key)]);
   await route.fulfill({ json: readerResponse(rows, fixture.publications.filter(row => requestedKeys.has(row.content_key))) });
   measured.finishedAt = Date.now();
   if (firstBroad) releaseCompleted();
  });
  await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok: true, calendar: { days: [] } } }));
  const article = page.locator('.sky-detail-article').first();
  const opening = page.locator('.sky-detail-article .article-body-inner').first();
  const started = Date.now();
  try {
   await page.goto('/?date=2026-07-10#sky/placement/mercury/cancer');
   if (delivery === 'late') {
    await expect.poll(() => extensionHeld, { timeout: 60_000 }).toBe(true);
    await expect(opening).toHaveCount(0);
    releaseExtension();
   }
   await expect(opening).toContainText('Synthetic saved-visit opening.', { timeout: 60_000 });
   const openingMs = Date.now() - started;
   await expect(opening).toContainText('Synthetic saved-visit final sentence.');
   await expect(article.locator('.article-duration').first()).toHaveText('Jun 29, 2026 - Jul 23, 2026');
   const activeCards = article.locator('.article-related-aspect-row');
   await expect(activeCards.first()).toBeVisible();
   await expect(activeCards.filter({ hasText: fixture.extension.body.split('\n\n')[0] })).toHaveCount(0);
   await expect(article.getByRole('link', { name: 'Horoscopes', exact: true })).toHaveCount(0);
   const expectedDates = [...new Set(fixture.events.map(event => new Date(event.occursAt).toISOString()))].sort();
   await expect.poll(() => article.locator('.sky-placement-key-dates li').evaluateAll(items =>
    [...new Set(items.filter(item => /Mercury (conjunction|opposition|square|trine|sextile)/u.test(item.textContent ?? ''))
     .map(item => item.querySelector('time')!.dateTime))].sort())).toEqual(expectedDates);
   await article.locator('.sky-placement-key-dates > summary').click();
   await expect(article.getByText('Article coverage: June 1, 2026 to August 9, 2026.', { exact: true })).toBeVisible();
   await expectReadableTheme(page, '.sky-placement-key-dates > .sky-placement-key-dates__meta');
   const aspectLinks = await article.locator('.sky-placement-key-dates a[href]').evaluateAll(links =>
    links.map(link => (link as HTMLAnchorElement).hash));
   expect(aspectLinks.some(link => link.includes(`/at/${encodeURIComponent(fixture.events.find(event => contentStudioExactSkyAspectKeys(event.planet, event.aspect, event.otherPlanet).includes(fixture.extensionKey))!.occursAt)}`))).toBe(true);
   await page.screenshot({ path: test.info().outputPath('saved-period-reader.png'), fullPage: true });
   releaseBroad();
   await expect.poll(() => requests.filter(request => request.keys.includes(fixture.extensionKey) && request.finishedAt).length).toBe(delivery === 'completed' ? 1 : 2);
   const beforeReopen = requests.filter(request => request.keys.includes(fixture.extensionKey)).length;
   await page.getByRole('button', { name: 'Close detail', exact: true }).click();
   const reopenStarted = Date.now();
   await page.getByRole('button', { name: 'Read more about Mercury Rx in Cancer', exact: true }).click();
   await expect(opening).toContainText('Synthetic saved-visit final sentence.', { timeout: 60_000 });
   await expect(activeCards.filter({ hasText: fixture.extension.body.split('\n\n')[1] })).toHaveCount(0);
   const reopenMs = Date.now() - reopenStarted;
   expect(requests.filter(request => request.keys.includes(fixture.extensionKey)).length).toBe(beforeReopen);
   const paints = await page.evaluate(() => (window as any).__savedVisitPaints as string[]);
   expect(paints.length).toBeGreaterThan(0);
   expect(paints.every(text => text.includes('Synthetic saved-visit opening.') && text.includes('Synthetic saved-visit final sentence.'))).toBe(true);
   const event = fixture.events.find(event => contentStudioExactSkyAspectKeys(event.planet, event.aspect, event.otherPlanet).includes(fixture.extensionKey))!;
   if (await article.locator('.sky-placement-key-dates').getAttribute('open') === null) await article.locator('.sky-placement-key-dates > summary').click();
   await article.locator('.sky-placement-key-dates a[href]').filter({ has: page.locator(`time[datetime="${event.occursAt}"]`) }).click();
   await expect(article).toContainText(fixture.extension.body.split('\n\n')[0]);
   await expect(article).toContainText(fixture.extension.body.split('\n\n')[1]);
   await page.getByRole('button', { name: 'Close detail', exact: true }).click();
   await expect(opening).toContainText('Synthetic saved-visit final sentence.');
   await expect(activeCards.filter({ hasText: fixture.extension.body.split('\n\n')[1] })).toHaveCount(0);
   expect(errors).toEqual([]);
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
   const timing = { width, theme, delivery, openingMs, reopenMs, extensionKey: fixture.extensionKey,
    extensionRequests: beforeReopen, savedPeriod: { startsAt: fixture.start, endsAt: fixture.end } };
   console.log(JSON.stringify({ savedPeriodReader: timing }));
   await test.info().attach('saved-period-reader-timing', { contentType: 'application/json', body: JSON.stringify({ ...timing, requests }) });
  } finally {
   releaseBroad(); releaseExtension(); releaseCompleted();
   await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
 });
}

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
  await page.route(url => url.origin === new URL(test.info().project.use.baseURL!).origin
    && url.pathname === '/api/content-publications' && ['', '?scope=sky-list'].includes(url.search), route => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: { schema: 'tldr-publications/v1', publications } });
  });
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


for (const [width, theme] of [[390, 'dark'], [1440, 'light']] as const) {
 test(`write-up horoscopes render complete sign readings ${width} ${theme}`, async ({ page }) => {
  const { skyPlacementSourceFixture } = await import('../helpers/sky-placement-source-fixture.mts');
  const { reviseSkyArticleEdition, skyArticleEditableFields } = await import('../../apps/web/src/content/skyArticleTemplateCompiler');
  const { WRITEUP_HOROSCOPE_SIGNS } = await import('../../src/shared/skyWriteupHoroscopes');
  const fixture = await skyPlacementSourceFixture('mercury', 'scorpio');
  const readings = WRITEUP_HOROSCOPE_SIGNS.map(sign => ({ sign, body: `Synthetic ${sign} opening.\n\nSynthetic ${sign} complete final sentence.` }));
  const edition = await reviseSkyArticleEdition(fixture.edition, { ...skyArticleEditableFields(fixture.edition), writeupHoroscopes: readings });
  const row = { ...fixture.active, body: edition.body, sections: { skyArticleEdition: edition }, source_snapshot: { ownerApproval: {
   approved: true, action: 'approve-sky-article-edition', contentKey: edition.contentKey, templateKey: edition.templateKey,
   templateHash: edition.templateHash, fixedProseHash: edition.fixedProseHash, compiledHash: edition.compiledHash } } };
  const publications = [{ content_key: row.content_key, state: 'live', revision: 1, row_id: row.id, row_updated_at: row.updated_at, updated_at: row.updated_at }];
  await page.setViewportSize({ width, height: 1000 }); await page.clock.setFixedTime(new Date('2026-10-10T12:00:00Z'));
  await page.addInitScript(theme => { localStorage.setItem('tldrastro:theme', theme); localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York' })); }, theme);
  await page.route('**/content-studio-last-known-good.json', route => route.fulfill({ json:{ schema:'content-studio-last-known-good-v2', rows:[], publications:[], rowCount:0 } }));
  await page.route('**/rest/v1/**', route => route.fulfill({ json:[] }));
  await page.route('**/api/content-publications*', route => route.fulfill({ json:{ schema:'tldr-publications/v1', publications } }));
  await page.route('**/api/sky-reader?**', route => route.fulfill({ status:404, json:{ error:'Isolated fixture ledger.' } }));
  await page.route('**/api/content-reader', route => route.fulfill({ json: readerResponse(route.request().postDataJSON().keys?.includes(row.content_key) ? [row] : [], publications) }));
  await page.goto('/?date=2026-10-10#sky/placement/mercury/scorpio');
  const article = page.locator('.sky-detail-article').first();
  await expect(article.getByRole('heading', { name:'Horoscopes by rising sign', exact:true })).toBeVisible({ timeout:60000 });
  for (const reading of readings) await expect(article).toContainText(reading.body.split('\n\n')[1]);
  await expect(article.locator('.sky-rising-horoscope')).toHaveCount(12);
  await expect(article.getByRole('link', { name:'Horoscopes',exact:true })).toHaveCount(0);
  await page.reload(); await expect(article).toContainText(readings[11].body.split('\n\n')[1], { timeout:60000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('writeup-horoscopes-reader.png') });
 });
}
