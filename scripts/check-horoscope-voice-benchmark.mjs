import {readFileSync,writeFileSync} from 'node:fs';
import {evaluateHoroscopeVoiceBenchmark} from '../src/astro-writing/horoscopeVoiceBenchmark.mjs';

// Reads only explicitly named local benchmark files. There is no provider or
// environment-key loader, automatic calibration dispatch, or training stage.
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){
  if(!['--cases','--labels','--reviews','--out'].includes(args[i])||!args[i+1]||options[args[i]])throw new Error('Use --cases FILE --labels FILE [--reviews FILE] --out FILE');
  options[args[i]]=args[i+1];
}
if(!options['--cases']||!options['--labels']||!options['--out'])throw new Error('Cases, labels and output are required.');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const result=evaluateHoroscopeVoiceBenchmark({cases:read(options['--cases']).cases,labels:read(options['--labels']).labels,
  reviews:options['--reviews']?read(options['--reviews']).reviews:[]});
writeFileSync(options['--out'],JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({status:result.status,cases:result.cases,missing:result.missing,invalid:result.invalid,
  falseAcceptances:result.falseAcceptances,referenceFlags:result.referenceFlags,tuningEligible:result.tuningEligible,newModelCalls:0}));
if(!result.tuningEligible)process.exitCode=2;
