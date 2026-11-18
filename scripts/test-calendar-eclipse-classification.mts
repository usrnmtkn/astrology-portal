import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import SwissEph from 'swisseph-wasm';

const cache=path.join(process.cwd(),'node_modules/.cache/tldrastro');await mkdir(cache,{recursive:true});
const directory=await mkdtemp(path.join(cache,'calendar-eclipses-'));
try {
  const outfile=path.join(directory,'actual.mjs');
  await build({entryPoints:['apps/web/src/services/ephemeris.ts'],outfile,bundle:true,platform:'node',format:'esm',external:['swisseph-wasm'],define:{'import.meta.env':'{}'},logLevel:'silent',
    plugins:[{name:'actual-calculation-test-access',setup(builder){builder.onLoad({filter:/\/services\/ephemeris\.ts$/},args=>({loader:'ts',contents:readFileSync(args.path,'utf8')+'\nexport {findLunations,eclipseTypeForLunation};',resolveDir:path.dirname(args.path)}));}}]});
  const actual=await import(pathToFileURL(outfile).href),swiss=new SwissEph();await swiss.initSwissEph();
  const native=swiss.SweModule;
  // Independent global search: a lunar eclipse is not limited to a fixed
  // observer's horizon. Match its maximum to the actual calculated syzygy.
  function expected(event:any){
    if(!/new moon|full moon/iu.test(event.title))return null;
    const date=new Date(event.startsAt),jd=swiss.julday(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600);
    const times=native._malloc(10*8),error=native._malloc(256);
    try {
      new Uint8Array(native.HEAPF64.buffer,error,256).fill(0);
      const solar=/new moon/iu.test(event.title);
      const flag=native.ccall(solar?'swe_sol_eclipse_when_glob':'swe_lun_eclipse_when','number',['number','number','number','pointer','number','pointer'],[jd-1,swiss.SEFLG_SWIEPH,0,times,0,error]);
      assert(flag>=0,native.UTF8ToString(error));
      const maximum=new Float64Array(native.HEAPF64.buffer,times,10)[0];
      return flag>0&&Math.abs(maximum-jd)<1?(solar?'solar':'lunar'):null;
    } finally {native._free(times);native._free(error);}
  }
  const events=actual.findLunations(swiss,new Date('1801-01-01T00:00:00Z'),new Date('2399-01-01T00:00:00Z'),'America/New_York');
  const mismatches=events.flatMap((event:any)=>{const reference=expected(event);return (event.eclipseType??null)===reference?[]:[{at:event.startsAt,declared:event.eclipseType??null,reference}];});
  assert.deepEqual(mismatches,[],'Every phase must use the actual global eclipse classification, not a node-distance threshold.');
  assert(events.some((e:any)=>e.startsAt.startsWith('2026-03-03')&&e.eclipseType==='lunar'),'A genuine lunar eclipse remains global even when the Moon is below the Greenwich horizon.');
  assert(events.some((e:any)=>e.startsAt.startsWith('2027-07-18')&&e.eclipseType==='lunar'),'Preserve a grazing penumbral eclipse whose maximum follows geocentric opposition.');
  for(const date of ['1848-08-28','1859-02-03','1916-12-24','1935-01-05','2098-10-24','2203-09-06','2250-08-28'])assert(events.some((e:any)=>e.startsAt.startsWith(date)&&e.eclipseType==='solar'),`${date}: preserve a grazing solar eclipse whose maximum is away from conjunction`);
  for(const date of ['2022-05-30','2040-06-09','2045-07-28'])assert(events.some((e:any)=>e.startsAt.startsWith(date)&&!e.eclipseType),`${date}: false eclipse removed without removing the phase event`);
  const original=native.ccall.bind(native);let faulted=false;
  native.ccall=(name:string,...args:any[])=>{if(name==='swe_sol_eclipse_where'){faulted=true;return -1;}return original(name,...args);};
  assert.throws(()=>actual.eclipseTypeForLunation(swiss,new Date('2031-04-21T00:00:00Z'),0),/eclipse calculation/iu,'A native failure must not become a normal non-eclipse.');assert(faulted);
  for(const [name,date,phase] of [['swe_sol_eclipse_how','1935-01-05T05:20:05Z',0],['swe_lun_eclipse_how','2027-07-18T00:00:00Z',180]] as const){
    let called=false;native.ccall=(method:string,...args:any[])=>{if(method===name){called=true;return -1;}return original(method,...args);};
    assert.throws(()=>actual.eclipseTypeForLunation(swiss,new Date(date),phase),/eclipse calculation/iu,`${name}: native failure remains explicit`);assert(called);
  }
  console.log(`PASS ${events.length} actual Calendar phases against independent global Swiss eclipse searches; false positives, horizon independence, preserved phases and native failure behavior.`);
} finally {await rm(directory,{recursive:true,force:true});}
