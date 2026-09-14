import assert from 'node:assert/strict';
import {emptyHouseSourceKeys,emptyHouseRulers} from '../apps/admin/src/emptyHouseSources.ts';
import {compositionSourcesForSurface} from '../apps/admin/src/compositionSurfaceSources.ts';
import {servingPackageRecords} from '../api/_lib/content-live-status.ts';
import {createFallbackRenderer} from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import fs from 'node:fs';
const root='apps/web/src/content/fallbackArchitectureV3/';
const renderer=createFallbackRenderer(JSON.parse(fs.readFileSync(root+'templates/fallback-templates-v3.json','utf8')),JSON.parse(fs.readFileSync(root+'source-rows/fallback-source-rows-v3.json','utf8')));
const projection=JSON.parse(fs.readFileSync('packages/astro-knowledge/review/empty-house-v14/serving-projection-v14-projection-5.json','utf8'));
const backlog=new Set<string>(projection.traditional_authoring_backlog.keys);
assert.equal(backlog.size,33,'Only the 33 explicitly documented traditional house-1 cells are source gaps.');
const observedGaps=new Set<string>();
const rulerSystem='traditional';
assert.equal(emptyHouseRulers.scorpio,'mars');
assert.equal(emptyHouseRulers.aquarius,'saturn');
assert.equal(emptyHouseRulers.pisces,'jupiter');
for(let house=1;house<=12;house++) for(const sign of Object.keys(emptyHouseRulers)) for(let rulerHouse=1;rulerHouse<=12;rulerHouse++) {
 if(house===rulerHouse)continue;
 const keys=emptyHouseSourceKeys(house,sign,rulerHouse);
 const backlogKey=house===1?`fallback-hook/empty-house/rising-ruler/${sign}/${emptyHouseRulers[sign]}/${rulerHouse}`:'';
 if(backlog.has(backlogKey)) {
  // Verify refusal, rather than inventing prose or silently switching rulers.
  assert.throws(()=>renderer.renderNatalEmptyHouse({house,sign,rulerHouse,rulerSystem},{includeEmptyHouseBridge:true}),error=>error instanceof Error && error.name==='SourceGapError' && error.message.includes(`empty house ${house}/${sign}/${emptyHouseRulers[sign]}-in-${rulerHouse}`));
  observedGaps.add(backlogKey);
 } else {
  const rendered=renderer.renderNatalEmptyHouse({house,sign,rulerHouse,rulerSystem},{includeEmptyHouseBridge:true});
  assert(rendered.sourceKeys.every((key:string)=>keys.includes(key)),`${house}/${sign}/${rulerHouse}/${rulerSystem}`);
 }
 const rows=keys.filter(key=>servingPackageRecords.has(key)).map(key=>({id:key,content_key:key}));
 assert.equal(compositionSourcesForSurface('natal-empty-house',rows,[]).length,rows.length);
}
assert.deepEqual(observedGaps,backlog,'Every documented gap is exercised; no new gap is accepted.');
assert.deepEqual(emptyHouseSourceKeys(1,'gemini',1),[]);
console.log('PASS traditional empty-house selectors for every supported cell, plus exact refusal of all 33 documented authoring-backlog cells');
