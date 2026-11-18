import {expect, test, type Page} from '@playwright/test';
import type {IncomingMessage, ServerResponse} from 'node:http';
import skyHandler from '../../api/sky';
import {bundledPublications} from '../helpers/bundled-publications';
import {readerResponse} from '../helpers/reader-response';

const missing = 'sky/lunation/2026-12-08/sagittarius';
const valid = 'sky/lunation/2026-12-09/sagittarius';
const opening = 'Synthetic complete dated Moon opening.';
const ending = 'The complete synthetic Moon ending remains visible.';
const bodyParagraphs = [opening, 'The entire synthetic middle paragraph must also survive navigation and reload.', ending];
const completeBody = bodyParagraphs.join('\n\n');

async function reader(page: Page, theme: string) {
  await page.clock.setFixedTime(new Date('2026-11-06T16:00:00Z'));
  await page.addInitScript(theme => {
    localStorage.setItem('tldrastro:theme', theme);
    localStorage.setItem('tldrastro:selectedLocation', JSON.stringify({label:'Synthetic New York', latitude:40.7, longitude:-74, timeZone:'America/New_York'}));
  }, theme);
  await bundledPublications(page);
  const row = {id:'dated-moon-route-fixture', content_key:'cms/lunation-article/2026-12-09/new-moon/sagittarius',
    status:'LIVE', lane:'serving', review_state:'reviewed', surface:'sky', mode:'article',
    headline:'Synthetic dated Moon', body:completeBody, updated_at:'2026-11-06T12:00:00Z',
    sections:{packageRecord:{content_role:'authored', review_status:'approved'}}};
  const publications = [{content_key:row.content_key, state:'live', revision:1, row_id:row.id,
    row_updated_at:row.updated_at, updated_at:row.updated_at}];
  await page.route('**/api/content-publications', route => route.fulfill({json:{schema:'tldr-publications/v1', publications}}));
  await page.route('**/api/content-reader', route => route.fulfill({json:readerResponse(
    route.request().postDataJSON()?.keys?.includes(row.content_key) ? [row] : [], publications)}));
  await page.route('**/api/calendar?**', route => route.fulfill({json:{ok:true, calendar:{days:[]}}}));
  await page.route('**/api/sky?**', async route => {
    let body = '';
    const response = {statusCode:200, setHeader() {}, end(value: string) { body = value; }};
    await skyHandler({method:'GET', url:route.request().url()} as IncomingMessage, response as unknown as ServerResponse);
    await route.fulfill({status:response.statusCode, contentType:'application/json', body});
  });
}

async function completeMoon(page: Page) {
  await expect(page.locator('#sky-detail-title')).toHaveText('New Moon in Sagittarius', {timeout:60_000});
  const body = page.locator('.sky-detail-article .sky-detail-body > .article-body-inner').first();
  const paragraphs = body.locator(':scope > .article-section p');
  await expect(paragraphs).toHaveText(bodyParagraphs);
  expect(await paragraphs.evaluateAll(nodes => nodes.map(node => node.textContent).join('\n\n'))).toBe(completeBody);
  await expect(page.locator('.reader-unavailable')).toHaveCount(0);
}

