#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import archive from '../src/astro-writing/writingRunArchive.cjs';
const usage='node scripts/export-writing-runs.mjs --out /private/new-folder [--env-file /private/.env] [--surface surface] [--zip /private/export.zip]';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
function assertPrivateDestination(destination){
  let existing=path.dirname(destination);
  while(!fs.existsSync(existing))existing=path.dirname(existing);
  for(let p=fs.realpathSync(existing);;p=path.dirname(p)){
    if(fs.existsSync(path.join(p,'.git')))throw new Error('Export outside a Git checkout.');
    if(path.dirname(p)===p)break;
  }
}
export async function exportWritingRuns({out,store,surface,through=new Date().toISOString()}){
  if(!path.isAbsolute(out)||fs.existsSync(out))throw new Error('Use a new absolute private output directory.');
  if(surface&&!/^[a-zA-Z0-9_:/.-]{1,512}$/u.test(surface))throw new Error('Invalid surface.');
  // Private request bodies must not accidentally become source or public assets.
  assertPrivateDestination(out);
  fs.mkdirSync(out,{recursive:true,mode:0o700});fs.chmodSync(out,0o700);
  const write=(name,value)=>{const p=path.join(out,name);fs.mkdirSync(path.dirname(p),{recursive:true,mode:0o700});fs.writeFileSync(p,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{mode:0o600});};
  const index=[],seen=new Set();let last=null;
  do{
    const params=new URLSearchParams({select:'id,created_at',order:'created_at.desc,id.desc',limit:'50',created_at:`lte.${through}`});
    if(surface)params.set('surface',`eq.${surface}`);
    if(last)params.set('or',`(created_at.lt.${last.created_at},and(created_at.eq.${last.created_at},id.lt.${last.id}))`);
    const page=await store.list(params);
    if(!page.length)break;
    for(const ref of page){
      if(!uuid.test(ref.id)||seen.has(ref.id))throw new Error('Invalid or repeated archive page.');seen.add(ref.id);
      const rows=await store.list(new URLSearchParams({id:`eq.${ref.id}`,select:'*',limit:'1'}));
      if(rows.length!==1||rows[0].id!==ref.id)throw new Error('Archive disappeared during export.');
      const row=archive.verifyArchivedRun(rows[0]);
      write(`${row.id}/record.json`,row);write(`${row.id}/request-body.txt`,row.request_body);
      write(`${row.id}/request.json`,JSON.parse(row.request_body));write(`${row.id}/evidence.json`,row.evidence);
      index.push(Object.fromEntries(['id','created_at','surface','family','role','model','provider','context','state','response_id','request_sha256','snapshot_sha256'].map(k=>[k,row[k]])));
    }
    last=page.at(-1);if(page.length<50)break;
  }while(true);
  write('INDEX.json',{schema:'writing-run-export/v1',through,surface:surface??null,runs:index});
  write('README.txt','Private writer/judge requests and their exact supplied evidence. request-body.txt preserves the original JSON serialization; request.json is a readable projection. Evidence fields are selected provider input, not today\'s source library. A dispatch reservation does not prove delivery; response_received records transport response, not approval or completed prose. No historical missing inputs are reconstructed.\n');
  const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else files.push({path:path.relative(out,p),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')});}}walk(out);
  write('MANIFEST.json',{schema:'writing-run-files/v1',files});return {runs:index.length,files:files.length+1};
}
export function zipWritingRuns(out,zip){
  if(!path.isAbsolute(zip)||fs.existsSync(zip))throw new Error('Use a new absolute ZIP path.');
  assertPrivateDestination(zip);
  execFileSync('python3',['-c',`import os,pathlib,sys,zipfile
root=pathlib.Path(sys.argv[1]); target=pathlib.Path(sys.argv[2])
fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'wb') as f:
 with zipfile.ZipFile(f,'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(root.rglob('*')):
   if p.is_file(): z.write(p,str(pathlib.Path(root.name)/p.relative_to(root)))
with zipfile.ZipFile(target) as z:
 if z.testzip() is not None: raise RuntimeError('ZIP integrity check failed')
`,out,zip],{stdio:'pipe'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),option=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];};
  try{
    if(args.includes('--help')){console.log(usage);process.exit(0);}
    if(option('--env-file'))process.loadEnvFile(option('--env-file'));
    const out=option('--out');if(!out)throw new Error(usage);
    const result=await exportWritingRuns({out,store:archive.writingRunStorage(),surface:option('--surface')});
    if(option('--zip'))zipWritingRuns(out,option('--zip'));
    console.log(JSON.stringify(result));
  }catch(error){console.error(error instanceof Error?error.message:'Private export failed.');process.exitCode=1;}
}
