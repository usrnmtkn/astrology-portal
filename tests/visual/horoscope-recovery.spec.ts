import {test,expect,type Page} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../../apps/web/src/content/horoscopeEditions.mjs';

async function fixture(page:Page,missing=1,unknown=false,period='weekly'){
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,ZODIAC_TEMPLATE_FIXTURE:'1',HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try{
    await ready;
    const facts=await call({method:'GET',url:`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=${period==='seasonal'?'2026-09-01':'2026-09-24'}&timeZone=America%2FNew_York`});
    expect(facts.status).toBe(200);const {brief,signature}=facts.payload;
    const edition=emptyHoroscopeEdition(brief.window);
    if(period==='seasonal')edition.passages=edition.passages.filter(p=>p.sign!=='overview'); // Existing saved editions.
    edition.passages.forEach((p:any,index:number)=>{if(index<12-missing){p.headline=`Saved ${p.sign} headline`;p.body=`Existing ${p.sign} opening.\n\nExisting ${p.sign} final sentence.`;}});
    const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',targetDate:null,status:'DRAFT',lane:'serving',reviewState:null,headline:'Synthetic recovery edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{horoscopeOutlines:{}}}});
    expect(created.status).toBe(200);const id=created.payload.rows[0].id;
    const latest=async()=>(await call({method:'rows'})).find((row:any)=>row.id===id);
    const action=async(action:string,extra:any={})=>{const row=await latest();return call({method:'writing',body:{action,id,expectedUpdatedAt:row.updated_at,...extra}});};
    const plan=await action('prepare');expect(plan.status).toBe(200);
    if(unknown)await call({method:'writer-state',body:{unknownNext:true}});
    const start=await action('generate',{sign:edition.passages[12-missing].sign,approvedPlanHash:plan.payload.plan.planHash});expect(start.status).toBe(unknown?200:202);
    if(unknown)await call({method:'interrupted-horoscope-start',body:{id}});
    const state={failPoll:false,failRead:false,failDiagnosis:false,conflictPoll:false,holdPoll:false,held:false,release:()=>{}};
    await routeStudioInventoryApi(page,{call:async(message)=>{
      if(state.failRead&&message.method==='GET'&&message.url?.includes('?id='))return {status:503,payload:{ok:false,error:'Fixture connection unavailable.'}};
      return call(message);
    },answer:async(route,url)=>{
      if(url.pathname!=='/api/admin/horoscope-writing')return false;
      const body=route.request().postDataJSON();
      if(body.action==='diagnose'&&state.failDiagnosis){state.failDiagnosis=false;await route.fulfill({status:503,json:{ok:false,error:'Fixture diagnosis unavailable.'}});return true;}
      if(body.action==='poll'&&state.failPoll){state.failPoll=false;await route.fulfill({status:503,json:{ok:false,error:'Fixture connection interrupted.'}});return true;}
      if(body.action==='poll'&&state.conflictPoll){state.conflictPoll=false;expect((await action('poll')).status).toBe(200);}
      const result=await call({method:'writing',body});
      if(body.action==='poll'&&state.holdPoll){state.holdPoll=false;state.held=true;await new Promise<void>(resolve=>{state.release=resolve;});}
      await route.fulfill({status:result.status,json:result.payload}).catch(()=>{});return true;
    }});
    await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    const open=async()=>{await page.goto('/admin/content#horoscopes');const studio=page.getByRole('region',{name:'Horoscope editions'});await studio.getByText(/^Continue a saved edition/).click();await studio.locator('.admin-horoscope-saved button').first().click();return studio;};
    return {child,call,latest,action,state,open,original:edition};
  }catch(error){child.kill();throw error;}
}

