import {createHash} from 'node:crypto';
import {HOROSCOPE_VOICE_REVIEW,HOROSCOPE_VOICE_CRITERIA} from './horoscopeVoiceStandard.mjs';
import {horoscopeProfileEvidence} from './horoscopePromptVariables.mjs';
import {weeklyProfileExamples} from './weeklyProfileExamples.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
export const voiceParagraphs=text=>typeof text==='string'?text.split(/\r?\n[ \t]*(?:\r?\n)+/u).filter(p=>p.trim()):[];
export const hasHoroscopeVoiceReview=evidence=>['daily','weekly'].includes(evidence?.engineFacts?.window?.period)
  &&evidence.voiceReviewContract===HOROSCOPE_VOICE_REVIEW;
const keys=Object.keys(HOROSCOPE_VOICE_CRITERIA);
const assessment={type:'object',additionalProperties:false,required:['outcome','candidateParagraph','candidateQuote','referenceId','referenceParagraph','referenceQuote','reason'],properties:{
  outcome:{type:'string',enum:['pass','revise','unassessed']},candidateParagraph:{type:['integer','null']},candidateQuote:{type:'string'},
  referenceId:{type:['string','null']},referenceParagraph:{type:['integer','null']},referenceQuote:{type:'string'},reason:{type:'string'}
}};
export const HOROSCOPE_VOICE_REVIEW_SCHEMA={type:'object',additionalProperties:false,required:keys,
  properties:Object.fromEntries(keys.map(key=>[key,assessment]))};
export const HOROSCOPE_VOICE_REVIEW_INSTRUCTIONS=`FULL-READING VOICE REVIEW
Assess the complete candidate beside the applicable complete designated references, including the opening, middle and ending. Apply current scoped owner corrections first. Do not infer an owner's verdict on this candidate. No numeric style score, phrase-count proxy or automatic rewrite is requested. Factual correctness and rhetorical passes cannot establish voice quality.
${Object.entries(HOROSCOPE_VOICE_CRITERIA).map(([key,text])=>`${key}: ${text}`).join('\n')}
For each criterion return pass, revise or unassessed with a specific reason. A pass means no cited issue in this assessment, never owner approval. For pass or revise cite exact wording from the candidate body and an eligible reference body and explain the comparison and its material effect on the reader in the context of both complete readings. For interpretation also explain the configuration/meaning basis; quoting a source's historical astrology does not supply current facts. For ending cite the final candidate paragraph and consider its preceding development. Do not demand a particular story, disagreement, feeling or ending device because a reference uses it. Primary designated references govern; supporting prose does not override them.
voiceReferences inventories eligible source IDs and zero-based paragraph indices. Their complete original text is already in evidence.writingProfile.profile.sourceGuidance or evidence.ownerExamples. Paragraphs are nonempty blocks separated by blank lines, including headings in index numbering; headings alone are ineligible evidence. Return paragraph indices and exact substrings, without added quotation marks. A quote must belong to the indexed paragraph. If evidence is missing or the criterion cannot be assessed, use unassessed with a concrete reason and null indices/ID plus empty quotes. Never turn missing evidence into pass. All findings remain advisory for human review; do not rewrite, train, approve or publish.`;

/** Inventory exact full source units without rewriting their text or designation.
 * Tagged saved references take precedence over retrieved supporting examples. */
