import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {reviewCandidate,reviewPayload} from '../helpers/horoscope-review-recovery-fixture.mts';

for(const [width,theme] of [[390,'light'],[1440,'dark']] as const){
 test(`Monthly saved prose review recovery, edit and reload ${width} ${theme}`,async({page})=>{
  test.setTimeout(90000);
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,HOROSCOPE_WRITER_FIXTURE:'1',ZODIAC_TEMPLATE_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const task=pending.get(m.id);if(task){pending.delete(m.id);m.error?task.reject(new Error(m.error)):task.resolve(m.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(t=>t.reject(error));});});
  const call=(m:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...m,id});});
  try{
   await ready;const original=await call({method:'completed-review-hold'});
   await page.setViewportSize({width,height:1000});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);},theme);
   let failRetrieval=true;
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
    if(url.pathname!=='/api/admin/horoscope-writing')return false;
    const body=route.request().postDataJSON();
    if(body.action==='recover-review'&&failRetrieval){await route.fulfill({status:503,json:{ok:false,error:'The saved review is temporarily unavailable.'}});return true;}
    const result=await call({method:'writing',body});await route.fulfill({status:result.status,json:result.payload});return true;
   }});
   const studio=page.getByRole('region',{name:'Horoscope editions'});
   const open=async()=>{await page.goto('/admin/content#horoscopes');await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/^Synthetic October overview/}).click();};
   await open();
   const review=studio.getByRole('region',{name:'Overview prose review'});
   const recover=studio.getByRole('button',{name:'Check saved Overview prose review',exact:true});
   await expect(recover).toBeEnabled();
   await expect(studio.getByRole('button',{name:'Generate overview',exact:true})).toBeDisabled();
   await recover.click();
   await expect(studio).toContainText('Your saved readings are kept.');
   expect((await call({method:'rows'})).find((r:any)=>r.id===original.id)).toEqual(original);
   failRetrieval=false;await call({method:'writer-state',body:{nextResult:reviewPayload()}});
   await recover.click();
   await expect(review.getByRole('heading',{name:'Overview needs a prose edit'})).toBeVisible();
   await expect(review.locator('blockquote')).toHaveText('The synthetic unsupported sentence belongs here.');
   await expect(recover).toHaveCount(0);
   let current=(await call({method:'rows'})).find((r:any)=>r.id===original.id);
   expect(current.status).toBe('DRAFT');expect(current.source_snapshot.horoscopeGeneration.candidateHolds.overview.candidate).toEqual(reviewCandidate);
   await page.reload();await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/^Synthetic October overview/}).click();
   await expect(review.locator('blockquote')).toHaveText('The synthetic unsupported sentence belongs here.');
   await studio.getByRole('button',{name:'Edit saved Overview draft',exact:true}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(reviewCandidate.body);
   const edited=reviewCandidate.body.replace(' The synthetic unsupported sentence belongs here.','');
   await studio.getByLabel('Complete reading').fill(edited);
   await studio.getByRole('button',{name:'Continue to publish',exact:true}).click();
   const publish=studio.getByRole('button',{name:'Publish edition',exact:true});
   await expect(publish).toBeDisabled();
   current=(await call({method:'rows'})).find((r:any)=>r.id===original.id);
   expect(current.status).toBe('DRAFT');expect(current.sections.horoscopeEdition.passages[0].body).toBe(edited);
   expect(current.source_snapshot.horoscopeGeneration.candidateHolds.overview).toBeUndefined();
   await page.reload();await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/^Monthly horoscopes/}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(edited);
   await studio.getByRole('button',{name:'Continue to publish',exact:true}).click();
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   await expect(publish).toBeEnabled();
   expect((await call({method:'writer-state'})).calls).toBe(0);expect((await call({method:'writer-state'})).reviewCalls).toBe(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/monthly-review-recovery-${width}-${theme}.png`,fullPage:true});
  }finally{child.kill();}
 });
}