for(const [width,theme] of [[390,'dark'],[1440,'light']] as const){
 test(`Correct prohibited punctuation without another AI request ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page);try{
   const original='You can read this fixture\u2014and correct its punctuation.';
   await f.call({method:'writer-state',body:{nextResult:{status:'completed',usage:{input_tokens:100,output_tokens:40},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({headline:'Pisces & Pisces Rising',body:original})}]}]}}});
   const studio=await f.open();await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
   await expect(studio.getByRole('alert')).toContainText('prohibited em dash');
   await expect(studio.getByText('11/12 readings ready',{exact:false})).toBeVisible();
   await studio.getByRole('button',{name:'Edit punctuation',exact:true}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(original);
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('alert')).toContainText('Remove the em dash');
   await expect(studio.getByLabel('Complete reading')).toHaveValue(original);
   const corrected='You can read this fixture and correct its punctuation.';
   await studio.getByLabel('Complete reading').fill(corrected);
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toHaveText('Saved edition draft.');
   await page.reload();await f.open();await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:/^Pisces/}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(corrected);
   const row=await f.latest();expect(row.source_snapshot.horoscopeGeneration.lastError).toBeNull();
   expect(row.source_snapshot.horoscopeGeneration.failures.at(-1).candidate.body).toBe(original);
   expect(row.sections.horoscopeEdition.passages.slice(0,11)).toEqual(f.original.passages.slice(0,11));
   expect((await f.call({method:'writer-state'})).calls).toBe(1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/horoscope-punctuation-${width}-${theme}.png`,fullPage:true});
  }finally{f.child.kill();}
 });
}

for(const [width,theme] of [[390,'dark'],[1440,'light']] as const){
  test(`Recover saved request without duplicate generation ${width} ${theme}`,async({page})=>{
    await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
    const f=await fixture(page);try{
      const studio=await f.open();await expect(studio.getByText('11/12 readings ready',{exact:false})).toBeVisible();
      const responseId=(await f.latest()).source_snapshot.horoscopeGeneration.active.responseId;
      await f.call({method:'writer-state',body:{pendingPolls:2}});
      await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
      await expect(studio.getByRole('status')).toContainText('Pisces is still processing');await expect(studio.getByRole('alert')).toHaveCount(0);
      f.state.holdPoll=true;
      await studio.getByRole('button',{name:'Resume generation',exact:true}).click();
      await expect.poll(()=>f.state.held).toBe(true);
      // Recovery supersedes a pending browser poll; its late response must not restore stale state.
      await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
      await expect(studio.getByRole('button',{name:'3 · Review',exact:true})).toHaveAttribute('aria-current','step');
      f.state.release();
      await expect(studio.getByRole('alert')).toHaveCount(0);
      await expect(studio.getByRole('status')).toHaveText('All readings are saved and ready to review.');
      await expect(studio.getByLabel('Complete reading')).toHaveValue(f.original.passages[0].body);
      await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:/^Pisces/}).click();
      await expect(studio.getByLabel('Complete reading')).toHaveValue('You can read the complete pisces fixture opening.\n\nYour saved fixture ends here.');
      const row=await f.latest();expect(row.status).toBe('DRAFT');expect(row.source_snapshot.horoscopeGeneration.active).toBeNull();
      expect(row.sections.horoscopeEdition.passages.slice(0,11)).toEqual(f.original.passages.slice(0,11));
      expect(row.source_snapshot.horoscopeGeneration.readings.pisces.responseId).toBe(responseId);
      expect((await f.call({method:'writer-state'})).calls).toBe(1);
      await studio.getByLabel('Complete reading').fill('Unsaved opening.\n\nUnsaved final sentence.');
      await studio.getByRole('button',{name:'2 · Generate',exact:true}).click();
      await expect(studio.getByRole('button',{name:'Check saved progress',exact:true})).toBeDisabled();
      await studio.getByRole('button',{name:'Continue to review',exact:true}).click();
      await expect(studio.getByLabel('Complete reading')).toHaveValue('Unsaved opening.\n\nUnsaved final sentence.');
      // Opening from a fresh page retrieves the exact saved edition, with no generation or publication.
      page.once('dialog',dialog=>dialog.accept());await page.reload();await f.open();
      await expect(studio.getByText('12/12 readings ready',{exact:false})).toBeVisible();
      await expect(studio.getByLabel('Complete reading')).toHaveValue(f.original.passages[0].body);
      expect(await f.latest()).toEqual(row);
      await studio.getByRole('button',{name:'2 · Generate',exact:true}).click();
      await expect(studio.getByText('Your drafts are ready to review.',{exact:true})).toBeVisible();
      await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
      await expect(studio.getByLabel('Complete reading')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:`test-results/horoscope-recovered-${width}-${theme}.png`,fullPage:true});
    }finally{f.state.release();f.child.kill();}
  });
}

