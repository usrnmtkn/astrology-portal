import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS,validateHoroscopeEdition,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {defaultHoroscopeProfile,validateHoroscopeProfile} from './horoscopeWritingProfiles.mjs';
import {buildMeaningPlan} from './buildMeaningPlan.mjs';
import {buildArgumentOutline,approveArgumentOutline} from './argumentGate.mjs';
import {ownerApprovedMatrixRoleEvidenceForTarget,ownerRelevantEvidenceFromVoiceIndex} from './ownerPositiveEvidence.mjs';
import {withoutOwnerRejectedEvidence} from './ownerEvidenceRejections.mjs';
import {sceneEvidenceForTarget} from './sceneEvidence.mjs';
import {matrixSceneNounLexicon} from './matrixEvidenceIndex.mjs';
import {retrieveOwnerContext} from './retrieveOwnerContext.mjs';
import {assertPositiveOwnerEvidenceContext} from './ownerEvidencePolicy.mjs';
import {loadPhraseEvidenceIndex} from './phraseEvidence.mjs';
import {validateHoroscopeReading} from './horoscopeValidation.mjs';
import {runWritingPipeline} from './runWritingPipeline.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
export const horoscopeWritingVersion='horoscope-writer/v1';
const digest=value=>createHash('sha256').update(typeof value==='string'?value:horoscopeCanonicalJson(value)).digest('hex');
let repositorySources;
const preparedPlans=new Map();
function loadSources() {
  if(repositorySources)return repositorySources;
  const hashes=[];
  const read=name=>{const text=fs.readFileSync(path.join(root,name),'utf8');hashes.push({path:name,sha256:digest(text)});return text;};
  const json=name=>JSON.parse(read(name));
  const lines=name=>read(name).split(/\r?\n/u).filter(Boolean).map(JSON.parse);
  const corrections=[...lines('data/writing/owner-corrections.jsonl'),...lines('data/writing/owner-feedback-corpus.jsonl')];
  const raw=json('packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json');
  const voice={...raw,entries:withoutOwnerRejectedEvidence(raw.entries,corrections)};
  const examples=voice.entries.filter(e=>e.authorityClass==='owner_authored_final'&&e.ownerAuthored===true&&e.ownerApproved===true
    &&e.useAsPositiveVoiceEvidence===true&&['weekly-astrology','sky-season','sky-lunation','sky-article-longform','sky-article-reference'].includes(e.surface)
    &&['article paragraph','published article opening excerpt','published article body excerpt'].includes(e.structuralFunction)
    &&typeof e.text==='string'&&e.text.trim().length>=80)
    .map(e=>({...e,id:e.sourceId,contentKey:e.sourceId,family:e.surface,register:/\b(?:you|your)\b/iu.test(e.text)?'second_person':'collective',sourceRecordSha256:digest(e.text)}));
  const matrix=withoutOwnerRejectedEvidence(lines('data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl'),corrections,'copy');
  const approved=withoutOwnerRejectedEvidence(lines('data/writing/OWNER_APPROVED_EXAMPLES.jsonl'),corrections);
  const gold=json('data/writing/owner-register-gold.json');
  const phrasePath='data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl';read(phrasePath);
  const phrases=loadPhraseEvidenceIndex(path.join(root,phrasePath));
  const houses=json('packages/astro-knowledge/data/primitives/houses.json').entries;
  const meaningPath='tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json';
  const meanings=json(meaningPath).reviewed.filter(e=>['sun','moon'].includes(e.body));
  const placements=Object.fromEntries(meanings.map(e=>{
    if(e.status!=='REVIEWED_CLAUSE')throw new Error('Reviewed horoscope meaning is unavailable.');
    return [`${e.body}-${e.sign}`,{...e,sourcePath:meaningPath,tldr:e.collective_shift,body:e.natal_sign_story,
      gift:e.collective_shift,challenge:'Consider the limits of this temporary emphasis without assuming an outcome.'}];
  }));
  repositorySources={voice,examples,matrix,approved,gold,phrases,houses,placements,corrections,hashes,sha256:digest(hashes),sceneLexicon:matrixSceneNounLexicon(matrix)};
  return repositorySources;
}

