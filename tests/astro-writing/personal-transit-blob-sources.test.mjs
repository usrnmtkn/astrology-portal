import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPersonalTransitSourceReader } from '../../src/astro-writing/personalTransitBlobSources.mjs';

const source = { schema: 'personal-transit-writing-sources/v1', version: 'synthetic-private-source', passages: [], meanings: [] };
const body = JSON.stringify(source);
const hash = text => createHash('sha256').update(text).digest('hex');
const pointer = text => 'blob:' + JSON.stringify({schema:'personal-transit-private-blob/v1',storeId:'store_synthetic',pathname:`personal-transit/${hash(text)}.json`,sha256:hash(text)});
const response = text => ({statusCode:200,stream:new Response(text).body,blob:{size:Buffer.byteLength(text)}});

test('private snapshots preserve complete bytes, pin the source, and deduplicate reads without sharing mutable objects', async () => {
  const old = process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES;
  try {
    process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES=pointer(body);
    let calls=0;
    const read=createPersonalTransitSourceReader(async (pathname,options) => {
      calls++;assert.equal(options.access,'private');assert.equal(options.storeId,'store_synthetic');
      assert.match(pathname,/^personal-transit\/[a-f0-9]{64}\.json$/u);return response(body);
    });
    const [a,b]=await Promise.all([read(),read()]);assert.deepEqual(a,source);assert.deepEqual(b,source);assert.equal(calls,1);
    a.version='mutated';assert.equal((await read()).version,source.version);
    process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES=pointer(body+' ');
    await assert.rejects(read(),/failed verification/);assert.equal(calls,2);
  } finally { if(old===undefined) delete process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES;else process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES=old; }
});

test('missing, altered, oversized, stalled or malformed private snapshots fail closed and failed reads can recover', async () => {
  const old = process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES;
  try {
    process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES=pointer(body);
    for(const get of [async()=>null,async()=>response(body+' '),async()=>response('x'.repeat(2*1024*1024+1)),async()=>({statusCode:200,stream:new ReadableStream({start(){}}),blob:{}})]) {
      await assert.rejects(createPersonalTransitSourceReader(get,20)(),/failed verification/);
    }
    let attempts=0;const read=createPersonalTransitSourceReader(async()=>++attempts===1?null:response(body));
    await assert.rejects(read(),/failed verification/);assert.deepEqual(await read(),source);assert.equal(attempts,2);
    let called=false;const invalid=createPersonalTransitSourceReader(async()=>{called=true;return response(body);});
    process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES='blob:'+JSON.stringify({schema:'personal-transit-private-blob/v1',storeId:'store_synthetic',pathname:'https://example.invalid/private',sha256:hash(body)});
    await assert.rejects(invalid(),/failed verification/);assert.equal(called,false);
  } finally { if(old===undefined) delete process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES;else process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES=old; }
});
