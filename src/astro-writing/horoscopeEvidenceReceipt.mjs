import {createHash} from 'node:crypto';
import {horoscopeProfileEvidence} from './horoscopePromptVariables.mjs';
import {studioWritingProfileReceipt} from './studioWritingProfileReceipt.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
export const HOROSCOPE_EVIDENCE_RECEIPT='horoscope-owner-evidence/v1';

/** This private, editor-only receipt inventories both evidence paths. Saved
 * comparisons retain their designation; a profile does not confer authorship. */
export function horoscopeEvidenceReceipt(context,writingProfile) {
  const profile=studioWritingProfileReceipt(writingProfile,{allowStarter:true});
  const saved=horoscopeProfileEvidence(writingProfile.profile.sourceGuidance);
  const primary=new Set((context.primaryRegisterPassages??[]).map(p=>p.id));
  const selected=(context.sameFamilyExamples??[]).map(p=>{
    const sha256=hash(p.text);
    if(p.sourceRecordSha256&&p.sourceRecordSha256!==sha256)throw new Error('Selected owner passage integrity failed.');
    return {id:p.id,sourcePath:p.sourcePath,text:p.text,sha256,wordCount:p.text.trim().split(/\s+/u).length,
      role:primary.has(p.id)?'primary owner passage':'supporting owner passage',
      selection:context.retrievalSelection?.eligible.find(e=>e.id===p.id)??null};
  });
  const comparisons=saved.passages.map(p=>({...p,sourcePath:`studio-writing-profile/${profile.id??'starter'}/sourceGuidance`,
    role:'saved owner-designated comparison',reason:'Included in full by the current saved profile.'}));
  const passages=[...selected,...comparisons],byHash=new Map();
  for(const p of passages){const first=byHash.get(p.sha256);if(first)p.duplicateOf=first;else byHash.set(p.sha256,p.id);}
  return {version:HOROSCOPE_EVIDENCE_RECEIPT,route:'canonical-horoscope-writer',period:profile.period,
    profile,selection:context.retrievalSelection??null,passages,distinctPassageCount:byHash.size,
    corrections:context.corrections??[],savedCorrections:saved.corrections,
    rejectedExamples:context.rejectedExamples??[],
    comparisonBlock:saved.comparisons,
    limitations:'Selection matches are retrieval evidence, not proof of voice quality. Source astrology is historical. Saved comparisons are not automatically approved for reader use.'};
}

/** Verify delivery against the assembled writer input, not an upstream ID list. */
export function assertHoroscopeEvidenceDelivered(receipt,input) {
  const present=text=>input.includes(text)||input.includes(JSON.stringify(text).slice(1,-1));
  if(!receipt.passages.length||receipt.passages.some(p=>hash(p.text)!==p.sha256||!present(p.text)))throw new Error('A complete selected owner passage is missing from the writer input.');
  if(receipt.savedCorrections&&!present(receipt.savedCorrections))throw new Error('Saved owner corrections are missing from the writer input.');
  for(const e of receipt.rejectedExamples)if(!present(e.body))throw new Error('A scoped rejected reading is missing from the writer input.');
  return {...receipt,inputSha256:hash(input),delivery:'verified in assembled writer input'};
}
