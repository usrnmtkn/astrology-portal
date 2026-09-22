import assert from "node:assert/strict";
import { build } from "esbuild";
import { DEFAULT_BANNED, NEGATION_PIVOT_PAGE_CAP, STOCK_TROPES } from "../src/astro-writing/validateCopy.mjs";
import { WRITING_POLICY_DATA } from "../src/astro-writing/policyData.generated.mjs";

function assertWriterLanguagePolicy(prompt) {
  const jsonLine = (label) => JSON.parse(prompt.split(`${label}: `)[1].split("\n")[0]);
  assert.deepEqual(jsonLine("Forbidden words and phrases"), [...new Set(DEFAULT_BANNED)],
    "Every dispatched writer prompt must include the same unconditional bans as the validator.");
  assert.ok(jsonLine("Forbidden words and phrases").includes("whether"), "The initial paid draft failed on this undisclosed rule.");
  assert.deepEqual(jsonLine("Forbidden stock examples"), STOCK_TROPES);
  assert.ok(prompt.includes(`Use at most ${NEGATION_PIVOT_PAGE_CAP} negation pivot`));
  assert.deepEqual(jsonLine("Contextual and advisory word policies"), WRITING_POLICY_DATA.wordPolicies
    .filter(entry => !["HARD_BAN", "WAIVED"].includes(entry.policyClass)),
    "Preserve literal exceptions and advisory classes; never promote them into blanket bans.");
  assert.ok(prompt.includes("EDITORIAL_REVIEW and REPLACEMENT_SUGGESTION are advisory, not bans"));
}

