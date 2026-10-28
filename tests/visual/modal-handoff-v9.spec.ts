import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {expectReadableTheme} from '../helpers/theme-contrast';
let script='';
test.beforeAll(async()=>{
 const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React,{useState,StrictMode} from 'react';import {createRoot} from 'react-dom/client';
 import {ModalDialog} from './apps/web/src/components/ModalDialog';
 function App(){const [kind,setKind]=useState(''),[saved,setSaved]=useState(false);
  const title=kind==='confirm'?'Delete “Year Ahead”?':kind==='settings'?(saved?'Your settings are saved':'Add to your calendar'):kind==='short'?'What is dignity?':'Understanding the twelfth-house ruler in your natal chart';
  return <><button onClick={()=>setKind('short')}>Open short reading</button><button onClick={()=>setKind('long')}>Open long reading</button><button onClick={()=>{setSaved(false);setKind('settings')}}>Open settings</button><button onClick={()=>setKind('confirm')}>Open confirm</button>
   {kind&&<ModalDialog title={title} onClose={()=>setKind('')} glyph={kind==='long'?'♀':undefined} variant={kind==='confirm'?'confirm':kind==='settings'?'settings':'reading'}
    actions={kind==='confirm'?<><button className='modal-action' onClick={()=>setKind('')}>Cancel</button><button className='modal-action modal-action--danger' onClick={()=>setKind('')}>Delete</button></>:kind==='settings'?<button className='modal-action modal-action--primary' onClick={()=>saved?setKind(''):setSaved(true)}>{saved?'Done':'Save settings'}</button>:undefined}>
    {Array.from({length:kind==='long'?18:2},(_,i)=><p key={i}>Paragraph {i+1}. This synthetic passage verifies the complete saved text, readable body type, and scrolling through the last sentence. Nothing in the passage is removed to fit the dialog.</p>)}
    {kind==='long'&&<p>The complete final sentence remains available.</p>}
   </ModalDialog>}
  </>}
 createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);
 `},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
 script=result.outputFiles[0].text;
});
async function harness(page:any,theme:string){
 const dist=process.env.PLAYWRIGHT_DIST_ROOT??'apps/web/dist',manifest=JSON.parse(readFileSync(`${dist}/.vite/manifest.json`,'utf8'));
 await page.route('**/__modals-v9',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${[...manifest['index.html'].css,manifest['src/styles.css'].file].map(file=>`<link rel="stylesheet" href="/${file}">`).join('')}</head><body><main id="root"></main><script>${script}</script></body></html>`}));
 await page.goto('/__modals-v9');await page.evaluate(()=>document.fonts.ready);
}
for(const width of [320,390,800,960,1440])for(const height of [390,900])for(const theme of ['light','dark'])test(`Modal handoff v9 shell ${width}x${height} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});await harness(page,theme);
 for(const kind of ['short','long','settings','confirm']){
  const trigger=page.getByRole('button',{name:`Open ${kind==='short'?'short reading':kind==='long'?'long reading':kind}`,exact:true});
  await trigger.click();const dialog=page.getByRole(kind==='confirm'?'alertdialog':'dialog'),heading=dialog.getByRole('heading',{level:2}).first();
  const body=dialog.locator('.modal-dialog__body'),header=dialog.locator('.modal-dialog__header');
  await expect(heading).toBeFocused();await expect(heading).toHaveCSS('font-family',/Newsreader/);
  await expect(heading).toHaveCSS('font-size',kind==='confirm'||width<=800?'30px':'36px');
  await expect(body.locator('p').first()).toHaveCSS('font-size','19px');await expect(body.locator('p').first()).toHaveCSS('line-height','28.5px');
  await expect(body.locator('p').first()).toHaveCSS('font-weight','400');await expect(body.locator('p').first()).toHaveCSS('letter-spacing','normal');
  await expect(body.locator('.modal-dialog__content')).toHaveCSS('row-gap',width<=800?'18px':'20px');
  await expect(dialog).toHaveCSS('transform','none');const box=(await dialog.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(width<=800?64:48);expect(box.y+box.height).toBeLessThanOrEqual(height-(width<=800?0:48)+1);
  expect(box.width).toBe(width<=800?width:kind==='confirm'?440:kind==='settings'?560:640);
  await expect(dialog).toHaveCSS('animation-name','modal-dialog-fade');await expect(page.locator('#root')).toHaveAttribute('inert','');
  const windowY=await page.evaluate(()=>scrollY);await page.mouse.move(4,4);await page.mouse.wheel(0,450);expect(await page.evaluate(()=>scrollY)).toBe(windowY);
  if(kind==='long'){
   await expect(dialog.locator('.modal-dialog__viewport')).toHaveAttribute('data-more','true');
   const headerY=(await header.boundingBox())!.y;await body.focus();await page.keyboard.press('End');
   await expect.poll(()=>body.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);await expect(header).toHaveAttribute('data-scrolled','true');await expect(heading).toHaveCSS('font-size','22px');
   expect((await header.boundingBox())!.y).toBe(headerY);await expect(body.getByText('The complete final sentence remains available.',{exact:true})).toBeInViewport();
   await expect(dialog.locator('.modal-dialog__viewport')).not.toHaveAttribute('data-more','true');await expect(body.locator('p')).toHaveCount(19);
   await page.keyboard.press('Home');await expect.poll(()=>body.evaluate(n=>n.scrollTop)).toBe(0);
   await expect(heading).toHaveCSS('font-size',width<=800?'30px':'36px');
  }
  await expectReadableTheme(page,'.modal-dialog__header h2, .modal-dialog__content p, .modal-action');
  if(width===390&&height===900)await dialog.screenshot({path:test.info().outputPath(`${kind}-${theme}.png`)});
  if(kind==='confirm'){
   await expect(dialog.getByRole('button',{name:'Close',exact:true})).toHaveCount(0);await page.mouse.click(4,4);await expect(dialog).toBeVisible();
   await page.keyboard.press('Shift+Tab');await expect(dialog.getByRole('button',{name:'Delete',exact:true})).toBeFocused();
   await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  }else if(kind==='settings'){
   await dialog.getByRole('button',{name:'Save settings',exact:true}).click();await expect(heading).toHaveText('Your settings are saved');await expect(heading).toBeFocused();await dialog.getByRole('button',{name:'Done',exact:true}).click();
  }else{
   const close=dialog.getByRole('button',{name:'Close',exact:true});await expect(close).toHaveCSS('width','40px');await expect(close).toHaveCSS('height','40px');
   await heading.focus();await page.keyboard.press('Shift+Tab');await expect(body).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused();await page.keyboard.press('Escape');
  }
  await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();await expect(page.locator('#root')).not.toHaveAttribute('inert','');
 }
});
for(const kind of ['reading','settings','confirm'])test(`Modal handoff mobile swipe ${kind}`,async({page})=>{
 await page.setViewportSize({width:390,height:900});await harness(page,'light');
 const trigger=page.getByRole('button',{name:kind==='reading'?'Open long reading':`Open ${kind}`,exact:true});await trigger.click();
 const dialog=page.getByRole(kind==='confirm'?'alertdialog':'dialog'),header=dialog.locator('.modal-dialog__header');const box=(await header.boundingBox())!;
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const x=box.x+box.width/2,y=box.y+10;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+100}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 if(kind==='confirm'){await expect(dialog).toBeVisible();await page.keyboard.press('Escape');}
 await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();await cdp.detach();
});
