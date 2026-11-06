import {test,expect} from '@playwright/test';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {studioApiStore} from '../helpers/studio-api-store';
import {HOROSCOPE_SIGNS} from '../../src/shared/planetaryHoroscopes';

const typography=(element:Element)=>{const s=getComputedStyle(element);return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','marginTop','marginBottom','textTransform','textAlign'].map(k=>[k,s[k as keyof CSSStyleDeclaration]]));};
for(const width of [390,1440])for(const theme of ['light','dark'])test(`Generate, reload, review and publish twelve planetary readings ${width} ${theme}`,async({page})=>{
  const api=await studioApiStore([],{planetaryWriting:true});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    let failLookup=width===1440&&theme==='light';
    await routeStudioInventoryApi(page,{call:api.call,answer:async(route,url)=>{
      if(url.pathname!=='/api/admin/planetary-horoscope-writing')return false;
      if(failLookup&&url.searchParams.has('planet')){failLookup=false;await route.fulfill({status:503,json:{ok:false,error:'Synthetic event lookup unavailable.'}});return true;}
      const result=await api.call({method:route.request().method(),url:url.pathname+url.search,...(route.request().method()==='POST'?{body:route.request().postDataJSON()}:{})});
      await route.fulfill({status:result.status,json:result.payload});return true;
    }});
    await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:theme as 'light'|'dark'});
    await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
    await page.goto('/admin/content#horoscopes');
    const baseline=await page.getByRole('heading',{name:'Choose your horoscopes',exact:true}).evaluate(typography);
    if(width===390)await page.getByRole('button',{name:'Open Content Studio navigation',exact:true}).click();
    await page.getByRole('navigation',{name:'Content operations'}).getByRole('button',{name:'Planetary horoscopes',exact:true}).click();
    const studio=page.getByRole('region',{name:'Planetary horoscopes',exact:true});
    await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Planetary horoscopes');
    await expect(studio.getByRole('heading',{level:2})).toHaveText('Planetary horoscopes');
    expect(await studio.getByRole('heading',{level:2}).evaluate(typography)).toEqual(baseline);
    await expect(studio.getByText('No saved planetary horoscope sets yet.',{exact:true})).toBeHidden();
    await page.screenshot({path:`test-results/planetary-writer-empty-${width}-${theme}.png`,fullPage:true});
    await studio.getByLabel('Planet',{exact:true}).selectOption('mercury');await studio.getByLabel('A date during the visit',{exact:true}).fill('2026-11-05');await studio.getByLabel('Time zone',{exact:true}).fill('America/New_York');
    await studio.getByRole('button',{name:'Find planetary event',exact:true}).click();
    if(width===1440&&theme==='light'){await expect(studio.getByRole('alert')).toHaveText('Synthetic event lookup unavailable.');await studio.getByRole('button',{name:'Find planetary event',exact:true}).click();}
    await expect(studio.getByText(/Mercury in Scorpio ·/)).toBeVisible();expect(await api.call({method:'rows'})).toHaveLength(0);expect(await api.call({method:'provider-calls'})).toHaveLength(0);
    await studio.getByRole('button',{name:'Open planetary horoscopes',exact:true}).click();
    await expect(studio.getByRole('heading',{level:3})).toHaveText('Aries / Aries Rising · House 8');
    await studio.getByLabel('Direction for these readings',{exact:true}).fill('Synthetic private planetary writing direction.');await expect(studio.getByLabel('Complete horoscope',{exact:true})).toBeDisabled();await studio.getByRole('button',{name:'Review writing plan',exact:true}).click();
    const generate=studio.getByRole('button',{name:'Generate 12 planetary horoscopes',exact:true});await expect(generate).toBeDisabled();
    await studio.getByRole('checkbox',{name:'I have reviewed this event and authorize one AI request for all twelve draft readings.',exact:true}).check();await generate.click();
    await expect(studio.getByRole('status')).toContainText('Writing all twelve drafts');await expect(generate).toBeDisabled();
    await page.reload();await expect(studio.getByText('12/12 complete · Houses are calculated from the selected planetary sign.',{exact:true})).toBeVisible({timeout:30000});
    expect(await api.call({method:'provider-calls'})).toHaveLength(1);
    for(const sign of HOROSCOPE_SIGNS){await studio.getByRole('group',{name:'Planetary readings by sign'}).getByRole('button',{name:sign[0].toUpperCase()+sign.slice(1),exact:true}).click();await expect(studio.getByLabel('Complete horoscope',{exact:true})).toHaveValue(`Your synthetic ${sign} opening remains complete.\n\nYou keep the complete synthetic final sentence for ${sign}.`);}
    await studio.getByRole('group',{name:'Planetary readings by sign'}).getByRole('button',{name:'Aries',exact:true}).click();
    const exact='Your edited synthetic opening remains complete.\n\nYou keep the complete edited synthetic final sentence.';
    await studio.getByLabel('Complete horoscope',{exact:true}).fill(exact);
    if(width===1440&&theme==='light'){
      const row=(await api.call({method:'rows'}))[0];await api.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,reviewerNotes:'Synthetic concurrent metadata edit.'},url:'/api/admin/generated-content'});
      await studio.getByRole('button',{name:'Save 12 horoscopes as draft',exact:true}).click();await expect(studio.getByRole('alert')).toContainText('changed');await expect(studio.getByLabel('Complete horoscope',{exact:true})).toHaveValue(exact);
      page.once('dialog',dialog=>dialog.accept());await studio.getByRole('button',{name:'Reload saved version',exact:true}).click();await expect(studio.getByLabel('Complete horoscope',{exact:true})).not.toHaveValue(exact);await studio.getByLabel('Complete horoscope',{exact:true}).fill(exact);
    }
    await studio.getByRole('button',{name:'Save 12 horoscopes as draft',exact:true}).click();await expect(studio.getByRole('status')).toHaveText('All twelve readings are saved as a draft.');
    await page.reload();await expect(studio.getByLabel('Complete horoscope',{exact:true})).toHaveValue(exact);
    const approve=studio.getByRole('checkbox',{name:'I approve the complete wording of all twelve saved readings for this planetary event.',exact:true});await approve.check();await studio.getByRole('button',{name:'Publish planetary horoscopes',exact:true}).click();await expect(studio.getByRole('status')).toContainText('Published. All twelve readings');
    let rows=await api.call({method:'rows'}),live=rows.find((r:any)=>r.status==='LIVE');expect(live.sections.planetaryHoroscopes.passages[0].body).toBe(exact);
    const publicResult=await api.call({method:'POST',url:'/api/content-reader',body:{keys:[live.content_key]}});expect(publicResult.payload.rows[0].body).toBe(live.body);expect(JSON.stringify(publicResult.payload)).not.toContain('Synthetic private planetary writing direction.');
    await studio.getByLabel('Complete horoscope',{exact:true}).fill(exact+' Your new revision is private.');await studio.getByRole('button',{name:'Save 12 horoscopes as draft',exact:true}).click();
    await expect(studio.getByText('Draft revision · published readings remain available',{exact:true})).toBeVisible();rows=await api.call({method:'rows'});expect(rows.find((r:any)=>r.status==='LIVE').body).toBe(live.body);
    await approve.check();await studio.getByRole('button',{name:'Publish planetary horoscopes',exact:true}).click();await expect(studio.getByRole('status')).toContainText('Published. All twelve readings');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
    await page.screenshot({path:`test-results/planetary-writer-published-${width}-${theme}.png`,fullPage:true});
  }finally{api.close();}
});
