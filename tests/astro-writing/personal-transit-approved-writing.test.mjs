import { test } from 'node:test';
import assert from 'node:assert/strict';
import semantics from '../../src/astro-writing/transitNatalSemantics.cjs';
import { retrieveApprovedPersonalWriting } from '../../src/astro-writing/personalTransitApprovedWriting.mjs';
import { meaningHash, retrievePersonalTransitMeaningSources, preparePersonalTransitMeaningRecord, assertPersonalTransitMeaningRecord } from '../../src/astro-writing/personalTransitMeaningRecords.mjs';
import { personalTransitMeaningProjection } from '../../src/astro-writing/personalTransitMeaningProjection.mjs';
import { syntheticWritingComparison } from '../../scripts/fixtures/personal-transit-writing.mjs';

const key = 'authored/transit-aspect/venus/moon/square';
const packet = semantics.resolveTransitNatalSemantics({transiting:'venus',natal:'moon',aspect:'square'});
const synthetic = (contentKey = key) => {
  const text = 'Complete synthetic approved personal passage. Final synthetic sentence.';
  return {id:contentKey,contentKey,field:'body_you',text,textSha256:meaningHash(text),ownerApproved:true,status:'current',
    source:'synthetic-private-catalog',sourceSha256:meaningHash('synthetic catalog'),
    approval:{source:'synthetic-exact-owner-receipt',sourceSha256:meaningHash('synthetic approval'),textSha256:meaningHash(text)}};
};
const make = options => {
  const retrieval = retrievePersonalTransitMeaningSources(key,packet,options);
  return { retrieval, proposal:{contentKey:key,revision:1,source:'synthetic-test-only',
    claims:[{text:'Synthetic proposed meaning.',rationale:'Synthetic protocol test only.',sourceIds:retrieval.sources.map(s=>s.id)}],
    approvedWritingComparison:syntheticWritingComparison(retrieval)}};
};

test('retrieves the verified Venus Moon hard-family publication without reversing direction or importing collective copy',()=>{
  const found = retrieveApprovedPersonalWriting(key);
  assert.deepEqual(found.searchedKeys,[key,'authored/transit-aspect/venus/moon/hard']);
  assert(found.sources.some(s=>s.contentKey.endsWith('/venus/moon/hard') && s.match==='aspect-family'
    && s.approval.approvalLevel==='exact_owner_published_cms_revision'));
  for(const s of found.sources) {assert(s.contentKey.startsWith('authored/transit-aspect/venus/moon/'));assert.equal(s.textSha256,meaningHash(s.text));}
});

test('exact private approved writings precede family evidence and retain complete text and approval provenance',()=>{
  const own=synthetic(), reverse=synthetic('authored/transit-aspect/moon/venus/square');
  const found=retrieveApprovedPersonalWriting(key,{approvedPersonalWritings:[own,reverse]});
  assert.equal(found.sources[0].text,own.text);assert.equal(found.sources[0].match,'exact-contact');
  assert.deepEqual(found.sources[0].approval,own.approval);assert(!found.sources.some(s=>s.contentKey===reverse.contentKey));
  const retired=retrieveApprovedPersonalWriting(key,{approvedPersonalWritings:[{...own,status:'rejected'}]});
  assert(!retired.sources.some(s=>s.source===own.source));assert(retired.excluded.some(s=>s.reason==='rejected'));
  assert.throws(()=>retrieveApprovedPersonalWriting(key,{approvedPersonalWritings:[{...own,text:'changed'}]}),/CATALOG_INVALID/);
  assert.throws(()=>retrieveApprovedPersonalWriting(key,{approvedPersonalWritings:[{...own,approval:{...own.approval,textSha256:'stale'}}]}),/CATALOG_INVALID/);
});

test('meaning preparation cannot omit an approved passage, fake absence, or silently accept changed approval context',()=>{
  const options={approvedPersonalWritings:[synthetic()]}, {proposal}=make(options);
  assert.throws(()=>preparePersonalTransitMeaningRecord({...proposal,approvedWritingComparison:undefined},packet,options),/COMPARISON_REQUIRED/);
  assert.throws(()=>preparePersonalTransitMeaningRecord({...proposal,approvedWritingComparison:{...proposal.approvedWritingComparison,entries:[]}},packet,options),/COMPARISON_REQUIRED/);
  const record=preparePersonalTransitMeaningRecord(proposal,packet,options);
  assert.throws(()=>assertPersonalTransitMeaningRecord(record,packet,{allowProposed:true}),/DRIFT/);
  assert.equal(record.status,'proposed-owner-review');assert.equal(record.review,null);
  const projected=personalTransitMeaningProjection(key,packet,record,{...options,allowProposed:true});
  assert.equal(projected.readerMeaning,record.text);
  assert(projected.privateReceipt.meaningSources.approvedPersonalWriting.sources.some(s=>s.text===synthetic().text));
  assert.deepEqual(projected.privateReceipt.approvedWritingComparison,proposal.approvedWritingComparison);
});

test('qualifying approved prose requires a current correction reference and does not grant factual authority',()=>{
  const {proposal}=make({});
  proposal.approvedWritingComparison.entries[0].relationship='qualified-by-current-correction';
  assert.throws(()=>preparePersonalTransitMeaningRecord(proposal,packet),/COMPARISON_REQUIRED/);
  proposal.approvedWritingComparison.entries[0].correctionSources=['synthetic-owner-correction'];
  const record=preparePersonalTransitMeaningRecord(proposal,packet);
  const {retrieval}=make({});
  assert.throws(()=>preparePersonalTransitMeaningRecord({...proposal,claims:[{text:record.text,rationale:'Synthetic bypass',
    sourceIds:retrieval.approvedPersonalWriting.sources.map(s=>s.id)}]},packet),/SOURCE_PRECEDENCE/);
});
