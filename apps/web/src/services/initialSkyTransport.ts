import type {LocationInput} from '../types';
import {getInitialLocation,getInitialTransitDate,skyDateTimeFromInput} from './skySelection';
import {liveSkyReference} from './skyClock';
import {withTimeZone} from './timezones';
import {isInitialSkyReaderHash} from './initialSkyRoute.mjs';
import {rememberStudioReturnPath} from './studioAuthReturn';
import {ASTROLOGY_CALCULATION_CONTRACT} from './astrologyFacts';
import {withRequestDeadline} from './requestDeadline';

type Transport={day:string;location:LocationInput;at:string;live:boolean;key:string;startedAt:number;request:Promise<unknown>};
type PrimedWindow=Window & {__tldrInitialSkyTransport?:Transport};
export function matchingInitialSkyTransport(day:string,location:LocationInput,live:boolean) {
  if(typeof window==='undefined')return null;
  const value=(window as PrimedWindow).__tldrInitialSkyTransport;
  return value&&value.day===day&&value.live===live&&value.location.latitude===location.latitude
    &&value.location.longitude===location.longitude&&value.location.timeZone===location.timeZone
    &&performance.now()-value.startedAt<8_000?value:null;
}
export function takeInitialSkyTransport(key:string){
  if(typeof window==='undefined')return null;
  const value=(window as PrimedWindow).__tldrInitialSkyTransport;
  if(!value||value.key!==key||performance.now()-value.startedAt>=8_000)return null;
  delete (window as PrimedWindow).__tldrInitialSkyTransport;
  return value;
}
/** Run from the small inline head entry. Selection and deadlines are the same
 * existing helpers; the normal API client still validates every fact and source
 * before App can adopt a result. No writer or private account request starts.
 */
export function primeInitialSkyTransport(){
  if(typeof window==='undefined')return;
  const url=new URL(window.location.href);
  if(url.pathname!=='/'||!isInitialSkyReaderHash(url.hash)||url.searchParams.get('auth')==='login'
    ||url.searchParams.has('code')||url.hash&&!/^#\/?sky\/?$/u.test(url.hash)||rememberStudioReturnPath())return;
  if((window as PrimedWindow).__tldrInitialSkyTransport)return;
  const day=getInitialTransitDate(),location=withTimeZone(getInitialLocation().location),now=new Date();
  const date=skyDateTimeFromInput(day,location,true,now);
  const key=new URLSearchParams({at:date.toISOString(),lat:String(location.latitude),lon:String(location.longitude),
    timeZone:location.timeZone||'UTC',version:ASTROLOGY_CALCULATION_CONTRACT.calculationVersion,detail:'placements'}).toString();
  const startedAt=performance.now();
  const request=withRequestDeadline(async signal=>{
    const response=await fetch('/api/sky-reader?'+key,{signal,priority:'high'});
    if(!response.ok)throw new Error('Initial Sky transport unavailable.');
    return response.json();
  },{timeoutMs:8_000});
  void request.catch(()=>{});
  (window as PrimedWindow).__tldrInitialSkyTransport={day,location,at:date.toISOString(),
    live:Boolean(liveSkyReference(day,location.timeZone,now)),key,startedAt,request};
  window.dispatchEvent(new Event('tldr:sky-bootstrap-started'));
}
