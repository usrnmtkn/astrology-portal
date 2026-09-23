import { expect, test, type Page } from '@playwright/test';
import { build } from 'esbuild';
let script = '';
let styles = '';
test.beforeAll(async () => {
  const output = await build({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {FriendTransitsTab} from './apps/web/src/features/friends/FriendTransitsTab';
    import './apps/web/src/styles/theme.css';
    import './apps/web/src/styles/friends.css';
    const h=window.friendReportHarness={row:{status:'DRAFT',body:''},calls:[],load:async()=>h.row};
    const root=createRoot(document.getElementById('root'));
    const brief={friendName:'Fixture friend',primaryThemes:[],relationshipActivations:[],houseContext:[],daily:null,longerCycles:[],activePatterns:[],hasAnyTransit:true};
    h.render=(id='social:fixture',date='2026-09-11',reading=null)=>root.render(<FriendTransitsTab brief={brief} reading={reading} readingStatus={reading?'ready':'idle'} readingAvailable readingSubjectId={id} readingTargetDate={date} patternTimingOverrides={{}} onGenerateReading={()=>{throw Error('must reuse saved report')}} onOpenBondTransit={()=>{}} onOpenHouseTransit={()=>{}} onOpenPersonalTransit={()=>{}}/>);
    h.render();`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, outdir: 'out', format: 'iife', platform: 'browser', define: { 'import.meta.env': '{}' }, jsx: 'automatic', plugins: [{ name: 'report-transport', setup(b) {
      b.onResolve({filter:/services\/userGeneratedContent$/},()=>({path:'transport',namespace:'fixture'}));
      b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export async function loadUserGeneratedInterpretation(input){const h=window.friendReportHarness;h.calls.push(input);return h.load(input);}'}));
    } }] });
  script=output.outputFiles.find(file => file.path.endsWith('.js'))!.text;
  styles=output.outputFiles.find(file => file.path.endsWith('.css'))!.text;
});
async function openProfile(page: Page, theme = 'light') {
  await page.route('**/__friend-report-harness',route=>route.fulfill({contentType:'text/html',body:`<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${styles}</style></head><body><div id="root"></div><script>${script}</script></body></html>`}));
  await page.goto('/__friend-report-harness');
}

test('profile URL hydrates a queued report, follows its completion and changes date without a new generation',async({page})=>{
  page.on('pageerror', error => console.error(error.message));
  await openProfile(page);
  await expect(page.getByRole('status')).toContainText('Preparing');
  await expect(page.locator('.friend-transit-reading [data-beam]')).toHaveCount(1);
  expect(await page.evaluate(()=>(window as any).friendReportHarness.calls[0])).toEqual({subjectType:'friend_transit_reading',subjectId:'social:fixture',contentKey:'friend-transit-reading/social:fixture/2026-09-11',targetDate:'2026-09-11'});
  await page.evaluate(()=>(window as any).friendReportHarness.row={status:'DRAFT',body:'Completed saved fixture report.',headline:'Saved fixture',summary:null});
  await expect(page.getByRole('button',{name:'View report',exact:true})).toBeVisible();
  await expect(page.getByText('Completed saved fixture report.',{exact:true})).toHaveCount(0);
  await expect(page.locator('[data-beam]')).toHaveCount(0);
  await page.evaluate(()=>{const h=(window as any).friendReportHarness;h.row={status:'ERROR',body:''};h.render('social:fixture','2026-09-12');});
  await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'View report',exact:true})).toHaveCount(0);
  await expect(page.locator('[data-beam]')).toHaveCount(0);
  await expect(page.getByText('Completed saved fixture report.',{exact:true})).toBeHidden();
  expect(await page.evaluate(()=>(window as any).friendReportHarness.calls.at(-1).targetDate)).toBe('2026-09-12');
});

const report = {
  id: '00000000-0000-4000-8000-000000000203', subject_type: 'friend_transit_reading',
  subject_id: 'social:fixture', content_key: 'friend-transit-reading/social:fixture/2026-09-11',
  status: 'DRAFT', target_date: '2026-09-11', headline: "What's going on with Fixture friend right now?",
  summary: 'Saved report summary appears only in Reports.',
  body: 'Complete saved report opening.\n\nComplete saved report ending.',
  created_at: '2026-09-11T12:00:00Z', updated_at: '2026-09-11T12:00:00Z'
};

for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
  test(`completed Friends report opens in Reports only, ${width}px ${theme}`, async ({page}) => {
    await page.setViewportSize({width, height: 1000});
    const user = { id: 'synthetic-owner', aud: 'authenticated', role: 'authenticated', app_metadata: {provider: 'email'}, user_metadata: {} };
    const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL ?? 'https://visual-smoke.supabase.test').hostname.split('.')[0]}-auth-token`;
    await page.addInitScript(({user, storageKey, theme}) => {
      localStorage.setItem(storageKey, JSON.stringify({access_token: 'fixture', refresh_token: 'fixture', expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user}));
      localStorage.setItem('tldrastro:theme', theme);
    }, {user, storageKey, theme});
    const errors: string[] = [];
    let generationCalls = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/auth/v1/**', route => route.fulfill({json: user}));
    await page.route('**/api/**', route => {
      generationCalls++;
      return route.fulfill({status: 409, json: {error: 'No generation during report navigation'}});
    });
    await page.route('**/rest/v1/**', route => {
      const isObject = route.request().headers().accept?.includes('vnd.pgrst.object');
      const rows = new URL(route.request().url()).pathname.endsWith('/user_generated_interpretations') ? [report] : [];
      return route.fulfill({json: isObject ? rows[0] ?? null : rows});
    });
    await openProfile(page, theme);
    // Exercise both a just-completed request and the saved row loaded on return.
    await page.evaluate(row => {
      const h = (window as any).friendReportHarness;
      h.row = row;
      h.render('social:fixture', '2026-09-11', row);
    }, report);
    const button = page.getByRole('button', {name: 'View report', exact: true});
    await expect(button).toBeVisible();
    await expect(page.getByText(report.summary, {exact: true})).toHaveCount(0);
    await expect(page.getByText('Complete saved report opening.', {exact: true})).toHaveCount(0);
    await page.evaluate(() => (window as any).friendReportHarness.render());
    await expect(button).toBeVisible();
    await expect(page.locator('.friend-transit-reading')).not.toContainText(report.summary);
    await expect(page.locator('.friend-transit-reading')).not.toContainText('Complete saved report ending.');
    await button.click();
    await expect(page).toHaveURL(/\/reports\/2026-09-11-fixture-friend$/);
    const verifyReader = async () => {
      await expect(page.getByRole('heading', {level: 1, name: report.headline, exact: true})).toBeVisible();
      await expect(page.locator('.article-tldr__copy')).toHaveText(report.summary);
      await expect(page.locator('.saved-generated-report__body .article-section')).toHaveText(report.body, {useInnerText: true});
    };
    await verifyReader();
    await page.reload();
    await verifyReader();
    expect(errors).toEqual([]);
    expect(generationCalls).toBe(0);
  });
}
