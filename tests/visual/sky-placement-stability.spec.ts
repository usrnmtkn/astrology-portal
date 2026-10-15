import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
import { readerResponse } from '../helpers/reader-response';

for (const width of [390, 1440]) test(`Venus formatting is complete on first paint and reload ${width}`, async ({ page }) => {
 test.setTimeout(120_000);
 await page.setViewportSize({ width, height: 1000 });
 await page.clock.setFixedTime(new Date('2026-10-14T16:00:00Z'));
 await bundledPublications(page);
 const key = 'sky-placement/article/venus/scorpio';
 const base = skyPlacementSourceRecords.get(key)!;
 const copy = '**Synthetic complete opening.**\n\nSecond complete paragraph.\n\n- First complete item\n- Final complete item';
 const row = { id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', content_key:key, surface:'sky', mode:'in_depth', status:'LIVE', lane:'serving', review_state:null,
  target_date:null, provider:'tldrastro-fallback-architecture-v3', updated_at:'2026-10-14T12:00:00.123456Z', headline:base.headline, summary:'', body:copy,
  sections:{packageRecord:{...base, studio_version_status:'approved-serving-revision', placementArticle:copy, placementArticleDirect:copy, placementArticleRetrograde:copy}},
  facts:{fallbackArchitectureV3:true}, source_snapshot:{sourcePackage:base.source_package,content_role:base.content_role},block_type:'fallback_hook',event_type:'fallback-hook' };
 const publication = {content_key:key,state:'live',revision:1,row_id:row.id,row_updated_at:row.updated_at,updated_at:row.updated_at};
 await page.route('**/api/content-reader', route => {
  const query=route.request().postDataJSON();
  return route.fulfill({json:readerResponse(query.keys?.includes(key)||query.ids?.includes(row.id)?[row]:[],[publication])});
 });
 await page.route('**/rest/v1/**',route=>route.fulfill({json:[publication]}));
 await page.addInitScript(() => {
  localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label:'New York', latitude:40.7, longitude:-74, timeZone:'America/New_York' }));
  (window as any).__formattedArticleFrames = [];
  const observe = () => {
   const body = document.querySelector('.sky-detail-article .article-body-inner');
   if (body && body.getClientRects().length) {
    const state = { text:body.textContent, paragraphs:body.querySelectorAll('p').length, lists:body.querySelectorAll('ul,ol').length, emphasis:body.querySelectorAll('strong,em').length };
    const frames = (window as any).__formattedArticleFrames;
    if (JSON.stringify(frames.at(-1)) !== JSON.stringify(state)) frames.push(state);
   }
   requestAnimationFrame(observe);
  };
  requestAnimationFrame(observe);
 });
 const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 let release!: () => void;
 let requested!: () => void;
 const formattingRequested = new Promise<void>(resolve => { requested = resolve; });
 const formattingReleased = new Promise<void>(resolve => { release = resolve; });
 await page.route('**/assets/FormattedWritingContent-*.js', async route => {
  requested();
  await formattingReleased;
  await route.continue();
 });
 try {
 await page.goto('/?date=2026-10-14#sky/placement/venus/scorpio', {waitUntil:'domcontentloaded'});
 await formattingRequested;
 await expect(page.locator('.sky-detail-article .article-body-inner')).toHaveCount(0);
 release();
 const body = page.locator('.sky-detail-article .article-body-inner').first();
 await expect(body).toBeVisible({ timeout:60_000 });
 await expect(body).toContainText('Synthetic complete opening.');
 await expect(body).toContainText('Final complete item');
 await expect(body.locator('ul,ol').first()).toBeVisible();
 await page.waitForTimeout(1000); // Observe delayed parser completion and subsequent source hydration.
 const frames = await page.evaluate(() => (window as any).__formattedArticleFrames);
 expect(frames.length).toBe(1);
 expect(frames[0].lists).toBeGreaterThan(0);
 expect(frames[0].paragraphs).toBeGreaterThan(1);
 expect(frames[0].text).not.toMatch(/\*\*|^\s*[-*+]\s/mu);
 await page.reload();
 await expect(body).toBeVisible({ timeout:60_000 });
 await page.waitForTimeout(1000);
 expect(await page.evaluate(() => (window as any).__formattedArticleFrames)).toEqual(frames);
 expect(errors).toEqual([]);
 } finally {
  release();
  await page.unrouteAll({behavior:'wait'});
 }
});

