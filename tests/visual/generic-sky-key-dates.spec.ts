import { test, expect } from '../helpers/polish-test';
import { expectKeyDatesHeaderCentered } from '../helpers/key-dates-panel';
import { expectReadableTheme } from '../helpers/theme-contrast';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

let script = '', styles = '';
test.beforeAll(async () => {
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
      import {SkyDetailArticle} from './apps/web/src/features/sky/SkyDetailArticle';
      const detail={title:'Sun Sextile Mars',glyph:'☉',kicker:'Sky',meta:'October 9, 2026',
        body:['Complete fixture opening paragraph.','Complete fixture final paragraph.'],
        keyDatesIntro:'Complete dated fixture introduction.',keyDates:[
          {date:'October 9, 2026',label:'First complete fixture event'},
          {date:'October 10, 2026',label:'Second complete fixture event'}]};
      const root=createRoot(document.getElementById('root'));
      window.renderArticle=(title,glyph='F')=>flushSync(()=>root.render(<div className="app-shell mode-detail"><SkyDetailArticle detail={{...detail,title,glyph}} onClose={()=>{}}/></div>));
      window.renderArticle(detail.title,detail.glyph);
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
    await expect(panel).toHaveAttribute('open', '');await expectKeyDatesHeaderCentered(panel);
    expect(await panel.evaluate(node => node.parentElement?.classList.contains('article-shell'))).toBe(true);
    await expect(panel.locator('.key-dates-panel__count')).toHaveText('2');
    await panel.locator('summary').focus();await page.keyboard.press('Enter');
    await expect(panel).not.toHaveAttribute('open', '');await expectKeyDatesHeaderCentered(panel);
    await page.keyboard.press('Space');
    await expect(panel).toHaveAttribute('open', '');await expectKeyDatesHeaderCentered(panel);
    await expect(panel.getByText('Complete dated fixture introduction.', { exact: true })).toBeVisible();
    await expect(panel.locator('.article-key-dates__date time')).toHaveText(['October 9, 2026', 'October 10, 2026']);
    await expect(panel.locator('.article-key-dates__label')).toHaveText(['First complete fixture event', 'Second complete fixture event']);
    await expect(panel.locator('h2')).toHaveCSS('font-family', /Newsreader/);
    await expectReadableTheme(page, '.key-dates-panel h2, .article-key-dates__date, .article-key-dates__label');
    await panel.screenshot({ path: test.info().outputPath('generic-sky-key-dates-expanded.png') });
    await page.keyboard.press('Space');await expect(panel).not.toHaveAttribute('open', '');
    await expect(panel.locator('summary')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`placement glyphs recognize lunar events and preserve planets and signs ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/__placement-glyphs', route => route.fulfill({ contentType: 'text/html',
      body: `<!doctype html><html data-theme="${theme}"><head>${styles}</head><body><div id="root"></div><script type="module">${script}</script></body></html>` }));
    await page.goto('/__placement-glyphs');
    await page.evaluate(() => (window as any).renderArticle('Full Moon Lunar Eclipse in Pisces'));
    await expect(page.locator('.article-eyebrow')).toHaveAttribute('aria-label', 'Placement: Moon Pisces');
    await expect(page.locator('.article-eyebrow__glyphs')).toHaveText('☽');
    await expect(page.locator('.article-eyebrow__glyphs img')).toHaveAttribute('src', /\/pisces\.svg/);
    await page.locator('.article-id').screenshot({ path: test.info().outputPath('lunar-placement-header.png') });

    const failures = await page.evaluate(async () => {
      const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      const bodies = [
        ['Full Moon', '☽'], ['New Moon', '☽'], ['Full Moon Lunar Eclipse', '☽'], ['New Moon Solar Eclipse', '☽'],
        ['First Quarter Moon', '☽'], ['Last Quarter Moon', '☽'], ['Third Quarter Moon', '☽'],
        ['Waxing Crescent Moon', '☽'], ['Waning Crescent Moon', '☽'], ['Waxing Gibbous Moon', '☽'], ['Waning Gibbous Moon', '☽'],
        ['Lunar Eclipse', '☽'], ['Solar Eclipse', '☽'], ['Sun', '☉'], ['Moon', '☽'], ['Mercury', '☿'], ['Venus', '♀'],
        ['Mars', '♂'], ['Jupiter', '♃'], ['Saturn', '♄'], ['Uranus', '♅'], ['Neptune', '♆'], ['Pluto', '♇'],
        ['Chiron', '⚷'], ['Lilith', '⚸'], ['Ceres', '⚳'], ['North Node', '☊'], ['South Node', '☋']
      ];
      const failures: string[] = [];
      for (const [body, glyph] of bodies) for (const sign of signs) {
        const title = `${body} in ${sign}`;
        (window as any).renderArticle(title);
        const eyebrow = document.querySelector('.article-eyebrow');
        const image = eyebrow?.querySelector('img');
        await image?.decode();
        if (eyebrow?.getAttribute('aria-label') !== `Placement: ${body.includes('Moon') || body.includes('Eclipse') ? 'Moon' : body} ${sign}`
          || eyebrow?.querySelector('.article-eyebrow__glyphs')?.textContent !== glyph
          || !image?.src.includes(`/${sign.toLowerCase()}.svg`)
          || !image.naturalWidth) failures.push(title);
      }
      (window as any).renderArticle('Mercury Rx in Scorpio in the 4th house');
      if (document.querySelector('.article-eyebrow__glyphs')?.textContent !== '☿℞4H') failures.push('Retrograde and house glyphs');
      (window as any).renderArticle('Full Moon Lunar Eclipse in Pisces in the 4th house');
      if (document.querySelector('.article-eyebrow__glyphs')?.textContent !== '☽4H') failures.push('Lunar house glyphs');
      return failures;
    });
    expect(failures).toEqual([]);
    await page.reload();
    await page.evaluate(() => (window as any).renderArticle('New Moon in Virgo', 'N'));
    await expect(page.locator('.article-eyebrow__glyphs')).toHaveText('☽');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
