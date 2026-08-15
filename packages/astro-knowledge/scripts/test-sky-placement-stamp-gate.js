#!/usr/bin/env node
// Regressions for the stamp-based render gate.
//
// The gate exists so that no four-slot page can reach a reader without a clean
// deterministic lint AND recorded owner prose approval AND a hash proving the approval
// covers the text as it stands now. Each of those is tested here, plus the harness rule
// that a mis-called checker is never treated as a pass.

const assert = require("assert");
const crypto = require("crypto");
const { evaluate, pageHash } = require("./stamp-sky-placement-eligibility.js");
const { lintArticle } = require("./lint-placement-voice.js");

const SLOTS = ["hook", "lived", "turn"];
// The hook needs at least two sentences (shape rule: meaning must follow the opening).
const CLEAN = {
  hook: "The deadline arrives before the plan is ready. The gap shows up in someone's evening.",
  lived: "A rota gets rewritten, a shift changes hands, and the cost lands on whoever answers last. Nobody records who absorbed it.",
  turn: "What holds is the arrangement nobody has to defend twice."
};

function doc(slots, extra = {}) {
  return {
    rows: SLOTS.map((s) => ({
      contentKey: `fallback-hook/sky-placement-${s}/saturn/capricorn`,
      body_you: slots[s],
      ...extra
    }))
  };
}

let passed = 0;
const ok = (label) => { passed += 1; console.log(`  ok  ${label}`); };

// 1. clean copy with no owner approval is NOT eligible
{
  const r = evaluate(doc(CLEAN)).find((x) => x.page === "saturn/capricorn");
  assert.strictEqual(r.lintPass, true, "fixture should lint clean");
  assert.strictEqual(r.approvalMatches, false);
  assert.strictEqual(r.eligible, false);
  ok("lint-clean but unapproved copy is not render eligible");
}

// 2. a page already carrying stamp fields is still reported ineligible without approval
{
  const r = evaluate(doc(CLEAN, {
    render_eligible: true, owner_prose_approved: true,
    deterministic_validation: "pass", source_hash: "deadbeef"
  })).find((x) => x.page === "saturn/capricorn");
  assert.strictEqual(r.stamped, true);
  assert.strictEqual(r.eligible, false, "a self-declared stamp must not confer eligibility");
  ok("a stamp present in the row cannot bypass the approval check");
}

// 3. the hash pins the approved bytes: changing the copy breaks the match
{
  const before = pageHash(CLEAN);
  const after = pageHash({ ...CLEAN, turn: `${CLEAN.turn} One more sentence arrives later.` });
  assert.notStrictEqual(before, after);
  ok("editing approved copy changes source_hash, so the approval stops matching");
}

// 4. ED-031: a checker called without planet reports a harness error, never a pass
{
  const withPlanet = lintArticle({ planet: "uranus", sign: "scorpio",
    hook: "This transit lasts about seven years. The same argument returns each spring.",
    lived: "A rota gets rewritten and the cost lands on whoever answers last.",
    turn: "What holds is the arrangement nobody has to defend twice." });
  const without = lintArticle({
    hook: "This transit lasts about seven years. The same argument returns each spring.",
    lived: "A rota gets rewritten and the cost lands on whoever answers last.",
    turn: "What holds is the arrangement nobody has to defend twice." });
  assert.ok(!withPlanet.findings.some((f) => f.term === "untraced-duration"),
    "a sourced cycle fact must trace when planet is supplied");
  assert.ok(without.findings.some((f) => f.source === "harness" && f.term === "MISSING_FACT_CONTEXT"),
    "omitting planet must report a harness error");
  assert.ok(!without.findings.some((f) => f.term === "untraced-duration"),
    "a harness error must not masquerade as a content failure");
  ok("ED-031 harness guard: missing fact context is reported as a harness error");
}

// 5. incomplete slots are never eligible
{
  const r = evaluate(doc({ ...CLEAN, lived: "  " })).find((x) => x.page === "saturn/capricorn");
  assert.strictEqual(r.complete, false);
  assert.strictEqual(r.eligible, false);
  ok("a page with an empty slot is never render eligible");
}

console.log(`\nOK  sky placement stamp gate (${passed} assertions)`);
