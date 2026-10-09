import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
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
