import { test, expect, type Page } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { bundledPublications } from '../helpers/bundled-publications';
import { sectionFixtures } from '../helpers/studio-section-fixtures.mjs';

// Teardown ignores only already-pending interception failures after assertions;
// removing routes can cancel background source-preview requests mid-response.
async function setup(page: Page, theme = 'light') {
  const store = await studioApiStore(sectionFixtures);
  await page.context().route('**/*', route => new URL(route.request().url()).pathname.startsWith('/api/') || !['GET','HEAD'].includes(route.request().method()) ? route.abort() : route.continue());
  await bundledPublications(page);
  await page.addInitScript(theme => {
    localStorage.setItem('tldrastro:contentAdminSecret','calendar-api-fixture');
    localStorage.setItem('tldrastro:studio-theme',theme);
  }, theme);
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url());
    if (['/api/admin/generated-content-inventory','/api/admin/generated-content'].includes(url.pathname)) {
      const result = await store.call({method:req.method(), url:url.pathname+url.search, body:req.method()==='GET'?undefined:req.postDataJSON()});
      return route.fulfill({status:result.status,json:result.payload});
    }
    if (url.pathname === '/api/admin/content-live-status') {
      const body = req.postDataJSON();
      return route.fulfill({json:body.action==='composition-catalog'?{ok:true,rows:[]}:{ok:true,statuses:await store.call({method:'statuses',body})}});
    }
    return route.fulfill({json:{ok:true,rows:[],statuses:[],nextCursor:null}});
  });
  return store;
}
for (const width of [390,1440]) for (const theme of ['light','dark']) {
  test(`Saved stations and Venus retrograde survive direct entry and reload ${width} ${theme}`, async ({page}) => {
    const store = await setup(page,theme);
    try {
      await page.setViewportSize({width,height:1000});
      await page.goto('/admin/content#calendar-writeups?view=planetary-stations');
      const workspace = page.getByRole('region',{name:'Planetary stations',exact:true});
      await expect(workspace).toContainText('13 saved write-ups');
      await workspace.getByLabel('Planet or point',{exact:true}).selectOption('venus');
      await expect(workspace).toContainText('4 saved write-ups');
      const key = 'authored/station/venus/rx';
      for (let attempt=0;attempt<2;attempt++) {
        await workspace.getByRole('button',{name:`Edit ${key}`,exact:true}).click();
        const editor=page.getByRole('dialog',{name:'Generated content editor'});
        await expect(editor.getByLabel('Content key',{exact:true})).toHaveValue(key);
        const expected=sectionFixtures.find(row=>row.content_key===key)!.body;
        await expect.poll(async()=>editor.locator('textarea').evaluateAll(nodes=>nodes.map(node=>node.value))).toContain(expected);
        await editor.getByRole('button',{name:'Close',exact:true}).click();
        if (!attempt) await page.reload();
      }
      await workspace.getByLabel('Planet or point',{exact:true}).selectOption('venus');
      await workspace.getByLabel('Station sign',{exact:true}).selectOption('scorpio');
      await expect(workspace.getByText('Venus retrograde in Scorpio',{exact:true})).toBeVisible();
      await expect(workspace.getByRole('button',{name:'Edit sky.retrograde.venus.scorpio.retrograde_passage',exact:true})).toBeVisible();
      await workspace.getByLabel('Station direction',{exact:true}).selectOption('direct');
      await expect(workspace).toContainText('1 saved write-up');
      await expect(workspace.getByRole('button',{name:'Edit authored/station/venus/direct',exact:true})).toBeVisible();
      await page.screenshot({path:`test-results/station-visibility-${width}-${theme}.png`,fullPage:true});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
      expect(await store.call({method:'rows'})).toEqual(sectionFixtures);
    } finally {await page.unrouteAll({behavior:'ignoreErrors'});await page.context().unrouteAll({behavior:'ignoreErrors'});await page.close();store.close();}
  });
}
const sections = [
  {hash:'compatibility',keys:['vocab/relationship/fixture','slot-template/compatibility/fixture','fallback-hook/pair-daily/fixture','fixture/compatibility-event','fixture/compatibility-block']},
  {hash:'composite-review',keys:['composite.aspect.sun.trine.moon','fixture/surface-only','fixture/relationship-block']},
  {hash:'sky-writeups',keys:['sky/station/venus/retrograde/scorpio','authored/sky-placement/venus/scorpio','custom/sky-article']},
  {hash:'templates',keys:['authored/week-opener/new-moon','fallback-hook/empty-house/bridge-template/standard','custom/template-role','custom/template-block','custom/package-template','custom/lunar-source']},
  {hash:'vocabulary',keys:['vocab.legacy-fixture','guide-phrase/fixture','custom/vocabulary-role']},
  {hash:'slots',keys:['custom/template-role','custom/vocabulary-role','vocab/planet/fixture','fallback-template/fixture','fallback-hook/custom-natal-ingredient']},
  {hash:'fallback-hooks?section=you',keys:['custom/fallback-prompt','fallback-hook/custom-natal-ingredient']}
];
for(const section of sections) test(`Direct section entry includes saved ingredients: ${section.hash}`,async({page})=>{
  const store=await setup(page);
  try {
    await page.goto(`/admin/content#${section.hash}`);
    for(const key of section.keys) {
      if(section.hash==='templates') await page.getByRole('textbox',{name:'Search templates',exact:true}).fill(key);
      await expect(page.getByText(key,{exact:true}).first()).toBeVisible();
    }
    await page.reload();
    for(const key of section.keys) {
      if(section.hash==='templates') await page.getByRole('textbox',{name:'Search templates',exact:true}).fill(key);
      await expect(page.getByText(key,{exact:true}).first()).toBeVisible();
    }
    expect(await store.call({method:'rows'})).toEqual(sectionFixtures);
  }finally{await page.unrouteAll({behavior:'ignoreErrors'});await page.context().unrouteAll({behavior:'ignoreErrors'});await page.close();store.close();}
});
