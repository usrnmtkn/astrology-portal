import {expect,test} from '../helpers/polish-test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {expectReadableTheme} from '../helpers/theme-contrast';
import {prepareErrorPage} from '../helpers/error-page-fixture';
import {bundledPublications} from '../helpers/bundled-publications';
import skyHandler from '../../api/sky';
import type {IncomingMessage,ServerResponse} from 'node:http';

async function harness(page:any,theme:string,scope:string,cause:string){
 const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React,{useState} from 'react';import{createRoot}from'react-dom/client';
 import{LoadErrorState}from'./apps/web/src/components/LoadError';
 function Demo(){const[phase,setPhase]=useState('error');return <main><h1>Sky</h1><LoadErrorState scope=${JSON.stringify(scope)} what='The current sky' cause={${cause==='auto'?'undefined':JSON.stringify(cause)}} failed={phase==='error'} pending={phase==='pending'} onRetry={async()=>{setPhase('pending');const next=await new Promise(resolve=>window.completeRetry=resolve);setPhase(next)}}><p>Verified content is available.</p></LoadErrorState></main>}
 createRoot(document.getElementById('root')).render(<Demo/>);
 `},bundle:true,write:false,format:'iife',jsx:'automatic',loader:{'.css':'empty'}});
 const manifest=JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT}/.vite/manifest.json`,'utf8'));
 const css=new Set<string>([...Object.values(manifest).flatMap((entry:any)=>entry.css??[]),manifest['src/styles.css'].file]);
 await page.route('**/__load-error-handoff10',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${[...css].map(file=>`<link rel="stylesheet" href="/${file}">`).join('')}</head><body><div id="root"></div><script>${result.outputFiles[0].text}</script></body></html>`}));
 await page.goto('/__load-error-handoff10');await page.evaluate(()=>document.fonts.ready);
}

for(const width of [320,390,800,960,1440])for(const theme of ['light','dark'])for(const scope of ['page','section'])test(`Load error design ${scope} ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 for(const cause of ['network','offline','server']){
  await harness(page,theme,scope,cause);const state=page.locator(`.load-error--${scope}`),message=state.getByRole('alert'),button=state.getByRole('button',{name:'Try again',exact:true});
  await expect(message).toHaveCount(1);await expect(button).not.toBeFocused();await expect(button).toHaveCSS('font-size','15px');
  await expect(state.locator('p')).toHaveCSS('font-family',/system-ui/);await expect(state.locator('p')).toHaveCSS('font-size',scope==='page'?'16px':'14px');
  await expect(message).toContainText(cause==='offline'?"You're offline.":cause==='server'?'Something went wrong on our side.':'Check your connection and try again.');
  if(scope==='page'){
   await expect(state.getByRole('heading')).toHaveText('Reply hazy, try again.');await expect(state.getByRole('heading')).toHaveCSS('font-size',width<=800?'30px':'36px');
   await expect(state.locator('.eight-ball')).toHaveCSS('width',width<=800?'112px':'140px');await expect(state.locator('.eight-ball__shake')).toHaveCSS('animation-name','none');await expect(state.locator('.eight-ball__reveal')).toHaveCSS('animation-name','none');
   await expect(button).toHaveCSS('min-height',width<=800?'52px':'48px');
  }else{await expect(state.locator('.eight-ball')).toHaveCount(0);await expect(state.locator('.load-error__icon')).toHaveCSS('width','44px');}
  for(let i=1;i<=3;i++){
   await button.click();const busy=state.getByRole('button',{name:'Trying again…',exact:true});await expect(busy).toBeDisabled();await expect(state.locator('.load-error__spinner')).toHaveCSS('animation-name','none');
   await page.evaluate(()=>{(window as any).completeRetry('error');});await expect(button).toBeEnabled();await expect(button).toBeFocused();await expect(state).toHaveAttribute('data-attempts',String(i));
  }
  if(scope==='page'){await expect(state.getByRole('heading')).toHaveText('Ask again later.');await expect(state.getByRole('link',{name:'Go to Today',exact:true})).toHaveAttribute('href','/#sky');}
  await expectReadableTheme(page,'.load-error h2, .load-error p, .load-error__retry, .load-error__today');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(cause==='server')await state.screenshot({path:test.info().outputPath(`${scope}-${width}-${theme}.png`)});
  await button.click();await page.evaluate(()=>{(window as any).completeRetry('ready');});await expect(state).toHaveCount(0);await expect(page.getByText('Verified content is available.',{exact:true})).toBeVisible();
 }
});

for(const width of [390,1440])for(const theme of ['light','dark'])test(`Sky has one page error and recovers ${width} ${theme}`,async({page})=>{
 test.setTimeout(90_000);await page.setViewportSize({width,height:1000});await page.clock.setFixedTime(new Date('2026-10-13T16:00:00Z'));
 await prepareErrorPage(page,theme,{failure:'astronomy'});await bundledPublications(page);
 let phase='error',requestPending=false,complete:()=>void=()=>{};
 const gate=new Promise<void>(resolve=>{complete=()=>{phase='ready';resolve();};});
 await page.route('**/api/sky?**',async route=>{
  if(phase==='pending'){requestPending=true;await gate;}
  if(phase==='error')return route.fulfill({status:503,json:{ok:false,error:'Synthetic sky failed'}});
  const response={statusCode:200,setHeader(){},end(body:string){expect(this.statusCode,body).toBe(200);void route.fulfill({status:this.statusCode,contentType:'application/json',body});}};
  await skyHandler({method:'GET',url:route.request().url()} as IncomingMessage,response as unknown as ServerResponse);
 });
 await page.goto('/#sky');const state=page.locator('.load-error--page');await expect(state).toBeVisible({timeout:60000});
 await expect(page.getByRole('alert')).toHaveCount(1);await expect(page.locator('.sky-card--empty')).toHaveCount(0);await expect(page.locator('.sky-chart-column:visible')).toHaveCount(0);
 await expect(page.locator('.site-nav button.active')).toHaveText('Sky');await expect(page.locator('.sky-intro__lead')).toHaveText('Sky');await expect(page.locator('#header-date-trigger')).toBeVisible();
 await expect(state.locator('.eight-ball__reveal')).toHaveCSS('opacity','1');
 await expect(state.locator('p')).toHaveCSS('text-align','center');
 if(width>800)expect((await state.boundingBox())!.width).toBe(760);
 await state.screenshot({path:test.info().outputPath(`sky-error-${width}-${theme}.png`)});await page.screenshot({path:test.info().outputPath(`sky-frame-${width}-${theme}.png`)});
 phase='pending';await state.getByRole('button',{name:'Try again',exact:true}).click();await expect(state.getByRole('button',{name:'Trying again…',exact:true})).toBeDisabled();
 await expect.poll(()=>requestPending).toBe(true);complete();
 await expect(state).toBeHidden({timeout:60000});await expect(page.locator('.sky-chart-column:visible')).toBeVisible();await expect(page.locator('.sky-intro__lead')).toHaveText('Sky');
 await page.reload();await expect(page.locator('.sky-chart-column:visible')).toBeVisible({timeout:60000});
});

for(const theme of ['light','dark'])test(`Offline browser uses the offline message ${theme}`,async({page})=>{
 await page.setViewportSize({width:390,height:1000});
 await page.addInitScript(()=>Object.defineProperty(navigator,'onLine',{value:false,configurable:true}));
 await harness(page,theme,'page','auto');
 await expect(page.getByRole('alert')).toContainText("You're offline. Reconnect and try again.");
 await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeEnabled();
});
