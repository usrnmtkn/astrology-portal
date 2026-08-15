#!/usr/bin/env node

import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { CORPUS_GRAMMAR_CHECKS, grammarFindings } = require("../../src/astro-writing/corpusGrammarChecks.cjs");
const { deterministicChecks } = require("../../src/astro-writing/friendsTransitDeterministic.cjs");

const fixtures = Object.freeze({
  "meets-seam": "Their direction meets the need to make a decision.",
  "pronoun-object-case": "The choice keeps moving between they and the group.",
  "dangling-participle": "Putting the facts beside the promise before answering, it is easier to see the gap.",
  "compound-subject-singular-verb": "Pressure and patience that build through the week tends to shape the answer.",
  "split-verb-glued-list": "It makes you take seriously work, health, stress, routines, chores, habits, and exhaustion."
});

assert.deepEqual([...CORPUS_GRAMMAR_CHECKS].map((check) => check.id).sort(), Object.keys(fixtures).sort());
for (const [id, text] of Object.entries(fixtures)) {
  assert.deepEqual(grammarFindings(text).map((finding) => finding.check), [id], `${id} fixture must fail only its own check.`);
}
assert.deepEqual(grammarFindings("The choice stays between them, and the details become harder to ignore."), []);

const target = {
  contentKey: "authored/transit-aspect/saturn/sun/square",
  transiting: "saturn",
  natal: "sun",
  aspect: "square"
};
const draft = {
  sceneAnchor: "grammar fixtures",
  body_you: Object.values(fixtures).join(" "),
  body_they: `{{Name}} reads the message. ${Object.values(fixtures).join(" ")}`
};
const failedGrammarChecks = deterministicChecks(target, draft).findings
  .filter((finding) => !finding.passed && finding.id.startsWith("grammar-"))
  .map((finding) => finding.id)
  .sort();
assert.deepEqual(failedGrammarChecks, Object.keys(fixtures).map((id) => `grammar-${id}`).sort());

console.log(JSON.stringify({
  status: "PASS",
  ownerReportedGrammarChecks: Object.keys(fixtures),
  generatedDraftGate: "fail-closed",
  liveCallsMade: 0
}, null, 2));
