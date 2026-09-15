import { test, expect } from '@playwright/test';
import { fork } from 'node:child_process';
import path from 'node:path';

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
 test(`Variables directory search, filters, source editing and return at ${width} ${theme}`, async ({ page, context }) => {
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
   const errors: string[] = [], responses: any[] = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.setViewportSize({ width, height: 1000 });
   await page.addInitScript(theme => { localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'); localStorage.setItem('tldrastro:studio-theme', theme); }, theme);
   await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname === '/api/admin/generated-content') {
     if (request.method() !== 'GET' || url.searchParams.has('id') || url.searchParams.has('contentKeys') || url.searchParams.has('variables')) {
      const result = await call({ method: request.method(), body: request.method() === 'GET' ? undefined : request.postDataJSON(), url: url.pathname + url.search });
      if (request.method() !== 'GET') responses.push(result);
      return route.fulfill({ status: result.status, json: result.payload });
     }
     const rows = (await call({ method: 'rows' })).map((row: any) => ({ ...row, body: null, sections: null, inventory_only: true }));
     return route.fulfill({ json: { ok: true, rows, nextCursor: null } });
    }
    return route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
   });
   await context.grantPermissions(['clipboard-read', 'clipboard-write']);
   const entry = process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/';
   await page.goto(entry + '#variables');
   const directory = page.getByRole('region', {name: 'Variable directory', exact: true});
   await expect(page.getByRole('heading', {name: 'Variables', exact: true})).toBeVisible();
   await directory.getByLabel('Library', {exact: true}).selectOption('readonly');
   await expect(directory.locator('.studio-variable-card').first()).toBeVisible();
   const notice = page.getByRole('button', {name: 'Dismiss notification', exact: true});
   if (await notice.isVisible()) await notice.click();
   const typography = () => page.locator('h1').evaluate(el => { const s = getComputedStyle(el); return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform,s.textAlign]; });
   const headingStyle = await typography();
   const initialStyle = await directory.locator('.studio-variable-card').evaluateAll(cards => {
    const rects = cards.slice(0, 2).map(card => card.getBoundingClientRect());
    const tokens = cards.map(card => card.querySelector('h2 code')!);
    return {
     gap: rects[1].top - rects[0].bottom,
     inset: parseFloat(getComputedStyle(cards[0]).paddingLeft),
     colors: tokens.map(token => ({name: token.textContent, id: token.getAttribute('data-variable-color'), ink: getComputedStyle(token).color, surface: getComputedStyle(token).backgroundColor})),
    };
   });
   expect(initialStyle.gap).toBe(24);
   expect(initialStyle.inset).toBe(width < 720 ? 16 : 24);
   expect(new Set(initialStyle.colors.map(token => token.id)).size).toBeGreaterThan(1);
   const luminance = (rgb: string) => rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(c => c / 255).reduce((sum, c, i) => sum + (c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][i], 0);
   for (const token of initialStyle.colors) {
    expect(token.id).toMatch(/^[1-6]$/);
    const levels = [luminance(token.ink), luminance(token.surface)].sort((a,b) => a-b);
    expect((levels[1] + .05) / (levels[0] + .05)).toBeGreaterThanOrEqual(4.5);
   }
   await directory.getByLabel('Search variables', {exact: true}).fill('angle');
   const angleToken = directory.locator('code[data-variable-name="angleTitle"]');
   expect(await angleToken.getAttribute('data-variable-color')).toBe(initialStyle.colors.find(token => token.name === '{{angleTitle}}')?.id);
   await page.screenshot({path: `test-results/variables-directory-${width}-${theme}.png`, fullPage: true});
   await directory.getByLabel('Search variables', {exact: true}).fill('entryDate');
   await directory.getByLabel('Library', {exact: true}).selectOption('readonly');
   await directory.getByLabel('Available in', {exact: true}).selectOption('Sky');
   const entryCard = directory.getByRole('article', {name: '{{entryDate}} · Calculated residency dates; not the retrograde window', exact: true});
   await expect(entryCard).toBeVisible();
   await expect(entryCard.getByRole('button', {name: 'Edit source', exact: true})).toHaveCount(0);
   await entryCard.getByRole('button', {name: 'Copy {{entryDate}}', exact: true}).click();
   expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('{{entryDate}}');
   await entryCard.locator('summary').click();
   await expect(entryCard.getByText(/Use this token only in the listed/)).toBeVisible();
   await directory.getByLabel('Library', {exact: true}).selectOption('editable');
   await expect(directory.getByRole('heading', {name: 'No matching variables'})).toBeVisible();
   await page.screenshot({path: `test-results/variables-empty-${width}-${theme}.png`, fullPage: true});
   await directory.getByRole('button', {name: 'Show all variables', exact: true}).click();
   await directory.getByLabel('Search variables', {exact: true}).fill('zodiacSeasonPolarAxis');
   await directory.getByLabel('Library', {exact: true}).selectOption('editable');
   await directory.getByLabel('Available in', {exact: true}).selectOption('Natal');
   await expect(directory.getByRole('article')).toHaveCount(1);
   const variable = directory.getByRole('article');
   await expect(variable.getByRole('heading', {name: '{{zodiacSeasonPolarAxis}}', exact: true})).toBeVisible();
   await expect(variable.getByRole('button', {name: 'Edit source', exact: true})).toBeDisabled();
   await variable.getByLabel('Source for {{zodiacSeasonPolarAxis}}', {exact: true}).selectOption('fallback-hook/zodiac-season-polar-axis/virgo#body');
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
   await page.screenshot({path: `test-results/variables-populated-${width}-${theme}.png`, fullPage: true});
   await variable.getByRole('button', {name: 'Edit source', exact: true}).click();
   const editor = page.getByRole('dialog');
   const writing = editor.locator('textarea[data-sky-field="body"]');
   await expect(writing).not.toHaveValue('');
   await writing.fill('Fixture full Virgo axis prose from the Variables directory.');
   await editor.getByRole('button', {name: 'Save draft', exact: true}).click();
   await expect.poll(async () => (await call({method:'rows'})).some((row:any) => row.content_key === 'fallback-hook/zodiac-season-polar-axis/virgo' && JSON.stringify(row).includes('Fixture full Virgo axis prose from the Variables directory.'))).toBe(true);
   await editor.getByRole('button', {name: /Close/}).first().click();
   await expect(directory.getByLabel('Search variables', {exact: true})).toHaveValue('zodiacSeasonPolarAxis');
   await expect(directory.getByLabel('Available in', {exact: true})).toHaveValue('Natal');
   await variable.getByRole('button', {name: 'Edit source', exact: true}).click();
   await expect(writing).toHaveValue('Fixture full Virgo axis prose from the Variables directory.');
   await editor.getByRole('button', {name: /Close/}).first().click();
   await directory.getByLabel('Search variables', {exact: true}).fill('planetFunction');
   await directory.getByLabel('Available in', {exact: true}).selectOption('Sky');
   const planetVariable = directory.getByRole('article', {name: '{{planetFunction}} · Writing Library · Planet', exact: true});
   await planetVariable.getByLabel('Source for {{planetFunction}}', {exact: true}).selectOption('sky-placement/article/sun/virgo#ingress.sources.planetFunction');
   await planetVariable.getByRole('button', {name: 'Edit source', exact: true}).click();
   await expect(editor.getByRole('region', {name: 'Edit Planet function', exact: true}).or(editor.getByText(/To edit.*planetFunction/u))).toBeVisible();
   page.once('dialog', dialog => dialog.accept());
   await editor.getByRole('button', {name: /Close/}).first().click();
   await page.goto(entry + '#templates');
   await expect(page.getByRole('heading', {name: 'Templates', exact: true})).toBeVisible();
   expect(await typography()).toEqual(headingStyle);
   expect(errors).toEqual([]);
  } finally { child.kill(); }
 });
}

test('Variables loads only when opened and offers recovery after a catalog failure', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 1000});
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
  await page.route('**/api/**', route => route.fulfill({json: {ok:true, variables:[], rows:[], statuses:[], records:[], nextCursor:null}}));
  let requests = 0;
  await page.route('**/generated/studio-variables-v1.json', async route => {
    requests++;
    if (requests === 1) return route.fulfill({status:503, body:'Temporarily unavailable'});
    return route.continue();
  });
  await page.goto((process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/') + '#templates');
  await expect(page.getByRole('heading', {name:'Templates', exact:true})).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole('button', {name:'Variables', exact:true}).click();
  const directory = page.getByRole('region', {name:'Variable directory', exact:true});
  await directory.getByLabel('Library', {exact: true}).selectOption('readonly');
  await expect(directory.getByRole('alert')).toContainText('The variable catalog could not load.');
  await directory.getByRole('button', {name:'Retry catalog', exact:true}).click();
  await expect(directory.getByRole('article').first()).toBeVisible();
  expect(requests).toBe(2);
});
