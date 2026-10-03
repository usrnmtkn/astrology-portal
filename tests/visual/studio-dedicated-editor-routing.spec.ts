import {test,expect} from '@playwright/test';
import {studioApiStore} from '../helpers/studio-api-store';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../../apps/web/src/content/horoscopeEditions.mjs';

for(const width of [390,1440]){
  test(`Content Library opens and saves the selected horoscope edition ${width}`,async({page})=>{
    const store=await studioApiStore([]);
    try{
      const facts=await store.call({method:'GET',url:'/api/admin/generated-content?horoscopeBrief=true&period=monthly&date=2026-10-02&timeZone=America%2FNew_York'});
      expect(facts.status).toBe(200);
      const edition=emptyHoroscopeEdition(facts.payload.brief.window);
      edition.passages.forEach(p=>{p.headline=`Synthetic ${p.sign} reading`;p.body=`Saved ${p.sign} opening.\n\nSaved ${p.sign} conclusion.`;});
      const created=await store.call({method:'POST',body:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',targetDate:null,status:'DRAFT',lane:'serving',reviewState:null,headline:'Synthetic monthly edition',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:facts.payload.brief,signature:facts.payload.signature}},sourceSnapshot:{horoscopeOutlines:{}}}});
      expect(created.status).toBe(200);const id=created.payload.rows[0].id;
      await routeStudioInventoryApi(page,{call:store.call});
      await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
      await page.setViewportSize({width,height:1000});
      await page.goto('/admin/content#exact-content');
      await page.getByRole('row').filter({hasText:'Synthetic monthly edition'}).getByRole('button',{name:'Edit',exact:true}).click();
      const studio=page.getByRole('region',{name:'Horoscope editions',exact:true});
      await expect(studio.getByLabel('Complete reading')).toHaveValue(edition.passages[0].body);
      await expect(page.getByRole('dialog',{name:'Generated content editor'})).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`horoscopes\\?edition=${id}`));
      const edited='An exact synthetic edit.\n\nThe other readings stay intact.';
      await studio.getByLabel('Complete reading').fill(edited);
      await studio.getByRole('button',{name:'Save edition draft',exact:true}).click();
      await expect(studio.getByRole('status')).toHaveText('Saved edition draft.');
      await page.reload();await expect(studio.getByLabel('Complete reading')).toHaveValue(edited);
      const saved=(await store.call({method:'rows'})).find((row:any)=>row.id===id);
      expect(saved.sections.horoscopeEdition.passages.slice(1)).toEqual(edition.passages.slice(1));
      expect(saved.body).toBe(horoscopeEditionBody(saved.sections.horoscopeEdition));
      expect(saved.status).toBe('DRAFT');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    }finally{store.close();}
  });

  test(`Content Library opens and saves the selected dated lunar draft ${width}`,async({page})=>{
    const inventory=await studioApiStore([]),writer=await studioApiStore([],{lunationWriting:true});
    try{
      const events=await writer.call({method:'GET',url:'/api/admin/lunation-writing?month=2026-09&timeZone=America%2FNew_York'});
      expect(events.status).toBe(200);
      const created=await writer.call({method:'POST',body:{action:'prepare',month:'2026-09',timeZone:'America/New_York',eventId:events.payload.events[0].id,direction:''}});
      expect(created.status).toBe(200);let row=created.payload.rows[0];
      const saved=await writer.call({method:'POST',body:{action:'save',id:row.id,expectedUpdatedAt:row.updated_at,headline:'Synthetic selected lunar draft',body:'Exact original lunar draft.'}});
      expect(saved.status).toBe(200);row=saved.payload.rows[0];
      const unrelated=await writer.call({method:'POST',body:{action:'prepare',month:'2026-09',timeZone:'America/New_York',eventId:events.payload.events[1].id,direction:''}});
      expect(unrelated.status).toBe(200);
      await routeStudioInventoryApi(page,{call:async message=>message.method==='rows'?(await writer.call(message)).filter((r:any)=>r.content_key.startsWith('studio-lunation/')):inventory.call(message),answer:async(route,url)=>{
        if(url.pathname!=='/api/admin/lunation-writing')return false;
        const request=route.request();const result=await writer.call({method:request.method(),url:url.pathname+url.search,...(request.method()==='POST'?{body:request.postDataJSON()}:{})});
        await route.fulfill({status:result.status,json:result.payload});return true;
      }});
      await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture'));
      await page.setViewportSize({width,height:1000});
      await page.goto('/admin/content#exact-content');
      if(width===390)await page.getByRole('button',{name:'Filters',exact:true}).click();
      await page.getByRole('button',{name:'Show reference',exact:true}).click();
      await page.getByRole('row').filter({hasText:row.content_key}).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(page.getByLabel('Full article',{exact:true})).toHaveValue(row.body);
      await expect(page.getByRole('dialog',{name:'Generated content editor'})).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`draft=${row.id}`));
      const edit='Exact edited lunar draft.\n\nThis must survive reloading.';
      await page.getByLabel('Full article',{exact:true}).fill(edit);
      await page.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(page.getByText('Draft saved.',{exact:true})).toBeVisible();
      await page.reload();await expect(page.getByLabel('Full article',{exact:true})).toHaveValue(edit);
      const rows=await writer.call({method:'rows'});
      expect(rows.find((r:any)=>r.id===unrelated.payload.rows[0].id)).toEqual(unrelated.payload.rows[0]);
      expect((await writer.call({method:'provider'})).calls).toBe(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    }finally{inventory.close();writer.close();}
  });
}
