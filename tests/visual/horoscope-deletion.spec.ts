import {test,expect,type Page,type Locator} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {showSavedHoroscopeEditions} from '../helpers/horoscope-edition-navigation';
import {emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody} from '../../apps/web/src/content/horoscopeEditions.mjs';


async function confirmAction(page:Page,button:Locator,check:(message:string)=>void,accept=true){
 // A click can finish before its async dialog listener dismisses the confirm.
 // Wait for both before arming another confirmation or inspecting storage.
 const handled=page.waitForEvent('dialog').then(async dialog=>{
  try{check(dialog.message());}catch(error){await dialog.dismiss();throw error;}
  await(accept?dialog.accept():dialog.dismiss());
 });
 await Promise.all([handled,button.click()]);
}

async function fixture(page:Page){
 const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,ZODIAC_TEMPLATE_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
 let sequence=0,stderr='';const pending=new Map<number,any>();child.stderr?.on('data',value=>stderr+=value);
 const ready=new Promise<void>((resolve,reject)=>{
  child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});
  child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});
 });
 const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
 try{
  await ready;const rows:any[]=[];
  for(const [period,date,status]of [['daily','2026-10-28','ARCHIVED'],['weekly','2026-11-02','ARCHIVED'],['monthly','2026-11-02','DRAFT'],['seasonal','2026-11-02','ARCHIVED'],['weekly','2026-11-16','LIVE']]){
   const facts=await call({method:'GET',url:`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=${date}&timeZone=America%2FNew_York`});expect(facts.status).toBe(200);
   const {brief,signature}=facts.payload,edition=emptyHoroscopeEdition(brief.window);
   for(const p of edition.passages){p.headline='Synthetic '+p.sign;p.body='You can read this complete synthetic '+p.sign+' opening. Your complete final sentence remains exact.';}
   const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:period+' deletion fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{}}});expect(created.status).toBe(200);
   let row=created.payload.rows[0];
   if(status!=='DRAFT'){const changed=await call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,status}});expect(changed.status).toBe(200);row=changed.payload.rows[0];}
   rows.push(row);
  }
  const deletions:string[]=[];let failure=false,lostReply=false;
  await routeStudioInventoryApi(page,{call:async message=>{
   if(message.method==='DELETE'){
    deletions.push(message.url!);
    if(failure)return {status:503,payload:{ok:false,error:'Synthetic deletion unavailable.'}};
    const result=await call(message);
    if(lostReply){lostReply=false;return {status:200,payload:{ok:false,error:'Synthetic unreadable deletion acknowledgement.'}};}
    return result;
   }
   return call(message);
  }});
  await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
  const open=async()=>{await page.goto('/admin/content#horoscopes');const studio=page.getByRole('region',{name:'Horoscope editions'});await showSavedHoroscopeEditions(page,studio);return studio;};
  return {child,call,rows,deletions,open,setFailure:(value:boolean)=>failure=value,setLostReply:()=>lostReply=true};
 }catch(error){child.kill();throw error;}
}

