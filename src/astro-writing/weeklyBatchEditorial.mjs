import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';

export const WEEKLY_BATCH_EDITORIAL='weekly-batch-editorial/v1';
export const weeklyEditorialHash=value=>createHash('sha256').update(horoscopeCanonicalJson(value)).digest('hex');
export const weeklyEditorialBinding=row=>weeklyEditorialHash({facts:row.facts?.horoscopeBrief,
  profile:row.source_snapshot?.studioWritingProfile,outlines:row.source_snapshot?.horoscopeOutlines??{},
  writerChoice:row.source_snapshot?.horoscopeWriterChoice??'current'});
export const weeklyEditorialContent=row=>weeklyEditorialHash({binding:weeklyEditorialBinding(row),edition:row.sections.horoscopeEdition,
  sharedPlan:row.source_snapshot?.horoscopeGeneration?.weeklyEditorial?.plan?.requestHash??null});
export const weeklyEditorialComplete=row=>row.sections.horoscopeEdition.passages.length===12
  &&row.sections.horoscopeEdition.passages.every(p=>p.headline.trim()&&p.body.trim());
export const weeklyPlanCurrent=(gate,scopeHash)=>gate?.version===WEEKLY_BATCH_EDITORIAL
  &&gate.plan?.status==='passed'&&gate.plan.scopeHash===scopeHash;
export const weeklyReviewCurrent=row=>row.source_snapshot?.horoscopeGeneration?.weeklyEditorial?.review?.status==='passed'
  &&row.source_snapshot.horoscopeGeneration.weeklyEditorial.review.contentHash===weeklyEditorialContent(row);
export function weeklyEditorialIssue(row){
  const gate=row.source_snapshot?.horoscopeGeneration?.weeklyEditorial;
  if(row.sections?.horoscopeEdition?.window?.period!=='weekly'||gate?.version!==WEEKLY_BATCH_EDITORIAL)return null;
  if(gate.pending)return 'Finish the saved Weekly batch check before publishing.';
  if(weeklyReviewCurrent(row))return null;
  return gate.review?.status==='failed'&&gate.review.contentHash===weeklyEditorialContent(row)
    ?'The Weekly batch repeats interpretations, phrases or endings, or has other editorial findings. Edit the saved readings and review all twelve again.'
    :'Review the complete current Weekly batch before publishing. A changed reading or instruction invalidates its previous batch check.';
}
const string={type:'string'};
const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const checks=names=>object(Object.fromEntries(names.map(name=>[name,{type:'string',enum:['pass','fail']}])));
export const WEEKLY_PLAN_CHECKS=['distinct_concerns','house_grounding','unsupported_history'];
export const WEEKLY_REVIEW_CHECKS=['interpretations','phrases','endings','house_grounding','unsupported_history','technical_filler'];
const quote=object({sign:{type:'string',enum:HOROSCOPE_SIGNS},quote:string});
const finding=names=>object({category:{type:'string',enum:names},evidence:{type:'array',items:quote,minItems:1},reason:string});
export const WEEKLY_PLAN_SCHEMA=object({concerns:{type:'array',minItems:12,maxItems:12,items:object({
  sign:{type:'string',enum:HOROSCOPE_SIGNS},eventIds:{type:'array',items:string,minItems:1},
  coreConcern:string,humanSituation:string,stakes:string,distinctiveObservation:string})},
  checks:checks(WEEKLY_PLAN_CHECKS),findings:{type:'array',items:finding(WEEKLY_PLAN_CHECKS)}});
export const WEEKLY_BATCH_REVIEW_SCHEMA=object({checks:checks(WEEKLY_REVIEW_CHECKS),findings:{type:'array',items:finding(WEEKLY_REVIEW_CHECKS)}});

