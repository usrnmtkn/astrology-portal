import assert from 'node:assert/strict';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { calendarPassageKey, calendarPassageIdentity, calendarPassageRecord, renderCalendarPassage, calendarPassageErrors, resolveCalendarPassage } from '../apps/web/src/features/calendar/calendarPassageTemplates.ts';
import { calendarTimingBody } from '../apps/web/src/features/calendar/calendarTimingTemplates.ts';
import { isReaderServableGeneratedContentRow } from '../apps/web/src/content/generatedContentEligibility.ts';
import { calendarWeeklyDayParagraphs } from '../apps/web/src/features/calendar/calendarWeeklyPresentation.ts';

import { publishedPassageSources, calendarStudioMoonSources } from '../apps/admin/src/calendarPassageSources.ts';

const key = calendarPassageKey('daily', '2026-09-28', 'America/New_York');
assert.equal(calendarPassageIdentity(key)?.timeZone, 'America/New_York');
assert.equal(calendarPassageIdentity('calendar-passage/daily/2026-02-30/UTC'), null);
assert.equal(calendarPassageIdentity('calendar-passage/daily/2026-09-28/not-a-zone'), null);
assert.equal(calendarPassageIdentity('calendar-passage/weekly/2026-09-28/UTC'), null);
assert.equal(calendarPassageIdentity('calendar-passage/monthly/2026-09-28/UTC'), null);
assert.equal(calendarPassageIdentity('calendar-passage/weekly/2026-09-27/UTC')?.period, 'weekly');
assert.equal(calendarPassageIdentity('calendar-passage/monthly/2026-09-01/UTC')?.period, 'monthly');
const weeklyDates = ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'];
const weeklyLabels = ['Sunday, October 4, 2026', 'Monday, October 5, 2026', 'Tuesday, October 6, 2026', 'Wednesday, October 7, 2026', 'Thursday, October 8, 2026', 'Friday, October 9, 2026', 'Saturday, October 10, 2026'];
const weeklyDays = weeklyDates.map(dateKey => ({ dateKey, date: `${dateKey}T23:00:00Z` }));
const weeklyBodies = weeklyDates.map(date => [`Exact opening ${date}.`, `**Complete ending ${date}.**`, '[Read more](?date=2026-10-10#sky/lunation/2026-10-10/libra)']);
const weeklyBody = weeklyLabels.map((label, index) => [label, ...weeklyBodies[index]].join('\n\n')).join('\n\n');
assert.deepEqual(calendarWeeklyDayParagraphs(weeklyBody, weeklyDays, 'America/New_York'), new Map(weeklyDates.map((date, index) => [date, weeklyBodies[index]])));
// Never partially extract, silently drop a custom introduction, or guess at mismatched dates.
for (const body of ['Custom complete overview.', `Introduction.\n\n${weeklyBody}`, weeklyBody.replace(weeklyLabels[2], weeklyLabels[1]), weeklyBody.replace(weeklyLabels[0], 'Sunday, October 11, 2026'), weeklyBody.slice(0, weeklyBody.indexOf(weeklyLabels[6]))]) {
  assert.equal(calendarWeeklyDayParagraphs(body, weeklyDays, 'America/New_York'), null);
}
assert.equal(calendarWeeklyDayParagraphs(weeklyBody, weeklyDays, 'Pacific/Auckland'), null);
assert.equal(calendarWeeklyDayParagraphs(weeklyBody, weeklyDays.slice(1), 'America/New_York'), null);
assert.equal(renderCalendarPassage('{{moonSign}}: {{moonWriteup}}', { moonSign: {text:'Test sign',kind:'fact'}, moonWriteup:{text:'Complete synthetic passage.',kind:'copy'} }), 'Test sign: Complete synthetic passage.');
assert.equal(renderCalendarPassage('{{moonWriteup}}', {}), null);
assert.equal(renderCalendarPassage('{{#sunSummary}}{{sunSummary}}{{/sunSummary}}\n\nComplete synthetic passage.', {}), 'Complete synthetic passage.');
assert.ok(calendarPassageErrors('{{imaginary}}').length);
assert.equal(calendarTimingBody('lastFullDay', { moonSign:'First',nextMoonSign:'Second' }), 'The Moon spends the entire day in First before it enters Second tomorrow.');
assert.equal(calendarTimingBody('lastFullDay', {moonSign:'First',nextMoonSign:'Second'}, () => 'Synthetic {{moonSign}} → {{nextMoonSign}}.'), 'Synthetic First → Second.');

