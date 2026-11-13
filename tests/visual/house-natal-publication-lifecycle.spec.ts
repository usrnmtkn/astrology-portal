import {test,expect} from '@playwright/test';
import {servingPackageRecords} from '../../api/_lib/serving-package-records';
import {normalizeNatalPlacementPreviewInput,renderNatalPlacementPreviewState} from '../../api/admin/natal-placement-preview';
import {houseTransitSourceGroups} from '../../apps/admin/src/houseTransitSources';
import {studioApiStore} from '../helpers/studio-api-store';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {openEditorMoreActions} from '../helpers/studio-editor-actions';
import {syntheticPublicationPage} from '../helpers/synthetic-publication-page';
import {canonicalPublicationLedger,publicationLedgerTag} from '../../apps/web/src/services/publicationLedgerTransport';
import {isSkyListPublicationKey} from '../../apps/web/src/content/skyListPublicationScope';

const houseSelection={planet:'sun',sign:'aries',house:'1',motion:'direct'} as const;
const natalKey='fallback-hook/natal/planet-intro/neptune';
const natalSignKey='fallback-hook/natal-you-placement-sign-final/uranus/scorpio';
const copy=(family:string,index:number,audience:string,revision:string)=>`Synthetic ${family} ${index} ${audience} opening ${revision}.\n\nThe complete final ${audience} sentence ${revision}.`;

