import {dailyBatchFixtureResult} from '../helpers/daily-editorial-result.mts';
import {test,expect,type Page} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {showSavedHoroscopeEditions} from '../helpers/horoscope-edition-navigation';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {decodeWeeklyHistoryRow} from '../../api/_lib/horoscope-history-storage';
import {defaultHoroscopeProfile} from '../../src/astro-writing/horoscopeWritingProfiles.mjs';
async function fixture(page:Page,complete=true){
 const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,ZODIAC_TEMPLATE_FIXTURE:'1',HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
 let sequence=0,stderr='';const pending=new Map<number,any>();child.stderr?.on('data',value=>stderr+=value);
 const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
 const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
 try{
 await ready;
 const profile=await call({method:'POST',url:'/api/admin/generated-content?writingProfiles=true',body:{profile:{...defaultHoroscopeProfile('daily'),voiceGuidance:'Complete synthetic initial Daily voice.',sourceGuidance:'Complete synthetic example opening. Complete synthetic example middle. Complete synthetic example ending.'},expectedUpdatedAt:null}});
 expect(profile.status).toBe(200);
 const facts=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=daily&date=2026-10-28&timeZone=America%2FNew_York'});expect(facts.status).toBe(200);
 const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
 if(complete)edition.passages.forEach((p:any)=>{p.headline=`Synthetic ${p.sign} reading`;p.body=`Shared opening sentence. A complete synthetic ${p.sign} observation. Shared complete ending.`;});
 const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic editorial gate edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeOutlines:{}}}});expect(created.status).toBe(200);const id=created.payload.rows[0].id;
 const latest=async()=>decodeWeeklyHistoryRow((await call({method:'rows'})).find((row:any)=>row.id===id));
 await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{if(url.pathname!=='/api/admin/horoscope-writing')return false;const result=await call({method:'writing',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;}});
 await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
 const open=async()=>{await page.goto('/admin/content#horoscopes');const studio=page.getByRole('region',{name:'Horoscope editions'});await showSavedHoroscopeEditions(page,studio);await studio.locator('.admin-horoscope-saved button').first().click();return studio;};
 return {child,call,latest,open,edition,profile:profile.payload.profile};
 }catch(error){child.kill();throw error;}
}
for(const width of [390,1440])for(const theme of ['light','dark']){
 test(`Daily full-set findings, edit, save and recheck ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page);try{
   const studio=await f.open(),gate=studio.getByRole('region',{name:'Daily batch editorial gate'});
   await expect(gate).toContainText('Review all twelve Daily readings for repeated interpretations, openings and endings.');
   await expect(gate.getByText('Shared concerns for all twelve signs',{exact:true})).toHaveCount(0);
   await gate.getByRole('button',{name:'Load batch review plan',exact:true}).click();
   const result=dailyBatchFixtureResult({readings:f.edition.passages});
   result.checks={interpretations:'fail',openings:'fail',endings:'fail'};
   result.findings=['interpretations','openings','endings'].map(category=>({category,
    reason:`Synthetic repeated ${category} across two current signs.`,
    evidence:f.edition.passages.slice(0,2).map((p:any)=>({sign:p.sign,
     quote:category==='openings'?'Shared opening sentence.':category==='endings'?'Shared complete ending.':p.body}))}));
   await f.call({method:'writer-state',body:{nextBatchResult:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]}}});
   await gate.getByRole('button',{name:'Review all twelve · 1 AI request',exact:true}).click();
   await expect(gate.getByText('Checking all twelve readings…',{exact:true})).toBeVisible();
   await gate.getByRole('button',{name:'Check saved batch progress',exact:true}).click();
   await expect(gate.getByRole('note')).toHaveCount(3);
   await expect(gate).toContainText('aries: “Shared opening sentence.”');
   await expect(gate).toContainText('taurus: “Shared complete ending.”');
   expect(await f.call({method:'writer-state'})).toMatchObject({calls:0,reviewCalls:0,batchCalls:1});
   expect((await f.latest()).sections.horoscopeEdition).toEqual(f.edition);
   await expect(gate.getByRole('note').first()).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
   await page.screenshot({path:`test-results/daily-gate-findings-${width}-${theme}.png`,fullPage:true});
   await page.reload();await expect(gate.getByRole('note')).toHaveCount(3);
   await gate.getByRole('button',{name:'Load batch review plan',exact:true}).click();
   await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:/^Aries/}).click();
   const edited='The exact synthetic owner edit concerns a specific invitation. This complete ending belongs to Aries.';
   await studio.getByLabel('Complete reading').fill(edited);
   await expect(gate.getByRole('button',{name:'Review all twelve · 1 AI request',exact:true})).toBeDisabled();
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(gate.getByRole('note')).toHaveCount(0);
   await expect(gate).toContainText('out of date');
   await gate.getByRole('button',{name:'Review all twelve · 1 AI request',exact:true}).click();
   await gate.getByRole('button',{name:'Check saved batch progress',exact:true}).click();
   await expect(gate).toContainText('current twelve-sign set passed its batch comparison');
   await page.reload();await expect(gate).toContainText('current twelve-sign set passed its batch comparison');
   expect((await f.latest()).sections.horoscopeEdition.passages[0].body).toBe(edited);
   expect((await f.latest()).status).toBe('DRAFT');
   const profiles=await f.call({method:'GET',url:'/api/admin/generated-content?writingProfiles=true'});
   expect(profiles.payload.profiles.find((p:any)=>p.profile.period==='daily')).toEqual(f.profile);
   expect(await f.call({method:'writer-state'})).toMatchObject({calls:0,reviewCalls:0,batchCalls:2});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{f.child.kill();}
 });
}

for(const [width,theme]of [[390,'dark'],[1440,'light']]as const){
 test(`Daily generation automatically reviews all twelve and survives navigation ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page,false);try{
   const studio=await f.open(),gate=studio.getByRole('region',{name:'Daily batch editorial gate'});
   await expect(gate).toContainText('The full-set Daily review runs after all twelve readings are saved.');
   await expect(studio.getByRole('group',{name:'Writing plans by sign'})).toBeVisible();
   await expect(studio.getByText(/Up to 25 paid AI requests/)).toBeVisible();
   await expect(studio.getByText(/one review of all twelve for repeated interpretations, openings and endings/)).toBeVisible();
   expect(await f.call({method:'writer-state'})).toMatchObject({calls:0,reviewCalls:0,batchCalls:0});
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await studio.getByRole('button',{name:'Generate 12 drafts',exact:true}).click();
   await expect.poll(async()=>(await f.latest()).source_snapshot.horoscopeGeneration.batch.status).toBe('running');
   await page.goto('/admin/content#library');
   await f.open();
   await expect.poll(async()=>(await f.latest()).source_snapshot.horoscopeGeneration.batch.status,{timeout:120000,intervals:[1000]}).toBe('complete');
   await expect(gate).toContainText('current twelve-sign set passed its batch comparison');
   expect(await f.call({method:'writer-state'})).toMatchObject({calls:12,reviewCalls:12,batchCalls:1});
   const row=await f.latest();
   expect(row.sections.horoscopeEdition.passages.filter((p:any)=>p.headline&&p.body)).toHaveLength(12);
   expect(row.status).toBe('DRAFT');
   await page.reload();await expect(gate).toContainText('current twelve-sign set passed its batch comparison');
   expect(await f.call({method:'writer-state'})).toMatchObject({calls:12,reviewCalls:12,batchCalls:1});
   const profiles=await f.call({method:'GET',url:'/api/admin/generated-content?writingProfiles=true'});
   expect(profiles.payload.profiles.find((p:any)=>p.profile.period==='daily')).toEqual(f.profile);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{f.child.kill();}
 });
}
