import {test,expect} from '@playwright/test';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {studioApiStore} from '../helpers/studio-api-store';

const typography=(element:Element)=>{
  const style=getComputedStyle(element);
  return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign'].map(key=>[key,style[key as keyof CSSStyleDeclaration]]));
};
for(const width of [390,1440])for(const theme of ['light','dark'] as const){
  test(`Lunation writer saves and recovers its draft at ${width} ${theme}`,async({page})=>{
    test.setTimeout(120000);
    const inventory=await studioApiStore([]),writer=await studioApiStore([],{lunationWriting:true});
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    try{
      await page.context().route('**/*',route=>new URL(route.request().url()).pathname.startsWith('/api/')?route.abort():route.continue());
      await routeStudioInventoryApi(page,{call:inventory.call,listRows:()=>[]});
      await page.route('**/api/admin/calendar-feed-events',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,events:[]})}));
      await page.route(/\/api\/admin\/(?:calendar-lunation-writing|lunation-writing)/,async route=>{
        const req=route.request(),result=await writer.call({method:req.method(),url:new URL(req.url()).pathname+new URL(req.url()).search,...(req.method()==='POST'?{body:req.postDataJSON()}:{})});
        await route.fulfill({status:result.status,contentType:'application/json',body:JSON.stringify(result.payload)});
      });
      await page.route(/\/api\/admin\/generated-content(?:-inventory)?(?:\?|$)/,async route=>{
        const url=new URL(route.request().url());
        if(route.request().method()!=='GET')return route.fallback();
        const keys=[url.searchParams.get('contentKey'),...url.searchParams.getAll('contentKeys')],id=url.searchParams.get('id');
        const saved=await writer.call({method:'rows'});
        const match=saved.filter((row:any)=>row.content_key.startsWith('cms/lunation-article/')&&(keys.includes(row.content_key)||id===row.id));
        if(!match.length)return route.fallback();
        return route.fulfill({json:{ok:true,rows:match,nextCursor:null}});
      });
      await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:theme});
      await page.addInitScript(value=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',value);},theme);
      await page.goto('/admin/content#calendar-writeups?view=subscription-events');
      const baseline=await page.getByRole('heading',{name:'Subscription events',exact:true}).evaluate(typography);
      if(width===390)await page.getByRole('button',{name:'Open Content Studio navigation',exact:true}).click();
      const nav=page.getByRole('navigation',{name:'Content operations'});
      await nav.getByRole('button',{name:'New & Full Moons & Eclipses',exact:true}).click();
      await page.getByRole('tab',{name:'Dated articles & eclipses',exact:true}).click();
      await expect(page).toHaveURL(/view=lunation-writing&writing=dated/);
      const workspace=page.getByRole('region',{name:'Lunation writing',exact:true});
      await expect(workspace.getByRole('heading',{level:2})).toHaveText('Dated articles & eclipses');
      expect(await workspace.getByRole('heading',{level:2}).evaluate(typography)).toEqual(baseline);
      await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Calendar Write-ups');
      await expect(workspace.getByRole('heading',{level:3})).toHaveText(['Saved drafts']);
      await expect(workspace.getByRole('button',{name:'Find events',exact:true})).toBeEnabled();
      await page.evaluate(()=>window.scrollTo(0,0));
      await expect(page.locator('.admin-dashboard-header h1')).toBeInViewport();
      await page.screenshot({path:`test-results/lunation-writer-empty-${width}-${theme}.png`,fullPage:true});
      await workspace.getByLabel('Month',{exact:true}).fill('2026-09');
      await workspace.getByLabel('Time zone',{exact:true}).fill('America/New_York');
      await workspace.getByRole('button',{name:'Find events',exact:true}).click();
      await expect(workspace.getByRole('combobox',{name:'Lunation',exact:true}).locator('option')).toHaveCount(3);
      await workspace.getByRole('combobox',{name:'Event type',exact:true}).selectOption('full-moon');
      await workspace.getByRole('combobox',{name:'Lunation',exact:true}).selectOption({label:'Full Moon in Aries · Saturday, September 26, 2026 at 12:49 PM'});
      await workspace.getByRole('button',{name:'Open writing plan',exact:true}).click();
      await expect(workspace.getByRole('heading',{level:3})).toHaveText(['Saved drafts','Full Moon in Aries']);
      await expect(workspace.getByRole('button',{name:'Generate draft',exact:true})).toBeDisabled();
      await workspace.getByLabel('Writing direction (optional)',{exact:true}).fill('Develop a concrete consequence with emotional nuance.');
      await workspace.getByRole('button',{name:'Update writing plan',exact:true}).click();
      await expect(workspace.getByText('Writing plan updated.',{exact:true})).toBeVisible();
      await workspace.getByRole('checkbox',{name:'I’ve reviewed this writing plan.'}).check();
      await workspace.getByLabel('Full article',{exact:true}).fill('An unsaved manual draft must not be overwritten.');
      await expect(workspace.getByRole('button',{name:'Generate draft',exact:true})).toBeDisabled();
      await workspace.getByRole('button',{name:'Update writing plan',exact:true}).click();
      await expect(workspace.getByLabel('Full article',{exact:true})).toHaveValue('An unsaved manual draft must not be overwritten.');
      await workspace.getByLabel('Full article',{exact:true}).fill('');
      await workspace.getByRole('checkbox',{name:'I’ve reviewed this writing plan.'}).check();
      await workspace.getByRole('button',{name:'Generate draft',exact:true}).click();
      await expect(workspace.getByLabel('Full article',{exact:true})).toHaveValue(/synthetic possibility/,{timeout:30000});
      const body=await workspace.getByLabel('Full article',{exact:true}).inputValue();
      const edit=body+'\n\nThis exact synthetic owner edit must survive reopening.';
      await workspace.getByLabel('Full article',{exact:true}).fill(edit);
      await workspace.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(workspace.getByText('Draft saved.',{exact:true})).toBeVisible();
      await page.evaluate(()=>window.scrollTo(0,0));
      await expect(page.locator('.admin-dashboard-header h1')).toBeInViewport();
      await page.screenshot({path:`test-results/lunation-writer-${width}-${theme}.png`,fullPage:true});
      await page.reload();
      await page.getByRole('region',{name:'Saved lunation drafts',exact:true}).getByRole('button',{name:'Synthetic lunar article',exact:true}).click();
      await expect(page.getByLabel('Full article',{exact:true})).toHaveValue(edit);
      await expect(page.getByRole('button',{name:'Generate draft',exact:true})).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
      await page.getByRole('button',{name:'Open reader draft',exact:true}).click();
      const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('textbox',{name:'Full lunar passage',exact:true})).toHaveValue(edit);
      await dialog.getByRole('button',{name:'Close',exact:true}).click();
      await page.getByLabel('Full article',{exact:true}).fill(edit+' Unsaved.');
      page.once('dialog',dialog=>dialog.dismiss());
      await page.getByRole('tab',{name:'Reusable sign readings',exact:true}).click();
      await expect(page.getByLabel('Full article',{exact:true})).toHaveValue(edit+' Unsaved.');
      page.once('dialog',dialog=>dialog.accept());
      await page.getByRole('tab',{name:'Reusable sign readings',exact:true}).click();
      await expect(page.getByRole('textbox',{name:'Voice and clarity',exact:true})).toHaveValue(/Synthetic shared guidance marker/);
      expect(errors).toEqual([]);
    }finally{inventory.close();writer.close();}
  });
}
