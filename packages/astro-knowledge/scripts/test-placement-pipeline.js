#!/usr/bin/env node
//
// Offline contract test for the sky-placement generation pipeline. No API key:
// the model seam is injected. Proves, before any real run:
//   1. every embedded calibration exemplar lints 3 with 0 fails / 0 warns
//   2. every canonical exemplar carries and passes all five article slots
//   3. generateArticle accepts a clean injected draft and materializes the
//      five V3 hook rows with the right contentKeys
//   4. a draft that trips the linter is retried with feedback, then accepted
//   5. em dashes in model output are normalized, never burn a retry
//   6. source gaps (lilith, bad tokens) are skipped, not thrown
//   7. the grid report accounts for all 168 cells: 7 authored, lilith unsourced
//   8. the judge prompt builds for every tier, including the thin social tier
//   9. the frozen owner-review bundle remains lint 3 and cannot self-authorize
//
//   node scripts/test-placement-pipeline.js

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { lintArticle } = require("./lint-placement-voice.js");
const { auditBundle } = require("./audit-sky-placement-review-bundle.js");
const {
  PLANETS, SIGNS, generateArticle, buildPrompt, parseArticle, gridReport, runBatch
} = require("./generate-sky-placement-articles.js");
const { buildJudgePrompt, TIER_OF } = require("./judge-placement-voice.js");
const { findBannedConstructions } = require("./banned-construction-matcher.js");
const spec = require(path.join("..", "voice", "tldr-astro", "sky-placement.json"));
const bannedConstructions = require(path.join("..", "voice", "banned-constructions.json")).bannedConstructions;
const pointSignColors = require(path.join("..", "voice", "tldr-astro", "sign-colors-v2-points.json"));

const good = {
  tagline: "Play the long game",
  moves: [
    "Pick the one problem worth this much focus and put the grudge work into that instead.",
    "Ask the direct question you have been gathering evidence to avoid asking."
  ],
  hook: "The argument you keep rehearsing in the shower finally has somewhere to go. Mars in Scorpio does not raise its voice; it waits.",
  lived: "For about six or seven weeks, effort goes underground: the quiet fix nobody announces, the grudge worked like a project, the text drafted four times and sent once. We stop pushing in the open and start playing the long game.",
  turn: "The trap is strategy curdling into surveillance, testing people instead of asking them. Held heat does not disappear; it compounds until somebody pays the interest. Aim it at the problem and the problem finally moves. Aim it at people and it always comes back around."
};

