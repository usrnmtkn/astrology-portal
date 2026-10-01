import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadSeasonalHoroscopeEvidence,SEASONAL_EVIDENCE_MANIFEST,SEASONAL_SOURCE_ROOT} from '../src/astro-writing/seasonalHoroscopeEvidence.mjs';

const read = file => fs.readFileSync(file,'utf8');
const manifest = JSON.parse(read(SEASONAL_EVIDENCE_MANIFEST));
const passages = loadSeasonalHoroscopeEvidence(read);
assert.equal(passages.length,36);
assert.equal(new Set(passages.map(p=>p.id)).size,36);
for (const passage of passages) {
  assert.equal(passage.text,read(passage.sourcePath).slice(passage.provenance.start,passage.provenance.end));
  assert.equal(passage.sourceRecordSha256,createHash('sha256').update(passage.text).digest('hex'));
  assert.equal(passage.wordCount,passage.text.split(/\s+/u).length);
  assert.equal(passage.factUseAuthorized,false);
  assert.equal(passage.horoscopePeriod,'seasonal');
  assert.doesNotMatch(passage.text,/Looking for the perfect gift|Gift Guide in Forbes|Back to blog|Share this/);
  assert.equal(passages.filter(p=>p.horoscopeAudienceSign===passage.horoscopeAudienceSign).length,3);
}
// Missing, duplicate, truncated and changed sources must fail before a writer call.
const changeManifest = mutate => {
  const changed=structuredClone(manifest);mutate(changed);
  return file=>file===SEASONAL_EVIDENCE_MANIFEST?JSON.stringify(changed):read(file);
};
assert.throws(()=>loadSeasonalHoroscopeEvidence(changeManifest(m=>m.sources.pop())),/incomplete/);
assert.throws(()=>loadSeasonalHoroscopeEvidence(changeManifest(m=>m.sources[0].readings.pop())),/integrity/);
assert.throws(()=>loadSeasonalHoroscopeEvidence(changeManifest(m=>m.sources[0].readings[1]=m.sources[0].readings[0])),/incomplete/);
assert.throws(()=>loadSeasonalHoroscopeEvidence(changeManifest(m=>m.sources[0].readings[0].end-=20)),/passage changed/);
assert.throws(()=>loadSeasonalHoroscopeEvidence(changeManifest(m=>m.sources[0].sha256='0'.repeat(64))),/registration changed/);
const changedPath=SEASONAL_SOURCE_ROOT+manifest.sources[0].file;
assert.throws(()=>loadSeasonalHoroscopeEvidence(file=>read(file)+(file===changedPath?'\nchanged':'')),/integrity/);
const expanded = loadSeasonalHoroscopeEvidence(read,{includeOverviews:true});
const overviews=expanded.filter(p=>p.horoscopeAudienceSign==='overview');
assert.equal(expanded.length,39);assert.equal(overviews.length,3);
for(const passage of overviews){
 assert.equal(passage.text,read(passage.sourcePath).slice(passage.provenance.start,passage.provenance.end));
 assert.equal(passage.sourceRecordSha256,createHash('sha256').update(passage.text).digest('hex'));
 assert.equal(passage.wordCount,passage.text.trim().split(/\s+/u).length);
 assert.equal(passage.factUseAuthorized,false);
}
assert.throws(()=>loadSeasonalHoroscopeEvidence(changeManifest(m=>m.sources[0].overview.end-=20),{includeOverviews:true}),/passage changed/);
assert.throws(()=>loadSeasonalHoroscopeEvidence(changeManifest(m=>delete m.sources[0].overview),{includeOverviews:true}),/overview/);
console.log('PASS seasonal evidence: 36 complete exact units, 12 audience signs, provenance, hashes, exclusions and fail-closed integrity.');
