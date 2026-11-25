import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {horoscopeConfigurationEvidence,configurationEvidenceInput} from '../../src/astro-writing/horoscopeConfigurationEvidence.mjs';
import {weeklyEditorialInput} from '../../src/astro-writing/weeklyBatchEditorial.mjs';
const root=new URL('../../',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL('packages/astro-knowledge/data/primitives/'+name+'.json',root),'utf8')).entries;
const definitions={signs:read('signs'),dignities:read('dignities'),dignityMeaning:JSON.parse(fs.readFileSync(new URL('packages/astro-knowledge/data/modifiers/dignity.json',root),'utf8'))};
const brief={window:{period:'weekly',timeZone:'America/New_York',startsAt:'2026-11-16T05:00:00Z',endsAt:'2026-11-23T05:00:00Z'},referenceDate:'2026-11-16',coverage:'Synthetic bounded test evidence.',
 positions:[{planet:'Mars',sign:'Leo',motion:'direct'},{planet:'Sun',sign:'Scorpio',motion:'direct'},{planet:'Jupiter',sign:'Leo',motion:'direct'},{planet:'Venus',sign:'Libra',motion:'retrograde'},{planet:'Saturn',sign:'Aries',motion:'retrograde'},{planet:'Moon',sign:'Aquarius',motion:'direct'},{planet:'Mercury',sign:'Scorpio',motion:'retrograde'}],
 events:[{id:'mars-jupiter',type:'aspect',planets:['Mars','Jupiter'],fromSign:'Leo',toSign:'Leo',fromMotion:'direct',toMotion:'direct',aspect:'conjunction',startsAt:'2026-11-16T14:00:00Z'},
 {id:'sun-mars',type:'aspect',planets:['Sun','Mars'],fromSign:'Scorpio',toSign:'Leo',aspect:'square',startsAt:'2026-11-19T17:00:00Z'},
 {id:'sun-ingress',type:'ingress',planet:'Sun',sign:'Sagittarius',startsAt:'2026-11-22T09:00:00Z'},
 {id:'ordinary-moon',type:'ingress',planet:'Moon',sign:'Pisces',startsAt:'2026-11-18T09:00:00Z'}]};
const developments={events:brief.events.map(event=>({...event,meaning:{sourceId:'synthetic-meaning/'+event.id}}))};
const build=(rising='aries',b=brief,d=definitions)=>horoscopeConfigurationEvidence({brief:b,rising,developments},d);
test('different rising signs bind rulers and the houses they actually govern',()=>{
 const aries=build(),taurus=build('taurus');
 assert.equal(aries.chartRuler.planet,'mars');assert.equal(aries.chartRuler.referencePlacement.house,5);
 assert.deepEqual(aries.chartRuler.referencePlacement.rulesHouses,[1,8]);
 assert.equal(taurus.chartRuler.planet,'venus');assert.equal(taurus.chartRuler.referencePlacement.house,6);
 assert.deepEqual(taurus.chartRuler.referencePlacement.rulesHouses,[1,6]);
 assert.equal(taurus.referenceContext.positions.find(p=>p.planet==='mars').house,4);
 assert.deepEqual(taurus.referenceContext.positions.find(p=>p.planet==='mars').rulesHouses,[7,12]);
 assert.equal(aries.referenceContext.dispositorLinks.find(p=>p.planet==='sun').rulerReferenceHouse,5);
 for(const sign of definitions.signs)assert.equal(build(sign.id).chartRuler.planet,sign.traditionalRuler);
});
test('neutral dignity provenance stays separate from sky calculation and owner voice',()=>{
 const research=build(),venus=research.referenceContext.positions.find(p=>p.planet==='venus');
 assert.deepEqual(venus.essentialConditions.map(c=>c.classification),['domicile']);
 assert.equal(venus.essentialConditions[0].sourceStatus,'DRAFT');
 assert(venus.essentialConditions[0].sourceRecordSha256);
 assert(research.referenceContext.positions.find(p=>p.planet==='saturn').essentialConditions.some(c=>c.classification==='fall'));
 assert.deepEqual(research.chartRuler.referencePlacement.essentialConditions,[],'No inferred default dignity.');
 assert(research.role.includes('not owner voice'));
 assert.equal(research.conditionMeaning.text,definitions.dignityMeaning.definition);
});
test('event connections keep their own times, states and meaning bindings',()=>{
 const research=build();assert.deepEqual(research.chartRuler.suppliedEventIds,['mars-jupiter','sun-mars']);
 assert.deepEqual(research.eventLinks.find(link=>link.eventIds.join('/')==='mars-jupiter/sun-mars').sharedPlanets,['mars']);
 assert.equal(research.eventLinks.find(link=>link.eventIds.join('/')==='mars-jupiter/sun-mars').simultaneous,false);
 const ingress=research.events.find(event=>event.id==='sun-ingress');assert.equal(ingress.participants[0].sign,'sagittarius');assert.equal(ingress.participants[0].house,9);
 assert.equal(research.referenceContext.positions.find(p=>p.planet==='sun').sign,'scorpio');
 assert.equal(ingress.governedMeaning.sourceIds[0],'synthetic-meaning/sun-ingress');
 assert(!research.events.some(event=>event.id==='ordinary-moon'));
 assert.deepEqual(research.suppliedConfigurations,[]);
});
test('missing event-time position or ruler is unknown rather than borrowed from a reference',()=>{
 const missing=structuredClone(brief);delete missing.events[1].toSign;missing.positions=missing.positions.filter(p=>p.planet!=='Mars');
 const research=build('aries',missing);assert.equal(research.chartRuler.referencePlacement,null);assert(research.coverage.missingReferenceRuler);
 assert.equal(research.events.find(e=>e.id==='sun-mars').participants[1].sign,null);
 assert(research.events.find(e=>e.id==='sun-mars').participants[1].missing);
});
test('quiet Daily preserves facts, ordinary Moon privacy and source data',()=>{
 const daily=structuredClone(brief);daily.window.period='daily';daily.events=daily.events.filter(e=>e.id==='ordinary-moon');
 const before=JSON.stringify([daily,definitions,developments]);const research=build('aries',daily);
 assert.equal(research.events.length,0);assert.equal(research.eventLinks.length,0);assert.equal(research.coverage.relationalSnapshotsSupplied,false);
 assert.equal(JSON.stringify([daily,definitions,developments]),before);
 assert(configurationEvidenceInput(research).includes('House topics alone are not an interpretation.'));
});
test('out-of-window events and ungoverned ruler definitions cannot create research',()=>{
 const changed=structuredClone(brief);changed.events[0].startsAt='2026-11-15T14:00:00Z';assert(!build('aries',changed).events.some(e=>e.id==='mars-jupiter'));
 const bad=structuredClone(definitions);bad.signs[0].voiceNeutral=false;assert.throws(()=>build('aries',brief,bad),/ruler definitions/);
});
test('the existing Weekly planner receives configuration research before choosing concerns',()=>{
 const research=build();const prepared={edition:{window:brief.window},writingProfile:{profile:{}},entries:[{sign:'aries',developments,configurationEvidence:research}]};
 const row={sections:{horoscopeEdition:{passages:[]}}};
 for(const phase of ['plan','review'])assert.equal(weeklyEditorialInput(prepared,row,phase).facts[0].configurationEvidence,research);
});
