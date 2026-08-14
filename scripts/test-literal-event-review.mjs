#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  LITERAL_EVENT_REVIEW_INSTRUCTIONS,
  literalEventDeterministicTriage,
  reviewLiteralEvent,
  validateLiteralEventReview
} from "../src/astro-writing/literalEventReview.mjs";

const defective = "Name writes the hard choice on the whiteboard and accepts the signature beneath it. A colleague who raises a fact may then learn how much disagreement the room can hold.";
const triage = literalEventDeterministicTriage(defective);
assert.equal(triage.mayDecideVerdict, false);
assert.ok(triage.findings.some((item) => item.category === "possible_impossible_action_or_euphemism"));
assert.match(LITERAL_EVENT_REVIEW_INSTRUCTIONS, /State who did what/u);
assert.match(LITERAL_EVENT_REVIEW_INSTRUCTIONS, /filmed or overheard/u);
assert.match(LITERAL_EVENT_REVIEW_INSTRUCTIONS, /restatement_is_clearer/u);
assert.match(LITERAL_EVENT_REVIEW_INSTRUCTIONS, /props on an abstract claim/u);

const revise = await reviewLiteralEvent({
  copy: defective,
  modelClient: async (request) => {
    assert.equal(request.stage, "literal-event-review");
    assert.ok(!request.input.includes("rowKey"));
    return {
      decision: "REVISE",
      plain_consequence: "Name pressures colleagues who disagree.",
      sentences: [{
        text: defective,
        actor: "Name and a colleague",
        action: "An unclear signature action and an encoded consequence",
        filmable_without_invention: false,
        plain_restatement: "Name pressures colleagues who disagree.",
        restatement_is_clearer: true,
        concrete_props_on_abstract_claim: true
      }],
      violations: [{
        category: "literal_first_read_clarity",
        severity: "blocking",
        location: "whole passage",
        text: defective,
        reason: "The actions cannot be pictured without inventing behavior.",
        revision_instruction: "Name the actual behavior and consequence plainly."
      }]
    };
  }
});
assert.equal(revise.decision, "REVISE");

assert.throws(() => validateLiteralEventReview({
  decision: "PASS",
  plain_consequence: "Name sends the corrected invoice.",
  sentences: [{
    text: "Name sends the corrected invoice.",
    actor: "Name",
    action: "sends the invoice",
    filmable_without_invention: false,
    plain_restatement: "Name sends the corrected invoice.",
    restatement_is_clearer: false,
    concrete_props_on_abstract_claim: false
  }],
  violations: []
}), /contradicts/u);

console.log("Literal-event semantic review passed: deterministic triage cannot decide; semantic contradictions fail closed.");
