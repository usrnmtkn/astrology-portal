import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

for (const [width, theme] of [[390, 'light'], [1440, 'dark']] as const) {
 test(`Generic sign template inserts shared variables and preserves its draft at ${width} ${theme}`, async ({ page }) => {
  const child = fork(path.resolve('tests/helpers/sky-article-save-api.mts'), [], { env: { ...process.env, SKY_SAVE_LEGACY_DRAFT: '', ZODIAC_TEMPLATE_FIXTURE: '1' }, execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
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
   await routeStudioInventoryApi(page, { call, onWrite: result => responses.push(result) });
   await page.goto(process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content#templates' : '/#templates');
   await page.locator('.admin-content-row', {hasText: 'Fixture sign-aware template'}).getByRole('button', {name: 'Edit', exact: true}).click();
   const editor = page.getByRole('dialog');
   const writing = editor.locator('textarea[data-sky-field="body"]');
   await expect(writing).toHaveValue('Fixture {{signTitle}}. TARGET');
   await writing.evaluate((el: HTMLTextAreaElement) => {el.focus(); el.setSelectionRange(el.value.indexOf('TARGET'), el.value.length);});
   await editor.getByRole('button', {name: /Reader preview & variables/}).click();
   const rail = page.getByRole('complementary', {name: 'Template variable reference'});
   await rail.getByRole('button', {name: 'Insert {{zodiacSeason}}', exact: true}).click();
   await expect(writing).toHaveValue('Fixture {{signTitle}}. {{zodiacSeason}}');
   await rail.getByRole('button', {name: 'Insert {{zodiacSeasonPolarAxis}}', exact: true}).click();
   await expect(writing).toHaveValue('Fixture {{signTitle}}. {{zodiacSeason}}{{zodiacSeasonPolarAxis}}');
   await rail.locator('.admin-variables-rail-row').filter({hasText: '{{zodiacSeason}}'}).click();
   await expect(rail.getByText('12 source rows can fill this variable.', {exact: true})).toBeVisible();
   await rail.locator('.admin-variable-source-row').filter({hasText: 'fallback-hook/zodiac-season/virgo'}).click();
   await rail.getByRole('button', {name: /Edit.*source/i}).click();
   const sourceWriting = editor.getByLabel('Reader copy', { exact: true });
   await sourceWriting.fill('Fixture full shared Virgo prose.');
   await editor.getByRole('button', {name: 'Save & return', exact: true}).click();
   await expect(writing).toHaveValue('Fixture {{signTitle}}. {{zodiacSeason}}{{zodiacSeasonPolarAxis}}');
    await page.getByRole('button', {name: 'Dismiss notification', exact: true}).click();
    await rail.getByRole('button', {name: 'Close variables', exact: true}).click();
   await editor.getByRole('button', {name: 'Save draft', exact: true}).click();
   await expect.poll(async () => (await call({method: 'rows'})).find((row: any) => row.content_key === 'fallback-template/natal.angle-in-sign')?.sections.packageDraft?.body).toBe('Fixture {{signTitle}}. {{zodiacSeason}}{{zodiacSeasonPolarAxis}}');
   expect(errors).toEqual([]);
  } finally { child.kill(); }
 });
}
