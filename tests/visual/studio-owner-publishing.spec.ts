import {transitNatalExactSourceDraft} from "../../apps/admin/src/transitNatalSources";
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
  'authored/transit-aspect/neptune/chiron/conjunction/aquarius/12/11',
  'fallback-hook/bond-effect-soft/moon'
];

for(const width of [390,1440])test(`Owner creates a missing exact Friends opening ${width}`,async({page}, testInfo)=>{
  const store=await studioApiStore([]);
  const key='fallback-hook/bond-effect-sextile/lilith';
  let releaseLookup!: () => void;
  const heldLookup = new Promise<void>(resolve => { releaseLookup = resolve; });
  let lookupStarted = false;
  const call = async (message: Parameters<typeof store.call>[0]) => {
    if (!lookupStarted && message.method === 'GET' && message.url && new URL(message.url, 'http://fixture.invalid').searchParams.get('contentKey') === 'fallback-hook/synastry-pair/sun/imum-coeli/sextile') {
      lookupStarted = true;
      await heldLookup;
      return { status: 503, payload: { error: 'QA activation source unavailable' } };
    }
    return store.call(message);
  };
  try{
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
      if(url.pathname!='/api/admin/content-live-status')return false;
      await route.fulfill({json:{ok:true,statuses:await store.call({method:'statuses',body:route.request().postDataJSON()})}});return true;
    }});
    await page.goto('/admin/content#fallback-hooks?section=friends&audience=friends&workspace=between-you-two');
    const map=page.getByRole('region',{name:'Between you two composition map'});
    await map.getByLabel('Preview transiting planet',{exact:true}).selectOption('lilith');
    await map.getByLabel('Transit aspect',{exact:true}).selectOption('sextile');
    await map.getByRole('button',{name:'Open opening editor',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    const publish=editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save & publish',exact:true});
    await expect(publish).toBeDisabled();
    const you='Complete You opening with {{holder1}}.\n\nExact final sentence.',they='Complete Friend opening with {{holder1}}.\n\nExact final sentence.';
    await editor.locator('[data-sky-field="body_you"]').fill(you);
    await expect(publish).toBeDisabled();
    await editor.locator('[data-sky-field="body_they"]').fill(they);
    await expect(publish).toBeEnabled();
    const box=await publish.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(1000);
    await publish.click();
    await expect.poll(async()=>(await store.call({method:'rows'})).find((row:any)=>row.content_key===key)?.status).toBe('LIVE');
    const read=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[key]}});
    expect(read.payload.rows[0].sections.packageRecord).toMatchObject({body_you:you,body_they:they});
    await page.reload();
    await expect(map).toContainText('Complete Friend opening with Name.');
    await map.getByLabel('Preview natal point',{exact:true}).selectOption('sun');
    await map.getByLabel('Preview friend point',{exact:true}).selectOption('imum-coeli');
    await expect(map.getByRole('button',{name:'Open You activation',exact:true})).toBeEnabled();
    await map.getByLabel('Preview synastry aspect',{exact:true}).selectOption('sextile');
    await expect.poll(() => lookupStarted).toBe(true);
    await expect(map.getByRole('button',{name:'Open You activation',exact:true})).toBeDisabled();
    await expect(map.getByRole('button',{name:'Open Friend activation',exact:true})).toBeDisabled();
    releaseLookup();
    for (const view of ['Saved preview', 'Main template', 'Assembly']) {
      await map.getByRole('tab', {name: view, exact: true}).click();
      await expect(map.getByRole('alert')).toHaveCount(1);
      await expect(map.getByRole('alert')).toContainText('QA activation source unavailable');
      await expect(map.getByRole('button', {name: 'Retry activation source', exact: true})).toBeVisible();
      const retryBox = await map.getByRole('button', {name: 'Retry activation source', exact: true}).boundingBox();
      expect(retryBox!.x).toBeGreaterThanOrEqual(0);
      expect(retryBox!.x + retryBox!.width).toBeLessThanOrEqual(width);
      await page.screenshot({path: testInfo.outputPath(`activation-source-error-${view.replaceAll(' ', '-')}.png`)});
      await expect(map.getByRole('button',{name:'Open You activation',exact:true})).toBeDisabled();
      if (view !== 'Saved preview') await expect(map.getByRole('button',{name:'Edit this activation',exact:true})).toBeDisabled();
    }
    await map.getByRole('button',{name:'Retry activation source',exact:true}).click();
    await map.getByRole('button',{name:'Open You activation',exact:true}).click();
    await expect(editor.getByLabel('Content key',{exact:true})).toHaveValue('fallback-hook/synastry-pair/sun/imum-coeli/soft');
    await expect(publish).toBeEnabled();
    await editor.locator('[data-sky-field="body_you"]').fill('Complete owner You activation.');
    await editor.locator('[data-sky-field="body_they"]').fill('Complete owner Friend activation.');
    await publish.click();
    const activationKey='fallback-hook/synastry-pair/sun/imum-coeli/soft';
    await expect.poll(async()=>(await store.call({method:'rows'})).find((row:any)=>row.content_key===activationKey)?.status).toBe('LIVE');
    await page.reload();
    await expect(map).toContainText('Complete owner Friend activation.');
  }finally{releaseLookup();store.close();}
});
test('Owner authors an activation after a completed empty source lookup', async ({page}) => {
  const store = await studioApiStore([]);
  const key = 'fallback-hook/synastry-pair/lilith/imum-coeli/conjunction';
  let published = false;
  try {
    await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
    await routeStudioInventoryApi(page, {call: async message => {
      if (!published && message.method === 'GET' && message.url && new URL(message.url, 'http://fixture.invalid').searchParams.get('contentKey')?.startsWith('fallback-hook/synastry-pair/')) {
        return {status: 200, payload: {ok: true, rows: [], packageSource: null}};
      }
      return store.call(message);
    }, answer: async (route, url) => {
      if (url.pathname !== '/api/admin/content-live-status') return false;
      await route.fulfill({json: {ok: true, statuses: await store.call({method: 'statuses', body: route.request().postDataJSON()})}});
      return true;
    }});
    await page.goto('/admin/content#fallback-hooks?section=friends&audience=friends&workspace=between-you-two');
    const map = page.getByRole('region', {name: 'Between you two composition map'});
    await map.getByLabel('Preview natal point', {exact: true}).selectOption('lilith');
    await map.getByLabel('Preview friend point', {exact: true}).selectOption('imum-coeli');
    await map.getByLabel('Preview synastry aspect', {exact: true}).selectOption('conjunction');
    await map.getByRole('button', {name: 'Open You activation', exact: true}).click();
    const editor = page.getByRole('dialog', {name: 'Generated content editor'});
    await expect(editor.getByLabel('Content key', {exact: true})).toHaveValue(key);
    await editor.locator('[data-sky-field="body_you"]').fill('Complete new You activation after verified missing source.');
    await editor.locator('[data-sky-field="body_they"]').fill('Complete new Friend activation after verified missing source.');
    const publish = editor.locator('.admin-editor-savebar').getByRole('button', {name: 'Save & publish', exact: true});
    await expect(publish).toBeEnabled();
    published = true;
    await publish.click();
    await expect.poll(async () => (await store.call({method: 'rows'})).find((row: any) => row.content_key === key)?.status).toBe('LIVE');
    const reader = await store.call({method: 'POST', url: '/api/content-reader', body: {keys: [key]}});
    expect(reader.payload.rows[0].sections.packageRecord).toMatchObject({body_you: 'Complete new You activation after verified missing source.', body_they: 'Complete new Friend activation after verified missing source.'});
    await page.reload();
    await map.getByLabel('Preview natal point', {exact: true}).selectOption('lilith');
    await map.getByLabel('Preview friend point', {exact: true}).selectOption('imum-coeli');
    await expect(map).toContainText('Complete new Friend activation after verified missing source.');
  } finally { store.close(); }
});
for (const key of [keys[5], keys[6]]) for (const width of [390,1440]) test(`Owner keeps transit edits typed before a save response ${key} ${width}`, async ({page}) => {
  test.setTimeout(60000);
  const exact = key.split('/').length === 8;
  const record = structuredClone(exact
    ? transitNatalExactSourceDraft({planet:'neptune',natalPoint:'chiron',aspect:'conjunction',sign:'aquarius',transitHouse:'12',natalHouse:'11'}).sections.packageRecord
    : servingPackageRecords.get(key)!);
  for (const field of ['body','body_you','body_they']) if (typeof record[field] === 'string') record[field] = `Synthetic saved ${field}. Complete saved final sentence.`;
  if (exact) record.body = record.body_you;
  record.headline = 'Synthetic saved headline';
  record.summary = 'Synthetic saved summary';
  record.review_status = 'needs_review';
  const row = {id:'pending-transit-save',content_key:key,headline:'Pending transit fixture',body:record.body ?? record.body_you,summary:'',
    surface:'sky',mode:'feed',status:'DRAFT',lane:'reference',review_state:'needs-review',target_date:null,
    provider:'tldrastro-fallback-architecture-v3',block_type:'fallback_hook',event_type:'fallback-hook',
    sections:{packageRecord:record},facts:{fallbackArchitectureV3:true},
    source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',contentSystem:'fallback',review_status:'needs_review'},updated_at:'2026-10-15T12:00:00Z'};
  const store = await studioApiStore([row]);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let committed = false;
  let savedVersion: string | undefined;
  const writes: any[] = [];
  try {
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(theme => {localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);}, width === 390 ? 'dark' : 'light');
    await routeStudioInventoryApi(page,{call:async message => {
      if (message.method === 'PATCH') writes.push(message.body);
      const result = await store.call(message);
      if (!committed && message.method === 'PATCH' && (message.body as any)?.id === row.id) {
        expect(result.status).toBe(200);
        savedVersion = result.payload.rows[0].updated_at;
        committed = true;
        await held;
      }
      return result;
    }});
    await page.goto('/admin/content#exact-content');
    const open = () => page.getByRole('row').filter({has:page.getByText(key,{exact:true})}).getByRole('button',{name:'Edit',exact:true}).click();
    await open();
    const editor = page.getByRole('dialog',{name:'Generated content editor'});
    const savebar = editor.locator('.admin-editor-savebar');
    const publish = savebar.getByRole('button',{name:'Approve & publish',exact:true});
    await publish.click();
    await expect.poll(() => committed).toBe(true);
    await expect(savebar).toHaveAttribute('aria-busy','true');
    const you = 'New You opening typed while the reply waits.\n\nComplete new You final sentence.';
    const they = width === 1440 ? '' : 'New Friend opening typed while the reply waits.\n\nComplete new Friend final sentence.';
    const title = 'New title typed while the reply waits';
    const summary = 'New summary typed while the reply waits.';
    await editor.locator('.admin-title-field input').first().fill(title);
    await editor.locator('.admin-copy-field-summary').fill(summary);
    await editor.locator('[data-sky-field="body_you"]').fill(you);
    if (exact) await editor.locator('[data-sky-field="body_they"]').fill(they);
    const firstReply = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/api/admin/generated-content'));
    release();
    const firstResponse = await firstReply;
    expect(firstResponse.status()).toBe(200);
    expect(await firstResponse.finished()).toBeNull();
    await expect(savebar).toHaveAttribute('aria-busy','false');
    await expect(editor.locator('.admin-title-field input').first()).toHaveValue(title);
    await expect(editor.locator('.admin-copy-field-summary')).toHaveValue(summary);
    await expect(editor.locator('[data-sky-field="body_you"]')).toHaveValue(you);
    if (exact) await expect(editor.locator('[data-sky-field="body_they"]')).toHaveValue(they);
    // The pending copy must remain unsaved, and cannot leak into the earlier publication.
    const earlier = (await store.call({method:'rows'}))[0].sections.packageRecord;
    expect(earlier.review_status).toBe('approved');
    for (const field of ['body','body_you','body_they']) if (typeof record[field] === 'string') expect(earlier[field]).toBe(record[field]);
    const draftReply = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/api/admin/generated-content'));
    await savebar.getByRole('button',{name:'Save draft',exact:true}).click();
    const draftResponse = await draftReply;
    expect(draftResponse.status()).toBe(200);
    expect(await draftResponse.finished()).toBeNull();
    await expect(savebar).toHaveAttribute('aria-busy','false');
    const saved = (await store.call({method:'rows'}))[0];
    expect(writes[1].expectedUpdatedAt).toBe(savedVersion);
    expect(writes[1].sections.packageRecord.review_status).toBe('approved');
    expect(saved.status).toBe('DRAFT');
    expect(saved.sections.packageRecord).toMatchObject({headline:title,summary});
    expect(saved.sections.packageRecord.body_you).toBe(you);
    if (exact) expect(saved.sections.packageRecord.body_they).toBe(they);
    const publishedThey = they || 'Complete Friend copy restored after deliberately clearing the field.';
    if (exact && !they) await editor.locator('[data-sky-field="body_they"]').fill(publishedThey);
    const publishReply = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/api/admin/generated-content'));
    await publish.click();
    const publishResponse = await publishReply;
    expect(publishResponse.status()).toBe(200);
    expect(await publishResponse.finished()).toBeNull();
    await expect(savebar).toHaveAttribute('aria-busy','false');
    const reader = await store.call({method:'POST',url:'/api/content-reader',body:{keys:[key]}});
    expect(reader.status).toBe(200);
    expect(reader.payload.rows[0].sections.packageRecord.body_you).toBe(you);
    if (exact) expect(reader.payload.rows[0].sections.packageRecord.body_they).toBe(publishedThey);
    await page.reload();
    await open();
    await expect(editor.locator('.admin-title-field input').first()).toHaveValue(title);
    await expect(editor.locator('.admin-copy-field-summary')).toHaveValue(summary);
    await expect(editor.locator('[data-sky-field="body_you"]')).toHaveValue(you);
    if (exact) await expect(editor.locator('[data-sky-field="body_they"]')).toHaveValue(publishedThey);
  } finally {release();await page.unrouteAll({behavior:'wait'});store.close();}
});

