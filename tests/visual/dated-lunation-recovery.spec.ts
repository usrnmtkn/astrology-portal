import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {syntheticPublicationPage} from '../helpers/synthetic-publication-page';
import {canonicalPublicationLedger,publicationLedgerTag} from '../../apps/web/src/services/publicationLedgerTransport';
import skyHandler from '../../api/sky';
test.use({actionTimeout:15000});

for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const)test(`Dated manual article publishes private revisions and restores its reader ${width} ${theme}`,async({page,context,baseURL})=>{
  test.setTimeout(180000);
  const child=fork(path.resolve('tests/helpers/moon-horoscope-api.mts'),['--ipc'],{execArgv:['--import','tsx'],stdio:['ignore','ignore','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{const error=new Error(`Dated fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  let reader:Awaited<ReturnType<typeof context.newPage>>|undefined,recoveries=0,failedPreview=false;
  const title='Temporary dated authoring check';
  const copyA='A complete neutral article opening marks edition A.\n\nThe complete neutral final paragraph closes edition A.';
  const copyB='A revised neutral article opening marks edition B.\n\nThe revised neutral final paragraph closes edition B.';
  try{
    await ready;await page.setViewportSize({width,height:1000});
    await context.addInitScript(theme=>{
      if(!['http:','https:'].includes(location.protocol))return;
      localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);
      localStorage.setItem('tldrastro:selectedLocation',JSON.stringify({label:'Synthetic New York',latitude:40.7128,longitude:-74.006,timeZone:'America/New_York'}));
    },theme);
    await context.route('**/rest/v1/**',async route=>{
      const url=new URL(route.request().url());await route.fulfill({json:url.pathname.endsWith('/content_publications')?syntheticPublicationPage(await call({method:'publications'}),url.searchParams):[]});
    });
    await routeStudioInventoryApi(context,{actualDocumentRoute:true,actualBaselineRecovery:true,call,answer:async(route,url)=>{
      if(url.pathname==='/api/content-publications'){
        const publications=canonicalPublicationLedger(await call({method:'publications'}));await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:'tldr-publications/v1',publications}});return true;
      }
      if(url.pathname==='/api/sky'){
        const response={statusCode:200,setHeader(){},end(body:string){void route.fulfill({status:this.statusCode,contentType:'application/json',body});}};
        await skyHandler({method:'GET',url:route.request().url()} as any,response as any);return true;
      }
      if(url.pathname==='/api/content-reader'){
        const result=await call({method:'reader',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;
      }
      if(!['/api/admin/lunation-writing','/api/admin/content-baseline-recovery','/api/admin/content-publication','/api/admin/content-live-status'].includes(url.pathname))return false;
      const body=route.request().postData()?route.request().postDataJSON():undefined;
      if(url.pathname.endsWith('content-baseline-recovery')&&body?.action==='preview'&&body?.recoveryKind==='moon-reusable'&&!failedPreview){failedPreview=true;await route.fulfill({status:503,json:{ok:false,error:'Reusable Moon readings are temporarily unavailable.'}});return true;}
      const result=await call({method:route.request().method(),body,url:url.pathname+url.search});
      if(url.pathname.endsWith('content-baseline-recovery')&&body.action==='restore'){
        recoveries++;expect(result.status).toBe(200);
        if(theme==='dark'){await route.fulfill({status:503,json:{ok:false,error:'Synthetic lost recovery acknowledgement.'}});return true;}
      }
      await route.fulfill({status:result.status,json:result.payload});return true;
    }});
    const events=await call({method:'GET',url:'/api/admin/lunation-writing?month=2020-05&timeZone=America%2FNew_York'});
    const event=events.payload.events.find((event:any)=>event.phase==='full-moon');
    const macro=await call({method:'seed-published-macro',body:{event}});
    const macroBefore=(await call({method:'rows'})).find((row:any)=>row.id===macro.id);
    const macroLedgerBefore=(await call({method:'publications'})).find((row:any)=>row.content_key===macro.content_key);
    reader=await context.newPage();reader.on('pageerror',error=>errors.push(error.message));await reader.setViewportSize({width,height:1000});await reader.clock.setFixedTime(new Date('2020-05-07T16:00:00Z'));
    await reader.goto(`${baseURL}/?date=2020-05-07#sky/lunation/2020-05-07/scorpio`);
    const capture=()=>reader!.evaluate(()=>{const article=Array.from(document.querySelectorAll<HTMLElement>('.sky-detail-article .article-body-inner')).find(node=>!node.querySelector('#sky-rising-horoscopes'));return Array.from(article?.children??[]).filter(node=>!node.classList.contains('sky-detail-end')).map(node=>(node as HTMLElement).innerText).filter(Boolean).join('\n\n');});
    await expect.poll(capture,{timeout:60000}).not.toBe('');const baseline=await capture();expect(baseline).toContain('complete distinct reusable final paragraph');
    await page.goto('/admin/content#calendar-writeups?view=lunation-writing');
    const workspace=page.getByRole('region',{name:'Lunation writing',exact:true});
    await workspace.getByLabel('Month',{exact:true}).fill('2020-05');await workspace.getByLabel('Time zone',{exact:true}).fill('America/New_York');await workspace.getByRole('combobox',{name:'Event type',exact:true}).selectOption('full-moon');
    await workspace.getByRole('button',{name:'Write manually',exact:true}).click();
    await workspace.getByLabel('Article title',{exact:true}).fill(title);await workspace.getByLabel('Full article',{exact:true}).fill(copyA);
    await workspace.getByRole('button',{name:'Save draft',exact:true}).click();await expect(workspace.getByRole('status')).toHaveText('Draft saved.');
    await workspace.getByRole('button',{name:'Review & publish',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Generated content editor',exact:true}),field=editor.getByRole('textbox',{name:'Full lunar passage',exact:true});
    await expect(field).toHaveValue(copyA);await editor.getByRole('button',{name:'Save & publish',exact:true}).click();
    const canonical=async()=>(await call({method:'rows'})).find((row:any)=>row.content_key.startsWith('cms/lunation-article/')&&row.mode==='article');
    await expect.poll(async()=>(await canonical())?.status).toBe('LIVE');let live=await canonical();
    await reader.reload();await expect.poll(capture).toContain('closes edition A.');expect((await capture()).replace(/\s+/gu,' ').trim()).toBe(copyA.replace(/\s+/gu,' '));
    await field.fill(copyB);await editor.getByRole('button',{name:'Save draft',exact:true}).click();
    await expect.poll(async()=>(await call({method:'rows'})).some((row:any)=>row.mode==='studio-draft'&&row.body===copyB)).toBe(true);
    await reader.reload();await expect.poll(capture).toContain('closes edition A.');expect(await capture()).not.toContain('edition B');
    const privateDraft=(await call({method:'rows'})).find((row:any)=>row.mode==='studio-draft'&&row.body===copyB);
    const reviewed=await call({method:'PATCH',body:{id:privateDraft.id,expectedUpdatedAt:privateDraft.updated_at,status:'REVIEWED'}});expect(reviewed.status).toBe(200);
    await page.reload();await workspace.getByRole('region',{name:'Saved lunation drafts',exact:true}).getByRole('button',{name:title,exact:true}).click();await workspace.getByRole('button',{name:'Review & publish',exact:true}).click();
    await expect(field).toHaveValue(copyB);await editor.getByRole('button',{name:'Save & publish',exact:true}).click();
    await expect.poll(async()=>(await canonical())?.body).toBe(copyB);live=await canonical();
    await reader.reload();await expect.poll(capture).toContain('closes edition B.');expect((await capture()).replace(/\s+/gu,' ').trim()).toBe(copyB.replace(/\s+/gu,' '));
    await editor.locator('summary').filter({hasText:'More actions'}).click();await editor.getByRole('button',{name:'Retire everywhere',exact:true}).click();
    await expect.poll(async()=>(await call({method:'publications'})).find((p:any)=>p.content_key===live.content_key)?.state).toBe('retired');
    page.once('dialog',dialog=>dialog.accept());await editor.getByRole('button',{name:'Archive source',exact:true}).click();
    await expect.poll(async()=>(await canonical())?.status).toBe('ARCHIVED');const archived=await canonical();
    const recovery=editor.getByLabel('Moon reading recovery',{exact:true}),use=recovery.getByRole('button',{name:'Use reusable Moon readings',exact:true});
    await expect(recovery.getByRole('alert')).toHaveText('Reusable Moon readings are temporarily unavailable.');await recovery.getByRole('button',{name:'Check reusable Moon readings',exact:true}).click();await expect(use).toBeEnabled();
    await use.click();await recovery.getByRole('button',{name:'Cancel',exact:true}).click();expect(recoveries).toBe(0);await use.click();await use.click();
    if(theme==='dark'){await expect(page.getByRole('button',{name:'Check recovery',exact:true})).toBeEnabled();await page.reload();await page.getByRole('button',{name:'Check recovery',exact:true}).click();}
    await expect(page.getByRole('button',{name:'Check recovery',exact:true})).toHaveCount(0);expect(recoveries).toBe(1);
    expect(JSON.stringify(await canonical())===JSON.stringify(archived)).toBe(true);expect((await call({method:'reader',body:{keys:[live.content_key]}})).payload.rows).toHaveLength(0);
    await reader.reload();await expect.poll(capture).toBe(baseline);await reader.reload();await expect.poll(capture).toBe(baseline);
    await page.goto('/admin/content#calendar-writeups?view=lunation-writing');await page.reload();await workspace.getByRole('region',{name:'Saved lunation drafts',exact:true}).getByRole('button',{name:title,exact:true}).click();await workspace.getByRole('button',{name:'Archive draft',exact:true}).click();
    await expect(workspace.getByRole('status')).toHaveText('Draft archived. Restore it to continue editing.');
    const finalRows=await call({method:'rows'});expect(finalRows.filter((row:any)=>row.id!==macro.id).every((row:any)=>row.status==='ARCHIVED')).toBe(true);
    expect(finalRows.find((row:any)=>row.id===macro.id)).toEqual(macroBefore);expect((await call({method:'publications'})).find((row:any)=>row.content_key===macro.content_key)).toEqual(macroLedgerBefore);expect(await call({method:'generation-calls'})).toBe(0);expect(errors).toEqual([]);
    await page.screenshot({path:`test-results/dated-lunation-recovery-${width}-${theme}.png`,fullPage:true});
  }finally{
    await reader?.close().catch(()=>{});await page.close().catch(()=>{});await context.unrouteAll({behavior:'wait'}).catch(()=>{});
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{if(child.connected)await Promise.race([call({method:'close'}),new Promise(resolve=>{timer=setTimeout(resolve,3000);})]).catch(()=>{});}
    finally{clearTimeout(timer);child.kill();}
  }
});
