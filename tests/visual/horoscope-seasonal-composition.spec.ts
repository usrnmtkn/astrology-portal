import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../../apps/web/src/content/horoscopeEditions.mjs';

for(const [width,theme,exhausted] of [[390,'light',false],[1440,'dark',false],[390,'light',true]] as const){
 test(`Seasonal ${exhausted?'quality_exhausted':'stages and saved review'} ${width} ${theme}`,async({page})=>{
  test.setTimeout(120000);
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',v=>stderr+=v);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const task=pending.get(m.id);if(task){pending.delete(m.id);m.error?task.reject(new Error(m.error)):task.resolve(m.result);}});child.on('exit',code=>{const e=new Error(`Fixture exited ${code}: ${stderr}`);reject(e);pending.forEach(t=>t.reject(e));});});
  const call=(m:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...m,id});});
  try{
   await ready;
   if(exhausted)await call({method:'writer-state',body:{rejectSeasonalVoice:true}});
   const facts=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=seasonal&date=2026-10-05&timeZone=America/New_York'});
   expect(facts.status).toBe(200);
   const packet={brief:facts.payload.brief,signature:facts.payload.signature};
   const edition=emptyHoroscopeEdition(packet.brief.window);
   edition.passages=edition.passages.map(p=>p.sign==='taurus'?p:{...p,headline:'Existing synthetic title',body:'You can read this existing synthetic fixture.'});
   const created=await call({method:'POST',url:'/api/admin/generated-content',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Seasonal architecture fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{}}});
   expect(created.status).toBe(200);const id=created.payload.rows[0].id;
   await page.setViewportSize({width,height:1000});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);},theme);
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
    if(url.pathname!=='/api/admin/horoscope-writing')return false;
    const result=await call({method:'writing',body:route.request().postDataJSON()});
    await route.fulfill({status:result.status,json:result.payload});return true;
   }});
   await page.goto('/admin/content#horoscopes');
   const studio=page.getByRole('region',{name:'Horoscope editions'});
   await studio.getByText(/^Continue a saved edition/).click();
   await studio.getByRole('button',{name:/Seasonal architecture fixture/}).click();
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await expect(studio.getByText(/Up to 30 paid AI requests/)).toBeVisible();
   await studio.getByRole('button',{name:'Generate missing readings',exact:true}).click();
   await expect(studio.getByRole('heading',{name:'Review each reading',exact:true})).toBeVisible({timeout:95000});
   expect((await call({method:'writer-state'})).calls).toBe(exhausted?12:6);
   await studio.getByRole('button',{name:/^Taurus/}).click();
   await studio.getByText('Seasonal generation record',{exact:true}).click();
   await expect(studio.getByText(exhausted?'Private run: quality_exhausted. 12 model calls; 1 plans; 3 prose candidates.':'Private run: accepted. 6 model calls; 1 plans; 1 prose candidates.',{exact:true})).toBeVisible();
   await expect(studio.getByText('These candidates have not been copied into the edition or approved for publication.',{exact:true})).toBeVisible();
   const original=exhausted?null:await studio.getByLabel('Private accepted Seasonal candidate').inputValue();
   if(exhausted){await expect(studio.getByLabel('Private accepted Seasonal candidate')).toHaveCount(0);await expect(studio.getByText('No accepted candidate is available. Failed attempts remain inspection records.',{exact:true})).toBeVisible();}
   const storedBefore=(await call({method:'rows'})).find((r:any)=>r.id===id);
   expect(storedBefore.status).toBe('DRAFT');
   expect(storedBefore.sections.horoscopeEdition.passages.find((p:any)=>p.sign==='taurus').body).toBe('');
   await page.reload();await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/Seasonal architecture fixture/}).click();
   await studio.getByRole('button',{name:/^Taurus/}).click();await studio.getByText('Seasonal generation record',{exact:true}).click();
   if(exhausted)await expect(studio.getByLabel('Private accepted Seasonal candidate')).toHaveCount(0);
   else await expect(studio.getByLabel('Private accepted Seasonal candidate')).toHaveValue(original!);
   await expect(studio.getByText('These candidates have not been copied into the edition or approved for publication.',{exact:true})).toBeVisible();
   expect((await call({method:'writer-state'})).calls).toBe(exhausted?12:6);
   expect((await call({method:'rows'})).find((r:any)=>r.id===id)).toEqual(storedBefore);
   expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBe(true);
  }finally{child.kill();}
 });
}
