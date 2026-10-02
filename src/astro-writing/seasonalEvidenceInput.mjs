import {SEASONAL_SOURCE_PRIORITY} from './horoscopeEditorialConstraints.mjs';

// Present each complete passage once, retaining exact text and provenance.
// Other packet roles reference it by ID instead of paying for repeated copies.
export function seasonalEvidenceInput(context) {
  const primary=new Set(context.primaryRegisterPassages.map(p=>p.id));
  return `COMPLETE SEASONAL OWNER PROSE EVIDENCE\n${JSON.stringify(context.sameFamilyExamples.map(p=>({...p,
    seasonalVoiceRole:primary.has(p.id)?'primary argument and voice':'supporting same-audience sign reading'})))}\n\n${SEASONAL_SOURCE_PRIORITY}`;
}
export function seasonalSharedEvidence(context) {
  return sharedEvidenceWithPassageReferences(context,context.sameFamilyExamples);
}

// Only reference passages actually serialized in full elsewhere in this input.
// Keep each role's metadata, including provenance and use restrictions.
export function sharedEvidenceWithPassageReferences(context,passages) {
  const sources=new Map(passages.map(p=>[p.text,p]));
  const reference=e=>{
    const source=sources.get(e.text);
    if(!source)return e;
    const {text,...metadata}=e;
    return {...metadata,completePassageRef:source.id};
  };
  const packet=context.sharedEvidencePacket;
  return {...packet,roles:Object.fromEntries(Object.entries(packet.roles).map(([role,entries])=>[role,entries.map(reference)])),
    entries:packet.entries.map(reference)};
}
