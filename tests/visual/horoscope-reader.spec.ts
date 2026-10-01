import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {HOROSCOPE_SIGNS,emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {READER_ROW_SCHEMA} from '../../apps/web/src/content/readerRowSchema.mjs';

test('New reader uses device time zone and saves a manual override',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,timezoneId:'Asia/Kathmandu'});
 try {
  const page=await context.newPage();const zones:string[]=[];
  await page.route('**/api/content-reader',route=>{const zone=route.request().postDataJSON()?.horoscope?.timeZone;if(zone)zones.push(zone);return route.fulfill({json:{schema:READER_ROW_SCHEMA,rows:[],publications:[],nextCursor:null}});});
  await page.goto('/#horoscopes?period=daily');
  await expect(page.locator('.horoscope-location summary')).toContainText('Device time zone');
  const detected=await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);
  await expect(page.getByRole('status')).toContainText(detected.replaceAll('_',' '));
  expect(zones).toContain(detected);
  await page.locator('.horoscope-location summary').click();
  await page.getByLabel('Horoscope time zone',{exact:true}).selectOption('Pacific/Honolulu');
  await expect(page.getByRole('status')).toContainText('Pacific/Honolulu');
  await page.reload();
  await expect(page.locator('.horoscope-location summary')).toContainText('Pacific/Honolulu');
  expect(await page.evaluate(()=>localStorage.getItem('tldrastro:selectedLocation'))).toBeNull();
 }finally{await context.close();}
});

