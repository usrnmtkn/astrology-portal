import { canonicalAstrologyWritingInstructions } from "./canonicalInstructions.mjs";
import { unapprovedDraft } from "./generateDraft.mjs";

function permittedFields(review) {
  return new Set((review.required_revisions ?? []).map((entry) => entry.field).filter(Boolean));
}

export async function reviseDraft({ draft, review, plan, context, modelClient }) {
  if (review.decision !== "REVISE") return draft;
  if (typeof modelClient !== "function") throw new Error("reviseDraft requires an injected modelClient; no implicit billed call is allowed.");
  const allowed = permittedFields(review);
  if (!allowed.size) throw new Error("REVISE decision must identify fields for surgical revision.");
  const patch = await modelClient({
    stage: "revision",
    instructions: canonicalAstrologyWritingInstructions,
    input: JSON.stringify({
      instruction: "Revise only the listed failed fields. Return a JSON patch containing only those fields. Do not rewrite successful lines for variety.",
      plan,
      ownerContext: context,
      draft,
      requiredRevisions: review.required_revisions
    }, null, 2),
    schema: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries([...allowed].map((field) => [field, { type: "string" }]))
    }
  });
  for (const field of Object.keys(patch ?? {})) {
    if (!allowed.has(field)) throw new Error(`Revision attempted to change successful field ${field}.`);
  }
  return unapprovedDraft({ ...draft, ...patch });
}
