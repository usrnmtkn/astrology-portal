import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
for (const width of [390,1440]) for (const colorScheme of ['light','dark'] as const) {
  test(`Article edit to memory ${width} ${colorScheme}`,async({page})=>{
    test.setTimeout(45000);
    const child=fork(path.resolve('tests/helpers/studio-article-memory-api.mjs'),[],{execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
    let sequence=0,stderr='';const waiting=new Map<number,any>();
    child.stderr?.on('data',chunk=>stderr+=chunk);
    const ready=new Promise<void>((resolve,reject)=>{
      child.on('message',(message:any)=>{if(message.ready)return resolve();const task=waiting.get(message.id);if(task){waiting.delete(message.id);message.error?task.reject(Error(message.error)):task.resolve(message.result);}});
      child.on('exit',code=>reject(Error(`${code}: ${stderr}`)));
    });
    const call=(payload:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve,reject});child.send({...payload,id});});
    try{
      await ready;await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme});
      await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
      const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/api/**',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(url.pathname==='/api/admin/studio-memory-feedback'||url.pathname==='/api/admin/generated-content'&&request.method()!=='GET'){
          const result=await call({method:request.method(),url:url.pathname+url.search,body:request.postData()?request.postDataJSON():null});
          return route.fulfill({status:result.status,json:result.payload});
        }
        if(url.pathname==='/api/admin/generated-content')return route.fulfill({json:{ok:true,rows:await call({method:'rows'}),hasMore:false}});
        return route.fulfill({json:{ok:true,rows:[],records:[],contentKeys:[],candidates:[],statuses:[],enabled:false}});
      });
      await page.goto('/admin/content#exact-content');
      await page.evaluate(value=>document.documentElement.dataset.theme=value,colorScheme);
      await page.locator('.admin-content-row').getByRole('button',{name:'Edit',exact:true}).click();
      const editor=page.locator('.admin-editor-panel');
      const memory=editor.getByLabel('Studio memory corrections');
      await memory.locator('summary').first().click();
      await expect(memory).toContainText('No captured corrections');
      await editor.getByLabel('Sky article TL;DR',{exact:true}).fill('Synthetic revised summary. Complete final sentence.');
      await expect(editor.locator('.admin-sky-article-editor header')).toContainText('Saved');
      await expect(memory).toContainText('Pending your decision');
      await memory.getByText('Compare original and replacement',{exact:true}).click();
      await expect(memory).toContainText('Synthetic summary.');
      await expect(memory).toContainText('Synthetic revised summary. Complete final sentence.');
      await expect(memory).toContainText('Synthetic complete house 12 opening. Synthetic house ending.');
      const scopes=memory.getByLabel('Apply this correction to');
      await expect(scopes.locator('option')).toHaveText(['This passage only','Long-form Sky articles']);
      await memory.getByRole('button',{name:'Use for future drafts',exact:true}).click();
      await expect(memory.getByRole('alert')).toContainText('Review the exact saved passage');
      await editor.getByRole('button',{name:'Review 1 change',exact:true}).click();
      await editor.getByRole('button',{name:'Publish changes',exact:true}).click();
      await expect(page.getByText('sky-article/saturn/aries/2026 published with 1 reviewed change.',{exact:true})).toBeVisible();
      if (await memory.getAttribute('open') === null) await memory.locator('summary').first().click();
      await memory.getByRole('button',{name:'Use for future drafts',exact:true}).click();
      await expect(memory).toContainText('Used for future drafts');
      await expect(editor.locator('.admin-sky-article-editor header')).toContainText('Saved');
      await expect(editor).toContainText('Published copy is unchanged.');
      expect((await call({method:'rows'})).filter((row:any)=>row.event_type==='sky-article-edition-revision')).toHaveLength(0);
      await scopes.selectOption('family');
      await expect(memory.getByRole('button',{name:'Save memory decision'})).toBeDisabled();
      await memory.getByLabel('Reason').fill('Synthetic explicit long-form guidance.');
      await memory.getByRole('button',{name:'Save memory decision'}).click();
      await expect(memory.getByRole('button',{name:'Save memory decision'})).toBeEnabled();
      await page.screenshot({path:`test-results/article-memory-${width}-${colorScheme}.png`});
      await memory.getByRole('button',{name:'Exclude from future drafts'}).click();
      await expect(memory).toContainText('Excluded from future drafts');
      expect(errors).toEqual([]);
    }finally{child.kill();}
  });
}
