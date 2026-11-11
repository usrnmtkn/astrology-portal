import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {syntheticPublicationPage} from '../helpers/synthetic-publication-page';
import {canonicalPublicationLedger,publicationLedgerTag} from '../../apps/web/src/services/publicationLedgerTransport';
import {MOON_HOROSCOPE_SIGNS,moonHoroscopeKey,moonHoroscopeBody,parseMoonHoroscopes} from '../../src/shared/datedLunationHoroscopes.mjs';
import skyHandler from '../../api/sky';

const cases=[390,1440].flatMap(width=>['light','dark'].map(theme=>({width,theme,afterCommit:'retain'}))).concat([
  {width:390,theme:'dark',afterCommit:'missing-check'},{width:1440,theme:'dark',afterCommit:'missing-cancel'}]);
for(const {width,theme,afterCommit} of cases)test(`Explicit Moon reusable recovery and exact reader restoration ${width} ${theme} ${afterCommit}`,async({page,context,baseURL})=>{
  test.setTimeout(120000);
  const child=fork(path.resolve('tests/helpers/moon-horoscope-api.mts'),['--ipc'],{execArgv:['--import','tsx'],stdio:['ignore','ignore','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(message:any)=>{if(message.ready)return resolve();const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result);}});child.on('exit',code=>{const error=new Error(`Moon recovery fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(task=>task.reject(error));});});
  const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
  let writes=0,recoveryRequests=0,failedPreview=false;const errors:string[]=[];context.on('page',tab=>tab.on('pageerror',error=>errors.push(error.message)));
  page.on('pageerror',error=>errors.push(error.message));
  let reader:Awaited<ReturnType<typeof context.newPage>>|undefined;
  try{
    await ready;await page.setViewportSize({width,height:1000});
    await context.addInitScript(theme=>{
      if(!['http:','https:'].includes(location.protocol))return;
      localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);
      localStorage.setItem('tldrastro:selectedLocation',JSON.stringify({label:'Synthetic New York',latitude:40.7128,longitude:-74.006,timeZone:'America/New_York'}));
    },theme);
    await context.route('**/rest/v1/**',async route=>{
      const url=new URL(route.request().url());
      await route.fulfill({json:url.pathname.endsWith('/content_publications')?syntheticPublicationPage(await call({method:'publications'}),url.searchParams):[]});
    });
    await routeStudioInventoryApi(context,{actualBaselineRecovery:true,call,answer:async(route,url)=>{
      if(url.pathname==='/api/content-publications'){
        const publications=canonicalPublicationLedger(await call({method:'publications'}));await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:'tldr-publications/v1',publications}});return true;
      }
      if(url.pathname==='/api/sky'){
        const response={statusCode:200,setHeader(){},end(body:string){void route.fulfill({status:this.statusCode,contentType:'application/json',body});}};
        await skyHandler({method:'GET',url:route.request().url()} as any,response as any);return true;
      }
      if(url.pathname==='/api/content-reader'){
        const result=await call({method:'reader',body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;
      }
      if(!['/api/admin/lunation-writing','/api/admin/content-baseline-recovery'].includes(url.pathname))return false;
      if(url.pathname.endsWith('content-baseline-recovery'))recoveryRequests++;
      const body=route.request().postData()?route.request().postDataJSON():undefined;
      if(url.pathname.endsWith('content-baseline-recovery')&&body?.action==='preview'&&!failedPreview){failedPreview=true;await route.fulfill({status:503,json:{ok:false,error:'Reusable Moon readings are temporarily unavailable.'}});return true;}
      const result=await call({method:route.request().method(),body,url:url.pathname+url.search});
      if(url.pathname.endsWith('content-baseline-recovery')&&body.action==='restore'){
        writes++;expect(result.status).toBe(200);
        if(theme==='dark'){await route.fulfill({status:503,json:{ok:false,error:'Synthetic acknowledgement loss after committed recovery.'}});return true;}
      }
      await route.fulfill({status:result.status,json:result.payload});return true;
    }});
    const listed=await call({method:'GET',url:'/api/admin/lunation-writing?month=2020-05&timeZone=America%2FNew_York'}),event=listed.payload.events.find((value:any)=>value.phase==='full-moon');
    expect(await call({method:'limit-reusable-baseline',body:{event,keepSigns:['aries','taurus','gemini']}})).toEqual({retired:9});
    reader=await context.newPage();await reader.setViewportSize({width,height:1000});await reader.clock.setFixedTime(new Date('2020-05-07T16:00:00Z'));
    await reader.goto(`${baseURL}/?date=2020-05-07#sky/lunation/2020-05-07/scorpio`);
    const readings=reader.locator('#sky-rising-horoscopes .sky-rising-horoscope');await expect(readings).toHaveCount(3,{timeout:60000});
    const capture=()=>reader!.evaluate(()=>({general:Array.from(document.querySelectorAll<HTMLElement>('.sky-detail-article .article-body-inner')).find(node=>!node.querySelector('#sky-rising-horoscopes'))?.innerText,
      passages:Array.from(document.querySelectorAll('#sky-rising-horoscopes .sky-rising-horoscope')).map(node=>({title:node.querySelector('h3')?.textContent,body:Array.from(node.querySelectorAll('p')).map(node=>node.textContent).join('\n\n')}))}));
    const baseline=await capture();expect(baseline.general?.length).toBeGreaterThan(0);
    const section=parseMoonHoroscopes(MOON_HOROSCOPE_SIGNS.map(sign=>`${sign}\n${sign} neutral temporary opening.\n\n${sign} complete temporary ending.`).join('\n\n'),event);
    let result=await call({method:'POST',body:{contentKey:moonHoroscopeKey(event),surface:'sky',mode:'article',eventType:'lunation-horoscopes',provider:'manual-admin',targetDate:null,status:'DRAFT',lane:'serving',headline:'Temporary Moon recovery check',summary:'',body:moonHoroscopeBody(section),sections:{articleHoroscopes:section},facts:{lunationHoroscopes:{event}},sourceSnapshot:{}}});expect(result.status).toBe(200);let saved=result.payload.rows[0];
    result=await call({method:'PATCH',body:{id:saved.id,expectedUpdatedAt:saved.updated_at,ownerAction:'publish-owner-content'}});expect(result.status).toBe(200);saved=result.payload.rows[0];
    result=await call({method:'PATCH',body:{id:saved.id,expectedUpdatedAt:saved.updated_at,sourceLifecycleAction:'archive'}});expect(result.status).toBe(200);saved=result.payload.rows[0];const original=structuredClone(saved);
    await reader.reload();await expect(reader.getByRole('heading',{level:1,name:'Full Moon in Scorpio',exact:true})).toBeVisible();await expect(readings).toHaveCount(0);
    expect(recoveryRequests).toBe(0);
    await page.goto(`/admin/content#moon-horoscopes?draft=${saved.id}`);
    const studio=page.getByRole('region',{name:'Dated Moon horoscopes',exact:true});await expect(studio.locator('.admin-editor-save-state').first()).toHaveText('Archived');
    const more=studio.getByLabel('Moon horoscope actions',{exact:true});await more.locator('summary').click();
    const recovery=studio.getByLabel('Moon reading recovery',{exact:true});const use=recovery.getByRole('button',{name:'Use reusable Moon readings',exact:true});
    await expect(recovery.getByRole('alert')).toHaveText('Reusable Moon readings are temporarily unavailable.');await expect(use).toHaveCount(0);expect(writes).toBe(0);
    await recovery.getByRole('button',{name:'Check reusable Moon readings',exact:true}).click();await expect(use).toBeEnabled();await expect(recovery.getByRole('alert')).toHaveCount(0);expect(writes).toBe(0);await use.click();
    await expect(recovery).toContainText('Your dated readings stay archived and unchanged.');await recovery.getByRole('button',{name:'Cancel',exact:true}).click();expect(writes).toBe(0);
    await use.click();await expect(recovery).toContainText('Your dated readings stay archived and unchanged.');await use.click();
    if(theme==='dark'){
      await expect(page.getByRole('button',{name:'Check recovery',exact:true})).toBeEnabled();await expect(studio.getByRole('button',{name:'Restore as draft',exact:true})).toBeDisabled();
      await page.reload();await expect(studio.locator('.admin-editor-save-state').first()).toHaveText('Archived');
      if(afterCommit==='retain'){
        await call({method:'source-read-failure',body:{enabled:true}});await page.getByRole('button',{name:'Check recovery',exact:true}).click();
        await expect(page.getByRole('alert')).toContainText('Moon recovery was not confirmed.');await expect(page.getByRole('button',{name:'Check recovery',exact:true})).toBeEnabled();
        await expect(studio.getByRole('button',{name:'Choose another Moon',exact:true})).toBeDisabled();await call({method:'source-read-failure',body:{enabled:false}});
      }
      if(afterCommit!=='retain')expect(await call({method:'remove-source',body:{id:saved.id}})).toEqual({removed:true});
      await page.getByRole('button',{name:afterCommit==='missing-cancel'?'Stop unconfirmed recovery':'Check recovery',exact:true}).click();await expect(page.getByRole('button',{name:'Check recovery',exact:true})).toHaveCount(0);
      if(afterCommit!=='retain')await expect(page.getByText('This source changed after recovery. Reload to see its current state. This check did not change saved writing.',{exact:true})).toBeVisible();
    }else await expect(studio.getByRole('status')).toContainText('Reusable Moon readings restored.');
    expect(writes).toBe(1);expect((await call({method:'rows'})).find((row:any)=>row.id===saved.id)).toEqual(afterCommit==='retain'?original:undefined);expect(await call({method:'generation-calls'})).toBe(0);
    await expect(studio.getByRole('button',{name:'Choose another Moon',exact:true})).toBeEnabled();
    await expect(studio.locator('.admin-editor-save-state').first()).toHaveText('Archived');
    await expect(studio.getByRole('textbox',{name:'Sign heading',exact:true})).toBeDisabled();
    await expect(studio.getByRole('textbox',{name:'Complete horoscope',exact:true})).toBeDisabled();
    await reader.reload();await expect(readings).toHaveCount(3,{timeout:60000});expect(await capture()).toEqual(baseline);
    await reader.reload();await expect(readings).toHaveCount(3,{timeout:60000});expect(await capture()).toEqual(baseline);
    expect((await call({method:'reader',body:{keys:[saved.content_key]}})).payload.rows).toHaveLength(0);expect(errors).toEqual([]);
    await page.screenshot({path:`test-results/moon-reusable-recovery-${width}-${theme}.png`,fullPage:true});
  }finally{await reader?.close();await call({method:'close'}).catch(()=>{});child.kill();}
});
