import {createHash} from 'node:crypto';
import {horoscopeProfileEvidence} from './horoscopePromptVariables.mjs';
import {dailyWriterFacts} from './dailyWriterFacts.mjs';

/** Prose is delivered as prose. The JSON index retains identity and integrity;
 * exact complete bodies retain their real paragraph breaks, once each. */
export function renderDailyHoroscopeSources(sources,period='daily') {
  if(!['daily','weekly'].includes(period))throw new Error('Choose Daily or Weekly source transport.');
  const label=period.toUpperCase();
  const index=sources.map(({text,...metadata})=>{
    if(createHash('sha256').update(text).digest('hex')!==metadata.sha256
      ||text.includes(`BEGIN COMPLETE ${label} SOURCE ${metadata.id}`)
      ||text.includes(`END COMPLETE ${label} SOURCE ${metadata.id}`))throw new Error('Horoscope source text integrity failed.');
    return {...metadata,completeTextRef:metadata.id};
  });
  return [`${label} COMPLETE SOURCE PASSAGES\n${JSON.stringify(index)}`,
    ...sources.map(source=>`BEGIN COMPLETE ${label} SOURCE ${source.id}\n${source.text}\nEND COMPLETE ${label} SOURCE ${source.id}`)].join('\n\n');
}

/** Every identity and use restriction once, instead of repeating complete
 * metadata through the register, same-family, relevant and five-role views. */
export function horoscopeSourceRoles(evidence) {
  const references=new Map();
  const add=(entry,use)=>{
    if(!entry.completePassageRef)return;
    const key=JSON.stringify(entry),selected=references.get(key);
    if(selected){if(!selected.uses.includes(use))selected.uses.push(use);return;}
    references.set(key,{...entry,uses:[use]});
  };
  for(const field of ['primaryRegisterPassages','sameFamilyExamples','relevantOwnerPassages','registerGoldExamples']){
    for(const entry of evidence[field])add(entry,'historical owner voice; never current astrology or a prescribed scenario');
  }
  for(const [role,entries] of Object.entries(evidence.sharedEvidencePacket.roles)){
    for(const entry of entries)add(entry,role==='meaning'?'governed interpretation only':`source role: ${role}`);
  }
  return [...references.values()];
}

/** The legacy scene/phrase catalogue is audited by preparation, but is not a
 * second Daily brief. It can contain natal compatibility and isolated advice
 * selected from the shared Moon anchor rather than this day's developments.
 * Keep those originals in the internal context; the writer learns prose from
 * the complete selected owner forecasts and articles. */