for (const theme of ['light', 'dark']) for (const width of [390, 1440]) test(`Sun placement stays stable ${theme} ${width}`, async ({ page }) => {
 test.setTimeout(120_000);
 await page.setViewportSize({ width, height:1000 });
 await page.addInitScript(theme => localStorage.setItem('tldrastro:theme', theme), theme);
 await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
 await page.addInitScript(() => {
  localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({ label:'New York', latitude:40.7, longitude:-74, timeZone:'America/New_York' }));
  (window as any).__placementStates = [];
  new MutationObserver(() => {
   const title = document.querySelector('#sky-detail-title')?.textContent;
   if (!title) return;
   const state = { title, dates: document.querySelector('.sky-detail-id .article-duration')?.textContent, lunar: document.querySelector('.article-body-inner')?.textContent?.includes('Today’s New Moon'), body: document.querySelector('.article-body-inner')?.textContent };
   const states = (window as any).__placementStates;
   if (JSON.stringify(states.at(-1)) !== JSON.stringify(state)) states.push(state);
  }).observe(document, { subtree:true, childList:true, characterData:true });
 });
 await bundledPublications(page);
 await page.route('**/sky-v4-canonical-content-studio-stage-v1*.json', async route => {
  await new Promise(resolve => setTimeout(resolve, 2500));
  await route.continue();
 });
 await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok:true, calendar:{ days:[] } } }));
 await page.goto('/?date=2026-09-10#sky/placement/sun/virgo');
 await expect(page.locator('.article-body-inner').first()).toContainText('The Sun in Virgo makes the systems', { timeout:60_000 });
 await page.waitForTimeout(3000); // Observe core, residency, and package hydration.
 await page.evaluate(() => window.dispatchEvent(new CustomEvent('tldrastro:content-update', { detail: { contentKey:'sky-placement/article/sun/virgo', published:true, updatedAt:new Date().toISOString() } })));
 await page.waitForTimeout(1500); // Observe both asynchronous content revalidation completions.
 const states = await page.evaluate(() => (window as any).__placementStates);
 expect(states.length).toBeGreaterThan(0);
 expect([...new Set(states.map((state: any) => state.title))]).toEqual(['Sun in Virgo']);
 expect([...new Set(states.map((state: any) => state.dates))]).toEqual(['August 22 to September 22, 2026']);
 expect([...new Set(states.map((state: any) => state.lunar))]).toEqual([true]);
 expect([...new Set(states.map((state: any) => state.body))]).toHaveLength(1);
 await expect(page.locator('.article-body-inner').first()).toContainText('The system that works is the one that makes your life easier to live.');
 const typography = await page.locator('#sky-detail-title').evaluate(el => { const s=getComputedStyle(el); return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform]; });
 await page.screenshot({ path:`test-results/sky-placement-stability-${width}-${theme}.png`, fullPage:true });
 await page.reload();
 await expect(page.locator('.article-body-inner').first()).toContainText('Today’s New Moon', { timeout:60_000 });
 await expect(page.locator('.sky-detail-id .article-duration').first()).toHaveText('August 22 to September 22, 2026');
 const reloadStates = await page.evaluate(() => (window as any).__placementStates);
 expect(reloadStates.length).toBeGreaterThan(0);
 expect([...new Set(reloadStates.map((state: any) => state.title))]).toEqual(['Sun in Virgo']);
 expect([...new Set(reloadStates.map((state: any) => state.dates))]).toEqual(['August 22 to September 22, 2026']);
 expect([...new Set(reloadStates.map((state: any) => state.lunar))]).toEqual([true]);
 expect([...new Set(reloadStates.map((state: any) => state.body))]).toHaveLength(1);
 expect(await page.locator('#sky-detail-title').evaluate(el => { const s=getComputedStyle(el); return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform]; })).toEqual(typography);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Placement reader offers retry when its canonical package fails', async ({ page }) => {
 await page.clock.setFixedTime(new Date('2026-09-10T04:20:00Z'));
 await bundledPublications(page);
 await page.route('**/api/calendar?**', route => route.fulfill({ json: { ok:true, calendar:{ days:[] } } }));
 let failPackage = true;
 await page.route('**/sky-v4-canonical-content-studio-stage-v1*.json', route => failPackage
  ? route.fulfill({ status:503, body:'Unavailable' }) : route.continue());
 await page.goto('/?date=2026-09-10#sky/placement/sun/virgo');
 await expect(page.getByText('The placement reading could not load. Please try again.')).toBeVisible({ timeout:60_000 });
 await expect(page.locator('#sky-detail-title')).toHaveCount(0);
 failPackage = false;
 await page.getByRole('button', { name:/retry|try again/i }).click();
 await expect(page.locator('.article-body-inner').first()).toContainText('The Sun in Virgo makes the systems', { timeout:60_000 });
});
