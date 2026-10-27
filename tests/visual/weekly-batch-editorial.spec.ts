import {weeklyBatchFixtureResult} from '../helpers/weekly-editorial-result.mts';
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
 const profile=await call({method:'POST',url:'/api/admin/generated-content?writingProfiles=true',body:{profile:{...defaultHoroscopeProfile('weekly'),voiceGuidance:'Complete synthetic initial Weekly voice.',sourceGuidance:'Complete synthetic example opening. Complete synthetic example middle. Complete synthetic example ending.'},expectedUpdatedAt:null}});
 expect(profile.status).toBe(200);
 const previous=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=2026-10-26&timeZone=America%2FNew_York'});
 const earlier=emptyHoroscopeEdition(previous.payload.brief.window);earlier.passages.forEach((p:any)=>{p.headline=`Earlier ${p.sign}`;p.body=`A complete former ${p.sign} reading. You should say what you want.`;});
 await call({method:'POST',body:{contentKey:horoscopeEditionKey(earlier.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Earlier synthetic edition',body:horoscopeEditionBody(earlier),sections:{horoscopeEdition:earlier},facts:{horoscopeBrief:{brief:previous.payload.brief,signature:previous.payload.signature}},sourceSnapshot:{horoscopeOutlines:{}}}});
 const facts=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=2026-11-02&timeZone=America%2FNew_York'});expect(facts.status).toBe(200);
 const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
 if(complete)edition.passages.forEach((p:any)=>{p.headline=`Synthetic ${p.sign} reading`;p.body=`The ${p.sign} plan has its own subject. You should say what you want.`;});
 const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic editorial gate edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeOutlines:{}}}});expect(created.status).toBe(200);const id=created.payload.rows[0].id;
 const latest=async()=>decodeWeeklyHistoryRow((await call({method:'rows'})).find((row:any)=>row.id===id));
 await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{if(url.pathname!=='/api/admin/horoscope-writing')return false;const result=await call({method:'writing',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;}});
 await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
 const open=async()=>{await page.goto('/admin/content#horoscopes');const studio=page.getByRole('region',{name:'Horoscope editions'});await showSavedHoroscopeEditions(page,studio);await studio.locator('.admin-horoscope-saved button').first().click();return studio;};
 return {child,call,latest,open,edition};
 }catch(error){child.kill();throw error;}
}
for(const width of [390,1440])for(const theme of ['light','dark']){
 test(`Weekly full-set findings, save and recheck ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
 const f=await fixture(page);try{
 const studio=await f.open(),gate=studio.getByRole('region',{name:'Weekly batch editorial gate'});
 await expect(gate.getByText('Plan twelve distinct concerns before drafting.')).toBeVisible();
 await gate.getByRole('button',{name:'Load batch review plan',exact:true}).click();
 const evidence=f.edition.passages.slice(0,3).map((p:any)=>({sign:p.sign,quote:'You should say what you want.'}));
 const findings=['interpretations','phrases','endings'].map(category=>({category,reason:`Synthetic ${category} repeat across three signs.`,evidence,priorEvidence:[]}));
 const ready=await f.latest();
 const prepared=await f.call({method:'writing',body:{action:'prepare',id:ready.id,expectedUpdatedAt:ready.updated_at}});
 findings.push({category:'cross_week_repetition',reason:'The same advice concludes a previous week.',evidence:evidence.slice(0,1),priorEvidence:[{editionId:ready.source_snapshot.weeklyComparison.editions[0].id,sign:'aries',quote:'You should say what you want.'}]});
 const value={...weeklyBatchFixtureResult({stage:'batch-review',priorWeeks:ready.source_snapshot.weeklyComparison,facts:prepared.payload.plan.readings.map((r:any)=>({sign:r.sign,developments:r.developments})),existingReadings:ready.sections.horoscopeEdition.passages}),checks:Object.fromEntries(['interpretations','phrases','endings','house_grounding','unsupported_history','technical_filler','cross_week_repetition','astrology_drives_reading','rhetorical_scripts'].map(key=>[key,findings.some(f=>f.category===key)?'fail':'pass'])),findings};
 await f.call({method:'writer-state',body:{nextBatchResult:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]}}});
 await gate.getByRole('button',{name:'Review all twelve · 1 AI request',exact:true}).click();
 await expect(gate.getByText('Checking all twelve readings…',{exact:true})).toBeVisible();
 await gate.getByRole('button',{name:'Check saved batch progress',exact:true}).click();
 await expect(gate.getByRole('note')).toHaveCount(4);
 await expect(gate).toContainText('aries: “You should say what you want.”');
 await expect(gate).toContainText('Prior week · aries: “You should say what you want.”');
 expect((await f.call({method:'writer-state'}))).toMatchObject({calls:0,reviewCalls:0,batchCalls:1});
 expect((await f.latest()).sections.horoscopeEdition).toEqual(f.edition);
 const warning=gate.getByRole('note').first();await expect(warning).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await page.screenshot({path:`test-results/weekly-gate-findings-${width}-${theme}.png`,fullPage:true});
 await page.reload();await expect(gate.getByRole('note')).toHaveCount(4);
 await gate.getByRole('button',{name:'Load batch review plan',exact:true}).click();
 await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:/^Aries/}).click();
 const edited='The exact synthetic owner edit has a different consequence. This final sentence belongs to Aries.';
 await studio.getByLabel('Complete reading').fill(edited);
 await expect(gate.getByRole('button',{name:'Review all twelve · 1 AI request'})).toBeDisabled();
 await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
 await expect(gate.getByRole('note')).toHaveCount(0);
 await expect(gate).toContainText('out of date');
 await gate.getByRole('button',{name:'Review all twelve · 1 AI request',exact:true}).click();
 await gate.getByRole('button',{name:'Check saved batch progress',exact:true}).click();
 await expect(gate).toContainText('current twelve-sign set passed its batch comparison');
 await page.reload();await expect(gate).toContainText('current twelve-sign set passed its batch comparison');
 expect((await f.latest()).sections.horoscopeEdition.passages[0].body).toBe(edited);
 expect((await f.latest()).status).toBe('DRAFT');expect((await f.call({method:'writer-state'}))).toMatchObject({calls:0,reviewCalls:0,batchCalls:2});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{f.child.kill();}
 });
}

for(const [width,theme] of [[390,'dark'],[1440,'light']] as const){
 test(`Weekly approved generation includes both shared stages ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
 const f=await fixture(page,false);try{
 const studio=await f.open();
 await studio.getByText('Writing instructions · optional',{exact:true}).click();
 await expect(studio.getByText('Edition plan: weekly profile, revision 1.',{exact:true})).toBeVisible();
 await studio.getByRole('button',{name:'Edit writing instructions',exact:true}).click();
 const profiles=studio.getByRole('region',{name:'Horoscope writing profiles',exact:true});
 const revisedVoice='Complete synthetic latest Weekly voice. Give each opening room to explain the situation.';
 await profiles.getByRole('textbox',{name:'Voice guidance',exact:true}).fill(revisedVoice);
 await profiles.getByRole('button',{name:'Save writing profile',exact:true}).click();
 await expect(profiles).toContainText('Revision 2');
 await expect(studio.getByText('Edition plan: weekly profile, revision 1.',{exact:true})).toBeVisible();
 expect((await f.call({method:'writer-state'}))).toMatchObject({calls:0,reviewCalls:0,batchCalls:0});
 expect((await f.latest()).sections.horoscopeEdition).toEqual(f.edition);
 await page.reload();
 await studio.getByText('Writing instructions · optional',{exact:true}).click();
 await expect(studio.getByText('Edition plan: weekly profile, revision 1.',{exact:true})).toBeVisible();
 expect((await f.latest()).source_snapshot.studioWritingProfile.revision).toBe(1);
 expect((await f.latest()).sections.horoscopeEdition).toEqual(f.edition);
 expect((await f.call({method:'writer-state'}))).toMatchObject({calls:0,reviewCalls:0,batchCalls:0});
 await studio.getByRole('button',{name:'Review writing plan',exact:true}).click();
 await expect(studio.getByText('Edition plan: weekly profile, revision 2.',{exact:true})).toBeVisible();
 expect((await f.latest()).source_snapshot.studioWritingProfile.profile.voiceGuidance).toBe(revisedVoice);
 expect((await f.call({method:'writer-state'}))).toMatchObject({calls:0,reviewCalls:0,batchCalls:0});
 await expect(studio.getByText(/Up to 26 paid AI requests: one twelve-sign plan/)).toBeVisible();
 await studio.getByLabel('I approve this writing plan for generation.').check();
 await studio.getByRole('button',{name:'Generate 12 drafts',exact:true}).click();
 await expect.poll(async()=>(await f.latest()).source_snapshot.horoscopeGeneration.batch.status,{timeout:120000,intervals:[1000]}).toBe('complete');
 const gate=studio.getByRole('region',{name:'Weekly batch editorial gate'});
 await expect(gate).toContainText('current twelve-sign set passed its batch comparison');
 await gate.getByText('Shared concerns for all twelve signs',{exact:true}).click();
 for(let i=1;i<=12;i++)await expect(gate.locator('p').filter({hasText:new RegExp(`^\\w+: Synthetic distinct concern ${i}$`)})).toBeVisible();
 expect((await f.call({method:'writer-state'}))).toMatchObject({calls:12,reviewCalls:12,batchCalls:2});
 expect((await f.latest()).source_snapshot.studioWritingProfile.revision).toBe(2);
 await page.reload();await expect(gate).toContainText('current twelve-sign set passed its batch comparison');
 expect((await f.latest()).sections.horoscopeEdition.passages.every((p:any)=>p.body&&p.headline)).toBe(true);
 expect((await f.latest()).status).toBe('DRAFT');
 }finally{f.child.kill();}
 });
}
