import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const dir=await mkdtemp(path.join(tmpdir(),'studio-session-'));
await build({stdin:{contents:"export * from './apps/admin/src/ownerSession'; export * from './apps/admin/src/ownerSessionRequest';",resolveDir:process.cwd()},bundle:true,format:'esm',outfile:path.join(dir,'client.mjs'),define:{'import.meta.env':JSON.stringify({VITE_SUPABASE_URL:'https://session.invalid',VITE_SUPABASE_ANON_KEY:'fixture'})}});
const {fetchWithOwnerSession,loadOwnerSessionAccessToken,ownerSessionStorageKey}=await import(pathToFileURL(path.join(dir,'client.mjs')).href);
const oldWindow=globalThis.window,oldFetch=globalThis.fetch;
const storage=new Map<string,string>();
globalThis.window={localStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}} as any;
const token=(n:string,sub='fixture-owner')=>`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub,n})).toString('base64url')}.signature`;
const old=token('old'),fresh=token('fresh');
const seed=(expired=false,access=old)=>storage.set(ownerSessionStorageKey(),JSON.stringify({access_token:access,refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+(expired?-10:3600)}));
const refreshResult=()=>Response.json({access_token:fresh,refresh_token:'rotated-fixture',expires_in:3600});
const init={method:'POST',body:JSON.stringify({action:'generate',id:'fixture',expectedUpdatedAt:'unchanged'})};
try {
 await test('a captured old token is replaced on the next request without repeating the mutation',async()=>{
  seed(false,fresh);let calls=0;
  globalThis.fetch=async(_url,options)=>{calls++;assert.equal((options!.headers as any)['x-content-admin-session'],fresh);return Response.json({ok:true});};
  await fetchWithOwnerSession('/api/admin/horoscope-writing',old,init);assert.equal(calls,1);
 });
 await test('parallel expiry checks renew once and save the new expiry instead of refreshing every 30 seconds',async()=>{
  seed(true);let renewals=0;
  globalThis.fetch=async()=>{renewals++;return refreshResult();};
  assert.deepEqual(await Promise.all([loadOwnerSessionAccessToken(),loadOwnerSessionAccessToken(),loadOwnerSessionAccessToken()]),[fresh,fresh,fresh]);
  assert.equal(await loadOwnerSessionAccessToken(),fresh);assert.equal(renewals,1);
  assert.ok(JSON.parse(storage.get(ownerSessionStorageKey())!).expires_at>Date.now()/1000+3500);
 });
 await test('only a confirmed pre-handler 401 permits one retry with renewed credentials and the identical version/body',async()=>{
  seed();const bodies:any[]=[];let renewals=0;
  globalThis.fetch=async(url,options)=>{
   if(String(url).startsWith('https://session.invalid')){renewals++;return refreshResult();}
   bodies.push(options!.body);
   return bodies.length===1?Response.json({ok:false,authFailure:'content_admin_unauthorized'},{status:401}):Response.json({ok:true});
  };
  assert.equal((await fetchWithOwnerSession('/api/admin/horoscope-writing',old,init)).status,200);
  assert.deepEqual(bodies,[init.body,init.body]);assert.equal(renewals,1);
 });
 for(const status of [401,403,409,503])await test(`unmarked HTTP ${status} never replays generation`,async()=>{
  seed();let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({ok:false},{status});};
  await fetchWithOwnerSession('/api/admin/horoscope-writing',old,init).catch(()=>{});assert.equal(calls,1);
 });
 await test('a lost response never replays generation',async()=>{
  seed();let calls=0;globalThis.fetch=async()=>{calls++;throw new TypeError('Failed to fetch');};
  await assert.rejects(fetchWithOwnerSession('/api/admin/horoscope-writing',old,init));assert.equal(calls,1);
 });
 await test('a second auth denial stops after one renewed attempt',async()=>{
  seed();let calls=0,renewals=0;
  globalThis.fetch=async(url)=>{if(String(url).startsWith('https://session.invalid')){renewals++;return refreshResult();}calls++;return Response.json({authFailure:'content_admin_unauthorized'},{status:401});};
  await assert.rejects(fetchWithOwnerSession('/api/admin/horoscope-writing',old,init),/Sign in with the owner account/);assert.equal(calls,2);assert.equal(renewals,1);
 });
 await test('refresh failure preserves the saved session and never dispatches the operation',async()=>{
  seed(true);const before=storage.get(ownerSessionStorageKey());let calls=0;
  globalThis.fetch=async(url)=>{calls++;assert.ok(String(url).startsWith('https://session.invalid'));return Response.json({error:'Unavailable'},{status:503});};
  await assert.rejects(fetchWithOwnerSession('/api/admin/horoscope-writing',old,init),/saved readings are kept/);assert.equal(calls,1);assert.equal(storage.get(ownerSessionStorageKey()),before);
 });
 await test('a refresh completing after sign-out cannot restore the old session',async()=>{
  seed(true);globalThis.fetch=async()=>{storage.clear();return refreshResult();};
  assert.equal(await loadOwnerSessionAccessToken(),'');assert.equal(storage.size,0);
 });
 await test('a changed owner cannot inherit a running operation',async()=>{
  seed(false,token('new-account','different-owner'));globalThis.fetch=async()=>{throw new Error('Must not dispatch');};
  await assert.rejects(fetchWithOwnerSession('/api/admin/horoscope-writing',old,init),/Sign in with the owner account/);
 });
 await test('aborting during refresh prevents dispatch after renewal',async()=>{
  seed(true);const controller=new AbortController();let calls=0;
  globalThis.fetch=async()=>{calls++;controller.abort();return refreshResult();};
  await assert.rejects(fetchWithOwnerSession('/api/admin/horoscope-writing',old,{...init,signal:controller.signal}));assert.equal(calls,1);
 });
 await test('explicit emergency credentials remain separate from browser sessions',async()=>{
  seed();let calls=0;globalThis.fetch=async(_url,options)=>{calls++;assert.equal((options!.headers as any)['x-content-generation-secret'],'fixture-secret');return Response.json({ok:true});};
  await fetchWithOwnerSession('/api/admin/horoscope-writing','fixture-secret',init);assert.equal(calls,1);
 });
}finally{globalThis.window=oldWindow;globalThis.fetch=oldFetch;await rm(dir,{recursive:true,force:true});}
