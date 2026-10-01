import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {createSeasonalPublicationFixture,seasonalClaimBodies} from '../helpers/horoscope-publication-fixture.mts';

for(const [width,theme] of [[390,'light'],[1440,'dark']] as const){
 test(`Saved seasonal claims publish without rewriting ${width} ${theme}`,async({page})=>{
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,ZODIAC_TEMPLATE_FIXTURE:'1',HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',v=>stderr+=v);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const task=pending.get(m.id);if(task){pending.delete(m.id);m.error?task.reject(new Error(m.error)):task.resolve(m.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(t=>t.reject(error));});});
  const call=(m:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...m,id});});
  try{
   await ready;const created=await createSeasonalPublicationFixture(call);expect(created.status).toBe(200);const row=created.payload.rows[0];
   await page.setViewportSize({width,height:1000});await page.clock.setFixedTime(new Date('2026-09-30T16:00:00Z'));
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);},theme);
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
    if(url.pathname==='/api/admin/horoscope-writing')throw new Error('Publication must not generate or prepare replacement copy.');
    if(url.pathname==='/api/content-reader'){const r=await call({method:'reader',body:route.request().postDataJSON()});await route.fulfill({status:r.status,json:r.payload});return true;}return false;
   }});
   await page.goto('/admin/content#horoscopes');const studio=page.getByRole('region',{name:'Horoscope editions'});
   await studio.getByText(/^Continue a saved edition/).click();await studio.locator('.admin-horoscope-saved button').first().click();
   await studio.getByRole('button',{name:'4 · Publish',exact:true}).click();
   await expect(studio.getByRole('region',{name:'Cancer reading preview'})).toContainText(seasonalClaimBodies.cancer);
   await expect(studio.getByRole('button',{name:'Publish edition',exact:true})).toBeDisabled();
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Published the complete edition.');
   const saved=(await call({method:'rows'})).find((r:any)=>r.id===row.id);expect(saved.sections).toEqual(row.sections);expect(saved.source_snapshot).toEqual(row.source_snapshot);
   expect((await call({method:'writer-state'})).calls).toBe(0);
   await page.goto(`/#horoscopes?edition=${row.id}&period=seasonal&sign=cancer`);
   const reading=page.getByRole('article',{name:'Cancer horoscope'});await expect(reading).toContainText(seasonalClaimBodies.cancer);
   await page.reload();await expect(reading).toContainText(seasonalClaimBodies.cancer);
   await page.screenshot({path:`test-results/seasonal-publish-claims-${width}-${theme}.png`,fullPage:true});
  }finally{child.kill();}
 });
}
