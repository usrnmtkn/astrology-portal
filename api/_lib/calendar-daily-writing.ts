import {createHash} from 'node:crypto';
import {AdminHttpError,adminFetchJson,adminStorageRows} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {getAstrodienstSky} from '../../apps/web/src/services/ephemeris.js';
import {zonedDateTimeToUtc} from '../../apps/web/src/services/timezones.js';
import responses from '../../src/astro-writing/openAIResponses.cjs';
import provider from '../../src/astro-writing/offlineProviderConfig.cjs';

export const DAILY_PROFILE_KEY='studio-writing-profile/calendar/daily';
export const PROFILE_FIELDS=['instructions','calendarExamples','bookExamples','rejectedExamples','outputGuidance'] as const;
export const emptyProfile=()=>Object.fromEntries(PROFILE_FIELDS.map(field=>[field,'']));
export function digest(value:any):string {
  const stable=(v:any):any=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
export function target(date:any,timeZone:any) {
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/u.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new AdminHttpError(400,'Choose a valid Calendar date.');
  if(typeof timeZone!=='string'||timeZone.length>100)throw new AdminHttpError(400,'Choose a valid time zone.');
  try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{throw new AdminHttpError(400,'Choose a valid time zone.');}
  return `studio-writing-profile/calendar/daily-draft/${date}/${encodeURIComponent(timeZone)}`;
}
export function validateTextFields(value:any,fields:readonly string[],limit:number) {
  if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(k=>!fields.includes(k))||fields.some(k=>typeof value[k]!=='string'||value[k].length>limit))throw new AdminHttpError(400,`Send all writing fields as text under ${limit.toLocaleString()} characters each.`);
  return value;
}
async function storage(params:URLSearchParams,options:RequestInit={}) {
  const {url,headers}=studioStorage();
  const result=await adminFetchJson(`${url}?${params}`,{...options,headers:{...headers,prefer:'return=representation'}});
  if(!result.ok)throw new AdminHttpError(result.status===409?409:503,'Daily writing storage is unavailable or changed. Reload the saved version before retrying.');
  return adminStorageRows<any>(result.payload);
}
export async function readDailyRow(key:string) {
  const rows=await storage(new URLSearchParams({content_key:`eq.${key}`,mode:'eq.article',target_date:'is.null',select:'*',limit:'2'}));
  if(rows.length>1)throw new AdminHttpError(409,'Conflicting daily writing records need review.');
  const row=rows[0];
  if(row&&(row.status!=='DRAFT'||row.lane!=='reference'||row.body!==''||!Number.isFinite(Date.parse(row.updated_at))))throw new AdminHttpError(409,'This private writing record has an invalid saved state.');
  return row??null;
}
export async function saveDailyRow(key:string,expected:any,sections:any,existing:any,actor:string) {
  if(expected!==(existing?.updated_at??null))throw new AdminHttpError(409,'This writing record changed. Reload before saving; newer edits are preserved.');
  const row={content_key:key,surface:'sky',mode:'article',target_date:null,status:'DRAFT',lane:'reference',event_type:'studio-writing-profile',provider:'manual-admin',prompt_version:'calendar-daily-writing-v1',headline:key===DAILY_PROFILE_KEY?'Daily Calendar writing guidance':'Daily Calendar draft',body:'',summary:'',sections,
    source_snapshot:{...existing?.source_snapshot,revision:(existing?.source_snapshot?.revision??0)+1,updatedBy:actor},updated_at:new Date(Math.max(Date.now(),(Date.parse(existing?.updated_at??'')||0)+1)).toISOString()};
  const params=existing?new URLSearchParams({id:`eq.${existing.id}`,content_key:`eq.${key}`,updated_at:`eq.${existing.updated_at}`,status:'eq.DRAFT',lane:'eq.reference',mode:'eq.article'}):new URLSearchParams();
  const rows=await storage(params,{method:existing?'PATCH':'POST',body:JSON.stringify(row)});
  if(rows.length!==1||existing&&rows[0].id!==existing.id||rows[0].updated_at===existing?.updated_at)throw new AdminHttpError(409,'Another editor saved this record. Reload to see the saved version.');
  if(digest(rows[0].sections)!==digest(sections))throw new AdminHttpError(502,'Storage did not confirm this exact edit. Reload before retrying.');
  return rows[0];
}
export async function dailyFacts(date:string,timeZone:string) {
  target(date,timeZone);
  const at=zonedDateTimeToUtc(date,'12:00 PM',timeZone);
  const start=zonedDateTimeToUtc(date,'12:00 AM',timeZone);
  const nextDate=new Date(Date.parse(date)+86400000).toISOString().slice(0,10);
  const end=zonedDateTimeToUtc(nextDate,'12:00 AM',timeZone);
  const sky=await getAstrodienstSky({label:'Geocentric reference',latitude:0,longitude:0,timeZone},at,{includeTransitWindows:false});
  if(sky.calculationProvenance?.actualEphemeris!=='swiss')throw new AdminHttpError(422,'Verified Swiss Ephemeris facts are required before drafting.');
  const moon=sky.positions.find(p=>p.planet==='Moon');
  if(!moon)throw new AdminHttpError(422,'The Moon placement could not be calculated.');
  const transition=sky.moonSignTransition;
  const segments=transition?[{sign:transition.from,start:start.toISOString(),end:transition.occursAt},{sign:transition.to,start:transition.occursAt,end:end.toISOString()}]:[{sign:moon.sign,start:start.toISOString(),end:end.toISOString()}];
  const spans=segments.map(s=>({...s,hours:(Date.parse(s.end)-Date.parse(s.start))/3600000}));
  return {date,timeZone,source:'swiss-ephemeris',provenance:sky.calculationProvenance,moonPhase:sky.moonPhase,signs:spans,mainSign:spans.reduce((a,b)=>a.hours>=b.hours?a:b).sign,transition:transition?{...transition,localTime:new Intl.DateTimeFormat('en-US',{timeZone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(transition.occursAt))}:null};
}
export async function prepareDaily(date:string,timeZone:string,workspace:any) {
  const row=await readDailyRow(DAILY_PROFILE_KEY);
  if(!row)throw new AdminHttpError(409,'Save the daily writing instructions and references first.');
  const profile=validateTextFields(row.sections.profile,PROFILE_FIELDS,30000);
  if(PROFILE_FIELDS.some(k=>!profile[k].trim())||!workspace.thought.trim())throw new AdminHttpError(422,'Add writing instructions, references and a thought for this date before preparing the input.');
  const facts=await dailyFacts(date,timeZone);
  const input=[`CALCULATED FACTS\n\n${JSON.stringify(facts,null,2)}`,`APPROVED THOUGHT\n\n${workspace.thought}`,`DATE-SPECIFIC EXCLUSIONS\n\n${workspace.exclusions}`,`SHORT WRITER CONTRACT\n\n${profile.instructions}`,`CURRENT CALENDAR\n\n${profile.calendarExamples}`,`BOOK WRITING\n\n${profile.bookExamples}`,`REJECTED WRITING — NEGATIVE EVIDENCE ONLY\n\n${profile.rejectedExamples}`,`OUTPUT CONTRACT\n\n${profile.outputGuidance}`].join('\n\n');
  const instructions=responses.instructionsForRole('WRITER','',{surface:'calendar-daily',family:'calendar-daily'});
  const config=provider.normalizeProviderConfig({},'writer');
  const request={...provider.buildProviderRequest({config,role:'writer',input}),background:true,store:true};
  const profileReceipt={id:row.id,updatedAt:row.updated_at,sha256:digest(profile),sourceReceipt:row.sections.sourceReceipt??null};
  return {facts,profile:profileReceipt,config,instructions,request,requestHash:digest({request,instructions,profile:profileReceipt})};
}
