import provider from './offlineProviderConfig.cjs';
import responses from './openAIResponses.cjs';
import {seasonalWriterFacts,completeSeasonalDraftRequest} from './seasonalDraftInput.mjs';
import {validateHoroscopeReading} from './horoscopeValidation.mjs';
import {createEvidenceRegistry,digest} from './editorial/evidenceRegistry.mjs';
import {latest} from './editorial/controller.mjs';
import {object,text,list,evaluationSchema,evaluationInstructions} from './editorial/evaluation.mjs';

export const SEASONAL_EDITORIAL_WORKFLOW='seasonal-editorial/v2';
export const seasonalEditorialModels=()=>Object.fromEntries(['mechanism','plan','prose','plan_review','voice','meaning'].map(stage=>[stage,
  provider.normalizeProviderConfig({reasoningEffort:stage==='prose'?'medium':'medium',maxOutputTokens:stage==='prose'?12000:8000},['plan_review','voice','meaning'].includes(stage)?'judge':'writer')]));
const enumOf=values=>({type:'string',enum:values});
const words=value=>new Set((String(value).toLowerCase().match(/[a-z]{4,}/gu)??[]).filter(w=>!new Set('that this with your from what have when which into about their they more only them then there these some would could should through before after another people'.split(' ')).has(w)));

export function seasonalEvidenceRegistry(input) {
  return createEvidenceRegistry({seasonal:{retrieve:async(query,diagnostic)=>{
    const preparation=input.template.seasonalPreparation,context=preparation.context;
    const all=[...(context.primaryRegisterPassages??[]),...(context.sameFamilyExamples??[])];
    const seen=new Set(),excluded=[],entries=[];
    const concern=words(`${query.domain} ${query.seasonMeaning}`);
    const withheld=new Set(input.withheldSourceGroups??[]);
    const badIds=new Set((diagnostic?.findings??[]).filter(f=>f.responsibleStage==='evidence').flatMap(f=>f.comparisons.map(c=>c.evidenceId)));
    // This explicit bounded assignment belongs in the comparison registry as
    // well as the frozen profile. Judges must see the current owner revision.
    const savedProfile=preparation.writingProfile;
    const preferred=savedProfile?.profile?.voiceGuidance?.match(/BEGIN COMPLETE OWNER PREFERRED REVISION\s*\n([\s\S]*?)\nEND COMPLETE OWNER PREFERRED REVISION/u)?.[1];
    if(preferred?.trim()&&savedProfile.id&&savedProfile.revision&&savedProfile.sha256){
      const id=`seasonal-profile:${savedProfile.id}:v${savedProfile.revision}:preferred-revision`;
      if(!badIds.has(id))entries.push({id,role:'approved',authority:'exact_owner_approved',text:preferred,
        source:{locator:`studio-writing-profile/${savedProfile.id}/voiceGuidance/preferred-revision`,version:savedProfile.sha256,provenance:{revision:savedProfile.revision,updatedAt:savedProfile.updatedAt,assignment:'Explicit complete owner-preferred revision delimited in the saved Seasonal profile.'}},
        scope:'Current complete owner-preferred revision takes precedence over older examples for wording and movement. Its Libra situation is not a plot or current factual source for another audience.',
        relevance:{score:120,reason:'Current explicit owner assignment for Seasonal wording and reasoning movement.'},ownerReason:null,rejectedSpans:[]});
      else excluded.push({id,reason:'evidence_mismatch'});
    }
    for(const p of all){
      const id=p.id??p.sourceId;if(seen.has(id))continue;seen.add(id);
      const rejection=input.rejections.find(r=>r.rejected_text===p.text);
      if(rejection||withheld.has(p.sourcePath)||badIds.has(id)){excluded.push({id,reason:rejection?'owner_rejected_version':withheld.has(p.sourcePath)?'held_out_source_group':'evidence_mismatch'});continue;}
      if(p.authorityClass!=='owner_authored_final'||p.ownerAuthored!==true||p.ownerApproved!==true||!p.sourcePath)continue;
      const explicit=p.seasonalArgumentPrimary===true,complete=p.horoscopePeriod==='seasonal'&&p.horoscopeAudienceSign===query.audience;
      const overlap=[...words(p.text)].filter(w=>concern.has(w));
      if(!explicit&&(!complete||overlap.length<2)){excluded.push({id,reason:'no_strong_complete_unit_match'});continue;}
      entries.push({id,role:'approved',authority:'owner_authored_final',text:p.text,textHash:p.sourceRecordSha256??digest(p.text),
        source:{locator:p.sourcePath,version:p.sourceArticleSha256??p.sourceSha256??digest(p.text),provenance:p.provenance??null},
        scope:explicit?'Owner-assigned complete Seasonal argument/register reference; its historical facts and plot are not transferable.':'Complete same-audience Seasonal reading; historical facts are not current facts.',
        relevance:{score:explicit?100:overlap.length,reason:explicit?'Explicit owner assignment for Seasonal reasoning and voice.':`Complete ${query.audience} seasonal unit with supported concern overlap: ${overlap.join(', ')}.`},
        ownerReason:null,rejectedSpans:[]});
    }
    // Keep strongest complete supporting units, without filling a minimum.
    entries.sort((a,b)=>b.relevance.score-a.relevance.score||a.id.localeCompare(b.id));
    const selected=entries.slice(0,5);
    for(const e of entries.slice(5))excluded.push({id:e.id,reason:'stronger_complete_references_selected'});
    for(const row of input.rejections){
      if(row.status!=='active'||row.kind!=='rejection'||!row.rejected_text?.trim()||!row.owner_reason?.trim()||!row.source_uri)continue;
      if(!row.target_keys.some(k=>k==='horoscope/seasonal'||input.seasonalRejectionTargetKeys?.includes(k))){
        excluded.push({id:`studio-writing:${row.id}:v${row.version}`,reason:'period_not_established_by_provenance'});continue;
      }
      const sameTarget=row.target_keys.some(k=>k.endsWith(`/${query.audience}`));
      const seasonal=row.target_keys.includes('horoscope/seasonal');
      if(!sameTarget&&!seasonal)continue;
      selected.push({id:`studio-writing:${row.id}:v${row.version}`,role:'rejected',authority:'explicit_owner_rejection',text:row.rejected_text,
        source:{locator:`studio_writing_feedback/${row.id}`,version:String(row.version),provenance:{sourceUri:row.source_uri,sourceDate:row.source_date,targetKeys:row.target_keys}},
        scope:'Only the stored rejected passage/spans are rejected. The owner reason is exact; infer neither a replacement nor a global rule from unchanged surrounding prose.',
        relevance:{score:sameTarget?100:50,reason:sameTarget?'Prior rejected Seasonal draft for this audience.':'Explicit Seasonal correction with same reading register.'},
        ownerReason:row.owner_reason,rejectedSpans:row.rejected_spans??[row.rejected_text]});
    }
    return {entries:selected,excluded};
  }}});
}