function profileFor(row,edition) {
  const saved=row.source_snapshot?.studioWritingProfile;
  const profile=validateHoroscopeProfile(saved?.profile??defaultHoroscopeProfile(edition.window.period));
  if(profile.period!==edition.window.period)throw new Error('The writing instructions do not match this edition.');
  return saved??{id:null,revision:0,profile};
}

/** Pure preparation: no model, approval, or storage write. All moving facts are from the signed brief. */
export function prepareHoroscopeWriting(row,{studioCorrections=[],feedbackReceipt=null}={}) {
  const edition=validateHoroscopeEdition(row.sections?.horoscopeEdition);
  const brief=row.facts?.horoscopeBrief?.brief;
  if(!brief||horoscopeCanonicalJson(brief.window)!==horoscopeCanonicalJson(edition.window))throw new Error('Prepare the calculated dates before generating readings.');
  const sources=loadSources(),writingProfile=profileFor(row,edition);
  const cacheKey=digest({brief,writingProfile,outlines:row.source_snapshot?.horoscopeOutlines??{},feedbackReceipt,studioCorrections,sourceHash:sources.sha256});
  if(preparedPlans.has(cacheKey))return {...preparedPlans.get(cacheKey),edition};
  const planet=edition.window.period==='daily'?'moon':'sun';
  const anchor=brief.positions.find(p=>String(p.planet).toLowerCase()===planet);
  const sign=String(anchor?.sign??'').toLowerCase();
  const meaning=sources.placements[`${planet}-${sign}`];
  if(!meaning)throw new Error('The calculated horoscope anchor is unavailable.');
  const corrections=[...sources.corrections,...studioCorrections];
  const correctedVoice={...sources.voice,entries:withoutOwnerRejectedEvidence(sources.voice.entries,corrections)};
  const examples=withoutOwnerRejectedEvidence(sources.examples,corrections);
  const relevant=ownerRelevantEvidenceFromVoiceIndex(correctedVoice,{planet,sign});
  const relevantSelected=relevant.selected.filter(e=>['weekly-astrology','sky-season','sky-lunation','sky-article-longform','sky-article-reference'].includes(e.family));
  const evidence=ownerApprovedMatrixRoleEvidenceForTarget(sources.matrix,{planet,sign,eventType:null,surface:'horoscopes'});

  const targetMatrix=sources.matrix.filter(e=>String(e.planet).toLowerCase()===planet&&String(e.sign).toLowerCase()===sign);
  const targetExamples=examples.filter(e=>String(e.planet).toLowerCase()===planet&&String(e.sign).toLowerCase()===sign);
  const targetApproved=sources.approved.filter(e=>String(e.contentKey).toLowerCase().includes(planet)&&String(e.contentKey).toLowerCase().includes(sign));
  const entries=HOROSCOPE_SIGNS.map(rising=>{
    const house=((HOROSCOPE_SIGNS.indexOf(sign)-HOROSCOPE_SIGNS.indexOf(rising)+12)%12)+1;
    const domain=sources.houses.find(h=>h.id===String(house));
    if(!domain?.plainTranslation)throw new Error('The calculated house has no topic definition.');
    const topics=domain.plainTranslation.split(',').map(s=>s.trim());
    const meaningInput={contentType:'horoscope',object:planet,sign,house,objectFunction:meaning.tldr,
      signMechanics:meaning.body,actualHouseDomain:domain.plainTranslation,coreTension:meaning.challenge,
      likelyObservableBehaviors:[meaning.gift],likelyConsequences:[meaning.challenge],allowedLivedDomains:topics,
      risks:[meaning.challenge],DO_NOT_ASSUME:['natal biography or a permanent personality pattern','events beyond the signed calculation coverage','a placement lasting beyond its supplied boundaries']};
    const plan=buildMeaningPlan(meaningInput);
    const savedOutline=String(row.source_snapshot?.horoscopeOutlines?.[rising]??'').trim();
    const argumentInput={thesis:savedOutline?savedOutline.replace(/\s+/gu,' '):`Explore ${planet} in ${sign} through the ${house}th house: ${domain.plainTranslation}.`,
      transit_job:`Interpret the temporary ${planet} emphasis using the governed ${sign} meaning and calculated house ${house}.`,
      recognition:`Use proportionate possibilities within ${domain.plainTranslation}; no assumed biography.`,
      complication:`Keep the possible complication within the approved meaning: ${meaning.challenge}`,
      response:`Develop one useful response to the chosen possibility, supported by ${meaning.gift}`,
      scope_guard:`Only ${edition.window.period} timing from ${edition.window.startsAt} to ${edition.window.endsAt} in ${edition.window.timeZone}; no unsupplied aspects or exact events.`,
      scope_breadth:{broad_mechanism:meaning.body,chosen_expression:`Temporary emphasis in house ${house}: ${domain.plainTranslation}`,
        other_valid_expressions:[...topics,'A choice within the supplied house topics','A conversation within the supplied house topics','A change of approach within the supplied house topics']}};
    const argumentOutline=buildArgumentOutline(argumentInput,{plan,family:'horoscope',surface:'horoscopes'});
    const scenes=sceneEvidenceForTarget({approvedExamples:targetApproved,matrixEvidenceRows:targetMatrix,registerExamples:targetExamples,sceneNounLexicon:sources.sceneLexicon,plan});
    const reviewedMeaningExamples=[{id:meaning.id,planet,sign,status:meaning.status,text:meaning.collective_shift,sourcePath:meaning.sourcePath,sourceKind:'reviewed-doctrine',ownerAuthored:false,ownerApproved:false,reviewNote:meaning.review_note}];
    const exactMatrix=evidence.meaning.filter(e=>!String(e.contentKey).includes('/houseactivations/')||String(e.contentKey).includes(`/houseactivations/${rising}|`));
    const contextOptions={reviewedMeaningExamples,examples:[...examples,...relevantSelected],matrixExamples:exactMatrix,matrixArgumentCandidates:evidence.argument_candidate,
      matrixEvidenceAvailableCount:exactMatrix.length,relevantOwnerPassagesAvailableCount:relevantSelected.length,
      ownerPassageRelevanceTier:relevant.tier,sceneExamples:scenes.selected,samePlanetSignSceneAvailableCount:scenes.counts.samePlanetSignSceneAvailable,
      sceneEvidenceInventoryCounts:scenes.counts,registerGoldExamples:sources.gold,corrections,phraseEvidence:sources.phrases,
      preferredEvidenceContentKeys:examples.filter(e=>e.family===(edition.window.period==='seasonal'?'sky-season':'weekly-astrology')).map(e=>e.contentKey)};
    const context=retrieveOwnerContext(plan,{...contextOptions,contentFamily:'horoscope',register:'second_person'});
    // Preparation is unapproved. Validate every evidence precondition except the
    // argument role, which becomes eligible only after the owner's plan action.
    try{assertPositiveOwnerEvidenceContext(context,{family:'horoscope'});}catch(error){
      if(error.code!=='OWNER_EVIDENCE_ROLE_MISSING'||error.detail?.role!=='argument')throw error;
    }
    return {sign:rising,house,anchor:{planet,sign},domain:domain.plainTranslation,outline:savedOutline||argumentInput.thesis,
      argumentOutline,meaningInput,plan,contextOptions,validationCorrections:context.corrections,sourceIds:context.sameFamilyExamples.map(e=>e.id)};
  });
  const planHash=digest({version:horoscopeWritingVersion,window:edition.window,writingProfile,sourceHash:sources.sha256,
    feedbackReceipt,entries:entries.map(e=>({sign:e.sign,outline:e.argumentOutline}))});
  const prepared={edition,brief,writingProfile,entries,planHash,sources:sources.hashes,sourceHash:sources.sha256,feedbackReceipt};
  if(preparedPlans.size>=4)preparedPlans.delete(preparedPlans.keys().next().value);preparedPlans.set(cacheKey,prepared);return prepared;
}