for(const width of [390,1440])for(const family of ['house','natal','natal-sign'] as const){
 test(`${family} complete private publication, archive and restoration ${width}`,async({page})=>{
  test.setTimeout(120_000);
  const usesBody=family==='natal-sign';
  const keys=family==='house'?houseTransitSourceGroups(houseSelection)[0].sources.map(source=>source.candidateKeys[0]):[usesBody?natalSignKey:natalKey];
  const seed=keys.map((key,index)=>({
   id:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,content_key:key,headline:`Synthetic ${family} source ${index}`,
   body:copy(family,index,'You','A'),summary:'',surface:family==='house'?'sky':'you',mode:family==='house'?'article':'in_depth',
   status:'DRAFT',lane:'reference',review_state:'needs-review',target_date:null,provider:'tldrastro-fallback-architecture-v3',
   block_type:'fallback_hook',event_type:family==='house'?'house-transit':'fallback-hook',
   sections:{packageRecord:{...structuredClone(servingPackageRecords.get(key)!),...(usesBody?{body:copy(family,index,'You','A')}:{body_you:copy(family,index,'You','A'),body_they:copy(family,index,'Friend','A')}),review_status:'needs_review'}},
   facts:{fallbackArchitectureV3:true,review_status:'needs_review'},source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',contentSystem:'fallback',review_status:'needs_review'},
   updated_at:'2026-11-12T12:00:00Z',created_at:'2026-11-12T12:00:00Z'
  }));
  const store=await studioApiStore(seed,{publicationDb:true});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const route=family==='house'?'/admin/content#sky-writeups?view=house-transits&motion=direct&transit=sun&sign=aries&transitHouse=1'
   :usesBody?'/admin/content#exact-content?category=Natal+Chart&planet=uranus&sign=scorpio&house=12'
    :'/admin/content#exact-content?category=Natal+Chart&planet=neptune&sign=aquarius';
  const read=()=>store.call({method:'POST',url:'/api/content-reader',body:{keys}});
  try{
   await page.setViewportSize({width,height:1000});
   await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','qa-secret'));
   await page.route('**/rest/v1/content_publications?**',async route=>{
    expect(route.request().method()).toBe('GET');
    await route.fulfill({json:syntheticPublicationPage(await store.call({method:'publications'}),new URL(route.request().url()).searchParams)});
   });
   await routeStudioInventoryApi(page,{call:store.call,actualDocumentRoute:true,actualBaselineRecovery:true,answer:async(route,url)=>{
    const request=route.request();
    if(url.pathname==='/api/content-publications'){
     const scoped=url.searchParams.get('scope')==='sky-list';
     const all=canonicalPublicationLedger(await store.call({method:'publications'}));
     const publications=scoped?all.filter(row=>isSkyListPublicationKey(row.content_key)):all;
     await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:scoped?'tldr-sky-list-publications/v1':'tldr-publications/v1',publications}});return true;
    }
    if(url.pathname==='/api/admin/natal-placement-preview'){
     try{
      const input=request.postDataJSON();
      input.overrides=(await store.call({method:'rows'})).map((row:any)=>({id:row.id,status:row.review_state?'DRAFT':row.status,lane:row.lane,provider:row.provider,updatedAt:row.updated_at,packageRow:row.sections.packageRecord}));
      const result=renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(input),await store.call({method:'publications'}));
      await route.fulfill({json:{ok:true,...result}});
     }catch(error){await route.fulfill({status:503,json:{ok:false,error:error instanceof Error?error.message:'Synthetic preview unavailable.'}});}
     return true;
    }
    if(!['/api/admin/content-live-status','/api/content-reader','/api/content-publications','/api/admin/content-history','/api/admin/content-baseline-recovery','/api/admin/content-publication'].includes(url.pathname))return false;
    const result=await store.call({method:request.method(),url:url.pathname+url.search,body:request.method()==='GET'?undefined:request.postDataJSON()});
    await route.fulfill({status:result.status,json:result.payload});return true;
   }});
   await page.goto(route);
   const region=family==='house'?page.getByRole('dialog',{name:'House Transit write-up editor',exact:true})
    :page.locator('.admin-natal-source-card').filter({has:page.locator('code').filter({hasText:keys[0]})});
   const open=async()=>{if(family==='house')await page.getByRole('button',{name:'Edit complete write-up',exact:true}).click();await expect(region).toBeVisible();};
   await open();
   const fill=async(audience:'You'|'Friend',revision:string)=>{
    if(family==='house')await region.getByRole('tab',{name:audience==='You'?'You':'Friends',exact:true}).click();
    const field=family==='house'?region.getByRole('textbox',{name:`${houseTransitSourceGroups(houseSelection)[0].sources[0].label} — ${audience==='You'?'You':'Friends'} copy`,exact:true})
     :region.getByRole('textbox',{name:new RegExp(`: ${audience} copy$`)});
    await field.fill(copy(family,0,audience,revision));
   };
   const publish=region.getByRole('button',{name:'Save & publish',exact:true});
   await publish.click();
   await expect.poll(async()=>{const r=await read();return r.payload.rows?.length;}).toBe(keys.length);
   const a=await read();
   for(const row of a.payload.rows){
    const index=keys.indexOf(row.content_key);
    expect(row.sections.packageRecord[usesBody?'body':'body_you']).toBe(copy(family,index,'You','A'));
    if(!usesBody)expect(row.sections.packageRecord.body_they).toBe(copy(family,index,'Friend','A'));
   }
   await fill('You','B');if(!usesBody)await fill('Friend','B');
   await region.getByRole('button',{name:'Save draft',exact:true}).click();
   await expect.poll(async()=>(await store.call({method:'rows'})).filter((r:any)=>r.mode==='studio-draft'&&r.status==='DRAFT').length).toBe(1);
   expect((await read()).payload.rows).toEqual(a.payload.rows);
   await page.reload();await open();
   for(const audience of (usesBody?['You']:['You','Friend']) as Array<'You'|'Friend'>){
    if(family==='house')await region.getByRole('tab',{name:audience==='You'?'You':'Friends',exact:true}).click();
    const field=family==='house'?region.getByRole('textbox',{name:`${houseTransitSourceGroups(houseSelection)[0].sources[0].label} — ${audience==='You'?'You':'Friends'} copy`,exact:true})
     :region.getByRole('textbox',{name:new RegExp(`: ${audience} copy$`)});
    await expect(field).toHaveValue(copy(family,0,audience,'B'));
   }
   expect((await read()).payload.rows).toEqual(a.payload.rows);
   await publish.click();
   const hasB=async()=>{const r=await read();const row=r.payload.rows?.find((row:any)=>row.content_key===keys[0]);return row?.sections.packageRecord[usesBody?'body':'body_you']===copy(family,0,'You','B')&&(usesBody||row?.sections.packageRecord.body_they===copy(family,0,'Friend','B'));};
   await expect.poll(hasB).toBe(true);
   if(family==='house')await region.getByRole('button',{name:/^Close/}).click();
   await page.goto(`/admin/content#exact-content?q=${encodeURIComponent(keys[0])}`);
   const entry=page.getByRole('row').filter({has:page.getByText(keys[0],{exact:true})});
   await entry.getByRole('button',{name:'Edit',exact:true}).click();
   const editor=page.getByRole('dialog',{name:'Generated content editor',exact:true});
   await openEditorMoreActions(editor);
   await editor.getByRole('button',{name:'Archive source',exact:true}).click();
   await expect.poll(async()=>(await store.call({method:'rows'})).find((row:any)=>row.id===seed[0].id)?.status).toBe('ARCHIVED');
   expect((await read()).payload.rows.some((row:any)=>row.content_key===keys[0])).toBe(false);
   await editor.getByRole('button',{name:'Restore as draft',exact:true}).click();
   await expect.poll(async()=>(await store.call({method:'rows'})).find((row:any)=>row.id===seed[0].id)?.status).toBe('DRAFT');
   expect((await read()).payload.rows.some((row:any)=>row.content_key===keys[0])).toBe(false);
   await editor.locator('.admin-editor-savebar').getByRole('button',{name:/^(Save & publish|Approve & publish)$/}).click();
   await expect.poll(hasB).toBe(true);
   await openEditorMoreActions(editor);
   await editor.getByRole('button',{name:'Retire everywhere',exact:true}).click();
   await expect.poll(async()=>(await store.call({method:'publications'})).find((row:any)=>row.content_key===keys[0])?.state).toBe('retired');
   await editor.getByRole('button',{name:'Publish again',exact:true}).click();
   await expect.poll(hasB).toBe(true);
   const recovery=editor.getByRole('button',{name:'Use approved source',exact:true});
   await expect(recovery).toBeEnabled();await recovery.click();
   await editor.getByRole('button',{name:'Restore approved source',exact:true}).click();
   await expect(editor.getByRole('alert')).toContainText('The approved source or publication changed. Review it again before restoring.');
   expect((await store.call({method:'rows'})).find((row:any)=>row.id===seed[0].id).status).toBe('LIVE');
   expect((await store.call({method:'publications'})).find((row:any)=>row.content_key===keys[0]).row_id).toBe(seed[0].id);
   await editor.getByRole('button',{name:'Review recovery again',exact:true}).click();
   await expect(recovery).toBeEnabled();await recovery.click();
   await editor.getByRole('button',{name:'Restore approved source',exact:true}).click();
   await expect.poll(async()=>{const p=(await store.call({method:'publications'})).find((row:any)=>row.content_key===keys[0]);return p?.state==='live'&&p.row_id===null&&p.row_updated_at===null;}).toBe(true);
   const restored=(await store.call({method:'rows'})).find((row:any)=>row.id===seed[0].id);
   expect(restored.status).toBe('ARCHIVED');
   expect(restored.sections.packageRecord[usesBody?'body':'body_you']).toBe(copy(family,0,'You','B'));
   if(!usesBody)expect(restored.sections.packageRecord.body_they).toBe(copy(family,0,'Friend','B'));
   if(family==='house')expect((await read()).payload.rows.find((row:any)=>row.content_key===keys[1])).toEqual(a.payload.rows.find((row:any)=>row.content_key===keys[1]));
   else{
    const input=normalizeNatalPlacementPreviewInput(usesBody?{planet:'uranus',sign:'scorpio',house:'12',overrides:[]}:{planet:'neptune',sign:'aquarius',overrides:[]});
    const baseline=renderNatalPlacementPreviewState(input,[]).rendered.parts;
    await page.goto(route);
    await expect.poll(async()=>JSON.stringify(await page.locator('.admin-natal-reader-preview-part > p').allTextContents())===JSON.stringify(baseline)).toBe(true);
   }
   expect(errors).toEqual([]);
  }finally{store.close();}
 });
}
