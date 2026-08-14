import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  deduplicateAssembledReport,
  detectPostDedupCoherenceScopes,
  normalizeAssembledReportWhitespace,
  repairMechanicalPostDedupSeams,
  REPORT_LEVEL_LEXICAL_BUDGETS,
  runReportRedundancyPass,
  validateAssembledReport
} from "../api/_lib/report-assembly.ts";
import {
  assembleReportGenerationPayload,
  isAstrologyMechanismStatement,
  reportPromptFromPayload,
  validateReportDraft
} from "../api/_lib/report-generation.ts";
import { assembleDeterministicReportKeyDates, reportKeyDateEventManifest } from "../api/_lib/report-key-dates.ts";

const reviewFixture = JSON.parse(fs.readFileSync(new URL("./fixtures/report-assembly-review-74951c07.json", import.meta.url), "utf8"));
const frozen = JSON.parse(fs.readFileSync(new URL("./fixtures/marie-report-frozen-facts.json", import.meta.url), "utf8"));
const issues = validateAssembledReport(reviewFixture.units);
const has = (code, unitId) => issues.some((entry) => entry.code === code && (!unitId || entry.unitId === unitId));

assert.ok(has("duplicate_heading", "winter-current"), "The exact consecutive WINTER 2026 headings must be surfaced at assembly.");
assert.ok(has("duplicate_key_date_label", "summer"), "The duplicated Summer AUG 12 label must be surfaced at assembly.");
assert.ok(has("fused_key_date_slots", "summer"), "The exact Summer AUG 12/AUG 19/AUG 27 concatenations must be surfaced at assembly.");
assert.ok(has("fused_key_date_slots", "winter-next"), "The exact Winter 2027 JAN 10/FEB 5/FEB 6 concatenation must be surfaced at assembly.");
assert.ok(has("missing_key_date_label", "key-dates"), "The missing FEB 22 label must be surfaced at assembly.");
assert.ok(has("assembled_key_date_format", "summer"), "The assembled DATE · TITLE · sentence · attribution contract must reject fused records.");
assert.ok(has("malformed_markdown", "summer"), "The fused Summer emphasis markers must be surfaced at assembly.");
assert.ok(has("repeated_near_sentence", "review-current-year"), "The duplicated 2026 IN REVIEW closing sentence must be surfaced at assembly.");
assert.ok(issues.filter((entry) => entry.severity === "error").every((entry) => (
  entry.code === "repeated_exact_sentence" || entry.code === "repeated_near_sentence"
)), "Only exact and near-exact sentence repetition across units may block assembly.");

const validKeyDates = [{
  unitId: "key-dates",
  draft: {
    headline: "KEY DATES",
    summary: "FIXTURE_ONLY summary.",
    body: "AUG 12 · FIXTURE_ONLY FIRST TITLE · A supported event may need an answer. · Solar eclipse in the third house.\n\nAUG 28 · FIXTURE_ONLY SECOND TITLE · Public wording may require revision. · Lunar eclipse on natal Mercury.",
    sections: []
  }
}];
assert.ok(!validateAssembledReport(validKeyDates).some((entry) => /key_date|markdown/u.test(entry.code)),
  "Two well-formed key-date records must pass the assembled format contract.");

const exactBrokenKeyDates = [{
  unitId: "spring",
  draft: { headline: "The old plan needs different terms", body: "FIXTURE_ONLY." }
}, {
  unitId: "key-dates",
  draft: {
    headline: "KEY DATES",
    body: [
      "FEB 22 · GIVE THE IDEA A USABLE FORM · Put the idea somewhere practical. · Saturn trines natal Jupiter.",
      "FEB 26 · GIVE THE IDEA A USABLE FORM · Follow the idea into a plan. · Neptune trines natal Jupiter.",
      "MAY 12 · The old plan needs different terms · Together, these aspects make it easier for your writing and replies to fit the schedule you have now. · Uranus sextiles natal Jupiter.",
      "MAY 14 · The old plan needs different terms · Together, these aspects make it easier for your writing and replies to fit the schedule you have now. · Jupiter trines natal Uranus."
    ].join("\n\n")
  }
}];
const exactBrokenKeyDateIssues = validateAssembledReport(exactBrokenKeyDates);
assert.equal(exactBrokenKeyDateIssues.filter((entry) => entry.code === "duplicate_key_date_title").length, 2,
  "FEB 22/FEB 26 and MAY 12/MAY 14 must expose both duplicate-title pairs.");
