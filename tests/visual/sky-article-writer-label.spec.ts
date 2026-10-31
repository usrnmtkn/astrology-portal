import { openSkyPlacementSourceDetails } from '../helpers/sky-placement-workspace-navigation';
import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import {checkWritingExport} from '../helpers/check-writing-export';
import {writingExport} from '../../src/astro-writing/writingExport.mjs';

for (const [width, theme, hasTemplate] of [[390, 'light', true], [1440, 'dark', true], [390, 'light', false]] as const) {
 test(`The article writer names its output and offers an available destination at ${width} ${theme} template=${hasTemplate}`, async ({ page }) => {
  const child = fork(path.resolve('tests/helpers/sky-article-save-api.mts'), [], { env: { ...process.env, SKY_SAVE_LEGACY_DRAFT: '' }, execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let sequence = 0, stderr = '';
  const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void }>();
  child.stderr?.on('data', value => { stderr += value; });
  const ready = new Promise<void>((resolve, reject) => {
   child.on('message', (message: any) => {
    if (message.ready) return resolve();
    const task = pending.get(message.id);
    if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error)) : task.resolve(message.result); }
   });
   child.on('exit', code => { const error = new Error(`Fixture exited ${code}: ${stderr}`); reject(error); pending.forEach(task => task.reject(error)); });
  });
  const call = (message: any) => new Promise<any>((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); child.send({ ...message, id }); });
  try {
   await ready;
   const templateKey = 'sky/article-template/sun/virgo';
   if (hasTemplate) {
    const created = await call({ method: 'POST', body: { contentKey: templateKey, surface: 'sky', mode: 'article',
    status: 'DRAFT', lane: 'reference', reviewState: 'owner-review-required', eventType: 'sky-article-template', blockType: 'sky_article',
    headline: 'Synthetic Sun in Virgo template', summary: '', body: '{{articleTitle}}\n\n{{articleBody}}', sections: {},
    sourceSnapshot: { contentType: 'sky-article-template' }, provider: 'manual-admin' } });
    expect(created.status).toBe(200);
   }
   const before = await call({ method: 'rows' });
   const writes: unknown[] = [], generationRequests: string[] = [], previews:any[]=[];
   const errors: string[] = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.setViewportSize({ width, height: 1000 });
   await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
   await routeStudioInventoryApi(page, { call, actualDocumentRoute: true, onWrite: write => writes.push(write),
    answer: async (route, url) => {
     if(url.pathname==='/api/admin/sky-article-facts'){
      await route.fulfill({json:{ok:true,facts:{planet:'sun',sign:'virgo',entryYear:2026,validFrom:'2026-08-22',validTo:'2026-09-22',transitStartInstant:'2026-08-22T14:00:00Z',transitEndInstant:'2026-09-22T14:00:00Z',referenceTimeZone:'America/New_York',calculationSource:'synthetic browser fixture',generatedAt:'2026-10-31T12:00:00Z',slotValues:{when:'Synthetic complete Virgo visit window',articleTitle:'Synthetic Virgo visit'}}}});
      return true;
     }
     if (route.request().method() !== 'POST' || !url.pathname.startsWith('/api/admin/sky-article-')) return false;
     const body=route.request().postDataJSON();
     if(body.preview===true){
      previews.push({path:url.pathname,...body});
      await route.fulfill({json:{ok:true,writingExport:writingExport({title:'Synthetic planetary writing plan',requests:[{label:'Article',instructions:'Synthetic complete planetary instructions.',input:'Synthetic planetary source opening.\n\nSynthetic planetary source final sentence.',schema:{type:'object'}}]})}});
      return true;
     }
     generationRequests.push(url.pathname);
     await route.fulfill({ status: 500, json: { error: 'Opening the generator must not generate writing.' } });
     return true;
    } });
   await page.goto(process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content#sky-writeups' : '/#sky-writeups');
   await page.getByLabel('Sky placement planet or point').selectOption('sun');
   await page.getByLabel('Sky placement zodiac sign').selectOption('virgo');
   const visit=page.getByRole('region',{name:'Dated visit articles',exact:true});
   await visit.getByLabel('Visit reference date',{exact:true}).fill('2026-09-07');
   await visit.getByRole('button',{name:'Generate draft',exact:true}).click();
   await checkWritingExport(page,visit.getByRole('region',{name:'Generate a dated article',exact:true}),'Synthetic planetary source opening.\n\nSynthetic planetary source final sentence.');
   expect(previews.at(-1)).toMatchObject({path:'/api/admin/sky-article-template-slots',preview:true,visit:{planet:'sun',sign:'virgo'},referenceDate:'2026-09-07'});
   expect(await call({method:'rows'})).toEqual(before);expect(generationRequests).toEqual([]);
   await openSkyPlacementSourceDetails(page);
   await page.getByRole('region', { name: 'Sky placement composition map' })
    .getByRole('button', { name: 'Edit placement article', exact: true }).click();

   const editor = page.getByRole('dialog');
   const writing = editor.locator('textarea[data-sky-field="placementArticle"]');
   await expect(writing).not.toHaveValue('');
   const panel = editor.locator('details.admin-workspace-details').filter({ has: page.getByText('AI writing', { exact: true }) });
   await panel.locator(':scope > summary').click();

   // The owner never sees the internal word evergreen: the action says what it
   // writes, and the article's reusable scope is explained in the panel copy.
   await expect(panel.getByRole('button', { name: 'Rewrite the reusable article', exact: true })).toBeVisible();
   await expect(panel).toContainText('This generator rewrites the reusable');
   await expect(panel).not.toContainText(/evergreen/iu);

   // Planet and sign are lowercase content-key tokens, so the panel has to
   // title-case them before showing them to the owner.
   await expect(panel).toContainText('Virgo season article');
   await expect(panel).toContainText('natal Sun in Virgo personality description');
   await expect(panel).toContainText('Choose a date when Sun is in Virgo.');
   await expect(panel).not.toContainText(/\bvirgo\b/u);
   await checkWritingExport(page,panel,'Synthetic planetary source opening.\n\nSynthetic planetary source final sentence.');
   expect(previews.at(-1)).toMatchObject({path:'/api/admin/sky-article-writing',preview:true,planet:'sun',sign:'virgo',field:'placementArticle'});

   // An empty article field offers to write it rather than rewrite it.
   await writing.fill('');
   await expect(panel.getByRole('button', { name: 'Write the reusable article', exact: true })).toBeVisible();
   await expect(panel.getByRole('button', { name: 'Rewrite the reusable article', exact: true })).toHaveCount(0);

   await panel.screenshot({ path: `test-results/sky-article-writer-label-${width}-${theme}-template-${hasTemplate}.png` });
   const openGenerator = panel.getByRole('button', { name: 'Open dated authored article generator', exact: true });
   if (!hasTemplate) {
    await expect(openGenerator).toHaveCount(0);
    expect(await call({ method: 'rows' })).toEqual(before);
    expect(writes).toEqual([]); expect(generationRequests).toEqual([]); expect(errors).toEqual([]);
    return;
   }
   await panel.locator('input[type="date"]').fill('2026-09-07');
   const hashBefore = new URL(page.url()).hash;
   page.once('dialog', dialog => dialog.dismiss());
   await openGenerator.click();
   await expect(writing).toHaveValue('');
   await expect(editor.getByRole('region', { name: 'Create an article edition from this template', exact: true })).toHaveCount(0);
   // Accepting the existing discard guard opens the actual selected template, with the date intact.
   page.once('dialog', dialog => dialog.accept());
   await openGenerator.click();
   const generator = editor.getByRole('region', { name: 'Create an article edition from this template', exact: true });
   await expect(generator).toBeVisible();
   await expect(generator.locator('code')).toHaveText(templateKey);
   const referenceDate = generator.getByLabel('Sky article reference date', { exact: true });
   await expect(referenceDate).toHaveValue('2026-09-07');
   await expect(referenceDate).toBeFocused();
   await checkWritingExport(page,generator,'Synthetic planetary source opening.\n\nSynthetic planetary source final sentence.');
   expect(previews.at(-1)).toMatchObject({path:'/api/admin/sky-article-template-slots',preview:true,referenceDate:'2026-09-07'});
   expect(previews.at(-1).templateId).toBeTruthy();
   expect(new URL(page.url()).hash).toBe(hashBefore);
   expect(await call({ method: 'rows' })).toEqual(before);
   expect(writes).toEqual([]); expect(generationRequests).toEqual([]); expect(errors).toEqual([]);
   await generator.screenshot({ path: `test-results/sky-article-generator-handoff-${width}-${theme}.png` });
  } finally { try { await page.unrouteAll({ behavior: 'wait' }); } finally { child.kill(); } }
 });
}
