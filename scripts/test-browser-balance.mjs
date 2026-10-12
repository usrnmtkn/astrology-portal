import assert from 'node:assert/strict';
import { balanceTests } from './balanced-browser-tests.mjs';

const timings = { durations: { a: 220, b: 215, c: 210, d: 205, e: 50, f: 45 }, fallbackSeconds: 30 };
const names = ['a', 'b', 'c', 'd', 'e', 'f', 'new'];
const bins = balanceTests(names, 3, timings);
assert.deepEqual(bins.flatMap(bin => bin.tests).sort(), [...names].sort());
assert.deepEqual(balanceTests([...names].reverse(), 3, timings), bins, 'Discovery order must not change shard assignments');
assert.equal(bins.reduce((n, bin) => n + bin.seconds, 0), 975, 'New tests receive a nonzero estimate');
assert(bins.every(bin => bin.seconds <= 415));
assert.throws(() => balanceTests(['a', 'a'], 2, timings));
assert.throws(() => balanceTests(names, 0, timings));
console.log('PASS: deterministic duration balancing, complete coverage and new-test fallback.');
