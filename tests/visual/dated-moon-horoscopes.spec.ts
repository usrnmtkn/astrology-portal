import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {MOON_HOROSCOPE_SIGNS,moonHoroscopeHouse} from '../../src/shared/datedLunationHoroscopes.mjs';

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Paste, save, publish and revise dated Moon horoscopes ${width} ${theme}`,async({page})=>{
  const child=fork(path.resolve('tests/helpers/moon-horoscope-api.mts'),['--ipc'],{execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try{
    await ready;
    let failEvents=width===1440&&theme==='light';
    const writes:any[]=[];
    await routeStudioInventoryApi(page,{call,onWrite:write=>writes.push(write),answer:async(route,url)=>{
      if(url.pathname!=='/api/admin/lunation-writing')return false;
      if(failEvents){failEvents=false;await route.fulfill({status:503,json:{ok:false,error:'Synthetic event lookup unavailable.'}});return true;}
      const result=await call({method:route.request().method(),url:url.pathname+url.search});
      await route.fulfill({status:result.status,json:result.payload});return true;
    }});
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
    await page.goto('/admin/content#horoscopes');
    if(width===390)await page.getByRole('button',{name:'Open Content Studio navigation',exact:true}).click();
    await page.getByRole('navigation',{name:'Content operations'}).getByRole('button',{name:'New & Full Moon horoscopes',exact:true}).click();
    const studio=page.getByRole('region',{name:'Dated Moon horoscopes',exact:true});
    if(width===1440&&theme==='light'){
      await expect(studio.getByRole('alert')).toHaveText('Synthetic event lookup unavailable.');
      await studio.getByRole('button',{name:'Reload events',exact:true}).click();
    }
    await studio.getByLabel('Month',{exact:true}).fill('2026-12');
    const events=await call({method:'GET',url:'/api/admin/lunation-writing?month=2026-12&timeZone=America%2FNew_York'});
    const event=events.payload.events.find((e:any)=>e.phase==='new-moon');
    await studio.getByLabel('Time zone',{exact:true}).fill('America/New_York');
    await expect(studio.getByLabel('Moon event',{exact:true})).toContainText('New Moon in Sagittarius');
    await studio.getByLabel('Moon event',{exact:true}).selectOption(event.id);
    await studio.getByRole('button',{name:'Open Moon horoscopes',exact:true}).click();
    await studio.getByLabel('All twelve horoscopes',{exact:true}).fill('Aries / Aries Rising\nOnly one reading.');
    await studio.getByRole('button',{name:'Match and review 12 signs',exact:true}).click();
    await expect(studio.getByRole('alert')).toBeVisible();expect(await call({method:'rows'})).toHaveLength(0);
    const source=MOON_HOROSCOPE_SIGNS.map(sign=>`${sign} / ${sign} Rising\nNew Moon in Your ${moonHoroscopeHouse(event.sign,sign)}th House\n${sign} complete synthetic opening.\n\n${sign} complete synthetic final sentence.`).join('\n\n');
    await studio.getByLabel('All twelve horoscopes',{exact:true}).fill(source);
    await studio.getByRole('button',{name:'Match and review 12 signs',exact:true}).click();
    await expect(studio.getByRole('heading',{level:3})).toHaveText('Aries / Aries Rising · House 9');
    await expect(studio.getByRole('group',{name:'Moon readings by sign'}).getByRole('button')).toHaveCount(12);
    await studio.getByRole('button',{name:'Save 12 horoscopes as draft',exact:true}).click();
    await expect(studio.getByRole('status')).toHaveText('All twelve readings saved as a draft.');
    let rows=await call({method:'rows'});expect(rows).toHaveLength(1);expect(rows[0].source_snapshot.editorialImport.originalSource).toBe(source);
    const beforeReplacement=structuredClone(rows),reviewedBody=rows[0].sections.articleHoroscopes.passages[0].body,writesBeforeReplacement=writes.length;
    const replacement=source.replaceAll('complete synthetic','replacement synthetic');
    const save=studio.getByRole('button',{name:'Save 12 horoscopes as draft',exact:true});
    await studio.getByText('Replace from a new paste',{exact:true}).click();
    const replacementField=studio.getByLabel('Replacement twelve horoscopes',{exact:true});
    await replacementField.fill(replacement);
    await expect(save).toBeDisabled();
    await expect(studio.getByText('Match and review the replacement paste, or clear it before saving.',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/dated-moon-pending-replacement-${width}-${theme}.png`,fullPage:true});
    page.once('dialog',dialog=>dialog.dismiss());
    await studio.getByRole('button',{name:'Choose another Moon',exact:true}).click();
    await expect(replacementField).toHaveValue(replacement);
    expect(await call({method:'rows'})).toEqual(beforeReplacement);
    expect(writes).toHaveLength(writesBeforeReplacement);
    await studio.getByRole('button',{name:'Clear replacement paste',exact:true}).click();
    await expect(replacementField).toHaveValue('');
    await expect(studio.getByLabel('Complete horoscope',{exact:true})).toHaveValue(reviewedBody);
    await expect(save).toBeDisabled();
    expect(await call({method:'rows'})).toEqual(beforeReplacement);
    expect(writes).toHaveLength(writesBeforeReplacement);
    await replacementField.fill(replacement);
    await studio.getByRole('button',{name:'Match and review replacement',exact:true}).click();
    await expect(studio.getByLabel('Complete horoscope',{exact:true})).toHaveValue(reviewedBody.replaceAll('complete synthetic','replacement synthetic'));
    await expect(save).toBeEnabled();await save.click();
    await expect(studio.getByRole('status')).toHaveText('All twelve readings saved as a draft.');
    rows=await call({method:'rows'});expect(rows[0].source_snapshot.editorialImport.originalSource).toBe(replacement);
    const replacementPassages=beforeReplacement[0].sections.articleHoroscopes.passages.map((p:any)=>({...p,body:p.body.replaceAll('complete synthetic','replacement synthetic')}));
    expect(rows[0].sections.articleHoroscopes.passages).toEqual(replacementPassages);
    expect(writes.at(-1).body.sections.articleHoroscopes.passages).toEqual(replacementPassages);
    expect(writes.at(-1).body.sourceSnapshot.editorialImport.originalSource).toBe(replacement);
    if(width===1440&&theme==='light'){
      const changed=await call({method:'PATCH',body:{id:rows[0].id,expectedUpdatedAt:rows[0].updated_at,reviewerNotes:'Synthetic concurrent metadata change.'}});expect(changed.status).toBe(200);
      await studio.getByLabel('Complete horoscope',{exact:true}).fill('An unsaved local reading must survive a save conflict.');
      await studio.getByRole('button',{name:'Save 12 horoscopes as draft',exact:true}).click();
      await expect(studio.getByRole('alert')).toContainText('changed');
      await expect(studio.getByLabel('Complete horoscope',{exact:true})).toHaveValue('An unsaved local reading must survive a save conflict.');
      page.once('dialog',dialog=>dialog.accept());
      await studio.getByRole('button',{name:'Reload saved version',exact:true}).click();
      await expect(studio.getByLabel('Complete horoscope',{exact:true})).toHaveValue(rows[0].sections.articleHoroscopes.passages[0].body);
    }
    await page.reload();
    await expect(studio.getByRole('group',{name:'Moon readings by sign'}).getByRole('button')).toHaveCount(12);
    await studio.getByRole('group',{name:'Moon readings by sign'}).getByRole('button',{name:'Pisces',exact:true}).click();
    await expect(studio.getByLabel('Complete horoscope',{exact:true})).toHaveValue(rows[0].sections.articleHoroscopes.passages[11].body);
    await studio.getByRole('checkbox').check();await studio.getByRole('button',{name:'Publish Moon horoscopes',exact:true}).click();
    await expect(studio.getByRole('status')).toContainText('Published. These twelve readings');
    rows=await call({method:'rows'});const published=rows[0];expect(published.status).toBe('LIVE');
    const publicResult=await call({method:'reader',body:{keys:[published.content_key]}});expect(publicResult.payload.rows[0].sections.articleHoroscopes.passages).toEqual(published.sections.articleHoroscopes.passages);expect(JSON.stringify(publicResult.payload)).not.toContain('originalSource');
    await page.screenshot({path:`test-results/dated-moon-horoscopes-${width}-${theme}.png`,fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const exact=published.sections.articleHoroscopes.passages[11].body+'\n\nA complete revision ending.';
    await studio.getByLabel('Complete horoscope',{exact:true}).fill(exact);await studio.getByRole('button',{name:'Save 12 horoscopes as draft',exact:true}).click();
    await expect(studio.getByRole('status')).toHaveText('All twelve readings saved as a draft.');
    rows=await call({method:'rows'});expect(rows.find((row:any)=>row.id===published.id).body).toBe(published.body);expect(rows.find((row:any)=>row.mode==='studio-draft').sections.articleHoroscopes.passages[11].body).toBe(exact);
    await studio.getByRole('checkbox').check();await studio.getByRole('button',{name:'Publish Moon horoscopes',exact:true}).click();
    await expect(studio.getByRole('status')).toContainText('Published. These twelve readings');
    rows=await call({method:'rows'});expect(rows.find((row:any)=>row.id===published.id).sections.articleHoroscopes.passages[11].body).toBe(exact);
    if(width===1440&&theme==='light'){
      await studio.getByLabel('Complete horoscope',{exact:true}).fill(exact+'\n\nAnother private revision.');
      await studio.getByRole('button',{name:'Save 12 horoscopes as draft',exact:true}).click();
      await expect(studio.getByRole('status')).toHaveText('All twelve readings saved as a draft.');
      page.once('dialog',dialog=>dialog.accept());await studio.getByRole('button',{name:'Archive draft revision',exact:true}).click();
      await expect(studio.getByRole('status')).toHaveText('Draft revision archived. The current published readings are open.');
      await studio.getByRole('group',{name:'Moon readings by sign'}).getByRole('button',{name:'Pisces',exact:true}).click();
      await expect(studio.getByLabel('Complete horoscope',{exact:true})).toHaveValue(exact);
    }
  }finally{child.kill();}
});
