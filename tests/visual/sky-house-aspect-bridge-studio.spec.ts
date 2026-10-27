import { test, expect } from '@playwright/test';
import { studioApiStore } from '../helpers/studio-api-store';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';
import { skyPlacementAspectBridgeKey } from '../../apps/web/src/content/skyPlacementAspectBridge';

for (const [width, theme] of [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']] as const) {
  test(`House × aspect bridge draft saves and reopens ${width} ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    const store = await studioApiStore([]);
    let releaseLookup: (() => void) | undefined;
    try {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => {
        localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, theme);
      await routeStudioInventoryApi(page, { call: store.call, actualDocumentRoute: true, answer: async (route, url) => {
        if (url.pathname !== '/api/admin/content-live-status') return false;
        const result = await store.call({ method: route.request().method(), url: url.pathname, body: route.request().postDataJSON() });
        await route.fulfill({ status: result.status, json: result.payload }); return true;
      } });
      const entry = process.env.STUDIO_PRODUCTION_ENTRY === '1' ? '/admin/content' : '/';
      const openNavigation = async () => {
        if (width !== 390) return;
        const toggle = page.getByRole('button', { name: /^(?:Open|Hide) Content Studio navigation$/ });
        await expect(toggle).toBeVisible();
        if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
      };
      await page.goto(`${entry}#sky-writeups?view=daily-summary`);
      await openNavigation();
      await page.getByLabel('Sky Write-ups sections').getByRole('button', { name: 'House × aspect bridges', exact: true }).click();
      const region = page.getByRole('region', { name: 'House × aspect bridges', exact: true });
      await expect(region).toBeVisible();
      const heading = region.getByRole('heading', { level: 2, name: 'House × aspect bridges', exact: true });
      await expect(heading).toBeVisible();
      await expect(page.locator('.admin-main h1, .admin-main h2')).toHaveText(['Sky Write-ups', 'Sky writing workspaces', 'House × aspect bridges']);
      const typeStyle = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as any]]));
      };
      const headingStyle = await heading.evaluate(typeStyle);
      await openNavigation();
      await page.getByRole('button', { name: 'Connection Transits', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Connection Activations', level: 2, exact: true })).toBeVisible();
      expect(headingStyle).toEqual(await page.getByRole('heading', { name: 'Connection Activations', level: 2, exact: true }).evaluate(typeStyle));
      await openNavigation();
      await page.getByRole('button', { name: 'Sky Write-ups', exact: true }).click();
      await openNavigation();
      await page.getByLabel('Sky Write-ups sections').getByRole('button', { name: 'House × aspect bridges', exact: true }).click();
      await expect(region.getByRole('combobox', { name: 'House', exact: true })).toHaveValue('8');
      await expect(region.getByRole('combobox', { name: 'Transiting planet', exact: true })).toHaveValue('venus');
      await expect(region.getByRole('combobox', { name: 'Aspect', exact: true })).toHaveValue('trine');
      await expect(region.getByRole('combobox', { name: 'Natal point', exact: true })).toHaveValue('mars');
      await region.getByRole('button', { name: 'Open bridge', exact: true }).click();
      const editor = page.getByRole('dialog');
      const field = editor.locator('textarea[data-sky-field="body"]');
      await expect(field).toHaveValue('');
      expect(await store.call({ method: 'rows' })).toEqual([]);
      const body = 'Synthetic house bridge opening.\n\nSynthetic bridge final sentence.';
      await field.fill(body);
      await editor.getByRole('button', { name: /^Save(?: draft)?$/, exact: true }).click();
      const key = skyPlacementAspectBridgeKey({ house: 8, transiting: 'venus', aspect: 'trine', natal: 'mars' });
      await expect.poll(async () => (await store.call({ method: 'rows' })).length).toBe(1);
      const rows = await store.call({ method: 'rows' });
      expect(rows[0].status).toBe('DRAFT');
      expect(rows[0].content_key).toBe(key);
      expect(rows[0].sections.packageDraft?.body ?? rows[0].sections.packageRecord.body).toBe(body);
      await page.reload();
      await region.getByRole('button', { name: 'Open bridge', exact: true }).click();
      await expect(field).toHaveValue(body);
      await expect(editor.getByLabel('Reader status', { exact: true })).toHaveText('Draft');
      await expect(editor).toContainText('Transit aspect · natal contact');
      await editor.getByRole('button', { name: 'Save & publish', exact: true }).click();
      await expect.poll(async () => (await store.call({ method: 'rows' }))[0].status).toBe('LIVE');
      await page.reload();
      await region.getByRole('button', { name: 'Open bridge', exact: true }).click();
      await expect(field).toHaveValue(body);
      await expect(editor.getByLabel('Reader status', { exact: true })).toHaveText('Live');
      await editor.screenshot({ path: `test-results/house-aspect-bridge-studio-${width}-${theme}.png` });
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await region.getByRole('combobox', { name: 'House', exact: true }).selectOption('7');
      await region.getByRole('button', { name: 'Open bridge', exact: true }).click();
      await expect(field).toHaveValue('');
      expect((await store.call({ method: 'rows' })).length).toBe(1);
      await editor.getByRole('button', { name: 'Close', exact: true }).click();
      await region.getByRole('combobox', { name: 'House', exact: true }).selectOption('6');
      const pendingKey = skyPlacementAspectBridgeKey({ house: 6, transiting: 'venus', aspect: 'trine', natal: 'mars' });
      let requested!: () => void;
      const held = new Promise<void>(resolve => { releaseLookup = resolve; });
      const started = new Promise<void>(resolve => { requested = resolve; });
      await page.route(url => url.pathname === '/api/admin/generated-content-inventory' && url.searchParams.get('contentKey') === pendingKey, async route => {
        requested();
        await held;
        const url = new URL(route.request().url());
        const result = await store.call({ method: 'GET', url: url.pathname + url.search });
        await route.fulfill({ status: result.status, json: result.payload });
      });
      await region.getByRole('button', { name: 'Open bridge', exact: true }).click();
      await started;
      await openNavigation();
      await page.getByLabel('Sky Write-ups sections').getByRole('button', { name: 'Daily Sky Summary', exact: true }).click();
      const settled = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === '/api/admin/package-source' && url.searchParams.get('contentKey') === pendingKey;
      });
      releaseLookup!();
      await (await settled).finished();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(page.getByRole('region', { name: 'Daily Sky Summary editor', exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Detriment and fall summary editor', exact: true })).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(region).toHaveCount(0);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { releaseLookup?.(); store.close(); }
  });
}
