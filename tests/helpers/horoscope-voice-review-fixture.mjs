import {HOROSCOPE_VOICE_CRITERIA} from '../../src/astro-writing/horoscopeVoiceStandard.mjs';
import {horoscopeVoiceReferences,horoscopeVoiceReferenceInventory,voiceParagraphs} from '../../src/astro-writing/horoscopeVoiceReview.mjs';

// Transport fixture only. It deliberately makes no semantic quality claim.
export function syntheticHoroscopeVoiceReview({candidate,evidence},outcome='pass') {
  const references=horoscopeVoiceReferences(evidence),inventory=horoscopeVoiceReferenceInventory(evidence);
  const entry=inventory.find(r=>/primary/iu.test(r.role)&&r.eligibleParagraphs.length)??inventory.find(r=>r.eligibleParagraphs.length);
  const reference=references.find(r=>r.id===entry?.id),paragraphs=voiceParagraphs(candidate.body);
  return Object.fromEntries(Object.keys(HOROSCOPE_VOICE_CRITERIA).map(key=>{
    const candidateParagraph=key==='ending'?paragraphs.length-1:0,referenceParagraph=entry?.eligibleParagraphs[0];
    return [key,reference?{outcome,candidateParagraph,candidateQuote:paragraphs[candidateParagraph],referenceId:reference.id,
      referenceParagraph,referenceQuote:voiceParagraphs(reference.text)[referenceParagraph],reason:'Synthetic evidence/transport assertion; not a voice-quality judgment.'}
      :{outcome:'unassessed',candidateParagraph:null,candidateQuote:'',referenceId:null,referenceParagraph:null,referenceQuote:'',reason:'Synthetic fixture has no eligible reference.'}];
  }));
}
