import assert from 'node:assert/strict';
import {store,installHoroscopeWriterFixture,invokeHoroscopeWritingWithReview as invokeHoroscopeWriting,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {horoscopeVocabularyFindings,WEEKLY_REQUIRED_VOCABULARY_RULE} from '../src/astro-writing/horoscopeEditorialConstraints.mjs';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {prepareHoroscopeWriting,writeHoroscopeSign} from '../src/astro-writing/horoscopeWriting.mjs';

for(const value of ['whether','Whether','WHETHER','(whether)','whe&#116;her','whe&#x74;her','whe\u200bther'])for(const field of ['headline','body']){
 assert.equal(horoscopeVocabularyFindings({[field]:value},'weekly').length,1);
 for(const period of ['daily','monthly','seasonal'])assert.deepEqual(horoscopeVocabularyFindings({[field]:value},period),[]);
}
assert.deepEqual(horoscopeVocabularyFindings({body:'You can review the weather.'},'weekly'),[]);
installHoroscopeWriterFixture();
const packet=await prepareHoroscopeBrief(new URL('http://localhost/?period=weekly&date=2026-10-05&timeZone=America/New_York'));
const edition=emptyHoroscopeEdition(packet.brief.window);
const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Weekly vocabulary fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{}});
assert.equal(created.status,200);let row=created.payload.rows[0];
const action=(action:string,extra:any={})=>invokeHoroscopeWriting({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
const body='You can check whether this fixture needs editing.\n\nYour original ending is preserved.';
const completed=(sign:string)=>({status:'completed',usage:{input_tokens:100,output_tokens:30},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({headline:`${sign} & ${sign} Rising`,body})}]}]});
for(const [sign,immediate] of [['aries',false],['taurus',true]] as const){
 const calls=writerFixture.calls,plan=await action('prepare');assert.equal(plan.status,200);row=plan.payload.rows?.[0]??row;
 if(immediate)writerFixture.startResult=completed('Taurus');
 let result=await action('generate',{sign,approvedPlanHash:plan.payload.plan.planHash});
 if(!immediate){assert.equal(result.status,202);row=result.payload.rows[0];writerFixture.nextResult=completed('Aries');result=await action('poll');}
 assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
 const generation=row.source_snapshot.horoscopeGeneration,receipt=generation.readings[sign];
 assert.equal(generation.active,null);assert.equal(generation.lastError,null);
 assert.equal(row.sections.horoscopeEdition.passages.find((p:any)=>p.sign===sign).body,body);
 assert.equal(receipt.lint.passed,false);assert(receipt.lint.violations.some((v:any)=>v.category==='horoscope_required_vocabulary'&&v.governanceTier==='blocking'));
 assert.equal(writerFixture.calls,calls+1);assert(writerFixture.requests.get(receipt.responseId).input.includes(WEEKLY_REQUIRED_VOCABULARY_RULE));
}
// The vocabulary finding does not stall the next sign or cause a retry.
let plan=await action('prepare');row=plan.payload.rows?.[0]??row;
let result=await action('generate',{sign:'gemini',approvedPlanHash:plan.payload.plan.planHash});assert.equal(result.status,202);row=result.payload.rows[0];
result=await action('poll');assert.equal(result.status,200);row=result.payload.rows[0];assert.equal(writerFixture.calls,3);
// Legacy/manual drafts are editable, but cannot bypass publication without receipts.
const legacy=structuredClone(row);delete legacy.source_snapshot.horoscopeGeneration;
legacy.sections.horoscopeEdition.passages.forEach((p:any)=>{p.headline='Fixture headline';p.body=p.sign==='aries'?body:'You can read this fixture. Your ending is preserved.';});
legacy.body=horoscopeEditionBody(legacy.sections.horoscopeEdition);store.rows.set(legacy.id,legacy);row=legacy;
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'});
assert.equal(result.status,422);assert.match(result.payload.error,/aries: Remove “whether”/u);assert.deepEqual(store.rows.get(row.id),legacy);
const edited=structuredClone(row.sections.horoscopeEdition);edited.passages[0].body='You can check if this fixture needs editing.\n\nYour original ending is preserved.';
result=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,sections:{horoscopeEdition:edited},body:horoscopeEditionBody(edited)});
assert.equal(result.status,200,JSON.stringify(result.payload));row=result.payload.rows[0];
assert.equal((await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE'})).status,200);
assert.equal(writerFixture.calls,3);
// Runtime prompt isolation: Daily receives the same existing evidence and no Weekly ban.
const daily=await prepareHoroscopeBrief(new URL('http://localhost/?period=daily&date=2026-10-05&timeZone=America/New_York'));
const prepared=prepareHoroscopeWriting({sections:{horoscopeEdition:emptyHoroscopeEdition(daily.brief.window)},facts:{horoscopeBrief:daily},source_snapshot:{}});
const stop=new Error('No paid request');let input='';
await assert.rejects(writeHoroscopeSign(prepared,'aries',{approvedPlanHash:prepared.planHash,approvalReference:'fixture:weekly-isolation',writerClient:async(request:any)=>{input=request.input;throw stop;}}),e=>e===stop);
assert(!input.includes(WEEKLY_REQUIRED_VOCABULARY_RULE));
console.log('PASS Weekly vocabulary: queued/immediate responses preserved, blocking findings, next-sign progress, legacy publication guard, manual correction without regeneration, unchanged Daily prompt.');
