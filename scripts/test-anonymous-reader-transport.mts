import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { publicationLedgerBoundaries } from '../apps/web/src/content/contentPublicationState';

const built=await build({stdin:{resolveDir:process.cwd(),contents:`export {createAnonymousReaderTransport} from './apps/web/src/services/anonymousReaderTransport'; export {contentPublicationGeneration} from './apps/web/src/content/contentPublicationState';`},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env':'{}'}});
const implementation=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const create=implementation.createAnonymousReaderTransport;
const jwt=(role:string)=>`fake.${Buffer.from(JSON.stringify({role})).toString('base64url')}.not-a-real-signature`;
for(const key of ['', 'unknown', 'sb_secret_fixture',jwt('service_role'),jwt('authenticated')]) assert.equal(create('https://synthetic.invalid',key),null,'Only publishable/anonymous credentials may enter the public transport.');
const rows=['!','__content-publication-ledger/v1','zz/future',...Array.from({length:1201},(_,i)=>`fallback-hook/${String(i).padStart(4,'0')}`)].sort().map(content_key=>({
 content_key,state:'live',revision:1,row_id:content_key,row_updated_at:'2026-10-23T16:00:00Z',updated_at:'2026-10-23T16:00:00Z'
}));
const original=globalThis.fetch, requests:URL[]=[];
let release!:()=>void;
const held=new Promise<void>(resolve=>{release=resolve;});
try {
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));requests.push(url);
  assert.equal(init?.cache,'no-store');assert(init?.signal);
  const headers=init?.headers as Record<string,string>;
  assert.equal(headers.apikey,'sb_publishable_fixture');assert.equal(headers.authorization,undefined,'No user session is forwarded.');
  await held;
  const filters=url.searchParams.getAll('content_key');
  return Response.json(rows.filter(row=>filters.every(f=>f.startsWith('gte.')?row.content_key>=f.slice(4):f.startsWith('lt.')?row.content_key<f.slice(3):row.content_key>f.slice(3))).slice(0,1000));
 };
 const transport=create('https://synthetic.invalid/','sb_publishable_fixture');
 let settled=false;
 const result=transport.publications();void result.then(()=>{settled=true;});
 for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(requests.length,publicationLedgerBoundaries.length-1,'All ranges begin together.');assert.equal(settled,false);
 release();assert.deepEqual(await result,rows,'Every page and future key must survive the complete read.');
 assert.equal(requests.length,publicationLedgerBoundaries.length,'The oversized range paginates once.');
 assert.equal(implementation.contentPublicationGeneration,0,'Transport cannot install or authorize a partial ledger.');
 // Any one failed range rejects the entire candidate.
 let failed=false;
 globalThis.fetch=async()=>{if(!failed){failed=true;return new Response('',{status:503});}return Response.json([]);};
 await assert.rejects(transport.publications(),/read failed/);
 globalThis.fetch=async()=>Response.json([{...rows[0],state:'private'}]);
 await assert.rejects(transport.publications(),/Incomplete publication ledger/);
 globalThis.fetch=async(input,init)=>{
  assert.equal(new URL(String(input)).pathname,'/rest/v1/rpc/content_runtime_revision');
  assert.equal(init?.method,'POST');assert.deepEqual(JSON.parse(String(init?.body)),{p_provider:'tldrastro-fallback-architecture-v3'});
  return Response.json('2026-10-23T16:00:00Z');
 };
 assert.deepEqual(await transport.revision('tldrastro-fallback-architecture-v3'),{data:'2026-10-23T16:00:00Z',error:null});
 globalThis.fetch=async()=>new Response('',{status:503});
 assert((await transport.revision('tldrastro-fallback-architecture-v3')).error);
 const legacy=create('https://synthetic.invalid',jwt('anon'));
 globalThis.fetch=async(_input,init)=>{assert.equal((init?.headers as any).authorization,`Bearer ${jwt('anon')}`);return Response.json('2026-10-23T16:00:00Z');};
 await legacy.revision('tldrastro-fallback-architecture-v3');
} finally {globalThis.fetch=original;}
console.log('PASS: anonymous-only direct public transport, concurrent complete pagination, future keys, bounded requests, invalid/failing range refusal and unchanged revision RPC. Zero live calls.');
