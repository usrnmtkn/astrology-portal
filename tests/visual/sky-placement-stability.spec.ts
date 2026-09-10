import { expect, test } from '@playwright/test';

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
 await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
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
 expect(await page.locator('#sky-detail-title').evaluate(el => { const s=getComputedStyle(el); return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform]; })).toEqual(typography);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
