"use strict";

// Owner directions, 2026-10-06 and 2026-10-09. This module judges the function of rhetoric;
// it does not change astrology, owner evidence, or published reader copy.
const RHETORICAL_PATTERN_VERSION = "rhetorical-patterns/v2-2026-10-09";
const RHETORICAL_LABELS = Object.freeze(["CORRECTIO", "TRICOLON", "PURPLE_PROSE"]);
const RELATED_PROSE_LABELS = Object.freeze([
  "POLISHED_ASTROLOGY_PROSE", "ABSTRACT_MECHANISM", "GENERIC_ASTROLOGY",
  "GENERIC_ADVICE", "VAGUE_CAUSALITY", "KEYWORD_STACK", "STACCATO_AI_PROSE",
  "HOUSE_STYLE_PHRASE_REPETITION"
]);
const PROSE_PATTERN_LABELS = Object.freeze([...RHETORICAL_LABELS, ...RELATED_PROSE_LABELS]);
const AI_PATTERN_CONTEXT_POLICY = `AVOID AI WRITING PATTERNS — owner rule, 2026-10-09
Write with clarity, specificity and emotional precision. The reader should recognize an experience, not decipher the language describing it. Flag the pattern's function, not just an exact phrase.
ATMOSPHERIC AND EMOTIONAL FILLER: examine quiet + tension/resentment/confidence/knowing/power; subtle + shift/reminder/tension/undercurrent; gentle + reminder/invitation/nudge/unfolding; soft + power/resistance/landing or softening into; unspoken + expectations/tension/agreement; uncomfortable + truth/realization/awareness; deeper + truth/understanding/connection/knowing; inner + landscape/knowing/truth/compass; emotional weight or the weight of expectations/what remains unsaid. Name the behavior causing resentment, or the expectation and how it affects someone. These combinations warrant context review, not automatic rejection.
STOCK PSYCHOLOGICAL OR SPIRITUAL LANGUAGE: examine vague revelation (something shifting/stirring/changing/coming to the surface; what is ready to emerge; a deeper truth revealed), generic emotional instructions (hold/create space, give yourself permission, allow yourself to, it's okay to, honor your needs, lean into discomfort, allow yourself to receive, embrace the unknown), abstract movement (navigate this energy, move through this season, step into your power, find alignment), manufactured profundity (the truth is, here's the thing, at its core, what matters most), and spiritualized conclusions (trust the process, honor your journey). Identify the actual circumstance, behavior, decision or consequence; a stock expression contributes no insight by itself.
ASTROLOGICAL PERSONIFICATION: the Moon asks, Saturn reminds, Venus invites, Mercury encourages, or the cosmos wants must not replace interpretation. Explain how the astrology creates a recognizable experience. Personification can remain when it adds genuine narrative meaning and the passage actually interprets the astrology.
HARD FLAG — REWRITE: only a contextual semantic finding establishes a failure: stock spiritual/psychological language contributes no specific meaning; generic planetary personification replaces explanation; a decorative tricolon contains redundant elements; a rhetorical reversal manufactures emphasis without a necessary distinction; or an abstract metaphor obscures the subject. Use CORRECTIO for the reversal, TRICOLON for dispensable triples, and PURPLE_PROSE for atmosphere, stock language, personification or metaphor substituting for observation. Preserve overlapping GENERIC_ADVICE or GENERIC_ASTROLOGY findings when relevant; those related labels alone do not establish this hard flag.
REVIEW FLAG — CHECK CONTEXT: atmospheric adjectives, abstract terms (energy, truth, space, weight, shift, transformation), potentially useful figures of speech, three necessary items, and emotional descriptions that may be explained elsewhere in the passage require context. Never fail a passage solely because a word, phrase, negation or three-part construction appears. A quiet morning, quiet house or someone becoming quiet during an argument can convey literal information. A quiet resentment or unspoken expectation can be explained by the surrounding behavior. Useful imagery, personification and emotionally precise abstraction can remain.
REVISION STANDARD: establish the situation (what is happening), behavior (what someone does, avoids, expects or decides), consequence (what it costs or changes), and insight (what the reader can now recognize). Do not force all four into every sentence, append an explanation after an example that already makes the point, or invent errands, appointments or other scenes merely to look concrete. Preserve natural rhythm, emotional complexity and the writer's individual voice. Do not substitute flat clinical explanations or repetitive sentence formulas for poetic clichés. Specificity creates emotional depth. Decorative language cannot substitute for it.`;

const RHETORICAL_WRITER_POLICY = `SHARED RHETORICAL POLICY ${RHETORICAL_PATTERN_VERSION}
Meaning determines the sentence. Do not add automatic rhetorical polish.
CORRECTIO: do not state a thought and theatrically revise it to manufacture depth (or rather; or more accurately; not X, exactly, but Y; this isn't about X, it's about Y). Necessary factual precision and an earned contrast remain available. A negation-pivot allowance never licenses performative self-correction.
TRICOLON: let meaning determine the number of examples or clauses. Do not pad a thought into three parallel nouns, phrases, symbolic images or commands for cadence. One sufficient example, a useful pair and three genuinely necessary factual categories are all available. Older example-count or strategy-slot guidance is not a requirement to construct rhetorical triples.
PURPLE_PROSE: prefer observable behavior or consequence to decorative abstraction. Use the plain-language replacement test: would an ordinary account retain all important meaning? Keep imagery when it makes the mechanism or consequence easier to understand and fits the selected owner voice.
${AI_PATTERN_CONTEXT_POLICY}
These are not bans on not, but, commas, factual lists, metaphor, rhythm, force, humor or anger. Read the complete passage. Preserve owner-authored and approved source text unchanged; its presence is neither a compulsory rhetorical template nor permission to imitate an unearned device.`;

