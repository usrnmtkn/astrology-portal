import { test, expect } from '../helpers/polish-test';
import { expectKeyDatesHeaderCentered } from '../helpers/key-dates-panel';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {KeyDatesPanel} from './apps/web/src/components/KeyDatesPanel';
      const state=new URL(location.href).searchParams.get('state');
      const pending=state==='loading',empty=state==='empty';
      createRoot(document.getElementById('root')).render(<main className="article-page"><div className="article-body-inner">
        <section className="article-section"><h2>Preceding section</h2></section>
        <KeyDatesPanel className="article-section sky-detail-section" count={empty?0:2} pending={pending}>
          {pending?<p role="status">Calculating key dates…</p>:empty?<p>No key dates in this placement’s calculated window.</p>:<dl>
            <div><dt>October 9, 2026</dt><dd>First complete fixture event</dd></div>
            <div><dt>October 10, 2026</dt><dd>Second complete fixture event</dd></div>
          </dl>}
        </KeyDatesPanel>
      </div></main>);
    ` },
    bundle: true, write: false, format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
    define: { 'import.meta.env': JSON.stringify({ DEV: false, MODE: 'test' }) },
  });
  const manifest = JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT ?? 'apps/web/dist'}/.vite/manifest.json`, 'utf8'));
  const css = [...new Set<string>([manifest['src/styles.css'].file, ...Object.values(manifest).flatMap((entry: any) => entry.css ?? [])])]
    .filter(file => !/admin|studio|MemoryGraph/i.test(file));
  await page.route('**/__key-dates?**', route => {
    const theme = new URL(route.request().url()).searchParams.get('theme');
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="${theme}"><head>${css.map(file => `<link rel="stylesheet" href="/${file}">`).join('')}</head><body><div id="root"></div><script type="module">${result.outputFiles[0].text}</script></body></html>` });
  });
});

for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) for (const state of ['ready', 'empty', 'loading']) {
  test(`shared Key dates disclosure ${width} ${theme} ${state}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/__key-dates?theme=${theme}&state=${state}`);
    const panel = page.locator('.key-dates-panel');
    await expect(panel).toHaveAccessibleName('Key dates');
    await expect(panel).not.toHaveAttribute('open', '');
    await expectKeyDatesHeaderCentered(panel);
    await expect(panel.locator('.key-dates-panel__count')).toHaveCount(state === 'loading' ? 0 : 1);
    if (state !== 'loading') await expect(panel.locator('.key-dates-panel__count')).toHaveText(state === 'empty' ? '0' : '2');
    await panel.locator('summary').focus();await page.keyboard.press('Enter');
    await expect(panel).toHaveAttribute('open', '');await expectKeyDatesHeaderCentered(panel);
    if (state === 'ready') await expect(panel.locator('dd')).toHaveText(['First complete fixture event', 'Second complete fixture event']);
    if (state === 'empty') await expect(panel.getByText('No key dates in this placement’s calculated window.', { exact: true })).toBeVisible();
    if (state === 'loading') { await expect(panel).toHaveAttribute('aria-busy', 'true');await expect(panel.getByRole('status')).toBeVisible(); }
    await page.keyboard.press('Space');await expect(panel).not.toHaveAttribute('open', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
