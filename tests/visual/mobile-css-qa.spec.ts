import { expect, test } from '../helpers/polish-test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { bundledPublications } from '../helpers/bundled-publications';
import { readerResponse } from '../helpers/reader-response';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require(require.resolve('playwright-core/package.json').replace('package.json', 'lib/utilsBundle.js'));

let harness = '';
test.beforeAll(async () => {
  const result = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { SiteMenuSheet } from './apps/web/src/components/SiteMenuSheet';
    import { SignupView } from './apps/web/src/features/auth/SignupView';
    import { SkyWheel } from './apps/web/src/components/charts/Wheels';
    const theme = document.documentElement.dataset.theme;
    const mode = new URLSearchParams(location.search).get('view');
    const noop = () => {};
    const positions = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].map((planet, i) => ({
      planet, glyph: ['☉','☽','☿','♀','♂'][i], sign: 'Aries', degree: i * 5 + 1, longitude: i * 5 + 1, retrograde: false
    }));
    createRoot(document.getElementById('root')).render(mode === 'menu' ?
      <SiteMenuSheet theme={theme} onThemeChange={t => document.documentElement.dataset.theme=t} onClose={noop}
        restoreFocusId='root' profile={{name:'Synthetic Reader With a Long Name',email:'reader@example.test'}} handle='sample'>
        <nav className='site-menu' role='menu' aria-label='Site menu'>{['Sky','Calendar','Horoscopes','Guide','You','Friends','Learn','Reports','Account','Settings'].map(name => <button role='menuitem' key={name}>{name}</button>)}</nav>
      </SiteMenuSheet> : mode === 'auth' ?
      <SignupView initialForm={{fullName:'',email:'',password:'',birthDate:'',birthTime:'',unknownBirthTime:false,birthCity:'',birthLocation:null}} hasPendingInvitation={false} onAuthenticated={noop} onClearPendingForm={noop}
        onClose={noop} onEmailConfirmationRequired={noop} onSavePendingForm={noop} presentation='dialog'/> :
      <div className='full-chart__wheel'><SkyWheel positions={positions} transitPositions={positions} aspects={[]}/></div>);
  ` }, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' }, external: ['module'] });
  harness = result.outputFiles.find(file => !file.path.endsWith('.css'))!.text;
});

for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
  test(`mobile CSS audit ${width} ${theme}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 844 });
    await bundledPublications(page);
    await page.route('**/api/content-reader', route => route.request().postDataJSON()?.keys?.includes('article/guide/mobile-css-qa')
      ? route.fulfill({ json: readerResponse([{
        id: 'mobile-css-qa', content_key: 'article/guide/mobile-css-qa', headline: 'A complete synthetic reading with a longer title',
        body: Array.from({ length: 14 }, (_, i) => `Paragraph ${i + 1}. Complete synthetic reading text stays readable while navigating and scrolling.`).join('\n\n'),
        surface: 'education', mode: 'article', status: 'LIVE', lane: 'serving', review_state: null, updated_at: '2026-11-18T12:00:00Z'
      }]) }) : route.fallback());
    await page.addInitScript(theme => {
      localStorage.setItem('tldrastro:theme', theme);
      localStorage.setItem('tldrastro:pageAnimations', 'off');
    }, theme);
    const dist = process.env.PLAYWRIGHT_DIST_ROOT ?? 'apps/web/dist';
    const manifest = JSON.parse(readFileSync(`${dist}/.vite/manifest.json`, 'utf8'));
    await page.route('**/__mobile-css-qa?**', route => route.fulfill({ contentType: 'text/html', body:
      `<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${[...manifest['index.html'].css, manifest['src/styles.css'].file].map(file => `<link rel="stylesheet" href="/${file}">`).join('')}</head><body><main id="root"></main><script>${harness}</script></body></html>` }));

    await page.goto('/#articles');
    await expect(page.getByRole('heading', { name: 'Articles & Guides', exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('.brand-dot')).toBeVisible();
    if (width >= 390) await expect(page.locator('.brand-word')).toBeVisible();
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    const close = page.getByRole('dialog', { name: 'Navigation', exact: true }).getByRole('button', { name: 'Close menu', exact: true });
    await expect(close).toBeVisible();
    await expect(close.locator('svg')).toHaveCSS('width', '24px');
    await expect(close.locator('svg')).toHaveCSS('height', '24px');
    if (width <= 800) {
      await expect.poll(() => page.locator('.site-menu-sheet').evaluate(el => {
        const box = el.getBoundingClientRect();
        return { top: Math.round(box.top), bottom: Math.round(box.bottom), height: innerHeight, left: Math.round(box.left), right: Math.round(box.right), width: innerWidth };
      })).toEqual({ top: 0, bottom: 844, height: 844, left: 0, right: width, width });
    }
    await page.screenshot({ path: info.outputPath('menu.png') });
    await close.click();
    await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
    await page.reload();
    await expect(page.locator('.brand-dot')).toBeVisible();
    await page.goto('/#articles/article%2Fguide%2Fmobile-css-qa');
    await expect(page.getByRole('heading', { name: 'A complete synthetic reading with a longer title', exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(() => page.locator('.topbar').evaluate(el => getComputedStyle(el, '::before').backgroundImage)).not.toBe('none');
    await expect.poll(() => page.locator('.floating-back-button').evaluate(el => {
      const box = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
    if (width >= 390) await expect(page.locator('.brand-word')).toBeVisible();
    await page.screenshot({ path: info.outputPath('scrolled-subpage.png') });

    await page.goto('/__mobile-css-qa?view=auth');
    await expect(page.locator('.auth-flow-close > svg')).toHaveCSS('width', '24px');
    await expect(page.locator('.auth-flow-close > svg')).toHaveCSS('height', '24px');
    await page.screenshot({ path: info.outputPath('auth.png') });

    await page.goto('/__mobile-css-qa?view=menu');
    await expect(page.getByText('Synthetic Reader With a Long Name', { exact: true })).toBeVisible();
    await expect.poll(() => page.locator('.site-menu-profile').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('long-profile-menu.png') });
    if (width <= 800) {
      for (const height of [568, 1000]) {
        await page.setViewportSize({ width, height });
        await expect.poll(() => page.locator('.site-menu-sheet').evaluate(el => Math.round(el.getBoundingClientRect().bottom))).toBe(height);
        await page.getByRole('menuitem', { name: 'Settings', exact: true }).scrollIntoViewIfNeeded();
        await expect(page.getByRole('menuitem', { name: 'Settings', exact: true })).toBeInViewport();
      }
      await page.setViewportSize({ width, height: 844 });
    }

    await page.goto('/__mobile-css-qa?view=wheel');
    const images = page.locator('.planet-glyph-image');
    await expect(images).toHaveCount(10);
    const filter = await images.first().evaluate(el => getComputedStyle(el).filter);
    if (theme === 'dark') expect(filter).not.toBe('none');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: info.outputPath('transit-wheel.png') });
    const expectPaintedGlyphs = async (dark: boolean) => {
      for (const glyph of await images.all()) {
        const png = PNG.sync.read(await glyph.screenshot());
        let contrasting = 0;
        for (let i = 0; i < png.data.length; i += 4) {
          const lightness = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
          if (dark ? lightness > 150 : lightness < 180) contrasting++;
        }
        expect(contrasting, 'The actual painted glyph must contrast with its wheel, including in WebKit').toBeGreaterThan(1);
      }
    };
    await expectPaintedGlyphs(theme === 'dark');
    await page.evaluate(() => document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    await page.screenshot({ path: info.outputPath('transit-wheel-theme-switched.png') });
    await expectPaintedGlyphs(theme !== 'dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
