import assert from 'node:assert/strict';
import {emptyHouseSourceKeys,emptyHouseRulers} from '../apps/admin/src/emptyHouseSources.ts';
import {compositionSourcesForSurface} from '../apps/admin/src/compositionSurfaceSources.ts';
import {servingPackageRecords} from '../api/_lib/content-live-status.ts';
import {createFallbackRenderer} from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import fs from 'node:fs';
const root='apps/web/src/content/fallbackArchitectureV3/';
const renderer=createFallbackRenderer(JSON.parse(fs.readFileSync(root+'templates/fallback-templates-v3.json','utf8')),JSON.parse(fs.readFileSync(root+'source-rows/fallback-source-rows-v3.json','utf8')));
const rulerSystem='traditional';
assert.equal(emptyHouseRulers.scorpio,'mars');
assert.equal(emptyHouseRulers.aquarius,'saturn');
assert.equal(emptyHouseRulers.pisces,'jupiter');
for(let house=1;house<=12;house++) for(const sign of Object.keys(emptyHouseRulers)) for(let rulerHouse=1;rulerHouse<=12;rulerHouse++) {
 if(house===rulerHouse)continue;
 const keys=emptyHouseSourceKeys(house,sign,rulerHouse);
 const rendered=renderer.renderNatalEmptyHouse({house,sign,rulerHouse,rulerSystem},{includeEmptyHouseBridge:true});
 assert(rendered.sourceKeys.every((key:string)=>keys.includes(key)),`${house}/${sign}/${rulerHouse}/${rulerSystem}`);
 const rows=keys.filter(key=>servingPackageRecords.has(key)).map(key=>({id:key,content_key:key}));
 assert.equal(compositionSourcesForSurface('natal-empty-house',rows,[]).length,rows.length);
}
assert.deepEqual(emptyHouseSourceKeys(1,'gemini',1),[]);
console.log('PASS empty-house source selectors match the reader for every valid house/sign/ruler-house using traditional rulers');
