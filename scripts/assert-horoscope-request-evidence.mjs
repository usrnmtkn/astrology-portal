import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Inspect the provider-bound request, not just the selected primary source list.
export function assertHoroscopeRequestEvidence(input, additionalLabels=[]) {
  assert(!input.includes('register-gold:sky-placement:saturn-capricorn-v3'));
  assert(!input.includes('Saturn stands at the threshold where a choice becomes a consequence.'));
  if(input.includes('COMPACT SEASONAL DEVELOPMENT PLAN\n')) {
    const passages=['SELECTED COMPLETE OWNER PASSAGES','SELECTED SUPPORTING OWNER PASSAGE',...additionalLabels].flatMap(label=>{
      const match=input.match(new RegExp(`${label}\\n([^\\n]+)\\n\\n`,'u'));
      return match?JSON.parse(match[1]):[];
    });
    assert(passages.length>=(input.includes('SCOPED REJECTED OWNER EVIDENCE')?1:3)&&passages.length<=5);
    assert.equal(new Set(passages.map(p=>p.textSha256)).size,passages.length);
    for(const p of passages){
      assert.equal(createHash('sha256').update(p.text).digest('hex'),p.textSha256);
      assert.equal(input.split(JSON.stringify(p.text).slice(1,-1)).length-1,1,'Complete selected source appears once');
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
  for(const p of passages.values())assert.equal(input.split(JSON.stringify(p.text).slice(1,-1)).length-1,1,'Complete owner source occurs once, byte-for-byte');
}