export const WEEKLY_PLAN_INSTRUCTIONS=`WEEKLY BATCH PLANNING AUTHORITY
Plan twelve distinct concerns together before any new sign is drafted. Current scoped owner corrections, the complete saved Weekly profile and its complete examples govern. Examples supply voice, never current facts or stories to recycle. Calculated events and their own house activations supply meaning.
For every sign select the event(s) that matter, a possible human situation, the specific choice, relationship or consequence at stake, and an observation another sign cannot borrow unchanged. Use only that sign's supplied event or reference IDs. Keep unknown biography, motives and history conditional. Supportive contacts need no invented problem or remedy.
Compare all twelve concerns. Rephrasing be honest, speak up, reconsider an agreement, rest, or revisit the past does not differentiate their interpretations. Explain different supported mechanisms, stakes and choices. Avoid making all signs about unpaid work, money, unequal responsibility or keeping the peace. Different house numbers and props alone are insufficient. Revise your internal outline before returning if concerns collapse to one lesson.
Existing readings are immutable context for this operation. Plan around their actual concerns; do not rewrite them. If they prevent a distinct set, return failed checks and exact evidence rather than claiming success. Quote plan text (or existing reader text) to support findings. Repeated necessary astrology terminology is not a prose-pattern defect. Each failed check needs a finding; each finding must match a failed check. Return all twelve concerns and every check. These are private meaning decisions, not reader sentences, prose approval or permission to publish.`;
export const WEEKLY_BATCH_REVIEW_INSTRUCTIONS=`WEEKLY BATCH REVIEW AUTHORITY
Read all twelve complete current Weekly readings together, alongside the complete saved Weekly rules, complete owner examples, shared concerns and governed house-specific facts. Judge the actual writing, never merely the presence of varied sign names, house numbers or synonyms.
Check repeated interpretations: the same psychological issue, mechanism or lesson across signs, especially a lesson swappable between three or more signs. Check repeated signature phrases, explanatory sentences and rhetorical scripts. Check predictable or interchangeable endings and advice. Check house-specific stakes, unsupported definitive biography or motives, and technical filler that explains aspects instead of a relevant consequence. An arbitrary lived-in prop does not differentiate an interpretation.
Necessary repeated planet names, dates, aspects and house vocabulary may remain. Lexical signals are leads only; decide their function in the complete paragraphs. Meaningful contrasts, useful imagery, humor and factual lists may remain. Sources retain their wording and approval roles; never police historical examples as newly generated copy.
Report exact quotes from the affected current readings, identify their signs, and explain the repeated meaning or reader consequence. For endings, quote the final sentence(s) or final clause through its final punctuation. Repetition findings require at least two distinct signs. Unsupported-history or grounding findings may affect one sign. A failed check needs a supported finding; a finding cannot accompany a passing check. Check every category. Do not rewrite any passage, invent replacement copy, approve wording or authorize publication. A successful review means this bounded comparison found no supported material issue; the owner still reviews exact prose.`;

