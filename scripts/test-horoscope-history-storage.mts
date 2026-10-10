import assert from 'node:assert/strict';
import {encodeWeeklyHistory,decodeWeeklyHistoryRow,weeklyStoredRow} from '../api/_lib/horoscope-history-storage.js';
import {adminStorageRows} from '../api/_lib/admin-http.js';
import {horoscopeEditorRow} from '../api/_lib/horoscope-editor-payload.js';
import {persistWeeklyHoroscope} from '../api/_lib/horoscope-storage-confirmation.js';
import {applyCheckpointFixture} from '../tests/helpers/horoscope-checkpoint-fixture.mts';

const history='Synthetic full source opening. '.repeat(30000)+'Exact final sentence.';
const row:any={id:'synthetic',status:'DRAFT',body:'Unchanged complete reading.',sections:{horoscopeEdition:{window:{period:'weekly'},passages:[]}},
  source_snapshot:{horoscopeGeneration:{active:{id:'retained-provider-id',state:'running'},batch:{status:'paused'},
    rejections:[{id:'r1',passages:[{sign:'aries',headline:'Original headline',body:'Original complete body'}],generation:{history}}],
    readings:{aries:{ownerEvidence:{history},responseId:'response-1',rhetoricalReview:{status:'passed'}}},failures:[{history}],interruptions:[{history}],lastInterrupted:{history}}}};
const original=structuredClone(row),stored={...row,source_snapshot:encodeWeeklyHistory(row.source_snapshot)};
assert(Buffer.byteLength(JSON.stringify(stored))<10000);
assert.deepEqual(row,original,'Encoding never mutates the original');
assert.deepEqual(stored.source_snapshot.horoscopeGeneration.active,row.source_snapshot.horoscopeGeneration.active);
const decoded=adminStorageRows([JSON.parse(JSON.stringify(stored))])[0] as any;
assert.deepEqual(decoded,row);assert.deepEqual(weeklyStoredRow(decoded),stored);
assert.deepEqual(horoscopeEditorRow(decoded),horoscopeEditorRow(row),'Full rejected reader passages remain available to the editor');
assert.deepEqual(encodeWeeklyHistory(decoded.source_snapshot),stored.source_snapshot,'Encoding is stable after reload');
for(const patch of [{version:2},{codec:'gzip'},{byteLength:129*1024*1024},{byteLength:1},{sha256:'0'.repeat(64)},{data:'invalid'}]){
  const bad=structuredClone(stored);Object.assign(bad.source_snapshot.horoscopeGeneration.historyArchive,patch);
  assert.throws(()=>adminStorageRows([bad]),/history could not be verified/);
}
const conflict=structuredClone(stored);conflict.source_snapshot.horoscopeGeneration.failures=[];
assert.throws(()=>decodeWeeklyHistoryRow(conflict),/fields conflict/);
const small={other:'untouched',horoscopeGeneration:{failures:[]}};
assert.equal(encodeWeeklyHistory(small),small);
assert.equal(decodeWeeklyHistoryRow(original),original);
// A committed save can lose its HTTP acknowledgement. Verify the same complete
// decoded document before returning success, with no second storage/provider call.
let current:any={...stored,updated_at:'2026-01-01T00:00:00Z'},writes=0;
const fetchBefore=globalThis.fetch;
globalThis.fetch=async(_url:any,options:any={})=>{
  if(options.method==='POST'){
    writes++;const request=JSON.parse(options.body);
    assert.equal(request.p_expected_updated_at,current.updated_at);
    assert(Buffer.byteLength(options.body)<2000,'Hot checkpoints do not resend the history archive');
    current={...applyCheckpointFixture(current,request.p_changes),updated_at:'2026-01-01T00:00:01Z'};
    throw new Error('Synthetic committed save lost its acknowledgement');
  }
  return Response.json([current]);
};
try{
  const loaded=adminStorageRows([current])[0] as any;
  const saved=await persistWeeklyHoroscope({url:'https://storage.invalid/generated_interpretations',headers:{},row:loaded,
    patch:{source_snapshot:{...loaded.source_snapshot,horoscopeGeneration:{...loaded.source_snapshot.horoscopeGeneration,active:null}}}});
  assert.equal(writes,1);assert.deepEqual(saved.source_snapshot.horoscopeGeneration.rejections,row.source_snapshot.horoscopeGeneration.rejections);
  assert.equal(saved.source_snapshot.horoscopeGeneration.active,null);assert.equal(saved.body,row.body);
}finally{globalThis.fetch=fetchBefore;}
console.log('PASS Weekly lossless history: exact full sources, hashes, request IDs, editor passages, stable storage, bounded decoding and corrupt/conflicting archive rejection.');
