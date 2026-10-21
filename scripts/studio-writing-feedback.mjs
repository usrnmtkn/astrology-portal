#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {validateExplicitWritingFeedback,selectExplicitWritingFeedback} from '../src/astro-writing/explicitWritingFeedback.mjs';

const usage='Usage: node scripts/studio-writing-feedback.mjs record --file /private/feedback.json [--env-file /private/.env.local] | export --target exact-key --out /private/feedback.json [--env-file /private/.env.local] | retire --file /private/decision.json';
const args=process.argv.slice(2),command=args[0];
const option=name=>{const at=args.indexOf(name);return at<0?null:args[at+1];};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const source=/^thread:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
function privateFile(file,value){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.chmodSync(file,0o600);}

export async function runFeedbackCommand({command,input,target,request,output}) {
  if(command==='record'){
    if(!input||!uuid.test(input.requestId)||!source.test(input.sourceUri)||!Number.isFinite(Date.parse(input.sourceDate)))throw new Error('Supply an idempotency UUID and the actual owner chat provenance.');
    validateExplicitWritingFeedback([{id:input.requestId,version:1,status:'active',kind:'rejection',target_keys:input.targetKeys,
      rejected_text:input.rejectedText,source_roles:null,owner_reason:input.ownerReason,source_uri:input.sourceUri,source_date:input.sourceDate}]);
    const rows=await request('rpc/record_studio_writing_feedback',{p_request_id:input.requestId,p_kind:'rejection',p_target_keys:input.targetKeys,
      p_rejected_text:input.rejectedText,p_source_roles:null,p_owner_reason:input.ownerReason,p_source_uri:input.sourceUri,p_source_date:input.sourceDate});
    validateExplicitWritingFeedback(rows);
    if(rows.length!==1||rows[0].rejected_text!==input.rejectedText||rows[0].owner_reason!==input.ownerReason
      ||JSON.stringify(rows[0].target_keys)!==JSON.stringify(input.targetKeys)||rows[0].source_uri!==input.sourceUri)throw new Error('Storage did not confirm the exact feedback.');
    return {id:rows[0].id,version:rows[0].version,status:rows[0].status,targetKeys:rows[0].target_keys};
  }
  if(command==='retire'){
    if(!input||!uuid.test(input.id)||!uuid.test(input.requestId)||!source.test(input.sourceUri)||!Number.isInteger(input.version)
      ||typeof input.reason!=='string'||!input.reason.trim())throw new Error('Supply the exact feedback version and actual owner retirement decision.');
    const rows=await request('rpc/retire_studio_writing_feedback',{p_id:input.id,p_version:input.version,p_request_id:input.requestId,p_reason:input.reason,p_source_uri:input.sourceUri});
    validateExplicitWritingFeedback(rows);
    if(rows.length!==1||rows[0].id!==input.id||rows[0].status!=='retired')throw new Error('Feedback retirement was not confirmed.');
    return {id:rows[0].id,version:rows[0].version,status:rows[0].status};
  }
  if(command==='export'){
    if(!target||!output)throw new Error(usage);
    const envelope=await request('rpc/studio_memory_active_snapshot',{});
    if(envelope.length!==1||!Array.isArray(envelope[0]?.snapshot?.writingFeedback))throw new Error('Explicit feedback snapshot is incomplete.');
    const selected=selectExplicitWritingFeedback(envelope[0].snapshot.writingFeedback,[target]);
    privateFile(output,selected);
    return {selected:selected.receipt.selected.length,out:output};
  }
  throw new Error(usage);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(args.includes('--help')){console.log(usage);process.exit(0);}
    const envFile=option('--env-file')??path.resolve('apps/web/.env.local');
    if(fs.existsSync(envFile))process.loadEnvFile(envFile);
    const url=process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)throw new Error('Private Studio storage is not configured. Supply its protected environment file; no credentials are printed.');
    const request=async(resource,body)=>{
      const response=await fetch(`${url.replace(/\/$/u,'')}/rest/v1/${resource}`,{method:'POST',
        headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error(`Private feedback request was not confirmed (HTTP ${response.status}). Retry with the same requestId after checking storage.`);
      const rows=await response.json();if(!Array.isArray(rows))throw new Error('Private feedback returned an invalid result.');return rows;
    };
    const inputFile=option('--file'),output=option('--out');
    const input=inputFile?JSON.parse(fs.readFileSync(inputFile,'utf8')):null;
    console.log(JSON.stringify(await runFeedbackCommand({command,input,target:option('--target'),request,output})));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
