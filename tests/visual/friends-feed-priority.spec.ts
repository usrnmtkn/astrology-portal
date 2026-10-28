import { test, expect } from '../helpers/polish-test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

for (const [width, theme] of [[390, 'dark'], [1440, 'light']] as const) test(`Original feed layout keeps exact aspects visible ${width} ${theme}`, async ({ page }) => {
  const result = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
    import {FriendsFeed} from './apps/web/src/features/friends/FriendsFeed';
    const base={friendId:'alex-chart',friendName:'Alex',source:'charts',startsAt:'2026-10-20T12:00:00Z',endsAt:'2026-11-01T12:00:00Z',orb:'1°',exactAt:[]};
    const rows=[
      {...base,id:'late-moon',title:'Moon sextile Alex’s natal Mars',aspect:'sextile',priorityIndex:1,exactAt:['2026-10-26T03:45:00Z'],body:'Moon–Mars fixture opening. Action and feeling. Moon–Mars fixture ending.'},
      {...base,id:'main',title:'Saturn square Alex’s natal Sun',aspect:'square',priorityIndex:0,body:'Saturn–Sun fixture opening. This complete existing reading stays intact. Saturn–Sun fixture ending.'},
      {...base,id:'early-moon',title:'Moon sextile Alex’s natal Sun',aspect:'sextile',priorityIndex:2,exactAt:['2026-10-25T11:00:00Z'],body:'Moon–Sun fixture opening. Mood and direction. Moon–Sun fixture ending.'},
      {...base,id:'jordan',friendId:'jordan-chart',friendName:'Jordan',title:'Venus trine Jordan’s natal Moon',aspect:'trine',priorityIndex:0,startsAt:'2026-10-24T12:00:00Z',body:'Jordan fixture reading.'}
    ];
    function Fixture(){const [selected,setSelected]=useState(null);const [state,setState]=useState('ready');return <main className='app-shell mode-friends'><section className='friends-page page-shell'>
      <h1>Friends</h1><button className="secondary-button" onClick={()=>setState('empty')}>Empty fixture</button><button className="secondary-button" onClick={()=>setState('loading')}>Loading fixture</button><button className="secondary-button" onClick={()=>setState('error')}>Error fixture</button>
      {selected?<article aria-label='Full fixture reading'><h2>{selected.title}</h2><p>{selected.body}</p><button className="secondary-button" onClick={()=>setSelected(null)}>Back to feed</button></article>:
      <FriendsFeed cards={state==='empty'?[]:rows.map(card=>({...card,onOpen:()=>setSelected(card)}))} filter='all' now='2026-10-25T16:00:00Z' timeZone='America/New_York' loading={state==='loading'} error={state==='error'} onRetry={()=>setState('ready')} charts={[]} chartsLoading={false} onOpenChart={()=>{}} pairForecast={<div>Shared relationship fixture</div>}/>}
      </section></main>};createRoot(document.getElementById('root')).render(<Fixture/>);
  ` }, bundle: true, write: false, format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false }) } });
  const manifest = JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT ?? 'apps/web/dist'}/.vite/manifest.json`, 'utf8'));
  const css = [...new Set<string>([manifest['src/styles.css'].file, ...(manifest['src/routes/FriendsRoute.tsx'].css ?? []), ...(manifest['src/features/friends/FriendsWorkspaceShell.tsx'].css ?? []), ...Object.values(manifest).filter((entry: any) => entry.isEntry).flatMap((entry: any) => entry.css ?? [])])];
  await page.setViewportSize({ width, height: 1100 });
  await page.route('**/__today-priority', route => route.fulfill({ contentType: 'text/html', body: `<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(path => `<link rel="stylesheet" href="/${path}">`).join('')}</head><body><div id="root"></div><script type="module">${result.outputFiles[0].text}</script></body></html>` }));
  await page.goto('/__today-priority');
  const today = page.getByRole('region', { name: 'Today', exact: true });
  await expect(page.locator('.friends-feed-timeline > .friends-feed-group > h2')).toHaveText(['Today', 'Yesterday', 'Tue, Oct 20']);
  await expect(page.locator('.friends-person-day, .friends-feed-disclosure, .friends-feed-explanation')).toHaveCount(0);
  await expect(page.locator('.friends-feed-timeline h3')).toHaveCount(0);
  await expect(page.getByText(/Main influence/)).toHaveCount(0);
  await expect(page.locator('.friends-timing-card')).toHaveCount(4);
  await expect(today.locator('.friends-timing-card')).toHaveCount(2);
  await expect(today.locator('.friends-timing-card strong')).toHaveText(['Moon sextile Alex’s natal Mars', 'Moon sextile Alex’s natal Sun']);
  await expect(today.locator('.friends-timing-card small').first()).toContainText('Exact 11:45 PM EDT');
  await expect(today.locator('.friends-timing-card small').nth(1)).toContainText('Exact 7:00 AM EDT');
  const relationship = page.getByText('Shared relationship fixture', { exact: true });
  await expect(relationship).toBeVisible();
  expect((await relationship.boundingBox())!.y).toBeLessThan((await today.boundingBox())!.y);
  const titleStyle = await today.locator('h2').evaluate(el => { const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing]; });
  const yesterdayStyle = await page.getByRole('region', { name:'Yesterday', exact:true }).locator('h2').evaluate(el => { const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing]; });
  expect(titleStyle).toEqual(yesterdayStyle);
  await today.locator('.friends-timing-card').first().click();
  await expect(page.getByRole('article', { name: 'Full fixture reading', exact: true })).toContainText('Moon–Mars fixture opening. Action and feeling. Moon–Mars fixture ending.');
  await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
  await today.locator('.friends-timing-card').nth(1).click();
  await expect(page.getByRole('article', { name: 'Full fixture reading', exact: true })).toContainText('Moon–Sun fixture opening. Mood and direction. Moon–Sun fixture ending.');
  await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/friends-restored-feed-${width}-${theme}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Empty fixture', exact: true }).click();
  await expect(page.getByText('No transit readings are available for this date.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Loading fixture', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Loading transits…');
  await expect(page.locator('.loading-pattern--feed')).toBeVisible();
  await page.getByRole('button', { name: 'Error fixture', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('The transit readings could not load.');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(today.locator('.friends-timing-card')).toHaveCount(2);
});
