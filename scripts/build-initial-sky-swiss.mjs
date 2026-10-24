import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {join} from 'node:path';

// Server-worker transport only. Keep the pinned SDK and every mathematical
// input byte-identical; omit only the unrelated numbered-asteroid name catalog.
// Swiss reads that catalog in swe_get_planet_name for numbered asteroids, not
// for any of Sky's known 14 points. The original SDK remains the recovery path.
// Source: https://github.com/aloistr/swisseph/blob/master/sweph.c#L6978-L7023
const hashes = {
  'src/swisseph.js':'61957f0fa5a3f33fb11f0bb19b8425071dec246f5e25fde1bfe8bef6d91332dc',
  'wasm/swisseph.js':'deacf15677279d8fba5c321e235c1e62840f91e94478bc629bc5d1a98d3131d2',
  'wasm/swisseph.data':'39b43fd0bcaa1a6dbea2d66845efac0b0ad4ba76ec81cff830c11aaed81cc112',
  'wasm/swisseph.wasm':'2c39039161dc443850c93e23744d3f34dc1873b1417c5b59f41a70f5378db073'
};
const sha = value => createHash('sha256').update(value).digest('hex');

export async function buildInitialSkySwiss(root,destination) {
  const sdk=join(root,'node_modules/swisseph-wasm');
  assert.equal(JSON.parse(await readFile(join(sdk,'package.json'),'utf8')).version,'0.0.5');
  const inputs={};
  for(const [file,hash] of Object.entries(hashes)) {
    inputs[file]=await readFile(join(sdk,file));
    assert.equal(sha(inputs[file]),hash,`Review the initial-worker Swiss transport after changing ${file}.`);
  }
  const factory=inputs['wasm/swisseph.js'].toString();
  const metadata=factory.match(/loadPackage\((\{files:\[.*?\],remote_package_size:\d+\})\)/u);
  assert(metadata,'The pinned Emscripten package table must exist.');
  const entries=[...metadata[1].matchAll(/filename:"([^"]+)",start:(\d+),end:(\d+)/gu)];
  assert.equal(entries.length,7);
  let originalOffset=0,offset=0;
  const parts=[],files=[];
  for(const [,filename,start,end] of entries) {
    assert.equal(Number(start),originalOffset);originalOffset=Number(end);
    if(filename==='/sweph/seasnam.txt')continue;
    const bytes=inputs['wasm/swisseph.data'].subarray(Number(start),Number(end));
    parts.push(bytes);files.push({filename,start:offset,end:offset+bytes.length,sha256:sha(bytes)});offset+=bytes.length;
  }
  assert.equal(originalOffset,inputs['wasm/swisseph.data'].length);
  assert.equal(files.length,6);assert.equal(offset,2_151_204);
  const table='{files:['+files.map(({filename,start,end})=>'{filename:'+JSON.stringify(filename)+',start:'+start+',end:'+end+'}').join(',')+'],remote_package_size:'+offset+'}';
  let wrapper=inputs['src/swisseph.js'].toString();
  assert.equal(wrapper.split("'../wasm/swisseph.js'").length,2);
  assert.equal(wrapper.split("join(__dirname, '../wasm', path)").length,2);
  wrapper=wrapper.replace("'../wasm/swisseph.js'","'./factory.mjs'").replace("join(__dirname, '../wasm', path)","join(__dirname, path)");
  await mkdir(destination,{recursive:true});
  await Promise.all([
    writeFile(join(destination,'sdk.mjs'),wrapper),
    writeFile(join(destination,'factory.mjs'),factory.replace(metadata[1],table)),
    writeFile(join(destination,'swisseph.data'),Buffer.concat(parts)),
    writeFile(join(destination,'swisseph.wasm'),inputs['wasm/swisseph.wasm']),
    writeFile(join(destination,'transport.json'),JSON.stringify({sdkVersion:'0.0.5',sourceHashes:hashes,omitted:['/sweph/seasnam.txt'],files})),
    copyFile(join(sdk,'LICENSE'),join(destination,'LICENSE'))
  ]);
}
