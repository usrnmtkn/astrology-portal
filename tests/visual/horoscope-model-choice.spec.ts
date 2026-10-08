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
    const state={holdPoll:false,holdReview:false,longReview:false,loseWriterStart:false,loseReviewStart:false,loseReviewSave:false,reviewHeld:false,checks:0};
    await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
      if(url.pathname!=='/api/admin/horoscope-writing')return false;
      const body=route.request().postDataJSON();
      if(body.action==='poll'&&state.holdPoll){await route.fulfill({status:202,json:{ok:true,pending:true,rows:[await latest()]}});return true;}
      const active=(await latest()).source_snapshot?.horoscopeGeneration?.active;
      if(body.action==='poll'&&active?.phase==='review'&&state.holdReview){state.reviewHeld=true;await route.fulfill({status:202,json:{ok:true,pending:true,rows:[await latest()]}});return true;}
      if(body.action==='continue'&&active?.phase==='review'&&state.longReview){state.longReview=false;await call({method:'writer-state',body:{pendingPolls:125}});}
      const result=await call({method:'writing',body});
      if(body.action==='poll'&&active?.phase==='review')state.checks++;
      const lostStart=body.action==='continue'&&active?.phase==='review'&&state.loseReviewStart;
      const lostSave=body.action==='poll'&&active?.phase==='review'&&result.status===200&&state.loseReviewSave;
      const lostWriter=body.action==='generate'&&result.status===202&&state.loseWriterStart;
      if(lostStart||lostSave||lostWriter){if(lostStart)state.loseReviewStart=false;if(lostSave)state.loseReviewSave=false;if(lostWriter)state.loseWriterStart=false;await route.fulfill({status:503,json:{ok:false,error:'Synthetic lost acknowledgement after save.'}});return true;}
      await route.fulfill({status:result.status,json:result.payload});return true;
    }});
    await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    const open=async()=>{await page.goto('/admin/content#horoscopes');const studio=page.getByRole('region',{name:'Horoscope editions'});await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/Synthetic model choice edition/}).click();return studio;};
    return {child,call,latest,state,open,original:edition,id};
  }catch(error){child.kill();throw error;}
}

