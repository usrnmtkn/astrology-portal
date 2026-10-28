import { expect, test } from '../helpers/polish-test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { expectReadableTheme } from '../helpers/theme-contrast';

async function feedHarness() {
  const result = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
    import {FriendsFeed} from './apps/web/src/features/friends/FriendsFeed';
    const opening='Complete fixture opening. ';const ending='Complete fixture final sentence.';
    const longBody=opening+'A long saved reading remains available when its preview ends. '.repeat(15)+ending;
    function Fixture(){const [selected,setSelected]=useState(null);return <main className='app-shell mode-friends'><section className='friends-page page-shell'>
      {selected?<article aria-label='Full fixture reading'><h1>{selected.title}</h1><p>{selected.body}</p><button className="secondary-button" onClick={()=>setSelected(null)}>Back to feed</button></article>:
      <FriendsFeed cards={[
        {id:'long',friendId:'fixture-long',source:'charts',friendName:'Fixture Reader',title:'A long transit title for a saved chart with several words and a detail that wraps naturally',body:longBody,startsAt:'2026-10-24T12:00:00Z',endsAt:'2027-01-29T12:00:00Z',exactAt:[],orb:'2°',aspect:'square'},
        {id:'unbroken',friendId:'fixture-token',source:'circle',friendName:'Fixture Photo',avatarUrl:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="52" height="52"%3E%3Ccircle cx="26" cy="26" r="26" fill="tan"/%3E%3C/svg%3E',title:'Unbroken'.repeat(18),body:'Short fixture reading.',startsAt:'2026-10-22T12:00:00Z',endsAt:'2026-11-02T12:00:00Z',exactAt:[],orb:'1°',aspect:'opposition'},
        {id:'jupiter',friendId:'fixture-jupiter',source:'charts',friendName:'Jupiter',friendNameStart:'Jupiter in Leo square '.length,title:"Jupiter in Leo square Jupiter's natal Jupiter",body:'Jupiter friend fixture reading.',startsAt:'2026-10-21T12:00:00Z',endsAt:'2026-10-31T12:00:00Z',exactAt:[],orb:'1°',aspect:'square'}
      ].map(card=>({...card,onOpen:()=>setSelected(card)}))} filter='all' now='2026-10-25T16:00:00Z' timeZone='America/New_York' loading={false} error={false} charts={[]} chartsLoading={false} onOpenChart={()=>{}}/>}
    </section></main>};createRoot(document.getElementById('root')).render(<Fixture/>);
  ` }, bundle: true, write: false, format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false }) } });
  const manifest = JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT ?? 'apps/web/dist'}/.vite/manifest.json`, 'utf8'));
  const css = [...new Set<string>([manifest['src/styles.css'].file, ...(manifest['src/routes/FriendsRoute.tsx'].css ?? []), ...(manifest['src/features/friends/FriendsWorkspaceShell.tsx'].css ?? []), ...Object.values(manifest).filter((entry: any) => entry.isEntry).flatMap((entry: any) => entry.css ?? [])])];
  return { script: result.outputFiles[0].text, links: css.map(path => `<link rel="stylesheet" href="/${path}">`).join('') };
}

for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) test(`Card typography, compact preview and complete detail ${width} ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1100 }); const { script, links } = await feedHarness();
  await page.route('**/__card-typography', route => route.fulfill({ contentType: 'text/html', body: `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${links}</head><body><div id="root"></div><script type="module">${script}</script></body></html>` }));
  await page.goto('/__card-typography'); await page.evaluate(() => document.fonts.ready);
  const cards = page.locator('.friends-timing-card'); await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    const title = card.locator('strong'), body = card.locator('.friends-timing-card__body'), action = card.locator('.card-read-more--icon');
    await expect(title).toHaveCSS('font-family', /Newsreader/); await expect(title).toHaveCSS('font-size', '26px'); await expect(title).toHaveCSS('font-weight', '400'); await expect(title).toHaveCSS('line-height', '29.9px');
    await expect(body).toHaveCSS('font-family', /Newsreader/); await expect(body).toHaveCSS('font-size', '19px'); await expect(body).toHaveCSS('line-height', '28.5px'); await expect(body).toHaveCSS('font-weight', '400');
    await expect(card.locator('small')).toHaveCSS('font-size', '14px'); await expect(card.locator('small')).toHaveCSS('font-family', /system-ui/);
    await expect(action).toHaveCSS('width', '44px'); await expect(action).toHaveCSS('height', '44px'); await expect(action).toHaveCSS('position', 'static');
    await expect(card.locator('.profile-avatar')).toHaveCSS('width', '52px'); await expect(card.locator('.profile-avatar__aspect')).toHaveCSS('width', '22px');
    const outer = (await card.boundingBox())!, preview = (await body.boundingBox())!, arrow = (await action.boundingBox())!, heading = (await title.boundingBox())!;
    const padding = await card.evaluate(node => parseFloat(getComputedStyle(node).paddingLeft));
    expect(Math.abs(preview.x - outer.x - padding)).toBeLessThan(1); expect(Math.abs(preview.width - outer.width + padding * 2)).toBeLessThan(1);
    expect(arrow.y).toBeGreaterThanOrEqual(preview.y + preview.height + 15); expect(heading.x + heading.width).toBeLessThanOrEqual(outer.x + outer.width - padding + 1);
    await expect(body).toHaveCSS('overflow', 'hidden'); await expect(body).toHaveCSS('-webkit-line-clamp', '4');
    expect(preview.height).toBeLessThanOrEqual(120);
  }
  await expect(cards.first().locator('.friends-timing-card__body')).toContainText('Complete fixture final sentence.');
  await expect(cards.filter({ hasText: 'Short fixture reading.' }).locator('.friends-timing-card__body')).toHaveCSS('height', '28.5px');
  const jupiter = cards.filter({ hasText: 'Jupiter friend fixture reading.' });
  await expect(jupiter.locator('strong')).toHaveText("Jupiter in Leo square Jupiter's natal Jupiter");
  const friendName = jupiter.locator('.friends-timing-card__friend-name');
  await expect(friendName).toHaveCount(1); await expect(friendName).toHaveText('Jupiter');
  await expect(friendName).toHaveCSS('text-decoration-line', 'underline');
  await expect(jupiter.locator('strong')).toHaveCSS('text-decoration-line', 'none');
  expect(await friendName.evaluate(node => ({ before: node.previousSibling?.textContent, after: node.nextSibling?.textContent }))).toEqual({ before: 'Jupiter in Leo square ', after: "'s natal Jupiter" });
  await jupiter.screenshot({ path: `test-results/friends-name-underline-${width}-${theme}.png` });
  await expectReadableTheme(page, '.friends-timing-card strong, .friends-timing-card small, .friends-timing-card__body, .friends-timing-card .profile-avatar');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await cards.first().screenshot({ path: `test-results/card-typography-${width}-${theme}.png` });
  await cards.first().focus(); await page.keyboard.press('Enter');
  const full = page.getByRole('article', { name: 'Full fixture reading', exact: true });
  await expect(full).toContainText('Complete fixture opening.'); await expect(full).toContainText('Complete fixture final sentence.');
  await expect(full.locator('p')).toHaveCSS('overflow', 'visible');
  await full.getByRole('button', { name: 'Back to feed', exact: true }).click(); await expect(cards).toHaveCount(3);
  await jupiter.click(); await expect(full).toContainText('Jupiter friend fixture reading.');
});
