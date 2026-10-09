export const LUNATION_PROFILE_KEY:string;
export const LUNATION_WORKSPACE_PREFIX:string;
export const LUNATION_PROFILE_FIELDS:readonly ['voiceGuidance','phaseContext','scopeGuidance','factsAndLinks'];
export const LUNATION_ARGUMENT_FIELDS:readonly string[];
export const LUNATION_SIGNS:readonly string[];
export const LUNATION_PHASES:readonly string[];
export function lunationContentKey(phase:string,sign:string):string;