export function weeklyEditorialInput(prepared,row,phase){
  return {stage:phase,window:prepared.edition.window,profile:prepared.writingProfile.profile,
    currentCorrections:prepared.explicitFeedbackMarker??'',correctionReceipt:prepared.feedbackReceipt??null,sourceHash:prepared.sourceHash,
    facts:prepared.entries.map(e=>({sign:e.sign,developments:e.developments})),
    existingReadings:row.sections.horoscopeEdition.passages,
    sharedConcerns:row.source_snapshot?.horoscopeGeneration?.weeklyEditorial?.plan?.concerns??[],
    priorFindings:(row.source_snapshot?.horoscopeGeneration?.weeklyEditorialHistory??[]).slice(-2).map(h=>h.result?.findings??[])};
}
const nonempty=value=>typeof value==='string'&&value.trim()&&value.length<=5000;
const normalized=text=>text.toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export function validateWeeklyEditorialResult(value,{phase,input}){
  const names=phase==='planning'?WEEKLY_PLAN_CHECKS:WEEKLY_REVIEW_CHECKS;
  if(!value||Object.keys(value).sort().join()!==(phase==='planning'?['checks','concerns','findings']:['checks','findings']).sort().join()
    ||!value.checks||Object.keys(value.checks).sort().join()!==[...names].sort().join()
    ||names.some(name=>!['pass','fail'].includes(value.checks[name]))||!Array.isArray(value.findings)||value.findings.length>60)throw Error('Incomplete Weekly batch check.');
  let concerns=[];
  if(phase==='planning'){
    concerns=value.concerns;
    if(!Array.isArray(concerns)||concerns.length!==12||new Set(concerns.map(c=>c.sign)).size!==12)throw Error('Plan all twelve signs exactly once.');
    for(const concern of concerns){
      const facts=input.facts.find(f=>f.sign===concern.sign);
      const ids=new Set([...(facts?.developments.events??[]),...(facts?.developments.background??[])].map(e=>e.id));
      if(!facts||Object.keys(concern).sort().join()!==['sign','eventIds','coreConcern','humanSituation','stakes','distinctiveObservation'].sort().join()
        ||!Array.isArray(concern.eventIds)||!concern.eventIds.length||concern.eventIds.some(id=>!ids.has(id))
        ||['coreConcern','humanSituation','stakes','distinctiveObservation'].some(key=>!nonempty(concern[key])))throw Error('A Weekly concern is incomplete or uses unsupported facts.');
    }
    if(new Set(concerns.map(c=>normalized(c.coreConcern))).size!==12||new Set(concerns.map(c=>normalized(c.distinctiveObservation))).size!==12)throw Error('The twelve concerns or observations repeat.');
  }
  for(const f of value.findings){
    if(!names.includes(f.category)||value.checks[f.category]!=='fail'||!nonempty(f.reason)||!Array.isArray(f.evidence)||!f.evidence.length)throw Error('A batch finding needs a failed check and evidence.');
    const signs=new Set();
    for(const e of f.evidence){
      const reading=input.existingReadings.find(p=>p.sign===e.sign),concern=concerns.find(c=>c.sign===e.sign);
      const texts=[reading?.headline,reading?.body,...(concern?['coreConcern','humanSituation','stakes','distinctiveObservation'].map(key=>concern[key]):[])].filter(Boolean);
      if(!HOROSCOPE_SIGNS.includes(e.sign)||!nonempty(e.quote)||!texts.some(text=>text.includes(e.quote)))throw Error('A batch finding quotes text that was not supplied.');
      if(f.category==='endings'&&!reading?.body.trimEnd().endsWith(e.quote.trimEnd()))throw Error('An ending finding must quote the actual ending.');
      signs.add(e.sign);
    }
    if(['distinct_concerns','interpretations','phrases','endings'].includes(f.category)&&signs.size<2)throw Error('A repetition finding must compare at least two signs.');
  }
  if(names.some(name=>value.checks[name]==='fail'&&!value.findings.some(f=>f.category===name)))throw Error('A failed batch check is missing its evidence.');
  return {...value,status:names.every(name=>value.checks[name]==='pass')?'passed':'failed'};
}

export function weeklyLexicalSignals(passages){
  const sentences=new Map(),endings=new Map();
  for(const p of passages){
    const parts=p.body.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)??[];
    for(const text of parts){const key=normalized(text);if(key.split(' ').length>=6){const signs=sentences.get(key)??new Set();signs.add(p.sign);sentences.set(key,signs);}}
    const ending=normalized(parts.at(-1)??'');if(ending){const signs=endings.get(ending)??new Set();signs.add(p.sign);endings.set(ending,signs);}
  }
  return {use:'Triage only. Necessary astrological repetition is not a material finding.',
    sentences:[...sentences].filter(([,s])=>s.size>1).map(([text,signs])=>({text,signs:[...signs]})),
    endings:[...endings].filter(([,s])=>s.size>1).map(([text,signs])=>({text,signs:[...signs]}))};
}