for (const width of [390,1440]) for (const theme of ['light','dark']) test(`Owner publishes unchanged saved package drafts ${width} ${theme}`, async ({page}) => {
  test.setTimeout(120000);
  const rows = keys.map((key,index) => {
    const source = key.split('/').length === 8
      ? transitNatalExactSourceDraft({planet:'neptune',natalPoint:'chiron',aspect:'conjunction',sign:'aquarius',transitHouse:'12',natalHouse:'11'}).sections.packageRecord
      : servingPackageRecords.get(key)!;
    const record = structuredClone(source);
    expect(record).toBeTruthy();
    record.contentKey = key;
    record.review_status = 'needs_review';
    for (const field of ['body','body_you','body_they']) if (typeof record[field] === 'string') record[field] = `Synthetic ${index} ${field} opening.\n\nComplete owner final sentence.`;
    if (key.startsWith('authored/transit-') && typeof record.body === 'string' && typeof record.body_you === 'string') record.body = record.body_you;
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
      const editor=page.getByRole('dialog',{name:'Generated content editor'});
      if(row===rows[0]) await expect(editor).toBeVisible();
      else await page.getByRole('row').filter({has:page.getByText(row.content_key,{exact:true})}).getByRole('button',{name:'Edit',exact:true}).click();
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
      if(row.content_key.startsWith('authored/transit-return/') || row.content_key.split('/').length===8) {
        const copy='The engine starts—this is the owner wording.\n\nComplete owner draft final sentence.';
        await editor.locator('[data-sky-field="body_you"]').fill(copy);
        await editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save draft',exact:true}).click();
        await expect.poll(async()=>(await store.call({method:'rows'})).find((r:any)=>r.content_key===row.content_key && r.mode==='studio-draft' && r.status==='DRAFT')?.sections.packageDraft?.body_you).toBe(copy);
        expect((await store.call({method:'rows'})).find((r:any)=>r.id===row.id)?.status).toBe('LIVE');
        const before=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[row.content_key]}});
        expect(before.status).toBe(200);
        expect(before.payload.rows).toHaveLength(1);
        expect(before.payload.rows[0].sections.packageRecord.body_you).toBe(row.sections.packageRecord.body_you);
        await expect(editor.locator('[data-sky-field="body_you"]')).toHaveValue(copy);
        await action.click();
        await expect.poll(async()=>(await store.call({method:'POST',url:'/api/content-reader',body:{keys:[row.content_key]}})).payload.rows[0]?.sections.packageRecord.body_you).toBe(copy);
        const after=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[row.content_key]}});
        expect(after.payload.rows[0].sections.packageRecord.body_you).toBe(copy);
      }
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
      if(loseReply&&(message.body as any)?.ownerAction==='save-and-publish-owner-content'&&result.status===200){loseReply=false;return {status:503,payload:{ok:false,error:'Synthetic lost reply after committed publication.'}};}
      return result;
    },onWrite:write=>writes.push(write),answer:async(route,url)=>{
      if(url.pathname!='/api/admin/content-live-status')return false;
      await route.fulfill({json:{ok:true,statuses:await store.call({method:'statuses',body:route.request().postDataJSON()})}});return true;
    }});
    await page.goto('/admin/content#exact-content');
    await page.getByRole('row').filter({hasText:baseline.content_key}).getByRole('button',{name:'Continue draft',exact:true}).click();
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
    expect(writes.filter(w=>w.body.ownerAction==='save-and-publish-owner-content')).toHaveLength(1);
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

