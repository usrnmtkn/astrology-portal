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
  assert.strictEqual(judged.gate, "auto-publish");

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

  assert.strictEqual(spec.checks.length, 10, "long-form contract must retain all ten checks");
  const prompt = buildJudgePrompt(cleanArticle, { planet: "jupiter" });
  for (const check of spec.checks.filter((entry) => entry.id !== "lint-clean")) {
    assert.ok(prompt.includes(`[${check.id}]`), `judge prompt must include ${check.id}`);
  }
  assert.ok(!prompt.includes("[lint-clean]"), "the tenth check is mechanical and must stay in the pre-judge linter");
  assert.ok(prompt.includes(furnitureFor("jupiter")));
  console.log("OK  ten-check contract = mechanical lint-clean + nine semantic prompt checks; Jupiter furniture present");

  let calibrationCalls = 0;
  const calibration = await runArticleJudgeCalibration({
    judgeFn: async () => {
      calibrationCalls += 1;
      return JSON.stringify({ score: 3, verdict: "in-voice", failedChecks: [], weakest: [], rewrites: [], why: "owner calibration fixture" });
    }
  });
  assert.strictEqual(calibration.length, 4);
  assert.strictEqual(calibrationCalls, 20, "four fixtures must receive median-of-5 sampling");
  assert.ok(calibration.every(({ result }) => result.samples === 5 && result.score === 3));
  console.log("OK  four byte-verified owner fixtures calibrate at 3 with median-of-5 sampling");

  console.log("\nAll long-form article voice routing checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
