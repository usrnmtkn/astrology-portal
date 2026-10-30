import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { getLunarCalendarMonth, getLunarCalendarWeek } from '../../apps/web/src/services/ephemeris';
import { emptyLastKnownGoodSnapshot } from '../helpers/bundled-publications';
import { expectStudioPanel, expectStudioReadingType } from '../helpers/studio-readability';
import { calendarPassageKey, calendarPassageRecord } from '../../src/shared/features/calendar/calendarPassageTemplates';
import { zonedDateTimeToUtc } from '../../apps/web/src/services/timezones';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';

const location = {label:'QA reference',latitude:0,longitude:0,timeZone:'America/New_York'};
const date = '2026-10-21';
for (const [width,theme] of [[1440,'light'],[390,'dark'],[390,'light'],[1440,'dark']] as const) {
  test(`Shared Calendar wording edits complete sources from the top level ${width} ${theme}`, async ({page,context}) => {
    test.setTimeout(150_000);
    const store = await studioApiStore([], {uuidIds:true});
    const key = 'authored/calendar-moon-transition/aquarius/pisces';
    const calendar = await getLunarCalendarMonth(location,new Date(`${date}T16:00:00Z`));
    const original = (await store.call({method:'GET',url:'/api/admin/generated-content-inventory?'+new URLSearchParams({contentKey:key})})).payload.rows[0];
    const sourceRefresh={pending:null as Promise<void>|null,release:()=>{},held:false};
    try {
      await context.addInitScript(({location,theme})=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        localStorage.setItem('tldrastro:selectedLocation',JSON.stringify(location));
        localStorage.setItem('tldrastro:studio-theme',theme);
        localStorage.setItem('tldrastro:theme',theme);
      },{location,theme});
      await context.route('**/rest/v1/**',async route=> {
        const rows = route.request().url().includes('/content_publications?') ? await store.call({method:'publications'}) : [];
        await route.fulfill({json:rows});
      });
      await routeStudioInventoryApi(context,{call:store.call,answer:async(route,url)=>{
        if (url.pathname==='/api/content-reader'||url.pathname==='/api/admin/content-live-status') {
          const result=await store.call({method:'POST',body:route.request().postDataJSON(),url:url.pathname});
          await route.fulfill({status:result.status,json:result.payload});return true;
        }
        if (url.pathname==='/api/content-publications') {
          const publications=canonicalPublicationLedger(await store.call({method:'publications'}));
          await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:'tldr-publications/v1',publications}});return true;
        }
        if (url.pathname==='/api/calendar') {
          const selected=url.searchParams.get('date') ?? date;
          const instant=zonedDateTimeToUtc(selected,'12:00 PM',location.timeZone);
          const selectedCalendar=url.searchParams.get('mode')==='month'
            ? selected===date ? calendar : await getLunarCalendarMonth(location,instant)
            : await getLunarCalendarWeek(location,instant);
          await route.fulfill({json:{ok:true,calendar:selectedCalendar}}); return true;
        }
        if (!['/api/admin/content-history','/api/admin/content-publication'].includes(url.pathname)) return false;
        const result=await store.call({method:route.request().method(),body:route.request().method()==='GET'?undefined:route.request().postDataJSON(),url:url.pathname+url.search});
        await route.fulfill({status:result.status,json:result.payload}); return true;
      }});
      await page.route('**/api/admin/generated-content-inventory?**',async route=>{
        const url=new URL(route.request().url());
        const pending=sourceRefresh.pending;
        if (pending && url.searchParams.getAll('contentKeys').includes(calendarPassageKey('daily'))) {
          sourceRefresh.held=true;
          await pending;
        }
        const result=await store.call({method:'GET',url:url.pathname+url.search});
        await route.fulfill({status:result.status,json:result.payload});
      });
      await page.setViewportSize({width,height:1000});
      await page.goto('/admin/content#calendar-writeups');
      const workspace=page.getByRole('region',{name:'Assembled Calendar passage',exact:true});
      const load = async (selected=date) => {
        await workspace.getByLabel('Passage date',{exact:true}).fill(selected);
        await workspace.getByLabel('Passage time zone',{exact:true}).fill(location.timeZone);
        await workspace.getByRole('button',{name:'Load passage',exact:true}).click();
        await expect(workspace.getByRole('textbox',{name:'Complete passage wording',exact:true})).toBeVisible({timeout:60000});
        await workspace.getByLabel('Passage editing scope').selectOption('shared');
        await expect(workspace.getByLabel('Shared passage wording',{exact:true})).toBeVisible({timeout:60000});
      };
      await load();
      const wording=workspace.getByLabel('Shared passage wording',{exact:true});
      const structure=workspace.locator('details').filter({has:page.locator(':scope > summary').filter({hasText:/^Template structure$/})});
      await expect(structure).toHaveAttribute('open','');
      await expect(wording).toContainText(original.body,{useInnerText:true});
      await expect(wording).not.toContainText('{{moonWriteup}}');
      expect(await workspace.getByRole('heading').allTextContents()).toEqual(['Complete passage','Reader preview','Template']);
      await expectStudioReadingType(wording.locator('.studio-preview-canvas p').first());
      const edit=wording.locator(`[data-calendar-source-key="${key}"]`);
      await expect(edit).toBeVisible();
      const metrics=(node:Element)=>{const c=getComputedStyle(node);return [c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight,c.letterSpacing,c.marginTop,c.marginBottom,c.textTransform,c.textAlign];};
      expect(await structure.locator(':scope > summary').evaluate(metrics)).toEqual(await workspace.getByText('Template details',{exact:true}).evaluate(metrics));
      await workspace.screenshot({path:`test-results/calendar-shared-wording-${width}-${theme}.png`});
      const sourceEditor=page.getByRole('dialog',{name:'Generated content editor'});
      const body=sourceEditor.locator('textarea[data-sky-field="body"]');
      await wording.locator('[data-calendar-source-key="cms/sky-daily-summary/sun/libra"]').click();
      await expect(body).not.toHaveValue('');
      await expect(body).not.toHaveValue('{{sunSummary}}');
      await sourceEditor.getByRole('button',{name:'Close',exact:true}).click();
      await edit.click();
      await expect(body).toHaveValue(original.body);
      expect(await sourceEditor.evaluate(node=>Boolean(node.closest('[aria-label="Assembled Calendar passage"]')))).toBe(true);
      const copy='Synthetic reusable Moon opening.\n\nComplete reusable Moon final sentence.';
      await body.fill(copy);
      await sourceEditor.screenshot({path:`test-results/calendar-shared-source-editor-${width}-${theme}.png`});
      const preview=workspace.getByRole('region',{name:'Calendar reader workspace',exact:true});
      await expect(workspace.getByLabel('Assembled passage preview')).not.toContainText(copy,{useInnerText:true});
      sourceRefresh.pending=new Promise<void>(resolve=>{sourceRefresh.release=()=>resolve();});
      try {
        await sourceEditor.getByRole('button',{name:'Save draft',exact:true}).click();
        await expect.poll(()=>sourceRefresh.held).toBe(true);
        // Refreshing the reader must not temporarily close the source editor.
        await expect(sourceEditor).toBeVisible();
        await expect(body).toHaveValue(copy);
      } finally {
        sourceRefresh.release();
        sourceRefresh.pending=null;
      }
      await expect.poll(async()=> (await store.call({method:'rows'})).find((row:any)=>row.content_key===key&&row.status==='DRAFT')?.sections?.packageDraft?.body).toBe(copy);
      // Saving a reusable draft cannot change either source or wrapper in readers.
      const rows=await store.call({method:'rows'});
      expect(rows.filter((row:any)=>row.content_key.startsWith('calendar-passage/'))).toEqual([]);
      expect(rows.filter((row:any)=>row.content_key===key&&row.status==='LIVE')).toEqual([]);
      if (await sourceEditor.isVisible()) await sourceEditor.getByRole('button',{name:'Close',exact:true}).click();
      await preview.getByRole('button',{name:'Draft',exact:true}).click();
      await expect(workspace.getByLabel('Assembled passage preview')).toContainText(copy,{useInnerText:true});
      await preview.getByRole('button',{name:'Published',exact:true}).click();
      await expect(workspace.getByLabel('Assembled passage preview')).not.toContainText(copy,{useInnerText:true});
      const reader=await context.newPage();
      await emptyLastKnownGoodSnapshot(reader);
      await reader.goto(`/?date=${date}#calendar?view=day&date=${date}`);
      const readerDay=reader.getByLabel('Selected lunar day',{exact:true});
      await expect(readerDay).toBeVisible({timeout:60000});
      await expect(readerDay).toContainText(original.body,{useInnerText:true});
      await expect(readerDay).not.toContainText(copy,{useInnerText:true});
      await page.reload();
      await load();
      await wording.locator(`[data-calendar-source-key="${key}"]`).click();
      await expect(body).toHaveValue(copy);
      await expect(sourceEditor.getByRole('button',{name:'Save & publish',exact:true})).toBeVisible();
      await sourceEditor.getByRole('button',{name:'Save & publish',exact:true}).click();
      await expect.poll(async()=> (await store.call({method:'rows'})).find((row:any)=>row.content_key===key&&row.status==='LIVE')?.body).toBe(copy);
      if (await sourceEditor.isVisible()) await sourceEditor.getByRole('button',{name:'Close',exact:true}).click();
      await expect(sourceEditor).not.toBeVisible();
      const templateBeforeNotice=await workspace.getByRole('textbox',{name:'Complete passage wording',exact:true}).inputValue();
      const rowsBeforeNotice=await store.call({method:'rows'}),publicationsBeforeNotice=await store.call({method:'publications'});
      // A retained Draft preview selection is not an active source-edit session.
      await page.evaluate(async key=>{
        window.dispatchEvent(new StorageEvent('storage',{key:'tldrastro:content-update',newValue:JSON.stringify({contentKey:key,published:true,updatedAt:new Date().toISOString()})}));
        await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      },key);
      await expect(workspace.getByRole('note')).toContainText('Your wording has been preserved.');
      await expect(workspace.getByRole('textbox',{name:'Complete passage wording',exact:true})).toHaveValue(templateBeforeNotice);
      expect(await store.call({method:'rows'})).toEqual(rowsBeforeNotice);
      expect(await store.call({method:'publications'})).toEqual(publicationsBeforeNotice);
      await workspace.getByRole('button',{name:'Reload saved status',exact:true}).click();
      await expect(wording).toContainText('Complete reusable Moon final sentence.',{timeout:60000});
      await expect(workspace.getByLabel('Assembled passage preview')).toContainText('Complete reusable Moon final sentence.');
      await reader.reload();
      await expect(readerDay).toContainText(copy,{timeout:60000,useInnerText:true});
      await expect(structure).toHaveAttribute('open','');
      await expect(workspace.getByRole('textbox',{name:'Complete passage wording',exact:true})).toHaveValue(/\{\{moonWriteup\}\}/u);
      await structure.locator(':scope > summary').click();
      await workspace.getByRole('button',{name:'Edit complete template',exact:true}).click();
      await expect(structure).toHaveAttribute('open','');
      await expect(workspace.getByRole('textbox',{name:'Complete passage wording',exact:true})).toBeFocused();
      // Section selection still opens the real Moon wording, never only its token.
      await workspace.getByLabel('Calendar editing section').selectOption('moonWriteup-1');
      await expect(wording).toContainText(copy,{useInnerText:true});
      await expect(wording.getByRole('group')).toHaveCount(1);
      await workspace.getByLabel('Passage date').fill('2026-11-17');
      await workspace.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(wording).toContainText(copy,{timeout:60000,useInnerText:true});
      await workspace.getByLabel('Passage date').fill('2026-10-22');
      await workspace.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(workspace.getByLabel('Assembled passage preview')).not.toContainText(copy,{timeout:60000,useInnerText:true});
      // The owner's reported date can have a dated edition. Shared source
      // editing must stay available while its reader preview retains precedence.
      const datedKey=calendarPassageKey('daily','2026-10-28',location.timeZone);
      const datedCopy='Synthetic date-only opening.\n\nComplete date-only final sentence.';
      const record=calendarPassageRecord(datedKey,datedCopy);
      const created=await store.call({method:'POST',url:'/api/admin/generated-content',body:{contentKey:datedKey,surface:'sky',mode:'feed',eventType:'calendar-passage',blockType:'fallback_hook',status:'DRAFT',lane:'reference',headline:record.headline,body:datedCopy,
        facts:{fallbackArchitectureV3:true},provider:'tldrastro-fallback-architecture-v3',sections:{packageRecord:record,packageDraft:record},sourceSnapshot:{sourcePackage:record.source_package,content_role:'full_copy',review_status:'needs_review'}}});
      expect(created.status).toBe(200);
      const saved=created.payload.rows[0];
      const published=await store.call({method:'PATCH',url:'/api/admin/generated-content',body:{id:saved.id,expectedUpdatedAt:saved.updated_at,ownerAction:'approve-package-revision'}});
      expect(published.status).toBe(200);
      await page.reload();
      await load('2026-10-28');
      await expect(wording.getByRole('group',{name:'Shared Moon passage wording',exact:true})).not.toContainText(datedCopy,{useInnerText:true});
      await expect(wording.getByRole('group',{name:'Shared Moon passage wording',exact:true}).getByRole('button').first()).toBeVisible();
      await expect(workspace.getByLabel('Assembled passage preview')).toContainText(datedCopy,{useInnerText:true});
    } finally {sourceRefresh.release();store.close();}
  });
}
for (const [width,theme] of [[1440,'light'],[390,'dark'],[390,'light'],[1440,'dark'],[710,'dark']] as const) {
  test(`Calendar workspace date and shared source ${width} ${theme}`, async ({page,context}) => {
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
      const preview=editor.getByRole('region',{name:'Calendar reader workspace',exact:true});
      const impact=preview.getByLabel('Calendar publication impact');
      const panel=(name:string)=>editor.locator('details').filter({has:page.locator(':scope > summary').filter({hasText:new RegExp(`^${name}$`)})});
      for (const name of ['Source and Moon timing','Values and sources for this passage','Insert a variable','Template details','Sources and variables','Publication and history','Reader source details']) {
        await expect(panel(name)).not.toHaveAttribute('open','');
        await expect(panel(name).locator(':scope > summary')).toBeVisible();
      }
      await expect(editor.getByRole('button',{name:'Save draft',exact:true})).toBeVisible();
      await expectStudioPanel(editor.locator('.studio-calendar-template-editor'));
      await expectStudioPanel(preview);
      // Variable highlighting paints readable copy in the backdrop, with the
      // transparent textarea retaining native selection and cursor behavior.
      await expectStudioReadingType(editor.locator('.studio-highlighted-backdrop').first());
      await expect(page.locator('.admin-dashboard-header')).toHaveCSS('position','static');
      await field.scrollIntoViewIfNeeded();
      expect(await field.evaluate(node=>{const r=node.getBoundingClientRect();const target=document.elementFromPoint(r.x+r.width/2,Math.max(r.y,0)+Math.min(r.height,innerHeight-r.y)/2);return target===node;})).toBe(true);
      await page.screenshot({path:`test-results/calendar-readability-workspace-${width}-${theme}.png`});
      expect(await editor.getByRole('heading').allTextContents()).toEqual(['Complete passage','Reader preview']);
      expect(await field.evaluate(node=>{const root=node.closest('.studio-calendar-template-editor')!;const save=Array.from(root.querySelectorAll('button')).find(button=>button.textContent==='Save draft')!;const template=Array.from(root.querySelectorAll('summary')).find(summary=>summary.textContent==='Template details')!;return Boolean(node.compareDocumentPosition(save)&Node.DOCUMENT_POSITION_FOLLOWING)&&Boolean(save.compareDocumentPosition(template)&Node.DOCUMENT_POSITION_FOLLOWING);})).toBe(true);
      const metricsForLabel=(node:Element)=>{const c=getComputedStyle(node);return [c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight,c.letterSpacing,c.marginTop,c.marginBottom,c.textTransform,c.textAlign];};
      expect(await panel('Template details').locator(':scope > summary').evaluate(metricsForLabel)).toEqual(await panel('Insert a variable').locator(':scope > summary').evaluate(metricsForLabel));
      await panel('Source and Moon timing').locator(':scope > summary').click();
      const timing=editor.getByLabel('Moon timing for selected day');
      await expect(timing).toBeVisible();
      await expectStudioPanel(editor.getByLabel('Calendar editing source'));
      await expectStudioPanel(timing);
      expect(await timing.locator('dt').allTextContents()).toEqual(['Day starts in:','Change today:','Reader Moon sign at noon:']);
      expect(await timing.locator('dd').allTextContents()).toEqual(['Aquarius','Aquarius → Pisces · Oct 21, 2026, 8:35 AM EDT','Pisces']);
      await expectStudioReadingType(timing.locator('dt').first(),'label');
      await expectStudioReadingType(timing.locator('dd').first());
      await expectStudioReadingType(timing.locator('p').last());
      const label=await timing.locator('dt').first().boundingBox();
      const value=await timing.locator('dd').first().boundingBox();
      if (width<=720) expect(value!.y).toBeGreaterThan(label!.y+label!.height);
      else expect(value!.x).toBeGreaterThan(label!.x+label!.width);
      await timing.scrollIntoViewIfNeeded();
      await page.screenshot({path:`test-results/calendar-readability-moon-${width}-${theme}.png`});
      await panel('Source and Moon timing').locator(':scope > summary').click();
      const expectImpact=async (overview:string, event:string) => {
        await expect(impact.getByLabel('Daily overview impact')).toHaveText(`Daily overview · ${overview}`);
        await expect(impact.getByLabel('Moon event card impact')).toHaveText(`Moon event card · ${event}`);
      };
      await expect(preview.getByRole('button',{name:'Published',exact:true})).toHaveAttribute('aria-pressed','true');
      await expect(preview).toContainText(date+' · '+location.timeZone);
      await expect(impact).toContainText('Reader wording unchanged');
      await expectImpact('Unchanged','Unchanged');
      expect(await impact.locator('[aria-label$=" impact"]').allTextContents()).toEqual(['Daily overview · Unchanged','Moon event card · Unchanged']);
      const originalReader=await editor.getByLabel('Assembled passage preview').innerText();
      // The shared template and its complete readable passage stay together;
      // publication metadata must not push the writing behind the controls.
      const rowsBeforeRead=await store.call({method:'rows'});
      const publicationsBeforeRead=await store.call({method:'publications'});
      const datedWording=await field.inputValue();
      await editor.getByLabel('Passage editing scope').selectOption('shared');
      const templatePane=editor.getByRole('region',{name:'Calendar template workspace',exact:true});
      const templateHeading=templatePane.getByRole('heading',{name:'Template',exact:true});
      await expect(templateHeading).toBeVisible();
      expect(await editor.getByRole('heading').allTextContents()).toEqual(['Complete passage','Reader preview','Template']);
      const headingMetrics=(node:Element)=>{const c=getComputedStyle(node);return [c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight,c.letterSpacing,c.marginTop,c.marginBottom,c.textTransform,c.textAlign];};
      expect(await templateHeading.evaluate(headingMetrics)).toEqual(await preview.getByRole('heading',{name:'Reader preview',exact:true}).evaluate(headingMetrics));
      const completeTemplate=await field.inputValue();
      expect(completeTemplate).toContain('{{moonWriteup}}');
      const structure=panel('Template structure');
      await expect(structure).toHaveAttribute('open','');
      await editor.getByLabel('Calendar editing section',{exact:true}).selectOption({label:'Moon passage'});
      await expect(editor.getByRole('textbox',{name:'Moon passage wording',exact:true})).toHaveValue(/\{\{\s*moonWriteup\s*\}\}/u);
      const readerCopy=preview.getByLabel('Assembled passage preview',{exact:true});
      await expect(readerCopy).toHaveText(originalReader,{useInnerText:true});
      await expect(readerCopy.getByRole('status')).toHaveCount(0);
      await expect(readerCopy).not.toContainText('{{moonWriteup}}');
      const copyBox=await readerCopy.boundingBox();
      const impactBox=await impact.boundingBox();
      expect(copyBox!.y+copyBox!.height).toBeLessThanOrEqual(impactBox!.y);
      const readerBox=await preview.boundingBox();
      const templateBox=await templatePane.boundingBox();
      if (width>1000) expect(readerBox!.x+readerBox!.width).toBeLessThanOrEqual(templateBox!.x);
      else expect(readerBox!.y+readerBox!.height).toBeLessThanOrEqual(templateBox!.y);
      const showTemplate=templatePane.getByRole('button',{name:'Edit complete template',exact:true});
      await expect(showTemplate).toBeVisible();
      await expect(panel('Template details')).not.toHaveAttribute('open','');
      await structure.locator(':scope > summary').click();
      await expect(structure).not.toHaveAttribute('open','');
      await expect(templatePane.getByRole('button',{name:'Save draft',exact:true})).toBeVisible();
      await expect(templatePane.getByRole('button',{name:'Publish passage',exact:true})).toBeVisible();
      await expect(templatePane.getByLabel('Shared passage wording',{exact:true})).toBeVisible();
      await showTemplate.click();
      await expect(structure).toHaveAttribute('open','');
      await expect(field).toHaveValue(completeTemplate);
      await expect(field).toBeFocused();
      await expect(readerCopy).toHaveText(originalReader,{useInnerText:true});
      const unsavedTemplate=completeTemplate+'\n\nSynthetic unsaved template final sentence.';
      await field.fill(unsavedTemplate);
      await structure.locator(':scope > summary').click();
      await expect(structure).not.toHaveAttribute('open','');
      await expect(templatePane.getByRole('button',{name:'Save draft',exact:true})).toBeEnabled();
      await showTemplate.click();
      await expect(field).toBeFocused();
      await expect(field).toHaveValue(unsavedTemplate);
      await field.fill(completeTemplate);
      expect(await store.call({method:'rows'})).toEqual(rowsBeforeRead);
      expect(await store.call({method:'publications'})).toEqual(publicationsBeforeRead);
      await page.screenshot({path:`test-results/calendar-full-writeup-and-template-${width}-${theme}.png`,fullPage:true});
      await editor.getByLabel('Passage editing scope').selectOption('date');
      await expect(field).toHaveValue(datedWording);
      await editor.getByLabel('Calendar editing passage').selectOption('moon');
      const moon=editor.getByRole('textbox',{name:'Moon passage wording',exact:true});
      await expect(moon).toBeVisible();
      const sharedOriginal=(await store.call({method:'GET',url:'/api/admin/generated-content-inventory?'+new URLSearchParams({contentKey:'authored/calendar-moon-transition/aquarius/pisces'})})).payload.rows[0].body;
      await expect(editor.getByLabel('Calendar editing source')).toContainText('Date-only edit');
      await editor.getByText('Values and sources for this passage',{exact:true}).click();
      await expect(editor.getByLabel('Calendar passage values and sources').getByText(/Transition source for this sign pair/)).toBeVisible();
      await expect(editor.getByLabel('Calendar passage values and sources')).toContainText('authored/calendar-moon-transition/aquarius/pisces');
      const copy='Synthetic dated Moon opening: {{moonSign}}.\n\nComplete dated Moon final sentence.';
      await moon.fill(copy);
      await expect(editor.getByLabel('Calendar passage values and sources')).toContainText('Aquarius');
      await expect(editor.getByLabel('Calendar passage values and sources')).toContainText('Source: Swiss Ephemeris calculation for 2026-10-21 · America/New_York.');
      await expect(editor.getByLabel('Assembled passage preview')).toHaveText(originalReader,{useInnerText:true});
      await expect(impact).toContainText('Reader wording will change');
      await expect(impact).toContainText('Date-only impact');
      await expectImpact('Changed','Unchanged');
      await preview.getByRole('button',{name:'Draft',exact:true}).click();
      await expectImpact('Changed','Unchanged');
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Synthetic dated Moon opening: Aquarius.');
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Complete dated Moon final sentence.');
      await expect(editor.getByLabel('Passage date')).toBeDisabled();
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
      await expect(preview).toContainText('Draft · saved unpublished wording.');
      const complete=await editor.locator('textarea[aria-label="Complete passage wording"]').inputValue();
      expect(complete).toContain(copy);
      const privateRows=await store.call({method:'rows'});
      expect(privateRows.find((row:any)=>row.content_key.startsWith('calendar-passage/daily/')).status).toBe('DRAFT');
      await page.reload();
      await editor.getByLabel('Passage date').fill(date);
      await editor.getByLabel('Passage time zone').fill(location.timeZone);
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(field).toHaveValue(complete,{timeout:60000});
      await expectImpact('Changed','Unchanged');
      await expect(editor.getByLabel('Assembled passage preview')).toHaveText(originalReader,{useInnerText:true});
      await preview.getByRole('button',{name:'Draft',exact:true}).click();
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Complete dated Moon final sentence.');
      await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Published.');
      await preview.getByRole('button',{name:'Published',exact:true}).click();
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Complete dated Moon final sentence.');
      const reader=await context.newPage();
      await emptyLastKnownGoodSnapshot(reader);
      await reader.goto(`/?date=${date}#calendar?view=day&date=${date}`);
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Synthetic dated Moon opening: Aquarius.',{timeout:60000});
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Complete dated Moon final sentence.');
      // A shared Moon draft must not masquerade as an edit to this expanded dated passage.
      await editor.getByLabel('Calendar editing passage').selectOption('moon');
      await expect(moon).toHaveValue(copy);
      await editor.getByLabel('Passage editing scope').selectOption('shared');
      await expect(field).toHaveValue(sharedOriginal,{timeout:60000});
      await expect(editor.getByLabel('Calendar editing source')).toContainText('Shared edit');
      await editor.getByText('Source and Moon timing',{exact:true}).click();
      await expect(panel('Source and Moon timing')).toContainText('authored/calendar-moon-transition/aquarius/pisces');
      await editor.getByText('Values and sources for this passage',{exact:true}).click();
      await expect(editor.getByLabel('Calendar passage values and sources')).toContainText('8:35 AM');
      const shared='Synthetic shared Moon opening.\n\nComplete shared Moon final sentence.';
      await field.fill(shared);
      await expect(impact).toContainText('Reader wording will change');
      await expectImpact('Unchanged','Changed');
      await expect(impact).toContainText('Shared impact');
      await expect(impact).toContainText('date-only passage');
      await preview.getByRole('button',{name:'Draft',exact:true}).click();
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Complete dated Moon final sentence.');
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
      await editor.getByRole('button',{name:'Reload saved status',exact:true}).click();
      await expect(field).toHaveValue(shared);
      await editor.getByRole('button',{name:'Publish passage',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Published.');
      await preview.getByRole('button',{name:'Draft',exact:true}).click();
      await expect(preview).toContainText('Draft · current published wording; no draft changes.');
      await expectImpact('Unchanged','Unchanged');
      await reader.reload();
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Complete dated Moon final sentence.',{timeout:60000});
      await expect(reader.getByRole('region',{name:'Moon guidance',exact:true})).not.toContainText('Complete shared Moon final sentence.');
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Complete shared Moon final sentence.');
      await expect(editor.getByLabel('Moon transition reader passage')).toContainText('Complete shared Moon final sentence.');
      // A second edit must fork the LIVE source, survive reload and keep both reader units published.
      const publishedShared=(await store.call({method:'rows'})).find((row:any)=>row.content_key==='authored/calendar-moon-transition/aquarius/pisces'&&row.status==='LIVE');
      const pendingShared=shared.replace('Complete shared Moon final sentence.','Complete pending Moon final sentence.');
      await field.fill(pendingShared);
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
      const afterSave=await store.call({method:'rows'});
      expect(afterSave.find((row:any)=>row.id===publishedShared.id)).toEqual(publishedShared);
      expect(afterSave.find((row:any)=>row.content_key===publishedShared.content_key&&row.mode==='studio-draft').status).toBe('DRAFT');
      await page.reload();
      await editor.getByLabel('Passage date').fill(date);
      await editor.getByLabel('Passage time zone').fill(location.timeZone);
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(field).toHaveValue(complete,{timeout:60000});
      await editor.getByLabel('Calendar editing passage').selectOption('moon');
      await editor.getByLabel('Passage editing scope').selectOption('shared');
      await expect(field).toHaveValue(pendingShared,{timeout:60000});
      await expect(editor.getByRole('note')).toHaveCount(0);
      await expect(editor.getByLabel('Moon transition reader passage')).toContainText('Complete shared Moon final sentence.');
      await preview.getByRole('button',{name:'Draft',exact:true}).click();
      await expect(editor.getByLabel('Moon transition reader passage')).toContainText('Complete pending Moon final sentence.');
      await expect(editor.getByLabel('Assembled passage preview')).toContainText('Complete dated Moon final sentence.');
      await reader.reload();
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Complete shared Moon final sentence.',{timeout:60000});
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).not.toContainText('Complete pending Moon final sentence.');
      // Returning the dated passage to shared selection now exposes the exact shared source.
      await editor.getByLabel('Passage editing scope').selectOption('date');
      await expect(moon).toHaveValue(copy);
      await editor.getByText('Publication and history',{exact:true}).click();
      await editor.getByRole('button',{name:'Use shared template for this date',exact:true}).click();
      await expect(moon).toHaveValue(new RegExp('Complete shared Moon final sentence'));
      await reader.reload();
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Synthetic shared Moon opening.',{timeout:60000});
      await expect(reader.getByLabel('Selected lunar day',{exact:true})).toContainText('Complete shared Moon final sentence.');
      // Without a dated override, a pending shared transition changes both reader units.
      await editor.getByLabel('Passage editing scope').selectOption('shared');
      await expect(field).toHaveValue(pendingShared);
      await expectImpact('Changed','Changed');
      await preview.getByRole('button',{name:'Published',exact:true}).click();
      await expectImpact('Changed','Changed');
      await preview.getByRole('button',{name:'Draft',exact:true}).click();
      await expectImpact('Changed','Changed');
      await editor.getByLabel('Passage editing scope').selectOption('date');
      // A day without a Moon ingress explains the absent event instead of suggesting a hidden change.
      await editor.getByLabel('Passage date').fill('2026-10-22');
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(impact).toContainText('No Moon event card on this date.',{timeout:60000});
      await expectImpact('Unchanged','Unchanged');
      await expect(editor.getByLabel('Moon transition reader passage')).toHaveCount(0);
      await editor.getByLabel('Passage date').fill(date);
      // Date and zone changes clear the stale reading while calculating the new selection.
      await editor.getByLabel('Passage time zone').fill('Asia/Tokyo');
      await expect(preview).toBeHidden();
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(preview).toContainText(date+' · Asia/Tokyo',{timeout:60000});
      await expect(panel('Source and Moon timing')).toContainText('Asia%2FTokyo');
      await editor.getByLabel('Passage date').fill('2026-10-24');
      await expect(preview).toBeHidden();
      await editor.getByRole('button',{name:'Load passage',exact:true}).click();
      await expect(preview).toContainText('2026-10-24 · Asia/Tokyo',{timeout:60000});
      await panel('Source and Moon timing').locator(':scope > summary').click();
      await expect(editor.getByLabel('Moon timing for selected day')).toContainText('Pisces → Aries');
      expect(await editor.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
      const headingStyles=(node:Element)=>{const style=getComputedStyle(node);return [style.fontFamily,style.fontSize,style.fontWeight,style.lineHeight,style.letterSpacing];};
      expect(await preview.getByRole('heading',{name:'Reader preview',exact:true}).evaluate(headingStyles)).toEqual(await editor.getByRole('heading',{name:'Complete passage',exact:true}).evaluate(headingStyles));
      const badge=impact.getByLabel('Daily overview impact').locator('.studio-status-badge');
      const badgeStyles=(node:Element)=>{const style=getComputedStyle(node);return [style.fontFamily,style.fontSize,style.fontWeight,style.lineHeight,style.letterSpacing,style.textTransform];};
      expect(await badge.evaluate(badgeStyles)).toEqual(await impact.getByLabel('Moon event card impact').locator('.studio-status-badge').evaluate(badgeStyles));
      const metrics=await badge.evaluate(node=>{const style=getComputedStyle(node);return {size:style.fontSize,weight:style.fontWeight,tracking:style.letterSpacing,lineHeight:Number.parseFloat(style.lineHeight),metaSize:style.getPropertyValue('--type-meta-size').trim(),regular:style.getPropertyValue('--weight-regular').trim(),bodyTracking:style.getPropertyValue('--tracking-body').trim(),metaLeading:style.getPropertyValue('--leading-meta').trim()};});
      expect([metrics.size,metrics.weight,metrics.tracking]).toEqual([metrics.metaSize,metrics.regular,metrics.bodyTracking]);
      expect(metrics.lineHeight).toBeCloseTo(Number.parseFloat(metrics.size)*Number.parseFloat(metrics.metaLeading),2);
      expect(errors).toEqual([]);
      await editor.screenshot({path:`test-results/calendar-workspace-${width}-${theme}.png`});
    } finally {store.close();}
  });
}
