import {test,expect} from '@playwright/test';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {studioApiStore} from '../helpers/studio-api-store';

const typography=(element:Element)=>{
  const style=getComputedStyle(element);
  return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign'].map(key=>[key,style[key as keyof CSSStyleDeclaration]]));
};
for(const width of [390,1440])for(const theme of ['light','dark'] as const){
  test(`Lunation writer saves and recovers its draft at ${width} ${theme}`,async({page})=>{
    test.setTimeout(240000);
    const inventory=await studioApiStore([]),writer=await studioApiStore([],{lunationWriting:true});
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    const disabledDuringPoll:boolean[]=[];
    try{
      await page.context().route('**/*',route=>new URL(route.request().url()).pathname.startsWith('/api/')?route.abort():route.continue());
      await routeStudioInventoryApi(page,{call:inventory.call,listRows:()=>[]});
      await page.route('**/api/admin/calendar-feed-events',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,events:[]})}));
      await page.route(/\/api\/admin\/(?:calendar-lunation-writing|lunation-writing)/,async route=>{
        if(route.request().method()==='POST'&&route.request().postDataJSON()?.action==='poll'){
          disabledDuringPoll.push(await page.getByRole('button',{name:'Edit shared writing guidance',exact:true}).isDisabled());
        }
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
      await expect(page.getByRole('tab',{name:'Dated articles & eclipses',exact:true})).toHaveAttribute('aria-selected','true');
      await expect(page).toHaveURL(/view=lunation-writing/);
      const workspace=page.getByRole('region',{name:'Lunation writing',exact:true});
      await expect(workspace.getByRole('heading',{level:2})).toHaveText('Dated articles & eclipses');
      expect(await workspace.getByRole('heading',{level:2}).evaluate(typography)).toEqual(baseline);
      await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Calendar Write-ups');
      await expect(workspace.getByRole('heading',{level:3})).toHaveText(['1. Choose a Moon or eclipse','Saved drafts']);
      await expect(workspace.getByRole('button',{name:'Refresh events',exact:true})).toBeEnabled();
      expect(await workspace.getByRole('heading',{name:'1. Choose a Moon or eclipse',exact:true}).evaluate(typography)).toEqual(await workspace.getByRole('heading',{name:'Saved drafts',exact:true}).evaluate(typography));
      await page.evaluate(()=>window.scrollTo(0,0));
      await expect(page.locator('.admin-dashboard-header h1')).toBeInViewport();
      await page.screenshot({path:`test-results/lunation-writer-empty-${width}-${theme}.png`,fullPage:true});
      await workspace.getByLabel('Month',{exact:true}).fill('2026-09');
      await workspace.getByLabel('Time zone',{exact:true}).fill('America/New_York');
      await expect(workspace.getByRole('button',{name:'Write Full Moon in Aries',exact:true})).toBeVisible();
      await workspace.getByRole('combobox',{name:'Event type',exact:true}).selectOption('full-moon');
      await workspace.getByLabel('Month',{exact:true}).fill('2026-08');
      await workspace.getByRole('combobox',{name:'Event type',exact:true}).selectOption('eclipses');
      await expect(workspace.getByRole('button',{name:/^Write .* Eclipse in /})).toHaveCount(2);
      await workspace.getByLabel('Month',{exact:true}).fill('2026-09');
      await expect(workspace.getByText('No matching events in this month. Choose another month or select All lunations.',{exact:true})).toBeVisible();
      await workspace.getByRole('combobox',{name:'Event type',exact:true}).selectOption('full-moon');
      await workspace.getByRole('button',{name:'Write Full Moon in Aries',exact:true}).click();
      await expect(workspace.getByRole('region',{name:'Selected lunation draft',exact:true})).toBeFocused();
      await expect(workspace.getByRole('heading',{level:3})).toHaveText(['1. Choose a Moon or eclipse','Full Moon in Aries','Saved drafts']);
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
      await writer.call({method:'provider',body:{pending:true}});
      await workspace.getByRole('button',{name:'Generate draft',exact:true}).click();
      await expect(workspace.getByText('Writing your article…',{exact:true})).toBeVisible();
      await expect(workspace.getByLabel('Article generation progress',{exact:true})).toBeFocused();
      await expect(workspace.getByLabel('Full article',{exact:true})).toHaveCount(0);
      await expect.poll(async()=>(await writer.call({method:'provider'})).polls).toBeGreaterThanOrEqual(3);
      expect(disabledDuringPoll.length).toBeGreaterThanOrEqual(3);
      expect(disabledDuringPoll.every(disabled=>!disabled)).toBe(true);
      await page.screenshot({path:`test-results/lunation-writer-progress-${width}-${theme}.png`,fullPage:true});
      // The paid request survives a reload and a transient retrieval error.
      await page.reload();
      await page.getByRole('region',{name:'Saved lunation drafts',exact:true}).getByRole('button',{name:'Full Moon in Aries',exact:true}).click();
      await expect(workspace.getByText('Writing your article…',{exact:true})).toBeVisible();
      await writer.call({method:'provider',body:{pollFailures:1}});
      await expect(workspace.getByText('Progress checks paused.',{exact:true})).toBeVisible();
      await expect(workspace.getByRole('alert')).toContainText('The writer result is temporarily unavailable.');
      expect((await writer.call({method:'provider'})).calls).toBe(1);
      if(width===1440&&theme==='light'){
        // A terminal provider failure must restore the editor, not leave a
        // stale Retrieve loop after the server has cleared the operation.
        await writer.call({method:'provider',body:{terminalStatus:'failed'}});
        await workspace.getByRole('button',{name:'Check again',exact:true}).click();
        await expect(workspace.getByRole('alert')).toContainText('The writer did not complete a usable article.');
        await expect(workspace.getByLabel('Article generation progress',{exact:true})).toHaveCount(0);
        await expect(workspace.getByRole('region',{name:'Selected lunation draft',exact:true})).toBeFocused();
        await writer.call({method:'provider',body:{pending:false,terminalStatus:''}});
        await workspace.getByRole('checkbox',{name:'I’ve reviewed this writing plan.'}).check();
        await workspace.getByRole('button',{name:'Generate draft',exact:true}).click();
      }else{
        await writer.call({method:'provider',body:{pending:false}});
        if(width===1440&&theme==='dark'){
          // Another tab can retrieve and save the completed request while this
          // tab is paused. Check again must reload its current version first.
          const saved=(await writer.call({method:'rows'})).find((row:any)=>row.content_key.startsWith('studio-lunation/'));
          const completed=await writer.call({method:'POST',body:{action:'poll',id:saved.id,expectedUpdatedAt:saved.updated_at}});
          expect(completed.status).toBe(200);
        }
        await workspace.getByRole('button',{name:'Check again',exact:true}).click();
      }
      await expect(workspace.getByLabel('Full article',{exact:true})).toHaveValue(/synthetic possibility/,{timeout:30000});
      await expect(workspace.getByLabel('Full article',{exact:true})).toBeFocused();
      expect((await writer.call({method:'provider'})).calls).toBe(width===1440&&theme==='light'?2:1);
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
      const beforeRejection=(await writer.call({method:'provider'})).calls;
      await workspace.getByRole('button',{name:'Reject & regenerate',exact:true}).click();
      await expect(workspace.getByRole('button',{name:'Reject draft & update plan',exact:true})).toBeDisabled();
      await expect(workspace.getByLabel('Reason for rejection',{exact:true})).toBeFocused();
      await workspace.getByRole('button',{name:'Cancel rejection',exact:true}).click();
      await expect(workspace.getByLabel('Full article',{exact:true})).toHaveValue(edit);
      await workspace.getByLabel('Full article',{exact:true}).fill(edit+' Unsaved edit.');
      await expect(workspace.getByRole('button',{name:'Reject & regenerate',exact:true})).toBeDisabled();
      await workspace.getByLabel('Full article',{exact:true}).fill(edit);
      await workspace.getByRole('button',{name:'Reject & regenerate',exact:true}).click();
      const rejectionReason='Synthetic correction: begin with the calculated date and explain both signs.';
      await workspace.getByLabel('Reason for rejection',{exact:true}).fill(rejectionReason);
      await page.screenshot({path:`test-results/lunation-reject-${width}-${theme}.png`,fullPage:true});
      await workspace.getByRole('button',{name:'Reject draft & update plan',exact:true}).click();
      await expect(workspace.getByText('Draft rejected and preserved. Review the updated plan, then select Regenerate draft.',{exact:true})).toBeVisible();
      await expect(workspace.getByRole('button',{name:'Regenerate draft',exact:true})).toBeDisabled();
      expect((await writer.call({method:'provider'})).calls).toBe(beforeRejection);
      await page.reload();
      await page.getByRole('region',{name:'Saved lunation drafts',exact:true}).getByRole('button',{name:'Full Moon in Aries',exact:true}).click();
      await workspace.getByText('Rejected drafts (1)',{exact:true}).click();
      await workspace.getByText(/^Synthetic lunar article · /).click();
      const rejectedHistory=workspace.locator('details').filter({has:page.getByText('Rejected drafts (1)',{exact:true})});
      await expect(rejectedHistory.getByLabel('Rejected article',{exact:true})).toHaveValue(edit);
      await expect(rejectedHistory.getByText(rejectionReason,{exact:true})).toBeVisible();
      await expect(workspace.getByRole('button',{name:'Regenerate draft',exact:true})).toBeDisabled();
      await workspace.getByRole('checkbox',{name:'I’ve reviewed this writing plan.'}).check();
      await workspace.getByRole('button',{name:'Regenerate draft',exact:true}).click();
      await expect(workspace.getByLabel('Full article',{exact:true})).toHaveValue(body,{timeout:30000});
      expect((await writer.call({method:'provider'})).calls).toBe(beforeRejection+1);
      expect((await writer.call({method:'provider'})).requests.at(-1).input).toContain(rejectionReason);
      await workspace.getByLabel('Full article',{exact:true}).fill(edit);
      await workspace.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(workspace.getByText('Draft saved.',{exact:true})).toBeVisible();
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
