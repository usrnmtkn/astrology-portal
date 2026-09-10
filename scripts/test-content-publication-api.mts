import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler from '../api/admin/content-publication.ts';
process.env.CONTENT_GENERATION_SECRET='publication-test';
process.env.SUPABASE_URL='https://publication.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', contentKey='cms/qa/exact', expectedUpdatedAt='2026-09-07T18:00:00Z';
let source:any={id,content_key:contentKey,status:'LIVE',lane:'serving',review_state:null,body:'QA passage.',provider:'manual-admin',updated_at:expectedUpdatedAt};
let calls=0, conflict=false;
const original=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 calls++;
 const url=new URL(String(input));assert.equal(url.origin,'https://publication.invalid');
 if(url.pathname.endsWith('/generated_interpretations')) return Response.json([source]);
 assert.equal(init?.method,'POST');
 assert.deepEqual(JSON.parse(String(init?.body)),{p_content_key:contentKey,p_row_id:id,p_expected_updated_at:expectedUpdatedAt});
 if(conflict) return Response.json({code:'40001'},{status:409});
 return Response.json({content_key:contentKey,state:url.pathname.endsWith('/publish_content_publication')?'live':'retired',revision:1,row_id:id,row_updated_at:expectedUpdatedAt,updated_at:expectedUpdatedAt});
};
async function request(action:string,secret='publication-test',extra={}) {
 const req:any=Readable.from([JSON.stringify({action,id,contentKey,expectedUpdatedAt,...extra})]); req.method='POST';req.headers={'x-content-generation-secret':secret};
 const res:any={statusCode:0,setHeader(){},end(body:string){this.result=JSON.parse(body)}};
 await handler(req,res);return {code:res.statusCode,...res.result};
}
try {
 assert.equal((await request('retire','wrong')).code,401);assert.equal(calls,0);
 assert.equal((await request('retire','publication-test',{id:'bad'})).code,400);assert.equal(calls,0);
 for (const key of ['cms/personal-transit-aspect/you/template', 'fallback-hook/transit-house-event-frame/sun', 'fallback-template/transit.house-event']) {
   assert.equal((await request('publish', 'publication-test', {contentKey:key})).code,422);
   assert.equal(calls,0,'Retired compositions must be rejected before storage access');
 }
 assert.equal((await request('retire')).publication.state,'retired');
 conflict=true;assert.equal((await request('retire')).code,409);conflict=false;
 assert.equal((await request('publish')).publication.state,'live');
 source={...source,review_state:'needs-review'};assert.equal((await request('publish')).code,422);
 source={...source,review_state:null,sections:{packageDraft:{body:'Unapproved draft'}}};assert.equal((await request('publish')).code,422);
 console.log('PASS publication API authorization, exact CAS payload, retirement, conflict, eligible restore and review rejection');
} finally { globalThis.fetch=original; }

const { default: previewHandler, natalPlacementPackageSources }=await import('../api/admin/natal-placement-preview.ts');
const natalKey='fallback-hook/natal-you-placement-sign-final/uranus/scorpio';
const natalRecord=natalPlacementPackageSources([natalKey])[0];
let natalState='retired';
globalThis.fetch=async(input)=>{
 const url=new URL(String(input));
 if(url.pathname.endsWith('/content_publications')) return Response.json([{content_key:natalKey,state:natalState,revision:1,row_id:id,row_updated_at:expectedUpdatedAt,updated_at:expectedUpdatedAt}]);
 assert.equal(url.pathname,'/rest/v1/generated_interpretations');
 return Response.json([{id,content_key:natalKey,status:'LIVE',lane:'serving',provider:'tldrastro-fallback-architecture-v3',updated_at:expectedUpdatedAt,sections:{packageRecord:natalRecord}}]);
};
async function previewRequest() {
 const req:any=Readable.from([JSON.stringify({planet:'uranus',sign:'scorpio',house:'6',audience:'you',overrides:[]})]);
 req.method='POST';req.headers={'x-content-generation-secret':'publication-test'};
 const res:any={statusCode:0,setHeader(){},end(body:string){this.result=JSON.parse(body)}};
 await previewHandler(req,res);return {code:res.statusCode,...res.result};
}
try {
 assert.equal((await previewRequest()).code,400,'Retired writing cannot appear in the effective preview');
 natalState='live';const preview=await previewRequest();assert.equal(preview.code,200);
 assert(preview.appliedOverrideKeys.includes(natalKey),'Server preview loads the canonical source even when the editor has not loaded it');
 assert(preview.rendered.body.includes('Uranus describes the part of you'));
 console.log('PASS authenticated effective preview reads publication state and canonical source identities');
} finally {globalThis.fetch=original;}
