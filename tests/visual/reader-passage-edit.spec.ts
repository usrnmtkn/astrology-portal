import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { skyPlacementSourceFixture } from '../helpers/sky-placement-source-fixture.mts';
import { getLunarCalendarMonth } from '../../apps/web/src/services/ephemeris';
import { calendarPassageRecord } from '../../src/shared/features/calendar/calendarPassageTemplates';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { parseStudioPassageEdit, studioPassageEditHref } from '../../src/shared/studioPassageEdit';
import nodeArticleFactsHandler from '../../api/admin/sky-article-facts';
import { expectRenderedTextContrast } from '../helpers/theme-contrast';

const date='2026-10-21', timeZone='America/New_York';
const location={label:'QA reference',latitude:0,longitude:0,timeZone};
const datedKey=`calendar-passage/daily/${date}/America%2FNew_York`;
const moonKey='authored/calendar-moon-transition/aquarius/pisces';

async function actualReaderFacts(url: URL) {
  process.env.CONTENT_GENERATION_SECRET='calendar-api-fixture';
  const result={statusCode:0,payload:{} as any,setHeader(){},end(body:string){this.payload=JSON.parse(body);}};
  await nodeArticleFactsHandler({method:'GET',url:url.pathname+url.search,headers:{'x-content-generation-secret':'calendar-api-fixture'}} as any,result as any);
  return result;
}