assert.equal(exactBrokenKeyDateIssues.filter((entry) => entry.code === "key_date_title_reuses_section_heading").length, 2,
  "Both exact parent-heading titles must fail the key-date contract.");
assert.equal(exactBrokenKeyDateIssues.filter((entry) => entry.code === "duplicate_key_date_sentence").length, 1,
  "The exact MAY 12/MAY 14 duplicate sentence must fail the key-date contract.");
assert.ok(exactBrokenKeyDateIssues.some((entry) => entry.code === "key_date_incomplete_sentence" && entry.quote.includes("Together,")),
  "The exact dangling MAY 12/MAY 14 sentence must fail the standalone-sentence contract.");

const nineRepeatedParentTitles = [{
  unitId: "spring",
  draft: { headline: "The old plan needs different terms", body: "FIXTURE_ONLY." }
}, {
  unitId: "key-dates",
  draft: {
    headline: "KEY DATES",
    body: Array.from({ length: 9 }, (_, index) => (
      `APR ${index + 1} · The old plan needs different terms · Entry ${index + 1} has its own complete sentence. · *FIXTURE_ONLY attribution ${index + 1}.*`
    )).join("\n\n")
  }
}];
const nineRepeatedTitleIssues = validateAssembledReport(nineRepeatedParentTitles);
assert.equal(nineRepeatedTitleIssues.filter((entry) => entry.code === "key_date_title_reuses_section_heading").length, 9,
  "All nine exact parent-heading titles must hard-fail.");
assert.equal(nineRepeatedTitleIssues.filter((entry) => entry.code === "duplicate_key_date_title").length, 8,
  "Nine identical titles must expose all eight later duplicates.");

for (const dangling of ["Saturn also trines Jupiter, adding limits, order, and repetition.", "This sextile makes the schedule easier to keep."]) {
  const danglingIssues = validateAssembledReport([{
    unitId: "key-dates",
    draft: { body: `MAY 12 · A unique useful title · ${dangling} · *FIXTURE_ONLY attribution.*` }
  }]);
  assert.ok(danglingIssues.some((entry) => entry.code === "key_date_incomplete_sentence"),
    `The dangling key-date fragment '${dangling}' must hard-fail.`);
}

const ownerFinalKeyDates = [{
  unitId: "key-dates",
  draft: {
    headline: "KEY DATES",
    body: [
      "**MAY 19 · Make the change specific** · Put the new hours, boundary, appointment, or responsibility change into the actual calendar. · *Saturn sextiles your natal Ascendant, pass 1.*",
      "**AUG 27 · Watch what gets pushed out** · Sleep, meals, appointments, movement, recovery, or another routine may show you where the week is already too full. · *Jupiter squares your natal Moon.*",
      "**OCT 6 · Look at what actually worked** · Keep the changes that survived real life and revise the ones that disappeared as soon as the week got busy. · *Saturn sextiles your natal Ascendant, pass 2.*",
      "**FEB 6 · A public change reaches the calendar** · A professional development may alter hours, travel, commute, physical demands, or the amount of time left around the work. · *A solar eclipse conjoins your natal Midheaven.*"
    ].join("\n\n")
  }
}];
assert.deepEqual(validateAssembledReport(ownerFinalKeyDates).filter((entry) => entry.severity === "error"), [],
  "The four owner FINAL key-date records must pass unchanged.");

const repairManifest = JSON.parse(fs.readFileSync(new URL("./fixtures/report-8b3e266e-assembly-repair-v1.json", import.meta.url), "utf8"));
const repairedEntries = Object.values(repairManifest.sourceUnits).flat();
assert.equal(repairedEntries.length, 27);
assert.equal(new Set(repairedEntries.map((entry) => entry.title.toLowerCase())).size, repairedEntries.length,
  "The repaired Production Key Dates titles must all be unique.");