import {createHash as publicationAckCreateHash} from 'node:crypto';
import {writeFileSync as writePublicationAckProof} from 'node:fs';

test.describe('Publication response copy preservation',()=>{
const submitted='A complete submitted opening.\n\nThe submitted final sentence remains complete.';
const newer='A newer complete opening.\n\nThe newer final sentence remains complete.';
const hash=(text:string)=>publicationAckCreateHash('sha256').update(text).digest('hex');

for(const phase of ['publication','save-before-publication'] as const) for(const kind of ['article','guide','package','initial-article'] as const) test(`held ${phase} acknowledgement preserves newer ${kind} edits`,async({page},testInfo)=>{
  test.setTimeout(60000);
  await page.setViewportSize({width:phase==='publication'?1440:390,height:1000});
  await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),phase==='publication'?'light':'dark');
  const isArticle=kind!=='package';
  const key=isArticle?`article/${kind==='guide'?'guide':'manual'}/acknowledgement-fixture-${kind}-${phase}`:'fallback-hook/bond-effect-soft/moon';
  const initiallyLive=kind==='article'||kind==='guide';
  const record=kind==='package'?{...structuredClone(servingPackageRecords.get(key)!),review_status:'needs_review',body_you:submitted,body_they:'A complete Friend opening.\n\nThe Friend final sentence remains complete.'}:undefined;
  const source={id:'dddddddd-dddd-4ddd-addd-dddddddddddd',content_key:key,surface:'sky',mode:isArticle?'article':'feed',
    status:initiallyLive?'LIVE':'DRAFT',lane:initiallyLive?'serving':'reference',review_state:initiallyLive?null:'needs-review',
    headline:`Synthetic acknowledgement ${kind}`,summary:'',body:isArticle?'The initial complete opening.\n\nThe initial complete ending.':submitted,
    sections:record?{packageRecord:record}:{},facts:record?{fallbackArchitectureV3:true}:{},target_date:null,
    provider:record?'tldrastro-fallback-architecture-v3':'manual-admin',event_type:record?'fallback-hook':'essay',block_type:record?'fallback_hook':'essay',
    source_snapshot:record?{sourcePackage:'tldrastro-fallback-architecture-v3',contentSystem:'fallback',review_status:'needs_review'}:{contentType:kind==='guide'?'guide':'article'},
    updated_at:'2026-10-15T12:00:00Z'};
  const store=await studioApiStore([source],{uuidIds:true});
  const action=initiallyLive?'publish-standalone-article-revision':kind==='initial-article'?'publish-owner-content':'approve-package-revision';
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});
  let held=false;
  const reader=async()=>{
    const result=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[key]}});
    expect(result.status).toBe(200);
    const row=result.payload.rows.find((row:any)=>row.content_key===key);
    return isArticle?row?.body:row?.sections?.packageRecord?.body_you;
  };
  try{
    await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    await routeStudioInventoryApi(page,{actualDocumentRoute:true,call:async request=>{
      const result=await store.call(request);
      const shouldHold=phase==='publication'?(request.body as any)?.ownerAction===action:!(request.body as any)?.ownerAction;
      if(!held&&request.method==='PATCH'&&shouldHold){
        expect(result.status).toBe(200);held=true;await gate;
      }
      return result;
    },answer:async(route,url)=>{
      if(url.pathname==='/api/admin/content-live-status'){
        await route.fulfill({json:{ok:true,statuses:await store.call({method:'statuses',body:route.request().postDataJSON()})}});return true;
      }
      if(url.pathname==='/api/content-reader'){
        const result=await store.call({method:'POST',url:url.pathname,body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;
      }
      return false;
    }});
    if(isArticle){
      await page.goto('/admin/content#articles-guides');
      await page.getByRole('row').filter({hasText:key}).getByRole('button',{name:'Edit',exact:true}).click();
    }else await page.goto('/admin/content#exact-content?from=unresolved&q='+encodeURIComponent(key));
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    const input=isArticle?editor.getByLabel('Article body',{exact:true}):editor.locator('[data-sky-field="body_you"]');
    if(isArticle)await input.fill(submitted);
    const beforePublication=await reader();
    const response=page.waitForResponse(response=>response.request().method()==='PATCH'&&response.request().postDataJSON()?.ownerAction===action);
    await editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save & publish',exact:true}).click();
    await expect.poll(()=>held).toBe(true);
    expect(await reader()).toBe(phase==='publication'?submitted:beforePublication);
    const editable=await input.isEditable();expect(editable).toBe(true);
    if(editable)await input.fill(newer);
    release();const completedResponse=await response;expect(completedResponse.status()).toBe(200);expect(await completedResponse.finished()).toBeNull();
    await expect(editor.getByRole('button',{name:'Close',exact:true})).toBeEnabled();
    const displayed=await input.inputValue();const published=await reader();
    const proof={kind,phase,publicationSucceeded:true,inputEditableWhilePending:editable,readerMatchesSubmitted:published===submitted,
      newerEditorTextRetained:editable?displayed===newer:null,submittedSha256:hash(submitted),newerSha256:hash(newer),displayedSha256:hash(displayed),publishedSha256:hash(published??'')};
    writePublicationAckProof(testInfo.outputPath('proof.json'),JSON.stringify(proof,null,2));
    expect(published).toBe(submitted);
    if(editable){
      await expect(input).toHaveValue(newer);
      const draftResponse=page.waitForResponse(response=>response.request().method()==='PATCH'&&!response.request().postDataJSON()?.ownerAction);
      await editor.getByRole('button',{name:isArticle?'Save draft':'Save held draft',exact:true}).click();
      const completedDraft=await draftResponse;expect(completedDraft.status()).toBe(200);expect(await completedDraft.finished()).toBeNull();
      await expect(editor.getByRole('button',{name:'Close',exact:true})).toBeEnabled();
      await expect(input).toHaveValue(newer);
      // A guided held-package save withdraws eligibility until explicit review;
      // standalone article revisions retain their separately published target.
      expect(await reader()).toBe(isArticle?submitted:undefined);
      if(isArticle){
        const rows=await store.call({method:'rows'});
        const target=rows.find((row:any)=>row.id===source.id);
        const proposal=rows.find((row:any)=>row.content_key===key&&row.status==='DRAFT'&&row.event_type==='standalone-article-revision');
        expect(target.status).toBe('LIVE');expect(target.body).toBe(submitted);
        expect(proposal?.body).toBe(newer);
        expect(proposal?.source_snapshot.targetRowId).toBe(target.id);
        expect(proposal?.source_snapshot.targetRowUpdatedAt).toBe(target.updated_at);
      }else{
        const saved=(await store.call({method:'rows'})).find((row:any)=>row.id===source.id);
        expect(saved.sections.packageRecord.body_you).toBe(submitted);
        expect(saved.sections.packageDraft.body_you).toBe(newer);
      }
      await page.reload();
      if(isArticle)await page.getByRole('row').filter({hasText:key}).filter({hasText:'Draft'}).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(editor).toBeVisible();
      await expect(input).toHaveValue(newer);expect(await reader()).toBe(isArticle?submitted:undefined);
      const publish=editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save & publish',exact:true});
      await expect(publish).toBeEnabled();
      const next=page.waitForResponse(response=>response.request().method()==='PATCH'&&['publish-standalone-article-revision','approve-package-revision','publish-owner-content'].includes(response.request().postDataJSON()?.ownerAction));
      await publish.click();const completedPublish=await next;expect(completedPublish.status()).toBe(200);expect(await completedPublish.finished()).toBeNull();
      await expect(editor.getByRole('button',{name:'Close',exact:true})).toBeEnabled();
      expect(await reader()).toBe(newer);
      await page.reload();
      if(isArticle)await page.getByRole('row').filter({hasText:key}).filter({hasText:'Live'}).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(editor).toBeVisible();
      await expect(input).toHaveValue(newer);
      expect(await reader()).toBe(newer);
      writePublicationAckProof(testInfo.outputPath('proof.json'),JSON.stringify({...proof,republicationSucceeded:true,reopenedNewerCopy:true},null,2));
    }
  }finally{release();await page.unrouteAll({behavior:'ignoreErrors'});store.close();}
});

});

