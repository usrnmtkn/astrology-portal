import assert from 'node:assert/strict';
import {isDisplayRetrograde} from '../apps/web/src/services/astrologyDisplay';
import {placementCardCountdownLabel,placementCardCountdowns,placementVisitWindow} from '../apps/web/src/services/placementCardTiming';
import {createServer} from 'vite';
import type {PlanetPosition} from '../apps/web/src/types';
const vite=await createServer({root:'apps/web',appType:'custom',logLevel:'silent',server:{middlewareMode:true,ws:false}});
const {planetaryHoroscopeWindow}=await vite.ssrLoadModule('/src/features/horoscopes/usePlanetaryHoroscopeSources.ts');
const {getAstrodienstSky}=await vite.ssrLoadModule('/src/services/ephemeris.ts');
try {

for(const [start,end,expected] of [
 ['2026-10-29','2026-11-01','3 days left'],
 ['2026-10-29','2026-10-29','Ends today'],
 ['2026-10-29','2026-11-26','4 weeks left'],
 ['2026-10-29','2027-01-29','3 months left'],
 ['2026-10-29','2032-10-29','6 years left'],
 ['2026-12-30','2027-01-02','3 days left']
])assert.equal(placementCardCountdownLabel(start,end,'America/New_York'),expected);
assert.equal(placementCardCountdownLabel('invalid','2027-01-01'),null);
for(const [transitStart,transitEnd] of [
 [undefined,undefined],['invalid','2027-01-01'],['2026-01-01','invalid'],
 ['2027-01-02','2027-01-01'],['2027-01-01','2027-01-01']
])assert.equal(placementVisitWindow({planet:'Sun',transitStart,transitEnd} as PlanetPosition,'2026-10-29T16:00:00Z'),null,'Missing, invalid, reversed and empty visits cannot show a countdown');
assert.equal(placementCardCountdownLabel('2027-01-02','2027-01-01'),null);
assert.equal(placementCardCountdownLabel('2026-11-01T03:30:00Z','2026-11-02T05:30:00Z','America/New_York'),'2 days left');
assert.equal(placementCardCountdownLabel('2026-11-01T03:30:00Z','2026-11-02T05:30:00Z','Pacific/Auckland'),'1 day left');
for(const timeZone of ['America/New_York','Pacific/Auckland'])for(const date of ['2026-10-02','2026-10-29','2026-12-15']){
 const sky=await getAstrodienstSky({label:'Synthetic QA location',latitude:40.7,longitude:-74,timeZone},new Date(`${date}T16:00:00Z`),{includeTransitWindows:true});
 for(const position of sky.positions){
  const visit=placementVisitWindow(position,sky.generatedAt);
  const window=planetaryHoroscopeWindow(position,sky.generatedAt);
  const labels=placementCardCountdowns(position,sky.generatedAt,timeZone);
  assert(visit,`${date} ${position.planet}: calculated visit is available`);
  assert(window,`${date} ${position.planet}: calculated article window is available`);
  assert(labels.durationLabel,`${date} ${position.planet}: no arc without duration`);
  if(isDisplayRetrograde(position)&&position.retrogradeWindowSource==='station'){
   assert(labels.retrogradeDurationLabel,`${date} ${position.planet}: verified station countdown`);
   assert.equal(window.end.toISOString(),new Date(position.retrogradeEnd!).toISOString());
  }else {
   assert.equal(labels.retrogradeDurationLabel,null,'background motion is not a planetary retrograde chapter');
   assert.equal(window.end.toISOString(),visit.end.toISOString());
  }
 }
 const venus=sky.positions.find(p=>p.planet==='Venus')!;
 if(date==='2026-10-02')assert.match(placementVisitWindow(venus,sky.generatedAt)!.end.toISOString(),/^2026-10-25/,'direct Venus ends at the current visit, not January residency');
 if(date==='2026-12-15')assert.match(placementVisitWindow(venus,sky.generatedAt)!.end.toISOString(),/^2027-01-07/,'return Venus keeps its calculated exit');
}
console.log('Placement countdowns passed: all calculated planets/points, direct and Rx, return visit, station boundary, local midnight, DST and year boundary.');

} finally { await vite.close(); }
