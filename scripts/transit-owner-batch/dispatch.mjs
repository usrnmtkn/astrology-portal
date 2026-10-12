import https from 'node:https';
import { openSync, writeSync, closeSync, fsyncSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MODEL } from '../../src/astro-writing/ownerTransitBatch.mjs';
import { verifyPreparedDispatch, dispatchPreparedOnce } from '../../src/astro-writing/personalTransitDispatch.mjs';

export async function runDispatch(mode,directory,authorizationPath) {
process.umask(0o077);
if(!['--preflight','--dispatch-eight-once'].includes(mode)||!directory||!authorizationPath) throw Error('Usage: node dispatch.mjs --preflight|--dispatch-eight-once /private/prepared /private/explicit-authorization.json');
const ready=verifyPreparedDispatch(directory,authorizationPath);
if(mode==='--preflight') {
  console.log(JSON.stringify({passed:true,manifestSha256:ready.manifestSha256,authorizationSha256:ready.authorizationSha256,requests:8,providerCalls:0}));
} else {
  const key=process.env.GEMINI_API_KEY;
  if(!key || /[\r\n]/u.test(key)) throw Error('GEMINI_API_KEY_REQUIRED');
  const send=({bytes,directory})=>new Promise((resolve,reject)=>{
    const req=https.request(MODEL.endpoint,{method:'POST',headers:{'content-type':'application/json','content-length':bytes.length,'x-goog-api-key':key}},res=>{
      (async()=>{
        writeFileSync(join(directory,'http.json'),JSON.stringify({httpStatus:res.statusCode,requestId:res.headers['x-request-id']??res.headers['x-goog-request-id']??null}),{flag:'wx',mode:0o600});
        const file=join(directory,'raw-response.bin'),fd=openSync(file,'wx',0o600);
        try {for await(const chunk of res)writeSync(fd,Buffer.from(chunk));fsyncSync(fd);} finally {closeSync(fd);}
        resolve({raw:readFileSync(file),httpStatus:res.statusCode,requestId:res.headers['x-request-id']??res.headers['x-goog-request-id']??null});
      })().catch(reject);
    });
    req.setTimeout(180000,()=>req.destroy(Object.assign(Error('PROVIDER_TIMEOUT'),{code:'PROVIDER_TIMEOUT'})));
    req.on('error',reject);req.end(bytes);
  });
  const result=await dispatchPreparedOnce({directory,authorizationPath,send});
  console.log(JSON.stringify({networkAttempts:result.networkAttempts,httpResponses:result.httpResponses,completedGenerations:result.completedGenerations,notAttempted:result.notAttempted,retries:0}));
}

}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runDispatch(...process.argv.slice(2));
