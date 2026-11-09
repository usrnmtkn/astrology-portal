import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {moonHoroscopeKey} from '../../src/shared/datedLunationHoroscopes.mjs';

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Generate Moon readings, edit heading and body, draft and publish ${width} ${theme}`,async({page})=>{
 test.setTimeout(120000);
 const child=fork(path.resolve('tests/helpers/moon-horoscope-api.mts'),['--ipc'],{execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
 let sequence=0,stderr='';const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
 child.stderr?.on('data',value=>stderr+=value);
 const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const task=pending.get(m.id);if(task){pending.delete(m.id);m.error?task.reject(new Error(m.error)):task.resolve(m.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
 const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
 try{
  await ready;let lostResponse=width===1440&&theme==='dark';
  await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
   if(!['/api/admin/lunation-writing','/api/admin/sky-article-template-slots'].includes(url.pathname))return false;
   const body=route.request().postDataJSON();
   const result=await call({method:route.request().method(),body,url:url.pathname+url.search});
   if(body?.moonHoroscopes?.action==='generate'&&lostResponse){lostResponse=false;await route.fulfill({status:503,json:{ok:false,error:'Synthetic lost generation response.'}});return true;}
   await route.fulfill({status:result.status,json:result.payload});return true;
  }});
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
  await page.goto('/admin/content#moon-horoscopes');
  const studio=page.getByRole('region',{name:'Dated Moon horoscopes',exact:true});
  await studio.getByLabel('Month',{exact:true}).fill('2026-11');
  await studio.getByText(/^Time zone ·/).click();await studio.getByLabel('Time zone',{exact:true}).fill('America/New_York');
  const event=(await call({method:'GET',url:'/api/admin/lunation-writing?month=2026-11&timeZone=America%2FNew_York'})).payload.events.find((e:any)=>e.phase==='new-moon');
  await expect(studio.getByLabel('Moon event',{exact:true})).toContainText(event.title);
  await studio.getByLabel('Moon event',{exact:true}).selectOption(event.id);await studio.getByRole('button',{name:'Open Moon horoscopes',exact:true}).click();
  const heading=studio.getByLabel('Sign heading',{exact:true}),body=studio.getByLabel('Complete horoscope',{exact:true});
  const before=await heading.boundingBox(),after=await body.boundingBox();expect(before!.y+before!.height).toBeLessThan(after!.y);
  await page.screenshot({path:`test-results/moon-ai-empty-${width}-${theme}.png`,fullPage:true});
  await studio.getByRole('button',{name:'Generate all 12',exact:true}).click();
  await expect(body).toHaveValue('ariesBody synthetic opening.\n\nariesBody synthetic final sentence.');
  await expect(studio.getByText('12/12 complete',{exact:true})).toBeVisible();
  expect(await call({method:'generation-calls'})).toBe(1);
  const raw=(await call({method:'rows'})).find((r:any)=>r.sections?.moonWritingDraft);
  expect(raw.status).toBe('DRAFT');expect(raw.lane).toBe('reference');expect(raw.body).toBe('');
  expect((await call({method:'reader',body:{keys:[raw.content_key,moonHoroscopeKey(event)]}})).payload.rows).toHaveLength(0);
  await heading.fill('Aries & Aries Rising');await body.fill('  Edited opening.\n\nEdited final sentence.  ');
  const choose=async(sign:string)=>{if(width<900)await studio.getByLabel('Moon horoscope sign',{exact:true}).selectOption(sign);else await studio.getByRole('navigation',{name:'Moon readings by sign'}).getByRole('button',{name:new RegExp(`^${sign[0].toUpperCase()+sign.slice(1)}`)}).click();};
  await choose('pisces');await expect(body).toHaveValue('piscesBody synthetic opening.\n\npiscesBody synthetic final sentence.');await choose('aries');await expect(heading).toHaveValue('Aries & Aries Rising');
  await studio.getByRole('button',{name:'Save draft',exact:true}).click();await expect(studio.getByRole('status')).toHaveText('Draft saved.');
  await page.reload();await expect(body).toHaveValue('  Edited opening.\n\nEdited final sentence.  ');await expect(heading).toHaveValue('Aries & Aries Rising');
  await page.screenshot({path:`test-results/moon-ai-edited-${width}-${theme}.png`,fullPage:true});
  await studio.getByRole('button',{name:'Publish',exact:true}).click();await studio.getByRole('checkbox',{name:'I approve all 12 saved readings.'}).check();await studio.getByRole('button',{name:'Publish Moon horoscopes',exact:true}).click();
  await expect(studio.getByRole('status')).toContainText('Published.');
  const reader=await call({method:'reader',body:{keys:[moonHoroscopeKey(event)]}});expect(reader.payload.rows).toHaveLength(1);expect(reader.payload.rows[0].sections.articleHoroscopes.passages[0].body).toBe('  Edited opening.\n\nEdited final sentence.  ');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{pending.forEach(task=>task.reject(new Error('Fixture complete.')));pending.clear();child.kill();}
});