async function main() {
  assert.strictEqual(pointSignColors.status, "approved", "owner-reviewed point/sign colors must be marked approved");
  assert.strictEqual(Object.keys(pointSignColors.entries).length, 48, "point/sign colors must complete all 48 Chiron/Node/Lilith pairs");

  // 1. exemplars all lint clean
  for (const e of spec.exemplars) {
    assert.ok(e.tagline, `${e.sourceId} must include its approved tagline`);
    assert.strictEqual(e.moves?.length, 3, `${e.sourceId} must include three approved moves`);
    const r = lintArticle({
      tagline: e.tagline,
      hook: e.hook,
      lived: e.lived,
      turn: e.turn,
      moves: e.moves,
      planet: e.planet
    });
    assert.strictEqual(r.score, 3, `${e.sourceId} should lint 3, got ${r.score}: ${JSON.stringify(r.findings)}`);
    assert.strictEqual(r.fails + r.warns, 0, `${e.sourceId} should have no findings`);
  }
  console.log(`OK  ${spec.exemplars.length} exemplars lint 3 with 0 findings`);

  // 2. clean injected draft -> clean result + three hook rows
  const cleanRun = await generateArticle(
    { planet: "mars", sign: "scorpio" },
    { generateFn: async () => JSON.stringify(good) }
  );
  assert.strictEqual(cleanRun.status, "clean");
  assert.strictEqual(cleanRun.attempts, 1);
  assert.strictEqual(cleanRun.rows.length, 5);
  assert.deepStrictEqual(
    cleanRun.rows.map((r) => r.contentKey),
    [
      "fallback-hook/sky-placement-tagline/mars/scorpio",
      "fallback-hook/sky-placement-hook/mars/scorpio",
      "fallback-hook/sky-placement-lived/mars/scorpio",
      "fallback-hook/sky-placement-turn/mars/scorpio",
      "fallback-hook/sky-placement-moves/mars/scorpio"
    ]
  );
  assert.ok(cleanRun.rows.every((r) => r.review_status === "needs_review"), "generated rows must never self-approve");
  assert.strictEqual(cleanRun.facts.tier, "personal");
  console.log("OK  clean draft accepted; five needs_review rows materialized (tagline + trio + moves)");

  // 2b. legacy three-slot article (no tagline/moves) still materializes three rows
  const legacy = { hook: good.hook, lived: good.lived, turn: good.turn };
  const legacyRun = await generateArticle(
    { planet: "mars", sign: "scorpio" },
    { generateFn: async () => JSON.stringify(legacy) }
  );
  assert.strictEqual(legacyRun.status, "clean");
  assert.strictEqual(legacyRun.rows.length, 3);
  console.log("OK  legacy three-slot article still supported");

  // 2c. extended-slot linting: bad tagline/moves fail
  const badTagline = lintArticle({ ...good, tagline: "A very long tagline that keeps going and going", planet: "mars" });
  assert.ok(badTagline.findings.some((f) => f.term === "tagline-length"), "overlong tagline must fail");
  const badMoves = lintArticle({ ...good, moves: ["Only one move."], planet: "mars" });
  assert.ok(badMoves.findings.some((f) => f.term === "moves-count"), "single move must fail");
  const genericMoves = lintArticle({ ...good, moves: ["Trust the process and see.", "Embrace the change fully."], planet: "mars" });
  assert.ok(genericMoves.fails >= 1, "generic coaching moves must trip the ban list");
  const quoteWithoutMeaning = lintArticle({ ...good, hook: "You are already answering the next question.", planet: "mars" });
  assert.ok(
    quoteWithoutMeaning.findings.some((finding) => finding.term === "missing-meaning-after-quote"),
    "a standalone quote without a remaining meaning paragraph must fail"
  );
  const ccSdLiteral = lintArticle({
    ...good,
    hook: "Welcome to another powerful week. Mars in Scorpio does not raise its voice; it waits.",
    planet: "mars"
  });
  assert.ok(
    ccSdLiteral.findings.some((finding) => finding.severity === "fail" && finding.term === "Welcome to another powerful week"),
    "a verbatim CC/SD tic must fail mechanically"
  );
  for (const literal of [
    "Great question.",
    "Welcome to another powerful week",
    "Let's dive into what the stars have in store",
    "You got this"
  ]) {
    assert.ok(
      findBannedConstructions(literal, bannedConstructions).some((finding) => finding.severity === "fail"),
      `verbatim CC/SD tic must fail mechanically: ${literal}`
    );
  }
  const ccSdFamily = lintArticle({
    ...good,
    hook: "Scorpio reminds us that patience can hold its nerve. Mars in Scorpio does not raise its voice; it waits.",
    planet: "mars"
  });
  assert.ok(
    !ccSdFamily.findings.some((finding) => finding.term === "[Sign] reminds us that [lesson]"),
    "bracketed CC/SD pattern families must remain judge-only"
  );
  console.log("OK  tagline, hook-quote, meaning-paragraph, and moves rules enforced");

  // 3. failing draft retried with lint feedback, then accepted
  const bad = { ...good, turn: good.turn + " Wishing you a powerful and transformative transit." };
  let calls = 0;
  const retryRun = await generateArticle(
    { planet: "mars", sign: "scorpio" },
    {
      generateFn: async (prompt) => {
        calls++;
        if (calls === 1) return JSON.stringify(bad);
        assert.ok(/failed the voice check/.test(prompt), "retry prompt must carry the lint feedback");
        return JSON.stringify(good);
      }
    }
  );
  assert.strictEqual(retryRun.status, "clean");
  assert.strictEqual(retryRun.attempts, 2);
  console.log("OK  linter failure feeds back and the retry passes");

  // 4. em dash normalization never burns a retry
  const dashed = JSON.stringify({ ...good, hook: good.hook.replace(";", " —") });
  const parsed = parseArticle(dashed);
  assert.ok(!/—/.test(parsed.hook) && / - /.test(parsed.hook), "em dash must normalize to spaced hyphen");
  console.log("OK  em dash normalized deterministically");

  // 5. Lilith now has owner-reviewed source meaning; unknown tokens still skip.
  const lilith = await generateArticle(
    { planet: "lilith", sign: "aries" },
    { generateFn: async () => JSON.stringify(good) }
  );
  assert.strictEqual(lilith.status, "clean");
  assert.strictEqual(lilith.facts.planet, "lilith");
  assert.match(lilith.facts.meaningSource, /data\/placements\/sign\/lilith-aries\.json$/);
  const badPlanet = await generateArticle({ planet: "vulcan", sign: "aries" }, { generateFn: async () => "" } );
  assert.strictEqual(badPlanet.status, "skipped");
  console.log("OK  lilith resolves from owner-reviewed source meaning; unknown tokens skip");

  // 6. grid accounting: all 168 placement pairs are approved.
  const grid = gridReport();
  const total = grid.authored.length + grid.ready.length + grid.missingSource.length;
  assert.strictEqual(total, PLANETS.length * SIGNS.length, "grid must cover the full matrix");
  assert.strictEqual(PLANETS.length * SIGNS.length, 168);
  assert.strictEqual(grid.authored.length, 168, `expected all 168 placement pairs approved, got ${grid.authored.length}`);
  assert.strictEqual(grid.ready.length, 0, `approved grid must not leave generation work queued: ${grid.ready.join(", ")}`);
  assert.strictEqual(grid.missingSource.length, 0, `approved grid must not have source gaps: ${grid.missingSource.join(", ")}`);
  console.log("OK  grid: all 168 placement pairs authored and approved");

  // 7. prompts build for every planet, and judge prompts for all tiers.
  for (const planet of PLANETS) {
    const prompt = buildPrompt({ planet, sign: "aries" });
    assert.ok(prompt.includes("SWAP TEST"), "prompt must carry the swap test");
    assert.ok(prompt.includes("OWNER VOCABULARY PALETTE (menu, never quota)"), "placement article prompt must carry the owner vocabulary palette");
    assert.match(prompt, /Do not open TURN with "The problem starts when" or "The trouble starts when"/);
    assert.match(prompt, /Never repeat "Say what happened, say what you need"/);
    assert.match(prompt, /Do not reuse a planet-function sentence such as "Uranus breaks stale patterns"/);
    assert.match(prompt, /No sentence from PLANET \+ SIGN MEANING LAYER may appear verbatim/);
    assert.ok(prompt.includes("Words shared by Marie and AC"), "placement article prompt must carry AC word-level overlap");
    assert.ok(prompt.includes("never copy AC phrases, metaphors, or cadence"), "AC must remain a word-only reference lane");
    assert.ok(prompt.includes(spec.pace.labels[planet]), `prompt must carry the ${planet} pace`);
    assert.ok(prompt.includes("PLANET + SIGN MEANING LAYER"), `${planet} prompt must carry the approved authoring layer`);
  }
  const marsGeminiPrompt = buildPrompt({ planet: "mars", sign: "gemini" });
  assert.ok(
    marsGeminiPrompt.includes("what Mars does: drive, assertion, and the will to act"),
    "Mars/Gemini prompt must carry the approved Mars function"
  );
  assert.ok(
    marsGeminiPrompt.includes("how Gemini moves: curious, restless, talkative"),
    "Mars/Gemini prompt must carry the approved Gemini method"
  );
  assert.ok(
    marsGeminiPrompt.includes("HOOK SENTENCE 1 is a standalone recognition quote"),
    "placement prompt must teach the reader's quote/body split"
  );
  const chironAriesPrompt = buildPrompt({ planet: "chiron", sign: "aries" });
  assert.ok(
    chironAriesPrompt.includes("reviewed pair color: The sore spot is about going first"),
    "approved point/sign colors must reach the authoring prompt without the legacy Right now wrapper"
  );
  for (const tier of Object.keys(spec.planetTierRegister.hints)) {
    const jp = buildJudgePrompt(good, { tier, planet: "mars", sign: "scorpio" });
    assert.ok(jp.includes("GOLD STANDARD"), `judge prompt must include gold standard for tier ${tier}`);
    assert.ok(/\[2\]/.test(jp), `tier ${tier} must get two gold exemplars (social falls back cross-tier)`);
    assert.ok(jp.includes("voice/banned-constructions.json"), `judge prompt must carry the CC/SD recognizability check for tier ${tier}`);
  }
  assert.strictEqual(TIER_OF["north-node"], "social");
  console.log("OK  generation + judge prompts build for every sourced planet and every tier");

  // 8. The frozen owner-review bundle remains non-promotable and lint-clean.
  const reviewBundle = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "review", "sky-placement-rewrite-pilot-v2-candidates.json"),
    "utf8"
  ));
  assert.deepStrictEqual(auditBundle(reviewBundle), {
    candidates: 4,
    rows: 20,
    lint3: 4,
    reviewStatus: "needs_review",
    promotionAuthorized: false
  });
  assert.throws(
    () => auditBundle({ ...reviewBundle, promotionAuthorized: true }),
    /explicitly deny promotion authorization/
  );
  console.log("OK  owner-review bundle freezes four lint-3 candidates as non-promotable needs_review rows");

  // 9. A fully approved matrix makes the batch runner an idempotent no-op.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sky-placement-batch-"));
  const batch = await runBatch({
    outDir: dir, limit: 2,
    generateFn: async () => { throw new Error("approved pairs must not regenerate"); },
    judgeFn: async () => { throw new Error("approved pairs must not be re-judged"); }
  });
  assert.strictEqual(batch.done, 0);
  assert.deepEqual(fs.readdirSync(dir), []);
  console.log("OK  fully approved batch is idempotent and does not regenerate live pairs");

  console.log("\nAll placement-pipeline contract checks passed.");
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
