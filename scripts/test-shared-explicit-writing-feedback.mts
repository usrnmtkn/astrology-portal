import { ingressWriterFixture } from './fixtures/ingress-writer-context.mts';
import assert from 'node:assert/strict';
import {generateWithOpenAI,generateWithClaude,generateSkyArticleTemplateSlots} from '../api/_lib/content-generation.js';
import {buildPersonalTransitWriterContext} from '../api/_lib/personal-transit-writer-context.js';
import {syntheticTransitSources} from './fixtures/personal-transit-writing.mjs';
import {encodedSynastryVoice,installSyntheticSynastryApproval} from '../tests/fixtures/synastry-approved-voice.cjs';
const restoreApprovalFixture=installSyntheticSynastryApproval();

Object.assign(process.env,{NODE_ENV:'test',OPENAI_API_KEY:'synthetic',ANTHROPIC_API_KEY:'synthetic',
 PRIVATE_REPORT_DOCUMENTS:encodedSynastryVoice(),
 SUPABASE_URL:'https://writing-feedback.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic',STUDIO_MEMORY_FEEDBACK_ENABLED:'true',
 WRITING_KERNEL_GOVERNED_SURFACES:'',WRITING_KERNEL_SKY_GLOBAL_ENABLE:'0',WRITING_KERNEL_SKY_CANARY_PERCENT:'0'});
const ingress = await ingressWriterFixture();
const correction=(id:string,target:string)=>({id,version:1,status:'active',kind:'rejection',target_keys:[target],
 rejected_text:`PRIVATE rejected synthetic passage ${id}.`,owner_reason:`PRIVATE exact owner reason ${id}.`,source_roles:null,
 source_uri:'thread:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',source_date:'2026-10-21T05:00:00Z'});
const rows=[correction('all','writing/all'),correction('synastry','writing/synastry'),correction('personal','writing/personal-transit'),
 correction('sky','writing/sky'),correction('monthly','horoscope/monthly')];
const originalFetch=globalThis.fetch;let sent='',calls=0,outage=false;
try{
 globalThis.fetch=async(url,init={})=>{
  if(String(url)==='https://writing-feedback.invalid/rest/v1/rpc/studio_memory_active_snapshot')
   return outage?Response.json({}, {status:503}):Response.json([{snapshot:{rows:[],writingFeedback:rows}}]);
  if(!['https://api.openai.com/v1/responses','https://api.anthropic.com/v1/messages'].includes(String(url)))throw Error('External network forbidden');
  const request=JSON.parse(String(init.body));calls++;
  if(request.text?.format?.name==='tldr_astro_meaning_plan')return Response.json({output_text:JSON.stringify({core_tension:'Person A and Person B respond to the synthetic contact.'})});
  sent=request.input??request.messages[0].content[0].text;
  return Response.json({error:{message:'synthetic writer boundary stop'}},{status:422});
 };
 const synastry={contentKey:'fallback-hook/synastry-pair/moon/venus/conjunction',surface:'synastry' as const,mode:'article' as const,
  eventType:'aspect',facts:{planetA:'moon',planetB:'venus',aspect:'conjunction'},knowledgeIds:['synastry-moon-conjunction-venus']};
 for(const writer of [generateWithOpenAI,generateWithClaude]){
  sent='';await assert.rejects(writer(synastry),/synthetic writer boundary stop/u);
  assert(sent.includes(rows[0].owner_reason));assert(sent.includes(rows[1].rejected_text));
  assert(!sent.includes(rows[2].owner_reason));assert(!sent.includes(rows[4].rejected_text));
  assert(!sent.includes('End with one practical move'));assert(!sent.includes('sentence 2 names the warning'));
  const before=calls;outage=true;await assert.rejects(writer(synastry),/feedback could not load/u);outage=false;
  assert.equal(calls,before,'Storage failure precedes both planner and writer');
 }
 const square=correction('moon-mercury-square','fallback-hook/synastry-pair/moon/mercury/square');
 rows.push(square,correction('other-pair','fallback-hook/synastry-pair/moon/saturn/square'));
 const family={...synastry,contentKey:'fallback-hook/synastry-pair/moon/mercury/hard',facts:{planetA:'Mercury',planetB:'Moon',aspect:'hard',aspectFamilyMembers:['square','opposition']}};
 for(const writer of [generateWithOpenAI,generateWithClaude]){
  sent='';await assert.rejects(writer(family),/synthetic writer boundary stop/u);
  assert(sent.includes(square.rejected_text));assert(sent.includes(square.owner_reason));
  assert(sent.includes(square.target_keys[0]));assert(sent.includes('exact original target'));
  assert(!sent.includes('PRIVATE exact owner reason other-pair.'));
 }
 const contact={contentKey:'authored/transit-aspect/neptune/jupiter/trine',transiting:'neptune',natal:'jupiter',aspect:'trine',
  requested:['you','friend'],instruction:'',record:{contentKey:'authored/transit-aspect/neptune/jupiter/trine'},youText:'',friendText:'',facts:{}};
 const personalTransitContext=buildPersonalTransitWriterContext(contact,syntheticTransitSources());
 const fixtures=[{templateKey:contact.contentKey,templateBody:'',planet:'neptune',sign:'base',surface:'you' as const,eventType:'transit-aspect',
  knowledgeIds:['transit-aspect/neptune/jupiter/trine'],facts:{transiting:'neptune',natal:'jupiter',aspect:'trine',housesExcluded:true,signsExcluded:true},
  requestedSlots:[{name:'youDraft'},{name:'friendDraft'}],personalTransitContext},
 {templateKey:'sky/article-template/sun/libra',templateBody:'{{articleBody}}',planet:'sun',sign:'libra',
  ...ingress, requestedSlots:[{name:'articleBody'}]}];
 for(const fixture of fixtures)for(const provider of ['openai','claude'] as const){
  sent='';await assert.rejects(generateSkyArticleTemplateSlots({...fixture,provider,writingMemory:null}),/synthetic writer boundary stop/u);
  assert(sent.includes(rows[0].owner_reason));assert(sent.includes(rows[fixture.surface==='you'?2:3].rejected_text));
  assert(!sent.includes(rows[1].owner_reason));assert(!sent.includes(rows[4].owner_reason));
  assert(sent.includes('CURRENT OWNER WRITING CORRECTIONS'));assert(sent.includes('never positive voice examples'));
 }
}finally{globalThis.fetch=originalFetch;restoreApprovalFixture();}
console.log('PASS actual Synastry, Personal Transit and Sky template provider boundaries receive scoped complete feedback; storage failures stop before paid requests. All network intercepted; no prose generated.');
