import {test,expect} from '@playwright/test';
import {studioApiStore} from '../helpers/studio-api-store';
import {bundledPublications} from '../helpers/bundled-publications';
import {installSyntheticNetworkGuard} from '../helpers/synthetic-network-guard';
import {HOROSCOPE_SIGNS} from '../../src/shared/planetaryHoroscopes';
import skyHandler from '../../api/sky';
import type {IncomingMessage,ServerResponse} from 'node:http';

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Dated planetary readings keep their event and all twelve signs ${width} ${theme}`,async({page,baseURL})=>{
  test.setTimeout(180000);const api=await studioApiStore([],{planetaryWriting:true}),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const guard=await installSyntheticNetworkGuard(page.context(),new URL(baseURL!).origin);
  try{
    let result=await api.call({method:'POST',body:{action:'open',planet:'mercury',date:'2026-11-05',timeZone:'America/New_York'}}),row=result.payload.rows[0];
    for(const action of ['prepare','generate','poll','poll']){
      result=await api.call({method:'POST',body:{action,id:row.id,expectedUpdatedAt:row.updated_at,...(action==='generate'?{approvedPlanHash:row.source_snapshot.planetaryGeneration.plan.planHash}:{})}});expect(result.status).toBeLessThan(300);row=result.payload.rows[0];
    }
    result=await api.call({method:'PATCH',url:'/api/admin/generated-content',body:{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'}});expect(result.status).toBe(200);row=result.payload.rows[0];
    await page.clock.setFixedTime(new Date('2026-11-05T17:00:00.000Z'));await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:theme as 'light'|'dark'});await bundledPublications(page);
    await page.route('**/auth/v1/**',route=>route.fulfill({json:null}));
    await page.route('**/api/content-reader',async route=>{
      const result=await api.call({method:'POST',url:'/api/content-reader',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});
    });
    await page.route('**/api/sky?**',async route=>{const response={statusCode:200,setHeader(){},end(text:string){void route.fulfill({status:this.statusCode,contentType:'application/json',body:text});}};await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);});
    await page.addInitScript(theme=>{localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:pageAnimations','off');localStorage.setItem('tldrastro:horoscopeLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'}));},theme);
    const url='/?date=2026-11-05#horoscopes?period=monthly&sign=aries&view=planets&planet=mercury&placement=scorpio';
    await page.goto(url);
    const article=page.getByRole('article',{name:'Mercury in Scorpio horoscope',exact:true});
    for(const sign of HOROSCOPE_SIGNS){
      const name=sign[0].toUpperCase()+sign.slice(1);await page.getByRole('button',{name:`${name} & ${name} Rising`,exact:true}).click();
      await expect(article.getByRole('heading',{level:3})).toHaveText(`Synthetic ${sign}`);
      const paragraphs=article.locator('.horoscope-prose p');await expect(paragraphs.first()).toHaveText(`Your synthetic ${sign} opening remains complete.`);await expect(paragraphs.last()).toHaveText(`You keep the complete synthetic final sentence for ${sign}.`);
      await page.reload();await expect(article.locator('.horoscope-prose p').last()).toHaveText(`You keep the complete synthetic final sentence for ${sign}.`,{timeout:60000});
    }
    await expect(page.getByRole('heading',{level:1})).toHaveText('Horoscopes');await expect(article.getByRole('heading',{level:2})).toHaveText(/Mercury.*in Scorpio/);
    await expect(article.getByRole('heading',{level:3})).toHaveCSS('font-family',/Newsreader/);
    const dates=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'America/New_York'}).formatRange(new Date(row.facts.planetaryEvent.event.startsAt),new Date(row.facts.planetaryEvent.event.endsAt));
    await expect(article.locator('.horoscope-date')).toHaveText(dates);
    await page.screenshot({path:`test-results/dated-planetary-horoscopes-${width}-${theme}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'All planets',exact:true}).click();const card=page.getByRole('link',{name:/^Mercury .*Scorpio .*Read horoscope/});await expect(card.locator('.planet-placement-row__description')).toContainText('Your synthetic pisces opening remains complete.');
    // Another year's placement cannot acquire the published 2026 wording.
    await page.goto('/?date=2027-11-05#horoscopes?period=monthly&sign=aries&view=planets');await expect(page.locator('.horoscope-planet-grid')).toBeVisible({timeout:60000});await expect(page.locator('.horoscope-planet-grid')).not.toContainText('Your synthetic aries opening remains complete.');
    expect(errors).toEqual([]);await guard.finishStaticFonts();expect(guard.unhandledExternal).toEqual([]);
  }finally{api.close();}
});
