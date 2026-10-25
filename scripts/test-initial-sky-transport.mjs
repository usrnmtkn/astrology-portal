import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {runInNewContext} from 'node:vm';
const built=buildSync({stdin:{contents:"export * from './apps/web/src/services/initialSkyTransport.ts'",loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'browser',target:'es2022'}).outputFiles[0].text;
const now='2026-10-23T16:00:00.000Z';const RealDate=Date;
class FixedDate extends RealDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return new RealDate(now).getTime();}}
const ny={label:'Synthetic New York',latitude:40.7128,longitude:-74.006,timeZone:'America/New_York'};
function harness(href='https://fixture.test/?date=2026-10-23#sky',location=ny,savedMode=null){
 let clock=0;const calls=[],timers=[],events=[];const window={location:new URL(href),localStorage:{getItem:key=>key==='tldrastro:selectedLocation'?location&&JSON.stringify(location):savedMode},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},dispatchEvent:event=>events.push(event.type)};
 const context={window,module:{exports:{}},URL,URLSearchParams,Intl,Date:FixedDate,performance:{now:()=>clock},AbortController,DOMException,Event,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){},fetch:(url,options)=>{calls.push({url,options});return new Promise(()=>{})}};
 runInNewContext(built,context);return {api:context.module.exports,window,calls,timers,events,advance:ms=>clock=ms};
}
{
 const h=harness();h.api.primeInitialSkyTransport();h.api.primeInitialSkyTransport();assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.priority,'high');assert(h.calls[0].options.signal instanceof AbortSignal);assert.deepEqual(h.events,['tldr:sky-bootstrap-started']);
 const query=new URL(h.calls[0].url,'https://fixture.test').searchParams;assert.equal(query.get('at'),now);assert.equal(query.get('detail'),'placements');assert.equal(query.get('timeZone'),ny.timeZone);
 const value=h.api.matchingInitialSkyTransport('2026-10-23',ny,true);assert(value);assert.equal(value.at,now);assert.equal(h.timers[0].ms,8000);
 assert.equal(h.api.matchingInitialSkyTransport('2026-10-24',ny,true),null);assert.equal(h.api.matchingInitialSkyTransport('2026-10-23',{...ny,longitude:0},true),null);assert.equal(h.api.matchingInitialSkyTransport('2026-10-23',{...ny,timeZone:'UTC'},true),null);assert.equal(h.api.matchingInitialSkyTransport('2026-10-23',ny,false),null);
 assert.equal(h.api.takeInitialSkyTransport('wrong-key'),null);assert.equal(h.api.takeInitialSkyTransport(value.key),value);assert.equal(h.api.takeInitialSkyTransport(value.key),null);
}
for(const href of ['https://fixture.test/?auth=login#sky','https://fixture.test/?code=synthetic#sky','https://fixture.test/admin/content#sky','https://fixture.test/#calendar','https://fixture.test/#sky/placement/sun/scorpio']){const h=harness(href);h.api.primeInitialSkyTransport();assert.equal(h.calls.length,0,href);}
for(const mode of ['profile','friends','calendar','horoscopes','account','settings']){const h=harness('https://fixture.test/',ny,mode);h.api.primeInitialSkyTransport();assert.equal(h.calls.length,0,mode);}
{
 const h=harness('https://fixture.test/',null);h.api.primeInitialSkyTransport();assert.equal(h.calls.length,1);assert.equal(new URL(h.calls[0].url,'https://fixture.test').searchParams.get('at'),now);
 h.advance(8001);assert.equal(h.api.matchingInitialSkyTransport('2026-10-23',ny,true),null);
 h.timers[0].fn();assert.equal(h.calls[0].options.signal.aborted,true,'The original eight-second deadline includes the inline transport.');
}
for(const [day,location,at]of [['2026-11-01',ny,'2026-11-01T17:00:00.000Z'],['2026-11-01',{label:'Synthetic Tokyo',latitude:35.6762,longitude:139.6503,timeZone:'Asia/Tokyo'},'2026-11-01T03:00:00.000Z']]){const h=harness('https://fixture.test/?date='+day+'#sky',location);h.api.primeInitialSkyTransport();assert.equal(new URL(h.calls[0].url,'https://fixture.test').searchParams.get('at'),at);assert(h.api.matchingInitialSkyTransport(day,location,false));}
console.log('PASS: actual inline transport selection, single ownership, matching/adoption, wrong date/location/zone/clock rejection, eight-second total expiry, root/defaults, saved destinations, auth/route guards and DST/local-noon parity.');
