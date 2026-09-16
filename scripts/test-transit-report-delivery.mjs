import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Real generation, validation, judge verdict, checkpoint, lifecycle, retrieval
// and reader component. Only external storage, model transport and private
// owner-evidence access are fixtures. This is NOT live model/production proof.
const bundle = await build({
  stdin: { contents: `export { requestYouReport, runYouReportJobs } from './api/_lib/you-report-lifecycle.ts';
    export { requestFriendReport, runFriendReportJobs } from './api/_lib/friend-report-lifecycle.ts';
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
    ]) b.onResolve({ filter }, () => ({ path: name, namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({path}) => ({ contents: {
      admin: 'export const createSupabaseReportAdmin = () => globalThis.reportDeliveryFixture.admin;',
      auth: 'export const getSupabaseClient = async () => globalThis.reportDeliveryFixture.client;',
      transport: 'export const callReportCalibrationModel = async input => { await input.beforeProviderCall(); return globalThis.reportDeliveryFixture.call(input); };',
      gate: 'export const prepareProductionPreCallGate = () => ({}); export const assertProductionPreCallGate = () => true;',
      voice: `export const transitReadingOwnerVoice = () => []; export const assertTransitReadingOwnerVoice = () => true;
        export const transitReadingOwnerVoiceReceipt = () => ({version:'synthetic-only', sources:[]});
        export const transitReadingOwnerVoicePrompt = () => 'SYNTHETIC OWNER EVIDENCE ACCESS. NOT PRODUCTION PROOF.';`,
      instructions: `export const governedInstructionsForRole = () => 'Synthetic role boundary'; export const instructionsForRole = () => 'Synthetic reviewer boundary';`,
    }[path] }));
  } }],
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const clone = value => structuredClone(value);
const asParams = value => value instanceof URLSearchParams ? value : new URLSearchParams(value);
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
    admin,client,rows,prompts,writes,output,youBrief,friendBrief,
    get calls(){return {writer:writerCalls,judge:judgeCalls};},
    async call(input){
      const judge=input.schemaName==='tldr_generated_report_judge';
      prompts.push({judge,prompt:input.prompt});
      if(judge){
        judgeCalls++;
        const submitted=JSON.parse(input.prompt.split('COMPLETE READER-VISIBLE DRAFT\n')[1].split('\n').slice(1).join('\n').split('\n\nSYNTHETIC')[0]);
        assert.deepEqual(Object.keys(submitted),['headline','summary','body']);
        assert(!input.prompt.includes(output.summary),'Discarded transport alias must never be reviewed');
        const failed=scenario==='rejected' || (['correction','cleanup'].includes(scenario) && judgeCalls===1);
        const scores=Object.fromEntries(api.GENERATED_REPORT_JUDGE_CATEGORIES.map(key=>[key,4]));
        if(failed)scores.owner_voice=3;
        return {value:{scores,findings:failed?[{category:'owner_voice',location:'body, first sentence',finding:'Synthetic diagnostic: simplify the transition while preserving supplied facts.'}]:[]},provider:input.provider,model:input.model,responseId:`judge-${judgeCalls}`};
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
Object.assign(process.env,{CONTENT_GENERATION_PROVIDER:'openai',CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL:'openai',FRIEND_REPORT_BILLING_MODE:'free_test',YOU_REPORT_JOB_ATTEMPT_CAP:'1',FRIEND_REPORT_JOB_ATTEMPT_CAP:'1'});
let cases=0;
try{
  for(const kind of ['day','week','friends']) for(const scenario of ['first-pass','correction','cleanup','rejected','save-error','empty-save','completion-error']){
    const f=fixture(kind,scenario);globalThis.reportDeliveryFixture=f;
    const queued=kind==='friends'
      ? await api.requestFriendReport({userId:f.client.userId,subjectId:'synthetic-friend',targetDate:'2026-09-14',facts:{friendTransitsBrief:f.friendBrief},admin:f.admin})
      : await api.requestYouReport({userId:f.client.userId,reportWindow:kind,brief:f.youBrief,admin:f.admin});
    assert.equal(queued.status,'queued',JSON.stringify(queued));
    const run=kind==='friends'?api.runFriendReportJobs:api.runYouReportJobs;
    const result=await run({workerId:'fixture-worker',jobId:queued.job.id,admin:f.admin});
    const job=f.rows[kind==='friends'?'friend_report_jobs':'you_report_jobs'][0];
    const row=f.rows.user_generated_interpretations[0];
    const success=['first-pass','correction','cleanup'].includes(scenario);
    if(success){
      assert.equal(job.state,'complete',JSON.stringify(result)+' '+job.last_error+' '+JSON.stringify(f.rows.transit_report_model_checkpoints.filter(c=>c.state==='failed')));
      assert.equal(job.result_id,row.id); assert.equal(row.body,f.output.body);
      assert.equal(row.summary,f.output.tldr);assert.equal(row.source_snapshot.generatedReportQualityGate.verdict,'pass');
      const loaded=await api.loadGeneratedReportById(row.id);assert.equal(loaded.body,f.output.body);
      const html=api.renderToStaticMarkup(api.createElement(api.GeneratedReportArticle,{report:loaded}));
      assert.equal(html.split(f.output.tldr).length-1,1,'The reader displays the TLDR once');
      assert(html.includes('Avoiding the conversation can have the opposite'));
      assert(html.includes('The conversation may end with a better understanding of what still needs attention.'));
      assert(!html.includes('Synthetic diagnostic'));assert(!html.includes('transport alias'));
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
      assert.equal(await api.loadGeneratedReportById(row.id),null);
      assert(!f.writes.some(([table,write])=>table.endsWith('_jobs') && write.state==='complete'));
    }
    assert.equal(f.calls.judge,scenario==='first-pass'||['save-error','empty-save','completion-error'].includes(scenario)?1:2);
    if(scenario==='cleanup')assert.equal(f.calls.writer,3);
    console.log(`PASS ${kind}: ${scenario}`);cases++;
  }
  const copy={headline:'Title',summary:'Summary',body:'Body'};
  for(const rows of [[],[{...copy}],[{id:'x',...copy,body:''}],[{id:'x',...copy,body:'Changed'}],[{id:'x',...copy},{id:'y',...copy}]]) assert.throws(()=>api.assertSavedTransitReading(rows,copy));
  api.assertSavedTransitReading([{id:'x',...copy}],copy);
  console.log(`Transit report delivery: ${cases} actual-pipeline fixture cases passed; save acknowledgement, client retrieval, ownership, deletion and rendered opening/ending verified. No live provider or production claim.`);
}finally{
  if(previous===undefined)delete globalThis.reportDeliveryFixture;else globalThis.reportDeliveryFixture=previous;
  for(const key of ['CONTENT_GENERATION_PROVIDER','CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL','FRIEND_REPORT_BILLING_MODE','YOU_REPORT_JOB_ATTEMPT_CAP','FRIEND_REPORT_JOB_ATTEMPT_CAP']){
    if(savedEnv[key]===undefined)delete process.env[key];else process.env[key]=savedEnv[key];
  }
}
