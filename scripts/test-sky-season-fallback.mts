import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {skyIngressEssayPublicationKeys,skyIngressEssayReaderSection} from '../apps/web/src/content/skyIngressEssayReader.ts';
import {projectReaderRow} from '../apps/web/src/content/readerRowProjection.mjs';
import {isGeneratedContentReaderBoundaryAllowed} from '../apps/web/src/content/generatedContentEligibility.ts';
import {contentWiringStatus} from '../apps/admin/src/contentWiringStatus.ts';
import {readerRowIsEligible} from '../api/content-reader.ts';
const key='sky-season-fallback/libra-2026/moon/aquarius/2026-09-21';
const start='2026-09-23T00:05:13.999Z',end='2026-09-24T03:23:38.000Z';
const row:any={id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',content_key:key,event_type:'sky-season-fallback',surface:'sky',mode:'article',status:'LIVE',lane:'serving',review_state:null,updated_at:'2026-10-10T00:00:00Z',headline:'Synthetic Moon visit',summary:'Exact synthetic summary.',body:'  Exact opening.\n\nComplete ending.  ',
sections:{seasonFallback:{schema:'libra-season-2026-placement-fallback/v1',body:'Moon',sign:'Aquarius',entry:'2026-09-21T17:14:22.999Z',exit:end,seasonStart:start,seasonEnd:end,sourceCopies:[{private:'never expose'}]}},
source_snapshot:{review_status:'approved',ownerApproval:{approved:true,action:'approve-sky-season-fallback',contentKey:key,activeStart:start,activeEnd:end},privateEvidence:'never expose'}};
row.source_snapshot.ownerApproval.copySha256=createHash('sha256').update(JSON.stringify([row.headline,row.summary,row.body])).digest('hex');
assert(readerRowIsEligible(row));assert(isGeneratedContentReaderBoundaryAllowed(row));assert.equal(contentWiringStatus(row).state,'connected');
const publicRow=projectReaderRow(row);assert(!JSON.stringify(publicRow).includes('never expose'));
const client=(r:any)=>({...r,contentKey:r.content_key,sourceSnapshot:r.source_snapshot,reviewState:r.review_state});
const at=(r:any[],instant:string)=>skyIngressEssayReaderSection(r.map(client),{planet:'moon',sign:'aquarius',activeInstant:instant});
assert.equal(at([publicRow],start)?.body,row.body);assert.equal(at([publicRow],start)?.tldr,row.summary);
assert.equal(at([publicRow],'2026-09-23T00:05:13.998Z'),null);assert.equal(at([publicRow],end),null);
for(const patch of [{status:'DRAFT'},{lane:'reference'},{review_state:'held'},{source_snapshot:{}},{body:'Changed after approval.'}]) assert.equal(readerRowIsEligible({...row,...patch}),false);
const malformed=structuredClone(row);malformed.sections.seasonFallback.seasonEnd='invalid';assert.equal(readerRowIsEligible(malformed),false);
const wrongSign=structuredClone(row);wrongSign.sections.seasonFallback.sign='Pisces';assert.equal(readerRowIsEligible(wrongSign),false);
const second=structuredClone(publicRow);second.id='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';second.content_key=key.replace('2026-09-21','2026-10-18');second.body='Second visit exact copy.';
Object.assign(second.sections.seasonFallback,{entry:'2026-10-18T00:00:00Z',exit:'2026-10-21T00:00:00Z',seasonStart:'2026-10-18T00:00:00Z',seasonEnd:'2026-10-21T00:00:00Z'});
Object.assign(second.source_snapshot.ownerApproval,{contentKey:second.content_key,activeStart:second.sections.seasonFallback.seasonStart,activeEnd:second.sections.seasonFallback.seasonEnd});
assert.equal(at([publicRow,second],'2026-10-19T00:00:00Z')?.body,second.body);
const ledger:any[]=[{content_key:key,state:'live',row_id:row.id},{content_key:second.content_key,state:'retired',row_id:second.id}];
assert.deepEqual(skyIngressEssayPublicationKeys(ledger,{planet:'moon',sign:'aquarius'}),[key]);assert.deepEqual(skyIngressEssayPublicationKeys(ledger,{planet:'lilith',sign:'aquarius'}),[]);
console.log('PASS dated fallback: exact copy, approval/hash gates, projection privacy, ledger discovery, start/end boundaries and repeat visits.');
