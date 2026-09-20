import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

for (const legacyDraft of [false, true]) for (const [width, theme] of [[390, 'light'], [1440, 'dark']] as const) {
 test(`Sky article saves and publishes with ${legacyDraft ? 'legacy draft flags' : 'archived latest revision'} at ${width} ${theme}`, async ({ page }) => {
  const child = fork(path.resolve('tests/helpers/sky-article-save-api.mts'), [], { env: { ...process.env, SKY_SAVE_LEGACY_DRAFT: legacyDraft ? '1' : '' }, execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
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
   const initial = await call({ method: 'rows' });
   const liveBefore = initial.find((row: any) => row.id === 'live-sun-virgo');
   const errors: string[] = [], responses: any[] = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.setViewportSize({ width, height: 1000 });
   await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
   await routeStudioInventoryApi(page, { call, onWrite: ({ result }) => responses.push(result) });
   const selectSunVirgo = async () => {
    await page.getByLabel('Sky placement planet or point').selectOption('sun');
    await page.getByLabel('Sky placement zodiac sign').selectOption('virgo');
   };
   const recoverChunk = !legacyDraft && width === 1440;
   let missingChunk = recoverChunk;
   if (recoverChunk) await page.route('**/SkyPlacementComposition-*.js', route => missingChunk ? route.abort('failed') : route.continue());
   await page.goto(process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content#sky-writeups' : '/#sky-writeups');
   if (recoverChunk) {
    await selectSunVirgo();
    const recovery = page.getByRole('region', { name: 'Page recovery', exact: true });
    await expect(recovery).toBeVisible();
    missingChunk = false;
    await recovery.getByRole('button', { name: 'Retry page', exact: true }).click();
    await expect(recovery).toHaveCount(0);
   }
   await selectSunVirgo();
   const map = page.getByRole('region', { name: 'Sky placement composition map' });
   const edit = map.getByRole('button', { name: 'Edit placement article', exact: true });
   await edit.click();
   const editor = page.getByRole('dialog');
   const writing = editor.locator('textarea[data-sky-field="placementArticle"]');
   await expect(writing).toHaveValue(liveBefore.sections.packageRecord.placementArticle);
   await writing.fill('During this transit, {{planetTitle}} in {{signTitle}}. ');
   await editor.locator('.admin-editor-toolbar-actions').getByRole('button', { name: 'Variables', exact: true }).click();
   const picker = editor.locator('[data-sky-article-variable-picker]');
   await picker.locator('summary').filter({ hasText: 'Hooks and takeaways' }).click();
   await picker.getByRole('button', { name: 'Insert {{openingHook}}', exact: true }).click();
   const first = 'During this transit, {{planetTitle}} in {{signTitle}}. {{openingHook}}';
   await expect(writing).toHaveValue(first);
   await expect(editor.locator('.admin-sky-writing-preview')).toHaveText('During this transit, Sun in Virgo. During this transit, fixture governed opening.');
   await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
   await expect.poll(() => responses.length).toBe(1);
   expect(responses[0].status).toBe(200);
   expect(responses[0].payload.rows[0].status).toBe('DRAFT');
   const second = first + '\n\nFixture second saved paragraph.';
   await writing.fill(second);
   await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
   await expect.poll(() => responses.length).toBe(2);
   expect(responses[1].status).toBe(200);
   expect((await call({ method: 'rows' })).find((row: any) => row.id === liveBefore.id)).toEqual(liveBefore);
   await expect(editor.getByRole('alert')).toHaveCount(0);
   await editor.getByRole('button', { name: 'Close', exact: true }).click();
   await page.reload(); await selectSunVirgo(); await edit.click();
   await expect(writing).toHaveValue(second);
   await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
   await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.id === liveBefore.id)?.sections.packageRecord.placementArticle).toBe(second);
   await expect(editor.getByRole('alert')).toHaveCount(0);
   // A fresh visit after publication must select the LIVE source, then fork a
   // new review draft without resurrecting the completed revision's old target.
   await editor.getByRole('button', { name: 'Close', exact: true }).click();
   await page.reload(); await selectSunVirgo(); await edit.click();
   await expect(writing).toHaveValue(second);
   await writing.fill(second + '\n\nFixture next publication.');
   await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
   await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.id === liveBefore.id)?.sections.packageRecord.placementArticle).toBe(second + '\n\nFixture next publication.');
   await expect(editor.getByRole('alert')).toHaveCount(0);
   expect(responses.every(result => result.status === 200)).toBe(true);
   expect(errors).toEqual([]);
   await editor.screenshot({ path: `test-results/sky-article-save-${legacyDraft}-${width}-${theme}.png` });
  } finally { child.kill(); }
 });
}