for(const width of [390,1440])for(const theme of ['light','dark']){
 test(`Delete archived and draft horoscopes from list and details ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const f=await fixture(page);try{
   const studio=await f.open(),table=studio.getByRole('region',{name:'Saved horoscope editions'}).getByRole('table');
   await expect(table.locator('tbody tr')).toHaveCount(5);
   const daily=table.getByRole('row').filter({hasText:'October 28, 2026'});
   await confirmAction(page,daily.getByRole('button',{name:/^Delete Daily edition/}),message=>{expect(message).toContain('Daily');expect(message).toContain('all 12 saved readings');},false);
   expect(f.deletions).toHaveLength(0);expect((await f.call({method:'rows'})).some((r:any)=>r.id===f.rows[0].id)).toBe(true);
   const weekly=table.getByRole('row').filter({hasText:'November 2, 2026'}).filter({hasText:'Weekly'});
   await confirmAction(page,weekly.getByRole('button',{name:/^Delete Weekly edition/}),message=>{expect(message).toContain('November 2, 2026');expect(message).toContain('cannot be undone');});
   await expect(studio.getByRole('status')).toContainText('Deleted horoscope edition.');
   await expect(table.locator('tbody tr')).toHaveCount(4);
   expect(new URL(f.deletions[0],'http://localhost').searchParams.get('expectedUpdatedAt')).toBe(f.rows[1].updated_at);
   await page.reload();await showSavedHoroscopeEditions(page,studio);await expect(table.locator('tbody tr')).toHaveCount(4);
   const seasonal=table.getByRole('row').filter({hasText:'Seasonal'});
   await seasonal.getByRole('button',{name:/Review \/ Edit/}).click();
   await expect(studio.getByRole('button',{name:'Restore as draft',exact:true})).toBeVisible();
   await expect(studio.getByRole('button',{name:'Delete edition',exact:true})).toBeVisible();
   await confirmAction(page,studio.getByRole('button',{name:'Delete edition',exact:true}),message=>{expect(message).toContain('Seasonal');expect(message).toContain('all 13 saved readings');});
   await expect(studio.getByRole('status')).toContainText('Deleted horoscope edition.');
   await expect(page).not.toHaveURL(/edition=/);
   await showSavedHoroscopeEditions(page,studio);await expect(table.locator('tbody tr')).toHaveCount(3);
   const monthly=table.getByRole('row').filter({hasText:'Monthly'});await monthly.getByRole('button',{name:/Review \/ Edit/}).click();
   await studio.getByRole('button',{name:'3 · Review',exact:true}).click();
   const edited='A complete synthetic saved monthly owner edit. Its exact ending remains here.';
   await studio.getByLabel('Complete reading',{exact:true}).fill(edited);
   await expect(studio.getByRole('button',{name:'Delete edition',exact:true})).toBeDisabled();
   await studio.getByRole('button',{name:'1 · Dates',exact:true}).click();
   await showSavedHoroscopeEditions(page,studio);
   await expect(table.getByRole('row').filter({hasText:'Monthly'}).getByRole('button',{name:/^Delete/})).toBeDisabled();
   await expect(table.getByRole('row').filter({hasText:'Daily'}).getByRole('button',{name:/^Delete/})).toBeEnabled();
   await studio.getByRole('button',{name:'3 · Review',exact:true}).click();
   await expect(studio.getByLabel('Complete reading',{exact:true})).toHaveValue(edited);
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await confirmAction(page,studio.getByRole('button',{name:'Delete edition',exact:true}),message=>expect(message).toContain('the saved reading'));
   await expect(studio.getByRole('status')).toContainText('Deleted horoscope edition.');
   await showSavedHoroscopeEditions(page,studio);await expect(table.locator('tbody tr')).toHaveCount(2);
   const published=table.getByRole('row').filter({hasText:'Published'});
   await expect(published.getByRole('button',{name:/^Delete/})).toHaveCount(0);
   await published.getByRole('button',{name:/Review \/ Edit/}).click();
   await expect(studio.getByRole('button',{name:'Delete edition',exact:true})).toHaveCount(0);
   await expect(studio.getByRole('button',{name:'Archive edition',exact:true})).toBeVisible();
   await studio.getByLabel('Complete reading',{exact:true}).fill('A complete synthetic private revision opening. Its exact private ending belongs here.');
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('button',{name:'Delete draft revision',exact:true})).toBeVisible();
   await confirmAction(page,studio.getByRole('button',{name:'Delete draft revision',exact:true}),message=>expect(message).toContain('Weekly draft revision'));
   await expect(studio.getByRole('status')).toContainText('Deleted horoscope edition.');
   const rows=await f.call({method:'rows'});
   for(const original of [f.rows[0],f.rows[4]])expect(rows.find((row:any)=>row.id===original.id)).toEqual(original);
   expect(f.deletions).toHaveLength(4);
   const reader=await f.call({method:'reader',body:{ids:[f.rows[4].id]}});expect(reader.payload.rows[0].body).toBe(f.rows[4].body);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:test.info().outputPath('horoscope-delete-controls.png'),fullPage:true});
  }finally{f.child.kill();}
 });
}

test('Horoscope deletion preserves conflicts and confirms a lost reply without redispatch',async({page})=>{
 const f=await fixture(page);try{
  const studio=await f.open(),table=studio.getByRole('region',{name:'Saved horoscope editions'}).getByRole('table');
  const row=f.rows[0],changed=await f.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,summary:'Exact newer owner metadata.'}});expect(changed.status).toBe(200);
  const daily=()=>table.getByRole('row').filter({hasText:'October 28, 2026'}).getByRole('button',{name:/^Delete/});
  await confirmAction(page,daily(),message=>expect(message).toContain('Daily edition'));
  await expect(studio.getByRole('alert')).toContainText('changed after it was selected');
  expect(f.deletions).toHaveLength(1);expect((await f.call({method:'rows'})).find((r:any)=>r.id===row.id)).toEqual(changed.payload.rows[0]);
  await studio.getByRole('button',{name:'Refresh editions',exact:true}).click();
  f.setFailure(true);await confirmAction(page,daily(),message=>expect(message).toContain('Daily edition'));
  await expect(studio.getByRole('alert')).toContainText('Synthetic deletion unavailable.');
  expect(f.deletions).toHaveLength(2);await expect(table.locator('tbody tr')).toHaveCount(5);
  f.setFailure(false);f.setLostReply();await confirmAction(page,daily(),message=>expect(message).toContain('Daily edition'));
  await expect(studio.getByRole('status')).toContainText('Deleted horoscope edition.');
  expect(f.deletions).toHaveLength(3);await expect(table.locator('tbody tr')).toHaveCount(4);
  await page.reload();await showSavedHoroscopeEditions(page,studio);await expect(table.locator('tbody tr')).toHaveCount(4);
 }finally{f.child.kill();}
});