export function dailyWriterSourceSelection(context,{writingProfile=null}={}) {
  const articles=new Map(),omitted=new Map();
  const automatic=[...(context.primaryRegisterPassages??[]),...(context.sameFamilyExamples??[])];
  const designated=writingProfile?.profile?.period==='daily'?horoscopeProfileEvidence(writingProfile.profile.sourceGuidance).passages:[];
  if(designated.length){
    for(const entry of [...automatic,...(context.relevantOwnerPassages??[]),...(context.registerGoldExamples??[]),...(context.sharedEvidencePacket?.roles?.register??[])]){
      if(typeof entry.text==='string')omitted.set(entry.text,{id:entry.id,sha256:createHash('sha256').update(entry.text).digest('hex'),
        selectionKind:'designated-complete-examples-take-priority',reason:'Complete current guide examples supply the voice. Automatic topical voice candidates remain in the original retrieval audit, not this prose request.'});
    }
  }
  for(const entry of automatic){
    if(designated.length)break;
    if(!['article paragraph','published article opening excerpt','published article body excerpt'].includes(entry.structuralFunction))continue;
    omitted.set(entry.text,{id:entry.id,sha256:createHash('sha256').update(entry.text).digest('hex'),
      selectionKind:'historical-article-fragment',reason:'Automatic topical article excerpts are retained in retrieval, rather than used as the compact Daily voice demonstration.'});
  }
  for(const entry of automatic){
    if(designated.length)break;
    if(entry.family!=='weekly-astrology'||entry.structuralFunction!=='complete weekly sign reading'||!entry.sourceArticleSha256)continue;
    const first=articles.get(entry.sourceArticleSha256);
    if(first&&first.text!==entry.text)omitted.set(entry.text,{id:entry.id,sha256:createHash('sha256').update(entry.text).digest('hex'),
      sourceArticleSha256:entry.sourceArticleSha256,selectedInstead:first.id,selectionKind:'same-article-repeat',reason:'Another complete reading from this same article is already selected.'});
    else if(!first)articles.set(entry.sourceArticleSha256,entry);
  }
  const writerSourceSelection={version:'daily-source-diversity/v3-2026-11-03',omitted:[...omitted.values()],
    designatedExamples:designated.map(({id,sha256})=>({id,sha256})),
    basis:designated.length?'Complete designated guide examples supply voice; automatic topical voice candidates remain in the original preparation audit. Independent governed meanings retain their own role and full text.'
      :'Automatic Daily voice support uses complete forecasts rather than historical article excerpts, with one distinct weekly unit per source article. Designated profile examples and the approved style reference are unchanged. Original retrieval remains in preparation.'};
  if(!omitted.size)return {...context,writerSourceSelection};
  const keep=entry=>!omitted.has(entry.text);
  const packet=context.sharedEvidencePacket??{roles:{},entries:[]};
  // A matching meaning record keeps its independent licensed role. Only voice
  // aliases of omitted weekly units are removed from the writer projection.
  const keepRole=entry=>entry.role!=='register'||keep(entry);
  const roles=Object.fromEntries(Object.entries(packet.roles).map(([role,entries])=>[role,role==='register'?entries.filter(keep):entries]));
  return {...context,...Object.fromEntries(['primaryRegisterPassages','sameFamilyExamples','relevantOwnerPassages','registerGoldExamples']
    .map(field=>[field,(context[field]??[]).filter(keep)])),sharedEvidencePacket:{...packet,roles,entries:packet.entries.filter(keepRole),
      counts:{...packet.counts,...(packet.counts?.register!==undefined?{register:roles.register?.length??0}:{})}},
    writerSourceSelection};
}

/** The shared retrieval plan is anchored to the Moon. Its meaning role is not
 * the meaning of every development in a Daily reading. Use the complete
 * reviewed clauses already bound by calculation preparation, without treating
 * historical ingress prose as an event today. Keep the original packet intact
 * for audit; ordinary Moon context stays in its separate optional fact packet. */
export function dailyCurrentMeaningContext(context,engineFacts) {
  if(engineFacts?.window?.period!=='daily')return context;
  const {developments}=dailyWriterFacts(engineFacts),selected=new Map();
  const dayEvents=new Set(developments.events);
  for(const development of [...developments.events,...developments.background]){
    for(const binding of development.placements??[development]){
      const meaning=binding.meaning;
      if(meaning?.status!=='REVIEWED_CLAUSE'||!meaning.sourceId||!meaning.sourcePath||!meaning.temporaryMeaning)throw new Error('A Daily development is missing its reviewed meaning.');
      const key=JSON.stringify([meaning.sourceId,meaning.sourcePath,meaning.temporaryMeaning]);
      let entry=selected.get(key);
      if(!entry){
        entry={id:`meaning:${meaning.sourceId}`,role:'meaning',sourceKind:'reviewed-doctrine',status:meaning.status,
          sourcePath:meaning.sourcePath,sourceId:meaning.sourceId,text:meaning.temporaryMeaning,
          ownerAuthored:false,ownerApproved:false,eligibleForWriterRegister:false,
          coverage:'optional-ongoing-context',currentBindings:[]};
        selected.set(key,entry);
      }
      if(dayEvents.has(development))entry.coverage='day-event-meaning';
      entry.currentBindings.push({developmentId:development.id,planet:binding.planet,sign:binding.sign,house:binding.house,domain:binding.domain});
    }
  }
  const packet=context.sharedEvidencePacket,meaning=[...selected.values()];
  return {...context,sharedEvidencePacket:{...packet,roles:{...packet.roles,meaning},
    entries:[...packet.entries.filter(entry=>entry.role!=='meaning'),...meaning],counts:{...packet.counts,meaning:meaning.length}},
    writerMeaningSelection:{version:'daily-current-meaning/v2',basis:'Exact reviewed clauses bound to the current public developments. Ongoing reference conditions are optional context, not dated-event coverage or paragraph assignments. Original Moon-anchor retrieval remains in the preparation audit.',
      originalAnchorMeanings:(packet.roles.meaning??[]).map(entry=>({id:entry.id,sha256:createHash('sha256').update(entry.text).digest('hex')})),
      currentMeanings:meaning.map(entry=>({id:entry.id,sha256:createHash('sha256').update(entry.text).digest('hex'),coverage:entry.coverage,currentBindings:entry.currentBindings}))}};
}

