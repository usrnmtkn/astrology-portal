import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,readFileSync,statSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writingFeedbackKeys,selectExplicitWritingFeedback,hydrateExplicitWritingFeedback,validateExplicitWritingFeedback} from '../../src/astro-writing/explicitWritingFeedback.mjs';
import {runFeedbackCommand} from '../../scripts/studio-writing-feedback.mjs';

const row=(id,target)=>({id,version:1,status:'active',kind:'rejection',target_keys:[target],rejected_text:`Synthetic rejected passage ${id}.`,
  source_roles:null,owner_reason:`Synthetic owner reason ${id}.`,source_uri:'thread:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',source_date:'2026-10-21T05:00:00Z'});

test('explicit scopes isolate periods, relationships, personal transits and exact passages',()=>{
  const rows=['writing/all','horoscope/daily','horoscope/weekly','horoscope/monthly','horoscope/seasonal','writing/synastry','writing/sky','writing/personal-transit','exact/one'].map((target,i)=>row(`r${i}`,target));
  for(const period of ['daily','weekly','monthly','seasonal']){
    const selected=selectExplicitWritingFeedback(rows,writingFeedbackKeys({period,contentKey:'exact/one'}));
    assert.deepEqual(selected.rows.map(r=>r.target_keys[0]),['writing/all',`horoscope/${period}`,'exact/one']);
    assert(!JSON.stringify(selected.receipt).includes('Synthetic owner reason'));
    assert(!JSON.stringify(selected.receipt).includes('Synthetic rejected passage'));
  }
  for(const [surface,target] of [['synastry','writing/synastry'],['sky','writing/sky'],['you','writing/personal-transit']]){
    assert.deepEqual(selectExplicitWritingFeedback(rows,writingFeedbackKeys({surface,eventType:'transit-aspect'})).rows.map(r=>r.target_keys[0]),['writing/all',target]);
  }
  assert(!writingFeedbackKeys({surface:'you',eventType:'you-natal'}).includes('writing/personal-transit'));
  assert(!writingFeedbackKeys({surface:'friends',eventType:'bond-effect'}).includes('writing/personal-transit'));
  assert(!writingFeedbackKeys({surface:'composite'}).includes('writing/synastry'));
  assert.throws(()=>writingFeedbackKeys({period:'all'}));
});

test('new plans exclude retired feedback; a frozen request resolves the exact immutable source once',()=>{
  const feedback=row('fixture','horoscope/monthly');
  const prepared=selectExplicitWritingFeedback([feedback],writingFeedbackKeys({period:'monthly'}));
  const stored={input:`Original facts.\n${prepared.marker}`,nested:{protected:'Exact owner source.'}};
  assert(!JSON.stringify(stored).includes(feedback.rejected_text));
  const retired={...feedback,status:'retired',version:2};
  const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
  assert.equal(selectExplicitWritingFeedback([retired],writingFeedbackKeys({period:'monthly'})).receipt.selected.length,0);
  const sent=hydrateExplicitWritingFeedback(stored,prepared.receipt,[retired]);
  assert.deepEqual(hydrateExplicitWritingFeedback(ordered(stored),ordered(prepared.receipt),[ordered(retired)]),sent,'JSONB key ordering preserves a saved reference');
  assert(sent.input.includes(feedback.rejected_text));assert(sent.input.includes(feedback.owner_reason));
  assert.equal(sent.nested.protected,stored.nested.protected);assert(stored.input.includes(prepared.marker));
  assert.throws(()=>hydrateExplicitWritingFeedback(stored,prepared.receipt,[{...retired,owner_reason:'Different meaning.'}]),/changed/);
  assert.throws(()=>hydrateExplicitWritingFeedback(stored,prepared.receipt,[]),/unavailable/);
  assert.throws(()=>hydrateExplicitWritingFeedback({input:'Missing marker.'},prepared.receipt,[retired]),/once/);
  assert.throws(()=>hydrateExplicitWritingFeedback({input:prepared.marker+prepared.marker},prepared.receipt,[retired]),/once/);
});

test('scope and feedback version changes invalidate new request references without truncation',()=>{
  const original=row('fixture','horoscope/weekly');
  const before=selectExplicitWritingFeedback([original],writingFeedbackKeys({period:'weekly'}));
  const after=selectExplicitWritingFeedback([{...original,version:2,owner_reason:'New exact direction.'}],writingFeedbackKeys({period:'weekly'}));
  assert.notEqual(before.marker,after.marker);
  assert.equal(selectExplicitWritingFeedback([original],writingFeedbackKeys({period:'monthly'})).marker,'');
  assert.throws(()=>validateExplicitWritingFeedback([original,{...original}]),/integrity/);
  assert.throws(()=>selectExplicitWritingFeedback(Array.from({length:101},(_,i)=>row(`r${i}`,'writing/all')),['writing/all']),/maintenance/);
  assert.throws(()=>validateExplicitWritingFeedback(null),/incomplete/);
});

test('feedback CLI preserves exact rejected text and reason, exports privately and never approves prose',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'writing-feedback-'));
  try{
    const fixture=row('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','horoscope/daily');let dispatched;
    const input={requestId:fixture.id,targetKeys:fixture.target_keys,rejectedText:fixture.rejected_text,ownerReason:fixture.owner_reason,sourceUri:fixture.source_uri,sourceDate:fixture.source_date};
    const result=await runFeedbackCommand({command:'record',input,request:async(resource,body)=>{dispatched={resource,body};return [fixture];}});
    assert.equal(dispatched.resource,'rpc/record_studio_writing_feedback');assert.equal(dispatched.body.p_rejected_text,input.rejectedText);
    assert.equal(dispatched.body.p_owner_reason,input.ownerReason);assert(!JSON.stringify(result).includes(input.rejectedText));
    assert.equal(result.status,'active');assert(!('ownerApproved' in result));
    const output=join(directory,'private.json');
    await runFeedbackCommand({command:'export',target:'horoscope/daily',output,request:async()=>[{snapshot:{writingFeedback:[fixture]}}]});
    assert.equal(JSON.parse(readFileSync(output,'utf8')).rows[0].rejected_text,fixture.rejected_text);
    assert.equal(statSync(output).mode&0o777,0o600);
    await assert.rejects(runFeedbackCommand({command:'record',input:{...input,sourceUri:'invented'},request:async()=>{throw Error('must not dispatch');}}),/actual owner chat/);
    await assert.rejects(runFeedbackCommand({command:'export',target:'horoscope/daily',output,request:async()=>[{snapshot:{rows:[]}}]}),/incomplete/);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
