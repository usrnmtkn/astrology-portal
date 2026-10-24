import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('reader edit access verifies the owner, coalesces reads, and follows Studio emergency fallback rules',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'reader-studio-access-'));
  const oldWindow=globalThis.window,oldFetch=globalThis.fetch;
  const storage=new Map<string,string>();
  const calls:Array<{url:string;headers:Record<string,string>;body:string}>=[];
  try {
    await build({stdin:{contents:"export * from './apps/web/src/services/studioReaderAccess';",resolveDir:process.cwd()},bundle:true,format:'esm',outfile:join(directory,'client.mjs'),define:{'import.meta.env':JSON.stringify({VITE_SUPABASE_URL:'https://reader-access.invalid',VITE_SUPABASE_ANON_KEY:'fixture'})}});
    const {verifyReaderStudioAccess}=await import(pathToFileURL(join(directory,'client.mjs')).href);
    globalThis.window={localStorage:{getItem:(key:string)=>storage.get(key)??null}} as any;
    const session='header.payload.signature';
    let status=200;
    globalThis.fetch=async (url,options)=>{
      const headers=options?.headers as Record<string,string>;
      calls.push({url:String(url),headers,body:String(options?.body)});
      const responseStatus=headers['x-content-admin-session']?status:200;
      return new Response(JSON.stringify({ok:responseStatus===200,statuses:[]}),{status:responseStatus});
    };
    assert.equal(await verifyReaderStudioAccess(),false);
    assert.equal(calls.length,0,'Anonymous readers cause no admin request.');
    storage.set('sb-reader-access-auth-token',JSON.stringify({access_token:session}));
    assert.deepEqual(await Promise.all([verifyReaderStudioAccess(),verifyReaderStudioAccess()]),[true,true]);
    assert.equal(calls.length,1,'Concurrent passage links share the owner verification.');
    assert.equal(calls[0].url,'/api/admin/content-live-status');
    assert.deepEqual(JSON.parse(calls[0].body),{ids:[]},'Owner verification reads no content or private draft.');
    assert.equal(calls[0].headers['x-content-admin-session'],session);
    storage.set('tldrastro:contentAdminSecret','fixture-emergency');
    calls.length=0;status=403;
    assert.equal(await verifyReaderStudioAccess(),true);
    assert.equal(calls.length,2);
    assert.equal(calls[1].headers['x-content-generation-secret'],'fixture-emergency');
    calls.length=0;status=503;
    assert.equal(await verifyReaderStudioAccess(),false);
    assert.equal(calls.length,1,'An outage does not switch to emergency credentials.');
    storage.delete('tldrastro:contentAdminSecret');calls.length=0;status=403;
    assert.equal(await verifyReaderStudioAccess(),false,'A signed-in reader is not automatically an owner.');
  } finally {globalThis.window=oldWindow;globalThis.fetch=oldFetch;await rm(directory,{recursive:true,force:true});}
});
