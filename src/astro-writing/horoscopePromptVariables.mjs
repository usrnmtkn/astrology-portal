import {createHash} from 'node:crypto';
import {horoscopeEditorialPrompt, HOROSCOPE_RUN_PROMPT_VARIABLES} from './horoscopeWritingProfiles.mjs';
import {studioWritingProfileReceipt} from './studioWritingProfileReceipt.mjs';

const digest=text=>createHash('sha256').update(text).digest('hex');
const empty=label=>`No ${label} were selected for this writing run.`;

/** Move explicitly marked saved evidence only in the assembled request. Saved fields stay exact. */
export function horoscopeProfileEvidence(sourceGuidance) {
  const start=sourceGuidance.search(/^ACTIVE COMPLETE OWNER-DESIGNATED COMPARISONS\r?$/mu);
  const correctionStart=sourceGuidance.search(/^OWNER CORRECTION:/mu);
  if(start>=0&&correctionStart>=0&&correctionStart<start)throw new Error('Keep the saved owner correction section after the complete comparisons so their boundaries remain separate.');
  const comparisons=start<0?'':sourceGuidance.slice(start,correctionStart>start?correctionStart:undefined);
  const corrections=correctionStart<0?'':sourceGuidance.slice(correctionStart);
  const passages=[];
  if(comparisons){
    const blocks=[...comparisons.matchAll(/Complete prose SHA-256: ([a-f0-9]{64})\r?\nBEGIN COMPLETE PROSE ([^\r\n]+)\r?\n([\s\S]*?)\r?\nEND COMPLETE PROSE \2(?=\r?\n|$)/gu)];
    if(!blocks.length || blocks.length!==(comparisons.match(/^BEGIN COMPLETE PROSE /gmu)??[]).length
      || blocks.length!==(comparisons.match(/^END COMPLETE PROSE /gmu)??[]).length
      || blocks.some(([,hash,,text])=>digest(text)!==hash))throw new Error('The saved complete owner comparisons could not be verified. Check their source text and hashes before generating.');
    if(new Set(blocks.map(b=>b[2])).size!==blocks.length)throw new Error('Saved owner comparison IDs must be unique.');
    for(const [,sha256,id,text] of blocks)passages.push({id,text,sha256,wordCount:text.trim().split(/\s+/u).length});
  }
  return {comparisons,corrections,passages};
}

/** Values come from the selected, governed run context, never template names or URLs. */
export function buildHoroscopePromptVariables({writingProfile,context,primaryPassages,supportingPassages,factsText}) {
  studioWritingProfileReceipt(writingProfile,{allowStarter:true});
  const profile=writingProfile.profile;
  const names=new Set([...profile.prompt.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/gu)].map(m=>m[1]));
  const uses=name=>names.has(name);
  const active=HOROSCOPE_RUN_PROMPT_VARIABLES.some(uses);
  // Integrity applies even when the saved prompt uses only the original four variables.
  const selected=horoscopeProfileEvidence(profile.sourceGuidance);
  if(!active)return {prompt:horoscopeEditorialPrompt(profile),uses,active};
  if(!primaryPassages?.length || !Array.isArray(supportingPassages) || !Array.isArray(context.corrections) || !factsText?.trim())throw new Error('The horoscope writing run is missing its governed facts or owner evidence.');
  let sourceGuidance=profile.sourceGuidance;
  for(const [name,text,label] of [['ownerPositiveComparisons',selected.comparisons,'OWNER POSITIVE COMPARISONS'],['ownerCorrections',selected.corrections,'OWNER CORRECTIONS']]){
    if(uses(name)&&text)sourceGuidance=sourceGuidance.replace(text,`The complete saved material is supplied under ${label}.\n\n`);
  }
  const runVariables={
    primaryOwnerVoiceSources:JSON.stringify(primaryPassages),
    supportingOwnerVoiceSources:JSON.stringify(supportingPassages),
    ownerPositiveComparisons:selected.comparisons||empty('active owner-designated comparisons'),
    ownerCorrections:[`SELECTED OWNER CORRECTIONS\n${JSON.stringify(context.corrections)}`,...(selected.corrections?[selected.corrections]:[])].join('\n\n'),
    governedFacts:factsText
  };
  return {prompt:horoscopeEditorialPrompt({...profile,sourceGuidance},runVariables),uses,active};
}