export function mechanismSchema(facts) {
  return object({core:text,links:{type:'array',minItems:1,items:object({eventId:enumOf(facts.events.map(e=>e.id)),meaningRef:enumOf(Object.keys(facts.meanings)),explanation:text})},
    humanDomains:list(text),limits:list(text),placementSpecificity:text});
}
export function developmentSchema(facts,manifest) {
  return object({humanConcern:text,startingSituation:text,humanWant:text,
    developments:{type:'array',minItems:1,items:object({eventId:enumOf(facts.events.map(e=>e.id)),whatChanges:text})},
    consequentialDistinction:text,changedUnderstanding:text,differentResponse:text,plausibleManifestations:list(text),notAssumed:list(text),
    passageSelections:{type:'array',minItems:1,items:object({id:enumOf(manifest.entries.filter(e=>e.role==='approved').map(e=>e.id)),why:text})},
    sourceDifferences:list(object({id:enumOf(manifest.entries.filter(e=>e.role==='approved').map(e=>e.id)),difference:text}))});
}
function checkStructure(value,schema,path='') {
  if(schema.type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==schema.required.slice().sort().join('|'))throw new Error(`invalid_plan_shape:${path}`);
    for(const [key,s] of Object.entries(schema.properties))checkStructure(value[key],s,`${path}.${key}`);
  }else if(schema.type==='array'){
    if(!Array.isArray(value)||value.length<(schema.minItems??0))throw new Error(`invalid_plan_array:${path}`);
    value.forEach((v,i)=>checkStructure(v,schema.items,`${path}.${i}`));
  }else if(typeof value!=='string'||!value.trim()||schema.enum&&!schema.enum.includes(value))throw new Error(`invalid_plan_value:${path}`);
}
export function seasonalEditorialAdapter(input) {
  const facts=seasonalWriterFacts(input.template.seasonalPreparation.engineFacts),registry=seasonalEvidenceRegistry(input);
  const data=run=>({facts,manifest:latest(run,'evidence'),mechanism:latest(run,'mechanism'),plan:latest(run,'plan')});
  return {
    async retrieve(run,diagnostic){return registry.retrieve('seasonal',{target:run.target,audience:facts.audience,
      domain:input.template.seasonalPreparation.engineFacts.seasonalMeaning?.audience?.domain??Object.values(facts.placements).filter(p=>p.planet==='sun').map(p=>p.domain).join(' '),
      seasonMeaning:JSON.stringify(facts.seasonalMeaning)},diagnostic,latest(run,'evidence')?.hash??null);},
    request(run){
      const {manifest,mechanism,plan}=data(run),stage=run.stage,config=run.models[stage];
      let schema,prompt,instructions,role;
      const feedback=latest(run,'routing');
      const base={audience:facts.audience,governedFacts:facts,evidenceManifest:manifest};
      if(stage==='mechanism'){
        schema=mechanismSchema(facts);role='SEASONAL_MECHANISM';
        instructions='Build the astrology mechanism for one Seasonal reading from the governed catalog. Explain how the selected event meanings and their attached whole-sign life areas combine and what they cannot establish. Cite supplied event IDs and their actual meaning references. Season-axis sources are interpretive context, not dated events. Do not create a miniature story, invent a personal event, imitate an owner argument, or write prose. Distinguish the mechanism from materially different placements. Return only the schema.';
        prompt=JSON.stringify({...base,feedback});
      }else if(stage==='plan'){
        schema=developmentSchema(facts,manifest);role='SEASONAL_PLANNER';
        instructions='Develop an underlying human concern and consequential distinction from the validated source-bound astrology mechanism. This is a plan, not horoscope prose. startingSituation describes the concern a person could recognize, not a compulsory invented activity. A project, chore, errand, conversation, cooking or shopping must not become the plot merely to appear concrete. Several possible manifestations may illustrate the same concern; leave them optional. Identify what each selected event changes in the reasoning, using its supplied meaning rather than its date alone. No compulsory conflict, advice, permission or fixed ending. Use complete approved passages for reasoning and movement, while making sourceDifferences explicit so you do not transplant their argument. Compare the scoped owner rejections. Select only relevant approved evidence, with no quota. Return the schema.';
        prompt=JSON.stringify({...base,mechanism,feedback});
      }else if(stage==='prose'){
        const request=completeSeasonalDraftRequest(input.template,plan,manifest);
        // Existing prose instructions remain byte-identical. Correction findings
        // and mechanism are request data, not additions to the master prompt.
        return {...request,input:`${request.input}\n\nVALIDATED ASTROLOGY MECHANISM\n${JSON.stringify(mechanism)}\n\nSUPPORTED REVISION FINDINGS\n${JSON.stringify(feedback?.action==='regenerate'?feedback:null)}`,config};
      }else{
        const scope=stage==='plan_review'?'plan':stage;
        const candidate=scope==='plan'?{mechanism,plan}:latest(run,'candidate');
        schema=evaluationSchema(scope,manifest);role=stage==='plan_review'?'SEASONAL_PLAN_REVIEWER':stage==='voice'?'SEASONAL_VOICE_REVIEWER':'SEASONAL_MEANING_REVIEWER';
        instructions=evaluationInstructions(scope);
        prompt=JSON.stringify({audience:facts.audience,candidate,candidateHash:digest(candidate),manifestHash:manifest.hash,evidenceManifest:manifest,
          ...(scope==='voice'?{}:{governedFacts:facts,mechanism,...(scope==='meaning'?{plan}:{})})});
      }
      return {stage,role,input:prompt,schema,config,instructions:responses.governedInstructionsForRole(role,{taskInstructions:instructions,surface:'horoscopes',family:'horoscope'})};
    },
    validate(stage,value,run){
      checkStructure(value,stage==='mechanism'?mechanismSchema(facts):developmentSchema(facts,latest(run,'evidence')));
      if(stage==='mechanism')for(const link of value.links){
        const event=facts.events.find(e=>e.id===link.eventId);
        const refs=[event.meaningRef,...(event.placementRefs??[event.placementRef]).filter(Boolean).map(id=>facts.placements[id].meaningRef)];
        if(!refs.includes(link.meaningRef))throw new Error('mechanism_meaning_not_attached_to_event');
      }
      if(stage==='plan'){
        if(new Set(value.developments.map(d=>d.eventId)).size!==value.developments.length)throw new Error('duplicate_plan_event');
        if(new Set(value.passageSelections.map(s=>s.id)).size!==value.passageSelections.length)throw new Error('duplicate_plan_source');
      }
    },
    validateDraft(value){
      if(!value||Object.keys(value).sort().join('|')!=='body|headline'||!value.body?.trim()||!value.headline?.trim()
        ||value.headline!==input.template.schema.properties.headline.enum[0])return {passed:false,violations:[{category:'invalid_reading',detail:'Expected exact headline and body schema.'}]};
      return validateHoroscopeReading({sign:facts.audience,...value},input.brief,{ownerCorrections:input.validationCorrections??[]});
    }
  };
}
