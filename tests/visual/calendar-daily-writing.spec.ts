import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {checkWritingExport} from '../helpers/check-writing-export';
import {canonicalPublicationLedger,publicationLedgerTag} from '../../apps/web/src/services/publicationLedgerTransport';
for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Daily Calendar writing ${width} ${theme}`,async({page})=>{
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,OPENAI_API_KEY:'synthetic-no-provider-dispatch'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,any>();
  child.stderr?.on('data',data=>stderr+=data);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const p=pending.get(message.id);if(p){pending.delete(message.id);message.error?p.reject(new Error(message.error)):p.resolve(message.result);}});child.on('exit',code=>{reject(new Error(`Fixture exited ${code}: ${stderr}`));pending.forEach(p=>p.reject(new Error('Fixture exited')));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try{
   await ready;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:1000});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{if(url.pathname!=='/api/admin/calendar-daily-writing')return false;const result=await call({method:'daily-writing',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;}});
   await page.goto('/admin/content#ai-writing');
   const style=(locator:any)=>locator.evaluate((el:HTMLElement)=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];});
   const analogue=page.getByRole('heading',{name:'Weekly instructions',exact:true});await expect(analogue).toBeVisible();const headingStyle=await style(analogue);
   if(width<720)await page.getByRole('button',{name:'Open Content Studio navigation',exact:true}).click();
   await page.getByRole('button',{name:'Calendar Write-ups',exact:true}).click();await page.getByRole('tab',{name:'Daily writing',exact:true}).click();
   const editor=page.getByRole('region',{name:'Daily Calendar writing',exact:true});
   await expect(editor.getByRole('heading',{name:'Daily Moon passage',level:2})).toBeVisible();expect(await style(editor.getByRole('heading',{level:2}))).toEqual(headingStyle);
   await expect(editor.getByRole('tab')).toHaveText(['Instructions & references','Writer input','Saved drafts']);
   await editor.getByRole('tab',{name:'Saved drafts',exact:true}).click();await expect(editor.getByText('No writer results for this date yet.')).toBeVisible();
   await page.screenshot({path:`test-results/calendar-daily-empty-${width}-${theme}.png`,fullPage:true});
   await editor.getByRole('tab',{name:'Instructions & references',exact:true}).click();
   const labels=['Writer instructions','Calendar references','Book references','Rejected writing and owner corrections','Length and output'];
   for(const label of labels)await editor.getByLabel(label,{exact:true}).fill(`Synthetic ${label} opening.\n\nComplete synthetic final sentence.`);
   await editor.getByRole('button',{name:'Save instructions and references',exact:true}).click();await expect(editor.getByRole('status')).toHaveText('Daily writing references saved.');
   await page.reload();await expect(editor.getByLabel('Calendar references',{exact:true})).toHaveValue('Synthetic Calendar references opening.\n\nComplete synthetic final sentence.');
   await editor.getByLabel('Writing date',{exact:true}).fill('2026-10-06');await editor.getByLabel('Writing time zone',{exact:true}).fill('America/New_York');await editor.getByRole('button',{name:'Open date',exact:true}).click();
   await editor.getByRole('tab',{name:'Writer input',exact:true}).click();
   await editor.getByLabel('Thought for this date',{exact:true}).fill('Synthetic owner concern with a specific mechanism.');
   await editor.getByLabel('Exclusions for this date',{exact:true}).fill('Synthetic excluded frame.');
   await editor.getByRole('button',{name:'Save thought',exact:true}).click();await expect(editor.getByRole('status')).toHaveText('Thought saved.');
   const beforeExport=await call({method:'rows'});
   await checkWritingExport(page,editor,'Synthetic Calendar references opening.\n\nComplete synthetic final sentence.');
   expect(await call({method:'rows'})).toEqual(beforeExport);
   const thought=editor.getByLabel('Thought for this date',{exact:true}),originalThought=await thought.inputValue();
   await thought.fill('Synthetic temporary edit invalidates the loaded export.');
   await thought.fill(originalThought);
   await checkWritingExport(page,editor,'Synthetic Calendar references opening.\n\nComplete synthetic final sentence.');
   await editor.getByRole('tab',{name:'Instructions & references',exact:true}).click();
   await editor.getByLabel('Writer instructions',{exact:true}).fill('Synthetic changed writer instructions. Preserve this complete new ending.');
   await editor.getByRole('button',{name:'Save instructions and references',exact:true}).click();
   await expect(editor.getByRole('status')).toHaveText('Daily writing references saved.');
   await editor.getByRole('tab',{name:'Writer input',exact:true}).click();
   await checkWritingExport(page,editor,'Synthetic changed writer instructions. Preserve this complete new ending.');
   await editor.getByRole('button',{name:'Preview writer input',exact:true}).click();await expect(editor.getByRole('heading',{name:'Input ready for review',level:3})).toBeVisible();
   await expect(editor.getByLabel('Complete writer input')).toHaveValue(/10:52 PM EDT/);await expect(editor.getByLabel('Complete writer input')).toHaveValue(/Synthetic Calendar references opening/);
   await expect(editor.getByRole('button',{name:'Generate one draft',exact:true})).toBeDisabled();
   await editor.getByRole('checkbox').check();await expect(editor.getByRole('button',{name:'Generate one draft',exact:true})).toBeEnabled();
   await editor.getByLabel('Thought for this date',{exact:true}).fill('Synthetic changed concern.');await expect(editor.getByLabel('Complete writer input')).toHaveCount(0);
   await editor.getByRole('button',{name:'Save thought',exact:true}).click();await expect(editor.getByRole('status')).toHaveText('Thought saved.');
   await page.reload();await editor.getByRole('tab',{name:'Writer input',exact:true}).click();await expect(editor.getByLabel('Thought for this date',{exact:true})).toHaveValue('Synthetic changed concern.');
   await editor.getByRole('button',{name:'Preview writer input',exact:true}).click();await expect(editor.getByRole('heading',{level:3})).toHaveText('Input ready for review');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:`test-results/calendar-daily-prepared-${width}-${theme}.png`,fullPage:true});
   // A newer edit elsewhere produces a conflict without discarding the local text.
   await editor.getByRole('tab',{name:'Instructions & references',exact:true}).click();const rows=await call({method:'rows'});const profileRow=rows.find((r:any)=>r.content_key==='studio-writing-profile/calendar/daily');
   const remote={...profileRow.sections.profile,instructions:'Synthetic newer remote instructions.'};await call({method:'daily-writing',body:{action:'save-profile',profile:remote,expectedUpdatedAt:profileRow.updated_at}});
   await editor.getByLabel('Writer instructions',{exact:true}).fill('Synthetic unsaved local instructions.');await editor.getByRole('button',{name:'Save instructions and references',exact:true}).click();await expect(editor.getByRole('alert')).toContainText('changed');await expect(editor.getByLabel('Writer instructions',{exact:true})).toHaveValue('Synthetic unsaved local instructions.');
   expect(errors).toEqual([]);
  }finally{child.kill();}
 });
}

test.describe('Daily writer review from another browser time zone',()=>{
 test.use({timezoneId:'Asia/Tokyo'});
 for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Daily writer result review and publication ${width} ${theme}`,async({page})=>{
  test.setTimeout(150000);
  const date='2026-11-17',timeZone='America/New_York';
  const key=`calendar-passage/daily/${date}/${encodeURIComponent(timeZone)}`;
  const workspaceKey=`studio-writing-profile/calendar/daily-draft/${date}/${encodeURIComponent(timeZone)}`;
  const resultId='b1c2d3e4-1111-4222-8333-123456789abc',olderId='b1c2d3e4-1111-4222-8333-123456789abd';
  const candidate='Synthetic saved writer opening.\n\nComplete saved writer ending.';
  const older='Synthetic earlier writer opening.\n\nComplete earlier writer ending.';
  const result=(id:string,body:string,status='needs_review')=>({id,candidate:body,status,facts:{date,timeZone},requestHash:'a'.repeat(64),outputHash:'b'.repeat(64),response:{status:status==='invalid'?'incomplete':'completed'},request:{input:'PRIVATE WRITER INPUT'},ownerApproved:false,promotionAuthorized:false,completedAt:'2026-11-17T12:00:00.000Z'});
  const original={id:'b1c2d3e4-1111-4222-8333-123456789abe',content_key:workspaceKey,surface:'sky',mode:'article',target_date:null,status:'DRAFT',lane:'reference',body:'',updated_at:'2026-11-17T12:00:00.000Z',sections:{workspace:{thought:'Synthetic daily focus.',exclusions:'Synthetic exclusions.'},run:{active:null,results:[result(olderId,older),result(resultId,candidate),result('b1c2d3e4-1111-4222-8333-123456789abf','Preserved partial result.','invalid')]}}};
  const directory=await mkdtemp(path.join(tmpdir(),'daily-review-'));
  const fixture=path.join(directory,'rows.json');await writeFile(fixture,JSON.stringify([original]));
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,SKY_SAVE_FIXTURE:fixture,STUDIO_UUID_IDS:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,any>();child.stderr?.on('data',data=>stderr+=data);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const p=pending.get(message.id);if(p){pending.delete(message.id);message.error?p.reject(new Error(message.error)):p.resolve(message.result);}});child.on('exit',code=>{reject(new Error(`Fixture exited ${code}: ${stderr}`));pending.forEach(p=>p.reject(new Error('Fixture exited')));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try{
   await ready;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:1000});
   await page.emulateMedia({colorScheme:theme});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
   await routeStudioInventoryApi(page,{call,actualDocumentRoute:true,answer:async(route,url)=>{
    if(url.pathname==='/api/admin/calendar-daily-writing'){
     const body=route.request().postDataJSON();expect(body.action).not.toBe('generate');
     const result=await call({method:'daily-writing',body});await route.fulfill({status:result.status,json:result.payload});return true;
    }
    if(url.pathname==='/api/content-publications'){
     const publications=canonicalPublicationLedger(await call({method:'publications'}));
     await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:'tldr-publications/v1',publications}});return true;
    }
    if(['/api/admin/content-history','/api/admin/content-publication'].includes(url.pathname)){
     const result=await call({method:route.request().method(),body:route.request().method()==='GET'?undefined:route.request().postDataJSON(),url:url.pathname+url.search});await route.fulfill({status:result.status,json:result.payload});return true;
    }
    return false;
   }});
   const writingUrl=`/admin/content#calendar-writeups?${new URLSearchParams({view:'daily-writing',date,timeZone})}`;
   await page.goto(writingUrl);await page.getByRole('tab',{name:'Saved drafts',exact:true}).click();
   const results=page.getByRole('region',{name:'Saved first-pass result',exact:true});
   await expect(results).toHaveCount(3);await expect(results.nth(0).getByRole('button',{name:'Review & edit',exact:true})).toBeDisabled();
   await results.nth(1).screenshot({path:`test-results/calendar-daily-review-action-${width}-${theme}.png`});
   await results.nth(1).getByRole('button',{name:'Review & edit',exact:true}).click();
   await expect(page).toHaveURL(new RegExp(`writerResult=${resultId}`));
   const editor=page.getByRole('region',{name:'Assembled Calendar passage',exact:true});
   const wording=editor.getByRole('textbox',{name:'Complete passage wording',exact:true});
   await expect(wording).toHaveValue(candidate);await expect(editor.getByLabel('Passage date',{exact:true})).toHaveValue(date);await expect(editor.getByLabel('Passage time zone',{exact:true})).toHaveValue(timeZone);
   await expect(editor.getByRole('button',{name:'Publish passage',exact:true})).toBeDisabled();
   await editor.getByRole('button',{name:'Save draft',exact:true}).click();await expect(editor.getByRole('status',{name:'Calendar save status',exact:true})).toContainText('Draft saved');
   let rows=await call({method:'rows'});let saved=rows.find((r:any)=>r.content_key===key&&r.status==='DRAFT');expect(saved.sections.packageDraft.body).toBe(candidate);expect(saved.sections.calendarDailyWriterSource.resultId).toBe(resultId);
   expect((await call({method:'POST',body:{keys:[key]},url:'/api/content-reader'})).payload.rows).toEqual([]);
   const edited='Synthetic owner-edited opening.\n\nComplete owner-edited ending.';
   await wording.fill(edited);await editor.getByRole('button',{name:'Save draft',exact:true}).click();await expect(editor.getByRole('status',{name:'Calendar save status',exact:true})).toContainText('Draft saved');
   await page.reload();await expect(wording).toHaveValue(edited);
   await editor.getByRole('link',{name:'Back to writer results',exact:true}).click();await page.getByRole('tab',{name:'Saved drafts',exact:true}).click();
   await results.nth(2).getByRole('button',{name:'Review & edit',exact:true}).click();
   await expect(wording).toHaveValue(edited);await expect(editor.getByRole('textbox',{name:'Selected writer result',exact:true})).toHaveValue(older);
   await editor.getByRole('button',{name:'Keep existing draft',exact:true}).click();await expect(wording).toHaveValue(edited);
   const preview=editor.getByRole('region',{name:'Calendar reader workspace',exact:true});
   await preview.getByRole('button',{name:'Draft',exact:true}).click();await expect(preview.getByLabel('Assembled passage preview',{exact:true})).toContainText('Complete owner-edited ending.');
   await editor.getByRole('button',{name:'Publish passage',exact:true}).click();await expect(editor.getByRole('status',{name:'Calendar save status',exact:true})).toContainText('Published. The Calendar uses this passage.');
   const reader=await call({method:'POST',body:{keys:[key]},url:'/api/content-reader'});expect(reader.status).toBe(200);expect(reader.payload.rows[0].body).toBe(edited);expect(JSON.stringify(reader.payload)).not.toContain('PRIVATE WRITER INPUT');
   await preview.getByRole('button',{name:'Published',exact:true}).click();await expect(preview.getByLabel('Assembled passage preview',{exact:true})).toContainText('Synthetic owner-edited opening.');await expect(preview.getByLabel('Assembled passage preview',{exact:true})).toContainText('Complete owner-edited ending.');
   await page.screenshot({path:`test-results/calendar-daily-reviewed-${width}-${theme}.png`,fullPage:true});
   await page.reload();await expect(wording).toHaveValue(edited);await expect(preview.getByLabel('Assembled passage preview',{exact:true})).toContainText('Complete owner-edited ending.');
   const history=editor.locator('details').filter({has:page.locator(':scope > summary').filter({hasText:'Publication and history'})}).first();await history.locator(':scope > summary').click();
   await editor.getByRole('button',{name:'Use shared template for this date',exact:true}).click();await expect.poll(async()=>(await call({method:'POST',body:{keys:[key]},url:'/api/content-reader'})).payload.rows.length).toBe(0);
   rows=await call({method:'rows'});expect(rows.find((r:any)=>r.id===original.id)).toEqual(original);
   expect(errors).toEqual([]);
  }finally{child.kill();await rm(directory,{recursive:true,force:true});}
 });
}
});
