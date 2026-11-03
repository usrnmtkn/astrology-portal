import { expect, test, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { createApiStore } from '../helpers/calendar-review-api.mjs';
import { routeStudioInventoryApi } from '../helpers/studio-inventory-route';

const key = 'authored/book-ritual-and-the-moon/lunation-horoscope/new-moon/aries/rising-aries/house-1';
const copy = 'Synthetic saved catalog opening.\n\nComplete synthetic catalog final sentence.';
const row = {
  id: '10000000-0000-4000-8000-000000000095', content_key: key, headline: 'Synthetic Aries fallback',
  body: copy, summary: '', status: 'DRAFT', surface: 'sky', mode: 'in_depth', lane: 'reference',
  provider: 'manual-admin', block_type: 'fallback_hook', event_type: 'fallback-hook', review_state: null,
  sections: {}, facts: {}, source_snapshot: {}, updated_at: '2026-11-03T12:00:00Z'
};
const catalogPath = '/api/admin/content-live-status';
const authOrigin = process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test';
const routePath = `/admin/content#horoscope-fallbacks?source=${encodeURIComponent(key)}`;
const library = (page: Page) => page.getByRole('region', { name: 'Fallback horoscope library', exact: true });
function callStore(store: Awaited<ReturnType<typeof createApiStore>>) {
  return async ({ method, body, url }: { method: string; body?: unknown; url?: string }) => method === 'rows'
    ? [...store.rows.values()] : store.invoke(method, body, url);
}

async function component(page: Page, initialCredential: string) {
  const script = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React, {useState} from 'react';
      import {createRoot} from 'react-dom/client';
      import Studio from './apps/admin/src/FallbackHoroscopeStudio';
      function View() {
        const [credential,setCredential]=useState(${JSON.stringify(initialCredential)});
        return <><button onClick={()=>setCredential('calendar-api-fixture')}>Complete owner sign-in</button>
          <Studio rows={[${JSON.stringify(row)}]} credential={credential} initialSourceKey=${JSON.stringify(key)}
            onLoadCatalog={async signal=>{
              const response=await fetch('${catalogPath}',{method:'POST',signal,
                headers:{'content-type':'application/json','x-content-generation-secret':credential},
                body:JSON.stringify({action:'composition-catalog'})});
              const payload=await response.json();
              if(!response.ok)throw new Error(payload.error);return payload;
            }} onLoadRow={async()=>{throw new Error('Saved copy is already hydrated');}}
            onSourceChange={()=>{}} onEditRow={()=>{}} onOpenPlacement={()=>{}} />
        </>;
      }
      createRoot(document.getElementById('root')).render(<View/>);` },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{}' }
  });
  await page.route('**/__fallback-catalog-fixture', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }));
  await page.goto('/__fallback-catalog-fixture');
  await page.addScriptTag({ content: script.outputFiles[0].text });
}

test('fallback catalog waits for asynchronous owner sign-in and loads without a manual retry', async ({ page }) => {
  const store = await createApiStore([row]);
  const requests: string[] = [];
  await page.route(`**${catalogPath}`, async route => {
    const credential = route.request().headers()['x-content-generation-secret'] ?? '';
    requests.push(credential);
    const result = await store.invoke('POST', route.request().postDataJSON(), catalogPath, credential);
    await route.fulfill({ status: result.status, json: result.payload });
  });
  try {
    await component(page, '');
    await expect(page.getByText('Loading fallback sources…', { exact: true })).toBeVisible();
    expect(requests).toEqual([]);
    await page.getByRole('button', { name: 'Complete owner sign-in', exact: true }).click();
    await expect(library(page)).toContainText('1314 sources');
    await expect(library(page).getByRole('article')).toContainText('Synthetic saved catalog opening.');
    await expect(library(page).getByRole('article')).toContainText('Complete synthetic catalog final sentence.');
    expect(requests).toEqual(['calendar-api-fixture']);
    await expect(page.getByRole('button', { name: 'Retry fallback sources' })).toHaveCount(0);
    expect([...store.rows.values()]).toEqual([row]);
  } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); await store.close(); }
});

test('an obsolete catalog refusal cannot replace the renewed credential result', async ({ page }) => {
  const store = await createApiStore([row]);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let oldStarted = false, oldCancelled = false;
  page.on('requestfailed', request => {
    if (new URL(request.url()).pathname === catalogPath && request.headers()['x-content-generation-secret'] === 'obsolete-fixture') oldCancelled = true;
  });
  await page.route(`**${catalogPath}`, async route => {
    const credential = route.request().headers()['x-content-generation-secret'] ?? '';
    const result = await store.invoke('POST', route.request().postDataJSON(), catalogPath, credential);
    if (credential === 'obsolete-fixture') { expect(result.status).toBe(401); oldStarted = true; await held; }
    await route.fulfill({ status: result.status, json: result.payload }).catch(() => {});
  });
  try {
    await component(page, 'obsolete-fixture');
    await expect.poll(() => oldStarted).toBe(true);
    await page.getByRole('button', { name: 'Complete owner sign-in', exact: true }).click();
    await expect(library(page)).toContainText('1314 sources');
    release();
    await expect.poll(() => oldCancelled).toBe(true);
    await expect(library(page)).toContainText('Complete synthetic catalog final sentence.');
    await expect(page.getByRole('button', { name: 'Retry fallback sources' })).toHaveCount(0);
  } finally { release(); await page.unrouteAll({ behavior: 'ignoreErrors' }); await store.close(); }
});

test('the dashboard opens fallback sources while owner session renewal finishes asynchronously', async ({ page }) => {
  const store = await createApiStore([row]);
  const sessionKey = `sb-${new URL(authOrigin).hostname.split('.')[0]}-auth-token`;
  const token = (expiry: number) => `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: '10000000-0000-4000-8000-000000000096', aud: 'authenticated', role: 'authenticated', exp: expiry })).toString('base64url')}.synthetic`;
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const renewed = token(expiry);
  let release!: () => void, renewing = false;
  const held = new Promise<void>(resolve => { release = resolve; });
  const catalogCredentials: string[] = [];
  await page.addInitScript(({ sessionKey, expired }) => {
    localStorage.removeItem('tldrastro:contentAdminSecret');
    localStorage.setItem(sessionKey, JSON.stringify({ access_token: expired, refresh_token: 'synthetic-refresh', expires_at: 1, token_type: 'bearer' }));
  }, { sessionKey, expired: token(1) });
  await page.route(`${authOrigin}/auth/v1/**`, async route => {
    const user = { id: '10000000-0000-4000-8000-000000000096', email: 'studio-fixture@example.invalid', app_metadata: { role: 'admin' } };
    if (new URL(route.request().url()).pathname === '/auth/v1/token') {
      renewing = true; await held;
      await route.fulfill({ json: { access_token: renewed, refresh_token: 'synthetic-renewed-refresh', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user } });
    } else await route.fulfill({ json: user });
  });
  await page.route(`${authOrigin}/rest/v1/**`, route => route.fulfill({ json: [] }));
  await routeStudioInventoryApi(page, { actualDocumentRoute: true, call: callStore(store), answer: async (route, url) => {
    if (url.pathname !== catalogPath) return false;
    const body = route.request().postDataJSON();
    const credential = route.request().headers()['x-content-admin-session'] ?? '';
    if (body.action === 'composition-catalog') catalogCredentials.push(credential);
    // The browser session is synthetic; the actual local handler still verifies
    // its own fixture credential. Empty browser credentials must reach its denial.
    const result = await store.invoke('POST', body, catalogPath, credential === renewed ? 'calendar-api-fixture' : '');
    await route.fulfill({ status: result.status, json: result.payload }); return true;
  } });
  try {
    await page.goto(routePath);
    await expect.poll(() => renewing).toBe(true);
    await expect(page.getByText('Loading fallback sources…', { exact: true })).toHaveCount(1);
    expect(catalogCredentials).toEqual([]);
    release();
    await expect(library(page)).toContainText('Complete synthetic catalog final sentence.');
    expect(catalogCredentials).toEqual([renewed]);
    await expect(page.getByRole('button', { name: 'Retry fallback sources' })).toHaveCount(0);
    expect([...store.rows.values()]).toEqual([row]);
  } finally { release(); await page.unrouteAll({ behavior: 'ignoreErrors' }); await store.close(); }
});

for (const [failure, width, theme] of [
  ['network', 390, 'light'], ['503', 1440, 'dark'], ['invalid-json', 1440, 'light'], ['invalid-catalog', 390, 'dark']
] as const) test(`fallback catalog automatically recovers a temporary ${failure} read ${width} ${theme}`, async ({ page }, info) => {
  const store = await createApiStore([row]);
  const before = structuredClone([...store.rows.values()]);
  let catalogReads = 0;
  const writes: unknown[] = [];
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(theme => {
    localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture');
    localStorage.setItem('tldrastro:studio-theme', theme);
  }, theme);
  await routeStudioInventoryApi(page, { actualDocumentRoute: true,
    call: callStore(store), onWrite: write => writes.push(write),
    answer: async (route, url) => {
      if (url.pathname !== catalogPath) return false;
      const body = route.request().postDataJSON();
      if (body.action === 'composition-catalog' && ++catalogReads === 1) {
        if (failure === 'network') await route.abort('failed');
        else if (failure === '503') await route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic temporary read outage.' } });
        else if (failure === 'invalid-json') await route.fulfill({ contentType: 'text/html', body: '<p>Synthetic unavailable gateway</p>' });
        else await route.fulfill({ json: { ok: true } });
        return true;
      }
      const result = await store.invoke('POST', body, catalogPath);
      await route.fulfill({ status: result.status, json: result.payload });
      return true;
    }
  });
  try {
    await page.goto(routePath);
    await expect(library(page)).toContainText('1314 sources');
    await expect(library(page).getByRole('article')).toContainText('Synthetic saved catalog opening.');
    await expect(library(page).getByRole('article')).toContainText('Complete synthetic catalog final sentence.');
    expect(catalogReads).toBe(2);
    await expect(page.getByRole('button', { name: 'Retry fallback sources' })).toHaveCount(0);
    await library(page).getByLabel('Search fallback horoscopes', { exact: true }).fill('Synthetic Aries fallback');
    await expect(library(page)).toContainText('1 sources');
    await library(page).getByLabel('Search fallback horoscopes', { exact: true }).fill('synthetic-no-matching-source');
    await expect(library(page)).toContainText('0 sources');
    await expect(library(page).getByLabel('Selected fallback horoscope', { exact: true })).toBeDisabled();
    await expect(library(page)).toContainText('No saved fallback matches these filters.');
    await library(page).getByLabel('Search fallback horoscopes', { exact: true }).fill('Synthetic Aries fallback');
    await expect(library(page)).toContainText('Complete synthetic catalog final sentence.');
    expect(catalogReads).toBe(2);
    await library(page).getByRole('button', { name: 'Edit horoscope', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Generated content editor' }).getByRole('textbox', { name: 'Full lunar passage', exact: true })).toHaveValue(copy);
    await page.getByRole('dialog', { name: 'Generated content editor' }).getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await expect(library(page)).toContainText('Complete synthetic catalog final sentence.');
    expect(catalogReads).toBe(3);
    expect(writes).toEqual([]);
    expect([...store.rows.values()]).toEqual(before);
    await page.screenshot({ path: info.outputPath('recovered-catalog.png'), fullPage: true });
  } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); await store.close(); }
});

for (const status of [400, 401]) test(`fallback catalog keeps HTTP ${status} refusals visible without replay`, async ({ page }) => {
  const store = await createApiStore([row]);
  let reads = 0;
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
  await routeStudioInventoryApi(page, { call: callStore(store), answer: async (route, url) => {
    if (url.pathname !== catalogPath) return false;
    const body = route.request().postDataJSON();
    if (body.action === 'composition-catalog') {
      reads++;
      const result = status === 401
        ? await store.invoke('POST', body, catalogPath, 'wrong-fixture')
        : await store.invoke('POST', { action: 'invalid-fixture-action' }, catalogPath);
      expect(result.status).toBe(status);
      await route.fulfill({ status: result.status, json: result.payload });
    } else {
      const result = await store.invoke('POST', body, catalogPath);
      await route.fulfill({ status: result.status, json: result.payload });
    }
    return true;
  } });
  try {
    await page.goto(routePath);
    await expect(page.getByRole('button', { name: 'Retry fallback sources', exact: true })).toBeVisible();
    await page.waitForTimeout(1700);
    expect(reads).toBe(1);
    expect([...store.rows.values()]).toEqual([row]);
  } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); await store.close(); }
});

test('fallback catalog retries are bounded and manual recovery remains available after an outage', async ({ page }) => {
  const store = await createApiStore([row]);
  let reads = 0, unavailable = true;
  await page.addInitScript(() => localStorage.setItem('tldrastro:contentAdminSecret', 'calendar-api-fixture'));
  await routeStudioInventoryApi(page, { call: callStore(store), answer: async (route, url) => {
    if (url.pathname !== catalogPath) return false;
    const body = route.request().postDataJSON();
    if (body.action === 'composition-catalog') {
      reads++;
      if (unavailable) { await route.fulfill({ status: 503, json: { ok: false, error: 'Synthetic continuing outage.' } }); return true; }
    }
    const result = await store.invoke('POST', body, catalogPath);
    await route.fulfill({ status: result.status, json: result.payload });
    return true;
  } });
  try {
    await page.goto(routePath);
    const retry = page.getByRole('button', { name: 'Retry fallback sources', exact: true });
    await expect(retry).toBeVisible();
    expect(reads).toBe(3);
    unavailable = false;
    await retry.click();
    await expect(library(page)).toContainText('Complete synthetic catalog final sentence.');
    expect(reads).toBe(4);
    expect([...store.rows.values()]).toEqual([row]);
  } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); await store.close(); }
});
