import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import handler, { normalizeTransitNatalPreviewInput, renderTransitNatalPreviewState } from '../api/admin/transit-natal-preview.ts';
const require = createRequire(import.meta.url);
const key = 'authored/transit-aspect/sun/north-node/conjunction';
const source = require('../apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json').authoredCards.find((row:any) => row.contentKey === key);
const input = {planet:'sun',sign:'virgo',aspect:'conjunction',natalPoint:'north-node'};
const baseline = renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput(input));
assert.match(baseline.body,/You may be offered a role/);
assert.match(baseline.body,/accept the first assignment and learn from what happens next\./);
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', stamp='2026-09-10T12:00:00Z';
let rows:any[] = [], publications:any[] = [], failStorage=false, calls=0;
process.env.CONTENT_GENERATION_SECRET='transit-preview-test';
process.env.SUPABASE_URL='https://transit-preview.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';
const original=globalThis.fetch;
globalThis.fetch=async(value,init)=>{
  calls++;
  const url=new URL(String(value));assert.equal(url.origin,'https://transit-preview.invalid');assert.ok(!init?.method || init.method==='GET');
  if(failStorage)return Response.json({error:'unavailable'},{status:503});
  return Response.json(url.pathname.endsWith('/content_publications') ? publications : rows);
};
async function request(body:unknown=input, secret='transit-preview-test') {
 const req:any=Readable.from([JSON.stringify(body)]);req.method='POST';req.headers={'x-content-generation-secret':secret};
 const res:any={statusCode:0,setHeader(){},end(body:string){this.result=JSON.parse(body)}};
 await handler(req,res);return {code:res.statusCode,...res.result};
}
try {
 assert.equal((await request(input,'wrong')).code,401);assert.equal(calls,0);
 assert.equal((await request({planet:'invalid'})).code,400);assert.equal(calls,0);
 assert.deepEqual((await request()).rendered,baseline);
 rows=[{id,content_key:key,status:'DRAFT',lane:'serving',provider:'tldrastro-fallback-architecture-v3',updated_at:stamp,body:'Synthetic unapproved draft.',sections:{packageRecord:{...source,body_you:'Synthetic unapproved draft.'}}}];
 assert.deepEqual((await request()).rendered,baseline);
 rows[0]={...rows[0],status:'LIVE',body:'Synthetic published transit preview fixture.',sections:{packageRecord:{...source,body_you:'Synthetic published transit preview fixture.'}}};
 publications=[{content_key:key,state:'live',revision:1,row_id:id,row_updated_at:stamp,updated_at:stamp}];
 assert.match((await request()).rendered.body,/Synthetic published transit preview fixture/);
 publications[0].state='retired';assert.equal((await request()).rendered,undefined);
 publications[0].state='live';publications[0].row_updated_at='2026-09-10T12:00:01Z';assert.equal((await request()).rendered,undefined);
 publications=[];rows=[];assert.deepEqual((await request()).rendered,baseline,'Requests cannot leak publication state');
 failStorage=true;assert.equal((await request()).code,503);
 console.log('PASS transit preview actual handler: authorization, input validation, shared full copy, published edits, draft exclusion, retirement, stale publication, scoped state, and storage failure.');
} finally {globalThis.fetch=original;}

// Newly authored identities must enter the same reader without a bundled-key release.
const { transitNatalExactContentKey, transitNatalExactSourceDraft } = await import('../apps/admin/src/transitNatalSources.ts');
const { isDynamicTransitNatalExactKey } = await import('../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.ts');
for (const selection of [
 {planet:'sun',natalPoint:'south-node',aspect:'opposition'},
 {planet:'sun',natalPoint:'sun',aspect:'conjunction'},
 {planet:'uranus',natalPoint:'uranus',aspect:'conjunction'}
] as const) {
 const draft=transitNatalExactSourceDraft(selection), key=draft.contentKey;
 assert.equal(draft.status,'DRAFT');assert.equal(draft.lane,'reference');assert.equal(draft.body,'');
 assert.equal(draft.sections.packageRecord.review_status,'needs_review');
 const content='A complete synthetic exact transit opening.\n\nA complete synthetic exact transit ending.';
 const record={...draft.sections.packageRecord,body:content,body_you:content,review_status:'approved'};
 const row:any={id,content_key:key,provider:'tldrastro-fallback-architecture-v3',status:'LIVE',lane:'serving',updated_at:stamp,body:content,sections:{packageRecord:record},facts:{fallbackArchitectureV3:true,review_status:'approved'},source_snapshot:{...draft.sourceSnapshot,review_status:'approved'}};
 const input=normalizeTransitNatalPreviewInput({...selection,sign:'virgo',voice:'you'});
 const publication:any={content_key:key,state:'live',revision:1,row_id:id,row_updated_at:stamp,updated_at:stamp};
 const exact=renderTransitNatalPreviewState(input,[row],[publication]);
 assert.equal(exact.body,content);assert.equal(exact.sourceKeys[0],key);
 for(const change of [{status:'DRAFT'},{lane:'reference'},{sections:{packageRecord:{...record,review_status:'needs_review'}},facts:{review_status:'needs_review'},source_snapshot:{...draft.sourceSnapshot,review_status:'needs_review'}}]) {
  let result;try{result=renderTransitNatalPreviewState(input,[{...row,...change}],[]);}catch{}
  assert.notEqual(result?.body,content,'Unpublished/unreviewed exact source cannot serve');
 }
 assert.throws(()=>renderTransitNatalPreviewState(input,[row],[{...publication,state:'retired'}]),/SOURCE_GAP|No reader-eligible/);
}
assert.equal(transitNatalExactContentKey({planet:'sun',natalPoint:'lilith',aspect:'square'}),null);
for(const key of ['authored/transit-return/pluto','authored/transit-return/sun/extra','authored/transit-aspect/sun/sun/conjunction','authored/transit-aspect/sun/fake/square','authored/transit-aspect/sun/moon/hard','cms/personal-transit-aspect/sun/south-node/opposition'])assert.equal(isDynamicTransitNatalExactKey(key),false,key);
console.log('PASS new exact personal-transit and return sources, draft exclusion, retirement, and valid identities.');
