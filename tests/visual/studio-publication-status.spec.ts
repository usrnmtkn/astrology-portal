import { expect, test, type Browser, type Page, type TestInfo, type Request } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

test.describe.configure({ retries: 0 });

const id='10000000-0000-4000-8000-000000000089';
const key='education/astro-101/chapter/synthetic-publication-status';
const body='Synthetic neutral opening paragraph.\n\nComplete synthetic final sentence.';
const readerPath='/learn/astro-101/synthetic-publication-status';
const editor=(page:Page)=>page.getByRole('dialog',{name:'Generated content editor'});
const footer=(page:Page)=>editor(page).locator('.admin-editor-save-state');
const header=(page:Page)=>editor(page).locator('[aria-label="Reader status"]');
const baseRow=(status='ARCHIVED')=>({id,content_key:key,status,surface:'education',mode:'article',headline:'Synthetic publication status chapter',summary:'',body,lane:'serving',review_state:null,block_type:'essay',event_type:'manual-content',provider:'manual-admin',prompt_version:'manual-admin',created_at:'2030-01-01T00:00:00Z',updated_at:'2030-01-01T00:00:00Z',sections:{kind:'chapter',intro:'',blocks:[]},facts:{slug:readerPath},reviewer_notes:'',source_snapshot:{contentType:'authored-article',contentSystem:'authored',content_role:'authored-content',authoringSource:'admin-dashboard'}});
function gate(){let release!:()=>void;const promise=new Promise<void>(resolve=>{release=resolve;});return {promise,release};}

