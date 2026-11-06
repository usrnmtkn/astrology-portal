import { test, expect } from '../helpers/polish-test';
import { expectKeyDatesHeaderCentered } from '../helpers/key-dates-panel';
import { expectReadableTheme } from '../helpers/theme-contrast';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

let script = '', styles = '';
test.beforeAll(async () => {
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {SkyDetailArticle} from './apps/web/src/features/sky/SkyDetailArticle';
      const detail={title:'Sun Sextile Mars',glyph:'☉',kicker:'Sky',meta:'October 9, 2026',
        body:['Complete fixture opening paragraph.','Complete fixture final paragraph.'],
        keyDatesIntro:'Complete dated fixture introduction.',keyDates:[
          {date:'October 9, 2026',label:'First complete fixture event'},
          {date:'October 10, 2026',label:'Second complete fixture event'}]};
      createRoot(document.getElementById('root')).render(<div className="app-shell mode-detail"><SkyDetailArticle detail={detail} onClose={()=>{}}/></div>);
    ` },
    // Match the existing season-article browser harness: Swiss Ephemeris's
    // unused Node branch must not resolve a browser package named "module".
    bundle: true, write: false, format: 'esm', jsx: 'automatic', external: ['module'], loader: { '.css': 'empty' },
    define: { 'import.meta.env': JSON.stringify({ DEV: false, MODE: 'test' }) },
  });
  script = result.outputFiles[0].text;
  const manifest = JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT ?? 'apps/web/dist'}/.vite/manifest.json`, 'utf8'));
  const files = [...new Set<string>([manifest['src/styles.css'].file, ...Object.values(manifest).flatMap((entry: any) => entry.css ?? [])])]
    .filter(file => !/admin|studio|MemoryGraph/i.test(file));
  styles = files.map(file => `<link rel="stylesheet" href="/${file}">`).join('');
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`generic Sky Key dates preserves its complete timeline ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/__sky-key-dates', route => route.fulfill({ contentType: 'text/html',
      body: `<!doctype html><html data-theme="${theme}"><head>${styles}</head><body><div id="root"></div><script type="module">${script}</script></body></html>` }));
    await page.goto('/__sky-key-dates');
    await expect(page.getByRole('heading', { name: 'Sun Sextile Mars', exact: true })).toBeVisible();
    const panel = page.locator('.key-dates-panel');
    await expect(panel).not.toHaveAttribute('open', '');await expectKeyDatesHeaderCentered(panel);
    await expect(panel.locator('.key-dates-panel__count')).toHaveText('2');
    await panel.locator('summary').focus();await page.keyboard.press('Enter');
    await expect(panel).toHaveAttribute('open', '');await expectKeyDatesHeaderCentered(panel);
    await expect(panel.getByText('Complete dated fixture introduction.', { exact: true })).toBeVisible();
    await expect(panel.locator('dt, dd')).toHaveText(['October 9, 2026', 'First complete fixture event', 'October 10, 2026', 'Second complete fixture event']);
    await expect(panel.locator('h2')).toHaveCSS('font-family', /Newsreader/);
    await expectReadableTheme(page, '.key-dates-panel h2, .key-dates-panel dt, .key-dates-panel dd');
    await panel.screenshot({ path: test.info().outputPath('generic-sky-key-dates-expanded.png') });
    await page.keyboard.press('Space');await expect(panel).not.toHaveAttribute('open', '');
    await expect(panel.locator('summary')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
