import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAstrodienstSky, getLunarCalendarWeek } from '../apps/web/src/services/ephemeris';
import { zonedDateTimeToUtc } from '../apps/web/src/services/timezones';
import { calendarWorkspaceReading, calendarWorkspaceTransitionKey } from '../apps/admin/src/calendarPassageWorkspace';
import { calendarPassageKey } from '../src/shared/features/calendar/calendarPassageTemplates';
import { installContentPublications, contentPublicationRecords } from '../apps/web/src/content/contentPublicationState';
import { moonSignTransitionForPair } from '../src/shared/features/calendar/moonSignTransitions';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';

for (const zone of ['America/New_York', 'Asia/Tokyo']) test(`same-date actual Calendar assembly and isolated publication simulation: ${zone}`, async () => {
  const date = '2026-10-21';
  const location = { label: 'Geocentric reference', latitude: 0, longitude: 0, timeZone: zone };
  const instant = zonedDateTimeToUtc(date, '12:00 PM', zone);
  const [context, sky] = await Promise.all([getLunarCalendarWeek(location, instant), getAstrodienstSky(location, instant)]);
  const content = new Map();
  const before = JSON.stringify([context, sky, [...content], contentPublicationRecords()]);
  const published = calendarWorkspaceReading('daily', context, date, sky, content);
  assert.equal(published.values.moonSign.text, 'Aquarius');
  assert.equal(published.values.nextMoonSign.text, 'Pisces');
  assert.equal(published.sourceLabel, 'Calendar source assembly');
  const transitionKey = calendarWorkspaceTransitionKey(published.values)!;
  assert.equal(transitionKey, 'authored/calendar-moon-transition/aquarius/pisces');
  const original = moonSignTransitionForPair('Aquarius', 'Pisces');
  assert.equal(published.transition?.body,original, 'The event card always uses its full shared transition, even when the daily overview selects other Moon writing.');
  if (zone === 'America/New_York') assert.ok(published.body!.includes(original), 'The entire canonical transition, including its final sentence, must be preserved.');
  const draft = calendarWorkspaceReading('daily', context, date, sky, content, { key: transitionKey, body: 'Synthetic shared opening.\n\nComplete shared ending.' });
  if (zone === 'America/New_York') {
    assert.match(draft.body!, /Synthetic shared opening/);
    assert.match(draft.body!, /Complete shared ending/);
    assert.notEqual(draft.body, published.body);
  } else assert.equal(draft.body, published.body, 'The date selects other Moon writing in this zone.');
  assert.equal(draft.transition?.body,'Synthetic shared opening.\n\nComplete shared ending.');
  assert.equal(JSON.stringify([context, sky, [...content], contentPublicationRecords()]), before, 'Preview must not mutate inputs, source cache, or ledger.');

  const dateKey = calendarPassageKey('daily', date, zone);
  content.set(dateKey, {id:'dated', contentKey:dateKey, status:'LIVE',body:'Complete dated opening.\n\nComplete dated ending.'});
  const dated = calendarWorkspaceReading('daily', context, date, sky, content);
  const hiddenShared = calendarWorkspaceReading('daily', context, date, sky, content, {key: transitionKey,body:'A different complete shared source.'});
  assert.equal(hiddenShared.body, dated.body, 'Expanded date-only editions retain precedence over a shared-source edit.');
  assert.equal(hiddenShared.sourceKey, dateKey);
  assert.equal(hiddenShared.transition?.body,'A different complete shared source.', 'A dated overview must not hide the event card’s shared impact.');
  const dateDraft = calendarWorkspaceReading('daily', context, date, sky, content, {key: dateKey,body:'Complete draft opening: {{moonSign}}.\n\n{{#hasFullMoon}}Omitted condition.{{/hasFullMoon}}Complete draft ending.'});
  assert.equal(dateDraft.body, 'Complete draft opening: Aquarius.\n\nComplete draft ending.');
  assert.equal(content.get(dateKey).body, dated.body, 'The published edition remains intact.');
  // Live tokens intentionally opt a dated edition into shared-source updates.
  content.set(dateKey, {...content.get(dateKey),body:'{{moonWriteup}}'});
  if (zone === 'America/New_York') assert.match(calendarWorkspaceReading('daily', context, date, sky, content, {key:transitionKey,body:'Synthetic shared ending.'}).body!, /Synthetic shared ending/);

  if (zone === 'America/New_York') {
    installContentPublications([{content_key:dateKey,state:'retired',updated_at:'2026-10-21T00:00:00Z',revision:1,row_id:null,row_updated_at:null}]);
    assert.equal(calendarWorkspaceReading('daily', context, date, sky, content).sourceKey, null);
    assert.equal(calendarWorkspaceReading('daily', context, date, sky, content, {key:dateKey,body:'Complete restored dated passage.'}).sourceKey, dateKey);
    assert.equal(contentPublicationRecords().find(row => row.content_key===dateKey)!.state,'retired', 'Draft does not change retirement state.');
    installContentPublications([], 'complete-live');
  }
});

test('shared Moon draft uses the actual private API, reloads completely, and never changes published copy until approval', async () => {
  const key = 'authored/calendar-moon-transition/aquarius/pisces';
  const store = await createApiStore([], {uuidIds:true});
  try {
    const get = () => store.invoke('GET',undefined,'/api/admin/generated-content-inventory?'+new URLSearchParams({contentKey:key,status:'all',limit:'10'}));
    const source = (await get()).payload.rows[0];
    assert.equal(source.id, `package:${key}`);
    const body = 'Synthetic shared Moon opening.\n\nComplete shared Moon final sentence.';
    const record = source.sections.packageRecord;
    const draft = await store.invoke('POST',{contentKey:key,surface:'sky',mode:'in_depth',eventType:'fallback-hook',blockType:'fallback_hook',status:'DRAFT',lane:'reference',headline:record.headline,body,
      facts:{fallbackArchitectureV3:true},provider:'tldrastro-fallback-architecture-v3',sections:{...source.sections,packageRecord:record,packageDraft:{...record,body,body_you:body}},
      sourceSnapshot:{sourcePackage:record.source_package,content_role:'full_copy',review_status:'needs_review'}});
    assert.equal(draft.status,200,JSON.stringify(draft.payload));
    const saved = draft.payload.rows[0];
    assert.equal(saved.status,'DRAFT');
    assert.equal((await get()).payload.rows[0].sections.packageDraft.body_you,body);
    assert.equal((await store.publication.publications()).length,0);
    const published = await store.invoke('PATCH',{id:saved.id,expectedUpdatedAt:saved.updated_at,ownerAction:'approve-package-revision'});
    assert.equal(published.status,200,JSON.stringify(published.payload));
    assert.equal(published.payload.rows[0].body,body);
    const live = published.payload.rows[0];
    const revised = body+'\n\nComplete second revision.';
    const revision = await store.invoke('PATCH',{id:live.id,expectedUpdatedAt:live.updated_at,sections:{...live.sections,packageDraft:{...live.sections.packageRecord,body:revised,body_you:revised}}});
    assert.equal(revision.status,200,JSON.stringify(revision.payload));
    assert.notEqual(revision.payload.rows[0].id, live.id, 'A pending shared Moon revision must have a separate identity.');
    assert.deepEqual(store.rows.get(live.id),live,'Draft saving must preserve every column of the published source.');
    const conflict = await store.invoke('PATCH',{id:revision.payload.rows[0].id,expectedUpdatedAt:'2000-01-01T00:00:00Z',sections:{}});
    assert.equal(conflict.status,409);
  } finally {store.close();}
});