export function dailyHoroscopeWriterEvidence(original,{diversifyWeekly=true,writingProfile=null,engineFacts=null}={}) {
  const selected=diversifyWeekly?dailyWriterSourceSelection(original,{writingProfile}):original;
  const context=dailyCurrentMeaningContext(selected,engineFacts);
  const packet=context.sharedEvidencePacket;
  const scopeArgument=entry=>{
    if(entry.role!=='argument'||entry.sourceKind!=='current-approved-argument-and-close')return entry;
    const {text,...metadata}=entry;
    return {...metadata,eligibleForWriterRegister:false,approvedScopeRef:'OWNER-APPROVED WRITING PLAN — SCOPE'};
  };
  const roles=Object.fromEntries(Object.entries({...packet.roles,scene:[],phrase:[]}).map(([role,entries])=>[role,entries.map(scopeArgument)]));
  return dailyHoroscopeEvidence({...context,phraseExamples:[],sharedEvidencePacket:{...packet,
    roles,entries:packet.entries.filter(entry=>entry.role!=='scene'&&entry.role!=='phrase').map(scopeArgument),
    counts:{...packet.counts,scene:0,phrase:0},
    supportingArgumentCandidates:[]}});
}

/** The existing no-transplant check also protects the actual designated units,
 * without rendering a second copy of those units in the writer request. */
export function dailyWriterValidationSources(context,writingProfile,engineFacts=null) {
  const sources=dailyHoroscopeWriterEvidence(context,{writingProfile,engineFacts}).completeSourcePassages;
  const designated=writingProfile?.profile?.period==='daily'?horoscopeProfileEvidence(writingProfile.profile.sourceGuidance).passages:[];
  return [...new Map([...sources,...designated].map(source=>[source.sha256,source])).values()];
}

/** Daily transport projection only. Source selection and receipts keep the
 * original objects; every role retains its metadata and exact complete text. */
export function dailyHoroscopeEvidence(context) {
  const sources=new Map();
  const reference=entry=>{
    if(typeof entry.text!=='string'||!entry.text)return entry;
    let source=sources.get(entry.text);
    if(!source){
      const sha256=createHash('sha256').update(entry.text).digest('hex');
      source={id:`daily-source:${sha256}`,sha256,text:entry.text};
      sources.set(entry.text,source);
    }
    const {text,...metadata}=entry;
    return {...metadata,completePassageRef:source.id};
  };
  const projected=Object.fromEntries(['primaryRegisterPassages','sameFamilyExamples','relevantOwnerPassages','registerGoldExamples','phraseExamples']
    .map(field=>[field,context[field].map(reference)]));
  const packet=context.sharedEvidencePacket;
  return {...context,...projected,sharedEvidencePacket:{...packet,
    entries:packet.entries.map(reference),
    roles:Object.fromEntries(Object.entries(packet.roles).map(([role,entries])=>[role,entries.map(reference)])),
    supportingArgumentCandidates:packet.supportingArgumentCandidates.map(reference)
  },completeSourcePassages:[...sources.values()]};
}