test('Reconcile an edition completed elsewhere instead of displaying a stale conflict',async({page})=>{
  const f=await fixture(page);try{
    const studio=await f.open();f.state.conflictPoll=true;
    await studio.getByRole('button',{name:'Resume generation',exact:true}).click();
    await expect(studio.getByRole('status')).toHaveText('All readings are saved and ready to review.');
    await expect(studio.getByRole('alert')).toHaveCount(0);await expect(studio.getByLabel('Complete reading')).toHaveValue(f.original.passages[0].body);
    expect((await f.call({method:'writer-state'})).calls).toBe(1);
  }finally{f.child.kill();}
});

test('Connection recovery retains the existing request and only prepares remaining signs',async({page})=>{
  const f=await fixture(page,2);try{
    const studio=await f.open();f.state.failPoll=true;
    await studio.getByRole('button',{name:'Resume generation',exact:true}).click();
    await expect(studio.getByRole('status')).toContainText('Aquarius is still processing');await expect(studio.getByRole('alert')).toHaveCount(0);
    f.state.failRead=true;await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
    await expect(studio.getByRole('status')).toContainText('Studio could not check saved progress yet');await expect(studio.getByRole('alert')).toHaveCount(0);
    f.state.failRead=false;await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
    await expect(studio.getByRole('status')).toContainText('11/12 readings are saved. Review the current writing plan');
    await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
    await expect(studio.getByRole('button',{name:'Generate missing readings',exact:true})).toBeDisabled();
    const row=await f.latest();expect(row.sections.horoscopeEdition.passages[10].body).toContain('Your saved fixture ends here.');expect(row.sections.horoscopeEdition.passages[11].body).toBe('');
    expect((await f.call({method:'writer-state'})).calls).toBe(1);
  }finally{f.child.kill();}
});

test('A terminal provider failure stays actionable and is not disguised as a stall',async({page})=>{
  const f=await fixture(page);try{
    const studio=await f.open();await f.call({method:'writer-state',body:{terminalNext:true}});
    await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
    await expect(studio.getByRole('alert')).toContainText('The writer stopped before finishing this reading. Saved readings are kept.');
    await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
    await expect(studio.getByRole('button',{name:'Retry Pisces',exact:true})).toBeDisabled();
    expect((await f.latest()).source_snapshot.horoscopeGeneration.active).toBeNull();expect((await f.call({method:'writer-state'})).calls).toBe(1);
  }finally{f.child.kill();}
});

test('An unconfirmed provider request is retained without starting or releasing another request',async({page})=>{
  const f=await fixture(page,1,true);try{
    const studio=await f.open();const before=await f.latest();
    await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
    await expect(studio.getByRole('status')).toContainText('Waiting for request confirmation.');
    await expect(studio.getByRole('alert')).toHaveCount(0);
    expect(await f.latest()).toEqual(before);expect((await f.call({method:'writer-state'})).calls).toBe(1);
  }finally{f.child.kill();}
});

