import { effectiveAstrologyWritingInstructions } from "./canonicalInstructions.mjs";
import {
  isCardWritingSurface
} from "./cardWritingStandard.mjs";
import { unapprovedDraft } from "./generateDraft.mjs";

function permittedFields(review) {
  return new Set((review.violations ?? []).map((entry) => entry.location).filter(Boolean));
}

function failedLines(draft, fields) {
  return Object.fromEntries([...fields].map((field) => [field, String(draft?.[field] ?? "")]));
}

export async function reviseDraft({
  draft,
  review,
  plan,
  family = "sky-placement",
  surface = "card",
  familyContext = null,
  protectedOwnerLines = [],
  modelClient
}) {
  if (review.decision === "PASS") return draft;
  if (typeof modelClient !== "function") throw new Error("reviseDraft requires an injected reviserClient; no implicit billed call is allowed.");
  const allowed = permittedFields(review);
  if (!allowed.size) throw new Error("REVISE decision must identify failed fields for surgical revision.");
  const relevantViolations = (review.violations ?? []).filter((entry) => allowed.has(entry.location));
  const patch = await modelClient({
    stage: "revision",
    role: isCardWritingSurface({ surface, family }) ? "CARD_REVISER_V3" : "REVISER",
    instructions: effectiveAstrologyWritingInstructions({ surface, family }),
    input: JSON.stringify({
      instruction: "Revise only the supplied failed lines. Return a JSON patch containing only those fields. Do not rewrite successful material.",
      surface,
      family,
      plan,
      failedLines: failedLines(draft, allowed),
      violations: relevantViolations,
      protectedOwnerLines,
      familyContext
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
  for (const line of protectedOwnerLines) {
    const before = Object.values(draft ?? {}).some((value) => typeof value === "string" && value.includes(line));
    const after = Object.values({ ...draft, ...patch }).some((value) => typeof value === "string" && value.includes(line));
    if (before && !after) throw new Error(`Revision changed protected owner line: ${line}`);
  }
  return unapprovedDraft({ ...draft, ...patch });
}
