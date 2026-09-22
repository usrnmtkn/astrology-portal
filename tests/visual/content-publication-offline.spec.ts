import { readerResponse } from '../helpers/reader-response';
import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

test('offline retirement survives older snapshots, reload, and an already-open second tab', async ({ page, context }) => {
  const entry = `
    export * from './apps/web/src/content/contentPublicationState.ts';
    export { resolveCmsSurfaceOverride } from './apps/web/src/content/cmsSurfaceOverrides.ts';
  `;
  const bundled = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, format: 'esm', write: false,
    define: { 'import.meta.env': '{}' }, logLevel: 'silent' });
  await context.route('**/publication-qa', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Publication verification<script type="module">import * as qa from "/publication-qa.js"; window.qa=qa;</script></body></html>' }));
  await context.route('**/publication-qa.js', route => route.fulfill({ contentType: 'text/javascript', body: bundled.outputFiles[0].text }));
  await page.goto('/publication-qa');
  await page.waitForFunction(() => Boolean((window as any).qa));
  const other = await context.newPage(); await other.goto('/publication-qa');
  await other.waitForFunction(() => Boolean((window as any).qa));
  const key='cms/chart-placement-row/uranus';
  const live={content_key:key,state:'live',revision:1,row_id:'row-a',row_updated_at:'2026-09-07T18:00:00Z',updated_at:'2026-09-07T18:00:00Z'};
  await page.evaluate(record => (window as any).qa.installContentPublications([record]), live);
  await page.evaluate(record => (window as any).qa.installContentPublications([{...record,state:'retired',revision:2}]), live);
  await expect.poll(() => other.evaluate(key => (window as any).qa.isContentRetired(key),key)).toBe(true);
  await context.setOffline(true);
  await page.evaluate(record => (window as any).qa.installContentPublications([record]),live);
  expect(await page.evaluate(key => (window as any).qa.resolveCmsSurfaceOverride(null,[key,'cms/chart-placement-row/template']),key)).toMatchObject({unavailable:true,retired:true,body:''});
  await page.reload(); await page.waitForFunction(() => Boolean((window as any).qa));
  expect(await page.evaluate(key => (window as any).qa.isContentRetired(key),key)).toBe(true);
  expect(await page.evaluate(key => (window as any).qa.publicationAllowsContent(key,'row-a','2026-09-07T18:00:00Z'),key)).toBe(false);
  await context.setOffline(false);
  await page.evaluate(record => (window as any).qa.installContentPublications([{...record,revision:3}]),live);
  expect(await page.evaluate(key => (window as any).qa.publicationAllowsContent(key,'row-a','2026-09-07T18:00:00Z'),key)).toBe(true);
});

