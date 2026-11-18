import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { createApiStore } from '../helpers/calendar-review-api.mjs';
import { emptyHoroscopeEdition, horoscopeEditionKey } from '../../apps/web/src/content/horoscopeEditions.mjs';
import { installSyntheticNetworkGuard } from '../helpers/synthetic-network-guard';

const accessTest = test.extend({
  context: async ({ context, baseURL }, use, info) => {
    const network = await installSyntheticNetworkGuard(context, new URL(baseURL!).origin);
    try { await use(context); }
    finally {
      await Promise.all(context.pages().map(page => page.close()));
      await network.finishStaticFonts();
      await info.attach('strict-network-ledger', { contentType: 'application/json', body: JSON.stringify({ unhandledExternal: network.unhandledExternal }) });
      expect(network.unhandledExternal).toEqual([]);
    }
  }
});

const coverage = { planet: 'mercury', sign: 'scorpio', transitStartInstant: '2026-10-24T00:00:00.000Z', transitEndInstant: '2026-11-13T00:00:00.000Z' };
const edition = emptyHoroscopeEdition({ period: 'weekly', audience: 'rising', timeZone: 'America/New_York',
  startsAt: '2026-10-26T04:00:00.000Z', endsAt: '2026-11-02T05:00:00.000Z' });
const row = { id: '10000000-0000-4000-8000-000000000097', content_key: horoscopeEditionKey(edition.window),
  headline: 'Synthetic matching week', status: 'DRAFT', mode: 'article', event_type: 'horoscope-edition',
  sections: { horoscopeEdition: edition }, updated_at: '2026-11-03T12:00:00.000Z' };

async function component(page: Page, initialCredential: string) {
  const script = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React, {useState,useEffect} from 'react';
      import {createRoot} from 'react-dom/client';
      import Studio from './apps/admin/src/SkyArticleHoroscopes';
      function View() {
        const [credential,setCredential]=useState(${JSON.stringify(initialCredential)});
        useEffect(()=>{const ready=()=>setCredential('calendar-api-fixture');
          window.addEventListener('fixture-owner-ready',ready);
          return()=>window.removeEventListener('fixture-owner-ready',ready);},[]);
        return <><button onClick={()=>setCredential('calendar-api-fixture')}>Complete owner sign-in</button>
          <Studio window={${JSON.stringify(coverage)}} placement={{planet:'mercury',sign:'scorpio'}} rows={[]}
            credential={credential} request={async(path,options)=>{
              const response=await fetch(path,{...options,headers:{'x-content-generation-secret':credential}});
              const payload=await response.json();if(!response.ok)throw new Error('Synthetic access refusal');return payload;
            }} onLoadRow={async()=>{throw new Error('No source editor is opened');}}
            onEditRow={()=>{throw new Error('No source editor is opened');}} onEditorState={()=>{}} />
        </>;
      }
      createRoot(document.getElementById('root')).render(<View/>);` },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{}' }
  });
  await page.route('**/__related-horoscope-fixture', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }));
  await page.goto('/__related-horoscope-fixture');
  await page.addScriptTag({ content: script.outputFiles[0].text });
}

accessTest('linked horoscope inventory waits for owner access', async ({ page }) => {
  const originalFetch = globalThis.fetch;
  const store = await createApiStore([row], { projectSelect: true });
  const requests: string[] = [];
  await page.route('**/api/admin/generated-content?**', async route => {
    const credential = route.request().headers()['x-content-generation-secret'] ?? '';
    requests.push(credential);
    const url = new URL(route.request().url());
    const result = await store.invoke('GET', undefined, url.pathname + url.search, credential);
    await route.fulfill({ status: result.status, json: result.payload });
  });
  try {
    await component(page, '');
    await expect(page.getByRole('button', { name: 'Horoscopes', exact: true })).toBeDisabled();
    expect(requests).toEqual([]);
    await page.getByRole('button', { name: 'Complete owner sign-in', exact: true }).click();
    await page.getByRole('button', { name: 'Horoscopes', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Linked horoscope editions' })).toContainText(row.headline);
    expect(requests).toEqual(['calendar-api-fixture']);
    expect([...store.rows.values()]).toEqual([row]);
  } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); await store.close(); globalThis.fetch = originalFetch; }
});

accessTest('linked horoscope credential renewal cancels an obsolete inventory response', async ({ page }) => {
  const originalFetch = globalThis.fetch;
  const store = await createApiStore([row], { projectSelect: true });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let oldStarted = false, oldCancelled = false;
  page.on('requestfailed', request => {
    if (new URL(request.url()).pathname === '/api/admin/generated-content'
      && request.headers()['x-content-generation-secret'] === 'obsolete-fixture') oldCancelled = true;
  });
  await page.route('**/api/admin/generated-content?**', async route => {
    const credential = route.request().headers()['x-content-generation-secret'] ?? '';
    const url = new URL(route.request().url());
    const result = await store.invoke('GET', undefined, url.pathname + url.search, credential);
    if (credential === 'obsolete-fixture') { expect(result.status).toBe(401); oldStarted = true; await held; }
    await route.fulfill({ status: result.status, json: result.payload }).catch(() => {});
  });
  try {
    await component(page, 'obsolete-fixture');
    await page.getByRole('button', { name: 'Horoscopes', exact: true }).click();
    await expect.poll(() => oldStarted).toBe(true);
    await page.evaluate(() => window.dispatchEvent(new Event('fixture-owner-ready')));
    const list = page.getByRole('list', { name: 'Linked horoscope editions' });
    await expect(list).toContainText(row.headline);
    release();
    await expect.poll(() => oldCancelled).toBe(true);
    await expect(list).toContainText(row.headline);
    await expect(page.getByRole('button', { name: 'Retry horoscope editions', exact: true })).toHaveCount(0);
    expect([...store.rows.values()]).toEqual([row]);
  } finally { release(); await page.unrouteAll({ behavior: 'ignoreErrors' }); await store.close(); globalThis.fetch = originalFetch; }
});