for (const [planet, sign] of [['north-node','aquarius'],['south-node','leo']]) for (const [width,theme,copyMode] of [[1440,'light','normal'],[390,'dark','normal'],[1440,'light','delayed'],[390,'dark','delayed'],[1440,'light','stalled-once'],[390,'dark','stalled-always'],[1440,'light','paused-worker']] as const) {
  if(planet!=='south-node'&&copyMode.startsWith('stalled'))continue;
  if(planet!=='south-node'&&copyMode==='paused-worker')continue;
  const pausedWorker=copyMode==='paused-worker',delayedCopy=copyMode!=='normal'&&!pausedWorker;
  test(`Lunar node reader Edit resolves actual article facts ${planet} ${width} ${theme}${pausedWorker ? ' with paused worker' : delayedCopy ? ` with ${copyMode} complete copy` : ''}`,async({page,context})=>{
    test.setTimeout(120_000);
    const store=await studioApiStore([],{uuidIds:true}),writes:any[]=[],errors:string[]=[];
    let factsCalls=0,failFacts=false,corruptSnapshot=false,releaseFailure=()=>{};
    const failureResponse=new Promise<void>(resolve=>{releaseFailure=resolve;});
    context.on('page',popup=>popup.on('pageerror',error=>errors.push(error.message)));
    page.on('pageerror',error=>errors.push(error.message));
    try {
      const before=await store.call({method:'rows'}),publications=await store.call({method:'publications'});
      await context.addInitScript(({theme,location})=>{
        if(window.location.origin==='null')return;
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
        localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:studio-theme',theme);
      },{theme,location});
      if(delayedCopy) await context.addInitScript(copyMode=>{
        if(!window.location.pathname.startsWith('/admin/content'))return;
        const held=new Set<string>();
        let missed=0;
        window.addEventListener('message',event=>{
          const data=event.data,key=`${data?.channel}:${data?.requestId}`;
          if(data?.protocol!=='studio-sky-reader-preview/v1'||data.type!=='result'||held.has(key))return;
          held.add(key);event.stopImmediatePropagation();
          if(copyMode.startsWith('stalled')&&(copyMode==='stalled-always'||!missed)){
            document.documentElement.dataset.readerCopyMissed=String(++missed);return;
          }
          document.documentElement.dataset.readerCopyPending='true';
          window.setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data,origin:event.origin,source:event.source})),35_000);
        },true);
      },copyMode);
      await context.route('**/content-studio-last-known-good.json',route=>route.fulfill({json:{schema:'content-studio-last-known-good-v2',rows:[],publications:[],rowCount:0}}));
      await context.route('**/rest/v1/**',async route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/content_publications')?await store.call({method:'publications'}):[]}));
      await routeStudioInventoryApi(context,{call:store.call,actualDocumentRoute:true,onWrite:write=>writes.push(write),answer:async(route,url)=>{
        if(url.pathname==='/api/content-publications'){await route.fulfill({json:{schema:'tldr-publications/v1',publications:await store.call({method:'publications'})}});return true;}
        if(url.pathname==='/api/content-reader'||url.pathname==='/api/admin/content-live-status'){
          const result=await store.call({method:'POST',url:url.pathname,body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;
        }
        if(url.pathname==='/api/admin/sky-article-facts'){
          factsCalls++;expect(url.searchParams.get('planet')).toBe(planet);expect(url.searchParams.get('format')).toBe('ingress-essay-v3');
          if(failFacts){await failureResponse;await route.fulfill({status:503,json:{ok:false,error:'Synthetic calculated facts unavailable.'}});return true;}
          const result=await actualReaderFacts(url);
          expect(result.statusCode,JSON.stringify(result.payload)).toBe(200);
          if(corruptSnapshot)result.payload.readerSky.location.longitude=1;
          await route.fulfill({status:result.statusCode,json:result.payload});return true;
        }
        if(url.pathname==='/api/admin/sky-article-template-slots')throw new Error('Opening a node article must not generate writing.');
        return false;
      }});
      await page.setViewportSize({width,height:1000});await page.goto(`/?date=2026-11-09#sky/placement/${planet}/${sign}`);
      const article=page.locator('.sky-detail-article');await expect(article.locator('.sky-detail-body p').first()).toBeVisible({timeout:60000});
      const title=await article.locator('h1').innerText();
      const expected=await article.evaluate(node=>[...node.querySelectorAll<HTMLElement>('.sky-detail-body h2,.sky-detail-body h3,.sky-detail-body p,.sky-detail-body li,.sky-detail-body dt,.sky-detail-body dd')].filter(n=>!n.closest('#sky-personalized-placement,.sky-detail-rising-horoscopes-card,button,details')&&!n.parentElement?.closest('li')).map(n=>n.innerText.trim()).filter(Boolean).join('\n\n'));
      expect(expected.length).toBeGreaterThan(500);
      const edit=article.getByRole('link',{name:'Edit this passage',exact:true});
      let editor=page;
      if(pausedWorker){
        await context.route('**/studio/sky-reader-preview?**', route=>route.abort());
        const debuggerSession=await context.newCDPSession(page);
        debuggerSession.on('Target.attachedToTarget',event=>{
          if(event.targetInfo.type==='worker')console.log('Held calculation worker before startup.');
        });
        await debuggerSession.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true,
          filter:[{type:'worker',exclude:false},{exclude:true}]});
        await page.goto((await edit.getAttribute('href'))!);
      }else if(delayedCopy){
        const href=(await edit.getAttribute('href'))!;
        await page.clock.install();await page.goto(href);
        if(copyMode.startsWith('stalled')){
          await expect(page.locator('html')).toHaveAttribute('data-reader-copy-missed','1',{timeout:60000});
          expect(factsCalls).toBe(1);
          await page.clock.fastForward(60_000);
          if(copyMode==='stalled-always'){
            await expect(page.locator('html')).toHaveAttribute('data-reader-copy-missed','2',{timeout:60000});
            await page.clock.fastForward(60_000);
            await expect(page.getByRole('alert')).toContainText('The complete reader article did not finish loading.');
            await expect(page.getByRole('button',{name:'Retry opening passage',exact:true})).toBeVisible();
            await expect(page.getByLabel('Visit article body')).toHaveCount(0);expect(factsCalls).toBe(2);
            expect(writes).toEqual([]);expect(await store.call({method:'rows'})).toEqual(before);expect(await store.call({method:'publications'})).toEqual(publications);
            return;
          }
        }
        await expect(page.locator('html')).toHaveAttribute('data-reader-copy-pending','true',{timeout:60000});
        expect(factsCalls,'Facts must start while the complete reader copy is pending.').toBe(copyMode==='stalled-once' ? 2 : 1);
        await page.clock.fastForward(35_000);
      }else{
        const opened=context.waitForEvent('page');await edit.click();editor=await opened;
      }
      await editor.setViewportSize({width,height:1000});
      const form=editor.getByRole('region',{name:'Article for this visit',exact:true});
      await expect(form.getByLabel('Visit article title')).toHaveValue(title,{timeout:60000});
      await expect(form.getByLabel('Visit article body')).toHaveValue(expected);
      await expect(form.getByRole('complementary',{name:'Article settings'})).toContainText('Full sign visit');
      await expect(editor.getByRole('alert')).toHaveCount(0);expect(factsCalls).toBeGreaterThan(0);
      if(pausedWorker){
        await expect(editor.locator('iframe[title="Published article copy"]')).toHaveCount(0);
        await expect(editor.locator('body > .sr-only')).toHaveCount(0);
        await editor.reload();
        await expect(form.getByLabel('Visit article body')).toHaveValue(expected,{timeout:60000});
        corruptSnapshot=true;await editor.reload();
        await expect(editor.getByRole('alert')).toContainText('The reader calculation does not match this article.');
        await expect(form).toHaveCount(0);
      }
      if(delayedCopy){
        await expect(editor.getByRole('button',{name:'Retry opening passage',exact:true})).toHaveCount(0);
        await editor.reload();
        if(copyMode==='stalled-once'){
          await expect(editor.locator('html')).toHaveAttribute('data-reader-copy-missed','1',{timeout:60000});
          await editor.clock.fastForward(60_000);
        }
        await expect(editor.locator('html')).toHaveAttribute('data-reader-copy-pending','true',{timeout:60000});
        await editor.clock.fastForward(35_000);
        await expect(form.getByLabel('Visit article body')).toHaveValue(expected);
        await expect(editor.getByRole('alert')).toHaveCount(0);expect(factsCalls).toBe(copyMode==='stalled-once' ? 4 : 2);
      }
      if(planet==='south-node'&&width===390&&copyMode==='delayed'){
        failFacts=true;releaseFailure();await editor.reload();
        await expect(editor.getByRole('alert')).toContainText('failed with HTTP 503.');
        await editor.clock.fastForward(120_000);
        await expect(form).toHaveCount(0);await expect(editor.getByRole('alert')).toContainText('failed with HTTP 503.');
        expect(factsCalls).toBe(3);
      }
      expect(writes).toEqual([]);expect(await store.call({method:'rows'})).toEqual(before);expect(await store.call({method:'publications'})).toEqual(publications);
      expect(await editor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await editor.screenshot({path:test.info().outputPath(`node-editor-${planet}-${width}-${theme}.png`)});
      await editor.close();expect(errors).toEqual([]);
    } finally {releaseFailure();store.close();}
  });
}