assert.equal(new Set(repairedEntries.map((entry) => entry.sentence.toLowerCase())).size, repairedEntries.length,
  "The repaired Production Key Dates sentences must all be unique.");
assert.ok(repairedEntries.every((entry) => (entry.sentence.match(/[.!?](?:\s|$)/gu)?.length ?? 0) === 1),
  "Every repaired Production Key Dates entry must contain exactly one reader sentence.");
for (const forbiddenTitle of ["GIVE THE IDEA A USABLE FORM", "The old plan needs different terms", "Your work reaches other people, but new opportunities strain your daily schedule"]) {
  assert.ok(!repairedEntries.some((entry) => entry.title.toLowerCase() === forbiddenTitle.toLowerCase()),
    `The repaired Key Dates title set must not reuse '${forbiddenTitle}'.`);
}

const lexicalUnits = [{
  unitId: "overview",
  draft: {
    headline: "FIXTURE_ONLY",
    body: "An application may begin. The application may need revision. An application may receive an answer. Another application may require a deadline."
  }
}];
assert.equal(REPORT_LEVEL_LEXICAL_BUDGETS.terms.find((entry) => entry.id === "application")?.cap, 3);
assert.ok(validateAssembledReport(lexicalUnits).some((entry) => entry.code === "report_lexical_budget"));
assert.ok(validateAssembledReport(lexicalUnits).filter((entry) => entry.code === "report_lexical_budget").every((entry) => entry.severity === "warning"));

const phraseUnits = [{
  unitId: "overview",
  draft: {
    headline: "FIXTURE_ONLY",
    body: "The first ordinary week may show the cost. Another ordinary week may show the same cost."
  }
}];
assert.ok(validateAssembledReport(phraseUnits).some((entry) => entry.code === "signature_phrase_budget"));
assert.ok(validateAssembledReport(phraseUnits).filter((entry) => entry.code === "signature_phrase_budget").every((entry) => entry.severity === "warning"));

assert.ok(!validateAssembledReport([{
  unitId: "autumn",
  draft: { headline: "AUTUMN", body: "In a collaboration, it may be the deadline or final say." }
}]).some((entry) => entry.code === "report_menu_density"),
"Report-level menu detection must preserve the governed two-item autumn regression.");
assert.ok(validateAssembledReport([{
  unitId: "summer",
  draft: { headline: "SUMMER", body: "The eclipse may involve an announcement, application, piece of writing, class, contract, conversation, or decision." }
}]).some((entry) => entry.code === "report_menu_density"),
"Report-level menu discipline must catch Summer's original seven-item enumeration.");

// Production-shaped assembly regression from report 8b3e266e, preserving the
// seven exact and two near-exact relationships recorded on 2026-08-13.
const grief = "When an ending matters emotionally, grief or mourning may be part of the experience, even when the ending is wanted or necessary.";
const practical = "Some endings may be practical.";
const manageable = "Each new opportunity can look manageable by itself.";
const overcommit = "Overcommitting does not always happen because of bad choices.";
const goodOpportunities = "It often happens when you say yes to good opportunities.";
const publicCommunication = "Now the communication itself matters publicly.";
const productionRepetitionUnits = [{
  unitId: "overview",
  draft: { body: grief }
}, {
  unitId: "year-theme",
  draft: { body: `At 47, you are in a 12th-house profection year, the final year before the cycle returns to your 1st house. ${grief} ${practical} You can still be fully capable of doing a job or carrying a responsibility and realize you cannot keep organizing your week around it.` }
}, {
  unitId: "domain:main",
  draft: {
    body: `${manageable} ${overcommit} ${goodOpportunities} ${publicCommunication}`,
    sections: [{
      heading: "WHAT 2026 IS ABOUT",
      body: `At 47, you are in the final profection year before the cycle returns to your 1st house. ${grief} ${practical}`
    }, { heading: "FIXTURE_ONLY" }, {
      heading: "SPRING 2026",
      body: "You can still be fully capable of doing a job and realize you cannot keep organizing your week around it."
    }]
  }
}, {
  unitId: "summer",
  draft: { body: `${manageable} ${overcommit} ${goodOpportunities} ${publicCommunication}` }
}];
const productionRepetitionIssues = validateAssembledReport(productionRepetitionUnits);
assert.equal(productionRepetitionIssues.filter((entry) => entry.code === "repeated_exact_sentence" && entry.severity === "error").length, 7);
assert.equal(productionRepetitionIssues.filter((entry) => entry.code === "repeated_near_sentence" && entry.severity === "error").length, 2);
const productionDeduplication = deduplicateAssembledReport(productionRepetitionUnits);
assert.equal(productionDeduplication.removals.filter((entry) => entry.code === "repeated_exact_sentence").length, 7);
assert.equal(productionDeduplication.removals.filter((entry) => entry.code === "repeated_near_sentence").length, 2);
assert.equal(validateAssembledReport(productionDeduplication.units).filter((entry) => entry.severity === "error").length, 0);
assert.equal(productionRepetitionUnits[3].draft.body, `${manageable} ${overcommit} ${goodOpportunities} ${publicCommunication}`,
  "Mechanical deduplication must not mutate the persisted input object in place.");

