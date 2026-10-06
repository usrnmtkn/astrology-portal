"use strict";

// Owner direction, 2026-10-06. This module judges the function of rhetoric;
// it does not change astrology, owner evidence, or published reader copy.
const RHETORICAL_PATTERN_VERSION = "rhetorical-patterns/v1-2026-10-06";
const RHETORICAL_LABELS = Object.freeze(["CORRECTIO", "TRICOLON", "PURPLE_PROSE"]);
const RELATED_PROSE_LABELS = Object.freeze([
  "POLISHED_ASTROLOGY_PROSE", "ABSTRACT_MECHANISM", "GENERIC_ASTROLOGY",
  "GENERIC_ADVICE", "VAGUE_CAUSALITY", "KEYWORD_STACK", "STACCATO_AI_PROSE",
  "HOUSE_STYLE_PHRASE_REPETITION"
]);
const PROSE_PATTERN_LABELS = Object.freeze([...RHETORICAL_LABELS, ...RELATED_PROSE_LABELS]);
const RHETORICAL_WRITER_POLICY = `SHARED RHETORICAL POLICY ${RHETORICAL_PATTERN_VERSION}
Meaning determines the sentence. Do not add automatic rhetorical polish.
CORRECTIO: do not state a thought and theatrically revise it to manufacture depth (or rather; or more accurately; not X, exactly, but Y; this isn't about X, it's about Y). Necessary factual precision and an earned contrast remain available. A negation-pivot allowance never licenses performative self-correction.
TRICOLON: let meaning determine the number of examples or clauses. Do not pad a thought into three parallel nouns, phrases, symbolic images or commands for cadence. One sufficient example, a useful pair and three genuinely necessary factual categories are all available. Older example-count or strategy-slot guidance is not a requirement to construct rhetorical triples.
PURPLE_PROSE: prefer observable behavior or consequence to decorative abstraction. Use the plain-language replacement test: would an ordinary account retain all important meaning? Keep imagery when it makes the mechanism or consequence easier to understand and fits the selected owner voice.
These are not bans on not, but, commas, factual lists, metaphor, rhythm, force, humor or anger. Read the complete passage. Preserve owner-authored and approved source text unchanged; its presence is neither a compulsory rhetorical template nor permission to imitate an unearned device.`;

const RHETORICAL_JUDGE_POLICY = `SHARED SEMANTIC RHETORICAL REVIEW ${RHETORICAL_PATTERN_VERSION}
Read the complete reader-facing passage, including its headline and conclusion, before classifying any span. Judge rhetoric's work in context, not an isolated sentence or punctuation count. Do not sanitize earned force, rhythm, humor, anger or imagery.
CORRECTIO: fail only performative self-correction. Does the second formulation add necessary factual precision or a consequential distinction, or merely make the first sound deeper? "Not in defeat, but in strategy" and other meaningful contrasts are not automatic failures. Never fail merely because not or but appears.
TRICOLON: fail a three-part construction when parallelism materially substitutes cadence for meaning, an item can be removed without material loss, the third item mainly completes a rhythm, repeated triples create an AI cadence, natal meaning becomes three decorative symbols, or advice becomes three polished commands. Explain which item is dispensable and why in the complete passage. Three required factual categories are not a failure. Two examples are not a tricolon.
PURPLE_PROSE: fail decorative abstraction, metaphor, symbolic phrasing, lyrical parallelism or an unsupported dramatic headline when it makes a thought sound profound without clarifying what happened. Perform the plain-language replacement test privately; report the ordinary behavior/consequence and what important meaning would be lost, if any. Do not return rewritten reader copy. Functional owner-consistent imagery may remain.
Use separate labels CORRECTIO, TRICOLON and PURPLE_PROSE. Keep useful overlapping diagnoses, including POLISHED_ASTROLOGY_PROSE, ABSTRACT_MECHANISM, GENERIC_ASTROLOGY, GENERIC_ADVICE, VAGUE_CAUSALITY, KEYWORD_STACK, STACCATO_AI_PROSE and HOUSE_STYLE_PHRASE_REPETITION. Never collapse the three specific labels into a generic polish label.
Only material semantic failures block generation admission. A lexical signal is not a verdict. Each failure must identify exact reader wording, its complete containing paragraph, the rhetorical operation, its material reader consequence and the context-sensitive precision/removal/plain-language test. Missing evidence is indeterminate, not PASS. These findings never change source meaning, revoke owner-source approval or authorize publication.`;

