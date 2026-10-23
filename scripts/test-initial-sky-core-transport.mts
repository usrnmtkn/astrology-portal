import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
const folder='apps/web/src/content/fallbackArchitectureV3/';
const bytes=await fs.readFile(folder+'bundled-sky-core-rows-v3.json');
const source=JSON.parse(bytes.toString());
const initial=JSON.parse(await fs.readFile(folder+'initial-sky-core-transport-v1.json','utf8'));
const support=JSON.parse(await fs.readFile(folder+'deferred-reader-support-transport-v1.json','utf8'));
const hash=createHash('sha256').update(bytes).digest('hex');
assert.equal(initial.sourceSha256,hash);assert.equal(support.sourceSha256,hash);
assert.deepEqual(initial.vocabularyRows,source.vocabularyRows);
const joined=new Map([...initial.hookRows,...support.hookRows].map(row=>[row.contentKey,row]));
assert.equal(joined.size,source.hookRows.length);
for(const row of source.hookRows)assert.deepEqual(joined.get(row.contentKey),row);
assert.equal(support.hookRows.length,404);
assert(gzipSync(bytes).length-gzipSync(JSON.stringify(initial)).length>35_000);
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sky-core-transport-'));
try {
 const target=path.join(temp,'runtime.mjs');
 await build({entryPoints:['apps/web/src/content/fallbackArchitectureV3Runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:target,logLevel:'silent'});
 for(const loader of ['loadCalendarFallbackArchitectureV3Bundle','loadDeferredFallbackArchitectureV3Bundle','loadEmptyHouseFallbackArchitectureV3Bundle','loadRelationshipFallbackArchitectureV3Bundle','loadSkyPlacementFallbackArchitectureV3Bundle']) {
  const runtime=await import(pathToFileURL(target).href+'?loader='+loader);
  for(const row of support.hookRows)assert.equal(runtime.fallbackV3HookBody(row.contentKey),'');
  await runtime.loadInitialSkyListFallbackArchitectureV3Bundle();
  for(const row of support.hookRows)assert.equal(runtime.fallbackV3HookBody(row.contentKey),'','Initial list cannot establish full support readiness.');
  await runtime[loader]();
  for(const row of support.hookRows)for(const voice of ['you','they'])assert.equal(runtime.fallbackV3HookBody(row.contentKey,voice),row['body_'+voice]??row.body??'');
 }
} finally {await fs.rm(temp,{recursive:true,force:true});}
console.log('PASS: complete source union and hashes, smaller startup, all 404 full units/voices through five actual full-reader loaders, separate list readiness.');
