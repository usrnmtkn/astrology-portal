import corrections from "../authored-inputs/reader-source-reference-removals-v1.json" with { type: "json" };
import { sha256Text } from "./contentIntegrity.mjs";

// Select a separately versioned, exact owner-requested deletion. The imported
// manuscript remains immutable; different/newer copy is never rewritten.
export function correctedReaderSource(contentKey, field, original) {
  const correction = corrections.records.find((entry) => entry.contentKey === contentKey && entry.field === field);
  if (!correction || typeof original !== "string" || sha256Text(original) !== correction.previous_sha256) return original;
  return correction.text;
}
