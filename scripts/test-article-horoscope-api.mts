import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
const env={NODE_ENV:'test',CONTENT_GENERATION_SECRET:'horoscope-test',SUPABASE_URL:'https://horoscope.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'};
Object.assign(process.env,env);
const {default:handler}=await import('../api/admin/generated-content.ts');
Object.assign(process.env,env);
const originalFetch=globalThis.fetch;
const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const opening='# Test Article\n\nComplete article opening.\n\nComplete article ending.';
const body=opening+'\n\n## Horoscopes\n\n'+signs.map(s=>`### ${s} & ${s} Rising\n\n${s} complete opening.\n\n${s} complete ending.`).join('\n\n');
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
let stored:any=null,writes=0;
async function invoke(method:string,payload?:unknown){
 const req=Object.assign(Readable.from(payload?[JSON.stringify(payload)]:[]),{method,url:'/api/admin/generated-content?status=all&visibility=all&scope=all',headers:{'x-content-generation-secret':env.CONTENT_GENERATION_SECRET}});
 const res={statusCode:0,result:{} as any,setHeader(){},end(s:string){this.result=JSON.parse(s)}};
 await handler(req as any,res as any);return {status:res.statusCode,...res.result};
}
try{
 globalThis.fetch=async(input,init={})=>{
  const url=new URL(String(input));assert.equal(url.origin,env.SUPABASE_URL,'All storage is isolated');
  assert.equal(url.pathname,'/rest/v1/generated_interpretations');
  if(init.method==='POST'){assert(!stored);writes++;stored={...JSON.parse(String(init.body)),id,updated_at:'2026-09-11T01:00:00Z'};return Response.json([stored]);}
  if(init.method==='PATCH'){
   assert.equal(url.searchParams.get('updated_at'),`eq.${stored.updated_at}`);
   writes++;stored={...stored,...JSON.parse(String(init.body))};return Response.json([stored]);
  }
  return Response.json(stored?[stored]:[]);
 };
 let result=await invoke('POST',{contentKey:'sky/article-template/sun/aries',surface:'sky',mode:'article',eventType:'sky-article-template',status:'REVIEWED',lane:'reference',body,sections:{},sourceSnapshot:{sourceType:'owner-resource-review',contentType:'sky-article-template'}});
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(writes,1);assert.equal(stored.body,opening);
 assert.equal(stored.sections.articleHoroscopes.passages.length,12);assert.equal(stored.source_snapshot.horoscopeSeparation.originalBody,body);
 result=await invoke('GET');assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.rows[0].sections.articleHoroscopes.passages[11].body,'Pisces complete opening.\n\nPisces complete ending.');
 const firstVersion=stored.updated_at,sections=structuredClone(stored.sections);
 sections.articleHoroscopes.passages[0].body='Revised complete opening.\n\nRevised complete ending.';
 result=await invoke('PATCH',{id,expectedUpdatedAt:firstVersion,sections});
 assert.equal(result.status,200,JSON.stringify(result));assert.equal(writes,2);assert.equal(stored.body,opening);assert.deepEqual(stored.sections,sections);
 assert.equal(stored.status,'DRAFT');assert.equal(stored.review_state,'owner-review-required');assert.equal(stored.source_snapshot.studioRevisionHistory[0].sections.articleHoroscopes.passages[0].body,'Aries complete opening.\n\nAries complete ending.');
 result=await invoke('PATCH',{id,expectedUpdatedAt:firstVersion,sections});assert.equal(result.status,409);assert.equal(writes,2);
 for(const invalid of [{}, {articleHoroscopes:{...sections.articleHoroscopes,passages:sections.articleHoroscopes.passages.slice(1)}}]){
  result=await invoke('PATCH',{id,expectedUpdatedAt:stored.updated_at,sections:invalid});assert.equal(result.status,422,JSON.stringify(result));assert.equal(writes,2);
 }
 result=await invoke('PATCH',{id,expectedUpdatedAt:stored.updated_at,body});assert.equal(result.status,422,JSON.stringify(result));assert.equal(writes,2,'Older embedded writing cannot overwrite newer horoscope fields');
 stored=null;
 result=await invoke('POST',{rows:[{contentKey:'sky/article-template/sun/aries',surface:'sky',mode:'article',eventType:'sky-article-template',body},{contentKey:'sky/article-template/sun/taurus',surface:'sky',mode:'article',eventType:'sky-article-template',body:body.replace('Pisces & Pisces Rising','Aries & Aries Rising')}]});
 assert.equal(result.status,422,JSON.stringify(result));assert.equal(writes,2,'Malformed bulk rejects before any write');
 console.log('PASS actual horoscope API create/read/edit, full copy preservation, review reset, stale conflicts, omitted/partial field rejection, conflicting legacy body and atomic bulk validation.');
}finally{globalThis.fetch=originalFetch;}
