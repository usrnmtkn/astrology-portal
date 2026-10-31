import {test,expect,type Page} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {showSavedHoroscopeEditions} from '../helpers/horoscope-edition-navigation';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile} from '../../src/astro-writing/horoscopeWritingProfiles.mjs';

async function fixture(page:Page,period:string){
 const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
 let sequence=0,stderr='';const pending=new Map<number,any>();
 child.stderr?.on('data',value=>stderr+=value);
 const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
 const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
 try{
  await ready;
  const profile={...defaultHoroscopeProfile(period),voiceGuidance:'Synthetic export voice opening. Develop the supplied thought. Synthetic export voice final sentence.'};
  expect((await call({method:'POST',url:'/api/admin/generated-content?writingProfiles=true',body:{profile,expectedUpdatedAt:null}})).status).toBe(200);
  const packet=await call({method:'GET',url:`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=2026-10-29&timeZone=America%2FNew_York`});
  expect(packet.status).toBe(200);const edition=emptyHoroscopeEdition(packet.payload.brief.window);
  const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic export edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet.payload},sourceSnapshot:{}}});
  expect(created.status).toBe(200);const id=created.payload.rows[0].id;
  let failExport=false;
  await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
   if(url.pathname!=='/api/admin/horoscope-writing')return false;
   const body=route.request().postDataJSON();
   if(failExport&&body.action==='export'){failExport=false;await route.fulfill({status:503,json:{ok:false,error:'Synthetic export unavailable. Retry loading the plan.'}});return true;}
   const result=await call({method:'writing',body});await route.fulfill({status:result.status,json:result.payload});return true;
  }});
  const studio=page.getByRole('region',{name:'Horoscope editions'});
  await page.goto('/admin/content#horoscopes');await showSavedHoroscopeEditions(page,studio);
  await studio.getByRole('button',{name:/^Synthetic export edition/}).click();
  await expect(studio.getByText('Complete writing plan · copy or download',{exact:true})).toBeVisible();
  return {child,call,id,edition,studio,profile,failNext:()=>{failExport=true;}};
 }catch(error){child.kill();throw error;}
}

for(const period of ['daily','weekly','monthly','seasonal'])for(const [width,theme]of (period==='daily'?[[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']]:[[390,'light'],[1440,'dark']])as [number,string][]){
 test(`Complete ${period} plan copy and download ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(theme=>{
   localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value:string)=>{(window as any).__copiedWritingPlan=value;}}});
  },theme);
  const f=await fixture(page,period);
  try{
   const control=f.studio.locator('details').filter({has:page.locator('summary').filter({hasText:'Complete writing plan · copy or download'})}).first();
   await control.locator('summary').click();
   const before=JSON.stringify((await f.call({method:'rows'})).find((row:any)=>row.id===f.id));
   if(period==='daily'){f.failNext();await control.getByRole('button',{name:'Load complete writing plan',exact:true}).click();await expect(control.getByRole('alert')).toContainText('Synthetic export unavailable');}
   await control.getByRole('button',{name:'Load complete writing plan',exact:true}).click();
   const input=control.getByLabel('Complete writing plan',{exact:true});await expect(input).not.toHaveValue('');
   const complete=await input.inputValue();
   expect(complete).toContain(f.profile.voiceGuidance);expect(complete).toContain('### Output format');
   for(const passage of f.edition.passages)expect(complete).toContain(`## ${passage.sign}\n`);
   await control.getByRole('button',{name:'Copy all',exact:true}).click();
   await expect(control.getByRole('status')).toHaveText('Complete writing plan copied.');
   expect(await page.evaluate(()=>(window as any).__copiedWritingPlan)).toBe(complete);
   if(period==='daily'&&width===390&&theme==='light'){
    await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('Synthetic clipboard denial');};});
    await control.getByRole('button',{name:'Copy all',exact:true}).click();
    await expect(control.getByRole('alert')).toContainText('The complete text is selected so you can copy it.');
    expect(await input.evaluate((element:HTMLTextAreaElement)=>[element.selectionStart,element.selectionEnd])).toEqual([0,complete.length]);
    await page.evaluate(()=>{navigator.clipboard.writeText=async(value:string)=>{(window as any).__copiedWritingPlan=value;};});
   }
   const download=page.waitForEvent('download');await control.getByRole('button',{name:'Download writing plan',exact:true}).click();
   expect(await fs.readFile((await (await download).path())!,'utf8')).toBe(complete);
   if(period==='daily'&&width===390){
    f.failNext();await control.getByRole('button',{name:'Refresh complete writing plan',exact:true}).click();
    await expect(control.getByRole('alert')).toContainText('Synthetic export unavailable');await expect(input).toHaveCount(0);
    await control.getByRole('button',{name:'Load complete writing plan',exact:true}).click();await expect(input).toHaveValue(complete);
   }
   if(f.edition.passages.length>1){
    await control.getByLabel('Reading to copy').selectOption({label:'Aries'});
    const one=await input.inputValue();expect(one).toContain(`TASK\nWrite one complete ${period} horoscope for aries`);expect(one).not.toContain(`TASK\nWrite one complete ${period} horoscope for pisces`);expect(one).toContain(f.profile.voiceGuidance);
    await control.getByRole('button',{name:'Copy this plan',exact:true}).click();expect(await page.evaluate(()=>(window as any).__copiedWritingPlan)).toBe(one);
   }else await expect(control.getByLabel('Reading to copy')).toHaveCount(0);
   expect(JSON.stringify((await f.call({method:'rows'})).find((row:any)=>row.id===f.id))).toBe(before);
   expect(await f.call({method:'writer-state'})).toMatchObject({calls:0,reviewCalls:0,batchCalls:0});
   await page.reload();await expect(f.studio.getByText('Complete writing plan · copy or download',{exact:true})).toBeVisible();
   await control.locator('summary').click();await expect(control.getByLabel('Complete writing plan',{exact:true})).toHaveCount(0);
   await control.getByRole('button',{name:'Load complete writing plan',exact:true}).click();await expect(control.getByLabel('Complete writing plan',{exact:true})).toHaveValue(complete);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/writing-export-${period}-${width}-${theme}.png`,fullPage:true});
  }finally{await page.unrouteAll({behavior:'wait'});f.child.kill();}
 });
}
