import {test, expect} from '@playwright/test';
import {servingPackageRecords} from '../../api/_lib/content-live-status';
import {studioApiStore} from '../helpers/studio-api-store';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';

const keys = [
  'authored/sky-lunation-macro/full-moon/aquarius',
  'fallback-hook/natal-aspect-lived/lilith/conjunction/sun',
  'fallback-hook/placement-sign-lived/mars/aries',
  'fallback-hook/synastry-pair/sun/sun/conjunction',
  'authored/transit-aspect/neptune/chiron/conjunction',
  'authored/transit-return/chiron',
  'fallback-hook/bond-effect-soft/moon'
];
for (const width of [390,1440]) for (const theme of ['light','dark']) test(`Owner publishes unchanged saved package drafts ${width} ${theme}`, async ({page}) => {
  test.setTimeout(120000);
  const rows = keys.map((key,index) => {
    const record = structuredClone(servingPackageRecords.get(key)!);
    expect(record).toBeTruthy();
    record.review_status = 'needs_review';
    for (const field of ['body','body_you','body_they']) if (typeof record[field] === 'string') record[field] = `Synthetic ${index} ${field} opening.\n\nComplete owner final sentence.`;
    return {id:`owner-draft-${index}`,content_key:key,headline:`Owner fixture ${index}`,body:record.body ?? record.body_you,summary:'',
      surface:'sky',mode:'feed',status:'DRAFT',lane:'reference',review_state:'needs-review',target_date:null,
      provider:'tldrastro-fallback-architecture-v3',block_type:'fallback_hook',event_type:'fallback-hook',
      sections:{packageRecord:record},facts:{fallbackArchitectureV3:true},
      source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',contentSystem:'fallback',review_status:'needs_review'},updated_at:'2026-10-15T12:00:00Z'};
  });
  const store=await studioApiStore(rows);
  try {
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
    await routeStudioInventoryApi(page,{call:store.call,answer:async(route,url)=>{
      if(url.pathname!='/api/admin/content-live-status')return false;
      const result=await store.call({method:'statuses',body:route.request().postDataJSON()});
      await route.fulfill({json:{ok:true,statuses:result}});return true;
    }});
    for(const row of rows) {
      await page.goto('/admin/content#exact-content'+(row===rows[0]?'?from=unresolved&q='+encodeURIComponent(row.content_key):''));
      await page.getByRole('row').filter({hasText:row.content_key}).getByRole('button',{name:'Edit',exact:true}).click();
      const editor=page.getByRole('dialog',{name:'Generated content editor'});
      const action=editor.locator('.admin-editor-savebar').getByRole('button',{name:/^(Save & publish|Approve & publish)$/});
      await expect(action).toBeEnabled();
      const box=await action.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(1000);
      await action.click();
      await expect.poll(async()=> (await store.call({method:'rows'})).find((r:any)=>r.id===row.id)?.status).toBe('LIVE');
      const saved=(await store.call({method:'rows'})).find((r:any)=>r.id===row.id);
      expect(saved.lane).toBe('serving');expect(saved.review_state).toBeNull();expect(saved.sections.packageDraft).toBeUndefined();
      for(const field of ['body','body_you','body_they']) if(typeof row.sections.packageRecord[field]==='string') expect(saved.sections.packageRecord[field]).toBe(row.sections.packageRecord[field]);
      const read=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[row.content_key],surfaces:['sky','natal','relationship']}});
      expect(read.status).toBe(200);
      expect(JSON.stringify(read.payload)).toContain(row.content_key);
      await editor.getByRole('button',{name:'Close',exact:true}).click();
      await page.reload();
      expect((await store.call({method:'rows'})).find((r:any)=>r.id===row.id)?.status).toBe('LIVE');
    }
  } finally {store.close();}
});

for(const width of [390,1440]) for(const theme of ['light','dark']) test(`Owner publishes Sky wording without a model gate ${width} ${theme}`,async({page})=>{
  const {baseline}=await import('../helpers/sky-review-workflow-api.mjs');
  const original='You always remember the message you meant to answer.\n\nThe owner final sentence stays complete.';
  const store=await studioApiStore([{...baseline,body:original,sections:{},summary:''}]);
  const writes:any[]=[];
  let loseReply=theme==='dark';
  try {
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
    await routeStudioInventoryApi(page,{call:async message=>{
      const result=await store.call(message);
      if(loseReply&&(message.body as any)?.ownerAction==='publish-owner-content'&&result.status===200){loseReply=false;return {status:503,payload:{ok:false,error:'Synthetic lost reply after committed publication.'}};}
      return result;
    },onWrite:write=>writes.push(write),answer:async(route,url)=>{
      if(url.pathname!='/api/admin/content-live-status')return false;
      await route.fulfill({json:{ok:true,statuses:await store.call({method:'statuses',body:route.request().postDataJSON()})}});return true;
    }});
    await page.goto('/admin/content#exact-content');
    await page.getByRole('row').filter({hasText:baseline.content_key}).getByRole('button',{name:'Edit',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    const revised=original+'\n\nAn additional author paragraph is preserved.';
    await editor.getByRole('textbox',{name:'Full passage / body',exact:true}).fill(revised);
    const publish=editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save & publish',exact:true});
    await expect(publish).toBeEnabled();
    const box=await publish.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(1000);
    await publish.click();
    await expect.poll(async()=>(await store.call({method:'rows'})).find((r:any)=>r.id===baseline.id)?.status).toBe('LIVE');
    const saved=(await store.call({method:'rows'})).find((r:any)=>r.id===baseline.id);
    expect(saved.body).toBe(revised);expect(saved.source_snapshot.studioOwnerApproval.action).toBe('publish-owner-content');
    expect(writes.filter(w=>w.body.ownerAction==='publish-owner-content')).toHaveLength(1);
    await expect(editor.getByRole('textbox',{name:'Full passage / body',exact:true})).toHaveValue(revised);
    await expect(editor.getByLabel('Reader status',{exact:true})).toHaveText('Live');
  } finally {store.close();}
});

for(const width of [390,1440]) test(`Inline natal publishes an unchanged saved draft ${width}`,async({page})=>{
  const {build}=await import('esbuild');
  const result=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Editor from './apps/admin/src/NatalPlacementSourceEditor';
    const row={id:'saved-natal',content_key:'fallback-hook/natal-you-planet-intro/neptune',status:'DRAFT',body:'Complete owner copy.',sections:{packageRecord:{body_you:'Complete owner copy.',body_they:'Complete Friend copy.'}},updated_at:'2026-10-15T12:00:00Z'};
    createRoot(document.getElementById('root')).render(<Editor row={row} label="Natal source" disabled={false} onDirtyChange={()=>{}} onSave={async(row,copy,publish)=>{window.saved={row,copy,publish};return true;}}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'}});
  await page.route('**/__natal-owner-fixture',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.setViewportSize({width,height:1000});await page.goto('/__natal-owner-fixture');await page.addScriptTag({content:result.outputFiles[0].text});
  const publish=page.getByRole('button',{name:'Save & publish',exact:true});await expect(publish).toBeEnabled();await publish.click();
  await expect(page.getByRole('status')).toHaveText('Published. The reader preview will refresh.');
  expect(await page.evaluate(()=>(window as any).saved)).toMatchObject({row:{id:'saved-natal',updated_at:'2026-10-15T12:00:00Z'},copy:{body_you:'Complete owner copy.',body_they:'Complete Friend copy.'},publish:true});
});
