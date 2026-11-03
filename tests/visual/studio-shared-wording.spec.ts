import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { servingPackageRecords } from '../../api/_lib/content-live-status';
import { ZODIAC_SEASON_SOURCE_STARTERS } from '../../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { expectStudioReadingType } from '../helpers/studio-readability';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';

const templateKey = 'fallback-template/natal.angle-in-sign';
const sourceKey = 'fallback-hook/zodiac-season/leo';
const sourceCopy = 'Synthetic complete season opening.\n\nSynthetic complete season final sentence.';
const variableCopy = 'Synthetic complete variable opening.\n\nSynthetic complete variable final sentence.';
const pattern = 'For {{signTitle}}. {{zodiacSeason}}\n\n{{myOpening}}';
const variableEndpoint = '/api/admin/generated-content?variables=true';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`Packaged source only warns before discarding actual edits ${width} ${theme}`, async ({ page, context, baseURL }) => {
    const key = 'fallback-hook/natal/planet-intro/sun';
    const original = 'Synthetic complete Sun introduction.';
    const source = { contentKey: key, content_role: 'fallback_hook', grammar_frame: 'complete_sentence', headline: 'Synthetic Sun introduction',
      body: original, body_you: original, body_they: 'Synthetic complete Friend introduction.' };
    const guard = await installSyntheticNetworkGuard(context, new URL(baseURL!).origin);
    const writes: string[] = [], errors: string[] = [], dialogs: string[] = [];
    let discard = false;
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await (discard ? dialog.accept() : dialog.dismiss()); });
    await context.addInitScript(theme => {
      localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
      localStorage.setItem('tldrastro:studio-theme', theme);
    }, theme);
    await context.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await context.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const readOnlyPost = ['/api/admin/content-live-status', '/api/admin/natal-placement-preview'].includes(url.pathname);
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !readOnlyPost) {
        writes.push(`${request.method()} ${url.pathname}`);
        await route.fulfill({ status: 405, json: { ok: false, error: 'Writes forbidden in this read-only fixture.' } });
        return;
      }
      if (url.pathname === '/api/admin/package-source' && url.searchParams.get('contentKey') === key) {
        await route.fulfill({ json: { ok: true, packageSource: source } });
        return;
      }
      if (url.pathname === '/api/admin/natal-placement-preview') {
        await route.fulfill({ json: { ok: true, rendered: { body: original, headline: 'Synthetic Sun in Libra', parts: [original], templateKey: 'fallback-template/natal.planet-in-sign' }, appliedOverrideKeys: [], ignoredOverrides: [] } });
        return;
      }
      await route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin/content#exact-content?category=Natal+Chart&planet=sun&sign=libra');
    const card = page.locator('.admin-natal-source-card').filter({ has: page.locator('code').filter({ hasText: key }) });
    const editor = page.getByRole('dialog', { name: 'Generated content editor', exact: true });
    const copy = editor.getByRole('textbox', { name: 'Reader phrase · You', exact: true });
    const open = async () => {
      const response = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === '/api/admin/package-source' && url.searchParams.get('contentKey') === key;
      });
      await card.getByRole('button', { name: 'Load and edit', exact: true }).click();
      const completed = await response;
      expect(completed.status()).toBe(200);
      expect(await completed.finished()).toBeNull();
      await expect(copy).toHaveValue(original);
    };
    await open();
    await editor.getByRole('button', { name: 'Close', exact: true }).click();
    expect(dialogs, 'Opening existing package text does not create an unsaved edit.').toEqual([]);
    await expect(editor).toHaveCount(0);
    await open();
    const edited = `${original}\n\nSynthetic unsaved final sentence.`;
    await copy.fill(edited);
    await editor.getByRole('button', { name: 'Close', exact: true }).click();
    expect(dialogs).toEqual(['Discard the unsaved changes in this editor?']);
    await expect(copy).toHaveValue(edited);
    await copy.fill(original);
    await editor.getByRole('button', { name: 'Close', exact: true }).click();
    expect(dialogs).toHaveLength(2); // Editing created a proposal, even after its wording is restored.
    await expect(copy).toHaveValue(original);
    discard = true;
    await editor.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(editor).toHaveCount(0);
    discard = false;
    await open();
    await editor.getByRole('button', { name: 'Close', exact: true }).click();
    expect(dialogs).toHaveLength(3);
    await expect(editor).toHaveCount(0);
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
    expect(guard.unhandledExternal).toEqual([]);
  });
}
function fixtureRow(key: string, body: string, headline: string) {
  const canonical = servingPackageRecords.get(key) ?? ZODIAC_SEASON_SOURCE_STARTERS.find(record => record.contentKey === key);
  expect(canonical, `Canonical schema for ${key}`).toBeDefined();
  const record = { ...structuredClone(canonical!), contentKey:key, headline, summary:'', body,
    owner_approved:false, serving_enabled:false, review_status:'needs_review' };
  delete record.body_you; delete record.body_they;
  if (key === templateKey) {
    record.requiredSlots = ['signTitle', 'zodiacSeason', 'myOpening'];
    record.optionalSlots = [];
  }
  return { id:randomUUID(), content_key:key, surface:key === templateKey ? 'natal' : 'sky', mode:'in_depth', status:'DRAFT', lane:'reference',
    provider:'tldrastro-fallback-architecture-v3', event_type:key === templateKey ? 'fallback-template' : 'fallback-hook',
    block_type:key === templateKey ? 'fallback_template' : 'fallback_hook', headline, summary:'', body,
    sections:{packageRecord:record, packageDraft:record}, facts:{fallbackArchitectureV3:true},
    source_snapshot:{sourcePackage:record.source_package, content_role:record.content_role}, updated_at:'2026-10-28T00:00:00.000Z' };
}
async function routeStore(page: Page, store: Awaited<ReturnType<typeof studioApiStore>>) {
  await routeStudioInventoryApi(page,{call:store.call,actualDocumentRoute:true,answer:async(route,url)=>{
    if (!['/api/admin/content-history','/api/admin/content-publication','/api/content-reader'].includes(url.pathname)) return false;
    const result=await store.call({method:route.request().method(),body:route.request().method()==='GET'?undefined:route.request().postDataJSON(),url:url.pathname+url.search});
    await route.fulfill({status:result.status,json:result.payload}); return true;
  }});
  // Prefix inventory must exercise its actual filtering and pagination handler.
  await page.route('**/api/admin/generated-content-inventory?**',async route=>{
    const url=new URL(route.request().url());
    const result=await store.call({method:'GET',url:url.pathname+url.search});
    await route.fulfill({status:result.status,json:result.payload});
  });
}