// Ordinary package revisions use the same publication path across source editors.
for (const width of [390, 1440]) for (const colorScheme of ['light','dark'] as const) test(`Empty House private revision lifecycle ${width} ${colorScheme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.emulateMedia({colorScheme});
 test.setTimeout(90000);
 const key='fallback-hook/empty-house/base/1';
 const record={...structuredClone(servingPackageRecords.get(key)!),body_you:'Synthetic complete You source.',body_they:'Synthetic complete Friend source.',review_status:'needs_review'};
 const row={id:'11111111-1111-4111-8111-111111111111',content_key:key,headline:'Synthetic Empty House source',body:record.body_you,summary:'',surface:'sky',mode:'feed',status:'DRAFT',lane:'reference',review_state:'needs-review',target_date:null,provider:'tldrastro-fallback-architecture-v3',block_type:'fallback_hook',event_type:'fallback-hook',sections:{packageRecord:record},facts:{fallbackArchitectureV3:true},source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',contentSystem:'fallback',review_status:'needs_review'},updated_at:'2026-10-15T12:00:00Z'};
 const store=await studioApiStore([row],{publicationDb:true});
 try{
  await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','qa-secret');localStorage.setItem('tldrastro:studio-theme',theme);},colorScheme);
  await routeStudioInventoryApi(page,{call:store.call,actualDocumentRoute:true,answer:async(route,url)=>{
   if (!['/api/admin/content-live-status','/api/content-reader','/api/content-publications','/api/admin/content-history'].includes(url.pathname)) return false;
   const request=route.request(); const result=await store.call({method:request.method(),url:url.pathname+url.search,body:request.method()==='GET'?undefined:request.postDataJSON()});
   await route.fulfill({status:result.status,json:result.payload});return true;
  }});
  const open=async()=>{await page.goto('/admin/content#exact-content');await page.getByRole('row').filter({has:page.getByText(key,{exact:true})}).getByRole('button',{name:'Edit',exact:true}).click();};
  await open();
  const editor=page.getByRole('dialog',{name:'Generated content editor'});
  const field=editor.locator('[data-sky-field="body_you"]');
  await expect(field).toHaveValue(record.body_you);
  const a='Synthetic Empty House complete opening.\n\nSynthetic complete final sentence A.';
  await field.fill(a);
  await editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save draft',exact:true}).click();
  await expect.poll(async()=>((await store.call({method:'rows'}))[0].sections.packageDraft??(await store.call({method:'rows'}))[0].sections.packageRecord).body_you).toBe(a);
  await editor.getByRole('button',{name:'Close',exact:true}).click();await page.reload();await open();
  await expect(field).toHaveValue(a);
  const publish=editor.locator('.admin-editor-savebar').getByRole('button',{name:/^(Save & publish|Approve & publish)$/});
  await publish.click();
  await expect.poll(async()=>(await store.call({method:'rows'}))[0].status).toBe('LIVE');
  const read=()=>store.call({method:'POST',url:'/api/content-reader',body:{keys:[key]}});
  let reader=await read();expect(reader.status).toBe(200);expect(reader.payload.rows[0].sections.packageRecord.body_you).toBe(a);expect(reader.payload.rows[0].sections.packageRecord.body_they).toBe(record.body_they);
  const b=a+'\n\nSynthetic private revision B.';
  await field.fill(b);await editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save draft',exact:true}).click();
  await expect.poll(async()=> (await store.call({method:'rows'})).filter((r:any)=>r.mode==='studio-draft' && r.status==='DRAFT').length).toBe(1);
  await expect(field).toHaveValue(b);
  await editor.getByRole('button',{name:'Close',exact:true}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:/^Details for /})).toHaveCount(2);
  for (const details of await page.getByRole('button',{name:/^Details for /}).all()) await details.click();
  await page.getByRole('rowgroup').filter({has:page.getByText(key,{exact:true})}).filter({hasText:'Editorial stage: Draft'}).getByRole('button',{name:'Edit',exact:true}).click();
  await expect(field).toHaveValue(b);
  reader=await read();
  const privateRows=await store.call({method:'rows'}),publications=await store.call({method:'publications'});
  expect(privateRows.find((r:any)=>r.id===row.id)).toMatchObject({status:'LIVE',lane:'serving',review_state:null,sections:{packageRecord:{body_you:a,body_they:record.body_they}}});
  expect(publications.find((p:any)=>p.content_key===key).state).toBe('live');
  expect(reader.status).toBe(200);
  expect(reader.payload.rows).toHaveLength(1);
  expect(reader.payload.rows[0].sections.packageRecord.body_you).toBe(a);
  await publish.click();
  await expect.poll(async()=> (await read()).payload.rows[0].sections.packageRecord.body_you).toBe(b);
  await editor.locator('summary').filter({hasText:'More actions'}).click();await editor.getByRole('button',{name:'Archive source',exact:true}).click();
  await expect.poll(async()=> (await store.call({method:'rows'}))[0].status).toBe('ARCHIVED');
  reader=await read();expect(reader.status).toBe(200);expect(JSON.stringify(reader.payload)).not.toContain('Synthetic Empty House complete opening.');
 }finally{store.close();}
});

for (const key of [
  'fallback-hook/empty-house/base/1',
  'fallback-hook/placement-sign-lived/mars/aries',
  'fallback-hook/synastry-pair/sun/sun/conjunction'
]) test(`Package private revisions preserve publication and reject stale targets: ${key}`, async () => {
  test.setTimeout(90000);
  const a = 'Synthetic complete source A.\n\nComplete final sentence A.';
  const b = 'Synthetic private source B.\n\nComplete final sentence B.';
  const record = {...structuredClone(servingPackageRecords.get(key)!), body_you:a, body_they:'Synthetic complete Friend source.', review_status:'needs_review'};
  const id = '11111111-1111-4111-8111-111111111111';
  const store = await studioApiStore([{id, content_key:key, surface:'sky', mode:'feed', status:'DRAFT', lane:'reference', review_state:'needs-review', provider:'tldrastro-fallback-architecture-v3', headline:'Synthetic source', body:a, sections:{packageRecord:record}, facts:{fallbackArchitectureV3:true}, source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3', review_status:'needs_review'}, updated_at:'2026-10-15T12:00:00Z'}], {publicationDb:true});
  const rows = () => store.call({method:'rows'});
  const get = async (target=id) => (await rows()).find((r:any)=>r.id===target);
  const patch = (body:unknown) => store.call({method:'PATCH',body});
  const read = () => store.call({method:'POST',url:'/api/content-reader',body:{keys:[key]}});
  const save = async (r:any, copy:string, extras={}) => patch({id:r.id, expectedUpdatedAt:r.updated_at, ownerAuthoredWording:true, reviewStatus:'needs_review', sections:{...r.sections, packageDraft:{...(r.sections.packageDraft ?? r.sections.packageRecord), body_you:copy}}, ...extras});
  const publish = async (r:any) => patch({id:r.id,expectedUpdatedAt:r.updated_at,ownerAction:'approve-package-revision'});
  try {
    expect((await save(await get(),a)).status).toBe(200);
    expect((await publish(await get())).status).toBe(200);
    const baseline = await get();
    const pin = (await store.call({method:'publications'})).find((p:any)=>p.content_key===key);
    expect((await save(baseline,b,{contentKey:'fallback-hook/empty-house/base/2'})).status).toBe(409);
    const first = await save(baseline,b); expect(first.status).toBe(200);
    let revision = (await rows()).find((r:any)=>r.mode==='studio-draft');
    expect(revision).toMatchObject({status:'DRAFT',lane:'reference',review_state:'owner-review-required',event_type:'studio-package-source-draft',source_snapshot:{targetRowId:id,targetRowUpdatedAt:baseline.updated_at,targetContentKey:key},sections:{packageDraft:{body_you:b}}});
    expect(await get()).toEqual(baseline);
    expect((await store.call({method:'publications'})).find((p:any)=>p.content_key===key)).toEqual(pin);
    let reader = await read(); expect(reader.status).toBe(200); expect(reader.payload.rows).toHaveLength(1);
    expect(reader.payload.rows[0].sections.packageRecord).toMatchObject({body_you:a,body_they:record.body_they});
    expect(JSON.stringify(reader.payload)).not.toContain(b);
    // An independently opened canonical editor cannot overwrite the pending revision.
    expect((await save(baseline,'Synthetic conflicting private source.')).status).toBe(409);
    expect((await get(revision.id)).sections.packageDraft.body_you).toBe(b);
    expect((await save(revision,b,{contentKey:'fallback-hook/empty-house/base/2'})).status).toBe(409);
    expect((await save(revision,b,{sourceSnapshot:{...revision.source_snapshot,targetRowId:'22222222-2222-4222-8222-222222222222'}})).status).toBe(409);
    // Archiving only the unpublished proposal must not retire published A.
    expect((await patch({id:revision.id,expectedUpdatedAt:revision.updated_at,sourceLifecycleAction:'archive'})).status).toBe(200);
    reader=await read(); expect(reader.payload.rows).toHaveLength(1); expect(reader.payload.rows[0].sections.packageRecord.body_you).toBe(a);
    expect((await save(baseline,b)).status).toBe(200);
    revision=(await rows()).find((r:any)=>r.mode==='studio-draft');
    expect((await publish(revision)).status).toBe(200);
    reader=await read(); expect(reader.payload.rows).toHaveLength(1); expect(reader.payload.rows[0].sections.packageRecord).toMatchObject({body_you:b,body_they:record.body_they});
    // A newer publication invalidates the older proposal's saved target version.
    const live = await get();
    const completed = await get(revision.id);
    expect(completed).toMatchObject({status:'ARCHIVED',review_state:'published-revision'});
    expect((await save(completed,a)).status).toBe(200);
    revision=(await rows()).find((r:any)=>r.mode==='studio-draft');
    expect((await patch({id,expectedUpdatedAt:live.updated_at,reviewStatus:'approved',ownerAuthoredWording:true,reviewerNotes:'Synthetic newer source metadata.'})).status).toBe(200);
    expect((await publish(revision)).status).toBe(409);
    expect((await get(revision.id)).sections.packageDraft.body_you).toBe(a);
    reader=await read(); expect(reader.payload.rows[0].sections.packageRecord.body_you).toBe(b);
    const current=await get();
    expect((await patch({id,expectedUpdatedAt:current.updated_at,sourceLifecycleAction:'archive'})).status).toBe(200);
    reader=await read(); expect(reader.payload.rows).toHaveLength(0);
    expect((await store.call({method:'publications'})).find((p:any)=>p.content_key===key).state).toBe('retired');
  } finally { store.close(); }
});
