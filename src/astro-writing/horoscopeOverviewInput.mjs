import {seasonalEvidenceInput,seasonalSharedEvidence,sharedEvidenceWithPassageReferences} from './seasonalEvidenceInput.mjs';
import {resolveStudioWritingProfile} from './studioWritingProfileReceipt.mjs';
import {horoscopeOverviewHeadline} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {HOROSCOPE_PUNCTUATION_RULE,SEASONAL_FACT_RELATIONSHIPS} from './horoscopeEditorialConstraints.mjs';
import {MONTHLY_TLDR_GUIDANCE} from './monthlyHoroscopeFormat.mjs';
import {MONTHLY_SYNTHESIS_SLOT} from './monthlyHoroscopeSynthesis.mjs';

/** Audience is shared; direct address follows the owner's complete collective essays. */
export function buildHoroscopeOverviewInput({context,task,target,engineFacts,argumentOutline,writingProfile}) {
  const {developments,seasonalMeaning,relationalContext,signs,risingSign,house,...facts}=engineFacts;
  const seasonal=facts.window.period==='seasonal';
  const primaryIds=new Set(context.primaryRegisterPassages.map(p=>p.id));
  const supportingPassages=context.relevantOwnerPassages.filter(p=>!primaryIds.has(p.id));
  const completePassages=[...context.primaryRegisterPassages,...supportingPassages];
  const {events:datedEvents,relationalContext:duplicateRelationships,...monthlyFacts}=facts;
  return [
    'SURFACE\nhoroscopes\nCONTENT FAMILY\nhoroscope\nREGISTER\nsecond_person',
    `TASK\n${task}`,
    `READING HEADLINE\n${horoscopeOverviewHeadline(facts.window)}`,
    'AUDIENCE AND SCOPE\nOne shared reading for people of all signs. Direct address is welcome, but no single rising sign, natal house or personal biography applies to everyone. This run requests an overview, not twelve sign readings. Apply the saved Voice, vocabulary and editorial preferences. Instructions in a seasonal profile about individual signs or houses apply to the separate sign calls, not this shared introduction.',
    `CONTENT STUDIO WRITING INSTRUCTIONS\n${resolveStudioWritingProfile(writingProfile,{allowStarter:true}).prompt}`,
    ...(!seasonal?[`PRIVATE MONTHLY SYNTHESIS\n${MONTHLY_SYNTHESIS_SLOT}`,
      'The saved synthesis establishes the month-specific human thesis and connected planetary stories before prose begins. It is a working interpretation, not owner-approved wording or a source of additional facts. Develop its argument in the owner’s language using the complete examples below. Its labels and analytical phrasing stay private. Dates anchor selected evidence; they do not prescribe one paragraph per event. Follow each story across its changes rather than restarting its meaning at every contact. The full fact catalog supplies context, not a coverage checklist.']:[]),
    ...(seasonal?[seasonalEvidenceInput(context)]:[`COMPLETE OWNER COLLECTIVE ESSAYS — PRIMARY PROSE EVIDENCE\n${JSON.stringify(context.primaryRegisterPassages)}`,
    'These are complete seasonal essays by the owner, not monthly examples. Learn their movement of thought, specificity, emotional reasoning, imagery and rhythm. They do not supply current facts, dates, instructions or a compulsory story. Do not transplant their historical astrology or copy their prose. The new overview should develop its own meaning from the current facts.',
    `SUPPORTING OWNER PASSAGES\n${JSON.stringify(supportingPassages)}`]),
    `RENDER TARGET\n${JSON.stringify(target)}`,
    `CALCULATED FACTS\n${JSON.stringify(seasonal?facts:monthlyFacts)}`,
    `GOVERNED PERIOD DEVELOPMENTS\n${JSON.stringify(seasonal?developments:{...developments,events:undefined,factsById:Object.fromEntries(developments.events.map(e=>[e.id,e]))})}`,
    ...(seasonal?[SEASONAL_FACT_RELATIONSHIPS]:[]),
    ...(seasonalMeaning?[`ZODIAC SEASON AND LEARNING AXIS\n${JSON.stringify(seasonalMeaning)}`,
      'Integrate the supplied zodiac-season and learning-axis meanings into the shared introduction. Explain their relevance through a developed human thought, not a list of traits or a compulsory lesson. The symbolic axis is not another calculated transit. No individual house placement belongs in this introduction.']:[]),
    seasonal?'Write a substantial introduction to the calculated zodiac season. Establish its central possibilities and tensions, informed by the complete season and learning-axis sources. Select dated developments that deepen or redirect that thought. Leave sign-specific life areas to the twelve separate readings.':`MONTHLY READING FORMAT\n${MONTHLY_TLDR_GUIDANCE}\nA saved exact opening for the dated forecast belongs in body, after the TLDR. A direction to return headline and body does not remove the required tldr field from this run's schema.`,
    `OWNER-APPROVED WRITING PLAN\n${JSON.stringify(argumentOutline)}`,
    `SHARED FIVE-ROLE EVIDENCE\n${JSON.stringify(seasonal?seasonalSharedEvidence(context):sharedEvidenceWithPassageReferences(context,completePassages))}`,
    `RELEVANT OWNER PASSAGES\n${JSON.stringify(context.relevantOwnerPassages.map(p=>({completePassageRef:p.id})))}`,
    `CURRENT OWNER CORRECTIONS\n${JSON.stringify(context.corrections)}`,
    `TIMING\n${seasonal?'Use the supplied calendar date naturally on first mention of a selected event, in the edition’s time zone.':'In the dated forecast, use the supplied calendar date naturally on first mention of a selected event, in the edition’s time zone. The opening TLDR gives the month’s meaning without calendar dates.'} The human thought can lead; do not begin every paragraph with a date. A position sampled at the reference instant does not establish an ingress, duration or exit. Only call an aspect exact when it is present in the calculated exact event list. Sampled aspects and configurations require the supplied event-time relational context and its limits. Do not invent configurations or guaranteed personal events. Historical dates are not current facts. Keep exact clock times outside prose.`,
    'Before returning, read the complete thought against the saved guidance and owner essays. Preserve developed passages; remove only repeated explanations, sign definitions already demonstrated by the human situation, and closing summaries that add nothing. A later contact must change what a person can understand or choose, rather than rename the same point. This is a focused editing pass within drafting, not a separate paid review, model approval or permission to change saved prose.',
    `${seasonal?'Return only headline and body':'Return headline, tldr and body. The app places the TLDR before the dated forecast; do not repeat it inside body or add section labels'}, preserving natural paragraph breaks. No source notes, process commentary, template variables, review scores or approval claims. The owner reviews and approves the exact saved prose before publication.`,
    HOROSCOPE_PUNCTUATION_RULE
  ].join('\n\n');
}