const exactPostDedupHoleUnits = [{
  unitId: "spring",
  draft: { body: "The change may be your decision, but it does not have to begin as a preference.  Different hours, fewer responsibilities, or more notice may become necessary." }
}, {
  unitId: "summer",
  draft: { body: "  But you still only have so many hours in a day, so a quick yes may cut into lunch or sleep." }
}, {
  unitId: "winter-next",
  draft: { body: "Saturn then makes its final sextile to your Ascendant.  A schedule or boundary may now become the standard." }
}];
const exactPostDedupScopes = detectPostDedupCoherenceScopes(exactPostDedupHoleUnits);
assert.deepEqual(exactPostDedupScopes.map((entry) => entry.unitId), ["spring", "summer", "winter-next"],
  "The three exact report 8b3e266e post-dedup holes must be bounded for repair.");
assert.ok(exactPostDedupScopes.find((entry) => entry.unitId === "summer")?.reasons.includes("dangling_connector"));
const whitespaceNormalized = normalizeAssembledReportWhitespace(exactPostDedupHoleUnits);
assert.ok(whitespaceNormalized.every((unit) => !/[ \t]{2,}/u.test(unit.draft.body)),
  "Whitespace left by sentence removal must normalize mechanically.");
const mechanicallyRepaired = repairMechanicalPostDedupSeams(exactPostDedupHoleUnits);
assert.equal(mechanicallyRepaired.repairs.length, 3);
assert.deepEqual(mechanicallyRepaired.remaining, []);
assert.equal(mechanicallyRepaired.units.find((unit) => unit.unitId === "summer")?.draft.body,
  "You still only have so many hours in a day, so a quick yes may cut into lunch or sleep.",
  "The exact Summer seam must lose only its stranded connector and whitespace.");
assert.match(mechanicallyRepaired.units.find((unit) => unit.unitId === "spring")?.draft.body ?? "", /preference\. Different hours/u);
assert.match(mechanicallyRepaired.units.find((unit) => unit.unitId === "winter-next")?.draft.body ?? "", /Ascendant\. A schedule/u);

const completeManifest = reportKeyDateEventManifest(frozen, "12_months");
const completeSourceUnits = [...new Set(completeManifest.map((entry) => entry.sourceUnitId).filter(Boolean))].map((unitId) => ({
  unitId,
  draft: {
    keyDates: completeManifest.filter((entry) => entry.sourceUnitId === unitId).map((entry, index) => ({
      eventId: entry.eventId,
      title: `Event ${index + 1} ${unitId}`,
      sentence: `Event ${index + 1} for ${unitId} has a complete factual sentence.`
    }))
  }
}));
assert.doesNotThrow(() => assembleDeterministicReportKeyDates({ reportHorizon: "12_months", frozenFacts: frozen, sourceUnits: completeSourceUnits }));
completeSourceUnits[0].draft.keyDates.pop();
assert.throws(
  () => assembleDeterministicReportKeyDates({ reportHorizon: "12_months", frozenFacts: frozen, sourceUnits: completeSourceUnits }),
  /REPORT_KEY_DATES_MISSING_EVENTS/u,
  "Omitting any eligible frozen fact date must hard-fail deterministic assembly."
);

