import { MERCURY_RETURN_CONTACT_KEY } from "../../web/src/content/transitNatalIdentity.js";
import { transitNatalExactContentKey, transitNatalLabel, type TransitNatalSelection } from "./transitNatalSources.js";

export function transitNatalStarterCopy(source: Record<string, unknown> | null | undefined) {
  const you = typeof source?.body_you === "string" && source.body_you.trim()
    ? source.body_you
    : typeof source?.body === "string" ? source.body : "";
  const they = typeof source?.body_they === "string" ? source.body_they : "";
  return { body_you: you, body_they: they };
}

/** New exact-key draft. Optional starter copy is the shared fallback currently shown, never labeled as that source. */
export function transitNatalExactSourceDraft(
  selection: Pick<TransitNatalSelection, "planet" | "natalPoint" | "aspect"> & Partial<Pick<TransitNatalSelection, "sign" | "transitHouse" | "natalHouse">>,
  starter: { body_you?: string; body_they?: string } = {}
) {
  const contentKey = transitNatalExactContentKey(selection);
  if (!contentKey) throw new Error("This transit aspect is not supported by the reader.");
  const isReturn = contentKey.startsWith("authored/transit-return/");
  const isMercuryReturn = contentKey === MERCURY_RETURN_CONTACT_KEY;
  const you = typeof starter.body_you === "string" ? starter.body_you : "";
  const they = typeof starter.body_they === "string" ? starter.body_they : "";
  const headline = isReturn
    ? `${selection.planet.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")} return`
    : contentKey.split("/").length === 8
      ? `${transitNatalLabel(selection)} · ${selection.sign} houses ${selection.transitHouse}/${selection.natalHouse}`
      : transitNatalLabel(selection);
  return {
    id: null,
    contentKey,
    surface: "you" as const,
    mode: "in_depth" as const,
    status: "DRAFT" as const,
    headline,
    summary: "",
    body: you,
    lane: "reference" as const,
    reviewState: "needs-review" as const,
    blockType: "fallback_hook" as const,
    promptVersion: "manual-admin",
    sections: { packageRecord: {
      contentKey,
      headline,
      content_role: "full_copy", grammar_frame: "complete_sentence", surface: isReturn ? "transit-return" : "transit-aspect",
      body: you, ...(!isReturn ? { body_you: you, body_they: they } : {}),
      requiredSlots: isMercuryReturn ? ["untilDate"] : ["aspectWord", "untilDate"],
      optionalSlots: isMercuryReturn ? [] : ["Name"],
      reader_only: true, render_policy: "personal-transit-exact-v1", review_status: "needs_review"
    } },
    facts: {
      fallbackArchitectureV3: true,
      transiting: selection.planet,
      natal: selection.natalPoint,
      aspect: selection.aspect,
      ...(selection.sign ? { sign: selection.sign } : {}),
      ...(selection.transitHouse ? { transitHouse: selection.transitHouse } : {}),
      ...(selection.natalHouse ? { natalHouse: selection.natalHouse } : {})
    },
    reviewerNotes: "Exact personal-transit source shared by Sky Placement and You Transit. Review the complete passage before publishing.",
    sourceSnapshot: { contentType: "authored-content", contentSystem: "fallback", content_role: "full_copy", review_status: "needs_review", sourcePackage: "tldrastro-fallback-architecture-v3" }
  };
}
