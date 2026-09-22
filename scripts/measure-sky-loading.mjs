import { chromium } from 'playwright';
import fs from 'node:fs/promises';
// Fresh anonymous contexts only. No user sessions or credentials are loaded.
// Compare the same build settings, public service, date and machine; errors are failures.
const baseURL = process.env.SKY_PERF_URL || 'http://127.0.0.1:4173';
const date = process.env.SKY_PERF_DATE || '2026-09-21';
const out = process.env.SKY_PERF_OUT || `/tmp/sky-performance-${Date.now()}.json`;
const runs = Number(process.env.SKY_PERF_RUNS || 5);
const browser = await chromium.launch({headless:true});
const results = [];
for (const profile of (process.env.SKY_PERF_PROFILES || 'desktop,mobile').split(',')) {
 for(let run=0;run<runs;run++) {
  const context=await browser.newContext({viewport: profile==='desktop'?{width:1440,height:1000}:{width:390,height:844}, timezoneId:'America/New_York'});
  // Optional preview-access cookies stay in a private local file, never in results.
  if (process.env.SKY_PERF_COOKIE_JAR) {
   const jar = await fs.readFile(process.env.SKY_PERF_COOKIE_JAR, 'utf8');
   const cookies = jar.split('\n').filter(line=>line.startsWith('#HttpOnly_')||line&&!line.startsWith('#')).map(line=>{
    const [domain,,path,secure,expires,name,value] = line.replace(/^#HttpOnly_/u,'').split('\t');
    return {domain,path,secure:secure==='TRUE',expires:Number(expires)||-1,name,value,httpOnly:line.startsWith('#HttpOnly_')};
   });
   await context.addCookies(cookies);
  }
  await context.addInitScript(instant => {
   if (instant) {
    const OriginalDate=Date;
    window.Date=class extends OriginalDate {
     constructor(...args) { if(args.length) super(...args); else super(instant); }
     static now() { return new OriginalDate(instant).getTime(); }
    };
   }
   localStorage.setItem('tldrastro:selectedLocation',JSON.stringify({label:'New York, NY',latitude:40.7128,longitude:-74.006,timeZone:'America/New_York'}));
   const state=window.__skyPerf={marks:{},workers:[],longTasks:[],shifts:[]};
   const Original=window.Worker;
   window.Worker=class extends Original {
    postMessage(m,...args) {state.workers.push({kind:m?.kind,id:m?.id,options:m?.options,start:performance.now()}); return super.postMessage(m,...args);}
    constructor(...args) {super(...args);this.addEventListener('message',e=>{const r=state.workers.findLast(r=>r.id===e.data?.id&&!r.end);if(r){r.end=performance.now();r.ok=e.data.ok;}});}
   };
   for(const type of ['longtask','layout-shift']) try {new PerformanceObserver(list=>{for(const e of list.getEntries()) if(type==='longtask')state.longTasks.push({start:e.startTime,duration:e.duration});else if(!e.hadRecentInput)state.shifts.push(e.value);}).observe({type,buffered:true});}catch{}
   const visible=e=>e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[aria-hidden="true"]');
   const sample=()=>{
    const mark=(name,yes)=>{if(yes&&state.marks[name]===undefined)state.marks[name]=performance.now();};
    mark('shell',document.querySelector('.app-shell'));
    mark('chart',document.querySelector('[aria-label="Current sky"] [aria-label="Planet positions"]'));
    mark('failure',document.querySelector('.sky-reading-layout [role="alert"]'));
    mark('reading',!state.marks.failure&&!document.querySelector('.planet-placement-row--sky[aria-busy="true"]')&&visible(document.querySelector('[aria-label="Daily sky summary"][aria-busy="false"]'))&&document.querySelectorAll('.planet-placement-row--sky').length===14&&!document.querySelector('.sky-reading-layout[aria-busy="true"]'));
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  }, process.env.SKY_PERF_INSTANT);
  const page=await context.newPage();
  const cdp=await context.newCDPSession(page);
  if(profile==='mobile') {await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1_600_000/8,uploadThroughput:750_000/8});}
  const requests=[];const errors=[];
  page.on('response',async r=>{const req=r.request();const u=new URL(r.url());if(['fetch','xhr'].includes(req.resourceType())||u.pathname.includes('wasm'))requests.push({url:u.origin+u.pathname+u.search,status:r.status(),timing:req.timing()});});
  page.on('pageerror',e=>errors.push(e.message));
  if (process.env.SKY_PERF_TRACE) await context.tracing.start({screenshots:true,snapshots:true});
  for(const warm of [false,true]) {
   requests.length=0; errors.length=0;
   if (process.env.SKY_PERF_CPU_PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
   let error=null;
   try {if(warm)await page.reload({waitUntil:'domcontentloaded'});else await page.goto(`${baseURL}/?date=${date}#sky`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__skyPerf.marks.reading!==undefined || window.__skyPerf.marks.failure!==undefined,{},{timeout:60000});}catch(e){error=e.message;}
   const data=await page.evaluate(()=>({...window.__skyPerf,prose: [...document.querySelectorAll('[aria-label="Daily sky summary"],.planet-placement-row--sky .planet-placement-row__description')].map(el=>el.textContent),copy: [...document.querySelectorAll('[aria-label="Daily sky summary"],.planet-placement-row--sky')].map(el=>el.textContent),navigation:performance.getEntriesByType('navigation').map(e=>e.toJSON()),resources:performance.getEntriesByType('resource').map(e=>({name:e.name,start:e.startTime,duration:e.duration,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize}))}));
   if(data.marks.failure)error='Reader displayed an error before usable content';
   const result={profile,run,warm,error,errors:[...errors],...data,requests:[...requests]};results.push(result);await fs.writeFile(out,JSON.stringify(results,null,2));
   console.log(JSON.stringify({profile,run,warm,marks:data.marks,error,worker:data.workers}));
   if (process.env.SKY_PERF_CPU_PROFILE) {
    const {profile:cpu}=await cdp.send('Profiler.stop');
    await fs.writeFile(out.replace('.json',`-${profile}-${run}-${warm?'warm':'cold'}.cpuprofile`),JSON.stringify(cpu));
    await cdp.send('Profiler.disable');
   }
  }
  if (process.env.SKY_PERF_TRACE) await context.tracing.stop({path:out.replace('.json',`-${profile}-${run}.zip`)});
  await context.close();
 }
}
await browser.close();
