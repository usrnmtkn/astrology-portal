import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

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
      await routeStudioInventoryApi(page, {
        call,
        answer: async (route, url) => {
          if (url.pathname !== '/api/admin/content-live-status') return false;
          await route.fulfill({ json: { ok: true, statuses: await call({ method: 'statuses', body: route.request().postDataJSON() }) } });
          return true;
        }
      });
      await page.goto('/admin/content#fallback-hooks?section=lunar-calendar');
      await expect(page.locator('main.admin-dashboard')).toHaveAttribute('data-studio-theme', theme);
      await expect(page.getByLabel('Writing job', { exact: true })).toHaveValue('Day and Week Moon story');
      await expect(page.getByLabel('Content family', { exact: true })).toHaveValue('Moon-sign leftover');
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
      await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Calendar Write-ups');
      await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Moon in Libra · Leftover 2');
      // A notification is not guaranteed here, and one left open would sit over the screenshot.
      const notice = page.getByRole('button', { name: 'Dismiss notification', exact: true });
      if (await notice.count()) await notice.first().click();
      await page.screenshot({ path: `test-results/calendar-moon-${width}-${theme}.png`, fullPage: true });
      await list.getByRole('button', { name: 'Edit Moon in Libra · Leftover 2', exact: true }).click();
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
      await search.fill('Moon in Libra Leftover 2');
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
      const beforeCreate = await call({ method: 'rows' });
      await page.getByRole('button', { name: 'Add leftover write-up', exact: true }).click();
      const add = page.getByRole('region', { name: 'Add leftover write-up', exact: true });
      const newSign = add.getByLabel('Moon sign for the new write-up', { exact: true });
      await expect(newSign).toHaveValue('');
      await expect(add.getByRole('button', { name: 'Start draft', exact: true })).toBeDisabled();
      await newSign.selectOption('gemini');
      await expect(add).toContainText('All available alternatives already exist');
      await expect(add.getByRole('button', { name: 'Start draft', exact: true })).toBeDisabled();
      await newSign.selectOption('libra');
      await expect(add).toContainText('2 saved write-ups');
      expect(await add.getByRole('heading', { level: 2 }).evaluate(headingStyle)).toEqual(baselineStyle);
      await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
      await add.screenshot({ path: `test-results/calendar-add-${width}-${theme}.png` });
      await add.getByRole('button', { name: 'Start draft', exact: true }).click();
      await expect(editor.getByRole('heading', { level: 2 })).toHaveText('New leftover write-up · Moon in Libra · Leftover 3');
      await expect(field).toHaveValue('');
      expect(await call({ method: 'rows' })).toEqual(beforeCreate);
      await field.fill('Synthetic Calendar draft for isolated creation verification.');
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.content_key === 'authored/calendar-weekly-moon/libra/variant-3')?.status).toBe('DRAFT');
      expect((await call({ method: 'rows' })).find((row: any) => row.content_key === key)?.body).toBe(revised);
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(page.getByLabel('Selected passage', { exact: true })).toHaveValue('authored/calendar-weekly-moon/libra/variant-3');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await page.getByRole('menuitem', { name: /Create leftover write-up/ }).click();
      await expect(add).toBeVisible();
      await expect(newSign).toHaveValue('');
      await expect(editor).toHaveCount(0);
      await newSign.selectOption('libra');
      await add.getByRole('button', { name: 'View saved write-ups', exact: true }).click();
      await expect(page.getByLabel('Moon sign', { exact: true })).toHaveValue('libra');
      await expect(list.getByRole('article')).toHaveCount(3);
      expect(errors).toEqual([]);
    } finally { child.kill(); rmSync(directory, { recursive: true, force: true }); }
  });
}
