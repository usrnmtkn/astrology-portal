import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {studioApiStore} from '../helpers/studio-api-store';
import {lunationPublicationDraft,lunationKey,lunationRevision} from '../helpers/lunation-publication.mjs';
import {lunarSigns} from '../../apps/admin/src/lunarCalendarContent';
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
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{if(url.pathname==='/api/admin/lunation-writing'){await route.fulfill({json:url.searchParams.has('month')?{ok:true,events:[]}:{ok:true,rows:[]}});return true;}if(url.pathname!=='/api/admin/calendar-lunation-writing')return false;const result=await call({method:'lunar-writing',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;}});
   // Exercise cold lazy loading before interacting with the nested tab strip.
   await page.route('**/DatedLunationWritingStudio-*.js',async route=>{await new Promise(resolve=>setTimeout(resolve,500));await route.continue();});
   await page.goto('/admin/content#ai-writing');
   const style=(element:any)=>element.evaluate((el:HTMLElement)=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];});
   const analogue=page.getByRole('heading',{name:'Weekly instructions',exact:true});await expect(analogue).toBeVisible();const headingStyle=await style(analogue);
   if(width<720)await page.getByRole('button',{name:'Open Content Studio navigation',exact:true}).click();
   await page.getByRole('button',{name:'Calendar Write-ups',exact:true}).click();
   const tab=page.getByRole('tab',{name:'New & Full Moons & Eclipses',exact:true});await expect(tab).toBeVisible();await tab.click();
   // The tab strip appears before the default lazy workspace. Wait until its
   // layout has loaded so it cannot move under the pointer during the click.
   await expect(page.getByRole('heading',{name:'Dated articles & eclipses',exact:true})).toBeVisible();
   const reusableTab=page.getByRole('tab',{name:'Reusable sign readings',exact:true});
   await reusableTab.click();
   await expect(reusableTab).toHaveAttribute('aria-selected','true');
   await expect(page).toHaveURL(/writing=reusable/);
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