for(const [width,theme] of [[390,'dark'],[1440,'light']] as const){
 test(`Opening a legacy seasonal failure explains the saved attempt without retrying ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page,12,false,'seasonal');try{
   const failedResponse={status:'failed',error:{code:'credit_balance_exhausted',message:'Private fixture billing details'},output:[]};
   const nextDiagnosis=()=>f.call({method:'writer-state',body:{nextResult:failedResponse}});
   await nextDiagnosis();expect((await f.action('poll')).status).toBe(422);
   const legacy=await f.call({method:'legacy-horoscope-failure',body:{id:(await f.latest()).id}});
   await nextDiagnosis();const studio=await f.open();
   const history=studio.locator('details').filter({has:page.locator('summary',{hasText:/^Previous attempt$/})});
   await expect(studio.getByRole('alert')).toHaveCount(0);
   await expect(history).not.toHaveAttribute('open','');
   await history.locator('summary').click();
   await expect(history).toContainText('The previous attempt stopped because the writing API had no credits.');
   await expect(history).toContainText('not your current balance');
   await expect(studio.getByText('The writer did not complete a usable reading.',{exact:false})).toHaveCount(0);
   await expect(studio.getByRole('button',{name:'Retry Aries',exact:true})).toBeDisabled();
   expect(await f.latest()).toEqual(legacy);expect((await f.call({method:'writer-state'})).calls).toBe(1);
   await studio.getByRole('button',{name:'1 · Dates',exact:true}).click();
   await expect(studio.getByLabel('Reference date')).toHaveValue('2026-09-01');
   await nextDiagnosis();await studio.getByRole('button',{name:'Continue to writing plan',exact:true}).click();
   await expect(history).toContainText('not your current balance');
   expect(await f.latest()).toEqual(legacy);
   // An unavailable historical response must leave the plan and recovery action usable.
   f.state.failDiagnosis=true;await nextDiagnosis();await page.reload();await f.open();
   await expect(studio.getByRole('alert')).toHaveCount(0);
   await expect(history).not.toHaveAttribute('open','');
   await history.locator('summary').click();
   await expect(history).toContainText('its details are unavailable');
   await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
   await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
   await expect(history).toContainText('not your current balance');
   await expect(studio.getByRole('button',{name:'Retry Aries',exact:true})).toBeDisabled();
   expect(await f.latest()).toEqual(legacy);expect((await f.call({method:'writer-state'})).calls).toBe(1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/horoscope-legacy-failure-${width}-${theme}.png`,fullPage:true});
  }finally{f.child.kill();}
 });
 test(`Seasonal failure retries only one sign and preserves the selected date ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page,12,false,'seasonal');try{
   const studio=await f.open();
   await f.call({method:'writer-state',body:{nextResult:{status:'failed',error:{code:'credit_balance_exhausted',message:'Private fixture billing details'},output:[]}}});
   await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
   await expect(studio.getByRole('alert')).toContainText('The previous attempt stopped because the writing API had no credits.');
   await expect(studio.getByText('12 readings still need drafts. Existing writing is kept.',{exact:true})).toBeVisible();
   await expect(studio.getByRole('button',{name:'Retry Aries',exact:true})).toBeDisabled();
   const failed=await f.latest();expect(failed.source_snapshot.horoscopeGeneration.lastError.code).toBe('api_credits');
   await page.reload();await f.open();
   await expect(studio.getByRole('alert')).toHaveCount(0);
   await studio.getByText('Previous attempt',{exact:true}).click();
   await expect(studio.getByText('not your current balance',{exact:false})).toBeVisible();
   await studio.getByRole('button',{name:'1 · Dates',exact:true}).click();
   await expect(studio.getByLabel('Reference date')).toHaveValue('2026-09-01');
   await studio.getByRole('button',{name:'Continue to writing plan',exact:true}).click();
   await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
   expect((await f.call({method:'writer-state'})).calls).toBe(1);
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await expect(studio.getByText('Retry only Aries with one new paid AI request. Saved readings are kept.',{exact:true})).toBeVisible();
   await studio.getByRole('button',{name:'Retry Aries',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('1/12 readings are saved.');
   await expect(studio.getByRole('alert')).toHaveCount(0);
   const row=await f.latest();expect(row.id).toBe(failed.id);expect(row.status).toBe('DRAFT');
   expect(row.source_snapshot.horoscopeGeneration.failures).toEqual(failed.source_snapshot.horoscopeGeneration.failures);
   expect(row.sections.horoscopeEdition.passages[0].body).toBe('You can read the complete aries fixture opening.\n\nYour saved fixture ends here.');
   expect(row.sections.horoscopeEdition.passages.slice(1)).toEqual(f.original.passages.slice(1));
   expect((await f.call({method:'writer-state'})).calls).toBe(2);
   await studio.getByRole('button',{name:'3 · Review',exact:true}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(row.sections.horoscopeEdition.passages[0].body);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/horoscope-seasonal-retry-${width}-${theme}.png`,fullPage:true});
  }finally{f.child.kill();}
 });
}

