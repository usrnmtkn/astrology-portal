import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {showSavedHoroscopeEditions} from '../helpers/horoscope-edition-navigation';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../../apps/web/src/content/horoscopeEditions.mjs';

for(const [width,theme] of [[390,'light'],[1440,'dark']] as const){
 test(`Daily required-rule hold preserves editing and reload ${width} ${theme}`,async({page})=>{
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,any>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const task=pending.get(m.id);if(task){pending.delete(m.id);m.error?task.reject(new Error(m.error)):task.resolve(m.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(t=>t.reject(error));});});
  const call=(m:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...m,id});});
  try{
   await ready;
   const packet=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=daily&date=2026-10-29&timeZone=America%2FNew_York'});
   const edition=emptyHoroscopeEdition(packet.payload.brief.window);
   for(const p of edition.passages.slice(1)){p.headline=`Saved ${p.sign}`;p.body=`You can read the saved ${p.sign} opening.\n\nYour final sentence is unchanged.`;}
   const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic Daily boundary edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet.payload},sourceSnapshot:{}}});
   expect(created.status).toBe(200);let row=created.payload.rows[0];const id=row.id;
   const action=async(action:string,extra:any={})=>{const r=await call({method:'writing',body:{action,id,expectedUpdatedAt:row.updated_at,...extra}});if(r.payload.rows?.[0])row=r.payload.rows[0];return r;};
   const plan=await action('prepare');expect(plan.status).toBe(200);
   await action('generate',{sign:'aries',approvedPlanHash:plan.payload.plan.planHash});
   const candidate={headline:'Aries & Aries Rising',body:'The Moon enters Cancer and your fourth house tonight. You can decide whether to continue.'};
   await call({method:'writer-state',body:{nextResult:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(candidate)}]}]}}});
   expect((await action('poll')).status).toBe(200);
   expect(row.source_snapshot.horoscopeGeneration.candidateHolds.aries.candidate).toEqual(candidate);
   await page.setViewportSize({width,height:1000});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
    if(url.pathname!=='/api/admin/horoscope-writing')return false;
    const r=await call({method:'writing',body:route.request().postDataJSON()});await route.fulfill({status:r.status,json:r.payload});return true;
   }});
   const studio=page.getByRole('region',{name:'Horoscope editions'});
   const open=async()=>{await page.goto('/admin/content#horoscopes');await showSavedHoroscopeEditions(page,studio);await studio.getByRole('button',{name:/^Synthetic Daily boundary edition/}).click();};
   await open();
   const held=studio.getByRole('region',{name:'Aries prose review'}),heading=held.getByRole('heading',{level:3,name:'Aries needs a prose edit'});
   await expect(heading).toBeVisible();await expect(held).toContainText('numbered house');
   const style=await heading.evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textAlign];});
   await page.screenshot({path:`test-results/daily-boundary-held-${width}-${theme}.png`,fullPage:true});
   await page.reload();await expect(heading).toBeVisible();
   expect(await heading.evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textAlign];})).toEqual(style);
   await held.getByRole('button',{name:'Edit saved Aries draft',exact:true}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(candidate.body);
   const edited='You can read the complete owner-edited fixture.\n\nYour saved final sentence is here.';
   await studio.getByLabel('Complete reading').fill(edited);
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await studio.getByRole('button',{name:'4 · Publish',exact:true}).click();
   await expect(studio.getByRole('button',{name:'Publish edition',exact:true})).toBeDisabled();
   const latest=async()=>(await call({method:'rows'})).find((r:any)=>r.id===id);
   let saved=await latest();expect(saved.status).toBe('DRAFT');expect(saved.sections.horoscopeEdition.passages[0].body).toBe(edited);
   expect(saved.source_snapshot.horoscopeGeneration.candidateHolds.aries).toBeUndefined();
   expect(saved.sections.horoscopeEdition.passages.slice(1)).toEqual(edition.passages.slice(1));
   await page.reload();await studio.getByRole('button',{name:'3 · Review',exact:true}).click();await expect(studio.getByLabel('Complete reading')).toHaveValue(edited);
   saved=await latest();expect(saved.source_snapshot.horoscopeGeneration.candidateResolutions.at(-1).resolution).toBe('owner_edited');
   expect(saved.source_snapshot.horoscopeGeneration.failures.find((f:any)=>f.code==='daily_output_boundary').candidate).toEqual(candidate);
   expect(saved.source_snapshot.horoscopeGeneration.lastError).toBeNull();
   expect(await call({method:'writer-state'})).toMatchObject({calls:1,reviewCalls:0});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/daily-boundary-${width}-${theme}.png`,fullPage:true});
  }finally{await page.unrouteAll({behavior:'wait'});child.kill();}
 });
}
