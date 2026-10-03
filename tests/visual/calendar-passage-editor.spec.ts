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
        const articleLink = editor.getByLabel('Assembled passage preview').getByRole('link',{name:'Read more'});
        await expect(articleLink).toHaveAttribute('href','/?date=2026-09-26#sky/lunation/2026-09-26/aries');
        expect(await articleLink.evaluate((link: HTMLAnchorElement) => new URL(link.href).pathname)).toBe('/');
        const sunLink = editor.getByLabel('Assembled passage preview').getByRole('link',{name:/Sun in Libra/});
        expect(await sunLink.evaluate((link: HTMLAnchorElement) => new URL(link.href).pathname)).toBe('/');
        await editor.getByLabel('Passage date',{exact:true}).fill(date);
        await editor.getByRole('button',{name:'Load passage',exact:true}).click();
        await expect(field).toBeEnabled({timeout:60000});
      }
      // Colors decorate the real editing field. Native selection/undo and exact
      // template bytes, including conditional markers, survive the whole flow.
      const originalTemplate=await field.inputValue();
      const layer=editor.locator('.studio-highlighted-backdrop');
      await expect(layer).toHaveAttribute('aria-hidden','true');
      expect(await layer.textContent()).toBe(originalTemplate+'\u200b');
      const sunColor=await layer.locator('[data-template-section="sunSummary"]').first().evaluate(node=>getComputedStyle(node).backgroundColor);
      const moonColor=await layer.locator('[data-template-section="moonWriteup"]').first().evaluate(node=>getComputedStyle(node).backgroundColor);
      expect(sunColor).not.toBe(moonColor);
      const sectionStart=originalTemplate.indexOf('{{#moonWriteup}}')+'{{#moonWriteup}}'.length;
      const sectionEnd=originalTemplate.indexOf('{{/moonWriteup}}',sectionStart);
      const selected=originalTemplate.slice(sectionStart,sectionEnd);
      const sectionField=editor.getByRole('textbox',{name:'Moon passage wording',exact:true});
      // A real click on tinted prose opens the focused section, not just a text selection.
      await field.scrollIntoViewIfNeeded();
      await field.evaluate(node=>{ node.scrollTop=0; node.dispatchEvent(new Event('scroll')); });
      const target=await layer.locator('[data-template-section="sunSummary"]').first().evaluate(node=>{
        const range=document.createRange(); range.selectNodeContents(node);
        const rect=Array.from(range.getClientRects()).find(rect=>rect.width>10 && rect.height>10)!;
        return {x:rect.x+8,y:rect.y+rect.height/2};
      });
      await page.mouse.click(target.x,target.y);
      await expect(editor.getByRole('textbox',{name:'Sun summary wording',exact:true})).toBeFocused();
      await editor.getByRole('button',{name:'Edit Moon passage',exact:true}).click();
      await expect(sectionField).toBeFocused();
      await expect(sectionField).toHaveValue(selected);
      await expect(field).toBeHidden();
      await sectionField.press('ControlOrMeta+a');
      await page.keyboard.insertText('Synthetic selected section.');
      expect(await editor.locator('textarea[aria-label="Complete passage wording"]').inputValue()).toBe(originalTemplate.slice(0,sectionStart)+'Synthetic selected section.'+originalTemplate.slice(sectionEnd));
      await page.keyboard.press('ControlOrMeta+z');
      await expect(sectionField).toHaveValue(selected);
      const save=editor.getByRole('button',{name:'Save draft',exact:true});
      const fieldBox=await sectionField.boundingBox();
      const saveBox=await save.boundingBox();
      expect(saveBox!.y-fieldBox!.y-fieldBox!.height).toBeLessThan(140);
      await sectionField.evaluate((node:HTMLTextAreaElement)=>{node.setSelectionRange(0,0);node.blur();});
      await editor.locator('.studio-calendar-template-editor').screenshot({path:`test-results/calendar-focused-editor-${width}-${theme}.png`});
      await editor.getByRole('button',{name:'Edit complete template',exact:true}).click();
      await expect(field).toHaveValue(originalTemplate);
      await field.press('ControlOrMeta+End');
      await expect.poll(()=>field.evaluate((node:HTMLTextAreaElement)=>Math.abs(node.scrollTop-(node.parentElement!.querySelector('.studio-highlighted-backdrop') as HTMLElement).scrollTop))).toBeLessThan(2);
      const metrics=(node:Element)=>{const c=getComputedStyle(node);return [c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight,c.letterSpacing,c.whiteSpace,c.overflowWrap];};
      expect(await field.evaluate(metrics)).toEqual(await layer.evaluate(metrics));
      await editor.getByRole('button',{name:'Hide template colors',exact:true}).click();
      await expect(layer).toHaveCount(0);
      await expect(field).toHaveValue(originalTemplate);
      await editor.getByRole('button',{name:'Show template colors',exact:true}).click();
      await field.evaluate((node:HTMLTextAreaElement)=>{node.style.height='240px';});
      await expect.poll(()=>layer.evaluate(node=>node.getBoundingClientRect().height)).toBe(await field.evaluate(node=>node.getBoundingClientRect().height));
      expect(await layer.locator(':scope > span').evaluate(node=>node.getBoundingClientRect().width)).toBe(await field.evaluate(node=>node.clientWidth));
      await field.evaluate((node:HTMLTextAreaElement)=>{node.style.height='';});
      await field.locator('..').getByRole('button',{name:'Format text',exact:true}).click();
      await expect(editor.getByRole('textbox',{name:'Complete passage wording formatted text',exact:true})).toBeVisible();
      await editor.getByRole('button',{name:'Done formatting',exact:true}).click();
      await expect(field).toHaveValue(originalTemplate);
      expect(await layer.textContent()).toBe(originalTemplate+'\u200b');
      await field.press('ControlOrMeta+Home');
      await field.evaluate((node:HTMLTextAreaElement)=>node.blur());
      await editor.locator('.studio-calendar-template-editor').screenshot({path:`test-results/calendar-template-colors-${width}-${theme}.png`});
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({fullPage:true,path:`test-results/calendar-template-colors-page-${width}-${theme}.png`});
      const copy='{{#moonWriteup}}Synthetic opening for {{moonSign}}.\n\nComplete synthetic ending.\n\n[Read more](?date=2026-09-26#sky/lunation/2026-09-26/aries){{/moonWriteup}}';
      await field.fill('{{#moonWriteup}}Synthetic starter.{{/moonWriteup}}');
      await editor.getByRole('button',{name:'Edit Moon passage',exact:true}).click();
      await sectionField.fill(copy.slice('{{#moonWriteup}}'.length,-'{{/moonWriteup}}'.length));
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Synthetic opening for Aries.');
      await expect(editor.getByLabel('Assembled passage preview').locator('p')).toHaveCount(3);
      await expect(editor.getByLabel('Assembled passage preview').getByRole('link',{name:'Read more'})).toHaveAttribute('href','/?date=2026-09-26#sky/lunation/2026-09-26/aries');
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status')).toContainText('Draft saved.');
      await expect(sectionField).toBeVisible();
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
      await expect(editor.getByLabel('Template variable key')).toContainText('Unknown variable');
      await expect(editor.getByRole('button',{name:'Publish passage',exact:true})).toBeDisabled();
      await field.fill('');
      await expect(editor.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
      await expect(editor.getByLabel('Template variable key')).toHaveCount(0);
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
      {
        for (const [tab,view] of [['Weekly Sky','weekly'],['Monthly Sky','month']]) {
          await page.getByRole('tablist',{name:'Calendar Write-ups workspaces'}).getByRole('tab',{name:tab,exact:true}).click();
          await editor.getByLabel('Passage date',{exact:true}).fill(date);
          await editor.getByLabel('Passage time zone',{exact:true}).fill(location.timeZone);
          await editor.getByRole('button',{name:'Load passage',exact:true}).click();
          await expect(field).toBeVisible({timeout:60000});
          if (view==='weekly') {
            let week=await field.inputValue();
            for (const day of ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']) {
              const name=day.toLowerCase()+'Writeup';
              const start=week.indexOf('{{#'+name+'}}')+('{{#'+name+'}}').length;
              const end=week.indexOf('{{/'+name+'}}',start);
              await editor.getByRole('button',{name:`Edit ${day} Writeup`,exact:true}).click();
              const weekdayField=editor.getByRole('textbox',{name:`${day} Writeup wording`,exact:true});
              await expect(weekdayField).toHaveValue(week.slice(start,end));
              await weekdayField.fill(week.slice(start,end)+` Synthetic ${day} edit.`);
              week=week.slice(0,end)+` Synthetic ${day} edit.`+week.slice(end);
              expect(await editor.locator('textarea[aria-label="Complete passage wording"]').inputValue()).toBe(week);
            }
            await editor.getByRole('button',{name:'Edit Sunday Writeup',exact:true}).click();
            await editor.getByRole('textbox',{name:'Sunday Writeup wording',exact:true}).evaluate((node:HTMLTextAreaElement)=>node.blur());
            await editor.locator('.studio-calendar-template-editor').screenshot({path:`test-results/calendar-weekday-editor-${width}-${theme}.png`});
            await editor.getByRole('button',{name:'Save draft',exact:true}).click();
            await expect(editor.getByRole('status')).toContainText('Draft saved.');
            await editor.getByRole('button',{name:'Reload saved status',exact:true}).click();
            await expect(field).toHaveValue(week,{timeout:60000});
          }
          await field.fill(`Synthetic ${view} opening.\n\nSynthetic ${view} complete ending.`);
          await editor.getByRole('button',{name:'Save draft',exact:true}).click();
          await expect(editor.getByRole('status')).toContainText('Draft saved.');
          await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
          await expect(editor.getByRole('status')).toContainText('Published.');
          await expect(editor.getByRole('link',{name:'Open published Calendar'})).toHaveAttribute('href',`/?date=${date}#calendar?view=${view}&date=${date}`);
          await reader.goto('about:blank');
          await reader.goto(`/?date=${date}#calendar?view=${view}&date=${date}`);
          const overview = reader.getByRole('region',{name:view==='weekly'?'Weekly overview':'Monthly overview',exact:true});
          await expect(overview).toContainText(`Synthetic ${view} opening.`,{timeout:60000});
          await expect(overview).toContainText(`Synthetic ${view} complete ending.`);
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
