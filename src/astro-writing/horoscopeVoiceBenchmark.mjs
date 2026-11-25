import {createHash} from 'node:crypto';
import {HOROSCOPE_VOICE_REVIEW} from './horoscopeVoiceStandard.mjs';
import {validateHoroscopeVoiceReview,horoscopeVoiceDecision,hasHoroscopeVoiceReview} from './horoscopeVoiceReview.mjs';

const digest=text=>createHash('sha256').update(text).digest('hex');
/** Offline tuning acceptance: replay recorded evidence against fixed owner
 * dispositions, never convert assistant taste, fact passes or missing reviews
 * into labels. No provider, training, prompt mutation or activation is possible. */
export function evaluateHoroscopeVoiceBenchmark({cases,labels,reviews=[]}) {
  if(!Array.isArray(cases)||!Array.isArray(labels)||!Array.isArray(reviews))throw new Error('invalid_voice_benchmark');
  const unique=items=>new Set(items.map(v=>v.id)).size===items.length;
  if(!cases.length||!unique(cases)||!unique(labels)||!unique(reviews)
    ||labels.length!==cases.length||labels.some(l=>!cases.some(c=>c.id===l.id))||reviews.some(r=>!cases.some(c=>c.id===r.id)))throw new Error('invalid_voice_benchmark');
  const results=cases.map(c=>{
    const label=labels.find(l=>l.id===c.id),record=reviews.find(r=>r.id===c.id);
    if(typeof c.candidate?.body!=='string'||!label||label.textSha256!==digest(c.candidate.body))throw new Error('voice_benchmark_identity_mismatch');
    if(!['rejected_in_the_recorded_scope','designated_voice_reference','unlabelled'].includes(label.label?.ownerDisposition))throw new Error('invalid_voice_benchmark_labels');
    const base={id:c.id,ownerDisposition:label.label.ownerDisposition,scope:label.provenance?.unit??label.provenance?.targetKeys??c.task?.scope??null};
    if(!record)return {...base,status:'missing'};
    if(record.candidateSha256!==label.textSha256||record.contract!==HOROSCOPE_VOICE_REVIEW||!hasHoroscopeVoiceReview(record.evidence))return {...base,status:'invalid'};
    try{
      const assessment=validateHoroscopeVoiceReview(record.voiceReview,c.candidate,record.evidence);
      return {...base,status:Object.values(assessment).some(v=>v.outcome==='unassessed')?'unassessed':horoscopeVoiceDecision(assessment),synthetic:record.synthetic===true};
    }catch{return {...base,status:'invalid'};}
  });
  const count=status=>results.filter(r=>r.status===status).length;
  const negatives=results.filter(r=>r.ownerDisposition==='rejected_in_the_recorded_scope');
  const references=results.filter(r=>r.ownerDisposition==='designated_voice_reference');
  const falseAcceptances=negatives.filter(r=>r.status==='no_cited_issue').length;
  // Designating a reference is not a new owner approval. Flag disagreement with
  // its voice role separately rather than inventing a positive owner verdict.
  const referenceFlags=references.filter(r=>r.status==='revise').length;
  const incomplete=count('missing')+count('invalid')+count('unassessed')>0;
  const synthetic=results.some(r=>r.synthetic);
  const consistent=!incomplete&&negatives.length>0&&references.length>0&&falseAcceptances===0&&referenceFlags===0;
  return {version:'horoscope-voice-benchmark/v1',cases:cases.length,ownerScopedNegatives:negatives.length,designatedReferences:references.length,
    ownerNegativesAssessed:negatives.filter(r=>['revise','no_cited_issue'].includes(r.status)).length,
    referencesAssessed:references.filter(r=>['revise','no_cited_issue'].includes(r.status)).length,
    unlabelled:results.filter(r=>r.ownerDisposition==='unlabelled').length,
    missing:count('missing'),invalid:count('invalid'),unassessed:count('unassessed'),falseAcceptances,referenceFlags,
    status:incomplete?'incomplete':consistent?'consistent_on_labelled_cases':'disagreement',
    tuningEligible:consistent&&!synthetic,synthetic,measuredVoiceAccuracy:null,
    automaticActivation:false,trainingUpdate:'none',newModelCalls:0,results};
}
