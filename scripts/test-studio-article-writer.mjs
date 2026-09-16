import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateSkyArticleTemplateSlots } from '../api/_lib/content-generation.ts';
Object.assign(process.env,{STUDIO_MEMORY_FEEDBACK_ENABLED:'true',SUPABASE_URL:'https://studio-memory.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic',OPENAI_API_KEY:'synthetic',ANTHROPIC_API_KEY:'synthetic'});
const memory={id:'11111111-1111-4111-8111-111111111111',source_row_id:'22222222-2222-4222-8222-222222222222',
 content_key:'sky-article/saturn/aries/2026',family:'sky-article',before_text:JSON.stringify({body:'Synthetic rejected article.'}),after_text:JSON.stringify({body:'Synthetic approved article replacement. Complete last sentence.'}),
 before_version:'2026-09-10T12:00:00Z',after_version:'2026-09-10T12:01:00Z',status:'active',scope:'passage',reason:'Synthetic reason',version:2,created_at:'2026-09-10T12:01:00Z',updated_at:'2026-09-10T12:02:00Z'};
const input={templateKey:'sky/article-template/saturn/ingress',templateBody:'# Synthetic article\n\n{{opener}}',planet:'saturn',sign:'aries',facts:{planet:'saturn',sign:'aries',entryYear:2026},requestedSlots:[{name:'opener',description:'Synthetic opener field.'}]};
const prompts=[];let unavailable=false;
globalThis.fetch=async(url,init={})=>{
 if(String(url)==='https://studio-memory.invalid/rest/v1/rpc/studio_memory_active_snapshot'){
   if(unavailable)throw Error('Synthetic memory outage');
   return Response.json([{snapshot:{rows:[memory]}}]);
 }
 const request=JSON.parse(init.body);
 if(String(url)==='https://api.openai.com/v1/responses'){
   prompts.push(request.input);return Response.json({id:'synthetic-response',output_text:JSON.stringify({slotValues:{opener:'Synthetic generated field.'}})});
 }
 if(String(url)==='https://api.anthropic.com/v1/messages'){
   prompts.push(request.messages[0].content[0].text);return Response.json({id:'synthetic-response',content:[{type:'tool_use',name:'tldr_astro_sky_article_template_slots',input:{slotValues:{opener:'Synthetic generated field.'}}}]});
 }
 throw Error(`Unexpected network request ${new URL(String(url)).origin}`);
};
try{
 for(const provider of ['openai','claude']){
   const result=await generateSkyArticleTemplateSlots({...input,provider});
   assert(prompts.at(-1).includes('Synthetic approved article replacement. Complete last sentence.'));
   assert(prompts.at(-1).includes("The template's fixed prose is immutable"));
   assert(prompts.at(-1).includes('Unchanged fields and unchanged wording are context, not rejected writing.'));
   assert(prompts.at(-1).includes('"changedFields":["body"]'));
   assert.equal(result.memoryReceipt.selected[0].version,2);
   assert(!JSON.stringify(result).includes('Synthetic approved article replacement'));
 }
 const count=prompts.length;unavailable=true;
 await assert.rejects(generateSkyArticleTemplateSlots({...input,provider:'openai'}),/Storage request failed/);
 assert.equal(prompts.length,count,'Memory outage must precede any paid request');
 const ui=fs.readFileSync(new URL('../apps/admin/src/SkyArticleAiWriter.tsx',import.meta.url),'utf8');
 const endpoint=fs.readFileSync(new URL('../api/admin/sky-article-writing.ts',import.meta.url),'utf8');
 const studioCss=fs.readFileSync(new URL('../apps/admin/src/studio-system.css',import.meta.url),'utf8');
 const studioTheme=fs.readFileSync(new URL('../apps/admin/src/admin-theme.css',import.meta.url),'utf8');
 assert.match(ui,/adminCredentialHeaders\(credential\)/u,'AI writer must send the current Content Studio credential.');
 assert.match(ui,/rows=\{4\}[\s\S]{0,120}className="admin-ai-writing-instruction"/u,'AI direction field must use the canonical compact textarea class.');
 assert.match(studioCss,/\.admin-ai-writing-instruction\s*\{[^}]*min-height:\s*var\(--studio-compact-textarea-height\)/u,'AI direction field compact sizing must live in Studio CSS.');
 assert.match(studioTheme,/--studio-compact-textarea-height:\s*96px/u,'AI direction field must preserve the approved 96px compact height token.');
 assert.match(ui,/className="admin-primary-button"[\s\S]{0,220}Generate evergreen revision/u,'Evergreen AI writer must expose a visible primary generate action.');
 assert.match(ui,/Open dated authored article generator/u,'Placement editor must expose the dated authored-article path.');
 assert.match(ui,/sky\/article-template\/\$\{planet\}\/\$\{sign\}/u,'Dated-article action must target the matching authored article template.');
 assert.match(endpoint,/occurrence-specific facts into the evergreen prose/u,'Evergreen generation must reject year-specific occurrence facts.');
 assert.match(endpoint,/currentSkyFacts\(referenceInstant\)/u,'Evergreen generation must validate the selected planet/sign from the current Sky calculation.');
 assert.doesNotMatch(endpoint,/skyArticleEditionFactsFromSnapshot/u,'Evergreen generation must not require the dated-edition sign-residency window.');
 assert.doesNotMatch(endpoint,/transitWindowPoints:\s*\[planet\]/u,'Evergreen generation must not request a full sign-residency window just to validate the selected sign.');
 assert.match(endpoint,/evergreen zodiac-season writing/u,'Sun sign generation must be explicitly scoped as zodiac-season writing.');
 assert.match(endpoint,/not for a person who has a natal Sun/u,'Sun season generation must explicitly reject natal-placement framing.');
 assert.match(endpoint,/first paragraph must explicitly anchor the copy/u,'Sun season generation must anchor the opening in the season or transit.');
 assert.match(endpoint,/Never use the word whether/u,'The owner banned word whether must reach the article-writing prompt.');
 assert.match(endpoint,/isRateLimitError/u,'Article writing must recognize provider rate limits.');
 assert.match(endpoint,/initialProvider === 'openai' \? 'claude' : 'openai'/u,'Unpinned article generation must switch providers when the primary provider is rate limited.');
 const deployment=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 const memoryConfig=JSON.parse(fs.readFileSync(new URL('../config/agent-memory-sources-v1.json',import.meta.url),'utf8'));
 for(const functionKey of ['api/admin/sky-article-writing.ts','api/admin/sky-article-template-slots.ts']){
   const pattern=deployment.functions[functionKey]?.includeFiles ?? '';
   assert.ok(pattern.length>0 && pattern.length<=256,`${functionKey} must have a deployable includeFiles pattern.`);
   assert.match(pattern,/data\/writing/u,`${functionKey} must package repository writing-memory sources.`);
   assert.match(pattern,/jsonl/u,`${functionKey} must package JSONL correction-memory files.`);
   const packaged=new Set(fs.globSync(pattern));
   for(const spec of memoryConfig.sources.filter(item=>item.kind==='correction')){
     assert(packaged.has(spec.path),`${functionKey} is missing configured correction source: ${spec.path}`);
   }
 }
 console.log('Article writer passed: provider prompt delivery, correction memory, authenticated browser action, visible controls, evergreen versus dated destinations, season/transit register enforcement, rate-limit fallback, sign-only evergreen validation, and deploy-safe correction-memory packaging.');
}finally{delete process.env.STUDIO_MEMORY_FEEDBACK_ENABLED;}
