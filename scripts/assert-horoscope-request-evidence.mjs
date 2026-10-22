import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Independent test decoder: compare the delivered complete facts with the
// original saved plan, including every source and planet/sign/house binding.
export function restoreWeeklyRequestMeanings(value) {
  const sources=new Map();
  const collect=v=>{
    if(Array.isArray(v))return v.forEach(collect);
    if(!v||typeof v!=='object')return;
    const meaning=v.temporaryMeaning;
    if(meaning?.id&&typeof meaning.text==='string'){
      assert(!sources.has(meaning.id),'Meaning definitions are unique');sources.set(meaning.id,meaning.text);
    }
    Object.values(v).forEach(collect);
  };
  collect(value);
  const restore=v=>{
    if(Array.isArray(v))return v.map(restore);
    if(!v||typeof v!=='object')return v;
    return Object.fromEntries(Object.entries(v).map(([key,child])=>{
      if(key==='temporaryMeaning'&&child?.id&&typeof child.text==='string')return [key,child.text];
      if(key==='temporaryMeaning'&&child?.completePassageRef){assert(sources.has(child.completePassageRef),'Meaning reference resolves');return [key,sources.get(child.completePassageRef)];}
      return [key,restore(child)];
    }));
  };
  return restore(value);
}

export function horoscopeRequestMeaningPassages(input) {
  const passages=[];
  const visit=value=>{
    if(Array.isArray(value))return value.forEach(visit);
    if(!value||typeof value!=='object')return;
    if(value.temporaryMeaning?.id&&typeof value.temporaryMeaning.text==='string')passages.push(value.temporaryMeaning);
    Object.values(value).forEach(visit);
  };
  for(const label of ['GOVERNED PERIOD DEVELOPMENTS','PRIVATE MONTHLY SYNTHESIS']){
    const match=input.match(new RegExp(`${label}\n([^\n]+)\n\n`,'u'));
    if(match)visit(JSON.parse(match[1]));
  }
  return passages;
}

export function resolveHoroscopeRequestPassage(input,passage) {
  if(!passage.completePassageRef)return passage.text;
  const match=input.match(/(?:DAILY|WEEKLY) COMPLETE SOURCE PASSAGES\n([^\n]+)\n\n/u);
  assert(match,'Full-source index is present');
  const source=JSON.parse(match[1]).find(p=>p.id===passage.completePassageRef);
  assert(source,'Complete passage reference resolves');
  assert.equal(createHash('sha256').update(source.text).digest('hex'),source.sha256);
  return source.text;
}

