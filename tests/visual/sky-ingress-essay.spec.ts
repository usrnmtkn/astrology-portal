import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { skyIngressEssayFields } from '../../apps/web/src/content/skyIngressEssay.mjs';

for (const [width, theme] of [[390, 'light'], [1440, 'dark']] as const) {
 test(`Ingress essay draft saves, reopens and compiles without a horoscope companion at ${width} ${theme}`, async ({ page }) => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'ingress-browser-'));
  const fixture = path.join(temporary, 'rows.json');
  writeFileSync(fixture, JSON.stringify([{ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', content_key: 'sky/article-template/sun/libra',
    surface: 'sky', mode: 'article', status: 'REVIEWED', lane: 'reference', review_state: null, event_type: 'sky-article-template',
    block_type: 'sky_article', headline: 'Sun in Libra', summary: '', body: '# Immutable synthetic owner article\n\n{{entryDate}}',
    sections: {}, source_snapshot: { review_status: 'approved', contentType: 'sky-article-template' }, updated_at: '2026-10-09T00:00:00Z' }]));
  const child = fork(path.resolve('tests/helpers/sky-article-save-api.mts'), [], { env: { ...process.env, SKY_SAVE_FIXTURE: fixture }, execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
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
   await routeStudioInventoryApi(page, { call, answer: async (route, url) => {
    if (url.pathname !== '/api/admin/sky-article-facts') return false;
    expect(url.searchParams.get('format')).toBe('ingress-essay-v2');
    await route.fulfill({ json: { ok: true, facts: { schema: 'tldrastro-sky-article-engine-facts-v1', articleFormat: 'ingress-essay-v2',
      templateFields: skyIngressEssayFields,
      calculationSource: 'synthetic browser fixture', generatedAt: '2026-10-09T12:00:00Z', referenceTimeZone: 'America/New_York',
      planet: 'sun', sign: 'libra', entryYear: 2026, validFrom: '2026-09-22', validTo: '2026-10-23',
      transitStartInstant: '2026-09-23T00:05:14Z', transitEndInstant: '2026-10-23T09:37:57Z',
      slotValues: { articleTitle: 'Libra Season 2026', when: 'September 22, 2026 at 8:05 PM ET to October 23, 2026 at 5:37 AM ET' } } } });
    return true;
   } });
   const entry = process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/';
   await page.goto(`${entry}#sky-writeups?q=sky%2Farticle-template%2Fsun%2Flibra`);
   await expect(page.getByLabel('Search Sky write-ups')).toHaveValue('sky/article-template/sun/libra');
   await page.getByRole('row').filter({ hasText: 'sky/article-template/sun/libra' }).getByRole('button', { name: 'Edit', exact: true }).click();
   const editor = page.getByRole('dialog');
   await expect(editor.getByLabel('Sky article format')).toHaveValue('ingress-essay-v2');
   await editor.getByRole('button', { name: 'Load calculated facts', exact: true }).click();
   await expect(editor.getByLabel('Template field when', { exact: true })).toHaveValue(/8:05 PM ET/);
   await expect(editor.getByText(skyIngressEssayFields.find(field => field.name === 'overviewBody')!.description, { exact: true })).toBeVisible();
   for (const field of ['what', 'takeaway', 'overviewHeading', 'overviewBody', 'majorTransitSections', 'closingHeading', 'closingBody']) {
    await editor.getByLabel(`Template field ${field}`, { exact: true }).fill(`Synthetic ${field} opening.\n\nSynthetic ${field} final sentence.`);
   }
   await editor.getByLabel('Sky article edition TL;DR').fill('Synthetic explicit summary.');
   await expect(editor.getByText('Draft saved automatically', { exact: true })).toBeVisible();
   await page.reload();
   await page.getByRole('row').filter({ hasText: 'sky/article-template/sun/libra' }).getByRole('button', { name: 'Edit', exact: true }).click();
   await editor.getByRole('button', { name: 'Load calculated facts', exact: true }).click();
   await expect(editor.getByLabel('Template field closingBody', { exact: true })).toHaveValue('Synthetic closingBody opening.\n\nSynthetic closingBody final sentence.');
   await expect(editor.getByRole('button', { name: 'Compile edition draft', exact: true })).toBeEnabled();
   await editor.getByRole('button', { name: 'Compile edition draft', exact: true }).click();
   await expect.poll(async () => (await call({ method: 'rows' })).some((row: any) => row.event_type === 'sky-article-edition')).toBe(true);
   const rows = await call({ method: 'rows' });
   const edition = rows.find((row: any) => row.event_type === 'sky-article-edition');
   expect(edition.status).toBe('DRAFT');
   expect(edition.sections.skyArticleEdition.housePassages).toEqual([]);
   expect(edition.body).toContain('Synthetic closingBody final sentence.');
   expect(rows.find((row: any) => row.content_key === 'sky/article-template/sun/libra').body).toBe('# Immutable synthetic owner article\n\n{{entryDate}}');
   const compiled = editor.getByRole('region', { name: 'Compiled Sky article edition', exact: true });
   await expect(compiled).toBeVisible();
   await expect(compiled.getByText('House passages', { exact: true })).toHaveCount(0);
   await expect(compiled.getByText('House horoscopes', { exact: true })).toHaveCount(0);
   await expect(compiled).not.toContainText('twelve house horoscopes');
   expect(errors).toEqual([]);
   await editor.screenshot({ path: `test-results/sky-ingress-essay-${width}-${theme}.png` });
  } finally { child.kill(); rmSync(temporary, { recursive: true, force: true }); }
 });
}
