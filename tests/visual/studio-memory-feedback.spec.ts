import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';

for (const width of [390,1440]) for (const colorScheme of ['light','dark'] as const) {
  test(`Studio edit to memory ${width} ${colorScheme}`,async ({page})=>{
    test.setTimeout(90000);
    const child=fork(path.resolve('tests/helpers/studio-memory-workflow-api.mjs'),[],{execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
    let sequence=0,stderr=''; const waiting=new Map<number,any>();
    child.stderr?.on('data',chunk=>stderr+=chunk);
    const ready=new Promise<void>((resolve,reject)=>{
      child.on('message',(message:any)=>{if(message.ready)return resolve();const task=waiting.get(message.id);if(task){waiting.delete(message.id);message.error?task.reject(Error(message.error)):task.resolve(message.result);}});
      child.on('exit',code=>reject(Error(`${code}: ${stderr}`)));
    });
    const call=(payload:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve,reject});child.send({...payload,id});});
    try {
      await ready;await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme});
      await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
      const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/api/**',async route=>{
        const request=route.request(),url=new URL(request.url());
        if (['/api/admin/studio-memory-feedback','/api/admin/memory-graph','/api/admin/sky-draft-writing'].includes(url.pathname)
          || url.pathname==='/api/admin/generated-content' && request.method()!=='GET') {
          const result=await call({method:request.method(),url:url.pathname+url.search,body:request.postData()?request.postDataJSON():null});
          return route.fulfill({status:result.status,json:result.payload});
        }
        if(url.pathname==='/api/admin/generated-content')return route.fulfill({json:{ok:true,rows:await call({method:'rows'}),hasMore:false}});
        return route.fulfill({json:{ok:true,rows:[],records:[],contentKeys:[],candidates:[],statuses:[],enabled:false}});
      });
      await page.goto('/admin/content#review-queue');
      await page.evaluate(value => document.documentElement.dataset.theme = value,colorScheme);
      await page.getByRole('button',{name:'Needs changes',exact:true}).click();
      await page.locator('.admin-review-queue-row').filter({hasText:'Chiron sextile North Node'}).getByRole('button',{name:'Edit',exact:true}).click();
      const editor=page.getByRole('dialog');
      const body=editor.getByRole('textbox',{name:'Full passage / body',exact:true});
      await body.fill('Fixture revised opening. Fixture complete final sentence.');
      await editor.getByRole('button',{name:'Save',exact:true}).click();
      const memory=editor.getByLabel('Studio memory corrections');
      await memory.locator('summary').first().click();
      await expect(memory).toContainText('Pending your decision');
      await memory.getByText('Compare original and replacement',{exact:true}).click();
      await expect(memory).toContainText('Fixture complete opening.');
      await expect(memory).toContainText('Fixture revised opening.');
      await memory.getByRole('button',{name:'Use for future drafts',exact:true}).click();
      await expect(memory.getByRole('alert')).toContainText('Review the exact saved passage');
      await editor.getByRole('button',{name:'Run writing checks',exact:true}).click();
      await editor.getByRole('button',{name:'Approve & schedule',exact:true}).click();
      await memory.getByRole('button',{name:'Use for future drafts',exact:true}).click();
      await expect(memory).toContainText('Used for future drafts');
      await memory.getByLabel('Apply this correction to').selectOption('family');
      await expect(memory.getByRole('button',{name:'Save memory decision'})).toBeDisabled();
      await memory.getByLabel('Reason').fill('Fixture explicit family guidance.');
      await memory.getByRole('button',{name:'Save memory decision'}).click();
      await expect(memory.getByLabel('Apply this correction to')).toHaveValue('family');
      const graph=await call({method:'GET',url:'/api/admin/memory-graph?q=Fixture%20revised&match=phrase'});
      expect(graph.payload.records.some((r:any)=>r.id.startsWith('studio-'))).toBeTruthy();
      await page.screenshot({path:`test-results/studio-memory-${width}-${colorScheme}.png`,fullPage:false});
      await memory.getByRole('button',{name:'Exclude from future drafts'}).click();
      await expect(memory).toContainText('Excluded from future drafts');
      await memory.getByText('Memory decision history',{exact:true}).click();
      await expect(memory).toContainText('Version 2');
      await expect(memory).toContainText('Version 4');
      const retired=await call({method:'GET',url:'/api/admin/memory-graph?q=Fixture%20revised&match=phrase'});
      expect(retired.payload.records.some((r:any)=>r.id.startsWith('studio-'))).toBeFalsy();
      expect(errors).toEqual([]);
    } finally {child.kill();}
  });
}
