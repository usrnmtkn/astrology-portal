import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyOwnerEvidenceQuery} from '../../src/astro-writing/dailyOwnerEvidence.mjs';
import {weeklyEvidenceMatch} from '../../src/astro-writing/weeklyOwnerEvidence.mjs';
import {dailyWriterFacts} from '../../src/astro-writing/dailyWriterFacts.mjs';
import fs from 'node:fs';
import {dailyComponentMeanings,DAILY_PLANET_DEFINITIONS,DAILY_SIGN_DEFINITIONS} from '../../src/astro-writing/dailyComponentMeanings.mjs';

const mercury=(house,domain)=>({id:'reference/mercury',planet:'mercury',sign:'scorpio',house,domain,
  meaning:{temporaryMeaning:'Reconsider how information is understood.'}});
const ordinaryMoon={id:'ordinary-late-moon',type:'ingress',planet:'moon',sign:'cancer',house:4,domain:'home and family'};
const owner=text=>({text,structuralFunction:'complete weekly sign reading'});

test('the current house changes evidence relevance even with the same Mercury sign',()=>{
  const money=dailyOwnerEvidenceQuery({events:[ordinaryMoon],background:[mercury(8,'shared money, debt, joint resources')]},{rising:'aries'});
  const partnership=dailyOwnerEvidenceQuery({events:[ordinaryMoon],background:[mercury(7,'partnership, marriage, close others')]},{rising:'taurus'});
  const loan=owner('Shared money and joint resources can include debt. Discuss the loan before making a commitment.');
  const relationship=owner('Partnership and marriage involve close others. You notice how someone meets you in the relationship.');
  assert(weeklyEvidenceMatch(loan,money).score>weeklyEvidenceMatch(relationship,money).score);
  assert(weeklyEvidenceMatch(relationship,partnership).score>weeklyEvidenceMatch(loan,partnership).score);
  assert(!money.factIds.includes('ordinary-late-moon'),'A routine ingress cannot become the universal retrieval subject');
  assert.equal(money.bindings[0].house,8);assert.equal(partnership.bindings[0].house,7);
});

test('a significant event leads retrieval while the complete facts remain untouched',()=>{
  const exact={id:'exact-square',type:'aspect',planets:['mars','sun'],placements:[
    {planet:'mars',sign:'leo',house:5,domain:'creativity and romance'},
    {planet:'sun',sign:'scorpio',house:8,domain:'shared money and intimacy'}]};
  const developments={events:[ordinaryMoon,exact],background:[mercury(8,'shared money')]},before=structuredClone(developments);
  const query=dailyOwnerEvidenceQuery(developments,{rising:'aries'});
  assert.deepEqual(query.factIds,['exact-square']);
  assert(query.humanSituation.includes('creativity and romance'));
  assert(query.humanSituation.includes('shared money and intimacy'));
  assert.deepEqual(developments,before);
  const full={id:'full-moon',type:'lunation',planet:'moon',sign:'taurus',house:2,domain:'money and resources'};
  assert.deepEqual(dailyOwnerEvidenceQuery({events:[full],background:[]},{rising:'aries'}).factIds,['full-moon']);
});

test('ordinary Moon facts stay complete without competing with required dated events',()=>{
  const full={id:'full-moon',type:'lunation',planet:'moon',sign:'taurus',startsAt:'2026-10-26T04:00:00Z'};
  const aspect={id:'lunar-aspect',type:'aspect',planets:['moon','venus']};
  const positions=[{planet:'sun',sign:'scorpio'},{planet:'moon',sign:'gemini'},{planet:'mercury',sign:'scorpio'}];
  const facts={risingSign:'aries',referenceDate:'2026-10-29T16:00:00Z',positions,events:[ordinaryMoon,full,aspect],
    signs:[{sign:'aries',houses:{moon:3}},{sign:'taurus',houses:{moon:2}}],
    developments:{events:[ordinaryMoon,full,aspect],background:positions.map(p=>({...p,referenceDate:'2026-10-29T16:00:00Z'}))}};
  const before=structuredClone(facts),projected=dailyWriterFacts(facts);
  assert.deepEqual(projected.calculatedFacts.events,[full,aspect]);
  assert.deepEqual(projected.developments.events,[full,aspect]);
  assert.deepEqual(projected.privateMoonContext.events,[ordinaryMoon]);
  assert.deepEqual(projected.privateMoonContext.positions,[positions[1]]);
  assert.deepEqual([...projected.calculatedFacts.positions,...projected.privateMoonContext.positions].sort((a,b)=>a.planet.localeCompare(b.planet)),[...positions].sort((a,b)=>a.planet.localeCompare(b.planet)));
  assert.deepEqual(projected.calculatedFacts.signs,[facts.signs[0]]);
  assert.deepEqual(facts,before,'Classification never edits the signed facts');
  assert.deepEqual(dailyWriterFacts({...facts,events:undefined}).calculatedFacts.events,[],'Legacy briefs with no event list retain their existing optional-event contract');
});

test('Daily component meaning supplies actual planet functions and sign structure without inventing chart facts',()=>{
  const root=new URL('../../',import.meta.url);
  const sources={planets:JSON.parse(fs.readFileSync(new URL(DAILY_PLANET_DEFINITIONS,root),'utf8')).entries,
    signs:JSON.parse(fs.readFileSync(new URL(DAILY_SIGN_DEFINITIONS,root),'utf8')).entries};
  const developments={events:[ordinaryMoon],background:[{planet:'sun',sign:'scorpio',house:8},
    {planet:'uranus',sign:'gemini',house:3},{planet:'moon',sign:'gemini',house:3}]};
  const original=structuredClone({developments,sources}),meaning=dailyComponentMeanings(developments,sources);
  assert.deepEqual(meaning.records.map(r=>[r.planet,r.sign]),[['sun','scorpio'],['uranus','gemini']]);
  const sun=meaning.records[0];assert(sun.planetDefinition.governs.includes('identity'));
  assert.equal(sun.signDefinition.element,'water');assert.equal(sun.signDefinition.modality,'fixed');assert.equal(sun.signDefinition.traditionalRuler,'mars');
  assert.equal(sun.planetDefinition.sourceStatus,sources.planets.find(p=>p.id==='sun').status,'Source status is preserved, never promoted into prose approval');
  assert.equal(meaning.records[1].planetDefinition,null,'Missing outer-planet definitions stay unknown');
  assert(meaning.records.every(r=>!Object.hasOwn(r,'house')&&!Object.hasOwn(r.planetDefinition??{},'shadow')));
  assert.deepEqual({developments,sources},original);
  assert.throws(()=>dailyComponentMeanings(developments,{...sources,signs:[]}),/source is unavailable/);
  const full={...ordinaryMoon,type:'lunation',planet:'moon',sign:'taurus'};
  assert(dailyComponentMeanings({...developments,events:[full]},sources).records.some(r=>r.planet==='moon'&&r.sign==='taurus'),'A supplied special Moon retains its interpretive components');
  const projected=dailyWriterFacts({risingSign:'aries',positions:[],events:[],developments,componentMeanings:meaning});
  assert(!Object.hasOwn(projected.calculatedFacts,'componentMeanings'),'Knowledge definitions remain outside the calculated facts');
  assert.deepEqual(projected.componentMeanings,meaning);
});
