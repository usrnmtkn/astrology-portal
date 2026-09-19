import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';

for (const [width, theme] of [[390, 'light'], [1440, 'dark']] as const) {
 test(`The article writer names what it produces at ${width} ${theme}`, async ({ page }) => {
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
   const errors: string[] = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.setViewportSize({ width, height: 1000 });
   await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
   await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname === '/api/admin/generated-content') {
     if (request.method() !== 'GET' || url.searchParams.has('id') || url.searchParams.has('contentKeys') || url.searchParams.has('variables')) {
      const result = await call({ method: request.method(), body: request.method() === 'GET' ? undefined : request.postDataJSON(), url: url.pathname + url.search });
      return route.fulfill({ status: result.status, json: result.payload });
     }
     const rows = (await call({ method: 'rows' })).map((row: any) => ({ ...row, body: null, sections: null, inventory_only: true }));
     return route.fulfill({ json: { ok: true, rows, nextCursor: null } });
    }
    return route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
   });
   await page.goto(process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content#sky-writeups' : '/#sky-writeups');
   await page.getByLabel('Sky placement planet or point').selectOption('sun');
   await page.getByLabel('Sky placement zodiac sign').selectOption('virgo');
   await page.getByRole('region', { name: 'Sky placement composition map' })
    .getByRole('button', { name: 'Edit placement article', exact: true }).click();

   const editor = page.getByRole('dialog');
   const writing = editor.locator('textarea[data-sky-field="placementArticle"]');
   await expect(writing).not.toHaveValue('');
   const panel = editor.locator('details.admin-workspace-details').filter({ has: page.getByText('AI writing', { exact: true }) });
   await panel.locator('summary').click();

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

   // An empty article field offers to write it rather than rewrite it.
   await writing.fill('');
   await expect(panel.getByRole('button', { name: 'Write the reusable article', exact: true })).toBeVisible();
   await expect(panel.getByRole('button', { name: 'Rewrite the reusable article', exact: true })).toHaveCount(0);

   expect(errors).toEqual([]);
   await panel.screenshot({ path: `test-results/sky-article-writer-label-${width}-${theme}.png` });
  } finally { child.kill(); }
 });
}
