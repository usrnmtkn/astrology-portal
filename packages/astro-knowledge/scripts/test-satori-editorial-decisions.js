#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const { compiledFiles, loadDecisionSource, validateDecisionSource, writeOrCheck } = require("./compile-satori-editorial-decisions.js");
const { lintArticle, lintBatchRepetition } = require("./lint-placement-voice.js");
const { buildPacket } = require(path.join(packageRoot, "..", "..", ".agents", "skills", "satori-writer", "scripts", "compile-writing-packet.js"));
const { buildJudgePrompt } = require("./judge-placement-voice.js");

function article(overrides = {}) {
  return {
    planet: "jupiter",
    sign: "libra",
    tagline: "The disagreement starts before the cancellation happens.",
    hook: "The same answer keeps returning. Jupiter in Libra changes how a shared choice gets made.",
    lived: "For about a year, someone says what they want before the plan is final. The answer changes while there is still time to choose again.",
    turn: "The plan is not shared when one voice decides and everyone else goes along with it. After enough of this, no one trusts the next yes.",
    moves: ["Name one preference before agreeing.", "Ask who has not answered yet."],
    ...overrides
  };
}

function mustFailDecision(candidate, decisionId) {
  const result = lintArticle(candidate);
  assert(result.findings.some((entry) => entry.decisionId === decisionId && entry.severity === "fail"), `${decisionId} should fail`);
}

function mustPassDecision(candidate, decisionId) {
  const result = lintArticle(candidate);
  assert(!result.findings.some((entry) => entry.decisionId === decisionId), `${decisionId} should allow this literal or specific use`);
}

