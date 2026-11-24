import {dailyHoroscopeWriterEvidence,renderDailyHoroscopeSources,horoscopeSourceRoles} from './dailyHoroscopeEvidence.mjs';
import {dailyWriterFacts} from './dailyWriterFacts.mjs';
import {weeklyMeaningReferences} from './weeklyRequestEvidence.mjs';
import {buildHoroscopePromptVariables} from './horoscopePromptVariables.mjs';
import {weeklyProfileExamples} from './weeklyProfileExamples.mjs';
import {compactVoiceInInstructions,compactVoiceMaterialReference,compactVoiceArchiveMaterial} from './compactVoiceInstructions.mjs';
import {configurationEvidenceInput} from './horoscopeConfigurationEvidence.mjs';

export const COMPACT_HOROSCOPE_REQUEST='compact-horoscope-request/v9-optional-background-2026-11-04';

/** One request assembler for the two compact formats. The exact saved guide
 * remains authoritative; retrieval diagnostics and generated prose plans stay
 * in preparation receipts rather than becoming a second writing guide. */
export function buildCompactHoroscopeDraftInput({context,task,target,engineFacts,argumentOutline,writingProfile,headline}) {
  const period=engineFacts.window.period;
  if(!['daily','weekly'].includes(period)||writingProfile.profile.period!==period)throw new Error('Choose the matching Daily or Weekly profile.');
  const designatedWeekly=period==='weekly'&&/^WEEKLY PROMPT V2\r?\n/u.test(writingProfile.profile.prompt);
  const selectedWeekly=designatedWeekly?weeklyProfileExamples(writingProfile.profile.sourceGuidance,engineFacts.risingSign):null;
  const evidence=designatedWeekly?context:dailyHoroscopeWriterEvidence(context,{diversifyWeekly:period==='daily',writingProfile,engineFacts});
  const reference=({id,completePassageRef})=>({id,completePassageRef});
  const primary=designatedWeekly?context.primaryRegisterPassages:evidence.primaryRegisterPassages.map(reference);
  const ids=new Set(primary.map(p=>p.id));
  const supporting=evidence.sameFamilyExamples.filter(p=>!ids.has(p.id)).map(p=>designatedWeekly?p:reference(p));
  let factsText;
  if(period==='daily'){
    const {calculatedFacts,developments,privateMoonContext,componentMeanings}=dailyWriterFacts(engineFacts);
    const {background,...datedDevelopments}=developments;
    const ongoing={use:'Optional ongoing interpretive context. Select a condition when it develops this reading; these reference positions are not dated-event coverage, a planet inventory or separate paragraphs to supply.',background};
    factsText=`CALCULATED FACTS\n${JSON.stringify(calculatedFacts)}\n\nPERIOD DEVELOPMENTS — EACH FACT WITH ITS OWN MEANING AND LIFE AREA\n${JSON.stringify(datedDevelopments)}\n\nOPTIONAL ONGOING CONDITIONS — NOT EVENT COVERAGE\n${JSON.stringify(ongoing)}${componentMeanings?`\n\nDAILY PLANET AND SIGN DEFINITIONS — MEANING ONLY\n${JSON.stringify(componentMeanings)}`:''}\n\nPRIVATE ORDINARY MOON CONTEXT — OPTIONAL, NOT REQUIRED COVERAGE\n${JSON.stringify(privateMoonContext)}`;
  }else{
    const {developments,seasonalMeaning,relationalContext,anchor,house,ownerOutline,configurationEvidence,...facts}=engineFacts;
    factsText=`CALCULATED FACTS\n${JSON.stringify({...facts,signs:facts.signs?.filter(s=>s.sign===engineFacts.risingSign)})}\n\nPERIOD DEVELOPMENTS — EACH FACT WITH ITS OWN MEANING AND LIFE AREA\n${JSON.stringify(weeklyMeaningReferences(developments))}\n\nWEEKLY MEANING REFERENCES\nResolve each temporaryMeaning reference to its matching wm: id and complete text in this packet.`;
  }
  const historicalLabel='RETRIEVED HISTORICAL OWNER READINGS — VOICE SUPPORT';
  const variables=buildHoroscopePromptVariables({writingProfile,context:evidence,primaryPassages:primary,supportingPassages:supporting,factsText,
    ...(compactVoiceInInstructions(writingProfile.profile)?{voiceGuidanceView:compactVoiceMaterialReference(writingProfile.profile)}:{}),
    ...(selectedWeekly?{sourceGuidanceView:selectedWeekly.sourceGuidance}:{}),
    ...(!designatedWeekly?{primarySourceLabel:historicalLabel}:{})});
  const scope={direction:engineFacts.ownerOutline??null,boundaries:argumentOutline.scope_guard};
  const archiveMaterial=compactVoiceArchiveMaterial(writingProfile.profile);
  return [
    'SURFACE\nhoroscopes','CONTENT FAMILY\nhoroscope','REGISTER\nsecond_person',
    `TASK\n${task}`,`READING HEADLINE\n${headline}`,
    ...(engineFacts.configurationEvidence?[configurationEvidenceInput(engineFacts.configurationEvidence)]:[]),
    `CONTENT STUDIO WRITING INSTRUCTIONS\n${variables.prompt}`,
    ...(!designatedWeekly?[
      `SOURCE AUTHORITY AND ROLES\n${JSON.stringify(horoscopeSourceRoles(evidence))}`,
      renderDailyHoroscopeSources(evidence.completeSourcePassages,period),
      ...(!variables.uses('primaryOwnerVoiceSources')?[`${historicalLabel}\n${JSON.stringify(primary)}`]:[]),
      ...(!variables.uses('supportingOwnerVoiceSources')?[`SUPPORTING OWNER PASSAGES\n${JSON.stringify(supporting)}`]:[])
    ]:[]),
    `RENDER TARGET\n${JSON.stringify(target)}`,
    ...(!variables.uses('governedFacts')?[factsText]:[]),
    ...(archiveMaterial?[archiveMaterial]:[]),
    `${argumentOutline.approvedOutlineHash?'REVIEWED EDITORIAL SCOPE':'EDITORIAL SCOPE FOR REVIEW'}\n${JSON.stringify(scope)}`,
    ...(!variables.uses('ownerCorrections')?[`CURRENT OWNER CORRECTIONS\n${JSON.stringify(evidence.corrections)}`]:[]),
    ...(!designatedWeekly&&evidence.rejectedExamples?.length?[`REJECTED READINGS — NEGATIVE EVIDENCE ONLY\n${JSON.stringify(evidence.rejectedExamples)}`]:[])
  ].join('\n\n');
}
