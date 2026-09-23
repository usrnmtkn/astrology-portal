import assert from 'node:assert/strict';
import { compareLoading, LOADING_PROTOCOL, median, profiles } from './lib/loading-comparison.mjs';
assert.equal(profiles.mobile.download, 200_000);
assert.equal(median([5, 1, 7, 3]), 4);
const experiment = () => ({ protocol: LOADING_PROTOCOL, plannedPairs: 30, completedAt: '2026-09-23T00:00:00Z', profiles: structuredClone(profiles), identity: { baseline: 'a', candidate: 'b' }, fixtureHash: 'fixture', publicationHash: 'complete-ledger',
  requiredCells: [
    { scenario: 'sky', profile: 'mobile', cache: 'fresh', milestone: 'content', primary: false },
    { scenario: 'sky', profile: 'mobile', cache: 'reload', milestone: 'content', primary: true }
  ],
  samples: Array.from({ length: 30 }, (_, pair) => ['fresh', 'reload'].flatMap(cache => ['baseline', 'candidate'].map(variant => ({
    scenario: 'sky', profile: 'mobile', cache, pair, variant, buildHash: variant === 'baseline' ? 'a' : 'b', fixtureHash: 'fixture',
    contentHash: 'exact-text', publicationHash: 'complete-ledger', errors: [],
    marks: { content: (cache === 'fresh' ? 8000 : variant === 'baseline' ? 4000 : 3400) + pair % 3 * 10 }
  })))).flat() });
assert.equal(compareLoading(experiment()).status, 'pass');
// The previous release's faster reload / slower cold tradeoff must be blocked.
let input = experiment();
input.samples.filter(x => x.cache === 'fresh' && x.variant === 'candidate').forEach(x => x.marks.content += 370);
assert.equal(compareLoading(input).cells[0].status, 'regression');
assert.equal(compareLoading(input).status, 'blocked');
for (const mutate of [
  x => x.samples[0].errors.push('worker failed'),
  x => x.samples[0].contentHash = 'different-copy',
  x => x.samples[0].publicationHash = 'new-publication',
  x => x.samples[0].buildHash = 'new-build',
  x => x.samples[0].fixtureHash = 'new-fixture',
  x => x.samples[0].marks.content = null,
  x => x.samples.splice(0, 1),
  x => x.samples.splice(0, 4)
]) { input = experiment(); mutate(input); assert.equal(compareLoading(input).status, 'blocked'); }
input = experiment(); input.samples.push(input.samples[0]); assert.equal(compareLoading(input).status, 'invalid');
input = experiment(); input.profiles.mobile.download *= 8; assert.equal(compareLoading(input).status, 'invalid');
input = experiment(); input.traced = true; assert.equal(compareLoading(input).status, 'invalid');
input = experiment(); delete input.completedAt; assert.equal(compareLoading(input).status, 'invalid');
input = experiment(); input.requiredCells.push(input.requiredCells[0]); assert.equal(compareLoading(input).status, 'invalid');
input = experiment(); input.plannedPairs = 31; assert.equal(compareLoading(input).status, 'blocked');
input = experiment(); input.samples.push({ ...input.samples[0], scenario: 'unreported' }); assert.equal(compareLoading(input).status, 'invalid');
input = experiment(); input.samples.filter(x => x.pair === 0).forEach(x => x.contentHash = 'same-wrong-copy-on-both-sides'); assert.equal(compareLoading(input).status, 'blocked');
// Tiny but consistent improvements do not pass the practical effect threshold.
input = experiment(); input.samples.filter(x => x.cache === 'reload' && x.variant === 'candidate').forEach(x => x.marks.content += 590);
assert.equal(compareLoading(input).cells[1].status, 'inconclusive');
console.log('Loading gates reject regressions, small/uncertain gains, failed attempts and changed evidence.');
