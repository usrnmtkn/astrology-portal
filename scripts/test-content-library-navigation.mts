import assert from 'node:assert/strict';
import { contentLibraryDestination, contentLibrarySearchRank, contentLibrarySkyEditParams } from '../apps/admin/src/contentLibraryNavigation';

const article = { content_key: 'sky-article/sun/scorpio/2026/2026-10-23' };
const revision = { content_key: article.content_key.replace('sky-article/', 'sky-article-revision/') };
const moon = { content_key: 'sky-season-fallback/libra-2026/moon/scorpio/2026-10-11' };
assert.equal(contentLibrarySearchRank(article, 'Scorpio Season 2026', 'Scorpio Season 2026'), 0);
assert.equal(contentLibrarySearchRank(article, 'Scorpio Season 2026: A title', 'Scorpio Season 2026'), 1);
assert.equal(contentLibrarySearchRank(moon, 'Moon in Scorpio · October 11, 2026', 'Scorpio Season 2026'), null,
  'A season in a source path must not make another season’s Moon passage a title match.');
assert.equal(contentLibrarySearchRank(moon, 'Moon in Scorpio · October 11, 2026', moon.content_key), 4,
  'Exact source lookup remains available.');
assert.equal(contentLibrarySearchRank(moon, 'Moon in Scorpio · October 11, 2026', 'moon scorp'), 2);
assert.equal(contentLibrarySearchRank(article, 'Scorpio Season 2026', '2026-10-23'), 3);
assert.equal(contentLibraryDestination(revision)?.sourceKey, article.content_key);
assert.deepEqual(contentLibraryDestination({ content_key: 'article/manual/scorpio-season-2026' })?.areas, ['sky', 'calendar']);
assert.equal(contentLibraryDestination(article)?.label, 'Sky · Dated article');
const day = contentLibraryDestination({ content_key: 'calendar-passage/daily/2026-10-21/America%2FNew_York' })!;
assert.equal(day.date, '2026-10-21');
assert.equal(day.detail, '2026-10-21 · America/New_York · This date only.');
assert.equal(contentLibrarySearchRank({ content_key: 'calendar-passage/daily/2026-10-21/America%2FNew_York' }, 'Daily overview', 'October 21'), 3);
assert.equal(contentLibrarySearchRank({ content_key: 'calendar-passage/daily/2026-10-21/America%2FNew_York' }, 'Daily overview', 'calendar-passage/daily/2026-10-21/America%2FNew_York'), 4);
assert.match(contentLibraryDestination({ content_key: 'calendar-passage/daily/2026-02-30/UTC' })!.detail, /needs checking/u);
assert.equal(contentLibraryDestination({ content_key: 'calendar-passage/daily/shared' })?.kind, 'source');
assert.equal(contentLibraryDestination({ content_key: 'authored/calendar-moon-transition/aquarius/pisces' })?.label, 'Calendar · Moon transition');
assert.deepEqual(contentLibraryDestination({ content_key: 'authored/sky-lunation-macro/full-moon/aries' })?.areas, ['sky', 'calendar']);
assert.equal(contentLibraryDestination({ content_key: 'studio-lunation/synthetic-draft' })?.kind, 'workspace');
assert.equal(contentLibraryDestination({ content_key: 'unrelated/source' }), null);
const datedParams = await contentLibrarySkyEditParams(revision, '2026-10-24', 'Pacific/Auckland');
assert.equal(datedParams?.get('editSource'), article.content_key);
assert.equal(datedParams?.get('date'), '2026-10-23', 'Dated articles open their own visit, even after another reader date was selected.');
assert.equal(datedParams?.get('timeZone'), 'Pacific/Auckland');
assert.equal(datedParams?.get('from'), 'library');
const sharedParams = await contentLibrarySkyEditParams({ content_key: 'sky-placement/article/sun/libra' }, '2026-10-21', 'America/New_York');
assert.equal(sharedParams?.get('date'), '2026-10-21', 'Shared sources keep the selected reader date.');
assert.equal(await contentLibrarySkyEditParams({ content_key: 'unrelated/source' }, null), null);
console.log('Content Library destination, title ranking, date and source lookup contracts passed.');
