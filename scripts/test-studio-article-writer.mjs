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
 assert.match(ui,/adminCredentialHeaders\(credential\)/u,'AI writer must send the current Content Studio credential.');
 assert.match(ui,/rows=\{4\}[\s\S]{0,120}minHeight: 96/u,'AI direction field must stay compact enough to keep the generate action visible.');
 assert.match(ui,/className="admin-primary-button"[\s\S]{0,180}Generate revision/u,'AI writer must expose a visible primary generate action.');
 console.log('Article writer passed: provider prompt delivery, correction memory, authenticated browser action, and visible compact controls.');
}finally{delete process.env.STUDIO_MEMORY_FEEDBACK_ENABLED;}
