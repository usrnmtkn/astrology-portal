import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../../apps/web/src/content/horoscopeEditions.mjs';

for(const width of [390,1440])for(const theme of ['light','dark']){
 test(`Saved editions table opens and edits a published week ${width} ${theme}`,async({page})=>{
  test.setTimeout(120000);
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(value:any)=>void;reject:(reason:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{
   child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});
   child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});
  });
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try{
   await ready;
   let published:any;
   // Deliberately unordered; recently opening/saving an older week must not
   // move it ahead of a newer edition in the table.
   for(const date of ['2026-10-12','2026-09-14','2026-10-26','2026-09-21','2026-11-02','2026-09-28','2026-10-19','2026-10-05']){
    const packet=await call({method:'GET',url:`/api/admin/generated-content?horoscopeBrief=true&period=weekly&date=${date}&timeZone=America/New_York`});
    expect(packet.status).toBe(200);const {brief,signature}=packet.payload,edition=emptyHoroscopeEdition(brief.window);
    for(const passage of edition.passages){passage.headline=`Saved ${passage.sign}`;passage.body=`You can read the ${passage.sign} fixture opening.\n\nYour complete ${passage.sign} fixture ends here.`;}
    const result=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Weekly table fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature}},sourceSnapshot:{}}});
    expect(result.status).toBe(200);
    if(date==='2026-10-05'){
     const row=result.payload.rows[0],live=await call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'}});
     expect(live.status,JSON.stringify(live.payload)).toBe(200);published=live.payload.rows[0];
    }
   }
   let listMode='normal',releaseList=()=>{};
   await routeStudioInventoryApi(page,{call:async message=>{
    if(message.method==='GET'&&message.url?.includes('editionInventory=true')){
     if(listMode==='empty')return {status:200,payload:{ok:true,rows:[]}};
     if(listMode==='error')return {status:503,payload:{ok:false,error:'Synthetic edition list unavailable.'}};
     if(listMode==='loading')await new Promise<void>(resolve=>{releaseList=resolve;});
    }
    return call(message);
   },answer:async(route,url)=>{
    if(url.pathname!=='/api/admin/horoscope-writing')return false;
    expect(route.request().postDataJSON().action).toBe('validate-publication');
    const result=await call({method:'writing',body:route.request().postDataJSON()});
    await route.fulfill({status:result.status,json:result.payload});return true;
   }});
   await page.setViewportSize({width,height:1000});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
   await page.goto('/admin/content#horoscopes');
   const studio=page.getByRole('region',{name:'Horoscope editions'});
   await studio.getByText(/^Continue a saved edition/).click();
   const region=studio.getByRole('region',{name:'Saved horoscope editions',exact:true}),table=region.getByRole('table');
   await expect(table.getByRole('columnheader')).toHaveText(['Dates','Type','Status','Action']);
   await expect(table.locator('tbody tr')).toHaveCount(8);
   await expect(table.locator('tbody tr').first()).toContainText('November 2, 2026');
   await expect(table.locator('tbody tr').last()).toContainText('September 14, 2026');
   await expect(table.getByRole('row').filter({hasText:'October 5, 2026'})).toContainText('Published');
   await expect(region).toHaveAttribute('tabindex','0');
   await expect(region).toHaveCSS('overflow-y','auto');
   expect(await region.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
   if(width===390)expect(await region.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await region.scrollIntoViewIfNeeded();
   await region.evaluate(el=>{el.scrollTop=el.scrollHeight;});
   const headerTop=await table.locator('thead').evaluate(el=>el.getBoundingClientRect().top);
   const regionTop=await region.evaluate(el=>el.getBoundingClientRect().top);
   expect(Math.abs(headerTop-regionTop)).toBeLessThan(3);
   await region.evaluate(el=>{el.scrollTop=0;});
   await page.screenshot({path:`test-results/horoscope-edition-table-${width}-${theme}.png`,fullPage:true});
   await table.getByRole('button',{name:/October 5, 2026.*Review \/ Edit/}).click();
   await expect(studio.getByRole('heading',{name:'Review each reading',exact:true})).toBeVisible();
   await expect(studio.getByLabel('Complete reading',{exact:true})).toHaveValue(published.sections.horoscopeEdition.passages[0].body);
   expect((await call({method:'rows'})).find((row:any)=>row.id===published.id)).toEqual(published);
   const edited=published.sections.horoscopeEdition.passages[0].body+' Exact saved revision.';
   await studio.getByLabel('Complete reading',{exact:true}).fill(edited);
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Saved edition draft.');
   await page.reload();await studio.getByText(/^Continue a saved edition/).click();
   await table.getByRole('button',{name:/October 5, 2026.*Review \/ Edit/}).click();
   await expect(studio.getByLabel('Complete reading',{exact:true})).toHaveValue(edited);
   await studio.getByRole('button',{name:'4 · Publish',exact:true}).click();
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Published the complete edition.');
   const saved=(await call({method:'rows'})).find((row:any)=>row.id===published.id);
   expect(saved.status).toBe('LIVE');expect(saved.sections.horoscopeEdition.passages[0].body).toBe(edited);
   expect(saved.sections.horoscopeEdition.passages.slice(1)).toEqual(published.sections.horoscopeEdition.passages.slice(1));
   const reader=await call({method:'reader',body:{ids:[published.id]}});
   expect(reader.status).toBe(200);expect(reader.payload.rows[0].sections.horoscopeEdition).toEqual(saved.sections.horoscopeEdition);
   expect((await call({method:'writer-state'})).calls).toBe(0);
   await page.reload();await studio.getByText(/^Continue a saved edition/).click();
   await expect(table.locator('tbody tr').first()).toContainText('November 2, 2026');
   listMode='error';await studio.getByRole('button',{name:'Refresh editions',exact:true}).click();
   await expect(studio.getByRole('alert')).toContainText('Synthetic edition list unavailable.');
   listMode='loading';await studio.getByRole('button',{name:'Refresh editions',exact:true}).click();
   await expect(studio.getByText('Loading horoscope editions…',{exact:true})).toBeVisible();
   listMode='normal';releaseList();await expect(table.locator('tbody tr')).toHaveCount(8);
   listMode='empty';await studio.getByRole('button',{name:'Refresh editions',exact:true}).click();
   await expect(studio.getByText('No saved editions yet. Start with the dates above.',{exact:true})).toBeVisible();
   await expect(table).toHaveCount(0);
  }finally{child.kill();}
 });
}
