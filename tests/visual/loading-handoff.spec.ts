import { test, expect } from '../helpers/polish-test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { readerResponse } from '../helpers/reader-response';

async function harness() {
  const result = await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {PageLoading} from './apps/web/src/components/PageLoading';
    import {ContentLoading} from './apps/web/src/components/LoadingPatterns';
    import {CalendarLoading} from './apps/web/src/features/calendar/CalendarDaySkeleton';
    const layouts=['placements','reading','prose','feed','people','articles','settings','wheel'];
    function Preview(){return <main className="app-shell mode-articles"><div className="page-shell loading-handoff-preview"><h1>Loading states</h1>{layouts.map(layout=><section aria-label={layout} key={layout}><h2>{layout}</h2>{['reading','prose','wheel'].includes(layout)?<PageLoading layout={layout} message={layout==='wheel'?'Loading your chart…':'Loading '+layout+'…'}/>:<ContentLoading layout={layout} message={'Loading '+layout+'…'}/>}</section>)}{['week','weekly','month'].map(view=><section aria-label={'Calendar '+view} key={view}><h2>{view}</h2><CalendarLoading month={new Date(2026,9,1)} dateKey="2026-10-26" view={view}/></section>)}</div></main>}
    createRoot(document.getElementById('root')).render(<Preview/>);
  `},bundle:true,write:false,format:'esm',jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env':JSON.stringify({MODE:'test',DEV:false})}});
  const manifest=JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT??'apps/web/dist'}/.vite/manifest.json`,'utf8'));
  const files=[...new Set<string>([manifest['src/styles.css'].file,...Object.values(manifest).flatMap((entry:any)=>entry.css??[])])].filter(path=>!/admin|studio|MemoryGraph/i.test(path));
  return {script:result.outputFiles[0].text,links:files.map(path=>`<link rel="stylesheet" href="/${path}">`).join('')};
}

