import {prepareDraftRequest} from '../../src/astro-writing/generateDraft.mjs';
import {getContentSpine} from '../../src/astro-writing/spineRegistry.mjs';
import {hydrateExplicitWritingFeedback} from '../../src/astro-writing/explicitWritingFeedback.mjs';
import {writingExport,unapprovedWritingInput} from '../../src/astro-writing/writingExport.mjs';
import {horoscopeWriterContextInput} from '../../src/astro-writing/horoscopeWriting.mjs';
import {weeklyPreviousReadings} from '../../src/astro-writing/weeklyPreviousReadings.mjs';

/** Prepare unsigned writing material. Never use the Generate/approval path to
 * inspect it: that would fabricate an owner ruling just to display a prompt. */
export function horoscopeWritingExport(prepared:any,row?:any) {
  const {period,timeZone}=prepared.edition.window;
  const requests=prepared.entries.map((entry:any)=>{
    const {request}=prepareDraftRequest({plan:entry.plan,context:entry.ownerContext,
      argumentOutline:entry.argumentOutline,spine:getContentSpine('horoscope'),
      writingProfile:prepared.writingProfile,family:'horoscope',surface:'horoscopes',register:'second_person',
      target:{surface:'horoscopes',route:'horoscopes',renderer:'HoroscopeReader',contentKeyFamily:'horoscope',temporality:'current_sky',voiceMode:'second_person'},
      engineFacts:{...prepared.brief,risingSign:entry.sign,anchor:entry.anchor,house:entry.house,developments:entry.developments,seasonalMeaning:entry.seasonalMeaning},
      task:entry.sign==='overview'?`Write one shared ${period==='seasonal'?'season introduction':'calendar-month overview'} for readers of all signs in ${timeZone}. Do not assign a personal house or rising sign.`:`Write one complete ${period} horoscope for ${entry.sign} rising in ${timeZone}.`});
    const previousReadings=row?weeklyPreviousReadings(row,entry.sign):null;
    const value=hydrateExplicitWritingFeedback({input:horoscopeWriterContextInput(unapprovedWritingInput(request.input),{...prepared,previousReadings},entry.sign)},prepared.feedbackReceipt,prepared.explicitFeedbackRows);
    return {label:entry.sign,...request,input:value.input};
  });
  return writingExport({title:`${period[0].toUpperCase()+period.slice(1)} horoscope writing plan · ${prepared.edition.window.startsAt} · ${timeZone}`,requests,
    notes:[`Writing guidance: ${period} profile, revision ${prepared.writingProfile.revision}.`,'This complete writing brief is for review or use in another writing tool. It does not approve a plan, authorize a model call or publish writing.',
      ...(['weekly','monthly','seasonal'].includes(period)?['The in-app workflow also uses planning stages. Their generated decisions are added after those stages run; this export contains the current unsigned plan, complete source material and calculated facts.']:[])]});
}