for (const width of [390,1440]) for (const theme of ['light','dark']) {
  test(`Template saved wording is editable without the variables rail ${width} ${theme}`,async({page,context})=>{
    test.setTimeout(150_000);
    const template=fixtureRow(templateKey,pattern,'Synthetic source-backed template');
    const source=fixtureRow(sourceKey,sourceCopy,'Synthetic reusable season source');
    const store=await studioApiStore([template,source],{uuidIds:true});
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    const savedSourcePrefixes=new Set<string>();
    page.on('request',request=>{
      const url=new URL(request.url());
      for (const prefix of url.searchParams.getAll('contentKeyPrefix')) {
        if (/^fallback-(?:hook|vocab)\//u.test(prefix)) savedSourcePrefixes.add(prefix);
      }
    });
    try {
      const created=await store.call({method:'POST',url:variableEndpoint,body:{variable:{name:'myOpening',label:'Synthetic opening',description:'Synthetic fixture',tags:[],value:variableCopy,overrides:[]}}});
      expect(created.status).toBe(200);
      await context.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
      await routeStore(page,store);
      let sourceInventoryUnavailable=width===1440 && theme==='light';
      let sourceFailures=0;
      if (width===1440 && theme==='light') await page.route('**/api/admin/generated-content-inventory?**',async route=>{
        const url=new URL(route.request().url());
        if (sourceInventoryUnavailable && url.searchParams.getAll('contentKeyPrefix').includes('fallback-hook/zodiac-season/')) {
          sourceFailures++;
          await route.fulfill({status:503,json:{ok:false,error:'Synthetic source inventory unavailable'}}); return;
        }
        const result=await store.call({method:'GET',url:url.pathname+url.search});
        await route.fulfill({status:result.status,json:result.payload});
      });
      await page.setViewportSize({width,height:1000});
      await page.goto('/admin/content#templates');
      const editTemplate = page.locator('.admin-content-row',{hasText:template.headline}).getByRole('button',{name:'Edit',exact:true});
      await expect(editTemplate).toBeVisible();
      savedSourcePrefixes.clear();
      const seasonDocumentResponse = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === '/api/admin/generated-content-inventory'
          && url.searchParams.getAll('contentKeys').includes(sourceKey);
      });
      await editTemplate.click();
      const editor=page.getByRole('dialog',{name:'Generated content editor'});
      const writing=editor.locator('textarea[data-sky-field="body"]');
      const saved=editor.getByRole('region',{name:'Template saved wording',exact:true});
      const custom=editor.getByRole('region',{name:'My saved wording used here',exact:true});
      if (width===1440 && theme==='light') {
        await expect(saved.getByRole('alert')).toContainText('Saved wording sources could not load.');
        await expect(writing).toHaveValue(pattern);
        expect(sourceFailures).toBe(3);
        await writing.fill(`${pattern}\n\nSynthetic retained outage draft.`);
        await expect(saved.getByRole('alert')).toContainText('Saved wording sources could not load.');
        expect(sourceFailures).toBe(3);
        await saved.screenshot({path:'test-results/studio-shared-wording-source-error.png'});
        sourceInventoryUnavailable=false;
        await saved.getByRole('button',{name:'Retry saved wording',exact:true}).click();
      }
      const seasonDocument = await seasonDocumentResponse;
      expect(seasonDocument.status()).toBe(200);
      expect(await seasonDocument.finished()).toBeNull();
      const seasonPayload = await seasonDocument.json();
      expect(seasonPayload.rows.find((row:any) => row.id === source.id)?.body).toBe(sourceCopy);
      await expect(saved).toContainText('Synthetic complete season opening.');
      await expect(saved).toContainText('Synthetic complete season final sentence.');
      expect([...savedSourcePrefixes]).toEqual(['fallback-hook/zodiac-season/']);
      await expect(custom).toContainText('Synthetic complete variable final sentence.');
      await expect(saved).not.toContainText('The runtime source cannot be proven for {{myOpening}}');
      await expect(saved.getByRole('heading')).toHaveText(['Synthetic source-backed template']);
      await expect(saved.getByRole('heading',{level:3})).toHaveText('Synthetic source-backed template');
      await expect(page.getByRole('complementary',{name:'Template variable reference'})).toHaveCount(0);
      await expectStudioReadingType(saved.locator('.admin-template-reader-copy p').first());
      await expectStudioReadingType(custom.locator('.studio-variable-value'));
      const unsaved=`${pattern}\n\nSynthetic unsaved parent final sentence.`;
      await writing.fill(unsaved);
      await saved.locator(`[data-template-source-key="${sourceKey}"]`).click();
      const sourceWriting=editor.getByLabel('Reader copy',{exact:true});
      await expect(sourceWriting).toHaveValue(sourceCopy);
      const revised='Synthetic revised source opening.\n\nSynthetic revised source final sentence.';
      await sourceWriting.fill(revised);
      await editor.getByRole('button',{name:'Save draft & return',exact:true}).click();
      await expect(writing).toHaveValue(unsaved);
      await expect(saved).toContainText('Synthetic revised source final sentence.');
      let rows=await store.call({method:'rows'});
      expect(rows.find((row:any)=>row.id===template.id).body).toBe(pattern);
      const savedSource=rows.find((row:any)=>row.content_key===sourceKey && row.status==='DRAFT');
      expect(savedSource.sections.packageDraft.body).toBe(revised);
      expect(rows.filter((row:any)=>row.status==='LIVE')).toEqual([]);
      await saved.locator(`[data-template-source-key="${sourceKey}"]`).click();
      await expect(sourceWriting).toHaveValue(revised);
      if (width===1440 && theme==='light') {
        const competing='Synthetic newer source opening.\n\nSynthetic newer source final sentence.';
        const external=await store.call({method:'PATCH',url:'/api/admin/generated-content',body:{id:savedSource.id,expectedUpdatedAt:savedSource.updated_at,
          sections:{...savedSource.sections,packageDraft:{...savedSource.sections.packageDraft,body:competing}},body:competing,reviewStatus:'needs_review'}});
        expect(external.status).toBe(200);
        await sourceWriting.fill('Synthetic unsent source edit.');
        await editor.getByRole('button',{name:'Save draft & return',exact:true}).click();
        await expect(editor.getByRole('alert').first()).toContainText(/changed|newer|reload/i);
        await expect(sourceWriting).toHaveValue('Synthetic unsent source edit.');
        page.once('dialog',dialog=>dialog.accept());
        await editor.getByRole('button',{name:/^Back to /}).click();
        await expect(writing).toHaveValue(unsaved);
        await saved.locator(`[data-template-source-key="${sourceKey}"]`).click();
        await expect(sourceWriting).toHaveValue(competing);
        await sourceWriting.fill(revised);
      }
      await editor.getByRole('button',{name:'Save & return',exact:true}).click();
      await expect(writing).toHaveValue(unsaved);
      rows=await store.call({method:'rows'});
      expect(rows.find((row:any)=>row.content_key===sourceKey&&row.status==='LIVE')?.body).toBe(revised);
      expect(rows.find((row:any)=>row.id===template.id).body).toBe(pattern);

      // A separate exact-value editor preserves the unsaved parent and keeps
      // the shared value plus all override controls in the existing form.
      const link=custom.getByRole('link',{name:'Edit Synthetic opening in Variables',exact:true});
      await expect(link).toHaveAttribute('target','_blank');
      const variablePage=await context.newPage();
      await routeStore(variablePage,store);
      await variablePage.goto((await link.getAttribute('href'))!);
      const variableEditor=variablePage.getByRole('form',{name:'Edit Synthetic opening',exact:true});
      await expect(variableEditor.getByLabel('Shared value',{exact:true})).toHaveValue(variableCopy);
      await expect(variableEditor.getByRole('region',{name:'Context overrides'})).toBeVisible();
      const variableRevision='Synthetic revised variable opening.\n\nSynthetic revised variable final sentence.';
      await variableEditor.getByLabel('Shared value',{exact:true}).fill(variableRevision);
      if (width===1440 && theme==='dark') {
        const updater=await context.newPage();
        await routeStore(updater,store);
        await updater.goto((await link.getAttribute('href'))!);
        const other=updater.getByRole('form',{name:'Edit Synthetic opening',exact:true});
        const competing='Synthetic newer variable opening.\n\nSynthetic newer variable final sentence.';
        await other.getByLabel('Shared value',{exact:true}).fill(competing);
        await other.getByRole('button',{name:'Save variable',exact:true}).click();
        await expect(other).toHaveCount(0);
        await expect(custom).toContainText('Synthetic newer variable final sentence.');
        // The cross-tab refresh may update the library, but cannot remount or
        // overwrite an already-open value editor or waive its version guard.
        await expect(variableEditor.getByLabel('Shared value',{exact:true})).toHaveValue(variableRevision);
        await variableEditor.getByRole('button',{name:'Save variable',exact:true}).click();
        await expect(variableEditor.getByRole('alert')).toContainText(/changed|newer|reload/i);
        await expect(variableEditor.getByLabel('Shared value',{exact:true})).toHaveValue(variableRevision);
        await variableEditor.getByRole('button',{name:'Cancel',exact:true}).click();
        await variablePage.getByRole('article',{name:'Synthetic opening',exact:true}).getByRole('button',{name:'Edit',exact:true}).click();
        await expect(variableEditor.getByLabel('Shared value',{exact:true})).toHaveValue(competing);
        await variableEditor.getByLabel('Shared value',{exact:true}).fill(variableRevision);
        await updater.close();
      }
      await variableEditor.getByRole('button',{name:'Save variable',exact:true}).click();
      await expect(variableEditor).toHaveCount(0);
      await expect(custom).toContainText('Synthetic revised variable final sentence.');
      await expect(saved).toContainText('Synthetic revised variable final sentence.');
      await expect(writing).toHaveValue(unsaved);
      expect((await store.call({method:'rows'})).find((row:any)=>row.id===template.id).body).toBe(pattern);
      await variablePage.close();
      await editor.screenshot({path:`test-results/studio-shared-wording-${width}-${theme}.png`});
      await saved.screenshot({path:`test-results/studio-shared-wording-template-panel-${width}-${theme}.png`});
      await custom.screenshot({path:`test-results/studio-shared-wording-variable-panel-${width}-${theme}.png`});
      expect(await editor.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
      if (width===1440 && theme==='light') {
        await writing.fill('{{planetIntro}}');
        await expect(saved).toContainText('No saved source wording is available for this example.');
        await expect(saved.getByRole('status')).toContainText('not verified reader copy');
        await expect(writing).toHaveValue('{{planetIntro}}');
        await saved.screenshot({path:'test-results/studio-shared-wording-no-source.png'});
        await writing.fill(unsaved);
      }
      // Save/reload is tested independently of changing a shared source.
      await editor.getByRole('button',{name:'Save draft',exact:true}).click();
      await expect.poll(async()=> (await store.call({method:'rows'})).find((row:any)=>row.id===template.id)?.sections?.packageDraft?.body).toBe(unsaved);
      await page.reload();
      await page.locator('.admin-content-row',{hasText:template.headline}).getByRole('button',{name:'Edit',exact:true}).click();
      await expect(writing).toHaveValue(unsaved);
      await expect(saved).toContainText('Synthetic revised source final sentence.');
    } finally {store.close();}
  });
}

