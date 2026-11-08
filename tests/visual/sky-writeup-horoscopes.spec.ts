import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { workspaceVisitFacts } from '../helpers/sky-placement-workspace-fixtures';
import { placementVisitDraft } from '../../apps/admin/src/skyPlacementWorkspaceModel';
import { WRITEUP_HOROSCOPE_SIGNS } from '../../src/shared/skyWriteupHoroscopes';

for(const [width,theme] of [[390,'dark'],[1440,'light']] as const)test(`AI sign draft requires review before saving and publishing ${width} ${theme}`,async({page})=>{
 const readings=WRITEUP_HOROSCOPE_SIGNS.map(sign=>({sign,body:`Synthetic saved ${sign} reading.`}));
 const draft=await placementVisitDraft(workspaceVisitFacts('mercury','scorpio','2026-10-24','2026-11-13'),{headline:'Synthetic Mercury article',summary:'Synthetic summary.',body:'Synthetic complete article.',writeupHoroscopes:readings});
 const initial={id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',content_key:draft.contentKey,status:'DRAFT',surface:'sky',mode:'article',lane:'reference',review_state:'owner-review-required',event_type:draft.eventType,block_type:'sky_article',headline:draft.headline,summary:draft.summary,body:draft.body,sections:draft.sections,source_snapshot:draft.sourceSnapshot,updated_at:'2026-10-30T12:00:00Z'};
 const store=await studioApiStore([initial]);let calls=0,previews=0;
 await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme)},theme);
 await routeStudioInventoryApi(page,{call:store.call,actualDocumentRoute:true});
 const generated='Synthetic generated opening.\n\nSynthetic generated complete final sentence.';
 await page.route('**/api/admin/sky-article-template-slots',async route=>{
  const body=route.request().postDataJSON();expect(body.writeupHoroscope.sign).toBe('gemini');expect(body.writeupHoroscope.currentText).toBe(readings[2].body);
  if(body.preview){previews++;const text='Synthetic complete writing plan.';return route.fulfill({json:{ok:true,writingExport:{schema:'studio-writing-export/v1',title:'Synthetic plan',text,requestCount:1,introLength:0,units:[{label:'Gemini',start:0,end:text.length}]}}});}
  calls++;if(calls===1)return route.fulfill({status:503,json:{ok:false,error:'Synthetic provider outage.'}});
  return route.fulfill({json:{ok:true,body:generated,source:{id:initial.id,updatedAt:initial.updated_at,sign:'gemini',compiledHash:draft.sections.skyArticleEdition.compiledHash,startsAt:draft.sections.skyArticleEdition.transitStartInstant,endsAt:draft.sections.skyArticleEdition.transitEndInstant},generation:{provider:'synthetic',model:'synthetic-model',responseId:'synthetic-response'},saved:false,published:false}});
 });
 try{
  await page.goto(`${process.env.STUDIO_PRODUCTION_ENTRY==='1'?'/admin/content':'/'}#sky-writeups?planet=mercury&sign=scorpio`);
  const workspace=page.getByRole('region',{name:'Mercury in Scorpio workspace',exact:true});await workspace.getByRole('button',{name:'Edit',exact:true}).click();await workspace.getByRole('button',{name:'Related horoscope editions',exact:true}).click();await page.getByRole('dialog',{name:'Horoscopes',exact:true}).getByRole('button',{name:'Write planetary horoscopes',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'Horoscopes for this write-up',exact:true});await panel.getByRole('group',{name:'Write-up horoscope signs'}).getByRole('button',{name:'Gemini ✓',exact:true}).click();await panel.getByRole('button',{name:'Write with AI',exact:true}).click();
  await panel.getByLabel('Horoscope draft direction').fill('Synthetic owner direction.');
  await panel.getByText('Complete writing plan · copy or download',{exact:true}).click();await panel.getByRole('button',{name:'Load complete writing plan',exact:true}).click();await expect(panel.getByLabel('Complete writing plan')).toHaveValue('Synthetic complete writing plan.');expect(calls).toBe(0);expect(previews).toBe(1);
  await panel.getByRole('button',{name:'Generate draft',exact:true}).click();await expect(panel.getByRole('alert')).toHaveText('The horoscope draft could not be generated. Your writing is unchanged. Try again.');await expect(panel.getByLabel('Gemini write-up horoscope',{exact:true})).toHaveValue(readings[2].body);expect(calls).toBe(1);
  await panel.getByRole('button',{name:'Generate draft',exact:true}).click();await expect(panel.getByLabel('Generated horoscope draft')).toHaveValue(generated);
  await expect(panel.getByLabel('Gemini write-up horoscope',{exact:true})).toHaveValue(readings[2].body);await expect(panel.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  page.once('dialog',dialog=>dialog.dismiss());await panel.getByRole('button',{name:'Back to write-up',exact:true}).click();await expect(panel.getByLabel('Generated horoscope draft')).toHaveValue(generated);
  await page.screenshot({path:test.info().outputPath('review-ai-horoscope-draft.png')});
  await panel.getByRole('button',{name:'Use this draft',exact:true}).click();await expect(panel.getByLabel('Gemini write-up horoscope',{exact:true})).toHaveValue(generated);await panel.getByRole('button',{name:'Save draft',exact:true}).click();await expect(panel.getByText('Draft saved. Nothing was published.',{exact:true})).toBeVisible();
  let saved=(await store.call({method:'rows'})).find((r:any)=>r.id===initial.id);expect(saved.status).toBe('DRAFT');expect(saved.body).toBe(initial.body);expect(saved.sections.skyArticleEdition.writeupHoroscopes).toEqual(readings.map(p=>p.sign==='gemini'?{...p,body:generated}:p));
  await panel.getByRole('button',{name:'Approve & publish',exact:true}).click();await expect(panel.getByText('Article published with the selected publication date.',{exact:true})).toBeVisible();
  saved=(await store.call({method:'rows'})).find((r:any)=>r.id===initial.id);expect(saved.status).toBe('LIVE');expect(calls).toBe(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});

for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
  test(`write-up sign horoscopes save and reopen ${width} ${theme}`, async ({ page }) => {
    const facts = workspaceVisitFacts('mercury', 'scorpio', '2026-10-24', '2026-11-13');
    const article = await placementVisitDraft(facts, { headline: 'Mercury Rx in Scorpio 2026', summary: 'Synthetic complete summary.', body: 'Synthetic opening.\n\nSynthetic article final sentence.' });
    const initial = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: article.contentKey, status: 'DRAFT', surface: 'sky', mode: 'article',
      lane: 'reference', review_state: 'owner-review-required', event_type: article.eventType, block_type: 'sky_article', sections: article.sections,
      headline: article.headline, body: article.body, summary: article.summary, source_snapshot: article.sourceSnapshot, updated_at: '2026-10-30T12:00:00Z' };
    const store = await studioApiStore([initial]);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
    await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true });
    const title = (s: string) => s[0].toUpperCase() + s.slice(1);
    const passage = (s: string) => `Synthetic ${s} opening.\n\nSynthetic ${s} complete final sentence.`;
    try {
      await page.goto(`${process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/'}#sky-writeups?planet=mercury&sign=scorpio`);
      const workspace = page.getByRole('region', { name: 'Mercury in Scorpio workspace', exact: true });
      await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      await workspace.getByRole('button', { name: 'Related horoscope editions', exact: true }).click();
      await page.getByRole('dialog', { name: 'Horoscopes', exact: true }).getByRole('button', { name: 'Write planetary horoscopes', exact: true }).click();
      const panel = page.getByRole('dialog', { name: 'Horoscopes for this write-up', exact: true });
      await expect(panel).toHaveClass(/studio-writeup-horoscopes-panel/u);
      await expect(panel).toHaveCSS('overflow-y', 'hidden');
      await expect(panel.locator('.studio-side-panel-content')).toHaveCSS('overflow-y', 'auto');
      await expect(panel.getByRole('group', { name: 'Write-up horoscope signs' }).getByRole('button')).toHaveCount(12);
      await expect(panel.getByText(/0 of 12 signs entered/u)).toBeVisible();
      await expect(panel).toContainText('2026');
      await panel.getByLabel('Aries write-up horoscope', { exact: true }).fill(passage('aries'));
      await panel.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(panel.getByText('Draft saved. Nothing was published.', { exact: true })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Approve & publish', exact: true })).toBeDisabled();
      await panel.getByRole('button', { name: 'Back to write-up', exact: true }).click();
      await expect(workspace.getByRole('button', { name: 'Approve & publish', exact: true })).toBeDisabled();
      await expect(workspace.getByLabel('Visit article body', { exact: true })).toHaveValue(initial.body);
      await page.reload(); await workspace.getByRole('button', { name: 'Edit', exact: true }).click();
      await workspace.getByRole('button', { name: 'Horoscopes', exact: true }).click();
      await expect(panel.getByLabel('Aries write-up horoscope', { exact: true })).toHaveValue(passage('aries'));
      for (const sign of WRITEUP_HOROSCOPE_SIGNS.slice(1)) {
        await panel.getByRole('group', { name: 'Write-up horoscope signs' }).getByRole('button', { name: title(sign), exact: true }).click();
        await panel.getByLabel(`${title(sign)} write-up horoscope`, { exact: true }).fill(passage(sign));
      }
      await expect(panel.getByText(/12 of 12 signs entered/u)).toBeVisible();
      await panel.getByRole('button', { name: 'Close Horoscopes for this write-up', exact: true }).click();
      await workspace.getByRole('button', { name: 'Horoscopes', exact: true }).click();
      await expect(panel.getByLabel('Pisces write-up horoscope', { exact: true })).toHaveValue(passage('pisces'));
      await panel.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect(panel.getByText('Draft saved. Nothing was published.', { exact: true })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Approve & publish', exact: true })).toBeEnabled();
      await expect(panel).toContainText('These readings publish with the write-up in its Horoscopes by rising sign section.');
      await expect(panel.getByRole('heading', { name: 'Horoscopes for this write-up' })).toHaveCSS('font-family', /system-ui/);
      await panel.getByLabel('Pisces write-up horoscope', { exact: true }).scrollIntoViewIfNeeded();
      const header = await panel.getByRole('heading', { name: 'Horoscopes for this write-up' }).boundingBox();
      const field = await panel.getByLabel('Pisces write-up horoscope', { exact: true }).boundingBox();
      expect(field!.y).toBeGreaterThan(header!.y + header!.height);
      const content = await panel.locator('.studio-side-panel-content').boundingBox();
      expect(content!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
      expect(await panel.evaluate(node => node.scrollTop)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath('writeup-horoscopes.png') });
      const scheduled = width === 1440 && theme === 'light';
      const publicationDate = scheduled ? '2030-10-24T12:00' : theme === 'dark' ? '2026-10-24T08:00' : '';
      const expectedPublishedAt = publicationDate ? await page.evaluate(value => new Date(value).toISOString(), publicationDate) : null;
      if (publicationDate) await panel.getByLabel('Publication date and time', { exact: true }).fill(publicationDate);
      await panel.getByRole('button', { name: scheduled ? 'Approve & schedule' : 'Approve & publish', exact: true }).click();
      await expect(panel.getByText(scheduled ? 'Publication scheduled. The saved article stays private until release.' : 'Article published with the selected publication date.', { exact: true })).toBeVisible();
      await page.reload();
      const saved = (await store.call({ method: 'rows' })).find((r: any) => r.id === initial.id);
      expect(saved.status).toBe(scheduled ? 'DRAFT' : 'LIVE');
      if (scheduled) expect(saved.source_snapshot.skyArticlePublication.state).toBe('scheduled');
      else if (expectedPublishedAt) expect(saved.published_at).toBe(expectedPublishedAt);
      expect(saved.sections.skyArticleEdition.writeupHoroscopes).toEqual(WRITEUP_HOROSCOPE_SIGNS.map(sign => ({ sign, body: passage(sign) })));
      expect(saved.sections.skyArticleEdition.transitStartInstant).toBe(article.sections.skyArticleEdition.transitStartInstant);
      expect(saved.sections.skyArticleEdition.transitEndInstant).toBe(article.sections.skyArticleEdition.transitEndInstant);
      expect(errors).toEqual([]);
    } finally { store.close(); }
  });
}

