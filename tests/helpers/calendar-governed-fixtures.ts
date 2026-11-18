import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calendarPlanetaryIdentity} from '../../apps/admin/src/calendarPlanetarySources';
import type {LunarCalendarEvent} from '../../apps/web/src/services/ephemeris';

const manifest=JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/bundled-core-manifest-v3.json','utf8'));
const keys=manifest.keys.map((key:string)=>key.slice(key.indexOf(':')+1)).filter((key:string)=>calendarPlanetaryIdentity(key)?.sign);
const calculated=JSON.parse(readFileSync('tests/fixtures/calendar-sky-event-cases.json','utf8')) as {event:LunarCalendarEvent}[];
const slug=(value?:string)=>value?.toLowerCase().replace(/\s+/g,'-');
const candidates=keys.flatMap((key:string)=>{
  const identity=calendarPlanetaryIdentity(key)!;
  const match=calculated.find(({event})=>event.type===identity.kind&&slug(event.planet)===identity.planet&&slug(event.toSign??event.sign)===identity.sign
    &&(identity.kind!=='station'||event.direction===identity.direction&&event.phase===`station-${identity.direction}`));
  return match?[{key,event:match.event,body:`Synthetic governed ${identity.kind} opening.\n\nComplete synthetic governed ${identity.kind} final paragraph.`}]:[];
});
export const governedCalendarCases=['ingress','station'].map(kind=>{
  const sample=candidates.find((candidate:any)=>candidate.event.type===kind);
  assert(sample,'A registered governed Calendar source must have a calculated regression case');return sample!;
}) as {key:string;event:LunarCalendarEvent;body:string}[];

/** Import-shaped synthetic copy; publication still uses the actual API and SQL. */
export async function publishGovernedCalendarFixture(invoke:(method:string,body:unknown,url?:string)=>Promise<any>,sample:typeof governedCalendarCases[number],summary=''){
  const record={contentKey:sample.key,headline:sample.event.title,summary,body:sample.body,content_role:'authored_card',review_status:'needs_review',
    source_package:'tldrastro-fallback-architecture-v3',blocks:sample.body.split('\n\n').map(text=>({type:'para',text}))};
  const created=await invoke('POST',{contentKey:sample.key,surface:'sky',mode:'feed',blockType:null,eventType:sample.key.startsWith('fallback-hook/')?'fallback-hook':'fallback-architecture-v3',
    provider:'tldrastro-fallback-architecture-v3',status:'DRAFT',lane:'reference',reviewState:'owner-review-required',headline:sample.event.title,summary,body:sample.body,
    sections:{packageRecord:record,packageOriginalRecord:structuredClone(record),packageDraft:record,body_you:sample.body,body_they:sample.body,energy:null,intention:null,ritual:null},
    facts:{fallbackArchitectureV3:true,content_role:'authored_card',review_status:'needs_review'},
    sourceSnapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',content_role:'authored_card',review_status:'needs_review',contentType:'authored_card',authoringSource:'synthetic-governed-calendar-import'}});
  assert.equal(created.status,200,JSON.stringify(created.payload));const draft=created.payload.rows[0];
  const published=await invoke('PATCH',{id:draft.id,expectedUpdatedAt:draft.updated_at,ownerAction:'approve-package-revision'});
  assert.equal(published.status,200,JSON.stringify(published.payload));assert.equal(published.payload.rows[0].body,sample.body);
  return published.payload.rows[0];
}
