#!/usr/bin/env node

const assert = require("assert");
const path = require("path");
const bannedConfig = require(path.join("..", "voice", "banned-words.json"));
const spec = require(path.join("..", "voice", "tldr-astro", "sky-article-longform.json"));
const { buildJudgePrompt, furnitureFor } = require("./judge-article-voice.js");
const { lintLongformArticle } = require("./lint-article-voice.js");
const {
  LONGFORM_SURFACE,
  PLACEMENT_SURFACE,
  runEditorialVoiceQa,
  surfaceForContentKey
} = require("./editorial-voice-router.js");
const { runArticleJudgeCalibration } = require("./test-article-judge-calibration.js");
const { redactText } = require("./editorial-judge-runtime.js");
const { generationConfig, judgeConfig: configuredJudge } = require("./generate-sky-aspect-cards.js");

const cleanArticle = [
  "You have spent enough mornings translating a changing rule before breakfast.",
  "Maybe the new routine is visible in the grocery list. Maybe it is the message you finally answer plainly.",
  "Love is not the same as comfort. Choose the useful promise. Leave the decorative one behind.",
  "May the next honest choice make more room for your actual life."
].join("\n\n");

async function main() {
  assert.strictEqual(surfaceForContentKey("sky-article-template/jupiter/ingress"), LONGFORM_SURFACE);
  assert.strictEqual(surfaceForContentKey("sky-article/jupiter/cancer/2026"), LONGFORM_SURFACE);
  assert.strictEqual(surfaceForContentKey("nodes-article/aries-libra/2026"), LONGFORM_SURFACE);
  assert.strictEqual(surfaceForContentKey("fallback-hook/sky-placement-hook/moon/scorpio"), PLACEMENT_SURFACE);
  await assert.rejects(
    () => runEditorialVoiceQa({
      surface: LONGFORM_SURFACE,
      contentKey: "fallback-hook/sky-placement-hook/moon/scorpio",
      articleText: cleanArticle
    }),
    /conflicts with content key/
  );
  console.log("OK  long-form editions/nodes and placement trios resolve to separate surfaces");

  const tradeTerms = bannedConfig.surfaceBannedWords[LONGFORM_SURFACE].map((entry) => entry.term);
  assert.deepStrictEqual(tradeTerms, ["audit", "ledger", "compound", "colonize"]);
  assert.ok(!bannedConfig.bannedWords.some((entry) => tradeTerms.includes(entry.term)), "trade terms must not enter the global/card list");
  for (const term of tradeTerms) {
    const lint = lintLongformArticle(`You can see the ${term} in the paperwork.`);
    assert.ok(lint.findings.some((finding) => finding.term === term && finding.severity === "fail"));
  }
  assert.strictEqual(lintLongformArticle("You can ask a real question here?").score, 3, "second person and questions are licensed on articles");
  console.log("OK  article-only trade vocabulary fails without changing the card/global ban list");

  let calls = 0;
  const judged = await runEditorialVoiceQa(
    { surface: LONGFORM_SURFACE, articleText: cleanArticle, planet: "jupiter", edition: "ingress" },
    {
      samples: 5,
      judgeFn: async (prompt) => {
        calls += 1;
        assert.ok(prompt.includes(furnitureFor("jupiter")), "router must pass planet into the furniture-aware judge");
        return JSON.stringify({ score: 3, verdict: "in-voice", failedChecks: [], weakest: [], rewrites: [], why: "calibration stub" });
      }
    }
  );
  assert.strictEqual(calls, 5);
  assert.strictEqual(judged.lint.score, 3);
  assert.strictEqual(judged.judge.score, 3);
  assert.strictEqual(judged.gate, "human-review", "one LLM verdict may recommend approval but cannot publish");
  assert.strictEqual(judged.judge.recommendation, "approve");
  assert.strictEqual(judged.judge.audit.model, "injected");

  let blockedCalls = 0;
  const blocked = await runEditorialVoiceQa(
    { surface: LONGFORM_SURFACE, articleText: "The ledger decides.", planet: "jupiter" },
    { judgeFn: async () => { blockedCalls += 1; return '{"score":3}'; } }
  );
  assert.strictEqual(blockedCalls, 0, "judge must never run before a clean mechanical lint");
  assert.strictEqual(blocked.gate, "regenerate");
  await assert.rejects(
    () => runEditorialVoiceQa({ surface: LONGFORM_SURFACE, article: { hook: "x", lived: "y", turn: "z" } }),
    /never accepts a placement trio/
  );
  await assert.rejects(
    () => runEditorialVoiceQa({ surface: PLACEMENT_SURFACE, articleText: cleanArticle }),
    /never accepts long-form text/
  );
  console.log("OK  lint runs first, planet furniture is passed, and neither judge crosses surfaces");

  assert.strictEqual(spec.checks.length, 11, "long-form contract must retain all eleven checks");
  const prompt = buildJudgePrompt(cleanArticle, { planet: "jupiter" });
  for (const check of spec.checks.filter((entry) => entry.id !== "lint-clean")) {
    assert.ok(prompt.includes(`[${check.id}]`), `judge prompt must include ${check.id}`);
  }
  assert.ok(!prompt.includes("[lint-clean]"), "the eleventh check is mechanical and must stay in the pre-judge linter");
  assert.ok(prompt.includes(furnitureFor("jupiter")));
  console.log("OK  eleven-check contract = mechanical lint-clean + ten semantic prompt checks; Jupiter furniture present");

  let calibrationCalls = 0;
  const calibration = await runArticleJudgeCalibration({
    judgeFn: async (_prompt, { cohort }) => {
      calibrationCalls += 1;
      return JSON.stringify(cohort === "approved"
        ? { score: 3, verdict: "in-voice", failedChecks: [], weakest: [], rewrites: [], why: "owner calibration fixture" }
        : { score: 1, verdict: "off-voice", failedChecks: ["spoken-register"], weakest: [], rewrites: [], why: "intentionally weak control" });
    }
  });
  assert.strictEqual(calibration.approved.length, 4);
  assert.strictEqual(calibration.weak.length, 2);
  assert.strictEqual(calibrationCalls, 30, "four approved and two weak fixtures must receive median-of-5 sampling");
  assert.ok(calibration.approved.every(({ result }) => result.samples === 5 && result.score === 3));
  assert.ok(calibration.weak.every(({ result }) => result.samples === 5 && result.score === 1));
  assert.strictEqual(calibration.status, "passed");
  assert.ok(calibration.separation >= 1);
  console.log("OK  approved examples separate from weak controls under median-of-5 calibration");

  let splitCall = 0;
  const disagreement = await runArticleJudgeCalibration({
    judgeFn: async (_prompt, { cohort }) => {
      splitCall += 1;
      const score = cohort === "weak" ? 1 : (splitCall % 5 === 0 ? 2 : 3);
      return JSON.stringify({ score, verdict: score === 3 ? "in-voice" : score === 2 ? "borderline" : "off-voice", why: "disagreement control" });
    }
  });
  assert.strictEqual(disagreement.status, "needs-human-review");
  console.log("OK  repeated-sample disagreement enters the human-review lane");

  const redacted = redactText("Email editor@example.com, call 212-555-0100, or ping @editor.");
  assert.ok(!redacted.text.includes("editor@example.com"));
  assert.ok(!redacted.text.includes("212-555-0100"));
  assert.ok(!redacted.text.includes("@editor"));
  assert.strictEqual(redacted.replacements, 3);
  console.log("OK  default privacy redaction removes common proprietary identifiers");

  const originalGenerationModel = process.env.OPENAI_GENERATION_MODEL;
  const originalJudgeModel = process.env.OPENAI_JUDGE_MODEL;
  const originalProvider = process.env.CONTENT_JUDGE_PROVIDER;
  process.env.OPENAI_GENERATION_MODEL = "writer-test-model";
  process.env.OPENAI_JUDGE_MODEL = "judge-test-model";
  process.env.CONTENT_JUDGE_PROVIDER = "openai";
  assert.strictEqual(generationConfig().model, "writer-test-model");
  assert.strictEqual(configuredJudge().model, "judge-test-model");
  if (originalGenerationModel === undefined) delete process.env.OPENAI_GENERATION_MODEL;
  else process.env.OPENAI_GENERATION_MODEL = originalGenerationModel;
  if (originalJudgeModel === undefined) delete process.env.OPENAI_JUDGE_MODEL;
  else process.env.OPENAI_JUDGE_MODEL = originalJudgeModel;
  if (originalProvider === undefined) delete process.env.CONTENT_JUDGE_PROVIDER;
  else process.env.CONTENT_JUDGE_PROVIDER = originalProvider;
  console.log("OK  writer and judge resolve from separate model configuration");

  console.log("\nAll long-form article voice routing checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
