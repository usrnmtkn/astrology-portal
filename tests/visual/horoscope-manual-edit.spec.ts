import {showSavedHoroscopeEditions} from '../helpers/horoscope-edition-navigation';
import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {createMonthlyAspectPublicationFixture,monthlyManualBody} from '../helpers/horoscope-publication-fixture.mts';
import {horoscopeEditionBody} from '../../apps/web/src/content/horoscopeEditions.mjs';

test.use({timezoneId:'America/New_York'});
for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`External Monthly rewrite saves, reconciles conflicts and publishes unchanged ${width} ${theme}`,async({page})=>{
  test.setTimeout(90000);
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='',loseResponse=false;const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',v=>stderr+=v);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.result);}});child.on('exit',code=>{const e=new Error(`Fixture exited ${code}: ${stderr}`);reject(e);pending.forEach(p=>p.reject(e));});});
  const call=(m:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...m,id});});
  try{
   await ready;const created=await createMonthlyAspectPublicationFixture(call);expect(created.status).toBe(200);
   const id=created.payload.rows[0].id;
   const current=async()=>(await call({method:'rows'})).find((r:any)=>r.id===id);
   const change=async(body:any)=>{const row=await current();const result=await call({method:'PATCH',body:{id,expectedUpdatedAt:row.updated_at,...body}});expect(result.status).toBe(200);return result.payload.rows[0];};
   const changeReading=async(body:string)=>{const row=await current();const edition=structuredClone(row.sections.horoscopeEdition);edition.passages[0].body=body;return change({sections:{horoscopeEdition:edition},body:horoscopeEditionBody(edition)});};
   await page.setViewportSize({width,height:1000});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);},theme);
   await routeStudioInventoryApi(page,{call:async m=>{
    const result=await call(m);
    if(loseResponse&&m.method==='PATCH'){loseResponse=false;expect(result.status).toBe(200);return {status:503,payload:{ok:false,error:'Synthetic lost save response'}};}
    return result;
   },answer:async(route,url)=>{
    const method=url.pathname==='/api/admin/horoscope-writing'?'writing':url.pathname==='/api/content-reader'?'reader':null;
    if(!method)return false;const result=await call({method,body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;
   }});
   const studio=page.getByRole('region',{name:'Horoscope editions'});
   const open=async()=>{await page.goto('/admin/content#horoscopes');await showSavedHoroscopeEditions(page,studio);await studio.getByRole('button',{name:/^(Synthetic monthly publication|Monthly horoscopes)/}).click();};
   await open();const reading=studio.getByLabel('Complete reading',{exact:true});
   await reading.fill(monthlyManualBody);
   await change({reviewerNotes:'Synthetic metadata update while editor is open.'});
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Loaded the latest saved version and kept your selected edits');
   await expect(reading).toHaveValue(monthlyManualBody);
   expect((await current()).sections.horoscopeEdition.passages[0].body).not.toBe(monthlyManualBody);
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Saved edition draft.');
   expect((await current()).sections.horoscopeEdition.passages[0].body).toBe(monthlyManualBody);
   // A committed save with a lost response is confirmed by a read, never replayed.
   const extra=monthlyManualBody+'\n\nYour additional external sentence is kept.';
   await reading.fill(extra);loseResponse=true;
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Your draft is saved.');
   await expect(reading).toHaveValue(extra);await expect(studio.getByRole('button',{name:'Save edition draft',exact:true})).toBeDisabled();
   // Real competing edits require an explicit choice with complete versions visible.
   const remote=extra+'\n\nYour other editor saved this ending.';
   await reading.fill(monthlyManualBody);await changeReading(remote);
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   const comparison=studio.getByRole('group',{name:'Compare saved changes'});
   await expect(comparison.getByLabel('Your unsaved version')).toHaveValue(monthlyManualBody);
   await expect(comparison.getByLabel('Latest saved version')).toHaveValue(remote);
   await expect(reading).toBeDisabled();expect((await current()).sections.horoscopeEdition.passages[0].body).toBe(remote);
   await page.screenshot({path:`test-results/monthly-manual-conflict-${width}-${theme}.png`,fullPage:true});
   await comparison.getByRole('button',{name:'Keep my edits',exact:true}).click();
   // Another update after choosing must still be detected by exact version check.
   await change({reviewerNotes:'Second version race.'});
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Loaded the latest saved version');
   expect((await current()).sections.horoscopeEdition.passages[0].body).toBe(remote);
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Saved edition draft.');
   // Choosing the remote body preserves an independently edited local headline.
   await reading.fill(extra);await studio.getByLabel('Reading headline',{exact:true}).fill('External monthly headline');await changeReading(remote);
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await comparison.getByRole('button',{name:'Use saved changes',exact:true}).click();
   await expect(reading).toHaveValue(remote);await expect(studio.getByLabel('Reading headline',{exact:true})).toHaveValue('External monthly headline');
   await reading.fill(monthlyManualBody);await studio.getByRole('button',{name:'Continue to publish',exact:true}).click();
   await expect(studio.getByRole('button',{name:'Publish edition',exact:true})).toBeDisabled();
   await page.reload();await showSavedHoroscopeEditions(page,studio);await studio.getByRole('button',{name:/^(Synthetic monthly publication|Monthly horoscopes)/}).click();
   await expect(reading).toHaveValue(monthlyManualBody);await expect(studio.getByLabel('Reading headline',{exact:true})).toHaveValue('External monthly headline');
   await studio.getByRole('button',{name:'Continue to publish',exact:true}).click();
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   const link=studio.getByRole('link',{name:'Read published edition',exact:true});await expect(link).toBeVisible();
   const row=await current();expect(row.status).toBe('LIVE');expect(row.sections.horoscopeEdition.passages[0].body).toBe(monthlyManualBody);
   expect((await call({method:'writer-state'})).calls).toBe(0);
   const readerHref=(await link.getAttribute('href'))!;
   await page.goto(readerHref);
   const overview=page.getByRole('article',{name:'Monthly overview',exact:true});
   await expect(overview).toContainText('You can read the external monthly fixture opening.');await expect(overview).toContainText('Your external monthly fixture ends here.');
   await page.reload();await expect(overview).toContainText('Your external monthly fixture ends here.');
   // Editing a live edition creates a separate, recoverable private revision.
   await page.goto(`/admin/content#horoscopes?edition=${id}`);
   await studio.getByRole('button',{name:'3 · Review',exact:true}).click();
   const publishedBefore=structuredClone(await current());
   const revisedCopy=monthlyManualBody+'\n\nComplete revised monthly ending.';
   await reading.fill(revisedCopy);loseResponse=true;
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Your draft is saved.');
   expect(await current()).toEqual(publishedBefore);
   let revision=(await call({method:'rows'})).find((r:any)=>r.event_type==='horoscope-edition-revision');
   expect(revision.id).not.toBe(id);expect(revision.status).toBe('DRAFT');
   await expect(page).toHaveURL(new RegExp(`edition=${revision.id}$`));
   await page.reload();await expect(reading).toHaveValue(revisedCopy);
   await studio.getByRole('button',{name:'Archive draft revision',exact:true}).click();
   await expect(studio.getByText('This edition is archived. Its saved readings are preserved.')).toBeVisible();
   expect(await current()).toEqual(publishedBefore);
   await studio.getByRole('button',{name:'Restore as draft',exact:true}).click();
   await expect(reading).toHaveValue(revisedCopy);
   const revisionUrl=page.url();
   // Use the actual reader route, not only the private source response.
   await page.goto(readerHref);
   await expect(overview).toContainText('Your external monthly fixture ends here.');
   await expect(overview).not.toContainText('Complete revised monthly ending.');
   await page.goto(revisionUrl);await expect(reading).toHaveValue(revisedCopy);
   await studio.getByRole('button',{name:'Continue to publish',exact:true}).click();
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   loseResponse=true;
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Published the complete edition.');
   expect((await current()).id).toBe(id);expect((await current()).body).toContain('Complete revised monthly ending.');
   revision=(await call({method:'rows'})).find((r:any)=>r.id===revision.id);expect(revision.status).toBe('ARCHIVED');
   await expect(page).toHaveURL(new RegExp(`edition=${id}$`));
   expect((await call({method:'writer-state'})).calls).toBe(0);
   await page.goto((await link.getAttribute('href'))!);
   await expect(overview).toContainText('You can read the external monthly fixture opening.');
   await expect(overview).toContainText('Complete revised monthly ending.');
   await page.reload();await expect(overview).toContainText('Complete revised monthly ending.');
  }finally{await page.unrouteAll({behavior:'wait'});child.kill();}
 });
}
