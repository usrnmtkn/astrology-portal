import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS,horoscopeReadingSigns,validateHoroscopeEdition,horoscopeCanonicalJson} from '../../apps/web/src/content/horoscopeEditions.mjs';
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
import {buildHoroscopeDevelopments} from './horoscopeDevelopments.mjs';
import {SEASONAL_MEANING_BANK,resolveSeasonalMeaning,seasonalMeaningForRising} from './seasonalHoroscopeMeaning.mjs';
import {loadSeasonalHoroscopeEvidence} from './seasonalHoroscopeEvidence.mjs';
import {loadSeasonalArgumentEvidence} from './seasonalArgumentEvidence.mjs';
import {loadMonthlyHoroscopeEvidence} from './monthlyHoroscopeEvidence.mjs';
import {HOROSCOPE_RHETORICAL_REVIEW} from './horoscopeRhetoricalReview.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
export const horoscopeWritingVersion='horoscope-writer/v17';
export const horoscopeWritingVersionFor=period=>period==='seasonal'?'horoscope-writer/v19-seasonal-editorial':horoscopeWritingVersion;
const digest=value=>createHash('sha256').update(typeof value==='string'?value:horoscopeCanonicalJson(value)).digest('hex');
const repositorySources=new Map();
const preparedPlans=new Map();
function weeklyForecastSign(entry) {
  if(entry.surface!=='weekly-astrology'||!/^paragraph under .*horoscopes?/iu.test(entry.structuralFunction??''))return null;
  const heading=String(entry.text??'').split(/\r?\n/u)[0].trim().toLowerCase();
  return HOROSCOPE_SIGNS.includes(heading)?heading:null;
}
function loadSources(period) {
  if(repositorySources.has(period))return repositorySources.get(period);
  const hashes=[];
  const read=name=>{const text=fs.readFileSync(path.join(root,name),'utf8');hashes.push({path:name,sha256:digest(text)});return text;};
  const json=name=>JSON.parse(read(name));
  const lines=name=>read(name).split(/\r?\n/u).filter(Boolean).map(JSON.parse);
  const corrections=[...lines('data/writing/owner-corrections.jsonl'),...lines('data/writing/owner-feedback-corpus.jsonl')];
  const raw=json('packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json');
  const voice={...raw,entries:withoutOwnerRejectedEvidence(raw.entries,corrections)};
  const examples=voice.entries.filter(e=>e.authorityClass==='owner_authored_final'&&e.ownerAuthored===true&&e.ownerApproved===true
    &&e.useAsPositiveVoiceEvidence===true&&['weekly-astrology','sky-season','sky-lunation','sky-article-longform','sky-article-reference'].includes(e.surface)
    &&(weeklyForecastSign(e)||['article paragraph','published article opening excerpt','published article body excerpt'].includes(e.structuralFunction))
    &&typeof e.text==='string'&&e.text.trim().length>=80)
    .map(e=>({...e,id:e.sourceId,contentKey:e.sourceId,family:e.surface,horoscopeAudienceSign:weeklyForecastSign(e),horoscopePeriod:weeklyForecastSign(e)?'weekly':null,register:/\b(?:you|your)\b/iu.test(e.text)?'second_person':'collective',sourceRecordSha256:digest(e.text)}));
  // The seasonal adapter resolves complete units in the existing governed corpus.
  // Other surfaces retain their own evidence pool and selection behavior.
  if(['seasonal','monthly'].includes(period))examples.push(...loadSeasonalHoroscopeEvidence(read,{includeOverviews:true}));
  if(period==='monthly')examples.push(...loadMonthlyHoroscopeEvidence(read));
  if(period==='seasonal')examples.push(...loadSeasonalArgumentEvidence(read));
  const matrix=withoutOwnerRejectedEvidence(lines('data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl'),corrections,'copy');
  const approved=withoutOwnerRejectedEvidence(lines('data/writing/OWNER_APPROVED_EXAMPLES.jsonl'),corrections);
  const phrasePath='data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl';read(phrasePath);
  const phrases=loadPhraseEvidenceIndex(path.join(root,phrasePath));
  const houses=json('packages/astro-knowledge/data/primitives/houses.json').entries;
  const aspects=json('packages/astro-knowledge/data/primitives/aspects.json').entries;
  const meaningPath='tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json';
  const meanings=json(meaningPath).reviewed;
  const placements=Object.fromEntries(meanings.map(e=>{
    if(e.status!=='REVIEWED_CLAUSE')throw new Error('Reviewed horoscope meaning is unavailable.');
    return [`${e.body}-${e.sign}`,{...e,sourcePath:meaningPath,tldr:e.collective_shift,body:e.natal_sign_story,
      gift:e.collective_shift,challenge:'Consider the limits of this temporary emphasis without assuming an outcome.'}];
  }));
  const seasonalBank=period==='seasonal'?json(SEASONAL_MEANING_BANK):null;
  const sources={seasonalBank,voice,examples,matrix,approved,phrases,houses,aspects,placements,corrections,hashes,sha256:digest(hashes),sceneLexicon:matrixSceneNounLexicon(matrix)};
  repositorySources.set(period,sources);return sources;
}

