import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {HOROSCOPE_SIGNS,emptyHoroscopeEdition,horoscopeEditionKey,horoscopeEditionBody} from '../../apps/web/src/content/horoscopeEditions.mjs';

for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Twelve-sign edition editor to reader ${width} ${theme}`,async({page})=>{
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,ZODIAC_TEMPLATE_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  try{
   await ready;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:1000});
   await page.clock.setFixedTime(new Date('2026-09-24T16:00:00Z'));
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);},theme);
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{if(url.pathname==='/api/content-reader'){const result=await call({method:'reader',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;}return false;}});
   await page.goto('/admin/content#templates');
   await expect(page.getByRole('heading',{name:'Templates',exact:true})).toBeVisible();
   const titleStyle=await page.locator('h1').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];});
   await page.evaluate(()=>{location.hash='horoscopes';});
   await expect(page.getByRole('heading',{name:'Horoscopes',exact:true})).toBeVisible();
   expect(await page.locator('h1').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];})).toEqual(titleStyle);
   const studio=page.getByRole('region',{name:'Horoscope editions'});
   await expect(studio.getByText('No editions saved yet.')).toBeVisible();
   await studio.getByLabel('Reference date').fill('2026-09-24');
   await studio.getByRole('button',{name:'Prepare edition',exact:true}).click();
   await expect(studio.getByLabel('Complete reading')).toBeVisible();
   await expect(studio.getByText('0/12 readings complete',{exact:false})).toBeVisible();
   await studio.getByLabel('Writing outline',{exact:true}).fill('PRIVATE OUTLINE fixture');
   for(const sign of HOROSCOPE_SIGNS){
    await studio.getByLabel('Edition rising sign').selectOption(sign);
    await studio.getByLabel('Reading headline').fill(`Fixture ${sign} weekly headline`);
    await studio.getByLabel('Complete reading').fill(`Fixture ${sign} opening.\n\nFixture ${sign} complete ending.`);
   }
   await expect(studio.getByRole('button',{name:'Publish edition',exact:true})).toBeDisabled();
   await page.evaluate(()=>{location.hash='ai-writing';});
   await expect(page.getByRole('heading',{name:'AI Writing',exact:true})).toBeVisible();
   await page.evaluate(()=>{location.hash='horoscopes';});
   await expect(studio.getByLabel('Complete reading')).toHaveValue('Fixture pisces opening.\n\nFixture pisces complete ending.');
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toHaveText('Saved edition draft.');
   const draftRows=await call({method:'rows'});const draft=draftRows.find((row:any)=>row.content_key.startsWith('horoscope/'));
   await studio.getByLabel('Import horoscope draft').setInputFiles({name:'mixed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({edition:draft.sections.horoscopeEdition,instructions:'Unrecognized metadata'}))});
   await expect(studio.getByRole('alert')).toContainText('Review mixed documents');
   await expect(studio.getByLabel('Complete reading')).toHaveValue('Fixture pisces opening.\n\nFixture pisces complete ending.');
   const originalSource=JSON.stringify({schema:'horoscope-draft/v1',edition:draft.sections.horoscopeEdition,editorialNotes:'PRIVATE IMPORT NOTES'});
   await studio.getByLabel('Import horoscope draft').setInputFiles({name:'readings.json',mimeType:'application/json',buffer:Buffer.from(originalSource)});
   await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
   await expect(studio.getByRole('status')).toHaveText('Saved edition draft.');
   const imported=(await call({method:'rows'})).find((row:any)=>row.id===draft.id);
   expect(imported.source_snapshot.editorialImport.originalSource).toBe(originalSource);
   expect(imported.source_snapshot.editorialImport.sha256).toBe(createHash('sha256').update(originalSource).digest('hex'));
   await studio.getByText('Review all twelve readings',{exact:true}).click();
   await expect(studio.locator('h2')).toHaveText(HOROSCOPE_SIGNS.map(sign=>sign[0].toUpperCase()+sign.slice(1)));
   await expect(studio.getByRole('region',{name:'Pisces reading preview'})).toContainText('Fixture pisces complete ending.');
   expect((await call({method:'reader',body:{horoscope:{period:'weekly',at:'2026-09-24T16:00:00.000Z'}}})).payload.rows).toEqual([]);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:`test-results/horoscope-editor-${width}-${theme}.png`,fullPage:true});
   await studio.getByLabel('I have reviewed and approve the exact wording of all twelve saved readings.').check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   await expect(studio.getByRole('status')).toContainText('Published all twelve readings.');
   await page.goto('/#horoscopes?period=weekly&sign=aries');
   await expect(page.getByRole('heading',{name:'Horoscopes',exact:true})).toBeVisible();
   await expect(page.getByRole('article',{name:'Aries horoscope'})).toContainText('Fixture aries complete ending.');
   await expect(page.getByText('PRIVATE OUTLINE fixture')).toHaveCount(0);
   await expect(page.getByRole('heading',{name:'Fixture aries weekly headline'})).toBeVisible();
   await expect(page.locator('.horoscope-page :is(h1,h2,h3,h4,h5,h6)')).toHaveText(['Horoscopes','Fixture aries weekly headline']);
   expect(await page.locator('.horoscope-page h1').evaluate(el=>{const probe=document.createElement('h1');probe.className='learn-hero__title';el.parentElement!.append(probe);const actual=getComputedStyle(el),expected=getComputedStyle(probe);const same=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','margin','textTransform','textAlign'].every(key=>(actual as any)[key]===(expected as any)[key]);probe.remove();return same;})).toBe(true);
   expect(await page.locator('.horoscope-page h2').evaluate(el=>{const probe=document.createElement('h2');probe.style.cssText='font-family:var(--font-display);font-size:var(--type-h2-size);font-weight:var(--weight-regular);line-height:var(--leading-h2);letter-spacing:var(--tracking-title);margin:var(--space-4) 0';el.parentElement!.append(probe);const actual=getComputedStyle(el),expected=getComputedStyle(probe);const same=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','margin','textTransform','textAlign'].every(key=>(actual as any)[key]===(expected as any)[key]);probe.remove();return same;})).toBe(true);
   for(const sign of HOROSCOPE_SIGNS){await page.getByLabel('Rising sign',{exact:true}).selectOption(sign);await expect(page.getByRole('article')).toContainText(`Fixture ${sign} opening.`);await expect(page.getByRole('article')).toContainText(`Fixture ${sign} complete ending.`);}
   await page.reload();await expect(page.getByLabel('Rising sign',{exact:true})).toHaveValue('pisces');
   await page.getByRole('button',{name:'Today',exact:true}).click();
   await expect(page.getByRole('status')).toContainText('daily horoscopes haven’t been published');
   await page.goBack();await expect(page.getByRole('button',{name:'This week',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('article')).toContainText('Fixture pisces complete ending.');
   await expect(page.getByText('Loading your horoscope…')).toHaveCount(0);
   await page.mouse.move(0,0);
   expect(await page.locator('.horoscope-prose').evaluate(el=>getComputedStyle(el).whiteSpace)).toBe('pre-wrap');
   expect(await page.locator('.horoscope-prose p').evaluate(el=>{const style=getComputedStyle(el),probe=document.createElement('p');probe.style.cssText='font-family:var(--font-body);font-size:var(--text-body);font-weight:var(--weight-regular);line-height:var(--leading-body);letter-spacing:var(--tracking-body)';el.parentElement!.append(probe);const expected=getComputedStyle(probe);const same=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing'].every(key=>(style as any)[key]===(expected as any)[key]);probe.remove();return same;})).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const bounds=await page.locator('.horoscope-header').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
   await expect(page.getByRole('article')).toContainText('Fixture pisces complete ending.');
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   await page.screenshot({path:`test-results/horoscope-reader-${width}-${theme}.png`,fullPage:false,animations:'disabled'});
   await expect(page.getByRole('article')).toContainText('Fixture pisces complete ending.');
   const live=(await call({method:'rows'})).find((row:any)=>row.id===draft.id);
   const changed=await call({method:'PATCH',body:{id:live.id,expectedUpdatedAt:live.updated_at,status:'DRAFT'}});expect(changed.status).toBe(200);
   await page.reload();await expect(page.getByRole('status')).toContainText('weekly horoscopes haven’t been published');
   await expect(page.locator('.horoscope-page :is(h1,h2,h3,h4,h5,h6)')).toHaveText(['Horoscopes']);
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   await page.screenshot({path:`test-results/horoscope-empty-${width}-${theme}.png`,animations:'disabled'});
   await page.getByRole('button',{name:'This season',exact:true}).click();await expect(page.getByRole('status')).toContainText('seasonal horoscopes haven’t been published');
   for(const period of ['daily','seasonal'] as const){
    const facts=await call({method:'GET',url:`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=2026-09-24&timeZone=America/New_York`});
    expect(facts.status).toBe(200);
    const edition=emptyHoroscopeEdition(facts.payload.brief.window);
    edition.passages=HOROSCOPE_SIGNS.map(sign=>({sign,headline:`Fixture ${period} ${sign}`,body:`Fixture ${period} opening.\n\nFixture ${period} complete ending.`}));
    const created=await call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',model:'manual',status:'DRAFT',lane:'serving',headline:`Fixture ${period}`,body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:facts.payload.brief,signature:facts.payload.signature}}}});
    expect(created.status).toBe(200);
    const row=created.payload.rows[0];expect((await call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'}})).status).toBe(200);
    await page.getByRole('button',{name:period==='daily'?'Today':'This season',exact:true}).click();
    await expect(page.getByRole('article')).toContainText(`Fixture ${period} opening.`);
    await expect(page.getByRole('article')).toContainText(`Fixture ${period} complete ending.`);
   }
   await page.route('**/api/content-reader',route=>route.fulfill({status:503,json:{error:'fixture outage'}}));
   await page.reload();await expect(page.getByRole('alert')).toContainText('could not load');
   await page.unroute('**/api/content-reader');await page.getByRole('button',{name:'Try again',exact:true}).click();
   await expect(page.getByRole('article')).toContainText('Fixture seasonal complete ending.');
   // The main navigation must expose the route, including the mobile menu.
   if(width===390){await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('menuitem',{name:'Horoscopes',exact:true}).click();}
   else {await page.getByRole('button',{name:'Horoscopes',exact:true}).click();}
   await expect(page.locator('.horoscope-page h1')).toHaveText('Horoscopes');
   expect(errors).toEqual([]);
  }finally{child.kill();}
 });
}