async function fixture(page:Page,browser:Browser,info:TestInfo,options:{pendingOld?:boolean;guide?:boolean;holdOpening?:boolean}={}) {
 const row=options.guide?{...baseRow('DRAFT'),id:'10000000-0000-4000-8000-000000000091',content_key:'article/guide/10000000-0000-4000-8000-000000000091',surface:'sky',headline:'Synthetic publication status guide',sections:{},facts:{},source_snapshot:{contentSystem:'cms-surface-override',contentType:'guide',allowedSlots:[]}}:baseRow(options.pendingOld?'DRAFT':'ARCHIVED');
 const api=await studioApiStore([row],{publicationDb:true});
 if(options.guide){const initial=(await api.call({method:'rows'}))[0];const result=await api.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:initial.updated_at,ownerAction:'publish-owner-content'}});expect(result.status,'Actual handler seeds the existing published guide').toBe(200);}
 const cached=await api.call({method:'publications'});
 const opening=gate(),old=gate(),fresh=gate();let openingHeld=false,oldHeld=false,freshHeld=false,failLedger=false;
 const evidence:any={errors:[],failed:[],responses:[],ledger:[],writes:[],blocked:[]};const expectedFailures=new WeakSet<Request>();
 const origin=new URL(info.project.use.baseURL as string).origin;
 function observe(p:Page,scope:string){
  p.on('pageerror',e=>evidence.errors.push({scope,message:e.message}));
  p.on('requestfailed',r=>evidence.failed.push({scope,path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  p.on('response',async r=>{const u=new URL(r.url());if(!u.pathname.startsWith('/api/')&&u.pathname!=='/rest/v1/content_publications')return;const item:any={scope,path:u.pathname,status:r.status(),expectedFailure:expectedFailures.has(r.request()),completed:false};evidence.responses.push(item);try{item.failure=await r.finished();item.completed=item.failure===null;}catch(e){item.failure=String(e);}});
 }
 async function install(p:Page,scope:'admin'|'reader'){
  observe(p,scope);
  await routeStudioInventoryApi(p,{actualDocumentRoute:true,call:async message=>{
   if(message.method!=='GET'&&message.method!=='rows'){expect(scope).toBe('admin');expect(message.method).toBe('PATCH');evidence.writes.push(message.body);}
   return api.call(message);
  },answer:async(route,u)=>{
   const req=route.request();
   if(['/api/admin/content-live-status','/api/admin/content-history','/api/admin/content-publication','/api/content-reader','/api/content-publications'].includes(u.pathname)){
    if(scope==='admin'&&u.pathname==='/api/content-publications'&&failLedger){expectedFailures.add(req);evidence.ledger.push({scope,path:u.pathname,status:503,expectedFailure:true});await route.fulfill({status:503,json:{error:'Synthetic ledger unavailable'}});return true;}
    const result=await api.call({method:req.method(),url:u.pathname+u.search,body:req.method()==='GET'?undefined:req.postDataJSON()});
    await route.fulfill({status:result.status,headers:result.headers,json:result.payload});return true;
   }
   if(req.method()!=='GET')throw new Error(`Unexpected endpoint ${u.pathname}`);
   if(u.pathname==='/api/health'){await route.fulfill({json:{ok:true,dependencies:{ephemeris:{ok:true}}}});return true;}
   return false;
  }});
  await p.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin===origin)return route.fallback();
   if(req.method()==='GET'&&u.origin==='https://fonts.googleapis.com'&&u.pathname==='/css2')return route.fulfill({status:200,contentType:'text/css',body:''});
   if(req.method()==='GET'&&u.pathname==='/rest/v1/content_publications'){
    if(scope==='admin'&&options.holdOpening){openingHeld=true;await opening.promise;}
    if(scope==='admin'&&failLedger){expectedFailures.add(req);evidence.ledger.push({scope,path:u.pathname,status:503,expectedFailure:true});return route.fulfill({status:503,json:{error:'Synthetic ledger unavailable'}});}
    const result=await api.call({method:'publication-page',url:u.pathname+u.search});
    const publication=result.payload.find((p:any)=>p.content_key===row.content_key);
    const entry:any={scope,status:result.status,state:publication?.state??null,revision:publication?.revision??null,held:null,completed:false};evidence.ledger.push(entry);
    if(scope==='admin'&&options.pendingOld&&publication?.state==='retired'&&!oldHeld){oldHeld=true;entry.held='pre-edit';await old.promise;}
    else if(scope==='admin'&&options.pendingOld&&publication?.state==='live'&&!freshHeld){freshHeld=true;entry.held='fresh';await fresh.promise;}
    await route.fulfill({status:result.status,json:result.payload});entry.completed=true;return;
   }
   // The public shell can check an empty session/profile plane; content reads use the real handler.
   if(scope==='reader'&&req.method()==='GET'&&['/rest/v1/user_profiles','/rest/v1/manual_charts'].includes(u.pathname))return route.fulfill({json:[]});
   evidence.blocked.push({scope,origin:u.origin,path:u.pathname,method:req.method()});await route.abort('blockedbyclient');
  });
 }
 await page.addInitScript(records=>{
  localStorage.setItem('tldrastro:contentAdminSecret','qa-secret');localStorage.setItem('tldrastro:slotDictionaryInfoDismissed','true');
  localStorage.setItem('tldrastro:content-publications:v1',JSON.stringify(records));
 },cached);
 await install(page,'admin');
 const readerContext=await browser.newContext({baseURL:origin});const reader=await readerContext.newPage();await install(reader,'reader');
 let readerOpened=false;
 async function rendered(expected:string|null){
  const url=options.guide?`/#articles/${encodeURIComponent(row.content_key)}`:readerPath;
  if(readerOpened)await reader.reload();else{await reader.goto(url);readerOpened=true;}
  if(expected===null){await expect(reader.getByRole('heading',{name:/Page not found|Article not found/i})).toBeVisible();await expect(reader.getByText(body.split('\n\n')[0],{exact:true})).toHaveCount(0);}
  else{await expect(reader.getByText(expected.split('\n\n')[0],{exact:true})).toBeVisible();await expect(reader.getByText(expected.split('\n\n').at(-1)!,{exact:true})).toBeVisible();}
  await reader.waitForLoadState('networkidle',{timeout:5000});
 }
 async function proof(stage:string,state:string,expected:string|null){
  const publication=(await api.call({method:'publications'})).find((p:any)=>p.content_key===row.content_key);
  expect(publication?.state).toBe(state);expect(Number(publication?.revision)).toBeGreaterThan(0);
  const response=await api.call({method:'POST',url:'/api/content-reader',body:{keys:[row.content_key]}});expect(response.status).toBe(200);
  if(expected===null)expect(response.payload.rows).toEqual([]);else expect(response.payload.rows.find((r:any)=>r.id===row.id)?.body).toBe(expected);
  await rendered(expected);
  await info.attach(stage,{body:JSON.stringify({publication,readerStatus:response.status,readerRows:response.payload.rows}),contentType:'application/json'});
 }
 async function open(){
  await page.goto(`/admin/content#exact-content?q=${encodeURIComponent(row.content_key)}`);
  if(row.status==='ARCHIVED')await page.getByRole('button',{name:'Show retired',exact:true}).click();
  const exact=page.getByRole('row').filter({hasText:row.content_key});await expect(exact).toBeVisible();
  const hydration=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/generated-content-inventory'&&new URL(r.url()).searchParams.get('id')===row.id);
  await exact.getByRole('button',{name:'Edit',exact:true}).click();const r=await hydration;expect(r.status()).toBe(200);expect(await r.finished()).toBeNull();expect(r.request().failure()).toBeNull();await expect(editor(page)).toBeVisible();
 }
 async function action(label:string,status:string){
  const done=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/generated-content'&&r.request().method()==='PATCH');
  await editor(page).getByRole('button',{name:label,exact:true}).click();const r=await done;expect(r.status()).toBe(200);expect(await r.finished()).toBeNull();expect(r.request().failure()).toBeNull();expect((await r.json()).rows[0].status).toBe(status);
 }
 async function clean(){
  opening.release();old.release();fresh.release();
  try{await page.waitForLoadState('networkidle',{timeout:5000});await reader.waitForLoadState('networkidle',{timeout:5000});expect(evidence.errors).toEqual([]);expect(evidence.failed).toEqual([]);expect(evidence.blocked).toEqual([]);expect(evidence.responses.filter((r:any)=>!r.completed||r.failure)).toEqual([]);expect(evidence.responses.filter((r:any)=>r.status>=400&&!(r.expectedFailure&&r.status===503))).toEqual([]);}
  finally{await info.attach('request-evidence',{body:JSON.stringify(evidence,null,2),contentType:'application/json'});await readerContext.close();api.close();}
 }
 return {api,row,evidence,open,action,proof,clean,fail:(value:boolean)=>{failLedger=value;},openingHeld:()=>openingHeld,releaseOpening:opening.release,oldHeld:()=>oldHeld,freshHeld:()=>freshHeld,releaseOld:old.release,releaseFresh:fresh.release};
}

