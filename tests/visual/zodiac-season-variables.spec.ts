import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

for (const [width, theme] of [[390, 'light'], [1440, 'dark']] as const) {
 test(`Shared zodiac season source saves, returns and publishes at ${width} ${theme}`, async ({ page }) => {
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
   await page.goto(process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content#sky-writeups' : '/#sky-writeups');
   await selectSunVirgo();
   const map = page.getByRole('region', { name: 'Sky placement composition map' });
   const edit = map.getByRole('button', { name: 'Edit placement article', exact: true });
   await edit.click();
   const editor = page.getByRole('dialog');
   const writing = editor.locator('textarea[data-sky-field="placementArticle"]');
   await expect(writing).toHaveValue(liveBefore.sections.packageRecord.placementArticle);
   const template = 'During this transit, {{zodiacSeason}}\n\n{{zodiacSeasonPolarAxis}}';
   await writing.fill(template);
   const dialogs: string[] = []; page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
   for (const [variable, label] of [['zodiacSeason', 'zodiac season'], ['zodiacSeasonPolarAxis', 'zodiac season polar axis']]) {
    await editor.locator('.admin-editor-toolbar-actions').getByRole('button', { name: 'Variables', exact: true }).click();
    const picker = editor.locator('[data-sky-article-variable-picker]');
    await picker.getByRole('button', { name: `Edit ${label}`, exact: true }).click();
    const sourceWriting = editor.locator('textarea[data-sky-field="body"]');
    await expect(sourceWriting).toBeVisible();
    const prose = `Fixture Virgo ${label} first paragraph.\n\nFixture full second paragraph.`;
    await sourceWriting.fill(prose);
    await editor.getByRole('button', {name: 'Save & return', exact: true}).click();
    await expect(writing).toHaveValue(template);
    await expect(editor.locator('.admin-sky-writing-preview')).toContainText(prose);
    expect((await call({method: 'rows'})).find((row: any) => row.content_key === `fallback-hook/${variable === 'zodiacSeason' ? 'zodiac-season' : 'zodiac-season-polar-axis'}/virgo` && row.status === 'LIVE').sections.packageRecord.body).toBe(prose);
   }
   expect(dialogs).toEqual([]);
   expect((await call({method: 'rows'})).find((row: any) => row.id === liveBefore.id)).toEqual(liveBefore);
   await editor.getByRole('button', {name: 'Save & publish', exact: true}).click();
   await expect.poll(async () => (await call({method: 'rows'})).find((row: any) => row.id === liveBefore.id)?.sections.packageRecord.placementArticle).toBe(template);
   await editor.getByRole('button', {name: 'Close', exact: true}).click();
   await page.reload(); await selectSunVirgo(); await edit.click();
   await expect(writing).toHaveValue(template);
   await expect(editor.locator('.admin-sky-writing-preview')).not.toContainText('{{');
   await expect(editor.getByRole('alert')).toHaveCount(0);
   expect(errors).toEqual([]);
   await editor.screenshot({path: `test-results/zodiac-season-${width}-${theme}.png`});
  } finally { child.kill(); }
 });
}
