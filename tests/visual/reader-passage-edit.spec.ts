import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { skyPlacementSourceFixture } from '../helpers/sky-placement-source-fixture.mts';
import { getLunarCalendarMonth } from '../../apps/web/src/services/ephemeris';
import { calendarPassageRecord } from '../../src/shared/features/calendar/calendarPassageTemplates';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { studioPassageEditHref } from '../../src/shared/studioPassageEdit';

const date='2026-10-21', timeZone='America/New_York';
const location={label:'QA reference',latitude:0,longitude:0,timeZone};
const datedKey=`calendar-passage/daily/${date}/America%2FNew_York`;
const moonKey='authored/calendar-moon-transition/aquarius/pisces';
async function expectEditLinkStyle(link: import('@playwright/test').Locator) {
  const style=await link.evaluate(node=>{
    const css=getComputedStyle(node),font=(text:string)=>text.replace(/[\s'"]/gu,'').toLowerCase();
    return {font:font(css.fontFamily),expectedFont:font(css.getPropertyValue('--font-ui')),size:css.fontSize,expectedSize:css.getPropertyValue('--type-ui-size').trim(),weight:css.fontWeight,expectedWeight:css.getPropertyValue('--weight-semibold').trim(),tracking:css.letterSpacing,expectedTracking:css.getPropertyValue('--tracking-normal').trim()};
  });
  expect([style.font,style.size,style.weight,style.tracking]).toEqual([style.expectedFont,style.expectedSize,style.expectedWeight,style.expectedTracking]);
}
for (const [width,theme] of [[1440,'light'],[390,'dark'],[390,'light'],[1440,'dark']] as const) {
  test(`Edit from Calendar and Sky preserves reader context and drafts ${width} ${theme}`,async ({page,context})=>{
    test.setTimeout(180_000);
    const sky=await skyPlacementSourceFixture('sun','libra');
    const fallback=await skyPlacementSourceFixture('sun','scorpio');
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
        if(failEntry&&url.searchParams.getAll('contentKeys').includes(sky.active.content_key)){await route.fulfill({status:503,json:{ok:false,error:'Synthetic passage lookup unavailable.'}});return;}
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
      const event=page.getByRole('dialog',{name:'Event detail',exact:true});
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
      await expect(skyLink).toHaveAttribute('href',studioPassageEditHref({surface:'sky',date,timeZone,sourceKey:sky.active.content_key})!,{timeout:60000});
      await expectEditLinkStyle(skyLink);
      failEntry=true;
      const openSky=context.waitForEvent('page');await skyLink.click();const skyEditor=await openSky;
      await expect(skyEditor.getByLabel('Passage opened from reader')).toContainText('Synthetic passage lookup unavailable.',{timeout:60000});
      await expect(skyEditor.getByRole('dialog')).toHaveCount(0);
      failEntry=false;
      await skyEditor.getByRole('button',{name:'Retry opening passage',exact:true}).click();
      await expect(skyEditor.getByRole('dialog').getByLabel('Sky article general copy',{exact:true})).toHaveValue(sky.pending.body,{timeout:60000});
      await expect(skyEditor.getByRole('dialog').getByLabel('Sky reader date',{exact:true})).toHaveValue(date);
      await skyEditor.getByRole('dialog').getByText('Reader source details',{exact:true}).click();
      await expect(skyEditor.getByRole('dialog').getByRole('region',{name:'Sky reader preview',exact:true}).getByText(/^Reference:.*America\/New_York/u)).toBeVisible({timeout:60000});
      await expect(skyEditor.getByLabel('Passage opened from reader')).toContainText(timeZone);
      await expect(skyEditor.getByLabel('Passage opened from reader')).toContainText('Opened your saved draft.');
      await skyEditor.reload();
      await expect(skyEditor.getByRole('dialog').getByLabel('Sky article general copy',{exact:true})).toHaveValue(sky.pending.body,{timeout:60000});
      await skyEditor.close();
      await page.goto('/?date=2026-10-24#sky/placement/sun/scorpio');
      await expect(article.getByRole('link',{name:'Edit this passage',exact:true})).toHaveAttribute('href',studioPassageEditHref({surface:'sky',date:'2026-10-24',timeZone,sourceKey:fallback.fallback.content_key})!,{timeout:60000});
      const openFallback=context.waitForEvent('page');await article.getByRole('link',{name:'Edit this passage',exact:true}).click();const fallbackEditor=await openFallback;
      await expect(fallbackEditor.getByRole('dialog').locator('textarea[data-sky-field="placementArticle"]')).toHaveValue(fallbackSource.placementArticle,{timeout:60000});
      await fallbackEditor.close();
      expect(writes).toEqual([]);
      expect(await store.call({method:'rows'})).toEqual(before);
      expect(await store.call({method:'publications'})).toEqual(publicationsBefore);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await article.screenshot({path:`test-results/reader-passage-edit-${width}-${theme}.png`});
      expect(errors).toEqual([]);
    } finally {store.close();}
  });
}
