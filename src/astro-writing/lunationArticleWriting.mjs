import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildMeaningPlan} from './buildMeaningPlan.mjs';
import {buildArgumentOutline,approveArgumentOutline} from './argumentGate.mjs';
import {ownerApprovedMatrixRoleEvidenceForTarget} from './ownerPositiveEvidence.mjs';
import {withoutOwnerRejectedEvidence} from './ownerEvidenceRejections.mjs';
import {sceneEvidenceForTarget} from './sceneEvidence.mjs';
import {matrixSceneNounLexicon} from './matrixEvidenceIndex.mjs';
import {retrieveOwnerContext} from './retrieveOwnerContext.mjs';
import {assertPositiveOwnerEvidenceContext} from './ownerEvidencePolicy.mjs';
import {loadPhraseEvidenceIndex} from './phraseEvidence.mjs';
import {runWritingPipeline} from './runWritingPipeline.mjs';
import {LUNATION_ARTICLE_PROTOCOL_VERSION,lunationArticleGuidance,lunationArticleOpeningDate} from './lunationArticleInput.mjs';
import {LUNATION_EDITORIAL_AUTHORITY} from './lunationEditorialConstraints.mjs';
import {LUNAR_SAVED_WRITING_GUIDANCE} from './lunationSavedWriting.mjs';

// Storage may reorder any JSON object. Arrays and exact source text retain order.
export const lunationArticleHash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)).digest('hex');
const root=fileURLToPath(new URL('../../',import.meta.url));
const family='lunation-article';
const target={surface:family,route:'calendar',renderer:'LunationWritingStudio',contentKeyFamily:'studio-lunation',temporality:'current_sky',voiceMode:'second_person'};