for (const [width, theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const) {
  test(`Dated Sky routes recover without changing valid UTC-day readings ${width} ${theme}`, async ({page}) => {
    test.setTimeout(180_000);
    await page.setViewportSize({width, height:1000});
    await reader(page, theme);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    // The event is Dec 8 locally but Dec 9 UTC; the route identity is the UTC day.
    await page.goto(`/?date=2026-12-09#${missing}`);
    const unavailable = page.getByRole('heading', {name:'Sky event unavailable', exact:true});
    await expect(unavailable).toBeVisible({timeout:60_000});
    await page.reload();
    await expect(unavailable).toBeVisible({timeout:60_000});
    await expect(page.getByLabel('Loading reading…', {exact:true})).toHaveCount(0);
    await expect(page.locator('.reader-unavailable h1')).toHaveCSS('font-size','36px');
    await page.getByRole('link', {name:'Go to Sky', exact:true}).click();
    await expect(page).toHaveURL(/#sky$/);
    await expect(page.locator('.reader-unavailable')).toHaveCount(0);
    await page.goto(`/?date=2026-12-09#${valid}`);
    await completeMoon(page);
    await page.reload();
    await completeMoon(page);
    for (const hash of ['sky/aspect/sun/trine/moon/at/not-a-date', 'sky/aspect/sun/trine/moon/at/%E0%A4%A',
      'sky/aspect/sun/unknown/moon/at/2026-12-01T12%3A00%3A00Z']) {
      await page.evaluate(hash => { window.location.hash = hash; }, hash);
      await expect(unavailable).toBeVisible();
      await expect(page.getByLabel('Loading reading…', {exact:true})).toHaveCount(0);
      await page.getByRole('link', {name:'Go to Sky', exact:true}).click();
      await expect(page).toHaveURL(/#sky$/);
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const scenario of [
  {route:missing, kind:'lunar-calendar-range', outcome:'missing'},
  {route:missing, kind:'lunar-calendar-range', outcome:'error'},
  {route:'sky/aspect/sun/trine/moon/at/2026-12-01T12%3A00%3A00Z', kind:'sky', outcome:'error'}
] as const) {
  test(`A stale dated ${scenario.kind} ${scenario.outcome} cannot replace a newer valid route`, async ({page}) => {
    test.setTimeout(120_000);
    await reader(page, 'light');
    await page.addInitScript(({route, kind, outcome}) => {
      const NativeWorker = window.Worker;
      const releases: Array<{id:number; deliver:() => void}> = [];
      (window as any).__oldMoonCompletion = null;
      (window as any).__releaseOldMoon = async () => {
        const held = releases.splice(0);
        const delivered: number[] = [];
        for (const item of held) { item.deliver(); delivered.push(item.id); }
        // dispatchEvent synchronously runs the calculation client's listener. The
        // missing/error branches have only promise continuations after that listener;
        // the next task starts after those continuations have drained.
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        const receipt = {held:held.map(item => item.id), delivered, continuationsDrained:true};
        (window as any).__oldMoonCompletion = receipt;
        return receipt;
      };
      (window as any).__oldMoonHeld = () => releases.length > 0;
      window.Worker = class extends NativeWorker {
        postMessage(message: any, transfer?: any) {
          if (message.kind === kind && window.location.hash === `#${route}`
            && (kind !== 'sky' || message.date === '2026-12-01T12:00:00.000Z')) {
            releases.push({id:message.id, deliver:() => this.dispatchEvent(new MessageEvent('message', {data: outcome === 'missing'
              ? {id:message.id, ok:true, value:[]}
              : {id:message.id, ok:false, error:'Synthetic abandoned dated calculation failure.'}}))});
            return;
          }
          super.postMessage(message, transfer);
        }
      };
    }, scenario);
    await page.goto(`/?date=2026-12-09#${scenario.route}`);
    await expect.poll(() => page.evaluate(() => (window as any).__oldMoonHeld())).toBe(true);
    await page.evaluate(hash => { window.location.hash = hash; }, valid);
    await completeMoon(page);
    const before = await page.locator('.sky-detail-article').innerText();
    const completion = await page.evaluate(() => (window as any).__releaseOldMoon());
    expect(completion.held.length).toBeGreaterThan(0);
    expect(completion.delivered).toEqual(completion.held);
    expect(completion.continuationsDrained).toBe(true);
    expect(await page.evaluate(() => (window as any).__oldMoonCompletion)).toEqual(completion);
    // Let React paint only after the identified old responses and their continuations.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await completeMoon(page);
    await expect(page.locator('.sky-detail-article')).toHaveText(before, {useInnerText:true});
    await expect(page.locator('.load-error--page')).toHaveCount(0);
  });
}
