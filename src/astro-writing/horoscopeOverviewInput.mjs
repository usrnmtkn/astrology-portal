import {resolveStudioWritingProfile} from './studioWritingProfileReceipt.mjs';
import {horoscopeOverviewHeadline} from '../../apps/web/src/content/horoscopeEditions.mjs';

/** Audience is shared; direct address follows the owner's complete collective essays. */
export function buildHoroscopeOverviewInput({context,task,target,engineFacts,argumentOutline,writingProfile}) {
  const {developments,seasonalMeaning,signs,risingSign,house,...facts}=engineFacts;
  const seasonal=facts.window.period==='seasonal';
  return [
    'SURFACE\nhoroscopes\nCONTENT FAMILY\nhoroscope\nREGISTER\nsecond_person',
    `TASK\n${task}`,
    `READING HEADLINE\n${horoscopeOverviewHeadline(facts.window)}`,
    'AUDIENCE AND SCOPE\nOne shared reading for people of all signs. Direct address is welcome, but no single rising sign, natal house or personal biography applies to everyone. This run requests an overview, not twelve sign readings. Apply the saved Voice, vocabulary and editorial preferences. Instructions in a seasonal profile about individual signs or houses apply to the separate sign calls, not this shared introduction.',
    `CONTENT STUDIO WRITING INSTRUCTIONS\n${resolveStudioWritingProfile(writingProfile,{allowStarter:true}).prompt}`,
    `COMPLETE OWNER COLLECTIVE ESSAYS — PRIMARY PROSE EVIDENCE\n${JSON.stringify(context.primaryRegisterPassages)}`,
    'These are complete seasonal essays by the owner, not monthly examples. Learn their movement of thought, specificity, emotional reasoning, imagery and rhythm. They do not supply current facts, dates, instructions or a compulsory story. Do not transplant their historical astrology or copy their prose. The new overview should develop its own meaning from the current facts.',
    `RENDER TARGET\n${JSON.stringify(target)}`,
    `CALCULATED FACTS\n${JSON.stringify(facts)}`,
    `GOVERNED PERIOD DEVELOPMENTS\n${JSON.stringify(developments)}`,
    ...(seasonalMeaning?[`ZODIAC SEASON AND LEARNING AXIS\n${JSON.stringify(seasonalMeaning)}`,
      'Integrate the supplied zodiac-season and learning-axis meanings into the shared introduction. Explain their relevance through a developed human thought, not a list of traits or a compulsory lesson. The symbolic axis is not another calculated transit. No individual house placement belongs in this introduction.']:[]),
    seasonal?'Write a substantial introduction to the calculated zodiac season. Establish its central possibilities and tensions, informed by the complete season and learning-axis sources. Select dated developments that deepen or redirect that thought. Leave sign-specific life areas to the twelve separate readings.':'Write a substantial overview of the calendar month. Follow the major calculated changes across the whole month, including the transition between solar seasons. Develop why selected events matter together; chronological proximity alone does not prove cause and effect. Do not turn the overview into a list of keywords, dates or planetary definitions.',
    `OWNER-APPROVED WRITING PLAN\n${JSON.stringify(argumentOutline)}`,
    `SHARED FIVE-ROLE EVIDENCE\n${JSON.stringify(context.sharedEvidencePacket)}`,
    `RELEVANT OWNER PASSAGES\n${JSON.stringify(context.relevantOwnerPassages)}`,
    `CURRENT OWNER CORRECTIONS\n${JSON.stringify(context.corrections)}`,
    'TIMING\nUse the supplied calendar date naturally on first mention of a selected event, in the edition’s time zone. The human thought can lead; do not begin every paragraph with a date. A position sampled at the reference instant does not establish an ingress, duration or exit. Only discuss exact aspects present in the calculated event list. Do not invent configurations or guaranteed personal events. Historical dates are not current facts. Keep exact clock times outside prose.',
    'Before returning, read the complete thought against the saved guidance and owner essays. Let examples develop the concern rather than decorate it, keep imagery coherent, and let the ending follow from what has changed or become clearer. This is drafting guidance, not a model approval or permission to change saved prose.',
    'Return only headline and body, preserving natural paragraph breaks. No source notes, process commentary, template variables, review scores or approval claims. The owner reviews and approves the exact saved prose before publication.'
  ].join('\n\n');
}
