import assert from "node:assert/strict";
import { build } from "esbuild";

// Exercise the real orchestration with a deterministic provider at its transport
// boundary. No live model calls or production data are used by this regression.
const bundle = await build({
  entryPoints: ["api/_lib/transit-reading-generation.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  plugins: [{
    name: "report-test-transport",
    setup(builder) {
      builder.onResolve({ filter: /transit-reading-production\.js$/ }, () => ({ path: "transport", namespace: "fixture" }));
      builder.onResolve({ filter: /openAIResponses\.cjs$/ }, () => ({ path: "instructions", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "transport"
        ? `export const prepareTransitReadingProductionKernel = () => ({});
           export const callGovernedTransitReadingModel = (input) => globalThis.reportCorrectionFixture(input);`
        : `export const governedInstructionsForRole = () => "Test governed instructions";`
      }));
    }
  }]
});
const { generateGovernedTransitReading, isTransitReadingJudgeBlockedError } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const original = { headline: "Test report", tldr: "Original summary", body: "Original report body with the diagnosed defect." };
const corrected = { ...original, tldr: "Corrected summary", body: "Corrected report body preserving the source facts." };
const brief = { source: "locked fixture" };
const priorFixture = globalThis.reportCorrectionFixture;
try {
  for (const scenario of ["first-pass", "corrected-pass", "second-block", "invalid-correction", "invalid-initial"]) {
    const events = [];
    const prompts = [];
    let judgeCalls = 0;
    globalThis.reportCorrectionFixture = async ({ prompt }) => {
      events.push("writer");
      prompts.push(prompt);
      assert.ok(prompts.length <= (scenario === "invalid-initial" ? 3 : 2), "The rewrite budget must be bounded.");
      return { value: prompts.length === 1 ? original : corrected, model: "fixture" };
    };
    const run = generateGovernedTransitReading({
      brief,
      headline: original.headline,
      contentType: "friend_transit_reading",
      surface: "friends",
      family: "fixture",
      schemaName: "fixture",
      toolDescription: "fixture",
      productionInput: {},
      promptForAttempt: (source, headline, feedback) => JSON.stringify(source) + feedback,
      validate: (draft, source) => {
        events.push("validate");
        assert.deepEqual(source, brief);
        return { passed: scenario !== "invalid-initial" && !(scenario === "invalid-correction" && draft.body === corrected.body) };
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
        assert.equal(input.draft.body, judgeCalls === 1 ? original.body : corrected.body);
        return {
          result: {
            verdict: scenario === "first-pass" || (judgeCalls === 2 && scenario === "corrected-pass") ? "pass" : "below_threshold",
            overall: 0.9,
            scores: { owner_voice: 3 },
            findings: [{ category: "owner_voice", location: "body", finding: "Fixture diagnostic" }]
          },
          version: "fixture", provider: "fixture", model: "fixture", threshold: 0.85
        };
      }
    });
    if (["second-block", "invalid-correction"].includes(scenario)) {
      await assert.rejects(run, isTransitReadingJudgeBlockedError);
    } else if (scenario === "invalid-initial") {
      await assert.rejects(run);
      assert.equal(judgeCalls, 0, "Invalid drafts must never reach a judge.");
    } else {
      const result = await run;
      assert.equal(result.draft.body, scenario === "first-pass" ? original.body : corrected.body);
      assert.equal(result.judgeAudit.attempts, scenario === "first-pass" ? 1 : 2);
      assert.equal(JSON.stringify(result).includes("Fixture diagnostic"), false, "Judge findings must remain run-local.");
    }
    if (scenario !== "invalid-initial") {
      assert.deepEqual(events, scenario === "first-pass" ? ["writer", "validate", "judge"]
        : scenario === "invalid-correction" ? ["writer", "validate", "judge", "writer", "validate"]
          : ["writer", "validate", "judge", "writer", "validate", "judge"]);
      if (scenario !== "first-pass") {
        assert.ok(prompts[1].includes(original.body), "The corrective writer must receive the draft the judge diagnosed.");
        assert.ok(prompts[1].includes(original.tldr));
        assert.ok(prompts[1].includes("Fixture diagnostic"));
      }
    }
  }
} finally {
  if (priorFixture === undefined) delete globalThis.reportCorrectionFixture;
  else globalThis.reportCorrectionFixture = priorFixture;
}
console.log("Generated report correction: first pass, correction pass, terminal block, and deterministic rejection passed.");
