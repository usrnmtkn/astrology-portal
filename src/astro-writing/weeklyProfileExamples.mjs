import {createHash} from 'node:crypto';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {horoscopeProfileEvidence} from './horoscopePromptVariables.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
export const WEEKLY_PROFILE_SELECTION='weekly-profile-selection/v2-2026-11-03';

/** Select whole declared units from the saved collection, never an excerpt.
 * Unknown collections retain their original transport. The original profile
 * and its receipt retain the complete archive, including all unselected units. */
export function weeklyProfileExamples(sourceGuidance,sign=null) {
  const named=[...sourceGuidance.matchAll(/^OWNER-DESIGNATED WEEKLY ([A-Z]+) VOICE EXAMPLE\r?$/gmu)];
  if(!named.length)return null;
  if(named.length!==1||named[0].index!==0||!HOROSCOPE_SIGNS.includes(sign))throw new Error('Review the named Weekly source boundaries and requested sign before writing.');
  const referenceSign=named[0][1].toLowerCase();
  if(!HOROSCOPE_SIGNS.includes(referenceSign))throw new Error('Review the named Weekly example sign.');
  const opening=[...sourceGuidance.matchAll(/^APPROVED EXAMPLE — VERBATIM\r?$/gmu)];
  const ending=[...sourceGuidance.matchAll(/^END OF ([A-Z]+) EXAMPLE\r?$/gmu)];
  if(opening.length!==1||ending.length!==1||ending[0][1].toLowerCase()!==referenceSign||ending[0].index<=opening[0].index)
    throw new Error('The complete named Weekly example needs unambiguous boundaries.');
  const correctionStart=sourceGuidance.search(/^OWNER CORRECTION:/mu);
  const namedEnd=ending[0].index+ending[0][0].length;
  if(correctionStart>=0&&correctionStart<namedEnd)throw new Error('Keep Weekly corrections outside the complete named example.');
  const comparisonStart=sourceGuidance.search(/^ACTIVE COMPLETE OWNER-DESIGNATED COMPARISONS\r?$/mu);
  if(comparisonStart>=0&&comparisonStart<namedEnd)throw new Error('Keep Weekly comparisons outside the complete named example.');
  const additional=horoscopeProfileEvidence(sourceGuidance);
  const archiveEnd=Math.min(...[correctionStart,comparisonStart,sourceGuidance.length].filter(index=>index>=0));
  if(!sourceGuidance.slice(opening[0].index+opening[0][0].length,ending[0].index).trim())throw new Error('Review the complete Weekly example.');
  const headings=[...sourceGuidance.slice(namedEnd,archiveEnd).matchAll(new RegExp(`^(\\d{4}-\\d{2}-\\d{2}) · (${HOROSCOPE_SIGNS.join('|')}) & \\2 Rising\\r?$`,'gimu'))]
    .map(m=>({date:m[1],sign:m[2].toLowerCase(),start:namedEnd+m.index}));
  const units=headings.map((unit,i)=>({...unit,end:headings[i+1]?.start??archiveEnd}));
  if(new Set(units.map(u=>`${u.date}/${u.sign}`)).size!==units.length)throw new Error('Weekly archive unit identities must be unique.');
  const selected=[{sign:referenceSign,start:0,end:namedEnd,role:sign===referenceSign?'current owner-designated complete example':'current owner-designated example; cross-sign voice support only'}];
  if(sign!==referenceSign){
    const matching=units.filter(u=>u.sign===sign).sort((a,b)=>b.date.localeCompare(a.date));
    if(!matching.length)throw new Error('The saved Weekly archive has no complete example for this sign.');
    selected.push({...matching[0],role:'complete historical same-sign example; voice support only'});
  }
  const passages=selected.map(unit=>{
    const text=sourceGuidance.slice(unit.start,unit.end),sha256=hash(text);
    return {...unit,id:`weekly-profile:${sha256}`,text,sha256,wordCount:text.trim().split(/\s+/u).length};
  });
  for(const passage of additional.passages){
    const boundary=[...sourceGuidance.matchAll(/^BEGIN COMPLETE PROSE ([^\r\n]+)\r?\n/gmu)]
      .find(match=>match.index>=comparisonStart&&match[1]===passage.id);
    const start=boundary?boundary.index+boundary[0].length:-1,end=start+passage.text.length;
    if(start<comparisonStart||sourceGuidance.slice(start,end)!==passage.text)throw new Error('Review the complete Weekly comparison offsets.');
    passages.push({...passage,start,end,role:'saved owner-designated complete comparison; voice only; authorship and use remain as declared in the saved source'});
  }
  const corrections=correctionStart<0?'':sourceGuidance.slice(correctionStart);
  return {version:WEEKLY_PROFILE_SELECTION,archiveSha256:hash(sourceGuidance),archiveLength:sourceGuidance.length,
    sign,passages,corrections,unselectedHistoricalUnits:units.filter(u=>!selected.some(s=>s.start===u.start)).length,
    sourceGuidance:[
      'SELECTED COMPLETE WEEKLY EXAMPLES\nThe named current example sets the composition reference. Historical and cross-sign examples supply voice only; their events and situations are not this reading’s facts. The complete saved collection remains in the private profile receipt.',
      ...passages.slice(0,selected.length).map(p=>p.text),additional.comparisons,corrections
    ].filter(Boolean).join('\n\n')};
}