const object = properties => ({type:"object",additionalProperties:false,required:Object.keys(properties),properties});
const string = {type:"string",minLength:1};
const RHETORICAL_REVIEW_SCHEMA = object({
  checks: {type:"array",items:object({label:{type:"string",enum:[...RHETORICAL_LABELS]},outcome:{type:"string",enum:["pass","fail","indeterminate"]},reason:string})},
  findings: {type:"array",items:object({label:{type:"string",enum:[...PROSE_PATTERN_LABELS]},field:string,quote:string,paragraph:string,reason:string,readerConsequence:string,meaningTest:string})}
});

function textFields(value,path="") {
  if(typeof value==="string")return {[path || "body"]:value};
  if(!value || typeof value!=="object")return {};
  return Object.assign({},...Object.entries(value).map(([key,item])=>textFields(item,path?`${path}.${key}`:key)));
}
function validateRhetoricalReview(review,candidate) {
  const fail=reason=>{throw new Error(`invalid_rhetorical_review:${reason}`);};
  const keys=(value,expected)=>value && Object.keys(value).sort().join('|')===[...expected].sort().join('|');
  if(!keys(review,['checks','findings'])||!Array.isArray(review.checks)||!Array.isArray(review.findings))fail('shape');
  const seen=new Set(),fields=textFields(candidate);
  for(const check of review.checks){
    if(!keys(check,['label','outcome','reason'])||!RHETORICAL_LABELS.includes(check.label)||seen.has(check.label)
      ||!['pass','fail','indeterminate'].includes(check.outcome)||typeof check.reason!=='string'||!check.reason.trim())fail('checks');
    seen.add(check.label);
  }
  if(seen.size!==RHETORICAL_LABELS.length)fail('incomplete_checks');
  for(const f of review.findings){
    if(!keys(f,['label','field','quote','paragraph','reason','readerConsequence','meaningTest'])||!PROSE_PATTERN_LABELS.includes(f.label)
      ||Object.values(f).some(v=>typeof v!=='string'||!v.trim())||!fields[f.field]
      ||!fields[f.field].split(/\n\s*\n/u).includes(f.paragraph)||!f.paragraph.includes(f.quote))fail('unsupported_finding');
    if(RHETORICAL_LABELS.includes(f.label)&&review.checks.find(c=>c.label===f.label).outcome!=='fail')fail('finding_check_conflict');
  }
  if(review.checks.some(c=>c.outcome==='fail'&&!review.findings.some(f=>f.label===c.label)))fail('failure_without_evidence');
  return review;
}
function rhetoricalDecision(review) {
  if(review.checks.some(c=>c.outcome==='indeterminate'))return 'evaluation_unavailable';
  return review.findings.some(f=>RHETORICAL_LABELS.includes(f.label))?'regenerate':'pass';
}
function rhetoricalReviewContract(candidate) {
  return `${RHETORICAL_JUDGE_POLICY}\nReturn a separate rhetoric object using this exact schema, alongside the existing review fields: ${JSON.stringify(RHETORICAL_REVIEW_SCHEMA)}\nField paths are relative to the following complete candidate, never prefixed with candidate or draft. Preserve exact paragraphs and whitespace.\nCOMPLETE RHETORICAL REVIEW CANDIDATE\n${JSON.stringify(candidate)}`;
}
// Triage only. A lack of signals is not a semantic pass. No list/comma counter.
function rhetoricalSignals(candidate) {
  const signals=[];
  for(const [field,text] of Object.entries(textFields(candidate))) {
    for(const match of text.matchAll(/\b(?:or rather|or more accurately|more precisely|better yet)\b/giu))
      signals.push({label:'CORRECTIO',field,quote:match[0],offset:match.index,advisory:true,requiresSemanticReview:true});
  }
  return signals;
}
module.exports={RHETORICAL_PATTERN_VERSION,RHETORICAL_LABELS,RELATED_PROSE_LABELS,PROSE_PATTERN_LABELS,
  RHETORICAL_WRITER_POLICY,RHETORICAL_JUDGE_POLICY,RHETORICAL_REVIEW_SCHEMA,
  textFields,validateRhetoricalReview,rhetoricalDecision,rhetoricalReviewContract,rhetoricalSignals};
