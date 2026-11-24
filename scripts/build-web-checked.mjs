import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const commands=[['types',[require.resolve('typescript/bin/tsc')]],['bundle',[join(dirname(require.resolve('vite/package.json')),'bin/vite.js'),'build']]];

// TypeScript is noEmit. Both jobs read the completed npm prebuild inputs, and
// the build succeeds only after both the typecheck and full bundle succeed.
export async function checkedWebBuild(jobs=commands,{onPhase=phase=>console.error(JSON.stringify(phase))}={}){
  const children=[];
  const forward=signal=>children.forEach(child=>child.kill(signal));
  const interrupt=()=>forward('SIGINT'),terminate=()=>forward('SIGTERM');
  process.on('SIGINT',interrupt);process.on('SIGTERM',terminate);
  try{
    const results=await Promise.all(jobs.map(([phase,args])=>new Promise(resolve=>{
      const start=performance.now(),child=spawn(process.execPath,args,{stdio:'inherit'});children.push(child);
      child.on('error',()=>resolve(1));
      child.on('close',(code,signal)=>{const status=code??1;onPhase({phase:`web-${phase}`,status,signal,seconds:(performance.now()-start)/1000});resolve(status);});
    })));
    return results.find(status=>status!==0)??0;
  }finally{process.off('SIGINT',interrupt);process.off('SIGTERM',terminate);}
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href)process.exitCode=await checkedWebBuild();