for(const [width,theme] of [[390,'dark'],[1440,'light']] as const)test(`Related panel writes planetary readings for an unsaved full Mercury Rx period ${width} ${theme}`,async({page})=>{
 const facts={...workspaceVisitFacts('mercury','scorpio','2026-10-24','2026-11-13'),motion:'retrograde',periodLabel:'Retrograde in this sign',
  transitStartInstant:'2026-10-24T07:12:00.000Z',transitEndInstant:'2026-11-13T15:53:00.000Z',
  eventCoverage:{start:'2026-10-24T07:12:00.000Z',end:'2026-11-13T15:53:00.000Z',complete:true},
  slotValues:{sign:'Scorpio',articleTitle:'Mercury Rx in Scorpio 2026',when:'October 24, 2026 at 3:12 AM ET to November 13, 2026 at 10:53 AM ET'}};
 const store=await studioApiStore([],{uuidIds:true});const writes:unknown[]=[];
 await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>{localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');localStorage.setItem('tldrastro:studio-theme',theme);},theme);
 await routeStudioInventoryApi(page,{call:store.call,actualDocumentRoute:true,onWrite:write=>writes.push(write),answer:async(route,url)=>{
  if(url.pathname==='/api/admin/sky-article-facts'){await route.fulfill({json:{ok:true,facts}});return true;}return false;
 }});
 try{
  const before=await store.call({method:'rows'}),publications=await store.call({method:'publications'});
  await page.goto(`${process.env.STUDIO_PRODUCTION_ENTRY==='1'?'/admin/content':'/'}#sky-writeups?planet=mercury&sign=scorpio`);
  const workspace=page.getByRole('region',{name:'Mercury in Scorpio workspace',exact:true});await workspace.getByRole('button',{name:'New article',exact:true}).click();
  await workspace.getByLabel('Visit reference date',{exact:true}).fill('2026-11-07');await workspace.getByRole('button',{name:'Write article',exact:true}).click();
  await expect(workspace.getByLabel('Visit article body')).toHaveValue('');
  const openWriter=async()=>{await workspace.getByRole('button',{name:'Related horoscope editions',exact:true}).click();await page.getByRole('dialog',{name:'Horoscopes',exact:true}).getByRole('button',{name:'Write planetary horoscopes',exact:true}).click();};
  await openWriter();const panel=page.getByRole('dialog',{name:'Horoscopes for this write-up',exact:true});
  await expect(page.getByRole('dialog')).toHaveCount(1);await expect(panel).toContainText(facts.slotValues.when);
  await expect(panel.getByRole('group',{name:'Write-up horoscope signs'}).getByRole('button')).toHaveCount(12);
  expect(writes).toEqual([]);expect(await store.call({method:'rows'})).toEqual(before);
  const text='Synthetic complete Aries planetary opening.\n\nSynthetic complete Aries planetary final sentence.';
  await panel.getByLabel('Aries write-up horoscope',{exact:true}).fill(text);await panel.getByRole('button',{name:'Close Horoscopes for this write-up',exact:true}).click();
  await openWriter();await expect(panel.getByLabel('Aries write-up horoscope',{exact:true})).toHaveValue(text);
  await panel.getByRole('button',{name:'Close Horoscopes for this write-up',exact:true}).click();
  await expect(workspace.getByLabel('Visit article body')).toHaveValue('');
  await workspace.getByLabel('Visit article body').fill('Synthetic complete general write-up.');await workspace.getByLabel('Visit article summary').fill('Synthetic explicit summary.');
  await workspace.getByRole('button',{name:'Save draft',exact:true}).click();await expect(workspace.getByText('Draft saved. Nothing was published.',{exact:true})).toBeVisible();
  const saved=(await store.call({method:'rows'})).find((row:any)=>row.content_key==='sky-article/mercury/scorpio/2026/2026-10-24');
  expect(saved.status).toBe('DRAFT');expect(saved.sections.skyArticleEdition.transitStartInstant).toBe(facts.transitStartInstant);expect(saved.sections.skyArticleEdition.transitEndInstant).toBe(facts.transitEndInstant);
  expect(saved.sections.skyArticleEdition.writeupHoroscopes.find((row:any)=>row.sign==='aries').body).toBe(text);
  await page.reload();await workspace.getByRole('button',{name:'Edit',exact:true}).click();await openWriter();await expect(panel.getByLabel('Aries write-up horoscope',{exact:true})).toHaveValue(text);
  await expect(panel.getByRole('button',{name:'Approve & publish',exact:true})).toBeDisabled();expect(await store.call({method:'publications'})).toEqual(publications);
 }finally{store.close();}
});
