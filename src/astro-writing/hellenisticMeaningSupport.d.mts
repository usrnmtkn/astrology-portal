export const HELLENISTIC_MEANING_VERSION:string;
export type HellenisticMeaningContext={facts?:Record<string,any>;plan?:Record<string,any>;family?:string;surface?:string};
export function buildHellenisticMeaningSupport(context?:HellenisticMeaningContext):{
  version:string;role:'meaning-only';authority:string;
  records:Array<{id:string;meaning:string;limits:string;sourceRefs:Array<{source_id:string;pdf_pages:number[]}>}>;
  receipt:{version:string;frameworkSha256:string;recordIds:string[];recordHashes:Array<{id:string;sha256:string}>;
    positiveVoiceEvidence:false;calculatedFacts:false;projectionOnly:boolean};
};
export function hellenisticMeaningPrompt(context?:HellenisticMeaningContext):string;
