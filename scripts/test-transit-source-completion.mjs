import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
process.argv.push('--fixture-only', '--source-completion');
const { api, fixture } = await import('./test-transit-report-delivery.mjs');
Object.assign(process.env, { GENERATED_REPORT_RELEASE_POLICY: 'report-source-completion-v1', GENERATED_REPORT_REVIEW_MODE: 'combined',
  CONTENT_GENERATION_PROVIDER: 'openai', CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL: 'openai', FRIEND_REPORT_BILLING_MODE: 'free_test',
  YOU_REPORT_JOB_ATTEMPT_CAP: '1', FRIEND_REPORT_JOB_ATTEMPT_CAP: '1' });
const sha = text => createHash('sha256').update(text).digest('hex');
const outputDirIndex = process.argv.indexOf('--browser-fixture-dir');
const outputDir = outputDirIndex < 0 ? null : process.argv[outputDirIndex + 1];
if (outputDir) fs.mkdirSync(outputDir, { recursive: true });
let cases = 0;
for (const kind of ['day', 'week', 'friends']) for (const scenario of [
  'first-pass', 'correction', 'rejected', 'cleanup', 'invalid-judge-evidence', 'initial-writer-outage',
  'initial-judge-outage', 'initial-validation-exhausted', 'missing-source', 'save-error', 'empty-save',
  'receipt-error', 'completion-error', 'checkpoint-error', 'yield', 'historical-held', 'jsonb-reorder', 'correction-save-error',
]) {
  const f = fixture(kind, scenario === 'correction-save-error' ? 'rejected' : scenario);
  globalThis.reportDeliveryFixture = f;
  const friend = kind === 'friends';
  // Preview copy is deliberately different: it must never replace full units.
  f.friendBrief.primaryThemes[0].readerSections = [{ body: f.output.body, sourceKeys: ['synthetic-full-source'] }];
  f.friendBrief.primaryThemes[0].summary = 'Preview only. Never deliver this in place of the full reading.';
  if (friend && scenario === 'initial-judge-outage') {
    f.friendBrief.relationshipActivations = [{id:'synthetic-connection',headline:'A supplied connection',
      activationBody:'Things between you and Morgan may be easier to discuss.',
      effectBody:'You could explain what you need before agreeing to a plan.'}];
  }
  const brief = friend ? f.friendBrief : f.youBrief;
  if (scenario === 'missing-source') {
    if (friend) delete brief.primaryThemes[0].readerSections;
    else if (kind === 'day') brief.approvedReaderText.transitReadings = [];
    else delete brief.approvedReaderText.horoscope.body;
  }
  const originalInsert = f.admin.insert;
  f.admin.insert = async (table, data, options) => {
    if (scenario === 'correction-save-error' && table === 'user_generated_interpretations' && data.body) throw Error('Save outage after exhausting correction');
    const rows = await originalInsert(table, data, options);
    if (scenario === 'receipt-error' && table === 'user_generated_interpretations' && data.body) {
      delete rows[0].source_snapshot.reportDelivery;
    }
    return scenario === 'jsonb-reorder' ? JSON.parse(JSON.stringify(rows), (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).reverse()) : value) : rows;
  };
  const originalCall = f.call.bind(f);
  if (['save-error', 'empty-save', 'receipt-error', 'checkpoint-error', 'completion-error', 'jsonb-reorder'].includes(scenario)) {
    f.call = async input => { if (!input.schemaName.includes('judge')) throw Error('Synthetic provider outage requiring source delivery'); return originalCall(input); };
  }
  if (scenario === 'checkpoint-error') {
    const selectOne = f.admin.selectOne;
    f.admin.selectOne = async (table, params) => {
      if (table === 'transit_report_model_checkpoints') throw Error('Checkpoint read outage');
      return selectOne(table, params);
    };
  }
  const request = async () => friend
    ? await api.requestFriendReport({ userId: f.client.userId, subjectId: 'synthetic-friend', targetDate: '2026-09-14', facts: { friendTransitsBrief: brief }, admin: f.admin })
    : await api.requestYouReport({ userId: f.client.userId, reportWindow: kind, brief, admin: f.admin });
  let queue = await request();
  const run = friend ? api.runFriendReportJobs : api.runYouReportJobs;
  const job = f.rows[friend ? 'friend_report_jobs' : 'you_report_jobs'][0];
  if (scenario === 'historical-held') {
    Object.assign(job, { state: 'failed', attempt: 4, checkpoint_attempt: 4, last_error: 'Report review required: previously rejected writing' });
    queue = await request();
    assert.equal(queue.status, 'queued');
  }
  // Force a real deadline handoff after the writer checkpoint, then resume.
  const realNow = Date.now;
  let elapsed = 0;
  if (scenario === 'yield') {
    Date.now = () => realNow() + elapsed;
    f.call = async input => { const result = await originalCall(input); if (!input.schemaName.includes('judge')) elapsed = 200_000; return result; };
  }
  try { await run({ workerId: 'source-test', jobId: queue.job.id, admin: f.admin }); }
  finally { Date.now = realNow; }
  if (scenario === 'yield') {
    assert.equal(job.state, 'retry');
    assert.equal(f.rows.user_generated_interpretations[0].body, '');
    f.call = originalCall;
    await run({ workerId: 'source-resume', jobId: job.id, admin: f.admin });
  }
  const row = f.rows.user_generated_interpretations[0];
  if (['save-error', 'empty-save', 'receipt-error', 'completion-error', 'missing-source', 'correction-save-error'].includes(scenario)) {
    assert.notEqual(job.state, 'complete', `${kind}/${scenario} must not claim completion`);
    if (scenario === 'missing-source') assert.deepEqual(f.calls, { writer: 0, judge: 0 });
    if (scenario === 'correction-save-error') {
      assert.deepEqual(f.calls, { writer: 2, judge: 2 });
      const before = { ...f.calls };
      f.admin.insert = originalInsert;
      await request();
      await run({ workerId: 'save-recovery', jobId: job.id, admin: f.admin });
      assert.deepEqual(f.calls, before, 'Storage recovery must not buy another synthesis/review cycle');
      assert.equal(job.state, 'complete');
      assert.equal(row.provider, 'source');
    }
  } else {
    assert.equal(job.state, 'complete', `${kind}/${scenario}: ${job.last_error}`);
    assert.equal(job.result_id, row.id);
    if (['first-pass', 'correction', 'yield'].includes(scenario)) {
      assert.equal(row.body, f.output.body);
      assert.equal(row.source_snapshot.generatedReportQualityGate.verdict, 'pass');
      assert.equal(row.source_snapshot.generatedReportQualityGate.releaseDecision.policy, 'report-source-completion-v1');
      assert.equal(row.source_snapshot.reportDelivery, undefined);
    } else {
      const expected = api.prepareSourceCompletion(brief, f.output.headline);
      assert.equal(row.body, expected.draft.body);
      assert.equal(row.summary, expected.draft.summary);
      assert.equal(row.provider, 'source');
      assert.equal(row.source_snapshot.generatedReportQualityGate, undefined);
      const receipt = row.source_snapshot.reportDelivery;
      assert.equal(receipt.mode, 'source_readings');
      for (const unit of receipt.units) {
        const source = unit.path.split('.').reduce((obj, key) => obj[key], brief);
        assert.equal(row[unit.field].slice(unit.start, unit.end), source);
        assert.equal(unit.sha256, sha(source));
        assert.equal(unit.wordCount, source.trim().split(/\s+/u).length);
      }
      assert(!row.body.includes('Preview only.'));
      if (kind === 'day') assert(row.body.length > 2200, 'Full sources survive the synthesis length cap');
      if (scenario === 'rejected') assert.equal(receipt.reviews.length, 2);
    }
    if (outputDir && scenario === 'initial-judge-outage') fs.writeFileSync(path.join(outputDir, kind + '.json'), JSON.stringify({ ...row, id: 'source-' + kind }));
    if (outputDir && friend && scenario === 'rejected') fs.writeFileSync(path.join(outputDir, 'friends-personal.json'), JSON.stringify({ ...row, id: 'source-friends-personal', headline:'Personal outlook for Morgan' }));
    const loaded = await api.loadGeneratedReportById(row.id);
    assert.equal(loaded.body, row.body);
    const html = api.renderToStaticMarkup(api.createElement(api.GeneratedReportArticle, { report: loaded }));
    assert(!html.includes('Synthetic diagnostic'));
    assert.equal((await api.listReportLibrary())[0].status, 'ready');
    const calls = { ...f.calls };
    job.state = 'retry';
    await run({ workerId: 'source-reload', jobId: job.id, admin: f.admin });
    assert.deepEqual(f.calls, calls, 'Reload and job recovery reuse the saved result');
    f.client.userId = 'someone-else';
    assert.equal(await api.loadGeneratedReportById(row.id), null);
  }
  assert(f.calls.writer <= 2 && f.calls.judge <= 2, 'One synthesis plus at most one correction/review');
  if (scenario === 'initial-validation-exhausted') assert.deepEqual(f.calls, { writer: 2, judge: 0 });
  if (scenario === 'historical-held') { assert.deepEqual(f.calls, { writer: 0, judge: 0 }); assert.equal(job.checkpoint_attempt, 4); }
  if (scenario === 'cleanup') assert.deepEqual(f.calls, { writer: 2, judge: 1 });
  console.log(`PASS source completion ${kind}: ${scenario}`);
  cases++;
}
for (const scenario of ['legacy-sources', 'wrong-house', 'wrong-aspect', 'missing-source', 'wrong-timing', 'wrong-person']) {
  const f = fixture('friends', 'historical-held');
  globalThis.reportDeliveryFixture = f;
  const brief = structuredClone(f.friendBrief);
  brief.houseContext = [{ id: 'transit.house.mercury.1', contentKey: 'transit.house.mercury.1', transitPlanet: 'Mercury',
    title: 'Mercury through their first house', durationLabel: '20D', timingRange: 'Sep 10 - 30', rowSummary: 'Old preview',
    termLabel: 'Short-term', keywords: ['identity'], house: 1, houseLabel: '1st house', detailAvailable: true }];
  brief.longerCycles = structuredClone(brief.primaryThemes);
  for (const group of ['primaryThemes', 'houseContext', 'longerCycles']) for (const item of brief[group]) delete item.readerSections;
  const request = () => api.requestFriendReport({ userId: f.client.userId, subjectId: 'synthetic-friend', targetDate: '2026-09-14', facts: { friendTransitsBrief: brief }, admin: f.admin });
  await request();
  const job = f.rows.friend_report_jobs[0];
  Object.assign(job, { state: 'failed', attempt: 4, checkpoint_attempt: 4, last_error: 'Report review required: historical preview-only job' });
  const original = structuredClone(job.facts);
  for (const group of ['primaryThemes', 'houseContext', 'longerCycles']) for (const item of brief[group]) item.readerSections = [{ body: f.output.body, sourceKeys: ['complete-source-'+group] }];
  if (scenario === 'wrong-house') brief.houseContext[0].house = 2;
  if (scenario === 'wrong-aspect') brief.primaryThemes[0].evidence.aspect = 'opposition';
  if (scenario === 'missing-source') delete brief.longerCycles[0].readerSections;
  if (scenario === 'wrong-timing') brief.houseContext[0].timingRange = 'Oct 10 - 30';
  if (scenario === 'wrong-person') brief.friendName = 'Different person';
  if (scenario !== 'legacy-sources') {
    await assert.rejects(request, /source retry|friend and date/);
    assert.equal(job.state, 'failed');
    assert.deepEqual(job.facts, original, 'Rejected recovery leaves the original request intact');
  } else {
    const queued = await request();
    assert.equal(queued.status, 'queued');
    assert.deepEqual(job.facts.sourceCompletionOriginalFacts, original);
    await api.runFriendReportJobs({ workerId: 'legacy-source-recovery', jobId: job.id, admin: f.admin });
    assert.equal(job.state, 'complete', job.last_error);
    const row = f.rows.user_generated_interpretations[0];
    assert.equal(row.provider, 'source');
    assert.deepEqual(row.source_snapshot.sourceCompletionOriginalFacts, original);
    assert.equal(row.source_snapshot.reportDelivery.units.filter(unit => unit.field === 'body').length, 3);
    assert.equal(job.checkpoint_attempt, 4);
    assert.equal((await api.loadGeneratedReportById(row.id)).body, row.body);
  }
  assert.deepEqual(f.calls, {writer:0, judge:0});
  console.log(`PASS source completion Friends: ${scenario}`);
  cases++;
}
console.log(`${cases} actual-pipeline source completion scenarios passed. No model/network calls.`);
