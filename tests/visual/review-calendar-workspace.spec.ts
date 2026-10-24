import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { getLunarCalendarMonth } from '../../apps/web/src/services/ephemeris';
import { calendarPassageRecord } from '../../src/shared/features/calendar/calendarPassageTemplates';
import { canonicalPublicationLedger, publicationLedgerTag } from '../../apps/web/src/services/publicationLedgerTransport';
import { parseStudioPassageEdit } from '../../src/shared/studioPassageEdit';

const date='2026-10-21', timeZone='America/New_York';
const key=`calendar-passage/daily/${date}/${encodeURIComponent(timeZone)}`;
const tokyoKey='calendar-passage/daily/2026-10-22/Asia%2FTokyo';
const badKey='calendar-passage/daily/2026-02-30/UTC';
const sharedKey='calendar-passage/daily/shared';
const publishedBody='Synthetic published dated overview: {{moonSign}}.';
const draftBody='Synthetic saved dated draft: {{moonSign}}.\n\nComplete saved draft ending.';
function datedRow(id:string, contentKey:string, status:'DRAFT'|'LIVE', body:string) {
  const record={...calendarPassageRecord(contentKey===badKey?key:contentKey,body),contentKey,source_keys:[contentKey]};
  return {id,content_key:contentKey,surface:'sky',mode:status==='DRAFT'?'studio-draft':'feed',status,
    lane:status==='DRAFT'?'reference':'serving',review_state:status==='DRAFT'?'owner-review-required':null,
    event_type:'calendar-passage',block_type:'fallback_hook',headline:'Calendar assembled passage',body,summary:'',
    provider:'tldrastro-fallback-architecture-v3',facts:{fallbackArchitectureV3:true},
    sections:{packageRecord:record,...(status==='DRAFT'?{packageDraft:record}:{})},
    source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',content_role:'full_copy',review_status:status==='DRAFT'?'needs_review':'approved'},
    created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-20T12:00:00Z'};
}

for (const [width,theme] of [[1440,'light'],[390,'dark'],[390,'light'],[1440,'dark']] as const) {
  test(`Review Queue opens the saved dated Calendar workspace ${width} ${theme}`,async ({page,context})=>{
    test.setTimeout(150_000);
    const live=datedRow('1db3f546-f809-4cae-9620-10f9584f371a',key,'LIVE',publishedBody);
    const pending=datedRow('6ef9f355-b67a-4467-9c54-329a907d32e5',key,'DRAFT',draftBody);
    const tokyo=datedRow('83007fa4-1d0e-4237-a333-a1ee38290642',tokyoKey,'DRAFT','Synthetic saved Tokyo draft.');
    const bad=datedRow('e1ece8a3-313b-4160-be06-c43570b5ace4',badKey,'DRAFT','Synthetic invalid context.');
    const shared=datedRow('27c77108-3941-4084-85b7-a11d79d75de2',sharedKey,'DRAFT','Synthetic shared daily template.');
    const store=await studioApiStore([live,pending,tokyo,bad,shared],{uuidIds:true});
    const location={label:'QA reference',latitude:0,longitude:0,timeZone};
    const calendar=await getLunarCalendarMonth(location,new Date(`${date}T16:00:00Z`));
    const writes:any[]=[],errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    let failDocument=false,holdDocument=false,releaseDocument:()=>void=()=>{};
    const held=new Promise<void>(resolve=>{releaseDocument=resolve;});
    try {
      await context.addInitScript(({theme})=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        localStorage.setItem('tldrastro:theme',theme);localStorage.setItem('tldrastro:studio-theme',theme);
      },{theme});
      await context.route('**/rest/v1/**',route=>route.fulfill({json:[]}));
      await routeStudioInventoryApi(context,{call:store.call,actualDocumentRoute:true,onWrite:write=>writes.push(write),answer:async (route,url)=>{
        if(url.pathname==='/api/calendar') {await route.fulfill({json:{ok:true,calendar}});return true;}
        if(url.pathname==='/api/content-publications') {
          const publications=canonicalPublicationLedger(await store.call({method:'publications'}));
          await route.fulfill({headers:{etag:await publicationLedgerTag(publications)},json:{schema:'tldr-publications/v1',publications}});return true;
        }
        if(url.pathname==='/api/admin/content-live-status'||url.pathname==='/api/content-reader') {
          const result=await store.call({method:'POST',url:url.pathname,body:route.request().postDataJSON()});
          await route.fulfill({status:result.status,json:result.payload});return true;
        }
        return false;
      }});
      await context.route('**/api/admin/generated-content-inventory?**',async route=>{
        const url=new URL(route.request().url());
        if(url.searchParams.get('contentKey')===key) {
          if(holdDocument) await held;
          if(failDocument) {await route.fulfill({status:503,json:{ok:false,error:'Synthetic Calendar source unavailable.'}});return;}
        }
        await route.fallback();
      });
      const before=await store.call({method:'rows'}),ledger=await store.call({method:'publications'});
      await page.setViewportSize({width,height:1000});
      await page.goto('/admin/content#review-queue?view=all');
      const queueRow=(sourceKey:string)=>page.getByRole('row').filter({hasText:sourceKey});
      await queueRow(key).getByRole('button',{name:'Edit',exact:true}).click();
      const editor=page.getByRole('region',{name:'Assembled Calendar passage',exact:true});
      const field=editor.getByRole('textbox',{name:'Complete passage wording',exact:true});
      const preview=editor.getByRole('region',{name:'Calendar reader workspace',exact:true});
      const reading=editor.getByLabel('Assembled passage preview');
      await expect(field).toHaveValue(draftBody,{timeout:60000});
      expect(parseStudioPassageEdit(new URL(page.url()).hash)).toEqual({surface:'calendar',date,timeZone,sourceKey:key});
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(editor.getByLabel('Passage date',{exact:true})).toHaveValue(date);
      await expect(editor.getByLabel('Passage time zone',{exact:true})).toHaveValue(timeZone);
      await expect(editor).toContainText(`Passage context · ${date} · ${timeZone}`);
      await expect(preview.getByRole('button',{name:'Published',exact:true})).toHaveAttribute('aria-pressed','true');
      await expect(reading).toContainText('Synthetic published dated overview: Aquarius.');
      await expect(reading).not.toContainText('Synthetic saved dated draft');
      const publishedMoon=await editor.getByLabel('Moon transition reader passage').innerText();
      await preview.getByRole('button',{name:'Draft',exact:true}).click();
      await expect(reading).toContainText('Synthetic saved dated draft: Aquarius.');
      await expect(preview).toContainText('Draft · saved unpublished wording.');
      await expect(preview.getByLabel('Daily overview impact')).toContainText('Changed');
      await expect(preview.getByLabel('Moon event card impact')).toContainText('Unchanged');
      await preview.getByText('Reader source details',{exact:true}).click();
      await expect(preview.getByText('Reader source details',{exact:true}).locator('..')).toContainText(`Editing source: ${key}`);
      expect(await store.call({method:'rows'})).toEqual(before);
      expect(writes).toEqual([]);

      // Save through the actual handler, then return through Review Queue and reload.
      const revised=draftBody+'\n\nSynthetic queue editing check.';
      await field.fill(revised);
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Draft saved.');
      expect(writes).toHaveLength(1);
      expect(writes[0].body.id).toBe(pending.id);
      expect(writes[0].body.expectedUpdatedAt).toBe(pending.updated_at);
      expect(writes[0].body.ownerAction).toBeUndefined();
      await page.goBack();
      await expect(queueRow(key)).toBeVisible();
      await queueRow(tokyoKey).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(field).toHaveValue(tokyo.body,{timeout:60000});
      await expect(editor.getByLabel('Passage date',{exact:true})).toHaveValue('2026-10-22');
      await expect(editor.getByLabel('Passage time zone',{exact:true})).toHaveValue('Asia/Tokyo');
      await expect(preview).toContainText('2026-10-22 · Asia/Tokyo');
      await page.goBack();
      await queueRow(key).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(field).toHaveValue(revised,{timeout:60000});
      await page.reload();
      await expect(field).toHaveValue(revised,{timeout:60000});
      await expect(reading).toContainText('Synthetic published dated overview: Aquarius.');
      await preview.getByRole('button',{name:'Draft',exact:true}).click();
      await expect(reading).toContainText('Synthetic queue editing check.');
      await expect(editor.getByLabel('Moon transition reader passage')).toHaveText(publishedMoon,{useInnerText:true});
      await page.screenshot({path:`test-results/review-calendar-workspace-${width}-${theme}.png`});

      // A missing source must leave editing unavailable, with a working retry.
      await page.goBack();
      failDocument=true;holdDocument=true;
      await queueRow(key).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(editor.getByRole('status',{name:'Calendar save status'})).toContainText('Loading');
      await expect(field).toHaveCount(0);
      releaseDocument();holdDocument=false;
      await expect(editor.getByRole('alert')).toContainText('Synthetic Calendar source unavailable.');
      await expect(field).toHaveCount(0);
      failDocument=false;
      await editor.getByRole('button',{name:'Reload saved status',exact:true}).click();
      await expect(field).toHaveValue(revised,{timeout:60000});
      await page.goBack();
      await queueRow(badKey).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(page).toHaveURL(/#review-queue/u);
      await expect(page.getByText('This Calendar passage has an invalid date, time zone, or source key. Check its source before editing.',{exact:true})).toBeVisible();
      await expect(editor).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await queueRow(sharedKey).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog').locator('textarea').first()).toHaveValue(shared.body);
      await expect(page).toHaveURL(/#review-queue/u);
      await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
      const after=await store.call({method:'rows'});
      expect(after.filter((row:any)=>row.id!==pending.id)).toEqual(before.filter((row:any)=>row.id!==pending.id));
      expect(after.find((row:any)=>row.id===pending.id).status).toBe('DRAFT');
      expect(after.find((row:any)=>row.id===pending.id).sections.packageDraft.body).toBe(revised);
      expect(await store.call({method:'publications'})).toEqual(ledger);
      expect(writes).toHaveLength(1);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    } finally {releaseDocument();store.close();}
  });
}
