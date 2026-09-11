import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
const env={NODE_ENV:'test', CONTENT_GENERATION_SECRET:'editorial-test', SUPABASE_URL:'https://editorial.invalid', SUPABASE_SERVICE_ROLE_KEY:'fixture'};
Object.assign(process.env,env);
const {default: generated}=await import('../api/admin/generated-content.ts');
const {default: publication}=await import('../api/admin/content-publication.ts');
const {default: personal}=await import('../api/admin/user-generated-content.ts');
Object.assign(process.env,env);
const original=globalThis.fetch;
let calls=0;
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',expectedUpdatedAt='2026-09-11T05:00:00Z';
async function invoke(handler:any,method:string,body:unknown){
 const req=Object.assign(Readable.from([JSON.stringify(body)]),{method,url:'/api/admin/generated-content',headers:{'x-content-generation-secret':env.CONTENT_GENERATION_SECRET}});
 const res={statusCode:0,result:{} as any,setHeader(){},end(s:string){this.result=JSON.parse(s)}};
 await handler(req,res);return {status:res.statusCode,...res.result};
}
try{
 globalThis.fetch=async()=>{calls++;throw new Error('No storage call allowed for contaminated input');};
 for(const payload of [
  {headline:'Templated article — Example (needs_review)'},
  {body:'# Example\nComplete opening.\n## Status\nneeds_review'},
  {summary:'REVIEWED · authored-content · composite'},
  {body:'activation_condition resolves as interpretive from transit/planet-through-house.'},
  {sections:{byMode:{feed:{summary:'CONFIRMED · internal-batch'},in_depth:{summary:'REVIEWED · internal-batch'}}}},
  {sections:{packageDraft:{body_you:'Paragraph. (Engine note: skip ruler.)'}}},
  {sections:{packageRecord:{body_they:'{{risingBlocks: generate twelve sections}}'}}}
 ]){
  const result=await invoke(generated,'PATCH',{id,expectedUpdatedAt,...payload});
  assert.equal(result.status,400,JSON.stringify(result));assert.match(result.error,/Internal drafting notes/);assert.equal(calls,0);
 }
 const bulk=await invoke(generated,'POST',{rows:[{contentKey:'cms/example/a',body:'Complete approved copy.'},{contentKey:'cms/example/b',body:"Here's your revised article: Example."}]});
 assert.equal(bulk.status,400);assert.equal(calls,0,'whole batch rejects before first write');
 const personalResult=await invoke(personal,'PATCH',{id,expectedUpdatedAt,body:'Drafting notes: rewrite later.'});
 assert.equal(personalResult.status,400);assert.equal(calls,0);
 globalThis.fetch=async()=>{calls++;return Response.json([{id,updated_at:expectedUpdatedAt,content_key:'cms/example/a',status:'LIVE',lane:'serving',body:'Copy. (Engine note: skip ruler.)'}]);};
 const result=await invoke(publication,'POST',{action:'publish',id,contentKey:'cms/example/a',expectedUpdatedAt});
 assert.equal(result.status,422);assert.equal(calls,1,'no publication RPC after existing-copy rejection');
 console.log('PASS single, nested, bulk and personalized API writes reject drafting notes; saved publication rejects before RPC');
}finally{globalThis.fetch=original;}
