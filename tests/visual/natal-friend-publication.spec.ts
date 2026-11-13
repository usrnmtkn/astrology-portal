import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {studioApiStore} from '../helpers/studio-api-store';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {normalizeNatalPlacementPreviewInput,renderNatalPlacementPreviewState} from '../../api/admin/natal-placement-preview';

const key='fallback-hook/natal-you-placement-complete-final/chiron/taurus/12';
const source=JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json','utf8')).hookRows.find((row:any)=>row.contentKey===key);
for(const width of [390,1440]) test(`Studio saves and publishes separate complete Friend wording ${width}`,async({page})=>{
  test.setTimeout(90_000);
  const original=source.body;
  const store=await studioApiStore([{id:'fixture-complete-friend',content_key:key,surface:'you',mode:'in_depth',status:'LIVE',lane:'serving',review_state:null,
    provider:'tldrastro-fallback-architecture-v3',body:original,headline:'Chiron in Taurus in the twelfth house',summary:'',updated_at:'2026-10-25T12:00:00Z',
    sections:{packageRecord:source},facts:{fallbackArchitectureV3:true,review_status:'approved'},source_snapshot:{contentType:'fallback-system',review_status:'approved'}}]);
  try{
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
    await routeStudioInventoryApi(page,{call:store.call,answer:async(route,url)=>{
      if(url.pathname==='/api/admin/content-live-status'){
        await route.fulfill({json:{ok:true,statuses:await store.call({method:'statuses',body:route.request().postDataJSON()})}});return true;
      }
      if(url.pathname==='/api/admin/natal-placement-preview'){
        const input=route.request().postDataJSON();
        const rows=await store.call({method:'rows'});
        input.overrides=rows.map((row:any)=>({id:row.id,status:row.review_state?'DRAFT':row.status,lane:row.lane,provider:row.provider,updatedAt:row.updated_at,packageRow:row.sections.packageRecord}));
        await route.fulfill({json:{ok:true,...renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(input),await store.call({method:'publications'}))}});return true;
      }
      return false;
    }});
    await page.goto('/admin/content#exact-content?category=Natal+Chart&planet=chiron&sign=taurus&house=12');
    const card=page.locator('.admin-natal-source-card').filter({has:page.locator('code').filter({hasText:key})});
    await expect(card).toBeVisible();
    const friend=card.getByRole('textbox',{name:/: Friend copy$/});
    if(!await friend.count()){
      await card.getByRole('button',{name:/^(?:Load and edit|Edit source)$/}).click();
      const dialog=page.getByRole('dialog',{name:'Generated content editor'});
      await dialog.getByRole('button',{name:'Close',exact:true}).click();
    }
    await expect(friend).toHaveValue('');
    const body='{{ownerName}} complete Friend opening.\n\nThey retain the exact final paragraph.';
    await friend.fill(body);
    await card.getByRole('button',{name:'Save draft',exact:true}).click();
    await expect(card.getByRole('status')).toHaveText('Draft saved.');
    await page.reload();
    if(!await friend.count()){
      await card.getByRole('button',{name:/^(?:Load and edit|Edit source)$/}).click();
      await page.getByRole('dialog',{name:'Generated content editor'}).getByRole('button',{name:'Close',exact:true}).click();
    }
    await expect(friend).toHaveValue(body);
    await card.getByRole('button',{name:'Save & publish',exact:true}).click();
    await expect(card.getByRole('status')).toHaveText('Published. The reader preview will refresh.');
    const saved=(await store.call({method:'rows'})).find((row:any)=>row.content_key===key);
    expect(saved.sections.packageRecord.body).toBe(original);
    expect(saved.sections.packageRecord.body_they).toBe(body);
    expect(saved.sections.packageRecord.body_they_approval.approvalLevel).toBe('exact_owner_approved');
    await page.reload();
    await expect(card).toContainText(key);
    await page.screenshot({path:`test-results/studio-complete-friend-${width}.png`,fullPage:true});
  }finally{store.close();}
});

for (const width of [390,1440]) for (const kind of ['placement','empty-house'] as const) for (const failure of ['response','stall'] as const) {
  test(`Natal ${kind} reader preview recovers ${failure} without leaving the editor ${width}`, async ({page}) => {
    test.setTimeout(60_000);
    const store=await studioApiStore([]);
    let unavailable=failure==='response';
    let expectedParts:string[]=[];
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await page.setViewportSize({width,height:1000});
      await page.addInitScript(stall=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        const schedule=window.setTimeout.bind(window);
        window.setTimeout=((handler,timeout,...args)=>schedule(handler,timeout===45_000?1_000:timeout,...args)) as typeof window.setTimeout;
        (window as any).__stallNatalPreview=stall;
        const fetchRequest=window.fetch.bind(window);
        window.fetch=(input,options)=>{
          const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
          if (url.pathname==='/api/admin/natal-placement-preview'&&(window as any).__stallNatalPreview) {
            return new Promise<Response>((_resolve,reject)=>{
              const abort=()=>reject(new DOMException('Synthetic stalled preview was interrupted.','AbortError'));
              if(options?.signal?.aborted)abort();
              else options?.signal?.addEventListener('abort',abort,{once:true});
            });
          }
          return fetchRequest(input,options);
        };
      },failure==='stall');
      await routeStudioInventoryApi(page,{call:store.call,answer:async(route,url)=>{
        if(url.pathname!=='/api/admin/natal-placement-preview')return false;
        if(unavailable){
          await route.fulfill({status:503,json:{ok:false,error:'Synthetic reader preview unavailable.'}});
        }else{
          const input=route.request().postDataJSON();
          const result=renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(input),[]);
          expectedParts=kind==='empty-house'?[result.rendered.body]:result.rendered.parts;
          await route.fulfill({json:{ok:true,...result}});
        }
        return true;
      }});
      await page.goto(kind==='empty-house'
        ?'/admin/content#exact-content?category=Natal+Chart&natalView=empty-houses'
        :'/admin/content#exact-content?category=Natal+Chart&planet=neptune&sign=aquarius&house=12');
      const preview=page.locator(kind==='empty-house'?'.admin-empty-house-preview':'.admin-natal-reader-preview');
      const unavailableMessage=kind==='empty-house'?'Empty-house preview unavailable':'Reader preview unavailable';
      await expect(preview.getByText(unavailableMessage,{exact:true})).toBeVisible({timeout:8_000});
      if(failure==='stall')await expect(preview).toContainText('Loading content timed out. Try again; no changes were submitted.');
      const retry=preview.getByRole('button',{name:kind==='empty-house'?'Retry empty-house preview':'Retry reader preview',exact:true});
      await expect(retry).toBeVisible();
      unavailable=false;
      await page.evaluate(()=>{(window as any).__stallNatalPreview=false;});
      await retry.click();
      await expect.poll(async()=>{
        const actual=await preview.locator(kind==='empty-house'?'.admin-empty-house-assembly-copy > p':'.admin-natal-reader-preview-part > p').allTextContents();
        return expectedParts.length>0&&JSON.stringify(actual)===JSON.stringify(expectedParts);
      }).toBe(true);
      await expect(preview.getByText(unavailableMessage,{exact:true})).toBeHidden();
      expect(errors).toEqual([]);
      expect(await store.call({method:'rows'})).toEqual([]);
    }finally{store.close();}
  });
}