async function expectEditLinkStyle(link: import('@playwright/test').Locator) {
  const style=await link.evaluate(node=>{
    const css=getComputedStyle(node),probe=document.createElement('span');
    // Resolve the token in this browser too: macOS Chromium canonicalizes
    // BlinkMacSystemFont to system-ui in computed font-family values.
    probe.style.cssText='font-family:var(--font-ui);font-size:var(--type-ui-size);font-weight:var(--weight-semibold);letter-spacing:var(--tracking-normal)';
    node.parentElement!.append(probe);
    const expected=getComputedStyle(probe);
    const result={font:css.fontFamily,expectedFont:expected.fontFamily,size:css.fontSize,expectedSize:expected.fontSize,weight:css.fontWeight,expectedWeight:expected.fontWeight,tracking:css.letterSpacing,expectedTracking:expected.letterSpacing};
    probe.remove();
    return result;
  });
  expect([style.font,style.size,style.weight,style.tracking]).toEqual([style.expectedFont,style.expectedSize,style.expectedWeight,style.expectedTracking]);
}
for (const [width,theme] of [[1440,'light'],[390,'dark'],[390,'light'],[1440,'dark']] as const) {
  test(`Edit from Calendar and Sky preserves reader context and drafts ${width} ${theme}`,async ({page,context})=>{
    test.setTimeout(180_000);
    const sky=await skyPlacementSourceFixture('sun','libra');
    const fallback=await skyPlacementSourceFixture('sun','scorpio');
    const variableSource={schema:'sky-article-variable-draft-v1',templates:{headline:sky.pending.headline,tldr:sky.pending.summary,body:'{{completeCopy}}'},
      values:{completeCopy:{text:sky.pending.body,kind:'manual',source:'synthetic-saved-private-source'}}};
    Object.assign(sky.pending.sections,{skyArticleVariableDraft:variableSource,skyArticleVariableBase:null});
    const store=await studioApiStore([sky.active,sky.pending],{uuidIds:true});
    const calendar=await getLunarCalendarMonth(location,new Date(`${date}T16:00:00Z`));
    const datedBody='Synthetic saved date-only opening: {{moonSign}}.\n\nSynthetic complete dated ending.';
    const moonBody='Synthetic saved shared Moon opening.\n\nSynthetic complete shared Moon ending.';
    const writes:any[]=[],errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    let denied=true,checks=0,failEntry=false;
    context.on('page',popup=>{void popup.setViewportSize({width,height:1000});});
    try {
      const datedRecord=calendarPassageRecord(datedKey,datedBody);
      const dated=await store.call({method:'POST',body:{contentKey:datedKey,surface:'sky',mode:'feed',eventType:'calendar-passage',status:'DRAFT',lane:'reference',body:datedBody,headline:'Calendar assembled passage',provider:'tldrastro-fallback-architecture-v3',sections:{packageRecord:datedRecord,packageDraft:datedRecord},sourceSnapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',content_role:'full_copy',review_status:'needs_review'}}});
      expect(dated.status).toBe(200);
      const source=(await store.call({method:'GET',url:'/api/admin/generated-content-inventory?'+new URLSearchParams({contentKey:moonKey,status:'all',limit:'10'})})).payload.rows[0];
      const record=source.sections.packageRecord;
      const moon=await store.call({method:'POST',body:{contentKey:moonKey,surface:'sky',mode:'in_depth',eventType:'fallback-hook',blockType:'fallback_hook',status:'DRAFT',lane:'reference',headline:record.headline,body:moonBody,facts:{fallbackArchitectureV3:true},provider:'tldrastro-fallback-architecture-v3',sections:{...source.sections,packageRecord:record,packageDraft:{...record,body:moonBody,body_you:moonBody}},sourceSnapshot:{sourcePackage:record.source_package,content_role:'full_copy',review_status:'needs_review'}}});
      expect(moon.status).toBe(200);
      const fallbackSource=(await store.call({method:'GET',url:'/api/admin/package-source?'+new URLSearchParams({contentKey:fallback.fallback.content_key})})).payload.packageSource;
      expect(fallbackSource).toBeTruthy();
      const before=await store.call({method:'rows'}),publicationsBefore=await store.call({method:'publications'});
      await context.addInitScript(({theme,location})=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
        localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:studio-theme',theme);
      },{theme,location});
      await context.route('**/content-studio-last-known-good.json',route=>route.fulfill({json:{schema:'content-studio-last-known-good-v2',rows:[],publications:[],rowCount:0}}));
      await context.route('**/rest/v1/**',async route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/content_publications')?await store.call({method:'publications'}):[]}));
      await routeStudioInventoryApi(context,{call:store.call,actualDocumentRoute:true,onWrite:write=>writes.push(write),answer:async (route,url)=>{
        if(url.pathname==='/api/calendar') {await route.fulfill({json:{ok:true,calendar}});return true;}
        if(url.pathname==='/api/content-publications') {const publications=canonicalPublicationLedger(await store.call({method:'publications'}));await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:'tldr-publications/v1',publications}});return true;}
        if(url.pathname==='/api/content-reader'||url.pathname==='/api/admin/content-live-status') {
          const body=route.request().postDataJSON();
          if(url.pathname==='/api/admin/content-live-status'&&body.ids?.length===0) {checks++;if(denied){await route.fulfill({status:403,json:{ok:false,error:'Owner access required.'}});return true;}}
          const result=await store.call({method:'POST',url:url.pathname,body});await route.fulfill({status:result.status,json:result.payload});return true;
        }
        return false;
      }});
      // A document outage during handoff must be retryable without opening another source.
      await context.route('**/api/admin/generated-content-inventory?**',async route=>{
        const url=new URL(route.request().url());
        if(failEntry&&url.searchParams.get('contentKeyPrefix')===`sky-article/sun/libra/`){await route.fulfill({status:503,json:{ok:false,error:'Synthetic passage lookup unavailable.'}});return;}
        await route.fallback();
      });
      await page.setViewportSize({width,height:1000});
      await page.goto(`/?date=${date}#calendar?view=day&date=${date}`);
      await expect(page.getByRole('region',{name:'Moon guidance',exact:true})).toBeVisible({timeout:60000});
      await expect.poll(()=>checks).toBeGreaterThan(0);
      await expect(page.getByRole('link',{name:'Edit this passage',exact:true})).toHaveCount(0);
      denied=false;
      await page.reload();
      const overviewLink=page.getByRole('link',{name:'Edit this passage',exact:true});
      await expect(overviewLink).toHaveAttribute('href',studioPassageEditHref({surface:'calendar',date,timeZone,sourceKey:datedKey})!,{timeout:60000});
      await expectEditLinkStyle(overviewLink);
      const openOverview=context.waitForEvent('page');await overviewLink.click();const overview=await openOverview;
      const editor=overview.getByRole('region',{name:'Assembled Calendar passage',exact:true});
      await expect(editor.getByRole('textbox',{name:'Complete passage wording',exact:true})).toHaveValue(datedBody,{timeout:60000});
      await expect(editor.getByLabel('Passage date',{exact:true})).toHaveValue(date);
      await expect(editor.getByLabel('Passage time zone',{exact:true})).toHaveValue(timeZone);
      await expect(editor.getByLabel('Passage editing scope',{exact:true})).toHaveValue('date');
      await editor.getByRole('button',{name:'Draft',exact:true}).click();
      await expect(editor.getByLabel('Daily overview impact')).toContainText('Changed');
      await expect(editor.getByLabel('Moon event card impact')).toContainText('Unchanged');
      await overview.reload();
      await expect(editor.getByRole('textbox',{name:'Complete passage wording',exact:true})).toHaveValue(datedBody,{timeout:60000});
      await overview.close();
      await page.getByRole('button',{name:'Moon enters Pisces',exact:true}).click();
      const event=page.locator('.sky-detail-article');
      await expect(event.locator('#sky-detail-title')).toHaveText('Moon enters Pisces', { timeout: 60000 });
      await expect(event.locator('.article-body-inner p').first()).not.toBeEmpty();
      await expect(event).not.toContainText(moonBody);
      await expect(page.getByRole('dialog', { name: 'Event detail', exact: true })).toHaveCount(0);
      await expect(event.getByRole('link',{name:'Edit this passage',exact:true})).toHaveAttribute('href',studioPassageEditHref({surface:'calendar',date,timeZone,sourceKey:moonKey})!);
      const openMoon=context.waitForEvent('page');await event.getByRole('link',{name:'Edit this passage',exact:true}).click();const shared=await openMoon;
      const sharedEditor=shared.getByRole('region',{name:'Assembled Calendar passage',exact:true});
      await expect(sharedEditor.getByRole('textbox',{name:'Complete passage wording',exact:true})).toHaveValue(moonBody,{timeout:60000});
      await expect(sharedEditor.getByLabel('Calendar editing passage')).toHaveValue('moon');
      await expect(sharedEditor.getByLabel('Passage editing scope')).toHaveValue('shared');
      await sharedEditor.getByText('Source and Moon timing',{exact:true}).click();
      await expect(sharedEditor.getByText('Source and Moon timing',{exact:true}).locator('..')).toContainText(moonKey);
      await shared.close();
      await page.goto(`/?date=${date}#sky/placement/sun/libra`);
      const article=page.locator('.sky-detail-article');
      const skyLink=article.getByRole('link',{name:'Edit this passage',exact:true});
      await expect(skyLink).toBeVisible({timeout:60000});
      expect(parseStudioPassageEdit(new URL((await skyLink.getAttribute('href'))!,'https://example.test').hash)).toMatchObject({surface:'sky',date,timeZone,sourceKey:sky.active.content_key});
      const datedSkyHref=(await skyLink.getAttribute('href'))!;
      await expectEditLinkStyle(skyLink);
      failEntry=true;
      const openSky=context.waitForEvent('page');await skyLink.click();const skyEditor=await openSky;
      await expect(skyEditor.getByRole('alert')).toContainText('Saved visits could not be loaded.',{timeout:60000});
      await expect(skyEditor.getByRole('dialog')).toHaveCount(0);
      failEntry=false;
      await skyEditor.getByRole('button',{name:'Reload saved writing',exact:true}).click();
      const newForm=skyEditor.getByRole('region',{name:'Article for this visit',exact:true});
      await expect(newForm.getByLabel('Visit article body',{exact:true})).toHaveValue(sky.pending.body,{timeout:60000});
      await expect(skyEditor.getByRole('dialog')).toHaveCount(0);
      await expect(skyEditor.getByText('Opened your saved draft. Its complete wording and saved period are preserved.',{exact:true})).toBeVisible();
      await skyEditor.reload();
      await expect(newForm.getByLabel('Visit article body',{exact:true})).toHaveValue(sky.pending.body,{timeout:60000});
      await skyEditor.close();
      await page.goto('/?date=2026-10-24#sky/placement/sun/scorpio');
      await expect(article.getByRole('link',{name:'Edit this passage',exact:true})).toBeVisible({timeout:60000});
      // Full public copy is compared in the Mercury regression below; this old link remains compatible.
      const oldHref=studioPassageEditHref({surface:'sky',date:'2026-10-24',timeZone,sourceKey:fallback.fallback.content_key})!;
      await context.route('**/api/admin/sky-article-facts?**',async route=>{
        if(new URL(route.request().url()).searchParams.has('readerSign')){const result=await actualReaderFacts(new URL(route.request().url()));await route.fulfill({status:result.statusCode,json:result.payload});return;}
        const { workspaceVisitFacts }=await import('../helpers/sky-placement-workspace-fixtures');
        await route.fulfill({json:{ok:true,facts:{...workspaceVisitFacts('sun','scorpio','2026-10-23','2026-11-22'),generatedAt:new URL(route.request().url()).searchParams.get('instant'),articlePeriod:'current'}}});
      });
      const fallbackEditor=await context.newPage();await fallbackEditor.goto(oldHref);
      await expect(fallbackEditor.getByLabel('Visit article body',{exact:true})).not.toHaveValue('',{timeout:60000});
      await expect(fallbackEditor.getByRole('dialog')).toHaveCount(0);
      await fallbackEditor.close();
      expect(writes).toEqual([]);
      expect(await store.call({method:'rows'})).toEqual(before);
      expect(await store.call({method:'publications'})).toEqual(publicationsBefore);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await article.screenshot({path:`test-results/reader-passage-edit-${width}-${theme}.png`});
      expect(errors).toEqual([]);
      if(width===1440&&theme==='light') {
        const reentry=await context.newPage();await reentry.goto(datedSkyHref);
        const form=reentry.getByRole('region',{name:'Article for this visit',exact:true});
        const revised=sky.pending.body+'\n\nSynthetic explicit private revision.';
        await form.getByLabel('Visit article body').fill(revised);
        await form.getByRole('button',{name:'Save draft',exact:true}).click();
        await expect(reentry.getByText('Draft saved. Nothing was published.',{exact:true})).toBeVisible();
        const saved=(await store.call({method:'rows'})).find((row:any)=>row.id===sky.pending.id);
        expect(saved.body).toBe(revised);expect(saved.sections.skyArticleVariableDraft.values).toEqual(variableSource.values);
        expect(saved.sections.skyArticleVariableDraft.templates.body).toBe(revised);
        expect((await store.call({method:'rows'})).find((row:any)=>row.id===sky.active.id)).toEqual(before.find((row:any)=>row.id===sky.active.id));
        expect(await store.call({method:'publications'})).toEqual(publicationsBefore);
        await reentry.reload();await expect(form.getByLabel('Visit article body')).toHaveValue(revised,{timeout:60000});
        await reentry.close();
      }
    } finally {store.close();}
  });
}

