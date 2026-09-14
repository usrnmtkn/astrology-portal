import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const key = 'authored/calendar-weekly-moon/libra/variant-2';
const source = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json', 'utf8'));
const records = source.authoredCards.filter((row: any) => row.contentKey.startsWith('authored/calendar-weekly-moon/'));
const passage = records.find((row: any) => row.contentKey === key);

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Find Moon in Libra and edit its complete passage at ${width} ${theme}`, async ({ page }) => {
    const directory = mkdtempSync(path.join(tmpdir(), 'calendar-editor-'));
    const fixturePath = path.join(directory, 'rows.json');
    writeFileSync(fixturePath, JSON.stringify(records.map((record: any, index: number) => ({
      id: `moon-fixture-${index}`, content_key: record.contentKey, surface: 'sky', mode: 'in_depth',
      status: 'LIVE', lane: 'serving', review_state: null, event_type: 'fallback-hook', block_type: 'fallback_hook',
      provider: 'tldrastro-fallback-architecture-v3', headline: 'Moon passage', summary: record.notes, body: record.body,
      sections: { packageRecord: record }, facts: { fallbackArchitectureV3: true, content_role: 'full_copy', review_status: 'approved_reuse' },
      source_snapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: 'full_copy', review_status: 'approved_reuse' },
      updated_at: '2026-09-13T00:00:00.000Z', created_at: '2026-09-01T00:00:00.000Z', flags: []
    }))));
    const child = fork(path.resolve('tests/helpers/calendar-review-api.mjs'), ['--ipc'], {
      env: { ...process.env, CALENDAR_REVIEW_FIXTURE: fixturePath }, execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });
    let sequence = 0;
    const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
    let stderr = '';
    child.stderr?.on('data', data => { stderr += data; });
    const ready = new Promise<void>((resolve, reject) => {
      child.on('message', (message: any) => {
        if (message.ready) return resolve();
        const task = pending.get(message.id);
        if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error)) : task.resolve(message.result); }
      });
      child.on('exit', code => { const error = new Error(`API fixture exited ${code}: ${stderr}`); reject(error); pending.forEach(task => task.reject(error)); });
    });
    const call = (message: any) => new Promise<any>((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); child.send({ ...message, id }); });
    try {
      await ready;
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(value => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', value); }, theme);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === '/api/admin/generated-content') {
          if (request.method() !== 'GET' || url.searchParams.has('id')) {
            const result = await call({ method: request.method(), body: request.method() === 'GET' ? undefined : request.postDataJSON(), url: `${url.pathname}${url.search}` });
            return route.fulfill({ status: result.status, json: result.payload });
          }
          // Match the production inventory: bodies hydrate only after selection.
          const rows = (await call({ method: 'rows' })).map((row: any) => ({ ...row, body: null, sections: null, inventory_only: true }));
          return route.fulfill({ json: { ok: true, rows, nextCursor: null } });
        }
        if (url.pathname === '/api/admin/content-live-status') return route.fulfill({ json: { ok: true, statuses: await call({ method: 'statuses', body: request.postDataJSON() }) } });
        return route.fulfill({ json: { ok: true, rows: [], records: [], nextCursor: null } });
      });
      await page.goto('/admin/content#fallback-hooks?section=lunar-calendar');
      await expect(page.locator('main.admin-dashboard')).toHaveAttribute('data-studio-theme', theme);
      await expect(page.getByLabel('Content family', { exact: true })).toHaveValue('Moon-sign passages');
      await page.getByLabel('Moon sign', { exact: true }).selectOption('libra');
      const search = page.getByRole('textbox', { name: 'Search Lunar Calendar' });
      await search.fill('Moon in Libra');
      const detail = page.getByRole('region', { name: 'Selected lunar passage' });
      await page.getByLabel('Selected passage', { exact: true }).selectOption(key);
      await expect(detail).toContainText(passage.body);
      await expect(detail).toContainText("You're allowed to stop being the only one who adjusts.");
      const list = page.getByRole('complementary', { name: 'Lunar passages' });
      expect(await detail.evaluate((element) => Boolean(element.compareDocumentPosition(document.querySelector('[aria-label="Lunar passages"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      const headingStyle = (element: Element) => {
        const style = getComputedStyle(element);
        return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
      };
      const baselineStyle = await detail.getByRole('heading', { level: 2 }).evaluate(headingStyle);
      await page.getByRole('tab', { name: 'Composition & variables' }).click();
      expect(await page.getByRole('region', { name: 'Selected template composition' }).getByRole('heading', { level: 2 }).evaluate(headingStyle)).toEqual(baselineStyle);
      await page.getByRole('tab', { name: 'Write-ups', exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('main.admin-dashboard')).toHaveAttribute('data-studio-theme', theme);
      await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Lunar Calendar write-ups');
      await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Moon in Libra · Variant 2');
      await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
      await page.screenshot({ path: `test-results/calendar-moon-${width}-${theme}.png`, fullPage: true });
      await list.getByRole('button', { name: 'Edit Moon in Libra · Variant 2', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      const field = editor.getByLabel('Full lunar passage', { exact: true });
      await expect(field).toHaveValue(passage.body);
      const revised = `${passage.body}\n\nQA isolated save preserves the whole passage.`;
      await field.fill(revised);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.content_key === key)?.sections?.packageDraft?.body).toBe(revised);
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await search.fill('Moon in Libra Variant 2');
      await detail.getByRole('button', { name: 'Edit passage', exact: true }).click();
      await expect(field).toHaveValue(revised);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.content_key === key)?.body).toBe(revised);
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await search.fill('no-matching-lunar-passage');
      await expect(page.getByText('No lunar passages match these filters.')).toBeVisible();
      await page.screenshot({ path: `test-results/calendar-moon-empty-${width}-${theme}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
      await expect(page.getByLabel('Moon sign', { exact: true })).toHaveValue('all');
      expect(await list.getByRole('article').count()).toBe(12);
      await page.getByRole('button', { name: 'Show more passages', exact: true }).click();
      expect(await list.getByRole('article').count()).toBe(24);
      expect(errors).toEqual([]);
    } finally { child.kill(); rmSync(directory, { recursive: true, force: true }); }
  });
}
