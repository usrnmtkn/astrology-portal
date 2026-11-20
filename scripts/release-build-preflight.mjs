import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const releaseBuildEnvironment=Object.freeze({
  VITE_SUPABASE_URL:'https://visual-smoke.supabase.test',
  VITE_SUPABASE_ANON_KEY:'visual-smoke-placeholder',
  VITE_SUPABASE_PUBLISHABLE_KEY:''
});

export function releaseBuildPreflight({env=process.env,cwd=process.cwd(),run=spawnSync,onPhase=receipt=>console.log(JSON.stringify(receipt))}={}) {
  if(!env.npm_execpath)throw new Error('Run npm run qa:release-builds to use the canonical CI measurement profiles.');
  const base={...Object.fromEntries(Object.entries(env).filter(([key])=>!key.startsWith('VITE_'))),CI:'true',...releaseBuildEnvironment};
  const auth={...base,VITE_ENABLE_NATAL_ASPECT_PATTERNS:'true'};
  const receipts=[];
  function phase(name,args,profile=base) {
    const started=Date.now();
    const result=run(process.execPath,args,{cwd,env:profile,stdio:'inherit'});
    const receipt={phase:name,status:result.status??1,node:process.version,architecture:process.arch,seconds:Math.round((Date.now()-started)/1000)};
    receipts.push(receipt);onPhase(receipt);
    return receipt.status===0;
  }
  const npm=(name,script,profile)=>phase(name,[env.npm_execpath,'run',script],profile);
  if(!phase('native-build-prerequisite',['--eval',"require('esbuild').transformSync('export const ready=true',{loader:'js'})"])) {
    throw new Error('Native build prerequisites failed before application checks. Match the launcher architecture to its installed dependencies.');
  }
  if(npm('web-default-build','build'))npm('web-default-budget','qa:bundle');
  npm('server-types','typecheck:server');
  npm('native-production-startup','test:production-health');
  if(npm('web-auth-build','build:web',auth))npm('web-auth-budget','qa:bundle',auth);
  if(npm('studio-build','build:admin'))phase('studio-budget',['scripts/check-admin-bundle-budgets.mjs']);
  const failures=receipts.filter(receipt=>receipt.status!==0);
  if(failures.length)throw new Error('Release build preflight failed: '+failures.map(receipt=>receipt.phase).join(', '));
  return receipts;
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href) {
  try {releaseBuildPreflight();}catch(error){console.error(error.message);process.exitCode=1;}
}
