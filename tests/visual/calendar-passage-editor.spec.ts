import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { getLunarCalendarMonth } from '../../apps/web/src/services/ephemeris';
import { emptyLastKnownGoodSnapshot } from '../helpers/bundled-publications';

const location = {label:'QA reference',latitude:0,longitude:0,timeZone:'America/New_York'};
const date = '2026-09-28';
for (const [width,theme] of [[1440,'light'],[390,'dark'],[390,'light'],[1440,'dark']] as const) {
  test(`assembled passage save and publication ${width} ${theme}`, async ({page,context}) => {
    test.setTimeout(150_000);
    const store = await studioApiStore([], {uuidIds:true});
    const calendar = await getLunarCalendarMonth(location, new Date(`${date}T16:00:00Z`));
    const errors: string[] = [];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await context.addInitScript(({location,theme})=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
        localStorage.setItem('tldrastro:studio-theme',theme);
        localStorage.setItem('tldrastro:theme',theme);
      },{location,theme});
      await context.route('**/rest/v1/**',async route=> {
        if (!route.request().url().includes('/content_publications?')) return route.fulfill({json:[]});
        const rows = await store.call({method:'publications'});
        const query = new URL(route.request().url()).searchParams;
        const filtered = rows.filter((row:any)=>query.getAll('content_key').every(value => value.startsWith('gte.') ? row.content_key>=value.slice(4) : value.startsWith('lt.') ? row.content_key<value.slice(3) : true));
        return route.fulfill({json:filtered});
      });
      await context.route('**/api/calendar?**',route=>route.fulfill({json:{ok:true,calendar}}));
      await context.route('**/api/content-reader', async route => {
        const result=await store.call({method:'POST',body:route.request().postDataJSON(),url:'/api/content-reader'});
        await route.fulfill({status:result.status,json:result.payload});
      });
      await routeStudioInventoryApi(page,{call:store.call,answer:async (route,url)=>{
        if (['/api/admin/content-history','/api/admin/content-publication'].includes(url.pathname)) {
          const result=await store.call({method:route.request().method(),body:route.request().method()==='GET'?undefined:route.request().postDataJSON(),url:url.pathname+url.search});
          await route.fulfill({status:result.status,json:result.payload}); return true;
        }
        return false;
      }});
      await page.route('**/api/admin/generated-content-inventory?**', async route => {
        const url=new URL(route.request().url());
        const result=await store.call({method:'GET',url:url.pathname+url.search});
        await route.fulfill({status:result.status,json:result.payload});
      });
      await page.setViewportSize({width,height:1000});
      await page.goto('/admin/content#calendar-writeups');
      const editor=page.getByRole('region',{name:'Assembled Calendar passage',exact:true});
      await editor.getByLabel('Passage date',{exact:true}).fill(date);
      await editor.getByLabel('Passage time zone',{exact:true}).fill(location.timeZone);
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      const field=editor.getByRole('textbox',{name:'Complete passage wording',exact:true});
      await expect(field).toBeVisible({timeout:60000});
      if (width === 1440 && theme === 'light') {
        const key = 'authored/sky-lunation-macro/full-moon/aries';
        const result = await store.call({method:'GET',url:'/api/admin/generated-content?' + new URLSearchParams({contentKeys:key,status:'LIVE',limit:'200'})});
        const original = result.payload.rows.find((row:any) => row.content_key === key).body.split(/\n\n+/)[0];
        await editor.getByLabel('Passage date',{exact:true}).fill('2026-09-26');
        await editor.getByRole('button',{name:'Load passage',exact:true}).click();
        await expect(editor.getByLabel('Assembled passage preview')).toContainText(original,{timeout:60000});
        await expect(editor.getByLabel('Assembled passage preview').getByRole('link',{name:'Read more'})).toHaveAttribute('href','?date=2026-09-26#sky/lunation/2026-09-26/aries');
        await editor.getByLabel('Passage date',{exact:true}).fill(date);
        await editor.getByRole('button',{name:'Load passage',exact:true}).click();
        await expect(field).toBeEnabled({timeout:60000});
      }
      const copy='Synthetic opening for {{moonSign}}.\n\nComplete synthetic ending.\n\n[Read more](?date=2026-09-26#sky/lunation/2026-09-26/aries)';
      await field.fill(copy);
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Synthetic opening for Aries.');
      await expect(editor.getByLabel('Assembled passage preview').locator('p')).toHaveCount(3);
      await expect(editor.getByLabel('Assembled passage preview').getByRole('link',{name:'Read more'})).toHaveAttribute('href','?date=2026-09-26#sky/lunation/2026-09-26/aries');
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status')).toContainText('Draft saved.');
      await page.reload();
      await editor.getByLabel('Passage date',{exact:true}).fill(date);
      await editor.getByLabel('Passage time zone',{exact:true}).fill(location.timeZone);
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(field).toHaveValue(copy,{timeout:60000});
      await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
      await expect(editor.getByRole('status')).toContainText('Published.');
      const reader=await context.newPage();
      await emptyLastKnownGoodSnapshot(reader);
      await reader.goto(`/?date=${date}#calendar?view=day&date=${date}`);
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Complete synthetic ending.',{timeout:60000});
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Synthetic opening for Aries.');
      const revised='Synthetic revised opening.\n\nComplete revised ending.';
      await field.fill(revised);
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status')).toContainText('Draft saved.');
      await reader.reload();
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Complete synthetic ending.',{timeout:60000});
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).not.toContainText('Complete revised ending.');
      await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
      await expect(editor.getByRole('status')).toContainText('Published.');
      await reader.goto(`/?date=${date}#calendar?view=week&date=${date}`);
      await reader.getByRole('tablist',{name:'Calendar view'}).getByRole('tab',{name:'Week',exact:true}).click();
      await expect(reader.getByRole('tabpanel',{name:'Week',exact:true})).toBeVisible();
      await expect(reader.getByLabel('Lunar calendar')).toContainText('Complete revised ending.',{timeout:60000});
      await editor.getByRole('button',{name:'Version history',exact:true}).click();
      await expect(editor.getByText('Saved versions',{exact:true})).toBeVisible();
      await expect(editor.locator('details details')).not.toHaveCount(0);
      await editor.getByLabel('Passage editing scope').selectOption('shared');
      await expect(field).toBeVisible();
      const shared='Shared synthetic opening.\n\nShared synthetic final sentence.';
      await field.fill(shared);
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status')).toContainText('Draft saved.');
      await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
      await expect(editor.getByRole('status')).toContainText('Published.');
      await editor.getByLabel('Passage editing scope').selectOption('date');
      await expect(field).toHaveValue(revised);
      await editor.getByRole('button',{name:'Use shared template for this date',exact:true}).click();
      await expect(field).toHaveValue(shared);
      await reader.reload();
      await expect(reader.getByLabel('Lunar calendar')).toContainText('Shared synthetic final sentence.',{timeout:60000});
      await expect(reader.getByLabel('Lunar calendar')).not.toContainText('Complete revised ending.');
      await expect(editor.getByRole('button',{name:'Version history',exact:true})).toBeVisible();
      if (width===1440 && theme==='light') {
        const restored='Synthetic new dated opening.\n\nSynthetic new dated final sentence.';
        await field.fill(restored);
        await editor.getByRole('button',{name:'Save draft',exact:true}).click();
        await expect(editor.getByRole('status')).toContainText('Draft saved.');
        await reader.evaluate(() => localStorage.setItem('tldrastro:content-update', JSON.stringify({contentKey:'calendar-passage/daily/shared',published:true,updatedAt:new Date().toISOString()})));
        await expect(editor.getByRole('note')).toContainText('Your wording has been preserved.');
        await expect(field).toHaveValue(restored);
        await expect(editor.getByRole('button',{name:'Publish passage',exact:true})).toBeDisabled();
        await editor.getByRole('button',{name:'Reload saved status',exact:true}).click();
        await expect(field).toHaveValue(restored);
        await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
        await expect(editor.getByRole('status')).toContainText('Published.');
        await reader.reload();
        await expect(reader.getByLabel('Lunar calendar')).toContainText('Synthetic new dated final sentence.',{timeout:60000});
        await editor.getByRole('button',{name:'Use shared template for this date',exact:true}).click();
        await expect(field).toHaveValue(shared);
      }
      // Invalid slots remain editable but cannot publish; an outage retains the draft.
      await field.fill('{{unknownVariable}}');
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Unknown variable');
      await expect(editor.getByRole('button',{name:'Publish passage',exact:true})).toBeDisabled();
      await editor.getByRole('button',{name:'Discard unsaved changes'}).click();
      await page.route('**/api/admin/generated-content', route=>route.fulfill({status:503,json:{error:'Synthetic save unavailable'}}));
      await field.fill('Unsaved synthetic content.');
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('alert')).toContainText('Synthetic save unavailable');
      await expect(field).toHaveValue('Unsaved synthetic content.');
      await editor.getByRole('button',{name:'Discard unsaved changes'}).click();
      await page.unroute('**/api/admin/generated-content');
      await editor.getByLabel('Passage date',{exact:true}).fill('2026-09-29');
      await expect(field).toHaveCount(0);
      await expect(editor.getByRole('status')).toContainText('Choose Load passage');
      await editor.getByLabel('Passage date',{exact:true}).fill(date);
      await expect(field).toHaveValue(shared);
      await editor.getByRole('button',{name:'Sources and variables',exact:true}).click();
      await expect(editor.getByRole('link',{name:'Edit Moon transition and timing templates'})).toHaveAttribute('href','#calendar-writeups?view=moon-transition-phrases');
      const style = (node: Element) => {const c=getComputedStyle(node); return [c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight,c.letterSpacing,c.marginTop,c.marginBottom,c.textTransform,c.textAlign];};
      await page.getByText('Reference templates and source previews',{exact:true}).click();
      const reference=await page.getByRole('heading',{name:'Template preview',exact:true}).evaluate(style);
      expect(await editor.getByRole('heading',{name:'Complete passage'}).evaluate(style)).toEqual(reference);
      expect(await editor.getByRole('heading',{name:'Complete passage'}).evaluate(node=>node.tagName)).toBe('H3');
      await page.getByText('Reference templates and source previews',{exact:true}).click();
      if (width===1440 && theme==='light') {
        for (const [tab,view] of [['Weekly Sky','weekly'],['Monthly Sky','month']]) {
          await page.getByRole('tablist',{name:'Calendar Write-ups workspaces'}).getByRole('tab',{name:tab,exact:true}).click();
          await editor.getByLabel('Passage date',{exact:true}).fill(date);
          await editor.getByLabel('Passage time zone',{exact:true}).fill(location.timeZone);
          await editor.getByRole('button',{name:'Load passage',exact:true}).click();
          await expect(field).toBeVisible({timeout:60000});
          await field.fill(`Synthetic ${view} opening.\n\nSynthetic ${view} complete ending.`);
          await editor.getByRole('button',{name:'Save draft',exact:true}).click();
          await expect(editor.getByRole('status')).toContainText('Draft saved.');
          await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
          await expect(editor.getByRole('status')).toContainText('Published.');
          await expect(editor.getByRole('link',{name:'Open published Calendar'})).toHaveAttribute('href',`/?date=${date}#calendar?view=${view}&date=${date}`);
          await reader.goto('about:blank');
          await reader.goto(`/?date=${date}#calendar?view=${view}&date=${date}`);
          await expect(reader.getByRole('region',{name:view==='weekly'?'Weekly overview':'Monthly overview',exact:true})).toContainText(`Synthetic ${view} complete ending.`,{timeout:60000});
        }
      }
      expect(errors).toEqual([]);
      expect(await editor.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
      await editor.scrollIntoViewIfNeeded();
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({fullPage:true,path:`test-results/calendar-passage-editor-${width}-${theme}.png`});
    } finally {store.close();}
  });
}
