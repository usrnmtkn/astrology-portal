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