test('restored publication and live save keep status and full rendered reader consistent',async({page,browser},info)=>{
 const f=await fixture(page,browser,info);try{
  await f.open();await f.proof('archived','retired',null);await expect(footer(page)).toHaveText('Retired everywhere');
  await f.action('Restore as draft','DRAFT');await f.proof('restored','retired',null);
  await f.action('Publish to app','LIVE');await f.proof('published','live',body);await expect(header(page)).toHaveText('Live');await expect(footer(page)).toHaveText('All changes saved');
  const revision=body+'\n\nComplete synthetic live revision ending.';await editor(page).getByRole('textbox',{name:'Article body',exact:true}).fill(revision);
  await f.action('Save changes','LIVE');await f.proof('live-save','live',revision);await expect(header(page)).toHaveText('Live');await expect(footer(page)).toHaveText('All changes saved');
  await f.action('Move to draft','DRAFT');await f.proof('withdrawn','retired',null);await f.action('Archive source','ARCHIVED');await f.proof('archived-again','retired',null);
 }finally{await f.clean();}
});

test('pre-edit pending ledger cannot finish as the final publication status',async({page,browser},info)=>{
 const f=await fixture(page,browser,info,{pendingOld:true});try{
  await f.open();await expect.poll(f.oldHeld).toBe(true);await expect(footer(page)).toContainText('Checking publication status');
  await f.action('Publish to app','LIVE');await f.proof('committed-while-old-read-pending','live',body);await expect(header(page)).toHaveText('Live');
  f.releaseOld();await expect.poll(f.freshHeld).toBe(true);await expect(footer(page)).toContainText('Checking publication status');
  f.releaseFresh();await expect(footer(page)).toHaveText('All changes saved');await f.proof('fresh-after-old-completion','live',body);
  expect(f.evidence.ledger.some((r:any)=>r.scope==='admin'&&r.held==='pre-edit'&&r.state==='retired'&&r.completed)).toBe(true);
  expect(f.evidence.ledger.some((r:any)=>r.scope==='admin'&&r.held==='fresh'&&r.state==='live'&&r.completed)).toBe(true);
  await f.action('Move to draft','DRAFT');await f.proof('withdrawn','retired',null);
 }finally{await f.clean();}
});