// Inspect the provider-bound request, not just the selected primary source list.
export function assertHoroscopeRequestEvidence(input, additionalLabels=[]) {
  assert(!input.includes('register-gold:sky-placement:saturn-capricorn-v3'));
  assert(!input.includes('Saturn stands at the threshold where a choice becomes a consequence.'));
  if(/(?:DAILY|WEEKLY) COMPLETE SOURCE PASSAGES\n/u.test(input)) {
    const sources=JSON.parse(input.match(/(?:DAILY|WEEKLY) COMPLETE SOURCE PASSAGES\n([^\n]+)\n\n/u)[1]);
    assert.equal(new Set(sources.map(p=>p.id)).size,sources.length);
    assert.equal(new Set(sources.map(p=>p.text)).size,sources.length,'Transport serializes each distinct complete body once');
    for(const p of sources)assert.equal(createHash('sha256').update(p.text).digest('hex'),p.sha256);
    const used=new Set();
    const visit=value=>{
      if(Array.isArray(value))return value.forEach(visit);
      if(!value||typeof value!=='object')return;
      if(value.completePassageRef){assert(!Object.hasOwn(value,'text'));assert(resolveHoroscopeRequestPassage(input,value).trim());used.add(value.completePassageRef);}
      for(const child of Object.values(value))visit(child);
    };
    for(const label of ['COMPLETE OWNER HOROSCOPES — PRIMARY PROSE EXAMPLES','SUPPORTING OWNER PASSAGES','SHARED FIVE-ROLE EVIDENCE','RELEVANT OWNER PASSAGES','SAME-FAMILY OWNER PASSAGES','REGISTER REFERENCE','AVAILABLE OWNER LINES',...additionalLabels]){
      const match=input.match(new RegExp(`${label}\\n([^\\n]+)\\n\\n`,'u'));
      if(match)visit(JSON.parse(match[1]));
    }
    assert.deepEqual([...used].sort(),sources.map(p=>p.id).sort(),'Every complete source retains a referencing role');
    return;
  }
  if(input.includes('COMPACT SEASONAL DEVELOPMENT PLAN\n')) {
    const passages=['SELECTED COMPLETE OWNER PASSAGES','SELECTED SUPPORTING OWNER PASSAGE',...additionalLabels].flatMap(label=>{
      const match=input.match(new RegExp(`${label}\\n([^\\n]+)\\n\\n`,'u'));
      return match?JSON.parse(match[1]):[];
    });
    assert(passages.length>=(input.includes('SCOPED REJECTED OWNER EVIDENCE')?1:3)&&passages.length<=5);
    assert.equal(new Set(passages.map(p=>p.textSha256)).size,passages.length);
    for(const p of passages){
      let text=p.text;
      if(p.profilePassageRef){
        assert.equal(p.profilePassageRef,'voiceGuidance/COMPLETE OWNER PREFERRED REVISION');
        text=input.match(/BEGIN COMPLETE OWNER PREFERRED REVISION\s*\n([\s\S]*?)\nEND COMPLETE OWNER PREFERRED REVISION/u)?.[1];
        assert(text,'Complete bounded profile passage resolves');
      }
      assert.equal(createHash('sha256').update(text).digest('hex'),p.textSha256);
      assert.equal(input.split(p.profilePassageRef?text:JSON.stringify(text).slice(1,-1)).length-1,1,'Complete selected source appears once');
    }
    assert(!input.includes('SHARED FIVE-ROLE EVIDENCE\n'),'Full retrieval packet stays outside drafting');
    assert(!input.includes('CURRENT OWNER CORRECTIONS\n'),'Correction history stays outside drafting');
    return;
  }
  const packet=JSON.parse(input.match(/SHARED FIVE-ROLE EVIDENCE\n([^\n]+)\n\n/u)[1]);
  const passages=new Map();
  for(const label of ['COMPLETE OWNER COLLECTIVE ESSAYS — PRIMARY PROSE EVIDENCE','SUPPORTING OWNER PASSAGES','COMPLETE SEASONAL OWNER PROSE EVIDENCE',...additionalLabels]){
    const match=input.match(new RegExp(`${label}\\n([^\\n]+)\\n\\n`,'u'));
    if(match)for(const passage of JSON.parse(match[1]))passages.set(passage.id,passage);
  }
  for(const p of horoscopeRequestMeaningPassages(input))passages.set(p.id,p);
  const entries=new Map(packet.entries.map(e=>[e.id,e]));
  assert.equal(entries.size,packet.entries.length,'Evidence identities are unique');
  const resolve=(e,visited=new Set())=>{
    if(e.completePassageRef){assert(passages.has(e.completePassageRef),'Full passage reference resolves');return passages.get(e.completePassageRef).text;}
    if(e.evidenceRef){assert(!visited.has(e.evidenceRef),'References have no cycles');visited.add(e.evidenceRef);assert(entries.has(e.evidenceRef),'Evidence reference resolves');return resolve(entries.get(e.evidenceRef),visited);}
    assert.equal(typeof e.text,'string');return e.text;
  };
  for(const [role,refs] of Object.entries(packet.roles)){
    // Phrase lookup is required, but unmatched future-season themes may return
    // no phrases. The production evidence policy checks this conditional role.
    if(role!=='phrase')assert(refs.length,`${role} evidence remains available`);
    for(const ref of refs){assert(!Object.hasOwn(ref,'text'),'Role index never duplicates prose');assert.equal(entries.get(ref.evidenceRef)?.role,role);assert(resolve(ref).trim());}
  }
  const texts=packet.entries.filter(e=>e.text).map(e=>e.text);
  assert.equal(new Set(texts).size,texts.length,'All shared evidence text is serialized once');
  for(const e of packet.entries)assert(resolve(e).trim());
  for(const e of packet.supportingArgumentCandidates??[])assert(resolve(e).trim());
  for(const p of passages.values())assert.equal(input.split(JSON.stringify(p.text).slice(1,-1)).length-1,1,'Complete owner source occurs once, byte-for-byte');
}
