import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Lunar writing workspace ${width} ${theme}`,async({page})=>{
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,LUNAR_WRITER_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,any>();
  child.stderr?.on('data',data=>stderr+=data);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{reject(new Error(`Fixture exited ${code}: ${stderr}`));pending.forEach(p=>p.reject(new Error('Fixture exited')));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try{
   await ready;const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
   await page.setViewportSize({width,height:1000});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{if(url.pathname!=='/api/admin/calendar-lunation-writing')return false;const result=await call({method:'lunar-writing',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;}});
   await page.goto('/admin/content#ai-writing');
   const style=(element:any)=>element.evaluate((el:HTMLElement)=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];});
   const analogue=page.getByRole('heading',{name:'Weekly instructions',exact:true});await expect(analogue).toBeVisible();const headingStyle=await style(analogue);
   if(width<720)await page.getByRole('button',{name:'Open Content Studio navigation',exact:true}).click();
   await page.getByRole('button',{name:'Calendar Write-ups',exact:true}).click();
   const tab=page.getByRole('tab',{name:'New & Full Moons & Eclipses',exact:true});await expect(tab).toBeVisible();await tab.click();
   const editor=page.getByRole('region',{name:'New and Full Moon writing'});
   await expect(editor.getByRole('heading',{name:'New Moon in Aries',level:2})).toBeVisible();
   expect(await style(editor.getByRole('heading',{level:2}))).toEqual(headingStyle);
   await expect(editor.getByRole('tab')).toHaveText(['Writing guidance','Plan & evidence','Draft','Corrections']);
   await expect(editor.getByText('Content key:',{exact:false})).toContainText('authored/sky-lunation-macro/new-moon/aries');
   await editor.getByRole('tab',{name:'Draft',exact:true}).click();await expect(editor.getByText('No draft yet.',{exact:false})).toBeVisible();
   await page.evaluate(()=>window.scrollTo(0,0));await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
   await page.screenshot({path:`test-results/lunation-studio-empty-${width}-${theme}.png`,fullPage:true});
   await editor.getByRole('tab',{name:'Writing guidance',exact:true}).click();
   const voice=editor.getByRole('textbox',{name:'Voice and clarity',exact:true});await voice.fill('Synthetic saved lunar instructions.\n\nPreserve the second paragraph.');
   await editor.getByRole('button',{name:'Save writing guidance',exact:true}).click();await expect(editor.getByRole('status')).toHaveText('Writing guidance saved.');
   await page.reload();await expect(voice).toHaveValue('Synthetic saved lunar instructions.\n\nPreserve the second paragraph.');
   await editor.getByLabel('Sign',{exact:true}).selectOption('libra');await expect(editor.getByRole('heading',{name:'New Moon in Libra',exact:true})).toBeVisible();
   await editor.getByRole('tab',{name:'Plan & evidence',exact:true}).click();
   await editor.getByLabel('Event date',{exact:true}).fill('2026-10-10');
   for(const label of ['Central thought','Lunar phase context','Meaning of the sign','What the reader might recognize','Intention or reflection','Journal focus','What this reading must not assume','Broader meaning','Chosen example'])await editor.getByRole('textbox',{name:label,exact:true}).fill(`Synthetic ${label} direction.`);
   for(let i=1;i<=3;i++)await editor.getByLabel(`Alternative example ${i}`,{exact:true}).fill(`Fixture example ${i}`);
   await editor.getByRole('button',{name:'Save plan and draft',exact:true}).click();await expect(editor.getByRole('status')).toHaveText('Workspace saved.');
   await editor.getByRole('button',{name:'Prepare writing plan',exact:true}).click();await expect(editor.getByRole('heading',{name:'Plan ready for review',level:3})).toBeVisible();
   await expect(editor.getByLabel('Prepared facts and plan')).toHaveValue(/swiss-ephemeris/);
   await expect(editor.getByRole('button',{name:'Generate one draft',exact:true})).toBeDisabled();
   await editor.getByRole('tab',{name:'Draft',exact:true}).click();await editor.getByRole('textbox',{name:'Lunar draft body',exact:true}).fill('Synthetic beginning.\n\nSynthetic final sentence.');
   await editor.getByRole('textbox',{name:'Lunar journal question',exact:true}).fill('Synthetic journal question?');
   await editor.getByRole('button',{name:'Save plan and draft',exact:true}).click();await expect(editor.getByRole('status')).toHaveText('Workspace saved.');
   await page.reload();await expect(editor.getByRole('heading',{name:'New Moon in Libra',exact:true})).toBeVisible();
   await editor.getByRole('tab',{name:'Draft',exact:true}).click();await expect(editor.getByRole('textbox',{name:'Lunar draft body',exact:true})).toHaveValue('Synthetic beginning.\n\nSynthetic final sentence.');
   await page.evaluate(()=>window.scrollTo(0,0));await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
   await page.screenshot({path:`test-results/lunation-studio-saved-${width}-${theme}.png`,fullPage:true});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const rows=await call({method:'rows'});const saved=rows.find((r:any)=>r.content_key==='studio-writing-profile/calendar/lunation/new-moon/libra');expect(saved.status).toBe('DRAFT');expect(saved.body).toBe('');
   const external=await call({method:'lunar-writing',body:{action:'save',phase:'new-moon',sign:'libra',expectedUpdatedAt:saved.updated_at,workspace:{...saved.sections.lunationWorkspace,body:'Synthetic another editor saved.'}}});expect(external.status).toBe(200);
   await editor.getByRole('textbox',{name:'Lunar draft body',exact:true}).fill('Synthetic unsaved edit.');await editor.getByRole('button',{name:'Save plan and draft',exact:true}).click();
   await expect(editor.getByRole('alert')).toContainText('changed');await expect(editor.getByRole('textbox',{name:'Lunar draft body',exact:true})).toHaveValue('Synthetic unsaved edit.');
   expect(errors).toEqual([]);
  }finally{child.kill();}
 });
}