test('published Sky house writing loads independently of an obsolete mirror and stays retired offline', async ({ page, context }) => {
  const fs = await import('node:fs');
  const records = JSON.parse(fs.readFileSync('apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json','utf8')).hookRows;
  const record = records.find((row:any) => row.contentKey === 'house-horoscope-core/chiron/aries/house-1');
  expect(record).toBeTruthy();
  const publication={content_key:record.contentKey,state:'live',revision:1,row_id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',row_updated_at:'2026-09-07T18:00:00Z',updated_at:'2026-09-07T18:00:00Z'};
  const source={id:publication.row_id,content_key:record.contentKey,status:'LIVE',lane:'serving',review_state:null,target_date:null,provider:'tldrastro-fallback-architecture-v3-sky-placement',updated_at:publication.row_updated_at,sections:{packageRecord:record},source_snapshot:{packageVersion:'v3-2026-08-27a'}};
  const bundled=await build({stdin:{contents:`export * from './apps/web/src/content/contentPublicationState.ts'; export {loadFallbackArchitectureV3SkyPlacementDashboardBundle} from './apps/web/src/services/generatedContent.ts'; export {loadSkyPlacementFallbackArchitectureV3Bundle,installSkyPlacementFallbackArchitectureV3Bundle,fallbackV3HookBody} from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';`,resolveDir:process.cwd()},bundle:true,format:'esm',write:false,define:{'import.meta.env':JSON.stringify({VITE_SUPABASE_URL:'https://publication.supabase.test',VITE_SUPABASE_ANON_KEY:'qa-key'})},logLevel:'silent'});
  await context.route('**/publication-sky-qa',route=>route.fulfill({contentType:'text/html',body:'<html><body>Sky publication verification<script type="module">import * as qa from "/publication-sky-qa.js";window.qa=qa;</script></body></html>'}));
  await context.route('**/publication-sky-qa.js',route=>route.fulfill({contentType:'text/javascript',body:bundled.outputFiles[0].text}));
  await context.route('**/rest/v1/content_publications*',route=>route.fulfill({json:[publication]}));
  await context.route('**/api/content-reader',route=>{
    expect(route.request().postDataJSON().ids).toContain(publication.row_id);
    return route.fulfill({json:readerResponse([source])});
  });
  await context.route('**/content-studio-last-known-good.json',route=>route.fulfill({json:{schema:'content-studio-last-known-good-v2',rowCount:1,rows:[source],publications:[publication]}}));
  await page.goto('/publication-sky-qa');await page.waitForFunction(()=>Boolean((window as any).qa));
  const live=await page.evaluate(async()=> (window as any).qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle());
  expect(live.rowsFile.hookRows[0].body_you).toBe(record.body_you);
  expect(live.rowsFile.hookRows[0].publicationRowId).toBe(publication.row_id);
  const preserved=await page.evaluate(async(bundle)=>{
    const qa=(window as any).qa;
    await qa.installSkyPlacementFallbackArchitectureV3Bundle(bundle);
    await qa.loadSkyPlacementFallbackArchitectureV3Bundle();
    return qa.fallbackV3HookBody('house-horoscope-core/chiron/aries/house-2');
  },live);
  expect(preserved).toBe(records.find((row:any)=>row.contentKey==='house-horoscope-core/chiron/aries/house-2').body_you);
  await context.setOffline(true);
  const offline=await page.evaluate(async()=> (window as any).qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle());
  expect(offline.rowsFile.hookRows[0].body_you).toBe(record.body_you);
  await page.evaluate(record=>(window as any).qa.installContentPublications([{...record,state:'retired',revision:2}]),publication);
  expect(await page.evaluate(async()=> (window as any).qa.loadFallbackArchitectureV3SkyPlacementDashboardBundle())).toBeNull();
  expect(await page.evaluate(key=>(window as any).qa.isContentRetired(key),record.contentKey)).toBe(true);
});

test('an empty-house edit preserves the other bundled assembly sources', async ({ page, context }) => {
  const bundled=await build({stdin:{contents:`export {installFallbackArchitectureV3Bundle,loadEmptyHouseFallbackArchitectureV3Bundle,fallbackRendererV3} from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';`,resolveDir:process.cwd()},bundle:true,format:'esm',write:false,define:{'import.meta.env':'{}'},logLevel:'silent'});
  await context.route('**/empty-house-qa',route=>route.fulfill({contentType:'text/html',body:'<html><body><script type="module">import * as qa from "/empty-house-qa.js";window.qa=qa;</script></body></html>'}));
  await context.route('**/empty-house-qa.js',route=>route.fulfill({contentType:'text/javascript',body:bundled.outputFiles[0].text}));
  await page.goto('/empty-house-qa');await page.waitForFunction(()=>Boolean((window as any).qa));
  const result=await page.evaluate(async()=>{
    const qa=(window as any).qa;
    qa.installFallbackArchitectureV3Bundle({transitLib:{authoredCards:[]},templatesFile:{templates:[]},rowsFile:{vocabularyRows:[],hookRows:[{contentKey:'fallback-hook/empty-house/base/1',content_role:'fallback_hook',review_status:'approved',body_you:'QA saved empty-house introduction.',body_they:'QA friend empty-house introduction.'}]}});
    await qa.loadEmptyHouseFallbackArchitectureV3Bundle();
    return qa.fallbackRendererV3.renderNatalEmptyHouse({house:1,sign:'gemini',rulerHouse:10,voice:'you'});
  });
  expect(result.note).toBe('QA saved empty-house introduction.');
  expect(result.body).toContain('You can understand yourself by talking long enough to hear what you actually think.');
  expect(result.sourceKeys).toContain('fallback-hook/empty-house/rising-ruler/gemini/mercury/10');
});
