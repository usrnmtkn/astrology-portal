import {test,expect} from '@playwright/test';
import {fork} from 'node:child_process';
import path from 'node:path';
import {routeStudioInventoryApi} from '../helpers/studio-inventory-route';
import {getLunarCalendarMonth} from '../../apps/web/src/services/ephemeris';
import {createSeasonalPublicationFixture} from '../helpers/horoscope-publication-fixture.mts';

test.use({timezoneId:'America/New_York'});

for(const [width,theme] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']] as const){
 test(`Monthly overview: create, recover, review, publish, reload and seasonal navigation ${width} ${theme}`,async({page})=>{
  const child=fork(path.resolve('tests/helpers/sky-article-save-api.mts'),[],{env:{...process.env,HOROSCOPE_WRITER_FIXTURE:'1',ZODIAC_TEMPLATE_FIXTURE:'1'},execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});
  let sequence=0,stderr='';const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  child.stderr?.on('data',value=>stderr+=value);
  const ready=new Promise<void>((resolve,reject)=>{child.on('message',(m:any)=>{if(m.ready)return resolve();const task=pending.get(m.id);if(task){pending.delete(m.id);m.error?task.reject(new Error(m.error)):task.resolve(m.result);}});child.on('exit',code=>{const error=new Error(`Fixture exited ${code}: ${stderr}`);reject(error);pending.forEach(t=>t.reject(error));});});
  const call=(m:any)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});child.send({...m,id});});
  try{
   const location={label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'};
   const calendar=await getLunarCalendarMonth(location,new Date('2026-10-10T16:00:00Z'));
   await ready;await page.setViewportSize({width,height:1000});
   await page.clock.setFixedTime(new Date('2026-10-10T12:00:00Z'));
   await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:selectedLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'}));localStorage.setItem('tldrastro:horoscopeLocation',JSON.stringify({label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'}));},theme);
   let readerMode='normal';let release:()=>void=()=>{};let hold=false;
   await routeStudioInventoryApi(page,{call,answer:async(route,url)=>{
    if(url.pathname==='/api/calendar'){await route.fulfill({json:{ok:true,calendar}});return true;}
    const method=url.pathname==='/api/admin/horoscope-writing'?'writing':url.pathname==='/api/content-reader'?'reader':null;
    if(!method)return false;
    if(method==='reader'&&route.request().postDataJSON().horoscope&&readerMode==='error'){await route.fulfill({status:503,json:{error:'Fixture unavailable'}});return true;}
    if(method==='reader'&&hold){await new Promise<void>(r=>release=r);hold=false;}
    const result=await call({method,body:route.request().postDataJSON()});
    await route.fulfill({status:result.status,json:result.payload});return true;
   }});
   await page.goto('/admin/content#ai-writing');
   const profiles=page.getByRole('region',{name:'Horoscope writing profiles',exact:true});
   await expect(profiles.getByRole('heading',{name:'Weekly instructions',exact:true})).toBeVisible();
   await profiles.getByRole('button',{name:'Monthly',exact:true}).click();
   await expect(profiles.getByRole('heading',{name:'Monthly instructions',exact:true})).toBeVisible();
   const monthlyVoice=profiles.getByRole('textbox',{name:'Voice guidance',exact:true});
   await monthlyVoice.fill('Synthetic shared monthly voice instructions.');
   await profiles.getByRole('button',{name:'Save writing profile',exact:true}).click();
   await expect(profiles.getByText('Saved Monthly profile, revision 1.',{exact:true})).toBeVisible();
   await page.reload();await profiles.getByRole('button',{name:'Monthly',exact:true}).click();
   await expect(monthlyVoice).toHaveValue('Synthetic shared monthly voice instructions.');
   await page.goto('/admin/content#horoscopes');
   const studio=page.getByRole('region',{name:'Horoscope editions'});
   await studio.getByRole('button',{name:'Monthly',exact:true}).click();
   await expect(studio.getByText('One shared overview covers the first through the last day of this calendar month, for all zodiac signs.')).toBeVisible();
   await studio.getByLabel('Reference date').fill('2026-10-01');
   await studio.getByRole('button',{name:'Continue to writing plan',exact:true}).click();
   await expect(studio.getByRole('heading',{name:'Overview writing plan',exact:true})).toBeVisible();
   await expect(studio.getByText('0/1 readings ready',{exact:false})).toBeVisible();
   // An older unfinished edition should adopt a profile saved in another tab
   // when reopened. There is no extra refresh-profile action or prompt entry.
   const library=await call({method:'GET',url:'/api/admin/generated-content?writingProfiles=true'});
   const before=library.payload.profiles.find((p:any)=>p.profile.period==='monthly');
   const changed=await call({method:'POST',url:'/api/admin/generated-content?writingProfiles=true',body:{profile:{...before.profile,voiceGuidance:'Latest monthly instructions from the owner.'},expectedUpdatedAt:before.updatedAt}});
   expect(changed.status).toBe(200);
   await page.reload();await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/^Monthly horoscopes/}).click();
   await expect(studio.getByRole('heading',{name:'Overview writing plan',exact:true})).toBeVisible();
   await studio.getByText('Writing instructions · optional',{exact:true}).click();
   await expect(studio.getByText('Using your saved monthly instructions, revision 2. You can use these as they are.',{exact:true})).toBeVisible();
   await expect(studio.getByRole('button',{name:'Use latest saved instructions',exact:true})).toHaveCount(0);
   const refreshed=(await call({method:'rows'})).find((r:any)=>r.content_key.startsWith('horoscope/monthly/'));
   expect(refreshed.source_snapshot.studioWritingProfile).toEqual(changed.payload.profile);
   expect((await call({method:'writer-state'})).calls).toBe(0);
   await expect(studio.getByRole('button',{name:'Generate overview',exact:true})).toBeDisabled();
   await studio.getByLabel('I approve this writing plan for generation.').check();
   await expect(studio.getByText('Ready to write 1 draft. This uses 1 paid AI request and saves the results for review.')).toBeVisible();
   await studio.getByRole('button',{name:'Generate overview',exact:true}).click();
   const summary='You can read the complete monthly summary fixture.\n\nYour summary ends here.';
   const generated=`**TLDR**\n\n${summary}\n\n**The month ahead**\n\nYou can read the complete overview fixture opening.\n\nYour saved fixture ends here.`;
   const edited=generated.replace('You can read the complete overview fixture opening.','You can read the exact monthly fixture opening.').replace('Your saved fixture ends here.','Your complete monthly fixture ends here.');
   await expect(studio.getByLabel('Complete reading')).toHaveValue(generated);
   expect((await call({method:'writer-state'})).calls).toBe(1);
   await studio.getByLabel('Complete reading').fill(edited);
   await studio.getByRole('button',{name:'Continue to publish',exact:true}).click();
   await expect(studio.getByRole('button',{name:'Publish edition',exact:true})).toBeDisabled();
   await expect(studio.locator('strong').filter({hasText:/^(TLDR|The month ahead)$/})).toHaveText(['TLDR','The month ahead']);
   await expect(studio).toContainText('Your summary ends here.');
   const saved=(await call({method:'rows'})).find((r:any)=>r.content_key.startsWith('horoscope/monthly/'));
   expect(saved.status).toBe('DRAFT');
   await page.reload();await studio.getByText(/^Continue a saved edition/).click();await studio.getByRole('button',{name:/^Monthly horoscopes/}).click();
   await expect(studio.getByLabel('Complete reading')).toHaveValue(edited);
   await studio.getByRole('button',{name:'Continue to publish',exact:true}).click();
   await studio.getByLabel('I have reviewed and approve the exact wording of every saved reading in this edition.').check();
   await studio.getByRole('button',{name:'Publish edition',exact:true}).click();
   const link=studio.getByRole('link',{name:'Read published edition',exact:true});await expect(link).toBeVisible();
   const href=await link.getAttribute('href');expect(href).toContain('period=monthly');
   const season=await createSeasonalPublicationFixture(call);expect(season.status).toBe(200);
   const seasonalRow=season.payload.rows[0];
   expect((await call({method:'PATCH',body:{id:seasonalRow.id,expectedUpdatedAt:seasonalRow.updated_at,status:'LIVE'}})).status).toBe(200);
   await page.goto(href!);
   const overview=page.getByRole('article',{name:'Monthly overview',exact:true});
   await expect(overview.locator('strong')).toHaveText(['TLDR','The month ahead']);
   const paragraphs=overview.locator('p');
   await expect(paragraphs).toContainText(['TLDR','You can read the complete monthly summary fixture.','Your summary ends here.','The month ahead','You can read the exact monthly fixture opening.','Your complete monthly fixture ends here.']);
   // Section labels reuse the existing bold-paragraph treatment; they do not
   // create extra page headings or a new typography scale.
   const labels=await overview.locator('strong').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];}));
   expect(labels[0]).toEqual(labels[1]);
   const bodyStyle=await paragraphs.filter({hasText:'Your summary ends here.'}).evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.lineHeight,s.letterSpacing];});
   expect([labels[0][0],labels[0][1],labels[0][3],labels[0][4]]).toEqual(bodyStyle);
   await expect(overview).toContainText('You can read the exact monthly fixture opening.');await expect(overview).toContainText('Your complete monthly fixture ends here.');
   await expect(page.getByRole('group',{name:'Zodiac signs',exact:true})).toHaveCount(0);
   await expect(page.getByRole('button',{name:'October Horoscopes',exact:true})).toHaveAttribute('aria-pressed','true');
   await expect(page.getByRole('heading')).toHaveText(['Horoscopes','October 2026 Overview']);
   const headingStyle=await overview.locator('h2').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];});
   await page.reload();await expect(overview.locator('strong')).toHaveText(['TLDR','The month ahead']);await expect(overview).toContainText('Your complete monthly fixture ends here.');
   await page.screenshot({path:`test-results/monthly-overview-${width}-${theme}.png`,fullPage:true});
   await expect(page.getByRole('group',{name:'Horoscope period',exact:true}).getByRole('button')).toHaveText(['Today','This week','October Horoscopes','Libra Season']);
   await page.getByRole('button',{name:'Libra Season',exact:true}).click();
   await expect(page.getByRole('article',{name:'Season introduction'})).toContainText('Your fixture reading ends here.');
   await page.getByRole('button',{name:'Gemini & Gemini Rising',exact:true}).click();
   const gemini=page.getByRole('article',{name:'Gemini horoscope'});await expect(gemini).toContainText('You can read your gemini fixture opening.');
   expect(await gemini.locator('h2').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];})).toEqual(headingStyle);
   expect(await page.getByRole('article',{name:'Season introduction'}).locator('h2').evaluate(el=>{const s=getComputedStyle(el);return[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign];})).toEqual(headingStyle);
   await expect(page.getByRole('heading')).toHaveText(['Horoscopes','overview fixture','gemini fixture']);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/season-introduction-${width}-${theme}.png`,fullPage:true});
   readerMode='error';await page.getByRole('button',{name:'October Horoscopes',exact:true}).click();await expect(page.getByRole('alert')).toContainText('could not load');
   readerMode='normal';await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(overview).toContainText('Your complete monthly fixture ends here.');
   await page.getByRole('button',{name:'Today',exact:true}).click();await expect(page.getByRole('heading',{name:'No daily reading yet'})).toBeVisible();
   await expect(page.getByRole('button',{name:'Read Libra Season horoscope',exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:'Read this month’s overview',exact:true})).toBeVisible();
   hold=true;await page.getByRole('button',{name:'Read this month’s overview',exact:true}).click();
   await expect(page.getByText('Loading your horoscope…',{exact:true})).toBeVisible();release();
   await expect(overview).toContainText('Your complete monthly fixture ends here.');
   await page.goto('/?date=2026-10-10#calendar?view=month&date=2026-10-10');
   const calendarOverview=page.getByRole('region',{name:'Monthly overview',exact:true});
   await expect(calendarOverview.locator('strong')).toHaveText(['TLDR','The month ahead']);
   await expect(calendarOverview).toContainText('You can read the complete monthly summary fixture.');
   await expect(calendarOverview).toContainText('Your summary ends here.');
   await expect(calendarOverview).toContainText('You can read the exact monthly fixture opening.');
   await expect(calendarOverview).toContainText('Your complete monthly fixture ends here.');
   await expect(calendarOverview.getByRole('heading',{name:'Monthly overview',exact:true})).toHaveClass(/sr-only/);
   await calendarOverview.scrollIntoViewIfNeeded();
   await page.screenshot({path:`test-results/calendar-monthly-${width}-${theme}.png`,fullPage:true});
   await page.reload();await expect(calendarOverview).toContainText('Your complete monthly fixture ends here.');
   readerMode='error';await page.reload();await expect(calendarOverview).toContainText('The monthly overview couldn’t load.');
   readerMode='normal';await calendarOverview.getByRole('button',{name:'Try again',exact:true}).click();
   await expect(calendarOverview).toContainText('Your complete monthly fixture ends here.');
   expect((await call({method:'writer-state'})).calls).toBe(1);
   // Current navigation follows the reader's civil month, while a saved edition
   // keeps its own month after the calendar rolls forward.
   await page.clock.setFixedTime(new Date('2026-11-01T03:30:00Z'));
   await page.goto('/#horoscopes?period=monthly');
   await expect(page.getByRole('button',{name:'October Horoscopes',exact:true})).toHaveAttribute('aria-pressed','true');
   await page.clock.setFixedTime(new Date('2026-11-01T05:00:00Z'));
   await page.reload();
   await expect(page.getByRole('button',{name:'November Horoscopes',exact:true})).toHaveAttribute('aria-pressed','true');
   await expect(page.getByRole('heading',{name:'No monthly reading yet'})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.goto(href!);
   await expect(overview).toContainText('Your complete monthly fixture ends here.');
   await expect(page.getByRole('button',{name:'October Horoscopes',exact:true})).toHaveAttribute('aria-pressed','true');
  }finally{child.kill();}
 });
}