for(const width of [320,390,768,1440])for(const theme of ['light','dark'])test(`Loading handoff shapes and motion ${width} ${theme}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  const fixture=await harness();
  await page.route('**/__loading-handoff',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html data-theme="${theme}"><head>${fixture.links}</head><body><div id="root"></div><script type="module">${fixture.script}</script></body></html>`}));
  await page.goto('/__loading-handoff');await expect(page.getByRole('heading',{name:'Loading states',exact:true})).toBeVisible();
  for(const layout of ['placements','reading','prose','feed','people','articles','settings','wheel']) {
    const region=page.getByRole('region',{name:layout,exact:true});await region.scrollIntoViewIfNeeded();
    const pending=region.locator('.loading-pattern');await expect(pending).toHaveAttribute('aria-busy','true');
    await expect(region.getByRole('status')).toHaveCount(1);
    await expect(region.locator('.loading-moon,.startup-orbit')).toHaveCount(0);
    await expect(pending.locator('button:not(:disabled),a[href],[tabindex="0"]')).toHaveCount(0);
    expect(await pending.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
    if(layout==='reading') {
      await expect(region.locator('.loading-card__heading .card-skeleton-disc')).toHaveCSS('width','52px');
      await expect(region.locator('.loading-card')).toHaveCSS('padding','28px');
    }
    if(layout==='people') {
      await expect(region.locator('.loading-person-action').first()).toHaveCSS('width','72px');
      await expect(region.locator('.loading-person-action').first()).toHaveCSS('height','36px');
    }
    expect(await region.locator('.loading-lines').evaluateAll(nodes=>nodes.every(node=>[...node.childNodes].every(child=>child.nodeType===Node.ELEMENT_NODE))),'Grid bars must not create anonymous spacer rows').toBe(true);
    const bar=region.locator('.card-skeleton-bar').first();
    if(await bar.count()) {
      await expect(bar).toHaveCSS('animation-name','skeleton-pulse');await expect(bar).toHaveCSS('animation-duration','1.4s');
      await page.emulateMedia({reducedMotion:'reduce'});await expect(bar).toHaveCSS('animation-name','none');
      await page.emulateMedia({reducedMotion:'no-preference'});
    }
    await region.screenshot({path:info.outputPath(`${layout}-${width}-${theme}.png`)});
  }
  for(const view of ['week','weekly','month']) {
    const region=page.getByRole('region',{name:'Calendar '+view,exact:true});await region.scrollIntoViewIfNeeded();
    const dates=region.locator(view==='month'?'.lunar-calendar-day__number':'.lunar-week-day__date');
    expect(await dates.count()).toBe(view==='month'?35:7);
    const text=await dates.allTextContents();expect(text).toContain('26');
    if(view==='month')expect(await region.locator('.card-skeleton-bar').evaluateAll(bars=>bars.every(bar=>bar.getBoundingClientRect().width>0)),'Every date cell must show its event placeholder').toBe(true);
    await expect(region.getByRole('status')).toHaveCount(1);await expect(region.getByRole('button')).toHaveCount(0);
    await region.screenshot({path:info.outputPath(`calendar-${view}-${width}-${theme}.png`)});
  }
  await page.evaluate(()=>document.documentElement.setAttribute('data-reduce-motion',''));
  for(const bar of await page.locator('.card-skeleton-bar').all())await expect(bar).toHaveCSS('animation-name','none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Blog loading keeps header and filters then reveals complete article ${width} ${theme}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>localStorage.setItem('tldrastro:theme',theme),theme);
  await page.route('**/rest/v1/**',route=>route.fulfill({json:[]}));
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  const row={id:'loading-article',content_key:'article/manual/loading-test',surface:'education',mode:'article',status:'LIVE',lane:'serving',review_state:null,headline:'Loading fixture',body:'Complete preserved opening.\n\nComplete preserved final sentence.',updated_at:'2026-10-26T12:00:00Z'};
  await page.route('**/api/content-reader',async route=>{const q=route.request().postDataJSON();if(q.prefix?.startsWith('article/')||q.keys?.includes(row.content_key))await gate;return route.fulfill({json:readerResponse(q.prefix?.startsWith('article/')||q.keys?.includes(row.content_key)?[row]:[])});});
  await page.goto('/#articles');await expect(page.locator('.loading-pattern--articles')).toBeVisible();
  await expect(page.getByRole('heading',{level:1,name:'Articles & Guides',exact:true})).toBeVisible();
  await expect(page.getByRole('searchbox',{name:'Search articles and guides'})).toBeVisible();
  await expect(page.getByRole('tablist',{name:'Article type'})).toBeVisible();
  const before=await page.locator('.articles-library-header').boundingBox();
  await page.screenshot({path:info.outputPath(`blog-loading-${width}-${theme}.png`)});release();
  await expect(page.locator('.article-cover-card')).toHaveCount(1);await expect(page.locator('.loading-pattern--articles')).toHaveCount(0);
  expect(await page.locator('.articles-library-header').boundingBox()).toEqual(before);
  await page.locator('.article-cover-card').click();await expect(page.locator('.learn-article-body')).toContainText('Complete preserved final sentence.');
  await page.reload();await expect(page.locator('.learn-article-body')).toContainText('Complete preserved final sentence.');
});

for(const theme of ['light','dark'])test(`Startup orbit stays outside reader pages ${theme}`,async({page},info)=>{
  await page.addInitScript(theme=>localStorage.setItem('tldrastro:theme',theme),theme);
  const manifest=JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT??'apps/web/dist'}/.vite/manifest.json`,'utf8'));
  await page.route('**/'+manifest['index.html'].file,route=>route.fulfill({contentType:'text/javascript',body:''}));
  await page.goto('/#sky');const shell=page.locator('#app-startup');await expect(shell).toHaveAttribute('data-loader','orbit');
  await expect(shell.locator('.startup-orbit')).toHaveCSS('width','48px');await expect(shell.locator('.startup-artwork')).toBeHidden();
  await page.emulateMedia({reducedMotion:'reduce'});await expect(shell.locator('.startup-orbit')).toHaveCSS('animation-name','none');
  await page.screenshot({path:info.outputPath(`startup-${theme}.png`)});
});
