import {test,expect,type Page} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../../apps/web/src/content/horoscopeEditions.mjs';

async function fixture(page:Page,missing=1){
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{
    env:{...process.env,HOROSCOPE_WRITER_FIXTURE:'1',HOROSCOPE_ALTERNATIVE_PROVIDERS_FIXTURE:'1'},
    execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,any>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{
    child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});
    child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});
  });
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try{
    await ready;
    const facts=await call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=2026-10-07&timeZone=America%2FNew_York'});
    expect(facts.status).toBe(200);const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
    for(const p of edition.passages.slice(0,-missing)){p.headline=`Saved ${p.sign}`;p.body=`Existing ${p.sign} opening.\n\nExisting ${p.sign} final sentence.`;}
    const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic model choice edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeGeneration:{rejections:[{id:'held-private-fixture',scope:'pisces',rejectedAt:'2026-10-06T12:00:00Z',passages:[{sign:'pisces',headline:'',body:''}],generation:{candidateHolds:{pisces:{candidate:{headline:'Held private title',body:'Held private opening.\n\nHeld private final sentence.'}}}}}]}}}});
    expect(created.status).toBe(200);const id=created.payload.rows[0].id;
    const latest=async()=>(await call({method:'rows'})).find((row:any)=>row.id===id);
    const state={loseBatchStart:false};
    await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
      if(url.pathname!=='/api/admin/horoscope-writing')return false;
      const body=route.request().postDataJSON();
      const result=await call({method:'writing',body});
      if(body.action==='start-batch'&&state.loseBatchStart){state.loseBatchStart=false;await route.fulfill({status:503,json:{ok:false,error:'Synthetic lost batch acknowledgement.'}});return true;}
      await route.fulfill({status:result.status,json:result.payload});return true;
    }});
    await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    const open=async()=>{await page.goto('/admin/content#horoscopes');await page.reload();const studio=page.getByRole('region',{name:'Horoscope editions'});await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/Synthetic model choice edition/}).click();return studio;};
    return {child,call,latest,state,open,original:edition,id};
  }catch(error){child.kill();throw error;}
}