let staleRedundancyCalls = 0;
const staleRedundancyResult = await runReportRedundancyPass({
  units: [{ unitId: "overview", draft: { body: "The edited overview keeps only its current sentence." } }],
  payload: assembleReportGenerationPayload({
    reportId: "fixture-stale-redundancy", reportDomain: "general", reportHorizon: "12_months", unitId: "overview", frozenFacts: frozen
  }),
  callModel: async (input) => {
    staleRedundancyCalls += 1;
    return {
      value: {
        result: "findings",
        findings: [{
          id: "stale-production-scope", category: "semantic_duplication", unit_id: "overview",
          related_unit_ids: ["year-theme"], location: "body", sentence_index: 0, scope_start: 0, scope_end: 0,
          quote: "The sentence removed by deterministic assembly cleanup.",
          evidence: "FIXTURE_ONLY stale finding.", instruction: "FIXTURE_ONLY"
        }]
      },
      model: input.model, provider: input.provider,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
    };
  }
});
assert.equal(staleRedundancyCalls, 1);
assert.deepEqual(staleRedundancyResult.findings, [],
  "A report redundancy finding whose quote is absent from the edited unit must be discarded as stale, not throw REPORT_REDUNDANCY_SCOPE_INVALID.");

const payload = assembleReportGenerationPayload({
  reportId: "fixture-report-assembly",
  reportDomain: "general",
  reportHorizon: "12_months",
  unitId: "overview",
  frozenFacts: frozen
});
assert.equal(payload.noClevernessRuling.sourcePath, "tldr-astro-phrasebank/TLDR-REPORT-NO-CLEVERNESS-TAX-RULING-OWNER.md");
assert.equal(payload.coldProseRuling.sourcePath, "tldr-astro-phrasebank/TLDR-REPORT-COLD-PROSE-RULE-OWNER.md");
assert.match(payload.noClevernessRuling.text, /New report rule: no cleverness tax/u);
assert.match(payload.ownerReviewEvidence.text, /Each new opportunity can look manageable by itself\./u);
assert.match(reportPromptFromPayload(payload), /NO_CLEVERNESS_TAX_OWNER_RULING[\s\S]*OWNER_REVIEW_EVIDENCE[\s\S]*COLD_RENDERED_PROSE_OWNER_RULING/u);

const unitCodes = (body) => validateReportDraft({ body }, payload).map((entry) => entry.code);
for (const [body, code] of [
  ["You may notice things changing.", "vague_noun"],
  ["The outcome is not settled.", "banned_settled"],
  ["The year asks you to wait.", "astrology_as_agent"],
  ["The work requires more labor.", "labor_for_work"],
  ["Wednesday still has one afternoon.", "no_cleverness_tax"]
]) assert.ok(unitCodes(body).includes(code), `${code} must be deterministic reader-copy lint.`);

assert.ok(unitCodes("Overcommitting may affect your capacity.").includes("mechanism_grounding"));
assert.ok(!unitCodes("Jupiter makes the invitation look easy, but the sixth-house Moon shows the cost in sleep and appointments.").includes("mechanism_grounding"));
const approvedLateAugustCapacitySection = [
  "Near the end of summer, all the new communication starts competing with your daily capacity. Jupiter squares your 6th-house Moon. Jupiter increases the messages, invitations, conversations, and opportunities, while the square puts that growth in conflict with the routines that keep each day functioning. Each new opportunity can look manageable by itself. Together, these commitments can delay meals, shorten sleep, and force appointments or existing plans off the calendar.",
  "Overcommitting does not always happen because of bad choices. It often happens when you say yes to good opportunities. But you still only have so many hours in a day, so a quick “sure, I’ll do it” may cut into lunch, sleep, an appointment, or plans you already made. Preparation and follow-up may take longer than the meeting itself."
].join("\n\n");
assert.ok(!unitCodes(approvedLateAugustCapacitySection).includes("mechanism_grounding"),
  "The owner-approved late-August mechanism paragraph followed by its plain-language cost paragraph must pass.");