for(const [width,theme] of [[1440,'light'],[390,'dark']] as const){
 test(`Gemini Weekly retry continues all twelve through long review and lost acknowledgements ${width} ${theme}`,async({page})=>{
  test.setTimeout(180000);
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(theme=>{
    localStorage.setItem('tldrastro:studio-theme',theme);
    // Keep the real polling count/handler transitions while avoiding six minutes
    // of wall time solely to cross the former 120-poll client cutoff.
    const timeout=window.setTimeout.bind(window);
    window.setTimeout=((fn:any,delay?:number,...args:any[])=>timeout(fn,delay===3000?10:delay,...args)) as typeof window.setTimeout;
  },theme);
  const f=await fixture(page,12);try{
    const prepare=await f.call({method:'writing',body:{action:'prepare',id:f.id,expectedUpdatedAt:(await f.latest()).updated_at,writerChoice:'gemini'}});
    await f.call({method:'provider-state',body:{geminiInterrupted:true}});
    await f.call({method:'writing',body:{action:'generate',id:f.id,expectedUpdatedAt:(await f.latest()).updated_at,sign:'aries',approvedPlanHash:prepare.payload.plan.planHash}});
    await expect.poll(async()=>Boolean((await f.latest()).source_snapshot.horoscopeGeneration.active?.providerResult)).toBe(true);
    expect((await f.call({method:'writing',body:{action:'poll',id:f.id,expectedUpdatedAt:(await f.latest()).updated_at}})).status).toBe(422);
    await f.call({method:'provider-state',body:{geminiInterrupted:false}});
    f.state.holdReview=true;f.state.longReview=true;f.state.loseWriterStart=true;f.state.loseReviewStart=true;f.state.loseReviewSave=true;
    const studio=await f.open();
    await expect(studio.getByText(/Up to 24 paid AI requests/)).toBeVisible();
    const retry=studio.getByRole('button',{name:'Retry Aries and continue',exact:true});
    await expect(retry).toBeDisabled();
    await studio.getByLabel('I approve this writing plan for generation.').check();await retry.click();
    await expect.poll(()=>f.state.reviewHeld).toBe(true);
    const responseId=(await f.latest()).source_snapshot.horoscopeGeneration.active.responseId;
    await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(studio.getByRole('button',{name:'Pause generation',exact:true})).toBeVisible();
    expect((await f.latest()).source_snapshot.horoscopeGeneration.active.responseId).toBe(responseId);
    f.state.holdReview=false;
    await expect(studio.getByText('All readings are saved and ready to review.',{exact:true})).toBeVisible({timeout:120000});
    await expect(studio.getByText('12/12 readings ready',{exact:false})).toBeVisible();
    const saved=await f.latest();
    expect(saved.status).toBe('DRAFT');expect(saved.source_snapshot.horoscopeGeneration.active).toBeNull();
    expect(saved.sections.horoscopeEdition.passages.every((p:any)=>p.body.includes(`complete ${p.sign} fixture opening`))).toBe(true);
    expect((await f.call({method:'writer-state'}))).toMatchObject({calls:13,reviewCalls:12});
    expect((await f.call({method:'provider-state'})).requests).toHaveLength(13);
    expect(f.state.checks).toBeGreaterThan(125);
    await page.reload();await f.open();
    await expect(studio.getByText('12/12 readings ready',{exact:false})).toBeVisible();
    expect((await f.latest()).sections.horoscopeEdition).toEqual(saved.sections.horoscopeEdition);
    expect((await f.call({method:'writer-state'}))).toMatchObject({calls:13,reviewCalls:12});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/weekly-gemini-complete-${width}-${theme}.png`,fullPage:true});
  }finally{f.child.kill();}
 });
}

for(const [width,theme,reviewStarted] of [[1440,'light',false],[390,'dark',true]] as const){
 test(`Reopened Gemini Aries ${reviewStarted?'running':'ready'} review can resume all twelve with explicit remaining-plan approval`,async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width,height:1000});
  await page.addInitScript(theme=>{
    localStorage.setItem('tldrastro:studio-theme',theme);
    const timeout=window.setTimeout.bind(window);
    window.setTimeout=((fn:any,delay?:number,...args:any[])=>timeout(fn,delay===3000?20:delay,...args)) as typeof window.setTimeout;
  },theme);
  const f=await fixture(page,12);try{
    const act=async(action:string,extra={})=>f.call({method:'writing',body:{action,id:f.id,expectedUpdatedAt:(await f.latest()).updated_at,...extra}});
    const prepared=await act('prepare',{writerChoice:'gemini'});
    await act('generate',{sign:'aries',approvedPlanHash:prepared.payload.plan.planHash});
    await expect.poll(async()=>Boolean((await f.latest()).source_snapshot.horoscopeGeneration.active?.providerResult)).toBe(true);
    await act('poll');
    const ready=(await f.latest()).source_snapshot.horoscopeGeneration.active;
    expect(ready).toMatchObject({phase:'review',state:'ready',sign:'aries'});
    const candidate=ready.candidate;
    if(reviewStarted)await act('continue');
    f.state.holdReview=true;
    const before=await f.call({method:'writer-state'}),studio=await f.open();
    const approval=studio.getByLabel('I approve this writing plan for generation.');
    await expect(approval).toBeVisible();await expect(approval).not.toBeChecked();
    await expect(studio.getByText(/Resume generation finishes only Aries/)).toContainText('other 11 readings');
    await expect(studio.getByText(/additional paid AI requests/)).toContainText(`Up to ${reviewStarted?22:23} additional paid AI requests`);
    expect((await f.call({method:'writer-state'}))).toMatchObject({calls:before.calls,reviewCalls:before.reviewCalls});
    await expect(approval).toBeEnabled();
    await page.screenshot({path:`test-results/weekly-gemini-resume-plan-${width}-${theme}.png`,fullPage:true});
    await approval.check();
    await studio.getByRole('button',{name:'Resume remaining readings',exact:true}).click();
    await expect.poll(()=>f.state.reviewHeld).toBe(true);
    await expect(studio.getByRole('button',{name:'Pause generation',exact:true})).toBeVisible();
    await expect(studio.getByText(/Draft saved\. Resume generation/)).toHaveCount(0);
    f.state.holdReview=false;
    await expect(studio.getByText('All readings are saved and ready to review.',{exact:true})).toBeVisible({timeout:90000});
    const saved=await f.latest();
    expect(saved.status).toBe('DRAFT');expect(saved.source_snapshot.horoscopeGeneration.active).toBeNull();
    expect(saved.sections.horoscopeEdition.passages[0]).toMatchObject(candidate);
    expect(saved.sections.horoscopeEdition.passages.every((p:any)=>p.body.includes(`complete ${p.sign} fixture opening`))).toBe(true);
    expect((await f.call({method:'writer-state'}))).toMatchObject({calls:12,reviewCalls:12});
    expect((await f.call({method:'provider-state'})).requests).toHaveLength(12);
    await page.reload();await f.open();
    await expect(studio.getByText('12/12 readings ready',{exact:false})).toBeVisible();
    expect((await f.latest()).sections.horoscopeEdition).toEqual(saved.sections.horoscopeEdition);
    expect((await f.call({method:'writer-state'}))).toMatchObject({calls:12,reviewCalls:12});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/weekly-gemini-resumed-${width}-${theme}.png`,fullPage:true});
  }finally{f.child.kill();}
 });
}