for(const [width,theme] of [[390,'dark'],[1440,'light']] as const){
 test(`Pause and leave a held seasonal request immediately ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page,11,false,'seasonal');try{
   const studio=await f.open();await f.call({method:'writer-state',body:{pendingPolls:1}});f.state.holdPoll=true;
   await studio.getByRole('button',{name:'Resume generation',exact:true}).click();await expect.poll(()=>f.state.held).toBe(true);
   await studio.getByRole('button',{name:'Pause generation',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Paused. Completed readings are saved.');
   await expect(studio.getByRole('button',{name:'Back to editions',exact:true})).toBeEnabled();
   await expect(studio.getByRole('button',{name:'Resume generation',exact:true})).toBeDisabled();
   await studio.getByRole('button',{name:'Back to editions',exact:true}).click();
   await expect(studio.getByLabel('Reference date')).toHaveValue('2026-09-01');
   expect((await f.latest()).source_snapshot.horoscopeGeneration.active.sign).toBe('taurus');
   // Retrieve the already-started request elsewhere, then reopen without a new generation.
   expect((await f.action('poll')).status).toBe(200);
   await studio.getByText(/^Continue a saved edition/).click();
   await studio.locator('.admin-horoscope-saved button').first().click();
   await expect(studio.getByText('2/12 readings ready',{exact:false})).toBeVisible();
   f.state.release();
   await expect(studio.getByRole('button',{name:'Generate missing readings',exact:true})).toBeDisabled();
   await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
   await studio.getByRole('button',{name:'3 · Review',exact:true}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(f.original.passages[0].body);
   await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:/^Taurus/}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue('You can read the complete taurus fixture opening.\n\nYour saved fixture ends here.');
   await expect(studio.getByRole('alert')).toHaveCount(0);
   expect((await f.call({method:'writer-state'})).calls).toBe(1);
   expect((await f.latest()).sections.horoscopeEdition.passages[0]).toEqual(f.original.passages[0]);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/horoscope-pause-${width}-${theme}.png`,fullPage:true});
  }finally{f.state.release();f.child.kill();}
 });
 test(`Automatically reconcile a seasonal result on return and while idle ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  await page.clock.install();
  const f=await fixture(page,11,false,'seasonal');try{
   const studio=await f.open();await f.call({method:'writer-state',body:{pendingPolls:1}});f.state.holdPoll=true;
   await studio.getByRole('button',{name:'Resume generation',exact:true}).click();await expect.poll(()=>f.state.held).toBe(true);
   expect((await f.action('poll')).status).toBe(200);
   await page.clock.fastForward(16000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await expect(studio.getByText('2/12 readings ready',{exact:false})).toBeVisible();f.state.release();
   await expect(studio.getByRole('alert')).toHaveCount(0);
   await expect(studio.getByRole('button',{name:'Generate missing readings',exact:true})).toBeDisabled();
   expect((await f.call({method:'writer-state'})).calls).toBe(1);
   // An existing request on a newly opened edition also catches up without a click.
   const plan=await f.action('prepare');expect((await f.action('generate',{sign:'gemini',approvedPlanHash:plan.payload.plan.planHash})).status).toBe(202);
   await studio.getByRole('button',{name:'Back to editions',exact:true}).click();
   await studio.getByText(/^Continue a saved edition/).click();await studio.locator('.admin-horoscope-saved button').first().click();
   // Opening retrieves the saved row asynchronously. Start the idle interval
   // only after that row is adopted; otherwise the clock can jump before the
   // recovery effect registers its timer on a slower CI browser.
   await expect(studio.getByText(/^A request for Gemini is saved\./)).toBeVisible();
   await expect(studio.getByRole('button',{name:'Check saved progress',exact:true})).toBeEnabled();
   await page.clock.fastForward(31000);
   await expect(studio.getByText('3/12 readings ready',{exact:false})).toBeVisible();
   expect((await f.call({method:'writer-state'})).calls).toBe(2);
   await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
   const row=await f.latest();expect(row.status).toBe('DRAFT');expect(row.source_snapshot.horoscopeGeneration.active).toBeNull();
   expect(row.sections.horoscopeEdition.passages[0]).toEqual(f.original.passages[0]);
   await studio.getByRole('button',{name:'3 · Review',exact:true}).click();await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:/^Gemini/}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue('You can read the complete gemini fixture opening.\n\nYour saved fixture ends here.');
   await page.screenshot({path:`test-results/horoscope-auto-recovery-${width}-${theme}.png`,fullPage:true});
  }finally{f.state.release();f.child.kill();}
 });
}

for(const [width,theme] of [[390,'dark'],[1440,'light']] as const){
 test(`An interrupted sign does not stop the remaining approved readings ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page,3);try{
   const studio=await f.open();
   await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
   await expect(studio.getByText('10/12 readings ready',{exact:false})).toBeVisible();
   await f.call({method:'writer-state',body:{unknownNext:true}});
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await studio.getByRole('button',{name:'Generate missing readings',exact:true}).click();
   await expect(studio.getByText('11/12 readings ready',{exact:false})).toBeVisible();
   await expect(studio.getByRole('note')).toContainText('Aquarius was interrupted');
   await expect(studio.getByRole('button',{name:'Generate missing readings',exact:true})).toBeDisabled();
   const saved=await f.latest();expect(saved.source_snapshot.horoscopeGeneration.heldRequests.aquarius.requestHash).toBeTruthy();
   expect(saved.source_snapshot.horoscopeGeneration.active).toBeNull();
   expect(saved.sections.horoscopeEdition.passages.slice(0,9)).toEqual(f.original.passages.slice(0,9));
   expect(saved.sections.horoscopeEdition.passages[11].body).toContain('complete pisces fixture opening');
   expect((await f.call({method:'writer-state'})).calls).toBe(3);
   await page.reload();await f.open();
   await expect(studio.getByRole('note')).toContainText('Aquarius was interrupted');
   await page.screenshot({path:`test-results/weekly-held-${width}-${theme}.png`,fullPage:true});
   await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
   expect((await f.call({method:'writer-state'})).calls).toBe(3);
   page.once('dialog',dialog=>dialog.dismiss());
   await studio.getByRole('button',{name:'Allow retry for Aquarius',exact:true}).click();
   expect((await f.latest()).source_snapshot.horoscopeGeneration.heldRequests.aquarius).toBeTruthy();
   page.once('dialog',dialog=>dialog.accept());
   await studio.getByRole('button',{name:'Allow retry for Aquarius',exact:true}).click();
   await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
   expect((await f.call({method:'writer-state'})).calls).toBe(3);
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await studio.getByRole('button',{name:'Generate missing readings',exact:true}).click();
   await expect(studio.getByRole('button',{name:'3 · Review',exact:true})).toHaveAttribute('aria-current','step');
   expect((await f.call({method:'writer-state'})).calls).toBe(4);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/weekly-recovery-${width}-${theme}.png`,fullPage:true});
  }finally{f.child.kill();}
 });
}

test('A legacy start with no dispatched request recovers after reload without release or paid work',async({page})=>{
 const f=await fixture(page,1,true);try{
  await f.call({method:'interrupted-horoscope-start',body:{id:(await f.latest()).id,beforeDispatch:true,expired:true}});
  const studio=await f.open();await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
  await expect(studio.getByLabel('I approve this writing plan for generation.')).toBeVisible();
  await expect(studio.getByRole('button',{name:'Release interrupted request',exact:true})).toHaveCount(0);
  expect((await f.latest()).source_snapshot.horoscopeGeneration.active).toBeNull();
  expect((await f.latest()).source_snapshot.horoscopeGeneration.interruptions.at(-1).outcome).toBe('not_dispatched');
  expect((await f.call({method:'writer-state'})).calls).toBe(1);
 }finally{f.child.kill();}
});
