import assert from 'node:assert/strict';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { calendarPassageKey, calendarPassageIdentity, calendarPassageRecord, renderCalendarPassage, calendarPassageErrors, resolveCalendarPassage } from '../apps/web/src/features/calendar/calendarPassageTemplates.ts';
import { calendarTimingBody } from '../apps/web/src/features/calendar/calendarTimingTemplates.ts';
import { isReaderServableGeneratedContentRow } from '../apps/web/src/content/generatedContentEligibility.ts';

const key = calendarPassageKey('daily', '2026-09-28', 'America/New_York');
assert.equal(calendarPassageIdentity(key)?.timeZone, 'America/New_York');
assert.equal(calendarPassageIdentity('calendar-passage/daily/2026-02-30/UTC'), null);
assert.equal(calendarPassageIdentity('calendar-passage/daily/2026-09-28/not-a-zone'), null);
assert.equal(calendarPassageIdentity('calendar-passage/weekly/2026-09-28/UTC'), null);
assert.equal(calendarPassageIdentity('calendar-passage/monthly/2026-09-28/UTC'), null);
assert.equal(calendarPassageIdentity('calendar-passage/weekly/2026-09-27/UTC')?.period, 'weekly');
assert.equal(calendarPassageIdentity('calendar-passage/monthly/2026-09-01/UTC')?.period, 'monthly');
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