function profileFor(row,edition) {
  const saved=row.source_snapshot?.studioWritingProfile;
  const profile=validateHoroscopeProfile(saved?.profile??defaultHoroscopeProfile(edition.window.period));
  if(profile.period!==edition.window.period)throw new Error('The writing instructions do not match this edition.');
  return saved??{id:null,revision:0,profile};
}

/** Pure preparation: no model, approval, or storage write. All moving facts are from the signed brief. */
export function prepareHoroscopeWriting(row,{studioCorrections=[],feedbackReceipt=null,seasonalSourceRows=[],writerSelection=null}={}) {
  const edition=validateHoroscopeEdition(row.sections?.horoscopeEdition);
  const brief=row.facts?.horoscopeBrief?.brief;
  if(!brief||horoscopeCanonicalJson(brief.window)!==horoscopeCanonicalJson(edition.window))throw new Error('Prepare the calculated dates before generating readings.');
  const sources=loadSources(edition.window.period),writingProfile=profileFor(row,edition);
  const seasonalMeaning=resolveSeasonalMeaning(brief,sources.seasonalBank,seasonalSourceRows);
  const sourceHash=seasonalMeaning?digest({repository:sources.sha256,seasonalMeaning:seasonalMeaning.sha256}):sources.sha256;
  const cacheKey=digest({...(writerSelection?{writerSelection}:{}),brief,writingProfile,outlines:row.source_snapshot?.horoscopeOutlines??{},feedbackReceipt,studioCorrections,sourceHash});
  if(preparedPlans.has(cacheKey))return {...preparedPlans.get(cacheKey),edition};
  const planet=edition.window.period==='daily'?'moon':'sun';
  const anchor=brief.positions.find(p=>String(p.planet).toLowerCase()===planet);
  const sign=String(anchor?.sign??'').toLowerCase();
  const meaning=sources.placements[`${planet}-${sign}`];
  if(!meaning)throw new Error('The calculated horoscope anchor is unavailable.');
  const corrections=[...sources.corrections,...studioCorrections];
  const correctedVoice={...sources.voice,entries:withoutOwnerRejectedEvidence(sources.voice.entries,corrections)};
  const primaryPeriod=edition.window.period==='seasonal'?'seasonal':edition.window.period==='monthly'?'monthly':'weekly';
  const allowedPrimaryPeriods=edition.window.period==='monthly'?new Set(['monthly','seasonal']):new Set([primaryPeriod]);
  const examples=withoutOwnerRejectedEvidence(sources.examples,corrections).filter(e=>!e.horoscopeAudienceSign||allowedPrimaryPeriods.has(e.horoscopePeriod));
  const relevant=ownerRelevantEvidenceFromVoiceIndex(correctedVoice,{planet,sign});
  const relevantSelected=relevant.selected.filter(e=>['weekly-astrology','sky-season','sky-lunation','sky-article-longform','sky-article-reference'].includes(e.family));
  const evidence=ownerApprovedMatrixRoleEvidenceForTarget(sources.matrix,{planet,sign,eventType:null,surface:'horoscopes'});

  const targetMatrix=sources.matrix.filter(e=>String(e.planet).toLowerCase()===planet&&String(e.sign).toLowerCase()===sign);
  const targetExamples=examples.filter(e=>String(e.planet).toLowerCase()===planet&&String(e.sign).toLowerCase()===sign);
  const targetApproved=sources.approved.filter(e=>String(e.contentKey).toLowerCase().includes(planet)&&String(e.contentKey).toLowerCase().includes(sign));
  const entries=horoscopeReadingSigns(edition).map(rising=>{
    const overview=rising==='overview';
    const house=overview?null:((HOROSCOPE_SIGNS.indexOf(sign)-HOROSCOPE_SIGNS.indexOf(rising)+12)%12)+1;
    const domain=overview?{plainTranslation:'shared experiences across all zodiac signs; no personal house placement'}:sources.houses.find(h=>h.id===String(house));
    if(!domain?.plainTranslation)throw new Error('The calculated house has no topic definition.');
    const topics=domain.plainTranslation.split(',').map(s=>s.trim());
    const developments=buildHoroscopeDevelopments(brief,rising,sources);
    const periodDomains=[...new Set([...developments.events,...developments.background].map(d=>d.domain))];
    const meaningInput={contentType:'horoscope',object:planet,sign,house,objectFunction:meaning.tldr,
      signMechanics:meaning.body,actualHouseDomain:domain.plainTranslation,coreTension:meaning.challenge,
      likelyObservableBehaviors:[meaning.gift],likelyConsequences:[meaning.challenge],allowedLivedDomains:periodDomains,
      risks:[meaning.challenge],DO_NOT_ASSUME:['natal biography or a permanent personality pattern','events beyond the signed calculation coverage','a placement lasting beyond its supplied boundaries']};
    const plan=buildMeaningPlan(meaningInput);
    const savedOutline=String(row.source_snapshot?.horoscopeOutlines?.[rising]??'').trim();
    const datedScope=developments.events.map(d=>`${d.title} (${d.localTiming}${d.house?`; house ${d.house}: ${d.domain}`:''})`).join('; ');
    const argumentInput={thesis:savedOutline?savedOutline.replace(/\s+/gu,' '):overview?`Develop one shared ${edition.window.period==='seasonal'?'season introduction':'monthly overview'} for all readers. Explain how selected dated developments relate, using the owner's complete collective essays for language and movement. ${edition.window.period==='seasonal'?'Integrate the supplied zodiac-season meaning and learning axis; leave personal houses to the twelve sign readings.':'Begin with a true TLDR: what this month is about, what may change for people and what they may understand differently by its end. Then develop that meaning through selected dated events across the calendar month. The TLDR comes before the dated forecast. Do not assign a rising sign or personal house.'}`:`Develop a connected ${edition.window.period} interpretation for ${rising} from the supplied developments and their individual life areas. Let a meaningful concern emerge from those facts; the reference ${planet} placement is not a prescribed story.`,
      transit_job:edition.window.period==='monthly'?'First synthesize the supplied planetary arcs into a month-specific human thesis. Choose connected developments for what each changes in that thought. Dates remain fact references, not the paragraph outline.':`Consider the dated developments with their own planet, sign, house and governed meaning: ${datedScope||'No dated developments with governed meaning are available; stay within the reference-instant coverage.'}`,
      recognition:edition.window.period==='monthly'?'Let the selected developments retain their distinct meaning. The saved synthesis establishes their relationships; the owner essays supply prose movement.':'Develop what the chosen circumstances could mean to this reader: a desire, fear, pleasure, conflict, loyalty or decision only where the selected facts and house support it. Observable detail should deepen that concern, not become a catalogue of activities or administrative tasks.',
      complication:'Follow what changes or becomes harder to ignore in the selected concern. A complication is optional; do not manufacture a crisis, trauma, childhood history or a repeated compromise plot.',
      response:edition.window.period==='monthly'?'Consider the whole month and what the selected developments change. The saved profile controls the prose and ending.':'Let the ending follow from the recognition developed in this reading. A useful response may be an action, a changed understanding or permission earned by the passage; no compulsory checklist or moral.',
      scope_guard:`Publication window: ${edition.window.startsAt} to ${edition.window.endsAt} in ${edition.window.timeZone}. The ${edition.window.period} publication window is not a transit duration. Dated sky events support timing; reference positions verify an instant, not an ingress or how long a placement lasts. Ongoing placements may inform this reading without an invented duration. No unsupplied future events, aspects, guaranteed personal events or imported historical dates.`,
      scope_breadth:{broad_mechanism:'Each supplied development has its own temporary meaning and calculated life area; related developments may deepen one concern over the period.',
        chosen_expression:`Select the developments that make a coherent reading for ${rising}; each house remains bound to its own event or placement.`,
        other_valid_expressions:[...periodDomains,...topics]}};
    const argumentOutline=buildArgumentOutline(argumentInput,{plan,family:'horoscope',surface:'horoscopes'});
    const scenes=sceneEvidenceForTarget({approvedExamples:targetApproved,matrixEvidenceRows:targetMatrix,registerExamples:targetExamples,sceneNounLexicon:sources.sceneLexicon,plan});
    const reviewedMeaningExamples=[{id:meaning.id,planet,sign,status:meaning.status,text:meaning.collective_shift,sourcePath:meaning.sourcePath,sourceKind:'reviewed-doctrine',ownerAuthored:false,ownerApproved:false,reviewNote:meaning.review_note}];
    const exactMatrix=evidence.meaning.filter(e=>!String(e.contentKey).includes('/houseactivations/')||String(e.contentKey).includes(`/houseactivations/${rising}|`));
    const signForecasts=examples.filter(e=>overview?e.horoscopeAudienceSign==='overview':e.horoscopeAudienceSign&&e.horoscopeAudienceSign!=='overview'&&(primaryPeriod!=='seasonal'||e.horoscopeAudienceSign===rising));
    const seasonal=edition.window.period==='seasonal';
    const primary=seasonal?examples.filter(e=>e.seasonalArgumentPrimary):signForecasts;
    // These explicit owner assignments supersede generic topical snippets for
    // Seasonal only. Keep complete same-audience readings as supporting examples.
    const proseExamples=seasonal?[...primary,...(overview?[]:signForecasts)]:[...examples,...relevantSelected];
    const relevantCount=seasonal?proseExamples.filter(e=>e.planet===planet||e.sign===sign).length:relevantSelected.length;
    const contextOptions={reviewedMeaningExamples,examples:proseExamples,matrixExamples:exactMatrix,matrixArgumentCandidates:evidence.argument_candidate,
      matrixEvidenceAvailableCount:exactMatrix.length,relevantOwnerPassagesAvailableCount:relevantCount,
      ownerPassageRelevanceTier:seasonal?'owner-selected-seasonal':relevant.tier,sceneExamples:scenes.selected,samePlanetSignSceneAvailableCount:scenes.counts.samePlanetSignSceneAvailable,
      sceneEvidenceInventoryCounts:scenes.counts,corrections,phraseEvidence:sources.phrases,
      primaryRegisterContentKeys:primary.map(e=>e.contentKey),requirePrimaryRegister:true,
      includeAllPrimaryRegisterPassages:edition.window.period==='monthly'&&overview,
      preferredEvidenceContentKeys:(edition.window.period==='monthly'&&overview
        ?signForecasts.filter(e=>e.horoscopePeriod==='monthly').map(e=>e.contentKey)
        :signForecasts.filter(e=>e.horoscopeAudienceSign===rising).map(e=>e.contentKey))};
    const context=retrieveOwnerContext(plan,{...contextOptions,contentFamily:'horoscope',register:'second_person'});
    // Preparation is unapproved. Validate every evidence precondition except the
    // argument role, which becomes eligible only after the owner's plan action.
    try{assertPositiveOwnerEvidenceContext(context,{family:'horoscope'});}catch(error){
      if(error.code!=='OWNER_EVIDENCE_ROLE_MISSING'||error.detail?.role!=='argument')throw error;
    }
    return {sign:rising,house,seasonalMeaning:overview?seasonalMeaning:seasonalMeaningForRising(seasonalMeaning,rising,sources.houses),anchor:{planet,sign},developments,domain:domain.plainTranslation,outline:savedOutline||argumentInput.thesis,
      argumentOutline,meaningInput,plan,contextOptions,validationCorrections:context.corrections,sourceIds:context.sameFamilyExamples.map(e=>e.id)};
  });
  const planHash=digest({...(writerSelection?{writerSelection}:{}),version:horoscopeWritingVersionFor(edition.window.period),...(edition.window.period!=='seasonal'?{reviewVersion:HOROSCOPE_RHETORICAL_REVIEW}:{}),window:edition.window,writingProfile,sourceHash,
    feedbackReceipt,brief,entries:entries.map(e=>({sign:e.sign,outline:e.argumentOutline,developments:e.developments,seasonalMeaning:e.seasonalMeaning}))});
  const prepared={edition,brief,writingProfile,entries,writerSelection,planHash,sources:sources.hashes,sourceHash,seasonalMeaning,feedbackReceipt};
  if(preparedPlans.size>=4)preparedPlans.delete(preparedPlans.keys().next().value);preparedPlans.set(cacheKey,prepared);return prepared;
}

