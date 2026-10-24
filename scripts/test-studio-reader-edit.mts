import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStudioPassageEdit, skyPassageEditPlacement, skyPassageEditSource, studioPassageEditHref } from '../src/shared/studioPassageEdit';
import { calendarPassageReviewParams } from '../apps/admin/src/calendarPassageReviewRoute';

test('Review Queue derives the exact dated Calendar context from its canonical source key', () => {
  for (const [date,timeZone] of [['2026-10-21','America/New_York'],['2026-11-01','America/New_York'],
    ['2026-10-22','Asia/Tokyo'],['2026-10-21','UTC'],['2026-10-21','Etc/GMT+5']]) {
    const sourceKey=`calendar-passage/daily/${date}/${encodeURIComponent(timeZone)}`;
    const params=calendarPassageReviewParams(sourceKey);
    assert.equal(params?.get('view'),'daily-sky');
    assert.deepEqual(parseStudioPassageEdit(`#calendar-writeups?${params}`),{surface:'calendar',date,timeZone,sourceKey});
  }
  for (const key of ['calendar-passage/daily/2026-02-30/UTC','calendar-passage/daily/2026-10-21/bad-zone',
    'calendar-passage/daily/2026-10-21/America%252FNew_York','calendar-passage/daily/2026-10-21/%ZZ',
    'calendar-passage/daily/2026-10-21/America/New_York','calendar-passage/daily/2026-10-21/UTC/extra',
    'calendar-passage/daily/template','authored/calendar-moon-transition/aquarius/pisces','sky-article/sun/libra/2026/2026-09-22']) {
    assert.equal(calendarPassageReviewParams(key),null,key);
  }
});

test('reader handoffs preserve exact dates, zones and source keys without credentials or cross-origin destinations', () => {
  for (const context of [
    { surface:'calendar',date:'2026-10-21',timeZone:'America/New_York',sourceKey:'calendar-passage/daily/2026-10-21/America%2FNew_York' },
    { surface:'calendar',date:'2026-10-21',timeZone:'Asia/Tokyo',sourceKey:'authored/calendar-moon-transition/aquarius/pisces' },
    { surface:'sky',date:'2026-10-21',timeZone:'America/New_York',sourceKey:'sky-article/sun/libra/2026/2026-09-22' },
    { surface:'sky',date:'2026-10-24',timeZone:'UTC',sourceKey:'sky-placement/article/saturn/aries' },
  ] as const) {
    const href=studioPassageEditHref(context)!;
    assert.ok(href.startsWith('/admin/content#'));
    assert.deepEqual(parseStudioPassageEdit(new URL(href,'https://example.test').hash),context);
  }
  for (const query of ['date=2026-02-30&timeZone=UTC&editSource=sky-placement/article/sun/libra',
    'date=2026-10-21&timeZone=bad-zone&editSource=sky-placement/article/sun/libra',
    'date=2026-10-21&timeZone=UTC&editSource=https://example.test',
    'date=2026-10-21&timeZone=UTC&editSource=sky-article-revision/sun/libra/2026/2026-09-22']) {
    assert.equal(parseStudioPassageEdit(`#sky-writeups?${query}`),null);
  }
  assert.equal(parseStudioPassageEdit('#calendar-writeups?date=2026-10-21&timeZone=UTC&editSource=calendar-passage/daily/2026-10-22/UTC'),null);
});

test('Sky uses the actual dated reader source before its shared fallback', () => {
  const keys=['compiled-sky-article-edition-v2','sky-placement/article/sun/libra','sky-article/sun/libra/2026/2026-09-22'];
  assert.equal(skyPassageEditSource(keys),keys[2]);
  assert.deepEqual(skyPassageEditPlacement(keys[2]),{planet:'sun',sign:'libra'});
  assert.deepEqual(skyPassageEditPlacement(keys[1]),{planet:'sun',sign:'libra'});
  assert.deepEqual(skyPassageEditPlacement('sky-season-fallback/libra-2026/moon/aries/2026-09-22'),{planet:'moon',sign:'aries'});
  assert.equal(skyPassageEditSource(['sky-v4-canonical-reader-v1']),undefined);
});
