import {createHash} from 'node:crypto';

const hash=text=>createHash('sha256').update(text).digest('hex');

/** Weekly transport only. Preserve retrieval and receipts; each role keeps
 * all of its metadata while resolving the same exact complete source text. */
export function weeklyHoroscopeEvidence(context) {
  const sources=new Map();
  const reference=entry=>{
    if(typeof entry.text!=='string'||!entry.text)return entry;
    let source=sources.get(entry.text);
    if(!source){
      const sha256=hash(entry.text);
      source={id:`weekly-source:${sha256}`,sha256,text:entry.text};sources.set(entry.text,source);
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

/** Project structured generated facts before prompt assembly. Saved guidance,
 * source collections, corrections and candidate prose are never traversed. */
export function weeklyMeaningReferences(value) {
  const counts=new Map(),ids=new Set(),sources=new Map();
  const visit=v=>{
    if(Array.isArray(v))return v.forEach(visit);
    if(!v||typeof v!=='object')return;
    for(const [key,child] of Object.entries(v)){
      if(key==='id'&&typeof child==='string')ids.add(child);
      if(key==='temporaryMeaning'&&typeof child==='string'&&child)counts.set(child,(counts.get(child)??0)+1);
      else visit(child);
    }
  };
  visit(value);
  const project=v=>{
    if(Array.isArray(v))return v.map(project);
    if(!v||typeof v!=='object')return v;
    return Object.fromEntries(Object.entries(v).map(([key,child])=>{
      if(key!=='temporaryMeaning'||typeof child!=='string'||!(counts.get(child)>1))return [key,project(child)];
      const existing=sources.get(child);
      if(existing)return [key,{completePassageRef:existing.id}];
      let index=sources.size+1;while(ids.has(`wm:${index}`))index++;
      const id=`wm:${index}`;
      ids.add(id);const source={id,text:child};sources.set(child,source);
      return [key,source];
    }));
  };
  return project(value);
}
