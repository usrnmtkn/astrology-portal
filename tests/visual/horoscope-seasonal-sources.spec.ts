import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';

const bank=JSON.parse(fs.readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/editorial-source-bank-v1.json','utf8'));
const originals=['sign-season-content','sign-axis-tensions'].map(id=>bank.collections.find((c:any)=>c.id===id).entries.find((e:any)=>e.signs.includes('libra')).body);
for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Seasonal sources in the saved writing plan ${width} ${theme}`,async({page})=>{
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,ZODIAC_TEMPLATE_FIXTURE:'1',HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',v=>stderr+=v);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const task=pending.get(m.id);if(task){pending.delete(m.id);m.error?task.reject(new Error(m.error)):task.resolve(m.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(t=>t.reject(error));});});
  const call=(m:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...m,id});});
  try{
   await ready;await page.setViewportSize({width,height:1000});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
   let failPrepare=true;
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
    if(url.pathname!=='/api/admin/horoscope-writing')return false;
    const body=route.request().postDataJSON();expect(body.action).toBe('prepare');
    if(failPrepare){failPrepare=false;await route.fulfill({status:502,json:{ok:false,error:'The shared season sources could not be loaded. Your drafts are saved; check the writing plan again.'}});return true;}
    const result=await call({method:'writing',body});await route.fulfill({status:result.status,json:result.payload});return true;
   }});
   await page.goto('/admin/content#horoscopes');const studio=page.getByRole('region',{name:'Horoscope editions'});
   await studio.getByRole('button',{name:'Seasonal',exact:true}).click();
   await studio.getByLabel('Reference date').fill('2026-09-24');
   await studio.getByRole('button',{name:'Continue to writing plan',exact:true}).click();
   await expect(studio.getByRole('alert')).toContainText('shared season sources could not be loaded');
   await studio.getByRole('button',{name:'Review writing plan',exact:true}).click();
   await expect(studio.getByRole('alert')).toHaveCount(0);
   const assertIntroduction=async()=>{
    const plan=studio.getByRole('region',{name:'Overview writing plan',exact:true});
    await plan.getByText('Full plan details',{exact:true}).click();
    const sources=plan.getByLabel('Season and learning-axis sources');
    for(const body of originals)await expect(sources).toContainText(body);
    await expect(sources).not.toContainText('House');
    await expect(studio.getByText('0/13 readings ready',{exact:false})).toBeVisible();
    await plan.getByText('Full plan details',{exact:true}).click();
    await studio.getByRole('group',{name:'Writing plans by sign'}).getByRole('button',{name:'Aries',exact:true}).click();
   };
   const assertSources=async(sign='Aries',house=7)=>{
    const plan=studio.getByRole('region',{name:`${sign} writing plan`,exact:true});
    await plan.getByText('Full plan details',{exact:true}).click();
    const sources=plan.getByLabel('Season and learning-axis sources');
    await expect(sources).toContainText('Libra season · Libra / Aries learning axis');
    await expect(sources).toContainText(`Libra · House ${house}`);
    for(const body of originals)await expect(sources).toContainText(body);
    await expect(studio.locator('h2,h3')).toHaveText(['Generate your drafts',`${sign} writing plan`]);
    const styles=(el:Element)=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing];};
    expect(await sources.locator('p').first().evaluate(styles)).toEqual(await plan.locator('.admin-horoscope-outline').evaluate(styles));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   };
   await assertIntroduction();await assertSources();
   await studio.getByRole('group',{name:'Writing plans by sign'}).getByRole('button',{name:'Gemini',exact:true}).click();
   // The disclosure stays open while changing signs.
   await studio.getByText('Full plan details',{exact:true}).click();await assertSources('Gemini',5);
   await page.reload();await studio.getByText(/^Continue a saved edition/).click();
   await studio.locator('.admin-horoscope-saved button').first().click();
   await assertIntroduction();await assertSources();
   expect((await call({method:'writer-state'})).calls).toBe(0);
   await page.screenshot({path:`test-results/seasonal-sources-${width}-${theme}.png`,fullPage:true});
  }finally{child.kill();}
 });
}