const RHETORICAL_JUDGE_POLICY = `SHARED SEMANTIC RHETORICAL REVIEW ${RHETORICAL_PATTERN_VERSION}
Read the complete reader-facing passage, including its headline and conclusion, before classifying any span. Judge rhetoric's work in context, not an isolated sentence or punctuation count. Do not sanitize earned force, rhythm, humor, anger or imagery.
CORRECTIO: fail only performative self-correction. Does the second formulation add necessary factual precision or a consequential distinction, or merely make the first sound deeper? "Not in defeat, but in strategy" and other meaningful contrasts are not automatic failures. Never fail merely because not or but appears.
TRICOLON: fail a three-part construction when parallelism materially substitutes cadence for meaning, an item can be removed without material loss, the third item mainly completes a rhythm, repeated triples create an AI cadence, natal meaning becomes three decorative symbols, or advice becomes three polished commands. Explain which item is dispensable and why in the complete passage. Three required factual categories are not a failure. Two examples are not a tricolon.
PURPLE_PROSE: fail decorative abstraction, metaphor, symbolic phrasing, lyrical parallelism or an unsupported dramatic headline when it makes a thought sound profound without clarifying what happened. Perform the plain-language replacement test privately; report the ordinary behavior/consequence and what important meaning would be lost, if any. Do not return rewritten reader copy. Functional owner-consistent imagery may remain.
${AI_PATTERN_CONTEXT_POLICY}
Use separate labels CORRECTIO, TRICOLON and PURPLE_PROSE. Keep useful overlapping diagnoses, including POLISHED_ASTROLOGY_PROSE, ABSTRACT_MECHANISM, GENERIC_ASTROLOGY, GENERIC_ADVICE, VAGUE_CAUSALITY, KEYWORD_STACK, STACCATO_AI_PROSE and HOUSE_STYLE_PHRASE_REPETITION. Never collapse the three specific labels into a generic polish label.
Only material semantic failures block generation admission. A lexical signal is not a verdict. Each failure must identify exact reader wording, its complete containing paragraph, the rhetorical operation, its material reader consequence and the context-sensitive precision/removal/plain-language test. For a stock phrase or personification, identify the information it substitutes for and explain why the surrounding paragraph does not supply that meaning. A REVIEW FLAG is not a failed check; record the contextual reason in the check and return pass when the language carries meaning. Missing evidence is indeterminate, not PASS. These findings never change source meaning, revoke owner-source approval or authorize publication.`;

const object = properties => ({type:"object",additionalProperties:false,required:Object.keys(properties),properties});
// Nonempty evidence is enforced by validateRhetoricalReview for every provider.
const string = {type:"string"};
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
// Triage only. Match phrase families, never individual atmospheric words.
// Missing signals do not establish a semantic pass; these cannot block admission.
const REVIEW_PATTERNS = [
  ['CORRECTIO','rhetorical_reversal', /\b(?:or rather|or more accurately|more precisely|better yet|this (?:isn['’]t|is not) (?:really )?about|not because)\b/giu],
  ['PURPLE_PROSE','atmospheric_filler', /\b(?:quiet (?:tension|resentment|frustration|confidence|knowing|power)|subtle (?:shift|reminder|tension|undercurrent)|gentle (?:reminder|invitation|nudge|unfolding)|soft (?:power|resistance|landing)|softening into|unspoken (?:expectations?|tension|agreement)|uncomfortable (?:truth|realization|awareness)|deeper (?:truth|understanding|connection|knowing)|inner (?:landscape|knowing|truth|compass)|emotional weight|(?:the )?weight of (?:expectations|what remains unsaid))\b/giu],
  ['PURPLE_PROSE','vague_revelation', /\b(?:something (?:is )?(?:shifts?|shifting|stirs?|stirring|changes?|changing|coming to the surface|asking for attention)|what is (?:ready to emerge|coming to the surface|being revealed)|a deeper truth (?:is )?(?:being )?revealed)\b/giu],
  ['PURPLE_PROSE','stock_instruction', /\b(?:hold(?:ing)? space|creat(?:e|ing) space|make space for what emerges|giv(?:e|ing) yourself permission|allow(?:ing)? yourself to|it['’]s okay to|honor(?:ing)? your (?:needs|journey)|lean(?:ing)? into discomfort|embrac(?:e|ing) the unknown|navigat(?:e|ing) (?:this|the) energy|mov(?:e|ing) through this season|step(?:ping)? into your power|find(?:ing)? (?:your )?alignment|trust(?:ing)? the process)\b/giu],
  ['PURPLE_PROSE','manufactured_profundity', /\b(?:the truth is|here['’]s the thing|at its core|what matters most)\b/giu],
  ['PURPLE_PROSE','astrology_personification', /\b(?:(?:the )?(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)|the cosmos) (?:asks?|reminds?|invites?|encourages?|wants?)\b/giu]
];
function rhetoricalSignals(candidate) {
  const signals=[];
  for(const [field,text] of Object.entries(textFields(candidate))) {
    for(const [label,pattern,expression] of REVIEW_PATTERNS) {
      for(const match of text.matchAll(expression))
        signals.push({label,pattern,field,quote:match[0],offset:match.index,severity:'review',advisory:true,requiresSemanticReview:true});
    }
  }
  return signals;
}
module.exports={RHETORICAL_PATTERN_VERSION,RHETORICAL_LABELS,RELATED_PROSE_LABELS,PROSE_PATTERN_LABELS,
  RHETORICAL_WRITER_POLICY,RHETORICAL_JUDGE_POLICY,RHETORICAL_REVIEW_SCHEMA,
  textFields,validateRhetoricalReview,rhetoricalDecision,rhetoricalReviewContract,rhetoricalSignals};
