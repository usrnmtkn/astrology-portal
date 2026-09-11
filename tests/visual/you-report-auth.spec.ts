import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
let script = '';
test.beforeAll(async () => {
  const output = await build({stdin:{contents:`
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {YouReportActions} from './apps/web/src/features/you/YouReportActions';
    const h = window.reportHarness = {userId:null, items:[], reads:0, creates:0, read:async()=>h.items, create:async()=>({status:'queued'}), emit:null};
    h.client = { auth: { onAuthStateChange(cb) {
      h.emit = (id) => { h.userId=id; cb('SIGNED_IN', id ? {user:{id}} : null); };
      return {data:{subscription:{unsubscribe(){}}}};
    } } };
    const root=createRoot(document.getElementById('root'));
    const summary={headline:'Test',summary:'Synthetic report fixture.',status:'ready'};
    const assembly={specialSections:[],derivation:{targetDate:'2026-09-11',qualifyingTransits:[{}]}};
    const reading={body:'Synthetic weekly fixture.',dayLabel:'Test',sourceUnits:[]};
    const weekly={status:'ready',weekStart:'2026-09-07',weekEnd:'2026-09-13',horoscope:reading,aspects:[]};
    h.render=(ready=true,date='September 11')=>root.render(<YouReportActions transitDateLabel={date} dailyUpdateSummary={ready?summary:{...summary,status:'loading'}} dailyHoroscopeAssembly={assembly} weeklyHoroscopeAssembly={ready?weekly:{...weekly,status:'loading'}}/>);
    h.render();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',plugins:[{name:'isolated-session',setup(b){
      b.onResolve({filter:/services\/auth$/},()=>({path:'auth',namespace:'fixture'}));
      b.onResolve({filter:/services\/reportLibrary$/},()=>({path:'library',namespace:'fixture'}));
      b.onResolve({filter:/\.css$/},()=>({path:'css',namespace:'fixture'}));
      b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='auth'?'export const getSupabaseClient=async()=>window.reportHarness.client;':path==='library'?'export async function listReportLibrary(options){const h=window.reportHarness;h.reads++;if(options.expectedUserId!==h.userId)throw Error("session mismatch");return h.read();}':''}));
      // Keep the real brief builders, replace only the network request boundary.
      b.onLoad({filter:/youTransitReports\.ts$/},async ({path})=>{const fs=await import('node:fs/promises');let source=await fs.readFile(path,'utf8');source=source.slice(0,source.indexOf('export async function requestYouTransitReport'))+'export async function requestYouTransitReport(brief,userId){const h=window.reportHarness;h.creates++;if(userId!==h.userId)throw Error("session mismatch");return h.create();}';return {contents:source,loader:'ts'};});
    }}]});
  script=output.outputFiles[0].text;
});
test.beforeEach(async ({page})=>{
  await page.route('**/__report-auth-harness',route=>route.fulfill({contentType:'text/html',body:`<html><body><div id="root"></div><script>${script}</script></body></html>`}));
  await page.goto('/__report-auth-harness');
});

test('waits for recovered session and preserves ready controls during brief rehydration',async({page})=>{
  await expect(page.getByRole('button',{name:'Day report is loading',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=> (window as any).reportHarness.reads)).toBe(0);
  await page.evaluate(()=>{const h=(window as any).reportHarness;h.items=[{reportKind:'you_day_reading',targetDate:'2026-09-11',status:'ready',route:'/reports/day',updatedAt:'one'}];h.emit('synthetic-owner');});
  await expect(page.getByRole('button',{name:'Read day report',exact:true})).toBeEnabled();
  await page.evaluate(()=>(window as any).reportHarness.render(false));
  await expect(page.getByRole('button',{name:'Read day report',exact:true})).toBeEnabled();
  await page.evaluate(()=>(window as any).reportHarness.render(true));
  await expect(page.getByRole('button',{name:'Read day report',exact:true})).toBeEnabled();
  await page.evaluate(()=>(window as any).reportHarness.emit(null));
  await expect(page.getByRole('status')).toHaveText('Sign in to create or read your reports.');
  await expect(page.getByRole('button',{name:'Create day report',exact:true})).toBeDisabled();
});

test('ignores stale account reads and pending request completions after sign-out',async({page})=>{
  await page.evaluate(()=>{const h=(window as any).reportHarness;h.read=()=>new Promise(resolve=>h.oldRead=resolve);h.emit('owner-a');});
  await expect.poll(()=>page.evaluate(()=>(window as any).reportHarness.reads)).toBe(1);
  await page.evaluate(()=>{const h=(window as any).reportHarness;h.read=async()=>[];h.emit('owner-b');});
  await expect(page.getByRole('button',{name:'Create day report',exact:true})).toBeEnabled();
  await page.evaluate(()=>{(window as any).reportHarness.oldRead([{reportKind:'you_day_reading',targetDate:'2026-09-11',status:'ready',route:'/reports/other-owner'}]);});
  await expect(page.getByRole('button',{name:'Create day report',exact:true})).toBeEnabled();
  await page.evaluate(()=>{const h=(window as any).reportHarness;h.create=()=>new Promise(resolve=>h.finish=resolve);});
  await page.getByRole('button',{name:'Create day report',exact:true}).click();
  await page.evaluate(()=>{const h=(window as any).reportHarness;h.emit(null);h.finish({status:'queued'});});
  await expect(page.getByRole('status')).toHaveText('Sign in to create or read your reports.');
  expect(await page.evaluate(()=>(window as any).reportHarness.creates)).toBe(1);
});

test('polling cannot replace a submitted retry with the earlier failed report',async({page})=>{
  await page.clock.install();
  await page.evaluate(()=>{const h=(window as any).reportHarness;h.items=[{reportKind:'you_day_reading',targetDate:'2026-09-11',status:'needs_attention',updatedAt:'old'}];h.create=()=>new Promise(resolve=>h.finish=resolve);h.emit('owner');});
  await expect(page.getByRole('button',{name:'Try day report again',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Try day report again',exact:true}).click();
  await page.clock.fastForward(2100);
  await expect(page.getByRole('button',{name:'Day report is loading',exact:true})).toBeDisabled();
  await page.evaluate(()=>(window as any).reportHarness.finish({status:'queued'}));
  await page.clock.fastForward(2100);
  await expect(page.getByRole('button',{name:'Day report is loading',exact:true})).toBeDisabled();
  await page.evaluate(()=>{const h=(window as any).reportHarness;h.items=[{reportKind:'you_day_reading',targetDate:'2026-09-11',status:'ready',route:'/reports/day',updatedAt:'new'}];});
  await page.clock.fastForward(2100);
  await expect(page.getByRole('button',{name:'Read day report',exact:true})).toBeEnabled();
});
