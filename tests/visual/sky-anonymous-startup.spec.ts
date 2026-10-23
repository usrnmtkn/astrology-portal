import { expect, test } from '@playwright/test';
import { bundledPublications } from '../helpers/bundled-publications';
import skyHandler from '../../api/sky';
import type { IncomingMessage, ServerResponse } from 'node:http';

// The CI command supplies a synthetic publishable key to exercise the direct
// anonymous transport. Other suites retain their existing credential fixtures.
test.skip(!process.env.TLDR_NATIVE_PUBLIC_READER, 'Requires the explicit anonymous-reader fixture.');
for(const width of [390,1440]) test(`Public Sky is usable while the login SDK is withheld ${width}`,async({page})=>{
  test.setTimeout(60_000);
  await page.setViewportSize({width,height:1000});
  await page.clock.setFixedTime(new Date('2026-09-21T16:00:00Z'));
  await bundledPublications(page);
  await page.route('**/api/sky?**',async route=>{
    const response={statusCode:200,setHeader(){},end(body:string){void route.fulfill({status:this.statusCode,contentType:'application/json',body});}};
    await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);
  });
  await page.route('**/api/calendar?**',route=>route.fulfill({json:{ok:true,calendar:{days:[]}}}));
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route(/\/assets\/supabase-[^/]+\.js$/u,async route=>{await gate;await route.continue();});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto('/?date=2026-09-21#sky');
    await expect(page.getByLabel('Daily sky summary',{exact:true})).toHaveAttribute('aria-busy','false');
    await expect(page.locator('.planet-placement-row--sky')).toHaveCount(14);
    await expect(page.locator('.planet-placement-row--sky[aria-busy="true"]')).toHaveCount(0);
    expect((await page.locator('.planet-placement-row--sky .planet-placement-row__description').allTextContents()).every(text=>text.trim().length>20)).toBe(true);
    expect(errors).toEqual([]);
  } finally {release();}
});
