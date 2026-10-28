import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { expectReadableTheme } from '../helpers/theme-contrast';

async function componentHarness() {
  const result = await build({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {SkyDebilityCard} from './apps/web/src/features/sky/SkyDebilityCard';
    import {ProfileAvatar} from './apps/web/src/components/ProfileAvatar';
    const names=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
    const qualified=['Libra','Scorpio','Pisces','Scorpio','Cancer','Gemini','Aries'];
    const neutral=['Leo','Cancer','Gemini','Taurus','Aries','Sagittarius','Capricorn'];
    const root=createRoot(document.getElementById('root'));
    window.renderCount=n=>root.render(<main className='app-shell'><section className='portal-grid page-shell sky-page sky-layout chart-layout'>
      <SkyDebilityCard positions={names.map((planet,i)=>({planet,sign:i<n?qualified[i]:neutral[i],motion:['Mercury','Venus','Saturn'].includes(planet)?'retrograde':'direct'}))}/>
      <section className='placement-section'><header className='placements-heading'><h2>Placements</h2></header></section>
    </section></main>);
    window.renderAvatars=()=>root.render(<main className='app-shell friends-page'><div className='friends-timing-card'><span className='friends-timing-card__avatar'><ProfileAvatar name='Fixture Reader' email='' avatarUrl='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="52" height="52"%3E%3Crect width="52" height="52" fill="tan"/%3E%3C/svg%3E' aspect='square'/></span></div></main>);
    window.renderCount(0);
  `, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, format: 'iife', jsx: 'automatic', loader: { '.css': 'empty' }, define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false }) } });
  const manifest = JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT ?? 'apps/web/dist'}/.vite/manifest.json`, 'utf8'));
  const css = [...new Set<string>([manifest['src/styles.css'].file, ...(manifest['src/routes/FriendsRoute.tsx'].css ?? []), ...(manifest['src/features/friends/FriendsWorkspaceShell.tsx'].css ?? []), ...Object.values(manifest).filter((entry: any) => entry.isEntry || entry.name === 'App').flatMap((entry: any) => entry.css ?? [])])];
  return { script: result.outputFiles[0].text, links: css.map(path => `<link rel="stylesheet" href="/${path}">`).join('') };
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) test(`Handoff v4 dignity zero through seven ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1100 }); const { script, links } = await componentHarness();
  await page.route('**/__dignity-handoff', route => route.fulfill({ contentType: 'text/html', body: `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${links}</head><body><div id="root"></div><script>${script}</script></body></html>` }));
  await page.goto('/__dignity-handoff'); await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.placements-heading h2')).toHaveText('Placements'); await expect(page.locator('.sky-debility-ledger')).toHaveCount(0);
  for (let count = 1; count <= 7; count++) {
    await page.evaluate(value => (window as any).renderCount(value), count);
    const effort = page.locator('.sky-debility-ledger'), cards = effort.locator('.sky-debility-card'); await expect(cards).toHaveCount(count);
    await expect(effort.locator('h3')).toHaveText('Things may take more effort right now');
    await expect(effort.locator('h3')).toHaveCSS('font-size', '36px');
    await expect(effort.locator('.sky-today-ledger__copy p').last()).toContainText(count === 1 ? 'One of the seven classical planets is' : `${['','','Two','Three','Four','Five','Six','Seven'][count]} of the seven classical planets are`);
    for(const paragraph of await effort.locator('.sky-today-ledger__copy p').all()){await expect(paragraph).toHaveCSS('font-family',/Newsreader/);await expect(paragraph).toHaveCSS('font-size','19px');await expect(paragraph).toHaveCSS('line-height','28.5px');await expect(paragraph).toHaveCSS('font-weight','400');}
    await expect(effort.locator('mark')).toHaveCount(0); await expect(cards.locator('strong')).toHaveText(['Sun in Libra', 'Moon in Scorpio', 'Mercury Rx in Pisces', 'Venus Rx in Scorpio', 'Mars in Cancer', 'Jupiter in Gemini', 'Saturn Rx in Aries'].slice(0, count));
    if (count >= 3) await expect(cards.nth(2)).toContainText('Detriment and fall');
    const grid = (await effort.locator('.sky-debility-cards').boundingBox())!, first = (await cards.first().boundingBox())!;
    if (width === 1440) {
      expect(Math.abs(first.width - (grid.width - 32) / 3)).toBeLessThan(1);
      const title = (await effort.locator('h3').boundingBox())!; expect(Math.abs(title.x - grid.x)).toBeLessThan(1);
      await expect(effort).toHaveCSS('padding', '56px 48px');
      const titleColor = await cards.first().locator('strong').evaluate(node => getComputedStyle(node).color); await cards.first().hover(); await expect(cards.first().locator('strong')).toHaveCSS('color', titleColor);
      if (count >= 4) expect((await cards.nth(3).boundingBox())!.y).toBeGreaterThan(first.y);
    } else {
      if (count > 1) expect((await cards.nth(1).boundingBox())!.y).toBeGreaterThan(first.y + first.height);
      const explain = (await effort.getByRole('button', { name: 'What is dignity?', exact: true }).boundingBox())!; expect(explain.y).toBeGreaterThanOrEqual(grid.y + grid.height);
    }
    await expectReadableTheme(page, '.sky-debility-ledger h3, .sky-today-ledger__copy p, .sky-debility-card strong, .sky-debility-card__copy > span');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: `test-results/handoff-v4-seven-${width}-${theme}.png`, fullPage: true });
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) test(`Handoff v4 shared avatar badge ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); const { script, links } = await componentHarness();
  await page.route('**/__avatar-handoff', route => route.fulfill({ contentType: 'text/html', body: `<html data-theme="${theme}"><head>${links}</head><body><div id="root"></div><script>${script}</script></body></html>` }));
  await page.goto('/__avatar-handoff'); await page.evaluate(() => (window as any).renderAvatars());
  const avatar = page.locator('.profile-avatar'), badge = avatar.locator('.profile-avatar__aspect');
  await expect(avatar).toHaveCSS('width', '52px'); await expect(avatar).toHaveCSS('overflow', 'visible');
  await expect(badge).toHaveCSS('width', '22px'); await expect(badge).toHaveCSS('height', '22px');
  await expect(badge).toHaveCSS('right', '-6px'); await expect(badge).toHaveCSS('bottom', '-6px'); await expect(badge).toHaveCSS('font-size', '13px');
  await expect(avatar.locator('img')).toHaveCSS('border-radius', '50%');
  const photo = (await avatar.boundingBox())!, pip = (await badge.boundingBox())!;
  expect(pip.x).toBeGreaterThan(photo.x + photo.width / 2); expect(pip.y).toBeGreaterThan(photo.y + photo.height / 2);
  expect(pip.x + pip.width).toBeGreaterThan(photo.x + photo.width);
  await page.screenshot({ path: `test-results/handoff-v4-avatar-${width}-${theme}.png` });
});
