import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
const key='sky-card/venus/scorpio/sextile/mars/virgo';
for(const width of [390,1440]) for(const theme of ['light','dark'] as const) {
 test(`Version conflict and lost-publication recovery at ${width} ${theme}`,async({page,context})=>{
  test.setTimeout(60_000);
  const child=fork(path.resolve('tests/helpers/calendar-review-api.mjs'),['--ipc'],{execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  const pending=new Map<number,{resolve:(v:any)=>void,reject:(e:Error)=>void}>();let sequence=0,stderr='';
  child.stderr?.on('data',data=>{stderr+=data;});
  const ready=new Promise<void>((resolve,reject)=>{
   child.on('message',(message:any)=>{if(message.ready)return resolve();const item=pending.get(message.id);if(item){pending.delete(message.id);message.error?item.reject(new Error(message.error)):item.resolve(message.result);}});
   child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(item=>item.reject(error));});
  });
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  const second=await context.newPage();const errors:string[]=[];let publications=0;
  try {
   await ready;const fixture=await call({method:'fixture',key});
   for(const tab of [page,second]) {
    await tab.setViewportSize({width,height:1000});await tab.emulateMedia({colorScheme:theme});tab.on('pageerror',error=>errors.push(error.message));
    await tab.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
    await routeStudioInventoryApi(tab,{call,listRows:rows=>rows.filter(row=>row.content_key===key && row.status!=='ARCHIVED'),answer:async(route,url)=>{
     if(url.pathname!=='/api/admin/content-live-status')return false;
     const statuses=await call({method:'statuses',body:route.request().postDataJSON()});await route.fulfill({json:{ok:true,statuses}});return true;
    }});
    await tab.goto('/admin/content#review-queue');await expect(tab.locator('main.admin-dashboard')).toHaveAttribute('data-studio-theme',theme);
    await tab.getByRole('row').filter({hasText:key}).first().getByRole('button',{name:'Edit',exact:true}).click();
   }
   const editor=page.getByRole('dialog'),other=second.getByRole('dialog');
   const field=editor.getByLabel('Fallback field Calendar Exact today body',{exact:true});
   const otherField=other.getByLabel('Fallback field Calendar Exact today body',{exact:true});
   const approved=`${fixture.body}\n\nSynthetic complete saved ending.`;
   await field.fill(approved);await editor.getByRole('button',{name:'Save draft',exact:true}).click();
   await expect.poll(async()=>(await call({method:'rows'})).find((row:any)=>row.id===fixture.id)?.sections.packageDraft.Body).toBe(approved);
   const competing=`${fixture.body}\n\nSynthetic unsaved second-tab ending.`;
   await otherField.fill(competing);await other.getByRole('button',{name:'Save draft',exact:true}).click();
   await expect(other.getByRole('alert')).toContainText(/changed/);await expect(otherField).toHaveValue(competing);
   await expect.poll(async()=>(await call({method:'rows'})).find((row:any)=>row.id===fixture.id)?.sections.packageDraft.Body).toBe(approved);
   await page.route('**/api/admin/generated-content',async route=>{
    const request=route.request();const body=request.method()==='PATCH'?request.postDataJSON():null;
    if(body?.ownerAction!=='approve-package-revision')return route.fallback();
    publications++;const result=await call({method:'PATCH',body,url:'/api/admin/generated-content'});
    expect(result.status).toBe(200);
    // The database committed; only the browser response is lost.
    await route.fulfill({status:503,json:{ok:false,error:'Synthetic lost response after commit.'}});
   });
   await editor.getByRole('button',{name:'Save & publish',exact:true}).click();
   await expect(editor.getByRole('button',{name:'Check publication status',exact:true})).toBeEnabled();
   await expect.poll(async()=>(await call({method:'rows'})).find((row:any)=>row.id===fixture.id)?.body).toBe(approved);
   await page.screenshot({path:`test-results/studio-publication-pending-${width}-${theme}.png`,fullPage:true});
   if (theme === 'dark') {
    // The published row leaves Review Queue. Recovery must remain accessible without reopening it.
    await page.reload();
    await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const recover=page.getByRole('button',{name:'Check publication status',exact:true});
    await expect(recover).toBeVisible();
    await page.screenshot({path:`test-results/studio-publication-reloaded-${width}-${theme}.png`,fullPage:true});
    await recover.click();await expect(recover).toHaveCount(0);
    await expect(page.getByRole('status').filter({hasText:'The reviewed revision is published.'})).toBeVisible();
   } else {
    const unsaved=approved+'\n\nSynthetic new local thought.';await field.fill(unsaved);
    await editor.getByRole('button',{name:'Check publication status',exact:true}).click();
    await expect(editor.getByRole('button',{name:'Check publication status',exact:true})).toHaveCount(0);
    await expect(field).toHaveValue(unsaved);
   }
   expect(publications).toBe(1);
   expect((await call({method:'rows'})).find((row:any)=>row.id===fixture.id).body).toBe(approved);
   expect(errors).toEqual([]);
   await page.screenshot({path:`test-results/studio-publication-recovery-${width}-${theme}.png`,fullPage:true});
  } finally {await second.close();child.kill();}
 });
}