// Faults now occur at the provider/storage boundary: the browser does not send
// generate/continue for each sign. API regressions cover reservation, lease and
// timeout recovery; these tests exercise the actual rendered batch controls.
for(const [width,theme,choice] of [[1440,'light','gemini'],[390,'dark','gemini'],[1440,'dark','claude'],[390,'light','current']] as const){
 test(`Saved Weekly batch survives navigation ${choice} ${width} ${theme}`,async({page})=>{
  test.setTimeout(180000);await page.setViewportSize({width,height:1000});
  await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page,choice==='gemini'?12:2);try{
   const studio=await f.open(),selector=studio.getByLabel('Writing model',{exact:true});
   await selector.selectOption(choice);
   await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
   if(choice==='claude')await f.call({method:'provider-state',body:{claudeDelay:5000}});
   else await f.call({method:'writer-state',body:{pendingPolls:10000}});
   if(width===1440&&choice==='gemini')f.state.loseBatchStart=true;
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await studio.getByRole('button',{name:choice==='gemini'?'Generate 12 drafts':'Generate missing readings',exact:true}).click();
   await expect(studio.getByText('Generating the approved batch. You can leave this page.',{exact:true})).toBeVisible();
   await expect(selector).toBeDisabled();
   await expect.poll(async()=>(await f.call({method:'writer-state'})).calls).toBeGreaterThan(0);
   await page.goto('/admin/content#templates');
   await f.call({method:'writer-state',body:{pendingPolls:0}});
   await expect.poll(async()=>(await f.latest()).source_snapshot.horoscopeGeneration.batch.status,{timeout:120000,intervals:[1000]}).toBe('complete');
   let saved=await f.latest();
   expect(saved.sections.horoscopeEdition.passages.every((p:any)=>p.body&&p.headline)).toBe(true);
   expect(saved.status).toBe('DRAFT');
   const count=choice==='gemini'?12:2;
   expect(await f.call({method:'writer-state'})).toMatchObject({calls:count,reviewCalls:count});
   await f.open();await expect(studio.getByText('12/12 readings ready',{exact:false})).toBeVisible();
   await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:/Pisces/}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(/Your saved fixture ends here/);
   await studio.getByRole('button',{name:'Load saved writing evidence',exact:true}).click();
   await studio.getByText('Writing evidence used',{exact:true}).click();
   await studio.getByText('primary owner passage · 1',{exact:true}).click();
   await expect(studio.getByLabel('Complete source passage 1',{exact:true})).toHaveValue(saved.source_snapshot.horoscopeGeneration.readings.pisces.ownerEvidence.passages[0].text);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/durable-weekly-${choice}-${width}-${theme}.png`,fullPage:true});
  }finally{f.child.kill();}
 });
}

test('Pause persists after reload and resume reuses the saved batch approval',async({page})=>{
 const f=await fixture(page,2);try{
  const studio=await f.open();await studio.getByLabel('Writing model',{exact:true}).selectOption('gemini');
  await f.call({method:'writer-state',body:{pendingPolls:10000}});
  await studio.getByLabel('I approve this writing plan for generation.').check();
  await studio.getByRole('button',{name:'Generate missing readings',exact:true}).click();
  await expect.poll(async()=>Boolean((await f.latest()).source_snapshot.horoscopeGeneration.active?.responseId)).toBe(true);
  // Refresh the latest version before issuing the explicit pause.
  await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
  await studio.getByRole('button',{name:'Pause generation',exact:true}).click();
  await expect.poll(async()=>(await f.latest()).source_snapshot.horoscopeGeneration.batch.status).toBe('paused');
  const batchId=(await f.latest()).source_snapshot.horoscopeGeneration.batch.id;
  await page.reload();await f.open();
  await expect(studio.getByText('The batch is paused. Resume to continue its saved approval.',{exact:true})).toBeVisible();
  await f.call({method:'writer-state',body:{pendingPolls:0}});
  await studio.getByRole('button',{name:'Resume generation',exact:true}).click();
  await expect.poll(async()=>(await f.latest()).source_snapshot.horoscopeGeneration.batch.status,{timeout:45000}).toBe('complete');
  expect((await f.latest()).source_snapshot.horoscopeGeneration.batch.id).toBe(batchId);
  expect(await f.call({method:'writer-state'})).toMatchObject({calls:2,reviewCalls:2});
 }finally{f.child.kill();}
});

for(const [width,theme] of [[1440,'light'],[390,'dark']] as const){
 test(`Held prose review frees the next sign and remains editable ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page,2);try{
   await f.call({method:'writer-state',body:{nextReviewResult:{status:'completed',output:[]}}});
   const studio=await f.open();await studio.getByLabel('Writing model',{exact:true}).selectOption('gemini');
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await studio.getByRole('button',{name:'Generate missing readings',exact:true}).click();
   await expect.poll(async()=>(await f.latest()).source_snapshot.horoscopeGeneration.batch.status,{timeout:45000}).toBe('needs_attention');
   await page.reload();await f.open();
   await expect(studio.getByText('11/12 readings ready',{exact:false})).toBeVisible();
   await expect(studio.getByRole('heading',{name:'Aquarius prose check did not finish',exact:true})).toBeVisible();
   const saved=await f.latest();expect(saved.status).toBe('DRAFT');
   await studio.getByRole('button',{name:'Edit saved Aquarius draft',exact:true}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(saved.source_snapshot.horoscopeGeneration.candidateHolds.aquarius.candidate.body);
   expect(await f.call({method:'writer-state'})).toMatchObject({calls:2,reviewCalls:2});
  }finally{f.child.kill();}
 });
}

test('Unavailable provider is visible but cannot be selected',async({page})=>{
  const f=await fixture(page);try{
    await f.call({method:'provider-state',body:{missingGemini:true}});
    const studio=await f.open(),selector=studio.getByRole('combobox',{name:'Writing model'});
    await expect(selector).toBeEnabled();await expect(selector.locator('option[value="gemini"]')).toHaveAttribute('disabled','');
    await expect(studio.getByText('Gemini 3.1 Pro (preview) needs its server API connection.')).toBeVisible();
    await expect(selector).toHaveValue('current');expect((await f.call({method:'writer-state'})).calls).toBe(0);
  }finally{f.child.kill();}
});


test('A stale model choice reloads the current Weekly plan without overwriting another client',async({page})=>{
 const f=await fixture(page);try{
  const studio=await f.open(),selector=studio.getByRole('combobox',{name:'Writing model'});
  await expect(selector).toBeEnabled();
  const newer=await f.call({method:'writing',body:{action:'prepare',id:f.id,expectedUpdatedAt:(await f.latest()).updated_at,writerChoice:'claude'}});
  expect(newer.status).toBe(200);
  await selector.selectOption('gemini');
  await expect(selector).toHaveValue('claude');await expect(selector).toBeEnabled();
  await expect(studio.getByRole('alert')).toHaveCount(0);
  await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
  expect((await f.latest()).source_snapshot.horoscopeWriterChoice).toBe('claude');
  expect((await f.call({method:'provider-state'})).requests).toEqual([]);
  expect((await f.latest()).sections.horoscopeEdition).toEqual(f.original);
  // An explicit choice on the refreshed version remains available.
  await selector.selectOption('gemini');await expect(studio.getByRole('status')).toContainText('Writing model saved');
  await expect(selector).toHaveValue('gemini');
  expect((await f.call({method:'provider-state'})).requests).toEqual([]);
 }finally{f.child.kill();}
});
