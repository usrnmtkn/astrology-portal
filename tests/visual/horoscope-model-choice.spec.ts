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
    const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic model choice edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{}}});
    expect(created.status).toBe(200);const id=created.payload.rows[0].id;
    const latest=async()=>(await call({method:'rows'})).find((row:any)=>row.id===id);
    const state={holdPoll:false};
    await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
      if(url.pathname!=='/api/admin/horoscope-writing')return false;
      const body=route.request().postDataJSON();
      if(body.action==='poll'&&state.holdPoll){await route.fulfill({status:202,json:{ok:true,pending:true,rows:[await latest()]}});return true;}
      const result=await call({method:'writing',body});await route.fulfill({status:result.status,json:result.payload});return true;
    }});
    await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    const open=async()=>{await page.goto('/admin/content#horoscopes');const studio=page.getByRole('region',{name:'Horoscope editions'});await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/Synthetic model choice edition/}).click();return studio;};
    return {child,call,latest,state,open,original:edition,id};
  }catch(error){child.kill();throw error;}
}

for(const [width,theme,choice] of [[1440,'light','gemini'],[390,'dark','claude']] as const){
 test(`Choose and recover horoscope model ${choice} ${width} ${theme}`,async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page);try{
    const studio=await f.open(),selector=studio.getByRole('combobox',{name:'Writing model'});
    await expect(selector).toHaveValue('current');await expect(selector).toBeEnabled();
    await expect(selector.locator('option')).toHaveText(['Current writer','Gemini 3.1 Pro (preview)','Claude Sonnet 5.5']);
    await studio.getByLabel('I approve this writing plan for generation.').check();
    await selector.evaluate(element=>element.scrollIntoView({block:'center'}));
    await selector.click();await selector.press('Escape');
    await selector.selectOption(choice);
    await expect(studio.getByRole('status')).toHaveText('Writing model saved. Review the plan before generating.');
    await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
    expect((await f.latest()).sections.horoscopeEdition).toEqual(f.original);
    await page.reload();await f.open();await expect(selector).toHaveValue(choice);await expect(selector).toBeEnabled();
    expect((await f.call({method:'writer-state'})).calls).toBe(0);
    f.state.holdPoll=true;
    await studio.getByLabel('I approve this writing plan for generation.').check();
    await studio.getByRole('button',{name:'Generate missing readings',exact:true}).click();
    await expect(selector).toBeDisabled();await expect(studio.getByText(/^Saved request:/)).toContainText(choice==='gemini'?'gemini-3.1-pro-preview':'claude-sonnet-5-5');
    await page.reload();await f.open();await expect(selector).toBeDisabled();await expect(selector).toHaveValue(choice);
    await selector.evaluate(element=>element.scrollIntoView({block:'center'}));
    await page.screenshot({path:`test-results/horoscope-model-${choice}-${width}-${theme}.png`,fullPage:width>600});
    f.state.holdPoll=false;
    // Reload deliberately pauses the rest of the batch. Resume the saved
    // request, including its existing independent review, without a new writer.
    const resume=studio.getByRole('button',{name:'Resume generation',exact:true});
    if(await resume.isVisible())await resume.click();
    await expect.poll(async()=>(await f.latest()).sections.horoscopeEdition.passages.at(-1).body,{timeout:35000}).toContain('Your saved fixture ends here.');
    const saved=await f.latest();expect(saved.sections.horoscopeEdition.passages.slice(0,-1)).toEqual(f.original.passages.slice(0,-1));
    expect(saved.status).toBe('DRAFT');expect(saved.source_snapshot.horoscopeGeneration.readings.pisces.config.provider).toBe(choice==='gemini'?'gemini':'anthropic');
    expect((await f.call({method:'writer-state'}))).toMatchObject({calls:1,reviewCalls:1});
    expect((await f.call({method:'provider-state'})).requests).toHaveLength(1);
    await page.reload();await f.open();
    await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:/Pisces/}).click();
    await expect(studio.getByLabel('Complete reading')).toHaveValue('You can read the complete pisces fixture opening.\n\nYour saved fixture ends here.');
    await expect(studio.getByText(/^Original draft model:/)).toContainText(choice==='gemini'?'gemini-3.1-pro-preview':'claude-sonnet-5-5');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
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


