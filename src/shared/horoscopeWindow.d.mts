export type HoroscopePeriod = 'daily' | 'weekly' | 'monthly' | 'seasonal';
export type HoroscopeWindow = {period:HoroscopePeriod; audience:'rising'|'collective'; timeZone:string; startsAt:string; endsAt:string; seasonSign?:string};
export const HOROSCOPE_SIGNS:readonly string[];
export const HOROSCOPE_PERIODS:readonly HoroscopePeriod[];
export function validateHoroscopeWindow(value:unknown):HoroscopeWindow;
