import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
let script = '';
let styles = '';
test.beforeAll(async () => {
  const output = await build({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {FriendTransitsTab} from './apps/web/src/features/friends/FriendTransitsTab';
    const h=window.friendReportHarness={row:{status:'DRAFT',body:''},calls:[],load:async()=>h.row};
    const root=createRoot(document.getElementById('root'));
    const brief={friendName:'Fixture friend',primaryThemes:[],relationshipActivations:[],houseContext:[],daily:null,longerCycles:[],activePatterns:[],hasAnyTransit:true};
    h.render=(id='social:fixture',date='2026-09-11')=>root.render(<FriendTransitsTab brief={brief} readingAvailable readingSubjectId={id} readingTargetDate={date} patternTimingOverrides={{}} onGenerateReading={()=>{throw Error('must reuse saved report')}} onOpenBondTransit={()=>{}} onOpenHouseTransit={()=>{}} onOpenPersonalTransit={()=>{}}/>);
    h.render();`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, outdir: 'out', format: 'iife', platform: 'browser', define: { 'import.meta.env': '{}' }, jsx: 'automatic', plugins: [{ name: 'report-transport', setup(b) {
      b.onResolve({filter:/services\/userGeneratedContent$/},()=>({path:'transport',namespace:'fixture'}));
      b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export async function loadUserGeneratedInterpretation(input){const h=window.friendReportHarness;h.calls.push(input);return h.load(input);}'}));
    } }] });
  script=output.outputFiles.find(file => file.path.endsWith('.js'))!.text;
  styles=output.outputFiles.find(file => file.path.endsWith('.css'))!.text;
});
test('profile URL hydrates a queued report, follows its completion and changes date without a new generation',async({page})=>{
  await page.route('**/__friend-report-harness',route=>route.fulfill({contentType:'text/html',body:`<html><head><style>${styles}</style></head><body><div id="root"></div><script>${script}</script></body></html>`}));
  page.on('pageerror', error => console.error(error.message));
  await page.goto('/__friend-report-harness');
  await expect(page.getByRole('status')).toContainText('Preparing');
  await expect(page.locator('.friend-transit-reading [data-beam]')).toHaveCount(1);
  expect(await page.evaluate(()=>(window as any).friendReportHarness.calls[0])).toEqual({subjectType:'friend_transit_reading',subjectId:'social:fixture',contentKey:'friend-transit-reading/social:fixture/2026-09-11',targetDate:'2026-09-11'});
  await page.evaluate(()=>(window as any).friendReportHarness.row={status:'DRAFT',body:'Completed saved fixture report.',headline:'Saved fixture',summary:null});
  await expect(page.getByText('Completed saved fixture report.',{exact:true})).toBeVisible();
  await expect(page.locator('[data-beam]')).toHaveCount(0);
  await page.evaluate(()=>{const h=(window as any).friendReportHarness;h.row={status:'ERROR',body:''};h.render('social:fixture','2026-09-12');});
  await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
  await expect(page.locator('[data-beam]')).toHaveCount(0);
  await expect(page.getByText('Completed saved fixture report.',{exact:true})).toBeHidden();
  expect(await page.evaluate(()=>(window as any).friendReportHarness.calls.at(-1).targetDate)).toBe('2026-09-12');
});
