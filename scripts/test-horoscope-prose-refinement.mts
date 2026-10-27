import assert from 'node:assert/strict';
import {store,editorialFixtureRows,installHoroscopeWriterFixture,invokeHoroscopeWritingWithReview as invoke,writerFixture} from '../tests/helpers/sky-article-save-api.mts';
import {prepareHoroscopeBrief} from '../api/_lib/horoscope-editions';
import {emptyHoroscopeEdition,horoscopeEditionBody,horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {decodeWeeklyHistoryRow} from '../api/_lib/horoscope-history-storage';
import {defaultHoroscopeProfile} from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import {proposeWeeklyProfile,proposeMonthlyProfile} from '../src/astro-writing/horoscopeProfileRefinements.mjs';
import {HOROSCOPE_PROSE_INSTRUCTIONS_VERSION,horoscopeProseInstructions} from '../src/astro-writing/horoscopeProseInstructions.mjs';
import {seasonalEditorialAdapter} from '../src/astro-writing/seasonalEditorialAdapter.mjs';
import {latest} from '../src/astro-writing/editorial/controller.mjs';
import {selectExplicitWritingFeedback,resolveExplicitWritingFeedback} from '../src/astro-writing/explicitWritingFeedback.mjs';

const feedback={id:'synthetic-owner-correction',version:1,status:'active',kind:'rejection',target_keys:['writing/all'],
  rejected_text:'Complete synthetic rejected opening.\n\nComplete synthetic rejected ending.',owner_reason:'Exact synthetic owner correction.',
  source_uri:'thread:synthetic',source_date:'2026-10-23T12:00:00Z'};
for(const period of ['weekly','monthly','seasonal']){
  const selected=selectExplicitWritingFeedback([feedback],['writing/all',`horoscope/${period}`]);
  assert.equal(selected.receipt.renderMode,'horoscope-data/v1');
  assert.equal(resolveExplicitWritingFeedback(selected.receipt,[feedback]),selected.prompt);
  assert(selected.prompt.includes(JSON.stringify(feedback.rejected_text)));
  assert(selected.prompt.includes(feedback.owner_reason));
  assert(!selected.prompt.includes('Apply the owner reasons'));
  const legacyReceipt=structuredClone(selected.receipt);delete legacyReceipt.renderMode;
  assert(resolveExplicitWritingFeedback(legacyReceipt,[feedback]).includes('Apply the owner reasons'),'Old feedback receipts keep their original wrapper');
  assert.throws(()=>resolveExplicitWritingFeedback({...selected.receipt,targetKeys:['writing/all','writing/sky']},[feedback]),/invalid/);
}
assert.equal(selectExplicitWritingFeedback([feedback],['writing/all','horoscope/daily']).receipt.renderMode,undefined);
assert.equal(selectExplicitWritingFeedback([feedback],['writing/all','writing/sky']).receipt.renderMode,undefined);

installHoroscopeWriterFixture();
const fixtureFetch=globalThis.fetch;
// Exercise null through the actual provider-result -> controller -> prose path,
// rather than merely inspecting the JSON schema. All fetches stay intercepted.
globalThis.fetch=async(input:any,options:any={})=>{
  const response=await fixtureFetch(input,options),id=String(input).split('/').at(-1);
  const request=writerFixture.requests.get(id);
  if(!options.method&&request?.text?.format?.name==='tldr_astro_plan'){
    const payload=await response.json();
    for(const item of payload.output??[])for(const content of item.content??[])if(content.type==='output_text'){
      const plan=JSON.parse(content.text);
      for(const field of ['consequentialDistinction','changedUnderstanding','differentResponse'])plan[field]=null;
      content.text=JSON.stringify(plan);
    }
    return Response.json(payload);
  }
  return response;
};
try{
  for(const period of ['weekly','monthly','seasonal']){
    const source='Complete synthetic source opening.\n\nComplete synthetic source ending.';
    const base={...defaultHoroscopeProfile(period),sourceGuidance:source};
    const demonstrations='- "Complete synthetic demonstration, with its exact ending."';
    const languageRules='Use full sentences. Do not use em dashes. Keep unknown history open.';
    const profile=period==='weekly'?proposeWeeklyProfile({profile:base,demonstrations,languageRules})
      :period==='monthly'?proposeMonthlyProfile(base):base;
    assert.equal(profile.sourceGuidance,source);
    if(period==='weekly'){
      assert.equal(profile.structure,base.structure);
      assert(profile.voiceGuidance.includes(demonstrations));assert(profile.voiceGuidance.includes(languageRules));
    }
    const saved=await store.invoke('POST',{profile,expectedUpdatedAt:null},'/api/admin/generated-content?writingProfiles=true');
    assert.equal(saved.status,200);const savedRow=structuredClone(store.rows.get(saved.payload.profile.id));
    const packet=await prepareHoroscopeBrief(new URL(`http://localhost/?period=${period}&date=2026-10-26&timeZone=America/New_York`));
    const edition=emptyHoroscopeEdition(packet.brief.window),sign=period==='monthly'?'overview':'aries';
    const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic refined instruction fixture',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:packet},sourceSnapshot:{horoscopeOutlines:{}}});
    assert.equal(created.status,200);let row=created.payload.rows[0];
    const action=async(action:string,extra:any={})=>{
      const response=await invoke({action,id:row.id,expectedUpdatedAt:row.updated_at,...extra});
      assert([200,202].includes(response.status),`${period} ${action}: ${response.payload.error??response.status}`);
      if(response.payload.rows?.[0])row=response.payload.rows[0];return response;
    };
    const prepared=await action('prepare');const oldIds=new Set(writerFixture.requests.keys());
    await action('generate',{sign,approvedPlanHash:prepared.payload.plan.planHash});
    const opId=row.source_snapshot.horoscopeGeneration.active.id;
    for(let attempt=0;attempt<60;attempt++){
      row=decodeWeeklyHistoryRow(structuredClone(store.rows.get(row.id)));
      const op=row.source_snapshot.horoscopeGeneration.active;if(!op)break;
      await action(op.state==='ready'?'continue':'poll');
    }
    row=decodeWeeklyHistoryRow(structuredClone(store.rows.get(row.id)));
    assert(!row.source_snapshot.horoscopeGeneration.active);assert.equal(row.status,'DRAFT');
    assert.deepEqual(store.rows.get(saved.payload.profile.id),savedRow,'Assembly never edits the saved profile');
    assert.deepEqual(row.facts.horoscopeBrief,packet,'Full signed facts are untouched');
    const requests=[...writerFixture.requests].filter(([id])=>!oldIds.has(id)).map(([,r])=>r);
    const prose=requests.find(r=>r.instructions===horoscopeProseInstructions(period));assert(prose);
    for(const field of ['voiceGuidance','structure','sourceGuidance'])assert(prose.input.includes(profile[field]));
    for(const old of ['a useful next move','GHOSTWRITER CRAFT GUIDANCE','Effective TLDR Astro writing rules'])assert(!prose.instructions.includes(old));
    for(const label of ['CORRECTIO','TRICOLON','PURPLE_PROSE'])assert(prose.instructions.includes(label));
    for(const header of ['NEUTRAL HELLENISTIC MEANING SUPPORT','OWNER-APPROVED STYLE REFERENCE']){
      const data=JSON.parse(prose.input.split(header+'\n')[1].split('\n')[0]);assert(!('authority' in data));
    }
    if(period==='weekly'){
      assert(prose.instructions.includes('An opening may need several connected sentences'));
      assert(prose.instructions.includes('No compulsory hook'));
      assert(prose.instructions.includes('abstract psychological verdict'));
      assert(prose.input.includes('without requiring a psychological revelation'));
      const facts=JSON.parse(prose.input.split('CALCULATED FACTS\n')[1].split('\n')[0]);
      assert.equal(facts.signs.length,1);assert.equal(facts.signs[0].sign,'aries');assert.equal(packet.brief.signs.length,12);
    }
    if(period!=='weekly')assert(!prose.instructions.includes('An opening may need several connected sentences'),'Weekly prose direction does not leak to Monthly or Seasonal');
    if(period==='monthly'){
      assert(!prose.input.includes('retain their primary voice role'));
      assert(prose.input.includes('Follow the current source-priority order in the saved Monthly profile'));
      assert.deepEqual(prose.text.format.schema.required,['headline','tldr','body']);
    }
    if(period==='seasonal'){
      const run=editorialFixtureRows.get(opId).state,plan=latest(run,'plan');
      assert.equal(run.counts.calls,6,'The refinement adds no model stage');
      assert.equal(run.input.template.seasonalPreparation.proseInstructionsVersion,HOROSCOPE_PROSE_INSTRUCTIONS_VERSION);
      for(const field of ['consequentialDistinction','changedUnderstanding','differentResponse'])assert.equal(plan[field],null);
      assert(prose.input.includes('"differentResponse":null'));
      const adapter=seasonalEditorialAdapter(run.input);adapter.validate('plan',plan,run);
      assert.throws(()=>adapter.validate('plan',{...plan,humanWant:null},run),/invalid_plan_value/);
      assert.throws(()=>adapter.validate('plan',{...plan,developments:[{eventId:'unsupported',whatChanges:'Synthetic.'}]},run),/invalid_plan_value/);
      const legacyInput=structuredClone(run.input);delete legacyInput.template.seasonalPreparation.proseInstructionsVersion;
      const legacy=seasonalEditorialAdapter(legacyInput);
      assert.throws(()=>legacy.validate('plan',plan,run),/invalid_plan_value/,'Old frozen preparations keep their original schema');
      const oldPlan={...plan,consequentialDistinction:'Supported distinction.',changedUnderstanding:'Supported recognition.',differentResponse:'Supported response.'};
      legacy.validate('plan',oldPlan,run);
      const evaluation=requests.find(r=>r.text.format.name==='tldr_astro_meaning');
      assert(evaluation.instructions.includes('necessary information, development, context or understanding'));
      assert(evaluation.instructions.includes('may legitimately be null'));
    }
  }
}finally{globalThis.fetch=fixtureFetch;}
console.log('PASS refined horoscope stacks: actual handlers, complete exact profiles/sources, audience projection, Monthly source priority, nullable Seasonal plan through prose, legacy schema, unchanged stages and draft state. Injected providers only.');
