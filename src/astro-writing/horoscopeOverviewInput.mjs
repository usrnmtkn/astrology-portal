import {seasonalEvidenceInput,seasonalSharedEvidence,sharedEvidenceWithPassageReferences} from './seasonalEvidenceInput.mjs';
import {buildHoroscopePromptVariables} from './horoscopePromptVariables.mjs';
import {horoscopeOverviewHeadline} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {HOROSCOPE_PUNCTUATION_RULE,SEASONAL_FACT_RELATIONSHIPS,SEASONAL_SOURCE_PRIORITY} from './horoscopeEditorialConstraints.mjs';
import {MONTHLY_SYNTHESIS_SLOT} from './monthlyHoroscopeSynthesis.mjs';
import {buildSeasonalDraftInput} from './seasonalDraftInput.mjs';

/** Audience is shared; direct address follows the owner's complete collective essays. */
export function buildHoroscopeOverviewInput({context,task,target,engineFacts,argumentOutline,writingProfile}) {
  if(engineFacts?.window?.period==='seasonal')return buildSeasonalDraftInput({context,task,engineFacts,argumentOutline,writingProfile});
  const {developments,seasonalMeaning,relationalContext,signs,risingSign,house,...facts}=engineFacts;
  const seasonal=facts.window.period==='seasonal';
  const primaryIds=new Set(context.primaryRegisterPassages.map(p=>p.id));
  const supportingPassages=(seasonal?context.sameFamilyExamples:context.relevantOwnerPassages).filter(p=>!primaryIds.has(p.id));
  const completePassages=[...context.primaryRegisterPassages,...supportingPassages];
  const {events:datedEvents,relationalContext:duplicateRelationships,...monthlyFacts}=facts;
  const factsText=`CALCULATED FACTS\n${JSON.stringify(seasonal?facts:monthlyFacts)}\n\nGOVERNED PERIOD DEVELOPMENTS\n${JSON.stringify(seasonal?developments:{...developments,events:undefined,factsById:Object.fromEntries(developments.events.map(e=>[e.id,e]))})}`;
  const variables=buildHoroscopePromptVariables({writingProfile,context,primaryPassages:context.primaryRegisterPassages,supportingPassages,factsText});
  return [
    'SURFACE\nhoroscopes\nCONTENT FAMILY\nhoroscope\nREGISTER\nsecond_person',
    `TASK\n${task}`,
    `READING HEADLINE\n${horoscopeOverviewHeadline(facts.window)}`,
    'AUDIENCE AND SCOPE\nOne shared reading for people of all signs. Direct address is welcome, but no single rising sign, natal house or personal biography applies to everyone. This run requests an overview, not twelve sign readings. Apply the saved Voice, vocabulary and editorial preferences. Instructions in a seasonal profile about individual signs or houses apply to the separate sign calls, not this shared introduction.',
    `CONTENT STUDIO WRITING INSTRUCTIONS\n${variables.prompt}`,
    ...(!seasonal?[`PRIVATE MONTHLY SYNTHESIS\n${MONTHLY_SYNTHESIS_SLOT}`,
      'The saved synthesis establishes the month-specific human thesis and connected planetary stories before prose begins. It is a working interpretation, not owner-approved wording or a source of additional facts. Develop its argument in the owner’s language using the complete examples below. Its labels and analytical phrasing stay private. Dates anchor selected evidence; they do not prescribe one paragraph per event. Follow each story across its changes rather than restarting its meaning at every contact. The full fact catalog supplies context, not a coverage checklist.',
      `MONTHLY SPECIFICITY CONTRACT\nDo not spend reader space on advice or observations that remain true without this month’s astrology. Generic planning, communication, relationship, productivity or self-help conclusions are not interpretation. Sentences such as plans improve when revised, communication helps, pressure is not proof, wanting something has costs, or changing course can be wise are unacceptable unless the supplied astrology creates a more specific contradiction and consequence that the sentence actually names. Each paragraph must earn its place by showing what this selected development changes in its planetary story’s human concern. Separate stories need not support the same conclusion. If a sentence could be pasted unchanged into a roadmap, management memo or generic relationship article, cut it or make the astrological cause and human consequence more exact. Do not replace specificity with a polished maxim.`]:[]),
    ...(seasonal&&!variables.active?[seasonalEvidenceInput(context)]:[
    ...(!variables.uses('primaryOwnerVoiceSources')?[`COMPLETE OWNER COLLECTIVE ESSAYS — PRIMARY PROSE EVIDENCE\n${JSON.stringify(context.primaryRegisterPassages)}`]:[]),
    seasonal?SEASONAL_SOURCE_PRIORITY:'These are the owner’s complete monthly overview and seasonal essays. The monthly overview supplies same-format prose evidence; the seasonal essays retain their primary voice role. Learn their movement of thought, specificity, emotional reasoning, imagery and rhythm. They do not supply current facts, dates, instructions or a compulsory story. Do not transplant their historical astrology or copy their prose. The new overview should develop its own meaning from the current facts.',
    ...(!variables.uses('supportingOwnerVoiceSources')?[`SUPPORTING OWNER PASSAGES\n${JSON.stringify(supportingPassages)}`]:[])]),
    `RENDER TARGET\n${JSON.stringify(target)}`,
    ...(!variables.uses('governedFacts')?[factsText]:[]),
    ...(seasonal?[SEASONAL_FACT_RELATIONSHIPS]:[]),
    ...(seasonalMeaning?[`ZODIAC SEASON AND LEARNING AXIS\n${JSON.stringify(seasonalMeaning)}`,
      'Integrate the supplied zodiac-season and learning-axis meanings into the shared introduction. Explain their relevance through a developed human thought, not a list of traits or a compulsory lesson. The symbolic axis is not another calculated transit. No individual house placement belongs in this introduction.']:[]),
    seasonal?'Write a substantial introduction to the calculated zodiac season. Establish its central possibilities and tensions, informed by the complete season and learning-axis sources. Select dated developments that deepen or redirect that thought. Leave sign-specific life areas to the twelve separate readings.':`MONTHLY READING FORMAT\nReturn the TLDR and dated forecast in their separate schema fields. A saved exact opening for the dated forecast belongs in body, after the TLDR. A direction to return headline and body does not remove the required tldr field from this run's schema.`,
    `${seasonal?'OWNER-APPROVED WRITING PLAN':'REVIEWED GENERATION SCOPE — NOT A PROSE OUTLINE'}\n${JSON.stringify(argumentOutline)}`,
    `SHARED FIVE-ROLE EVIDENCE\n${JSON.stringify(seasonal?seasonalSharedEvidence(context):sharedEvidenceWithPassageReferences(context,completePassages))}`,
    `RELEVANT OWNER PASSAGES\n${JSON.stringify(context.relevantOwnerPassages.map(p=>({completePassageRef:p.id})))}`,
    ...(!variables.uses('ownerCorrections')?[`CURRENT OWNER CORRECTIONS\n${JSON.stringify(context.corrections)}`]:[]),
    `TIMING\n${seasonal?'Use the supplied calendar date naturally on first mention of a selected event, in the edition’s time zone.':'In the dated forecast, use the supplied calendar date naturally on first mention of a selected event, in the edition’s time zone. The opening TLDR gives the month’s meaning without calendar dates.'} The human thought can lead; do not begin every paragraph with a date. A position sampled at the reference instant does not establish an ingress, duration or exit. Only call an aspect exact when it is present in the calculated exact event list. Sampled aspects and configurations require the supplied event-time relational context and its limits. Do not invent configurations or guaranteed personal events. Historical dates are not current facts. Keep exact clock times outside prose.`,
    ...(seasonal?['Before returning, read the complete thought against the saved guidance and owner essays. Preserve developed passages; remove only repeated explanations, sign definitions already demonstrated by the human situation, and closing summaries that add nothing. A later contact must change what a person can understand or choose, rather than rename the same point. This is a focused editing pass within drafting, not a separate paid review, model approval or permission to change saved prose.']:[]),
    `${seasonal?'Return only headline and body':'Return headline, tldr and body. The app places the TLDR before the dated forecast; do not repeat it inside body or add section labels'}, preserving natural paragraph breaks. No source notes, process commentary, template variables, review scores or approval claims. The owner reviews and approves the exact saved prose before publication.`,
    HOROSCOPE_PUNCTUATION_RULE
  ].join('\n\n');
}
