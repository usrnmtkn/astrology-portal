/** Monthly transport only. Preserve the original facts/receipts and every
 * meaning binding; references resolve to complete text in the same request. */
function meaningReferences(values) {
  const counts=new Map(),sources=new Map(),ids=new Set();
  const visit=(value,fn)=>{
    if(Array.isArray(value))value.forEach(v=>visit(v,fn));
    else if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){
      if(key==='id'&&typeof child==='string')ids.add(child);
      if(key==='temporaryMeaning'&&typeof child==='string'&&child)fn(child);
      else visit(child,fn);
    }
  };
  values.forEach(value=>visit(value,text=>counts.set(text,(counts.get(text)??0)+1)));
  const project=value=>{
    if(Array.isArray(value))return value.map(project);
    if(!value||typeof value!=='object')return value;
    const result={};
    for(const [key,child] of Object.entries(value)){
      if(key==='temporaryMeaning'&&counts.get(child)>1){
        const existing=sources.get(child);
        if(existing)result[key]={completePassageRef:existing.id};
        else {
          let index=sources.size+1;
          while(ids.has(`monthly-meaning:${index}`))index++;
          const source={id:`monthly-meaning:${index}`,text:child};ids.add(source.id);
          sources.set(child,source);result[key]=source;
        }
      }else result[key]=project(child);
    }
    return result;
  };
  const projected=values.map(project);
  // A meaning packet entry can have the same body with a different source role.
  // Keep all of that entry's metadata; sharing text transfers no authority.
  const packet=projected.find(v=>v?.roles&&Array.isArray(v.entries));
  if(packet)packet.entries=packet.entries.map(entry=>{
    const source=sources.get(entry.text);
    if(!source)return entry;
    const {text,...metadata}=entry;
    return {...metadata,completePassageRef:source.id};
  });
  return projected;
}

/** Only our generated JSON sections are projected, never saved guidance,
 * complete comparisons, corrections, candidate prose or arbitrary JSON in them. */
export function monthlyRequestInput(input,{phase,profile}={}) {
  if(!['synthesis','draft'].includes(phase))return input;
  const fields=['voiceGuidance','sourceGuidance','structure','prompt'];
  if(phase==='draft'&&!fields.every(key=>typeof profile?.[key]==='string'))return input;
  const allLabels={
    'MONTHLY FACTS AND PLAN SCOPE':v=>v?.windowPeriod==='monthly'&&v.factsById&&Array.isArray(v.planetaryArcs),
    'GOVERNED PERIOD DEVELOPMENTS':v=>v?.period==='monthly'&&v.factsById,
    'PRIVATE MONTHLY SYNTHESIS':v=>typeof v?.thesis==='string'&&Array.isArray(v.stories)&&typeof v.readingMovement==='string'&&typeof v.endingChange==='string',
    'SHARED FIVE-ROLE EVIDENCE':v=>v?.roles&&Array.isArray(v.entries)
  };
  const labels=Object.fromEntries(Object.entries(allLabels).filter(([label])=>
    (label==='MONTHLY FACTS AND PLAN SCOPE')===(phase==='synthesis')));
  // Saved field values and literal prompt examples are opaque source text.
  // Locate them before parsing so owner examples cannot become fact sections.
  const protectedText=phase==='draft'?fields.map(key=>profile[key]).filter(Boolean):[];
  if(phase==='draft')protectedText.push(...profile.prompt.split(/\{\{[^{}]*\}\}/u)
    .filter(text=>Object.keys(allLabels).some(label=>text.includes(label))));
  const protectedRanges=[];
  for(const text of protectedText){
    let from=0,start;
    while((start=input.indexOf(text,from))!==-1){
      protectedRanges.push({start,end:start+text.length});from=start+text.length;
    }
  }
  const original=input;
  const sections=[];
  for(const [label,accepts] of Object.entries(labels)){
    const matches=[];
    const boundary=phase==='synthesis'?'^':'(?:^|\\n)';
    for(const match of input.matchAll(new RegExp(`${boundary}${label}\\n([^\\n]+)`,'gu'))){
      const end=match.index+match[0].length;
      if(protectedRanges.some(range=>match.index<range.end&&end>range.start))continue;
      let value;try{value=JSON.parse(match[1]);}catch{continue;}
      if(!accepts(value))continue;
      const start=match.index+match[0].length-match[1].length;
      matches.push({start,end:start+match[1].length,value});
    }
    if(matches.length>1)throw new Error(`Ambiguous Monthly request section: ${label}. Keep saved comparisons separate from generated facts.`);
    sections.push(...matches);
  }
  sections.sort((a,b)=>a.start-b.start);
  const projected=meaningReferences(sections.map(s=>s.value));
  for(let i=sections.length-1;i>=0;i--){
    const section=sections[i];
    input=input.slice(0,section.start)+JSON.stringify(projected[i])+input.slice(section.end);
  }
  for(const text of protectedText){
    if(original.includes(text)&&!input.includes(text))throw new Error('Monthly projection changed complete saved writing instructions.');
  }
  return input;
}

export function monthlyReviewEvidence(evidence) {
  const [engineFacts]=meaningReferences([evidence.engineFacts]);
  return {...evidence,engineFacts};
}
