export const HOROSCOPE_PUNCTUATION_RULE:string;
export const WEEKLY_REQUIRED_VOCABULARY_RULE:string;
export function horoscopeVocabularyFindings(passage:unknown,period:string):Array<{category:string;field:string;detail:string;governanceTier:'blocking'}>;
export const SEASONAL_DEPTH_GUIDANCE:string;
export const SEASONAL_FACT_RELATIONSHIPS:string;
export const SEASONAL_DEPTH_REVIEW:string;
export function horoscopePunctuationFindings(passage:{headline?:string;body?:string}):{category:string;field:string;detail:string;governanceTier:'blocking'}[];
