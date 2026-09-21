import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { calendarSeasonTransitionDetailRow, calendarSeasonTransitionPackageRecords } from '../../api/_lib/calendar-season-transition-sources';
import { calendarWritingStudioHref } from '../../apps/web/src/features/calendar/calendarWritingStudio';
import { isReaderServableGeneratedContentRow } from '../../apps/web/src/content/generatedContentEligibility';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

const key = 'authored/calendar-season-transition/virgo/libra/variant-4';
const passage = calendarSeasonTransitionPackageRecords.find(record => record.contentKey === key)!;
const fixtures = calendarSeasonTransitionPackageRecords.map((record, index) => ({
  ...calendarSeasonTransitionDetailRow(record), id: `season-fixture-${index}`, package_starter: false,
  updated_at: '2026-09-13T00:00:00.000Z', created_at: '2026-09-01T00:00:00.000Z', flags: []
}));
const headingStyle = (element: Element) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
};

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Find and edit a complete season transition at ${width} ${theme}`, async ({ page }) => {
    const directory = mkdtempSync(path.join(tmpdir(), 'calendar-seasons-'));
    const fixturePath = path.join(directory, 'rows.json');
    // The selected passage starts as a bundled source, just as an unedited season passage does.
    writeFileSync(fixturePath, JSON.stringify(fixtures.filter(row => row.content_key !== key)));
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
      await page.addInitScript(value => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', value);
      }, theme);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await routeStudioInventoryApi(page, {
        call,
        listRows: rows => rows.some(row => row.content_key === key) ? rows : [...rows, calendarSeasonTransitionDetailRow(passage)],
        answer: async (route, url) => {
          if (url.pathname !== '/api/admin/content-live-status') return false;
          await route.fulfill({ json: { ok: true, statuses: await call({ method: 'statuses', body: route.request().postDataJSON() }) } });
          return true;
        }
      });
      await page.goto('/admin/content#calendar-writeups?view=weekly-sky');
      await page.getByRole('button', { name: 'Browse season transitions', exact: true }).click();
      await expect(page).toHaveURL(/#calendar-writeups\?view=season-transitions$/);
      await expect(page.getByRole('tab', { name: 'Season transitions', exact: true })).toHaveAttribute('aria-selected', 'true');
      const selectedTab = await page.getByRole('tab', { name: 'Season transitions', exact: true }).boundingBox();
      const tabStrip = await page.getByRole('tablist', { name: 'Calendar Write-ups workspaces', exact: true }).boundingBox();
      expect(selectedTab!.x).toBeGreaterThanOrEqual(tabStrip!.x);
      expect(selectedTab!.x + selectedTab!.width).toBeLessThanOrEqual(tabStrip!.x + tabStrip!.width + 1);
      await expect(page.getByRole('region', { name: 'Calendar template preview', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Add leftover write-up', exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Moon sign', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Writing job', { exact: true })).toHaveCount(0);
      const workspace = page.getByRole('region', { name: 'Calendar season transitions', exact: true });
      const detail = page.getByRole('region', { name: 'Selected season transition', exact: true });
      const list = page.getByRole('complementary', { name: 'Season transition passages', exact: true });
      const pair = workspace.getByLabel('Season transition', { exact: true });
      const search = workspace.getByRole('textbox', { name: 'Search season transitions', exact: true });
      await pair.selectOption('virgo');
      await expect(list.getByRole('article')).toHaveCount(5);
      await search.fill('Ends');
      await expect(list.getByRole('article')).toHaveCount(1);
      await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Virgo to Libra · Ends');
      await search.fill('Libra Begins');
      await expect(list.getByRole('article')).toHaveCount(4);
      await workspace.getByLabel('Selected passage', { exact: true }).selectOption(key);
      await expect(detail).toContainText(passage.body);
      await expect(detail).toContainText("You don't have to lower the standard to stop being the only person who decides how it's met.");
      await expect(detail.getByRole('heading', { level: 2 })).toHaveText('Virgo to Libra · Begins · 3');
      await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Calendar Write-ups');
      await expect(page.getByRole('heading', { name: 'Calendar writing workspaces', exact: true })).toHaveClass('sr-only');
      expect(await detail.evaluate(element => Boolean(element.compareDocumentPosition(document.querySelector('[aria-label="Season transition passages"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      const baseline = await detail.getByRole('heading', { level: 2 }).evaluate(headingStyle);
      await workspace.getByRole('tab', { name: 'Composition & variables', exact: true }).click();
      expect(await page.getByRole('region', { name: 'Selected template composition' }).getByRole('heading', { level: 2 }).evaluate(headingStyle)).toEqual(baseline);
      await workspace.getByRole('tab', { name: 'Write-ups', exact: true }).click();
      await expect(page.locator('main.admin-dashboard')).toHaveAttribute('data-studio-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const dismissNotice = async () => {
        const notice = page.getByRole('button', { name: 'Dismiss notification', exact: true });
        if (await notice.count()) await notice.first().click();
      };
      await dismissNotice();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `test-results/calendar-seasons-${width}-${theme}.png`, fullPage: true });
      await list.getByRole('button', { name: 'Edit Virgo to Libra · Begins · 3', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor' });
      const field = editor.getByLabel('Season transition passage', { exact: true });
      await expect(field).toHaveValue(passage.body);
      await expect(field).toBeFocused();
      const revised = `${passage.body}\n\nQA isolated save preserves this entire passage.`;
      await field.fill(revised);
      await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
      await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.content_key === key)?.sections?.packageDraft?.body).toBe(revised);
      const savedDraft = (await call({ method: 'rows' })).find((row: any) => row.content_key === key);
      expect(savedDraft.status).toBe('DRAFT');
      expect(savedDraft.sections.packageRecord.calendarWritingSource.originalBody).toBe(passage.body);
      expect(isReaderServableGeneratedContentRow(savedDraft)).toBe(false);
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.reload();
      await expect(page.getByRole('tab', { name: 'Season transitions', exact: true })).toHaveAttribute('aria-selected', 'true');
      await search.fill('Virgo to Libra Begins 3');
      await workspace.getByLabel('Selected passage', { exact: true }).selectOption(key);
      await detail.getByRole('button', { name: 'Edit passage', exact: true }).click();
      await expect(field).toHaveValue(revised);
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.content_key === key)?.status).toBe('LIVE');
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await workspace.getByLabel('Publication', { exact: true }).selectOption('LIVE');
      await expect(list.getByRole('article')).toHaveCount(1);
      await expect(detail.locator('.admin-composition-preview-field p')).toHaveText(revised.split('\n\n'));
      const saved = await call({ method: 'rows' });
      expect(saved.find((row: any) => row.content_key === key)?.body).toBe(revised);
      expect(isReaderServableGeneratedContentRow(saved.find((row: any) => row.content_key === key))).toBe(true);
      expect(saved.filter((row: any) => row.content_key !== key)).toEqual(fixtures.filter(row => row.content_key !== key));
      await search.fill('no-matching-season-passage');
      await expect(workspace.getByText('No season transitions match these filters.')).toBeVisible();
      await expect(detail.getByRole('heading')).toHaveCount(0);
      await dismissNotice();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `test-results/calendar-seasons-empty-${width}-${theme}.png`, fullPage: true });
      await workspace.getByRole('button', { name: 'Reset filters', exact: true }).click();
      await expect(pair).toHaveValue('all');
      await expect(search).toHaveValue('');
      await expect(list).toContainText('60 passages');
      await expect(list.getByRole('article')).toHaveCount(12);
      await workspace.getByRole('button', { name: 'Show more passages', exact: true }).click();
      await expect(list.getByRole('article')).toHaveCount(24);
      await page.goto(`/admin/content${new URL(calendarWritingStudioHref(key)).hash}`);
      await expect(editor).toBeVisible();
      await expect(field).toHaveValue(revised);
      expect(errors).toEqual([]);
    } finally { child.kill(); rmSync(directory, { recursive: true, force: true }); }
  });
}
