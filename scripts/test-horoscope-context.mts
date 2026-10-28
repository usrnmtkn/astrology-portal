import assert from 'node:assert/strict';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {projectReaderRow} from '../apps/web/src/content/readerRowProjection.mjs';

const edition=emptyHoroscopeEdition({period:'daily',audience:'rising',timeZone:'America/New_York',startsAt:'2026-10-13T04:00:00.000Z',endsAt:'2026-10-14T04:00:00.000Z'});
edition.passages=edition.passages.map(p=>({...p,headline:`${p.sign} fixture`,body:`Complete ${p.sign} opening.\n\nComplete ${p.sign} ending.`}));
const privateText='PRIVATE AUTHORING SENTINEL';
const brief={schema:'horoscope-brief/v1',window:edition.window,calculatedAt:'2026-10-13T16:00:00.000Z',provenance:{actualEphemeris:'swiss',privateNotes:privateText},positions:[{planet:'Mercury',sign:'Scorpio',degree:20,motion:'retrograde',notes:privateText}],signs:[{sign:'gemini',houses:[{planet:'Mercury',house:6,notes:privateText}]}],events:[{privateNotes:privateText}],coverage:privateText};
const row={id:'dddddddd-dddd-4ddd-dddd-dddddddddddd',content_key:horoscopeEditionKey(edition.window),updated_at:'2026-10-13T16:00:00.000Z',surface:'sky',mode:'article',status:'LIVE',lane:'serving',review_state:null,body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief,signature:privateText},ownerNotes:privateText}};
const projected=projectReaderRow(row)!;
const context=projected.facts!.horoscopeContext as any;
assert.equal(context.calculatedAt,brief.calculatedAt);
assert.deepEqual(context.positions[0],{planet:'Mercury',sign:'Scorpio',degree:20,motion:'retrograde',houses:[null,null,6,null,null,null,null,null,null,null,null,null]});
assert(!JSON.stringify(projected).includes(privateText),'The authoring packet, future fields, notes, events and signatures remain private.');
assert.equal(projected.body,row.body,'The full saved edition is unchanged.');
for(const patch of [{window:{...brief.window,startsAt:'2026-10-12T04:00:00.000Z'}},{calculatedAt:edition.window.endsAt},{calculatedAt:'invalid'},{provenance:{actualEphemeris:'unverified'}},{positions:[brief.positions[0],brief.positions[0]]}]){
 const result=projectReaderRow({...row,facts:{horoscopeBrief:{brief:{...brief,...patch}}}})!;
 assert.equal(result.facts?.horoscopeContext,undefined,'Inconsistent, expired or ambiguous facts do not acquire a context panel.');
 assert.equal(result.body,row.body);
}
for(const source of [{...row,facts:{}},{...row,status:'DRAFT'},{...row,body:'Different saved copy'}])assert.equal(projectReaderRow(source)?.facts?.horoscopeContext,undefined);
assert.equal((projectReaderRow({...row,facts:{horoscopeBrief:{brief:{...brief,signs:'invalid'}}}})!.facts!.horoscopeContext as any).positions[0].houses[2],null,'Missing house facts stay missing.');
console.log('Horoscope context: exact edition/window, verified event-time facts, complete copy and private authoring boundaries passed.');
