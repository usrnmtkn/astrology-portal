/** Owner-requested, portable text only. Credentials and transport metadata are
 * deliberately outside this allowlist. Source passages stay complete. */
export function writingExport({title,requests,notes=[]}) {
  if(!title||!Array.isArray(requests)||!requests.length)throw new Error('No complete writing input is available to export.');
  const sections=requests.map(({label,instructions,input,schema})=>{
    if(typeof instructions!=='string'||!instructions.trim()||typeof input!=='string'||!input.trim())throw new Error('The writing input is incomplete.');
    return [`## ${label}`,'### Writing instructions',instructions,'### Writing material',input,
      ...(schema?['### Output format',JSON.stringify(schema,null,2)]:[])].join('\n\n');
  });
  const introduction=[`# ${title}`,...notes,...(requests.length>1?['Complete every included writing unit, in order. Return each result under its unit heading with that unit’s requested output fields.']:[])].join('\n\n')+'\n\n';
  let text=introduction;
  const units=sections.map((section,index)=>{const start=text.length;text+=section+(index===sections.length-1?'\n':'\n\n');return {label:requests[index].label,start,end:text.length};});
  return {schema:'studio-writing-export/v1',title,text,units,introLength:introduction.length,requestCount:requests.length,providerCalls:0,saved:false,published:false};
}

export function unapprovedWritingInput(input) {
  return input.replace('OWNER-APPROVED WRITING PLAN\n','WRITING PLAN FOR REVIEW\n')
    .replace('OWNER-REVIEWED ARGUMENT\n','ARGUMENT FOR REVIEW\n');
}