for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Saved lunar readings remain editable in the consolidated section ${width} ${theme}`,async({page})=>{
  const original=lunationPublicationDraft();
  const records=lunarSigns.flatMap(sign=>['new-moon','full-moon'].map(phase=>{
   const key=`authored/sky-lunation-macro/${phase}/${sign}`;
   const row=structuredClone(original);row.id=`saved-${phase}-${sign}`;row.content_key=key;
   row.headline=`${phase} ${sign}`;row.body=`Synthetic ${phase} ${sign} opening.\n\nSynthetic ${phase} ${sign} final sentence.`;
   for(const record of Object.values(row.sections)){record.contentKey=key;record.body=row.body;record.headline=row.headline;}
   return row;
  }));
  records[0].status='LIVE';records[0].lane='serving';
  const eclipse=structuredClone(original);eclipse.id='saved-eclipse';eclipse.content_key='authored/lunar-journal/eclipse/lunar/20260101t000000z';eclipse.headline='Synthetic lunar eclipse';eclipse.body='Synthetic eclipse opening.\n\nSynthetic eclipse final sentence.';
  for(const record of Object.values(eclipse.sections)){record.contentKey=eclipse.content_key;record.body=eclipse.body;record.headline=eclipse.headline;}
  const unrelated=structuredClone(eclipse);unrelated.id='unrelated-season';unrelated.content_key='authored/lunar-journal/season/libra/20260101t000000z';
  const initial=[...records,eclipse,unrelated];const store=await studioApiStore(initial);const errors:string[]=[];let writes=0;
  try{
   await page.context().route('**/*',route=>new URL(route.request().url()).pathname.startsWith('/api/')||!['GET','HEAD'].includes(route.request().method())?route.abort():route.continue());
   page.on('pageerror',error=>errors.push(error.message));await page.setViewportSize({width,height:1000});
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
   await routeStudioInventoryApi(page,{call:store.call,onWrite:()=>writes++,answer:async(route,url)=>{
    if(url.pathname!=='/api/admin/lunation-writing')return false;
    await route.fulfill({json:url.searchParams.has('month')?{ok:true,events:[]}:{ok:true,rows:[]}});return true;
   }});
   await page.goto('/admin/content#calendar-writeups?view=lunation-writing&writing=dated');
   const libraryTab=page.getByRole('tab',{name:'Saved write-ups',exact:true});
   const style=(element:any)=>element.evaluate((el:HTMLElement)=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];});
   expect(await style(libraryTab)).toEqual(await style(page.getByRole('tab',{name:'Reusable sign readings',exact:true})));
   const headingStyle=await style(page.getByRole('heading',{name:'Dated articles & eclipses',exact:true}));
   await libraryTab.click();await expect(libraryTab).toHaveAttribute('aria-selected','true');
   await expect(page).toHaveURL(/writing=library/);
   const library=page.getByRole('region',{name:'Saved lunation write-ups',exact:true});
   const list=library.getByRole('complementary',{name:'Lunar passages',exact:true});
   await expect(list.getByText('24 passages',{exact:true})).toBeVisible();
   await list.getByRole('button',{name:'Show more passages',exact:true}).click();
   await expect(list.getByRole('article')).toHaveCount(24);
   expect(writes).toBe(0);
   expect(await store.call({method:'rows'})).toEqual(initial);
   await expect(library.getByRole('button',{name:'Add leftover write-up',exact:true})).toHaveCount(0);
   const detail=library.getByRole('region',{name:'Selected lunar passage',exact:true});
   expect(await style(detail.getByRole('heading',{level:2}))).toEqual(headingStyle);
   await expect(page.getByRole('heading',{name:'Calendar writing workspaces',exact:true})).toHaveClass('sr-only');
   expect(await page.locator('.admin-dashboard-header h1').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('[aria-label="Saved lunation write-ups"]')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
   await list.getByRole('button',{name:'Edit New Moon in Aquarius',exact:true}).click();
   const editor=page.getByRole('dialog',{name:'Generated content editor'});const field=editor.getByLabel('Full lunar passage',{exact:true});
   await expect(field).toHaveValue(records.find(row=>row.content_key===lunationKey)!.body);
   await field.fill(lunationRevision);await editor.getByRole('button',{name:'Save draft',exact:true}).click();
   await expect.poll(async()=>(await store.call({method:'rows'})).find((row:any)=>row.content_key===lunationKey)?.sections?.packageDraft?.body).toBe(lunationRevision);
   await expect(editor.getByRole('alert')).toHaveCount(0);await editor.getByRole('button',{name:'Close',exact:true}).click();
   await page.reload();await expect(libraryTab).toHaveAttribute('aria-selected','true');
   await library.getByRole('combobox',{name:'Moon sign',exact:true}).selectOption('aquarius');
   await expect(list.getByRole('article')).toHaveCount(2);
   await expect(library.locator('.admin-composition-preview-field')).toContainText('Synthetic revised lunar opening preserved in full.');
   await expect(library.locator('.admin-composition-preview-field')).toContainText('Synthetic revised lunar final sentence.');
   await list.getByRole('button',{name:'Edit New Moon in Aquarius',exact:true}).click();await expect(field).toHaveValue(lunationRevision);
   await editor.getByRole('button',{name:'Close',exact:true}).click();
   const search=library.getByRole('textbox',{name:'Search lunation write-ups',exact:true});await search.fill('no-matching-reading');
   await expect(library.getByText('No lunar passages match these filters.',{exact:true})).toBeVisible();
   await library.getByRole('button',{name:'Reset filters',exact:true}).click();
   await library.getByRole('combobox',{name:'Writing job',exact:true}).selectOption('Event readings');
   await expect(list.getByRole('article')).toHaveCount(1);await expect(list).toContainText('Eclipse · Lunar');await expect(list).not.toContainText('Season');
   await list.getByRole('button',{name:'Edit Eclipse · Lunar',exact:true}).click();await expect(field).toHaveValue(eclipse.body);
   await editor.getByRole('button',{name:'Close',exact:true}).click();
   await expect(editor).toHaveCount(0);
   await expect(list.getByRole('button',{name:'Edit Eclipse · Lunar',exact:true})).toBeFocused();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.evaluate(()=>window.scrollTo(0,0));await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
   await page.screenshot({path:`test-results/lunation-library-${width}-${theme}.png`,fullPage:true});
   const after=await store.call({method:'rows'});expect(after.filter((row:any)=>row.content_key!==lunationKey)).toEqual(initial.filter(row=>row.content_key!==lunationKey));
   expect(writes).toBe(1);expect(errors).toEqual([]);
  }finally{store.close();}
 });
}
