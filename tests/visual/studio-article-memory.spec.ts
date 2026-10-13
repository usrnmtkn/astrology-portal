import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
for (const width of [390,1440]) for (const colorScheme of ['light','dark'] as const) for (const initialPublished of [false,true]) {
  test(`Article edit to memory ${width} ${colorScheme} ${initialPublished?'published revision':'draft edition'}`,async({page})=>{
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
      await ready;
      if(initialPublished){
        const initial=(await call({method:'rows'}))[0];
        const publication=await call({method:'PATCH',url:'/api/admin/generated-content',body:{id:initial.id,expectedUpdatedAt:initial.updated_at,ownerAction:'approve-sky-article-edition'}});
        expect(publication.status).toBe(200);
      }
      await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme});
      await page.addInitScript(theme=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme',theme);
      },colorScheme);
      const errors:string[]=[],writes:any[]=[];page.on('pageerror',e=>errors.push(e.message));
      let refusePublication = width === 390 && colorScheme === 'light' && initialPublished;
      await routeStudioInventoryApi(page, { call: async message => {
        if (refusePublication && message.method === 'PATCH' && (message.body as any)?.ownerAction === 'publish-sky-article-edition-revision') {
          refusePublication = false;
          return {status:409,payload:{ok:false,error:'Synthetic publication refused; saved draft retained.'}};
        }
        return call(message);
      }, onWrite: write=>writes.push(write), answer: async (route, url) => {
        if (!['/api/admin/studio-memory-feedback', '/api/admin/content-live-status'].includes(url.pathname)) return false;
        const request = route.request();
        const result = await call({ method: request.method(), url: url.pathname + url.search, body: request.postData() ? request.postDataJSON() : null });
        await route.fulfill({ status: result.status, json: result.payload });
        return true;
      } });
      await page.goto('/admin/content#exact-content');
      await expect(page.locator('[data-studio-theme]').first()).toHaveAttribute('data-studio-theme',colorScheme);
      await page.locator('.admin-content-row').getByRole('button',{name:'Edit',exact:true}).click();
      const editor=page.locator('.admin-editor-panel');
      const memory=editor.getByLabel('Studio memory corrections');
      await memory.locator('summary').first().click();
      await expect(memory).toContainText('No captured corrections');
      await editor.getByLabel('Sky article TL;DR',{exact:true}).fill('Synthetic revised summary. Complete final sentence.');
      await expect(editor.locator('.admin-sky-article-editor header')).toContainText('Saved');
      const savedRevision=(await call({method:'rows'})).find((row:any)=>row.status==='DRAFT'&&row.sections?.skyArticleRevisionBase);
      expect(savedRevision).toBeTruthy();
      const writesBeforeReopen=writes.length;
      await editor.getByRole('button',{name:'Close',exact:true}).click();
      await page.reload();
      await expect(page.locator('[data-studio-theme]').first()).toHaveAttribute('data-studio-theme',colorScheme);
      await page.locator('.admin-content-row').filter({hasText:savedRevision.content_key}).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(editor.getByLabel('Sky article TL;DR',{exact:true})).toHaveValue('Synthetic revised summary. Complete final sentence.');
      await expect(editor.getByRole('button',{name:'Review & publish',exact:true})).toBeVisible();
      // Observe beyond the autosave debounce: saved differences from the live
      // edition are review work, not a new edit or permission to write again.
      await page.waitForTimeout(2000);
      expect(writes).toHaveLength(writesBeforeReopen);
      expect(writes.filter(write=>write.body.ownerAction==='save-sky-article-edition-revision')).toHaveLength(1);
      expect((await call({method:'rows'})).find((row:any)=>row.id===savedRevision.id)).toEqual(savedRevision);
      await memory.locator('summary').first().click();
      await expect(memory).toContainText('Pending your decision');
      await memory.getByText('Compare original and replacement',{exact:true}).click();
      await expect(memory).toContainText('Synthetic summary.');
      await expect(memory).toContainText('Synthetic revised summary. Complete final sentence.');
      await expect(memory).toContainText('Synthetic complete house 12 opening. Synthetic house ending.');
      const scopes=memory.getByLabel('Apply this correction to');
      await expect(scopes.locator('option')).toHaveText(['This passage only','Long-form Sky articles']);
      await memory.getByRole('button',{name:'Use for future drafts',exact:true}).click();
      await expect(memory.getByRole('alert')).toContainText('Review the exact saved passage');
      const actions = editor.getByLabel('Article publication actions');
      await expect(actions).toContainText('Draft saved · Changes not published');
      const bounds = await actions.boundingBox();
      expect(bounds).toBeTruthy();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1000);
      await editor.screenshot({path:`test-results/article-crud-draft-${width}-${colorScheme}.png`});
      await actions.getByRole('button',{name:'Review & publish',exact:true}).click();
      await expect(editor.getByRole('region',{name:'Review Sky article changes'})).toBeFocused();
      await editor.getByRole('button',{name:'Publish changes',exact:true}).click();
      if (width === 390 && colorScheme === 'light' && initialPublished) {
        await expect(editor.getByRole('alert').filter({hasText:'Synthetic publication refused'})).toBeVisible();
        await expect(actions).toContainText('Draft saved · Changes not published');
        expect((await call({method:'rows'})).find((row:any)=>row.id===savedRevision.id)).toEqual(savedRevision);
        await editor.getByRole('button',{name:'Publish changes',exact:true}).click();
      }
      await expect(page.getByText('The reviewed revision is published.',{exact:true})).toBeVisible();
      await expect(actions.getByRole('link',{name:'Read published article'})).toHaveAttribute('href','/#articles/sky-article%2Fsaturn%2Faries%2F2026');
      const publishedRows=await call({method:'rows'});
      expect(publishedRows.find((row:any)=>row.content_key==='sky-article/saturn/aries/2026')?.status).toBe('LIVE');
      const publishedRevisions=publishedRows.filter((row:any)=>row.event_type==='sky-article-edition-revision');
      expect(publishedRevisions).toHaveLength(initialPublished?1:0);
      for(const revision of publishedRevisions) expect(revision.status).toBe('ARCHIVED');
      if (await memory.getAttribute('open') === null) await memory.locator('summary').first().click();
      await memory.getByRole('button',{name:'Use for future drafts',exact:true}).click();
      await expect(memory).toContainText('Used for future drafts');
      await expect(editor.locator('.admin-sky-article-editor header')).toContainText('Saved');
      await expect(editor).toContainText('Published copy is unchanged.');
      expect(await call({method:'rows'})).toEqual(publishedRows);
      await scopes.selectOption('family');
      await expect(memory.getByRole('button',{name:'Save memory decision'})).toBeDisabled();
      await memory.getByLabel('Reason').fill('Synthetic explicit long-form guidance.');
      await memory.getByRole('button',{name:'Save memory decision'}).click();
      await expect(memory.getByRole('button',{name:'Save memory decision'})).toBeEnabled();
      await page.screenshot({path:`test-results/article-memory-${width}-${colorScheme}-${initialPublished?'published-revision':'draft-edition'}.png`});
      await memory.getByRole('button',{name:'Exclude from future drafts'}).click();
      await expect(memory).toContainText('Excluded from future drafts');
      expect(errors).toEqual([]);
    }finally{child.kill();}
  });
}
