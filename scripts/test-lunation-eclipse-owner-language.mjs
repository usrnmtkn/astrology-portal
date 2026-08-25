import assert from "node:assert/strict";
import fs from "node:fs";

const evidencePath = "packages/astro-knowledge/review/lunation-card-assembly-v1/source/eclipse-owner-language-v1.json";
const madlibPath = "packages/astro-knowledge/review/lunation-card-assembly-v1/source/horoscope-madlib-v1.json";

const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const madlib = JSON.parse(fs.readFileSync(madlibPath, "utf8"));

assert.equal(evidence.schema, "eclipse-owner-language/v1");
assert.equal(evidence.serving, false);
assert.equal(evidence.sourceDocuments.length, 4);
assert.equal(new Set(evidence.sourceDocuments.map((source) => source.sha256)).size, 4);

for (const kind of ["eclipse-solar", "eclipse-lunar"]) {
  const opening = evidence.proposedOpeningSelector[kind];
  assert.equal(opening.reviewStatus, "needs_review");
  assert.equal(opening.ownerApproved, false);
  assert.equal(opening.promotionAuthorized, false);
  assert.equal(opening.selection, "storedEclipseBookOpeningReplacement");
  assert.equal(opening.then, "eclipseNatureDefault");
}
assert.equal(evidence.proposedOpeningSelector["eclipse-solar"].templateReference, "horoscope-madlib.templates.eclipseHouseOpeningSolarCandidate");
assert.equal(evidence.proposedOpeningSelector["eclipse-lunar"].templateReference, "horoscope-madlib.templates.eclipseHouseOpeningLunarCandidate");

for (const kind of ["new-moon", "full-moon"]) {
  assert.equal(evidence.proposedOpeningSelector[kind].selection, "bookOpeningSentenceOnly");
  assert.equal(evidence.proposedOpeningSelector[kind].templateReference, "bookBody.firstSentence");
}

const fields = evidence.proposedTemplateFields;
assert.equal(fields.reviewStatus, "needs_review");
assert.equal(fields.ownerApproved, false);
assert.equal(fields.promotionAuthorized, false);
assert.equal(fields.eclipseNature.candidates.length, 3);
assert.equal(fields.eclipseNature.default, "Eclipses warp time and shift the course of events in ways you can't yet see.");
assert.equal(fields.eclipseNature.exactRowOnly.length, 2);
assert.equal(fields.eclipseVerb.default, "shines upon");
assert.equal(fields.eclipseChallenge.approvedPairs.length, 0);
assert.equal(fields.eclipseSeason.approvedFrames.length, 0);
assert.equal(fields.eclipseKind.southNodeSolarModifier, null);

assert.equal(madlib.templates.eclipseKindSolarCandidate, fields.eclipseKind.solar);
assert.equal(madlib.templates.eclipseKindLunarCandidate, fields.eclipseKind.lunar);
assert.equal(madlib.templates.eclipseAdviceCandidate, fields.eclipseAdvice);
assert.equal(madlib.templates.eclipseEndingsRecommendationCandidate, fields.eclipseEndingsNoRitual);
assert.equal(madlib.templates.eclipseEndingsAdviceCandidate, fields.eclipseEndingsAdvice);
assert.deepEqual(madlib.eclipseCandidateFields.eclipseNature.candidates, fields.eclipseNature.candidates);
assert.equal(madlib.eclipseCandidateFields.eclipseNature.default, fields.eclipseNature.default);
assert.equal(madlib.templates.eclipseNatureDefaultCandidate, fields.eclipseNature.default);
assert.equal(madlib.templates.eclipseMechanicsCandidate, fields.eclipseMechanics);
assert.equal(madlib.templates.eclipseNoRitualCandidate, fields.eclipseNoRitual);
assert.equal(madlib.eclipseCandidateFields.eclipseVerb.default, "shines upon");
assert.deepEqual(fields.intentionPreservation.preserveWhenEclipse, [
  "bookBodyOutsideApprovedDeclaredIntentionSpans",
  "incidentalIntentionLanguage",
  "actionsIntentions",
  "closing"
]);
assert.match(fields.intentionPreservation.rule, /stored owner-approved start\/end span/);

assert.equal(
  madlib.templates.opening
    .replace("{LUNATION_SIGN_TITLE}", "Pisces")
    .replace("{LUNATION_KIND}", "full moon")
    .replace("{ILLUMINATE_VERB}", "illuminates")
    .replace("{HOUSE_ORDINAL}", "12th")
    .replace("{HOUSE_DOMAIN}", "karma, subconscious, and endings"),
  "The Pisces full moon illuminates your 12th house of karma, subconscious, and endings."
);

assert.equal(
  madlib.templates.eclipseHouseOpeningLunarCandidate
    .replace("{LUNATION_SIGN_TITLE}", "Pisces")
    .replace("{HOUSE_ORDINAL}", "12th")
    .replace("{HOUSE_DOMAIN}", "karma, subconscious, and endings"),
  "The Pisces lunar eclipse shines upon your 12th house of karma, subconscious, and endings."
);

const advice = evidence.proposedSharedEclipseAdvice;
assert.equal(advice.reviewStatus, "needs_review");
assert.equal(advice.body, fields.eclipseAdvice);

assert.match(evidence.assemblyProposal.intentionPreservationRule, /stored, owner-approved declared intention span/);
assert.equal(evidence.ownerRuling.text, madlib.templates.eclipseNoRitualCandidate);
assert.equal(fields.eclipseNoRitualApproval.status, "owner_approved");

assert.deepEqual(evidence.assemblyProposal.order.slice(0, 3), [
  "selectedBookOpeningSentence",
  "eclipseNatureDefaultWhenEclipse",
  "eclipseMechanicsWhenEclipse"
]);
assert.ok(evidence.assemblyProposal.order.includes("eclipseNoRitualWhenEclipse"));
assert.ok(evidence.assemblyProposal.order.includes("bookBodyRemainderAfterApprovedDeclaredIntentionOmissions"));

assert.deepEqual(evidence.assemblyProposal.baseKindMap, {
  "eclipse-solar": "new-moon",
  "eclipse-lunar": "full-moon"
});

console.log("Lunation eclipse owner-language evidence: 4 source PDFs, 8 non-serving template fields.");