const store = await createApiStore([], { uuidIds: true });
const body = 'Synthetic opening.\n\nComplete synthetic ending. {{moonSign}}.';
const record = calendarPassageRecord(key, body);
try {
  const sourceKey = 'authored/sky-lunation-macro/full-moon/aries';
  const sourceResult = await store.invoke('GET', undefined, '/api/admin/generated-content?' + new URLSearchParams({contentKeys:sourceKey,status:'LIVE',limit:'200'}));
  assert.equal(sourceResult.status, 200, JSON.stringify(sourceResult));
  const sourceRow = sourceResult.payload.rows.find(row => row.content_key === sourceKey);
  assert.ok(sourceRow?.sections?.packageRecord, 'An existing approved reading must load without the reader bundle');
  const sourceMap = publishedPassageSources([sourceRow]);
  assert.equal(sourceMap.get(sourceKey)?.body, sourceRow.body);
  assert.equal(publishedPassageSources([{...sourceRow,body:'Modified synthetic copy.'}]).size,0);
  assert.equal(publishedPassageSources([{...sourceRow,sections:{packageRecord:{...sourceRow.sections.packageRecord,review_status:'needs_review'}}}]).size,0);
  const event = {id:'test-moon',type:'lunation',primary:true,title:'Full Moon in Aries',sign:'Aries',startsAt:'2026-09-26T16:49:00Z'};
  const day = {moonSign:'Aries',events:[event]};
  assert.equal(calendarStudioMoonSources(sourceMap).moonWritingForDay(day as any, sourceMap)[0]?.body, sourceRow.body);
  const create = {contentKey:key,surface:'sky',mode:'feed',eventType:'calendar-passage',status:'DRAFT',lane:'reference',body,headline:'Calendar assembled passage',provider:'tldrastro-fallback-architecture-v3',
    sections:{packageRecord:record,packageDraft:record},sourceSnapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',content_role:'full_copy',review_status:'needs_review'}};
  let result = await store.invoke('POST', {...create,status:'LIVE'}); assert.equal(result.status,409,JSON.stringify(result));
  result = await store.invoke('POST', create,undefined,'invalid-owner'); assert.equal(result.status,401);
  result = await store.invoke('POST', create); assert.equal(result.status,200,JSON.stringify(result));
  let row = result.payload.rows[0]; assert.equal(row.status,'DRAFT');
  result = await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'approve-package-revision'});
  assert.equal(result.status,200,JSON.stringify(result));
  row=result.payload.rows[0]; assert.equal(row.status,'LIVE'); assert.equal(row.body,body); assert.ok(isReaderServableGeneratedContentRow(row));
  const original=structuredClone(row);
  const edited='Synthetic revised opening.\n\nComplete revised ending. {{moonSign}}.';
  result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sections:{...row.sections,packageDraft:{...row.sections.packageRecord,body:edited,body_you:edited}}});
  assert.equal(result.status,200,JSON.stringify(result));
  let revision=result.payload.rows[0]; assert.notEqual(revision.id,row.id); assert.equal(revision.mode,'studio-draft'); assert.equal(store.rows.get(row.id).body,original.body); assert.equal(store.rows.get(row.id).status,'LIVE');
  const stale=await store.invoke('PATCH',{id:revision.id,expectedUpdatedAt:'2020-01-01T00:00:00Z',sections:{}}); assert.equal(stale.status,409);
  // Unknown slots must fail at the publication boundary, while the draft stays recoverable.
  result=await store.invoke('PATCH',{id:revision.id,expectedUpdatedAt:revision.updated_at,sections:{...revision.sections,packageDraft:{...revision.sections.packageDraft,body:'{{unknown}}',body_you:'{{unknown}}'}}});
  assert.equal(result.status,400,JSON.stringify(result)); assert.equal(store.rows.get(row.id).body,original.body);
  result=await store.invoke('PATCH',{id:revision.id,expectedUpdatedAt:revision.updated_at,sections:{...revision.sections,packageDraft:{...revision.sections.packageDraft,body:edited,body_you:edited}}});
  assert.equal(result.status,200,JSON.stringify(result));revision=result.payload.rows[0];
  result=await store.invoke('PATCH',{id:revision.id,expectedUpdatedAt:revision.updated_at,ownerAction:'approve-package-revision'});
  assert.equal(result.status,200,JSON.stringify(result)); row=result.payload.rows[0]; assert.equal(row.body,edited); assert.equal(store.rows.get(revision.id).status,'ARCHIVED');
  const retry=await store.invoke('PATCH',{id:revision.id,expectedUpdatedAt:revision.updated_at,ownerAction:'approve-package-revision'}); assert.equal(retry.status,200,JSON.stringify(retry));
  const inventory=await store.invoke('GET',undefined, '/api/admin/generated-content-inventory?' + new URLSearchParams({contentKeys:key,status:'all',limit:'200'}));
  assert.equal(inventory.status,200,JSON.stringify(inventory)); assert.ok(inventory.payload.rows.some(item=>item.body===edited));
  const reader=await store.invoke('POST',{keys:[key]},'/api/content-reader');
  assert.equal(reader.status,200,JSON.stringify(reader)); assert.equal(reader.payload.rows[0].body,edited);
  const history=await store.invoke('GET',undefined,`/api/admin/content-history?id=${row.id}`);
  assert.equal(history.status,200,JSON.stringify(history)); assert.ok(history.payload.versions.some(version=>version.row.body===body));
  const retired=await store.invoke('POST',{action:'retire',contentKey:key,id:row.id,expectedUpdatedAt:row.updated_at},'/api/admin/content-publication');
  assert.equal(retired.status,200,JSON.stringify(retired)); assert.equal(retired.payload.publication.state,'retired');
  const retiredReader=await store.invoke('POST',{keys:[key]},'/api/content-reader'); assert.equal(retiredReader.status,200); assert.equal(retiredReader.payload.rows.length,0);
  assert.equal((await store.invoke('POST',{action:'retire',contentKey:key,id:row.id,expectedUpdatedAt:original.updated_at},'/api/admin/content-publication')).status,409);
  const liveMap=new Map([[key,{contentKey:key,status:'LIVE',body:row.body}]]) as any;
  assert.equal(resolveCalendarPassage('daily','2026-09-28','America/New_York',liveMap,{moonSign:{text:'Test sign',kind:'fact'}})?.body, edited.replace('{{moonSign}}','Test sign'));
  assert.equal(resolveCalendarPassage('daily','2026-09-28','UTC',liveMap,{moonSign:{text:'Test sign',kind:'fact'}}),null);
  console.log('PASS Calendar passage API create/save/reload/publish, live draft isolation, stale conflicts, unknown variables, atomic publication and retry; exact date/timezone reader selection.');
} finally { await store.close(); }
