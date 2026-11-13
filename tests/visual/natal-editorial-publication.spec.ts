import {test,expect} from '@playwright/test';
import {natalEditorialDraftForKey} from '../../apps/admin/src/natalEditorialLibrary';
import {studioApiStore} from '../helpers/studio-api-store';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {syntheticPublicationPage} from '../helpers/synthetic-publication-page';
import {canonicalPublicationLedger,publicationLedgerTag} from '../../apps/web/src/services/publicationLedgerTransport';
import {isSkyListPublicationKey} from '../../apps/web/src/content/skyListPublicationScope';
import {openEditorMoreActions} from '../helpers/studio-editor-actions';

const selections=[
 {key:'cms/natal-twelfth-ruler/they/ruler-house/6',query:'natalView=rulership&natalAudience=they&natalPassage=6',region:'Twelfth-house rulership'},
 {key:'cms/natal-chart-context/you/sect/day',query:'natalView=day-night&natalAudience=you&natalPassage=overview&natalSect=day',region:'Day and night charts'},
 {key:'cms/natal-planet-sect/you/jupiter/day',query:'natalView=day-night&natalAudience=you&natalPassage=jupiter&natalSect=day',region:'Day and night charts'},
 {key:'cms/natal-planet-sect/they/saturn/aries/night',query:'natalView=day-night&natalAudience=they&natalPassage=saturn&natalSect=night&natalSign=aries',region:'Day and night charts'}
];

for(const width of [390,1440])for(const selection of selections){
 test(`Natal editorial preserves public copy and reopens private revision ${selection.key} ${width}`,async({page})=>{
  test.setTimeout(90_000);
  const draft=natalEditorialDraftForKey(selection.key)!;
  const a='Synthetic complete editorial opening A.\n\nSynthetic complete editorial ending A.';
  const b='Synthetic complete private opening B.\n\nSynthetic complete private ending B.';
  const seed={id:'00000000-0000-4000-8000-000000000101',content_key:draft.contentKey,headline:draft.headline,body:a,summary:'',
   surface:draft.surface,mode:draft.mode,status:'DRAFT',lane:draft.lane,review_state:draft.reviewState,block_type:draft.blockType,event_type:draft.eventType,
   target_date:null,provider:'manual-admin',sections:draft.sections,facts:draft.facts,source_snapshot:draft.sourceSnapshot,
   updated_at:'2026-11-12T12:00:00Z',created_at:'2026-11-12T12:00:00Z'};
  const store=await studioApiStore([seed],{publicationDb:true});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const read=()=>store.call({method:'POST',url:'/api/content-reader',body:{keys:[selection.key]}});
  try{
   await page.setViewportSize({width,height:1000});
   await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','qa-secret'));
   await page.route('**/rest/v1/content_publications?**',async route=>{
    expect(route.request().method()).toBe('GET');
    await route.fulfill({json:syntheticPublicationPage(await store.call({method:'publications'}),new URL(route.request().url()).searchParams)});
   });
   await routeStudioInventoryApi(page,{call:store.call,actualDocumentRoute:true,actualBaselineRecovery:true,answer:async(route,url)=>{
    if(url.pathname==='/api/content-publications'){
     const scoped=url.searchParams.get('scope')==='sky-list';
     const all=canonicalPublicationLedger(await store.call({method:'publications'}));
     const publications=scoped?all.filter(row=>isSkyListPublicationKey(row.content_key)):all;
     await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:scoped?'tldr-sky-list-publications/v1':'tldr-publications/v1',publications}});return true;
    }
    if(!['/api/admin/content-live-status','/api/content-reader','/api/admin/content-history','/api/admin/content-baseline-recovery','/api/admin/content-publication'].includes(url.pathname))return false;
    const request=route.request();const result=await store.call({method:request.method(),url:url.pathname+url.search,body:request.method()==='GET'?undefined:request.postDataJSON()});
    await route.fulfill({status:result.status,json:result.payload});return true;
   }});
   const url=`/admin/content#exact-content?category=Natal+Chart&${selection.query}`;
   await page.goto(url);
   const workspace=page.getByRole('region',{name:selection.region,exact:true});
   await workspace.getByRole('button',{name:'Edit saved passage',exact:true}).click();
   const editor=page.getByRole('dialog',{name:'Generated content editor',exact:true});
   const field=editor.getByLabel('Full passage / body',{exact:true});
   await expect(field).toHaveValue(a);
   const publish=editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save & publish',exact:true});
   await expect(publish).toBeEnabled();await publish.click();
   await expect.poll(async()=>(await read()).payload.rows?.[0]?.body).toBe(a);
   const live=(await store.call({method:'rows'})).find((row:any)=>row.id===seed.id);
   await field.fill(b);
   await editor.locator('.admin-editor-savebar').getByRole('button',{name:'Save draft',exact:true}).click();
   await expect.poll(async()=>(await store.call({method:'rows'})).filter((row:any)=>row.mode==='studio-draft'&&row.status==='DRAFT').length).toBe(1);
   expect((await read()).payload.rows[0].body).toBe(a);
   expect((await store.call({method:'rows'})).find((row:any)=>row.id===seed.id)).toEqual(live);
   await editor.getByRole('button',{name:'Close',exact:true}).click();
   await page.reload();
   await workspace.getByRole('button',{name:'Edit saved passage',exact:true}).click();
   await expect(field).toHaveValue(b);expect((await read()).payload.rows[0].body).toBe(a);
   await expect(publish).toBeEnabled();await publish.click();
   await expect.poll(async()=>(await read()).payload.rows?.[0]?.body).toBe(b);
   const updated=(await store.call({method:'rows'})).find((row:any)=>row.id===seed.id);
   expect(updated.facts).toEqual(live.facts);expect(updated.mode).toBe('in_depth');expect(updated.event_type).toBe(live.event_type);
   await openEditorMoreActions(editor);await editor.getByRole('button',{name:'Archive source',exact:true}).click();
   await expect.poll(async()=>(await store.call({method:'rows'})).find((row:any)=>row.id===seed.id)?.status).toBe('ARCHIVED');
   expect((await read()).payload.rows).toHaveLength(0);
   await editor.getByRole('button',{name:'Restore as draft',exact:true}).click();
   await expect.poll(async()=>(await store.call({method:'rows'})).find((row:any)=>row.id===seed.id)?.status).toBe('DRAFT');
   expect((await read()).payload.rows).toHaveLength(0);
   await publish.click();await expect.poll(async()=>(await read()).payload.rows?.[0]?.body).toBe(b);
   await page.reload();await workspace.getByRole('button',{name:'Edit saved passage',exact:true}).click();
   await expect(field).toHaveValue(b);expect(errors).toEqual([]);
  }finally{await page.close();store.close();}
 });
}