export function horoscopePlanPreview(prepared) {
  const writerCalls=prepared.edition.passages.filter(p=>!p.headline.trim()&&!p.body.trim()).length;
  return {version:horoscopeWritingVersionFor(prepared.edition.window.period),...(prepared.edition.window.period!=='seasonal'?{reviewVersion:HOROSCOPE_RHETORICAL_REVIEW,reviewCalls:writerCalls}:{}),planHash:prepared.planHash,sourceHash:prepared.sourceHash,window:prepared.edition.window,
    readings:prepared.entries.map(e=>({sign:e.sign,anchor:e.anchor,house:e.house,domain:e.domain,outline:e.outline,
      argument:e.argumentOutline,developments:e.developments,seasonalMeaning:e.seasonalMeaning,sourceIds:e.sourceIds})),writerCalls,
    ...(prepared.edition.window.period==='seasonal'?{planningCalls:writerCalls*3,editorialReviewCalls:writerCalls*6,maximumPaidCalls:writerCalls*30}:{}),
    synthesisCalls:prepared.edition.window.period==='monthly'&&prepared.edition.passages.some(p=>!p.headline.trim()&&!p.body.trim())?1:0};
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
    engineFacts:{...prepared.brief,risingSign:sign,anchor:entry.anchor,house:entry.house,developments:entry.developments,seasonalMeaning:entry.seasonalMeaning},
    task:sign==='overview'?`Write one shared ${prepared.edition.window.period==='seasonal'?'season introduction':'calendar-month overview'} for readers of all signs in ${prepared.edition.window.timeZone}. Do not assign a personal house or rising sign.`:`Write one complete ${prepared.edition.window.period} horoscope for ${sign} rising in ${prepared.edition.window.timeZone}.`,writerClient});
  if(!result.draft)throw new Error('The writer could not prepare a horoscope from the available evidence.');
  const {headline,body}=result.draft;
  if(typeof headline!=='string'||!headline.trim()||headline.length>200||typeof body!=='string'||!body.trim()||body.length>20000)throw new Error('The writer returned an incomplete reading.');
  const lint=validateHoroscopeReading({sign,headline,body},prepared.brief,{ownerCorrections:result.context.corrections});
  return {headline,body,lint,status:lint.passed?"owner-review-pending":"human-review-required",report:result.report,
    receipt:{version:horoscopeWritingVersionFor(prepared.edition.window.period),planHash:prepared.planHash,sign,sourceHash:prepared.sourceHash,sourceIds:entry.sourceIds,
      seasonalMeaning:entry.seasonalMeaning,profileHash:digest(prepared.writingProfile),argumentHash:approved.approvedOutlineHash,feedback:prepared.feedbackReceipt,
      bodyHash:digest({headline,body}),ownerApproved:false,promotionAuthorized:false}};
}