// Exercise the real orchestration with a deterministic provider at its transport
// boundary. No live model calls or production data are used by this regression.
const bundle = await build({
  // Bundled CommonJS dependencies need Node's require even inside a data URL.
  banner: { js: `import { createRequire } from "node:module"; const require = createRequire(${JSON.stringify(import.meta.url)});` },
  stdin: { contents: `
    export * from './api/_lib/transit-reading-generation.ts';
    export { withTransitReadingCheckpoints } from './api/_lib/transit-reading-checkpoints.ts';
  `, resolveDir: process.cwd(), sourcefile: 'report-correction-fixture.ts' },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  plugins: [{
    name: "report-test-transport",
    setup(builder) {
      builder.onResolve({ filter: /report-model-client\.js$/ }, () => ({ path: "transport", namespace: "fixture" }));
      builder.onResolve({ filter: /productionPreCallGate\.cjs$/ }, () => ({ path: "gate", namespace: "fixture" }));
      builder.onResolve({ filter: /openAIResponses\.cjs$/ }, () => ({ path: "instructions", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "transport"
        ? `export const callReportCalibrationModel = async (input) => { await input.beforeProviderCall(); return globalThis.reportCorrectionFixture(input); };`
        : path === "gate"
          ? `export const prepareProductionPreCallGate = () => ({}); export const assertProductionPreCallGate = () => true;`
        : `export const governedInstructionsForRole = () => "Test governed instructions";`
      }));
    }
  }]
});
const { generateGovernedTransitReading, isTransitReadingJudgeBlockedError, withTransitReadingCheckpoints } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const original = { headline: "Test report", tldr: "Original summary", body: "Original report body with the diagnosed defect." };
const corrected = { ...original, tldr: "Corrected summary", body: "Corrected report body preserving the source facts." };
const cleaned = { ...corrected, tldr: "Cleaned summary", body: "Cleaned corrected report body preserving the source facts." };
const brief = { source: "locked fixture" };
const priorFixture = globalThis.reportCorrectionFixture;
try {
  for (const scenario of ["first-pass", "corrected-pass", "cleanup-pass", "second-block", "invalid-cleanup", "invalid-initial"]) {
    const events = [];
    const prompts = [];
    let judgeCalls = 0;
    globalThis.reportCorrectionFixture = async ({ prompt }) => {
      assertWriterLanguagePolicy(prompt);
      assert.ok(prompt.includes("Weekly progression and contextual owner corrections"));
      assert.ok(prompt.includes("narrative_repetition"));
      assert.ok(prompt.includes("EXACT OWNER-AUTHORED REPORT VOICE EVIDENCE"));
      if (prompts.length) assert.equal(prompt.split("EXACT OWNER-AUTHORED REPORT VOICE EVIDENCE")[1], prompts[0].split("EXACT OWNER-AUTHORED REPORT VOICE EVIDENCE")[1]);
      assert.ok(prompt.includes("BROADEN BEFORE SPECIFYING"), "Every writer attempt, including correction/recovery, must load the breadth contract.");
      assert.ok(prompt.includes("Prose movement and owner voice"));
      events.push("writer");
      prompts.push(prompt);
      const maxPrompts = scenario === "invalid-initial" ? 3 : ["cleanup-pass", "invalid-cleanup"].includes(scenario) ? 3 : 2;
      assert.ok(prompts.length <= maxPrompts, "The rewrite budget must be bounded.");
      return { value: prompts.length === 1 ? original : prompts.length === 2 ? corrected : cleaned, model: "fixture" };
    };
    const run = generateGovernedTransitReading({
      brief,
      headline: original.headline,
      contentType: "friend_transit_reading",
      surface: "friends",
      family: "fixture",
      schemaName: "fixture",
      toolDescription: "fixture",
      productionInput: { surface: "friends", contentKey: "fixture", eventType: "transit", facts: { friendTransitsBrief: brief }, knowledgeIds: ["fixture"], sourceSnapshot: {} },
      promptForAttempt: (source, headline, feedback) => JSON.stringify(source) + feedback,
      validate: (draft, source) => {
        events.push("validate");
        assert.deepEqual(source, brief);
        if (scenario === "invalid-initial") return { passed: false };
        if (scenario === "cleanup-pass" && draft.body === corrected.body) return { passed: false, message: "Corrected draft introduced a deterministic defect" };
        if (scenario === "invalid-cleanup" && [corrected.body, cleaned.body].includes(draft.body)) {
          return { passed: false, message: draft.body === corrected.body ? "Corrected draft introduced a deterministic defect" : "Cleanup still violates deterministic rules" };
        }
        return { passed: true };
      },
      compactBriefForRecovery: (source) => source,
      minSummaryLength: 1,
      minBodyLength: 1,
      recoveryLabel: "Fixture",
      ownerEvidence: ["Approved fixture evidence"],
      judge: async (input) => {
        events.push("judge");
        judgeCalls += 1;
        assert.deepEqual(input.brief, brief);
        assert.deepEqual(input.ownerEvidence, ["Approved fixture evidence"]);
        const expectedBody = judgeCalls === 1 ? original.body : scenario === "cleanup-pass" ? cleaned.body : corrected.body;
        assert.equal(input.draft.body, expectedBody);
        return {
          result: {
            verdict: scenario === "first-pass" || (judgeCalls === 2 && ["corrected-pass", "cleanup-pass"].includes(scenario)) ? "pass" : "below_threshold",
            overall: 0.9,
            scores: { owner_voice: 3 },
            findings: [{ category: "over_specification", location: "body", finding: "Fixture diagnostic" }]
          },
          version: "fixture", provider: "fixture", model: "fixture", threshold: 0.85
        };
      }
    });
    if (["second-block", "invalid-cleanup"].includes(scenario)) {
      await assert.rejects(run, (error) => {
        assert.ok(isTransitReadingJudgeBlockedError(error));
        assert.equal(error.diagnostic.stage, scenario === "second-block" ? "second_judgment" : "corrected_validation");
        assert.equal(error.diagnostic.judgment.result.scores.owner_voice, 3);
        assert.equal(error.diagnostic.judgment.result.findings[0].finding, "Fixture diagnostic");
        assert.ok(!JSON.stringify(error.diagnostic).includes(original.body));
        if (scenario === "invalid-cleanup") assert.match(error.diagnostic.validationError, /Cleanup still violates deterministic rules/u);
        return true;
      });
    } else if (scenario === "invalid-initial") {
      await assert.rejects(run);
      assert.equal(judgeCalls, 0, "Invalid drafts must never reach a judge.");
    } else {
      const result = await run;
      assert.equal(result.draft.body, scenario === "first-pass" ? original.body : scenario === "cleanup-pass" ? cleaned.body : corrected.body);
      assert.equal(result.judgeAudit.attempts, scenario === "first-pass" ? 1 : 2);
      assert.equal(JSON.stringify(result).includes("Fixture diagnostic"), false, "Judge findings must remain run-local.");
    }
    if (scenario !== "invalid-initial") {
      const expectedEvents = scenario === "first-pass"
        ? ["writer", "validate", "judge"]
        : scenario === "cleanup-pass"
          ? ["writer", "validate", "judge", "writer", "validate", "writer", "validate", "judge"]
          : scenario === "invalid-cleanup"
            ? ["writer", "validate", "judge", "writer", "validate", "writer", "validate"]
            : ["writer", "validate", "judge", "writer", "validate", "judge"];
      assert.deepEqual(events, expectedEvents);
      if (scenario !== "first-pass") {
        assert.ok(prompts[1].includes("correct the sentence's function, not just its vocabulary"));
        assert.ok(prompts[1].includes(original.body), "The corrective writer must receive the draft the judge diagnosed.");
        assert.ok(prompts[1].includes(original.tldr));
        assert.ok(prompts[1].includes("Fixture diagnostic"));
      }
      if (["cleanup-pass", "invalid-cleanup"].includes(scenario)) {
        assert.ok(!prompts[2].includes("correct the sentence's function"), "Mechanical cleanup must not invite another stylistic rewrite.");
        assert.ok(prompts[2].includes(corrected.body), "Deterministic cleanup must receive the corrected draft that failed validation.");
        assert.ok(prompts[2].includes("DETERMINISTIC CLEANUP — NO NEW INTERPRETATION"));
        assert.ok(prompts[2].includes("Corrected draft introduced a deterministic defect"));
        assert.ok(prompts[2].includes("Fixture diagnostic"), "Cleanup must preserve the quality correction instead of starting over.");
      }
    }
  }
  // Corrections discovered before judging must survive both recovery and the
  // judge rewrite. Otherwise the final writer can repeat an already-fixed defect.
  const carriedPrompts = [];
  let carriedJudges = 0;
  globalThis.reportCorrectionFixture = async ({ prompt }) => {
    assertWriterLanguagePolicy(prompt);
    carriedPrompts.push(prompt);
    assert.ok(carriedPrompts.length <= 4);
    return { value: { ...original, body: `Fixture draft ${carriedPrompts.length}` }, model: "fixture" };
  };
  const carried = await generateGovernedTransitReading({
    brief, headline: original.headline, contentType: "friend_transit_reading",
    surface: "friends", family: "fixture", schemaName: "fixture", toolDescription: "fixture",
    productionInput: { surface: "friends", contentKey: "fixture", eventType: "transit", facts: { friendTransitsBrief: brief }, knowledgeIds: ["fixture"], sourceSnapshot: {} },
    promptForAttempt: (source, headline, feedback) => JSON.stringify(source) + feedback,
    validate: draft => ({ passed: !["Fixture draft 1", "Fixture draft 2"].includes(draft.body), message: draft.body === "Fixture draft 1" ? "First deterministic defect" : "Second deterministic defect" }),
    compactBriefForRecovery: source => source,
    minSummaryLength: 1, minBodyLength: 1, recoveryLabel: "Fixture",
    judge: async () => ({ result: { verdict: ++carriedJudges === 1 ? "below_threshold" : "pass", overall: 0.9, scores: { owner_voice: 3 }, findings: [{ category: "owner_voice", location: "body", finding: "Current judge finding" }] }, version: "fixture", provider: "fixture", model: "fixture", threshold: 0.85 })
  });
  assert.ok(carriedPrompts[1].includes("Fixture draft 1"), "Deterministic correction must receive the failed draft, not just error messages.");
  assert.ok(carriedPrompts[2].includes("Fixture draft 2"), "Final recovery must edit the latest rejected draft instead of starting over.");
  assert.ok(carriedPrompts[2].includes("TARGETED REPORT REVISION TASK"));
  assert.equal(carriedPrompts.length, 4);
  assert.equal(carriedJudges, 2);
  for (const prompt of carriedPrompts.slice(2)) {
    assert.ok(prompt.includes("First deterministic defect"));
    assert.ok(prompt.includes("Second deterministic defect"));
  }
  assert.ok(carriedPrompts[3].includes("Current judge finding"));
  assert.ok(carriedPrompts[3].includes("Fixture draft 3"));
  assert.ok(!JSON.stringify(carried).includes("deterministic defect"), "Run-local corrections must not enter report prose or approval evidence");

  // Exercise checkpoint retrieval through the real generation entry point, so
  // dropping the current-validator callback cannot silently lose retry context.
  for (const family of ['you', 'friend']) {
    const column = `${family}_job_id`;
    const rows = [
      { id: 'old-judge', [column]: 'fixture-job', attempt: 1, step: 1, state: 'complete', schema_name: 'tldr_generated_report_judge', response: { value: { findings: [{ finding: 'Stale judgment' }] } } },
      { id: 'latest-writer', [column]: 'fixture-job', attempt: 1, step: 2, state: 'complete', schema_name: 'fixture', response: { value: original } }
    ];
    const matches = (row, params) => [...params].every(([key, value]) => ['select', 'order', 'limit'].includes(key)
      || (value.startsWith('neq.') ? String(row[key]) !== value.slice(4) : String(row[key]) === value.slice(3)));
    const admin = {
      selectOne: async (_table, params) => structuredClone(rows.filter(row => matches(row, params)).sort((a, b) => b.step - a.step)[0] ?? null),
      insert: async (_table, row) => { const saved = { id: `saved-${rows.length}`, ...row }; rows.push(saved); return [saved]; },
      update: async (_table, query, patch) => rows.filter(row => matches(row, new URLSearchParams(query))).map(row => Object.assign(row, patch))
    };
    let calls = 0;
    globalThis.reportCorrectionFixture = async ({ prompt }) => {
      assertWriterLanguagePolicy(prompt);
      calls++;
      assert.ok(prompt.includes(original.body));
      assert.ok(prompt.includes('Current deterministic recovery defect'));
      assert.ok(!prompt.includes('Stale judgment'));
      assert.ok(prompt.includes('TARGETED REPORT REVISION TASK'));
      return { value: corrected, model: 'fixture' };
    };
    const run = () => generateGovernedTransitReading({
      brief, headline: original.headline, contentType: 'fixture', surface: family === 'you' ? 'you' : 'friends',
      family: 'fixture', schemaName: 'fixture', toolDescription: 'fixture',
      productionInput: { surface: family === 'you' ? 'you' : 'friends', contentKey: 'fixture', eventType: 'transit', facts: { [family === 'you' ? 'youTransitReadingBrief' : 'friendTransitsBrief']: brief }, knowledgeIds: ['fixture'], sourceSnapshot: {} },
      promptForAttempt: (source, headline, feedback) => JSON.stringify(source) + feedback,
      validate: draft => ({ passed: draft.body !== original.body, message: 'Current deterministic recovery defect' }),
      compactBriefForRecovery: source => source, minSummaryLength: 1, minBodyLength: 1, recoveryLabel: 'Fixture',
      judge: async () => ({ result: { verdict: 'pass', overall: 1, scores: {}, findings: [] }, version: 'fixture', provider: 'fixture', model: 'fixture', threshold: 0.85 })
    });
    const scope = { admin, family, jobId: 'fixture-job', attempt: 2 };
    assert.equal((await withTransitReadingCheckpoints(scope, run)).draft.body, corrected.body);
    assert.equal((await withTransitReadingCheckpoints(scope, run)).draft.body, corrected.body);
    assert.equal(calls, 1, 'Resuming a repaired draft must reuse the saved provider response.');
  }
} finally {
  if (priorFixture === undefined) delete globalThis.reportCorrectionFixture;
  else globalThis.reportCorrectionFixture = priorFixture;
}
console.log("Generated report correction: first pass, correction pass, deterministic cleanup, terminal block, and deterministic rejection passed.");

// Correction feedback must identify the actual standing-pattern marker.
const { validateCopy } = await import('../src/astro-writing/validateCopy.mjs');
for (const marker of ['usually', 'generally', 'you tend to']) {
  const validation = validateCopy(`Today ${marker} respond.`, {validationProfile:'friends-transit', family:'friend-transit-reading', register:'third_person'});
  const finding = validation.violations.find(item => item.category === 'temporary_transit_register');
  assert.ok(finding?.detail.includes(`"${marker}"`));
}
