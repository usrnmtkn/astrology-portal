import { bundledPublications } from "../helpers/bundled-publications";
import { expect, test } from '@playwright/test';
import { observeArticleTransitions, expectAnimatedArticleNavigation } from './qaArticleTransitions';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
 test(`Lilith nested articles and refresh remain stable ${width} ${theme}`, async ({ page }) => {
  test.setTimeout(120_000);
  await observeArticleTransitions(page);
  await page.setViewportSize({width, height:1000});
  await page.clock.setFixedTime(new Date('2026-09-10T13:00:00Z'));
  await page.addInitScript(theme => {
   localStorage.setItem('tldrastro:theme', theme);
   localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'}));
  }, theme);
  await page.route('**/api/calendar?**', route => route.fulfill({json:{ok:true,calendar:{days:[]}}}));
  const errors: string[]=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto('/#sky');
  await page.getByRole('button', {name:'Read more about Lilith in Capricorn',exact:true}).click();
  await expect(page.locator('#sky-detail-title')).toHaveText(/Lilith.*Capricorn/i, {timeout:60_000});
  const parentUrl=page.url();
  for (const aspect of ['Trine Sun','Opposition Mars']) {
   const link=page.getByRole('link',{name:new RegExp(`Read more about Lilith.*${aspect}`)});
   await expect(link).toBeVisible({timeout:60_000});
   // Hydrated event facts can update the related link while Playwright waits
   // to click. Assert the destination the user actually selected, not an href
   // read before that update; the app must preserve that exact dated route.
   await page.evaluate(() => {
    (window as any).__clickedArticleTarget = null;
    document.addEventListener('click', event => {
     (window as any).__clickedArticleTarget = (event.target as Element)
      ?.closest('a[href^="#sky/"]')?.getAttribute('href') ?? null;
    }, {capture:true,once:true});
   });
   await link.click();
   const target=await page.evaluate(()=>(window as any).__clickedArticleTarget as string|null);
   expect(target).toMatch(/^#sky\/aspect\/.+\/at\//);
   await expect(page).toHaveURL(new RegExp(target!.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'));
   // Nested routes load their reading package just like the parent route above.
   await expect(page.locator('#sky-detail-title')).toHaveText(aspect==='Trine Sun' ? /Sun.*Trine.*Lilith/i : /Mars.*Opposition.*Lilith/i, {timeout:60_000});
   await expect(page.locator('.article-related-aspect-row')).toHaveCount(0);
   const aspectTitle = await page.locator('#sky-detail-title').textContent();
   await expectAnimatedArticleNavigation(page, () => page.getByRole('button',{name:'Close detail',exact:true}).click(), aspectTitle!);
   await expect(page).toHaveURL(parentUrl);
   await expect(page.locator('#sky-detail-title')).toHaveText(/Lilith.*Capricorn/i);
  }
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
   const read=()=>({title:document.querySelector('#sky-detail-title')?.textContent??null,body:document.querySelector('.article-body-inner')?.textContent??null});
   (window as any).__articleStates=[read()];
   new MutationObserver(()=>{
    const next=read(), states=(window as any).__articleStates;
    if (JSON.stringify(next)!==JSON.stringify(states.at(-1))) states.push(next);
   }).observe(document,{subtree:true,childList:true,characterData:true});
   window.dispatchEvent(new Event('focus'));
   window.dispatchEvent(new CustomEvent('tldrastro:content-update',{detail:{contentKey:'sky-placement/article/lilith/capricorn',published:true,updatedAt:new Date().toISOString()}}));
  });
  await page.waitForTimeout(5000);
  const states=await page.evaluate(()=>(window as any).__articleStates);
  expect(states[0].body).toBeTruthy();
  expect(states.every((state:any)=>state.title===states[0].title && state.body===states[0].body)).toBe(true);
  await page.screenshot({path:`test-results/article-navigation-${width}-${theme}.png`});
  await page.getByRole('button',{name:'Close detail',exact:true}).click();
  await expect(page).toHaveURL(/#sky$/);
  expect(errors).toEqual([]);
 });
}

test.beforeEach(async ({ page }) => { await bundledPublications(page); });
