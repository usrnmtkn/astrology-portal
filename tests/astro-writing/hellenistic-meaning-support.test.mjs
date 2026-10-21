import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import {buildHellenisticMeaningSupport,hellenisticMeaningPrompt} from '../../src/astro-writing/hellenisticMeaningSupport.mjs';

const require=createRequire(import.meta.url);
const framework=require('../../packages/astro-knowledge/data/frameworks/hellenistic-meaning-support.json');
const ids=context=>buildHellenisticMeaningSupport(context).receipt.recordIds;

test('meaning sources retain authorship, page provenance and source-role boundaries',()=>{
  assert.equal(framework.sections.length,50);
  assert.equal(framework.sources.length,7);
  assert.equal(framework.positiveVoiceEvidence,false);
  assert.equal(framework.readerServing,false);
  assert.deepEqual(framework.surfacePermission,['doctrine-only']);
  const sources=new Map(framework.sources.map(s=>[s.id,s]));
  for(const record of framework.sections){
    assert(record.body&&record.limits&&record.sourceRefs.length,record.id);
    for(const ref of record.sourceRefs){
      const source=sources.get(ref.source_id);assert(source,record.id);
      assert.match(source.sha256,/^[a-f0-9]{64}$/u);
      assert(ref.pdf_pages.every(p=>Number.isInteger(p)&&p>0&&p<=source.pdfPages),record.id);
    }
  }
  assert.match(sources.get('exaltation').author,/Neely/u);
  assert.match(sources.get('obert').author,/Obert/u);
  assert.match(sources.get('brennan-czech').author,/translation/u);
  assert(!JSON.stringify(framework).includes('/Users/'),'No private file paths are packaged');
});

test('a sign, narrative plan, unreliable birth time or malformed value never supplies a house',()=>{
  assert(ids({facts:{sign:'Sagittarius'}}).includes('HB-04'));
  assert(ids({facts:{signA:'leo',signB:'virgo',aspect:{type:'square'}}}).includes('HB-04'));
  assert(!ids({facts:{sign:'Sagittarius'}}).includes('HB-24'));
  assert(!ids({plan:{house:9,sign:'sagittarius'}}).includes('HB-24'));
  for(const house of [true,false,null,[],{},0,13,1.2,'','first','1e0']){
    assert(!ids({facts:{house}}).includes('HB-24'),String(house));
  }
  for(const facts of [{house:9,housesExcluded:true},{house:9,housesReliable:false},{sign:'leo',signsExcluded:true}]){
    const selected=ids({facts});assert(!selected.includes('HB-24'));if(facts.signsExcluded)assert(!selected.includes('HB-04'));
  }
  for(const facts of [null,[],{developments:{events:{},background:'bad'}},{developments:{events:[{placements:{}}]}}])assert.doesNotThrow(()=>ids({facts}));
  assert(ids({facts:{developments:{events:[{planet:'mars',sign:'leo',house:11}],background:[]}},family:'horoscope'}).includes('HB-24'));
});

test('supported context narrows interpretation without activating unsupported techniques or changing facts',()=>{
  const facts={placement:{planet:'venus',sign:'libra'},aspect:{from:'venus',type:'square',to:'mars'},house:7,motion:'retrograde'};
  const before=structuredClone(facts);
  const support=buildHellenisticMeaningSupport({facts,family:'horoscope'});
  assert.deepEqual(facts,before);
  for(const id of ['HB-01','HB-04','HB-09','HB-11','HB-12','HB-19','HB-24','HB-26'])assert(support.receipt.recordIds.includes(id));
  for(const record of framework.sections.filter(r=>r.runtimeScope==='reference-only'))assert(!support.receipt.recordIds.includes(record.id));
  assert.equal(support.receipt.calculatedFacts,false);
  assert.equal(support.receipt.positiveVoiceEvidence,false);
  assert.match(support.authority,/saved writing profile and surface-specific voice evidence retain precedence/u);
  assert.match(support.authority,/no prose template/u);
  assert.equal(support.receipt.frameworkSha256,createHash('sha256').update(JSON.stringify(framework)).digest('hex'));
  assert(support.records.every(r=>r.limits&&r.sourceRefs.length));
});

test('knowledge validation rejects voice promotion and broken page provenance before packaging',()=>{
  const {validateEntryFile}=require('../../packages/astro-knowledge/scripts/validate.js');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hellenistic-validation-'));
  const file=path.join(directory,'hellenistic-meaning-support.json');
  try{
    for(const change of [j=>{j.positiveVoiceEvidence=true;},j=>{j.surfacePermission=['sky'];},j=>{j.sections[0].sourceRefs[0].pdf_pages=[99999];},j=>{j.sources.push(null);}]){
      const invalid=structuredClone(framework);change(invalid);fs.writeFileSync(file,JSON.stringify(invalid));
      const errors=[];validateEntryFile(file,'meaningSupport',errors);assert(errors.length);
    }
    fs.writeFileSync(file,JSON.stringify(framework));const errors=[];
    validateEntryFile(file,'meaningSupport',errors);assert.deepEqual(errors,[]);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('Personal Transit and relationship projections cannot admit raw mechanics',()=>{
  for(const context of [{surface:'you',family:'transit-aspect'},{family:'bond-effect'}]){
    assert.equal(hellenisticMeaningPrompt({...context,facts:{house:1,sign:'leo',aspect:'square'}}),'');
    assert.equal(buildHellenisticMeaningSupport(context).receipt.projectionOnly,true);
  }
});

test('built knowledge catalog discovers the complete reference while browser bundles exclude drafting doctrine',()=>{
  const resolver=require('../../packages/astro-knowledge/scripts/knowledge-resolver.js');
  const index=resolver.loadIndex();
  const entry=index.meta.objects.find(o=>o.sources.some(s=>s.path==='packages/astro-knowledge/data/frameworks/hellenistic-meaning-support.json'));
  assert(entry,'New reference is discoverable in the generated catalog');
  assert(entry.sources.every(s=>s.authorityClass==='factual-evidence'&&s.surfacePermission.includes('doctrine-only')));
  assert.equal(resolver.resolve(entry.id,{surface:'sky',usage:'primary'}).records.length,0,'Full reference never bypasses scoped selection');
  const read=name=>JSON.parse(fs.readFileSync(new URL(`../../packages/astro-knowledge/dist/${name}`,import.meta.url),'utf8'));
  assert(read('knowledge.json').frameworks.some(f=>f.id===framework.id));
  for(const file of ['sky-web.json','natal-web.json','relationships-web.json','shared-web.json']){
    assert(!JSON.stringify(read(file)).includes(framework.id),file);
  }
});
