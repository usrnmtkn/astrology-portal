import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {build} from 'vite';
import {staticBrotliAssetsPlugin} from './static-brotli-assets-plugin.mjs';
import {deploymentAssetsPlugin} from './deployment-assets-plugin.mjs';

const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url)));
assert.equal(config.routes.length,2);
assert.deepEqual(config.functions['api/sky-reader.ts'].regions,['pdx1']);
assert(Object.entries(config.functions).every(([path,options])=>path==='api/sky-reader.ts'||!options.regions),'Other functions retain their existing deployment regions.');
for(const extension of ['js','css']) {
  const pathname=`/assets/reader-aB12_-34.${extension}`;
  const route=config.routes.find(route=>new RegExp(`^${route.src}$`).test(pathname));
  assert(route);
  assert.equal(pathname.replace(new RegExp(`^${route.src}$`),route.dest),`${pathname}.br`);
  const negotiation=new RegExp(route.has[0].value);
  for(const value of ['br','gzip, br','br;q=1','gzip, br;q=0.5','BR;Q=0.001'])assert(negotiation.test(value),value);
  for(const value of ['gzip','identity','br;q=0','br;q=0.000','br;q=1.1','br;q=invalid'])assert(!negotiation.test(value),value);
  assert.equal(route.headers['Content-Encoding'],'br');
  assert.equal(route.headers['Vary'],'Accept-Encoding');
  assert.match(route.headers['Content-Type'],extension==='js'?/^application\/javascript/:/^text\/css/);
  assert(route.headers['Cache-Control'].includes('immutable'));
  for(const path of ['/','/api/sky-reader','/admin/content','/assets/reader.js','/wasm/version/swisseph.wasm'])assert(!new RegExp(`^${route.src}$`).test(path));
}
assert.deepEqual(config.rewrites,[
  {source:'/feed/:token.ics',destination:'/api/calendar-feed?token=:token'},
  {source:'/api/admin/review-records',destination:'/api/admin/review-records-fast'},
  {source:'/(.*)',destination:'/index.html'}
]);
const result=await build({configFile:false,logLevel:'silent',plugins:[deploymentAssetsPlugin({VERCEL_SKEW_PROTECTION_ENABLED:'1',VERCEL_DEPLOYMENT_ID:'dpl_compression_fixture'}),staticBrotliAssetsPlugin(),{
  name:'compression-fixture',resolveId(id){if(id==='compression-entry'||id==='./lazy.js')return id;},
  load(id){if(id==='compression-entry')return 'globalThis.loadComplete=()=>import("./lazy.js");';if(id==='./lazy.js')return 'export const complete="Complete synthetic content.\\nOpening and final sentence.";';},
  generateBundle(){this.emitFile({type:'asset',fileName:'assets/reader-fixture.css',source:'.reading{display:block}'});}
}],build:{write:false,minify:true,rollupOptions:{input:'compression-entry',output:{entryFileNames:'assets/entry-[hash].js',chunkFileNames:'assets/[name]-[hash].js'}}}});
const output=result.output;
for(const item of output.filter(item=>/\.(?:js|css)$/u.test(item.fileName))) {
  const sibling=output.find(other=>other.fileName===`${item.fileName}.br`);
  assert(sibling);
  assert.deepEqual(brotliDecompressSync(sibling.source),Buffer.from(item.type==='chunk'?item.code:item.source));
  if(item.type==='chunk'&&item.isEntry)assert(item.code.includes('?dpl=dpl_compression_fixture'));
}
console.log('PASS lossless final-byte Brotli, CDN-only asset negotiation, MIME/cache metadata, unchanged application rewrites and ordinary-client fallback.');