export function horoscopeVoiceReferences(evidence) {
  const guidance=evidence?.writingProfile?.profile?.sourceGuidance??'';
  const references=[];
  const add=(value)=>{
    if(!value.text?.trim()||references.some(r=>r.id===value.id))throw new Error('invalid_voice_reference');
    if(value.sha256&&value.sha256!==hash(value.text)||value.sourceRecordSha256&&value.sourceRecordSha256!==hash(value.text))throw new Error('invalid_voice_reference');
    references.push({...value,sha256:hash(value.text)});
  };
  for(const p of horoscopeProfileEvidence(guidance).passages)add({...p,role:'saved owner-designated comparison; original authorship and restrictions retained',location:'writingProfile.profile.sourceGuidance'});
  const blocks=[...guidance.matchAll(/^REFERENCE ([^\r\n]+)\r?\nRole: ([^\r\n]+)\r?\nSource: ([^\r\n]+)\r?\nComplete text SHA-256: ([a-f0-9]{64})\r?\nBEGIN COMPLETE REFERENCE \1\r?\n([\s\S]*?)\r?\nEND COMPLETE REFERENCE \1(?=\r?\n|$)/gmu)];
  if((guidance.match(/^BEGIN COMPLETE REFERENCE /gmu)??[]).length!==blocks.length)throw new Error('invalid_voice_reference');
  for(const [,id,role,sourcePath,sha256,raw] of blocks){
    // A boundary newline may be outside or inside the pinned original. Select
    // only a byte-exact hash match, never normalize protected prose.
    const text=[raw,raw+'\n',raw+'\r\n'].find(t=>hash(t)===sha256);
    if(text===undefined)throw new Error('invalid_voice_reference');
    if(/rejected|negative evidence|meaning only/iu.test(role))continue;
    add({id,text,role,sourcePath,location:'writingProfile.profile.sourceGuidance'});
  }
  if(/^OWNER-DESIGNATED WEEKLY /u.test(guidance)){
    const selected=weeklyProfileExamples(guidance,evidence.engineFacts.risingSign);
    for(const p of selected.passages){
      if(references.some(r=>r.id===p.id))continue;
      const body=/^APPROVED EXAMPLE — VERBATIM\r?\n([\s\S]*?)^END OF [A-Z]+ EXAMPLE\r?$/mu.exec(p.text)?.[1];
      add({id:p.id,text:body??p.text,role:p.role,location:'writingProfile.profile.sourceGuidance'});
    }
  }
  if(!references.length){
    const rejected=new Set((evidence?.rejectedExamples??[]).map(e=>e.id));
    for(const p of evidence?.ownerExamples??[]){
      if(!p.id||!p.text?.trim()||rejected.has(p.id)||/rejected|negative evidence|meaning only/iu.test(p.role??''))continue;
      if(references.some(r=>r.id===p.id))continue;
      add({id:p.id,text:p.text,sha256:p.sha256,sourceRecordSha256:p.sourceRecordSha256,role:p.role??'selected owner example; original source restrictions retained',sourcePath:p.sourcePath??null,location:'ownerExamples'});
    }
  }
  return references;
}
const signTitle=/^(?:\d{4}-\d{2}-\d{2}\s*·\s*)?(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)(?:\s*(?:&|\/)\s*\1)?(?:\s+rising)?\s*$/iu;
const headingOnly=text=>text.trim().split(/\r?\n/u).every(line=>/^#{1,6}[ \t]+\S/u.test(line.trim())||signTitle.test(line.trim()));
const eligibleIndices=text=>voiceParagraphs(text).flatMap((p,i)=>headingOnly(p)?[]:[i]);
export const horoscopeVoiceReferenceInventory=evidence=>horoscopeVoiceReferences(evidence).map(({id,role,sourcePath,location,text})=>({id,role,sourcePath,location,eligibleParagraphs:eligibleIndices(text)}));

export function validateHoroscopeVoiceReview(value,candidate,evidence) {
  const invalid=()=>{throw new Error('invalid_horoscope_voice_review');};
  if(!value||typeof value!=='object'||Object.keys(value).length!==keys.length||keys.some(k=>!value[k]))invalid();
  const paragraphs=voiceParagraphs(candidate.body),references=horoscopeVoiceReferences(evidence);
  const result={};
  for(const key of keys){
    const v=value[key];
    if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==assessment.required.length||assessment.required.some(k=>!(k in v))
      ||!['pass','revise','unassessed'].includes(v.outcome)||typeof v.reason!=='string'||!v.reason.trim())invalid();
    if(v.outcome==='unassessed'){
      if(v.candidateParagraph!==null||v.referenceId!==null||v.referenceParagraph!==null||v.candidateQuote!==''||v.referenceQuote!=='')invalid();
      result[key]={...v};continue;
    }
    const reference=references.find(r=>r.id===v.referenceId);
    const cp=paragraphs[v.candidateParagraph],rp=voiceParagraphs(reference?.text)[v.referenceParagraph];
    if(!Number.isInteger(v.candidateParagraph)||!Number.isInteger(v.referenceParagraph)||!cp||!rp||!reference
      ||!eligibleIndices(reference.text).includes(v.referenceParagraph)||reference.text===candidate.body
      ||typeof v.candidateQuote!=='string'||!v.candidateQuote.trim()||!cp.includes(v.candidateQuote)
      ||typeof v.referenceQuote!=='string'||!v.referenceQuote.trim()||headingOnly(v.referenceQuote)||!rp.includes(v.referenceQuote)
      ||key==='ending'&&v.candidateParagraph!==paragraphs.length-1)invalid();
    result[key]={...v,candidateParagraphText:cp,referenceParagraphText:rp,referenceRole:reference.role};
  }
  return result;
}
export const horoscopeVoiceDecision=review=>Object.values(review).some(v=>v.outcome==='revise')?'revise'
  :Object.values(review).some(v=>v.outcome==='unassessed')?'unassessed':'no_cited_issue';