test('ledger failure preserves saved live copy and recovers only on manual retry',async({page,browser},info)=>{
 const f=await fixture(page,browser,info);try{
  await f.open();await expect(footer(page)).toHaveText('Retired everywhere');await f.action('Restore as draft','DRAFT');await expect(footer(page)).toHaveText('Retired everywhere');
  f.fail(true);await f.action('Publish to app','LIVE');await f.proof('published-during-verification-outage','live',body);await expect(header(page)).toHaveText('Live');await expect(footer(page)).toHaveText('Saved · Publication status unavailable');
  await expect(editor(page).getByRole('textbox',{name:'Article body',exact:true})).toBeEnabled();await expect(editor(page).getByRole('button',{name:'Move to draft',exact:true})).toBeEnabled();
  const count=f.evidence.ledger.length;await page.waitForLoadState('networkidle',{timeout:5000});expect(f.evidence.ledger.length).toBe(count);
  f.fail(false);await editor(page).getByRole('button',{name:'Refresh publication status',exact:true}).click();await expect(footer(page)).toHaveText('All changes saved');await expect(editor(page).getByRole('button',{name:'Refresh publication status',exact:true})).toHaveCount(0);await f.proof('verified-after-explicit-retry','live',body);
  await f.action('Move to draft','DRAFT');await f.proof('withdrawn','retired',null);
 }finally{await f.clean();}
});

test('ledger-dependent retirement actions are gated during verification failure',async({page,browser},info)=>{
 const f=await fixture(page,browser,info,{guide:true});try{
  await f.open();await expect(footer(page)).toHaveText('All changes saved');await expect(editor(page).getByRole('button',{name:'Retire everywhere',exact:true})).toBeEnabled();await f.proof('published-guide-baseline','live',body);
  f.fail(true);const confirmed=await f.api.call({method:'GET',url:`/api/admin/generated-content-inventory?id=${f.row.id}&status=all&visibility=all&limit=1`});expect(confirmed.status).toBe(200);
  // Revalidation notice for the exact version confirmed by the real inventory handler; no new write or fabricated success.
  await page.evaluate(notice=>window.dispatchEvent(new CustomEvent('tldrastro:content-update',{detail:notice})),{contentKey:f.row.content_key,published:true,updatedAt:confirmed.payload.rows[0].updated_at});
  await expect(footer(page)).toHaveText('Saved · Publication status unavailable');await expect(editor(page).getByRole('button',{name:'Retire everywhere',exact:true})).toBeDisabled();await expect(editor(page).getByRole('button',{name:'Archive source',exact:true})).toBeEnabled();await f.proof('reader-still-complete-during-outage','live',body);
  f.fail(false);await editor(page).getByRole('button',{name:'Refresh publication status',exact:true}).click();await expect(editor(page).getByRole('button',{name:'Retire everywhere',exact:true})).toBeEnabled();await expect(footer(page)).toHaveText('All changes saved');
 }finally{await f.clean();}
});

test('publication verification preserves the save target and complete publication',async({page,browser},info)=>{
 await page.setViewportSize({width:1440,height:1000});
 const f=await fixture(page,browser,info,{guide:true,holdOpening:true});try{
  await f.open();await expect.poll(f.openingHeld).toBe(true);
  const revised=body+'\n\nComplete synthetic revised ending.';
  await editor(page).getByRole('textbox',{name:'Article body',exact:true}).fill(revised);
  const save=editor(page).getByRole('button',{name:'Save & publish',exact:true});await expect(save).toBeEnabled();
  const before=await save.boundingBox();expect(before).not.toBeNull();
  await expect(editor(page).getByRole('button',{name:'Retire everywhere',exact:true})).toBeDisabled();
  f.releaseOpening();await page.waitForLoadState('networkidle',{timeout:5000});
  expect(await save.boundingBox()).toEqual(before);
  const completed=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/admin/generated-content'&&response.request().method()==='PATCH'&&response.request().postDataJSON()?.ownerAction==='publish-standalone-article-revision');
  await page.mouse.click(before!.x+before!.width/2,before!.y+before!.height/2);
  const response=await completed;expect(response.status()).toBe(200);expect(await response.finished()).toBeNull();expect(response.request().failure()).toBeNull();
  await expect(header(page)).toHaveText('Live');await expect(footer(page)).toHaveText('All changes saved');await f.proof('stable-save-target-published','live',revised);
 }finally{await f.clean();}
});
