import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1167, height: 815 }, { width: 390, height: 844 }]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`protected reference graph ${viewport.width}px ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize(viewport); await page.emulateMedia({ colorScheme });
      await page.addInitScript(theme => localStorage.setItem('tldrastro:studio-theme', theme), colorScheme);
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto('/admin/content/memory');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Memory graph');
      await expect(page.getByRole('heading', { level: 2 })).toHaveText('Sign in to Content Studio');
      await expect(page.getByRole('textbox', { name: 'Search memories' })).toHaveCount(0);
      expect((await page.request.get('/api/admin/memory-graph?mode=visual')).status()).toBe(401);
      const visual = page.waitForResponse(r => r.url().includes('mode=visual') && r.status() === 200);
      await page.getByRole('textbox', { name: 'Emergency admin secret' }).fill('memory-browser-fixture');
      await page.getByRole('button', { name: 'Verify emergency access' }).click();
      const data = await (await visual).json();
      expect(data.documents.length).toBeGreaterThan(30);
      expect(data.connections.filter((edge: {basis:string}) => edge.basis === 'suggested').length).toBeGreaterThan(0);
      expect(data.connections.filter((edge: {basis:string}) => edge.basis === 'recorded').length).toBeGreaterThan(0);
      await expect(page.getByRole('button', { name: 'Fit', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Latest', exact: true })).toBeHidden();
      await expect(page.locator('.memory-reference-root canvas')).toBeVisible();
      await expect(page.locator('.memory-reference-root')).toHaveCSS('opacity', '1');
      await expect(page.locator('.memory-search-container')).toHaveCSS('opacity', '1');
      // Search and navigation use the shared Studio control scale, not the
      // retired floating graph typography and fixed pixel widths.
      const search = page.getByRole('textbox', { name: 'Search memories' });
      const metrics = await search.evaluate(el => {
        const s = getComputedStyle(el), root = getComputedStyle(el.closest('.admin-dashboard')!);
        return { size: s.fontSize, expectedSize: root.getPropertyValue('--text-body').trim(),
          height: el.getBoundingClientRect().height, minHeight: parseFloat(root.getPropertyValue('--studio-field-height')) };
      });
      expect(metrics.size).toBe(metrics.expectedSize);
      expect(metrics.height).toBeGreaterThanOrEqual(metrics.minHeight);
      const back = await page.locator('.memory-site-back').boundingBox();
      expect(back!.height).toBeGreaterThanOrEqual(40);
      const fit = await page.getByRole('button', { name:'Fit', exact:true }).boundingBox();
      expect(fit!.width).toBeGreaterThan(0); expect(fit!.height).toBeGreaterThanOrEqual(40);
      if (viewport.width > 600) {
        await expect(page.locator('#memory-reference-legend')).toContainText('IQ Cluster');
        await expect(page.locator('#memory-reference-legend')).toContainText('Shared terms');
        const count = data.documents.reduce((sum:number, doc:{memoryEntries:unknown[]}) => sum + doc.memoryEntries.length, 0) + data.connections.length;
        await expect(page.locator('#memory-reference-legend')).toContainText(`${count} connections`);
        await expect(page.locator('#memory-reference-legend')).toContainText('New this week');
        const legend = await page.locator('#memory-reference-legend').evaluate(el => ({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,header:el.querySelector('._1y3huhxc')!.getBoundingClientRect().height}));
        expect(legend.width).toBeGreaterThan(0); expect(legend.height).toBeLessThanOrEqual(viewport.height);
        await page.locator('#memory-reference-legend button').click();
        await expect(page.locator('#memory-reference-legend button')).toHaveAttribute('aria-expanded','false');
        await page.locator('#memory-reference-legend button').click();
      }
      if (viewport.width < 768) {
        const expand = page.getByRole('button', { name:'Expand legend', exact:true });
        await expect(expand).toBeVisible(); await expect(expand).toHaveText('Legend');
        const legend=page.locator('#memory-reference-legend');
        const collapsed=await legend.boundingBox(); const workspace=await page.locator('.memory-workspace').boundingBox(); expect(collapsed!.y).toBeGreaterThanOrEqual(workspace!.y);
        await expand.click();
        await expect(legend).toContainText('IQ Cluster');
        await expect(legend).toContainText('New this week');
        const expanded=await legend.boundingBox();
        expect(expanded!.x).toBeGreaterThanOrEqual(0);
        expect(expanded!.y+expanded!.height).toBeLessThanOrEqual(viewport.height);
        await page.getByRole('button', { name:'Collapse legend', exact:true }).click();
        await expect(expand).toBeVisible();
      }
      await page.screenshot({path:`test-results/memory-${viewport.width}-${colorScheme}.png`});

      await search.fill('ab');
      await expect(page.getByRole('complementary',{name:'Matching memories',exact:true})).toHaveCount(0);
      await search.fill('the catch');
      const matches=page.getByRole('complementary',{name:'Matching memories',exact:true});
      await expect(matches.getByRole('heading',{level:2})).toHaveText('Matching memories:');
      const chip=matches.getByRole('button',{name:'Do not use',exact:true}).first();
      await expect(chip).toBeVisible();
      await expect(chip).toHaveCSS('font-size', '14px');
      expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(40);
      await chip.click();
      const detail=page.getByRole('complementary',{name:'Memory detail',exact:true});
      await expect(detail.getByRole('heading',{level:2})).toHaveText('Do not use');
      await expect(page.locator('.memory-detail-content').first()).toContainText('the challenge');
      await expect(matches).toBeVisible();
      const popup=await detail.boundingBox();
      expect(popup!.x).toBeGreaterThanOrEqual(0);
      expect(popup!.y+popup!.height).toBeLessThanOrEqual(viewport.height);
      await page.screenshot({path:`test-results/memory-detail-${viewport.width}-${colorScheme}.png`});
      await page.getByText('Source and provenance',{exact:true}).click();
      await expect(page.locator('.memory-provenance')).toContainText('BANNED_PATTERNS.md');
      await expect(page.locator('.memory-provenance > code')).toHaveText(/^[a-f0-9]{64}$/);
      await page.keyboard.press('Escape'); await expect(detail).toHaveCount(0);
      await page.getByRole('button',{name:'Clear search',exact:true}).click();
      await page.getByTitle('Zoom in',{exact:true}).click(); await page.getByRole('button',{name:'Fit',exact:true}).click();
      await search.fill('noresultuniquememory');
      await expect(page.getByRole('status')).toHaveText('0 matching memories');
      await expect(matches).toHaveCount(0);
      await page.getByRole('button',{name:'Clear search',exact:true}).click();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

test('owner access leads to a configured sign-in screen and preserves the memory return route', async ({ page }) => {
  await page.goto('/admin/content/memory');
  await page.getByRole('link', { name: 'Sign in as owner', exact: true }).click();
  await expect(page).toHaveURL(/auth=login&returnTo=%2Fadmin%2Fcontent%2Fmemory/);
  await expect(page.getByRole('region', { name: 'Log in', exact: true })).toBeVisible();
  await expect(page.getByText('Add VITE_SUPABASE_URL and a Supabase publishable key to enable live sign-on.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with Google', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Email', { exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: 'Password Show password', exact: true })).toBeEnabled();
});


test('a rejected key shows an inline error and a corrected key immediately opens the graph', async ({ page }) => {
  await page.goto('/admin/content/memory');
  await page.getByRole('textbox', {name:'Emergency admin secret'}).fill('incorrect-key');
  await page.getByRole('button', {name:'Verify emergency access'}).click();
  const error=page.getByRole('alert');
  await expect(error).toContainText('The emergency key was not accepted');
  const heading=await page.getByRole('heading',{level:1}).boundingBox();
  const message=await error.boundingBox();
  expect(message!.y+message!.height).toBeLessThanOrEqual(heading!.y);
  await page.getByRole('textbox', {name:'Emergency admin secret'}).fill('memory-browser-fixture');
  await page.getByRole('button', {name:'Verify emergency access'}).click();
  await expect(page.getByRole('button',{name:'Fit',exact:true})).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button',{name:'Fit',exact:true})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Emergency admin secret'})).toHaveCount(0);
});

test('Content Studio Operations opens the graph using the existing admin credential', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'memory-browser-fixture'));
  await page.goto('/admin/content');
  const operations = page.locator('details').filter({has:page.locator('summary', {hasText:'Operations'})});
  if (!await operations.evaluate(element => (element as HTMLDetailsElement).open)) await operations.locator('summary').click();
  await operations.getByRole('button',{name:'Memory graph',exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/content\/memory$/);
  await expect(page.getByRole('button',{name:'Fit',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Back to Content Studio',exact:true})).toHaveAttribute('href','/admin/content');
});


test('related memories explain suggestions and open the exact connected passage', async ({page}) => {
  await page.goto('/admin/content/memory');
  const response=page.waitForResponse(r=>r.url().includes('mode=visual')&&r.status()===200);
  await page.getByRole('textbox',{name:'Emergency admin secret'}).fill('memory-browser-fixture');
  await page.getByRole('button',{name:'Verify emergency access'}).click();
  const graph=await (await response).json();
  const edge=graph.connections.find((edge:{basis:string})=>edge.basis==='suggested');
  const entry=graph.documents.flatMap((doc:{memoryEntries:unknown[]})=>doc.memoryEntries).find((entry:{id:string})=>entry.id===edge.source);
  const target=graph.documents.flatMap((doc:{memoryEntries:unknown[]})=>doc.memoryEntries).find((entry:{id:string})=>entry.id===edge.target);
  await page.getByRole('textbox',{name:'Search memories'}).fill(entry.title);
  await page.getByRole('complementary',{name:'Matching memories',exact:true}).getByRole('button',{name:entry.title.replaceAll('_',' '),exact:true}).first().click();
  const detail=page.getByRole('complementary',{name:'Memory detail',exact:true});
  await detail.locator('.memory-connections summary').click();
  await expect(detail.locator('.memory-connections')).toContainText('Suggested · shared terms:');
  for (const term of edge.terms) await expect(detail.locator('.memory-connections')).toContainText(term);
  await detail.locator('.memory-connections').getByRole('button',{name:target.title.replaceAll('_',' '),exact:true}).click();
  await expect(detail.locator('.memory-detail-content').first()).toHaveText(target.content, {useInnerText:false});
});
