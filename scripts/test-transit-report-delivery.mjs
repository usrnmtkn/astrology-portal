import assert from 'node:assert/strict';
import { build } from 'esbuild';
const scoped = process.argv.includes('--scoped');
const material = process.argv.includes('--material');
const evidenceDelivery = process.argv.includes('--evidence-delivery');
const selectedPolicy = evidenceDelivery ? 'report-evidence-delivery-v2' : material ? 'report-materiality-candidate-v1' : 'strict';

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
      transport: `export const callReportCalibrationModel = async input => {
        await input.beforeProviderCall(); const result = await globalThis.reportDeliveryFixture.call(input);
        if(input.schemaName==='tldr_generated_report_judge' && !input.schema.properties.findings.items.properties.sourceQuote) {
          result.value.findings=result.value.findings.map(({sourceQuote,...finding})=>finding);
        }
        if(input.schema.properties.reconciliation) {
          const prior=JSON.parse(input.prompt.split('PREVIOUS REVIEW DATA\\n')[1].split('\\nEXACT FIELD CHANGE RECEIPT')[0]);
          result.value.reconciliation={
            priorFindings:prior.findings.map((f,index)=>({index,resolution:result.value.findings.some(n=>n.category===f.category)?'still_present':'resolved',explanation:'Synthetic correction outcome.'})),
            currentFindings:result.value.findings.map((f,index)=>{const previous=prior.findings.findIndex(p=>p.category===f.category);return {index,priorFindingIndex:previous<0?null:previous,origin:previous<0?'previously_missed':'unresolved',explanation:'Synthetic retained or missed defect.',changeQuote:null};})
          };
        }
        return result;
      };`,
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
      if(evidenceDelivery) {
        assert.equal(input.requestLimits.maxInputBytes,87808);
        assert.equal(input.requestLimits.maxOutputTokens,judge?6000:12000);
        assert.equal(input.disableFallback,true);
      }
      prompts.push({judge,prompt:input.prompt});
      if (kind === 'day') assert(input.prompt.includes(JSON.stringify(fullDailySource)),
        'Every daily writer, correction and judge call must receive the complete approved source');
      if(judge){
        judgeCalls++;
        if(scenario==='initial-judge-outage') throw Error('Synthetic initial review outage');
        const submitted=JSON.parse(scoped
          ? input.prompt.split('COMPLETE READER-VISIBLE DRAFT\n\n')[1].split('\n\nDRAFT_SHA256:')[0]
          : input.prompt.split('COMPLETE READER-VISIBLE DRAFT\n')[1].split('\n').slice(1).join('\n').split('\n\nSYNTHETIC')[0]);
        assert.deepEqual(Object.keys(submitted),['headline','summary','body']);
        assert(!input.prompt.includes(output.summary),'Discarded transport alias must never be reviewed');
        const draftSha256=scoped ? input.prompt.match(/DRAFT_SHA256: ([a-f0-9]{64})/)[1] : null;
        if(input.schemaName==='tldr_generated_report_facts_judge') return {value:{draftSha256,scores:{astrology_chronology:4,factual_traceability:4},findings:[]},provider:input.provider,model:input.model,usage:{inputTokens:10,outputTokens:5,totalTokens:15}};
        const failed=['rejected','invalid-judge-evidence'].includes(scenario) || (['correction','cleanup'].includes(scenario) && judgeCalls===(scoped?2:1));
        const scores=Object.fromEntries(api.GENERATED_REPORT_JUDGE_CATEGORIES.filter(key=>!scoped||!['astrology_chronology','factual_traceability'].includes(key)).map(key=>[key,4]));
        if (evidenceDelivery) {
          const advisory = {category:'owner_voice',location:'body',finding:'Advisory style sentinel',draftQuote:submitted.body.slice(0,30),sourcePath:null,sourceQuote:null,
            ownerComparisons:scenario==='invalid-judge-evidence'?[]:[{evidenceId:'synthetic-owner',quote:'Synthetic owner comparison.',difference:'Synthetic difference.'}],delivery:null};
          const blocker = {...advisory,category:'unsupported_interpretation',finding:'Synthetic diagnostic: unsupported fact sentinel',ownerComparisons:[],delivery:{kind:'unsupported_claim',claimType:'interpretation',claimQuote:submitted.body.slice(0,30),sourceGap:'Synthetic protocol test of missing claim support; not a semantic assessment.',ruleId:null,ruleApplication:null}};
          const blocked = failed && scenario !== 'invalid-judge-evidence' || scenario==='factual' || scenario==='mixed' && judgeCalls===1;
          const findings = [...(blocked?[blocker]:[]), ...(['advisory','aggregate','mixed','invalid-judge-evidence'].includes(scenario)?[advisory]:[])];
          if (['advisory','aggregate'].includes(scenario)) for (const key of Object.keys(scores)) scores[key]=0;
          return {value:{scores,findings},provider:input.provider,model:input.model,usage:{inputTokens:10,outputTokens:5,totalTokens:15}};
        }
        if(failed)scores.owner_voice=material?2:3;
        if (material && ['advisory','mixed','factual','aggregate'].includes(scenario)) {
          const first = judgeCalls === 1;
          const categories = scenario === 'aggregate' ? api.GENERATED_REPORT_JUDGE_CATEGORIES.filter(key=>!['astrology_chronology','factual_traceability'].includes(key))
            : scenario === 'factual' ? ['factual_traceability'] : scenario === 'mixed' && first ? ['owner_voice','interpretive_movement'] : ['owner_voice','natural_language'];
          for (const category of categories) scores[category] = scenario === 'mixed' && first && category === 'interpretive_movement' ? 2 : 3;
          return {value:{scores,findings:categories.map(category=>({category,location:'body',finding:category === 'interpretive_movement' ? 'Material movement sentinel' : category === 'factual_traceability' ? 'Unsupported fact sentinel' : 'Advisory style sentinel',draftQuote:submitted.body.slice(0,30),sourcePath:null,sourceQuote:null,
            ownerComparisons:category==='owner_voice'?[{evidenceId:'synthetic-owner',quote:'Synthetic owner comparison.',difference:'Synthetic difference.'}]:[]}))},provider:input.provider,model:input.model,usage:{inputTokens:10,outputTokens:5,totalTokens:15}};
        }
        return {value:{...(scoped?{draftSha256}:{}),scores,findings:failed?[{...(scoped?{contextQuote:submitted.body.split('\n\n')[0],readerConsequence:'Synthetic transition obscures the reader connection.'}:{}),category:'owner_voice',location:'body, first sentence',finding:'Synthetic diagnostic: simplify the transition while preserving supplied facts.',draftQuote:submitted.body.slice(0,30),sourcePath:null,sourceQuote:null,ownerComparisons:scenario==='invalid-judge-evidence'?[]:[{evidenceId:'synthetic-owner',quote:'Synthetic owner comparison.',difference:'Synthetic difference in the transition.'}]}]:[]},provider:input.provider,model:input.model,responseId:`judge-${judgeCalls}`,usage:{inputTokens:10,outputTokens:5,totalTokens:15}};
      }
      writerCalls++;
      if(scenario==='initial-writer-outage') throw Error('Synthetic initial writer outage');
      if (scenario === 'mixed' && writerCalls > 1) {
        assert(input.prompt.includes(evidenceDelivery?'unsupported fact sentinel':'Material movement sentinel'));
        assert(!input.prompt.includes('Advisory style sentinel'), 'Advisory feedback cannot instruct a rewrite');
      }
      if(writerCalls>1 && ['correction','cleanup','rejected'].includes(scenario)){
        assert.match(input.prompt,/TARGETED REPORT REVISION TASK|DETERMINISTIC CLEANUP TASK/);
        assert(!input.prompt.includes('TLDR ASTRO PERSONAL TRANSIT SYNTHESIS'));
        assert(!input.prompt.includes('TLDR ASTRO FRIEND TRANSIT SYNTHESIS'));
        assert(input.prompt.includes('Synthetic diagnostic'));
        assert(input.prompt.includes(JSON.stringify(output.body)));
      }
      let body=output.body;
      if(scenario==='initial-validation-exhausted') body='Incomplete.';
      if(scenario==='cleanup' && writerCalls===2) body=body.replace('Avoiding the conversation','Questioning whether to have the conversation');
      return {value:{...output,body},provider:input.provider,model:input.model,responseId:`writer-${writerCalls}`};
    },
  };
}

