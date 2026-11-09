import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {syntheticPublicationPage} from '../helpers/synthetic-publication-page';
import {openEditorMoreActions} from '../helpers/studio-editor-actions';
import {canonicalPublicationLedger,publicationLedgerTag} from '../../apps/web/src/services/publicationLedgerTransport';
for(const width of [390,1440])for(const theme of ['light','dark'] as const){
  test(`Approved source recovery preserves writing and resolves lost acknowledgement ${width} ${theme}`,async({page})=>{
    test.setTimeout(90000);
    const child=fork(path.resolve('tests/helpers/approved-source-recovery-api.mts'),[],{execArgv:['--import','tsx'],stdio:['ignore','ignore','pipe','ipc']});
    let sequence=0,stderr='';const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
    child.stderr?.on('data',data=>{stderr+=data;});
    const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const item=pending.get(m.id);if(item){pending.delete(m.id);m.error?item.reject(new Error(m.error)):item.resolve(m.result);}});child.on('exit',code=>{const error=new Error(`Recovery fixture exited ${code}: ${stderr}`);reject(error);for(const item of pending.values())item.reject(error);});});
    const call=(message:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...message,id});});
    let writes=0;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    try{
      await ready;await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:theme});
      await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','baseline-recovery-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
      await page.route('**/rest/v1/content_publications?**',async route=>{
        expect(route.request().method()).toBe('GET');
        const url=new URL(route.request().url());expect(url.origin).toBe('https://visual-smoke.supabase.test');
        await route.fulfill({json:syntheticPublicationPage(await call({method:'publications'}),url.searchParams)});
      });
      await routeStudioInventoryApi(page,{actualBaselineRecovery:true,call,listRows:rows=>rows.filter(row=>row.status!=='ARCHIVED'),answer:async(route,url)=>{
        if(url.pathname==='/api/content-publications'){const publications=canonicalPublicationLedger(await call({method:'publications'}));await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:'tldr-publications/v1',publications}});return true;}
        if(url.pathname!=='/api/admin/content-baseline-recovery')return false;
        const body=route.request().postDataJSON(),result=await call({method:'recovery',body});
        if(body.action==='restore'){writes++;expect(result.status).toBe(200);await route.fulfill({status:503,json:{ok:false,error:'Synthetic acknowledgement loss after commit.'}});}
        else await route.fulfill({status:result.status,json:result.payload});return true;
      }});
      await page.goto('/admin/content#exact-content');
      const sourceRow=page.getByRole('row').filter({hasText:'fallback-hook/placement-sentence/moon/scorpio'});
      await expect(sourceRow).toBeVisible();await sourceRow.getByRole('button',{name:'Edit',exact:true}).click();
      const editor=page.getByRole('dialog');const recovery=editor.getByRole('button',{name:'Use approved source',exact:true});
      await openEditorMoreActions(editor);
      await expect(recovery).toBeEnabled();await recovery.click();
      await expect(editor.getByText(/saved writing stays recoverable/)).toBeVisible();
      await editor.getByRole('button',{name:'Cancel',exact:true}).click();expect((await call({method:'counts'})).receipts).toBe(0);
      await recovery.click();await editor.getByRole('button',{name:'Restore approved source',exact:true}).click();
      await expect(page.getByRole('button',{name:'Check recovery',exact:true})).toBeEnabled();
      expect((await call({method:'counts'})).archived).toBe(1);expect(writes).toBe(1);
      if(theme==='dark')await call({method:'advance-source'});
      await page.reload();await expect(page.getByRole('dialog')).toHaveCount(0);
      const check=page.getByRole('button',{name:'Check recovery',exact:true});await expect(check).toBeVisible();await check.click();
      await expect(check).toHaveCount(0);
      await expect(page.getByText(theme==='dark'?'This source changed after recovery. The newer saved version has been kept. Reload to see its current state.':'Approved source restored for readers. Your saved writing remains in source history.',{exact:true})).toBeVisible();
      const rows=await call({method:'rows'});expect(rows[0].body).toBe('Neutral complete source opening. Neutral complete source ending.');
      expect(writes).toBe(1);expect(errors).toEqual([]);
      await page.screenshot({path:`test-results/approved-source-recovery-${width}-${theme}.png`,fullPage:true});
    }finally{await call({method:'close'}).catch(()=>{});child.kill();}
  });
}
