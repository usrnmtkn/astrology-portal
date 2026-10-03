import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

// Reproduce imported rows with the writing identity but no canonical metadata.
const key = 'sky-placement/article/sun/libra';
const record = { contentKey: key, planet: 'sun', sign: 'libra', surface: 'sky', content_role: 'fallback_hook', review_status: 'approved', owner_approved: false, serving_enabled: false, studio_content_type: 'continuous-placement' };
const legacy = { id: 'legacy-libra', content_key: key, surface: 'sky', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null, provider: 'tldrastro-fallback-architecture-v3', event_type: 'sky-writeup-variable-import', block_type: 'fallback_hook', headline: 'Sun in Libra', summary: '', body: '', sections: { packageRecord: record }, source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3' }, updated_at: '2026-09-20T07:09:32.791Z' };
const templateBody = 'Fixture template opening {{entryDate}}.\n\n{{aspectSections}}\n\n{{lunationSection}}\n\nFixture template ending {{exitDate}}.';
const template = { ...legacy, id: 'libra-template', content_key: 'sky/article-template/sun/libra', provider: 'owner-resource-review', event_type: 'sky-article-template', block_type: 'article', headline: 'Sun Enters Libra', body: templateBody, sections: {}, source_snapshot: {} };

for (const [width, theme] of [[390, 'light'], [1440, 'dark']] as const) {
 test(`Legacy placement and template editing at ${width} ${theme}`, async ({ page }) => {
  test.setTimeout(90000);
  const directory = mkdtempSync(path.join(tmpdir(), 'sky-editor-'));
  const fixture = path.join(directory, 'rows.json'); writeFileSync(fixture, JSON.stringify([legacy, template]));
  const child = fork(path.resolve('tests/helpers/sky-article-save-api.mts'), [], { env: { ...process.env, SKY_SAVE_FIXTURE: fixture }, execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let sequence = 0, stderr = '';
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  child.stderr?.on('data', value => { stderr += value; });
  const ready = new Promise<void>((resolve, reject) => {
   child.on('message', (message: any) => { if (message.ready) return resolve(); const task = pending.get(message.id); if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error)) : task.resolve(message.result); } });
   child.on('exit', code => { const error = new Error(`Fixture exited ${code}: ${stderr}`); reject(error); pending.forEach(task => task.reject(error)); });
  });
  const call = (message: any) => new Promise<any>((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); child.send({ ...message, id }); });
  try {
   await ready;
   const writes: any[] = [], packageReads: string[] = [], errors: string[] = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.setViewportSize({ width, height: 1000 });
   await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
   await routeStudioInventoryApi(page, { call, actualDocumentRoute: true, onWrite: ({ result }) => writes.push(result),
    listRows: rows => rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    answer: async (route, url) => {
     if (url.pathname !== '/api/admin/package-source') return false;
     packageReads.push(url.searchParams.get('contentKey')!);
     const result = await call({ method: 'GET', url: url.pathname + url.search });
     await route.fulfill({ status: result.status, json: result.payload }); return true;
    }
   });
   const select = async () => {
    await page.getByLabel('Sky placement planet or point').selectOption('sun');
    await page.getByLabel('Sky placement zodiac sign').selectOption('libra');
    await page.getByLabel('Seasonal preview hemisphere').selectOption('northern');
   };
   await page.goto(process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content#sky-writeups' : '/#sky-writeups');
   await select();
   const map = page.getByRole('region', { name: 'Sky placement composition map' });
   await expect.poll(() => packageReads.includes('sky-placement/seasonal-context/libra/northern')).toBe(true);
   await expect(map.getByText('Source unavailable: seasonal paragraph')).toHaveCount(0);
   const edit = map.getByRole('button', { name: 'Edit direct placement article', exact: true });
   await edit.click();
   const editor = page.getByRole('dialog');
   const writing = editor.locator('textarea[data-sky-field="placementArticleDirect"]');
   await expect(writing).toHaveValue('');
   const copy = 'During this transit, fixture opening {{entryDate}}.\n\nFixture final sentence {{exitDate}}.';
   await writing.fill(copy);
   await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
   await expect.poll(() => writes.length).toBe(1); expect(writes[0].status).toBe(200);
   expect((await call({ method: 'rows' })).find((row: any) => row.id === legacy.id)).toEqual(legacy);
   await editor.getByRole('button', { name: 'Close', exact: true }).click();
   await page.reload(); await select(); await edit.click();
   await expect(writing).toHaveValue(copy);
   await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
   await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.id === legacy.id)?.sections.packageRecord.placementArticleDirect).toBe(copy);
   expect((await call({ method: 'rows' })).find((row: any) => row.id === legacy.id).sections.packageOriginalRecord).toEqual(record);
   await expect(editor.getByRole('alert')).toHaveCount(0);
   await editor.getByRole('button', { name: 'Close', exact: true }).click();
   await page.reload(); await select(); await edit.click(); await expect(writing).toHaveValue(copy);
   await editor.getByRole('button', { name: 'Close', exact: true }).click();

   await page.getByRole('row').filter({ hasText: 'sky/article-template/sun/libra' }).getByRole('button', { name: 'Edit', exact: true }).click();
   await expect(editor.getByRole('button', { name: 'Publish to app', exact: true })).toHaveCount(0);
   await editor.getByRole('button', { name: 'Complete edition', exact: true }).click();
   await expect(editor.getByLabel('Sky article reference date')).toBeFocused();
   const body = editor.getByRole('textbox', { name: /^(?:Article body|Full passage \/ body)$/u });
   await expect(body).toHaveValue(templateBody);
   await body.fill(templateBody + '\n\nFixture exact added paragraph.');
   await editor.getByRole('button', { name: 'Save template', exact: true }).click();
   await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.id === template.id)?.body).toBe(templateBody + '\n\nFixture exact added paragraph.');
   const savedTemplate = (await call({ method: 'rows' })).find((row: any) => row.id === template.id);
   expect(savedTemplate.status).toBe('DRAFT');
   const denied = await call({ method: 'PATCH', body: { id: template.id, expectedUpdatedAt: savedTemplate.updated_at, status: 'LIVE' } });
   expect(denied.status).toBe(409); expect(denied.payload.error).toContain('Complete edition');
   expect(writes.every(result => result.status === 200)).toBe(true); expect(errors).toEqual([]);
   await editor.screenshot({ path: `test-results/sky-placement-legacy-${width}-${theme}.png` });
  } finally { child.kill(); rmSync(directory, { recursive: true, force: true }); }
 });
}