test('Explicit pause ends Weekly batch consent while the saved Gemini request remains recoverable',async({page})=>{
  const f=await fixture(page,2);try{
    const studio=await f.open();await studio.getByRole('combobox',{name:'Writing model'}).selectOption('gemini');
    f.state.holdPoll=true;
    await studio.getByLabel('I approve this writing plan for generation.').check();
    await studio.getByRole('button',{name:'Generate missing readings',exact:true}).click();
    await expect.poll(async()=>Boolean((await f.latest()).source_snapshot.horoscopeGeneration.active?.responseId)).toBe(true);
    await studio.getByRole('button',{name:'Pause generation',exact:true}).click();
    await expect(studio.getByText(/^Paused\. Completed readings are saved\./)).toBeVisible();
    f.state.holdPoll=false;
    await studio.getByRole('button',{name:'Check saved progress',exact:true}).click();
    await expect(studio.getByText('Draft saved. Resume generation to run its approved prose check.',{exact:true})).toBeVisible();
    await studio.getByRole('button',{name:'Resume generation',exact:true}).click();
    await expect(studio.getByText(/11\/12 readings are saved\. Review the current writing plan/)).toBeVisible();
    expect((await f.latest()).sections.horoscopeEdition.passages[11].body).toBe('');
    expect((await f.call({method:'writer-state'}))).toMatchObject({calls:1,reviewCalls:1});
    await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
  }finally{f.child.kill();}
});

for(const [width,theme,choice] of [[1440,'light','gemini'],[390,'dark','claude'],[1440,'dark','gemini'],[390,'light','claude']] as const){
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
    await studio.getByRole('group',{name:'Writing plans by sign'}).getByRole('button',{name:'Pisces',exact:true}).click();
    await studio.getByText('Writing evidence for this plan',{exact:true}).click();
    const evidence=studio.locator('details').filter({has:page.locator('summary',{hasText:'Writing evidence for this plan'})}).last();
    await evidence.getByText('primary owner passage · 1',{exact:true}).click();
    const completeSource=await evidence.getByLabel('Complete source passage 1',{exact:true}).inputValue();
    await evidence.getByText('Corrections and rejected readings',{exact:true}).click();
    expect(JSON.parse(await evidence.getByLabel('Complete corrections and rejected readings').inputValue()).rejectedReadings[0].body).toBe('Held private opening.\n\nHeld private final sentence.');
    await studio.getByText('Rejected drafts',{exact:true}).click();
    await studio.locator('summary').filter({hasText:/^Pisces ·/}).click();
    await expect(studio.getByLabel('Rejected Pisces reading')).toHaveValue('Held private title\n\nHeld private opening.\n\nHeld private final sentence.');
    expect(completeSource.length).toBeGreaterThan(100);
    const referenceStyle=await studio.getByText('Writing instructions · optional',{exact:true}).evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing];});
    expect(await studio.getByText('Writing evidence for this plan',{exact:true}).evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing];})).toEqual(referenceStyle);
    await page.screenshot({path:`test-results/weekly-evidence-${width}-${theme}.png`,fullPage:true});
    await studio.getByText('Writing evidence for this plan',{exact:true}).click();
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
    expect(saved.source_snapshot.horoscopeGeneration.readings.pisces.ownerEvidence.passages[0].text).toBe(completeSource);
    expect(saved.status).toBe('DRAFT');expect(saved.source_snapshot.horoscopeGeneration.readings.pisces.config.provider).toBe(choice==='gemini'?'gemini':'anthropic');
    expect((await f.call({method:'writer-state'}))).toMatchObject({calls:1,reviewCalls:1});
    expect((await f.call({method:'provider-state'})).requests).toHaveLength(1);
    await page.reload();await f.open();
    await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:/Pisces/}).click();
    await expect(studio.getByLabel('Complete reading')).toHaveValue('You can read the complete pisces fixture opening.\n\nYour saved fixture ends here.');
    await expect(studio.getByText(/^Original draft model:/)).toContainText(choice==='gemini'?'gemini-3.1-pro-preview':'claude-sonnet-5-5');
    await studio.getByText('Writing evidence used',{exact:true}).click();
    await studio.getByText('primary owner passage · 1',{exact:true}).click();
    await expect(studio.getByLabel('Complete source passage 1',{exact:true})).toHaveValue(completeSource);
    await studio.getByText('Exact writer input',{exact:true}).click();
    expect(JSON.parse(await studio.getByLabel('Exact writer request',{exact:true}).inputValue())).toEqual(saved.source_snapshot.horoscopeGeneration.readings.pisces.ownerEvidence.providerRequest);
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
