import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {Readable} from 'node:stream';
const require=createRequire(import.meta.url);
const matches=require('picomatch');
process.env.NODE_ENV='test';
process.env.CONTENT_GENERATION_SECRET='coverage-deployment-fixture';
const {default:handler}=await import('../api/admin/content-coverage');
process.env.CONTENT_GENERATION_SECRET='coverage-deployment-fixture';
const root=process.cwd(),config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const pattern=(config.functions['api/admin/content-coverage.ts']??config.functions['api/**/*.ts']).includeFiles;
const included=matches(pattern);
const readFile=fs.readFileSync;
let missing:string|null=null;
const accessed=new Set<string>();
async function invoke(secret='coverage-deployment-fixture'){
  const req=Object.assign(Readable.from([]),{method:'GET',headers:{authorization:`Bearer ${secret}`}});
  return new Promise<any>((resolve,reject)=>{
    const res={statusCode:200,setHeader(){},end(body:string){resolve({status:this.statusCode,payload:JSON.parse(body)});}};
    handler(req as any,res as any).catch(reject);
  });
}
// Exercise the actual authenticated handler with only its declared runtime
// assets available. The full checkout used to conceal missing review manifests.
fs.readFileSync=((file:any,...args:any[])=>{
  const relative=path.relative(root,String(file));
  if(relative.endsWith('.json')&&!relative.startsWith('..')){
    accessed.add(relative);
    if(relative===missing||!included(relative))throw Object.assign(new Error(`ENOENT: missing deployment asset ${relative}`),{code:'ENOENT'});
  }
  return (readFile as any)(file,...args);
}) as typeof fs.readFileSync;
try{
  assert.equal((await invoke('wrong')).status,401);assert.equal(accessed.size,0);
  const result=await invoke();
  assert.equal(result.status,200,JSON.stringify(result.payload));assert.equal(result.payload.ok,true);
  assert.equal(result.payload.coverage.length,6);assert(accessed.size>=8);
  for(const file of accessed)assert(included(file),`Coverage runtime asset omitted: ${file}`);
  missing='packages/astro-knowledge/review/transit-aspect-friends-nonsun-350-owner-live-2026-09-03.json';
  const unavailable=await invoke();assert.equal(unavailable.status,500);
  assert.equal(unavailable.payload.ok,false);assert(!JSON.stringify(unavailable.payload).includes('packages/'));
  missing=null;assert.equal((await invoke()).status,200,'A retry must recover after the missing asset is restored.');
  console.log(`PASS coverage deployment: actual authenticated handler, ${accessed.size} declared assets, missing-file failure, safe error and retry.`);
}finally{fs.readFileSync=readFile;}
