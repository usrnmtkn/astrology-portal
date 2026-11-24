import {weeklyPreviousReadings,weeklyPreviousReadingsCurrent,weeklyPreviousReadingsInput,WEEKLY_PREVIOUS_READINGS} from './weeklyPreviousReadings.mjs';
import {dailyPreviousReadings,dailyPreviousReadingsCurrent,dailyPreviousReadingsInput,DAILY_PREVIOUS_READINGS} from './dailyPreviousReadings.mjs';

export function horoscopePreviousReadings(row,sign) {
  return row.sections?.horoscopeEdition?.window?.period==='daily'
    ?dailyPreviousReadings(row,sign):weeklyPreviousReadings(row,sign);
}
export function horoscopePreviousReadingsCurrent(row,snapshot) {
  if(!snapshot)return true;
  if(snapshot.version===DAILY_PREVIOUS_READINGS)return dailyPreviousReadingsCurrent(row,snapshot);
  return weeklyPreviousReadingsCurrent(row,snapshot);
}
export function horoscopePreviousReadingsInput(snapshot) {
  if(!snapshot)return '';
  if(snapshot.version===DAILY_PREVIOUS_READINGS)return dailyPreviousReadingsInput(snapshot);
  if(snapshot.version===WEEKLY_PREVIOUS_READINGS)return weeklyPreviousReadingsInput(snapshot);
  throw new Error('The earlier-reading comparison contract is unavailable.');
}