test('Initial saved-variable failure is recoverable from the primary editor', async ({page, context}) => {
  test.setTimeout(75_000);
  const template=fixtureRow(templateKey,pattern,'Synthetic variable outage template');
  const source=fixtureRow(sourceKey,sourceCopy,'Synthetic reusable season source');
  const store=await studioApiStore([template,source],{uuidIds:true});
  let unavailable=true;
  let variableReads=0;
  let holdSuccess=false;
  let releaseSuccess:(()=>void)|undefined;
  const forbidden:string[]=[];
  const variableStatuses:number[]=[];
  const pageErrors:string[]=[];
  const failedApiRequests:Array<{path:string;error:string|null}>=[];
  const unexpectedApiStatuses:Array<{path:string;status:number}>=[];
  const transport:{initial503Completed:boolean;initialRequestFailure:unknown;successful200Completed:boolean;successfulRequestFailure:unknown}={
    initial503Completed:false,initialRequestFailure:undefined,successful200Completed:false,successfulRequestFailure:undefined
  };
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('requestfailed',request=>{
    const path=new URL(request.url()).pathname;
    if (path.startsWith('/api/')) failedApiRequests.push({path,error:request.failure()?.errorText??null});
  });
  page.on('request',request=>{
    const url=new URL(request.url());
    const path=url.pathname;
    if (['PATCH','DELETE'].includes(request.method()) || request.method()==='POST' &&
      (path==='/api/admin/generated-content' || /publication|writing|generation|models/u.test(path)
        || /openai|anthropic|openrouter|generativelanguage|gateway\.ai|x\.ai/u.test(url.hostname))) forbidden.push(request.method()+' '+path);
  });
  page.on('response',response=>{
    const url=new URL(response.url());
    if (url.pathname==='/api/admin/generated-content' && url.searchParams.get('variables')==='true') variableStatuses.push(response.status());
    else if (url.pathname.startsWith('/api/') && response.status()>=400) unexpectedApiStatuses.push({path:url.pathname,status:response.status()});
  });
  try {
    expect((await store.call({method:'POST',url:variableEndpoint,body:{variable:{name:'myOpening',label:'Synthetic opening',description:'Synthetic fixture',tags:[],value:variableCopy,overrides:[]}}})).status).toBe(200);
    await context.addInitScript(()=>{
      localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
      localStorage.setItem('tldrastro:studio-theme','light');
    });
    await routeStore(page,store);
    await page.route('**/api/admin/generated-content?variables=true',async route=>{
      variableReads++;
      if (unavailable) {
        await route.fulfill({status:503,json:{ok:false,error:'Synthetic saved-variable library unavailable'}});
        return;
      }
      if (holdSuccess) await new Promise<void>(resolve=>{releaseSuccess=resolve;});
      const result=await store.call({method:'GET',url:variableEndpoint});
      await route.fulfill({status:result.status,json:result.payload});
    });
    const initialFailure=page.waitForResponse(response=>{
      const url=new URL(response.url());
      return url.pathname==='/api/admin/generated-content' && url.searchParams.get('variables')==='true' && response.status()===503;
    });
    await page.setViewportSize({width:390,height:1000});
    await page.goto('/admin/content#templates');
    await page.locator('.admin-content-row',{hasText:template.headline}).getByRole('button',{name:'Edit',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    const writing=editor.locator('textarea[data-sky-field="body"]');
    const disclosure=editor.locator('details.studio-variable-usage').filter({has:page.locator('summary',{hasText:'My variables'})});
    await expect(disclosure).toHaveCount(1);
    await expect(disclosure).not.toHaveAttribute('open','');
    await expect(writing).toHaveValue(pattern);
    await expect.poll(()=>variableReads).toBe(1);
    const initial=await initialFailure;
    expect(await initial.finished()).toBeNull();
    transport.initial503Completed=true;
    transport.initialRequestFailure=initial.request().failure();
    expect(transport.initialRequestFailure).toBeNull();
    expect((await initial.json()).error).toBe('Synthetic saved-variable library unavailable');
    expect(pageErrors).toEqual([]);
    expect(failedApiRequests).toEqual([]);
    expect(unexpectedApiStatuses).toEqual([]);
    const primary=editor.getByRole('region',{name:'My saved wording used here',exact:true});
    await expect(primary.getByRole('alert')).toContainText('Your saved wording could not load.',{timeout:8_000});
    const unsaved=pattern+'\n\nSynthetic draft retained through library outage.';
    await writing.fill(unsaved);
    await expect(primary.getByRole('alert')).toContainText('Your saved wording could not load.');
    expect(variableReads).toBe(1);
    await writing.fill('{{signTitle}}');
    await expect(primary).toHaveCount(0);
    await writing.fill(unsaved);
    await expect(primary.getByRole('alert')).toContainText('Your saved wording could not load.');
    expect(variableReads).toBe(1);
    await primary.screenshot({path:'test-results/studio-primary-variable-initial-error.png'});

    unavailable=false;
    holdSuccess=true;
    const successfulResponse=page.waitForResponse(response=>{
      const url=new URL(response.url());
      return url.pathname==='/api/admin/generated-content' && url.searchParams.get('variables')==='true' && response.status()===200;
    });
    await primary.getByRole('button',{name:'Retry my saved wording',exact:true}).click();
    await expect.poll(()=>Boolean(releaseSuccess)).toBe(true);
    await expect(primary).toContainText('Loading your saved wording');
    await expect(writing).toHaveValue(unsaved);
    expect(variableReads).toBe(2);
    releaseSuccess!();
    holdSuccess=false;
    const completed=await successfulResponse;
    expect(await completed.finished()).toBeNull();
    transport.successful200Completed=true;
    transport.successfulRequestFailure=completed.request().failure();
    expect(transport.successfulRequestFailure).toBeNull();
    expect((await completed.json()).variables.find((item:any)=>item.name==='myOpening')?.value).toBe(variableCopy);
    await expect(primary).toContainText('Synthetic complete variable opening.');
    await expect(primary).toContainText('Synthetic complete variable final sentence.');
    await expect(primary.getByRole('alert')).toHaveCount(0);

    expect(variableReads).toBe(2);
    expect(variableStatuses).toEqual([503,200]);
    expect(forbidden).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedApiRequests).toEqual([]);
    expect(unexpectedApiStatuses).toEqual([]);
    await expect(disclosure).not.toHaveAttribute('open','');
    await expect(writing).toHaveValue(unsaved);
    expect((await store.call({method:'rows'})).find((row:any)=>row.id===template.id).body).toBe(pattern);
    await primary.screenshot({path:'test-results/studio-primary-variable-recovered.png'});
  } finally {
    await test.info().attach('primary-variable-diagnostic',{contentType:'application/json',body:JSON.stringify({transport,variableReads,variableStatuses,forbidden,pageErrors,failedApiRequests,unexpectedApiStatuses})});
    releaseSuccess?.();store.close();
  }
});


for (const mode of ['empty', 'cached'] as const) {
  test(`Primary saved wording preserves ${mode} library state and the unsaved draft`, async ({page, context}) => {
    test.setTimeout(75_000);
    const template=fixtureRow(templateKey,pattern,`Synthetic ${mode} library template`);
    const source=fixtureRow(sourceKey,sourceCopy,'Synthetic reusable season source');
    const store=await studioApiStore([template,source],{uuidIds:true});
    let unavailable=false;
    let variableReads=0;
    let releaseInitial:(()=>void)|undefined;
    const statuses:number[]=[];
    const pageErrors:string[]=[];
    const failedApiRequests:string[]=[];
    const forbidden:string[]=[];
    const unexpectedApiStatuses:Array<{path:string;status:number}>=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    page.on('requestfailed',request=>{
      const path=new URL(request.url()).pathname;
      if (path.startsWith('/api/')) failedApiRequests.push(path);
    });
    page.on('request',request=>{
      const url=new URL(request.url());
      let readOnlyStatusPost=false;
      if (request.method()==='POST' && url.pathname==='/api/admin/content-live-status') {
        const body=request.postDataJSON();
        readOnlyStatusPost=Object.keys(body).length===1 && (body.action==='composition-catalog'
          || Array.isArray(body.ids) && body.ids.length<=64 && body.ids.every((id:unknown)=>typeof id==='string'));
      }
      if (request.method()!=='GET' && url.pathname.startsWith('/api/') && !readOnlyStatusPost
          || /\/(?:writing|publication|generate|models)(?:[/?]|$)/u.test(url.pathname)
          || /openai|anthropic|openrouter|generativelanguage|gateway\.ai|x\.ai/u.test(url.hostname)) forbidden.push(request.method()+' '+url.pathname);
    });
    page.on('response',response=>{
      const url=new URL(response.url());
      if (url.pathname==='/api/admin/generated-content' && url.searchParams.get('variables')==='true') statuses.push(response.status());
      else if (url.pathname.startsWith('/api/') && response.status()>=400) unexpectedApiStatuses.push({path:url.pathname,status:response.status()});
    });
    const waitForVariables=(status:number)=>page.waitForResponse(response=>{
      const url=new URL(response.url());
      return url.pathname==='/api/admin/generated-content' && url.searchParams.get('variables')==='true' && response.status()===status;
    });
    try {
      if (mode==='cached') expect((await store.call({method:'POST',url:variableEndpoint,body:{variable:{name:'myOpening',label:'Synthetic opening',description:'Synthetic fixture',tags:[],value:variableCopy,overrides:[]}}})).status).toBe(200);
      await context.addInitScript(theme=>{
        localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme',theme);
      },mode==='empty'?'dark':'light');
      await routeStore(page,store);
      await page.route('**/api/admin/generated-content?variables=true',async route=>{
        variableReads++;
        if (unavailable) {
          await route.fulfill({status:503,json:{ok:false,error:'Synthetic saved-variable refresh unavailable'}});
          return;
        }
        if (mode==='empty' && variableReads===1) await new Promise<void>(resolve=>{releaseInitial=resolve;});
        const result=await store.call({method:'GET',url:variableEndpoint});
        await route.fulfill({status:result.status,json:result.payload});
      });
      const initialResponse=waitForVariables(200);
      await page.setViewportSize({width:mode==='empty'?390:1440,height:1000});
      await page.goto('/admin/content#templates');
      await page.locator('.admin-content-row',{hasText:template.headline}).getByRole('button',{name:'Edit',exact:true}).click();
      const editor=page.getByRole('dialog',{name:'Generated content editor'});
      const writing=editor.locator('textarea[data-sky-field="body"]');
      const primary=editor.getByRole('region',{name:'My saved wording used here',exact:true});
      const disclosure=editor.locator('details.studio-variable-usage').filter({has:page.locator('summary',{hasText:'My variables'})});
      if (mode==='empty') {
        await expect.poll(()=>Boolean(releaseInitial)).toBe(true);
        await expect(primary).toContainText('Loading your saved wording');
        releaseInitial!();
      }
      const initial=await initialResponse;
      expect(await initial.finished()).toBeNull();
      expect(initial.request().failure()).toBeNull();
      const payload=await initial.json();
      expect(Array.isArray(payload.variables)).toBe(true);
      if (mode==='empty') {
        expect(payload.variables).toEqual([]);
        await expect(primary).toContainText('No saved variables match this draft.');
      } else {
        expect(payload.variables.find((item:any)=>item.name==='myOpening')?.value).toBe(variableCopy);
        await expect(primary).toContainText('Synthetic complete variable opening.');
        await expect(primary).toContainText('Synthetic complete variable final sentence.');
      }
      await expect(primary.getByRole('alert')).toHaveCount(0);
      const unsaved=pattern+`\n\nSynthetic ${mode} library unsaved final sentence.`;
      await writing.fill(unsaved);
      if (mode==='cached') {
        unavailable=true;
        const failureResponse=waitForVariables(503);
        await primary.getByRole('button',{name:'Reload my saved wording',exact:true}).click();
        const failure=await failureResponse;
        expect(await failure.finished()).toBeNull();
        expect(failure.request().failure()).toBeNull();
        expect((await failure.json()).error).toBe('Synthetic saved-variable refresh unavailable');
        await expect(primary.getByRole('alert')).toContainText('The last loaded values are shown below.');
        await expect(primary).toContainText('Synthetic complete variable opening.');
        await expect(primary).toContainText('Synthetic complete variable final sentence.');
        await expect(writing).toHaveValue(unsaved);
        expect(variableReads).toBe(2);
        await primary.screenshot({path:'test-results/studio-primary-variable-cached-error.png'});
        unavailable=false;
        const retryResponse=waitForVariables(200);
        await primary.getByRole('button',{name:'Retry my saved wording',exact:true}).click();
        const retry=await retryResponse;
        expect(await retry.finished()).toBeNull();
        expect(retry.request().failure()).toBeNull();
        expect((await retry.json()).variables.find((item:any)=>item.name==='myOpening')?.value).toBe(variableCopy);
        await expect(primary.getByRole('alert')).toHaveCount(0);
      }
      await expect(writing).toHaveValue(unsaved);
      await expect(disclosure).not.toHaveAttribute('open','');
      await primary.screenshot({path:`test-results/studio-primary-variable-${mode}.png`});
      await writing.fill('{{signTitle}}');
      await expect(primary).toHaveCount(0);
      await writing.fill(unsaved);
      await expect(primary).toContainText(mode==='empty'?'No saved variables match this draft.':'Synthetic complete variable final sentence.');
      expect(variableReads).toBe(mode==='empty'?1:3);
      expect(statuses).toEqual(mode==='empty'?[200]:[200,503,200]);
      expect(forbidden).toEqual([]);
      expect(pageErrors).toEqual([]);
      expect(failedApiRequests).toEqual([]);
      expect(unexpectedApiStatuses).toEqual([]);
      expect((await store.call({method:'rows'})).find((row:any)=>row.id===template.id).body).toBe(pattern);
    } finally {
      await test.info().attach('primary-variable-library-state',{contentType:'application/json',body:JSON.stringify({mode,variableReads,statuses,forbidden,pageErrors,failedApiRequests,unexpectedApiStatuses})});
      releaseInitial?.();store.close();
    }
  });
}
