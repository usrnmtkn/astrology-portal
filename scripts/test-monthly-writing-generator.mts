import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildMemoryIndex} from '../api/_lib/agent-memory.mjs';
import {generateMonthlyTemplatePhrases} from '../api/_lib/content-generation';
import {monthlyTemplateStarter} from '../src/monthly-writing/starter';
import {createMonthlyEdition,monthlyTargets,stableJson} from '../src/monthly-writing/model';
import {monthlyFixture} from '../tests/monthly-writing/fixtures';
import {selectMonthlyWritingMemory} from '../api/_lib/monthly-writing-memory';
const packaging=JSON.parse(fs.readFileSync('vercel.json','utf8')).functions['api/admin/monthly-writing.ts'].includeFiles;
assert(packaging.length<=256,'Vercel pattern stays within its supported limit');
const packaged=new Set(fs.globSync(packaging));
assert.deepEqual(buildMemoryIndex({root:process.cwd()}).sources.filter(source=>!packaged.has(source.path)).map(source=>source.path),[],'The deployed writer retains all memory-map sources');
const facts=monthlyFixture(),edition=createMonthlyEdition(facts,monthlyTemplateStarter());
const targetIds=['edition::openingSeasonFocus','edition::closingSeasonPractice'];
Object.assign(process.env,{OPENAI_API_KEY:'synthetic',ANTHROPIC_API_KEY:'synthetic',CONTENT_GENERATION_SECRET:'synthetic',STUDIO_MEMORY_FEEDBACK_ENABLED:'true',SUPABASE_URL:'https://monthly-memory.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic'});
const prompts:any[]=[];let outage=false,malformed=false,refuse=false;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init={})=>{
 const url=String(input);
 if(url==='https://monthly-memory.invalid/rest/v1/rpc/studio_memory_active_snapshot'){
  if(outage)throw Error('Synthetic memory outage');
  return Response.json([{snapshot:{rows:[]}}]);
 }
 if(!['https://api.openai.com/v1/responses','https://api.anthropic.com/v1/messages'].includes(url))throw Error('Test forbids other network requests');
 const request=JSON.parse(String(init.body));prompts.push(request);
 const values={phrase0:malformed?'A whole paragraph. This should fail.':'the fixture priorities',phrase1:'make the fixture change'};
 if(url.endsWith('/responses'))return Response.json(refuse?{output:[{content:[{type:'refusal',refusal:'Synthetic refusal'}]}]}:{id:'fixture',output_text:JSON.stringify({slotValues:values})});
 return Response.json({id:'fixture',content:[{type:'tool_use',name:'monthly_template_phrases',input:{slotValues:values}}]});
};
try{
 const before=stableJson(edition);
 for(const provider of ['openai','claude'] as const){
  const result=await generateMonthlyTemplatePhrases({facts,edition,library:[],targetIds,provider});
  assert.deepEqual(result.changes.map(item=>item.name),['openingSeasonFocus','closingSeasonPractice']);
  assert.equal(stableJson(edition),before,'No input changes or flattened templates');
  assert.equal(result.generation.ownerApproved,false);
  assert(result.generation.evidenceReceipt.ownerExampleKeys.length>=3);
  const prompt=JSON.stringify(prompts.at(-1));assert(prompt.includes('{{openingSeasonOpportunity}}'));assert(prompt.includes('MONTHLY WRITING CORRECTION MEMORY'));assert(prompt.includes('GOVERNED MEANING'));
  assert(!JSON.stringify(result).includes('rejected"'),'Receipt contains metadata, not correction text');
 }
 let count=prompts.length;outage=true;
 await assert.rejects(generateMonthlyTemplatePhrases({facts,edition,library:[],targetIds}),/Storage request failed/);assert.equal(prompts.length,count);outage=false;
 const locked=structuredClone(edition);locked.locked=targetIds;
 await assert.rejects(generateMonthlyTemplatePhrases({facts,edition:locked,library:[],targetIds}),/protected/);assert.equal(prompts.length,count);
 await assert.rejects(generateMonthlyTemplatePhrases({facts,edition,library:[],targetIds:['edition::monthlyOverview']}),/inactive/);assert.equal(prompts.length,count);
 malformed=true;await assert.rejects(generateMonthlyTemplatePhrases({facts,edition,library:[],targetIds}),/phrase/);malformed=false;
 refuse=true;await assert.rejects(generateMonthlyTemplatePhrases({facts,edition,library:[],targetIds}),/no phrase/);refuse=false;
 const memoryRecord=(id:string,family:string,bad:string,corrected:string)=>({id,kind:'correction',status:'current',family,body:`${bad} ${corrected}`,metadata:{bad,corrected},path:'fixture',line:1,bodySha256:id});
 const memory=selectMonthlyWritingMemory({revision:'fixture',fingerprint:'fixture',records:[memoryRecord('a','any','bad a','good a'),memoryRecord('b','sky-article','bad b','private article text'),memoryRecord('c','calendar-monthly','conflict','option one'),memoryRecord('d','calendar-monthly','conflict','option two')]} as any,facts);
 assert.deepEqual(memory.receipt.selected.map(item=>item.id),['a']);assert(!memory.prompt.includes('private article text'));assert(memory.receipt.excluded.some(item=>item.reason==='conflicting_corrections'));
 console.log('PASS monthly writer: real provider request builders mocked without charges; canonical meanings and exact owner examples; scoped memory, private-store outage before calls, leaf-only output, protected targets, strict result validation and no model publication.');
}finally{globalThis.fetch=originalFetch;delete process.env.STUDIO_MEMORY_FEEDBACK_ENABLED;}