for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Twelve-sign edition editor to reader ${width} ${theme}`,async({page})=>{
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,ZODIAC_TEMPLATE_FIXTURE:'1',HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try{
   await ready;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:1000});
   await page.clock.setFixedTime(new Date('2026-09-24T16:00:00Z'));
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:selectedLocation',JSON.stringify({label:'Tokyo',latitude:35.68,longitude:139.76,timeZone:'Asia/Tokyo'}));},theme);
   let injectConflict=width===390&&theme==='light', failPrepare=injectConflict, generationCalls=0, failNextSave=false;
   const newerOutline='A newer writing outline from another editor. Stay with the calculated temporary emphasis and its house.';
   await routeStudioInventoryApi(page,{call:async message=>{if(failNextSave&&message.method==='PATCH'&&(message.body as any)?.sections){failNextSave=false;return {status:503,payload:{ok:false,error:'Fixture save unavailable.'}};}return call(message);},answer:async(route,url)=>{if(url.pathname==='/api/admin/horoscope-writing'){
    const body=route.request().postDataJSON();
    if(body.action==='generate')generationCalls++;
    if(failPrepare&&body.action==='prepare'){failPrepare=false;await route.fulfill({status:503,json:{ok:false,error:'Fixture plan preparation unavailable.'}});return true;}
    if(injectConflict&&body.action==='generate'){
     injectConflict=false;const current=(await call({method:'rows'})).find((row:any)=>row.id===body.id);
     const changed=await call({method:'PATCH',body:{id:current.id,expectedUpdatedAt:current.updated_at,sourceSnapshot:{...current.source_snapshot,horoscopeOutlines:{aries:newerOutline}}}});
     expect(changed.status).toBe(200);
    }
    const result=await call({method:'writing',body});await route.fulfill({status:result.status,json:result.payload});return true;
   }if(url.pathname==='/api/content-reader'){const result=await call({method:'reader',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;}return false;}});
   await page.goto('/admin/content#templates');
   await expect(page.getByRole('heading',{name:'Templates',exact:true})).toBeVisible();
   const titleStyle=await page.locator('h1').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];});
   await page.evaluate(()=>{location.hash='horoscopes';});
   await expect(page.getByRole('heading',{name:'Horoscopes',exact:true})).toBeVisible();
   expect(await page.locator('h1').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];})).toEqual(titleStyle);
   const studio=page.getByRole('region',{name:'Horoscope editions'});
   await expect(studio.getByRole('heading',{name:'Choose your horoscopes',exact:true})).toBeVisible();
   await expect(studio.getByRole('button',{name:'3 · Review',exact:true})).toBeDisabled();
   await expect(studio.getByLabel('Complete reading')).toHaveCount(0);
   await expect(studio.getByRole('button',{name:'Export writing brief',exact:true})).toHaveCount(0);
   await page.screenshot({path:`test-results/horoscope-setup-${width}-${theme}.png`,fullPage:true});
   await studio.getByLabel('Reference date').fill('2026-09-24');
   await studio.locator('.horoscope-location summary').click();
   await studio.getByLabel('Horoscope time zone',{exact:true}).selectOption('Asia/Tokyo');
   await studio.getByRole('button',{name:'Continue to writing plan',exact:true}).click();
   if(width===390&&theme==='light'){
    await expect(studio.getByRole('alert')).toContainText('Fixture plan preparation unavailable');
    expect((await call({method:'rows'})).filter((row:any)=>row.content_key.startsWith('horoscope/'))).toHaveLength(1);
    await studio.getByRole('button',{name:'Review writing plan',exact:true}).click();
   }
   await expect(studio.getByText('0/12 readings ready',{exact:false})).toBeVisible();
   await expect(studio.getByText('12 readings still need drafts. Existing writing is kept.',{exact:true})).toBeVisible();
   await expect(studio.getByRole('button',{name:'2 · Generate',exact:true})).toHaveAttribute('aria-current','step');
   await expect(studio.getByRole('button',{name:'Generate 12 drafts',exact:true})).toBeDisabled();
   const writingPlan=studio.getByRole('region',{name:'Aries writing plan',exact:true});
   await expect(writingPlan).toContainText('calculated developments');
   await writingPlan.getByText('Full plan details',{exact:true}).click();
   await expect(writingPlan.locator('li').filter({hasText:'Sun enters Libra'})).toContainText('House 7');
   await expect(writingPlan.locator('li').filter({hasText:'Full Moon'})).toContainText('House 1');
   await expect(writingPlan.locator('h3')).toHaveText('Aries writing plan');
   await writingPlan.getByText('Full plan details',{exact:true}).click();

   expect(generationCalls).toBe(0);
   expect(await studio.locator('h2').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];})).toEqual(titleStyle);
   await expect(studio.locator('h2,h3')).toHaveText(['Generate your drafts','Aries writing plan']);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(width===390&&theme==='dark'){
    await studio.getByRole('button',{name:'Back to editions',exact:true}).click();
    await expect(studio.getByLabel('Reference date')).toHaveValue('2026-09-21');
    await studio.locator('.horoscope-location summary').click();
    await expect(studio.getByLabel('Horoscope time zone',{exact:true})).toHaveValue('Asia/Tokyo');
    await studio.getByRole('button',{name:'Continue to writing plan',exact:true}).click();
    await expect(studio.getByLabel('I approve this writing plan for generation.')).toBeVisible();
    expect((await call({method:'rows'})).filter((row:any)=>row.content_key.startsWith('horoscope/'))).toHaveLength(1);
   }
   await page.screenshot({path:`test-results/horoscope-generation-${width}-${theme}.png`,fullPage:true,animations:'disabled'});
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await studio.getByRole('button',{name:'Generate 12 drafts',exact:true}).click();
   if(width===390&&theme==='light'){
    await expect(studio.getByRole('status')).toContainText('Review the current writing plan');
    await expect(studio.getByRole('alert')).toHaveCount(0);
    await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
    await studio.getByRole('button',{name:'3 · Review',exact:true}).click();
    await studio.getByText('Writing outline · editor only',{exact:true}).click();
    await expect(studio.getByLabel('Writing outline',{exact:true})).toHaveValue(newerOutline);
    await expect(studio.getByRole('button',{name:'Save edition draft',exact:true})).toBeDisabled();
    await studio.getByRole('button',{name:'2 · Generate',exact:true}).click();
    await studio.getByLabel('I approve this writing plan for generation.').check();
    await studio.getByRole('button',{name:'Generate 12 drafts',exact:true}).click();
   }
   await expect(studio.getByText('12/12 readings ready',{exact:false})).toBeVisible({timeout:60000});
   await expect(studio.getByLabel('Complete reading')).toBeVisible();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(/Your saved fixture ends here/);
   const callsBeforeRejection=generationCalls;
   const rejectedText='Fixture unsaved revision opening.\n\nFixture unsaved revision ending.';
   await studio.getByLabel('Complete reading').fill(rejectedText);
   page.once('dialog',dialog=>dialog.dismiss());
   await studio.getByRole('button',{name:'Reject this reading',exact:true}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(rejectedText);
   await page.screenshot({path:`test-results/horoscope-reject-controls-${width}-${theme}.png`,fullPage:true});
   page.once('dialog',dialog=>dialog.accept());
   await studio.getByRole('button',{name:'Reject this reading',exact:true}).click();
   await expect(studio.getByText('11/12 readings ready',{exact:false})).toBeVisible();
   await expect(studio.getByLabel('I approve this writing plan for generation.')).not.toBeChecked();
   await expect(studio.getByRole('button',{name:'Generate missing readings',exact:true})).toBeDisabled();
   expect(generationCalls).toBe(callsBeforeRejection);
   await studio.getByText('Rejected drafts',{exact:true}).click();
   await studio.locator('details').filter({has:page.getByLabel('Rejected Aries reading',{exact:true})}).last().locator('summary').click();
   await expect(studio.getByLabel('Rejected Aries reading',{exact:true})).toHaveValue(new RegExp('Fixture unsaved revision ending\\.'));
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/horoscope-rejected-history-${width}-${theme}.png`,fullPage:true});
   await studio.getByText('Rejected drafts',{exact:true}).click();
   page.once('dialog',dialog=>dialog.accept());
   await studio.getByRole('button',{name:'Reject all drafts',exact:true}).click();
   await expect(studio.getByText('0/12 readings ready',{exact:false})).toBeVisible();
   await expect(studio.getByRole('button',{name:'Generate 12 drafts',exact:true})).toBeDisabled();
   expect(generationCalls).toBe(callsBeforeRejection);
   const resetRows=await call({method:'rows'}),reset=resetRows.find((row:any)=>row.content_key.startsWith('horoscope/'));
   expect(reset.source_snapshot.horoscopeGeneration.rejections).toHaveLength(2);
   expect(reset.source_snapshot.horoscopeGeneration.rejections[0].passages[0].body).toBe(rejectedText);
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await studio.getByRole('button',{name:'Generate 12 drafts',exact:true}).click();
   await expect(studio.getByText('12/12 readings ready',{exact:false})).toBeVisible({timeout:60000});
   await expect(studio.getByLabel('Complete reading')).toHaveValue(/Your saved fixture ends here/);
   await studio.getByText('Writing outline · editor only',{exact:true}).click();
   await studio.getByLabel('Writing outline',{exact:true}).fill('PRIVATE OUTLINE fixture');
   for(const [index,sign] of HOROSCOPE_SIGNS.entries()){
    await studio.getByRole('group',{name:'Readings by sign'}).getByRole('button',{name:new RegExp('^'+sign[0].toUpperCase()+sign.slice(1))}).click();
    await studio.getByLabel('Reading headline').fill(`Fixture ${sign} weekly headline`);
    await studio.getByLabel('Complete reading').fill(`You can read the ${sign} fixture opening.\n\nYour fixture ${sign} complete ending.`);
    if(index===0&&width===390&&theme==='light'){
     failNextSave=true;await studio.getByRole('button',{name:'Save & next: Taurus',exact:true}).click();
     await expect(studio.getByRole('alert')).toContainText('Fixture save unavailable');
     await expect(studio.getByText('Reading 1 of 12',{exact:false})).toBeVisible();
     await expect(studio.getByLabel('Complete reading')).toHaveValue('You can read the aries fixture opening.\n\nYour fixture aries complete ending.');
    }
    if(index<11){await studio.getByRole('button',{name:`Save & next: ${HOROSCOPE_SIGNS[index+1][0].toUpperCase()+HOROSCOPE_SIGNS[index+1].slice(1)}`,exact:true}).click();await expect(studio.getByText(`Reading ${index+2} of 12`,{exact:false})).toBeVisible();}
   }
   await page.evaluate(()=>{location.hash='ai-writing';});
   await expect(page.getByRole('heading',{name:'AI Writing',exact:true})).toBeVisible();
   await page.evaluate(()=>{location.hash='horoscopes';});
   await expect(studio.getByLabel('Complete reading')).toHaveValue('You can read the pisces fixture opening.\n\nYour fixture pisces complete ending.');
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toHaveText('Saved edition draft.');
   const draftRows=await call({method:'rows'});const draft=draftRows.find((row:any)=>row.content_key.startsWith('horoscope/'));
   await studio.getByText('Advanced · import, export and calculations',{exact:true}).click();
   await studio.getByLabel('Import horoscope draft').setInputFiles({name:'mixed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({edition:draft.sections.horoscopeEdition,instructions:'Unrecognized metadata'}))});
   await expect(studio.getByRole('alert')).toContainText('Review mixed documents');
   await expect(studio.getByLabel('Complete reading')).toHaveValue('You can read the pisces fixture opening.\n\nYour fixture pisces complete ending.');
   const originalSource=JSON.stringify({schema:'horoscope-draft/v1',edition:draft.sections.horoscopeEdition,editorialNotes:'PRIVATE IMPORT NOTES'});
   await studio.getByLabel('Import horoscope draft').setInputFiles({name:'readings.json',mimeType:'application/json',buffer:Buffer.from(originalSource)});
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toHaveText('Saved edition draft.');
   const imported=(await call({method:'rows'})).find((row:any)=>row.id===draft.id);
   expect(imported.source_snapshot.editorialImport.originalSource).toBe(originalSource);
   expect(imported.source_snapshot.editorialImport.sha256).toBe(createHash('sha256').update(originalSource).digest('hex'));
   await studio.getByRole('button',{name:'Continue to publish',exact:true}).click();
   await expect(studio.getByRole('heading',{level:2})).toHaveText('Publish your horoscopes');
   await expect(studio.getByRole('button',{name:'Publish edition',exact:true})).toBeDisabled();
   await expect(studio.locator('h3')).toHaveText(HOROSCOPE_SIGNS.map(sign=>sign[0].toUpperCase()+sign.slice(1)));
   await expect(studio.getByRole('region',{name:'Pisces reading preview'})).toContainText('Your fixture pisces complete ending.');
   expect((await call({method:'reader',body:{horoscope:{period:'weekly',at:'2026-09-24T16:00:00.000Z'}}})).payload.rows).toEqual([]);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:`test-results/horoscope-editor-${width}-${theme}.png`,fullPage:true});
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Published the complete edition.');
   const publicEdition=await call({method:'reader',body:{ids:[draft.id]}});
   expect(publicEdition.status).toBe(200);expect(publicEdition.payload.rows).toHaveLength(1);
   expect(JSON.stringify(publicEdition.payload)).not.toContain('Fixture unsaved revision');
   expect(JSON.stringify(publicEdition.payload)).not.toContain('rejections');
   const publishedHref=await studio.getByRole('link',{name:'Read published edition',exact:true}).getAttribute('href');
   expect(publishedHref).toContain(`edition=${draft.id}`);
   await page.goto(publishedHref!);
   await expect(page.getByRole('article',{name:'Pisces horoscope'})).toContainText('Your fixture pisces complete ending.');
   await page.clock.setFixedTime(new Date('2026-10-05T16:00:00Z'));
   await page.reload();await expect(page.getByRole('article')).toContainText('Published edition');
   await expect(page.getByRole('article')).toContainText('September 21, 2026');
   await page.clock.setFixedTime(new Date('2026-09-24T16:00:00Z'));
   await page.goto('/#horoscopes?period=weekly&sign=aries');
   await expect(page.getByRole('heading',{name:'Horoscopes',exact:true})).toBeVisible();
   await expect(page.getByRole('article',{name:'Aries horoscope'})).toContainText('Your fixture aries complete ending.');
   await expect(page.getByText('PRIVATE OUTLINE fixture')).toHaveCount(0);
   await expect(page.getByRole('heading',{name:'Fixture aries weekly headline'})).toBeVisible();
   await expect(page.locator('.horoscope-page :is(h1,h2,h3,h4,h5,h6)')).toHaveText(['Horoscopes','Fixture aries weekly headline']);
   expect(await page.locator('.horoscope-page h1').evaluate(el=>{const probe=document.createElement('h1');probe.className='learn-hero__title';el.parentElement!.append(probe);const actual=getComputedStyle(el),expected=getComputedStyle(probe);const same=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','margin','textTransform','textAlign'].every(key=>(actual as any)[key]===(expected as any)[key]);probe.remove();return same;})).toBe(true);
   expect(await page.locator('.horoscope-page h2').evaluate(el=>{const probe=document.createElement('h2');probe.style.cssText='font-family:var(--font-display);font-size:var(--type-h2-size);font-weight:var(--weight-regular);line-height:var(--leading-h2);letter-spacing:var(--tracking-title);margin:var(--space-4) 0';el.parentElement!.append(probe);const actual=getComputedStyle(el),expected=getComputedStyle(probe);const same=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','margin','textTransform','textAlign'].every(key=>(actual as any)[key]===(expected as any)[key]);probe.remove();return same;})).toBe(true);
   for(const sign of HOROSCOPE_SIGNS){await page.getByRole('group',{name:'Zodiac signs',exact:true}).getByRole('button').nth(HOROSCOPE_SIGNS.indexOf(sign)).click();await expect(page.getByRole('article')).toContainText(`You can read the ${sign} fixture opening.`);await expect(page.getByRole('article')).toContainText(`Your fixture ${sign} complete ending.`);}
   await page.reload();await expect(page.getByRole('button',{name:'Pisces & Pisces Rising',exact:true})).toHaveAttribute('aria-pressed','true');
   await page.getByRole('button',{name:'Today',exact:true}).click();
   await expect(page.getByRole('status')).toContainText('daily horoscopes haven’t been published');
   await page.goBack();await expect(page.getByRole('button',{name:'This week',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('article')).toContainText('Your fixture pisces complete ending.');
   await expect(page.getByText('Loading your horoscope…')).toHaveCount(0);
   await page.mouse.move(0,0);
   expect(await page.locator('.horoscope-prose').evaluate(el=>getComputedStyle(el).whiteSpace)).toBe('pre-wrap');
   expect(await page.locator('.horoscope-prose p').evaluate(el=>{const style=getComputedStyle(el),probe=document.createElement('p');probe.style.cssText='font-family:var(--font-body);font-size:var(--text-body);font-weight:var(--weight-regular);line-height:var(--leading-body);letter-spacing:var(--tracking-body)';el.parentElement!.append(probe);const expected=getComputedStyle(probe);const same=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing'].every(key=>(style as any)[key]===(expected as any)[key]);probe.remove();return same;})).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const bounds=await page.locator('.horoscope-header').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
   await expect(page.getByRole('article')).toContainText('Your fixture pisces complete ending.');
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   await page.screenshot({path:`test-results/horoscope-reader-${width}-${theme}.png`,fullPage:false,animations:'disabled'});
   await expect(page.getByRole('article')).toContainText('Your fixture pisces complete ending.');
   const live=(await call({method:'rows'})).find((row:any)=>row.id===draft.id);
   const changed=await call({method:'PATCH',body:{id:live.id,expectedUpdatedAt:live.updated_at,status:'DRAFT'}});expect(changed.status).toBe(200);
   await page.reload();await expect(page.getByRole('status')).toContainText('weekly horoscopes haven’t been published');
   await expect(page.locator('.horoscope-page :is(h1,h2,h3,h4,h5,h6)')).toHaveText(['Horoscopes','No weekly reading yet']);
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   await page.screenshot({path:`test-results/horoscope-empty-${width}-${theme}.png`,animations:'disabled'});
   await page.getByRole('button',{name:'This season',exact:true}).click();await expect(page.getByRole('status')).toContainText('seasonal horoscopes haven’t been published');
   for(const period of ['daily','seasonal'] as const){
    // The fixed UTC instant is already September 25 in Tokyo.
    const facts=await call({method:'GET',url:`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=2026-09-25&timeZone=Asia/Tokyo`});
    expect(facts.status).toBe(200);
    const edition=emptyHoroscopeEdition(facts.payload.brief.window);
    edition.passages=HOROSCOPE_SIGNS.map(sign=>({sign,headline:`Fixture ${period} ${sign}`,body:`Fixture ${period} opening.\n\nFixture ${period} complete ending.`}));
    const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',model:'manual',status:'DRAFT',lane:'serving',headline:`Fixture ${period}`,body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:facts.payload.brief,signature:facts.payload.signature}}}});
    expect(created.status).toBe(200);
    const row=created.payload.rows[0];expect((await call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'}})).status).toBe(200);
    await page.getByRole('button',{name:period==='daily'?'Today':'This season',exact:true}).click();
    await expect(page.getByRole('article')).toContainText(`Fixture ${period} opening.`);
    await expect(page.getByRole('article')).toContainText(`Fixture ${period} complete ending.`);
   }
   await page.locator('.horoscope-location summary').click();
   await page.getByLabel('Horoscope time zone',{exact:true}).selectOption('Pacific/Honolulu');
   await expect(page.getByRole('status')).toContainText('Pacific/Honolulu');
   await page.reload();await expect(page.locator('.horoscope-location summary')).toContainText('Pacific/Honolulu');
   await page.locator('.horoscope-location summary').click();await page.getByLabel('Horoscope time zone',{exact:true}).selectOption('Asia/Tokyo');
   await expect(page.getByRole('article')).toContainText('Fixture seasonal complete ending.');
   await page.route('**/api/content-reader',route=>route.fulfill({status:503,json:{error:'fixture outage'}}));
   await page.reload();await expect(page.getByRole('alert')).toContainText('could not load');
   await page.unroute('**/api/content-reader');await page.getByRole('button',{name:'Try again',exact:true}).click();
   await expect(page.getByRole('article')).toContainText('Fixture seasonal complete ending.');
   // The main navigation must expose the route, including the mobile menu.
   if(width===390){await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('menuitem',{name:'Horoscopes',exact:true}).click();}
   else {await page.getByRole('button',{name:'Horoscopes',exact:true}).click();}
   await expect(page.locator('.horoscope-page h1')).toHaveText('Horoscopes');
   expect(errors).toEqual([]);
  }finally{child.kill();}
 });
}
