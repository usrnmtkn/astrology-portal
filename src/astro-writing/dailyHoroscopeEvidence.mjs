import {createHash} from 'node:crypto';

/** Daily transport projection only. Source selection and receipts keep the
 * original objects; every role retains its metadata and exact complete text. */
export function dailyHoroscopeEvidence(context) {
  const sources=new Map();
  const reference=entry=>{
    if(typeof entry.text!=='string'||!entry.text)return entry;
    let source=sources.get(entry.text);
    if(!source){
      const sha256=createHash('sha256').update(entry.text).digest('hex');
      source={id:`daily-source:${sha256}`,sha256,text:entry.text};
      sources.set(entry.text,source);
    }
    const {text,...metadata}=entry;
    return {...metadata,completePassageRef:source.id};
  };
  const projected=Object.fromEntries(['primaryRegisterPassages','sameFamilyExamples','relevantOwnerPassages','registerGoldExamples','phraseExamples']
    .map(field=>[field,context[field].map(reference)]));
  const packet=context.sharedEvidencePacket;
  return {...context,...projected,sharedEvidencePacket:{...packet,
    entries:packet.entries.map(reference),
    roles:Object.fromEntries(Object.entries(packet.roles).map(([role,entries])=>[role,entries.map(reference)])),
    supportingArgumentCandidates:packet.supportingArgumentCandidates.map(reference)
  },completeSourcePassages:[...sources.values()]};
}
