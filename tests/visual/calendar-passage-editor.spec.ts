import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { getLunarCalendarMonth } from '../../apps/web/src/services/ephemeris';
import { emptyLastKnownGoodSnapshot } from '../helpers/bundled-publications';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';

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
      // Reader popups must use the same publication identities as the isolated rows.
      const publicationLedgerReply=async()=>{
        const publications=canonicalPublicationLedger(await store.call({method:'publications'}));
        return {headers:{etag:await publicationLedgerTag(publications),'x-tldr-qa-publication-ledger':'isolated-store'},json:{schema:'tldr-publications/v1',publications}};
      };
      await context.route('**/api/content-publications',async route=>route.fulfill(await publicationLedgerReply()));
      await context.route('**/rest/v1/**',async route=> {
        if (!route.request().url().includes('/content_publications?')) return route.fulfill({json:[]});
        const rows = await store.call({method:'publications'});
        const query = new URL(route.request().url()).searchParams;
        const filtered = rows.filter((row:any)=>query.getAll('content_key').every(value => value.startsWith('gte.') ? row.content_key>=value.slice(4) : value.startsWith('lt.') ? row.content_key<value.slice(3) : true));
        return route.fulfill({json:filtered});
      });
      await context.route('**/api/calendar?**',async route=>{
        const selected = new URL(route.request().url()).searchParams.get('date') ?? date;
        const selectedCalendar = selected === date ? calendar : await getLunarCalendarMonth(location, new Date(`${selected}T16:00:00Z`));
        await route.fulfill({json:{ok:true,calendar:selectedCalendar}});
      });
      await context.route('**/api/content-reader', async route => {
        const result=await store.call({method:'POST',body:route.request().postDataJSON(),url:'/api/content-reader'});
        await route.fulfill({status:result.status,json:result.payload});
      });
      await routeStudioInventoryApi(page,{call:store.call,answer:async (route,url)=>{
        if (url.pathname==='/api/content-publications') {
          await route.fulfill(await publicationLedgerReply()); return true;
        }
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
      const openPanel=async (name:string)=>{const panel=editor.locator('details').filter({has:page.locator(':scope > summary').filter({hasText:name})}).first();if(await panel.getAttribute('open')===null) await panel.locator(':scope > summary').click();};
      await editor.getByLabel('Passage date',{exact:true}).fill(date);
      await editor.getByLabel('Passage time zone',{exact:true}).fill(location.timeZone);
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      const field=editor.getByRole('textbox',{name:'Complete passage wording',exact:true});
      await expect(field).toBeVisible({timeout:60000});
      const timing = editor.getByRole('group',{name:'Moon timing for selected day',exact:true});
      for (const selected of ['2026-10-21', '2026-10-22', '2026-10-23']) {
        await editor.getByLabel('Passage date',{exact:true}).fill(selected);
        await expect(timing).toBeHidden();
        await editor.getByRole('button',{name:'Load passage',exact:true}).click();
        await expect(field).toBeVisible({timeout:60000});
        await editor.getByText('Source and Moon timing',{exact:true}).click();
        await expect(timing).toBeVisible();
        await expect(timing).toContainText('America/New_York',{timeout:60000});
        expect(await timing.locator('dt').allTextContents()).toEqual(selected === '2026-10-22'
          ? ['Day starts in:', 'Change today:', 'Next change:', 'Reader Moon sign at noon:']
          : ['Day starts in:', 'Change today:', 'Reader Moon sign at noon:']);
        if (selected === '2026-10-21') {
          await expect(timing).toContainText('Day starts in: Aquarius');
          await expect(timing).toContainText('Change today: Aquarius → Pisces · Oct 21, 2026, 8:35 AM EDT');
          await expect(timing).toContainText('Reader Moon sign at noon: Pisces');
          await editor.getByText('Insert a variable',{exact:true}).click();
          await editor.getByLabel('Find passage variable',{exact:true}).fill('start of day');
          await expect(editor.getByLabel('Passage variable',{exact:true})).toHaveValue('moonSign');
          await expect(editor.getByLabel('Selected passage variable')).toContainText('Moon sign at start of day');
          await expect(editor.getByLabel('Selected passage variable')).toContainText('departing sign');
          const styles = await editor.locator('.studio-variable-description').evaluateAll(nodes => nodes.map(node => {
            const style=getComputedStyle(node.querySelector('p')!);
            return [style.fontFamily,style.fontSize,style.lineHeight,style.letterSpacing];
          }));
          expect(styles[0]).toEqual(styles[1]);
          await timing.evaluate(node=>node.scrollIntoView({block:'center'}));
          await timing.screenshot({path:`test-results/calendar-moon-timing-${width}-${theme}.png`});
          await page.screenshot({path:`test-results/calendar-moon-timing-viewport-${width}-${theme}.png`});
          await editor.getByRole('button',{name:'Clear variable search',exact:true}).click();
        } else {
          await expect(timing).toContainText('Day starts in: Pisces');
          await expect(timing).toContainText('Reader Moon sign at noon: Pisces');
          await expect(timing).toContainText('Pisces → Aries · Oct 23, 2026, 3:53 PM EDT');
          if (selected === '2026-10-22') await expect(timing).toContainText('No Moon sign change this local day.');
        }
      }
      await editor.getByLabel('Passage date',{exact:true}).fill(date);
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(field).toBeEnabled({timeout:60000});
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
      await editor.getByLabel('Calendar editing section',{exact:true}).selectOption({label:'Moon passage'});
      await expect(sectionField).toBeFocused();
      await expect(sectionField).toHaveValue(selected);
      await expect(field).toBeHidden();
      await sectionField.press('ControlOrMeta+a');
      await page.keyboard.insertText('Synthetic selected section.');
      expect(await editor.locator('textarea[aria-label="Complete passage wording"]').inputValue()).toBe(originalTemplate.slice(0,sectionStart)+'Synthetic selected section.'+originalTemplate.slice(sectionEnd));
      await page.keyboard.press('ControlOrMeta+z');
      await expect(sectionField).toHaveValue(selected);
      await editor.getByText('Insert a variable',{exact:true}).click();
      const variableSearch=editor.getByLabel('Find passage variable',{exact:true});
      await variableSearch.fill('moon sign');
      await expect(editor.getByLabel('Passage variable',{exact:true})).toHaveValue('moonSign');
      await expect(editor.getByLabel('Selected passage variable')).toContainText('Calculated value');
      await editor.getByLabel('Selected passage variable').getByText('Current value',{exact:true}).click();
      await expect(editor.getByLabel('Selected passage variable')).toContainText('Aries');
      await editor.getByRole('group',{name:'Passage variable picker',exact:true}).screenshot({path:`test-results/calendar-variable-picker-${width}-${theme}.png`});
      await page.screenshot({path:`test-results/calendar-variable-picker-viewport-${width}-${theme}.png`});

      await variableSearch.fill('no such variable fixture');
      await expect(editor.getByRole('button',{name:'Insert variable at cursor',exact:true})).toBeDisabled();
      await expect(editor.getByRole('status').filter({hasText:'No matching passage variables'})).toBeVisible();
      await editor.getByRole('button',{name:'Clear variable search',exact:true}).click();
      await editor.getByLabel('Include unavailable variables',{exact:true}).check();
      await variableSearch.fill('hasFullMoon');
      await expect(editor.getByLabel('Passage variable',{exact:true})).toHaveValue('hasFullMoon');
      await sectionField.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(0,10));
      await editor.getByRole('button',{name:'Wrap selection in condition',exact:true}).click();
      await expect(sectionField).toHaveValue('{{#hasFullMoon}}'+selected.slice(0,10)+'{{/hasFullMoon}}'+selected.slice(10));
      expect(await sectionField.evaluate((node:HTMLTextAreaElement)=>node.value.slice(node.selectionStart,node.selectionEnd))).toBe(selected.slice(0,10));
      await sectionField.fill(selected);
      await editor.getByRole('button',{name:'Clear variable search',exact:true}).click();
      await editor.getByLabel('Include unavailable variables',{exact:true}).uncheck();
      // Both insertion entry points respect the active section and selection.
      await sectionField.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(0,0));
      await editor.getByLabel('Passage variable',{exact:true}).selectOption('moonSign');
      await editor.getByRole('button',{name:'Insert variable at cursor',exact:true}).click();
      await expect(sectionField).toBeFocused();
      await expect(sectionField).toHaveValue('{{moonSign}}'+selected);
      expect(await editor.locator('textarea[aria-label="Complete passage wording"]').inputValue()).toBe(originalTemplate.slice(0,sectionStart)+'{{moonSign}}'+selected+originalTemplate.slice(sectionEnd));
      await sectionField.fill(selected);
      await sectionField.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(0,0));
      await editor.getByText('Sources and variables',{exact:true}).click();
      await editor.getByRole('button',{name:'Insert Moon sign at start of day',exact:true}).click();
      await expect(sectionField).toHaveValue('{{moonSign}}'+selected);
      await expect(sectionField).toBeFocused();
      await sectionField.fill(selected);
      await editor.getByText('Sources and variables',{exact:true}).click();
      const save=editor.getByRole('button',{name:'Save draft',exact:true});
      const fieldBox=await sectionField.boundingBox();
      const saveBox=await save.boundingBox();
      expect(saveBox!.y-fieldBox!.y-fieldBox!.height).toBeLessThan(140);
      await sectionField.evaluate((node:HTMLTextAreaElement)=>{node.setSelectionRange(0,0);node.blur();});
      await editor.locator('.studio-calendar-template-editor').screenshot({path:`test-results/calendar-focused-editor-${width}-${theme}.png`});
      await editor.getByText('Template details',{exact:true}).click();
      await editor.getByRole('button',{name:'Edit complete template',exact:true}).click();
      await expect(field).toHaveValue(originalTemplate);
      await editor.getByRole('button',{name:'Move Moon passage earlier',exact:true}).click();
      await expect(editor.getByLabel('Template passage sections').locator('li').first()).toContainText('Moon passage');
      const moved = await field.inputValue();
      expect(moved.indexOf('{{#moonWriteup}}')).toBeLessThan(moved.indexOf('{{#sunSummary}}'));
      await editor.getByRole('button',{name:'Move Moon passage later',exact:true}).click();
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
      const copy='{{#moonWriteup}}Synthetic opening for {{moonSign}}.\n\n{{#hasFullMoon}}Conditional synthetic wording.{{/hasFullMoon}}Complete synthetic ending.\n\n[Read more](?date=2026-09-26#sky/lunation/2026-09-26/aries){{/moonWriteup}}';
      await editor.getByRole('button',{name:'Draft',exact:true}).click();
      await field.fill('{{#moonWriteup}}Synthetic starter.{{/moonWriteup}}');
      await editor.getByRole('button',{name:'Edit Moon passage',exact:true}).click();
      await sectionField.fill(copy.slice('{{#moonWriteup}}'.length,-'{{/moonWriteup}}'.length));
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Synthetic opening for Aries.');
      await expect(editor.getByLabel('Assembled passage preview').locator('p').filter({hasText:/synthetic|Read more/i})).toHaveCount(3);
      await expect(editor.getByLabel('Assembled passage preview').getByRole('link',{name:'Read more'})).toHaveAttribute('href','/?date=2026-09-26#sky/lunation/2026-09-26/aries');
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
      await expect(sectionField).toBeVisible();
      await page.reload();
      await editor.getByLabel('Passage date',{exact:true}).fill(date);
      await editor.getByLabel('Passage time zone',{exact:true}).fill(location.timeZone);
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(field).toHaveValue(copy,{timeout:60000});
      await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Published.');
      const reader=await context.newPage();
      await emptyLastKnownGoodSnapshot(reader);
      await reader.goto(`/?date=${date}#calendar?view=day&date=${date}`);
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Complete synthetic ending.',{timeout:60000});
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Synthetic opening for Aries.');
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).not.toContainText('Conditional synthetic wording.');
      const revised='Synthetic revised opening.\n\nComplete revised ending.';
      await field.fill(revised);
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
      await reader.reload();
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Complete synthetic ending.',{timeout:60000});
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).not.toContainText('Complete revised ending.');
      await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Published.');
      await reader.goto(`/?date=${date}#calendar?view=week&date=${date}`);
      await reader.getByRole('tablist',{name:'Calendar view'}).getByRole('tab',{name:'Week',exact:true}).click();
      await expect(reader.getByRole('tabpanel',{name:'Week',exact:true})).toBeVisible();
      await expect(reader.getByLabel('Lunar calendar')).toContainText('Complete revised ending.',{timeout:60000});
      await editor.getByText('Publication and history',{exact:true}).click();
      await editor.getByRole('button',{name:'Version history',exact:true}).click();
      await expect(editor.getByText('Saved versions',{exact:true})).toBeVisible();
      await expect(editor.locator('details details')).not.toHaveCount(0);
      await editor.getByLabel('Passage editing scope').selectOption('shared');
      await expect(field).toBeVisible();
      const shared='Shared synthetic opening.\n\nShared synthetic final sentence.';
      await field.fill(shared);
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
      await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Published.');
      await editor.getByLabel('Passage editing scope').selectOption('date');
      await expect(field).toHaveValue(revised);
      await openPanel('Publication and history');
      await editor.getByRole('button',{name:'Use shared template for this date',exact:true}).click();
      await expect(field).toHaveValue(shared);
      await reader.reload();
      await expect(reader.getByLabel('Lunar calendar')).toContainText('Shared synthetic final sentence.',{timeout:60000});
      await expect(reader.getByLabel('Lunar calendar')).not.toContainText('Complete revised ending.');
      await openPanel('Publication and history');
      await expect(editor.getByRole('button',{name:'Version history',exact:true})).toBeVisible();
      if (width===1440 && theme==='light') {
        const restored='Synthetic new dated opening.\n\nSynthetic new dated final sentence.';
        await field.fill(restored);
        await editor.getByRole('button',{name:'Save draft',exact:true}).click();
        await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
        await reader.evaluate(() => localStorage.setItem('tldrastro:content-update', JSON.stringify({contentKey:'calendar-passage/daily/shared',published:true,updatedAt:new Date().toISOString()})));
        await expect(editor.getByRole('note')).toContainText('Your wording has been preserved.');
        await expect(field).toHaveValue(restored);
        await expect(editor.getByRole('button',{name:'Publish passage',exact:true})).toBeDisabled();
        await editor.getByRole('button',{name:'Reload saved status',exact:true}).click();
        await expect(field).toHaveValue(restored);
        await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
        await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Published.');
        await reader.reload();
        await expect(reader.getByLabel('Lunar calendar')).toContainText('Synthetic new dated final sentence.',{timeout:60000});
        await openPanel('Publication and history');
      await editor.getByRole('button',{name:'Use shared template for this date',exact:true}).click();
        await expect(field).toHaveValue(shared);
      }
      await editor.getByRole('button',{name:'Draft',exact:true}).click();
      // Invalid slots remain editable but cannot publish; an outage retains the draft.
      await field.fill('{{unknownVariable}}');
      await expect(editor.getByLabel('Calendar publication impact')).toContainText('Unknown variable');
      await expect(editor.getByLabel('Daily overview impact')).toContainText('Cannot compare');
      await expect(editor.getByLabel('Moon event card impact')).toContainText('Cannot compare');
      await expect(editor.getByLabel('Calendar publication impact')).not.toContainText('Unchanged');
      await expect(editor.getByLabel('Template variable key')).toContainText('Unknown variable');
      await expect(editor.getByRole('button',{name:'Publish passage',exact:true})).toBeDisabled();
      await field.fill('');
      await expect(editor.getByLabel('Daily overview impact')).toContainText('Cannot compare');
      await expect(editor.getByLabel('Moon event card impact')).toContainText('Cannot compare');
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
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Choose Load passage');
      await editor.getByLabel('Passage date',{exact:true}).fill(date);
      await expect(field).toHaveValue(shared);
      await editor.getByText('Sources and variables',{exact:true}).click();
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
          if (view==='month') {
            await expect(page.getByRole('link',{name:'Open Monthly horoscopes',exact:true})).toHaveAttribute('href','#horoscopes');
            await expect(page.getByRole('region',{name:'Assembled Calendar passage',exact:true})).toHaveCount(0);
            continue;
          }
          await editor.getByLabel('Passage date',{exact:true}).fill(date);
          await editor.getByLabel('Passage time zone',{exact:true}).fill(location.timeZone);
          await editor.getByRole('button',{name:'Load passage',exact:true}).click();
          await expect(field).toBeVisible({timeout:60000});
          if (view==='weekly') {
            let week=await field.inputValue();
            const picker=editor.getByLabel('Passage variable',{exact:true});
            const variable=await picker.inputValue();
            expect(variable).not.toBe('');
            expect(variable).not.toBe('date');
            await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(0,0));
            await editor.getByText('Insert a variable',{exact:true}).click();
          await editor.getByRole('button',{name:'Insert variable at cursor',exact:true}).click();
            await expect(field).toHaveValue(`{{${variable}}}`+week);
            await field.fill(week);
            for (const day of ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']) {
              const name=day.toLowerCase()+'Writeup';
              const start=week.indexOf('{{#'+name+'}}')+('{{#'+name+'}}').length;
              const end=week.indexOf('{{/'+name+'}}',start);
              await openPanel('Template details');
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
            await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
            await editor.getByRole('button',{name:'Reload saved status',exact:true}).click();
            await expect(field).toHaveValue(week,{timeout:60000});
          }
          await field.fill(`Synthetic ${view} opening.\n\nSynthetic ${view} complete ending.`);
          await editor.getByRole('button',{name:'Save draft',exact:true}).click();
          await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
          await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
          await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Published.');
          await expect(editor.getByRole('link',{name:'Open published Calendar'})).toHaveAttribute('href',`/?date=${date}#calendar?view=${view}&date=${date}`);
          await reader.goto('about:blank');
          await reader.goto(`/?date=${date}#calendar?view=${view}&date=${date}`);
          const overview = reader.getByRole('region',{name:'Weekly overview',exact:true});
          await expect(overview).toContainText(`Synthetic ${view} opening.`,{timeout:60000});
          await expect(overview).toContainText(`Synthetic ${view} complete ending.`);
          expect(await editor.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
        }
      }
      expect(errors).toEqual([]);
      const monthlyHandoff=page.getByRole('region',{name:'Monthly overview template',exact:true});
      expect(await monthlyHandoff.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
      await monthlyHandoff.scrollIntoViewIfNeeded();
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({fullPage:true,path:`test-results/calendar-passage-editor-${width}-${theme}.png`});
    } finally {store.close();}
  });
}