/** No provider or storage mutation. Complete source hashes bind the owner's plan action. */
export function prepareLunationArticle(facts,direction='',{writingProfile=null,privateCorrections=[],feedbackReceipt=[],savedWriting=null}={}) {
  if(facts?.schema!=='lunation-article-facts/v1'||facts.provenance?.actualEphemeris!=='swiss'
    ||!['new-moon','full-moon'].includes(facts.event?.phase)||!facts.event?.startsAt
    ||!Array.isArray(facts.positions)||!Array.isArray(facts.rulers)) throw new Error('Verified lunation facts are required.');
  const sign=facts.event.sign.toLowerCase(),phase=facts.event.phase;
  const openingDate=lunationArticleOpeningDate(facts.event);
  const sources=[];
  const read=name=>{const text=fs.readFileSync(root+name,'utf8');sources.push({path:name,sha256:lunationArticleHash(text)});return text;};
  const lines=name=>read(name).split(/\r?\n/u).filter(Boolean).map(JSON.parse);
  const corrections=[...lines('data/writing/owner-corrections.jsonl'),...lines('data/writing/owner-feedback-corpus.jsonl'),...privateCorrections];
  const voice=JSON.parse(read('packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json'));
  const examples=withoutOwnerRejectedEvidence(voice.entries,corrections).filter(e=>e.surface==='sky-lunation'
    &&e.authorityClass==='owner_authored_final'&&e.ownerApproved===true&&e.ownerAuthored===true&&e.useAsPositiveVoiceEvidence===true
    &&e.structuralFunction==='article paragraph'&&e.text?.trim())
    .map(e=>({...e,id:e.sourceId,contentKey:e.sourceId,family:e.surface,register:/\b(?:you|your)\b/iu.test(e.text)?'second_person':'collective'}));
  const gold=examples.find(e=>e.sign===sign&&e.sourceId.includes(phase))??examples.find(e=>e.sourceId.includes(phase));
  if(!gold)throw new Error('Eligible owner lunation writing is unavailable.');
  const doctrinePath='tldr-astro-phrasebank/phrasebank/cc-moon-reviewed.json';
  const doctrine=JSON.parse(read(doctrinePath)).reviewed;
  const phaseMeaning=doctrine.find(e=>e.kind==='moon_phase'&&e.phase===phase&&e.status==='REVIEWED_CLAUSE');
  const signMeaning=doctrine.find(e=>e.kind==='moon_sign'&&e.sign===sign&&e.status==='REVIEWED_CLAUSE');
  if(!phaseMeaning||!signMeaning)throw new Error('Reviewed lunar meaning is unavailable.');
  const signPath='tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json';
  const placements=JSON.parse(read(signPath)).reviewed;
  const meaningfulBodies=new Set(['sun','moon',...facts.rulers.map(r=>r.planet.toLowerCase())]);
  const eventMeaning=facts.positions.filter(p=>meaningfulBodies.has(p.planet.toLowerCase())).map(p=>{
    const meaning=placements.find(e=>e.body===p.planet.toLowerCase()&&e.sign===p.sign.toLowerCase()&&e.status==='REVIEWED_CLAUSE');
    if(!meaning)throw new Error(`Reviewed meaning is unavailable for ${p.planet} in ${p.sign}.`);
    return {planet:p.planet,sign:p.sign,meaning:meaning.collective_shift,sourcePath:signPath,id:meaning.id};
  });
  const meaningInput={contentType:family,object:'moon',sign,eventType:phase,calculatedFactsHash:lunationArticleHash(facts),
    objectFunction:phaseMeaning.slots.cycle_role,signMechanics:signMeaning.slots.embodied_guidance,
    coreTension:signMeaning.slots.care_prompt,likelyObservableBehaviors:[phaseMeaning.slots.phase_action,signMeaning.slots.embodied_guidance],
    likelyConsequences:[signMeaning.slots.care_prompt],DO_NOT_ASSUME:['a remembered intention or previous ritual','a partner, personal house or known biography','guaranteed outcomes','historical transits from source articles']};
  const plan=buildMeaningPlan(meaningInput);
  const matrix=withoutOwnerRejectedEvidence(lines('data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl'),corrections,'copy');
  const approved=withoutOwnerRejectedEvidence(lines('data/writing/OWNER_APPROVED_EXAMPLES.jsonl'),corrections);
  const evidence=ownerApprovedMatrixRoleEvidenceForTarget(matrix,{planet:'moon',sign,eventType:phase,surface:family});
  const scenes=sceneEvidenceForTarget({approvedExamples:approved,matrixEvidenceRows:matrix,registerExamples:examples,sceneNounLexicon:matrixSceneNounLexicon(matrix),plan});
  const phrasePath='data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl';read(phrasePath);
  const relevant=examples.filter(e=>e.sign===sign);
  const contextOptions={examples,matrixExamples:evidence.meaning,matrixArgumentCandidates:evidence.argument_candidate,
    matrixEvidenceAvailableCount:evidence.meaning.length,relevantOwnerPassagesAvailableCount:relevant.length,
    ownerPassageRelevanceTier:relevant.length?'same-sign':'same-family',sceneExamples:scenes.selected,
    samePlanetSignSceneAvailableCount:scenes.counts.samePlanetSignSceneAvailable,sceneEvidenceInventoryCounts:scenes.counts,
    registerGoldExamples:[{...gold,id:'register-gold:lunation-article',evidenceRole:'register_gold'}],corrections,phraseEvidence:loadPhraseEvidenceIndex(root+phrasePath),
    preferredEvidenceContentKeys:examples.filter(e=>e.sourceId.includes(phase)).map(e=>e.contentKey),
    reviewedMeaningExamples:[phaseMeaning,signMeaning].map(e=>({id:e.id,planet:'moon',sign,status:e.status,text:Object.values(e.slots).join('\n'),
      sourcePath:doctrinePath,sourceKind:'reviewed-doctrine',ownerAuthored:false,ownerApproved:false,reviewNote:e.review_note}))};
  const argumentInput={thesis:direction.trim().replace(/\s+/gu,' ')||`Develop ${facts.event.title} from the ${phase==='full-moon'?'Sun–Moon opposition':'Sun–Moon conjunction'} and its calculated rulers.`,
    transit_job:`Open the body with ${openingDate} and ${facts.event.title}, then explain the phase and signs before developing human implications. Use the supplied event-time astrology: ${eventMeaning.map(e=>`${e.planet} in ${e.sign}`).join('; ')}.`,
    recognition:savedWriting?.references.length?`Draw on the language and ideas in your saved writing: ${savedWriting.references.map(r=>r.title).join('; ')}. Develop elements that fit this event; preserve the complete originals as references.`:`Choose a meaningful possibility from the event's relationships. Sign context: ${signMeaning.slots.embodied_guidance}. This supplies meaning, not a compulsory opening scene.`,
    complication:`Use the calculated ruler condition and relevant contacts to develop the interpretation beyond the saved reference. Do not force one stock lesson or invent another person's hidden motive.`,
    response:`Let the response follow the developed interpretation. Phase context: ${phaseMeaning.slots.phase_action}. Do not copy this source instruction into a stock ending or require a sequence of commands; allow mixed feelings and an unresolved outcome.`,
    scope_guard:`One collective article for ${facts.event.startsAt}; no personal houses, invented history, or unsupplied future timing.`,
    scope_breadth:{broad_mechanism:phaseMeaning.slots.cycle_role,chosen_expression:`${phase} in ${sign}, interpreted through the full event chart`,
      other_valid_expressions:['A change in what someone wants to begin or continue','A choice about participation supported by the event meanings','Recognition of a competing need supported by the Sun–Moon relationship']}};
  const outline=buildArgumentOutline(argumentInput,{plan,family,surface:family});
  const context=retrieveOwnerContext(plan,{...contextOptions,contentFamily:family,register:'second_person'});
  try{assertPositiveOwnerEvidenceContext(context,{family});}catch(error){if(error.code!=='OWNER_EVIDENCE_ROLE_MISSING'||error.detail?.role!=='argument')throw error;}
  const voiceSelection=context.sameFamilyExamples.map(e=>({id:e.id,sha256:lunationArticleHash(e.text)}));
  const planHash=lunationArticleHash({version:LUNATION_ARTICLE_PROTOCOL_VERSION,protocol:lunationArticleGuidance,savedWritingGuidance:LUNAR_SAVED_WRITING_GUIDANCE,savedWriting,editorialAuthority:LUNATION_EDITORIAL_AUTHORITY,facts,outline,sources,voiceSelection,writingProfile,feedbackReceipt});
  return {writingProfile,feedbackReceipt,savedWriting,facts,eventMeaning,meaningInput,argumentInput,outline,contextOptions,context,sources,planHash,direction,
    preview:{planHash,title:facts.event.title,event:facts.event,positions:facts.positions,rulers:facts.rulers,contacts:facts.contacts,
      argument:outline,writingProfile,savedWriting,corrections:privateCorrections,voiceSources:[...(savedWriting?.references??[]).map(r=>({id:`${r.title} · ${r.contentKey}`,text:r.body,sourcePath:r.contentKey})),...context.sameFamilyExamples.map(e=>({id:e.id,text:e.text,sourcePath:e.sourcePath}))],protocol:lunationArticleGuidance}};
}

export async function writeLunationArticle(prepared,{approvedPlanHash,approvalReference,writerClient}) {
  if(approvedPlanHash!==prepared.planHash||!approvalReference)throw new Error('Review the current writing plan before generating.');
  const approved=approveArgumentOutline(prepared.outline,{exactOwnerRuling:`Owner selected Generate draft for reviewed plan ${approvedPlanHash}. ${approvalReference}`});
  const argumentSource={contentKey:`lunation-plan/${approvedPlanHash}`,sourcePath:approvalReference,ownerApproved:true,
    authority:'owner-approved-writing-plan',opening:approved.thesis,tension:approved.complication,development:approved.recognition,close:approved.response};
  return runWritingPipeline({...prepared.contextOptions,meaningInput:prepared.meaningInput,argumentInput:prepared.argumentInput,
    approvedArgumentOutline:approved,argumentSource,family,surface:family,register:'second_person',target,
    writingProfile:prepared.writingProfile,engineFacts:{...prepared.facts,governedEventMeanings:prepared.eventMeaning},familyContext:{savedLunarWriting:prepared.savedWriting},
    task:`Write the complete ${prepared.facts.event.title} article for owner review. ${prepared.direction}`,writerClient});
}
