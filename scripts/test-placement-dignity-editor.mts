import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Fresh build of the actual editor with its shared production styles. Fixtures
// have no database credentials; every request is served by this local server.
const root = process.cwd();
const temp = await mkdtemp(path.join(tmpdir(), 'dignity-editor-'));
await mkdir('test-results/placement-dignity-editor', { recursive: true });
await build({ stdin: { resolveDir: root, loader: 'tsx', contents: `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from './apps/admin/src/SkyWritingLibraryEditor';
import { installSkyWritingLibrary } from './apps/admin/src/skyWritingLibrary';
import { makeSkyIngressComposition } from './apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import './apps/web/src/styles/startup.css';
import './apps/admin/src/studio-system.css';
const params = new URLSearchParams(location.search);
const planet = params.get('planet') || 'mercury', sign = params.get('sign') || 'virgo';
const contentKey = 'sky-placement/article/' + planet + '/' + sign;
const initial = installSkyWritingLibrary(makeSkyIngressComposition());
if (params.has('legacy')) {
 initial.sources.dignitySentence = { kind: 'placement', text: 'Fixture complete legacy paragraph. Fixture legacy final sentence.' };
 initial.modules.find(module => module.id === 'dignity').template = '{{dignitySentence}}';
}
function App() {
 const [composition, update] = useState(initial);
 window.fixtureComposition = composition;
 return <div className="admin-dashboard" data-studio-theme={params.get('theme') || 'dark'}>
 <aside className="admin-sidebar" aria-label="Fixture sidebar" />
 <main className="admin-main"><Editor contentKey={contentKey} planet={planet} sign={sign}
 sourceRecord={{ contentKey }} composition={composition} disabled={false} initialSourceId="placementDignityMeaning"
 onChange={update} onOpenSource={() => {}} onAdvancedSource={() => {}} /></main></div>;
}
createRoot(document.getElementById('root')).render(<App />);
` }, outfile: path.join(temp, 'app.js'), bundle: true, format: 'esm', platform: 'browser', jsx: 'automatic', external: ['/fonts/*', '/assets/*'], loader: { '.woff2': 'file', '.woff': 'file', '.ttf': 'file', '.png': 'file', '.svg': 'file' }, logLevel: 'silent' });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>'); return;
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (relative.split('/').includes('..')) { res.writeHead(400).end(); return; }
    const file = path.join(temp, relative);
    const content = await readFile(file).catch(() => readFile(path.join(root, 'apps/web/public', relative)));
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream');
    res.end(content);
  } catch { res.writeHead(404).end(); }
});
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address() as { port: number };
const browser = await chromium.launch({ headless: true });
let variants = 0;
try {
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [planet, sign, label] of [
      ['sun','leo','domicile'], ['sun','aries','exaltation'], ['venus','aries','detriment'], ['saturn','aries','fall'],
      ['mercury','virgo','domicile and exaltation'], ['mercury','pisces','detriment and fall'], ['sun','virgo','no major sign condition'],
      ['uranus','gemini','not applicable'], ['saturn','ariesx','invalid placement']
    ]) {
      await page.goto(`http://127.0.0.1:${address.port}/?planet=${planet}&sign=${sign}&theme=${theme}`);
      await page.evaluate(() => document.fonts.ready);
      const selection = page.getByTestId('placement-dignity-selection');
      await selection.waitFor();
      assert.equal(await selection.locator('code').innerText(), label);
      assert.equal(await page.getByLabel('Writing library Dignity paragraph', { exact: true }).inputValue(), '');
      assert.equal(await page.evaluate(() => (window as any).fixtureComposition.enabled), false);
      const typography = (el: Element) => { const s = getComputedStyle(el); return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.margin,s.textTransform]; };
      assert.deepEqual(await selection.locator('p').first().evaluate(typography), await page.locator('.admin-sky-writing-context > p').last().evaluate(typography));
      const editor = page.getByRole('region', { name: 'Edit Dignity paragraph', exact: true });
      assert((await editor.evaluate(el => el.scrollWidth - el.clientWidth)) <= 1);
      variants++;
    }
    await page.goto(`http://127.0.0.1:${address.port}/?planet=mercury&sign=virgo&theme=${theme}&legacy=1`);
    await page.getByRole('button', { name: 'Migrate saved dignity paragraph', exact: true }).click();
    const field = page.getByLabel('Writing library Dignity paragraph', { exact: true });
    assert.equal(await field.inputValue(), 'Fixture complete legacy paragraph. Fixture legacy final sentence.');
    const state = await page.evaluate(() => (window as any).fixtureComposition);
    assert.equal(state.enabled, false);
    assert.deepEqual(state.sources.placementDignityMeaning, state.sources.dignitySentence);
    assert.equal(state.modules.find((item: any) => item.id === 'dignity').template, '{{placementDignityMeaning}}');
    await page.getByRole('region', { name: 'Edit Dignity paragraph', exact: true }).screenshot({ path: `test-results/placement-dignity-editor/${width}-${theme}.png` });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(`PASS: ${variants} editor condition/state renders, desktop/mobile and light/dark typography parity; four exact draft-only migrations; no page errors.`);
} finally {
  await browser.close();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await rm(temp, { recursive: true, force: true });
}
