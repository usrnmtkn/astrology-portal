import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) test(`Create, edit, tag, preview and delete custom variables at ${width} ${theme}`, async ({ page }) => {
  const child = fork(path.resolve('tests/helpers/sky-article-save-api.mts'), [], { env: { ...process.env, SKY_SAVE_LEGACY_DRAFT: '', ZODIAC_TEMPLATE_FIXTURE: '' }, execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const pending = new Map<number, (value: any) => void>(); let sequence = 0;
  const ready = new Promise<void>((resolve, reject) => { child.on('message', (message: any) => { if (message.ready) resolve(); else { pending.get(message.id)?.(message.result); pending.delete(message.id); } }); child.once('error', reject); });
  const call = (message: any) => new Promise<any>(resolve => { const id = ++sequence; pending.set(id, resolve); child.send({ ...message, id }); });
  try {
    await ready;
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
    await routeStudioInventoryApi(page, {
      call,
      listRows: rows => rows.filter((row: any) => row.event_type !== 'studio-variable')
    });
    const entry = process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/';
    await page.goto(entry + '#variables');
    const library = page.getByRole('region', { name: 'Variable directory', exact: true });
    await expect(library.getByRole('heading', { name: 'Create your first variable' })).toBeVisible();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('menuitem', { name: /Create variable/ }).click();
    const form = page.getByRole('form', { name: 'Create variable', exact: true });
    await form.getByLabel('Name', { exact: true }).fill('My opening');
    await form.getByLabel('Token name', { exact: true }).fill('myOpening');
    await form.getByLabel('Description', { exact: true }).fill('My reusable opening phrase.');
    await form.getByLabel('Tags', { exact: true }).fill('Sky, My voice');
    await form.getByLabel('Shared value', { exact: true }).fill('Fixture shared opening.');
    await form.getByRole('button', { name: 'Add override', exact: true }).click();
    await form.getByLabel('Planet', { exact: true }).selectOption('sun');
    await form.getByLabel('Sign', { exact: true }).selectOption('virgo');
    await form.getByLabel('Override value', { exact: true }).fill('Fixture Sun in Virgo opening.');
    await form.getByText('Preview a value', { exact: true }).click();
    await form.getByLabel('Preview planet').selectOption('sun');
    await form.getByLabel('Preview sign').selectOption('virgo');
    await expect(form.locator('.studio-variable-value')).toHaveText('Fixture Sun in Virgo opening.');
    const titleStyles = await page.locator('h1, form[aria-label="Create variable"] h2').evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.textTransform, style.textAlign];
    }));
    expect(titleStyles).toHaveLength(2);
    expect(titleStyles[0]).toEqual(titleStyles[1]);
    await expect(form.getByRole('heading')).toHaveText(['Create variable', 'Overrides']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/custom-variable-form-${width}-${theme}.png`, fullPage: true });
    await form.getByRole('button', { name: 'Save variable', exact: true }).click();
    let card = library.getByRole('article', { name: 'My opening', exact: true });
    await expect(card).toBeVisible();
    await expect(card.locator('code')).toHaveText('{{myOpening}}');
    await library.getByLabel('Tag', { exact: true }).selectOption('My voice');
    await library.getByLabel('Search variables', { exact: true }).fill('opening');
    await expect(card).toBeVisible();
    await page.reload();
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Edit', exact: true }).click();
    const edit = page.getByRole('form', { name: 'Edit My opening', exact: true });
    await expect(edit.getByLabel('Shared value', { exact: true })).toHaveValue('Fixture shared opening.');
    await edit.getByLabel('Name', { exact: true }).fill('My revised opening');
    await edit.getByLabel('Tags', { exact: true }).fill('Personal tag');
    await edit.getByRole('button', { name: 'Save variable', exact: true }).click();
    card = library.getByRole('article', { name: 'My revised opening', exact: true });
    await expect(card.getByRole('list', { name: 'Tags' })).toHaveText('Personal tag');
    await library.getByLabel('Tag', { exact: true }).selectOption('Personal tag');
    await page.screenshot({ path: `test-results/custom-variable-saved-${width}-${theme}.png`, fullPage: true });
    if (width === 1440 && theme === 'light') {
      await page.goto(entry + '#sky-writeups');
      await page.getByLabel('Sky placement planet or point').selectOption('sun');
      await page.getByLabel('Sky placement zodiac sign').selectOption('virgo');
      await page.getByRole('region', { name: 'Sky placement composition map' }).getByRole('button', { name: 'Edit placement article', exact: true }).click();
      const editor = page.getByRole('dialog');
      const writing = editor.locator('textarea[data-sky-field="placementArticle"]');
      await writing.fill('During this transit, TARGET Fixture ending.');
      await writing.evaluate((node: HTMLTextAreaElement) => { node.focus(); node.setSelectionRange(21, 27); });
      await editor.locator('.admin-editor-toolbar-actions').getByRole('button', { name: 'Variables', exact: true }).click();
      const picker = editor.locator('[data-sky-article-variable-picker]');
      await picker.getByText('My variables', { exact: true }).click();
      await picker.getByLabel('Variable', { exact: true }).selectOption('myOpening');
      await picker.getByRole('button', { name: 'Insert variable', exact: true }).click();
      const template = 'During this transit, {{myOpening}} Fixture ending.';
      await expect(writing).toHaveValue(template);
      await expect(editor.locator('.admin-sky-writing-preview')).toHaveText('During this transit, Fixture Sun in Virgo opening. Fixture ending.');
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await call({ method: 'rows' })).find((row: any) => row.id === 'live-sun-virgo')?.sections.packageRecord.placementArticle).toBe(template);
      await expect(editor.getByRole('alert')).toHaveCount(0);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await page.goto(entry + '#variables');
      await expect(card).toBeVisible();
    }
    await card.getByRole('button', { name: 'Delete variable', exact: true }).click();
    await expect(card.getByText(/Existing publications keep their approved values/)).toBeVisible();
    await card.getByRole('button', { name: 'Confirm delete', exact: true }).click();
    await expect(card).toHaveCount(0);
    await page.reload();
    await expect(library.getByRole('heading', { name: 'Create your first variable' })).toBeVisible();
    for (const kind of ['readonly', 'editable']) {
      await library.getByLabel('Library', { exact: true }).selectOption(kind);
      for (const token of ['articleBody', 'articleHeadline', 'allWord', 'aRef']) {
        await library.getByLabel('Search variables', { exact: true }).fill(token);
        await expect(library.getByRole('article')).toHaveCount(0);
      }
    }
    expect(errors).toEqual([]);
  } finally { child.kill(); }
});
