import {createHash} from 'node:crypto';
import {horoscopeProfileEvidence} from './horoscopePromptVariables.mjs';
import {studioWritingProfileReceipt} from './studioWritingProfileReceipt.mjs';
import {usesWeeklyFromSamples} from './weeklyFromSamples.mjs';
import {weeklyProfileExamples} from './weeklyProfileExamples.mjs';
import {dailyWriterSourceSelection} from './dailyHoroscopeEvidence.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
export const HOROSCOPE_EVIDENCE_RECEIPT='horoscope-owner-evidence/v1';

/** This private, editor-only receipt inventories both evidence paths. Saved
 * comparisons retain their designation; a profile does not confer authorship. */
export function horoscopeEvidenceReceipt(original,writingProfile,sign=null) {
  const profile=studioWritingProfileReceipt(writingProfile,{allowStarter:true});
  const context=profile.period==='daily'?dailyWriterSourceSelection(original,{writingProfile}):original;
  if(writingProfile.profile.period==='weekly'&&/^WEEKLY PROMPT V2\r?\n/u.test(writingProfile.profile.prompt)) {
    const selected=weeklyProfileExamples(writingProfile.profile.sourceGuidance,sign);
    if(selected){
      const {sourceGuidance,passages,...selection}=selected;
      return {version:HOROSCOPE_EVIDENCE_RECEIPT,route:'canonical-horoscope-writer',period:profile.period,profile,
        selection:{mode:'owner-selected-weekly-v2',...selection},
        passages:passages.map(p=>({...p,sourcePath:`studio-writing-profile/${profile.id}/sourceGuidance`})),
        distinctPassageCount:new Set(passages.map(p=>p.sha256)).size,corrections:context.corrections??[],savedCorrections:selected.corrections,
        rejectedExamples:[],comparisonBlock:sourceGuidance,
        limitations:'Whole declared units selected from the unchanged saved collection. Offsets and archive hash refer to that original profile. Selection preserves designation; it does not infer authorship, current facts or approval of new prose.'};
    }
  }
  if(usesWeeklyFromSamples(writingProfile.profile)||(writingProfile.profile.period==='weekly'&&/^WEEKLY PROMPT V2\r?\n/u.test(writingProfile.profile.prompt))) {
    const text=writingProfile.profile.sourceGuidance;
    return {version:HOROSCOPE_EVIDENCE_RECEIPT,route:'canonical-horoscope-writer',period:profile.period,
      profile,selection:{mode:usesWeeklyFromSamples(writingProfile.profile)?'owner-selected-weekly-v3':'owner-selected-weekly-v2'},
      passages:[{id:`weekly-${usesWeeklyFromSamples(writingProfile.profile)?'v3':'v2'}-sources-${hash(text)}`,sourcePath:`studio-writing-profile/${profile.id}/sourceGuidance`,
        text,sha256:hash(text),wordCount:text.trim().split(/\s+/u).length,role:'saved owner-designated complete weekly source collection'}],
      distinctPassageCount:1,corrections:[],savedCorrections:'',rejectedExamples:[],comparisonBlock:text,
      limitations:'The current saved weekly v2 profile designates this complete source collection. Legacy retrieval passages and rejected drafts are excluded from this writing call. Historical astrology is not current fact; designation as evidence never approves a new reading.'};
  }
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
    profile,selection:context.retrievalSelection??null,...(context.writerSourceSelection?{writerSourceSelection:context.writerSourceSelection}:{}),passages,distinctPassageCount:byHash.size,
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
  for(const e of receipt.rejectedExamples)if(!e.body?.trim()||!present(e.body))throw new Error('A scoped rejected reading is missing from the writer input.');
  return {...receipt,inputSha256:hash(input),delivery:'verified in assembled writer input'};
}