test('Legacy Gemini retrieval failure holds only that sign and the rest completes',async({page})=>{
  const f=await fixture(page,2);try{
    await f.call({method:'provider-state',body:{geminiDelay:1500,geminiRetrievalError:true}});
    const studio=await f.open();
    await studio.getByRole('combobox',{name:'Writing model'}).selectOption('gemini');
    f.state.holdPoll=true;
    await studio.getByLabel('I approve this writing plan for generation.').check();
    await studio.getByRole('button',{name:'Generate missing readings',exact:true}).click();
    await expect.poll(async()=>(await f.latest()).source_snapshot.horoscopeGeneration.active?.responseId).toBeTruthy();
    await f.call({method:'legacy-gemini-request',body:{id:f.id}});
    f.state.holdPoll=false;
    await expect(studio.getByText(/^Aquarius was interrupted before its response could be confirmed/)).toBeVisible();
    // Still the same batch, with no manual resume between Aquarius and Pisces.
    await expect.poll(async()=>(await f.latest()).sections.horoscopeEdition.passages.at(-1).body,{timeout:35000}).toContain('Your saved fixture ends here.');
    const row=await f.latest();
    expect(row.source_snapshot.horoscopeGeneration.heldRequests.aquarius.responseId).toBe('v1_synthetic_legacy');
    expect(row.sections.horoscopeEdition.passages.slice(0,-2)).toEqual(f.original.passages.slice(0,-2));
    expect(row.sections.horoscopeEdition.passages.at(-2).body).toBe('');
    expect((await f.call({method:'writer-state'})).calls).toBe(2);
    expect((await f.call({method:'provider-state'})).geminiGets).toBe(1);
    await page.reload();await f.open();
    await expect(studio.getByRole('button',{name:'Allow retry for Aquarius'})).toBeVisible();
    expect((await f.call({method:'writer-state'})).calls).toBe(2);
  }finally{f.child.kill();}
});

test('Release interrupted Gemini request succeeds despite the Google cancellation error',async({page})=>{
  const f=await fixture(page);try{
    await f.call({method:'provider-state',body:{geminiDelay:1500,geminiRetrievalError:true}});
    const studio=await f.open();
    await studio.getByRole('combobox',{name:'Writing model'}).selectOption('gemini');
    f.state.holdPoll=true;
    await studio.getByLabel('I approve this writing plan for generation.').check();
    await studio.getByRole('button',{name:'Generate missing readings',exact:true}).click();
    await expect.poll(async()=>(await f.latest()).source_snapshot.horoscopeGeneration.active?.responseId).toBeTruthy();
    await f.call({method:'legacy-gemini-request',body:{id:f.id,expired:true}});
    await page.reload();await f.open();
    page.once('dialog',dialog=>dialog.accept());
    await studio.getByRole('button',{name:'Release interrupted request',exact:true}).click();
    await expect(studio.getByRole('status')).toHaveText('Interrupted request released. Review the plan before starting another request.');
    const row=await f.latest();expect(row.source_snapshot.horoscopeGeneration.active).toBeNull();
    expect(row.source_snapshot.horoscopeGeneration.lastInterrupted.responseId).toBe('v1_synthetic_legacy');
    expect(row.source_snapshot.horoscopeGeneration.lastInterrupted.outcome).toBe('unknown');
    expect(row.sections.horoscopeEdition).toEqual(f.original);
    expect((await f.call({method:'writer-state'})).calls).toBe(1);
  }finally{f.child.kill();}
});
