import assert from 'node:assert/strict';
import {build} from 'esbuild';
import '../src/astro-writing/canonicalInstructions.mjs';
import '../src/astro-writing/horoscopeProseInstructions.mjs';
import '../src/astro-writing/lunationEditorialAuthority.cjs';
import policy from '../src/astro-writing/forecastProsePolicy.cjs';
import development from '../src/astro-writing/forecastProseDevelopment.cjs';

assert.equal(development.FORECAST_PROSE_DEVELOPMENT,policy.FORECAST_PROSE_DEVELOPMENT);
assert.equal(development.FORECAST_PROSE_DEVELOPMENT_VERSION,policy.FORECAST_PROSE_DEVELOPMENT_VERSION);

const result=await build({
  entryPoints:['src/astro-writing/canonicalInstructions.mjs','src/astro-writing/horoscopeProseInstructions.mjs','src/astro-writing/lunationEditorialAuthority.cjs'],
  outdir:'unused-forecast-client-boundary',bundle:true,platform:'browser',format:'esm',
  external:['node:*'],write:false,metafile:true,logLevel:'silent'
});
assert(!Object.keys(result.metafile.inputs).some(file=>file.endsWith('/forecastProseDevelopment.cjs')),
  'Client policy imports must not bundle server-only forecast evidence projection');
console.log('PASS client forecast policies exclude server-only evidence projection helpers.');
