export const LITERAL_EVENT_REVIEW_VERSION = "natal-literal-event-semantic-pass-v1-2026-08-13";

export const LITERAL_EVENT_REVIEW_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["decision", "plain_consequence", "sentences", "violations"],
  properties: {
    decision: { type: "string", enum: ["PASS", "REVISE"] },
    plain_consequence: { type: "string" },
    sentences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "actor", "action", "filmable_without_invention", "plain_restatement", "restatement_is_clearer", "concrete_props_on_abstract_claim"],
        properties: {
          text: { type: "string" },
          actor: { type: "string" },
          action: { type: "string" },
          filmable_without_invention: { type: "boolean" },
          plain_restatement: { type: "string" },
          restatement_is_clearer: { type: "boolean" },
          concrete_props_on_abstract_claim: { type: "boolean" }
        }
      }
    },
    violations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "severity", "location", "text", "reason", "revision_instruction"],
        properties: {
          category: { type: "string", enum: ["literal_first_read_clarity", "observable_behavior", "example_proves_astrology", "metaphor_requires_translation"] },
          severity: { type: "string", enum: ["blocking"] },
          location: { type: "string" },
          text: { type: "string" },
          reason: { type: "string" },
          revision_instruction: { type: "string" }
        }
      }
    }
  }
});

export const LITERAL_EVENT_REVIEW_INSTRUCTIONS = `LITERAL-EVENT AND PLAIN-CONSEQUENCE SEMANTIC PASS

Read only the rendered passage. Do not use its key, source row, astrology, prompt, or intended meaning to help it make sense.

For every sentence:
1. State who did what.
2. Decide whether the action could be filmed or overheard without inventing missing behavior.
3. Restate the consequence in plain everyday language.
4. Mark restatement_is_clearer when the plain restatement communicates materially more directly than the submitted sentence.
5. Mark concrete_props_on_abstract_claim when objects, rooms, documents, schedules, food, money, or other concrete nouns merely decorate or claim to prove an abstract quality rather than participate in a credible event.

Return REVISE when any sentence cannot be filmed without invention, when the plain restatement is clearer, or when concrete nouns are props on an abstract claim. Euphemism, personified abstractions, and impossible verb-object combinations fail. Ordinary figurative language may pass only when the literal consequence remains immediate on the first read.

This is a semantic judgment. Deterministic pattern matches are triage evidence only and must never produce the verdict.`;

const PROP_PROOF = /\b(?:bill|brief|calendar|chair|checklist|contract|document|email|form|invoice|letter|message|notebook|report|schedule|signature|spreadsheet|whiteboard)\b[^.!?]{0,120}\b(?:proves?|reveals?|shows?|records?|makes?\s+[^.!?]{0,40}\bvisible)\b/giu;
const ABSTRACT_ACTOR = /\b(?:affection|ambition|care|confidence|desire|emotion|fear|feeling|hope|influence|intuition|meaning|mood|mystery|optimism|pressure|recognition|responsibility|sensitivity|silence|the room|the pattern|the relationship|the response|the repeat)\s+(?:accepts?|asks?|begins?|buys?|chooses?|decides?|demands?|funds?|grows?|holds?|inherits?|lands?|moves?|occupies?|purchases?|reaches?|rebuilds?|returns?|shows?|spends?|travels?)\b/giu;
const POSSIBLE_IMPOSSIBLE_ACTION = /\b(?:accepts? the signature|the room can hold disagreement|confidence returns? from inside|warmth appears? in the exchange)\b/giu;

export function literalEventDeterministicTriage(copy) {
  const text = String(copy || "");
  const findings = [];
  for (const match of text.matchAll(PROP_PROOF)) {
    findings.push({ category: "possible_prop_proof", text: match[0], classification: "advisory" });
  }
  for (const match of text.matchAll(ABSTRACT_ACTOR)) {
    findings.push({ category: "possible_abstract_actor", text: match[0], classification: "advisory" });
  }
  for (const match of text.matchAll(POSSIBLE_IMPOSSIBLE_ACTION)) {
    findings.push({ category: "possible_impossible_action_or_euphemism", text: match[0], classification: "advisory" });
  }
  return {
    policy: "triage-only",
    mayDecideVerdict: false,
    findings
  };
}

export function validateLiteralEventReview(review) {
  if (!new Set(["PASS", "REVISE"]).has(review?.decision)) throw new Error("Literal-event reviewer omitted PASS-or-REVISE decision.");
  if (typeof review?.plain_consequence !== "string") throw new Error("Literal-event reviewer omitted the plain consequence.");
  if (!Array.isArray(review?.sentences) || !Array.isArray(review?.violations)) throw new Error("Literal-event reviewer omitted sentence analysis or violations.");
  const semanticFailure = review.sentences.some((sentence) => sentence.filmable_without_invention !== true
    || sentence.restatement_is_clearer === true
    || sentence.concrete_props_on_abstract_claim === true);
  if ((semanticFailure || review.violations.length > 0) !== (review.decision === "REVISE")) {
    throw new Error("Literal-event reviewer decision contradicts its semantic findings.");
  }
  return review;
}

export async function reviewLiteralEvent({ copy, modelClient }) {
  if (typeof modelClient !== "function") throw new Error("Literal-event semantic review requires an independent model client.");
  const review = await modelClient({
    stage: "literal-event-review",
    role: "LITERAL_EVENT_REVIEWER",
    instructions: LITERAL_EVENT_REVIEW_INSTRUCTIONS,
    input: JSON.stringify({ rendered_copy: typeof copy === "string" ? copy : copy }, null, 2),
    schema: LITERAL_EVENT_REVIEW_SCHEMA
  });
  return validateLiteralEventReview(review);
}
