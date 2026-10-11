import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {createSeasonalPublicationFixture,seasonalClaimBodies,createMonthlyAspectPublicationFixture,monthlyAspectBody,createWeeklyAspectPublicationFixture,weeklyAspectBodies,weeklyRulerBodies} from '../helpers/horoscope-publication-fixture.mts';
import {horoscopeEditionBody} from '../../apps/web/src/content/horoscopeEditions.mjs';

for(const [width,theme] of [[390,'light'],[1440,'dark']] as const){
 test(`Saved seasonal, monthly and weekly claims publish without rewriting ${width} ${theme}`,async({page})=>{
  test.setTimeout(120000);
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,ZODIAC_TEMPLATE_FIXTURE:'1',HOROSCOPE_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='',failPreflight=false;const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',v=>stderr+=v);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const task=pending.get(m.id);if(task){pending.delete(m.id);m.error?task.reject(new Error(m.error)):task.resolve(m.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(t=>t.reject(error));});});
  const call=(m:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...m,id});});
  try{
   await ready;const created=await createSeasonalPublicationFixture(call);expect(created.status).toBe(200);const row=created.payload.rows[0];
   await page.setViewportSize({width,height:1000});await page.clock.setFixedTime(new Date('2026-09-30T16:00:00Z'));
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);},theme);
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
    if(url.pathname==='/api/admin/horoscope-writing'){
     const body=route.request().postDataJSON();expect(body.action).toBe('validate-publication');
     if(failPreflight){failPreflight=false;await route.fulfill({status:503,json:{ok:false,error:'Synthetic publication check unavailable.'}});return true;}
     const r=await call({method:'writing',body});await route.fulfill({status:r.status,json:r.payload});return true;
    }
    if(url.pathname==='/api/content-reader'){const r=await call({method:'reader',body:route.request().postDataJSON()});await route.fulfill({status:r.status,json:r.payload});return true;}return false;
   }});
   await page.goto('/admin/content#horoscopes');const studio=page.getByRole('region',{name:'Horoscope editions'});
   await studio.getByText(/^Continue a saved edition/).click();await studio.locator('.admin-horoscope-saved button').first().click();
   await studio.getByRole('button',{name:'4 · Publish',exact:true}).click();
   await expect(studio.getByRole('region',{name:'Cancer reading preview'})).toContainText(seasonalClaimBodies.cancer);
   await expect(studio.getByRole('button',{name:'Publish edition',exact:true})).toBeDisabled();
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Published the complete edition.');
   const saved=(await call({method:'rows'})).find((r:any)=>r.id===row.id);expect(saved.sections).toEqual(row.sections);expect(saved.source_snapshot).toEqual(row.source_snapshot);
   expect((await call({method:'writer-state'})).calls).toBe(0);
   await page.goto(`/#horoscopes?edition=${row.id}&period=seasonal&sign=cancer`);
   const reading=page.getByRole('article',{name:'Cancer horoscope'});await expect(reading).toContainText(seasonalClaimBodies.cancer);
   await page.reload();await expect(reading).toContainText(seasonalClaimBodies.cancer);
   await page.screenshot({path:`test-results/seasonal-publish-claims-${width}-${theme}.png`,fullPage:true});
   const monthly=await createMonthlyAspectPublicationFixture(call);expect(monthly.status).toBe(200);const month=monthly.payload.rows[0];
   await page.goto('/admin/content#horoscopes');
   await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/Synthetic monthly publication/}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(monthlyAspectBody);
   await studio.getByRole('button',{name:'4 · Publish',exact:true}).click();
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Published the complete edition.');
   const savedMonth=(await call({method:'rows'})).find((r:any)=>r.id===month.id);
   expect(savedMonth.sections).toEqual(month.sections);expect(savedMonth.source_snapshot).toEqual(month.source_snapshot);
   expect((await call({method:'writer-state'})).calls).toBe(0);
   await page.goto(`/#horoscopes?edition=${month.id}&period=monthly`);
   const overview=page.getByRole('article',{name:'Monthly overview',exact:true});await expect(overview).toContainText(monthlyAspectBody);
   await page.reload();await expect(overview).toContainText('You can read the complete monthly fixture opening.');await expect(overview).toContainText('Your complete monthly fixture ends here.');
   const weekly=await createWeeklyAspectPublicationFixture(call);expect(weekly.status).toBe(200);const week=weekly.payload.rows[0];
   await page.clock.setFixedTime(new Date('2026-10-10T16:00:00Z'));
   await page.goto('/admin/content#horoscopes');
   await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/Synthetic weekly publication/}).click();
   await studio.getByRole('button',{name:'4 · Publish',exact:true}).click();
   await expect(studio).toContainText('12/12 readings ready');
   for(const [sign,body] of Object.entries(weeklyAspectBodies))await expect(studio.getByRole('region',{name:`${sign[0].toUpperCase()+sign.slice(1)} reading preview`})).toContainText(body);
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Published the complete edition.');
   const savedWeek=(await call({method:'rows'})).find((r:any)=>r.id===week.id);
   expect(savedWeek.sections).toEqual(week.sections);expect(savedWeek.source_snapshot).toEqual(week.source_snapshot);
   expect((await call({method:'writer-state'})).calls).toBe(0);
   for(const [sign,body] of Object.entries(weeklyAspectBodies)){
    await page.goto(`/#horoscopes?edition=${week.id}&period=weekly&sign=${sign}`);
    const passage=page.getByRole('article',{name:`${sign[0].toUpperCase()+sign.slice(1)} horoscope`});
    await expect(passage).toContainText(body);await page.reload();await expect(passage).toContainText(body);
   }
   await page.screenshot({path:`test-results/weekly-publish-claims-${width}-${theme}.png`,fullPage:true});
   const rulers=await createWeeklyAspectPublicationFixture(call,true);expect(rulers.status).toBe(200);let ruler=rulers.payload.rows[0];
   const invalid=structuredClone(ruler.sections);
   invalid.horoscopeEdition.passages.find((p:any)=>p.sign==='aries').body='You can review Mars squares Saturn.';
   invalid.horoscopeEdition.passages.find((p:any)=>p.sign==='leo').body='You can review Saturn in your first house.';
   const changed=await call({method:'PATCH',body:{id:ruler.id,expectedUpdatedAt:ruler.updated_at,sections:invalid,body:horoscopeEditionBody(invalid.horoscopeEdition)}});expect(changed.status).toBe(200);ruler=changed.payload.rows[0];
   await page.goto(`/admin/content#horoscopes?edition=${ruler.id}`);
   await studio.getByRole('button',{name:'4 · Publish',exact:true}).click();
   const checks=studio.getByRole('region',{name:'Publication checks'}),approval=studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.');
   await expect(checks).toContainText('Aries:');await expect(checks).toContainText('Leo:');
   await expect(approval).toBeDisabled();await expect(studio.getByText('Ready to publish the complete edition.',{exact:true})).toHaveCount(0);
   await page.screenshot({path:`test-results/weekly-publication-issues-${width}-${theme}.png`,fullPage:true});
   for(const sign of ['aries','leo']){
    await checks.getByRole('button',{name:`Edit ${sign[0].toUpperCase()+sign.slice(1)} reading`,exact:true}).click();
    await studio.getByLabel('Complete reading').fill(weeklyRulerBodies[sign]);
    if(sign==='leo')failPreflight=true;
    await studio.getByRole('button',{name:'4 · Publish',exact:true}).click();
   }
   await expect(studio.getByRole('alert')).toContainText('Synthetic publication check unavailable.');await expect(approval).toBeDisabled();
   await studio.getByRole('button',{name:'Check publication again',exact:true}).click();
   await expect(checks).toHaveCount(0);await expect(approval).toBeEnabled();await approval.check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Published the complete edition.');
   const publishedRuler=(await call({method:'rows'})).find((r:any)=>r.id===ruler.id);
   expect(publishedRuler.sections).toEqual(rulers.payload.rows[0].sections);
   expect((await call({method:'writer-state'})).calls).toBe(0);
  }finally{child.kill();}
 });
}
