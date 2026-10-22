import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync,copyFileSync,mkdirSync,rmSync,readFileSync,globSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

const emitted=mkdtempSync(join(tmpdir(),'sky-article-facts-node-'));
try {
  // Match separately emitted deployment modules; a TS loader or bundle hides missing extensions.
  await build({entryPoints:['api/_lib/sky-article-facts.ts','api/_lib/transit-ingress-editorial-authority.ts','apps/web/src/services/astrologyDisplay.ts','apps/web/src/astrologyConfig.ts'],outbase:'.',outdir:emitted,platform:'node',format:'esm',bundle:false,logLevel:'silent'});
  writeFileSync(join(emitted,'package.json'),'{"type":"module"}');
  for(const path of ['apps/web/src/content/skyIngressEssay.mjs','apps/web/src/services/planetSignDignity.mjs','src/astro-writing/transitIngressEditorialAuthority.cjs']){
    mkdirSync(dirname(join(emitted,path)),{recursive:true});copyFileSync(path,join(emitted,path));
  }
  const {skyArticleEditionFactsFromSnapshot}=await import(pathToFileURL(join(emitted,'api/_lib/sky-article-facts.js')).href);
  const facts=skyArticleEditionFactsFromSnapshot({generatedAt:'2031-02-15T12:00:00Z',location:{timeZone:'UTC'},positions:[{planet:'Mercury',sign:'Aquarius',motion:'direct',transitStart:'2031-02-01T12:00:00Z',transitEnd:'2031-03-01T12:00:00Z'}]},'mercury','ingress-essay-v2');
  assert.equal(facts.planet,'mercury');assert.equal(facts.sign,'aquarius');
  const current=skyArticleEditionFactsFromSnapshot({generatedAt:'2031-02-15T12:00:00Z',location:{timeZone:'UTC'},positions:[{planet:'Mercury',sign:'Aquarius',motion:'direct',transitStart:'2031-02-01T12:00:00Z',transitEnd:'2031-03-01T12:00:00Z'}]},'mercury','ingress-essay-v3');
  assert(current.templateFields.some(field=>field.name==='articleBody'&&field.description.includes('complete article')));
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  for(const endpoint of ['api/admin/sky-article-facts.ts','api/admin/sky-article-template-slots.ts']){
    assert(globSync(config.functions[endpoint].includeFiles).some(path=>path.endsWith('.wasm')),`${endpoint} needs the deployed Swiss runtime assets.`);
  }
  console.log('Sky article facts plain Node deployment import and Swiss asset contract passed.');
} finally {rmSync(emitted,{recursive:true,force:true});}
