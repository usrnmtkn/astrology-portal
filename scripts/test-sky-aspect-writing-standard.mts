import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import handler from '../api/generate-content.js';
import { REVIEW_FIELDS } from '../src/astro-writing/canonicalInstructions.mjs';
import { RHETORICAL_LABELS, RHETORICAL_WRITER_POLICY } from '../src/astro-writing/rhetoricalPatterns.mjs';
import { SKY_ASPECT_WRITING_STANDARD, SKY_ASPECT_STANDARD_SHA256, isCollectiveSkyAspectInput } from '../src/astro-writing/skyAspectEditorialAuthority.cjs';
import { governedInstructionsForRole } from '../src/astro-writing/openAIResponses.cjs';
import { runStudioSkyWriting } from '../api/_lib/sky-studio-writing.js';

const require = createRequire(import.meta.url);
const generator = require('../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js');
const { lintCard } = require('../packages/astro-knowledge/scripts/lint-sky-voice.js');
const { buildJudgePrompt } = require('../packages/astro-knowledge/scripts/judge-sky-voice.js');
const standard = readFileSync('docs/writing/SKY_CALENDAR_ASPECT_STANDARD.md', 'utf8');
assert.equal(SKY_ASPECT_WRITING_STANDARD, standard);
assert.equal(createHash('sha256').update(standard).digest('hex'), SKY_ASPECT_STANDARD_SHA256);
assert.equal(SKY_ASPECT_STANDARD_SHA256, 'b44b58dcaccfd78b85d9a37109e2a974394cc006c2e66f835d24819238ff8e13');
Object.assign(process.env, { NODE_ENV:'test', CONTENT_GENERATION_SECRET:'synthetic-aspect-secret',
  OPENAI_API_KEY:'synthetic', ANTHROPIC_API_KEY:'synthetic', STUDIO_MEMORY_FEEDBACK_ENABLED:'false',
  WRITING_KERNEL_GOVERNED_SURFACES:'', WRITING_KERNEL_SHADOW_SURFACES:'', WRITING_KERNEL_SKY_GLOBAL_ENABLE:'0', WRITING_KERNEL_SKY_CANARY_PERCENT:'0' });
