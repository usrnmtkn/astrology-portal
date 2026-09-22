import assert from 'node:assert/strict';
import { build } from 'esbuild';
const scoped = process.argv.includes('--scoped');

// Real generation, validation, judge verdict, checkpoint, lifecycle, retrieval
// and reader component. Only external storage, model transport and private
// owner-evidence access are fixtures. This is NOT live model/production proof.
const bundle = await build({
  stdin: { contents: `export { requestYouReport, runYouReportJobs } from './api/_lib/you-report-lifecycle.ts';
    export { requestFriendReport, runFriendReportJobs } from './api/_lib/friend-report-lifecycle.ts';
    export { default as youRequestHandler } from './api/you-report-request.ts';
    export { default as friendRequestHandler } from './api/friend-report-request.ts';
    export { listReportLibrary, loadGeneratedReportById } from './apps/web/src/services/reportLibrary.ts';
    export { GeneratedReportArticle } from './apps/web/src/components/reports/ReportLibraryView.tsx';
    export { GENERATED_REPORT_JUDGE_CATEGORIES } from './api/_lib/transit-reading-judge-rules.ts';
    export { assertSavedTransitReading } from './api/_lib/transit-reading-reader-copy.ts';
    export { createElement } from 'react'; export { renderToStaticMarkup } from 'react-dom/server';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
  banner: { js: `import { createRequire } from 'node:module'; const require = createRequire(${JSON.stringify(import.meta.url)});` },
  plugins: [{ name: 'external-delivery-fixtures', setup(b) {
    for (const [filter, name] of [
      [/supabase-report-admin\.js$/, 'admin'], [/\/auth$/, 'auth'],
      [/report-model-client\.js$/, 'transport'], [/productionPreCallGate\.cjs$/, 'gate'],
      [/transit-reading-owner-voice\.js$/, 'voice'], [/openAIResponses\.cjs$/, 'instructions'],
      [/^@vercel\/functions$/, 'background'], [/report-http\.js$/, 'http'],
    ]) b.onResolve({ filter }, () => ({ path: name, namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({path}) => ({ contents: {
      admin: 'export const createSupabaseReportAdmin = () => globalThis.reportDeliveryFixture.admin;',
      auth: `export const getSupabaseClient = async () => globalThis.reportDeliveryFixture.client;
        export const getVerifiedAuthUser = async () => ({id:globalThis.reportDeliveryFixture.client.userId});`,
      transport: 'export const callReportCalibrationModel = async input => { await input.beforeProviderCall(); return globalThis.reportDeliveryFixture.call(input); };',
      gate: 'export const prepareProductionPreCallGate = () => ({}); export const assertProductionPreCallGate = () => true;',
      voice: `export const transitReadingOwnerVoice = () => [{evidenceId:'synthetic-owner',text:'Synthetic owner comparison.'}]; export const assertTransitReadingOwnerVoice = () => true;
        export const transitReadingVoiceContext = (facts, surface) => ({surface, horizon: surface === 'friends' ? 'current' : facts.youTransitReadingBrief.window});
        export const transitReadingOwnerVoiceReceipt = () => ({version:'synthetic-only', sources:[]});
        export const transitReadingOwnerVoicePrompt = () => 'SYNTHETIC OWNER EVIDENCE ACCESS. NOT PRODUCTION PROOF.';`,
      instructions: `export const governedInstructionsForRole = () => 'Synthetic role boundary'; export const instructionsForRole = () => 'Synthetic reviewer boundary';`,
      background: 'export const waitUntil = promise => globalThis.reportDeliveryFixture.background.push(promise);',
      http: `export const requireReportUser = async () => ({id:globalThis.reportDeliveryFixture.client.userId});
        export const jsonRequestBody = async req => req.body;
        export const sendJson = (res,status,body) => {res.status=status;res.body=body;};`,
    }[path] }));
  } }],
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const clone = value => structuredClone(value);
const asParams = value => value instanceof URLSearchParams ? value : new URLSearchParams(value);
const fullDailySource = 'Complete source opening.\n\n' + 'Approved source material remains available. '.repeat(100) + 'Complete source ending.';
const matches = (row, params) => [...asParams(params)].every(([key,value]) => {
  if (['select','order','limit','offset','on_conflict'].includes(key)) return true;
  if (value.startsWith('eq.')) return String(row[key] ?? '') === value.slice(3);
  if (value.startsWith('neq.')) return String(row[key] ?? '') !== value.slice(4);
  if (value === 'is.null') return row[key] == null;
  if (value.startsWith('in.(')) return value.slice(4,-1).split(',').includes(String(row[key]));
  throw Error(`Unimplemented fixture query ${key}=${value}`);
});

function fixture(kind, scenario) {
  let id = 0, writerCalls = 0, judgeCalls = 0;
  const rows = { user_generated_interpretations: [], user_reports: [], user_report_library_state: [], report_share_links: [],
    you_report_jobs: [], friend_report_jobs: [], you_report_entitlements: [], friend_report_entitlements: [],
    transit_report_model_checkpoints: [], generated_report_owner_feedback: [] };
  const prompts = [], writes = [];
  const now = () => new Date().toISOString();
  const output = {
    headline: kind === 'friends' ? "What's going on with Morgan right now?" : `Your ${kind}, in depth`,
    tldr: kind === 'friends' ? 'An honest conversation may leave Morgan with less to explain later.' : 'An honest conversation may leave you with less to explain later.',
    summary: 'This transport alias is not displayed and must not be judged.',
    body: kind === 'friends'
      ? 'Avoiding the conversation can have the opposite of the intended effect. Mars conjunct their Moon may make a difficult feeling more noticeable. Naming the feeling gives Morgan a clearer subject to discuss.\n\nThe useful choice is to say what they have been leaving out. They can acknowledge a difficulty without deciding everything at once. The conversation may end with a better understanding of what still needs attention.'
      : 'Avoiding the conversation can have the opposite of the intended effect. The Moon in Scorpio may make a difficult feeling more noticeable. Naming the feeling gives you a clearer subject to discuss.\n\nThe useful choice is to say what you have been leaving out. You can acknowledge a difficulty without deciding everything at once. The conversation may end with a better understanding of what still needs attention.',
  };
  const youBrief = {
    schema: 'tldr.you-transit-reading-brief.v1', window: kind, targetDate: '2026-09-14', periodEnd: kind === 'week' ? '2026-09-20' : '2026-09-14', dateLabel: 'Synthetic date',
    approvedReaderText: { horoscope: { body: output.body, headline: 'Honest conversations', source:'weekly-moon', driverLabel:'Moon in Scorpio' } },
    technicalEvidence: { readings: [{ source: 'weekly-moon', driverLabel: 'Moon in Scorpio', house: null }] },
  };
  const friendBrief = {
    schema: 'tldr.friend-transits-brief.v1', friendName: 'Morgan', dateLabel: 'Synthetic date',
    primaryThemes: [{id:'mars-conjunction-moon', title:'Mars conjunct Moon',durationLabel:'Current',rangeLabel:'',timingLabel:'', summary:output.body,orb:'0.5',detailAvailable:true,
      evidence:{transitPlanet:'Mars', aspect:'conjunction',natalPoint:'Moon',natalSign:'Scorpio',timingBonuses:[],contentKeys:['synthetic-mars-moon']} }],
    relationshipActivations:[],houseContext:[],daily:null,longerCycles:[],activePatterns:[],hasAnyTransit:true,counts:{primaryThemes:1},
  };
  if (kind === 'day') youBrief.approvedReaderText.transitReadings = [{
    transitId: 'synthetic-transit', heading: 'Synthetic source', body: fullDailySource,
    sourceUnits: ['fixture/approved-source'],
  }];
  function select(table, params) {
    const result = rows[table].filter(row => matches(row,params));
    if (asParams(params).get('order') === 'step.desc') result.sort((a,b)=>b.step-a.step);
    return clone(result.slice(0, Number(asParams(params).get('limit') ?? result.length)));
  }
  const admin = {
    async selectOne(table, params) {return select(table,params)[0] ?? null;},
    async request(path, options) {
      if (path.startsWith('generated_report_owner_feedback?')) return [];
      if (path.startsWith('rpc/claim_')) {
        const table = path.includes('friend') ? 'friend_report_jobs' : 'you_report_jobs';
        const request = JSON.parse(options.body);
        const job = rows[table].find(row => ['queued','retry'].includes(row.state) && (!request.requested_job_id || row.id===request.requested_job_id));
        if (!job) return [];
        Object.assign(job,{state:'running',attempt:(job.attempt??0)+1,locked_at:now(),locked_by:request.worker_id});
        return [clone(job)];
      }
      const [table,params=''] = path.split('?'); return select(table,params);
    },
    async insert(table, data, options={}) {
      const isResult = table === 'user_generated_interpretations' && data.body?.trim();
      if(isResult && scenario==='save-error') throw Error('Synthetic result persistence outage');
      if(isResult && scenario==='empty-save') return [];
      const conflictKeys=options.onConflict?.split(',');
      let row=conflictKeys ? rows[table].find(row=>conflictKeys.every(key=>row[key]===data[key])) : null;
      if(row && options.ignoreDuplicates) return [];
      if(!row) {row={id:`fixture-${++id}`,created_at:now(),updated_at:now()};rows[table].push(row);}
      Object.assign(row,clone(data),{updated_at:now()});
      if(table.endsWith('_jobs')) Object.assign(row,{state:row.state??'queued',attempt:row.attempt??0,checkpoint_attempt:row.checkpoint_attempt??1,run_after:row.run_after??now()});
      writes.push([table,clone(data)]); return [clone(row)];
    },
    async update(table,params,data) {
      if(table.endsWith('_jobs') && data.state==='complete' && scenario==='completion-error') throw Error('Synthetic completion bookkeeping outage');
      const changed=rows[table].filter(row=>matches(row,params));
      for(const row of changed) Object.assign(row,clone(data),{updated_at:now()});
      writes.push([table,clone(data)]); return clone(changed);
    },
  };
  const client={
    auth:{ getSession:async()=>({data:{session:{user:{id:client.userId}}}}) },userId:'synthetic-owner',
    from(table) {
      const params=new URLSearchParams(); const q={
        select(){return q;},eq(k,v){params.append(k,`eq.${v}`);return q;},in(k,v){params.append(k,`in.(${v.join(',')})`);return q;},order(){return q;},limit(n){params.set('limit',String(n));return q;},
        returns:async()=>({data:select(table,params),error:null}),maybeSingle:async()=>({data:select(table,params)[0]??null,error:null}),
      }; return q;
    },
  };
  return {
    admin,client,rows,prompts,writes,output,youBrief,friendBrief,background:[],
    get calls(){return {writer:writerCalls,judge:judgeCalls};},
    async call(input){
      const judge=input.schemaName.includes('judge');
      prompts.push({judge,prompt:input.prompt});
      if (kind === 'day') assert(input.prompt.includes(JSON.stringify(fullDailySource)),
        'Every daily writer, correction and judge call must receive the complete approved source');
      if(judge){
        judgeCalls++;
        const submitted=JSON.parse(scoped
          ? input.prompt.split('COMPLETE READER-VISIBLE DRAFT\n\n')[1].split('\n\nDRAFT_SHA256:')[0]
          : input.prompt.split('COMPLETE READER-VISIBLE DRAFT\n')[1].split('\n').slice(1).join('\n').split('\n\nSYNTHETIC')[0]);
        assert.deepEqual(Object.keys(submitted),['headline','summary','body']);
        assert(!input.prompt.includes(output.summary),'Discarded transport alias must never be reviewed');
        const draftSha256=scoped ? input.prompt.match(/DRAFT_SHA256: ([a-f0-9]{64})/)[1] : null;
        if(input.schemaName==='tldr_generated_report_facts_judge') return {value:{draftSha256,scores:{astrology_chronology:4,factual_traceability:4},findings:[]},provider:input.provider,model:input.model,usage:{inputTokens:10,outputTokens:5,totalTokens:15}};
        const failed=['rejected','invalid-judge-evidence'].includes(scenario) || (['correction','cleanup'].includes(scenario) && judgeCalls===(scoped?2:1));
        const scores=Object.fromEntries(api.GENERATED_REPORT_JUDGE_CATEGORIES.filter(key=>!scoped||!['astrology_chronology','factual_traceability'].includes(key)).map(key=>[key,4]));
        if(failed)scores.owner_voice=3;
        return {value:{...(scoped?{draftSha256}:{}),scores,findings:failed?[{...(scoped?{contextQuote:submitted.body.split('\n\n')[0],readerConsequence:'Synthetic transition obscures the reader connection.'}:{}),category:'owner_voice',location:'body, first sentence',finding:'Synthetic diagnostic: simplify the transition while preserving supplied facts.',draftQuote:submitted.body.slice(0,30),sourcePath:null,sourceQuote:null,ownerComparisons:scenario==='invalid-judge-evidence'?[]:[{evidenceId:'synthetic-owner',quote:'Synthetic owner comparison.',difference:'Synthetic difference in the transition.'}]}]:[]},provider:input.provider,model:input.model,responseId:`judge-${judgeCalls}`,usage:{inputTokens:10,outputTokens:5,totalTokens:15}};
      }
      writerCalls++;
      if(writerCalls>1 && ['correction','cleanup','rejected'].includes(scenario)){
        assert.match(input.prompt,/TARGETED REPORT REVISION TASK|DETERMINISTIC CLEANUP TASK/);
        assert(!input.prompt.includes('TLDR ASTRO PERSONAL TRANSIT SYNTHESIS'));
        assert(!input.prompt.includes('TLDR ASTRO FRIEND TRANSIT SYNTHESIS'));
        assert(input.prompt.includes('Synthetic diagnostic'));
        assert(input.prompt.includes(JSON.stringify(output.body)));
      }
      let body=output.body;
      if(scenario==='cleanup' && writerCalls===2) body=body.replace('Avoiding the conversation','Questioning whether to have the conversation');
      return {value:{...output,body},provider:input.provider,model:input.model,responseId:`writer-${writerCalls}`};
    },
  };
}

const previous = globalThis.reportDeliveryFixture;
const savedEnv = {...process.env};
Object.assign(process.env,{GENERATED_REPORT_REVIEW_MODE:scoped?'scoped':'combined',CONTENT_GENERATION_PROVIDER:'openai',CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL:'openai',FRIEND_REPORT_BILLING_MODE:'free_test',YOU_REPORT_JOB_ATTEMPT_CAP:'1',FRIEND_REPORT_JOB_ATTEMPT_CAP:'1'});
let cases=0;
try{
  for(const kind of ['day','week','friends']) for(const scenario of ['first-pass','correction','cleanup','rejected','invalid-judge-evidence','save-error','empty-save','completion-error']){
    const f=fixture(kind,scenario);globalThis.reportDeliveryFixture=f;
    const queued=kind==='friends'
      ? await api.requestFriendReport({userId:f.client.userId,subjectId:'synthetic-friend',targetDate:'2026-09-14',facts:{friendTransitsBrief:f.friendBrief},admin:f.admin})
      : await api.requestYouReport({userId:f.client.userId,reportWindow:kind,brief:f.youBrief,admin:f.admin});
    assert.equal(queued.status,'queued',JSON.stringify(queued));
    if (kind === 'day') assert.equal(f.rows.you_report_jobs[0].facts.youTransitReadingBrief.approvedReaderText.transitReadings[0].body, fullDailySource,
      'The queued job must persist the complete source for background generation');
    const run=kind==='friends'?api.runFriendReportJobs:api.runYouReportJobs;
    const result=await run({workerId:'fixture-worker',jobId:queued.job.id,admin:f.admin});
    const job=f.rows[kind==='friends'?'friend_report_jobs':'you_report_jobs'][0];
    const row=f.rows.user_generated_interpretations[0];
    const success=['first-pass','correction','cleanup'].includes(scenario);
    if(success){
      assert.equal(job.state,'complete',JSON.stringify(result)+' '+job.last_error+' '+JSON.stringify(f.rows.transit_report_model_checkpoints.filter(c=>c.state==='failed')));
      assert.equal(job.result_id,row.id); assert.equal(row.body,f.output.body);
      assert.equal(row.summary,f.output.tldr);assert.equal(row.source_snapshot.generatedReportQualityGate.verdict,'pass');
      if(scoped) { const reviews=row.source_snapshot.generatedReportQualityGate.scopedReviews; assert.equal(reviews.length,2);assert.equal(reviews[0].draftSha256,reviews[1].draftSha256);assert.ok(reviews.every(r=>r.requestSha256&&r.responseSha256&&r.usage.totalTokens===15)); }
      const loaded=await api.loadGeneratedReportById(row.id);assert.equal(loaded.body,f.output.body);
      const html=api.renderToStaticMarkup(api.createElement(api.GeneratedReportArticle,{report:loaded}));
      assert.equal(html.split(f.output.tldr).length-1,1,'The reader displays the TLDR once');
      assert(html.includes('Avoiding the conversation can have the opposite'));
      assert(html.includes('The conversation may end with a better understanding of what still needs attention.'));
      assert(!html.includes('Synthetic diagnostic'));assert(!html.includes('transport alias'));
      if(scenario==='first-pass') {
        const canonical=api.renderToStaticMarkup(api.createElement(api.GeneratedReportArticle,{report:{
          ...loaded,
          summary:'Synthetic summary opening. This complete summary ends here.',
          tldr:'Hidden legacy summary sentinel.',
        }}));
        assert.equal(canonical.split('Synthetic summary opening.').length-1,1,'The canonical summary opening is rendered once');
        assert.equal(canonical.split('This complete summary ends here.').length-1,1,'The complete summary ending is rendered once');
        assert(!canonical.includes('Hidden legacy summary sentinel.'),'Legacy transport TLDR is never displayed');
        assert(canonical.includes('Avoiding the conversation can have the opposite'));
        assert(canonical.includes('The conversation may end with a better understanding of what still needs attention.'));
      }
      const [item]=await api.listReportLibrary();assert.equal(item.status,'ready');
      const calls=clone(f.calls);
      job.state='retry';await run({workerId:'recovery-worker',jobId:job.id,admin:f.admin});
      assert.deepEqual(f.calls,calls,'Persisted reviewed result must be reused without more model calls');
      assert.equal(job.state,'complete');assert.equal(f.rows.user_generated_interpretations.length,1);
      f.client.userId='other-user';assert.equal(await api.loadGeneratedReportById(row.id),null);
      f.client.userId='synthetic-owner';
      f.rows.user_report_library_state.push({user_id:f.client.userId,source_kind:'generated_interpretation',source_id:row.id,deleted_at:new Date().toISOString()});
      assert.equal(await api.loadGeneratedReportById(row.id),null,'Deletion access remains enforced');
    }else if(scenario==='completion-error'){
      assert.notEqual(job.state,'complete');assert.equal(row.body,f.output.body);assert.equal(row.status,'DRAFT','Bookkeeping failure cannot turn a saved valid result into ERROR');
      assert((await api.loadGeneratedReportById(row.id))?.body);
    }else{
      assert.equal(job.state,'failed',job.last_error);assert(!job.result_id);assert.equal(row.body,'');
      assert.equal((await api.listReportLibrary())[0].progressLabel,'Could not finish');
      assert.equal(await api.loadGeneratedReportById(row.id),null);
      assert(!f.writes.some(([table,write])=>table.endsWith('_jobs') && write.state==='complete'));
    }
    assert.equal(f.calls.judge,scenario==='first-pass'||['invalid-judge-evidence','save-error','empty-save','completion-error'].includes(scenario)?(scoped?2:1):(scoped?4:2));
    if(scenario==='invalid-judge-evidence') {
      assert.equal(f.calls.writer,1,'Invalid judge evidence must not instruct a corrective writer.');
      assert.match(job.last_error,/owner_voice lacks eligible comparison evidence/u);
    }
    if(scenario==='cleanup')assert.equal(f.calls.writer,3);
    console.log(`PASS ${kind}: ${scenario}`);cases++;
  }
  for (const kind of ['day','week','friends']) for (const state of ['failed','running','complete','revoked','restore-conflict','share-error','deleted-during-work']) {
    const f=fixture(kind,'first-pass');globalThis.reportDeliveryFixture=f;
    const friend=kind==='friends';
    const request=()=>friend
      ? api.requestFriendReport({userId:f.client.userId,subjectId:'synthetic-friend',targetDate:'2026-09-14',facts:{friendTransitsBrief:f.friendBrief},admin:f.admin})
      : api.requestYouReport({userId:f.client.userId,reportWindow:kind,brief:f.youBrief,admin:f.admin});
    const queued=await request();
    const job=f.rows[friend?'friend_report_jobs':'you_report_jobs'][0];
    const row=f.rows.user_generated_interpretations[0];
    const run=friend?api.runFriendReportJobs:api.runYouReportJobs;
    if (state==='complete') await run({workerId:'first-worker',jobId:job.id,admin:f.admin});
    else if(state==='failed') Object.assign(job,{state:'failed',attempt:4,checkpoint_attempt:4});
    else if(state==='running') Object.assign(job,{state:'running',attempt:1});
    const deletedAt='2026-09-14T12:00:00.000Z';
    const libraryState={user_id:f.client.userId,source_kind:'generated_interpretation',source_id:row.id,deleted_at:deletedAt,archived_at:deletedAt,seen_at:deletedAt,updated_at:deletedAt};
    const unrelatedState={...libraryState,source_id:'unrelated-report'};
    f.rows.user_report_library_state.push(libraryState,unrelatedState);
    const share={user_id:f.client.userId,source_kind:'generated_interpretation',source_id:row.id,revoked_at:null};
    const otherOwnerShare={...share,user_id:'another-owner'};
    const premiumShare={...share,source_kind:'premium_report'};
    f.rows.report_share_links.push(share,otherOwnerShare,premiumShare);
    assert.equal((await api.listReportLibrary()).length,0);
    const before=clone(f.calls);
    if(state==='revoked') f.rows[friend?'friend_report_entitlements':'you_report_entitlements'][0].status='revoked';
    const update=f.admin.update;
    f.admin.update=async(table,params,data)=>{
      if(state==='share-error' && table==='report_share_links')throw Error('Synthetic share revocation outage');
      if(state==='restore-conflict' && table==='user_report_library_state'){
        libraryState.deleted_at='2026-09-14T12:01:00.000Z';libraryState.updated_at=libraryState.deleted_at;
      }
      return update(table,params,data);
    };
    if(state==='deleted-during-work'){
      await run({workerId:'existing-worker',jobId:job.id,admin:f.admin});
      assert.equal(libraryState.deleted_at,deletedAt,'A background worker never restores a deleted report');
      assert.equal((await api.listReportLibrary()).length,0);
    }else{
      const response={setHeader(){}};
      const body=friend
        ? {subjectType:'friend_transit_reading',subjectId:'synthetic-friend',targetDate:'2026-09-14',facts:{friendTransitsBrief:f.friendBrief}}
        : {reportWindow:kind,brief:f.youBrief};
      const originalError=console.error;
      const expectedErrors=[];
      if(['restore-conflict','share-error'].includes(state)) console.error=(message)=>expectedErrors.push(message);
      try {
        await (friend?api.friendRequestHandler:api.youRequestHandler)({method:'POST',body},response);
      } finally { console.error=originalError; }
      if(['restore-conflict','share-error'].includes(state)) assert.equal(expectedErrors.length,1);
      if(['revoked','restore-conflict','share-error'].includes(state)){
        assert.equal(response.status,state==='revoked'?409:400);
        assert.ok(libraryState.deleted_at);assert.equal((await api.listReportLibrary()).length,0);
        assert.equal(f.background.length,0,'A failed restore must not dispatch a billed job');
        assert.deepEqual(f.calls,before);
      }else{
        assert.equal(response.status,state==='complete'?200:202,JSON.stringify(response.body));
        assert.equal(response.body.reportId ?? response.body.saved?.[0]?.id,queued.reading.id);
        assert.equal(libraryState.deleted_at,null);assert.equal(libraryState.archived_at,null);assert.equal(libraryState.seen_at,null);
        assert.ok(share.revoked_at,'Re-requesting never revives an old share link');
        assert.equal(otherOwnerShare.revoked_at,null);assert.equal(premiumShare.revoked_at,null);
        assert.equal(unrelatedState.deleted_at,deletedAt);
        assert.equal((await api.listReportLibrary()).length,1,'The requested record is visible again');
        await Promise.all(f.background);
        if(state==='running'){
          assert.equal(job.attempt,1,'A running job is reused without a reset or duplicate call');
          assert.deepEqual(f.calls,before);
        }else{
          assert.equal(job.state,'complete');assert.equal(job.result_id,row.id);
          assert.equal((await api.loadGeneratedReportById(row.id)).body,f.output.body);
          if(state==='complete')assert.deepEqual(f.calls,before,'A completed report is reused without billed regeneration');
          if(state==='failed')assert.equal(job.checkpoint_attempt,5,'Retry preserves old checkpoint history');
        }
      }
    }
    console.log(`PASS ${kind}: deleted report ${state}`);cases++;
  }
  for (const kind of ['day','week','friends']) {
    const f=fixture(kind,'first-pass'); globalThis.reportDeliveryFixture=f;
    const friend=kind==='friends';
    const queued=friend
      ? await api.requestFriendReport({userId:f.client.userId,subjectId:'synthetic-friend',targetDate:'2026-09-14',facts:{friendTransitsBrief:f.friendBrief},admin:f.admin})
      : await api.requestYouReport({userId:f.client.userId,reportWindow:kind,brief:f.youBrief,admin:f.admin});
    process.env[friend?'FRIEND_REPORT_JOB_ATTEMPT_CAP':'YOU_REPORT_JOB_ATTEMPT_CAP']='2';
    f.call=async()=>{throw new Error('Synthetic transient provider outage');};
    await (friend?api.runFriendReportJobs:api.runYouReportJobs)({workerId:'retry-worker',jobId:queued.job.id,admin:f.admin});
    assert.equal(f.rows[friend?'friend_report_jobs':'you_report_jobs'][0].state,'retry');
    assert.equal((await api.listReportLibrary())[0].progressLabel,'Queued to continue');
    assert.equal(f.rows.user_generated_interpretations[0].source_snapshot.reportProgress.stage,'waiting');
    process.env[friend?'FRIEND_REPORT_JOB_ATTEMPT_CAP':'YOU_REPORT_JOB_ATTEMPT_CAP']='1';
    console.log(`PASS ${kind}: retry progress`); cases++;
  }
  const copy={headline:'Title',summary:'Summary',body:'Body'};
  for(const rows of [[],[{...copy}],[{id:'x',...copy,body:''}],[{id:'x',...copy,body:'Changed'}],[{id:'x',...copy},{id:'y',...copy}]]) assert.throws(()=>api.assertSavedTransitReading(rows,copy));
  api.assertSavedTransitReading([{id:'x',...copy}],copy);
  console.log(`Transit report delivery (${scoped?'scoped':'combined'}): ${cases} actual-pipeline fixture cases passed; save acknowledgement, client retrieval, ownership, deletion and rendered opening/ending verified. No live provider or production claim.`);
}finally{
  if(previous===undefined)delete globalThis.reportDeliveryFixture;else globalThis.reportDeliveryFixture=previous;
  for(const key of ['GENERATED_REPORT_REVIEW_MODE','CONTENT_GENERATION_PROVIDER','CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL','FRIEND_REPORT_BILLING_MODE','YOU_REPORT_JOB_ATTEMPT_CAP','FRIEND_REPORT_JOB_ATTEMPT_CAP']){
    if(savedEnv[key]===undefined)delete process.env[key];else process.env[key]=savedEnv[key];
  }
}
