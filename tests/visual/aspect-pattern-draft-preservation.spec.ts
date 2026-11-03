import { test, expect } from '@playwright/test';
import { Readable } from 'node:stream';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';
import { createFixturePublicationLedger } from '../helpers/fixture-publication-ledger.mjs';
import { syntheticPublicationPage } from '../helpers/synthetic-publication-page';

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Aspect Pattern draft survives navigation and delayed save ${width} ${theme}`, async ({ page, context, baseURL }) => {
    const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'synthetic-pattern-editor',
      SUPABASE_URL: 'https://pattern-editor.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic' };
    const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
    Object.assign(process.env, env);
    const { default: handler } = await import('../../api/admin/aspect-pattern-writeups');
    Object.assign(process.env, env);
    const originalFetch = globalThis.fetch;
    const stored = new Map<string, any>();
    const ledger = createFixturePublicationLedger();
    const writes: Array<{ expected: string | null; received: string; copy: string }> = [];
    let holdNextSave = false, held = false, reads = 0, discard = false;
    let releaseSave = () => {};
    const heldResponse = new Promise<void>(resolve => { releaseSave = resolve; });
    const dialogs: string[] = [], errors: string[] = [];
    const guard = await installSyntheticNetworkGuard(context, new URL(baseURL!).origin);
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      expect(url.origin).toBe(env.SUPABASE_URL);
      expect(url.pathname).toBe('/rest/v1/generated_interpretations');
      const matches = [...stored.values()].filter(row => [...url.searchParams].every(([field, value]) => {
        if (['select', 'order', 'limit'].includes(field)) return true;
        if (value.startsWith('eq.')) return String(row[field]) === value.slice(3);
        if (value.startsWith('like.') && /[%*]$/u.test(value)) return String(row[field]).startsWith(value.slice(5, -1));
        if (value.startsWith('in.(') && value.endsWith(')')) return value.slice(4, -1).split(',').includes(String(row[field]));
        throw new Error('Unsupported synthetic storage filter: ' + field);
      }));
      if (!init.method || init.method === 'GET') return Response.json(matches);
      const submitted = JSON.parse(String(init.body));
      if (init.method === 'POST') {
        if ([...stored.values()].some(row => row.content_key === submitted.content_key)) return Response.json({ code: '23505' }, { status: 409 });
        const row = { ...submitted, id: '00000000-0000-4000-8000-000000000001' };
        stored.set(row.id, row);
        ledger.observe(undefined, row, init.headers);
        writes.push({ expected: null, received: row.updated_at, copy: row.source_snapshot.record.content.overview });
        return Response.json([row]);
      }
      expect(init.method).toBe('PATCH');
      const updated = matches.map(row => ({ ...row, ...submitted }));
      for (const row of updated) {
        ledger.observe(stored.get(row.id), row, init.headers);
        stored.set(row.id, row);
        writes.push({ expected: url.searchParams.get('updated_at')?.slice(3) ?? null,
          received: row.updated_at, copy: row.source_snapshot.record.content.overview });
      }
      return Response.json(updated);
    };
    try {
      await context.addInitScript(({ theme, secret }) => {
        localStorage.setItem('tldrastro:contentAdminSecret', secret);
        localStorage.setItem('tldrastro:studio-theme', theme);
      }, { theme, secret: env.CONTENT_GENERATION_SECRET });
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', async dialog => { dialogs.push(dialog.message()); await (discard ? dialog.accept() : dialog.dismiss()); });
      await context.route('**/rest/v1/content_publications?**', async route => {
        const request = route.request(), url = new URL(request.url());
        expect(url.origin).toBe('https://visual-smoke.supabase.test');
        expect(url.pathname).toBe('/rest/v1/content_publications');
        expect(request.method()).toBe('GET');
        await route.fulfill({ json: syntheticPublicationPage(ledger.records(), url.searchParams) });
      });
      await context.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== new URL(baseURL!).origin) return route.fallback();
        if (url.pathname !== '/api/admin/aspect-pattern-writeups') {
          expect(['GET', 'HEAD', 'POST']).toContain(request.method());
          return route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
        }
        if (request.method() === 'GET') reads++;
        const req = Object.assign(Readable.from(request.postData() ? [request.postData()!] : []), {
          method: request.method(), url: request.url(), headers: request.headers()
        });
        const res = { statusCode: 200, headers: {} as Record<string, string>, body: '',
          setHeader(key: string, value: string) { this.headers[key] = value; }, end(body: string) { this.body = body; } };
        await handler(req as any, res as any);
        if (holdNextSave && request.method() !== 'GET' && request.postDataJSON()?.action !== 'preview') {
          holdNextSave = false; held = true; await heldResponse;
        }
        await route.fulfill({ status: res.statusCode, headers: res.headers, body: res.body });
      });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/admin/content#content/aspect-patterns');
      const editor = page.getByRole('region', { name: 'Aspect pattern write-up editor', exact: true });
      const overview = editor.getByRole('textbox', { name: 'Overview', exact: true });
      const save = editor.getByRole('button', { name: 'Save draft', exact: true });
      await expect(editor).toBeVisible();
      const beforeUnload = () => page.evaluate(() => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event); return event.defaultPrevented;
      });
      expect(await beforeUnload()).toBe(false);
      const copy = 'Synthetic complete opening paragraph.\n\nSynthetic complete final sentence.';
      await overview.fill(copy);
      expect(await beforeUnload()).toBe(true);
      await page.getByRole('region', { name: 'natal aspect pattern records', exact: true }).getByRole('button').nth(1).click();
      await expect(overview).toHaveValue(copy);
      await page.getByRole('button', { name: 'Active Now Write-ups', exact: true }).click();
      await expect(overview).toHaveValue(copy);
      const beforeRefresh = reads;
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      expect(reads).toBe(beforeRefresh);
      await expect(overview).toHaveValue(copy);
      expect(dialogs).toHaveLength(3);
      const menu = page.getByRole('button', { name: 'Open Content Studio navigation', exact: true });
      if (await menu.isVisible()) await menu.click();
      await page.getByRole('button', { name: 'Content Library', exact: true }).click();
      await expect(page).toHaveURL(/#content\/aspect-patterns$/u);
      await expect(overview).toHaveValue(copy);
      expect(dialogs).toHaveLength(4);
      const hideMenu = page.getByRole('button', { name: 'Hide Content Studio navigation', exact: true });
      if (await hideMenu.isVisible()) await hideMenu.click();

      holdNextSave = true;
      await save.click();
      await expect.poll(() => held).toBe(true);
      const newer = copy + '\n\nSynthetic newer final sentence typed during save.';
      await overview.fill(newer);
      await expect(page.getByRole('button', { name: 'Active Now Write-ups', exact: true })).toBeDisabled();
      releaseSave();
      await expect(save).toBeEnabled();
      await expect(overview).toHaveValue(newer);
      expect(writes).toHaveLength(1);
      expect(writes[0].copy).toBe(copy);
      await save.click();
      await expect.poll(() => writes.length).toBe(2);
      await expect(save).toBeEnabled();
      expect(writes[1].expected).toBe(writes[0].received);
      expect(writes[1].copy).toBe(newer);
      expect(await beforeUnload()).toBe(false);
      await page.reload();
      await expect(overview).toHaveValue(newer);
      expect(dialogs).toHaveLength(4);

      const row = [...stored.values()][0];
      row.updated_at = '2099-01-01T00:00:00.123456Z';
      row.source_snapshot.record.content.overview = 'Synthetic newer saved source.';
      const stale = newer + '\n\nSynthetic unsent local ending.';
      await overview.fill(stale);
      await save.click();
      await expect(page.getByRole('alert')).toContainText('changed after it was opened');
      expect(writes).toHaveLength(2);
      expect(row.source_snapshot.record.content.overview).toBe('Synthetic newer saved source.');
      await expect(overview).toHaveValue(stale);
      discard = true;
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      await expect(overview).toHaveValue('Synthetic newer saved source.');
      expect(await beforeUnload()).toBe(false);
      expect(errors).toEqual([]);
      expect(guard.unhandledExternal).toEqual([]);
    } finally {
      releaseSave();
      await guard.finishStaticFonts();
      await page.unrouteAll({ behavior: 'wait' });
      await context.unrouteAll({ behavior: 'wait' });
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });
}
