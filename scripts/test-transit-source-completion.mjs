import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
process.argv.push('--fixture-only', '--source-completion');
const { api, fixture } = await import('./test-transit-report-delivery.mjs');
Object.assign(process.env, { GENERATED_REPORT_RELEASE_POLICY: 'report-source-completion-v1', GENERATED_REPORT_REVIEW_MODE: 'combined',
  CONTENT_GENERATION_PROVIDER: 'openai', CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL: 'openai', FRIEND_REPORT_BILLING_MODE: 'free_test',
  YOU_REPORT_JOB_ATTEMPT_CAP: '4', FRIEND_REPORT_JOB_ATTEMPT_CAP: '4' });
const outputDirIndex = process.argv.indexOf('--browser-fixture-dir');
const outputDir = outputDirIndex < 0 ? null : process.argv[outputDirIndex + 1];
if (outputDir) fs.mkdirSync(outputDir, { recursive: true });
let cases = 0;
// The correction-review permission belongs to one exact initial candidate.
{
  const f = fixture('friends', 'first-pass');
  globalThis.reportDeliveryFixture = f;
  const correctionReview = { purpose: 'transit-report-correction-review-v1', checked: true, passed: false,
    factLockPassed: true, shapePassed: true, draftSha256: '0'.repeat(64),
    violations: [{category:'banned_language',detail:'whether'}] };
  const input = { surface: 'friends', reportKind: 'friend_transit_reading', brief: f.friendBrief,
    draft: f.output, correctionReview };
  await assert.rejects(api.judgeGeneratedTransitReading(input), /must match the initial candidate/);
  correctionReview.draftSha256 = api.transitReadingDraftHash(f.output);
  await assert.rejects(api.judgeGeneratedTransitReading({ ...input, priorReview: {draft:f.output,scores:{},findings:[]} }), /must match the initial candidate/);
  process.env.GENERATED_REPORT_REVIEW_MODE = 'scoped';
  try { await assert.rejects(api.judgeGeneratedTransitReading(input), /combined reviewer/); }
  finally { process.env.GENERATED_REPORT_REVIEW_MODE = 'combined'; }
  assert.deepEqual(f.calls, {writer:0,judge:0}, 'Invalid diagnostic review permissions stop before provider dispatch');
}
for (const kind of ['day', 'week', 'friends']) for (const scenario of [
  'first-pass', 'correction', 'combined-correction', 'combined-correction-yield', 'lexical-only', 'lexical-remains', 'lexical-and-fact', 'rejected', 'cleanup', 'invalid-judge-evidence', 'initial-writer-outage',
  'initial-judge-outage', 'initial-validation-exhausted', 'missing-source', 'save-error', 'empty-save',
  'completion-error', 'checkpoint-error', 'yield', 'historical-held', 'oversized-review', 'explicit-retry'
]) {
  const f = fixture(kind, ['oversized-review', 'explicit-retry'].includes(scenario) ? 'first-pass' : scenario);
  globalThis.reportDeliveryFixture = f;
  const friend = kind === 'friends';
  f.friendBrief.primaryThemes[0].readerSections = [{ body: f.output.body, sourceKeys: ['synthetic-full-source'] }];
  const brief = friend ? f.friendBrief : f.youBrief;
  if (scenario === 'missing-source') {
    if (friend) delete brief.primaryThemes[0].readerSections;
    else if (kind === 'day') brief.approvedReaderText.transitReadings = [];
    else delete brief.approvedReaderText.horoscope.body;
  }
  const originalCall = f.call.bind(f);
  if (scenario === 'oversized-review') f.call = async input => {
    if (input.schemaName.includes('judge')) throw Error('Report request exceeds its pre-dispatch input limit.');
    return originalCall(input);
  };
  if (scenario === 'checkpoint-error') {
    const selectOne = f.admin.selectOne;
    f.admin.selectOne = async (table, params) => {
      if (table === 'transit_report_model_checkpoints') throw Error('Checkpoint read outage');
      return selectOne(table, params);
    };
  }
  const request = () => friend
    ? api.requestFriendReport({ userId: f.client.userId, subjectId: 'synthetic-friend', targetDate: '2026-09-14', facts: { friendTransitsBrief: brief }, admin: f.admin })
    : api.requestYouReport({ userId: f.client.userId, reportWindow: kind, brief, admin: f.admin });
  let queue = await request();
  const run = friend ? api.runFriendReportJobs : api.runYouReportJobs;
  const job = f.rows[friend ? 'friend_report_jobs' : 'you_report_jobs'][0];
  if (scenario === 'historical-held') {
    Object.assign(job, { state: 'failed', attempt: 4, checkpoint_attempt: 4, last_error: 'Report review required: previously rejected writing' });
    queue = await request();
    assert.equal(queue.status, 'needs_review');
  }
  if (scenario === 'explicit-retry') job.checkpoint_attempt = 2;
  const realNow = Date.now;
  let elapsed = 0;
  if (['yield', 'combined-correction-yield'].includes(scenario)) {
    Date.now = () => realNow() + elapsed;
    f.call = async input => { const result = await originalCall(input); if (scenario === 'yield' ? !input.schemaName.includes('judge') : input.schemaName.includes('judge')) elapsed = 200_000; return result; };
  }
  try { await run({ workerId: 'report-test', jobId: queue.job.id, admin: f.admin }); }
  finally { Date.now = realNow; }
  if (['yield', 'combined-correction-yield'].includes(scenario)) {
    assert.equal(job.state, 'retry');
    assert.equal(f.rows.user_generated_interpretations[0].body, '');
    f.call = originalCall;
    await run({ workerId: 'report-resume', jobId: job.id, admin: f.admin });
  }
  const row = f.rows.user_generated_interpretations[0];
  const success = ['first-pass', 'correction', 'combined-correction', 'combined-correction-yield', 'lexical-only', 'lexical-and-fact', 'yield', 'explicit-retry'].includes(scenario);
  assert.equal(row.source_snapshot.reportDelivery, undefined, 'No failure path may publish source assembly');
  assert.notEqual(row.provider, 'source');
  if (success) {
    assert.equal(job.state, 'complete', job.last_error);
    assert.equal(row.body, f.output.body);
    assert.equal(row.source_snapshot.generatedReportQualityGate.verdict, 'pass');
    if (outputDir && scenario === 'first-pass') {
      fs.writeFileSync(path.join(outputDir, `reviewed-${kind}.json`), JSON.stringify({ ...row, id: `reviewed-${kind}` }));
      // Explicit historical-record fixtures: never produced by the new worker.
      // Older saved source reports must still open without new generation.
      for (const relationship of friend ? [false, true] : [false]) {
        const historicalBrief = structuredClone(brief);
        if (relationship) historicalBrief.relationshipActivations = [{ id: 'synthetic-connection', headline: 'A supplied connection',
          activationBody: 'Things between you and Morgan may be easier to discuss.',
          effectBody: 'You could explain what you need before agreeing to a plan.' }];
        const prepared = api.prepareSourceCompletion(historicalBrief, row.headline);
        const source_snapshot = { ...row.source_snapshot, reportDelivery: { ...prepared.receipt, reason: 'historical_fixture' } };
        delete source_snapshot.generatedReportQualityGate;
        const name = relationship ? 'friends' : friend ? 'friends-personal' : kind;
        const historical = { ...row, ...prepared.draft, id: `source-${name}`, provider: 'source', source_snapshot };
        fs.writeFileSync(path.join(outputDir, `${name}.json`), JSON.stringify(historical));
      }
    }
    const loaded = await api.loadGeneratedReportById(row.id);
    assert.equal(loaded.body, row.body);
    const html = api.renderToStaticMarkup(api.createElement(api.GeneratedReportArticle, { report: loaded }));
    assert(!html.includes('Synthetic diagnostic'));
    assert.equal((await api.listReportLibrary())[0].status, 'ready');
    const calls = { ...f.calls };
    job.state = 'retry';
    await run({ workerId: 'report-reload', jobId: job.id, admin: f.admin });
    assert.deepEqual(f.calls, calls, 'Reload reuses saved reviewed output');
    f.client.userId = 'someone-else';
    assert.equal(await api.loadGeneratedReportById(row.id), null);
  } else {
    assert.notEqual(job.state, 'complete', `${kind}/${scenario}`);
    if (!['completion-error'].includes(scenario)) assert.equal(row.body, '');
    if (['rejected','cleanup','invalid-judge-evidence','initial-writer-outage','initial-judge-outage','initial-validation-exhausted','oversized-review','missing-source'].includes(scenario)) {
      assert.equal(job.state, 'failed');
      const calls = { ...f.calls };
      await request();
      await run({ workerId: 'no-new-quality-cycle', jobId: job.id, admin: f.admin });
      assert.deepEqual(f.calls, calls, 'A held review does not start an automatic spending loop');
    }
  }
  if (['combined-correction','combined-correction-yield','lexical-only'].includes(scenario)) {
    assert.deepEqual(f.calls, {writer:2,judge:2});
    assert.deepEqual(f.prompts.map(p=>p.judge), [false,true,false,true], 'Review all findings before spending the only rewrite');
    assert.match(f.prompts[1].prompt, /lexical validation FAILED/);
    assert.match(f.prompts[3].prompt, /Deterministic fact and writing validation passed/);
  }
  if (scenario === 'lexical-remains') assert.deepEqual(f.calls, {writer:2,judge:1}, 'A passing judge never waives remaining lexical failures');
  if (scenario === 'lexical-and-fact') {
    assert.deepEqual(f.prompts.map(p=>p.judge), [false,false,true], 'Fact failures cannot enter the lexical-only review path');
  }
  assert(f.calls.writer <= 2 && f.calls.judge <= 2);
  if (scenario === 'historical-held' || scenario === 'missing-source') assert.deepEqual(f.calls, {writer:0,judge:0});
  if (scenario === 'initial-validation-exhausted') assert.deepEqual(f.calls, {writer:2,judge:0});
  console.log(`PASS reviewed delivery ${kind}: ${scenario}`);
  cases++;
}
// Account rejection is operational failure, not an exhausted quality review.
// Exercise real checkpoint wrapping, persistence, library state and a manual
// retry (including a worker handoff) without a provider/network call.
for (const kind of ['day', 'week', 'friends']) for (const failureRole of ['writer', 'judge']) {
  const f = fixture(kind, 'first-pass');
  globalThis.reportDeliveryFixture = f;
  const friend = kind === 'friends';
  f.friendBrief.primaryThemes[0].readerSections = [{ body: f.output.body, sourceKeys: ['synthetic-full-source'] }];
  const request = () => friend
    ? api.requestFriendReport({ userId:f.client.userId, subjectId:'synthetic-friend', targetDate:'2026-09-14', facts:{friendTransitsBrief:f.friendBrief}, admin:f.admin })
    : api.requestYouReport({ userId:f.client.userId, reportWindow:kind, brief:f.youBrief, admin:f.admin });
  const run = friend ? api.runFriendReportJobs : api.runYouReportJobs;
  const normalCall = f.call.bind(f);
  let rejectedCalls = 0;
  f.call = async input => {
    if (input.schemaName.includes('judge') === (failureRole === 'judge')) {
      rejectedCalls++;
      throw new api.ReportProviderUnavailableError(failureRole === 'writer' ? 'claude' : 'openai', 'credits');
    }
    return normalCall(input);
  };
  const queued = await request();
  await run({workerId:'account-failure',jobId:queued.job.id,admin:f.admin});
  const job = f.rows[friend ? 'friend_report_jobs' : 'you_report_jobs'][0];
  const row = f.rows.user_generated_interpretations[0];
  assert.equal(job.state,'failed');
  assert.equal(job.result_id ?? null,null);
  assert.equal(row.body,'');
  assert.equal(row.status,'ERROR');
  assert.equal(row.error,api.REPORT_PROVIDER_UNAVAILABLE_MESSAGE);
  assert.match(job.last_error,/^Report provider unavailable:/);
  assert.equal(row.source_snapshot.reportDelivery,undefined);
  assert.equal((await api.listReportLibrary())[0].status,'needs_attention');
  assert.equal(rejectedCalls,1);
  await run({workerId:'no-auto-retry',jobId:job.id,admin:f.admin});
  assert.equal(rejectedCalls,1,'Account rejection must not create an automatic retry loop');
  const firstCheckpoints = structuredClone(f.rows.transit_report_model_checkpoints);
  await request();
  assert.equal(job.checkpoint_attempt,2);
  assert.match(job.last_error,/^Report provider unavailable:/);
  const realNow = Date.now;
  let elapsed = 0;
  Date.now = () => realNow() + elapsed;
  f.call = async input => {
    const result = await normalCall(input);
    if (!input.schemaName.includes('judge')) elapsed = 200_000;
    return result;
  };
  try { await run({workerId:'restored-account',jobId:job.id,admin:f.admin}); }
  finally { Date.now = realNow; }
  assert.equal(job.state,'retry','Restored writer must run and checkpoint before the worker yields');
  assert.match(job.last_error,/^Report provider unavailable:/,'Handoff must preserve explicit retry identity');
  f.call = normalCall;
  await run({workerId:'restored-account-resume',jobId:job.id,admin:f.admin});
  assert.equal(job.state,'complete',job.last_error);
  assert.notEqual(row.provider,'source');
  assert.equal(row.body,f.output.body);
  assert.equal(row.source_snapshot.generatedReportQualityGate.verdict,'pass');
  assert.equal(row.source_snapshot.reportDelivery,undefined);
  assert.deepEqual(f.rows.transit_report_model_checkpoints.slice(0,firstCheckpoints.length),firstCheckpoints,
    'Explicit recovery preserves the original failed checkpoints');
  console.log(`PASS account failure and explicit recovery: ${kind}/${failureRole}`);
  cases++;
}
console.log(`${cases} actual-pipeline reviewed delivery scenarios passed. No model/network calls.`);
