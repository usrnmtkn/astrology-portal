import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,readFileSync,statSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writingFeedbackKeys,selectExplicitWritingFeedback,hydrateExplicitWritingFeedback,validateExplicitWritingFeedback} from '../../src/astro-writing/explicitWritingFeedback.mjs';
import {runFeedbackCommand} from '../../scripts/studio-writing-feedback.mjs';
import {createHash} from 'node:crypto';

const row=(id,target)=>({id,version:1,status:'active',kind:'rejection',target_keys:[target],rejected_text:`Synthetic rejected passage ${id}.`,
  source_roles:null,owner_reason:`Synthetic owner reason ${id}.`,source_uri:'thread:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',source_date:'2026-10-21T05:00:00Z'});

test('SQL and API timestamp representations preserve exact feedback and saved-request identity',()=>{
  const original={...row('timestamp','writing/all'),source_date:'2026-10-21 05:00:00.123456+00'};
  const current={...original,source_date:'2026-10-21T05:00:00.123456+00:00'};
  const prepared=selectExplicitWritingFeedback([original],['writing/all']);
  assert.deepEqual(selectExplicitWritingFeedback([current],['writing/all']).receipt,prepared.receipt);
  const stored={input:prepared.marker};
  assert.equal(hydrateExplicitWritingFeedback(stored,prepared.receipt,[current]).input,prepared.prompt);
  assert.equal(hydrateExplicitWritingFeedback(stored,prepared.receipt,[{...current,source_date:'2026-10-21T06:00:00.123456+01:00'}]).input,prepared.prompt);
  for(const change of [{source_date:'2026-10-21T05:00:00.123457+00:00'}, {owner_reason:'Changed correction.'},
    {rejected_text:'Changed rejected passage.'}, {target_keys:['writing/sky']}, {source_roles:{knowledge:['different']}},
    {source_uri:'thread:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'}, {version:0}]){
    assert.throws(()=>hydrateExplicitWritingFeedback(stored,prepared.receipt,[{...current,...change}]));
  }
  assert.equal(original.source_date,'2026-10-21 05:00:00.123456+00','Source metadata is not rewritten.');
});

test('legacy v1 feedback hashes remain usable after SQL/JSON timestamp roundtrips',()=>{
  const source={...row('legacy-date','horoscope/monthly'),source_date:'2026-10-21 05:00:00.123400+00'};
  const current={...source,source_date:'2026-10-21T05:00:00.1234+00:00',status:'retired',version:2};
  const prepared=selectExplicitWritingFeedback([source],['writing/all','horoscope/monthly']);
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
  const hash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
  for(const sourceDate of ['2026-10-21 05:00:00.123400+00','2026-10-21T05:00:00.1234Z']){
    const receipt=structuredClone(prepared.receipt);
    receipt.selected[0].contentHash=hash([source.id,source.kind,source.target_keys,source.rejected_text,source.source_roles,
      source.owner_reason,source.source_uri,sourceDate]);
    const marker=`[PRIVATE_OWNER_WRITING_FEEDBACK:${hash(receipt)}]`;
    assert.equal(hydrateExplicitWritingFeedback({input:marker},receipt,[current]).input,prepared.prompt);
    assert.throws(()=>hydrateExplicitWritingFeedback({input:marker},receipt,[{...current,source_date:'2026-10-21T05:00:00.123401+00:00'}]),/changed/);
    assert.throws(()=>hydrateExplicitWritingFeedback({input:marker},receipt,[{...current,owner_reason:'New direction.'}]),/changed/);
  }
});

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

test('reusable synastry families retrieve their own exact-member corrections without global or opposite-aspect expansion',()=>{
  const prefix='fallback-hook/synastry-pair/moon/mercury/';
  const rows=[row('square',prefix+'square'),row('opposition',prefix+'opposition'),row('trine',prefix+'trine'),
    row('other-pair','fallback-hook/synastry-pair/moon/venus/square'),row('reversed','fallback-hook/synastry-pair/mercury/moon/square')];
  const original=JSON.stringify(rows);
  const family=selectExplicitWritingFeedback(rows,writingFeedbackKeys({surface:'synastry',contentKey:prefix+'hard'}));
  assert.deepEqual(family.rows.map(r=>r.id),['opposition','square']);
  assert(family.prompt.includes(rows[0].rejected_text));assert(family.prompt.includes(rows[0].owner_reason));
  assert(family.prompt.includes('exact original target'));assert(family.prompt.includes('square-only claim for an opposition'));
  assert(family.prompt.includes('not an approved voice reference'));
  assert.deepEqual(selectExplicitWritingFeedback(rows,writingFeedbackKeys({surface:'synastry',contentKey:prefix+'square'})).rows.map(r=>r.id),['square']);
  assert.deepEqual(selectExplicitWritingFeedback(rows,writingFeedbackKeys({surface:'synastry',contentKey:prefix+'soft'})).rows.map(r=>r.id),['trine']);
  assert.equal(selectExplicitWritingFeedback(rows,writingFeedbackKeys({surface:'composite',contentKey:prefix+'hard'})).rows.length,0);
  assert.equal(JSON.stringify(rows),original,'Stored feedback scopes and complete owner text are unchanged.');
  assert.equal(hydrateExplicitWritingFeedback({input:family.marker},family.receipt,rows).input,family.prompt);
  const legacy=selectExplicitWritingFeedback([row('legacy','writing/synastry')],['writing/all','writing/synastry',prefix+'hard']);
  assert(!legacy.prompt.includes('This reusable library entry covers an aspect family.'), 'An older frozen receipt without member aliases retains its previous rendering.');
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
