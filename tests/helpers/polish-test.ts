import { writeFile } from "node:fs/promises";
import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
export * from '@playwright/test';

function inspectControls() {
  const issues: Array<{kind:string;text:string;className:string;route:string}> = [];
  for(const element of document.querySelectorAll<HTMLElement>('button, a[href]')) {
    const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
    if(!rect.width||!rect.height||style.visibility==='hidden'||element.closest('[hidden],[inert]')||(element.closest('details:not([open])')&&!element.closest('summary')))continue;
    const text=(element.textContent||element.getAttribute('aria-label')||'').trim().slice(0,100);
    if(element.tagName==='BUTTON'&&['outset','inset'].includes(style.borderTopStyle))issues.push({kind:'browser-default-button',text,className:element.className,route:location.pathname+location.hash});
    if(element.tagName==='A'&&['rgb(0, 0, 238)','rgb(85, 26, 139)'].includes(style.color))issues.push({kind:'browser-default-link',text,className:element.className,route:location.pathname+location.hash});
  }
  return issues;
}

export async function auditReaderScreen(page: Page, info: TestInfo, label='screen') {
  if(page.isClosed()||page.url()==='about:blank')return;
  const current=await page.evaluate(inspectControls);
  const history=await page.evaluate(()=>((window as unknown as {__readerPolishIssues?:unknown[]}).__readerPolishIssues??[]));
  await info.attach(`${label}-polish`,{body:JSON.stringify({url:page.url(),viewport:page.viewportSize(),current,history},null,2),contentType:'application/json'});
  await page.screenshot({path:info.outputPath(`${label.replace(/[^a-z0-9-]/gi,'-')}.png`)});
  expect(current,'Rendered controls must use product styling').toEqual([]);
  expect(history,'Controls must remain styled during the journey').toEqual([]);
}

export const test=base.extend({
  page: async({page},use,info)=>{
    await page.addInitScript(()=>{
      const records:unknown[]=[];const firstSeen=new WeakMap<Element,number>();const recorded=new Set<string>();
      Object.assign(window,{__readerPolishIssues:records});
      const sample=()=>{
        for(const element of document.querySelectorAll<HTMLElement>('button,a[href]')) {
          const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
          if(!rect.width||!rect.height||style.visibility==='hidden'||element.closest('[hidden],[inert]')||(element.closest('details:not([open])')&&!element.closest('summary')))continue;
          const kind=element.tagName==='BUTTON'&&['outset','inset'].includes(style.borderTopStyle)?'browser-default-button':element.tagName==='A'&&['rgb(0, 0, 238)','rgb(85, 26, 139)'].includes(style.color)?'browser-default-link':null;
          if(!kind){firstSeen.delete(element);continue;}
          const start=firstSeen.get(element)??performance.now();firstSeen.set(element,start);
          if(performance.now()-start<1000)continue;
          const item={kind,text:(element.textContent||element.getAttribute('aria-label')||'').trim().slice(0,100),className:element.className,route:location.pathname+location.hash};
          const key=JSON.stringify(item);if(!recorded.has(key)){recorded.add(key);records.push(item);}
        }
      };
      document.addEventListener('DOMContentLoaded',()=>{sample();window.setInterval(sample,250);},{once:true});
    });
    const screenshot=page.screenshot.bind(page);let checkpoint=0;
    page.screenshot=async options=>{
      if(!page.isClosed()&&page.url()!=='about:blank') {
        const current=await page.evaluate(inspectControls);
        const screen=await page.evaluate(()=>({route:location.pathname+location.search+location.hash,theme:document.documentElement.dataset.theme,headings:Array.from(document.querySelectorAll('h1,h2,h3')).filter(e=>e.getBoundingClientRect().height>0).map(e=>e.textContent?.trim()),controls:Array.from(document.querySelectorAll('button,input,select,textarea')).filter(e=>e.getBoundingClientRect().height>0).map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,80),className:e.className}))}));
        await info.attach(`checkpoint-${++checkpoint}`,{body:JSON.stringify({...screen,viewport:page.viewportSize(),screenshot:options?.path,current},null,2),contentType:'application/json'});
        if(info.status==='passed')expect(current,'Screenshot checkpoints must use product control styles').toEqual([]);
      }
      const bytes=await screenshot(options);
      if(options?.path)await writeFile(info.outputPath(`checkpoint-${checkpoint}.png`),bytes);
      if(options?.fullPage)await screenshot({path:info.outputPath(`checkpoint-${checkpoint}-viewport.png`)});
      return bytes;
    };
    await use(page);
    if(info.status==='passed')await auditReaderScreen(page,info);
  }
});
