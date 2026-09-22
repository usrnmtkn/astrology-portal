import assert from 'node:assert/strict';
import { liveSkyReference, remainingSkyMinutes, skyCivilDate } from '../apps/web/src/services/skyClock.ts';
import { getAstrodienstSky } from '../apps/web/src/services/ephemeris.ts';
const now = new Date('2026-09-08T02:00:00Z');
assert.equal(skyCivilDate('America/New_York', new Date('2026-09-23T00:06:30Z')), '2026-09-22');
assert.equal(skyCivilDate('Asia/Tokyo', new Date('2026-09-22T23:30:00Z')), '2026-09-23');
assert.equal(skyCivilDate('America/New_York', new Date('2027-01-01T00:01:00Z')), '2026-12-31');
assert.equal(skyCivilDate('America/New_York', new Date('2026-03-08T07:01:00Z')), '2026-03-08');
assert.equal(liveSkyReference('2026-09-07', 'America/New_York', now)?.toISOString(), now.toISOString());
assert.equal(liveSkyReference('2026-09-08', 'America/New_York', now), null);
assert.equal(liveSkyReference('2026-09-08', 'Asia/Tokyo', now)?.toISOString(), now.toISOString());
assert.equal(remainingSkyMinutes(new Date('2026-09-07T16:00Z'), new Date('2026-09-07T16:49:29Z')), 50);
assert.equal(remainingSkyMinutes(new Date('2026-09-07T16:01Z'), new Date('2026-09-07T16:49:29Z')), 49);
assert.equal(remainingSkyMinutes(new Date('2026-09-07T17:00Z'), new Date('2026-09-07T16:49:29Z')), 0);
const location = { label: 'New York, NY', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
for (const [time, sign] of [['2026-09-07T16:00:00Z', 'Cancer'], ['2026-09-07T16:49:30Z', 'Leo'], ['2026-09-07T21:51:00Z', 'Leo'], ['2026-09-09T19:35:06Z', 'Virgo']]) {
  const sky = await getAstrodienstSky(location, new Date(time));
  assert.equal(sky.positions.find(p => p.planet === 'Moon')?.sign, sign);
  if (sign === 'Cancer') {
    assert.equal(sky.moonStatus?.remainingLabel, '50min');
    assert.equal(sky.moonStatus?.durationLabel, '3hrs 10min');
  }
  else assert.notEqual(sky.moonStatus?.kind, 'void');
}
console.log('Live clock timezone, rounding, and Swiss Moon ingress regressions passed.');
