import {expect,test,type Page} from '@playwright/test';
import {createMonthlyApiFixture} from '../helpers/monthly-writing-api.mts';
import {monthlyTemplateStarter} from '../../src/monthly-writing/starter';
async function attach(page:Page,api:Awaited<ReturnType<typeof createMonthlyApiFixture>>) {
 await page.addInitScript(()=>localStorage.setItem('tldrastro:contentAdminSecret','monthly-fixture'));
 await page.route('**/api/admin/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.endsWith('/monthly-writing')) {
   const result=await api.invoke(request.method(),request.postData()?request.postDataJSON():undefined,url.pathname+url.search,request.headers()['x-content-generation-secret']??'');
   await route.fulfill({status:result.status,json:result.payload});return;
  }
  await route.fulfill({json:{ok:true,rows:[],statuses:[],records:[],nextCursor:null}});
 });
 await page.goto('/admin/content#calendar-writeups?view=monthly-sky');
 await page.getByRole('button',{name:'Open monthly phrase editor',exact:true}).click();
 const writer=page.getByRole('region',{name:'Monthly sentence template writer',exact:true});
 await expect(writer.getByRole('button',{name:'Review selected highlights',exact:true})).toBeEnabled();
 return writer;
}
test.beforeEach(async ({page})=>{await page.clock.setFixedTime(new Date('2026-09-15T17:00:00Z'));});
const headingStyle=(node:Element)=>{const s=getComputedStyle(node);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.marginTop,s.marginBottom,s.textTransform];};
for(const width of [390,1440]) for(const theme of ['light','dark']) test(`Monthly nested writing ${width} ${theme}`,async({page})=>{
 const api=await createMonthlyApiFixture(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 try {
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:studio-theme',theme),theme);
  const writer=await attach(page,api);const tabs=writer.getByRole('tablist',{name:'Monthly writing views'});
  expect(await writer.getByRole('heading',{name:'Monthly sentence templates',exact:true}).evaluate(headingStyle)).toEqual(await page.getByRole('heading',{name:'Template preview',exact:true}).evaluate(headingStyle));
  await tabs.getByRole('tab',{name:'Sentence templates',exact:true}).click();
  await expect(writer.getByLabel('Monthly definition value')).toHaveValue(monthlyTemplateStarter().definitions.monthlyOverview.value);
  await writer.getByLabel('Monthly definition').selectOption('openingSeasonOpportunity');
  await expect(writer.getByLabel('Monthly definition value')).toHaveValue('{{openingSeasonStrengthening}} and {{openingSeasonCorrection}}');
  await writer.getByRole('button',{name:'Save reusable sentence templates',exact:true}).click();
  await expect(writer.getByText('Reusable sentence templates saved. Existing monthly editions were not changed.',{exact:true})).toBeVisible();
  await writer.getByRole('button',{name:'Review selected highlights',exact:true}).click();
  await expect(writer.getByLabel('Lead planetary event')).toBeVisible();
  await writer.getByLabel('Highlights reviewed').check();
  await tabs.getByRole('tab',{name:'Phrase values',exact:true}).click();
  const focus=writer.getByLabel('Phrase edition::openingSeasonFocus',{exact:true});
  await focus.fill('fixture seasonal focus');await writer.getByLabel('Protect edition::openingSeasonFocus',{exact:true}).check();
  await writer.getByRole('button',{name:'Generate monthly draft',exact:true}).click();
  await expect(writer.getByRole('region',{name:'Monthly phrase suggestions'})).toBeVisible();
  await expect(focus).toHaveValue('fixture seasonal focus');
  await writer.getByRole('button',{name:'Use suggested phrases',exact:true}).click();
  await expect(focus).toHaveValue('fixture seasonal focus');
  await writer.getByRole('button',{name:'Save month draft',exact:true}).click();
  await expect(writer.getByText('2026-09 draft saved. Nothing was published.',{exact:true})).toBeVisible();
  const saved=(await api.invoke('GET')).payload.edition;
  expect(saved.document.template.body).toBe(monthlyTemplateStarter().body);
  expect(saved.document.template.definitions.monthlyOverview.value).toBe(monthlyTemplateStarter().definitions.monthlyOverview.value);
  expect(saved.document.values.openingSeasonFocus).toBe('fixture seasonal focus');expect(api.generations).toBe(1);
  await tabs.getByRole('tab',{name:'Assembled preview',exact:true}).click();
  const preview=writer.getByLabel('Assembled monthly writing');await expect(preview).toContainText('September 2026');await expect(preview).toContainText('fixture seasonal focus');await expect(preview).not.toContainText('{{');
  await expect(preview.getByRole('heading',{name:'New Moon in Virgo'})).toHaveCount(1);await expect(preview.getByRole('heading',{name:/eclipse/i})).toHaveCount(0);
  expect(await preview.locator('p').first().evaluate(node=>{const s=getComputedStyle(node),root=getComputedStyle(document.querySelector('.admin-dashboard')!);return [s.fontFamily===root.fontFamily,s.fontSize===root.fontSize,s.lineHeight===root.lineHeight,s.letterSpacing===root.letterSpacing];})).toEqual([true,true,true,true]);
  await writer.scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/monthly-writing-${width}-${theme}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.reload();await page.getByRole('button',{name:'Open monthly phrase editor',exact:true}).click();await expect(writer.getByRole('button',{name:'Review selected highlights',exact:true})).toBeEnabled();
  await writer.getByRole('button',{name:'Review selected highlights',exact:true}).click();await tabs.getByRole('tab',{name:'Phrase values',exact:true}).click();await expect(focus).toHaveValue('fixture seasonal focus');await expect(focus).toBeDisabled();
  await writer.getByLabel('Writing month').fill('2027-09');await expect(writer.getByRole('button',{name:'Review selected highlights',exact:true})).toBeEnabled();await writer.getByRole('button',{name:'Review selected highlights',exact:true}).click();await tabs.getByRole('tab',{name:'Phrase values',exact:true}).click();await expect(focus).toHaveValue('');
  expect(errors).toEqual([]);
 } finally {await api.db.close();}
});
test('Monthly editor preserves newer edits on save conflict and asks before closing',async({page})=>{
 const api=await createMonthlyApiFixture();try{
  const writer=await attach(page,api);const tabs=writer.getByRole('tablist',{name:'Monthly writing views'});
  await writer.getByRole('button',{name:'Review selected highlights'}).click();await writer.getByRole('button',{name:'Save month draft'}).click();await expect(writer.getByText('2026-09 draft saved. Nothing was published.',{exact:true})).toBeVisible();
  const old=(await api.invoke('GET')).payload.edition;await api.invoke('POST',{action:'save-edition',document:{...old.document,values:{openingSeasonFocus:'newer server edit'}},expectedUpdatedAt:old.updatedAt});
  await tabs.getByRole('tab',{name:'Phrase values',exact:true}).click();const focus=writer.getByLabel('Phrase edition::openingSeasonFocus',{exact:true});await focus.fill('unsaved local edit');
  await writer.getByRole('button',{name:'Save month draft'}).click();await expect(writer.getByRole('alert')).toContainText('changed after you opened');await expect(focus).toHaveValue('unsaved local edit');
  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Close monthly phrase editor',exact:true}).click();await expect(writer).toBeVisible();
  expect((await api.invoke('GET')).payload.edition.document.values.openingSeasonFocus).toBe('newer server edit');
 }finally{await api.db.close();}
});