function main() {
  const { source } = loadDecisionSource();
  assert.doesNotThrow(() => validateDecisionSource(source));
  assert(source.decisions.some((entry) => entry.id === "CF-001" && entry.status === "approved"));
  assert(source.decisions.some((entry) => entry.id === "ED-003" && entry.status === "superseded" && entry.superseded_by === "ED-028"), "ED-003 must remain superseded by ED-028");
  assert(source.decisions.some((entry) => entry.id === "ED-028" && entry.status === "approved"), "ED-028 must remain the active surface-register rule");
  for (const id of ["CF-013", "CF-014", "CF-004", "CF-005", "CF-015", "CF-002"]) {
    assert(source.decisions.some((entry) => entry.id === id && entry.status === "approved"), `${id} must record the owner-resolved worksheet decision`);
  }
  assert(source.decisions.some((entry) => entry.id === "OW-001" && entry.scope.uses.includes("calibration-only")));

  const result = compiledFiles();
  assert(result.compiled.active.length > 15);
  assert.strictEqual(result.compiled.unresolved.length, 0);
  for (const artifact of [result.compiled.artifacts.writer, result.compiled.artifacts.judge, result.compiled.artifacts.linter, result.compiled.artifacts.vocabulary]) {
    assert(!JSON.stringify(artifact).includes('"id": "LEG-001"'), "superseded decisions must not enter active generated policies");
  }
  assert(result.compiled.artifacts.writer.firstCallConstraints.some((entry) => entry.id === "CF-013"));
  assert(result.compiled.artifacts.judge.decisions.some((entry) => entry.id === "CF-005"));
  assert(result.compiled.artifacts.judge.decisions.some((entry) => entry.id === "ED-027"));
  assert(result.compiled.artifacts.judge.compactRubric.some((entry) => /Morning-reader test/u.test(entry)));
  assert(result.compiled.artifacts.linter.rules.some((entry) => entry.id === "CF-002"));
  assert.doesNotThrow(() => writeOrCheck({ check: true }));

  const requiredRegressionIds = [
    "sky-placement-no-generic-people",
    "single-specific-person-allowed",
    "repeated-generic-one-person-review",
    "on-paper-idiom-allowed",
    "on-paper-administrative-rejected",
    "literal-room-allowed",
    "stock-room-hierarchy-rejected",
    "harm-literal-versus-dressed-up",
    "natural-english-abstract-personification",
    "advocacy-default-domain-drift",
    "therapy-workbook-register",
    "corporate-operations-advice",
    "compressed-slogan-ending",
    "stacked-conclusion",
    "dated-communication-language",
    "sky-aspect-calendar-second-person",
    "performance-literal-allowed",
    "performance-figurative-rejected",
    "tilt-figurative-fails",
    "tilt-literal-passes",
    "steady-observable-allowed",
    "steady-vague-energy-rejected",
    "chani-warmth-allowed",
    "adjacent-site-construction-rejected",
    "current-sky-operation-matched-retrieval",
    "generic-planet-sign-tagline",
    "gift-to-problem-keyword-flip",
    "facilitated-compromise-register",
    "social-scene-needs-stakes",
    "generic-fairness-conclusion",
    "jupiter-libra-v3-full-draft-reject",
    "controlled-v3-six-passage-set-ineligible",
    "controlled-v3-owner-rejected",
    "no-leak-ai-tell",
    "libra-dinner-plan-meme",
    "libra-isolated-scheduling-moves-allowed",
    "virgo-color-coded-spreadsheet-meme",
    "slow-transit-evening-scale",
    "qualitative-subperiod-reviewed-residency",
    "qualitative-subperiod-residency-cap",
    "numeric-subperiod-engine-required",
    "date-like-subperiod-engine-required",
    "moves-facilitation-register",
    "generic-product-copy-owner-register",
    "affinity-owner-passage-retrieval"
    ,"morning-reader-one-tired-read"
    ,"ascii-punctuation-only"
    ,"no-spaced-hyphen-em-dash"
    ,"sky-placement-qualified-people-allowed"
    ,"harness-missing-fact-context"
  ];
  const regressionIds = new Set(result.compiled.artifacts.regression.cases.map((entry) => entry.id));
  assert(requiredRegressionIds.every((id) => regressionIds.has(id)), "every requested durable correction needs a regression case");

  // Owner ruling 2026-08-14 (applying the 2026-08-11 ruling): people is allowed in Sky
  // Placement, used sparingly. Overuse is a semantic review signal, not a deterministic
  // failure, so CF-001 no longer fails the linter.
  mustPassDecision(article({ hook: "People keep accepting the same answer. Jupiter in Libra changes how a shared choice gets made." }), "CF-001");
  mustPassDecision(article({ hook: "The person who remembers every birthday keeps the spare key. Jupiter in Libra changes how a shared choice gets made." }), "CF-013");
  mustFailDecision(article({ hook: "One person decides, and one person explains the choice. Jupiter in Libra changes how a shared choice gets made." }), "CF-013");
  mustPassDecision(article({ lived: "For about a year, the plan looks good on paper. The cost appears after someone agrees." }), "CF-014");
  mustFailDecision(article({ lived: "For about a year, someone puts the emergency plan on paper. The same problem returns." }), "CF-014");
  mustPassDecision(article({ lived: "For about a year, a guest room turns into an office. The household changes how the space is used." }), "CF-004");
  mustFailDecision(article({ lived: "For about a year, the loudest person in the room decides the plan. Everyone else goes along." }), "CF-004");
  mustPassDecision(article({ lived: "For about a year, the work takes steady effort. The result becomes easier to trust." }), "CF-015");
  mustFailDecision(article({ lived: "For about a year, steady energy fills the week. The result becomes easier to trust." }), "CF-015");
  mustPassDecision(article({ lived: "For about a year, the actor prepares for the performance. The rehearsal changes after the director responds." }), "CF-002");
  mustPassDecision(article({ lived: "For about a year, the manager reviews quarterly job performance. The goals change after the results arrive." }), "CF-002");
  mustFailDecision(article({ lived: "For about a year, life becomes a performance review. The same pressure returns." }), "CF-002");
  mustFailDecision(article({ lived: "For about a year, the dinner plan starts to tilt before anyone says no. The answer changes later." }), "CF-003");
  const literalTilt = lintArticle(article({ lived: "For about a year, the table tilts toward the window after someone moves it. The group changes where dinner is served." }));
  assert(!literalTilt.findings.some((entry) => entry.decisionId === "CF-003"), "literal physical tilt must remain allowed");
  mustFailDecision(article({ tagline: "Stop calling silence peace" }), "CF-006");
  mustFailDecision(article({ moves: ["Document the task and record what fails.", "Identify the stakeholders before the rollout."] }), "ED-006");
  mustFailDecision(article({ lived: "For about a year, three families compare letters. The same response returns." }), "ED-007");
  const physicalLetter = lintArticle(article({ lived: "For about a year, a handwritten letter arrives in the mail. The family reads the paper letter together." }));
  assert(!physicalLetter.findings.some((entry) => entry.decisionId === "ED-007"), "physical mail must remain allowed");
  mustPassDecision(article({ hook: "You keep accepting the same answer. Jupiter in Libra changes how a shared choice gets made." }), "ED-028");
  const skyAspectCalendarRule = result.compiled.artifacts.linter.rules.find((entry) => entry.id === "ED-028");
  assert(skyAspectCalendarRule, "ED-028 must remain active in the generated linter policy");
  assert(
    new RegExp(skyAspectCalendarRule.mechanical.pattern, skyAspectCalendarRule.mechanical.flags || "i").test("You already know what changed."),
    "ED-028 must reject second person on the Calendar Sky aspect surface"
  );
  mustFailDecision(article({ tagline: "Jupiter in Libra helps us grow through fair, honest partnership." }), "ED-015");
  mustFailDecision(article({ turn: "The gift becomes the problem when diplomacy turns into avoidance." }), "ED-016");
  mustFailDecision(article({ turn: "Fairness requires each side to be heard before the choice is made." }), "ED-019");
  mustFailDecision(article({ turn: "Hold it in and it leaks out sideways, aimed at whoever is closest." }), "CF-018");
  const settleResolveUse = lintArticle(article({ lived: "For about a year, the response reaches the group while it can still settle the confusion. The next decision becomes clearer." }));
  assert(!settleResolveUse.findings.some((entry) => entry.term === "\\bsettl(e|es|ing)\\b(?! for)"), "idiomatic resolve-use of settle must not warn");
  const settleResolveUseAfterObject = lintArticle(article({ lived: "For about a year, the delay made the original issue harder to settle. The next decision becomes clearer." }));
  assert(!settleResolveUseAfterObject.findings.some((entry) => entry.term === "\\bsettl(e|es|ing)\\b(?! for)"), "idiomatic issue-harder-to-settle use must not warn");
  const settleStateUse = lintArticle(article({ lived: "For about a year, we settle into the same answer. The same conflict returns." }));
  assert(settleStateUse.findings.some((entry) => entry.term === "\\bsettl(e|es|ing)\\b(?! for)"), "settle as a state or advice phrase must remain a warning");
  const literalGroupChat = lintArticle(article({ lived: "For about a year, the group chat fills with links. The friends compare the original sources." }));
  assert(literalGroupChat.findings.some((entry) => entry.term === "group chat" && entry.severity === "warn"), "literal group chat must warn, not fail");
  const singleGroupChatBatch = lintBatchRepetition([{ id: "one", article: { hook: "The group chat fills with links." } }, { id: "two", article: { hook: "The class compares sources." } }]);
  assert.strictEqual(singleGroupChatBatch.passed, true);
  const repeatedGroupChatBatch = lintBatchRepetition([{ id: "one", article: { hook: "The group chat fills with links." } }, { id: "two", article: { hook: "The group chat changes subject." } }]);
  assert.strictEqual(repeatedGroupChatBatch.passed, false);
  mustFailDecision(article({ hook: "The dinner plan finally moves. Jupiter in Libra changes how the answer is made." }), "ED-022");
  mustFailDecision(article({
    lived: "By the third invitation of the week, the answer is still yes. When a date does not work, we call it fine and rearrange everything else around it."
  }), "ED-022");
  const libraCreativeCollaboration = lintArticle(article({
    hook: "One introduction leads to a creative collaboration. Jupiter in Libra expands what becomes possible through connection.",
    lived: "The project grows until the person who brought the idea is doing the work no one notices. The question becomes who decides and who gets credit."
  }));
  assert(!libraCreativeCollaboration.findings.some((entry) => entry.decisionId === "ED-022"), "a placement-derived Libra collaboration must remain allowed");
  const libraIsolatedSchedulingMoves = lintArticle(article({
    hook: "One introduction leads to a creative collaboration. Jupiter in Libra expands what becomes possible through connection.",
    lived: "The project grows until the person who brought the idea is doing the work no one notices. The question becomes who decides and who gets credit.",
    moves: ["Answer one pending invitation with a clear yes or no.", "Say which day works before asking what everyone else prefers."]
  }));
  assert(!libraIsolatedSchedulingMoves.findings.some((entry) => entry.decisionId === "ED-022"), "isolated invitation and day moves must not reconstitute a prohibited central scene");
  const qualitativeSubperiods = [
    "A few months in, Jupiter makes the list of agreements harder to ignore.",
    "Early in the transit, Jupiter makes the list of agreements harder to ignore.",
    "By midyear, Jupiter makes the list of agreements harder to ignore."
  ];
  for (const lived of qualitativeSubperiods) {
    const result = lintArticle(article({ lived }));
    assert(!result.findings.some((entry) => entry.source === "fact-trace"), `${lived} must trace to Jupiter's reviewed residency`);
  }
  const qualitativeSubperiodTooLong = lintArticle({
    ...article({ lived: "A few months in, Mercury makes the list of agreements harder to ignore." }),
    planet: "mercury"
  });
  assert(qualitativeSubperiodTooLong.findings.some((entry) => entry.term === "untraced-subperiod"), "a qualitative subperiod cannot exceed the reviewed residency");
  const numericSubperiod = lintArticle(article({ lived: "Four months in, Jupiter makes the list of agreements harder to ignore." }));
  assert(numericSubperiod.findings.some((entry) => entry.term === "untraced-subperiod"), "numeric subperiods require an explicit engine fact");
  const suppliedNumericSubperiod = lintArticle(article({
    lived: "Four months in, Jupiter makes the list of agreements harder to ignore.",
    factContext: { narrativeTiming: "four months in" }
  }));
  assert(!suppliedNumericSubperiod.findings.some((entry) => entry.term === "untraced-subperiod"), "an explicit engine fact may authorize a numeric subperiod");
  const dateLikeSubperiod = lintArticle(article({ lived: "By the 15th, Jupiter makes the list of agreements harder to ignore." }));
  assert(dateLikeSubperiod.findings.some((entry) => entry.term === "untraced-date-like-subperiod"), "date-like subperiods require an explicit engine fact");
  const suppliedDateLikeSubperiod = lintArticle(article({
    lived: "By the 15th, Jupiter makes the list of agreements harder to ignore.",
    factContext: { narrativeTiming: "by the 15th" }
  }));
  assert(!suppliedDateLikeSubperiod.findings.some((entry) => entry.term === "untraced-date-like-subperiod"), "an explicit engine fact may authorize a date-like subperiod");
  const calendarMonthSubperiod = lintArticle(article({ lived: "In March, Jupiter makes the list of agreements harder to ignore." }));
  assert(calendarMonthSubperiod.findings.some((entry) => entry.term === "untraced-month"), "a calendar-month subperiod requires an explicit engine fact");
  const suppliedCalendarMonthSubperiod = lintArticle(article({
    lived: "In March, Jupiter makes the list of agreements harder to ignore.",
    factContext: { narrativeTiming: "March" }
  }));
  assert(!suppliedCalendarMonthSubperiod.findings.some((entry) => entry.term === "untraced-month"), "an explicit engine fact may authorize a calendar-month subperiod");
  mustFailDecision(article({ moves: ["Name one must-have and one flexible detail.", "Set a decision time."] }), "ED-023");
  const virgoMeme = lintArticle({ ...article(), planet: "mercury", sign: "virgo", lived: "For a few weeks, a color-coded spreadsheet controls the work. The same detail returns." });
  assert(virgoMeme.findings.some((entry) => entry.decisionId === "ED-022"));

  const packet = buildPacket({
    planet: "jupiter",
    sign: "libra",
    requestedBeat: "full_article",
    emphasisBeat: "turn",
    task: "Write one complete Current Sky article for Jupiter in Libra."
  });
  assert.strictEqual(packet.positiveEvidencePoolId, "sky-placement-owner-affinity-v1");
  assert(packet.ownerPassages.length >= 4 && packet.ownerPassages.length <= 6);
  assert(new Set(packet.ownerPassages.map((entry) => entry.sourceArticleId)).size >= 3);
  assert(packet.ownerPassages.every((entry) => entry.authorityClass === "owner_authored_final"));
  // ED-028 (2026-08-14) permits direct address in sky placement, and the 2026-08-11
  // people ruling was applied on the same date, so neither term belongs in a hard ban
  // on retrieved owner passages. CF-018 leak stays prohibited.
  assert(packet.ownerPassages.every((entry) => !/\b(?:leak|leaks|leaked|leaking)\b/iu.test(entry.text)));

  const legacyGlobalBans = JSON.parse(fs.readFileSync(path.join(packageRoot, "voice", "banned-words.json"), "utf8")).bannedWords;
  assert(!legacyGlobalBans.some((entry) => /^(?:leak|leaks|leaked|leaking)$/iu.test(typeof entry === "string" ? entry : entry.term)), "CF-018 must not retroactively invalidate historical data through the legacy global validator");
  const cf018 = result.compiled.artifacts.linter.rules.find((entry) => entry.id === "CF-018");
  assert(cf018, "CF-018 must remain active in the generated editorial linter policy");
  assert.deepStrictEqual(cf018.mechanical.terms, ["leak", "leaks", "leaked", "leaking"]);
  assert(packet.ownerPassages.some((entry) => entry.affinity === "same_sign" && entry.sourcePath.includes("libra-season-autumn-equinox")));
  assert(packet.ownerPassages.some((entry) => entry.affinity === "same_planet"));
  assert.strictEqual(packet.formatExemplars.length, 4);
  assert(packet.formatExemplars.every((entry) => entry.authorityClass === "exact_owner_approved"));
  assert.strictEqual(packet.formatExemplarStatus, "owner_approved_voice_format_evidence");
  assert.strictEqual(packet.movesExemplar.id, "sky-placement-format-v4-saturn-capricorn:moves");
  assert.strictEqual(packet.movesExemplar.generationEvidenceAuthorized, true);
  assert(packet.voiceDevices.selected.length <= 2);
  assert(packet.surfaceRequirements.universalHardConstraints.some((entry) => entry.id === "CF-018"));
  assert(packet.surfaceRequirements.universalHardConstraints.every((entry) => !Object.hasOwn(entry, "examplesRejected")));

  const judgePrompt = buildJudgePrompt(article(), {
    tier: "social",
    planet: "jupiter",
    sign: "libra",
    deterministicResults: { score: 3, fails: 0, warns: 0 }
  });
  assert(judgePrompt.includes("COMPACT FINAL-ACCEPTABILITY RUBRIC"));
  assert(judgePrompt.includes("SCORED OWNER READABILITY CHECKS"));
  assert(judgePrompt.includes("[OV-038] read-aloud rule"));
  assert(judgePrompt.includes("[OV-040] morning-reader test"));
  assert(judgePrompt.includes("SCOPED ACTIVE OWNER DECISIONS"));
  assert(judgePrompt.includes('"fails": 0'));
  assert(!judgePrompt.includes("OWNER-REVIEWED DIRECTIONAL BEAT EVIDENCE"));
  assert(!judgePrompt.includes("OWNER VOCABULARY PALETTE"));
  assert(judgePrompt.includes("Do not rewrite, approve, or promote"));
  assert(judgePrompt.includes("A central register failure spanning hook, lived section, turn, and moves is a full-draft rejection"));
  assert(judgePrompt.includes("workshop, mediation, negotiation, and facilitation language"));
  assert(judgePrompt.includes("A Jupiter year is not a dinner"));
  assert(judgePrompt.includes("Generic product copy"));
  assert(judgePrompt.includes("Always cite three lines"));

  const auditPath = path.join(packageRoot, "voice", "tldr-astro", "marie-satori-owner-feedback-audit.md");
  assert(fs.existsSync(auditPath), "the complete historical audit must remain available");
  assert(!fs.existsSync(path.join(packageRoot, "review", "OWNER-FEEDBACK-INVENTORY-2026-08-03.md")), "the obsolete duplicate owner-facing path must be removed");

  console.log(`OK  editorial decisions compile (${result.compiled.active.length} active, ${result.compiled.unresolved.length} unresolved, ${result.compiled.artifacts.regression.cases.length} regression records)`);
}

main();
