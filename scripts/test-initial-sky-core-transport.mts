import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { isSkyListDashboardRow } from '../apps/web/src/services/skyDashboardScope';
const folder='apps/web/src/content/fallbackArchitectureV3/';
const bytes=await fs.readFile(folder+'bundled-sky-core-rows-v3.json');
const source=JSON.parse(bytes.toString());
const authored=JSON.parse(await fs.readFile(folder+'bundled-sky-authored-cards-v3.json','utf8'));
const reader=JSON.parse(await fs.readFile(folder+'bundled-initial-reader-rows-v3.json','utf8'));
const latest=(rows:any[])=>[...new Map(rows.map(row=>[row.contentKey,row])).values()];
const initial=JSON.parse(await fs.readFile(folder+'initial-sky-core-transport-v1.json','utf8'));
const support=JSON.parse(await fs.readFile(folder+'deferred-reader-support-transport-v1.json','utf8'));
const hash=createHash('sha256').update(bytes).digest('hex');
assert.equal(initial.sourceSha256,hash);assert.equal(support.sourceSha256,hash);
for(const [file,expected] of Object.entries(initial.sourceHashes))assert.equal(createHash('sha256').update(await fs.readFile(folder+file)).digest('hex'),expected);
assert.deepEqual(support.sourceHashes,initial.sourceHashes);
const allVocabulary=latest([...source.vocabularyRows,...reader.vocabularyRows]);
for(const [field,expected] of [['vocabularyRows',allVocabulary],['templates',reader.templates]] as const){
 const restored=new Map([...initial[field],...support[field]].map((row:any)=>[row.contentKey,row]));
 assert.equal(restored.size,expected.length);
 for(const row of expected)assert.deepEqual(restored.get(row.contentKey),row);
}
assert.deepEqual(latest([...initial.authoredCards,...support.authoredCards,...reader.authoredCards]),latest([...authored.authoredCards,...reader.authoredCards]));
const joined=new Map([...initial.hookRows,...support.hookRows].map(row=>[row.contentKey,row]));
const hooks=latest([...source.hookRows,...reader.hookRows]);
assert.equal(joined.size,hooks.length);
for(const row of hooks)assert.deepEqual(joined.get(row.contentKey),row);
assert.equal(support.hookRows.filter((row:any)=>/^fallback-hook\/transit-effect-(?:soft|hard)\//u.test(row.contentKey)).length,404);
assert(gzipSync(bytes).length-gzipSync(JSON.stringify(initial)).length>35_000);
const manifestBytes=await fs.readFile(folder+'bundled-core-manifest-v3.json');
const keyIndex=JSON.parse(await fs.readFile(folder+'initial-sky-core-keys-v1.json','utf8'));
assert.equal(keyIndex.sourceSha256,createHash('sha256').update(manifestBytes).digest('hex'));
assert.deepEqual(keyIndex.keys,JSON.parse(manifestBytes.toString()).keys.filter((key:string)=>isSkyListDashboardRow({content_key:key.slice(key.indexOf(':')+1)})));
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sky-core-transport-'));
try {
 const target=path.join(temp,'runtime.mjs');
 const baselineTarget=path.join(temp,'baseline.mjs');
 await build({entryPoints:['apps/web/src/content/fallbackArchitectureV3Runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:baselineTarget,logLevel:'silent',plugins:[{name:'unchanged-main-runtime',setup(builder){
  builder.onLoad({filter:/fallbackArchitectureV3Runtime\.ts$/},args=>({contents:execFileSync('git',['show','origin/main:apps/web/src/content/fallbackArchitectureV3Runtime.ts'],{encoding:'utf8'}),loader:'ts',resolveDir:path.dirname(args.path)}));
  builder.onLoad({filter:/(?:initial-sky-core|deferred-reader-support)-transport-v1\.json$/},args=>({contents:execFileSync('git',['show','origin/main:'+path.relative(process.cwd(),args.path)]).toString(),loader:'json'}));
 }}]});
 await build({entryPoints:['apps/web/src/content/fallbackArchitectureV3Runtime.ts'],bundle:true,platform:'node',format:'esm',outfile:target,logLevel:'silent'});
 for(const loader of ['loadCalendarFallbackArchitectureV3Bundle','loadDeferredFallbackArchitectureV3Bundle','loadEmptyHouseFallbackArchitectureV3Bundle','loadRelationshipFallbackArchitectureV3Bundle','loadSkyPlacementFallbackArchitectureV3Bundle']) {
  const runtime=await import(pathToFileURL(target).href+'?loader='+loader);
  const baseline=await import(pathToFileURL(baselineTarget).href+'?loader='+loader);
  for(const row of support.hookRows)assert.equal(runtime.fallbackV3HookBody(row.contentKey),'');
  await runtime.loadInitialSkyListFallbackArchitectureV3Bundle();
  for(const row of support.hookRows)assert.equal(runtime.fallbackV3HookBody(row.contentKey),'','Initial list cannot establish full support readiness.');
  await runtime[loader]();
  await baseline[loader]();
  for(const row of hooks)for(const voice of ['you','they'])assert.equal(runtime.fallbackV3HookBody(row.contentKey,voice),baseline.fallbackV3HookBody(row.contentKey,voice),`${loader}/${row.contentKey}/${voice}: complete text matches unchanged main.`);
  for(const row of allVocabulary)assert.equal(runtime.fallbackV3VocabularyBody(row.contentKey),baseline.fallbackV3VocabularyBody(row.contentKey));
  for(const row of latest([...authored.authoredCards,...reader.authoredCards]))assert.deepEqual(runtime.transitV3AuthoredCardForContentKey(row.contentKey),baseline.transitV3AuthoredCardForContentKey(row.contentKey),`${loader}/${row.contentKey}: complete authored unit is preserved.`);
 }
} finally {await fs.rm(temp,{recursive:true,force:true});}
console.log('PASS: complete source union and hashes, smaller startup, every full unit/voice through five actual full-reader loaders matches unchanged main; separate list readiness.');
