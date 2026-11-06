import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync,copyFileSync,mkdirSync,rmSync,readFileSync,globSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

const emitted=mkdtempSync(join(tmpdir(),'planetary-horoscope-node-'));
try{
  // A bundled or tsx-loaded test can hide a missing deployment-module extension.
  await build({entryPoints:['api/_lib/planetary-horoscope-facts.ts','api/_lib/admin-http.ts','api/_lib/horoscope-history-storage.ts',
    'src/shared/planetaryHoroscopes.ts','src/shared/planetaryHoroscopeIdentity.ts','apps/web/src/services/timezones.ts'],
    outbase:'.',outdir:emitted,platform:'node',format:'esm',bundle:false,logLevel:'silent'});
  writeFileSync(join(emitted,'package.json'),'{"type":"module"}');
  for(const path of ['apps/web/src/content/horoscopeEditions.mjs','apps/web/src/content/editorialCopyBoundary.mjs']){
    mkdirSync(dirname(join(emitted,path)),{recursive:true});copyFileSync(path,join(emitted,path));
  }
  const facts=await import(pathToFileURL(join(emitted,'api/_lib/planetary-horoscope-facts.js')).href);
  const identity=await import(pathToFileURL(join(emitted,'src/shared/planetaryHoroscopes.js')).href);
  assert.equal(facts.planetaryReferenceInstant('2026-11-05','America/New_York'),'2026-11-05T17:00:00.000Z');
  assert.equal(facts.planetaryReferenceInstant('2026-03-08','America/New_York'),'2026-03-08T16:00:00.000Z');
  assert.throws(()=>facts.planetaryReferenceInstant('2026-02-30','UTC'));
  const event={schema:'planetary-horoscope-event/v1',planet:'mercury',sign:'scorpio',startsAt:'2026-10-01T12:00:00.000Z',endsAt:'2026-12-01T12:00:00.000Z',referenceInstant:'2026-11-05T17:00:00.000Z',timeZone:'America/New_York'};
  const readings=identity.emptyPlanetaryReadings(event);
  assert.equal(readings.passages.length,12);assert.equal(readings.passages[0].house,8);
  assert.equal(identity.validatePlanetaryReadings(readings,event).passages.length,12);
  const deployment=JSON.parse(readFileSync('vercel.json','utf8'));
  assert(globSync(deployment.functions['api/admin/planetary-horoscope-writing.ts'].includeFiles).some(path=>path.endsWith('.wasm')),'The planetary endpoint needs deployed Swiss assets.');
  console.log('Planetary horoscope plain Node imports, local-noon/DST facts and Swiss asset contract passed.');
}finally{rmSync(emitted,{recursive:true,force:true});}