assert.ok(unitCodes("Overcommitting can still cost hours, lunch, sleep, appointments, and preparation time.").includes("mechanism_grounding"),
  "A capacity section with concrete costs but no astrological mechanism anywhere must fail.");
assert.ok(validateReportDraft({
  body: "Jupiter squares your 6th-house Moon.",
  sections: [{
    heading: "A separate section",
    body: "Overcommitting can still cost hours, lunch, sleep, appointments, and preparation time."
  }]
}, payload).some((entry) => entry.code === "mechanism_grounding"),
"An astrological mechanism in a different section must not satisfy the capacity passage's section-level requirement.");
assert.ok(!unitCodes("Uranus is changing the terms of an established role this spring.").includes("possibility_language"),
  "A confident mechanism statement must not be forced into possibility language.");
assert.equal(isAstrologyMechanismStatement("Uranus is changing the terms of an established role this spring."), true);
assert.equal(isAstrologyMechanismStatement("Uranus changes the job application."), false,
  "Naming a planet must not turn an asserted event manifestation into a confident mechanism statement.");
assert.ok(!unitCodes("You may say, \"I need more notice.\"").some((code) => /quote|pronoun/u.test(code)),
  "Rhetorical micro-quotes and second-person report register remain allowed.");

const rulingText = fs.readFileSync(new URL("../tldr-astro-phrasebank/TLDR-REPORT-NO-CLEVERNESS-TAX-RULING-OWNER.md", import.meta.url), "utf8");
assert.equal(crypto.createHash("sha256").update(rulingText).digest("hex"), "676df491b580b1da4be181d8c655cf2d6646fb833e9ce982e7b9fc7af7743637");
const v2Owner = fs.readFileSync(new URL("../tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-V2-OWNER.md", import.meta.url), "utf8");
const v4Draft = fs.readFileSync(new URL("../tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V4-DRAFT.md", import.meta.url), "utf8");
const v5Owner = fs.readFileSync(new URL("../tldr-astro-phrasebank/TLDR-REPORT-CRITIQUE-CHECKLIST-V5-OWNER.md", import.meta.url), "utf8");
const judgeV32Owner = fs.readFileSync(new URL("../tldr-astro-phrasebank/TLDR-REPORT-JUDGE-RUBRIC-V3.2-OWNER.md", import.meta.url), "utf8");
for (const draft of [v4Draft]) {
  assert.match(draft, /\*\*Status:\*\* `needs_review`/u);
  assert.match(draft, /\*\*Owner approved:\*\* `false`/u);
  assert.match(draft, /\*\*Active in production:\*\* `false`/u);
  assert.match(draft, /\*\*Promotion authorized:\*\* `false`/u);
}
for (const approved of [v2Owner, v5Owner, judgeV32Owner]) {
  assert.match(approved, /\*\*Status:\*\* `owner_approved`/u);
  assert.match(approved, /\*\*Owner approved:\*\* `true`/u);
  assert.match(approved, /\*\*Active in production:\*\* `true`/u);
  assert.match(approved, /\*\*Promotion authorized:\*\* `true`/u);
  assert.match(approved, /\*\*Approved source SHA-256:\*\* `[a-f0-9]{64}`/u);
}

const manifestationSets = JSON.parse(fs.readFileSync(new URL("../packages/astro-knowledge/data/manifestation-sets/year-ahead-v1.json", import.meta.url), "utf8"));
const twelfthHouse = manifestationSets.records["profection-year-house-12"];
for (const term of ["grief when an emotionally significant ending supports it", "release", "mourning what has run its course"]) assert.ok(twelfthHouse.domain.includes(term));
assert.ok(twelfthHouse.possibleLivedManifestations.some((entry) => entry.includes("wanted or necessary")));
assert.ok(!JSON.stringify(twelfthHouse).includes("protect your energy"));

console.log(`Report assembly passed: ${issues.length} exact-review findings, report-level budgets, owner-ruling wiring, and activated v2/v3.2/v5 prompts.`);
