import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {monthlyTimeZoneFixtures} from '../helpers/monthly-timezone-fixture.mts';

for(const [zone,width,theme] of [
 ['America/Los_Angeles',390,'light'],['Europe/London',390,'dark'],
 ['Asia/Tokyo',1440,'light'],['Pacific/Kiritimati',1440,'dark'],
 ['Asia/Kathmandu',390,'light'],['Pacific/Honolulu',390,'dark']
] as const){
 test(`New York monthly overview across time zones: ${zone} ${width} ${theme}`,async({browser,baseURL})=>{
  const directory=mkdtempSync(path.join(tmpdir(),'monthly-timezone-'));
  const fixture=path.join(directory,'rows.json');writeFileSync(fixture,JSON.stringify(monthlyTimeZoneFixtures()));
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,SKY_SAVE_FIXTURE:fixture},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{const error=new Error(`Monthly fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  const context=await browser.newContext({baseURL,timezoneId:zone,viewport:{width,height:1000}});
  try{
   await ready;const page=await context.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
   await page.clock.install({time:new Date('2026-10-29T16:00:00Z')});
   const deviceZone=await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);
   await page.addInitScript(theme=>localStorage.setItem('tldrastro:theme',theme),theme);
   let failed=false;
   await page.route('**/api/content-reader',async route=>{
    if(failed)return route.fulfill({status:503,json:{error:'Synthetic reader outage'}});
    const result=await call({method:'reader',body:route.request().postDataJSON()});
    await route.fulfill({status:result.status,json:result.payload});
   });
   await page.goto('/#horoscopes?period=daily');
   await page.getByRole('button',{name:'Monthly',exact:true}).click();
   const article=page.getByRole('article',{name:'Monthly overview',exact:true});
   const assertReading=async(month:string)=>{
    await expect(article).toContainText(`The complete ${month} New York fixture opens here.`);
    await expect(article).toContainText(`The complete ${month} New York fixture ends here.`);
    expect(await article.locator('.horoscope-prose').textContent()).toBe(monthlyTimeZoneFixtures().find(row=>row.headline===`${month} New York`)!.sections.horoscopeEdition.passages[0].body);
    await expect(page.locator('.horoscope-timing-note')).toContainText('Dates and timing in this reading use America/New York.');
    await expect(page.locator('.horoscope-location summary')).toContainText(deviceZone.replaceAll('_',' '));
   };
   await assertReading('October');
   await expect(page.locator('.horoscope-edition-next')).toBeDisabled();
   await expect(page.locator('.horoscope-edition-next')).toContainText('November');
   await page.reload();await assertReading('October');
   await expect(page.getByRole('region',{name:'Explore signs',exact:true})).toHaveCount(0);
   await page.locator('.horoscope-edition-nav button').filter({hasText:'Previous'}).click();
   await assertReading('September');
   await expect(page.locator('.horoscope-edition-next')).toContainText('October');
   await page.locator('.horoscope-edition-next').click();await assertReading('October');
   await page.reload();await assertReading('October');
   await page.getByRole('button',{name:'Current reading',exact:true}).click();await assertReading('October');
   await page.locator('.horoscope-location summary').click();
   await page.getByLabel('Horoscope time zone',{exact:true}).selectOption('America/New_York');
   await expect(article).toContainText('The complete October New York fixture ends here.');
   await expect(page.locator('.horoscope-timing-note')).toHaveCount(0);
   await page.getByRole('button',{name:'Reset to device time zone',exact:true}).click();await assertReading('October');
   await page.reload();await assertReading('October');
   failed=true;await page.reload();await expect(page.getByRole('alert')).toContainText('could not load');
   failed=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await assertReading('October');
   await page.screenshot({path:`test-results/monthly-global-${zone.replaceAll('/','-')}-${theme}.png`,fullPage:true,animations:'disabled'});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(zone==='America/Los_Angeles'){
    await page.clock.setSystemTime(new Date('2026-11-01T03:58:00Z'));
    await page.reload();await assertReading('October');
    await page.clock.fastForward(120000);await assertReading('November');
    await expect(page.locator('.horoscope-edition-next')).toContainText('December');
   }
   await page.getByRole('button',{name:'Weekly',exact:true}).click();
   await expect(page.getByRole('heading',{name:'No weekly reading yet',exact:true})).toBeVisible();
   expect(errors).toEqual([]);
  }finally{await context.close();child.kill();rmSync(directory,{recursive:true,force:true});}
 });
}
