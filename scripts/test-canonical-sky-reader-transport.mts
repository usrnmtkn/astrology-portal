import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { applySkyV4ContinuousCorpusCorrection, createSkyV4ReaderRoute, skyV4ContentStudioRecords } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';

const root='apps/web/src/content/fallbackArchitectureV3/';
const read=(name:string)=>JSON.parse(fs.readFileSync(root+'authored-inputs/'+name+'.json','utf8'));
const transport=JSON.parse(fs.readFileSync(root+'canonical-sky-reader-transport-v1.json','utf8'));
for(const [file,hash] of Object.entries(transport.sourceHashes)) assert.equal(createHash('sha256').update(fs.readFileSync(root+file)).digest('hex'),hash);
const chunks=[1,2,3,4].map(n=>read(`sky-v4-continuous-corpus-correction-v1-chunk-${n}`));
const corpus=applySkyV4ContinuousCorpusCorrection(read('sky-v4-canonical-content-studio-stage-v1'),{
  ...read('sky-v4-continuous-corpus-correction-v1'),chunks,records:chunks.flatMap(c=>c.records)
});
const lunarChunks=[1,2].map(n=>read(`sky-v4-placement-lunar-context-v1-chunk-${n}`));
const lunar={...read('sky-v4-placement-lunar-context-v1'),chunks:lunarChunks,records:lunarChunks.flatMap(c=>c.records)};
assert.deepEqual(transport.corpus.content,corpus.content,'Every complete source row and its editorial/approval identity must remain unchanged.');
assert.deepEqual(transport.lunarSource,lunar);
assert.deepEqual(skyV4ContentStudioRecords(transport.corpus),skyV4ContentStudioRecords(corpus),'All released records and configuration contracts remain identical.');
assert.equal(skyV4ContentStudioRecords(transport.corpus).filter((row:any)=>row.serving_enabled).length,280);
const oldRender=createSkyV4ReaderRoute(corpus,lunar),newRender=createSkyV4ReaderRoute(transport.corpus,transport.lunarSource);
const signs=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
let cases=0;
for(const planet of ['sun','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','lilith','north-node','south-node']) for(const [index,sign] of signs.entries()) {
  for(const rx of ['sun','lilith','north-node','south-node'].includes(planet)?[false]:[false,true]) {
    const input={route:'placement',planet,sign,isRetrograde:rx,
      northSign:planet==='south-node'?signs[(index+6)%12]:sign,southSign:planet==='south-node'?sign:signs[(index+6)%12],
      facts:{entryDate:'October 1, 2026',exitDate:'November 1, 2026'},contexts:[],aspects:[]};
    assert.deepEqual(newRender(input),oldRender(input),`${planet}/${sign}/${rx}: complete output, source hashes and identity match the original source assembly.`);cases++;
  }
}
const originalBytes=Object.keys(transport.sourceHashes).reduce((n,file)=>n+gzipSync(fs.readFileSync(root+file),{level:9}).length,0);
const readerBytes=gzipSync(fs.readFileSync(root+'canonical-sky-reader-transport-v1.json'),{level:9}).length;
assert(readerBytes<originalBytes*0.8,'The transport must remove at least 20% of download bytes without removing reader units.');

const built=await build({entryPoints:['apps/web/src/content/canonicalSkyReaderAssets.ts'],bundle:true,platform:'node',format:'esm',write:false,
  define:{'import.meta.env.SSR':'false'},plugins:[{name:'reader-url',setup(builder){
    builder.onResolve({filter:/canonical-sky-reader-transport-v1\.json\?url$/},()=>({path:'reader-url',namespace:'fixture'}));
    builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default "/assets/complete-reader.json";'}));
  }}]});
const moduleUrl='data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64');
const fetchOriginal=globalThis.fetch;
try {
  let calls=0;
  globalThis.fetch=async()=>{calls++;return calls===1?new Response('',{status:503}):Response.json(transport);};
  const {loadCanonicalSkyReaderAssets:load}=await import(moduleUrl+'#transient');
  const first=load();assert.equal(load(),first,'All consumers share one complete immutable download.');
  assert.deepEqual(await first,transport);assert.equal(calls,2);await load();assert.equal(calls,2,'A completed source is reused.');
  globalThis.fetch=async()=>new Response('',{status:404});
  const {loadCanonicalSkyReaderAssets:retry}=await import(moduleUrl+'#retry');
  await assert.rejects(retry(),/source request failed/);
  globalThis.fetch=async()=>Response.json(transport);assert.deepEqual(await retry(),transport,'A failed source cannot poison explicit retry.');
  const {loadCanonicalSkyReaderAssets:invalid}=await import(moduleUrl+'#invalid');
  globalThis.fetch=async()=>Response.json({schema:transport.schema,corpus:{}});
  await assert.rejects(invalid(),/SOURCE_GAP/,'A successful header cannot authorize an incomplete source.');
} finally {globalThis.fetch=fetchOriginal;}
console.log(JSON.stringify({passed:true,completeServingRecords:280,exactReaderCases:cases,originalGzipBytes:originalBytes,readerGzipBytes:readerBytes}));