export function horoscopePlanPreview(prepared) {
  return {version:horoscopeWritingVersion,planHash:prepared.planHash,window:prepared.edition.window,
    readings:prepared.entries.map(e=>({sign:e.sign,anchor:e.anchor,house:e.house,domain:e.domain,outline:e.outline,
      argument:e.argumentOutline,sourceIds:e.sourceIds})),writerCalls:prepared.edition.passages.filter(p=>!p.headline.trim()&&!p.body.trim()).length};
}

export async function writeHoroscopeSign(prepared,sign,{approvedPlanHash,writerClient,approvalReference}) {
  if(approvedPlanHash!==prepared.planHash||!approvalReference)throw new Error('Review and approve the current writing plan before generation.');
  const entry=prepared.entries.find(e=>e.sign===sign);if(!entry)throw new Error('Choose a zodiac sign.');
  const approved=approveArgumentOutline(entry.argumentOutline,{exactOwnerRuling:`Authenticated owner selected Generate drafts for plan ${approvedPlanHash}. Reference: ${approvalReference}`});
  const argumentSource={contentKey:`horoscope-plan/${approvedPlanHash}/${sign}`,sourcePath:approvalReference,ownerApproved:true,
    authority:'owner-approved-horoscope-plan',opening:approved.thesis,tension:approved.complication,development:approved.recognition,close:approved.response};
  const result=await runWritingPipeline({...entry.contextOptions,meaningInput:entry.meaningInput,
    // Reconstruct the exact input shape used by the canonical argument builder.
    argumentInput:{...entry.argumentOutline,scope_breadth:{broad_mechanism:entry.argumentOutline.scopeBreadth.broadMechanism,
      chosen_expression:entry.argumentOutline.scopeBreadth.chosenExpression,other_valid_expressions:entry.argumentOutline.scopeBreadth.otherValidExpressions}},
    approvedArgumentOutline:approved,argumentSource,family:'horoscope',surface:'horoscopes',register:'second_person',writingProfile:prepared.writingProfile,
    target:{surface:'horoscopes',route:'horoscopes',renderer:'HoroscopeReader',contentKeyFamily:'horoscope',temporality:'current_sky',voiceMode:'second_person'},
    engineFacts:{...prepared.brief,risingSign:sign,anchor:entry.anchor,house:entry.house},
    task:`Write one complete ${prepared.edition.window.period} horoscope for ${sign} rising in ${prepared.edition.window.timeZone}.`,writerClient});
  if(!result.draft)throw new Error('The writer could not prepare a horoscope from the available evidence.');
  const {headline,body}=result.draft;
  if(typeof headline!=='string'||!headline.trim()||headline.length>200||typeof body!=='string'||!body.trim()||body.length>20000)throw new Error('The writer returned an incomplete reading.');
  const lint=validateHoroscopeReading({sign,headline,body},prepared.brief,{ownerCorrections:result.context.corrections});
  return {headline,body,lint,status:lint.passed?"owner-review-pending":"human-review-required",report:result.report,
    receipt:{version:horoscopeWritingVersion,planHash:prepared.planHash,sign,sourceHash:prepared.sourceHash,sourceIds:entry.sourceIds,
      profileHash:digest(prepared.writingProfile),argumentHash:approved.approvedOutlineHash,feedback:prepared.feedbackReceipt,
      bodyHash:digest({headline,body}),ownerApproved:false,promotionAuthorized:false}};
}
