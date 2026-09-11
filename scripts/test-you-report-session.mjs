import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result=await build({stdin:{contents:`export { requestYouTransitReport } from './apps/web/src/features/you/youTransitReports.ts'; export { listReportLibrary } from './apps/web/src/services/reportLibrary.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'session-transport',setup(b){b.onResolve({filter:/\/auth$/},()=>({path:'auth',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const getSupabaseClient=async()=>globalThis.reportSessionFixture.client;'}));}}]});
const {requestYouTransitReport,listReportLibrary}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const previousFetch=globalThis.fetch;
let session=null,error=null,calls=0,queries=0;
globalThis.reportSessionFixture={client:{auth:{getSession:async()=>({data:{session},error})},from(){queries++;throw Error('Unexpected data query');}}};
globalThis.fetch=async(_url,options)=>{calls++;assert.equal(options.headers.authorization,'Bearer synthetic-token');return new Response(JSON.stringify({status:'queued'}),{status:202});};
const brief={window:'day'};
try {
 await assert.rejects(requestYouTransitReport(brief,'owner'),/session could not be confirmed/);
 await assert.rejects(listReportLibrary({expectedUserId:'owner'}),/session could not be confirmed/);
 assert.equal(calls,0);assert.equal(queries,0);
 session={user:{id:'other-owner'},access_token:'synthetic-token'};
 await assert.rejects(requestYouTransitReport(brief,'owner'),/session could not be confirmed/);
 await assert.rejects(listReportLibrary({expectedUserId:'owner'}),/session could not be confirmed/);
 assert.equal(calls,0);assert.equal(queries,0);
 session={user:{id:'owner'},access_token:'synthetic-token'};error=new Error('Temporary session read failure');
 await assert.rejects(requestYouTransitReport(brief,'owner'),/session could not be confirmed/);
 await assert.rejects(listReportLibrary({expectedUserId:'owner'}),/Temporary/);
 error=null;
 assert.equal((await requestYouTransitReport(brief,'owner')).status,'queued');assert.equal(calls,1);
 globalThis.reportSessionFixture.client=null;
 await assert.rejects(listReportLibrary({expectedUserId:'owner'}),/session could not be confirmed/);
 await assert.rejects(requestYouTransitReport(brief,'owner'),/sign-in is unavailable/);
 assert.equal(calls,1);assert.equal(queries,0);
 console.log('Report session boundaries passed: missing/recovering and changed accounts never submit; recovered session succeeds.');
}finally {globalThis.fetch=previousFetch;delete globalThis.reportSessionFixture;}