const body = 'People compare the information they were given. A question can reveal a difference in what they understood, without making either person wrong.';
let nextDraft: any;
const requests: any[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const openai = String(url) === 'https://api.openai.com/v1/responses';
  assert(openai || String(url) === 'https://api.anthropic.com/v1/messages', 'No storage or unexpected network calls.');
  const request = JSON.parse(String(init.body));
  requests.push({provider:openai?'openai':'claude', request});
  const kind = openai ? request.text?.format?.name : request.tools?.[0]?.name;
  let result: unknown = nextDraft;
  if (!kind) return Response.json(openai ? {output_text:body} : {content:[{type:'text',text:body}]});
  if (kind === 'tldr_astro_meaning_plan') result = {core_tension:'The supplied planets interact through the supplied aspect.',what_changes:'',constructive_expression:'',overcorrection:'',observable_behaviors:[],possible_consequences:[]};
  if (kind === 'tldr_astro_cold_rendered_prose_review') result = {decision:'PASS',cold_rendered_prose:{status:'PASS',reason:'Synthetic contract fixture.'},violations:[]};
  if (kind === 'tldr_astro_marie_review') result = {decision:'PASS',violations:[],
    ...Object.fromEntries(REVIEW_FIELDS.map(key=>[key,{status:'PASS',reason:'Synthetic contract fixture.'}])),
    rhetoric:{checks:RHETORICAL_LABELS.map(label=>({label,outcome:'pass',reason:'Synthetic contract fixture.'})),findings:[]}};
  return Response.json(openai ? {id:'synthetic',output_text:JSON.stringify(result)} : {id:'synthetic',content:[{type:'tool_use',name:kind,input:result}]});
};
const forbidden = ['SHAPE — hit all 8 beats','Two short paragraphs. It ends on ONE quotable pair','End on one concrete truth, then a catch','the warmth beat is exactly one sentence','Build pressure, movement, and consequence inside one charged sequence.','SPINE QUALITY GATES','PRIMARY NATAL PLACEMENT PRIMITIVES','Use a specific situation, a direct consequence, a useful next move,'];
function checkWriter(provider: string, request: any) {
  const system = provider === 'openai' ? request.instructions : request.system;
  const prompt = provider === 'openai' ? request.input : (request.messages[0].content?.[0]?.text ?? request.messages[0].content);
  const combined = system+'\n'+prompt;
  assert.equal(combined.split(standard).length-1,1,'Complete exact owner standard arrives once.');
  assert.equal(combined.split(RHETORICAL_WRITER_POLICY).length-1,1,'Complete shared rhetoric policy arrives once.');
  assert.equal(combined.split('# Effective TLDR Astro writing rules').length-1,1,'One scoped effective-rule layer.');
  for (const conflict of forbidden) assert(!combined.includes(conflict), `Conflicting instruction: ${conflict}`);
  assert(combined.includes('no required concluding') || combined.includes('does not need to finish with advice'));
  assert(combined.includes('Do not use "fair," "fairer," "whether,"'));
  assert(combined.includes('Mean and True Black Moon Lilith'));
}
async function generate(input: any, authorized=true) {
  const res = {statusCode:0,result:{} as any,setHeader(){},end(value:string){this.result=JSON.parse(value);}};
  await handler({method:'POST',headers:authorized?{authorization:'Bearer synthetic-aspect-secret'}:{},body:input} as any,res as any);
  return res;
}
try {
  for (const provider of ['openai','claude']) for (const aspect of ['conjunction','sextile','square','trine','opposition']) {
    const input = {contentKey:`fixture/sky-mercury-${aspect}-saturn`,surface:'sky',mode:'feed',eventType:'aspect',provider,save:false,
      headline:`Mercury ${aspect} Saturn`,knowledgeIds:[`sky-mercury-${aspect}-saturn`],
      facts:{blockType:'sky_aspect',planetA:'Mercury',planetB:'Saturn',aspect},
      sourceSnapshot:{meaning:'Complete synthetic aspect source, including its final sentence.'}};
    nextDraft = {headline:input.headline,tldr:'People compare the information.',summary:body,body,action:'',timing:'',sections:[],
      sceneLock:{sceneType:'conversation',sceneArena:'A possible conversation',currentPressure:'Comparing information',personalSensitivity:'',chosenScene:'A possible exchange, not a verified event.',excludedMeanings:['Missing signs, timing and biography']},
      astrologyDrilldown:{title:'Why this?',summary:'Only the supplied collective contact.',factors:[
        {label:'Mercury',technicalFact:'Mercury is supplied.',plainMeaning:'Information and communication.'},
        {label:'Saturn',technicalFact:'Saturn is supplied.',plainMeaning:'Responsibility and limits.'},
        {label:aspect,technicalFact:`The supplied aspect is ${aspect}.`,plainMeaning:'The supplied interaction.'}],whyThisScene:'The supplied contact supports this possible exchange.',timingNote:''}};
    const start=requests.length; const res=await generate(input); assert.equal(res.statusCode,200,JSON.stringify(res.result));
    const writer=requests.slice(start).find(x=>x.request.text?.format?.name==='tldr_astro_generated_content'||x.request.tools?.[0]?.name==='tldr_astro_generated_content');assert(writer);checkWriter(provider,writer.request);
    const prompt=provider==='openai'?writer.request.input:writer.request.messages[0].content[0].text;
    assert(prompt.includes(JSON.stringify(input.facts,null,2)));assert(prompt.includes(input.sourceSnapshot.meaning));
    assert.equal(res.result.content?.ownerApproved ?? res.result.generated?.ownerApproved ?? false,false);
  }
  // The actual CMS generator's two provider transports, not a replacement prompt builder.
  for (const provider of ['openai','claude']) {
    process.env.CONTENT_GENERATION_PROVIDER=provider;process.env.CONTENT_GENERATION_PROVIDER_SKY_ASPECT=provider;
    const prompt=generator.buildPrompt({a:'sun',b:'pluto',aspect:'opposition',signA:'leo',signB:'aquarius'});
    for (const conflict of forbidden) assert(!prompt.includes(conflict));
    const start=requests.length;await generator.generate(prompt);checkWriter(provider,requests[start].request);
    const judgeStart=requests.length;await generator.generateJudge(buildJudgePrompt(body));checkWriter(provider,requests[judgeStart].request);
    const serviceStart=requests.length;
    const saved=await runStudioSkyWriting('sky.aspect.sun.opposition.pluto.leo.aquarius','generate','');
    checkWriter(provider,requests[serviceStart].request);assert.equal(saved.text,body);
    assert(requests[serviceStart].request.input?.includes('TLDR ASTRO MEMORY') || requests[serviceStart].request.messages?.[0]?.content.includes('TLDR ASTRO MEMORY'));
    const recheckCount=requests.length;
    const rechecked=await runStudioSkyWriting('sky.aspect.sun.opposition.pluto.leo.aquarius','recheck',body);
    assert.equal(rechecked.text,body);assert.equal(requests.length,recheckCount,'Saved text recheck makes no writer call.');
  }
  const one=lintCard(body);assert.equal(one.fails,0,'A complete single paragraph has no shape failure.');
  const three=lintCard(['People compare the information.','A question adds context.','They understand the answer.'].join('\n\n'));
  assert.equal(three.fails,0,'No paragraph quota.');
  assert.equal(three.findings.find((finding: any)=>finding.term==='paragraph-count')?.reason,
    'Paragraph breaks are your editorial choice.','Keep the saved-editor paragraph advice without suggesting a quota.');
  assert.equal(lintCard(body,{mode:'collective-placement-card'}).fails>0,true,'Existing placement shape stays scoped.');
  const candidate=await generator.generateCard({a:'sun',b:'pluto',aspect:'opposition',signA:'leo',signB:'aquarius'},{maxRetries:1,generateFn:async()=>body});
  assert.equal(candidate.text,body);assert.equal(candidate.attempts,1);
  const judge=buildJudgePrompt(body);for(const conflict of forbidden)assert(!judge.includes(conflict));assert(judge.includes('CONTENT FAMILY\nsky-aspect'));
  for (const surface of ['natal','synastry','you','horoscopes']) {
    assert.equal(isCollectiveSkyAspectInput({surface,eventType:'aspect',facts:{blockType:'sky_aspect'}}),false);
    assert(!governedInstructionsForRole('WRITER',{surface,family:'aspect'}).includes(standard));
  }
  const count=requests.length;assert.equal((await generate({surface:'sky',mode:'feed',eventType:'aspect',facts:{}},false)).statusCode,401);assert.equal(requests.length,count);
  console.log('PASS Sky/Calendar standard: exact owner source, 10 actual-handler provider cases, both CMS provider transports, full source/fact delivery, optional endings/paragraphs, retained scope/schema/owner boundary. All provider responses intercepted; zero paid calls.');
} finally {globalThis.fetch=originalFetch;}
