import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
let script='';
test.beforeAll(async()=>{
 const result=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React,{useState,StrictMode} from 'react';
  import {createRoot} from 'react-dom/client';
  import {ReadingDialog} from './apps/web/src/components/ReadingDialog';
  function App(){const [open,setOpen]=useState(false),[child,setChild]=useState(false);
   return <><button onClick={()=>setOpen(true)}>Open reading</button>{open&&<ReadingDialog title="Parent reading" titleId="parent-title" onClose={()=>setOpen(false)}>
    <p>Parent reading body.</p><button onClick={()=>setChild(true)}>Open nested reading</button>
    {child&&<ReadingDialog title="Nested reading" titleId="child-title" onClose={()=>setChild(false)}>
     <p>Nested reading body.</p><button onClick={()=>{setOpen(false);setChild(false);}}>Close all readings</button>
    </ReadingDialog>}
   </ReadingDialog>}</>;}
  createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);`},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
 script=result.outputFiles[0].text;
});
for(const theme of ['light','dark'])test(`nested modal focus and background restoration ${theme}`,async({page})=>{
 const dist=process.env.PLAYWRIGHT_DIST_ROOT??'apps/web/dist';
 const manifest=JSON.parse(readFileSync(`${dist}/.vite/manifest.json`,'utf8'));
 await page.route('**/__modal-focus',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${[...manifest['index.html'].css,manifest['src/styles.css'].file].map(file=>`<link rel="stylesheet" href="/${file}">`).join('')}</head><body><aside id="already-inert" inert>Hidden background</aside><main id="root"></main><script>${script}</script></body></html>`}));
 await page.goto('/__modal-focus');
 const root=page.locator('#root'),trigger=page.getByRole('button',{name:'Open reading',exact:true});
 for(const closeAll of [false,true]){
  await trigger.click();const parent=page.getByRole('dialog',{name:'Parent reading',exact:true});
  await expect(parent).toBeVisible();await parent.getByRole('button',{name:'Open nested reading',exact:true}).click();
  const child=page.getByRole('dialog',{name:'Nested reading',exact:true});await expect(child).toBeVisible();
  expect(await parent.evaluate(node=>Boolean(node.closest('[inert]')))).toBe(true);
  await expect(root).toHaveAttribute('inert','');
  if(closeAll)await child.getByRole('button',{name:'Close all readings',exact:true}).click();
  else{
   await page.keyboard.press('Escape');await expect(child).toBeHidden();await expect(parent).toBeVisible();
   await expect(parent.getByRole('button',{name:'Open nested reading',exact:true})).toBeFocused();
   await expect(root).toHaveAttribute('inert','');await expect(page.locator('body')).toHaveClass(/modal-open/);
   await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(root).not.toHaveAttribute('inert','');
  await expect(page.locator('body')).not.toHaveClass(/modal-open/);await expect(trigger).toBeFocused();
  await expect(page.locator('#already-inert')).toHaveAttribute('inert','');
 }
});
