import {test,expect,type Page} from '../helpers/polish-test';
import {expectReadableTheme} from '../helpers/theme-contrast';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
const owner='11111111-1111-4111-8111-111111111111';
const user={id:owner,aud:'authenticated',role:'authenticated',email:'reports@example.test',app_metadata:{provider:'email'},user_metadata:{name:'Fixture Reader'}};
const stamp='2026-10-26T12:00:00Z';
function row(id:number,title:string,stage?:string,error?:string){return {id:`22222222-2222-4222-8222-${String(id).padStart(12,'0')}`,subject_type:id===2?'you_week_reading':id===3?'friend_transit_reading':'you_day_reading',subject_id:owner,content_key:`fixture/report/${id}`,subject_label:'Fixture Friend',status:error?'ERROR':'DRAFT',error,headline:title,target_date:`2026-10-${String(27-id).padStart(2,'0')}`,created_at:stamp,updated_at:stamp,body:stage||error?'':'The complete saved report opening.\n\nThis paragraph repeats.\n\nThis paragraph repeats.\n\nThe complete saved report ending.',you_report_entitlement_id:'fixture-entitlement',source_snapshot:{friendName:'Fixture Friend',periodEnd:'2026-11-01',reportProgress:{stage}}};}
async function fixture(page:Page,theme:string,signedIn=true){
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 const state={rows:[row(1,'A day with space to think'),row(2,'The coming week'),row(3,'A saved Friends report'),row(4,'Writing report','writing'),row(5,'Queued report','waiting'),row(6,'Review report',undefined,'Report review required: This report needs review before it can finish. Automatic rewriting has stopped.'),row(7,'Stopped report',undefined,'Synthetic generation stopped')],library:[] as any[],shares:[] as any[],fail:false,delay:false,writes:0,requests:0,deletions:0,deleteFail:false};
 const key=`sb-${new URL(process.env.VITE_SUPABASE_URL??'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
 await page.addInitScript(({theme,user,key,signedIn})=>{
  localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:pageAnimations','off');
  if(signedIn)localStorage.setItem(key,JSON.stringify({user,access_token:'synthetic-reports-session',refresh_token:'synthetic-refresh',token_type:'bearer',expires_at:4102444800}));
 },{theme,user,key,signedIn});
 await page.route('**/auth/v1/**',route=>route.fulfill({json:signedIn?user:null}));
 await page.route('**/rest/v1/**',async route=>{
  const url=new URL(route.request().url()),table=url.pathname.split('/').pop(),method=route.request().method();
  if(table==='user_generated_interpretations'){
   if(state.fail)return route.fulfill({status:503,json:{message:'Synthetic unavailable library'}});
   if(state.delay)await new Promise(resolve=>setTimeout(resolve,1500));
   const id=url.searchParams.get('id');const rows=id?.startsWith('eq.')?state.rows.filter(row=>row.id===id.slice(3)):state.rows;
   return route.fulfill({json:route.request().headers().accept?.includes('vnd.pgrst.object')?rows[0]??null:rows});
  }
  if(table==='user_report_library_state'&&method==='POST'){
   state.writes++;const patch=route.request().postDataJSON(),current=state.library.find(s=>s.source_id===patch.source_id);
   if(patch.deleted_at){state.deletions++;if(state.deleteFail)return route.fulfill({status:503,json:{message:"Synthetic delete failure"}});}
   if(current)Object.assign(current,patch);else state.library.push(patch);
   return route.fulfill({status:201,body:''});
  }
  if(table==='user_report_library_state'){
   const id=url.searchParams.get('source_id');const list=id?.startsWith('eq.')?state.library.filter(s=>s.source_id===id.slice(3)):state.library;
   return route.fulfill({json:route.request().headers().accept?.includes('vnd.pgrst.object')?list[0]??null:list});
  }
  return route.fulfill({json:table==='report_share_links'?state.shares:[]});
 });
 await page.route('**/api/report-share',route=>{
  const q=route.request().postDataJSON();
  if(route.request().method()==='POST'){state.shares.push({source_kind:q.sourceKind,source_id:q.sourceId,revoked_at:null});return route.fulfill({json:{shareUrl:`http://127.0.0.1/reports/fixture#s=synthetic-share`}});}
  state.shares=[];return route.fulfill({json:{ok:true}});
 });
 await page.route('**/api/*report-request',route=>{state.requests++;return route.fulfill({status:409,json:{error:'No paid generation in UI verification'}});});
 return state;
}
for(const width of [320,390,1440])for(const theme of ['light','dark'])test(`Reports handoff library ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1100});const data=await fixture(page,theme);await page.goto('/reports/');
 await expect(page.locator('.report-library-row')).toHaveCount(7);
 await expect(page.getByRole('heading',{name:'Reports',exact:true})).toHaveCSS('font-size',width<=800?'34px':'36px');
 await expect(page.getByRole('tab',{name:'Reports 7',exact:true})).toBeVisible();
 const first=page.locator('.report-library-row').first(),title=first.locator('.report-library-row__title');
 await expect(first.locator('.report-library-row__icon')).toContainText('☉');
 await expect(page.locator('.report-library-row__unread')).toHaveCount(3);
 await expect(first.locator('.report-library-row__subtitle')).toContainText('You · Day report');
 await expect(title).toHaveCSS('font-size',width<=800?'17px':'24px');await expect(title).toHaveCSS('font-family',width<=800?/system-ui/:/Newsreader/);
 await expect(title).toHaveCSS('font-weight',width<=800?'600':'400');
 const pills=page.locator('.report-library-status');await expect(pills).toHaveText(['New','New','New','Writing','Queued to continue','Needs review','Could not finish']);
 await expect(pills.first()).toHaveCSS('min-height','28px');await expect(pills.first()).toHaveCSS('font-size','13px');
 if(width>800){await expect(first).toHaveCSS('border-radius','24px');expect((await page.locator('.report-library-shell').boundingBox())!.width).toBe(760);}
 else{await expect(first).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(page.locator('.report-library-list')).toHaveCSS('row-gap','28px');}
 await expectReadableTheme(page,'.report-library-row__title, .report-library-row__subtitle, .report-library-status');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/reports-library-${width}-${theme}.png`,fullPage:true});
 await first.getByRole('button',{name:/More options/}).click();await expect(page.getByRole('menuitem')).toHaveText(['Share','Archive','Delete']);
 await page.getByRole('menuitem',{name:'Share',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Share link copied.');await expect(page.locator('.report-library-share-toast')).toHaveCSS('background-color','rgb(28, 31, 38)');await expect(page.locator('.report-library-share-toast')).toHaveCSS('min-height','48px');
 await first.getByRole('button',{name:/More options/}).click();await expect(page.getByRole('menuitem')).toHaveText(['Share','Stop sharing','Archive','Delete']);
 await page.getByRole('menuitem',{name:'Stop sharing',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Sharing stopped.');
 await first.getByRole('button',{name:/More options/}).click();await page.getByRole('menuitem',{name:'Archive',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Archived 1',exact:true})).toBeVisible();await page.reload();await page.getByRole('tab',{name:'Archived 1',exact:true}).click();
 await expect(page.locator('.report-library-row')).toHaveCount(1);await first.getByRole('button',{name:/More options/}).click();await page.getByRole('menuitem',{name:'Restore',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Nothing archived',exact:true})).toBeVisible();await page.getByRole('tab',{name:'Reports 7',exact:true}).click();
 await page.locator('.report-library-row__open').first().click();await expect(page.getByRole('heading',{level:1,name:'A day with space to think',exact:true})).toBeVisible();
 await expect(page.locator('.saved-generated-report__body')).toContainText('The complete saved report ending.');await page.reload();
 await expect(page.locator('.saved-generated-report__body').getByText('This paragraph repeats.',{exact:true})).toHaveCount(2);
 await page.getByRole('button',{name:'Back to Reports',exact:true}).click();await expect(page.locator('.report-library-row__unread')).toHaveCount(2);
 data.rows=[];await page.reload();await expect(page.getByRole('heading',{name:'No reports yet',exact:true})).toBeVisible();
 expect(data.requests).toBe(0);
});

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Reports handoff states ${width} ${theme}`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:1000});const data=await fixture(page,theme);
 data.delay=true;await page.goto('/reports/');await expect(page.getByText('Loading your reports…',{exact:true})).toBeVisible();data.delay=false;
 await expect(page.locator('.report-library-row')).toHaveCount(7);
 data.fail=true;await page.reload();await expect(page.getByText('Your reports could not be loaded right now.',{exact:true})).toBeVisible();
 data.fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.report-library-row')).toHaveCount(7);
 for(const title of ['Review report','Stopped report']){
  await page.locator('.report-library-row__open').filter({hasText:title}).click();
  await expect(page.getByRole('heading',{level:1,name:title==='Review report'?'Needs review':'Could not finish',exact:true})).toBeVisible();
  await expect(page.locator('.report-state-card p')).toHaveCSS('font-family',/Newsreader/);await expect(page.locator('.report-state-card p')).toHaveCSS('font-size','19px');await expect(page.locator('.report-state-card p')).toHaveCSS('line-height','28.5px');
  await expectReadableTheme(page,'.report-state-card h1, .report-state-card p, .report-action');
  await page.screenshot({path:`test-results/reports-state-${title}-${width}-${theme}.png`});
  await page.reload();await expect(page.locator('.report-state-card h1')).toBeVisible();await page.getByRole('link',{name:'Back to Reports',exact:true}).click();
 }
 let status='writing';await page.route('**/api/report-delivery?**',route=>route.fulfill({json:{ready:false,status}}));
 await page.route('**/api/report-entitlement',route=>route.fulfill({json:{activated:false,status:'awaiting_birth_data'}}));
 for(const [code,label] of [['writing','Writing'],['judging','Checking'],['awaiting_birth_data',''],['needs_review','Needs review'],['exception','Could not finish']]){
  status=code;await page.goto('/reports/33333333-3333-4333-8333-333333333333');
  if(label==='Needs review'||label==='Could not finish')await expect(page.getByRole('heading',{level:1,name:label,exact:true})).toBeVisible();
  else{await expect(page.getByRole('heading',{name:'Preparing your report',exact:true})).toBeVisible();if(label)await expect(page.locator('.report-state-card > p')).toHaveText(label);else await expect(page.getByRole('link',{name:'Add birth information',exact:true})).toBeVisible();}
  await expect(page.locator('.report-state-card')).not.toContainText('awaiting_birth_data');
 }
 await page.goto('/reports/not-a-report');await expect(page.getByRole('heading',{name:'Report not found',exact:true})).toBeVisible();
 expect(data.requests).toBe(0);
});

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Reports handoff signed out ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await fixture(page,theme,false);await page.goto('/reports/');
 await expect(page.getByText('Sign in to view your reports.',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Sign in',exact:true})).toHaveCSS('min-height',width<=800?'52px':'48px');
 await expectReadableTheme(page,'.report-state-card p, .report-action');await page.screenshot({path:`test-results/reports-signed-out-${width}-${theme}.png`});
});

const delivery={id:'33333333-3333-4333-8333-333333333333',reportDomain:'personal',reportHorizon:'year',periodStart:'2026-10-26',periodEnd:'2027-10-26',factsEngine:'Verified fixture engine',factsHash:'private-fixture-facts-hash',deliveredAt:stamp,units:[
 {content_key:'fixture:chapter',headline:'A delivered chapter',timing:null,summary:'The complete chapter summary.',body:'The complete chapter opening.\n\nThe complete chapter ending.',sections:[{heading:'A delivered section',body:'The complete section ending.'}]},
 {content_key:'fixture:overview',headline:'A delivered report',timing:'The complete overview timing.',summary:'The complete cover summary.',body:'The complete overview opening.\n\nThe complete overview ending.',sections:[]}
]};
async function articleHarness(){
 const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{ReportArticle}from'./apps/web/src/components/reports/ReportArticle';const report={id:'key-date-fixture',reportType:'report',cover:{kicker:'Personal report',title:'Key dates fixture'},chapters:[{id:'chapter',kicker:'Chapter',title:'Complete chapter',paragraphs:['Complete chapter opening.','Complete chapter ending.'],attribution:{kind:'transit_to_natal',transitingBody:'Venus',natalBody:'Mars',aspect:'trine'}}],keyDates:[1,2,3].map(i=>({id:'date-'+i,date:'October '+i+', 2026',title:'Date '+i,paragraphs:['Complete key date opening.','Complete key date ending.']})),colophon:{factsEngine:'Fixture engine',entries:[{label:'Facts hash',value:'private-fixture-hash'}]}};createRoot(document.getElementById('root')).render(<ReportArticle report={report}/>);`},bundle:true,write:false,format:'esm',jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env':JSON.stringify({DEV:false,MODE:'test'})}});
 const manifest=JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT??'apps/web/dist'}/.vite/manifest.json`,'utf8'));
 const files=[...new Set<string>([manifest['src/styles.css'].file,...Object.values(manifest).flatMap((entry:any)=>entry.css??[])])].filter(p=>!/admin|studio|MemoryGraph/i.test(p));
 return {script:result.outputFiles[0].text,links:files.map(path=>`<link rel="stylesheet" href="/${path}">`).join('')};
}
for(const width of [390,1440])for(const theme of ['light','dark'])test(`Reports handoff article and key dates ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1100});await fixture(page,theme);await page.route('**/api/report-delivery?**',route=>route.fulfill({json:{ready:true,report:delivery}}));
 await page.goto(`/reports/${delivery.id}`);await expect(page.getByRole('heading',{name:'A delivered report',exact:true})).toHaveCSS('font-size','48px');
 await expect(page.locator('.report-cover__subtitle')).toHaveText('The complete cover summary.');await expect(page.locator('.report-chapter').first()).toContainText('The complete overview ending.');
 await expect(page.locator('.report-chapters')).toContainText('The complete chapter ending.');await expect(page.locator('.report-chapters')).toContainText('The complete section ending.');
 await expect(page.locator('.report-chapter__image-placeholder')).toHaveCount(0);await expect(page.locator('.report-colophon')).not.toContainText('private-fixture-facts-hash');
 await expectReadableTheme(page,'.report-cover h1, .report-cover__subtitle, .report-chapter__copy h2, .report-chapter__copy p');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/reports-article-${width}-${theme}.png`,fullPage:true});
 await page.reload();await expect(page.locator('.report-chapter').first()).toContainText('The complete overview opening.');
 const h=await articleHarness();await page.route('**/__reports-handoff',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html data-theme="${theme}"><head>${h.links}</head><body><div id="root"></div><script type="module">${h.script}</script></body></html>`}));
 await page.goto('/__reports-handoff');await page.getByRole('button',{name:'October 2, 2026 Date 2',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Key date · 2 of 3');await expect(dialog).toContainText('Complete key date ending.');
 if(width<=800)await expect(page.locator('.report-key-date-modal .modal-positioner')).toHaveCSS('align-items','end');
 await page.screenshot({path:`test-results/reports-key-date-${width}-${theme}.png`});await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'October 2, 2026 Date 2',exact:true})).toBeFocused();
 await expect(page.locator('.report-attribution__glyphs')).toHaveCSS('width','52px');
});

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Reports ready toast and menu ${width} ${theme}`,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:1000});const data=await fixture(page,theme);
 const location={label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'};
 await page.addInitScript(({location,owner})=>{
  localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
  localStorage.setItem('tldrastro:userProfile',JSON.stringify({id:owner,name:'Fixture Reader',email:'reports@example.test',provider:'email',sun:'Capricorn',moon:'Pisces',rising:'Aries',currentLocation:location.label,currentLocationData:location,charts:[]}));
 },{location,owner});
 await page.route('**/api/sky?**',route=>route.fulfill({status:503,json:{error:'Synthetic sky unavailable; report navigation remains usable'}}));
 await page.route('**/api/content-reader',route=>route.fulfill({json:{schema:'tldr-reader-rows/v1',rows:[],publications:[],nextCursor:null}}));
 await page.goto('/#sky');await page.getByRole('button',{name:'Open menu',exact:true}).click();
 const reportMenu=page.getByRole('menuitem',{name:'Reports, 3 new',exact:true});await expect(reportMenu).toBeVisible({timeout:60000});
 await expect(reportMenu).toHaveCSS('font-size','15px');await expect(reportMenu.locator('.reports-nav-badge')).toHaveText('3');
 const labels=await page.getByRole('menuitem').allTextContents();expect(labels.findIndex(t=>t.startsWith('Reports'))+1).toBe(labels.indexOf('Account'));
 await page.locator('.site-menu-sheet .site-menu-close').click();
 const toast=page.locator('.report-ready-toast');await expect(toast).toBeVisible();
 await expect(toast.locator('strong')).toHaveCSS('font-family',/system-ui/);await expect(toast.locator('strong')).toHaveCSS('font-size','16px');
 const box=(await toast.boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(1000);expect(box.y).toBeGreaterThan(700);
 await expectReadableTheme(page,'.report-ready-toast__eyebrow, .report-ready-toast strong, .report-ready-toast__action');
 await page.screenshot({path:`test-results/reports-ready-toast-${width}-${theme}.png`});
 await toast.getByRole('button',{name:'Dismiss report notification',exact:true}).click();await expect(toast).toHaveCount(0);expect(data.writes).toBe(0);
 await page.reload();await expect(toast).toBeVisible({timeout:60000});await toast.locator('.report-ready-toast__open').click();
 await expect(page.getByRole('heading',{level:1,name:'A day with space to think',exact:true})).toBeVisible();
 expect(data.library.some(s=>s.seen_at)).toBe(true);expect(data.requests).toBe(0);
});

test('Reports account check failure has a retry card',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:1000});await fixture(page,'dark');let fail=true;
 await page.route('**/auth/v1/**',route=>route.fulfill(fail?{status:503,json:{message:'Synthetic account check unavailable'}}:{json:user}));
 await page.route('**/api/report-delivery?**',route=>route.fulfill({json:{ready:true,report:delivery}}));
 await page.goto(`/reports/${delivery.id}`);await expect(page.getByRole('heading',{name:'Your account could not be checked.',exact:true})).toBeVisible({timeout:60000});
 fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('heading',{name:'A delivered report',exact:true})).toBeVisible({timeout:60000});
});

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Reports handoff custom delete confirmation ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:900});const data=await fixture(page,theme);await page.goto('/reports/');
 const first=page.locator('.report-library-row').first(),more=first.getByRole('button',{name:/More options/});
 const open=async()=>{await more.click();await page.getByRole('menuitem',{name:'Delete',exact:true}).click();};
 await open();const dialog=page.getByRole('alertdialog',{name:'Delete “A day with space to think”?',exact:true});
 await expect(dialog).toBeVisible();await expect(dialog.getByRole('heading')).toBeFocused();await expect(dialog.getByRole('button',{name:/Close/})).toHaveCount(0);
 const buttons=dialog.locator('.modal-dialog__actions button');expect((await buttons.nth(0).boundingBox())!.width).toBe((await buttons.nth(1).boundingBox())!.width);
 await expect(dialog.getByRole('button',{name:'Delete',exact:true})).toHaveCSS('background-color','rgb(161, 41, 60)');
 await expectReadableTheme(page,'.modal-dialog__header h2, .modal-dialog__content p, .modal-action');
 await page.mouse.click(5,5);await expect(dialog).toBeVisible();expect(data.deletions).toBe(0);
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(more).toBeFocused();
 await open();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(more).toBeFocused();expect(data.deletions).toBe(0);
 await open();await page.screenshot({path:test.info().outputPath(`delete-report-${width}-${theme}.png`)});
 data.deleteFail=true;await dialog.getByRole('button',{name:'Delete',exact:true}).click();await expect(dialog.getByRole('alert')).toHaveText('This report could not be deleted. Please try again.');
 await expect(dialog.getByRole('button',{name:'Delete',exact:true})).toBeEnabled();expect(data.deletions).toBe(1);await expect(page.locator('.report-library-row')).toHaveCount(7);
 data.deleteFail=false;await dialog.getByRole('button',{name:'Delete',exact:true}).click();await expect(dialog).toBeHidden();await expect(page.locator('.report-library-row')).toHaveCount(6);
 await expect(page.getByRole('heading',{name:'Reports',exact:true})).toBeFocused();await page.reload();await expect(page.locator('.report-library-row')).toHaveCount(6);expect(data.deletions).toBe(2);expect(data.requests).toBe(0);
});
