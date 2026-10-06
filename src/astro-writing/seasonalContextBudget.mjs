const sections={
  'GOVERNED SEASONAL FACTS':'astrologyFacts',
  'CURRENT SEASONAL WRITING INSTRUCTIONS':'currentRules',
  'SELECTED COMPLETE OWNER PASSAGES':'ownerPassages',
  'SELECTED SUPPORTING OWNER PASSAGE':'ownerPassages',
  'COMPACT SEASONAL DEVELOPMENT PLAN':'developmentPlan'
};
/** Characters are exact UTF-16 string lengths. Tokens are a labeled estimate,
 * never provider usage. Include system instructions and schema in the total.
 */
export function seasonalContextBudget({input,instructions='',schema={}}) {
  const counts={astrologyFacts:0,currentRules:0,ownerPassages:0,developmentPlan:0,schemaAndMetadata:instructions.length+JSON.stringify(schema).length};
  let accounted=0;
  for(const [label,section] of Object.entries(sections)){
    const marker=label+'\n';const at=input.indexOf(marker);
    if(at<0)continue;
    const boundaries=[...Object.keys(sections),'AUDIENCE','OWNER-APPROVED WRITING PLAN','FACT BOUNDARIES','DRAFT INPUT RECEIPT'];
    const end=input.slice(at+marker.length).search(new RegExp(`\\n\\n(?=(?:${boundaries.join('|')})\\n)`,'u'));
    const length=end<0?input.length-at:marker.length+end+2;
    counts[section]+=length;accounted+=length;
  }
  counts.schemaAndMetadata+=input.length-accounted;
  const measure=characters=>({characters,estimatedTokens:Math.ceil(characters/4)});
  return {version:'seasonal-context-size/v1',method:'Exact character count; estimated tokens = characters / 4 rounded up. Provider usage is recorded separately.',
    sections:Object.fromEntries(Object.entries(counts).map(([name,count])=>[name,measure(count)])),
    total:measure(input.length+instructions.length+JSON.stringify(schema).length)};
}