for (const [width,theme,palette,blockPreviewHandshake] of [[1440,'light','green',false],[390,'dark','neutral',false],[1440,'dark','green',false],[390,'light','neutral',false],[1440,'light','green',true]] as const) {
  test(`Mercury Rx reader Edit loads complete wording, preserves drafts and saves privately ${width} ${theme} ${palette}${blockPreviewHandshake ? ' without preview handshake' : ''}`,async({page,context})=>{
    test.setTimeout(180_000);
    const fallbackKey='sky-placement/article/mercury/scorpio';
    const store=await studioApiStore([],{uuidIds:true});
    const writes:any[]=[],generation:string[]=[],errors:string[]=[];
    const { workspaceVisitFacts }=await import('../helpers/sky-placement-workspace-fixtures');
    const facts={...workspaceVisitFacts('mercury','scorpio','2026-10-24','2026-11-13'),articlePeriod:'current',motion:'retrograde',periodLabel:'Retrograde in this sign',
      transitStartInstant:'2026-10-24T07:12:00.000Z',transitEndInstant:'2026-11-13T15:53:00.000Z',
      slotValues:{when:'October 24, 2026 at 3:12 AM ET to November 13, 2026 at 10:53 AM ET'}};
    context.on('page',popup=>{void popup.setViewportSize({width,height:1000});});
    page.on('pageerror',error=>errors.push(error.message));
    if(blockPreviewHandshake) await context.addInitScript(()=>{
      window.addEventListener('message',event=>{
        const message=event.data;
        if(message?.protocol!=='studio-sky-reader-preview/v1'||message.type!=='ready')return;
        event.stopImmediatePropagation();
        document.documentElement.dataset.missedInitialPreviewReady='true';
      },true);
    });
    await context.addInitScript(({theme,palette,location})=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));localStorage.setItem('tldrastro:studio-theme',theme);localStorage.setItem('tldrastro:studio-palette',palette);},{theme,palette,location});
    await context.route('**/content-studio-last-known-good.json',route=>route.fulfill({json:{schema:'content-studio-last-known-good-v2',rows:[],publications:[],rowCount:0}}));
    await context.route('**/rest/v1/**',async route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/content_publications')?await store.call({method:'publications'}):[]}));
    let factsCalls=0,readerFacts: typeof facts | undefined;
    await routeStudioInventoryApi(context,{call:store.call,actualDocumentRoute:true,onWrite:write=>writes.push(write),answer:async(route,url)=>{
      if(url.pathname==='/api/content-publications'){const publications=canonicalPublicationLedger(await store.call({method:'publications'}));await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:'tldr-publications/v1',publications}});return true;}
      if(url.pathname==='/api/content-reader'||url.pathname==='/api/admin/content-live-status') {const result=await store.call({method:'POST',url:url.pathname,body:route.request().postDataJSON()});await route.fulfill({status:result.status,json:result.payload});return true;}
      if(url.pathname==='/api/admin/sky-article-facts'){if(url.searchParams.has('instant')){factsCalls++;expect(url.searchParams.get('period')).toBe('current');expect(url.searchParams.get('timeZone')).toBe(timeZone);}if(url.searchParams.has('readerSign')){const result=await actualReaderFacts(url);readerFacts=result.payload.facts;await route.fulfill({status:result.statusCode,json:result.payload});return true;}await route.fulfill({json:{ok:true,facts:{...facts,generatedAt:url.searchParams.get('instant')??facts.generatedAt}}});return true;}
      if(url.pathname==='/api/admin/sky-article-template-slots'){generation.push(url.pathname);await route.abort();return true;}
      return false;
    }});
    try {
      const before=await store.call({method:'rows'}),pubs=await store.call({method:'publications'});
      await page.setViewportSize({width,height:1000});await page.goto('/?date=2026-11-07#sky/placement/mercury/scorpio');
      const article=page.locator('.sky-detail-article');
      await expect(article.locator('.sky-detail-body p').first()).toBeVisible({timeout:60000});
      // This is the same complete public-body boundary used by the CSV export and edit handoff.
      const expected=await article.evaluate(node=>[...node.querySelectorAll<HTMLElement>('.sky-detail-body h2,.sky-detail-body h3,.sky-detail-body p,.sky-detail-body li,.sky-detail-body dt,.sky-detail-body dd')].filter(n=>!n.closest('#sky-personalized-placement,.sky-detail-rising-horoscopes-card,button,details')&&!n.parentElement?.closest('li')).map(n=>n.innerText.trim()).filter(Boolean).join('\n\n'));
      expect(expected.length).toBeGreaterThan(500);
      const opening=expected.split('\n\n')[0],final=expected.split('\n\n').at(-1)!;
      const open=context.waitForEvent('page');await article.getByRole('link',{name:'Edit this passage',exact:true}).click();const editor=await open;
      const form=editor.getByRole('region',{name:'Article for this visit',exact:true}),body=form.getByLabel('Visit article body',{exact:true});
      await expect(body).toHaveValue(expected,{timeout:60000});expect(await body.inputValue()).toContain(opening);expect(await body.inputValue()).toContain(final);
      if(blockPreviewHandshake){await expect(editor.locator('iframe[title="Published article copy"]')).toHaveCount(0);expect(await editor.locator('html').getAttribute('data-missed-initial-preview-ready')).toBeNull();}
      await expect(form.getByLabel('Visit article title')).toHaveValue('Mercury Rx in Scorpio');
      await expect(form.getByRole('complementary',{name:'Article settings'})).toContainText('Retrograde in this sign');
      await expect(form).toContainText('October 24, 2026');await expect(form).toContainText('November 13, 2026');
      await expect(editor.getByRole('dialog')).toHaveCount(0);expect(writes).toEqual([]);expect(generation).toEqual([]);
      expect(await store.call({method:'rows'})).toEqual(before);expect(await store.call({method:'publications'})).toEqual(pubs);
      await editor.reload();await expect(body).toHaveValue(expected,{timeout:60000});expect(await body.inputValue()).toContain(opening);expect(await body.inputValue()).toContain(final);expect(writes).toEqual([]);
      if(blockPreviewHandshake){await editor.reload();await expect(body).toHaveValue(expected,{timeout:60000});expect(writes).toEqual([]);}
      expect(factsCalls).toBe(blockPreviewHandshake ? 3 : 2);
      const edited=expected+'\n\nSynthetic private edit final sentence.';
      await expect(form.getByLabel('Visit article summary')).toHaveValue('');
      const publish=form.getByRole('button',{name:'Publish',exact:true});
      await expect(publish).toBeDisabled();
      await expect(publish).toHaveAccessibleDescription('Required: Summary.');
      await expect(publish).toHaveCSS('opacity','1');
      await expect(publish).not.toHaveCSS('border-top-color','rgba(0, 0, 0, 0)');
      await expectRenderedTextContrast(editor,'.studio-publish,.studio-sky-editor-toolbar .studio-stack [role=status]',4.5);
      await editor.screenshot({path:`test-results/mercury-publish-disabled-${width}-${theme}-${palette}.png`});
      expect(await editor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await form.getByLabel('Visit article title').fill('');await body.fill('');
      await expect(publish).toHaveAccessibleDescription('Required: Title, Summary, Content.');
      await expect(publish).toBeDisabled();
      await form.getByLabel('Visit article title').fill('Mercury Rx in Scorpio');
      await body.fill(edited);
      await expect(form.getByRole('button',{name:'Save draft',exact:true})).toBeEnabled();
      await expect(form.getByRole('button',{name:'Publish',exact:true})).toBeDisabled();
      await form.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByText('Draft saved. Nothing was published.',{exact:true})).toBeVisible();
      const raw=(await store.call({method:'rows'})).find((row:any)=>row.sections?.skyPlacementWritingDraft);
      expect(raw.status).toBe('DRAFT');expect(raw.lane).toBe('reference');
      expect(raw.sections.skyPlacementWritingDraft.fields).toEqual({headline:'Mercury Rx in Scorpio',summary:'',body:edited});
      expect(raw.sections.skyPlacementWritingDraft.readerImport.body).toBe(expected);
      expect(await store.call({method:'publications'})).toEqual(pubs);
      await editor.reload();await expect(body).toHaveValue(edited,{timeout:60000});
      await expect(form.getByLabel('Visit article summary')).toHaveValue('');
      await form.getByLabel('Visit article summary').fill('Synthetic explicit owner summary.');
      await expect(publish).toBeEnabled();
      await expect(publish).toHaveAccessibleDescription('Ready to publish.');
      await expect(form.getByLabel('Article publication')).toHaveText('Ready to publish.');
      await expectRenderedTextContrast(editor,'.studio-publish,.studio-sky-editor-toolbar .studio-stack [role=status]',4.5);
      await editor.screenshot({path:`test-results/mercury-publish-ready-${width}-${theme}-${palette}.png`});
      const horoscopeButton=form.getByRole('complementary',{name:'Article settings'}).getByRole('button',{name:'Horoscopes',exact:true});
      await horoscopeButton.click();
      const horoscopeEditor=editor.getByRole('dialog',{name:'Planetary horoscopes',exact:true});
      await horoscopeEditor.getByLabel('Aries write-up horoscope').fill('Synthetic incomplete horoscope reading.');
      await horoscopeEditor.getByRole('button',{name:'Close Planetary horoscopes',exact:true}).click();
      await expect(publish).toBeDisabled();
      await expect(publish).toHaveAccessibleDescription('Complete all 12 horoscopes.');
      await horoscopeButton.click();
      await horoscopeEditor.getByLabel('Aries write-up horoscope').fill('');
      await horoscopeEditor.getByRole('button',{name:'Close Planetary horoscopes',exact:true}).click();
      await expect(publish).toBeEnabled();
      await expect(publish).toHaveAccessibleDescription('Ready to publish.');
      await form.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByText('Draft saved. Nothing was published.',{exact:true})).toBeVisible();
      const rows=await store.call({method:'rows'}),saved=rows.find((row:any)=>row.content_key==='sky-article/mercury/scorpio/2026/2026-10-24');
      expect(saved.status).toBe('DRAFT');expect(saved.lane).toBe('reference');expect(saved.body).toContain(edited);
      expect(readerFacts).toBeDefined();expect(saved.sections.skyArticleEdition.transitStartInstant).toBe(readerFacts!.transitStartInstant);expect(saved.sections.skyArticleEdition.transitEndInstant).toBe(readerFacts!.transitEndInstant);
      const imported=saved.source_snapshot.editorialImport;
      expect(imported.imported.body).toBe(expected);expect(JSON.parse(imported.originalSource)).toEqual(imported.imported);expect(imported.originalSourceSha256).toMatch(/^[a-f0-9]{64}$/u);expect(imported.imported.sourceKeys).toContain(fallbackKey);
      await editor.reload();await expect(body).toHaveValue(saved.body,{timeout:60000});
      const after=await store.call({method:'rows'});for(const row of before)expect(after.find((value:any)=>value.id===row.id)).toEqual(row);
      expect(await store.call({method:'publications'})).toEqual(pubs);expect(generation).toEqual([]);expect(factsCalls).toBeGreaterThan(1);
      await editor.close();expect(errors).toEqual([]);
    } finally {store.close();}
  });
}