const previous = globalThis.reportDeliveryFixture;
const savedEnv = {...process.env};
Object.assign(process.env,{GENERATED_REPORT_RELEASE_POLICY:selectedPolicy,GENERATED_REPORT_REVIEW_MODE:scoped?'scoped':'combined',CONTENT_GENERATION_PROVIDER:'openai',CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL:'openai',FRIEND_REPORT_BILLING_MODE:'free_test',YOU_REPORT_JOB_ATTEMPT_CAP:'1',FRIEND_REPORT_JOB_ATTEMPT_CAP:'1'});
let cases=0;
try{
  for(const kind of ['day','week','friends']) for(const scenario of ['first-pass','correction','cleanup','rejected','invalid-judge-evidence','save-error','empty-save','completion-error',...(material||evidenceDelivery?['advisory','mixed','factual','aggregate']:[]),...(evidenceDelivery?['initial-writer-outage','initial-validation-exhausted','initial-judge-outage']:[])]){
    const f=fixture(kind,scenario);globalThis.reportDeliveryFixture=f;
    const held = ['rejected','invalid-judge-evidence','factual'].includes(scenario) || scenario===(evidenceDelivery?'cleanup':'aggregate') || scenario.startsWith('initial-');
    process.env.YOU_REPORT_JOB_ATTEMPT_CAP = process.env.FRIEND_REPORT_JOB_ATTEMPT_CAP = held ? '4' : '1';
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
    const success=['first-pass','correction','advisory','mixed',evidenceDelivery?'aggregate':'cleanup'].includes(scenario);
    if(success){
      assert.equal(job.state,'complete',JSON.stringify(result)+' '+job.last_error+' '+JSON.stringify(f.rows.transit_report_model_checkpoints.filter(c=>c.state==='failed')));
      assert.equal(job.result_id,row.id); assert.equal(row.body,f.output.body);
      assert.equal(row.summary,f.output.tldr);assert.equal(row.source_snapshot.generatedReportQualityGate.verdict,'pass');
      if(material) {
        const receipt=row.source_snapshot.generatedReportQualityGate.releaseDecision;
        assert.equal(receipt.policy,'report-materiality-candidate-v1'); assert.match(receipt.draftSha256,/^[a-f0-9]{64}$/);
        if (['advisory','mixed'].includes(scenario)) {assert.equal(receipt.strictVerdict,'below_threshold');assert.equal(receipt.advisoryFindings.length,2);}
      }
      if(evidenceDelivery) {
        const receipt=row.source_snapshot.generatedReportQualityGate.releaseDecision;
        assert.equal(receipt.policy,selectedPolicy);
        if (['advisory','aggregate'].includes(scenario)) {assert.equal(receipt.strictVerdict,'below_threshold');assert.equal(receipt.overall,0);assert.equal(receipt.advisoryFindings.length,1);}
        assert.equal(receipt.blockingFindings.length,0);
      }
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
      assert.equal((await api.listReportLibrary())[0].progressLabel,held?'Needs review':'Could not finish');
      assert.equal(await api.loadGeneratedReportById(row.id),null);
      assert(!f.writes.some(([table,write])=>table.endsWith('_jobs') && write.state==='complete'));
    }
    assert.equal(f.calls.judge,['initial-writer-outage','initial-validation-exhausted'].includes(scenario)?0:scenario==='first-pass'||evidenceDelivery&&scenario==='cleanup'||['initial-judge-outage','invalid-judge-evidence','save-error','empty-save','completion-error','advisory','aggregate'].includes(scenario)?(scoped?2:1):(scoped?4:2));
    if(scenario==='initial-validation-exhausted') assert.equal(f.calls.writer,3,'The initial validation allowance cannot restart in another job attempt');
    if(['initial-writer-outage','initial-judge-outage'].includes(scenario)) assert.equal(f.calls.writer,1);
    if(scenario==='invalid-judge-evidence') {
      assert.equal(f.calls.writer,1,'Invalid judge evidence must not instruct a corrective writer.');
      assert.match(job.last_error,/owner_voice lacks eligible comparison evidence/u);
    }
    if(scenario==='cleanup')assert.equal(f.calls.writer,evidenceDelivery?2:3);
    if(scenario==='advisory'||scenario==='aggregate')assert.equal(f.calls.writer,1);
    if(held) {
      assert.equal(job.attempt,1,'Four available attempts must not repeat a completed quality cycle');
      assert.equal(job.checkpoint_attempt,1);
      const before=clone(f.calls), checkpointCount=f.rows.transit_report_model_checkpoints.length;
      const response={setHeader(){}};
      const body=kind==='friends'
        ? {subjectType:'friend_transit_reading',subjectId:'synthetic-friend',targetDate:'2026-09-14',facts:{friendTransitsBrief:f.friendBrief}}
        : {reportWindow:kind,brief:f.youBrief};
      // Both HTTP re-request and cron must preserve the hold, including after a policy rollback.
      process.env.GENERATED_REPORT_RELEASE_POLICY='strict';
      await (kind==='friends'?api.friendRequestHandler:api.youRequestHandler)({method:'POST',body},response);
      assert.equal(response.status,409);assert.equal(response.body.status,'needs_review');assert.equal(response.body.reportId,row.id);
      assert.equal(f.background.length,0);assert.equal(row.status,'ERROR');
      await run({workerId:'next-cron',jobId:job.id,admin:f.admin});
      assert.deepEqual(f.calls,before);assert.equal(f.rows.transit_report_model_checkpoints.length,checkpointCount);
      assert.equal(job.state,'failed');assert.equal(job.checkpoint_attempt,1);
      assert.equal((await api.listReportLibrary())[0].progressLabel,'Needs review');
      process.env.GENERATED_REPORT_RELEASE_POLICY=selectedPolicy;
    }
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
    assert.equal(f.rows[friend?'friend_report_jobs':'you_report_jobs'][0].state,evidenceDelivery?'failed':'retry');
    assert.equal((await api.listReportLibrary())[0].progressLabel,evidenceDelivery?'Needs review':'Queued to continue');
    if(!evidenceDelivery) assert.equal(f.rows.user_generated_interpretations[0].source_snapshot.reportProgress.stage,'waiting');
    process.env[friend?'FRIEND_REPORT_JOB_ATTEMPT_CAP':'YOU_REPORT_JOB_ATTEMPT_CAP']='1';
    console.log(`PASS ${kind}: retry progress`); cases++;
  }
  for (const kind of ['day','week','friends']) for (const phase of ['correction','final-review']) {
    const f=fixture(kind,'correction'); globalThis.reportDeliveryFixture=f;
    const friend=kind==='friends';
    process.env.YOU_REPORT_JOB_ATTEMPT_CAP=process.env.FRIEND_REPORT_JOB_ATTEMPT_CAP='4';
    const queued=friend
      ? await api.requestFriendReport({userId:f.client.userId,subjectId:'synthetic-friend',targetDate:'2026-09-14',facts:{friendTransitsBrief:f.friendBrief},admin:f.admin})
      : await api.requestYouReport({userId:f.client.userId,reportWindow:kind,brief:f.youBrief,admin:f.admin});
    const original=f.call.bind(f); let dispatched=0;
    f.call=async input=>{
      dispatched++;
      if (phase==='correction' && !input.schemaName.includes('judge') && f.calls.writer===1
        || phase==='final-review' && input.schemaName.includes('judge') && f.calls.writer===2) throw new Error('Synthetic outage after correction began');
      return original(input);
    };
    const run=friend?api.runFriendReportJobs:api.runYouReportJobs;
    await run({workerId:'outage-worker',jobId:queued.job.id,admin:f.admin});
    const job=f.rows[friend?'friend_report_jobs':'you_report_jobs'][0];
    assert.equal(job.state,'failed'); assert.match(job.last_error,/Report review required:/);
    assert.equal(job.checkpoint_attempt,1); assert.equal(job.attempt,1);
    const before=dispatched;
    await run({workerId:'next-worker',jobId:queued.job.id,admin:f.admin});
    assert.equal(dispatched,before,'An outage after a quality rejection must not reset the correction allowance');
    console.log(`PASS ${kind}: ${phase} outage holds without resetting quality budget`);cases++;
  }
  for (const kind of ['day','week','friends']) for (const state of ['failed','retry']) {
    const f=fixture(kind,'first-pass'); globalThis.reportDeliveryFixture=f;
    const friend=kind==='friends';
    const request=()=>friend
      ? api.requestFriendReport({userId:f.client.userId,subjectId:'synthetic-friend',targetDate:'2026-09-14',facts:{friendTransitsBrief:f.friendBrief},admin:f.admin})
      : api.requestYouReport({userId:f.client.userId,reportWindow:kind,brief:f.youBrief,admin:f.admin});
    await request();
    const job=f.rows[friend?'friend_report_jobs':'you_report_jobs'][0];
    Object.assign(job,{state,attempt:2,checkpoint_attempt:2,last_error:'Writing quality gate did not pass after one corrective rewrite and re-judge. {"stage":"second_judgment"}'});
    const row=f.rows.user_generated_interpretations[0];row.status=state==='failed'?'ERROR':'DRAFT';row.error=job.last_error;
    const requested=await request();
    assert.equal(requested.status,state==='failed'?'needs_review':'queued');
    await (friend?api.runFriendReportJobs:api.runYouReportJobs)({workerId:'legacy-worker',jobId:job.id,admin:f.admin});
    assert.equal(job.state,'failed');assert.equal(job.checkpoint_attempt,2);assert.equal(row.status,'ERROR');
    assert.deepEqual(f.calls,{writer:0,judge:0},'Legacy exhausted quality cycles cannot restart');
    assert.equal((await api.listReportLibrary())[0].progressLabel,'Needs review');
    console.log(`PASS ${kind}: legacy ${state} rejection held without model calls`);cases++;
  }
  const copy={headline:'Title',summary:'Summary',body:'Body'};
  for(const rows of [[],[{...copy}],[{id:'x',...copy,body:''}],[{id:'x',...copy,body:'Changed'}],[{id:'x',...copy},{id:'y',...copy}]]) assert.throws(()=>api.assertSavedTransitReading(rows,copy));
  api.assertSavedTransitReading([{id:'x',...copy}],copy);
  console.log(`Transit report delivery (${selectedPolicy}/${scoped?'scoped':'combined'}): ${cases} actual-pipeline fixture cases passed; save acknowledgement, client retrieval, ownership, deletion and rendered opening/ending verified. No live provider or production claim.`);
}finally{
  if(previous===undefined)delete globalThis.reportDeliveryFixture;else globalThis.reportDeliveryFixture=previous;
  for(const key of ['GENERATED_REPORT_RELEASE_POLICY','GENERATED_REPORT_REVIEW_MODE','CONTENT_GENERATION_PROVIDER','CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL','FRIEND_REPORT_BILLING_MODE','YOU_REPORT_JOB_ATTEMPT_CAP','FRIEND_REPORT_JOB_ATTEMPT_CAP']){
    if(savedEnv[key]===undefined)delete process.env[key];else process.env[key]=savedEnv[key];
  }
}
